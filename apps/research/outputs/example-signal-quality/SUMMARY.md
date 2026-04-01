# Signal Quality Research Summary

## Coverage
- Session: `example-session`
- Decisions logged: 5
- Closed trades analyzed: 0
- Dataset markouts available: yes

## Edge Check
- Baseline net PnL: 0.000000
- Baseline expectancy: 0.000000
- Baseline win rate: 0.0000
- Best heuristic-score bucket by expectancy: n/a
- Top univariate feature by markout correlation: n/a

## Cost Survival
- Fee stress at 1.5x observed fees: net PnL n/a, expectancy n/a
- Extra taker slippage +0.002: net PnL n/a, expectancy n/a

## Stability
- Positive rolling windows: n/a
- Walk-forward mean test expectancy: n/a

## Robust Thresholds
- Profitable heuristic-score thresholds with at least 5 trades: none found
- Near-best swept parameter values: no sweep data

These outputs are strongest when heuristic-score bucket expectancy is monotonic, fee/slippage stress keeps expectancy positive, rolling windows avoid long negative runs, and walk-forward test performance stays close to train performance.
