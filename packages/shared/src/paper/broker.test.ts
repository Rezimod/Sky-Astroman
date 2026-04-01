import assert from "node:assert/strict";
import test from "node:test";

import { PaperBrokerEngine } from "./broker.js";
import { DEFAULT_PAPER_FILL_MODEL_CONFIG } from "./fill-model.js";
import type { OrderBookSnapshot } from "../types/index.js";

function snapshot(
  ts: number,
  bidPrice: number,
  bidSize: number,
  askPrice: number,
  askSize: number,
): OrderBookSnapshot {
  return {
    marketId: "m1",
    outcomeTokenId: "t1",
    ts,
    sequence: ts,
    bids: [{ price: bidPrice, size: bidSize }],
    asks: [{ price: askPrice, size: askSize }],
  };
}

test("passive order needs queue consumption before filling", () => {
  const broker = new PaperBrokerEngine();
  const order = broker.submitLimitOrder({
    clientOrderId: "c1",
    marketId: "m1",
    outcomeTokenId: "t1",
    side: "buy",
    price: 0.5,
    size: 10,
    liquidityIntent: "maker",
    submittedAtTs: 0,
  });

  let fills = broker.onOrderBookSnapshot(snapshot(1_000, 0.49, 100, 0.5, 100));
  assert.equal(fills.length, 0);

  fills = broker.onOrderBookSnapshot(snapshot(2_000, 0.49, 100, 0.5, 100));
  assert.equal(fills.length, 0);

  fills = broker.onOrderBookSnapshot(snapshot(3_000, 0.49, 100, 0.5, 20));
  assert.equal(fills.length, 0);

  fills = broker.onOrderBookSnapshot(snapshot(4_000, 0.49, 100, 0.49, 20));
  assert.equal(fills.length, 0);

  fills = broker.onOrderBookSnapshot(snapshot(5_000, 0.49, 100, 0.49, 10));
  assert.ok(fills.length >= 1);
  assert.ok(fills[0].size > 0);
  assert.equal(fills[0].fillConfidence, "price_through_inferred");

  const state = broker.getState();
  assert.ok(state.fills.length >= 1);
  assert.ok(state.openOrders.length === 1 || state.openOrders.length === 0);
  assert.equal(order.side, "buy");
});

test("passive order does not fill from same-price size changes alone", () => {
  const broker = new PaperBrokerEngine(undefined, {
    ...DEFAULT_PAPER_FILL_MODEL_CONFIG,
    passiveParticipationRate: 1,
    minTouchesBeforeFill: 1,
    queuePriorityDelayMs: 0,
  });

  broker.submitLimitOrder({
    clientOrderId: "c1",
    marketId: "m1",
    outcomeTokenId: "t1",
    side: "buy",
    price: 0.5,
    size: 10,
    liquidityIntent: "maker",
    submittedAtTs: 0,
  });

  let fills = broker.onOrderBookSnapshot(snapshot(1_000, 0.49, 100, 0.5, 100));
  assert.equal(fills.length, 0);

  fills = broker.onOrderBookSnapshot(snapshot(2_000, 0.49, 100, 0.5, 10));
  assert.equal(fills.length, 0);

  fills = broker.onOrderBookSnapshot(snapshot(3_000, 0.49, 100, 0.5, 1));
  assert.equal(fills.length, 0);
});

test("replace order cancels the original and opens a new order", () => {
  const broker = new PaperBrokerEngine();
  const original = broker.submitLimitOrder({
    clientOrderId: "c1",
    marketId: "m1",
    outcomeTokenId: "t1",
    side: "buy",
    price: 0.48,
    size: 10,
    liquidityIntent: "maker",
    submittedAtTs: 0,
  });

  const replacement = broker.replaceOrder(original.orderId, {
    clientOrderId: "c2",
    marketId: "m1",
    outcomeTokenId: "t1",
    side: "buy",
    price: 0.49,
    size: 10,
    liquidityIntent: "maker",
    submittedAtTs: 1_000,
  });

  assert.ok(replacement);
  assert.notEqual(replacement?.orderId, original.orderId);
  const state = broker.getState();
  assert.equal(
    state.eventLog.some(
      (event) => event.type === "order_replaced" && event.previousOrderId === original.orderId,
    ),
    true,
  );
});

test("aggressive exit only fills visible depth with slippage", () => {
  const broker = new PaperBrokerEngine(undefined, {
    ...DEFAULT_PAPER_FILL_MODEL_CONFIG,
    passiveParticipationRate: 1,
    minTouchesBeforeFill: 1,
    queuePriorityDelayMs: 0,
  });
  broker.submitLimitOrder({
    clientOrderId: "c1",
    marketId: "m1",
    outcomeTokenId: "t1",
    side: "buy",
    price: 0.5,
    size: 10,
    liquidityIntent: "maker",
    submittedAtTs: 0,
  });
  broker.onOrderBookSnapshot(snapshot(1_000, 0.49, 100, 0.5, 100));
  broker.onOrderBookSnapshot(snapshot(2_000, 0.49, 100, 0.49, 100));
  broker.onOrderBookSnapshot(snapshot(3_000, 0.49, 100, 0.49, 100));

  const exitFill = broker.simulateAggressiveExit(
    {
      marketId: "m1",
      outcomeTokenId: "t1",
      side: "sell",
      size: 5,
      requestedAtTs: 5_000,
    },
    snapshot(5_000, 0.48, 3, 0.49, 100),
  );

  assert.ok(exitFill);
  assert.equal(exitFill?.aggressiveExit, true);
  assert.equal(exitFill?.size, 3);
  assert.equal(exitFill?.remainingOrderSize, 2);
  assert.equal(exitFill?.fillConfidence, "displayed_depth");
  assert.ok((exitFill?.price ?? 0) < 0.48);
});

test("aggressive exit does not over-exit or invent inventory", () => {
  const broker = new PaperBrokerEngine(undefined, {
    ...DEFAULT_PAPER_FILL_MODEL_CONFIG,
    passiveParticipationRate: 1,
    minTouchesBeforeFill: 1,
    queuePriorityDelayMs: 0,
  });
  const missingExit = broker.simulateAggressiveExit(
    {
      marketId: "m1",
      outcomeTokenId: "t1",
      side: "sell",
      size: 5,
      requestedAtTs: 1_000,
    },
    snapshot(1_000, 0.48, 100, 0.49, 100),
  );
  assert.equal(missingExit, null);

  broker.submitLimitOrder({
    clientOrderId: "c1",
    marketId: "m1",
    outcomeTokenId: "t1",
    side: "buy",
    price: 0.5,
    size: 10,
    liquidityIntent: "maker",
    submittedAtTs: 0,
  });
  broker.onOrderBookSnapshot(snapshot(2_000, 0.49, 100, 0.5, 100));
  broker.onOrderBookSnapshot(snapshot(3_000, 0.49, 100, 0.49, 100));
  broker.onOrderBookSnapshot(snapshot(4_000, 0.49, 100, 0.49, 100));

  const oversizedExit = broker.simulateAggressiveExit(
    {
      marketId: "m1",
      outcomeTokenId: "t1",
      side: "sell",
      size: 100,
      requestedAtTs: 5_000,
    },
    snapshot(5_000, 0.48, 4, 0.49, 100),
  );

  assert.ok(oversizedExit);
  assert.equal(oversizedExit?.size, 4);
  assert.equal(oversizedExit?.remainingOrderSize, 6);
});
