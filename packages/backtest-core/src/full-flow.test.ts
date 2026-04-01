import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { loadBacktestDataset } from "./dataset.js";
import { runBacktestSession } from "./replay.js";

const fixturePath = fileURLToPath(
  new URL("./fixtures/full-flow-regression.json", import.meta.url),
);

const config = {
  sessionId: "full-flow-regression",
  datasetPath: fixturePath,
  runtime: {
    initialCash: 1_000,
    maxAbsPositionSize: 10,
    maxOrderSize: 10,
    aggressiveExitOnStrategyExit: true,
    cancelOpenOrdersOnHold: false,
    cancelOpenOrdersOnReject: true,
    strategyConfig: {
      minObservationCount: 2,
      minEdgeToEnter: 0.0001,
      minEdgeToQuote: 0.00005,
      minConfidenceToEnter: 0,
      minConfidenceToQuote: 0,
      maxSpread: 0.05,
      baseSizeFraction: 1,
      dangerousExpiryHours: 0.0005,
      hardExitExpiryHours: 0.0003
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
      noTradeBeforeExpiryHours: 0.0001
    },
    paperFillConfig: {
      minTouchesBeforeFill: 2,
      queuePriorityDelayMs: 1000,
      passiveParticipationRate: 1,
      minPartialFillSize: 1
    }
  }
} as const;

test("regression fixture exercises features -> signal -> risk -> paper execution end to end", async () => {
  const dataset = await loadBacktestDataset(fixturePath);
  const summary = await runBacktestSession(config, dataset);

  assert.equal(summary.datasetMetadata?.source, "regression-fixture");
  assert.ok(summary.bestRun.metrics.processedSnapshots >= 6);
  assert.ok(summary.bestRun.metrics.decisionsGenerated >= 3);
  assert.ok(summary.bestRun.metrics.approvals >= 1);
  assert.ok(summary.bestRun.fills.length >= 2);
  assert.equal(summary.bestRun.metrics.unresolvedAggressiveExitCount, 0);
  assert.equal(summary.bestRun.positions.length, 1);
  assert.equal(summary.bestRun.positions[0]?.size, 0);
  assert.equal(summary.bestRun.trades.length, 1);

  const actions = summary.bestRun.riskDecisions.map((record) => record.strategyDecision.actionType);
  assert.ok(actions.includes("BUY"));
  assert.ok(actions.includes("EXIT"));

  const fillConfidences = new Set(summary.bestRun.fills.map((fill) => fill.fillConfidence));
  assert.ok(fillConfidences.has("price_through_inferred") || fillConfidences.has("displayed_depth"));
});
