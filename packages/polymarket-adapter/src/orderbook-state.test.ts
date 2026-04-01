import test from "node:test";
import assert from "node:assert/strict";

import { applyBookEvent, applyPriceChangeEvent } from "./orderbook-state.js";

test("applyPriceChangeEvent updates bids and removes zero-size levels", () => {
  const initial = applyBookEvent({
    event_type: "book",
    asset_id: "1",
    market: "0xabc",
    timestamp: "100",
    bids: [{ price: "0.40", size: "10" }],
    asks: [{ price: "0.45", size: "20" }],
  });

  const updated = applyPriceChangeEvent(initial.state, {
    event_type: "price_change",
    asset_id: "1",
    market: "0xabc",
    timestamp: "101",
    side: "BUY",
    price: "0.42",
    size: "15",
  });

  assert.equal(updated.event.type, "orderbook_delta");
  assert.equal(updated.event.topOfBook.bestBid, 0.42);

  const removed = applyPriceChangeEvent(updated.state, {
    event_type: "price_change",
    asset_id: "1",
    market: "0xabc",
    timestamp: "102",
    side: "BUY",
    price: "0.42",
    size: "0",
  });

  assert.equal(removed.event.type, "orderbook_delta");
  assert.equal(removed.event.topOfBook.bestBid, 0.4);
});
