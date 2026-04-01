import assert from "node:assert/strict";
import test from "node:test";

import type { MarketDescriptor, OrderBookSnapshot } from "@polymarket-bot/shared";

import { runBacktestSession } from "./replay.js";
import { compareSnapshots } from "./dataset.js";

const market: MarketDescriptor = {
  marketId: "m1",
  slug: "synthetic-market",
  question: "Synthetic market?",
  category: "test",
  endTime: "2026-04-03T00:00:00.000Z",
  outcomes: [
    {
      outcome: "YES",
      tokenId: "t1",
    },
  ],
  status: "open",
};

function snapshot(
  ts: number,
  sequence: number,
  bidPrice: number,
  bidSize: number,
  askPrice: number,
  askSize: number,
): OrderBookSnapshot {
  return {
    marketId: "m1",
    outcomeTokenId: "t1",
    ts,
    sequence,
    bids: [{ price: bidPrice, size: bidSize }],
    asks: [{ price: askPrice, size: askSize }],
  };
}

const dataset = {
  markets: [market],
  snapshots: [
    snapshot(5_000, 5, 0.49, 200, 0.5, 20),
    snapshot(1_000, 1, 0.49, 200, 0.5, 20),
    snapshot(3_000, 3, 0.49, 200, 0.5, 20),
    snapshot(7_000, 7, 0.49, 200, 0.5, 20),
    snapshot(9_000, 9, 0.49, 200, 0.5, 20),
  ].sort(compareSnapshots),
};

const baseConfig = {
  sessionId: "test-session",
  datasetPath: "/tmp/unused.json",
  runtime: {
    initialCash: 1_000,
    maxAbsPositionSize: 100,
    maxOrderSize: 50,
    aggressiveExitOnStrategyExit: true,
    cancelOpenOrdersOnHold: true,
    cancelOpenOrdersOnReject: true,
    strategyConfig: {
      minObservationCount: 2,
      minEdgeToEnter: 0.0001,
      minEdgeToQuote: 0.00005,
      minConfidenceToEnter: 0,
      minConfidenceToQuote: 0,
      maxSpread: 0.05,
      dangerousExpiryHours: 0.25,
      hardExitExpiryHours: 0.1,
    },
    riskConfig: {
      maxRiskPerTradeNotional: 100,
      maxNotionalExposure: 500,
      maxInventoryImbalance: 100,
      maxConcurrentOpenOrders: 4,
      maxDailyLoss: 500,
      maxLosingStreak: 10,
      rollingExpectancyMinTrades: 100,
      minTopBookDepth: 1,
      abnormalSpreadAbsolute: 0.1,
      noTradeBeforeExpiryHours: 0.05,
    },
    paperFillConfig: {
      minTouchesBeforeFill: 2,
      queuePriorityDelayMs: 1_000,
      passiveParticipationRate: 0.5,
      minPartialFillSize: 1,
    },
  },
} as const;

test("backtest replay is deterministic across runs", async () => {
  const first = await runBacktestSession(baseConfig, dataset);
  const second = await runBacktestSession(baseConfig, dataset);

  assert.deepEqual(first.bestRun.metrics, second.bestRun.metrics);
  assert.deepEqual(first.bestRun.trades, second.bestRun.trades);
  assert.deepEqual(first.bestRun.equityCurve, second.bestRun.equityCurve);
});

test("walk-forward and sweep execute with train-test separation", async () => {
  const summary = await runBacktestSession(
    {
      ...baseConfig,
      sweep: {
        objective: "netPnl",
        parameters: {
          "runtime.strategyConfig.minEdgeToEnter": [0.0001, 0.01],
        },
      },
      walkForward: {
        enabled: true,
        trainWindowEvents: 2,
        testWindowEvents: 2,
        stepEvents: 1,
      },
    },
    dataset,
  );

  assert.ok(summary.walkForwardResults.length > 0);
  assert.ok(summary.walkForwardResults[0].selectedParameterSetId.length > 0);
});

test("partial aggressive exits retry on later snapshots and stay visible in metrics", async () => {
  const exitRetryMarket: MarketDescriptor = {
    ...market,
    endTime: "1970-01-01T00:00:04.400Z",
  };
  const exitRetryDataset = {
    markets: [exitRetryMarket],
    snapshots: [
      snapshot(1_000, 1, 0.49, 200, 0.5, 20),
      snapshot(2_000, 2, 0.49, 200, 0.5, 20),
      snapshot(3_000, 3, 0.49, 200, 0.48, 20),
      snapshot(3_500, 4, 0.48, 2, 0.48, 20),
      snapshot(4_000, 5, 0.48, 8, 0.48, 20),
      snapshot(4_500, 6, 0.48, 2, 0.48, 20),
    ].sort(compareSnapshots),
  };

  const summary = await runBacktestSession(
    {
      ...baseConfig,
      runtime: {
        ...baseConfig.runtime,
        maxAbsPositionSize: 10,
        maxOrderSize: 10,
        cancelOpenOrdersOnHold: false,
        strategyConfig: {
          ...baseConfig.runtime.strategyConfig,
          minObservationCount: 2,
          baseSizeFraction: 1,
          hardExitExpiryHours: 0.0003,
          dangerousExpiryHours: 0.0005,
        },
        riskConfig: {
          ...baseConfig.runtime.riskConfig,
          noTradeBeforeExpiryHours: 0.0001,
        },
        paperFillConfig: {
          ...baseConfig.runtime.paperFillConfig,
          passiveParticipationRate: 1,
        },
      },
    },
    exitRetryDataset,
  );

  assert.equal(summary.bestRun.metrics.aggressiveExitAttempts, 2);
  assert.equal(summary.bestRun.metrics.aggressiveExitRetries, 1);
  assert.equal(summary.bestRun.metrics.aggressiveExitPartialCount, 1);
  assert.equal(summary.bestRun.metrics.unresolvedAggressiveExitCount, 0);
  assert.equal(summary.bestRun.residualAggressiveExits.length, 0);
  assert.equal(summary.bestRun.trades.length, 1);

  const aggressiveExits = summary.bestRun.fills.filter((fill) => fill.aggressiveExit);
  assert.equal(aggressiveExits.length, 2);
  assert.equal(aggressiveExits[0]?.remainingOrderSize, 2);
  assert.equal(aggressiveExits[1]?.remainingOrderSize, 0);
});
