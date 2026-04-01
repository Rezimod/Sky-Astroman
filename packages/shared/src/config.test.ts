import assert from "node:assert/strict";
import test from "node:test";

import { loadTraderConfig } from "./config.js";

test("loadTraderConfig hard-disables live trading mode", () => {
  assert.throws(
    () =>
      loadTraderConfig({
        RUN_MODE: "live",
      }),
    /RUN_MODE=live is disabled/,
  );
});

test("loadTraderConfig rejects unsupported run modes and invalid numerics", () => {
  assert.throws(
    () =>
      loadTraderConfig({
        RUN_MODE: "sandbox",
      }),
    /Unsupported RUN_MODE/,
  );

  assert.throws(
    () =>
      loadTraderConfig({
        TRADER_PORT: "not-a-number",
      }),
    /TRADER_PORT must be numeric/,
  );
});

test("loadTraderConfig parses strict booleans and rejects invalid values", () => {
  const enabled = loadTraderConfig({
    RUN_MODE: "paper",
    SCANNER_ENABLED: "1",
    ALLOW_TAKER_EXITS_ONLY: "false",
  });

  assert.equal(enabled.scanner.enabled, true);
  assert.equal(enabled.risk.allowTakerExitsOnly, false);

  assert.throws(
    () =>
      loadTraderConfig({
        SCANNER_ENABLED: "yes",
      }),
    /SCANNER_ENABLED must be boolean/,
  );
});
