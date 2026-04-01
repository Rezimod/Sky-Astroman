import assert from "node:assert/strict";
import test from "node:test";

import type { OrderBookFeatureVector } from "../features/index.js";
import {
  DEFAULT_MAKER_SIGNAL_CONFIG,
  computeEdgeAtPrice,
  computeInventoryQuoteSkew,
  estimateFairValue,
  generateStrategyDecision,
} from "./engine.js";
import type {
  StrategyDecisionInput,
  StrategyInventoryState,
  StrategyMarketState,
  StrategyRiskState,
} from "./types.js";

const features: OrderBookFeatureVector = {
  midpoint: 0.51,
  spread: 0.02,
  microprice: 0.515,
  topBookImbalance: 0.4,
  shortTermMidpointDrift: 0.006,
  shortTermSpreadDelta: -0.002,
  recentOrderBookPressure: 0.5,
  timeToExpiryHours: 8,
  recentVolatilityProxy: 0.01,
  inventoryAwareBias: 0,
  observationCount: 6,
  lastUpdateTs: 1000,
};

const market: StrategyMarketState = {
  marketId: "m1",
  outcomeTokenId: "t1",
  status: "open",
  bestBid: 0.5,
  bestAsk: 0.52,
  midpoint: 0.51,
  spread: 0.02,
  tickSize: 0.001,
  minOrderSize: 10,
  timeToExpiryHours: 8,
};

const inventory: StrategyInventoryState = {
  positionSize: 0,
  averageEntryPrice: null,
  maxAbsPositionSize: 100,
  consecutiveLosingExits: 0,
};

const risk: StrategyRiskState = {
  tradingEnabled: true,
  canEnter: true,
  canExit: true,
  canQuote: true,
  maxOrderSize: 50,
  remainingPositionCapacity: 50,
  dailyLossLimitHit: false,
  grossExposureLimitHit: false,
};

function input(overrides: Partial<StrategyDecisionInput> = {}): StrategyDecisionInput {
  return {
    features,
    market,
    inventory,
    risk,
    config: DEFAULT_MAKER_SIGNAL_CONFIG,
    nowTs: 1_000,
    ...overrides,
  };
}

test("estimateFairValue shifts above midpoint for bullish microstructure", () => {
  const estimate = estimateFairValue(input());
  assert.ok((estimate.fairValue ?? 0) > 0.51);
});

test("inventory skew lowers quote prices when long inventory", () => {
  const skew = computeInventoryQuoteSkew(
    {
      ...features,
      inventoryAwareBias: 0.5,
    },
    market,
    DEFAULT_MAKER_SIGNAL_CONFIG,
  );

  assert.ok(skew < 0);
});

test("computeEdgeAtPrice subtracts all trading frictions", () => {
  const edge = computeEdgeAtPrice("buy", 0.53, 0.5, DEFAULT_MAKER_SIGNAL_CONFIG);
  assert.ok(edge < 0.03);
  assert.ok(edge > 0);
});

test("generateStrategyDecision emits BUY for strong clean edge", () => {
  const decision = generateStrategyDecision(input());
  assert.equal(decision.actionType, "BUY");
  assert.equal(decision.side, "buy");
  assert.ok((decision.estimatedEdge ?? 0) >= DEFAULT_MAKER_SIGNAL_CONFIG.minEdgeToEnter);
  assert.ok(decision.reasonCodes.includes("STRONG_BUY_EDGE"));
});

test("generateStrategyDecision emits EXIT near hard expiry with inventory", () => {
  const decision = generateStrategyDecision(
    input({
      market: {
        ...market,
        timeToExpiryHours: 0.5,
      },
      inventory: {
        ...inventory,
        positionSize: 25,
        averageEntryPrice: 0.49,
      },
    }),
  );

  assert.equal(decision.actionType, "EXIT");
  assert.equal(decision.side, "sell");
  assert.ok(decision.reasonCodes.includes("EXIT_ON_EXPIRY"));
});

test("generateStrategyDecision holds during cooldown", () => {
  const decision = generateStrategyDecision(
    input({
      runtime: {
        cooldownUntilTs: 5_000,
      },
    }),
  );

  assert.equal(decision.actionType, "HOLD");
  assert.ok(decision.reasonCodes.includes("COOLDOWN_ACTIVE"));
});

test("generateStrategyDecision holds when there is not enough feature history", () => {
  const decision = generateStrategyDecision(
    input({
      features: {
        ...features,
        observationCount: 1,
      },
    }),
  );

  assert.equal(decision.actionType, "HOLD");
  assert.equal(decision.side, null);
  assert.ok(decision.reasonCodes.includes("FEATURES_NOT_READY"));
});
