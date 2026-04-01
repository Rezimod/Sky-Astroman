import type {
  LoggerLike,
  MarketDescriptor,
  MarketScannerConfig,
  MarketScannerDecision,
  MarketScannerSnapshot,
  MarketScannerUpdateEvent,
  MarketStreamEvent,
  RunMode,
  ServiceStatus,
} from "@polymarket-bot/shared";
import { createLogger } from "@polymarket-bot/shared";
import type {
  OrderBookSubscriptionHandle,
  PolymarketMarketGateway,
} from "@polymarket-bot/polymarket-adapter";

import { evaluateMarketOutcome } from "./scoring.js";

type ScannerListener = (event: MarketScannerUpdateEvent) => void;

type MarketScannerServiceOptions = {
  runMode: RunMode;
  marketData: PolymarketMarketGateway;
  config: MarketScannerConfig;
  logger?: LoggerLike;
};

export class MarketScannerService {
  private readonly logger: LoggerLike;
  private readonly listeners = new Set<ScannerListener>();
  private readonly updateTimestampsByToken = new Map<string, number[]>();
  private status: ServiceStatus = "idle";
  private timer?: NodeJS.Timeout;
  private activeRefresh?: Promise<void>;
  private subscription?: OrderBookSubscriptionHandle;
  private lastSnapshot: MarketScannerSnapshot | null = null;
  private trackedTokenKey = "";

  constructor(private readonly options: MarketScannerServiceOptions) {
    this.logger = options.logger ?? createLogger("market-scanner");
  }

  async start() {
    if (!this.options.config.enabled) {
      this.status = "stopped";
      this.logger.info("market scanner disabled by config");
      return;
    }

    this.status = "running";
    await this.refresh();
    this.scheduleNext();
  }

  async stop() {
    if (this.timer) {
      clearTimeout(this.timer);
    }

    if (this.subscription) {
      await this.subscription.close();
      this.subscription = undefined;
    }

    this.status = "stopped";
  }

  getStatus(): ServiceStatus {
    return this.status;
  }

  getSnapshot(): MarketScannerSnapshot | null {
    return this.lastSnapshot;
  }

  subscribe(listener: ScannerListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async refresh() {
    if (this.activeRefresh) {
      return this.activeRefresh;
    }

    this.activeRefresh = this.runRefresh().finally(() => {
      this.activeRefresh = undefined;
    });

    return this.activeRefresh;
  }

  private scheduleNext() {
    if (!this.options.config.enabled) {
      return;
    }

    this.timer = setTimeout(async () => {
      try {
        await this.refresh();
      } finally {
        this.scheduleNext();
      }
    }, this.options.config.refreshIntervalMs);
  }

  private async runRefresh() {
    const startedAt = Date.now();
    const scannedAt = new Date(startedAt).toISOString();
    const markets = await this.options.marketData.listActiveCandidateMarkets({
      limit: this.options.config.marketLimit,
    });

    await this.ensureSubscription(markets);

    const accepted: MarketScannerDecision[] = [];
    const rejected: MarketScannerDecision[] = [];

    for (const market of markets) {
      const decision = await this.evaluateMarket(market, scannedAt);
      if (!decision) {
        continue;
      }

      if (decision.accepted) {
        accepted.push(decision);
        this.logger.info("scanner accepted market", {
          marketId: market.marketId,
          tokenId: decision.selectedOutcome.tokenId,
          score: decision.score,
          spreadCents: decision.metrics.spreadCents,
          topBookDepth: decision.metrics.topBookDepth,
          updatesPerMinute: decision.metrics.recentUpdatesPerMinute,
        });
      } else {
        rejected.push(decision);
        this.logger.info("scanner rejected market", {
          marketId: market.marketId,
          tokenId: decision.selectedOutcome.tokenId,
          reasons: decision.reasons,
          spreadCents: decision.metrics.spreadCents,
          topBookDepth: decision.metrics.topBookDepth,
          updatesPerMinute: decision.metrics.recentUpdatesPerMinute,
        });
      }
    }

    accepted.sort((left, right) => right.score - left.score);
    const ranked = accepted.slice(0, this.options.config.maxCandidates).map((candidate, index) => ({
      ...candidate,
      rank: index + 1,
    }));

    const snapshot: MarketScannerSnapshot = {
      scannedAt,
      cycleDurationMs: Date.now() - startedAt,
      totalMarkets: markets.length,
      acceptedCount: ranked.length,
      rejectedCount: rejected.length,
      candidates: ranked,
      rejected,
    };

    this.lastSnapshot = snapshot;
    this.emit({
      type: "market_scanner.updated",
      snapshot,
    });
  }

  private async evaluateMarket(
    market: MarketDescriptor,
    scannedAt: string,
  ): Promise<MarketScannerDecision | null> {
    const decisions: MarketScannerDecision[] = [];

    for (const outcome of market.outcomes) {
      if (!outcome.tokenId) {
        continue;
      }

      try {
        const snapshot = await this.options.marketData.fetchOrderBook(
          outcome.tokenId,
          market.marketId,
        );
        const decision = evaluateMarketOutcome({
          market,
          outcome,
          snapshot,
          recentUpdatesPerMinute: this.getRecentUpdatesPerMinute(outcome.tokenId),
          config: this.options.config,
          scannedAt,
        });
        decisions.push(decision);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown orderbook error";
        this.logger.warn("failed to fetch orderbook for scanner", {
          marketId: market.marketId,
          tokenId: outcome.tokenId,
          error: message,
        });
      }
    }

    if (decisions.length === 0) {
      return null;
    }

    const accepted = decisions.filter((decision) => decision.accepted);
    const pool = accepted.length > 0 ? accepted : decisions;
    pool.sort((left, right) => right.score - left.score);
    return pool[0];
  }

  private async ensureSubscription(markets: MarketDescriptor[]) {
    const tokenIds = [
      ...new Set(
        markets
          .flatMap((market) => market.outcomes.map((outcome) => outcome.tokenId))
          .filter(Boolean),
      ),
    ];
    const tokenKey = tokenIds.slice().sort().join(",");

    if (tokenIds.length === 0 || tokenKey === this.trackedTokenKey) {
      return;
    }

    if (this.subscription) {
      await this.subscription.close();
    }

    this.subscription = await this.options.marketData.subscribeToOrderBook({
      tokenIds,
      onEvent: (event) => {
        this.recordActivity(event);
      },
      onStatusChange: (status) => {
        this.logger.info("scanner orderbook subscription status", { status });
      },
      onError: (error) => {
        this.logger.error("scanner orderbook subscription error", {
          error: error.message,
        });
      },
    });
    this.trackedTokenKey = tokenKey;
  }

  private recordActivity(event: MarketStreamEvent) {
    const timestamps = this.updateTimestampsByToken.get(event.outcomeTokenId) ?? [];
    timestamps.push(Date.now());
    this.updateTimestampsByToken.set(
      event.outcomeTokenId,
      timestamps.filter(
        (timestamp) => Date.now() - timestamp <= this.options.config.activityWindowMs,
      ),
    );
  }

  private getRecentUpdatesPerMinute(tokenId: string): number {
    const timestamps = this.updateTimestampsByToken.get(tokenId) ?? [];
    const active = timestamps.filter(
      (timestamp) => Date.now() - timestamp <= this.options.config.activityWindowMs,
    );
    this.updateTimestampsByToken.set(tokenId, active);

    return Number(
      (active.length / Math.max(this.options.config.activityWindowMs / 60_000, 1)).toFixed(3),
    );
  }

  private emit(event: MarketScannerUpdateEvent) {
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}
