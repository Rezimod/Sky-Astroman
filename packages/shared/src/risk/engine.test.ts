import assert from "node:assert/strict";
import test from "node:test";

import type { StrategyDecision } from "../strategy/index.js";
import { DEFAULT_RISK_ENGINE_CONFIG, evaluateRisk } from "./engine.js";
import type {
  RiskEngineConfig,
  RiskEvaluationInput,
  RiskMarketState,
  RiskMetricsSnapshot,
  RiskPortfolioState,
} from "./types.js";

const baseDecision: StrategyDecision = {
  actionType: "BUY",
  side: "buy",
  confidence: 0.8,
  heuristicScore: 0.8,
  targetEntryPrice: 0.5,
  targetSize: 100,
  estimatedFairValue: 0.53,
  estimatedEdge: 0.015,
  reasonCodes: ["STRONG_BUY_EDGE"],
  metadata: {
    quoteSkew: 0,
    aggressiveEntryEligible: false,
    cooldownRemainingMs: 0,
    recommendedCooldownMs: 0,
  },
};

const baseMarket: RiskMarketState = {
  marketId: "m1",
  outcomeTokenId: "t1",
  status: "open",
  bestBid: 0.49,
  bestAsk: 0.5,
  midpoint: 0.495,
  spread: 0.01,
  topBookDepth: 200,
  minOrderSize: 10,
  timeToExpiryHours: 6,
};

const basePortfolio: RiskPortfolioState = {
  currentPositionSize: 0,
  averageEntryPrice: null,
  grossNotionalExposure: 0,
  openOrderNotional: 0,
  openOrdersCount: 0,
  realizedPnl: 0,
  unrealizedPnl: 0,
};

const baseMetrics: RiskMetricsSnapshot = {
  cooldownUntilTs: null,
  losingStreak: 0,
  rollingExpectancy: 1,
  rollingTradeCount: 12,
  recentAverageSpread: 0.01,
  recentAverageTopBookDepth: 200,
};

function input(overrides: Partial<RiskEvaluationInput> = {}): RiskEvaluationInput {
  return {
    decision: baseDecision,
    market: baseMarket,
    portfolio: basePortfolio,
    metrics: baseMetrics,
    config: DEFAULT_RISK_ENGINE_CONFIG,
    nowTs: 1_000,
    runMode: "paper",
    ...overrides,
  };
}

test("risk engine reduces oversized trade notional when configured", () => {
  const config: RiskEngineConfig = {
    ...DEFAULT_RISK_ENGINE_CONFIG,
    maxRiskPerTradeNotional: 25,
  };
  const result = evaluateRisk(input({ config }));

  assert.equal(result.action, "REDUCE");
  assert.equal(result.decision.targetSize, 50);
  assert.ok(result.reasonCodes.includes("RISK_MAX_RISK_PER_TRADE"));
  assert.ok(result.reasonCodes.includes("RISK_SIZE_REDUCED"));
});

test("risk engine rejects when open order count is exhausted", () => {
  const result = evaluateRisk(
    input({
      portfolio: {
        ...basePortfolio,
        openOrdersCount: DEFAULT_RISK_ENGINE_CONFIG.maxConcurrentOpenOrders,
      },
    }),
  );

  assert.equal(result.action, "REJECT");
  assert.ok(result.reasonCodes.includes("RISK_MAX_CONCURRENT_OPEN_ORDERS"));
});

test("risk engine rejects when daily loss limit is hit", () => {
  const result = evaluateRisk(
    input({
      portfolio: {
        ...basePortfolio,
        realizedPnl: -100,
        unrealizedPnl: -60,
      },
    }),
  );

  assert.equal(result.action, "REJECT");
  assert.ok(result.reasonCodes.includes("RISK_MAX_DAILY_LOSS"));
});

test("risk engine blocks in stop-loss cooldown", () => {
  const result = evaluateRisk(
    input({
      metrics: {
        ...baseMetrics,
        cooldownUntilTs: 10_000,
      },
    }),
  );

  assert.equal(result.action, "REJECT");
  assert.ok(result.reasonCodes.includes("RISK_STOP_LOSS_COOLDOWN"));
});

test("risk engine blocks when rolling expectancy turns negative", () => {
  const result = evaluateRisk(
    input({
      metrics: {
        ...baseMetrics,
        rollingExpectancy: -1,
        rollingTradeCount: DEFAULT_RISK_ENGINE_CONFIG.rollingExpectancyMinTrades,
      },
    }),
  );

  assert.equal(result.action, "REJECT");
  assert.ok(result.reasonCodes.includes("RISK_NEGATIVE_EXPECTANCY_KILL_SWITCH"));
});

test("risk engine blocks abnormal spread and low liquidity", () => {
  const spreadBlocked = evaluateRisk(
    input({
      market: {
        ...baseMarket,
        spread: 0.051,
      },
      metrics: {
        ...baseMetrics,
        recentAverageSpread: 0.01,
      },
    }),
  );
  assert.equal(spreadBlocked.action, "REJECT");
  assert.ok(spreadBlocked.reasonCodes.includes("RISK_ABNORMAL_SPREAD"));

  const depthBlocked = evaluateRisk(
    input({
      market: {
        ...baseMarket,
        topBookDepth: 10,
      },
    }),
  );
  assert.equal(depthBlocked.action, "REJECT");
  assert.ok(depthBlocked.reasonCodes.includes("RISK_LOW_LIQUIDITY"));
});

test("risk engine blocks new entries near market end", () => {
  const result = evaluateRisk(
    input({
      market: {
        ...baseMarket,
        timeToExpiryHours: 0.5,
      },
    }),
  );

  assert.equal(result.action, "REJECT");
  assert.ok(result.reasonCodes.includes("RISK_MARKET_END_WINDOW"));
});

test("risk engine allows risk-reducing exits while blocked", () => {
  const result = evaluateRisk(
    input({
      decision: {
        ...baseDecision,
        actionType: "EXIT",
        side: "sell",
        targetSize: 50,
      },
      portfolio: {
        ...basePortfolio,
        currentPositionSize: 100,
        averageEntryPrice: 0.45,
        realizedPnl: -100,
        unrealizedPnl: -60,
      },
    }),
  );

  assert.equal(result.action, "APPROVE");
  assert.ok(result.reasonCodes.includes("RISK_APPROVED"));
});

test("risk engine rejects empty hold decisions as no-op approvals", () => {
  const result = evaluateRisk(
    input({
      decision: {
        ...baseDecision,
        actionType: "HOLD",
        side: null,
        targetSize: 0,
      },
    }),
  );

  assert.equal(result.action, "APPROVE");
  assert.ok(result.reasonCodes.includes("RISK_DECISION_EMPTY"));
});

test("risk engine rejects new entries when trading is disabled", () => {
  const result = evaluateRisk(
    input({
      decision: {
        ...baseDecision,
        actionType: "BUY",
      },
      config: {
        ...DEFAULT_RISK_ENGINE_CONFIG,
        tradingEnabled: false,
      },
    }),
  );

  assert.equal(result.action, "REJECT");
  assert.ok(result.reasonCodes.includes("RISK_TRADING_DISABLED"));
});
