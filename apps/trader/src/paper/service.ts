import {
  ConservativePaperFillModel,
  DEFAULT_FEATURE_ENGINE_CONFIG,
  DEFAULT_MAKER_SIGNAL_CONFIG,
  DEFAULT_PAPER_FILL_MODEL_CONFIG,
  DEFAULT_RISK_ENGINE_CONFIG,
  DefaultRiskEngine,
  PaperBrokerEngine,
  RollingFeatureEngine,
  RollingRiskMetricsStore,
  buildFeatures,
  computeMidpoint,
  computeSpread,
  createLogger,
  generateStrategyDecision,
  type MarketDescriptor,
  type MarketScannerDecision,
  type MarketScannerSnapshot,
  type OrderBookSnapshot,
  type PaperBrokerState,
  type PaperTradingDecisionSnapshot,
  type PaperTradingFillSnapshot,
  type PaperTradingOrderSnapshot,
  type PaperTradingPositionSnapshot,
  type PaperTradingSnapshot,
  type PaperTradeLifecycle,
  type RiskEvaluationDecision,
  type ServiceStatus,
  type Side,
  type StrategyInventoryState,
  type StrategyMarketState,
} from "@polymarket-bot/shared";
import type {
  OrderBookSubscriptionHandle,
  PolymarketMarketGateway,
} from "@polymarket-bot/polymarket-adapter";

type LoggerLike = ReturnType<typeof createLogger>;

type PaperTradingServiceOptions = {
  marketData: PolymarketMarketGateway;
  logger?: LoggerLike;
};

type CandidateContext = {
  instrumentKey: string;
  market: MarketDescriptor;
  outcome: string;
  tokenId: string;
  slug: string | null;
  question: string;
  scannerAccepted: boolean;
  scannerScore: number;
  scannerReasons: string[];
};

type MarketRuntimeState = {
  lastEntryTs: number | null;
  lastExitTs: number | null;
  lastLossExitTs: number | null;
  lastTradeSide: Side | null;
  consecutiveLosingExits: number;
  cooldownUntilTs: number | null;
  reentryBlockedUntilTs: number | null;
};

type PendingAggressiveExit = {
  marketId: string;
  outcomeTokenId: string;
  side: Side;
  firstRequestedAtTs: number;
  lastAttemptTs: number;
  remainingSize: number;
  attempts: number;
};

type PaperRuntimeStats = {
  decisionsGenerated: number;
  approvals: number;
  reductions: number;
  rejections: number;
  ordersSubmitted: number;
  ordersCanceled: number;
  ordersReplaced: number;
  submittedPassiveSize: number;
  makerFilledSize: number;
  aggressiveExitAttempts: number;
  aggressiveExitRetries: number;
  aggressiveExitPartialCount: number;
};

type PaperRuntimeConfig = {
  initialCash: number;
  maxAbsPositionSize: number;
  maxOrderSize: number;
  maxTrackedCandidates: number;
  aggressiveExitOnStrategyExit: boolean;
  cancelOpenOrdersOnHold: boolean;
  cancelOpenOrdersOnReject: boolean;
  strategyConfig: typeof DEFAULT_MAKER_SIGNAL_CONFIG;
  riskConfig: typeof DEFAULT_RISK_ENGINE_CONFIG;
  featureConfig: typeof DEFAULT_FEATURE_ENGINE_CONFIG;
  paperFillConfig: typeof DEFAULT_PAPER_FILL_MODEL_CONFIG;
  recentDecisionLimit: number;
  recentFillLimit: number;
};

const DEFAULT_PAPER_RUNTIME_CONFIG: PaperRuntimeConfig = {
  initialCash: 1_000,
  maxAbsPositionSize: 100,
  maxOrderSize: 50,
  maxTrackedCandidates: 4,
  aggressiveExitOnStrategyExit: true,
  cancelOpenOrdersOnHold: true,
  cancelOpenOrdersOnReject: true,
  strategyConfig: { ...DEFAULT_MAKER_SIGNAL_CONFIG },
  riskConfig: {
    ...DEFAULT_RISK_ENGINE_CONFIG,
    maxRiskPerTradeNotional: 100,
    maxNotionalExposure: 500,
    maxInventoryImbalance: 100,
    maxConcurrentOpenOrders: 4,
    maxDailyLoss: 250,
    maxLosingStreak: 6,
    rollingExpectancyMinTrades: 20,
    minTopBookDepth: 25,
    abnormalSpreadAbsolute: 0.08,
    noTradeBeforeExpiryHours: 0.25,
  },
  featureConfig: { ...DEFAULT_FEATURE_ENGINE_CONFIG },
  paperFillConfig: { ...DEFAULT_PAPER_FILL_MODEL_CONFIG },
  recentDecisionLimit: 120,
  recentFillLimit: 80,
};

function round(value: number, digits = 8): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function instrumentKey(marketId: string, outcomeTokenId: string): string {
  return `${marketId}:${outcomeTokenId}`;
}

function toIso(ts: number | null): string | null {
  return ts === null ? null : new Date(ts).toISOString();
}

function currentTopBookDepth(snapshot: OrderBookSnapshot): number {
  return round((snapshot.bids[0]?.size ?? 0) + (snapshot.asks[0]?.size ?? 0), 8);
}

function findPosition(
  brokerState: PaperBrokerState,
  marketId: string,
  outcomeTokenId: string,
) {
  return brokerState.positions.find(
    (position) =>
      position.marketId === marketId && position.outcomeTokenId === outcomeTokenId,
  );
}

function buildStrategyMarketState(
  market: MarketDescriptor,
  snapshot: OrderBookSnapshot,
): StrategyMarketState {
  return {
    marketId: market.marketId,
    outcomeTokenId: snapshot.outcomeTokenId,
    status: market.status,
    bestBid: snapshot.bids[0]?.price ?? null,
    bestAsk: snapshot.asks[0]?.price ?? null,
    midpoint: computeMidpoint(snapshot),
    spread: computeSpread(snapshot),
    tickSize: market.tickSize ?? 0.001,
    minOrderSize: market.minOrderSize ?? 1,
    timeToExpiryHours: market.endTime
      ? round((new Date(market.endTime).getTime() - snapshot.ts) / 3_600_000, 8)
      : null,
  };
}

function buildPortfolioRiskState(
  brokerState: PaperBrokerState,
  marketId: string,
  outcomeTokenId: string,
) {
  const position = findPosition(brokerState, marketId, outcomeTokenId);
  const grossExposure = brokerState.positions.reduce((sum, currentPosition) => {
    const mark = currentPosition.markPrice ?? currentPosition.averageEntryPrice;
    return round(sum + Math.abs(currentPosition.size) * mark, 8);
  }, 0);

  return {
    currentPositionSize: position?.size ?? 0,
    averageEntryPrice: position ? position.averageEntryPrice : null,
    grossNotionalExposure: grossExposure,
    openOrderNotional: round(
      brokerState.openOrders.reduce((sum, order) => sum + order.remainingSize * order.price, 0),
      8,
    ),
    openOrdersCount: brokerState.openOrders.length,
    realizedPnl: brokerState.realizedPnl,
    unrealizedPnl: brokerState.unrealizedPnl,
  };
}

function initialMarketRuntimeState(): MarketRuntimeState {
  return {
    lastEntryTs: null,
    lastExitTs: null,
    lastLossExitTs: null,
    lastTradeSide: null,
    consecutiveLosingExits: 0,
    cooldownUntilTs: null,
    reentryBlockedUntilTs: null,
  };
}

function pushCapped<T>(items: T[], item: T, limit: number): T[] {
  const next = [...items, item];
  return next.length > limit ? next.slice(next.length - limit) : next;
}

function closedTradeMetrics(trades: PaperTradeLifecycle[]) {
  const closed = trades.filter(
    (trade) => trade.status === "CLOSED" && trade.closedAtTs !== null,
  );
  const wins = closed.filter((trade) => trade.realizedPnl > 0);
  const losses = closed.filter((trade) => trade.realizedPnl < 0);

  return {
    closedTrades: closed.length,
    winRate: closed.length > 0 ? round(wins.length / closed.length, 8) : null,
    expectancy:
      closed.length > 0
        ? round(
            closed.reduce((sum, trade) => sum + trade.realizedPnl, 0) / closed.length,
            8,
          )
        : null,
    avgWin:
      wins.length > 0
        ? round(
            wins.reduce((sum, trade) => sum + trade.realizedPnl, 0) / wins.length,
            8,
          )
        : null,
    avgLoss:
      losses.length > 0
        ? round(
            losses.reduce((sum, trade) => sum + trade.realizedPnl, 0) / losses.length,
            8,
          )
        : null,
  };
}

function baseStats(): PaperRuntimeStats {
  return {
    decisionsGenerated: 0,
    approvals: 0,
    reductions: 0,
    rejections: 0,
    ordersSubmitted: 0,
    ordersCanceled: 0,
    ordersReplaced: 0,
    submittedPassiveSize: 0,
    makerFilledSize: 0,
    aggressiveExitAttempts: 0,
    aggressiveExitRetries: 0,
    aggressiveExitPartialCount: 0,
  };
}

export class PaperTradingService {
  private readonly logger: LoggerLike;
  private readonly config = DEFAULT_PAPER_RUNTIME_CONFIG;
  private readonly broker = new PaperBrokerEngine(
    new ConservativePaperFillModel(),
    this.config.paperFillConfig,
  );
  private readonly featureEngine = new RollingFeatureEngine(this.config.featureConfig);
  private readonly riskEngine = new DefaultRiskEngine(this.config.riskConfig);
  private readonly riskStore = new RollingRiskMetricsStore(this.config.riskConfig);
  private readonly stats = baseStats();
  private readonly knownInstruments = new Map<string, CandidateContext>();
  private readonly acceptedInstruments = new Map<string, CandidateContext>();
  private readonly runtimeStateByInstrument = new Map<string, MarketRuntimeState>();
  private readonly pendingAggressiveExits = new Map<string, PendingAggressiveExit>();
  private readonly seenClosedTradeIds = new Set<string>();
  private recentDecisions: PaperTradingDecisionSnapshot[] = [];
  private started = false;
  private stopped = false;
  private subscription?: OrderBookSubscriptionHandle;
  private subscriptionTokenKey = "";
  private latestSubscriptionStatus: "connecting" | "connected" | "reconnecting" | "closed" | null =
    null;
  private lastError: string | null = null;
  private lastUpdatedTs: number | null = null;
  private lastDecisionTs: number | null = null;
  private lastFillTs: number | null = null;
  private activeSync?: Promise<void>;
  private syncQueued = false;
  private eventQueue: Promise<void> = Promise.resolve();
  private lastSnapshot: PaperTradingSnapshot = this.buildSnapshot();

  constructor(private readonly options: PaperTradingServiceOptions) {
    this.logger = options.logger ?? createLogger("paper-trading");
  }

  async start() {
    this.started = true;
    this.stopped = false;
    this.rebuildSnapshot();
  }

  async stop() {
    this.started = false;
    this.stopped = true;
    if (this.subscription) {
      await this.subscription.close();
      this.subscription = undefined;
    }
    this.subscriptionTokenKey = "";
    this.latestSubscriptionStatus = "closed";
    this.rebuildSnapshot();
  }

  getStatus(): ServiceStatus {
    if (!this.started) {
      return this.stopped ? "stopped" : "idle";
    }

    const trackedMarkets = this.computeDesiredInstrumentKeys().length;
    if (this.lastError) {
      return "degraded";
    }
    if (
      trackedMarkets > 0 &&
      this.latestSubscriptionStatus !== null &&
      this.latestSubscriptionStatus !== "connected"
    ) {
      return "degraded";
    }
    return "running";
  }

  getSnapshot(): PaperTradingSnapshot {
    return this.lastSnapshot;
  }

  onScannerSnapshot(snapshot: MarketScannerSnapshot): void {
    const decisions = [...snapshot.candidates, ...snapshot.rejected];
    for (const decision of decisions) {
      const context = this.toCandidateContext(decision);
      this.knownInstruments.set(context.instrumentKey, context);
    }

    const nextAccepted = new Map<string, CandidateContext>();
    for (const decision of snapshot.candidates.slice(0, this.config.maxTrackedCandidates)) {
      const context = this.toCandidateContext(decision);
      nextAccepted.set(context.instrumentKey, context);
      this.knownInstruments.set(context.instrumentKey, context);
    }

    this.acceptedInstruments.clear();
    for (const [key, value] of nextAccepted.entries()) {
      this.acceptedInstruments.set(key, value);
    }

    this.requestSubscriptionSync();
    this.rebuildSnapshot();
  }

  private toCandidateContext(decision: MarketScannerDecision): CandidateContext {
    return {
      instrumentKey: instrumentKey(
        decision.market.marketId,
        decision.selectedOutcome.tokenId,
      ),
      market: decision.market,
      outcome: decision.selectedOutcome.outcome,
      tokenId: decision.selectedOutcome.tokenId,
      slug: decision.market.slug ?? null,
      question: decision.market.question,
      scannerAccepted: decision.accepted,
      scannerScore: decision.score,
      scannerReasons: [...decision.reasons],
    };
  }

  private requestSubscriptionSync() {
    if (this.activeSync) {
      this.syncQueued = true;
      return;
    }

    this.activeSync = this.runSubscriptionSync()
      .catch((error) => {
        this.lastError = error instanceof Error ? error.message : String(error);
        this.logger.error("paper trading subscription sync failed", {
          error: this.lastError,
        });
      })
      .finally(() => {
        this.activeSync = undefined;
        if (this.syncQueued) {
          this.syncQueued = false;
          this.requestSubscriptionSync();
        }
      });
  }

  private async runSubscriptionSync() {
    if (!this.started) {
      return;
    }

    const trackedContexts = this.computeTrackedContexts();
    const tokenIds = trackedContexts.map((context) => context.tokenId).sort();
    const tokenKey = tokenIds.join(",");

    if (tokenKey === this.subscriptionTokenKey) {
      this.rebuildSnapshot();
      return;
    }

    if (this.subscription) {
      await this.subscription.close();
      this.subscription = undefined;
    }

    this.subscriptionTokenKey = tokenKey;

    if (tokenIds.length === 0) {
      this.latestSubscriptionStatus = "closed";
      this.lastError = null;
      this.rebuildSnapshot();
      return;
    }

    this.latestSubscriptionStatus = "connecting";
    this.lastError = null;
    this.subscription = await this.options.marketData.subscribeToOrderBook({
      tokenIds,
      onEvent: (event) => {
        if (event.type !== "orderbook_snapshot" && event.type !== "orderbook_delta") {
          return;
        }
        const context = this.knownInstruments.get(
          instrumentKey(event.marketId, event.outcomeTokenId),
        );
        if (!context) {
          return;
        }
        this.queueSnapshotProcessing(context, event.orderBook);
      },
      onStatusChange: (status) => {
        this.latestSubscriptionStatus = status;
        this.rebuildSnapshot();
      },
      onError: (error) => {
        this.lastError = error.message;
        this.rebuildSnapshot();
      },
    });

    this.rebuildSnapshot();
  }

  private queueSnapshotProcessing(context: CandidateContext, snapshot: OrderBookSnapshot) {
    this.eventQueue = this.eventQueue
      .then(() => {
        this.processSnapshot(context, snapshot);
      })
      .catch((error) => {
        this.lastError = error instanceof Error ? error.message : String(error);
        this.logger.error("paper trading snapshot processing failed", {
          error: this.lastError,
          marketId: context.market.marketId,
          outcomeTokenId: snapshot.outcomeTokenId,
        });
        this.rebuildSnapshot();
      });
  }

  private processSnapshot(context: CandidateContext, snapshot: OrderBookSnapshot) {
    this.lastError = null;

    const fills = this.broker.onOrderBookSnapshot(snapshot);
    if (fills.length > 0) {
      this.stats.makerFilledSize = round(
        this.stats.makerFilledSize +
          fills
            .filter((fill) => fill.liquidity === "maker")
            .reduce((sum, fill) => sum + fill.size, 0),
        8,
      );
      this.lastFillTs = fills[fills.length - 1]?.ts ?? this.lastFillTs;
    }

    this.syncClosedTrades();
    this.riskStore.recordMarketSample({
      instrumentKey: context.instrumentKey,
      ts: snapshot.ts,
      spread: computeSpread(snapshot),
      topBookDepth: currentTopBookDepth(snapshot),
    });

    const brokerState = this.broker.getState();
    const position = findPosition(
      brokerState,
      context.market.marketId,
      snapshot.outcomeTokenId,
    );
    const featureState = this.featureEngine.ingest({
      market: context.market,
      snapshot,
      inventory: {
        positionSize: position?.size ?? 0,
        maxAbsPositionSize: this.config.maxAbsPositionSize,
      },
    });
    const features = buildFeatures(featureState);
    const runtimeState =
      this.runtimeStateByInstrument.get(context.instrumentKey) ??
      initialMarketRuntimeState();
    const strategyMarket = buildStrategyMarketState(context.market, snapshot);
    const strategyInventory: StrategyInventoryState = {
      positionSize: position?.size ?? 0,
      averageEntryPrice: position ? position.averageEntryPrice : null,
      maxAbsPositionSize: this.config.maxAbsPositionSize,
      lastEntryTs: runtimeState.lastEntryTs,
      lastExitTs: runtimeState.lastExitTs,
      lastLossExitTs: runtimeState.lastLossExitTs,
      lastTradeSide: runtimeState.lastTradeSide,
      consecutiveLosingExits: runtimeState.consecutiveLosingExits,
    };
    const strategyRisk = this.buildStrategyRiskState(
      brokerState,
      strategyInventory.positionSize,
    );
    const pendingAggressiveExit = this.pendingAggressiveExits.get(context.instrumentKey);

    if (pendingAggressiveExit) {
      if (strategyInventory.positionSize === 0) {
        this.pendingAggressiveExits.delete(context.instrumentKey);
      } else {
        const canceled = this.cancelOrders(
          this.activeOrdersForMarket(
            brokerState,
            context.market.marketId,
            snapshot.outcomeTokenId,
          ),
          snapshot.ts,
          "pending_aggressive_exit_cleanup",
        );
        this.stats.ordersCanceled += canceled;
        this.attemptAggressiveExit({
          snapshot,
          side: pendingAggressiveExit.side,
          requestedSize: pendingAggressiveExit.remainingSize,
          firstRequestedAtTs: pendingAggressiveExit.firstRequestedAtTs,
          retry: true,
        });
        this.syncClosedTrades();
        this.lastUpdatedTs = snapshot.ts;
        this.rebuildSnapshot();
        return;
      }
    }

    const decision = generateStrategyDecision({
      features,
      market: strategyMarket,
      inventory: strategyInventory,
      risk: strategyRisk,
      runtime: {
        cooldownUntilTs: runtimeState.cooldownUntilTs,
        reentryBlockedUntilTs: runtimeState.reentryBlockedUntilTs,
        lastExitSide: runtimeState.lastTradeSide,
      },
      config: this.config.strategyConfig,
      nowTs: snapshot.ts,
    });
    this.stats.decisionsGenerated += 1;
    this.lastDecisionTs = snapshot.ts;

    const riskDecision = this.riskEngine.evaluate({
      decision,
      market: {
        ...strategyMarket,
        topBookDepth: currentTopBookDepth(snapshot),
      },
      portfolio: buildPortfolioRiskState(
        brokerState,
        context.market.marketId,
        snapshot.outcomeTokenId,
      ),
      metrics: this.riskStore.getSnapshot(snapshot.ts, context.instrumentKey),
      nowTs: snapshot.ts,
      runMode: "paper",
    });

    if (riskDecision.action === "APPROVE") {
      this.stats.approvals += 1;
    } else if (riskDecision.action === "REDUCE") {
      this.stats.reductions += 1;
    } else {
      this.stats.rejections += 1;
    }

    this.recordDecision(context, decision, riskDecision, snapshot.ts);

    const execution = this.executeDecision(riskDecision, snapshot);
    this.stats.ordersSubmitted += execution.submitted;
    this.stats.ordersCanceled += execution.canceled;
    this.stats.ordersReplaced += execution.replaced;
    this.stats.submittedPassiveSize = round(
      this.stats.submittedPassiveSize + execution.submittedSize,
      8,
    );

    this.syncClosedTrades();
    this.lastUpdatedTs = snapshot.ts;
    this.rebuildSnapshot();
  }

  private buildStrategyRiskState(brokerState: PaperBrokerState, positionSize: number) {
    const grossExposure = brokerState.positions.reduce((sum, position) => {
      const mark = position.markPrice ?? position.averageEntryPrice;
      return sum + Math.abs(position.size) * mark;
    }, 0);
    const openOrderNotional = brokerState.openOrders.reduce(
      (sum, order) => sum + order.remainingSize * order.price,
      0,
    );
    const sessionPnl = brokerState.realizedPnl + brokerState.unrealizedPnl;
    const dailyLossLimitHit = sessionPnl <= -this.config.riskConfig.maxDailyLoss;
    const grossExposureLimitHit =
      grossExposure + openOrderNotional >= this.config.riskConfig.maxNotionalExposure;

    return {
      tradingEnabled: this.config.riskConfig.tradingEnabled,
      canEnter: !dailyLossLimitHit && !grossExposureLimitHit,
      canExit: true,
      canQuote: !dailyLossLimitHit && !grossExposureLimitHit,
      maxOrderSize: this.config.maxOrderSize,
      remainingPositionCapacity: Math.max(
        this.config.maxAbsPositionSize - Math.abs(positionSize),
        0,
      ),
      dailyLossLimitHit,
      grossExposureLimitHit,
    };
  }

  private activeOrdersForMarket(
    brokerState: PaperBrokerState,
    marketId: string,
    outcomeTokenId: string,
  ) {
    return brokerState.openOrders.filter(
      (order) =>
        order.marketId === marketId && order.outcomeTokenId === outcomeTokenId,
    );
  }

  private cancelOrders(
    orders: PaperBrokerState["openOrders"],
    ts: number,
    reason: string,
  ): number {
    let canceled = 0;
    for (const order of orders) {
      const result = this.broker.cancelOrder(order.orderId, ts, reason);
      if (result) {
        canceled += 1;
      }
    }
    return canceled;
  }

  private attemptAggressiveExit(args: {
    snapshot: OrderBookSnapshot;
    side: Side;
    requestedSize: number;
    firstRequestedAtTs: number;
    retry: boolean;
  }) {
    const key = instrumentKey(args.snapshot.marketId, args.snapshot.outcomeTokenId);
    const position = findPosition(
      this.broker.getState(),
      args.snapshot.marketId,
      args.snapshot.outcomeTokenId,
    );
    const sizeToExit = Math.min(Math.abs(position?.size ?? 0), args.requestedSize);

    if (!position || position.size === 0 || sizeToExit <= 0) {
      this.pendingAggressiveExits.delete(key);
      return;
    }

    this.stats.aggressiveExitAttempts += 1;
    if (args.retry) {
      this.stats.aggressiveExitRetries += 1;
    }

    const prior = this.pendingAggressiveExits.get(key);
    const attemptCount = (prior?.attempts ?? 0) + 1;
    const fill = this.broker.simulateAggressiveExit(
      {
        marketId: args.snapshot.marketId,
        outcomeTokenId: args.snapshot.outcomeTokenId,
        side: args.side,
        size: sizeToExit,
        requestedAtTs: args.snapshot.ts,
      },
      args.snapshot,
    );

    if (!fill) {
      this.pendingAggressiveExits.set(key, {
        marketId: args.snapshot.marketId,
        outcomeTokenId: args.snapshot.outcomeTokenId,
        side: args.side,
        firstRequestedAtTs: prior?.firstRequestedAtTs ?? args.firstRequestedAtTs,
        lastAttemptTs: args.snapshot.ts,
        remainingSize: round(sizeToExit, 8),
        attempts: attemptCount,
      });
      return;
    }

    this.lastFillTs = fill.ts;
    if (fill.remainingOrderSize > 0) {
      this.stats.aggressiveExitPartialCount += 1;
      this.pendingAggressiveExits.set(key, {
        marketId: args.snapshot.marketId,
        outcomeTokenId: args.snapshot.outcomeTokenId,
        side: args.side,
        firstRequestedAtTs: prior?.firstRequestedAtTs ?? args.firstRequestedAtTs,
        lastAttemptTs: args.snapshot.ts,
        remainingSize: fill.remainingOrderSize,
        attempts: attemptCount,
      });
      return;
    }

    this.pendingAggressiveExits.delete(key);
  }

  private upsertPassiveOrder(
    brokerState: PaperBrokerState,
    decision: RiskEvaluationDecision["decision"],
    marketId: string,
    outcomeTokenId: string,
    ts: number,
  ) {
    if (
      decision.side === null ||
      decision.targetEntryPrice === null ||
      decision.targetSize <= 0
    ) {
      return { submitted: 0, replaced: 0, canceled: 0, submittedSize: 0 };
    }

    const relatedOrders = this.activeOrdersForMarket(
      brokerState,
      marketId,
      outcomeTokenId,
    );
    const sameSideOrders = relatedOrders.filter((order) => order.side === decision.side);
    const oppositeSideOrders = relatedOrders.filter(
      (order) => order.side !== decision.side,
    );

    let canceled = this.cancelOrders(oppositeSideOrders, ts, "opposite_side_replaced");
    let submitted = 0;
    let replaced = 0;
    let submittedSize = 0;

    const primary = sameSideOrders[0];
    const needsChange =
      !primary ||
      primary.price !== decision.targetEntryPrice ||
      primary.remainingSize !== decision.targetSize;

    if (!primary) {
      this.broker.submitLimitOrder({
        clientOrderId: `paper-${marketId}-${outcomeTokenId}-${ts}`,
        marketId,
        outcomeTokenId,
        side: decision.side,
        price: decision.targetEntryPrice,
        size: decision.targetSize,
        liquidityIntent: "maker",
        submittedAtTs: ts,
      });
      submitted += 1;
      submittedSize += decision.targetSize;
    } else if (needsChange) {
      this.broker.replaceOrder(primary.orderId, {
        clientOrderId: `paper-${marketId}-${outcomeTokenId}-${ts}`,
        marketId,
        outcomeTokenId,
        side: decision.side,
        price: decision.targetEntryPrice,
        size: decision.targetSize,
        liquidityIntent: "maker",
        submittedAtTs: ts,
      });
      replaced += 1;
      submitted += 1;
      submittedSize += decision.targetSize;
    }

    if (sameSideOrders.length > 1) {
      canceled += this.cancelOrders(sameSideOrders.slice(1), ts, "dedupe_same_side");
    }

    return { submitted, replaced, canceled, submittedSize };
  }

  private executeDecision(
    riskDecision: RiskEvaluationDecision,
    snapshot: OrderBookSnapshot,
  ) {
    const brokerState = this.broker.getState();
    const relatedOrders = this.activeOrdersForMarket(
      brokerState,
      snapshot.marketId,
      snapshot.outcomeTokenId,
    );
    const actionDecision = riskDecision.decision;

    if (!riskDecision.approved) {
      return {
        submitted: 0,
        replaced: 0,
        canceled: this.config.cancelOpenOrdersOnReject
          ? this.cancelOrders(relatedOrders, snapshot.ts, "risk_rejected")
          : 0,
        submittedSize: 0,
      };
    }

    if (
      actionDecision.actionType === "HOLD" ||
      actionDecision.side === null ||
      actionDecision.targetSize <= 0
    ) {
      return {
        submitted: 0,
        replaced: 0,
        canceled: this.config.cancelOpenOrdersOnHold
          ? this.cancelOrders(relatedOrders, snapshot.ts, "hold_no_quote")
          : 0,
        submittedSize: 0,
      };
    }

    if (actionDecision.actionType === "EXIT") {
      const canceled = this.cancelOrders(relatedOrders, snapshot.ts, "exit_cleanup");
      if (this.config.aggressiveExitOnStrategyExit) {
        this.attemptAggressiveExit({
          snapshot,
          side: actionDecision.side,
          requestedSize: actionDecision.targetSize,
          firstRequestedAtTs: snapshot.ts,
          retry: false,
        });
        return { submitted: 0, replaced: 0, canceled, submittedSize: 0 };
      }

      const result = this.upsertPassiveOrder(
        this.broker.getState(),
        actionDecision,
        snapshot.marketId,
        snapshot.outcomeTokenId,
        snapshot.ts,
      );
      return { ...result, canceled: canceled + result.canceled };
    }

    return this.upsertPassiveOrder(
      brokerState,
      actionDecision,
      snapshot.marketId,
      snapshot.outcomeTokenId,
      snapshot.ts,
    );
  }

  private syncClosedTrades() {
    const brokerState = this.broker.getState();
    for (const trade of brokerState.tradeLifecycles) {
      if (
        trade.status !== "CLOSED" ||
        trade.closedAtTs === null ||
        this.seenClosedTradeIds.has(trade.tradeId)
      ) {
        continue;
      }

      this.seenClosedTradeIds.add(trade.tradeId);
      const key = instrumentKey(trade.marketId, trade.outcomeTokenId);
      const runtimeState =
        this.runtimeStateByInstrument.get(key) ?? initialMarketRuntimeState();
      runtimeState.lastExitTs = trade.closedAtTs;
      runtimeState.reentryBlockedUntilTs =
        trade.closedAtTs + this.config.strategyConfig.reentryCooldownMs;
      runtimeState.lastTradeSide = trade.side;
      if (trade.realizedPnl < 0) {
        runtimeState.lastLossExitTs = trade.closedAtTs;
        runtimeState.consecutiveLosingExits += 1;
        runtimeState.cooldownUntilTs = Math.max(
          runtimeState.cooldownUntilTs ?? 0,
          trade.closedAtTs + this.config.strategyConfig.cooldownAfterLossMs,
        );
      } else {
        runtimeState.consecutiveLosingExits = 0;
      }
      this.runtimeStateByInstrument.set(key, runtimeState);

      this.riskStore.recordClosedTrade({
        ts: trade.closedAtTs,
        realizedPnl: trade.realizedPnl,
        stopLossTriggered: trade.realizedPnl < 0,
      });
    }
  }

  private recordDecision(
    context: CandidateContext,
    strategyDecision: RiskEvaluationDecision["decision"],
    riskDecision: RiskEvaluationDecision,
    ts: number,
  ) {
    this.recentDecisions = pushCapped(
      this.recentDecisions,
      {
        ts,
        marketId: context.market.marketId,
        outcomeTokenId: context.tokenId,
        slug: context.slug,
        question: context.question,
        outcome: context.outcome,
        actionType: strategyDecision.actionType,
        side: strategyDecision.side,
        confidence: strategyDecision.confidence,
        heuristicScore: strategyDecision.heuristicScore,
        targetEntryPrice: strategyDecision.targetEntryPrice,
        targetSize: strategyDecision.targetSize,
        estimatedEdge: strategyDecision.estimatedEdge,
        strategyReasonCodes: [...strategyDecision.reasonCodes],
        riskAction: riskDecision.action,
        riskApproved: riskDecision.approved,
        riskReasonCodes: [...riskDecision.reasonCodes],
      },
      this.config.recentDecisionLimit,
    );
  }

  private computeDesiredInstrumentKeys(): string[] {
    const keys = new Set<string>(this.acceptedInstruments.keys());
    const brokerState = this.broker.getState();

    for (const position of brokerState.positions) {
      if (position.size !== 0) {
        keys.add(instrumentKey(position.marketId, position.outcomeTokenId));
      }
    }
    for (const order of brokerState.openOrders) {
      keys.add(instrumentKey(order.marketId, order.outcomeTokenId));
    }
    for (const key of this.pendingAggressiveExits.keys()) {
      keys.add(key);
    }

    return [...keys];
  }

  private computeTrackedContexts(): CandidateContext[] {
    const missing: string[] = [];
    const contexts = this.computeDesiredInstrumentKeys()
      .map((key) => {
        const context = this.knownInstruments.get(key);
        if (!context) {
          missing.push(key);
        }
        return context ?? null;
      })
      .filter((context): context is CandidateContext => context !== null);

    if (missing.length > 0) {
      this.logger.warn("paper trading missing market metadata for tracked instruments", {
        missing,
      });
    }

    return contexts;
  }

  private labelsFor(marketId: string, outcomeTokenId: string) {
    const context = this.knownInstruments.get(instrumentKey(marketId, outcomeTokenId));
    return {
      slug: context?.slug ?? null,
      question: context?.question ?? marketId,
      outcome: context?.outcome ?? outcomeTokenId,
    };
  }

  private buildSnapshot(): PaperTradingSnapshot {
    const brokerState = this.broker.getState();
    const tradeMetrics = closedTradeMetrics(brokerState.tradeLifecycles);
    const trackedMarkets = this.computeTrackedContexts().length;
    const fillRatio =
      this.stats.submittedPassiveSize > 0
        ? round(this.stats.makerFilledSize / this.stats.submittedPassiveSize, 8)
        : null;
    const warnings: string[] = [];

    if (!this.started) {
      warnings.push("Paper trading service is not started.");
    } else {
      if (this.acceptedInstruments.size === 0) {
        warnings.push(
          "No scanner-accepted markets are currently eligible for paper trading.",
        );
      }
      if (
        trackedMarkets > 0 &&
        this.latestSubscriptionStatus !== null &&
        this.latestSubscriptionStatus !== "connected"
      ) {
        warnings.push(
          `Paper trading order-book subscription status=${this.latestSubscriptionStatus}.`,
        );
      }
      if (this.pendingAggressiveExits.size > 0) {
        warnings.push(
          `${this.pendingAggressiveExits.size} aggressive exit(s) remain partially unresolved.`,
        );
      }
    }

    if (this.lastError) {
      warnings.push(this.lastError);
    }

    const positions: PaperTradingPositionSnapshot[] = brokerState.positions
      .filter((position) => position.size !== 0)
      .map((position) => {
        const labels = this.labelsFor(position.marketId, position.outcomeTokenId);
        return {
          marketId: position.marketId,
          outcomeTokenId: position.outcomeTokenId,
          slug: labels.slug,
          question: labels.question,
          outcome: labels.outcome,
          size: position.size,
          averageEntryPrice: position.averageEntryPrice,
          markPrice: position.markPrice,
          realizedPnl: position.realizedPnl,
          unrealizedPnl: position.unrealizedPnl,
          totalFees: position.totalFees,
          openTradeId: position.openTradeId,
        };
      })
      .sort((left, right) => Math.abs(right.size) - Math.abs(left.size));

    const openOrderDetails: PaperTradingOrderSnapshot[] = brokerState.openOrders
      .map((order) => {
        const labels = this.labelsFor(order.marketId, order.outcomeTokenId);
        return {
          orderId: order.orderId,
          clientOrderId: order.clientOrderId,
          marketId: order.marketId,
          outcomeTokenId: order.outcomeTokenId,
          slug: labels.slug,
          question: labels.question,
          outcome: labels.outcome,
          side: order.side,
          price: order.price,
          size: order.size,
          remainingSize: order.remainingSize,
          filledSize: order.filledSize,
          status: order.status,
          updatedAtTs: order.updatedAtTs,
        };
      })
      .sort((left, right) => right.updatedAtTs - left.updatedAtTs);

    const recentFills: PaperTradingFillSnapshot[] = brokerState.fills
      .slice(-this.config.recentFillLimit)
      .map((fill) => {
        const labels = this.labelsFor(fill.marketId, fill.outcomeTokenId);
        return {
          fillId: fill.fillId,
          marketId: fill.marketId,
          outcomeTokenId: fill.outcomeTokenId,
          slug: labels.slug,
          question: labels.question,
          outcome: labels.outcome,
          side: fill.side,
          price: fill.price,
          size: fill.size,
          fee: fill.fee,
          liquidity: fill.liquidity,
          ts: fill.ts,
          aggressiveExit: fill.aggressiveExit,
          fillConfidence: fill.fillConfidence,
        };
      })
      .reverse();

    return {
      service: "paper-trading",
      status: this.getStatus(),
      initialCash: this.config.initialCash,
      markToMidEquity: round(
        this.config.initialCash + brokerState.realizedPnl + brokerState.unrealizedPnl,
        8,
      ),
      realizedPnl: brokerState.realizedPnl,
      unrealizedPnl: brokerState.unrealizedPnl,
      netPnl: round(brokerState.realizedPnl + brokerState.unrealizedPnl, 8),
      trackedMarkets,
      openOrders: brokerState.openOrders.length,
      openPositions: positions.length,
      fills: brokerState.fills.length,
      closedTrades: tradeMetrics.closedTrades,
      winRate: tradeMetrics.winRate,
      expectancy: tradeMetrics.expectancy,
      avgWin: tradeMetrics.avgWin,
      avgLoss: tradeMetrics.avgLoss,
      decisionsGenerated: this.stats.decisionsGenerated,
      approvals: this.stats.approvals,
      reductions: this.stats.reductions,
      rejections: this.stats.rejections,
      fillRatio,
      lastUpdatedAt: toIso(this.lastUpdatedTs),
      lastDecisionAt: toIso(this.lastDecisionTs),
      lastFillAt: toIso(this.lastFillTs),
      warnings,
      positions,
      openOrderDetails,
      recentFills,
      recentDecisions: [...this.recentDecisions].reverse(),
    };
  }

  private rebuildSnapshot() {
    this.lastSnapshot = this.buildSnapshot();
  }
}
