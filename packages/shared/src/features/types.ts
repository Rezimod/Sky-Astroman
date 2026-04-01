import type { MarketDescriptor, OrderBookSnapshot } from "../types/index.js";

export type InventoryBiasInput = {
  positionSize: number;
  maxAbsPositionSize: number;
};

export type OrderBookFeatureObservation = {
  ts: number;
  midpoint: number | null;
  spread: number | null;
  microprice: number | null;
  topBookImbalance: number;
  topBookDepth: number;
  pressureSample: number;
};

export type OrderBookFeatureVector = {
  midpoint: number | null;
  spread: number | null;
  microprice: number | null;
  topBookImbalance: number;
  shortTermMidpointDrift: number;
  shortTermSpreadDelta: number;
  recentOrderBookPressure: number;
  timeToExpiryHours: number | null;
  recentVolatilityProxy: number;
  inventoryAwareBias: number;
  observationCount: number;
  lastUpdateTs: number;
};

export type FeatureEngineConfig = {
  driftWindowMs: number;
  spreadWindowMs: number;
  pressureWindowMs: number;
  volatilityWindowMs: number;
  maxWindowMs: number;
  epsilon: number;
};

export type FeatureBuildState = {
  market: MarketDescriptor;
  snapshot: OrderBookSnapshot;
  history: OrderBookFeatureObservation[];
  inventory: InventoryBiasInput;
  config: FeatureEngineConfig;
};

export type FeatureEngineInput = {
  market: MarketDescriptor;
  snapshot: OrderBookSnapshot;
  inventory?: Partial<InventoryBiasInput>;
};

export type FeatureEngineKey = {
  marketId: string;
  outcomeTokenId: string;
};

export type RollingFeatureState = FeatureBuildState;
