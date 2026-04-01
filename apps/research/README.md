# apps/research

Python entrypoint for research and backtesting workflows.

## Current Scope

- signal-quality research workflow for replay / backtest reports
- feature distribution and univariate predictive-usefulness diagnostics
- trade bucket, regime, cost-sensitivity, and rolling-stability analysis
- parameter robustness summaries for sweep / walk-forward outputs

## Commands

```bash
PYTHONPATH=src python3 -m research \
  --report ../../packages/backtest-core/tmp/backtest-example/report.json \
  --output-dir ./outputs/example-signal-quality
```

Run the sample replay first:

```bash
npm run build -w @polymarket-bot/backtest-core
npm run backtest -w @polymarket-bot/backtest-core -- --config ./examples/backtest-config.json
```

## Outputs

The workflow writes analysis-ready files such as:

- `decision-rows.csv`
- `trade-rows.csv`
- `feature-distributions.csv`
- `feature-importance.csv`
- `decision-heuristic-score-buckets.csv`
- `trade-heuristic-score-buckets.csv`
- `maker-vs-taker.csv`
- `pnl-by-spread-regime.csv`
- `pnl-by-liquidity-regime.csv`
- `pnl-by-expiry-bucket.csv`
- `fee-sensitivity.csv`
- `slippage-sensitivity.csv`
- `rolling-stability.csv`
- `heuristic-score-threshold-robustness.csv`
- `parameter-robustness.csv`
- `SUMMARY.md`
