import assert from "node:assert/strict";
import test from "node:test";

import type {
  MarketDescriptor,
  OrderBookSnapshot,
  SubscriptionStatus,
} from "@polymarket-bot/shared";
import type {
  OrderBookSubscriptionHandle,
  OrderBookSubscriptionOptions,
  PolymarketMarketGateway,
} from "@polymarket-bot/polymarket-adapter";

import { exampleScannerConfig } from "./example-config.js";
import { MarketScannerService } from "./service.js";

class FakeMarketDataGateway implements PolymarketMarketGateway {
  readonly name = "fake-market-data";

  constructor(
    private readonly markets: MarketDescriptor[],
    private readonly books: Map<string, OrderBookSnapshot>,
  ) {}

  async start(): Promise<void> {}

  async stop(): Promise<void> {}

  getHealth() {
    return { status: "running" as const };
  }

  async listActiveCandidateMarkets(): Promise<MarketDescriptor[]> {
    return this.markets;
  }

  async fetchMarketDetails(): Promise<MarketDescriptor | null> {
    return null;
  }

  async fetchOrderBook(tokenId: string): Promise<OrderBookSnapshot> {
    const snapshot = this.books.get(tokenId);
    if (!snapshot) {
      throw new Error(`Missing fake order book for tokenId=${tokenId}`);
    }

    return snapshot;
  }

  async subscribeToOrderBook(
    options: OrderBookSubscriptionOptions,
  ): Promise<OrderBookSubscriptionHandle> {
    options.onStatusChange?.("connected");
    return {
      async close() {
        options.onStatusChange?.("closed");
      },
      getStatus(): SubscriptionStatus {
        return "connected";
      },
    };
  }
}

function market(overrides: Partial<MarketDescriptor>): MarketDescriptor {
  return {
    marketId: "m1",
    slug: "healthy-market",
    question: "Healthy market?",
    active: true,
    acceptingOrders: true,
    enableOrderBook: true,
    liquidity: 15_000,
    volume24hr: 6_000,
    endTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    outcomes: [{ outcome: "Yes", tokenId: "t1", price: 0.52 }],
    status: "open",
    ...overrides,
  };
}

function orderBook(
  marketId: string,
  tokenId: string,
  bidPrice: number,
  bidSize: number,
  askPrice: number,
  askSize: number,
): OrderBookSnapshot {
  return {
    marketId,
    outcomeTokenId: tokenId,
    ts: 1_000,
    sequence: 1,
    bids: [{ price: bidPrice, size: bidSize }],
    asks: [{ price: askPrice, size: askSize }],
  };
}

test("scanner service ranks healthy markets and preserves rejected candidates", async () => {
  const acceptedMarket = market({});
  const rejectedMarket = market({
    marketId: "m2",
    slug: "wide-market",
    outcomes: [{ outcome: "Yes", tokenId: "t2", price: 0.48 }],
  });
  const gateway = new FakeMarketDataGateway(
    [acceptedMarket, rejectedMarket],
    new Map([
      ["t1", orderBook("m1", "t1", 0.5, 150, 0.53, 160)],
      ["t2", orderBook("m2", "t2", 0.4, 150, 0.52, 160)],
    ]),
  );
  const events: string[] = [];
  const service = new MarketScannerService({
    runMode: "paper",
    marketData: gateway,
    config: {
      ...exampleScannerConfig,
      refreshIntervalMs: 60_000,
      maxCandidates: 5,
    },
  });

  const unsubscribe = service.subscribe((event) => {
    events.push(event.type);
  });

  await service.refresh();
  const snapshot = service.getSnapshot();

  assert.ok(snapshot);
  assert.deepEqual(events, ["market_scanner.updated"]);
  assert.equal(snapshot?.acceptedCount, 1);
  assert.equal(snapshot?.rejectedCount, 1);
  assert.equal(snapshot?.candidates[0]?.market.marketId, "m1");
  assert.equal(snapshot?.rejected[0]?.market.marketId, "m2");
  assert.equal(service.getStatus(), "idle");

  unsubscribe();
  await service.stop();
});
