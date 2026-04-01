import type { OrderBookFeatureVector } from "../features/index.js";
import {
  DEFAULT_EXECUTION_FRICTION_CONFIG,
  passiveEntryFriction,
} from "../execution-friction.js";
import type { Side } from "../types/index.js";
import type {
  MakerSignalConfig,
  StrategyDecision,
  StrategyDecisionInput,
  StrategyFairValueEstimate,
  StrategyMarketState,
  StrategyReasonCode,
} from "./types.js";

export const DEFAULT_MAKER_SIGNAL_CONFIG: MakerSignalConfig = {
  minObservationCount: 4,
  maxSpread: 0.035,
  minEdgeToQuote: 0.006,
  minEdgeToEnter: 0.012,
  exitEdgeThreshold: 0.004,
  executionFriction: { ...DEFAULT_EXECUTION_FRICTION_CONFIG },
  dangerousExpiryHours: 3,
  hardExitExpiryHours: 1,
  maxVolatilityToEnter: 0.02,
  maxVolatilityToHoldInventory: 0.03,
  choppyDriftThreshold: 0.001,
  choppySpreadDeltaThreshold: 0.004,
  cooldownAfterLossMs: 300_000,
  cooldownAfterChopMs: 120_000,
  cooldownLossStreak: 2,
  reentryCooldownMs: 90_000,
  fairValueMicropriceWeight: 0.7,
  fairValueDriftWeight: 0.6,
  fairValuePressureWeight: 0.35,
  fairValueImbalanceWeight: 0.25,
  fairValueSpreadPenaltyWeight: 0.4,
  fairValueModelWeight: 0,
  inventorySkewSpreadMultiplier: 0.35,
  baseSizeFraction: 0.2,
  minConfidenceToEnter: 0.58,
  minConfidenceToQuote: 0.45,
};

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function clampSigned(value: number, min = -1, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, digits = 8): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function normalizePrice(price: number, market: StrategyMarketState): number {
  const tick = market.tickSize > 0 ? market.tickSize : 0.001;
  const snapped = Math.round(price / tick) * tick;
  return round(clamp(snapped, tick, 1 - tick), 8);
}

function currentCosts(config: MakerSignalConfig): number {
  return passiveEntryFriction(config.executionFriction);
}

/**
 * Converts the feature vector into a fair-value adjustment around midpoint.
 * The rule uses only interpretable microstructure signals so it stays auditable.
 */
export function estimateRuleFairValueAdjustment(
  features: OrderBookFeatureVector,
  market: StrategyMarketState,
  config: MakerSignalConfig,
): number {
  if (market.midpoint === null || market.spread === null) {
    return 0;
  }

  const micropriceEdge = features.microprice !== null ? features.microprice - market.midpoint : 0;
  const driftEdge = market.midpoint * features.shortTermMidpointDrift;
  const pressureEdge = market.spread * features.recentOrderBookPressure;
  const imbalanceEdge = market.spread * features.topBookImbalance;
  const spreadPenalty = Math.max(features.shortTermSpreadDelta, 0);

  return round(
    micropriceEdge * config.fairValueMicropriceWeight +
      driftEdge * config.fairValueDriftWeight +
      pressureEdge * config.fairValuePressureWeight +
      imbalanceEdge * config.fairValueImbalanceWeight -
      spreadPenalty * config.fairValueSpreadPenaltyWeight,
    8,
  );
}

/**
 * Inventory skew is applied at the quoting layer, not the fair-value layer.
 * Long inventory shifts quotes downward; short inventory shifts them upward.
 */
export function computeInventoryQuoteSkew(
  features: OrderBookFeatureVector,
  market: StrategyMarketState,
  config: MakerSignalConfig,
): number {
  const spreadUnit = Math.max(market.spread ?? market.tickSize, market.tickSize);
  return round(-features.inventoryAwareBias * spreadUnit * config.inventorySkewSpreadMultiplier, 8);
}

export function estimateFairValue(input: StrategyDecisionInput): StrategyFairValueEstimate {
  if (input.market.midpoint === null) {
    return {
      midpoint: null,
      ruleAdjustment: 0,
      modelAdjustment: 0,
      fairValue: null,
      quoteSkew: 0,
    };
  }

  const ruleAdjustment = estimateRuleFairValueAdjustment(
    input.features,
    input.market,
    input.config,
  );
  const modelAdjustment = input.fairValueModel
    ? input.fairValueModel.estimate({
        features: input.features,
        market: input.market,
        inventory: input.inventory,
        risk: input.risk,
      }) * input.config.fairValueModelWeight
    : 0;
  const fairValue = normalizePrice(
    input.market.midpoint + ruleAdjustment + modelAdjustment,
    input.market,
  );

  return {
    midpoint: input.market.midpoint,
    ruleAdjustment,
    modelAdjustment,
    fairValue,
    quoteSkew: computeInventoryQuoteSkew(input.features, input.market, input.config),
  };
}

export function computeDirectionalConfidence(
  features: OrderBookFeatureVector,
  edge: number,
  config: MakerSignalConfig,
): number {
  const edgeScore = clamp(edge / Math.max(config.minEdgeToEnter, 1e-6));
  const driftScore = clamp(Math.abs(features.shortTermMidpointDrift) / 0.01);
  const pressureScore = clamp(Math.abs(features.recentOrderBookPressure));
  const imbalanceScore = clamp(Math.abs(features.topBookImbalance));
  const volatilityPenalty = clamp(features.recentVolatilityProxy / config.maxVolatilityToEnter);

  return round(
    clamp(
      edgeScore * 0.45 +
        driftScore * 0.2 +
        pressureScore * 0.2 +
        imbalanceScore * 0.15 -
        volatilityPenalty * 0.2,
    ),
    8,
  );
}

export function detectChoppyConditions(
  features: OrderBookFeatureVector,
  config: MakerSignalConfig,
): boolean {
  return (
    Math.abs(features.shortTermMidpointDrift) <= config.choppyDriftThreshold &&
    features.recentVolatilityProxy >= config.maxVolatilityToEnter &&
    Math.abs(features.shortTermSpreadDelta) >= config.choppySpreadDeltaThreshold
  );
}

function determineEntrySide(features: OrderBookFeatureVector): Side | null {
  const directionalSignal =
    features.recentOrderBookPressure * 0.45 +
    features.topBookImbalance * 0.25 +
    clampSigned(features.shortTermMidpointDrift / 0.01) * 0.3;

  if (directionalSignal > 0.05) {
    return "buy";
  }

  if (directionalSignal < -0.05) {
    return "sell";
  }

  return null;
}

function choosePassiveQuotePrice(
  side: Side,
  fairValue: number,
  market: StrategyMarketState,
  quoteSkew: number,
): number {
  const referenceBid = market.bestBid ?? Math.max(fairValue - market.tickSize, market.tickSize);
  const referenceAsk = market.bestAsk ?? Math.min(fairValue + market.tickSize, 1 - market.tickSize);

  if (side === "buy") {
    const price = Math.min(referenceBid + quoteSkew, fairValue - market.tickSize);
    return normalizePrice(price, market);
  }

  const price = Math.max(referenceAsk + quoteSkew, fairValue + market.tickSize);
  return normalizePrice(price, market);
}

export function computeEdgeAtPrice(
  side: Side,
  fairValue: number,
  targetPrice: number,
  config: MakerSignalConfig,
): number {
  const friction = currentCosts(config);
  const rawEdge = side === "buy" ? fairValue - targetPrice : targetPrice - fairValue;
  return round(rawEdge - friction, 8);
}

function baseTargetSize(input: StrategyDecisionInput): number {
  const sizeFromRisk = input.risk.maxOrderSize * input.config.baseSizeFraction;
  const available = Math.max(
    Math.min(input.risk.remainingPositionCapacity, input.risk.maxOrderSize),
    0,
  );
  const capped = Math.min(sizeFromRisk, available);
  return round(Math.max(capped, input.market.minOrderSize), 8);
}

function buildHoldDecision(
  input: StrategyDecisionInput,
  fairValue: StrategyFairValueEstimate,
  reasons: StrategyReasonCode[],
): StrategyDecision {
  const cooldownRemainingMs = Math.max((input.runtime?.cooldownUntilTs ?? 0) - input.nowTs, 0);

  return {
    actionType: "HOLD",
    side: null,
    confidence: 0,
    heuristicScore: 0,
    targetEntryPrice: null,
    targetSize: 0,
    estimatedFairValue: fairValue.fairValue,
    estimatedEdge: null,
    reasonCodes: reasons.length > 0 ? reasons : ["HOLD_NO_CLEAR_EDGE"],
    metadata: {
      quoteSkew: fairValue.quoteSkew,
      aggressiveEntryEligible: false,
      cooldownRemainingMs,
      recommendedCooldownMs: 0,
    },
  };
}

function buildExitDecision(
  input: StrategyDecisionInput,
  fairValue: StrategyFairValueEstimate,
  reason: StrategyReasonCode,
): StrategyDecision {
  const side: Side = input.inventory.positionSize > 0 ? "sell" : "buy";
  const targetPrice = choosePassiveQuotePrice(
    side,
    fairValue.fairValue ?? input.market.midpoint ?? 0.5,
    input.market,
    fairValue.quoteSkew,
  );

  return {
    actionType: "EXIT",
    side,
    confidence: 1,
    heuristicScore: 1,
    targetEntryPrice: targetPrice,
    targetSize: round(Math.abs(input.inventory.positionSize), 8),
    estimatedFairValue: fairValue.fairValue,
    estimatedEdge:
      fairValue.fairValue === null
        ? null
        : computeEdgeAtPrice(side, fairValue.fairValue, targetPrice, input.config),
    reasonCodes: [reason],
    metadata: {
      quoteSkew: fairValue.quoteSkew,
      aggressiveEntryEligible: false,
      cooldownRemainingMs: 0,
      recommendedCooldownMs:
        reason === "EXIT_ON_VOLATILITY"
          ? input.config.cooldownAfterChopMs
          : reason === "EXIT_ON_RISK"
            ? input.config.cooldownAfterLossMs
            : 0,
    },
  };
}

/**
 * generateStrategyDecision is pure and deterministic.
 * It only uses the explicit input object, so the caller controls state and replay behavior.
 */
export function generateStrategyDecision(input: StrategyDecisionInput): StrategyDecision {
  const fairValue = estimateFairValue(input);
  const reasons: StrategyReasonCode[] = [];

  if (!input.risk.tradingEnabled) {
    return buildHoldDecision(input, fairValue, ["TRADING_DISABLED"]);
  }

  if (input.risk.dailyLossLimitHit || input.risk.grossExposureLimitHit) {
    if (Math.abs(input.inventory.positionSize) > 0 && input.risk.canExit) {
      return buildExitDecision(input, fairValue, "EXIT_ON_RISK");
    }
    return buildHoldDecision(input, fairValue, ["RISK_BLOCKED"]);
  }

  if (input.market.status !== "open") {
    return buildHoldDecision(input, fairValue, ["MARKET_NOT_OPEN"]);
  }

  if (
    input.market.bestBid === null ||
    input.market.bestAsk === null ||
    input.market.midpoint === null ||
    input.market.spread === null ||
    fairValue.fairValue === null
  ) {
    return buildHoldDecision(input, fairValue, ["MISSING_MARKET_DATA"]);
  }

  if (input.features.observationCount < input.config.minObservationCount) {
    return buildHoldDecision(input, fairValue, ["FEATURES_NOT_READY"]);
  }

  if (input.market.spread > input.config.maxSpread) {
    return buildHoldDecision(input, fairValue, ["SPREAD_TOO_WIDE"]);
  }

  if (
    input.market.timeToExpiryHours !== null &&
    input.market.timeToExpiryHours <= input.config.hardExitExpiryHours &&
    Math.abs(input.inventory.positionSize) > 0 &&
    input.risk.canExit
  ) {
    return buildExitDecision(input, fairValue, "EXIT_ON_EXPIRY");
  }

  if (
    input.market.timeToExpiryHours !== null &&
    input.market.timeToExpiryHours <= input.config.dangerousExpiryHours
  ) {
    reasons.push("DANGEROUS_EXPIRY_WINDOW");
  }

  if (input.features.recentVolatilityProxy >= input.config.maxVolatilityToHoldInventory) {
    if (Math.abs(input.inventory.positionSize) > 0 && input.risk.canExit) {
      return buildExitDecision(input, fairValue, "EXIT_ON_VOLATILITY");
    }
    reasons.push("VOLATILITY_TOO_HIGH");
  }

  const cooldownRemainingMs = Math.max((input.runtime?.cooldownUntilTs ?? 0) - input.nowTs, 0);
  if (cooldownRemainingMs > 0) {
    reasons.push("COOLDOWN_ACTIVE");
  }

  const reentryBlocked =
    (input.runtime?.reentryBlockedUntilTs ?? 0) > input.nowTs ||
    ((input.inventory.lastExitTs ?? 0) > 0 &&
      input.nowTs - (input.inventory.lastExitTs ?? 0) < input.config.reentryCooldownMs);
  if (reentryBlocked) {
    reasons.push("REENTRY_BLOCKED");
  }

  if (detectChoppyConditions(input.features, input.config)) {
    reasons.push("CHOPPY_CONDITIONS");
  }

  if (Math.abs(input.inventory.positionSize) >= input.inventory.maxAbsPositionSize) {
    reasons.push("INVENTORY_LIMIT_REACHED");
  }

  const entrySide = determineEntrySide(input.features);
  if (!entrySide) {
    return buildHoldDecision(
      input,
      fairValue,
      reasons.length > 0 ? reasons : ["HOLD_NO_CLEAR_EDGE"],
    );
  }

  const targetPrice = choosePassiveQuotePrice(
    entrySide,
    fairValue.fairValue,
    input.market,
    fairValue.quoteSkew,
  );
  const edge = computeEdgeAtPrice(entrySide, fairValue.fairValue, targetPrice, input.config);
  const confidence = computeDirectionalConfidence(input.features, Math.max(edge, 0), input.config);
  const targetSize = baseTargetSize(input);
  const sameSideAsInventory =
    (input.inventory.positionSize > 0 && entrySide === "buy") ||
    (input.inventory.positionSize < 0 && entrySide === "sell");

  if (Math.abs(input.inventory.positionSize) > 0 && !sameSideAsInventory && input.risk.canQuote) {
    return {
      actionType: "QUOTE",
      side: entrySide,
      confidence,
      heuristicScore: confidence,
      targetEntryPrice: targetPrice,
      targetSize,
      estimatedFairValue: fairValue.fairValue,
      estimatedEdge: edge,
      reasonCodes: ["INVENTORY_REBALANCE", "PASSIVE_QUOTE_ALLOWED"],
      metadata: {
        quoteSkew: fairValue.quoteSkew,
        aggressiveEntryEligible: false,
        cooldownRemainingMs,
        recommendedCooldownMs: 0,
      },
    };
  }

  if (
    edge >= input.config.minEdgeToEnter &&
    confidence >= input.config.minConfidenceToEnter &&
    reasons.length === 0 &&
    input.risk.canEnter &&
    input.risk.remainingPositionCapacity > 0
  ) {
    return {
      actionType: entrySide === "buy" ? "BUY" : "SELL",
      side: entrySide,
      confidence,
      heuristicScore: confidence,
      targetEntryPrice: targetPrice,
      targetSize,
      estimatedFairValue: fairValue.fairValue,
      estimatedEdge: edge,
      reasonCodes: [entrySide === "buy" ? "STRONG_BUY_EDGE" : "STRONG_SELL_EDGE"],
      metadata: {
        quoteSkew: fairValue.quoteSkew,
        aggressiveEntryEligible: true,
        cooldownRemainingMs,
        recommendedCooldownMs: 0,
      },
    };
  }

  if (
    edge >= input.config.minEdgeToQuote &&
    confidence >= input.config.minConfidenceToQuote &&
    input.risk.canQuote &&
    !reasons.includes("COOLDOWN_ACTIVE") &&
    !reasons.includes("CHOPPY_CONDITIONS") &&
    !reasons.includes("DANGEROUS_EXPIRY_WINDOW")
  ) {
    return {
      actionType: "QUOTE",
      side: entrySide,
      confidence,
      heuristicScore: confidence,
      targetEntryPrice: targetPrice,
      targetSize,
      estimatedFairValue: fairValue.fairValue,
      estimatedEdge: edge,
      reasonCodes: ["PASSIVE_QUOTE_ALLOWED", "EDGE_BELOW_THRESHOLD"].filter(
        (code): code is StrategyReasonCode =>
          code !== "EDGE_BELOW_THRESHOLD" || edge < input.config.minEdgeToEnter,
      ),
      metadata: {
        quoteSkew: fairValue.quoteSkew,
        aggressiveEntryEligible: false,
        cooldownRemainingMs,
        recommendedCooldownMs: 0,
      },
    };
  }

  return buildHoldDecision(
    input,
    fairValue,
    reasons.length > 0 ? reasons : ["EDGE_BELOW_THRESHOLD", "HOLD_NO_CLEAR_EDGE"],
  );
}
