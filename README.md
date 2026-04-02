# Polymarket Bot

Production-minded scaffold for a single-operator Polymarket trading bot platform.

## Workspace Layout

- `apps/web`: Next.js dashboard shell
- `apps/trader`: Node/TypeScript runtime daemon
- `apps/research`: Python research and backtesting entrypoint
- `packages/shared`: shared types, config, logging, SQLite helpers
- `packages/polymarket-adapter`: Polymarket-specific market data and execution stubs
- `packages/backtest-core`: replay and backtest placeholders

## Quick Start

```bash
npm install
npm run build
npm run dev:trader
```

In another terminal:

```bash
npm run dev:web
```

For the research app:

```bash
cd apps/research
PYTHONPATH=src python3 -m research
```

## Deployment

Public dashboard plus paper-trading deployment is supported today.

- deployment guide: [deployment.md](/Users/nika/Desktop/Polymarket%20bot/docs/deployment.md)
- operations and validation guide: [validation-and-operations.md](/Users/nika/Desktop/Polymarket%20bot/docs/validation-and-operations.md)

Important:

- `RUN_MODE=live` is intentionally disabled
- the current supported hosted mode is dashboard + paper trading, not real-money execution

## Included Today

- typed shared contracts for runtime and strategy boundaries
- bootable trader daemon with HTTP health endpoints
- bootable Next.js dashboard shell
- scanner-driven paper-trading runtime and dashboard panels
- SQLite initialization for the trader runtime
- placeholder Polymarket adapter and backtest engine
- Dockerfiles and `docker-compose.yml`

## Intentionally Deferred

- strategy logic
- real order placement
- live websocket ingestion
- authentication and operator multi-user features
