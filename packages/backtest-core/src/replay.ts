import {
  assertConsistentExecutionFriction,
  buildFeatures,
  ConservativePaperFillModel,
  DEFAULT_FEATURE_ENGINE_CONFIG,
  DEFAULT_MAKER_SIGNAL_CONFIG,
  DEFAULT_PAPER_FILL_MODEL_CONFIG,
  DEFAULT_RISK_ENGINE_CONFIG,
  DefaultRiskEngine,
  PaperBrokerEngine,
  RollingFeatureEngine,
  RollingRiskMetricsStore,
  generateStrategyDecision,
  type MarketDescriptor,
  type OrderBookSnapshot,
  type PaperOrderRecord,
  type Side,
  type StrategyDecision,
  type StrategyInventoryState,
  type StrategyMarketState,
  type StrategyRiskState,
} from "@polymarket-bot/shared";

import { scoreReport, summarizeBacktestRun, toTradeRecord, withDrawdown } from "./analytics.js";
import { loadBacktestDataset } from "./dataset.js";
import type {
  BacktestDataset,
  BacktestResolvedConfig,
  BacktestRunReport,
  BacktestRunStats,
  ResidualAggressiveExitRecord,
  BacktestSessionConfig,
  BacktestSummary,
  ParameterCombination,
  SweepRunResult,
  SweepValue,
  WalkForwardFold,
  WalkForwardFoldResult,
} from "./types.js";

function round(value: number, digits = 8): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function deepMerge<T extends Record<string, unknown>>(base: T, patch: Partial<T> | undefined): T {
  if (!patch) {
    return structuredClone(base);
  }

  const output = structuredClone(base) as Record<string, unknown>;
  for (const [key, value] of Object.entries(patch)) {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      output[key] &&
      typeof output[key] === "object" &&
      !Array.isArray(output[key])
    ) {
      output[key] = deepMerge(
        output[key] as Record<string, unknown>,
        value as Partial<Record<string, unknown>>,
      ) as T[Extract<keyof T, string>];
      continue;
    }
    output[key] = value;
  }
  return output as T;
}

function setPathValue(target: Record<string, unknown>, pathSegments: string[], value: SweepValue) {
  let current: Record<string, unknown> = target;
  for (let index = 0; index < pathSegments.length - 1; index += 1) {
    const segment = pathSegments[index];
    const next = current[segment];
    if (!next || typeof next !== "object" || Array.isArray(next)) {
      current[segment] = {};
    }
    current = current[segment] as Record<string, unknown>;
  }
  current[pathSegments[pathSegments.length - 1]] = value;
}

function applyOverrides(config: BacktestResolvedConfig, overrides: Record<string, SweepValue>): BacktestResolvedConfig {
  const cloned = structuredClone(config) as Record<string, unknown>;
  for (const [path, value] of Object.entries(overrides)) {
    setPathValue(cloned, path.split("."), value);
  }
  return cloned as unknown as BacktestResolvedConfig;
}

function marketKey(marketId: string, outcomeTokenId: string): string {
  return `${marketId}:${outcomeTokenId}`;
}

function currentTopBookDepth(snapshot: OrderBookSnapshot): number {
  return round((snapshot.bids[0]?.size ?? 0) + (snapshot.asks[0]?.size ?? 0), 8);
}

function currentMidpoint(snapshot: OrderBookSnapshot): number | null {
  if (!snapshot.bids[0] || !snapshot.asks[0]) {
    return null;
  }
  return round((snapshot.bids[0].price + snapshot.asks[0].price) / 2, 8);
}

function currentSpread(snapshot: OrderBookSnapshot): number | null {
  if (!snapshot.bids[0] || !snapshot.asks[0]) {
    return null;
  }
  return round(snapshot.asks[0].price - snapshot.bids[0].price, 8);
}

function marketTypeFor(market: MarketDescriptor): string {
  return market.category?.trim() || "uncategorized";
}

function findPosition(
  brokerState: ReturnType<PaperBrokerEngine["getState"]>,
  marketId: string,
  outcomeTokenId: string,
) {
  return (
    brokerState.positions.find(
      (position) => position.marketId === marketId && position.outcomeTokenId === outcomeTokenId,
    ) ?? null
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
    midpoint: currentMidpoint(snapshot),
    spread: currentSpread(snapshot),
    tickSize: market.tickSize ?? 0.001,
    minOrderSize: market.minOrderSize ?? 1,
    timeToExpiryHours: market.endTime
      ? round((new Date(market.endTime).getTime() - snapshot.ts) / 3_600_000, 8)
      : null,
  };
}

function buildStrategyRiskState(
  config: BacktestResolvedConfig,
  brokerState: ReturnType<PaperBrokerEngine["getState"]>,
  positionSize: number,
): StrategyRiskState {
  const grossExposure = brokerState.positions.reduce((sum, position) => {
    const mark = position.markPrice ?? position.averageEntryPrice;
    return sum + Math.abs(position.size) * mark;
  }, 0);
  const openOrderNotional = brokerState.openOrders.reduce(
    (sum, order) => sum + order.remainingSize * order.price,
    0,
  );
  const sessionPnl = brokerState.realizedPnl + brokerState.unrealizedPnl;
  const dailyLossLimitHit = sessionPnl <= -config.runtime.riskConfig.maxDailyLoss;
  const grossExposureLimitHit =
    grossExposure + openOrderNotional >= config.runtime.riskConfig.maxNotionalExposure;

  return {
    tradingEnabled: config.runtime.riskConfig.tradingEnabled,
    canEnter: !dailyLossLimitHit && !grossExposureLimitHit,
    canExit: true,
    canQuote: !dailyLossLimitHit && !grossExposureLimitHit,
    maxOrderSize: config.runtime.maxOrderSize,
    remainingPositionCapacity: Math.max(config.runtime.maxAbsPositionSize - Math.abs(positionSize), 0),
    dailyLossLimitHit,
    grossExposureLimitHit,
  };
}

function buildPortfolioRiskState(
  config: BacktestResolvedConfig,
  brokerState: ReturnType<PaperBrokerEngine["getState"]>,
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

function expandParameterCombinations(
  parameters: Record<string, SweepValue[]>,
): ParameterCombination[] {
  const entries = Object.entries(parameters);
  if (entries.length === 0) {
    return [
      {
        id: "base",
        overrides: {},
      },
    ];
  }

  const combinations: ParameterCombination[] = [];
  const build = (index: number, current: Record<string, SweepValue>) => {
    if (index >= entries.length) {
      const id = Object.entries(current)
        .map(([key, value]) => `${key}=${value}`)
        .join("|");
      combinations.push({
        id: id || "base",
        overrides: { ...current },
      });
      return;
    }

    const [path, values] = entries[index];
    for (const value of values) {
      build(index + 1, {
        ...current,
        [path]: value,
      });
    }
  };

  build(0, {});
  return combinations;
}

function buildWalkForwardFolds(
  totalEvents: number,
  config: BacktestResolvedConfig["walkForward"],
): WalkForwardFold[] {
  if (!config?.enabled) {
    return [];
  }

  const folds: WalkForwardFold[] = [];
  const step = config.stepEvents ?? config.testWindowEvents;
  let foldIndex = 0;

  for (
    let trainStartIndex = 0;
    trainStartIndex + config.trainWindowEvents + config.testWindowEvents <= totalEvents;
    trainStartIndex += step
  ) {
    const trainEndIndex = trainStartIndex + config.trainWindowEvents;
    const testStartIndex = trainEndIndex;
    const testEndIndex = testStartIndex + config.testWindowEvents;
    folds.push({
      foldIndex,
      trainStartIndex,
      trainEndIndex,
      testStartIndex,
      testEndIndex,
    });
    foldIndex += 1;
  }

  return folds;
}

export function resolveBacktestConfig(config: BacktestSessionConfig): BacktestResolvedConfig {
  const strategyConfig = deepMerge(DEFAULT_MAKER_SIGNAL_CONFIG, config.runtime.strategyConfig);
  const paperFillConfig = deepMerge(DEFAULT_PAPER_FILL_MODEL_CONFIG, config.runtime.paperFillConfig);

  assertConsistentExecutionFriction({
    strategyFriction: strategyConfig.executionFriction,
    paperFriction: paperFillConfig.executionFriction,
  });

  return {
    sessionId: config.sessionId,
    outputDir: config.outputDir,
    runtime: {
      initialCash: config.runtime.initialCash,
      maxAbsPositionSize: config.runtime.maxAbsPositionSize,
      maxOrderSize: config.runtime.maxOrderSize,
      aggressiveExitOnStrategyExit: config.runtime.aggressiveExitOnStrategyExit,
      cancelOpenOrdersOnHold: config.runtime.cancelOpenOrdersOnHold,
      cancelOpenOrdersOnReject: config.runtime.cancelOpenOrdersOnReject,
      featureConfig: deepMerge(DEFAULT_FEATURE_ENGINE_CONFIG, config.runtime.featureConfig),
      strategyConfig,
      riskConfig: deepMerge(DEFAULT_RISK_ENGINE_CONFIG, config.runtime.riskConfig),
      paperFillConfig,
    },
    sweep: config.sweep,
    walkForward: config.walkForward,
    report: {
      writeJson: config.report?.writeJson ?? true,
      writeCsv: config.report?.writeCsv ?? true,
      writeSvgEquityCurve: config.report?.writeSvgEquityCurve ?? true,
    },
  };
}

type MarketRuntimeState = {
  lastEntryTs: number | null;
  lastExitTs: number | null;
  lastLossExitTs: number | null;
  lastTradeSide: Side | null;
  consecutiveLosingExits: number;
  cooldownUntilTs: number | null;
  reentryBlockedUntilTs: number | null;
};

type PendingAggressiveExit = ResidualAggressiveExitRecord;

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

function activeOrdersForMarket(
  brokerState: ReturnType<PaperBrokerEngine["getState"]>,
  marketId: string,
  outcomeTokenId: string,
) {
  return brokerState.openOrders.filter(
    (order) => order.marketId === marketId && order.outcomeTokenId === outcomeTokenId,
  );
}

function attemptAggressiveExit(args: {
  broker: PaperBrokerEngine;
  snapshot: OrderBookSnapshot;
  side: Side;
  requestedSize: number;
  firstRequestedAtTs: number;
  pendingAggressiveExits: Map<string, PendingAggressiveExit>;
  stats: BacktestRunStats;
  retry: boolean;
}): void {
  const key = marketKey(args.snapshot.marketId, args.snapshot.outcomeTokenId);
  const position = findPosition(args.broker.getState(), args.snapshot.marketId, args.snapshot.outcomeTokenId);
  const sizeToExit = Math.min(Math.abs(position?.size ?? 0), args.requestedSize);

  if (!position || position.size === 0 || sizeToExit <= 0) {
    args.pendingAggressiveExits.delete(key);
    return;
  }

  args.stats.aggressiveExitAttempts += 1;
  if (args.retry) {
    args.stats.aggressiveExitRetries += 1;
  }

  const prior = args.pendingAggressiveExits.get(key);
  const attemptCount = (prior?.attempts ?? 0) + 1;
  const fill = args.broker.simulateAggressiveExit(
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
    args.pendingAggressiveExits.set(key, {
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

  if (fill.remainingOrderSize > 0) {
    args.stats.aggressiveExitPartialCount += 1;
    args.pendingAggressiveExits.set(key, {
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

  args.pendingAggressiveExits.delete(key);
}

function cancelOrders(
  broker: PaperBrokerEngine,
  orders: PaperOrderRecord[],
  ts: number,
  reason: string,
): number {
  let canceled = 0;
  for (const order of orders) {
    const result = broker.cancelOrder(order.orderId, ts, reason);
    if (result) {
      canceled += 1;
    }
  }
  return canceled;
}

function upsertPassiveOrder(
  broker: PaperBrokerEngine,
  brokerState: ReturnType<PaperBrokerEngine["getState"]>,
  decision: StrategyDecision,
  marketId: string,
  outcomeTokenId: string,
  ts: number,
): { submitted: number; replaced: number; canceled: number; submittedSize: number } {
  if (decision.side === null || decision.targetEntryPrice === null || decision.targetSize <= 0) {
    return { submitted: 0, replaced: 0, canceled: 0, submittedSize: 0 };
  }

  const relatedOrders = activeOrdersForMarket(brokerState, marketId, outcomeTokenId);
  const sameSideOrders = relatedOrders.filter((order) => order.side === decision.side);
  const oppositeSideOrders = relatedOrders.filter((order) => order.side !== decision.side);

  let canceled = cancelOrders(broker, oppositeSideOrders, ts, "opposite_side_replaced");
  let submitted = 0;
  let replaced = 0;
  let submittedSize = 0;

  const primary = sameSideOrders[0];
  const needsChange =
    !primary ||
    primary.price !== decision.targetEntryPrice ||
    primary.remainingSize !== decision.targetSize;

  if (!primary) {
    broker.submitLimitOrder({
      clientOrderId: `bt-${marketId}-${outcomeTokenId}-${ts}`,
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
    broker.replaceOrder(primary.orderId, {
      clientOrderId: `bt-${marketId}-${outcomeTokenId}-${ts}`,
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
    canceled += cancelOrders(broker, sameSideOrders.slice(1), ts, "dedupe_same_side");
  }

  return { submitted, replaced, canceled, submittedSize };
}

function syncClosedTrades(
  brokerState: ReturnType<PaperBrokerEngine["getState"]>,
  seenClosedTradeIds: Set<string>,
  runtimeStateByMarket: Map<string, MarketRuntimeState>,
  riskStore: RollingRiskMetricsStore,
  strategyConfig: BacktestResolvedConfig["runtime"]["strategyConfig"],
) {
  for (const trade of brokerState.tradeLifecycles) {
    if (trade.status !== "CLOSED" || trade.closedAtTs === null || seenClosedTradeIds.has(trade.tradeId)) {
      continue;
    }

    seenClosedTradeIds.add(trade.tradeId);
    const key = marketKey(trade.marketId, trade.outcomeTokenId);
    const runtimeState = runtimeStateByMarket.get(key) ?? initialMarketRuntimeState();
    runtimeState.lastExitTs = trade.closedAtTs;
    runtimeState.reentryBlockedUntilTs = trade.closedAtTs + strategyConfig.reentryCooldownMs;
    runtimeState.lastTradeSide = trade.side;
    if (trade.realizedPnl < 0) {
      runtimeState.lastLossExitTs = trade.closedAtTs;
      runtimeState.consecutiveLosingExits += 1;
      runtimeState.cooldownUntilTs = Math.max(
        runtimeState.cooldownUntilTs ?? 0,
        trade.closedAtTs + strategyConfig.cooldownAfterLossMs,
      );
    } else {
      runtimeState.consecutiveLosingExits = 0;
    }
    runtimeStateByMarket.set(key, runtimeState);

    riskStore.recordClosedTrade({
      ts: trade.closedAtTs,
      realizedPnl: trade.realizedPnl,
      stopLossTriggered: trade.realizedPnl < 0,
    });
  }
}

function executeDecision(
  broker: PaperBrokerEngine,
  brokerState: ReturnType<PaperBrokerEngine["getState"]>,
  riskDecision: ReturnType<DefaultRiskEngine["evaluate"]>,
  snapshot: OrderBookSnapshot,
  config: BacktestResolvedConfig,
  pendingAggressiveExits: Map<string, PendingAggressiveExit>,
  stats: BacktestRunStats,
): { submitted: number; canceled: number; replaced: number; submittedSize: number } {
  const relatedOrders = activeOrdersForMarket(brokerState, snapshot.marketId, snapshot.outcomeTokenId);
  const actionDecision = riskDecision.decision;

  if (!riskDecision.approved) {
    return {
      submitted: 0,
      replaced: 0,
      canceled: config.runtime.cancelOpenOrdersOnReject
        ? cancelOrders(broker, relatedOrders, snapshot.ts, "risk_rejected")
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
      canceled: config.runtime.cancelOpenOrdersOnHold
        ? cancelOrders(broker, relatedOrders, snapshot.ts, "hold_no_quote")
        : 0,
      submittedSize: 0,
    };
  }

  if (actionDecision.actionType === "EXIT") {
    const canceled = cancelOrders(broker, relatedOrders, snapshot.ts, "exit_cleanup");
    if (config.runtime.aggressiveExitOnStrategyExit) {
      attemptAggressiveExit({
        broker,
        snapshot,
        side: actionDecision.side,
        requestedSize: actionDecision.targetSize,
        firstRequestedAtTs: snapshot.ts,
        pendingAggressiveExits,
        stats,
        retry: false,
      });
      return {
        submitted: 0,
        replaced: 0,
        canceled,
        submittedSize: 0,
      };
    }

    const result = upsertPassiveOrder(
      broker,
      broker.getState(),
      actionDecision,
      snapshot.marketId,
      snapshot.outcomeTokenId,
      snapshot.ts,
    );
    return {
      ...result,
      canceled: canceled + result.canceled,
    };
  }

  return upsertPassiveOrder(
    broker,
    brokerState,
    actionDecision,
    snapshot.marketId,
    snapshot.outcomeTokenId,
    snapshot.ts,
  );
}

function baseRunStats(): BacktestRunStats {
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

function createSummaryEquityPoint(
  initialCash: number,
  ts: number,
  brokerState: ReturnType<PaperBrokerEngine["getState"]>,
) {
  const realizedPnl = brokerState.realizedPnl;
  const unrealizedPnl = brokerState.unrealizedPnl;
  return {
    ts,
    realizedPnl,
    unrealizedPnl,
    equity: round(initialCash + realizedPnl + unrealizedPnl, 8),
  };
}

function buildBacktestLimitations(report: BacktestRunReport): string[] {
  const limitations = [
    "Historical replay currently uses normalized top-of-book snapshots only. If historical depth is incomplete, passive and aggressive fill realism is limited to displayed best-level information.",
  ];

  if (report.metrics.unresolvedAggressiveExitCount > 0) {
    limitations.push(
      `Replay ended with ${report.metrics.unresolvedAggressiveExitCount} unresolved aggressive exit(s) covering ${report.metrics.unresolvedAggressiveExitSize} contracts of remaining inventory.`,
    );
  }

  return limitations;
}

function runSingleReplay(
  dataset: BacktestDataset,
  config: BacktestResolvedConfig,
  label: string,
  parameterOverrides: Record<string, SweepValue>,
  snapshots: OrderBookSnapshot[],
): BacktestRunReport {
  const marketMap = new Map(dataset.markets.map((market) => [market.marketId, market]));
  const broker = new PaperBrokerEngine(
    new ConservativePaperFillModel(),
    config.runtime.paperFillConfig,
  );
  const featureEngine = new RollingFeatureEngine(config.runtime.featureConfig);
  const riskEngine = new DefaultRiskEngine(config.runtime.riskConfig);
  const riskStore = new RollingRiskMetricsStore(config.runtime.riskConfig);
  const runtimeStateByMarket = new Map<string, MarketRuntimeState>();
  const seenClosedTradeIds = new Set<string>();
  const riskDecisions: BacktestRunReport["riskDecisions"] = [];
  const equityCurve: Array<Omit<BacktestRunReport["equityCurve"][number], "drawdown">> = [];
  const stats = baseRunStats();
  const pendingAggressiveExits = new Map<string, PendingAggressiveExit>();

  for (const snapshot of snapshots) {
    const market = marketMap.get(snapshot.marketId);
    if (!market) {
      throw new Error(
        `Missing market metadata for snapshot marketId=${snapshot.marketId}. TODO: backfill metadata before replay.`,
      );
    }

    const fills = broker.onOrderBookSnapshot(snapshot);
    stats.makerFilledSize = round(
      stats.makerFilledSize +
        fills.filter((fill) => fill.liquidity === "maker").reduce((sum, fill) => sum + fill.size, 0),
      8,
    );
    syncClosedTrades(
      broker.getState(),
      seenClosedTradeIds,
      runtimeStateByMarket,
      riskStore,
      config.runtime.strategyConfig,
    );

    riskStore.recordMarketSample({
      instrumentKey: marketKey(snapshot.marketId, snapshot.outcomeTokenId),
      ts: snapshot.ts,
      spread: currentSpread(snapshot),
      topBookDepth: currentTopBookDepth(snapshot),
    });

    const brokerState = broker.getState();
    const position = findPosition(brokerState, snapshot.marketId, snapshot.outcomeTokenId);
    const featureState = featureEngine.ingest({
      market,
      snapshot,
      inventory: {
        positionSize: position?.size ?? 0,
        maxAbsPositionSize: config.runtime.maxAbsPositionSize,
      },
    });
    const features = buildFeatures(featureState);
    const runtimeState =
      runtimeStateByMarket.get(marketKey(snapshot.marketId, snapshot.outcomeTokenId)) ??
      initialMarketRuntimeState();
    const strategyMarket = buildStrategyMarketState(market, snapshot);
    const strategyInventory: StrategyInventoryState = {
      positionSize: position?.size ?? 0,
      averageEntryPrice: position ? position.averageEntryPrice : null,
      maxAbsPositionSize: config.runtime.maxAbsPositionSize,
      lastEntryTs: runtimeState.lastEntryTs,
      lastExitTs: runtimeState.lastExitTs,
      lastLossExitTs: runtimeState.lastLossExitTs,
      lastTradeSide: runtimeState.lastTradeSide,
      consecutiveLosingExits: runtimeState.consecutiveLosingExits,
    };
    const strategyRisk = buildStrategyRiskState(
      config,
      brokerState,
      strategyInventory.positionSize,
    );
    const topBookDepth = currentTopBookDepth(snapshot);
    const instrumentKey = marketKey(snapshot.marketId, snapshot.outcomeTokenId);
    const pendingAggressiveExit = pendingAggressiveExits.get(instrumentKey);

    if (pendingAggressiveExit) {
      if (strategyInventory.positionSize === 0) {
        pendingAggressiveExits.delete(instrumentKey);
      } else {
        const canceled = cancelOrders(
          broker,
          activeOrdersForMarket(brokerState, snapshot.marketId, snapshot.outcomeTokenId),
          snapshot.ts,
          "pending_aggressive_exit_cleanup",
        );
        stats.ordersCanceled += canceled;
        attemptAggressiveExit({
          broker,
          snapshot,
          side: pendingAggressiveExit.side,
          requestedSize: pendingAggressiveExit.remainingSize,
          firstRequestedAtTs: pendingAggressiveExit.firstRequestedAtTs,
          pendingAggressiveExits,
          stats,
          retry: true,
        });
        syncClosedTrades(
          broker.getState(),
          seenClosedTradeIds,
          runtimeStateByMarket,
          riskStore,
          config.runtime.strategyConfig,
        );
        equityCurve.push(
          createSummaryEquityPoint(config.runtime.initialCash, snapshot.ts, broker.getState()),
        );
        continue;
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
      config: config.runtime.strategyConfig,
      nowTs: snapshot.ts,
    });
    stats.decisionsGenerated += 1;

    const riskDecision = riskEngine.evaluate({
      decision,
      market: {
        ...strategyMarket,
        topBookDepth,
      },
      portfolio: buildPortfolioRiskState(config, brokerState, snapshot.marketId, snapshot.outcomeTokenId),
      metrics: riskStore.getSnapshot(
        snapshot.ts,
        instrumentKey,
      ),
      nowTs: snapshot.ts,
      runMode: "replay",
    });

    if (riskDecision.action === "APPROVE") {
      stats.approvals += 1;
    } else if (riskDecision.action === "REDUCE") {
      stats.reductions += 1;
    } else {
      stats.rejections += 1;
    }

    riskDecisions.push({
      ts: snapshot.ts,
      marketId: snapshot.marketId,
      outcomeTokenId: snapshot.outcomeTokenId,
      marketType: marketTypeFor(market),
      features,
      market: {
        ...strategyMarket,
        topBookDepth,
        liquidity: market.liquidity ?? null,
        volume24hr: market.volume24hr ?? null,
        volume: market.volume ?? null,
      },
      inventory: strategyInventory,
      strategyDecision: decision,
      riskDecision,
    });

    const execution = executeDecision(
      broker,
      brokerState,
      riskDecision,
      snapshot,
      config,
      pendingAggressiveExits,
      stats,
    );
    stats.ordersSubmitted += execution.submitted;
    stats.ordersCanceled += execution.canceled;
    stats.ordersReplaced += execution.replaced;
    stats.submittedPassiveSize = round(stats.submittedPassiveSize + execution.submittedSize, 8);

    syncClosedTrades(
      broker.getState(),
      seenClosedTradeIds,
      runtimeStateByMarket,
      riskStore,
      config.runtime.strategyConfig,
    );

    equityCurve.push(
      createSummaryEquityPoint(config.runtime.initialCash, snapshot.ts, broker.getState()),
    );
  }

  const brokerState = broker.getState();
  const trades = brokerState.tradeLifecycles
    .map((trade) => toTradeRecord(trade, marketMap.get(trade.marketId)))
    .filter((trade): trade is NonNullable<typeof trade> => trade !== null);

  return summarizeBacktestRun(
    {
      sessionId: config.sessionId,
      label,
      configSummary: {
        datasetSize: snapshots.length,
        initialCash: config.runtime.initialCash,
        aggressiveExitOnStrategyExit: config.runtime.aggressiveExitOnStrategyExit,
        parameterOverrides,
      },
      trades,
      equityCurve: withDrawdown(equityCurve),
      riskDecisions,
      closedTradeLifecycles: brokerState.tradeLifecycles.filter((trade) => trade.status === "CLOSED"),
      fills: brokerState.fills,
      positions: brokerState.positions,
      brokerEvents: brokerState.eventLog,
      residualAggressiveExits: [...pendingAggressiveExits.values()].map((pending) => ({ ...pending })),
    },
    stats,
  );
}

export class BacktestEngine {
  constructor(private readonly config: BacktestSessionConfig) {}

  describeMarket(market: MarketDescriptor) {
    return `${market.slug} (${market.marketId})`;
  }

  async run(): Promise<BacktestSummary> {
    const dataset = await loadBacktestDataset(this.config.datasetPath);
    return runBacktestSession(this.config, dataset);
  }
}

export async function runBacktestSession(
  sessionConfig: BacktestSessionConfig,
  dataset?: BacktestDataset,
): Promise<BacktestSummary> {
  const resolvedConfig = resolveBacktestConfig(sessionConfig);
  const loadedDataset = dataset ?? (await loadBacktestDataset(sessionConfig.datasetPath));
  const parameterSets = resolvedConfig.sweep
    ? expandParameterCombinations(resolvedConfig.sweep.parameters)
    : [{ id: "base", overrides: {} }];

  const walkForwardFolds = buildWalkForwardFolds(
    loadedDataset.snapshots.length,
    resolvedConfig.walkForward,
  );

  if (walkForwardFolds.length === 0) {
    const sweepResults: SweepRunResult[] = parameterSets.map((parameterSet) => {
      const runConfig = applyOverrides(resolvedConfig, parameterSet.overrides);
      const report = runSingleReplay(
        loadedDataset,
        runConfig,
        parameterSet.id,
        parameterSet.overrides,
        loadedDataset.snapshots,
      );
      return {
        parameterSetId: parameterSet.id,
        overrides: parameterSet.overrides,
        score: scoreReport(report, resolvedConfig.sweep?.objective ?? "netPnl"),
        report,
      };
    });

    const bestRun = [...sweepResults].sort((left, right) => right.score - left.score)[0].report;
    return {
      sessionId: resolvedConfig.sessionId,
      datasetPath: sessionConfig.datasetPath,
      datasetMetadata: loadedDataset.metadata,
      limitations: buildBacktestLimitations(bestRun),
      bestRun,
      sweepResults,
      walkForwardResults: [],
    };
  }

  const walkForwardResults: WalkForwardFoldResult[] = [];
  let bestOverallTestRun: BacktestRunReport | null = null;

  for (const fold of walkForwardFolds) {
    const trainSnapshots = loadedDataset.snapshots.slice(fold.trainStartIndex, fold.trainEndIndex);
    const testSnapshots = loadedDataset.snapshots.slice(fold.testStartIndex, fold.testEndIndex);
    const sweepResults = parameterSets.map((parameterSet) => {
      const runConfig = applyOverrides(resolvedConfig, parameterSet.overrides);
      const trainReport = runSingleReplay(
        loadedDataset,
        runConfig,
        `fold-${fold.foldIndex}-train-${parameterSet.id}`,
        parameterSet.overrides,
        trainSnapshots,
      );
      return {
        parameterSetId: parameterSet.id,
        overrides: parameterSet.overrides,
        score: scoreReport(trainReport, resolvedConfig.sweep?.objective ?? "netPnl"),
        report: trainReport,
      };
    });

    const selected = [...sweepResults].sort((left, right) => right.score - left.score)[0];
    const selectedConfig = applyOverrides(resolvedConfig, selected.overrides);
    const testReport = runSingleReplay(
      loadedDataset,
      selectedConfig,
      `fold-${fold.foldIndex}-test-${selected.parameterSetId}`,
      selected.overrides,
      testSnapshots,
    );

    walkForwardResults.push({
      fold,
      selectedParameterSetId: selected.parameterSetId,
      selectedOverrides: selected.overrides,
      trainScore: selected.score,
      trainReport: selected.report,
      testReport,
    });

    if (!bestOverallTestRun || testReport.metrics.netPnl > bestOverallTestRun.metrics.netPnl) {
      bestOverallTestRun = testReport;
    }
  }

  return {
    sessionId: resolvedConfig.sessionId,
    datasetPath: sessionConfig.datasetPath,
    datasetMetadata: loadedDataset.metadata,
    limitations: buildBacktestLimitations(bestOverallTestRun ?? walkForwardResults[0].testReport),
    bestRun: bestOverallTestRun ?? walkForwardResults[0].testReport,
    sweepResults: [],
    walkForwardResults,
  };
}
