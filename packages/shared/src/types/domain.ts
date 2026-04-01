export type RunMode = "paper" | "live" | "replay";
export type Side = "buy" | "sell";
export type LiquidityIntent = "maker" | "taker";
export type MarketStatus = "open" | "halted" | "closed";
export type ServiceStatus = "idle" | "running" | "degraded" | "stopped";
export type SubscriptionStatus = "connecting" | "connected" | "reconnecting" | "closed";

export type OrderBookLevel = {
  price: number;
  size: number;
};

export type MarketOutcomeDescriptor = {
  outcome: string;
  tokenId: string;
  price?: number | null;
};

export type MarketDescriptor = {
  marketId: string;
  venueMarketId?: string;
  conditionId?: string;
  eventId?: string;
  eventSlug?: string;
  slug: string;
  question: string;
  description?: string | null;
  category?: string | null;
  image?: string | null;
  icon?: string | null;
  active?: boolean;
  closed?: boolean;
  archived?: boolean;
  acceptingOrders?: boolean;
  startTime?: string | null;
  endTime?: string | null;
  liquidity?: number | null;
  volume24hr?: number | null;
  volume?: number | null;
  tickSize?: number | null;
  minOrderSize?: number | null;
  negativeRisk?: boolean;
  enableOrderBook?: boolean;
  outcomes: MarketOutcomeDescriptor[];
  status: MarketStatus;
};

export type MarketLookup = {
  marketId?: string;
  venueMarketId?: string;
  slug?: string;
  conditionId?: string;
  tokenId?: string;
};

export type OrderBookSnapshot = {
  marketId: string;
  outcomeTokenId: string;
  ts: number;
  sequence: number;
  hash?: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
};

export type TopOfBook = {
  marketId: string;
  outcomeTokenId: string;
  bestBid: number | null;
  bestAsk: number | null;
  spread: number | null;
  midpoint: number | null;
  ts: number;
  hash?: string;
};

export type MarketStreamEvent =
  | {
      type: "orderbook_snapshot";
      marketId: string;
      outcomeTokenId: string;
      orderBook: OrderBookSnapshot;
      topOfBook: TopOfBook;
      source: "ws" | "rest";
      rawEventType: "book";
      ts: number;
    }
  | {
      type: "orderbook_delta";
      marketId: string;
      outcomeTokenId: string;
      orderBook: OrderBookSnapshot;
      topOfBook: TopOfBook;
      source: "ws";
      rawEventType: "price_change";
      ts: number;
    }
  | {
      type: "top_of_book";
      marketId: string;
      outcomeTokenId: string;
      topOfBook: TopOfBook;
      source: "ws";
      rawEventType: "best_bid_ask";
      ts: number;
    }
  | {
      type: "trade";
      marketId: string;
      outcomeTokenId: string;
      side: Side;
      price: number;
      size: number;
      source: "ws";
      rawEventType: "last_trade_price";
      ts: number;
    }
  | {
      type: "tick_size_change";
      marketId: string;
      outcomeTokenId: string;
      previousTickSize: number | null;
      nextTickSize: number;
      source: "ws";
      rawEventType: "tick_size_change";
      ts: number;
    };

export type FeatureVector = Record<string, number>;

export type MarketScannerWeights = {
  liquidity: number;
  volume24hr: number;
  topBookDepth: number;
  spread: number;
  updateFrequency: number;
  expiry: number;
};

export type MarketScannerConfig = {
  enabled: boolean;
  refreshIntervalMs: number;
  marketLimit: number;
  maxCandidates: number;
  minLiquidity: number;
  minVolume24hr: number;
  minTopBookDepth: number;
  maxSpreadCents: number;
  minHoursToExpiry: number;
  maxHoursToExpiry: number;
  preferredHoursToExpiry: number;
  minUpdateFrequencyPerMinute: number;
  activityWindowMs: number;
  weights: MarketScannerWeights;
};

export type MarketScannerMetrics = {
  bestBid: number | null;
  bestAsk: number | null;
  spread: number | null;
  spreadCents: number | null;
  midpoint: number | null;
  topBookDepth: number;
  recentUpdatesPerMinute: number;
  timeToExpiryHours: number | null;
  liquidity: number;
  volume24hr: number;
  activityScore: number;
  scannedAt: string;
};

export type MarketScannerSelectedOutcome = {
  outcome: string;
  tokenId: string;
  price?: number | null;
};

export type MarketScannerDecision = {
  market: MarketDescriptor;
  selectedOutcome: MarketScannerSelectedOutcome;
  metrics: MarketScannerMetrics;
  score: number;
  accepted: boolean;
  reasons: string[];
  rank?: number;
};

export type MarketScannerSnapshot = {
  scannedAt: string;
  cycleDurationMs: number;
  totalMarkets: number;
  acceptedCount: number;
  rejectedCount: number;
  candidates: MarketScannerDecision[];
  rejected: MarketScannerDecision[];
};

export type MarketScannerUpdateEvent = {
  type: "market_scanner.updated";
  snapshot: MarketScannerSnapshot;
};

export type PortfolioSnapshot = {
  cash: number;
  positions: Array<{
    marketId: string;
    outcomeTokenId: string;
    size: number;
    averagePrice: number;
  }>;
  realizedPnl: number;
  unrealizedPnl: number;
};

export type StrategyContext = {
  market: MarketDescriptor;
  orderBook: OrderBookSnapshot;
  portfolio: PortfolioSnapshot;
  features: FeatureVector;
  clockTs: number;
  runMode: RunMode;
};

export type Signal =
  | {
      kind: "quote";
      side: Side;
      price: number;
      size: number;
      liquidityIntent: LiquidityIntent;
      reason: string;
    }
  | {
      kind: "cancel";
      orderId?: string;
      reason: string;
    }
  | {
      kind: "flatten";
      urgency: LiquidityIntent;
      reason: string;
    }
  | {
      kind: "noop";
      reason: string;
    };

export type RiskDecision = {
  approved: boolean;
  reason: string;
};

export type OrderIntent = {
  clientOrderId: string;
  marketId: string;
  outcomeTokenId: string;
  side: Side;
  price: number;
  size: number;
  liquidityIntent: LiquidityIntent;
};

export type OrderAck = {
  accepted: true;
  venueOrderId: string;
  clientOrderId: string;
  ts: number;
};

export type OrderReject = {
  accepted: false;
  clientOrderId: string;
  reason: string;
  ts: number;
};

export type FillEvent = {
  orderId: string;
  marketId: string;
  outcomeTokenId: string;
  side: Side;
  price: number;
  size: number;
  fee: number;
  liquidity: LiquidityIntent;
  ts: number;
};

export type PaperTradingPositionSnapshot = {
  marketId: string;
  outcomeTokenId: string;
  slug: string | null;
  question: string;
  outcome: string;
  size: number;
  averageEntryPrice: number;
  markPrice: number | null;
  realizedPnl: number;
  unrealizedPnl: number;
  totalFees: number;
  openTradeId: string | null;
};

export type PaperTradingOrderSnapshot = {
  orderId: string;
  clientOrderId: string;
  marketId: string;
  outcomeTokenId: string;
  slug: string | null;
  question: string;
  outcome: string;
  side: Side;
  price: number;
  size: number;
  remainingSize: number;
  filledSize: number;
  status: string;
  updatedAtTs: number;
};

export type PaperTradingFillSnapshot = {
  fillId: string;
  marketId: string;
  outcomeTokenId: string;
  slug: string | null;
  question: string;
  outcome: string;
  side: Side;
  price: number;
  size: number;
  fee: number;
  liquidity: LiquidityIntent;
  ts: number;
  aggressiveExit: boolean;
  fillConfidence: "displayed_depth" | "price_through_inferred";
};

export type PaperTradingDecisionSnapshot = {
  ts: number;
  marketId: string;
  outcomeTokenId: string;
  slug: string | null;
  question: string;
  outcome: string;
  actionType: "BUY" | "SELL" | "QUOTE" | "HOLD" | "EXIT";
  side: Side | null;
  confidence: number;
  heuristicScore: number;
  targetEntryPrice: number | null;
  targetSize: number;
  estimatedEdge: number | null;
  strategyReasonCodes: string[];
  riskAction: "APPROVE" | "REDUCE" | "REJECT";
  riskApproved: boolean;
  riskReasonCodes: string[];
};

export type PaperTradingSnapshot = {
  service: "paper-trading";
  status: ServiceStatus;
  initialCash: number;
  markToMidEquity: number;
  realizedPnl: number;
  unrealizedPnl: number;
  netPnl: number;
  trackedMarkets: number;
  openOrders: number;
  openPositions: number;
  fills: number;
  closedTrades: number;
  winRate: number | null;
  expectancy: number | null;
  avgWin: number | null;
  avgLoss: number | null;
  decisionsGenerated: number;
  approvals: number;
  reductions: number;
  rejections: number;
  fillRatio: number | null;
  lastUpdatedAt: string | null;
  lastDecisionAt: string | null;
  lastFillAt: string | null;
  warnings: string[];
  positions: PaperTradingPositionSnapshot[];
  openOrderDetails: PaperTradingOrderSnapshot[];
  recentFills: PaperTradingFillSnapshot[];
  recentDecisions: PaperTradingDecisionSnapshot[];
};

export type TraderRuntimeSnapshot = {
  service: "trader";
  ok: boolean;
  runMode: RunMode;
  startedAt: string;
  databaseUrl: string;
  traderHost: string;
  traderPort: number;
  marketDataStatus: ServiceStatus;
  executionStatus: ServiceStatus;
  scannerStatus?: ServiceStatus;
  scannerCandidateCount?: number;
  scannerLastUpdatedAt?: string | null;
  scannerStale?: boolean;
  paperTradingStatus?: ServiceStatus;
  paperTrackedMarkets?: number;
  paperOpenOrders?: number;
  paperOpenPositions?: number;
  paperLastUpdatedAt?: string | null;
  paperNetPnl?: number | null;
  warnings?: string[];
};

export interface Strategy {
  id: string;
  onTick(context: StrategyContext): Signal[];
}

export interface RiskPolicy {
  id: string;
  evaluate(context: StrategyContext, signal: Signal): RiskDecision;
}

export interface MarketDataAdapter {
  name: string;
  start(): Promise<void>;
  stop(): Promise<void>;
  getHealth(): { status: ServiceStatus };
}

export interface MarketDataSubscription {
  close(): Promise<void>;
  getStatus(): SubscriptionStatus;
}

export interface ExecutionAdapter {
  name: string;
  submit(intent: OrderIntent): Promise<OrderAck | OrderReject>;
  cancel(orderId: string): Promise<void>;
  getHealth(): { status: ServiceStatus };
}
