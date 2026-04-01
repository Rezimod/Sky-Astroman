import type { LiquidityIntent, OrderBookSnapshot } from "../types/index.js";
import { createLogger } from "../logging.js";
import { aggregatePortfolio, applyFillToPosition, createEmptyPosition, markPosition, positionKey } from "./pnl.js";
import { ConservativePaperFillModel, DEFAULT_PAPER_FILL_MODEL_CONFIG } from "./fill-model.js";
import type {
  PaperAggressiveExitRequest,
  PaperBroker,
  PaperBrokerEvent,
  PaperBrokerState,
  PaperFillModel,
  PaperFillModelConfig,
  PaperFillRecord,
  PaperLimitOrderRequest,
  PaperOrderRecord,
  PaperTradeLifecycle,
} from "./types.js";

function round(value: number, digits = 8): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function cloneOrder(order: PaperOrderRecord): PaperOrderRecord {
  return { ...order };
}

function nextId(prefix: string, counter: number): string {
  return `${prefix}-${counter}`;
}

function bestOppositeLevel(
  snapshot: OrderBookSnapshot,
  side: PaperOrderRecord["side"],
) {
  return side === "buy" ? snapshot.asks[0] : snapshot.bids[0];
}

function resetPassiveQueueState(order: PaperOrderRecord) {
  order.queueAheadEstimate = null;
  order.lastSeenOppositeSize = null;
  order.availableLiquidityEstimate = null;
}

function updatePassiveQueueState(order: PaperOrderRecord, snapshot: OrderBookSnapshot) {
  const top = bestOppositeLevel(snapshot, order.side);
  if (!top) {
    resetPassiveQueueState(order);
    return false;
  }

  const touched =
    order.side === "buy"
      ? top.price <= order.price
      : top.price >= order.price;

  if (!touched) {
    resetPassiveQueueState(order);
    return false;
  }

  const previousVisibleSize = order.lastSeenOppositeSize ?? top.size;
  const previousQueueAhead = order.queueAheadEstimate ?? previousVisibleSize;
  const priceThrough =
    order.side === "buy" ? top.price < order.price : top.price > order.price;

  order.touchCount += 1;
  order.lastTouchedTs = snapshot.ts;
  order.updatedAtTs = snapshot.ts;

  if (order.queueAheadEstimate === null) {
    order.queueAheadEstimate = round(top.size, 8);
    order.lastSeenOppositeSize = top.size;
    order.availableLiquidityEstimate = 0;
    return true;
  }

  if (!priceThrough) {
    order.availableLiquidityEstimate = 0;
    return true;
  }

  const consumedLiquidity = round(previousVisibleSize, 8);
  const queueConsumed = Math.min(previousQueueAhead, consumedLiquidity);
  const residualLiquidity = round(Math.max(consumedLiquidity - previousQueueAhead, 0), 8);
  order.queueAheadEstimate = round(Math.max(previousQueueAhead - queueConsumed, 0), 8);
  order.lastSeenOppositeSize = top.size;
  order.availableLiquidityEstimate = residualLiquidity;
  return true;
}

export class PaperBrokerEngine implements PaperBroker {
  private readonly logger = createLogger("paper-broker");
  private readonly orders = new Map<string, PaperOrderRecord>();
  private readonly positions = new Map<string, ReturnType<typeof createEmptyPosition>>();
  private readonly trades = new Map<string, PaperTradeLifecycle>();
  private readonly fills: PaperFillRecord[] = [];
  private readonly events: PaperBrokerEvent[] = [];
  private orderCounter = 0;
  private fillCounter = 0;

  constructor(
    private readonly fillModel: PaperFillModel = new ConservativePaperFillModel(),
    private readonly config: PaperFillModelConfig = DEFAULT_PAPER_FILL_MODEL_CONFIG,
  ) {}

  submitLimitOrder(request: PaperLimitOrderRequest): PaperOrderRecord {
    if (request.liquidityIntent !== "maker") {
      throw new Error("PaperBrokerEngine only accepts passive maker limit orders.");
    }

    const order: PaperOrderRecord = {
      orderId: nextId("paper-order", ++this.orderCounter),
      clientOrderId: request.clientOrderId,
      marketId: request.marketId,
      outcomeTokenId: request.outcomeTokenId,
      side: request.side,
      price: request.price,
      size: request.size,
      remainingSize: request.size,
      filledSize: 0,
      liquidityIntent: request.liquidityIntent,
      status: "OPEN",
      createdAtTs: request.submittedAtTs,
      updatedAtTs: request.submittedAtTs,
      touchCount: 0,
      lastTouchedTs: null,
      queueAheadEstimate: null,
      lastSeenOppositeSize: null,
      availableLiquidityEstimate: null,
    };

    this.orders.set(order.orderId, order);
    this.recordEvent({
      type: "order_opened",
      ts: request.submittedAtTs,
      order: cloneOrder(order),
    });

    return cloneOrder(order);
  }

  cancelOrder(
    orderId: string,
    canceledAtTs: number,
    reason = "user_requested",
  ): PaperOrderRecord | null {
    const order = this.orders.get(orderId);
    if (!order || !["OPEN", "PARTIALLY_FILLED"].includes(order.status)) {
      return null;
    }

    order.status = reason === "replaced" ? "REPLACED" : "CANCELED";
    order.updatedAtTs = canceledAtTs;
    order.cancelReason = reason;
    this.recordEvent({
      type: "order_canceled",
      ts: canceledAtTs,
      orderId,
      reason,
    });

    return cloneOrder(order);
  }

  replaceOrder(orderId: string, replacement: PaperLimitOrderRequest): PaperOrderRecord | null {
    const canceled = this.cancelOrder(orderId, replacement.submittedAtTs, "replaced");
    if (!canceled) {
      return null;
    }

    const nextOrder = this.submitLimitOrder(replacement);
    canceled.replacedByOrderId = nextOrder.orderId;
    this.orders.set(canceled.orderId, canceled);
    this.recordEvent({
      type: "order_replaced",
      ts: replacement.submittedAtTs,
      previousOrderId: canceled.orderId,
      nextOrderId: nextOrder.orderId,
    });

    return nextOrder;
  }

  simulateAggressiveExit(
    request: PaperAggressiveExitRequest,
    snapshot: OrderBookSnapshot,
  ): PaperFillRecord | null {
    const position = this.positions.get(positionKey(request.marketId, request.outcomeTokenId));
    if (!position || position.size === 0) {
      this.logger.warn("aggressive exit skipped without open position", {
        marketId: request.marketId,
        outcomeTokenId: request.outcomeTokenId,
        side: request.side,
      });
      return null;
    }

    const expectedExitSide = position.size > 0 ? "sell" : "buy";
    if (request.side !== expectedExitSide) {
      this.logger.warn("aggressive exit skipped due to side mismatch", {
        marketId: request.marketId,
        outcomeTokenId: request.outcomeTokenId,
        side: request.side,
        expectedExitSide,
      });
      return null;
    }

    const requestedSize = Math.min(Math.abs(position.size), request.size);
    if (requestedSize <= 0) {
      return null;
    }

    const simulation = this.fillModel.simulateAggressiveExitFill(
      {
        ...request,
        size: requestedSize,
      },
      snapshot,
      this.config,
    );
    if (!simulation) {
      return null;
    }

    const fill = this.recordFill({
      orderId: nextId("paper-exit", ++this.orderCounter),
      clientOrderId: `paper-exit-${this.orderCounter}`,
      marketId: request.marketId,
      outcomeTokenId: request.outcomeTokenId,
      side: request.side,
      price: simulation.fillPrice,
      size: simulation.filledSize,
      fee: round(simulation.fillPrice * simulation.filledSize * simulation.feeRate, 8),
      liquidity: "taker",
      ts: request.requestedAtTs,
      aggressiveExit: true,
      remainingOrderSize: simulation.remainingSize,
      fillConfidence: simulation.fillConfidence,
    });

    return fill;
  }

  onOrderBookSnapshot(snapshot: OrderBookSnapshot): PaperFillRecord[] {
    const fills: PaperFillRecord[] = [];

    for (const order of this.orders.values()) {
      if (
        order.marketId !== snapshot.marketId ||
        order.outcomeTokenId !== snapshot.outcomeTokenId ||
        !["OPEN", "PARTIALLY_FILLED"].includes(order.status)
      ) {
        continue;
      }

      const touched = updatePassiveQueueState(order, snapshot);
      if (!touched) {
        order.updatedAtTs = snapshot.ts;
      }

      const simulated = this.fillModel.simulatePassiveFill(order, snapshot, this.config);
      if (!simulated) {
        continue;
      }

      const fill = this.recordFill({
        orderId: order.orderId,
        clientOrderId: order.clientOrderId,
        marketId: order.marketId,
        outcomeTokenId: order.outcomeTokenId,
        side: order.side,
        price: order.price,
        size: simulated.filledSize,
        fee: round(order.price * simulated.filledSize * simulated.feeRate, 8),
        liquidity: "maker",
        ts: snapshot.ts,
        aggressiveExit: false,
        remainingOrderSize: round(order.remainingSize - simulated.filledSize, 8),
        fillConfidence: simulated.fillConfidence,
      });

      order.filledSize = round(order.filledSize + fill.size, 8);
      order.remainingSize = fill.remainingOrderSize;
      order.updatedAtTs = snapshot.ts;
      order.status = order.remainingSize > 0 ? "PARTIALLY_FILLED" : "FILLED";
      order.availableLiquidityEstimate = 0;
      fills.push(fill);
    }

    this.markPortfolio(snapshot);
    return fills;
  }

  getState(): PaperBrokerState {
    const portfolio = aggregatePortfolio(this.positions);

    return {
      openOrders: [...this.orders.values()]
        .filter((order) => ["OPEN", "PARTIALLY_FILLED"].includes(order.status))
        .map(cloneOrder),
      fills: [...this.fills],
      positions: portfolio.positions,
      tradeLifecycles: [...this.trades.values()].map((trade) => ({ ...trade })),
      realizedPnl: portfolio.realizedPnl,
      unrealizedPnl: portfolio.unrealizedPnl,
      eventLog: [...this.events],
    };
  }

  private recordFill(input: {
    orderId: string;
    clientOrderId: string;
    marketId: string;
    outcomeTokenId: string;
    side: PaperFillRecord["side"];
    price: number;
    size: number;
    fee: number;
    liquidity: LiquidityIntent;
    ts: number;
    aggressiveExit: boolean;
    remainingOrderSize: number;
    fillConfidence: PaperFillRecord["fillConfidence"];
  }): PaperFillRecord {
    const fill: PaperFillRecord = {
      fillId: nextId("paper-fill", ++this.fillCounter),
      orderId: input.orderId,
      clientOrderId: input.clientOrderId,
      marketId: input.marketId,
      outcomeTokenId: input.outcomeTokenId,
      side: input.side,
      price: input.price,
      size: input.size,
      fee: input.fee,
      liquidity: input.liquidity,
      ts: input.ts,
      aggressiveExit: input.aggressiveExit,
      remainingOrderSize: input.remainingOrderSize,
      fillConfidence: input.fillConfidence,
    };

    this.fills.push(fill);
    const key = positionKey(fill.marketId, fill.outcomeTokenId);
    const currentPosition = this.positions.get(key) ?? createEmptyPosition(fill.marketId, fill.outcomeTokenId);
    const existingTrade = currentPosition.openTradeId
      ? this.trades.get(currentPosition.openTradeId) ?? null
      : null;
    const applied = applyFillToPosition(currentPosition, fill, existingTrade);

    this.positions.set(key, applied.position);
    if (applied.tradeLifecycle) {
      this.trades.set(applied.tradeLifecycle.tradeId, applied.tradeLifecycle);
    }
    if (applied.closedTrade) {
      this.trades.set(applied.closedTrade.tradeId, applied.closedTrade);
    }

    this.recordEvent({
      type: "fill_recorded",
      ts: fill.ts,
      fill,
    });
    this.logger.info("paper fill recorded", {
      fillId: fill.fillId,
      orderId: fill.orderId,
      side: fill.side,
      size: fill.size,
      price: fill.price,
      aggressiveExit: fill.aggressiveExit,
    });

    return fill;
  }

  private markPortfolio(snapshot: OrderBookSnapshot) {
    const midpoint =
      snapshot.bids[0] && snapshot.asks[0]
        ? round((snapshot.bids[0].price + snapshot.asks[0].price) / 2, 8)
        : null;
    const key = positionKey(snapshot.marketId, snapshot.outcomeTokenId);
    const position = this.positions.get(key);
    if (!position) {
      return;
    }

    const marked = markPosition(position, midpoint);
    this.positions.set(key, marked);
    this.recordEvent({
      type: "position_marked",
      ts: snapshot.ts,
      marketId: snapshot.marketId,
      outcomeTokenId: snapshot.outcomeTokenId,
      markPrice: midpoint,
      unrealizedPnl: marked.unrealizedPnl,
    });
  }

  private recordEvent(event: PaperBrokerEvent) {
    this.events.push(event);
  }
}
