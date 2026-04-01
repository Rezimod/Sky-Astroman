import type {
  FeatureEngineConfig,
  MakerSignalConfig,
  MarketDescriptor,
  OrderBookSnapshot,
  OrderBookFeatureVector,
  PaperBrokerEvent,
  PaperFillModelConfig,
  PaperFillRecord,
  PaperPosition,
  PaperTradeLifecycle,
  RiskEngineConfig,
  RiskEvaluationDecision,
  StrategyDecision,
  StrategyInventoryState,
  StrategyMarketState,
} from "@polymarket-bot/shared";

export type BacktestDataset = {
  markets: MarketDescriptor[];
  snapshots: OrderBookSnapshot[];
  metadata?: {
    source?: string;
    note?: string;
  };
};

export type BacktestReportOptions = {
  writeJson: boolean;
  writeCsv: boolean;
  writeSvgEquityCurve: boolean;
};

export type BacktestRuntimeConfig = {
  initialCash: number;
  maxAbsPositionSize: number;
  maxOrderSize: number;
  aggressiveExitOnStrategyExit: boolean;
  cancelOpenOrdersOnHold: boolean;
  cancelOpenOrdersOnReject: boolean;
  featureConfig?: Partial<FeatureEngineConfig>;
  strategyConfig?: Partial<MakerSignalConfig>;
  riskConfig?: Partial<RiskEngineConfig>;
  paperFillConfig?: Partial<PaperFillModelConfig>;
};

export type SweepValue = string | number | boolean;

export type ParameterSweepConfig = {
  parameters: Record<string, SweepValue[]>;
  objective: "netPnl" | "expectancy" | "winRate";
};

export type WalkForwardConfig = {
  enabled: boolean;
  trainWindowEvents: number;
  testWindowEvents: number;
  stepEvents?: number;
};

export type BacktestSessionConfig = {
  sessionId: string;
  datasetPath: string;
  outputDir?: string;
  audit?: {
    databasePath?: string;
    exportDir?: string;
    persistSweepResults?: boolean;
    persistWalkForwardResults?: boolean;
  };
  runtime: BacktestRuntimeConfig;
  sweep?: ParameterSweepConfig;
  walkForward?: WalkForwardConfig;
  report?: Partial<BacktestReportOptions>;
};

export type BacktestResolvedConfig = {
  sessionId: string;
  outputDir?: string;
  runtime: Required<BacktestRuntimeConfig> & {
    featureConfig: FeatureEngineConfig;
    strategyConfig: MakerSignalConfig;
    riskConfig: RiskEngineConfig;
    paperFillConfig: PaperFillModelConfig;
  };
  sweep?: ParameterSweepConfig;
  walkForward?: WalkForwardConfig;
  report: BacktestReportOptions;
};

export type BacktestTradeRecord = {
  tradeId: string;
  marketId: string;
  outcomeTokenId: string;
  marketType: string;
  side: "buy" | "sell";
  openedAtTs: number;
  closedAtTs: number;
  durationMs: number;
  sizeOpened: number;
  sizeClosed: number;
  entryValue: number;
  exitValue: number;
  realizedPnl: number;
  fees: number;
  win: boolean;
};

export type EquityCurvePoint = {
  ts: number;
  equity: number;
  realizedPnl: number;
  unrealizedPnl: number;
  drawdown: number;
};

export type MarketTypePerformance = {
  marketType: string;
  trades: number;
  winRate: number;
  expectancy: number;
  netPnl: number;
  avgWin: number;
  avgLoss: number;
};

export type BacktestMetrics = {
  processedSnapshots: number;
  decisionsGenerated: number;
  approvals: number;
  reductions: number;
  rejections: number;
  ordersSubmitted: number;
  ordersCanceled: number;
  ordersReplaced: number;
  fills: number;
  fillRatio: number;
  totalTrades: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  expectancy: number;
  maxDrawdown: number;
  averageTimeInTradeMs: number;
  realizedPnl: number;
  unrealizedPnl: number;
  netPnl: number;
  finalEquity: number;
  aggressiveExitAttempts: number;
  aggressiveExitRetries: number;
  aggressiveExitPartialCount: number;
  unresolvedAggressiveExitCount: number;
  unresolvedAggressiveExitSize: number;
};

export type BacktestRunStats = {
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

export type ResidualAggressiveExitRecord = {
  marketId: string;
  outcomeTokenId: string;
  side: "buy" | "sell";
  firstRequestedAtTs: number;
  lastAttemptTs: number;
  remainingSize: number;
  attempts: number;
};

export type BacktestDecisionRecord = {
  ts: number;
  marketId: string;
  outcomeTokenId: string;
  marketType: string;
  features: OrderBookFeatureVector;
  market: StrategyMarketState & {
    topBookDepth: number;
    liquidity: number | null;
    volume24hr: number | null;
    volume: number | null;
  };
  inventory: StrategyInventoryState;
  strategyDecision: StrategyDecision;
  riskDecision: RiskEvaluationDecision;
};

export type BacktestRunReport = {
  sessionId: string;
  label: string;
  configSummary: {
    datasetSize: number;
    initialCash: number;
    aggressiveExitOnStrategyExit: boolean;
    parameterOverrides: Record<string, SweepValue>;
  };
  metrics: BacktestMetrics;
  trades: BacktestTradeRecord[];
  equityCurve: EquityCurvePoint[];
  marketTypeBreakdown: MarketTypePerformance[];
  riskDecisions: BacktestDecisionRecord[];
  closedTradeLifecycles: PaperTradeLifecycle[];
  fills: PaperFillRecord[];
  positions: PaperPosition[];
  brokerEvents: PaperBrokerEvent[];
  residualAggressiveExits: ResidualAggressiveExitRecord[];
};

export type ParameterCombination = {
  id: string;
  overrides: Record<string, SweepValue>;
};

export type SweepRunResult = {
  parameterSetId: string;
  overrides: Record<string, SweepValue>;
  score: number;
  report: BacktestRunReport;
};

export type WalkForwardFold = {
  foldIndex: number;
  trainStartIndex: number;
  trainEndIndex: number;
  testStartIndex: number;
  testEndIndex: number;
};

export type WalkForwardFoldResult = {
  fold: WalkForwardFold;
  selectedParameterSetId: string;
  selectedOverrides: Record<string, SweepValue>;
  trainScore: number;
  trainReport: BacktestRunReport;
  testReport: BacktestRunReport;
};

export type BacktestSummary = {
  sessionId: string;
  datasetPath: string;
  datasetMetadata?: BacktestDataset["metadata"];
  limitations: string[];
  bestRun: BacktestRunReport;
  sweepResults: SweepRunResult[];
  walkForwardResults: WalkForwardFoldResult[];
};
