import type { MarketStreamEvent, OrderBookSnapshot } from "@polymarket-bot/shared";

import {
  createTopOfBook,
  normalizeBestBidAsk,
  normalizeBookSummary,
  parseNumericValue,
} from "./normalizers.js";
import type {
  RawBestBidAskEvent,
  RawBookEvent,
  RawLastTradePriceEvent,
  RawPriceChangeEvent,
  RawTickSizeChangeEvent,
} from "./types.js";

type BookState = {
  marketId: string;
  outcomeTokenId: string;
  sequence: number;
  hash?: string;
  bids: Map<string, number>;
  asks: Map<string, number>;
};

function upsertLevel(levels: Map<string, number>, price: string, size: string) {
  const normalizedSize = parseNumericValue(size) ?? 0;

  if (normalizedSize <= 0) {
    levels.delete(price);
    return;
  }

  levels.set(price, normalizedSize);
}

function priceKey(price: number): string {
  return price.toFixed(6);
}

function toSnapshot(state: BookState, ts: number, hash?: string): OrderBookSnapshot {
  const bids = [...state.bids.entries()]
    .map(([price, size]) => ({
      price: Number(price),
      size,
    }))
    .sort((left, right) => right.price - left.price);

  const asks = [...state.asks.entries()]
    .map(([price, size]) => ({
      price: Number(price),
      size,
    }))
    .sort((left, right) => left.price - right.price);

  return {
    marketId: state.marketId,
    outcomeTokenId: state.outcomeTokenId,
    ts,
    sequence: state.sequence,
    hash: hash ?? state.hash,
    bids,
    asks,
  };
}

export function createOrderBookState(snapshot: OrderBookSnapshot): BookState {
  return {
    marketId: snapshot.marketId,
    outcomeTokenId: snapshot.outcomeTokenId,
    sequence: snapshot.sequence,
    hash: snapshot.hash,
    bids: new Map(snapshot.bids.map((level) => [priceKey(level.price), level.size])),
    asks: new Map(snapshot.asks.map((level) => [priceKey(level.price), level.size])),
  };
}

export function applyBookEvent(raw: RawBookEvent): {
  state: BookState;
  event: MarketStreamEvent;
} {
  const snapshot = normalizeBookSummary(raw, raw.market);
  const state = createOrderBookState(snapshot);

  return {
    state,
    event: {
      type: "orderbook_snapshot",
      marketId: snapshot.marketId,
      outcomeTokenId: snapshot.outcomeTokenId,
      orderBook: snapshot,
      topOfBook: createTopOfBook(snapshot),
      source: "ws",
      rawEventType: "book",
      ts: snapshot.ts,
    },
  };
}

export function applyPriceChangeEvent(
  currentState: BookState,
  raw: RawPriceChangeEvent,
): {
  state: BookState;
  event: MarketStreamEvent;
} {
  const state: BookState = {
    ...currentState,
    bids: new Map(currentState.bids),
    asks: new Map(currentState.asks),
    sequence: currentState.sequence + 1,
    hash: raw.hash ?? currentState.hash,
  };

  const price = raw.price;

  if (raw.side === "BUY") {
    upsertLevel(state.bids, price, raw.size);
  } else {
    upsertLevel(state.asks, price, raw.size);
  }

  const ts = parseNumericValue(raw.timestamp) ?? Date.now();
  const snapshot = toSnapshot(state, ts, raw.hash);

  return {
    state,
    event: {
      type: "orderbook_delta",
      marketId: snapshot.marketId,
      outcomeTokenId: snapshot.outcomeTokenId,
      orderBook: snapshot,
      topOfBook: createTopOfBook(snapshot),
      source: "ws",
      rawEventType: "price_change",
      ts,
    },
  };
}

export function applyBestBidAskEvent(raw: RawBestBidAskEvent): MarketStreamEvent {
  return {
    type: "top_of_book",
    marketId: raw.market,
    outcomeTokenId: raw.asset_id,
    topOfBook: normalizeBestBidAsk(raw),
    source: "ws",
    rawEventType: "best_bid_ask",
    ts: parseNumericValue(raw.timestamp) ?? Date.now(),
  };
}

export function applyLastTradePriceEvent(raw: RawLastTradePriceEvent): MarketStreamEvent {
  return {
    type: "trade",
    marketId: raw.market,
    outcomeTokenId: raw.asset_id,
    side: raw.side === "BUY" ? "buy" : "sell",
    price: parseNumericValue(raw.price) ?? 0,
    size: parseNumericValue(raw.size) ?? 0,
    source: "ws",
    rawEventType: "last_trade_price",
    ts: parseNumericValue(raw.timestamp) ?? Date.now(),
  };
}

export function applyTickSizeChangeEvent(raw: RawTickSizeChangeEvent): MarketStreamEvent {
  return {
    type: "tick_size_change",
    marketId: raw.market,
    outcomeTokenId: raw.asset_id,
    previousTickSize: parseNumericValue(raw.old_tick_size),
    nextTickSize: parseNumericValue(raw.new_tick_size) ?? 0,
    source: "ws",
    rawEventType: "tick_size_change",
    ts: parseNumericValue(raw.timestamp) ?? Date.now(),
  };
}
