import { readFile } from "node:fs/promises";

import type { MarketDescriptor, OrderBookSnapshot } from "@polymarket-bot/shared";

import type { BacktestDataset } from "./types.js";

type JsonlLine =
  | {
      type: "market";
      market: MarketDescriptor;
    }
  | {
      type: "snapshot";
      snapshot: OrderBookSnapshot;
    }
  | OrderBookSnapshot;

function isJsonlMarketLine(
  value: unknown,
): value is {
  type: "market";
  market: MarketDescriptor;
} {
  return isRecord(value) && value.type === "market" && isMarketDescriptor(value.market);
}

function isJsonlSnapshotLine(
  value: unknown,
): value is {
  type: "snapshot";
  snapshot: OrderBookSnapshot;
} {
  return isRecord(value) && value.type === "snapshot" && isSnapshot(value.snapshot);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isMarketDescriptor(value: unknown): value is MarketDescriptor {
  return isRecord(value) && typeof value.marketId === "string" && typeof value.slug === "string";
}

function isSnapshot(value: unknown): value is OrderBookSnapshot {
  return (
    isRecord(value) &&
    typeof value.marketId === "string" &&
    typeof value.outcomeTokenId === "string" &&
    typeof value.ts === "number" &&
    typeof value.sequence === "number" &&
    Array.isArray(value.bids) &&
    Array.isArray(value.asks)
  );
}

function compareSnapshots(left: OrderBookSnapshot, right: OrderBookSnapshot): number {
  if (left.ts !== right.ts) {
    return left.ts - right.ts;
  }
  if (left.sequence !== right.sequence) {
    return left.sequence - right.sequence;
  }
  if (left.marketId !== right.marketId) {
    return left.marketId.localeCompare(right.marketId);
  }
  return left.outcomeTokenId.localeCompare(right.outcomeTokenId);
}

function normalizeDataset(raw: unknown): BacktestDataset {
  if (!isRecord(raw)) {
    throw new Error("Backtest dataset JSON must be an object.");
  }

  const markets = Array.isArray(raw.markets) ? raw.markets.filter(isMarketDescriptor) : [];
  let snapshots: OrderBookSnapshot[] = [];

  if (Array.isArray(raw.snapshots)) {
    snapshots = raw.snapshots.filter(isSnapshot);
  } else if (Array.isArray(raw.events)) {
    snapshots = raw.events
      .map((event) => (isRecord(event) && isSnapshot(event.snapshot) ? event.snapshot : null))
      .filter((event): event is OrderBookSnapshot => event !== null);
  }

  if (markets.length === 0) {
    throw new Error("Backtest dataset must contain at least one market descriptor.");
  }

  if (snapshots.length === 0) {
    throw new Error("Backtest dataset must contain at least one order book snapshot.");
  }

  return {
    markets,
    snapshots: [...snapshots].sort(compareSnapshots),
    metadata: isRecord(raw.metadata)
      ? {
          source: typeof raw.metadata.source === "string" ? raw.metadata.source : undefined,
          note: typeof raw.metadata.note === "string" ? raw.metadata.note : undefined,
        }
      : undefined,
  };
}

function normalizeJsonl(content: string): BacktestDataset {
  const markets: MarketDescriptor[] = [];
  const snapshots: OrderBookSnapshot[] = [];

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    const parsed = JSON.parse(trimmed) as JsonlLine;
    if (isJsonlMarketLine(parsed)) {
      markets.push(parsed.market);
      continue;
    }

    if (isJsonlSnapshotLine(parsed)) {
      snapshots.push(parsed.snapshot);
      continue;
    }

    if (isSnapshot(parsed)) {
      snapshots.push(parsed);
    }
  }

  if (markets.length === 0) {
    throw new Error("JSONL dataset must include market records before replay.");
  }

  if (snapshots.length === 0) {
    throw new Error("JSONL dataset must include snapshot records before replay.");
  }

  return {
    markets,
    snapshots: snapshots.sort(compareSnapshots),
  };
}

export async function loadBacktestDataset(datasetPath: string): Promise<BacktestDataset> {
  const content = await readFile(datasetPath, "utf8");
  if (datasetPath.endsWith(".jsonl")) {
    return normalizeJsonl(content);
  }

  return normalizeDataset(JSON.parse(content));
}

export { compareSnapshots };
