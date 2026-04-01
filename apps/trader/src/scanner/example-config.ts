import type { MarketScannerConfig } from "@polymarket-bot/shared";

export const exampleScannerConfig: MarketScannerConfig = {
  enabled: true,
  refreshIntervalMs: 120_000,
  marketLimit: 30,
  maxCandidates: 12,
  minLiquidity: 10_000,
  minVolume24hr: 2_500,
  minTopBookDepth: 200,
  maxSpreadCents: 6,
  minHoursToExpiry: 2,
  maxHoursToExpiry: 72,
  preferredHoursToExpiry: 24,
  minUpdateFrequencyPerMinute: 0,
  activityWindowMs: 300_000,
  weights: {
    liquidity: 0.24,
    volume24hr: 0.18,
    topBookDepth: 0.2,
    spread: 0.18,
    updateFrequency: 0.12,
    expiry: 0.08,
  },
};
