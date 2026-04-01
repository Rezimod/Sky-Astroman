import {
  initializeDatabase,
  openDatabase,
  SQLiteAuditRepository,
  type PaperBrokerEvent,
  type PaperPosition,
} from "@polymarket-bot/shared";

import type {
  BacktestResolvedConfig,
  BacktestRunReport,
  BacktestSessionConfig,
  BacktestSummary,
} from "./types.js";

function reportFinalTs(report: BacktestRunReport): number {
  return (
    report.equityCurve[report.equityCurve.length - 1]?.ts ??
    report.fills[report.fills.length - 1]?.ts ??
    report.brokerEvents[report.brokerEvents.length - 1]?.ts ??
    0
  );
}

function collectReports(
  summary: BacktestSummary,
  options: {
    persistSweepResults: boolean;
    persistWalkForwardResults: boolean;
  },
): BacktestRunReport[] {
  const reports = new Map<string, BacktestRunReport>();
  reports.set(summary.bestRun.label, summary.bestRun);

  if (options.persistSweepResults) {
    for (const result of summary.sweepResults) {
      reports.set(result.report.label, result.report);
    }
  }

  if (options.persistWalkForwardResults) {
    for (const foldResult of summary.walkForwardResults) {
      reports.set(foldResult.trainReport.label, foldResult.trainReport);
      reports.set(foldResult.testReport.label, foldResult.testReport);
    }
  }

  return [...reports.values()];
}

function insertOrderLifecycleEvent(
  repository: SQLiteAuditRepository,
  sessionId: string,
  runLabel: string,
  event: PaperBrokerEvent,
): void {
  switch (event.type) {
    case "order_opened":
      repository.insertOrderLifecycleEvent({
        sessionId,
        runLabel,
        correlationId: event.order.orderId,
        eventType: event.type,
        ts: event.ts,
        orderId: event.order.orderId,
        clientOrderId: event.order.clientOrderId,
        marketId: event.order.marketId,
        outcomeTokenId: event.order.outcomeTokenId,
        side: event.order.side,
        status: event.order.status,
        payload: {
          order: event.order,
        },
      });
      return;
    case "order_canceled":
      repository.insertOrderLifecycleEvent({
        sessionId,
        runLabel,
        correlationId: event.orderId,
        eventType: event.type,
        ts: event.ts,
        orderId: event.orderId,
        reason: event.reason,
        payload: {
          reason: event.reason,
        },
      });
      return;
    case "order_replaced":
      repository.insertOrderLifecycleEvent({
        sessionId,
        runLabel,
        correlationId: event.nextOrderId,
        eventType: event.type,
        ts: event.ts,
        orderId: event.previousOrderId,
        clientOrderId: null,
        reason: "replaced",
        payload: {
          previousOrderId: event.previousOrderId,
          nextOrderId: event.nextOrderId,
        },
      });
      return;
    case "fill_recorded":
      repository.insertOrderLifecycleEvent({
        sessionId,
        runLabel,
        correlationId: event.fill.fillId,
        eventType: event.type,
        ts: event.ts,
        orderId: event.fill.orderId,
        clientOrderId: event.fill.clientOrderId,
        marketId: event.fill.marketId,
        outcomeTokenId: event.fill.outcomeTokenId,
        side: event.fill.side,
        payload: {
          fill: event.fill,
        },
      });
      return;
    case "position_marked":
      repository.insertOrderLifecycleEvent({
        sessionId,
        runLabel,
        correlationId: `${event.marketId}:${event.outcomeTokenId}:${event.ts}`,
        eventType: event.type,
        ts: event.ts,
        marketId: event.marketId,
        outcomeTokenId: event.outcomeTokenId,
        payload: {
          markPrice: event.markPrice,
          unrealizedPnl: event.unrealizedPnl,
        },
      });
      return;
    default: {
      const exhaustiveCheck: never = event;
      return exhaustiveCheck;
    }
  }
}

function insertPositionSnapshot(
  repository: SQLiteAuditRepository,
  sessionId: string,
  runLabel: string,
  ts: number,
  position: PaperPosition,
): void {
  repository.insertPositionSnapshot({
    sessionId,
    runLabel,
    correlationId: `${position.marketId}:${position.outcomeTokenId}`,
    snapshotId: `${runLabel}:final:${position.marketId}:${position.outcomeTokenId}`,
    ts,
    marketId: position.marketId,
    outcomeTokenId: position.outcomeTokenId,
    size: position.size,
    averageEntryPrice: position.averageEntryPrice,
    realizedPnl: position.realizedPnl,
    unrealizedPnl: position.unrealizedPnl,
    markPrice: position.markPrice,
    totalFees: position.totalFees,
    openTradeId: position.openTradeId,
    payload: {
      snapshotType: "final_position",
    },
  });
}

function persistRunReport(
  repository: SQLiteAuditRepository,
  sessionId: string,
  report: BacktestRunReport,
): void {
  for (const [index, record] of report.riskDecisions.entries()) {
    const decisionId = `${report.label}:${index}:${record.marketId}:${record.outcomeTokenId}:${record.ts}`;

    repository.insertMarketSnapshotSummary({
      sessionId,
      runLabel: report.label,
      correlationId: decisionId,
      ts: record.ts,
      marketId: record.marketId,
      outcomeTokenId: record.outcomeTokenId,
      source: "replay",
      eventType: "decision_snapshot",
      sequence: null,
      bestBid: record.market.bestBid,
      bestAsk: record.market.bestAsk,
      midpoint: record.market.midpoint,
      spread: record.market.spread,
      topBookDepth: record.market.topBookDepth,
      summary: {
        marketType: record.marketType,
        liquidity: record.market.liquidity,
        volume24hr: record.market.volume24hr,
        volume: record.market.volume,
      },
    });

    repository.insertFeatureSnapshot({
      sessionId,
      runLabel: report.label,
      decisionId,
      correlationId: decisionId,
      ts: record.ts,
      marketId: record.marketId,
      outcomeTokenId: record.outcomeTokenId,
      features: record.features,
    });

    repository.insertStrategyDecision({
      sessionId,
      runLabel: report.label,
      decisionId,
      correlationId: decisionId,
      ts: record.ts,
      marketId: record.marketId,
      outcomeTokenId: record.outcomeTokenId,
      actionType: record.strategyDecision.actionType,
      side: record.strategyDecision.side,
      heuristicScore: record.strategyDecision.heuristicScore,
      confidence: record.strategyDecision.confidence,
      estimatedFairValue: record.strategyDecision.estimatedFairValue,
      estimatedEdge: record.strategyDecision.estimatedEdge,
      targetEntryPrice: record.strategyDecision.targetEntryPrice,
      targetSize: record.strategyDecision.targetSize,
      reasonCodes: record.strategyDecision.reasonCodes,
      metadata: {
        marketType: record.marketType,
        market: record.market,
        inventory: record.inventory,
        rawEdge: record.strategyDecision.estimatedEdge,
      },
    });

    repository.insertRiskDecision({
      sessionId,
      runLabel: report.label,
      decisionId,
      correlationId: decisionId,
      ts: record.ts,
      action: record.riskDecision.action,
      approved: record.riskDecision.approved,
      reasonCodes: record.riskDecision.reasonCodes,
      metadata: {
        ...record.riskDecision.metadata,
      },
    });
  }

  for (const event of report.brokerEvents) {
    insertOrderLifecycleEvent(repository, sessionId, report.label, event);
  }

  for (const fill of report.fills) {
    repository.insertFill({
      sessionId,
      runLabel: report.label,
      correlationId: fill.fillId,
      fillId: fill.fillId,
      orderId: fill.orderId,
      clientOrderId: fill.clientOrderId,
      marketId: fill.marketId,
      outcomeTokenId: fill.outcomeTokenId,
      side: fill.side,
      price: fill.price,
      size: fill.size,
      fee: fill.fee,
      liquidity: fill.liquidity,
      ts: fill.ts,
      aggressiveExit: fill.aggressiveExit,
      fillConfidence: fill.fillConfidence,
      remainingOrderSize: fill.remainingOrderSize,
      payload: fill,
    });
  }

  for (const point of report.equityCurve) {
    repository.insertPnlSnapshot({
      sessionId,
      runLabel: report.label,
      correlationId: `${report.label}:${point.ts}`,
      ts: point.ts,
      realizedPnl: point.realizedPnl,
      unrealizedPnl: point.unrealizedPnl,
      equity: point.equity,
      drawdown: point.drawdown,
      payload: {
        label: report.label,
      },
    });
  }

  const finalTs = reportFinalTs(report);
  // TODO: Persist per-event position snapshots once the broker exposes a stable incremental position history.
  for (const position of report.positions) {
    insertPositionSnapshot(repository, sessionId, report.label, finalTs, position);
  }
}

export async function persistBacktestAuditTrail(input: {
  summary: BacktestSummary;
  sessionConfig: BacktestSessionConfig;
  resolvedConfig: BacktestResolvedConfig;
  databasePath: string;
  exportDir?: string;
}): Promise<void> {
  const db = openDatabase(input.databasePath);
  try {
    initializeDatabase(db);
    const repository = new SQLiteAuditRepository(db);
    const now = new Date().toISOString();

    repository.upsertSession({
      sessionId: input.summary.sessionId,
      source: "backtest-cli",
      runMode: "replay",
      status: "completed",
      startedAt: now,
      endedAt: now,
      correlationId: input.summary.sessionId,
      metadata: {
        datasetPath: input.summary.datasetPath,
        datasetMetadata: input.summary.datasetMetadata ?? null,
        limitations: input.summary.limitations,
        bestRunLabel: input.summary.bestRun.label,
        sweepCount: input.summary.sweepResults.length,
        walkForwardCount: input.summary.walkForwardResults.length,
      },
    });

    repository.insertConfigVersion({
      sessionId: input.summary.sessionId,
      configType: "backtest_session_config",
      config: input.sessionConfig,
      createdAt: now,
    });
    repository.insertConfigVersion({
      sessionId: input.summary.sessionId,
      configType: "backtest_runtime_feature_config",
      config: input.resolvedConfig.runtime.featureConfig,
      createdAt: now,
    });
    repository.insertConfigVersion({
      sessionId: input.summary.sessionId,
      configType: "backtest_runtime_strategy_config",
      config: input.resolvedConfig.runtime.strategyConfig,
      createdAt: now,
    });
    repository.insertConfigVersion({
      sessionId: input.summary.sessionId,
      configType: "backtest_runtime_risk_config",
      config: input.resolvedConfig.runtime.riskConfig,
      createdAt: now,
    });
    repository.insertConfigVersion({
      sessionId: input.summary.sessionId,
      configType: "backtest_runtime_paper_fill_config",
      config: input.resolvedConfig.runtime.paperFillConfig,
      createdAt: now,
    });

    const reports = collectReports(input.summary, {
      persistSweepResults: input.sessionConfig.audit?.persistSweepResults ?? true,
      persistWalkForwardResults: input.sessionConfig.audit?.persistWalkForwardResults ?? true,
    });

    for (const report of reports) {
      persistRunReport(repository, input.summary.sessionId, report);
    }

    if (input.exportDir) {
      await repository.exportSession(input.summary.sessionId, input.exportDir);
    }
  } finally {
    db.close();
  }
}
