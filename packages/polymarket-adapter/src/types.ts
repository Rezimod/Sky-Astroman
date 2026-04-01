import type WebSocket from "ws";

import type {
  ExecutionAdapter,
  FillEvent,
  MarketDataAdapter,
  MarketDataSubscription,
  MarketDescriptor,
  MarketLookup,
  MarketStreamEvent,
  OrderAck,
  OrderBookSnapshot,
  OrderIntent,
  OrderReject,
  PortfolioSnapshot,
  RunMode,
  ServiceStatus,
  SubscriptionStatus,
} from "@polymarket-bot/shared";

export type FetchLike = typeof fetch;
export type LoggerLike = {
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
};
export type WebSocketFactory = (url: string) => WebSocket;

export type PolymarketAdapterOptions = {
  restUrl: string;
  wsUrl: string;
  gammaUrl?: string;
  fetchImpl?: FetchLike;
  logger?: LoggerLike;
  webSocketFactory?: WebSocketFactory;
};

export type PolymarketExecutionOptions = {
  runMode: RunMode;
  logger?: LoggerLike;
};

export type ListCandidateMarketsOptions = {
  limit?: number;
  offset?: number;
  minLiquidity?: number;
  minVolume24hr?: number;
  maxHoursToExpiry?: number;
};

export type OrderBookSubscriptionOptions = {
  tokenIds: string[];
  customFeatureEnabled?: boolean;
  connectTimeoutMs?: number;
  onEvent: (event: MarketStreamEvent) => void;
  onStatusChange?: (status: SubscriptionStatus) => void;
  onError?: (error: Error) => void;
};

export interface OrderBookSubscriptionHandle extends MarketDataSubscription {}

export interface PolymarketMarketGateway extends MarketDataAdapter {
  listActiveCandidateMarkets(options?: ListCandidateMarketsOptions): Promise<MarketDescriptor[]>;
  fetchMarketDetails(lookup: MarketLookup): Promise<MarketDescriptor | null>;
  fetchOrderBook(tokenId: string, marketId?: string): Promise<OrderBookSnapshot>;
  subscribeToOrderBook(options: OrderBookSubscriptionOptions): Promise<OrderBookSubscriptionHandle>;
}

export type CreateOrderRequest = {
  order: OrderIntent;
};

export interface PolymarketTradingGateway extends ExecutionAdapter {
  createOrder(input: CreateOrderRequest): Promise<OrderAck | OrderReject>;
  cancelOrder(orderId: string): Promise<void>;
  getFills(): Promise<FillEvent[]>;
  getPositions(): Promise<PortfolioSnapshot["positions"]>;
}

export type RateLimitGroup = "gamma" | "clob";

export type RawGammaMarket = {
  id?: string | number;
  conditionId?: string;
  eventId?: string | number;
  eventSlug?: string;
  slug?: string;
  question?: string;
  description?: string | null;
  category?: string | null;
  image?: string | null;
  icon?: string | null;
  active?: boolean;
  closed?: boolean;
  archived?: boolean;
  acceptingOrders?: boolean;
  enableOrderBook?: boolean;
  negRisk?: boolean;
  endDateIso?: string | null;
  startDateIso?: string | null;
  liquidityNum?: number | string | null;
  volume24hr?: number | string | null;
  volumeNum?: number | string | null;
  outcomes?: string[] | string;
  clobTokenIds?: string[] | string;
  outcomePrices?: string[] | string;
  orderPriceMinTickSize?: number | string | null;
  orderMinSize?: number | string | null;
};

export type RawBookLevel = {
  price: number | string;
  size: number | string;
};

export type RawBookSummary = {
  asset_id?: string;
  market?: string;
  timestamp?: string | number;
  hash?: string;
  bids?: RawBookLevel[];
  asks?: RawBookLevel[];
};

export type RawBookEvent = {
  event_type: "book";
  asset_id: string;
  market: string;
  timestamp: string;
  hash?: string;
  bids: RawBookLevel[];
  asks: RawBookLevel[];
};

export type RawPriceChangeEvent = {
  event_type: "price_change";
  asset_id: string;
  market: string;
  timestamp: string;
  hash?: string;
  side: "BUY" | "SELL";
  price: string;
  size: string;
  best_bid?: string;
  best_ask?: string;
};

export type RawBestBidAskEvent = {
  event_type: "best_bid_ask";
  asset_id: string;
  market: string;
  timestamp: string;
  hash?: string;
  bid?: string | null;
  ask?: string | null;
};

export type RawLastTradePriceEvent = {
  event_type: "last_trade_price";
  asset_id: string;
  market: string;
  timestamp: string;
  price: string;
  side: "BUY" | "SELL";
  size?: string;
};

export type RawTickSizeChangeEvent = {
  event_type: "tick_size_change";
  asset_id: string;
  market: string;
  timestamp: string;
  old_tick_size?: string | null;
  new_tick_size: string;
};

export type RawMarketChannelEvent =
  | RawBookEvent
  | RawPriceChangeEvent
  | RawBestBidAskEvent
  | RawLastTradePriceEvent
  | RawTickSizeChangeEvent;

export type PolymarketHealth = {
  status: ServiceStatus;
  subscriptions: number;
  reconnectAttempts: number;
};
