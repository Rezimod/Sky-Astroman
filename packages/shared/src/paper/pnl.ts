import type {
  PaperFillRecord,
  PaperPosition,
  PaperTradeLifecycle,
} from "./types.js";

function round(value: number, digits = 8): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function positionKey(marketId: string, outcomeTokenId: string): string {
  return `${marketId}:${outcomeTokenId}`;
}

export function createEmptyPosition(marketId: string, outcomeTokenId: string): PaperPosition {
  return {
    marketId,
    outcomeTokenId,
    size: 0,
    averageEntryPrice: 0,
    realizedPnl: 0,
    unrealizedPnl: 0,
    markPrice: null,
    totalFees: 0,
    openTradeId: null,
  };
}

export function markPosition(position: PaperPosition, markPrice: number | null): PaperPosition {
  const nextPosition = { ...position, markPrice };

  if (markPrice === null || position.size === 0) {
    nextPosition.unrealizedPnl = 0;
    return nextPosition;
  }

  nextPosition.unrealizedPnl =
    position.size > 0
      ? round((markPrice - position.averageEntryPrice) * position.size, 8)
      : round((position.averageEntryPrice - markPrice) * Math.abs(position.size), 8);

  return nextPosition;
}

function createTradeLifecycle(fill: PaperFillRecord): PaperTradeLifecycle {
  return {
    tradeId: `trade-${fill.fillId}`,
    marketId: fill.marketId,
    outcomeTokenId: fill.outcomeTokenId,
    side: fill.side,
    openedAtTs: fill.ts,
    closedAtTs: null,
    entryValue: round(fill.price * fill.size, 8),
    exitValue: 0,
    sizeOpened: fill.size,
    sizeClosed: 0,
    realizedPnl: round(-fill.fee, 8),
    fees: fill.fee,
    fillIds: [fill.fillId],
    status: "OPEN",
  };
}

export function applyFillToPosition(
  currentPosition: PaperPosition,
  fill: PaperFillRecord,
  existingTrade: PaperTradeLifecycle | null,
): {
  position: PaperPosition;
  realizedDelta: number;
  tradeLifecycle: PaperTradeLifecycle | null;
  closedTrade: PaperTradeLifecycle | null;
} {
  const position = { ...currentPosition };
  let tradeLifecycle = existingTrade ? { ...existingTrade } : existingTrade;
  let closedTrade: PaperTradeLifecycle | null = null;
  let realizedDelta = -fill.fee;
  position.totalFees = round(position.totalFees + fill.fee, 8);

  const fillSignedSize = fill.side === "buy" ? fill.size : -fill.size;

  if (position.size === 0 || Math.sign(position.size) === Math.sign(fillSignedSize)) {
    const nextSize = round(position.size + fillSignedSize, 8);
    const weightedNotional =
      Math.abs(position.size) * position.averageEntryPrice + fill.size * fill.price;
    position.size = nextSize;
    position.averageEntryPrice =
      nextSize === 0 ? 0 : round(weightedNotional / Math.abs(nextSize), 8);

    if (!tradeLifecycle) {
      tradeLifecycle = createTradeLifecycle(fill);
      position.openTradeId = tradeLifecycle.tradeId;
    } else {
      tradeLifecycle.entryValue = round(tradeLifecycle.entryValue + fill.price * fill.size, 8);
      tradeLifecycle.sizeOpened = round(tradeLifecycle.sizeOpened + fill.size, 8);
      tradeLifecycle.realizedPnl = round(tradeLifecycle.realizedPnl + realizedDelta, 8);
      tradeLifecycle.fees = round(tradeLifecycle.fees + fill.fee, 8);
      tradeLifecycle.fillIds = [...tradeLifecycle.fillIds, fill.fillId];
    }

    position.realizedPnl = round(position.realizedPnl + realizedDelta, 8);
    return {
      position,
      realizedDelta,
      tradeLifecycle,
      closedTrade,
    };
  }

  const closingSize = Math.min(Math.abs(position.size), fill.size);
  const remainderSize = round(fill.size - closingSize, 8);
  const closingFee = fill.size > 0 ? round(fill.fee * (closingSize / fill.size), 8) : 0;
  const openingFee = round(fill.fee - closingFee, 8);
  const perUnitPnl =
    position.size > 0
      ? fill.price - position.averageEntryPrice
      : position.averageEntryPrice - fill.price;
  realizedDelta = round(realizedDelta + perUnitPnl * closingSize, 8);

  position.size = round(position.size + fillSignedSize, 8);
  if (position.size === 0) {
    position.averageEntryPrice = 0;
  }

  if (tradeLifecycle) {
    tradeLifecycle.exitValue = round(tradeLifecycle.exitValue + fill.price * closingSize, 8);
    tradeLifecycle.sizeClosed = round(tradeLifecycle.sizeClosed + closingSize, 8);
    tradeLifecycle.realizedPnl = round(
      tradeLifecycle.realizedPnl + perUnitPnl * closingSize - closingFee,
      8,
    );
    tradeLifecycle.fees = round(tradeLifecycle.fees + closingFee, 8);
    tradeLifecycle.fillIds = [...tradeLifecycle.fillIds, fill.fillId];
  }

  if (position.size === 0 && tradeLifecycle) {
    tradeLifecycle.closedAtTs = fill.ts;
    tradeLifecycle.status = "CLOSED";
    closedTrade = tradeLifecycle;
    tradeLifecycle = null;
    position.openTradeId = null;
  }

  if (position.size !== 0 && Math.sign(position.size) !== Math.sign(currentPosition.size)) {
    position.averageEntryPrice = fill.price;
    closedTrade = tradeLifecycle
      ? {
          ...tradeLifecycle,
          closedAtTs: fill.ts,
          status: "CLOSED",
        }
      : null;
    tradeLifecycle =
      remainderSize > 0
        ? createTradeLifecycle({
            ...fill,
            fillId: `${fill.fillId}-flip`,
            fee: openingFee,
            size: remainderSize,
          })
        : null;
    position.openTradeId = tradeLifecycle?.tradeId ?? null;
  }

  position.realizedPnl = round(position.realizedPnl + realizedDelta, 8);
  return {
    position,
    realizedDelta,
    tradeLifecycle,
    closedTrade,
  };
}

export function aggregatePortfolio(
  positions: Map<string, PaperPosition>,
): {
  realizedPnl: number;
  unrealizedPnl: number;
  positions: PaperPosition[];
} {
  const snapshots = [...positions.values()].filter(
    (position) => position.size !== 0 || position.realizedPnl !== 0 || position.totalFees !== 0,
  );

  return {
    realizedPnl: round(
      snapshots.reduce((sum, position) => sum + position.realizedPnl, 0),
      8,
    ),
    unrealizedPnl: round(
      snapshots.reduce((sum, position) => sum + position.unrealizedPnl, 0),
      8,
    ),
    positions: snapshots.map((position) => ({
      ...position,
    })),
  };
}

export { positionKey };
