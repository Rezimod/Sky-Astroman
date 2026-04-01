# Validation And Operations

This document describes the current validation layer for the MVP trading bot, the manual paper-trading checklist, and the first-response runbook for common failures.

## Automated Coverage

Current automated coverage is intentionally concentrated around deterministic, auditable logic:

- feature calculations:
  - [engine.test.ts](/Users/nika/Desktop/Polymarket%20bot/packages/shared/src/features/engine.test.ts)
- signal engine decisions:
  - [engine.test.ts](/Users/nika/Desktop/Polymarket%20bot/packages/shared/src/strategy/engine.test.ts)
- risk manager:
  - [engine.test.ts](/Users/nika/Desktop/Polymarket%20bot/packages/shared/src/risk/engine.test.ts)
  - [store.test.ts](/Users/nika/Desktop/Polymarket%20bot/packages/shared/src/risk/store.test.ts)
- PnL and position accounting:
  - [broker.test.ts](/Users/nika/Desktop/Polymarket%20bot/packages/shared/src/paper/broker.test.ts)
  - [pnl.test.ts](/Users/nika/Desktop/Polymarket%20bot/packages/shared/src/paper/pnl.test.ts)
- scanner ranking and scanner service behavior:
  - [scoring.test.ts](/Users/nika/Desktop/Polymarket%20bot/apps/trader/src/scanner/scoring.test.ts)
  - [service.test.ts](/Users/nika/Desktop/Polymarket%20bot/apps/trader/src/scanner/service.test.ts)
- market-data adapter normalization, reconnect, and subscription behavior:
  - [normalizers.test.ts](/Users/nika/Desktop/Polymarket%20bot/packages/polymarket-adapter/src/normalizers.test.ts)
  - [orderbook-state.test.ts](/Users/nika/Desktop/Polymarket%20bot/packages/polymarket-adapter/src/orderbook-state.test.ts)
  - [stream.test.ts](/Users/nika/Desktop/Polymarket%20bot/packages/polymarket-adapter/src/stream.test.ts)
  - [client.test.ts](/Users/nika/Desktop/Polymarket%20bot/packages/polymarket-adapter/src/client.test.ts)
- replay/backtest integration and regression fixtures:
  - [replay.test.ts](/Users/nika/Desktop/Polymarket%20bot/packages/backtest-core/src/replay.test.ts)
  - [full-flow.test.ts](/Users/nika/Desktop/Polymarket%20bot/packages/backtest-core/src/full-flow.test.ts)
  - [audit.test.ts](/Users/nika/Desktop/Polymarket%20bot/packages/backtest-core/src/audit.test.ts)
- config validation:
  - [config.test.ts](/Users/nika/Desktop/Polymarket%20bot/packages/shared/src/config.test.ts)

Recommended commands:

```bash
npm run test
npm run build
```

## Manual Paper Trading Checklist

Use this before trusting a new paper-trading iteration:

1. Confirm config and mode.
   - Verify `RUN_MODE=paper`.
   - Verify `RUN_MODE=live` still fails fast.
   - Verify the intended `DATABASE_URL`, `DATA_DIR`, and `LOG_LEVEL`.

2. Start the trader and inspect health.
   - `npm run start -w @polymarket-bot/trader`
   - Check `/health` and confirm `ok=true`.
   - Check scanner freshness fields and warning list.

3. Confirm structured logging and audit output.
   - Verify logs are JSON lines with `sessionId` and `runMode`.
   - Verify runtime audit export appears under `DATA_DIR/audit/<sessionId>`.

4. Confirm scanner behavior.
   - Verify at least one scanner refresh completes.
   - Verify accepted and rejected counts look plausible.
   - Verify the top candidate has a narrow spread and healthy top-book depth.

5. Confirm decision auditability in backtest mode before paper changes.
   - Run the matching backtest fixture/config.
   - Inspect `decision-log.csv`, `audit_strategy_decisions.csv`, and `audit_risk_decisions.csv`.
   - Confirm reasons for BUY / SELL / EXIT / HOLD are easy to trace.

6. Confirm execution realism remains conservative.
   - Verify maker fills do not appear from same-price size changes alone.
   - Verify aggressive exits do not exceed visible top-level depth.
   - Verify unresolved aggressive exits are visible in metrics if replay ends early.

7. Confirm position and PnL accounting.
   - Verify fees are present on every fill.
   - Verify realized/unrealized PnL snapshots are exported.
   - Verify final positions are zero or explicitly visible if not closed.

8. Sanity-check strategy/risk coupling.
   - Verify strategy friction and paper-fill friction still match.
   - Verify risk baselines remain per instrument.

## Debug Runbook

### Symptom: `/health` is unhealthy

Check:
- market-data adapter status
- scanner status
- scanner staleness warning

Actions:
- restart the trader
- inspect recent JSON logs for websocket/connectivity errors
- verify the scanner is still enabled in config

### Symptom: scanner returns no candidates

Check:
- spread, liquidity, and volume thresholds
- time-to-expiry windows
- order-book fetch warnings in logs

Actions:
- inspect rejected reasons in scanner logs
- reduce thresholds only if the rejected reasons are expected and documented
- do not lower thresholds blindly without a paired backtest

### Symptom: backtest produces no trades

Check:
- `decision-log.csv`
- `audit_strategy_decisions.csv`
- `audit_risk_decisions.csv`

Actions:
- confirm signals are being generated
- confirm risk is not rejecting everything
- confirm the fixture/dataset contains enough observations and tradable spreads

### Symptom: fill rate suddenly changes after a code change

Check:
- maker fill confidence classes
- unresolved aggressive exit metrics
- strategy friction versus paper-fill friction

Actions:
- rerun [full-flow.test.ts](/Users/nika/Desktop/Polymarket%20bot/packages/backtest-core/src/full-flow.test.ts)
- rerun [broker.test.ts](/Users/nika/Desktop/Polymarket%20bot/packages/shared/src/paper/broker.test.ts)
- compare the new audit export against the last known-good run

### Symptom: runtime starts but no scanner updates arrive

Check:
- scanner subscription status logs
- websocket reconnect logs
- scanner refresh interval

Actions:
- verify websocket connectivity
- verify the token list is not empty
- inspect adapter reconnect attempts in health output

### Symptom: config changes behave strangely

Check:
- boolean env values are exactly `true`, `false`, `1`, or `0`
- numeric env vars are parseable

Actions:
- rerun [config.test.ts](/Users/nika/Desktop/Polymarket%20bot/packages/shared/src/config.test.ts)
- prefer explicit env files over ad hoc shell exports

## Known MVP Limitations

- Live trading remains hard-disabled. The execution adapter is still a stub and the runtime must not be treated as live-ready.
- Scanner tests and replay execution tests are separate because the runtime scanner is not yet wired into a real trading loop.
- Historical replay still uses top-of-book snapshots only. If historical depth is incomplete, execution realism remains limited.
- Runtime persistence currently records session/config/scanner metadata only. TODO: persist runtime decisions, orders, fills, and position snapshots when the real trading loop exists.
- Backtest audit persistence stores final position snapshots, not a full incremental position history. TODO: add that once the broker exposes a stable position event stream.
- Websocket reconnect tests use fake sockets and deterministic timers. They validate control flow, not real network behavior.
