import type { Side } from "../types/index.js";
import type { ExecutionFrictionConfig } from "../execution-friction.js";
import type { OrderBookFeatureVector } from "../features/index.js";

export type StrategyActionType = "BUY" | "SELL" | "QUOTE" | "HOLD" | "EXIT";

export type StrategyReasonCode =
  | "TRADING_DISABLED"
  | "RISK_BLOCKED"
  | "MARKET_NOT_OPEN"
  | "MISSING_MARKET_DATA"
  | "FEATURES_NOT_READY"
  | "EDGE_BELOW_THRESHOLD"
  | "SPREAD_TOO_WIDE"
  | "DANGEROUS_EXPIRY_WINDOW"
  | "VOLATILITY_TOO_HIGH"
  | "CHOPPY_CONDITIONS"
  | "COOLDOWN_ACTIVE"
  | "INVENTORY_LIMIT_REACHED"
  | "REENTRY_BLOCKED"
  | "INVENTORY_REBALANCE"
  | "EXIT_ON_EDGE_REVERSAL"
  | "EXIT_ON_RISK"
  | "EXIT_ON_EXPIRY"
  | "EXIT_ON_VOLATILITY"
  | "PASSIVE_QUOTE_ALLOWED"
  | "STRONG_BUY_EDGE"
  | "STRONG_SELL_EDGE"
  | "HOLD_NO_CLEAR_EDGE";

export type StrategyMarketState = {
  marketId: string;
  outcomeTokenId: string;
  status: "open" | "halted" | "closed";
  bestBid: number | null;
  bestAsk: number | null;
  midpoint: number | null;
  spread: number | null;
  tickSize: number;
  minOrderSize: number;
  timeToExpiryHours: number | null;
};

export type StrategyInventoryState = {
  positionSize: number;
  averageEntryPrice: number | null;
  maxAbsPositionSize: number;
  lastEntryTs?: number | null;
  lastExitTs?: number | null;
  lastLossExitTs?: number | null;
  lastTradeSide?: Side | null;
  consecutiveLosingExits?: number;
};

export type StrategyRiskState = {
  tradingEnabled: boolean;
  canEnter: boolean;
  canExit: boolean;
  canQuote: boolean;
  maxOrderSize: number;
  remainingPositionCapacity: number;
  dailyLossLimitHit: boolean;
  grossExposureLimitHit: boolean;
};

export type StrategyRuntimeState = {
  cooldownUntilTs?: number | null;
  reentryBlockedUntilTs?: number | null;
  lastExitSide?: Side | null;
};

export type StrategyFairValueEstimate = {
  midpoint: number | null;
  ruleAdjustment: number;
  modelAdjustment: number;
  fairValue: number | null;
  quoteSkew: number;
};

export type StrategyDecision = {
  actionType: StrategyActionType;
  side: Side | null;
  confidence: number;
  /**
   * Hand-built ranking score derived from strategy heuristics.
   * This is not a calibrated probability forecast.
   */
  heuristicScore: number;
  targetEntryPrice: number | null;
  targetSize: number;
  estimatedFairValue: number | null;
  estimatedEdge: number | null;
  reasonCodes: StrategyReasonCode[];
  metadata: {
    quoteSkew: number;
    aggressiveEntryEligible: boolean;
    cooldownRemainingMs: number;
    recommendedCooldownMs: number;
  };
};

export type StrategyModelInput = {
  features: OrderBookFeatureVector;
  market: StrategyMarketState;
  inventory: StrategyInventoryState;
  risk: StrategyRiskState;
};

export interface FairValueModel {
  estimate(input: StrategyModelInput): number;
}

export type StrategyDecisionInput = StrategyModelInput & {
  config: MakerSignalConfig;
  runtime?: StrategyRuntimeState;
  nowTs: number;
  fairValueModel?: FairValueModel;
};

export type MakerSignalConfig = {
  /**
   * Minimum observations required before the engine trusts the feature vector.
   */
  minObservationCount: number;
  /**
   * Absolute spread cap in price terms. Wider spreads are skipped to avoid weak fills.
   */
  maxSpread: number;
  /**
   * Minimum edge required before the engine will quote or enter.
   * This should cover maker fees, slippage buffer, and a safety margin.
   */
  minEdgeToQuote: number;
  /**
   * Higher edge threshold required for a stronger directional BUY/SELL entry signal.
   */
  minEdgeToEnter: number;
  /**
   * If edge reverses beyond this threshold against inventory, the engine emits EXIT.
   */
  exitEdgeThreshold: number;
  /**
   * Shared execution friction assumptions used by both signal gating and paper fills.
   */
  executionFriction: ExecutionFrictionConfig;
  /**
   * Below this time-to-expiry the engine stops opening fresh positions.
   */
  dangerousExpiryHours: number;
  /**
   * Below this time-to-expiry, existing inventory is biased toward exit.
   */
  hardExitExpiryHours: number;
  /**
   * Volatility proxy above this level disables new entries.
   */
  maxVolatilityToEnter: number;
  /**
   * Volatility proxy above this level triggers defensive exit behavior.
   */
  maxVolatilityToHoldInventory: number;
  /**
   * If directional drift is smaller than this while volatility is elevated, treat the regime as choppy.
   */
  choppyDriftThreshold: number;
  /**
   * Spread expansion above this threshold contributes to choppy-market cooldown behavior.
   */
  choppySpreadDeltaThreshold: number;
  /**
   * Number of milliseconds to pause new entries after a loss-based cooldown is triggered.
   */
  cooldownAfterLossMs: number;
  /**
   * Number of milliseconds to pause new entries after a choppy-market cooldown is triggered.
   */
  cooldownAfterChopMs: number;
  /**
   * Number of losing exits required before the loss cooldown becomes active.
   */
  cooldownLossStreak: number;
  /**
   * Prevent immediate re-entry after an exit for this many milliseconds.
   */
  reentryCooldownMs: number;
  /**
   * Fair-value weight for the microprice edge.
   */
  fairValueMicropriceWeight: number;
  /**
   * Fair-value weight for short-term midpoint drift.
   */
  fairValueDriftWeight: number;
  /**
   * Fair-value weight for recent order-book pressure.
   */
  fairValuePressureWeight: number;
  /**
   * Fair-value weight for top-of-book imbalance.
   */
  fairValueImbalanceWeight: number;
  /**
   * Penalty applied when spreads are expanding, reducing fair-value confidence.
   */
  fairValueSpreadPenaltyWeight: number;
  /**
   * Optional blend weight for a future model-based fair-value adjustment.
   */
  fairValueModelWeight: number;
  /**
   * Inventory skew multiplier in spread units. Larger values make quotes lean harder toward flattening inventory.
   */
  inventorySkewSpreadMultiplier: number;
  /**
   * Multiplier for converting remaining capacity into target order size.
   */
  baseSizeFraction: number;
  /**
   * Minimum confidence required for directional BUY/SELL entry signals.
   */
  minConfidenceToEnter: number;
  /**
   * Minimum confidence required to keep a passive quote live.
   */
  minConfidenceToQuote: number;
};
