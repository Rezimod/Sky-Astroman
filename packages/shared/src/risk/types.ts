import type { RunMode, Side } from "../types/index.js";
import type { StrategyDecision } from "../strategy/index.js";

export type RiskReasonCode =
  | "RISK_APPROVED"
  | "RISK_DECISION_EMPTY"
  | "RISK_TRADING_DISABLED"
  | "RISK_MARKET_NOT_OPEN"
  | "RISK_MARKET_END_WINDOW"
  | "RISK_MAX_RISK_PER_TRADE"
  | "RISK_MAX_NOTIONAL_EXPOSURE"
  | "RISK_MAX_INVENTORY_IMBALANCE"
  | "RISK_MAX_CONCURRENT_OPEN_ORDERS"
  | "RISK_MAX_DAILY_LOSS"
  | "RISK_MAX_LOSING_STREAK"
  | "RISK_STOP_LOSS_COOLDOWN"
  | "RISK_NEGATIVE_EXPECTANCY_KILL_SWITCH"
  | "RISK_ABNORMAL_SPREAD"
  | "RISK_LOW_LIQUIDITY"
  | "RISK_SIZE_REDUCED"
  | "RISK_EXIT_ALLOWED_WHILE_BLOCKED";

export type RiskDecisionAction = "APPROVE" | "REDUCE" | "REJECT";

export type RiskPortfolioState = {
  currentPositionSize: number;
  averageEntryPrice: number | null;
  grossNotionalExposure: number;
  openOrderNotional: number;
  openOrdersCount: number;
  realizedPnl: number;
  unrealizedPnl: number;
};

export type RiskMarketState = {
  marketId: string;
  outcomeTokenId: string;
  status: "open" | "halted" | "closed";
  bestBid: number | null;
  bestAsk: number | null;
  midpoint: number | null;
  spread: number | null;
  topBookDepth: number;
  minOrderSize: number;
  timeToExpiryHours: number | null;
};

export type RiskClosedTradeRecord = {
  ts: number;
  realizedPnl: number;
  stopLossTriggered: boolean;
};

export type RiskMarketSample = {
  instrumentKey: string;
  ts: number;
  spread: number | null;
  topBookDepth: number;
};

export type RollingRiskMetricsState = {
  closedTrades: RiskClosedTradeRecord[];
  marketSamplesByInstrument: Record<string, RiskMarketSample[]>;
  cooldownUntilTs: number | null;
};

export type RiskMetricsSnapshot = {
  cooldownUntilTs: number | null;
  losingStreak: number;
  rollingExpectancy: number | null;
  rollingTradeCount: number;
  recentAverageSpread: number | null;
  recentAverageTopBookDepth: number | null;
};

export type RiskEvaluationInput = {
  decision: StrategyDecision;
  market: RiskMarketState;
  portfolio: RiskPortfolioState;
  metrics: RiskMetricsSnapshot;
  config: RiskEngineConfig;
  nowTs: number;
  runMode: RunMode;
};

export type RiskEvaluationDecision = {
  action: RiskDecisionAction;
  approved: boolean;
  decision: StrategyDecision;
  reasonCodes: RiskReasonCode[];
  metadata: {
    proposedSize: number;
    approvedSize: number;
    decisionNotional: number;
    grossExposureAfter: number | null;
    inventoryAfter: number | null;
    cooldownRemainingMs: number;
    rollingExpectancy: number | null;
    abnormalSpreadThreshold: number | null;
    isRiskReducing: boolean;
    runMode: RunMode;
  };
};

export type RiskEngineConfig = {
  /**
   * Global safety switch. When false, the risk engine rejects all new trading actions.
   */
  tradingEnabled: boolean;
  /**
   * When true, the engine will reduce oversize proposals down to the safe maximum instead of rejecting immediately.
   */
  allowSizeReduction: boolean;
  /**
   * Largest notional allowed for a single proposed order or quote.
   */
  maxRiskPerTradeNotional: number;
  /**
   * Maximum total committed notional across inventory, open orders, and the approved proposal.
   */
  maxNotionalExposure: number;
  /**
   * Maximum absolute inventory size allowed in one market outcome.
   */
  maxInventoryImbalance: number;
  /**
   * Maximum number of concurrent open working orders.
   */
  maxConcurrentOpenOrders: number;
  /**
   * Absolute daily/session loss threshold. When current realized plus unrealized PnL falls below negative this value, entries stop.
   */
  maxDailyLoss: number;
  /**
   * Number of consecutive losing closed trades allowed before entries stop.
   */
  maxLosingStreak: number;
  /**
   * Cooldown applied after a stop-loss-tagged trade closes.
   */
  stopLossCooldownMs: number;
  /**
   * Number of most recent closed trades used for rolling expectancy.
   */
  rollingExpectancyWindowTrades: number;
  /**
   * Minimum closed-trade count required before the expectancy kill switch activates.
   */
  rollingExpectancyMinTrades: number;
  /**
   * Minimum acceptable average realized PnL per trade over the rolling window.
   */
  minRollingExpectancy: number;
  /**
   * Time window used to compute recent market-condition baselines.
   */
  marketMetricsWindowMs: number;
  /**
   * If current spread exceeds recent average spread times this multiplier, trading is paused.
   */
  abnormalSpreadMultiplier: number;
  /**
   * Absolute spread fallback threshold used when recent market history is thin.
   */
  abnormalSpreadAbsolute: number;
  /**
   * Minimum top-of-book depth required to keep trading.
   */
  minTopBookDepth: number;
  /**
   * No new entries or quotes inside this market-end window.
   */
  noTradeBeforeExpiryHours: number;
};

export interface RiskEngine {
  evaluate(input: RiskEvaluationInput): RiskEvaluationDecision;
}

export type RiskProjectedState = {
  signedDecisionSize: number;
  decisionNotional: number;
  projectedInventory: number | null;
  projectedGrossExposure: number | null;
  isRiskReducing: boolean;
  side: Side | null;
};
