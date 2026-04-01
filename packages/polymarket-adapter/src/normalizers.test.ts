import test from "node:test";
import assert from "node:assert/strict";

import {
  createTopOfBook,
  normalizeBookSummary,
  normalizeGammaMarket,
  parseStringArrayField,
} from "./normalizers.js";

test("parseStringArrayField parses stringified arrays", () => {
  assert.deepEqual(parseStringArrayField('["a","b"]'), ["a", "b"]);
});

test("normalizeGammaMarket maps token ids to outcomes", () => {
  const market = normalizeGammaMarket({
    id: "123",
    conditionId: "0xabc",
    slug: "btc-above-100k",
    question: "Will BTC close above 100k?",
    active: true,
    closed: false,
    archived: false,
    enableOrderBook: true,
    outcomes: '["Yes","No"]',
    clobTokenIds: '["1","2"]',
    outcomePrices: '["0.42","0.58"]',
    liquidityNum: "12000",
    volume24hr: "5000",
  });

  assert.equal(market.marketId, "0xabc");
  assert.equal(market.outcomes[0]?.tokenId, "1");
  assert.equal(market.outcomes[1]?.price, 0.58);
  assert.equal(market.status, "open");
});

test("normalizeBookSummary builds sorted book and top of book", () => {
  const snapshot = normalizeBookSummary({
    asset_id: "1",
    market: "0xabc",
    timestamp: "1000",
    bids: [
      { price: "0.41", size: "50" },
      { price: "0.43", size: "20" },
    ],
    asks: [
      { price: "0.47", size: "10" },
      { price: "0.45", size: "30" },
    ],
  });

  const top = createTopOfBook(snapshot);

  assert.equal(snapshot.bids[0]?.price, 0.43);
  assert.equal(snapshot.asks[0]?.price, 0.45);
  assert.equal(top.spread, 0.02);
  assert.equal(top.midpoint, 0.44);
});
