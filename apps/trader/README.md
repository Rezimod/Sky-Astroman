# apps/trader

Bootable Node/TypeScript daemon for the Polymarket trading runtime.

## Current Scope

- validates runtime config
- initializes SQLite for MVP audit persistence
- emits structured JSON logs to stdout / stderr
- persists runtime session metadata, config versions, and scanner snapshots for later export
- exposes health endpoints over HTTP
- wires placeholder Polymarket market data and execution adapters
- runs a market scanner that ranks tradable candidate markets for paper mode first
- hard-disables incomplete live trading mode until authenticated order flow is implemented

## Audit Notes

- Runtime audit exports are written under `DATA_DIR/audit/<sessionId>`.
- Structured logs are line-delimited JSON. Rotation is intentionally left to the process manager or container runtime for this MVP.
- Decision, order, fill, and position persistence in the runtime is still a TODO because the live trading loop is not wired through yet. The current runtime should not be interpreted as live-ready.

## Commands

```bash
npm run dev -w @polymarket-bot/trader
npm run build -w @polymarket-bot/trader
```
