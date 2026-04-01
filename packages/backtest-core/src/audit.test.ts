import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";

import { openDatabase, SQLiteAuditRepository } from "@polymarket-bot/shared";
import type { MarketDescriptor, OrderBookSnapshot } from "@polymarket-bot/shared";

import { persistBacktestAuditTrail } from "./audit.js";
import { compareSnapshots } from "./dataset.js";
import { resolveBacktestConfig, runBacktestSession } from "./replay.js";

const market: MarketDescriptor = {
  marketId: "m1",
  slug: "audit-market",
  question: "Audit market?",
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
  sessionId: "audit-session",
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

test("backtest audit persistence writes decision trail and exports JSON/CSV", async () => {
  const summary = await runBacktestSession(baseConfig, dataset);
  const resolvedConfig = resolveBacktestConfig(baseConfig);
  const workdir = await mkdtemp(path.join(tmpdir(), "polymarket-bot-audit-"));
  const databasePath = path.join(workdir, "audit.sqlite");
  const exportDir = path.join(workdir, "exports");

  await persistBacktestAuditTrail({
    summary,
    sessionConfig: baseConfig,
    resolvedConfig,
    databasePath,
    exportDir,
  });

  const db = openDatabase(databasePath);
  try {
    const repository = new SQLiteAuditRepository(db);
    assert.equal(repository.listRowsForSession("audit_sessions", summary.sessionId).length, 1);
    assert.equal(
      repository.listRowsForSession("audit_strategy_decisions", summary.sessionId).length,
      summary.bestRun.riskDecisions.length,
    );
    assert.equal(
      repository.listRowsForSession("audit_feature_snapshots", summary.sessionId).length,
      summary.bestRun.riskDecisions.length,
    );
    assert.equal(
      repository.listRowsForSession("audit_risk_decisions", summary.sessionId).length,
      summary.bestRun.riskDecisions.length,
    );
    assert.equal(
      repository.listRowsForSession("audit_pnl_snapshots", summary.sessionId).length,
      summary.bestRun.equityCurve.length,
    );
    assert.ok(
      repository.listRowsForSession("audit_config_versions", summary.sessionId).length >= 5,
    );
  } finally {
    db.close();
  }

  const exportedSessions = JSON.parse(
    await readFile(path.join(exportDir, "audit_sessions.json"), "utf8"),
  ) as Array<{ session_id: string }>;
  assert.equal(exportedSessions[0]?.session_id, summary.sessionId);

  const exportedDecisionCsv = await readFile(
    path.join(exportDir, "audit_strategy_decisions.csv"),
    "utf8",
  );
  assert.match(exportedDecisionCsv, /heuristic_score/);
});
