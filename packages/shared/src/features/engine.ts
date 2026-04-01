import type { MarketDescriptor, OrderBookSnapshot } from "../types/index.js";
import type {
  FeatureBuildState,
  FeatureEngineConfig,
  FeatureEngineInput,
  FeatureEngineKey,
  InventoryBiasInput,
  OrderBookFeatureObservation,
  OrderBookFeatureVector,
  RollingFeatureState,
} from "./types.js";

export const DEFAULT_FEATURE_ENGINE_CONFIG: FeatureEngineConfig = {
  driftWindowMs: 30_000,
  spreadWindowMs: 30_000,
  pressureWindowMs: 15_000,
  volatilityWindowMs: 60_000,
  maxWindowMs: 60_000,
  epsilon: 1e-9,
};

function clamp(value: number, min = -1, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, digits = 8): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function featureKey(key: FeatureEngineKey): string {
  return `${key.marketId}:${key.outcomeTokenId}`;
}

function mean(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values: number[]): number {
  if (values.length <= 1) {
    return 0;
  }

  const average = mean(values);
  const variance = values.reduce((sum, value) => sum + (value - average) ** 2, 0) / values.length;

  return Math.sqrt(variance);
}

function selectWindow<T extends { ts: number }>(
  history: T[],
  currentTs: number,
  windowMs: number,
): T[] {
  return history.filter((entry) => currentTs - entry.ts <= windowMs);
}

function latestBid(snapshot: OrderBookSnapshot) {
  return snapshot.bids[0];
}

function latestAsk(snapshot: OrderBookSnapshot) {
  return snapshot.asks[0];
}

/**
 * Midpoint is the fair-value anchor between the best bid and best ask.
 * It provides a stable short-horizon reference for drift and volatility features.
 */
export function computeMidpoint(snapshot: OrderBookSnapshot): number | null {
  const bid = latestBid(snapshot)?.price;
  const ask = latestAsk(snapshot)?.price;

  if (bid === undefined || ask === undefined) {
    return null;
  }

  return round((bid + ask) / 2, 8);
}

/**
 * Spread is the immediate cost to cross the market.
 * Narrow spreads often signal healthier, more tradable books.
 */
export function computeSpread(snapshot: OrderBookSnapshot): number | null {
  const bid = latestBid(snapshot)?.price;
  const ask = latestAsk(snapshot)?.price;

  if (bid === undefined || ask === undefined) {
    return null;
  }

  return round(ask - bid, 8);
}

/**
 * Microprice tilts the midpoint toward the side with less displayed depth.
 * This helps capture short-term directional pressure inside the spread.
 */
export function computeMicroprice(
  snapshot: OrderBookSnapshot,
  epsilon = DEFAULT_FEATURE_ENGINE_CONFIG.epsilon,
): number | null {
  const bid = latestBid(snapshot);
  const ask = latestAsk(snapshot);

  if (!bid || !ask) {
    return null;
  }

  const totalSize = bid.size + ask.size;
  if (totalSize <= epsilon) {
    return null;
  }

  return round((ask.price * bid.size + bid.price * ask.size) / totalSize, 8);
}

/**
 * Top-of-book imbalance measures whether displayed size leans bid-heavy or ask-heavy.
 * Positive values imply buy-side support; negative values imply sell-side pressure.
 */
export function computeTopBookImbalance(
  snapshot: OrderBookSnapshot,
  epsilon = DEFAULT_FEATURE_ENGINE_CONFIG.epsilon,
): number {
  const bidSize = latestBid(snapshot)?.size ?? 0;
  const askSize = latestAsk(snapshot)?.size ?? 0;
  const total = bidSize + askSize;

  if (total <= epsilon) {
    return 0;
  }

  return round((bidSize - askSize) / total, 8);
}

/**
 * Pressure combines queue imbalance with microprice skew.
 * It is a compact proxy for whether the book is leaning upward or downward.
 */
export function computePressureSample(
  snapshot: OrderBookSnapshot,
  epsilon = DEFAULT_FEATURE_ENGINE_CONFIG.epsilon,
): number {
  const midpoint = computeMidpoint(snapshot);
  const spread = computeSpread(snapshot);
  const microprice = computeMicroprice(snapshot, epsilon);
  const imbalance = computeTopBookImbalance(snapshot, epsilon);

  if (midpoint === null || spread === null || microprice === null || spread <= epsilon) {
    return imbalance;
  }

  const micropriceEdge = clamp((microprice - midpoint) / (spread / 2), -1, 1);
  return round((imbalance + micropriceEdge) / 2, 8);
}

export function computeTimeToExpiryHours(
  market: MarketDescriptor,
  currentTs: number,
): number | null {
  if (!market.endTime) {
    return null;
  }

  const endTs = new Date(market.endTime).getTime();
  if (!Number.isFinite(endTs)) {
    return null;
  }

  return round((endTs - currentTs) / (60 * 60 * 1000), 8);
}

export function computeInventoryAwareBias(
  inventory: InventoryBiasInput,
  epsilon = DEFAULT_FEATURE_ENGINE_CONFIG.epsilon,
): number {
  if (inventory.maxAbsPositionSize <= epsilon) {
    return 0;
  }

  return round(clamp(inventory.positionSize / inventory.maxAbsPositionSize, -1, 1), 8);
}

export function createFeatureObservation(
  snapshot: OrderBookSnapshot,
  epsilon = DEFAULT_FEATURE_ENGINE_CONFIG.epsilon,
): OrderBookFeatureObservation {
  return {
    ts: snapshot.ts,
    midpoint: computeMidpoint(snapshot),
    spread: computeSpread(snapshot),
    microprice: computeMicroprice(snapshot, epsilon),
    topBookImbalance: computeTopBookImbalance(snapshot, epsilon),
    topBookDepth: round((latestBid(snapshot)?.size ?? 0) + (latestAsk(snapshot)?.size ?? 0), 8),
    pressureSample: computePressureSample(snapshot, epsilon),
  };
}

function pruneHistory(
  history: OrderBookFeatureObservation[],
  currentTs: number,
  maxWindowMs: number,
): OrderBookFeatureObservation[] {
  return history.filter((entry) => currentTs - entry.ts <= maxWindowMs);
}

function previousSpreads(
  history: OrderBookFeatureObservation[],
  currentTs: number,
  windowMs: number,
) {
  return selectWindow(history, currentTs, windowMs)
    .filter((entry) => entry.ts < currentTs && entry.spread !== null)
    .map((entry) => entry.spread as number);
}

function midpointHistory(
  history: OrderBookFeatureObservation[],
  currentTs: number,
  windowMs: number,
) {
  return selectWindow(history, currentTs, windowMs).filter((entry) => entry.midpoint !== null);
}

function pressureHistory(
  history: OrderBookFeatureObservation[],
  currentTs: number,
  windowMs: number,
) {
  return selectWindow(history, currentTs, windowMs).map((entry) => entry.pressureSample);
}

function volatilityReturns(
  history: OrderBookFeatureObservation[],
  currentTs: number,
  windowMs: number,
): number[] {
  const points = midpointHistory(history, currentTs, windowMs).map(
    (entry) => entry.midpoint as number,
  );
  const returns: number[] = [];

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    if (previous > 0 && current > 0) {
      returns.push(Math.log(current / previous));
    }
  }

  return returns;
}

/**
 * buildFeatures is pure: it reads only the provided state and never mutates it.
 * That keeps live trading and replay behavior aligned and testable.
 */
export function buildFeatures(state: FeatureBuildState): OrderBookFeatureVector {
  const currentObservation = state.history[state.history.length - 1];
  const baselineObservation = midpointHistory(
    state.history,
    currentObservation.ts,
    state.config.driftWindowMs,
  )[0];

  const shortTermMidpointDrift =
    currentObservation.midpoint !== null &&
    baselineObservation?.midpoint !== null &&
    baselineObservation.midpoint !== 0
      ? round(
          (currentObservation.midpoint - baselineObservation.midpoint) /
            baselineObservation.midpoint,
          8,
        )
      : 0;

  const priorSpreads = previousSpreads(
    state.history,
    currentObservation.ts,
    state.config.spreadWindowMs,
  );
  const shortTermSpreadDelta =
    currentObservation.spread !== null && priorSpreads.length > 0
      ? round(currentObservation.spread - mean(priorSpreads), 8)
      : 0;

  const recentOrderBookPressure = round(
    mean(pressureHistory(state.history, currentObservation.ts, state.config.pressureWindowMs)),
    8,
  );

  const recentVolatilityProxy = round(
    standardDeviation(
      volatilityReturns(state.history, currentObservation.ts, state.config.volatilityWindowMs),
    ),
    8,
  );

  return {
    midpoint: currentObservation.midpoint,
    spread: currentObservation.spread,
    microprice: currentObservation.microprice,
    topBookImbalance: currentObservation.topBookImbalance,
    shortTermMidpointDrift,
    shortTermSpreadDelta,
    recentOrderBookPressure,
    timeToExpiryHours: computeTimeToExpiryHours(state.market, currentObservation.ts),
    recentVolatilityProxy,
    inventoryAwareBias: computeInventoryAwareBias(state.inventory, state.config.epsilon),
    observationCount: state.history.length,
    lastUpdateTs: currentObservation.ts,
  };
}

export class RollingFeatureEngine {
  private readonly states = new Map<
    string,
    {
      market: MarketDescriptor;
      snapshot: OrderBookSnapshot;
      history: OrderBookFeatureObservation[];
    }
  >();

  constructor(private readonly config: FeatureEngineConfig = DEFAULT_FEATURE_ENGINE_CONFIG) {}

  ingest(input: FeatureEngineInput): RollingFeatureState {
    const key = featureKey({
      marketId: input.market.marketId,
      outcomeTokenId: input.snapshot.outcomeTokenId,
    });
    const observation = createFeatureObservation(input.snapshot, this.config.epsilon);
    const existing = this.states.get(key);
    const history = [...(existing?.history ?? []), observation].sort(
      (left, right) => left.ts - right.ts,
    );
    const prunedHistory = pruneHistory(history, observation.ts, this.config.maxWindowMs);

    const nextState = {
      market: input.market,
      snapshot: input.snapshot,
      history: prunedHistory,
    };

    this.states.set(key, nextState);

    return {
      market: nextState.market,
      snapshot: nextState.snapshot,
      history: nextState.history,
      inventory: {
        positionSize: input.inventory?.positionSize ?? 0,
        maxAbsPositionSize: input.inventory?.maxAbsPositionSize ?? 1,
      },
      config: this.config,
    };
  }

  getState(
    key: FeatureEngineKey,
    inventory: Partial<InventoryBiasInput> = {},
  ): RollingFeatureState | null {
    const state = this.states.get(featureKey(key));
    if (!state) {
      return null;
    }

    return {
      market: state.market,
      snapshot: state.snapshot,
      history: state.history,
      inventory: {
        positionSize: inventory.positionSize ?? 0,
        maxAbsPositionSize: inventory.maxAbsPositionSize ?? 1,
      },
      config: this.config,
    };
  }

  buildFeatures(
    key: FeatureEngineKey,
    inventory: Partial<InventoryBiasInput> = {},
  ): OrderBookFeatureVector | null {
    const state = this.getState(key, inventory);
    return state ? buildFeatures(state) : null;
  }

  reset(key?: FeatureEngineKey) {
    if (!key) {
      this.states.clear();
      return;
    }

    this.states.delete(featureKey(key));
  }
}
