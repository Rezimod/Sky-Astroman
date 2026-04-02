# Deployment

This repo can be deployed today in one supported mode:

- public or private dashboard
- paper-trading trader service
- live market-data scanning

This repo is not live-trading ready. `RUN_MODE=live` is intentionally blocked.

## Recommended Topology

Deploy the system as two services:

- `apps/web`: public Next.js dashboard
- `apps/trader`: Node.js trader runtime in `paper` mode

The dashboard reads trader state from:

- `/runtime`
- `/scanner`
- `/paper`
- `/config`

## Web Deployment

Recommended target:

- Vercel with project root set to `apps/web`

Required environment variables:

```bash
NEXT_PUBLIC_APP_NAME=Polymarket Bot Dashboard
TRADER_BASE_URL=https://your-trader-service.example.com
```

Notes:

- `TRADER_BASE_URL` is server-only and preferred for production.
- `NEXT_PUBLIC_TRADER_BASE_URL` is still supported as a fallback for local development.
- The web app does not need Polymarket private keys.

## Trader Deployment

Recommended target:

- any Docker-capable host such as Railway, Render, Fly.io, or your own VPS

Required environment variables:

```bash
APP_ENV=production
RUN_MODE=paper
LOG_LEVEL=info
PORT=4000
TRADER_HOST=0.0.0.0
DATABASE_URL=./data/trader.sqlite
DATA_DIR=./data
POLYMARKET_REST_URL=https://clob.polymarket.com
POLYMARKET_WS_URL=wss://ws-subscriptions-clob.polymarket.com/ws/market
POLYMARKET_CHAIN_ID=137
MAX_NOTIONAL_PER_MARKET=250
MAX_GROSS_EXPOSURE=1000
MAX_DAILY_LOSS=150
MAX_OPEN_ORDERS=20
ALLOW_TAKER_EXITS_ONLY=true
SCANNER_ENABLED=true
SCANNER_REFRESH_INTERVAL_MS=120000
SCANNER_MARKET_LIMIT=30
SCANNER_MAX_CANDIDATES=12
SCANNER_MIN_LIQUIDITY=10000
SCANNER_MIN_VOLUME_24H=2500
SCANNER_MIN_TOP_BOOK_DEPTH=200
SCANNER_MAX_SPREAD_CENTS=6
SCANNER_MIN_HOURS_TO_EXPIRY=2
SCANNER_MAX_HOURS_TO_EXPIRY=72
SCANNER_PREFERRED_HOURS_TO_EXPIRY=24
SCANNER_MIN_UPDATE_FREQUENCY_PER_MINUTE=0
SCANNER_ACTIVITY_WINDOW_MS=300000
SCANNER_WEIGHT_LIQUIDITY=0.24
SCANNER_WEIGHT_VOLUME_24H=0.18
SCANNER_WEIGHT_TOP_BOOK_DEPTH=0.2
SCANNER_WEIGHT_SPREAD=0.18
SCANNER_WEIGHT_UPDATE_FREQUENCY=0.12
SCANNER_WEIGHT_EXPIRY=0.08
```

Notes:

- `PORT` is now accepted as a fallback for hosts that inject it automatically.
- keep `RUN_MODE=paper`
- do not set `POLYMARKET_PRIVATE_KEY` or `POLYMARKET_FUNDER_ADDRESS` for public demo deployment unless authenticated execution is actually implemented

## Docker

The Dockerfiles now build production artifacts and start production processes:

- [apps/web/Dockerfile](/Users/nika/Desktop/Polymarket%20bot/apps/web/Dockerfile)
- [apps/trader/Dockerfile](/Users/nika/Desktop/Polymarket%20bot/apps/trader/Dockerfile)

Example local production-style run:

```bash
docker build -f apps/trader/Dockerfile -t polymarket-trader .
docker run --rm -p 4000:4000 --env-file apps/trader/.env.example polymarket-trader
```

```bash
docker build -f apps/web/Dockerfile -t polymarket-web .
docker run --rm -p 3000:3000 \
  -e TRADER_BASE_URL=http://host.docker.internal:4000 \
  polymarket-web
```

## Go-Live Checklist

Before exposing the dashboard publicly:

1. Deploy the trader in `paper` mode first.
2. Verify `/runtime`, `/scanner`, `/paper`, and `/config` respond over HTTPS.
3. Point the web app at the deployed trader with `TRADER_BASE_URL`.
4. Confirm the dashboard shows real runtime warnings when the trader is stale or unreachable.
5. Keep the trader API private or IP-restricted if you do not want scanner and paper metrics exposed publicly.

## Current Boundaries

- public dashboard deployment is supported
- paper-trading deployment is supported
- live order execution is not supported
- live profitability claims are not supported until larger paper-trading samples exist
