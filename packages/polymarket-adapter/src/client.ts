import { createLogger } from "@polymarket-bot/shared";

import { normalizeBookSummary, normalizeGammaMarket } from "./normalizers.js";
import { PolymarketRestClient } from "./rest-client.js";
import { PolymarketOrderBookSubscription } from "./stream.js";
import type {
  CreateOrderRequest,
  ListCandidateMarketsOptions,
  LoggerLike,
  OrderBookSubscriptionHandle,
  OrderBookSubscriptionOptions,
  PolymarketAdapterOptions,
  PolymarketExecutionOptions,
  PolymarketHealth,
  PolymarketMarketGateway,
  PolymarketTradingGateway,
} from "./types.js";
import type {
  FillEvent,
  MarketLookup,
  OrderAck,
  OrderBookSnapshot,
  OrderIntent,
  OrderReject,
  PortfolioSnapshot,
  ServiceStatus,
} from "@polymarket-bot/shared";

const DEFAULT_GAMMA_URL = "https://gamma-api.polymarket.com";

function hoursUntil(endTime: string | null | undefined): number | null {
  if (!endTime) {
    return null;
  }

  const deltaMs = new Date(endTime).getTime() - Date.now();
  return Number.isFinite(deltaMs) ? deltaMs / (60 * 60 * 1_000) : null;
}

export class PolymarketMarketDataAdapter implements PolymarketMarketGateway {
  public readonly name = "polymarket-market-data";
  private status: ServiceStatus = "idle";
  private started = false;
  private reconnectAttempts = 0;
  private readonly logger: LoggerLike;
  private readonly restClient: PolymarketRestClient;
  private readonly subscriptions = new Set<OrderBookSubscriptionHandle>();

  constructor(private readonly options: PolymarketAdapterOptions) {
    this.logger = options.logger ?? createLogger("polymarket-market-data");
    this.restClient = new PolymarketRestClient(
      {
        gammaUrl: options.gammaUrl ?? DEFAULT_GAMMA_URL,
        clobUrl: options.restUrl,
      },
      options.fetchImpl,
      this.logger,
    );
  }

  async start(): Promise<void> {
    this.started = true;
    this.recomputeStatus();
  }

  async stop(): Promise<void> {
    await Promise.all([...this.subscriptions].map((subscription) => subscription.close()));
    this.subscriptions.clear();
    this.started = false;
    this.status = "stopped";
  }

  getHealth(): PolymarketHealth {
    return {
      status: this.status,
      subscriptions: this.subscriptions.size,
      reconnectAttempts: this.reconnectAttempts,
    };
  }

  async listActiveCandidateMarkets(options: ListCandidateMarketsOptions = {}) {
    const markets = await this.restClient.listMarkets({
      active: true,
      closed: false,
      archived: false,
      limit: options.limit ?? 50,
      offset: options.offset ?? 0,
    });

    return markets
      .map((market) => normalizeGammaMarket(market))
      .filter((market) => market.enableOrderBook)
      .filter((market) => (market.liquidity ?? 0) >= (options.minLiquidity ?? 0))
      .filter((market) => (market.volume24hr ?? 0) >= (options.minVolume24hr ?? 0))
      .filter((market) => {
        if (!options.maxHoursToExpiry) {
          return true;
        }

        const remainingHours = hoursUntil(market.endTime);
        return remainingHours !== null && remainingHours <= options.maxHoursToExpiry;
      });
  }

  async fetchMarketDetails(lookup: MarketLookup) {
    if (lookup.slug) {
      const market = await this.restClient.getMarketBySlug(lookup.slug);
      return normalizeGammaMarket(market);
    }

    if (lookup.venueMarketId) {
      const market = await this.restClient.getMarketById(lookup.venueMarketId);
      return normalizeGammaMarket(market);
    }

    const markets = await this.restClient.listMarkets({
      active: true,
      limit: 200,
      offset: 0,
    });

    const matched = markets.find((market) => {
      const normalized = normalizeGammaMarket(market);
      return (
        normalized.marketId === lookup.marketId ||
        normalized.conditionId === lookup.conditionId ||
        normalized.outcomes.some((outcome) => outcome.tokenId === lookup.tokenId)
      );
    });

    return matched ? normalizeGammaMarket(matched) : null;
  }

  async fetchOrderBook(tokenId: string, marketId?: string): Promise<OrderBookSnapshot> {
    const summary = await this.restClient.getBook(tokenId);
    return normalizeBookSummary(summary, marketId);
  }

  async subscribeToOrderBook(
    options: OrderBookSubscriptionOptions,
  ): Promise<OrderBookSubscriptionHandle> {
    let lastStatus: ReturnType<OrderBookSubscriptionHandle["getStatus"]> | null = null;
    const subscription = new PolymarketOrderBookSubscription(
      this.options.wsUrl,
      {
        ...options,
        onStatusChange: (status) => {
          if (status === "reconnecting" && lastStatus !== "reconnecting") {
            this.reconnectAttempts += 1;
          }
          lastStatus = status;
          this.recomputeStatus();
          options.onStatusChange?.(status);
        },
      },
      this.options.webSocketFactory,
      this.logger,
    );

    await subscription.connect();
    this.subscriptions.add(subscription);
    this.recomputeStatus();

    return {
      close: async () => {
        this.subscriptions.delete(subscription);
        await subscription.close();
        this.recomputeStatus();
      },
      getStatus: () => subscription.getStatus(),
    };
  }

  private recomputeStatus() {
    if (!this.started) {
      this.status = this.status === "stopped" ? "stopped" : "idle";
      return;
    }

    const subscriptionStatuses = [...this.subscriptions].map((subscription) => subscription.getStatus());
    this.status =
      subscriptionStatuses.length > 0 && subscriptionStatuses.some((status) => status !== "connected")
        ? "degraded"
        : "running";
  }
}

export class PolymarketExecutionAdapter implements PolymarketTradingGateway {
  public readonly name = "polymarket-execution";
  private status: ServiceStatus = "idle";
  private readonly logger: LoggerLike;

  constructor(private readonly options: PolymarketExecutionOptions) {
    this.logger = options.logger ?? createLogger("polymarket-execution");
    if (options.runMode === "live") {
      throw new Error(
        "Live execution is disabled because authenticated order placement is not implemented.",
      );
    }
    this.status = "running";
  }

  async submit(intent: OrderIntent): Promise<OrderAck | OrderReject> {
    return this.createOrder({ order: intent });
  }

  async cancel(orderId: string): Promise<void> {
    await this.cancelOrder(orderId);
  }

  async createOrder(input: CreateOrderRequest): Promise<OrderReject> {
    this.logger.warn("createOrder stub called", {
      clientOrderId: input.order.clientOrderId,
    });

    return {
      accepted: false,
      clientOrderId: input.order.clientOrderId,
      reason: "Authenticated order placement is not implemented yet.",
      ts: Date.now(),
    };
  }

  async cancelOrder(orderId: string): Promise<void> {
    this.logger.warn("cancelOrder stub called", { orderId });
  }

  async getFills(): Promise<FillEvent[]> {
    this.logger.warn("getFills stub called");
    return [];
  }

  async getPositions(): Promise<PortfolioSnapshot["positions"]> {
    this.logger.warn("getPositions stub called");
    return [];
  }

  getHealth() {
    return { status: this.status };
  }
}

export function createPolymarketClients(options: PolymarketAdapterOptions) {
  return {
    marketData: new PolymarketMarketDataAdapter({
      gammaUrl: DEFAULT_GAMMA_URL,
      ...options,
    }),
    execution: new PolymarketExecutionAdapter({
      runMode: "paper",
      logger: options.logger,
    }),
  };
}
