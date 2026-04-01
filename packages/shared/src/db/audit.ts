import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import Database from "better-sqlite3";

import type { MarketScannerSnapshot, RunMode } from "../types/index.js";

type SQLiteConnection = InstanceType<typeof Database>;

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

type JsonLike = JsonValue | Record<string, unknown> | unknown[] | undefined;

export type AuditRunSessionInput = {
  sessionId: string;
  source: string;
  runMode: RunMode;
  status: "running" | "completed" | "failed" | "stopped";
  startedAt: string;
  endedAt?: string | null;
  correlationId?: string | null;
  metadata?: JsonLike | null;
};

export type AuditConfigVersionInput = {
  sessionId: string;
  configType: string;
  config: JsonLike;
  createdAt: string;
};

export type AuditMarketSnapshotSummaryInput = {
  sessionId: string;
  runLabel?: string | null;
  correlationId?: string | null;
  ts: number;
  marketId: string;
  outcomeTokenId: string;
  source: string;
  eventType: string;
  sequence?: number | null;
  bestBid: number | null;
  bestAsk: number | null;
  midpoint: number | null;
  spread: number | null;
  topBidSize?: number | null;
  topAskSize?: number | null;
  topBookDepth: number | null;
  summary?: JsonLike | null;
};

export type AuditFeatureSnapshotInput = {
  sessionId: string;
  runLabel?: string | null;
  decisionId: string;
  correlationId?: string | null;
  ts: number;
  marketId: string;
  outcomeTokenId: string;
  features: JsonLike;
};

export type AuditStrategyDecisionInput = {
  sessionId: string;
  runLabel?: string | null;
  decisionId: string;
  correlationId?: string | null;
  ts: number;
  marketId: string;
  outcomeTokenId: string;
  actionType: string;
  side: string | null;
  heuristicScore: number;
  confidence: number;
  estimatedFairValue: number | null;
  estimatedEdge: number | null;
  targetEntryPrice: number | null;
  targetSize: number;
  reasonCodes: string[];
  metadata: JsonLike;
};

export type AuditRiskDecisionInput = {
  sessionId: string;
  runLabel?: string | null;
  decisionId: string;
  correlationId?: string | null;
  ts: number;
  action: string;
  approved: boolean;
  reasonCodes: string[];
  metadata: JsonLike;
};

export type AuditOrderLifecycleEventInput = {
  sessionId: string;
  runLabel?: string | null;
  correlationId?: string | null;
  eventType: string;
  ts: number;
  orderId?: string | null;
  clientOrderId?: string | null;
  marketId?: string | null;
  outcomeTokenId?: string | null;
  side?: string | null;
  status?: string | null;
  reason?: string | null;
  payload: JsonLike;
};

export type AuditFillInput = {
  sessionId: string;
  runLabel?: string | null;
  correlationId?: string | null;
  fillId: string;
  orderId: string;
  clientOrderId: string;
  marketId: string;
  outcomeTokenId: string;
  side: string;
  price: number;
  size: number;
  fee: number;
  liquidity: string;
  ts: number;
  aggressiveExit: boolean;
  fillConfidence: string;
  remainingOrderSize: number;
  payload: JsonLike;
};

export type AuditPositionSnapshotInput = {
  sessionId: string;
  runLabel?: string | null;
  correlationId?: string | null;
  snapshotId: string;
  ts: number;
  marketId: string;
  outcomeTokenId: string;
  size: number;
  averageEntryPrice: number | null;
  realizedPnl: number;
  unrealizedPnl: number;
  markPrice: number | null;
  totalFees?: number | null;
  openTradeId?: string | null;
  payload?: JsonLike | null;
};

export type AuditPnlSnapshotInput = {
  sessionId: string;
  runLabel?: string | null;
  correlationId?: string | null;
  ts: number;
  realizedPnl: number;
  unrealizedPnl: number;
  equity: number;
  drawdown?: number | null;
  payload?: JsonLike | null;
};

export type AuditScannerSnapshotInput = {
  sessionId: string;
  correlationId?: string | null;
  snapshot: MarketScannerSnapshot;
};

function normalizeJsonLike(value: unknown): JsonValue {
  if (value === undefined) {
    return null;
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeJsonLike(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .filter(([, nextValue]) => nextValue !== undefined)
        .map(([key, nextValue]) => [key, normalizeJsonLike(nextValue)]),
    ) as JsonValue;
  }

  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  return null;
}

export function stableJsonStringify(value: JsonLike): string {
  return JSON.stringify(normalizeJsonLike(value));
}

function configVersionFor(config: JsonLike): string {
  return createHash("sha256").update(stableJsonStringify(config)).digest("hex");
}

function csvEscape(value: string | number | boolean | null | undefined): string {
  const stringValue = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function toCsv(rows: Record<string, string | number | boolean | null | undefined>[]): string {
  if (rows.length === 0) {
    return "";
  }

  const headers = Object.keys(rows[0]);
  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(",")),
  ].join("\n");
}

function isoTs(ts: number): string {
  return new Date(ts).toISOString();
}

function normalizeTableRows(
  rows: Record<string, unknown>[],
): Record<string, string | number | boolean | null | undefined>[] {
  return rows.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([key, value]) => [
        key,
        typeof value === "bigint" ? Number(value) : (value as string | number | boolean | null | undefined),
      ]),
    ),
  );
}

export function initializeAuditSchema(db: SQLiteConnection): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_sessions (
      session_id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      run_mode TEXT NOT NULL,
      status TEXT NOT NULL,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      correlation_id TEXT,
      metadata_json TEXT
    );

    CREATE TABLE IF NOT EXISTS audit_config_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      config_type TEXT NOT NULL,
      config_version TEXT NOT NULL,
      config_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(session_id, config_type, config_version)
    );

    CREATE TABLE IF NOT EXISTS audit_market_snapshot_summaries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      run_label TEXT,
      correlation_id TEXT,
      ts INTEGER NOT NULL,
      iso_ts TEXT NOT NULL,
      market_id TEXT NOT NULL,
      outcome_token_id TEXT NOT NULL,
      source TEXT NOT NULL,
      event_type TEXT NOT NULL,
      sequence INTEGER,
      best_bid REAL,
      best_ask REAL,
      midpoint REAL,
      spread REAL,
      top_bid_size REAL,
      top_ask_size REAL,
      top_book_depth REAL,
      summary_json TEXT
    );

    CREATE TABLE IF NOT EXISTS audit_feature_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      run_label TEXT,
      decision_id TEXT NOT NULL,
      correlation_id TEXT,
      ts INTEGER NOT NULL,
      iso_ts TEXT NOT NULL,
      market_id TEXT NOT NULL,
      outcome_token_id TEXT NOT NULL,
      features_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_strategy_decisions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      run_label TEXT,
      decision_id TEXT NOT NULL,
      correlation_id TEXT,
      ts INTEGER NOT NULL,
      iso_ts TEXT NOT NULL,
      market_id TEXT NOT NULL,
      outcome_token_id TEXT NOT NULL,
      action_type TEXT NOT NULL,
      side TEXT,
      heuristic_score REAL NOT NULL,
      confidence REAL NOT NULL,
      estimated_fair_value REAL,
      estimated_edge REAL,
      target_entry_price REAL,
      target_size REAL NOT NULL,
      reason_codes_json TEXT NOT NULL,
      metadata_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_risk_decisions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      run_label TEXT,
      decision_id TEXT NOT NULL,
      correlation_id TEXT,
      ts INTEGER NOT NULL,
      iso_ts TEXT NOT NULL,
      action TEXT NOT NULL,
      approved INTEGER NOT NULL,
      reason_codes_json TEXT NOT NULL,
      metadata_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_order_lifecycle_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      run_label TEXT,
      correlation_id TEXT,
      event_type TEXT NOT NULL,
      ts INTEGER NOT NULL,
      iso_ts TEXT NOT NULL,
      order_id TEXT,
      client_order_id TEXT,
      market_id TEXT,
      outcome_token_id TEXT,
      side TEXT,
      status TEXT,
      reason TEXT,
      payload_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_fills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      run_label TEXT,
      correlation_id TEXT,
      fill_id TEXT NOT NULL,
      order_id TEXT NOT NULL,
      client_order_id TEXT NOT NULL,
      market_id TEXT NOT NULL,
      outcome_token_id TEXT NOT NULL,
      side TEXT NOT NULL,
      price REAL NOT NULL,
      size REAL NOT NULL,
      fee REAL NOT NULL,
      liquidity TEXT NOT NULL,
      ts INTEGER NOT NULL,
      iso_ts TEXT NOT NULL,
      aggressive_exit INTEGER NOT NULL,
      fill_confidence TEXT NOT NULL,
      remaining_order_size REAL NOT NULL,
      payload_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_position_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      run_label TEXT,
      correlation_id TEXT,
      snapshot_id TEXT NOT NULL,
      ts INTEGER NOT NULL,
      iso_ts TEXT NOT NULL,
      market_id TEXT NOT NULL,
      outcome_token_id TEXT NOT NULL,
      size REAL NOT NULL,
      average_entry_price REAL,
      realized_pnl REAL NOT NULL,
      unrealized_pnl REAL NOT NULL,
      mark_price REAL,
      total_fees REAL,
      open_trade_id TEXT,
      payload_json TEXT
    );

    CREATE TABLE IF NOT EXISTS audit_pnl_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      run_label TEXT,
      correlation_id TEXT,
      ts INTEGER NOT NULL,
      iso_ts TEXT NOT NULL,
      realized_pnl REAL NOT NULL,
      unrealized_pnl REAL NOT NULL,
      equity REAL NOT NULL,
      drawdown REAL,
      payload_json TEXT
    );

    CREATE TABLE IF NOT EXISTS audit_scanner_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      correlation_id TEXT,
      scanned_at TEXT NOT NULL,
      cycle_duration_ms REAL NOT NULL,
      total_markets INTEGER NOT NULL,
      accepted_count INTEGER NOT NULL,
      rejected_count INTEGER NOT NULL,
      snapshot_json TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_audit_market_snapshot_session_ts
      ON audit_market_snapshot_summaries(session_id, ts);
    CREATE INDEX IF NOT EXISTS idx_audit_feature_snapshot_session_decision
      ON audit_feature_snapshots(session_id, decision_id);
    CREATE INDEX IF NOT EXISTS idx_audit_strategy_decision_session_decision
      ON audit_strategy_decisions(session_id, decision_id);
    CREATE INDEX IF NOT EXISTS idx_audit_risk_decision_session_decision
      ON audit_risk_decisions(session_id, decision_id);
    CREATE INDEX IF NOT EXISTS idx_audit_order_lifecycle_session_ts
      ON audit_order_lifecycle_events(session_id, ts);
    CREATE INDEX IF NOT EXISTS idx_audit_fill_session_ts
      ON audit_fills(session_id, ts);
    CREATE INDEX IF NOT EXISTS idx_audit_position_snapshot_session_ts
      ON audit_position_snapshots(session_id, ts);
    CREATE INDEX IF NOT EXISTS idx_audit_pnl_snapshot_session_ts
      ON audit_pnl_snapshots(session_id, ts);
    CREATE INDEX IF NOT EXISTS idx_audit_scanner_snapshot_session_time
      ON audit_scanner_snapshots(session_id, scanned_at);
  `);
}

export class SQLiteAuditRepository {
  private readonly exportableTables = [
    "audit_sessions",
    "audit_config_versions",
    "audit_market_snapshot_summaries",
    "audit_feature_snapshots",
    "audit_strategy_decisions",
    "audit_risk_decisions",
    "audit_order_lifecycle_events",
    "audit_fills",
    "audit_position_snapshots",
    "audit_pnl_snapshots",
    "audit_scanner_snapshots",
  ] as const;

  constructor(private readonly db: SQLiteConnection) {}

  upsertSession(input: AuditRunSessionInput): void {
    this.db
      .prepare(
        `
          INSERT INTO audit_sessions (
            session_id,
            source,
            run_mode,
            status,
            started_at,
            ended_at,
            correlation_id,
            metadata_json
          ) VALUES (
            @session_id,
            @source,
            @run_mode,
            @status,
            @started_at,
            @ended_at,
            @correlation_id,
            @metadata_json
          )
          ON CONFLICT(session_id) DO UPDATE SET
            status = excluded.status,
            ended_at = excluded.ended_at,
            correlation_id = excluded.correlation_id,
            metadata_json = excluded.metadata_json
        `,
      )
      .run({
        session_id: input.sessionId,
        source: input.source,
        run_mode: input.runMode,
        status: input.status,
        started_at: input.startedAt,
        ended_at: input.endedAt ?? null,
        correlation_id: input.correlationId ?? null,
        metadata_json: input.metadata ? stableJsonStringify(input.metadata) : null,
      });
  }

  insertConfigVersion(input: AuditConfigVersionInput): string {
    const configVersion = configVersionFor(input.config);
    this.db
      .prepare(
        `
          INSERT OR IGNORE INTO audit_config_versions (
            session_id,
            config_type,
            config_version,
            config_json,
            created_at
          ) VALUES (
            @session_id,
            @config_type,
            @config_version,
            @config_json,
            @created_at
          )
        `,
      )
      .run({
        session_id: input.sessionId,
        config_type: input.configType,
        config_version: configVersion,
        config_json: stableJsonStringify(input.config),
        created_at: input.createdAt,
      });
    return configVersion;
  }

  insertMarketSnapshotSummary(input: AuditMarketSnapshotSummaryInput): void {
    this.db
      .prepare(
        `
          INSERT INTO audit_market_snapshot_summaries (
            session_id,
            run_label,
            correlation_id,
            ts,
            iso_ts,
            market_id,
            outcome_token_id,
            source,
            event_type,
            sequence,
            best_bid,
            best_ask,
            midpoint,
            spread,
            top_bid_size,
            top_ask_size,
            top_book_depth,
            summary_json
          ) VALUES (
            @session_id,
            @run_label,
            @correlation_id,
            @ts,
            @iso_ts,
            @market_id,
            @outcome_token_id,
            @source,
            @event_type,
            @sequence,
            @best_bid,
            @best_ask,
            @midpoint,
            @spread,
            @top_bid_size,
            @top_ask_size,
            @top_book_depth,
            @summary_json
          )
        `,
      )
      .run({
        session_id: input.sessionId,
        run_label: input.runLabel ?? null,
        correlation_id: input.correlationId ?? null,
        ts: input.ts,
        iso_ts: isoTs(input.ts),
        market_id: input.marketId,
        outcome_token_id: input.outcomeTokenId,
        source: input.source,
        event_type: input.eventType,
        sequence: input.sequence ?? null,
        best_bid: input.bestBid,
        best_ask: input.bestAsk,
        midpoint: input.midpoint,
        spread: input.spread,
        top_bid_size: input.topBidSize ?? null,
        top_ask_size: input.topAskSize ?? null,
        top_book_depth: input.topBookDepth,
        summary_json: input.summary ? stableJsonStringify(input.summary) : null,
      });
  }

  insertFeatureSnapshot(input: AuditFeatureSnapshotInput): void {
    this.db
      .prepare(
        `
          INSERT INTO audit_feature_snapshots (
            session_id,
            run_label,
            decision_id,
            correlation_id,
            ts,
            iso_ts,
            market_id,
            outcome_token_id,
            features_json
          ) VALUES (
            @session_id,
            @run_label,
            @decision_id,
            @correlation_id,
            @ts,
            @iso_ts,
            @market_id,
            @outcome_token_id,
            @features_json
          )
        `,
      )
      .run({
        session_id: input.sessionId,
        run_label: input.runLabel ?? null,
        decision_id: input.decisionId,
        correlation_id: input.correlationId ?? null,
        ts: input.ts,
        iso_ts: isoTs(input.ts),
        market_id: input.marketId,
        outcome_token_id: input.outcomeTokenId,
        features_json: stableJsonStringify(input.features),
      });
  }

  insertStrategyDecision(input: AuditStrategyDecisionInput): void {
    this.db
      .prepare(
        `
          INSERT INTO audit_strategy_decisions (
            session_id,
            run_label,
            decision_id,
            correlation_id,
            ts,
            iso_ts,
            market_id,
            outcome_token_id,
            action_type,
            side,
            heuristic_score,
            confidence,
            estimated_fair_value,
            estimated_edge,
            target_entry_price,
            target_size,
            reason_codes_json,
            metadata_json
          ) VALUES (
            @session_id,
            @run_label,
            @decision_id,
            @correlation_id,
            @ts,
            @iso_ts,
            @market_id,
            @outcome_token_id,
            @action_type,
            @side,
            @heuristic_score,
            @confidence,
            @estimated_fair_value,
            @estimated_edge,
            @target_entry_price,
            @target_size,
            @reason_codes_json,
            @metadata_json
          )
        `,
      )
      .run({
        session_id: input.sessionId,
        run_label: input.runLabel ?? null,
        decision_id: input.decisionId,
        correlation_id: input.correlationId ?? null,
        ts: input.ts,
        iso_ts: isoTs(input.ts),
        market_id: input.marketId,
        outcome_token_id: input.outcomeTokenId,
        action_type: input.actionType,
        side: input.side,
        heuristic_score: input.heuristicScore,
        confidence: input.confidence,
        estimated_fair_value: input.estimatedFairValue,
        estimated_edge: input.estimatedEdge,
        target_entry_price: input.targetEntryPrice,
        target_size: input.targetSize,
        reason_codes_json: stableJsonStringify(input.reasonCodes),
        metadata_json: stableJsonStringify(input.metadata),
      });
  }

  insertRiskDecision(input: AuditRiskDecisionInput): void {
    this.db
      .prepare(
        `
          INSERT INTO audit_risk_decisions (
            session_id,
            run_label,
            decision_id,
            correlation_id,
            ts,
            iso_ts,
            action,
            approved,
            reason_codes_json,
            metadata_json
          ) VALUES (
            @session_id,
            @run_label,
            @decision_id,
            @correlation_id,
            @ts,
            @iso_ts,
            @action,
            @approved,
            @reason_codes_json,
            @metadata_json
          )
        `,
      )
      .run({
        session_id: input.sessionId,
        run_label: input.runLabel ?? null,
        decision_id: input.decisionId,
        correlation_id: input.correlationId ?? null,
        ts: input.ts,
        iso_ts: isoTs(input.ts),
        action: input.action,
        approved: input.approved ? 1 : 0,
        reason_codes_json: stableJsonStringify(input.reasonCodes),
        metadata_json: stableJsonStringify(input.metadata),
      });
  }

  insertOrderLifecycleEvent(input: AuditOrderLifecycleEventInput): void {
    this.db
      .prepare(
        `
          INSERT INTO audit_order_lifecycle_events (
            session_id,
            run_label,
            correlation_id,
            event_type,
            ts,
            iso_ts,
            order_id,
            client_order_id,
            market_id,
            outcome_token_id,
            side,
            status,
            reason,
            payload_json
          ) VALUES (
            @session_id,
            @run_label,
            @correlation_id,
            @event_type,
            @ts,
            @iso_ts,
            @order_id,
            @client_order_id,
            @market_id,
            @outcome_token_id,
            @side,
            @status,
            @reason,
            @payload_json
          )
        `,
      )
      .run({
        session_id: input.sessionId,
        run_label: input.runLabel ?? null,
        correlation_id: input.correlationId ?? null,
        event_type: input.eventType,
        ts: input.ts,
        iso_ts: isoTs(input.ts),
        order_id: input.orderId ?? null,
        client_order_id: input.clientOrderId ?? null,
        market_id: input.marketId ?? null,
        outcome_token_id: input.outcomeTokenId ?? null,
        side: input.side ?? null,
        status: input.status ?? null,
        reason: input.reason ?? null,
        payload_json: stableJsonStringify(input.payload),
      });
  }

  insertFill(input: AuditFillInput): void {
    this.db
      .prepare(
        `
          INSERT INTO audit_fills (
            session_id,
            run_label,
            correlation_id,
            fill_id,
            order_id,
            client_order_id,
            market_id,
            outcome_token_id,
            side,
            price,
            size,
            fee,
            liquidity,
            ts,
            iso_ts,
            aggressive_exit,
            fill_confidence,
            remaining_order_size,
            payload_json
          ) VALUES (
            @session_id,
            @run_label,
            @correlation_id,
            @fill_id,
            @order_id,
            @client_order_id,
            @market_id,
            @outcome_token_id,
            @side,
            @price,
            @size,
            @fee,
            @liquidity,
            @ts,
            @iso_ts,
            @aggressive_exit,
            @fill_confidence,
            @remaining_order_size,
            @payload_json
          )
        `,
      )
      .run({
        session_id: input.sessionId,
        run_label: input.runLabel ?? null,
        correlation_id: input.correlationId ?? null,
        fill_id: input.fillId,
        order_id: input.orderId,
        client_order_id: input.clientOrderId,
        market_id: input.marketId,
        outcome_token_id: input.outcomeTokenId,
        side: input.side,
        price: input.price,
        size: input.size,
        fee: input.fee,
        liquidity: input.liquidity,
        ts: input.ts,
        iso_ts: isoTs(input.ts),
        aggressive_exit: input.aggressiveExit ? 1 : 0,
        fill_confidence: input.fillConfidence,
        remaining_order_size: input.remainingOrderSize,
        payload_json: stableJsonStringify(input.payload),
      });
  }

  insertPositionSnapshot(input: AuditPositionSnapshotInput): void {
    this.db
      .prepare(
        `
          INSERT INTO audit_position_snapshots (
            session_id,
            run_label,
            correlation_id,
            snapshot_id,
            ts,
            iso_ts,
            market_id,
            outcome_token_id,
            size,
            average_entry_price,
            realized_pnl,
            unrealized_pnl,
            mark_price,
            total_fees,
            open_trade_id,
            payload_json
          ) VALUES (
            @session_id,
            @run_label,
            @correlation_id,
            @snapshot_id,
            @ts,
            @iso_ts,
            @market_id,
            @outcome_token_id,
            @size,
            @average_entry_price,
            @realized_pnl,
            @unrealized_pnl,
            @mark_price,
            @total_fees,
            @open_trade_id,
            @payload_json
          )
        `,
      )
      .run({
        session_id: input.sessionId,
        run_label: input.runLabel ?? null,
        correlation_id: input.correlationId ?? null,
        snapshot_id: input.snapshotId,
        ts: input.ts,
        iso_ts: isoTs(input.ts),
        market_id: input.marketId,
        outcome_token_id: input.outcomeTokenId,
        size: input.size,
        average_entry_price: input.averageEntryPrice,
        realized_pnl: input.realizedPnl,
        unrealized_pnl: input.unrealizedPnl,
        mark_price: input.markPrice,
        total_fees: input.totalFees ?? null,
        open_trade_id: input.openTradeId ?? null,
        payload_json: input.payload ? stableJsonStringify(input.payload) : null,
      });
  }

  insertPnlSnapshot(input: AuditPnlSnapshotInput): void {
    this.db
      .prepare(
        `
          INSERT INTO audit_pnl_snapshots (
            session_id,
            run_label,
            correlation_id,
            ts,
            iso_ts,
            realized_pnl,
            unrealized_pnl,
            equity,
            drawdown,
            payload_json
          ) VALUES (
            @session_id,
            @run_label,
            @correlation_id,
            @ts,
            @iso_ts,
            @realized_pnl,
            @unrealized_pnl,
            @equity,
            @drawdown,
            @payload_json
          )
        `,
      )
      .run({
        session_id: input.sessionId,
        run_label: input.runLabel ?? null,
        correlation_id: input.correlationId ?? null,
        ts: input.ts,
        iso_ts: isoTs(input.ts),
        realized_pnl: input.realizedPnl,
        unrealized_pnl: input.unrealizedPnl,
        equity: input.equity,
        drawdown: input.drawdown ?? null,
        payload_json: input.payload ? stableJsonStringify(input.payload) : null,
      });
  }

  insertScannerSnapshot(input: AuditScannerSnapshotInput): void {
    this.db
      .prepare(
        `
          INSERT INTO audit_scanner_snapshots (
            session_id,
            correlation_id,
            scanned_at,
            cycle_duration_ms,
            total_markets,
            accepted_count,
            rejected_count,
            snapshot_json
          ) VALUES (
            @session_id,
            @correlation_id,
            @scanned_at,
            @cycle_duration_ms,
            @total_markets,
            @accepted_count,
            @rejected_count,
            @snapshot_json
          )
        `,
      )
      .run({
        session_id: input.sessionId,
        correlation_id: input.correlationId ?? null,
        scanned_at: input.snapshot.scannedAt,
        cycle_duration_ms: input.snapshot.cycleDurationMs,
        total_markets: input.snapshot.totalMarkets,
        accepted_count: input.snapshot.acceptedCount,
        rejected_count: input.snapshot.rejectedCount,
        snapshot_json: stableJsonStringify(input.snapshot as unknown as JsonValue),
      });
  }

  listRowsForSession(tableName: (typeof this.exportableTables)[number], sessionId: string): Record<string, unknown>[] {
    return this.db
      .prepare(`SELECT * FROM ${tableName} WHERE session_id = ? ORDER BY rowid ASC`)
      .all(sessionId) as Record<string, unknown>[];
  }

  async exportSession(sessionId: string, outputDir: string): Promise<void> {
    await mkdir(outputDir, { recursive: true });

    for (const tableName of this.exportableTables) {
      const rows = normalizeTableRows(this.listRowsForSession(tableName, sessionId));
      await writeFile(
        path.join(outputDir, `${tableName}.json`),
        `${JSON.stringify(rows, null, 2)}\n`,
        "utf8",
      );
      await writeFile(path.join(outputDir, `${tableName}.csv`), toCsv(rows), "utf8");
    }
  }
}
