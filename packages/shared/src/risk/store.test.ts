import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_RISK_ENGINE_CONFIG } from "./engine.js";
import {
  buildRiskMetricsSnapshot,
  createRollingRiskMetricsState,
  recordClosedTrade,
  recordMarketSample,
  RollingRiskMetricsStore,
} from "./store.js";

test("rolling metrics store computes expectancy, streak, and cooldown", () => {
  const config = {
    ...DEFAULT_RISK_ENGINE_CONFIG,
    rollingExpectancyMinTrades: 1,
  };
  let state = createRollingRiskMetricsState();
  state = recordClosedTrade(
    state,
    {
      ts: 1_000,
      realizedPnl: -4,
      stopLossTriggered: true,
    },
    config,
  );
  state = recordClosedTrade(
    state,
    {
      ts: 2_000,
      realizedPnl: -2,
      stopLossTriggered: false,
    },
    config,
  );
  state = recordClosedTrade(
    state,
    {
      ts: 3_000,
      realizedPnl: 3,
      stopLossTriggered: false,
    },
    config,
  );
  state = recordMarketSample(
    state,
    {
      instrumentKey: "m1:t1",
      ts: 3_000,
      spread: 0.02,
      topBookDepth: 100,
    },
    config,
  );
  state = recordMarketSample(
    state,
    {
      instrumentKey: "m1:t1",
      ts: 4_000,
      spread: 0.03,
      topBookDepth: 80,
    },
    config,
  );

  const snapshot = buildRiskMetricsSnapshot(state, config, 5_000, "m1:t1");
  assert.equal(snapshot.cooldownUntilTs, 301_000);
  assert.equal(snapshot.losingStreak, 0);
  assert.equal(snapshot.rollingTradeCount, 3);
  assert.equal(snapshot.rollingExpectancy, -1);
  assert.equal(snapshot.recentAverageSpread, 0.025);
  assert.equal(snapshot.recentAverageTopBookDepth, 90);
});

test("rolling metrics store prunes expired market samples", () => {
  const store = new RollingRiskMetricsStore({
    ...DEFAULT_RISK_ENGINE_CONFIG,
    marketMetricsWindowMs: 1_000,
  });

  store.recordMarketSample({
    instrumentKey: "m1:t1",
    ts: 1_000,
    spread: 0.01,
    topBookDepth: 50,
  });
  store.recordMarketSample({
    instrumentKey: "m2:t2",
    ts: 1_500,
    spread: 0.5,
    topBookDepth: 5,
  });
  store.recordMarketSample({
    instrumentKey: "m1:t1",
    ts: 2_500,
    spread: 0.03,
    topBookDepth: 75,
  });

  const snapshot = store.getSnapshot(2_500, "m1:t1");
  assert.equal(snapshot.recentAverageSpread, 0.03);
  assert.equal(snapshot.recentAverageTopBookDepth, 75);
});
