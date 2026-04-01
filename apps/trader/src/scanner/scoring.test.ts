import assert from "node:assert/strict";
import test from "node:test";

import type { MarketDescriptor, OrderBookSnapshot } from "@polymarket-bot/shared";

import { exampleScannerConfig } from "./example-config.js";
import {
  computeScannerScore,
  computeTopBookDepth,
  computeUpdateFrequencyPerMinute,
  evaluateMarketOutcome,
} from "./scoring.js";

const market: MarketDescriptor = {
  marketId: "m1",
  slug: "btc-100k",
  question: "Will BTC be above 100k?",
  active: true,
  acceptingOrders: true,
  enableOrderBook: true,
  liquidity: 15000,
  volume24hr: 6000,
  endTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  outcomes: [
    {
      outcome: "Yes",
      tokenId: "yes-token",
      price: 0.52,
    },
  ],
  status: "open",
};

const snapshot: OrderBookSnapshot = {
  marketId: "m1",
  outcomeTokenId: "yes-token",
  ts: Date.now(),
  sequence: 1,
  bids: [{ price: 0.5, size: 150 }],
  asks: [{ price: 0.53, size: 160 }],
};

test("computeTopBookDepth sums best bid and ask size", () => {
  assert.equal(computeTopBookDepth(snapshot), 310);
});

test("computeUpdateFrequencyPerMinute respects activity window", () => {
  const now = 10_000;
  const updates = [-200_000, 9_000, 8_500];
  assert.equal(computeUpdateFrequencyPerMinute(updates, 120_000, now), 1);
});

test("evaluateMarketOutcome accepts a healthy liquid market", () => {
  const decision = evaluateMarketOutcome({
    market,
    outcome: market.outcomes[0],
    snapshot,
    recentUpdatesPerMinute: 2,
    config: exampleScannerConfig,
    scannedAt: new Date().toISOString(),
  });

  assert.equal(decision.accepted, true);
  assert.ok(decision.score > 0);
  assert.equal(decision.metrics.spreadCents, 3);
});

test("computeScannerScore penalizes wide spreads", () => {
  const narrow = computeScannerScore(
    {
      bestBid: 0.5,
      bestAsk: 0.53,
      spread: 0.03,
      spreadCents: 3,
      midpoint: 0.515,
      topBookDepth: 300,
      recentUpdatesPerMinute: 2,
      timeToExpiryHours: 24,
      liquidity: 15000,
      volume24hr: 6000,
      activityScore: 0,
      scannedAt: new Date().toISOString(),
    },
    exampleScannerConfig,
  );

  const wide = computeScannerScore(
    {
      bestBid: 0.4,
      bestAsk: 0.55,
      spread: 0.15,
      spreadCents: 15,
      midpoint: 0.475,
      topBookDepth: 300,
      recentUpdatesPerMinute: 2,
      timeToExpiryHours: 24,
      liquidity: 15000,
      volume24hr: 6000,
      activityScore: 0,
      scannedAt: new Date().toISOString(),
    },
    exampleScannerConfig,
  );

  assert.ok(narrow > wide);
});
