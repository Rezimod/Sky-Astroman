import type {
  RiskClosedTradeRecord,
  RiskEngineConfig,
  RiskMarketSample,
  RiskMetricsSnapshot,
  RollingRiskMetricsState,
} from "./types.js";

function round(value: number, digits = 8): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function createRollingRiskMetricsState(): RollingRiskMetricsState {
  return {
    closedTrades: [],
    marketSamplesByInstrument: {},
    cooldownUntilTs: null,
  };
}

function pruneMarketSamples(
  samples: RiskMarketSample[],
  nowTs: number,
  windowMs: number,
): RiskMarketSample[] {
  const cutoff = nowTs - windowMs;
  return samples.filter((sample) => sample.ts >= cutoff);
}

export function recordClosedTrade(
  state: RollingRiskMetricsState,
  trade: RiskClosedTradeRecord,
  config: Pick<RiskEngineConfig, "stopLossCooldownMs">,
): RollingRiskMetricsState {
  return {
    ...state,
    closedTrades: [...state.closedTrades, trade],
    cooldownUntilTs: trade.stopLossTriggered
      ? Math.max(state.cooldownUntilTs ?? 0, trade.ts + config.stopLossCooldownMs)
      : state.cooldownUntilTs,
  };
}

export function recordMarketSample(
  state: RollingRiskMetricsState,
  sample: RiskMarketSample,
  config: Pick<RiskEngineConfig, "marketMetricsWindowMs">,
): RollingRiskMetricsState {
  const existingSamples = state.marketSamplesByInstrument[sample.instrumentKey] ?? [];
  const nextSamples = pruneMarketSamples(
    [...existingSamples, sample],
    sample.ts,
    config.marketMetricsWindowMs,
  );

  return {
    ...state,
    marketSamplesByInstrument: {
      ...state.marketSamplesByInstrument,
      [sample.instrumentKey]: nextSamples,
    },
  };
}

export function buildRiskMetricsSnapshot(
  state: RollingRiskMetricsState,
  config: Pick<
    RiskEngineConfig,
    "marketMetricsWindowMs" | "rollingExpectancyWindowTrades" | "rollingExpectancyMinTrades"
  >,
  nowTs: number,
  instrumentKey: string,
): RiskMetricsSnapshot {
  const marketSamples = pruneMarketSamples(
    state.marketSamplesByInstrument[instrumentKey] ?? [],
    nowTs,
    config.marketMetricsWindowMs,
  );
  const recentTrades = state.closedTrades.slice(-config.rollingExpectancyWindowTrades);

  let losingStreak = 0;
  for (let index = state.closedTrades.length - 1; index >= 0; index -= 1) {
    if (state.closedTrades[index].realizedPnl < 0) {
      losingStreak += 1;
      continue;
    }
    break;
  }

  const spreadSamples = marketSamples
    .map((sample) => sample.spread)
    .filter((spread): spread is number => spread !== null);
  const depthSamples = marketSamples.map((sample) => sample.topBookDepth);

  return {
    cooldownUntilTs:
      state.cooldownUntilTs !== null && state.cooldownUntilTs > nowTs ? state.cooldownUntilTs : null,
    losingStreak,
    rollingExpectancy:
      recentTrades.length >= config.rollingExpectancyMinTrades
        ? round(
            recentTrades.reduce((sum, trade) => sum + trade.realizedPnl, 0) / recentTrades.length,
            8,
          )
        : null,
    rollingTradeCount: recentTrades.length,
    recentAverageSpread:
      spreadSamples.length > 0
        ? round(spreadSamples.reduce((sum, spread) => sum + spread, 0) / spreadSamples.length, 8)
        : null,
    recentAverageTopBookDepth:
      depthSamples.length > 0
        ? round(depthSamples.reduce((sum, depth) => sum + depth, 0) / depthSamples.length, 8)
        : null,
  };
}

export class RollingRiskMetricsStore {
  private state = createRollingRiskMetricsState();

  constructor(private readonly config: Pick<
    RiskEngineConfig,
    | "stopLossCooldownMs"
    | "marketMetricsWindowMs"
    | "rollingExpectancyWindowTrades"
    | "rollingExpectancyMinTrades"
  >) {}

  recordClosedTrade(trade: RiskClosedTradeRecord): void {
    this.state = recordClosedTrade(this.state, trade, this.config);
  }

  recordMarketSample(sample: RiskMarketSample): void {
    this.state = recordMarketSample(this.state, sample, this.config);
  }

  getState(): RollingRiskMetricsState {
    const marketSamplesByInstrument = Object.fromEntries(
      Object.entries(this.state.marketSamplesByInstrument).map(([key, samples]) => [key, [...samples]]),
    );

    return {
      closedTrades: [...this.state.closedTrades],
      marketSamplesByInstrument,
      cooldownUntilTs: this.state.cooldownUntilTs,
    };
  }

  getSnapshot(nowTs: number, instrumentKey: string): RiskMetricsSnapshot {
    return buildRiskMetricsSnapshot(this.state, this.config, nowTs, instrumentKey);
  }
}
