import assert from "node:assert/strict";
import test from "node:test";

import type { MarketDescriptor, OrderBookSnapshot } from "../types/index.js";
import {
  buildFeatures,
  computeMicroprice,
  computeMidpoint,
  computePressureSample,
  computeSpread,
  computeTopBookImbalance,
  DEFAULT_FEATURE_ENGINE_CONFIG,
  RollingFeatureEngine,
} from "./engine.js";

const market: MarketDescriptor = {
  marketId: "market-1",
  slug: "btc-short-term",
  question: "Will BTC close higher today?",
  active: true,
  acceptingOrders: true,
  enableOrderBook: true,
  endTime: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
  outcomes: [{ outcome: "Yes", tokenId: "token-yes", price: 0.52 }],
  status: "open",
};

function createSnapshot(
  ts: number,
  bidPrice: number,
  bidSize: number,
  askPrice: number,
  askSize: number,
): OrderBookSnapshot {
  return {
    marketId: market.marketId,
    outcomeTokenId: "token-yes",
    ts,
    sequence: ts,
    bids: [{ price: bidPrice, size: bidSize }],
    asks: [{ price: askPrice, size: askSize }],
  };
}

test("computes microprice and top-of-book imbalance deterministically", () => {
  const snapshot = createSnapshot(1_000, 0.49, 200, 0.51, 100);

  assert.equal(computeMicroprice(snapshot), 0.50333333);
  assert.equal(computeTopBookImbalance(snapshot), 0.33333333);
  assert.ok(computePressureSample(snapshot) > 0);
});

test("feature helpers stay conservative when top of book is incomplete", () => {
  const incompleteBook: OrderBookSnapshot = {
    marketId: market.marketId,
    outcomeTokenId: "token-yes",
    ts: 2_000,
    sequence: 2_000,
    bids: [{ price: 0.49, size: 100 }],
    asks: [],
  };

  assert.equal(computeMidpoint(incompleteBook), null);
  assert.equal(computeSpread(incompleteBook), null);
  assert.equal(computeMicroprice(incompleteBook), null);
  assert.equal(computeTopBookImbalance(incompleteBook), 1);
});

test("buildFeatures produces drift, spread delta, pressure, volatility, and inventory bias", () => {
  const history = [
    createSnapshot(0, 0.49, 100, 0.51, 100),
    createSnapshot(10_000, 0.5, 130, 0.52, 90),
    createSnapshot(20_000, 0.505, 150, 0.525, 80),
  ];
  const engine = new RollingFeatureEngine(DEFAULT_FEATURE_ENGINE_CONFIG);

  for (const snapshot of history) {
    engine.ingest({
      market,
      snapshot,
      inventory: {
        positionSize: 25,
        maxAbsPositionSize: 100,
      },
    });
  }

  const features = engine.buildFeatures(
    {
      marketId: market.marketId,
      outcomeTokenId: "token-yes",
    },
    {
      positionSize: 25,
      maxAbsPositionSize: 100,
    },
  );

  assert.ok(features);
  assert.equal(features?.midpoint, 0.515);
  assert.equal(features?.spread, 0.02);
  assert.ok((features?.shortTermMidpointDrift ?? 0) > 0);
  assert.ok((features?.recentOrderBookPressure ?? 0) > 0);
  assert.ok((features?.recentVolatilityProxy ?? 0) >= 0);
  assert.equal(features?.inventoryAwareBias, 0.25);
});

test("sliding windows prune stale observations without lookahead", () => {
  const engine = new RollingFeatureEngine({
    ...DEFAULT_FEATURE_ENGINE_CONFIG,
    maxWindowMs: 20_000,
    volatilityWindowMs: 20_000,
    pressureWindowMs: 20_000,
    driftWindowMs: 20_000,
    spreadWindowMs: 20_000,
  });

  engine.ingest({
    market,
    snapshot: createSnapshot(0, 0.49, 100, 0.51, 100),
  });
  engine.ingest({
    market,
    snapshot: createSnapshot(10_000, 0.5, 100, 0.52, 100),
  });
  const state = engine.ingest({
    market,
    snapshot: createSnapshot(40_000, 0.51, 110, 0.53, 90),
  });

  assert.equal(state.history.length, 1);
  const features = buildFeatures(state);
  assert.equal(features.observationCount, 1);
  assert.equal(features.shortTermMidpointDrift, 0);
});

test("per-market state stays isolated", () => {
  const engine = new RollingFeatureEngine();
  const otherMarket: MarketDescriptor = {
    ...market,
    marketId: "market-2",
    slug: "eth-short-term",
    outcomes: [{ outcome: "Yes", tokenId: "token-eth" }],
  };

  engine.ingest({
    market,
    snapshot: createSnapshot(1_000, 0.49, 100, 0.51, 100),
  });
  engine.ingest({
    market: otherMarket,
    snapshot: {
      marketId: otherMarket.marketId,
      outcomeTokenId: "token-eth",
      ts: 2_000,
      sequence: 2_000,
      bids: [{ price: 0.4, size: 60 }],
      asks: [{ price: 0.42, size: 40 }],
    },
  });

  assert.ok(
    engine.buildFeatures({
      marketId: market.marketId,
      outcomeTokenId: "token-yes",
    }),
  );
  assert.ok(
    engine.buildFeatures({
      marketId: otherMarket.marketId,
      outcomeTokenId: "token-eth",
    }),
  );
});
