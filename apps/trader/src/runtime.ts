import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { Server } from "node:http";

import {
  createLogger,
  initializeDatabase,
  loadTraderConfig,
  openDatabase,
  sanitizeTraderConfig,
  SQLiteAuditRepository,
  type SQLiteConnection,
  type PaperTradingSnapshot,
  type TraderPublicConfig,
  type TraderRuntimeSnapshot,
} from "@polymarket-bot/shared";
import {
  PolymarketExecutionAdapter,
  PolymarketMarketDataAdapter,
  type PolymarketMarketGateway,
  type PolymarketTradingGateway,
} from "@polymarket-bot/polymarket-adapter";

import { createHttpServer } from "./httpServer.js";
import { PaperTradingService } from "./paper/index.js";
import { MarketScannerService } from "./scanner/index.js";

export class TraderRuntime {
  private readonly config = loadTraderConfig();
  private readonly sessionId = randomUUID();
  private readonly startedAt = new Date().toISOString();
  private readonly logger = createLogger("trader", {
    context: {
      sessionId: this.sessionId,
      runMode: this.config.runMode,
    },
  });
  private readonly marketDataAdapter: PolymarketMarketGateway = new PolymarketMarketDataAdapter({
    restUrl: this.config.polymarket.restUrl,
    wsUrl: this.config.polymarket.wsUrl,
    logger: this.logger.child({ component: "market-data-adapter" }),
  });
  private readonly executionAdapter: PolymarketTradingGateway = new PolymarketExecutionAdapter({
    runMode: this.config.runMode,
    logger: this.logger.child({ component: "execution-adapter" }),
  });
  private readonly marketScanner = new MarketScannerService({
    runMode: this.config.runMode,
    marketData: this.marketDataAdapter,
    config: this.config.scanner,
    logger: this.logger.child({ component: "market-scanner" }),
  });
  private readonly paperTrading = new PaperTradingService({
    marketData: this.marketDataAdapter,
    logger: this.logger.child({ component: "paper-trading" }),
  });
  private db?: SQLiteConnection;
  private auditRepository?: SQLiteAuditRepository;
  private server?: Server;
  private scannerUnsubscribe?: () => void;

  async start() {
    mkdirSync(dirname(this.config.databaseUrl), { recursive: true });
    mkdirSync(this.config.dataDir, { recursive: true });

    this.db = openDatabase(this.config.databaseUrl);
    initializeDatabase(this.db);
    this.auditRepository = new SQLiteAuditRepository(this.db);
    this.auditRepository.upsertSession({
      sessionId: this.sessionId,
      source: "trader-runtime",
      runMode: this.config.runMode,
      status: "running",
      startedAt: this.startedAt,
      correlationId: this.sessionId,
      metadata: {
        appEnv: this.config.appEnv,
        dataDir: this.config.dataDir,
        databaseUrl: this.config.databaseUrl,
        liveTradingEnabled: false,
        note: "Runtime audit persistence currently records session/config/scanner metadata only. TODO: wire decision and order persistence when the trading loop exists.",
      },
    });
    this.auditRepository.insertConfigVersion({
      sessionId: this.sessionId,
      configType: "trader_config",
      config: this.config,
      createdAt: this.startedAt,
    });

    this.scannerUnsubscribe = this.marketScanner.subscribe((event) => {
      const correlationId = `scanner:${event.snapshot.scannedAt}`;
      this.logger.info("scanner cycle completed", {
        correlationId,
        scannedAt: event.snapshot.scannedAt,
        acceptedCount: event.snapshot.acceptedCount,
        rejectedCount: event.snapshot.rejectedCount,
        topCandidate: event.snapshot.candidates[0]?.market.slug ?? null,
      });
      this.auditRepository?.insertScannerSnapshot({
        sessionId: this.sessionId,
        correlationId,
        snapshot: event.snapshot,
      });
      this.paperTrading.onScannerSnapshot(event.snapshot);
    });

    try {
      await this.paperTrading.start();
      await this.marketDataAdapter.start();
      await this.marketScanner.start();

      this.server = createHttpServer(
        () => this.getSnapshot(),
        () => this.marketScanner.getSnapshot(),
        () => this.getPaperSnapshot(),
        () => this.getPublicConfig(),
      );
      this.server.listen(this.config.trader.port, this.config.trader.host, () => {
        this.logger.info("trader runtime listening", {
          host: this.config.trader.host,
          port: this.config.trader.port,
          runMode: this.config.runMode,
        });
      });

      this.logger.info("execution adapter scaffolding initialized", {
        adapter: this.executionAdapter.name,
        runMode: this.config.runMode,
        liveTradingEnabled: false,
      });
    } catch (error) {
      await this.paperTrading.stop().catch(() => undefined);
      this.auditRepository?.upsertSession({
        sessionId: this.sessionId,
        source: "trader-runtime",
        runMode: this.config.runMode,
        status: "failed",
        startedAt: this.startedAt,
        endedAt: new Date().toISOString(),
        correlationId: this.sessionId,
        metadata: {
          appEnv: this.config.appEnv,
          error: error instanceof Error ? error.message : String(error),
          liveTradingEnabled: false,
        },
      });
      this.scannerUnsubscribe?.();
      this.scannerUnsubscribe = undefined;
      this.db?.close();
      this.db = undefined;
      this.auditRepository = undefined;
      throw error;
    }
  }

  async stop() {
    await this.paperTrading.stop();
    await this.marketScanner.stop();
    await this.marketDataAdapter.stop();
    this.scannerUnsubscribe?.();
    this.scannerUnsubscribe = undefined;

    await new Promise<void>((resolve, reject) => {
      if (!this.server) {
        resolve();
        return;
      }

      this.server.close((error) => {
        if (error) {
          if ("code" in error && error.code === "ERR_SERVER_NOT_RUNNING") {
            resolve();
            return;
          }
          reject(error);
          return;
        }

        resolve();
      });
    });

    try {
      this.auditRepository?.upsertSession({
        sessionId: this.sessionId,
        source: "trader-runtime",
        runMode: this.config.runMode,
        status: "stopped",
        startedAt: this.startedAt,
        endedAt: new Date().toISOString(),
        correlationId: this.sessionId,
        metadata: {
          finalHealth: this.getSnapshot(),
          liveTradingEnabled: false,
        },
      });
      await this.auditRepository?.exportSession(
        this.sessionId,
        `${this.config.dataDir}/audit/${this.sessionId}`,
      );
    } finally {
      this.db?.close();
      this.db = undefined;
      this.auditRepository = undefined;
    }

    this.logger.info("trader runtime stopped");
  }

  getSnapshot(): TraderRuntimeSnapshot {
    const marketDataStatus = this.marketDataAdapter.getHealth().status;
    const executionStatus = this.executionAdapter.getHealth().status;
    const scannerStatus = this.marketScanner.getStatus();
    const paperTradingStatus = this.paperTrading.getStatus();
    const paperSnapshot = this.paperTrading.getSnapshot();
    const scannerSnapshot = this.marketScanner.getSnapshot();
    const scannerLastUpdatedAt = scannerSnapshot?.scannedAt ?? null;
    const scannerStale =
      this.config.scanner.enabled &&
      (scannerLastUpdatedAt === null ||
        Date.now() - new Date(scannerLastUpdatedAt).getTime() >
          Math.max(this.config.scanner.refreshIntervalMs * 3, 60_000));
    const warnings = [
      ...(marketDataStatus !== "running" ? [`market data status=${marketDataStatus}`] : []),
      ...(this.config.runMode === "live" && executionStatus !== "running"
        ? [`execution status=${executionStatus}`]
        : []),
      ...(this.config.scanner.enabled && scannerStatus !== "running"
        ? [`scanner status=${scannerStatus}`]
        : []),
      ...(paperTradingStatus !== "running" ? [`paper trading status=${paperTradingStatus}`] : []),
      ...(scannerStale ? ["scanner data is stale"] : []),
    ];

    return {
      service: "trader",
      ok: warnings.length === 0,
      runMode: this.config.runMode,
      startedAt: this.startedAt,
      databaseUrl: this.config.databaseUrl,
      traderHost: this.config.trader.host,
      traderPort: this.config.trader.port,
      marketDataStatus,
      executionStatus,
      scannerStatus,
      paperTradingStatus,
      paperTrackedMarkets: paperSnapshot.trackedMarkets,
      paperOpenOrders: paperSnapshot.openOrders,
      paperOpenPositions: paperSnapshot.openPositions,
      paperLastUpdatedAt: paperSnapshot.lastUpdatedAt,
      paperNetPnl: paperSnapshot.netPnl,
      scannerCandidateCount: scannerSnapshot?.acceptedCount ?? 0,
      scannerLastUpdatedAt,
      scannerStale,
      warnings,
    };
  }

  getPaperSnapshot(): PaperTradingSnapshot {
    return this.paperTrading.getSnapshot();
  }

  getPublicConfig(): TraderPublicConfig {
    return sanitizeTraderConfig(this.config);
  }
}
