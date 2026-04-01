import Database from "better-sqlite3";

import { initializeAuditSchema } from "./audit.js";

export type SQLiteConnection = InstanceType<typeof Database>;

export function openDatabase(filename: string): SQLiteConnection {
  const connection = new Database(filename);
  connection.pragma("journal_mode = WAL");
  connection.pragma("foreign_keys = ON");
  return connection;
}

export function initializeDatabase(db: SQLiteConnection): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS runtime_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_mode TEXT NOT NULL,
      started_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_order_id TEXT NOT NULL UNIQUE,
      market_id TEXT NOT NULL,
      outcome_token_id TEXT NOT NULL,
      side TEXT NOT NULL,
      price REAL NOT NULL,
      size REAL NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS fills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT NOT NULL,
      market_id TEXT NOT NULL,
      outcome_token_id TEXT NOT NULL,
      side TEXT NOT NULL,
      price REAL NOT NULL,
      size REAL NOT NULL,
      fee REAL NOT NULL,
      liquidity TEXT NOT NULL,
      ts TEXT NOT NULL
    );
  `);
  initializeAuditSchema(db);
}
