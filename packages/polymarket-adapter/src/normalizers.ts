import type {
  MarketDescriptor,
  MarketOutcomeDescriptor,
  MarketStatus,
  OrderBookLevel,
  OrderBookSnapshot,
  Side,
  TopOfBook,
} from "@polymarket-bot/shared";

import type {
  RawBestBidAskEvent,
  RawBookSummary,
  RawGammaMarket,
  RawPriceChangeEvent,
} from "./types.js";

export function parseNumericValue(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseStringArrayField(value: string[] | string | undefined): string[] {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry));
  }

  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.map((entry) => String(entry));
    }
  } catch {
    return [];
  }

  return [];
}

export function deriveMarketStatus(raw: RawGammaMarket): MarketStatus {
  if (raw.closed || raw.archived) {
    return "closed";
  }

  if (raw.active) {
    return "open";
  }

  return "halted";
}

export function normalizeGammaMarket(raw: RawGammaMarket): MarketDescriptor {
  const outcomes = parseStringArrayField(raw.outcomes);
  const tokenIds = parseStringArrayField(raw.clobTokenIds);
  const prices = parseStringArrayField(raw.outcomePrices).map((price) => parseNumericValue(price));

  const normalizedOutcomes: MarketOutcomeDescriptor[] = outcomes.map((outcome, index) => ({
    outcome,
    tokenId: tokenIds[index] ?? "",
    price: prices[index] ?? null,
  }));

  const conditionId = raw.conditionId ?? String(raw.id ?? "");

  return {
    marketId: conditionId,
    venueMarketId: raw.id !== undefined ? String(raw.id) : undefined,
    conditionId,
    eventId: raw.eventId !== undefined ? String(raw.eventId) : undefined,
    eventSlug: raw.eventSlug ?? undefined,
    slug: raw.slug ?? conditionId,
    question: raw.question ?? raw.slug ?? conditionId,
    description: raw.description ?? null,
    category: raw.category ?? null,
    image: raw.image ?? null,
    icon: raw.icon ?? null,
    active: raw.active ?? false,
    closed: raw.closed ?? false,
    archived: raw.archived ?? false,
    acceptingOrders: raw.acceptingOrders ?? false,
    startTime: raw.startDateIso ?? null,
    endTime: raw.endDateIso ?? null,
    liquidity: parseNumericValue(raw.liquidityNum),
    volume24hr: parseNumericValue(raw.volume24hr),
    volume: parseNumericValue(raw.volumeNum),
    tickSize: parseNumericValue(raw.orderPriceMinTickSize),
    minOrderSize: parseNumericValue(raw.orderMinSize),
    negativeRisk: raw.negRisk ?? false,
    enableOrderBook: raw.enableOrderBook ?? false,
    outcomes: normalizedOutcomes.filter((outcome) => outcome.tokenId.length > 0),
    status: deriveMarketStatus(raw),
  };
}

export function sortBids(levels: OrderBookLevel[]): OrderBookLevel[] {
  return [...levels].sort((left, right) => right.price - left.price);
}

export function sortAsks(levels: OrderBookLevel[]): OrderBookLevel[] {
  return [...levels].sort((left, right) => left.price - right.price);
}

export function normalizeBookLevels(
  levels: Array<{ price: number | string; size: number | string }>,
) {
  return levels
    .map((level) => ({
      price: parseNumericValue(level.price),
      size: parseNumericValue(level.size),
    }))
    .filter((level): level is OrderBookLevel => level.price !== null && level.size !== null)
    .filter((level) => level.size > 0);
}

export function normalizeBookSummary(raw: RawBookSummary, marketId?: string): OrderBookSnapshot {
  const normalizedMarketId = raw.market ?? marketId ?? "";
  const timestamp = parseNumericValue(raw.timestamp) ?? Date.now();

  return {
    marketId: normalizedMarketId,
    outcomeTokenId: raw.asset_id ?? "",
    ts: timestamp,
    sequence: timestamp,
    hash: raw.hash,
    bids: sortBids(normalizeBookLevels(raw.bids ?? [])),
    asks: sortAsks(normalizeBookLevels(raw.asks ?? [])),
  };
}

export function createTopOfBook(snapshot: OrderBookSnapshot): TopOfBook {
  const bestBid = snapshot.bids[0]?.price ?? null;
  const bestAsk = snapshot.asks[0]?.price ?? null;
  const spread =
    bestBid !== null && bestAsk !== null ? Number((bestAsk - bestBid).toFixed(6)) : null;
  const midpoint =
    bestBid !== null && bestAsk !== null ? Number(((bestBid + bestAsk) / 2).toFixed(6)) : null;

  return {
    marketId: snapshot.marketId,
    outcomeTokenId: snapshot.outcomeTokenId,
    bestBid,
    bestAsk,
    spread,
    midpoint,
    ts: snapshot.ts,
    hash: snapshot.hash,
  };
}

export function normalizeBestBidAsk(raw: RawBestBidAskEvent): TopOfBook {
  const bestBid = parseNumericValue(raw.bid);
  const bestAsk = parseNumericValue(raw.ask);
  const spread =
    bestBid !== null && bestAsk !== null ? Number((bestAsk - bestBid).toFixed(6)) : null;
  const midpoint =
    bestBid !== null && bestAsk !== null ? Number(((bestBid + bestAsk) / 2).toFixed(6)) : null;

  return {
    marketId: raw.market,
    outcomeTokenId: raw.asset_id,
    bestBid,
    bestAsk,
    spread,
    midpoint,
    ts: parseNumericValue(raw.timestamp) ?? Date.now(),
    hash: raw.hash,
  };
}

export function normalizePriceChangeSide(raw: RawPriceChangeEvent): Side {
  return raw.side === "BUY" ? "buy" : "sell";
}
