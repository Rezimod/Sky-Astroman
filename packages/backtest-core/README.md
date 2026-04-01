# packages/backtest-core

Deterministic historical replay and backtesting for the Polymarket bot.

## Scope

- historical dataset loading from `json` or `jsonl`
- deterministic replay over normalized order book snapshots
- shared feature engine, strategy engine, risk engine, and paper execution engine reuse
- parameter sweeps
- walk-forward testing
- JSON / CSV report serialization
- SQLite-backed audit persistence with CSV / JSON exports
- simple CLI

## Replay Order

Each snapshot is processed in this order:

1. fill previously resting paper orders from the new snapshot
2. update rolling risk metrics with only data available so far
3. build features from historical observations only
4. generate strategy decision
5. evaluate risk
6. translate approved decisions into paper execution actions

That ordering avoids lookahead bias for passive fills and keeps the loop deterministic.

## CLI

```bash
npm run build -w @polymarket-bot/backtest-core
npm run backtest -w @polymarket-bot/backtest-core -- --config ./examples/backtest-config.json
```

Optional audit persistence can be configured in the session config:

```json
{
  "audit": {
    "databasePath": "../tmp/backtest-example/audit.sqlite",
    "exportDir": "../tmp/backtest-example/audit"
  }
}
```

CLI overrides are also supported:

```bash
npm run backtest -w @polymarket-bot/backtest-core -- \
  --config ./examples/backtest-config.json \
  --audit-db ./tmp/backtest-audit.sqlite \
  --audit-export-dir ./tmp/backtest-audit
```

The audit trail persists:
- decision-time market snapshot summaries
- feature snapshots
- strategy decisions and risk approvals/rejections
- broker order lifecycle events
- fills
- final position snapshots
- equity / PnL snapshots
- config versions and session metadata

Position snapshots are final-state only for now. TODO: persist incremental position history once the broker exposes a stable per-event position stream.

## Limitations

- If historical depth is incomplete, the paper fill model still only simulates top-of-book access.
- Walk-forward currently uses the train window for parameter selection only. No model fitting is performed yet.
- Missing market metadata is treated as an error instead of guessed defaults.

Generated `report.json` files also include a `limitations` array so these caveats travel with saved backtest results.
