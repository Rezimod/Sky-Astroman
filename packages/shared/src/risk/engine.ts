import type { StrategyDecision } from "../strategy/index.js";
import type {
  RiskEngine,
  RiskEngineConfig,
  RiskEvaluationDecision,
  RiskEvaluationInput,
  RiskProjectedState,
  RiskReasonCode,
} from "./types.js";

export const DEFAULT_RISK_ENGINE_CONFIG: RiskEngineConfig = {
  tradingEnabled: true,
  allowSizeReduction: true,
  maxRiskPerTradeNotional: 250,
  maxNotionalExposure: 750,
  maxInventoryImbalance: 500,
  maxConcurrentOpenOrders: 8,
  maxDailyLoss: 150,
  maxLosingStreak: 4,
  stopLossCooldownMs: 300_000,
  rollingExpectancyWindowTrades: 20,
  rollingExpectancyMinTrades: 8,
  minRollingExpectancy: -0.5,
  marketMetricsWindowMs: 300_000,
  abnormalSpreadMultiplier: 2.5,
  abnormalSpreadAbsolute: 0.05,
  minTopBookDepth: 50,
  noTradeBeforeExpiryHours: 1,
};

function round(value: number, digits = 8): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function cloneDecision(decision: StrategyDecision): StrategyDecision {
  return {
    ...decision,
    reasonCodes: [...decision.reasonCodes],
    metadata: { ...decision.metadata },
  };
}

function isActionableDecision(decision: StrategyDecision): boolean {
  return decision.actionType !== "HOLD" && decision.side !== null && decision.targetSize > 0;
}

function signedDecisionSize(decision: StrategyDecision): number {
  if (!isActionableDecision(decision) || decision.side === null) {
    return 0;
  }
  return decision.side === "buy" ? decision.targetSize : -decision.targetSize;
}

function isRiskReducingDecision(currentPositionSize: number, signedSize: number): boolean {
  if (signedSize === 0 || currentPositionSize === 0) {
    return false;
  }
  return Math.abs(currentPositionSize + signedSize) < Math.abs(currentPositionSize);
}

function referencePrice(input: RiskEvaluationInput): number | null {
  if (input.decision.targetEntryPrice !== null) {
    return input.decision.targetEntryPrice;
  }
  return input.market.midpoint;
}

export function projectRiskState(input: RiskEvaluationInput): RiskProjectedState {
  const side = input.decision.side;
  const signedSize = signedDecisionSize(input.decision);
  const price = referencePrice(input);
  const decisionNotional = price !== null ? round(Math.abs(signedSize) * price, 8) : 0;
  const projectedInventory =
    side !== null ? round(input.portfolio.currentPositionSize + signedSize, 8) : null;
  const isRiskReducing = isRiskReducingDecision(input.portfolio.currentPositionSize, signedSize);

  let projectedGrossExposure: number | null = null;
  if (price !== null && projectedInventory !== null) {
    const incrementalInventory = Math.max(
      Math.abs(projectedInventory) - Math.abs(input.portfolio.currentPositionSize),
      0,
    );
    projectedGrossExposure = round(
      input.portfolio.grossNotionalExposure +
        input.portfolio.openOrderNotional +
        incrementalInventory * price,
      8,
    );
  }

  return {
    signedDecisionSize: signedSize,
    decisionNotional,
    projectedInventory,
    projectedGrossExposure,
    isRiskReducing,
    side,
  };
}

function buildEvaluation(
  input: RiskEvaluationInput,
  action: RiskEvaluationDecision["action"],
  decision: StrategyDecision,
  reasonCodes: RiskReasonCode[],
  projected: RiskProjectedState,
): RiskEvaluationDecision {
  const cooldownRemainingMs = Math.max((input.metrics.cooldownUntilTs ?? 0) - input.nowTs, 0);
  const abnormalSpreadThreshold =
    input.metrics.recentAverageSpread !== null
      ? round(
          Math.max(
            input.config.abnormalSpreadAbsolute,
            input.metrics.recentAverageSpread * input.config.abnormalSpreadMultiplier,
          ),
          8,
        )
      : input.config.abnormalSpreadAbsolute;

  return {
    action,
    approved: action !== "REJECT",
    decision,
    reasonCodes,
    metadata: {
      proposedSize: input.decision.targetSize,
      approvedSize: decision.targetSize,
      decisionNotional: projected.decisionNotional,
      grossExposureAfter: projected.projectedGrossExposure,
      inventoryAfter: projected.projectedInventory,
      cooldownRemainingMs,
      rollingExpectancy: input.metrics.rollingExpectancy,
      abnormalSpreadThreshold,
      isRiskReducing: projected.isRiskReducing,
      runMode: input.runMode,
    },
  };
}

function withRejectedDecision(
  input: RiskEvaluationInput,
  reasonCodes: RiskReasonCode[],
  projected: RiskProjectedState,
): RiskEvaluationDecision {
  const rejected = cloneDecision(input.decision);
  rejected.targetSize = 0;
  return buildEvaluation(input, "REJECT", rejected, reasonCodes, projected);
}

function withApprovedDecision(
  input: RiskEvaluationInput,
  reasonCodes: RiskReasonCode[],
  projected: RiskProjectedState,
): RiskEvaluationDecision {
  const approved = cloneDecision(input.decision);
  return buildEvaluation(input, "APPROVE", approved, reasonCodes, projected);
}

function reduceDecisionSize(
  input: RiskEvaluationInput,
  maxSafeSize: number,
  reasonCodes: RiskReasonCode[],
  projected: RiskProjectedState,
): RiskEvaluationDecision {
  const reducedSize = round(Math.min(input.decision.targetSize, maxSafeSize), 8);
  if (!input.config.allowSizeReduction || reducedSize < input.market.minOrderSize) {
    return withRejectedDecision(input, reasonCodes, projected);
  }

  const reduced = cloneDecision(input.decision);
  reduced.targetSize = reducedSize;
  const nextProjected = projectRiskState({
    ...input,
    decision: reduced,
  });

  return buildEvaluation(
    input,
    "REDUCE",
    reduced,
    [...reasonCodes, "RISK_SIZE_REDUCED"],
    nextProjected,
  );
}

function maxSizeFromNotional(limit: number, price: number | null): number | null {
  if (price === null || price <= 0) {
    return null;
  }
  return round(limit / price, 8);
}

function isEntryOrQuote(decision: StrategyDecision): boolean {
  return decision.actionType === "BUY" || decision.actionType === "SELL" || decision.actionType === "QUOTE";
}

export function evaluateRisk(input: RiskEvaluationInput): RiskEvaluationDecision {
  const projected = projectRiskState(input);
  const decision = input.decision;
  const sessionPnl = round(input.portfolio.realizedPnl + input.portfolio.unrealizedPnl, 8);
  const actionable = isActionableDecision(decision);

  if (!actionable) {
    return withApprovedDecision(input, ["RISK_DECISION_EMPTY"], projected);
  }

  if (!input.config.tradingEnabled) {
    return withRejectedDecision(input, ["RISK_TRADING_DISABLED"], projected);
  }

  if (input.market.status !== "open") {
    return withRejectedDecision(input, ["RISK_MARKET_NOT_OPEN"], projected);
  }

  const entryOrQuote = isEntryOrQuote(decision);
  if (
    entryOrQuote &&
    input.market.timeToExpiryHours !== null &&
    input.market.timeToExpiryHours <= input.config.noTradeBeforeExpiryHours &&
    !projected.isRiskReducing
  ) {
    return withRejectedDecision(input, ["RISK_MARKET_END_WINDOW"], projected);
  }

  if (
    entryOrQuote &&
    input.market.topBookDepth < input.config.minTopBookDepth &&
    !projected.isRiskReducing
  ) {
    return withRejectedDecision(input, ["RISK_LOW_LIQUIDITY"], projected);
  }

  const abnormalSpreadThreshold =
    input.metrics.recentAverageSpread !== null
      ? Math.max(
          input.config.abnormalSpreadAbsolute,
          input.metrics.recentAverageSpread * input.config.abnormalSpreadMultiplier,
        )
      : input.config.abnormalSpreadAbsolute;

  if (
    entryOrQuote &&
    input.market.spread !== null &&
    input.market.spread > abnormalSpreadThreshold &&
    !projected.isRiskReducing
  ) {
    return withRejectedDecision(input, ["RISK_ABNORMAL_SPREAD"], projected);
  }

  if (
    entryOrQuote &&
    sessionPnl <= -input.config.maxDailyLoss &&
    !projected.isRiskReducing
  ) {
    return withRejectedDecision(input, ["RISK_MAX_DAILY_LOSS"], projected);
  }

  if (
    entryOrQuote &&
    input.metrics.losingStreak >= input.config.maxLosingStreak &&
    !projected.isRiskReducing
  ) {
    return withRejectedDecision(input, ["RISK_MAX_LOSING_STREAK"], projected);
  }

  if (
    entryOrQuote &&
    input.metrics.cooldownUntilTs !== null &&
    input.metrics.cooldownUntilTs > input.nowTs &&
    !projected.isRiskReducing
  ) {
    return withRejectedDecision(input, ["RISK_STOP_LOSS_COOLDOWN"], projected);
  }

  if (
    entryOrQuote &&
    input.metrics.rollingExpectancy !== null &&
    input.metrics.rollingTradeCount >= input.config.rollingExpectancyMinTrades &&
    input.metrics.rollingExpectancy < input.config.minRollingExpectancy &&
    !projected.isRiskReducing
  ) {
    return withRejectedDecision(input, ["RISK_NEGATIVE_EXPECTANCY_KILL_SWITCH"], projected);
  }

  if (
    decision.actionType !== "EXIT" &&
    input.portfolio.openOrdersCount >= input.config.maxConcurrentOpenOrders &&
    !projected.isRiskReducing
  ) {
    return withRejectedDecision(input, ["RISK_MAX_CONCURRENT_OPEN_ORDERS"], projected);
  }

  const price = referencePrice(input);
  if (
    !projected.isRiskReducing &&
    projected.decisionNotional > input.config.maxRiskPerTradeNotional
  ) {
    const maxSize = maxSizeFromNotional(input.config.maxRiskPerTradeNotional, price);
    return maxSize !== null
      ? reduceDecisionSize(input, maxSize, ["RISK_MAX_RISK_PER_TRADE"], projected)
      : withRejectedDecision(input, ["RISK_MAX_RISK_PER_TRADE"], projected);
  }

  if (
    projected.projectedInventory !== null &&
    Math.abs(projected.projectedInventory) > input.config.maxInventoryImbalance &&
    !projected.isRiskReducing
  ) {
    const allowedSize = round(
      input.config.maxInventoryImbalance - Math.abs(input.portfolio.currentPositionSize),
      8,
    );
    return reduceDecisionSize(
      input,
      Math.max(allowedSize, 0),
      ["RISK_MAX_INVENTORY_IMBALANCE"],
      projected,
    );
  }

  if (
    projected.projectedGrossExposure !== null &&
    projected.projectedGrossExposure > input.config.maxNotionalExposure &&
    !projected.isRiskReducing
  ) {
    const existingCommitted =
      input.portfolio.grossNotionalExposure + input.portfolio.openOrderNotional;
    const room = round(input.config.maxNotionalExposure - existingCommitted, 8);
    const maxSize = maxSizeFromNotional(Math.max(room, 0), price);

    return maxSize !== null
      ? reduceDecisionSize(input, maxSize, ["RISK_MAX_NOTIONAL_EXPOSURE"], projected)
      : withRejectedDecision(input, ["RISK_MAX_NOTIONAL_EXPOSURE"], projected);
  }

  return withApprovedDecision(input, ["RISK_APPROVED"], projected);
}

export class DefaultRiskEngine implements RiskEngine {
  constructor(private readonly config: RiskEngineConfig = DEFAULT_RISK_ENGINE_CONFIG) {}

  evaluate(input: Omit<RiskEvaluationInput, "config"> & { config?: RiskEngineConfig }): RiskEvaluationDecision {
    return evaluateRisk({
      ...input,
      config: input.config ?? this.config,
    });
  }
}
