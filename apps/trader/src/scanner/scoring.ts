import type {
  MarketDescriptor,
  MarketOutcomeDescriptor,
  MarketScannerConfig,
  MarketScannerDecision,
  MarketScannerMetrics,
  OrderBookSnapshot,
} from "@polymarket-bot/shared";

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, digits = 4): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function computeTimeToExpiryHours(
  endTime: string | null | undefined,
  now = Date.now(),
): number | null {
  if (!endTime) {
    return null;
  }

  const expiryMs = new Date(endTime).getTime();
  if (!Number.isFinite(expiryMs)) {
    return null;
  }

  return (expiryMs - now) / (60 * 60 * 1000);
}

export function computeTopBookDepth(snapshot: OrderBookSnapshot): number {
  const bestBidSize = snapshot.bids[0]?.size ?? 0;
  const bestAskSize = snapshot.asks[0]?.size ?? 0;
  return round(bestBidSize + bestAskSize, 2);
}

export function computeSpreadCents(spread: number | null): number | null {
  return spread === null ? null : round(spread * 100, 3);
}

export function computeUpdateFrequencyPerMinute(
  timestamps: number[],
  activityWindowMs: number,
  now = Date.now(),
): number {
  const active = timestamps.filter((timestamp) => now - timestamp <= activityWindowMs);
  if (activityWindowMs <= 0) {
    return 0;
  }

  const minutes = activityWindowMs / 60_000;
  return round(active.length / minutes, 3);
}

export function buildScannerMetrics(args: {
  market: MarketDescriptor;
  snapshot: OrderBookSnapshot;
  recentUpdatesPerMinute: number;
  scannedAt: string;
  now?: number;
}): MarketScannerMetrics {
  const { market, snapshot, recentUpdatesPerMinute, scannedAt, now = Date.now() } = args;
  const bestBid = snapshot.bids[0]?.price ?? null;
  const bestAsk = snapshot.asks[0]?.price ?? null;
  const spread = bestBid !== null && bestAsk !== null ? round(bestAsk - bestBid, 6) : null;
  const midpoint = bestBid !== null && bestAsk !== null ? round((bestBid + bestAsk) / 2, 6) : null;

  return {
    bestBid,
    bestAsk,
    spread,
    spreadCents: computeSpreadCents(spread),
    midpoint,
    topBookDepth: computeTopBookDepth(snapshot),
    recentUpdatesPerMinute,
    timeToExpiryHours: computeTimeToExpiryHours(market.endTime, now),
    liquidity: market.liquidity ?? 0,
    volume24hr: market.volume24hr ?? 0,
    activityScore: 0,
    scannedAt,
  };
}

export function computeScannerScore(
  metrics: MarketScannerMetrics,
  config: MarketScannerConfig,
): number {
  const liquidityScore = clamp(metrics.liquidity / Math.max(config.minLiquidity * 2, 1));
  const volumeScore = clamp(metrics.volume24hr / Math.max(config.minVolume24hr * 2, 1));
  const depthScore = clamp(metrics.topBookDepth / Math.max(config.minTopBookDepth * 2, 1));
  const spreadScore =
    metrics.spreadCents === null
      ? 0
      : clamp(1 - metrics.spreadCents / Math.max(config.maxSpreadCents, 0.001));
  const updateScore = clamp(
    metrics.recentUpdatesPerMinute / Math.max(config.minUpdateFrequencyPerMinute || 1, 1),
  );

  let expiryScore = 0;
  if (metrics.timeToExpiryHours !== null) {
    const distance = Math.abs(metrics.timeToExpiryHours - config.preferredHoursToExpiry);
    const range = Math.max(
      config.preferredHoursToExpiry - config.minHoursToExpiry,
      config.maxHoursToExpiry - config.preferredHoursToExpiry,
      1,
    );
    expiryScore = clamp(1 - distance / range);
  }

  const weighted =
    liquidityScore * config.weights.liquidity +
    volumeScore * config.weights.volume24hr +
    depthScore * config.weights.topBookDepth +
    spreadScore * config.weights.spread +
    updateScore * config.weights.updateFrequency +
    expiryScore * config.weights.expiry;

  return round(weighted * 100, 3);
}

export function evaluateMarketOutcome(args: {
  market: MarketDescriptor;
  outcome: MarketOutcomeDescriptor;
  snapshot: OrderBookSnapshot;
  recentUpdatesPerMinute: number;
  config: MarketScannerConfig;
  scannedAt: string;
  now?: number;
}): MarketScannerDecision {
  const metrics = buildScannerMetrics(args);
  const reasons: string[] = [];

  if (!args.market.active) {
    reasons.push("market is not active");
  }

  if (!args.market.acceptingOrders) {
    reasons.push("market is not accepting orders");
  }

  if (!args.market.enableOrderBook) {
    reasons.push("market does not have an active orderbook");
  }

  if (metrics.bestBid === null || metrics.bestAsk === null) {
    reasons.push("missing best bid or best ask");
  }

  if (metrics.spreadCents !== null && metrics.spreadCents > args.config.maxSpreadCents) {
    reasons.push(
      `spread ${metrics.spreadCents.toFixed(2)}c exceeds ${args.config.maxSpreadCents.toFixed(2)}c`,
    );
  }

  if (metrics.topBookDepth < args.config.minTopBookDepth) {
    reasons.push(
      `top-of-book depth ${metrics.topBookDepth.toFixed(2)} below ${args.config.minTopBookDepth.toFixed(2)}`,
    );
  }

  if (metrics.liquidity < args.config.minLiquidity) {
    reasons.push(
      `liquidity ${metrics.liquidity.toFixed(2)} below ${args.config.minLiquidity.toFixed(2)}`,
    );
  }

  if (metrics.volume24hr < args.config.minVolume24hr) {
    reasons.push(
      `24h volume ${metrics.volume24hr.toFixed(2)} below ${args.config.minVolume24hr.toFixed(2)}`,
    );
  }

  if (
    metrics.timeToExpiryHours !== null &&
    metrics.timeToExpiryHours < args.config.minHoursToExpiry
  ) {
    reasons.push(
      `time to expiry ${metrics.timeToExpiryHours.toFixed(2)}h below ${args.config.minHoursToExpiry.toFixed(2)}h`,
    );
  }

  if (
    metrics.timeToExpiryHours !== null &&
    metrics.timeToExpiryHours > args.config.maxHoursToExpiry
  ) {
    reasons.push(
      `time to expiry ${metrics.timeToExpiryHours.toFixed(2)}h above ${args.config.maxHoursToExpiry.toFixed(2)}h`,
    );
  }

  if (metrics.recentUpdatesPerMinute < args.config.minUpdateFrequencyPerMinute) {
    reasons.push(
      `update frequency ${metrics.recentUpdatesPerMinute.toFixed(2)}/min below ${args.config.minUpdateFrequencyPerMinute.toFixed(2)}/min`,
    );
  }

  const score = computeScannerScore(metrics, args.config);
  metrics.activityScore = score;

  return {
    market: args.market,
    selectedOutcome: {
      outcome: args.outcome.outcome,
      tokenId: args.outcome.tokenId,
      price: args.outcome.price,
    },
    metrics,
    score,
    accepted: reasons.length === 0,
    reasons: reasons.length === 0 ? ["accepted by scanner filters"] : reasons,
  };
}
