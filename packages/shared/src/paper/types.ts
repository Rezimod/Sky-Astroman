import type {
  FillEvent,
  LiquidityIntent,
  OrderBookSnapshot,
  OrderIntent,
  Side,
} from "../types/index.js";
import type { ExecutionFrictionConfig } from "../execution-friction.js";

export type PaperOrderStatus =
  | "OPEN"
  | "PARTIALLY_FILLED"
  | "FILLED"
  | "CANCELED"
  | "REPLACED"
  | "REJECTED";

export type PaperFillModelConfig = {
  /**
   * Fraction of displayed top-of-book liquidity assumed realistically accessible to our passive order.
   */
  passiveParticipationRate: number;
  /**
   * Number of touches required before a passive order becomes eligible to fill.
   */
  minTouchesBeforeFill: number;
  /**
   * Minimum resting time before a passive order can fill.
   */
  queuePriorityDelayMs: number;
  /**
   * Orders older than this receive a fill-probability penalty to model stale queue position.
   */
  staleOrderAfterMs: number;
  /**
   * Multiplier applied to participation after an order becomes stale.
   */
  staleParticipationMultiplier: number;
  /**
   * Smallest partial fill size worth recording.
   */
  minPartialFillSize: number;
  /**
   * Shared execution friction assumptions used by both signal gating and paper fills.
   */
  executionFriction: ExecutionFrictionConfig;
};

export type PaperFillConfidence = "displayed_depth" | "price_through_inferred";

export type PaperLimitOrderRequest = OrderIntent & {
  submittedAtTs: number;
};

export type PaperAggressiveExitRequest = {
  marketId: string;
  outcomeTokenId: string;
  side: Side;
  size: number;
  requestedAtTs: number;
};

export type PaperOrderRecord = {
  orderId: string;
  clientOrderId: string;
  marketId: string;
  outcomeTokenId: string;
  side: Side;
  price: number;
  size: number;
  remainingSize: number;
  filledSize: number;
  liquidityIntent: LiquidityIntent;
  status: PaperOrderStatus;
  createdAtTs: number;
  updatedAtTs: number;
  touchCount: number;
  lastTouchedTs: number | null;
  queueAheadEstimate: number | null;
  lastSeenOppositeSize: number | null;
  availableLiquidityEstimate: number | null;
  cancelReason?: string;
  replacedByOrderId?: string;
};

export type PaperFillRecord = FillEvent & {
  fillId: string;
  clientOrderId: string;
  remainingOrderSize: number;
  aggressiveExit: boolean;
  fillConfidence: PaperFillConfidence;
};

export type PaperPosition = {
  marketId: string;
  outcomeTokenId: string;
  size: number;
  averageEntryPrice: number;
  realizedPnl: number;
  unrealizedPnl: number;
  markPrice: number | null;
  totalFees: number;
  openTradeId: string | null;
};

export type PaperTradeLifecycle = {
  tradeId: string;
  marketId: string;
  outcomeTokenId: string;
  side: Side;
  openedAtTs: number;
  closedAtTs: number | null;
  entryValue: number;
  exitValue: number;
  sizeOpened: number;
  sizeClosed: number;
  realizedPnl: number;
  fees: number;
  fillIds: string[];
  status: "OPEN" | "CLOSED";
};

export type PaperBrokerEvent =
  | {
      type: "order_opened";
      ts: number;
      order: PaperOrderRecord;
    }
  | {
      type: "order_canceled";
      ts: number;
      orderId: string;
      reason: string;
    }
  | {
      type: "order_replaced";
      ts: number;
      previousOrderId: string;
      nextOrderId: string;
    }
  | {
      type: "fill_recorded";
      ts: number;
      fill: PaperFillRecord;
    }
  | {
      type: "position_marked";
      ts: number;
      marketId: string;
      outcomeTokenId: string;
      markPrice: number | null;
      unrealizedPnl: number;
    };

export type PaperBrokerState = {
  openOrders: PaperOrderRecord[];
  fills: PaperFillRecord[];
  positions: PaperPosition[];
  tradeLifecycles: PaperTradeLifecycle[];
  realizedPnl: number;
  unrealizedPnl: number;
  eventLog: PaperBrokerEvent[];
};

export type FillSimulationResult = {
  filledSize: number;
  feeRate: number;
  fillConfidence: PaperFillConfidence;
};

export interface PaperFillModel {
  simulatePassiveFill(
    order: PaperOrderRecord,
    snapshot: OrderBookSnapshot,
    config: PaperFillModelConfig,
  ): FillSimulationResult | null;
  simulateAggressiveExitFill(
    request: PaperAggressiveExitRequest,
    snapshot: OrderBookSnapshot,
    config: PaperFillModelConfig,
  ): {
    fillPrice: number;
    feeRate: number;
    filledSize: number;
    remainingSize: number;
    fillConfidence: PaperFillConfidence;
  } | null;
}

export interface PaperBroker {
  submitLimitOrder(request: PaperLimitOrderRequest): PaperOrderRecord;
  cancelOrder(orderId: string, canceledAtTs: number, reason?: string): PaperOrderRecord | null;
  replaceOrder(
    orderId: string,
    replacement: PaperLimitOrderRequest,
  ): PaperOrderRecord | null;
  simulateAggressiveExit(
    request: PaperAggressiveExitRequest,
    snapshot: OrderBookSnapshot,
  ): PaperFillRecord | null;
  onOrderBookSnapshot(snapshot: OrderBookSnapshot): PaperFillRecord[];
  getState(): PaperBrokerState;
}
