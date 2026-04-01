import assert from "node:assert/strict";
import test from "node:test";

import { aggregatePortfolio, applyFillToPosition, createEmptyPosition, markPosition } from "./pnl.js";
import type { PaperFillRecord } from "./types.js";

function fill(overrides: Partial<PaperFillRecord>): PaperFillRecord {
  return {
    fillId: "fill-1",
    orderId: "order-1",
    clientOrderId: "client-1",
    marketId: "m1",
    outcomeTokenId: "t1",
    side: "buy",
    price: 0.4,
    size: 10,
    fee: 0.04,
    liquidity: "maker",
    ts: 1_000,
    aggressiveExit: false,
    remainingOrderSize: 0,
    fillConfidence: "price_through_inferred",
    ...overrides,
  };
}

test("realized pnl is computed honestly across entry and exit", () => {
  const initial = createEmptyPosition("m1", "t1");
  const entry = applyFillToPosition(initial, fill({}), null);
  const exit = applyFillToPosition(
    entry.position,
    fill({
      fillId: "fill-2",
      orderId: "order-2",
      clientOrderId: "client-2",
      side: "sell",
      price: 0.55,
      fee: 0.055,
      ts: 2_000,
    }),
    entry.tradeLifecycle,
  );

  assert.equal(exit.position.size, 0);
  assert.equal(exit.position.realizedPnl, 1.405);
  assert.equal(exit.closedTrade?.realizedPnl, exit.position.realizedPnl);
  assert.equal(exit.closedTrade?.fees, 0.095);
});

test("markPosition updates unrealized pnl from midpoint", () => {
  const entry = applyFillToPosition(createEmptyPosition("m1", "t1"), fill({}), null);
  const marked = markPosition(entry.position, 0.5);
  assert.equal(marked.unrealizedPnl, 1);
});

test("aggregatePortfolio sums realized and unrealized pnl", () => {
  const positions = new Map();
  positions.set(
    "m1:t1",
    markPosition(
      applyFillToPosition(createEmptyPosition("m1", "t1"), fill({}), null).position,
      0.5,
    ),
  );
  const aggregate = aggregatePortfolio(positions);
  assert.ok(aggregate.positions.length === 1);
  assert.ok(aggregate.unrealizedPnl > 0);
});

test("applyFillToPosition closes and reopens correctly when inventory flips direction", () => {
  const longEntry = applyFillToPosition(createEmptyPosition("m1", "t1"), fill({ size: 10 }), null);
  const flipped = applyFillToPosition(
    longEntry.position,
    fill({
      fillId: "fill-2",
      orderId: "order-2",
      clientOrderId: "client-2",
      side: "sell",
      size: 15,
      price: 0.55,
      fee: 0.0825,
      ts: 2_000,
    }),
    longEntry.tradeLifecycle,
  );

  assert.equal(flipped.closedTrade?.status, "CLOSED");
  assert.ok(flipped.closedTrade);
  assert.equal(flipped.position.size, -5);
  assert.equal(flipped.position.averageEntryPrice, 0.55);
  assert.ok(flipped.tradeLifecycle);
  assert.equal(flipped.tradeLifecycle?.status, "OPEN");
  assert.equal(flipped.closedTrade?.fees, 0.095);
  assert.equal(flipped.tradeLifecycle?.fees, 0.0275);
});
