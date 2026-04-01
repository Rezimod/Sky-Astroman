import type { MarketDescriptor, PaperTradeLifecycle } from "@polymarket-bot/shared";

import type {
  BacktestMetrics,
  BacktestRunReport,
  BacktestRunStats,
  BacktestTradeRecord,
  EquityCurvePoint,
  MarketTypePerformance,
} from "./types.js";

function round(value: number, digits = 8): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function marketTypeFor(market: MarketDescriptor | undefined): string {
  return market?.category?.trim() || "uncategorized";
}

export function toTradeRecord(
  trade: PaperTradeLifecycle,
  market: MarketDescriptor | undefined,
): BacktestTradeRecord | null {
  if (trade.status !== "CLOSED" || trade.closedAtTs === null) {
    return null;
  }

  return {
    tradeId: trade.tradeId,
    marketId: trade.marketId,
    outcomeTokenId: trade.outcomeTokenId,
    marketType: marketTypeFor(market),
    side: trade.side,
    openedAtTs: trade.openedAtTs,
    closedAtTs: trade.closedAtTs,
    durationMs: Math.max(trade.closedAtTs - trade.openedAtTs, 0),
    sizeOpened: trade.sizeOpened,
    sizeClosed: trade.sizeClosed,
    entryValue: trade.entryValue,
    exitValue: trade.exitValue,
    realizedPnl: trade.realizedPnl,
    fees: trade.fees,
    win: trade.realizedPnl > 0,
  };
}

export function withDrawdown(equityCurve: Omit<EquityCurvePoint, "drawdown">[]): EquityCurvePoint[] {
  let peak = Number.NEGATIVE_INFINITY;

  return equityCurve.map((point) => {
    peak = Math.max(peak, point.equity);
    return {
      ...point,
      drawdown: round(peak - point.equity, 8),
    };
  });
}

function summarizeMarketTypes(trades: BacktestTradeRecord[]): MarketTypePerformance[] {
  const grouped = new Map<string, BacktestTradeRecord[]>();
  for (const trade of trades) {
    grouped.set(trade.marketType, [...(grouped.get(trade.marketType) ?? []), trade]);
  }

  return [...grouped.entries()]
    .map(([marketType, groupedTrades]) => {
      const wins = groupedTrades.filter((trade) => trade.realizedPnl > 0);
      const losses = groupedTrades.filter((trade) => trade.realizedPnl < 0);
      const netPnl = round(groupedTrades.reduce((sum, trade) => sum + trade.realizedPnl, 0), 8);

      return {
        marketType,
        trades: groupedTrades.length,
        winRate: groupedTrades.length > 0 ? round(wins.length / groupedTrades.length, 8) : 0,
        expectancy: groupedTrades.length > 0 ? round(netPnl / groupedTrades.length, 8) : 0,
        netPnl,
        avgWin: wins.length > 0 ? round(wins.reduce((sum, trade) => sum + trade.realizedPnl, 0) / wins.length, 8) : 0,
        avgLoss: losses.length > 0 ? round(losses.reduce((sum, trade) => sum + trade.realizedPnl, 0) / losses.length, 8) : 0,
      };
    })
    .sort((left, right) => left.marketType.localeCompare(right.marketType));
}

export function summarizeBacktestRun(
  report: Omit<BacktestRunReport, "metrics" | "marketTypeBreakdown">,
  stats: BacktestRunStats,
): BacktestRunReport {
  const wins = report.trades.filter((trade) => trade.realizedPnl > 0);
  const losses = report.trades.filter((trade) => trade.realizedPnl < 0);
  const realizedPnl = report.equityCurve.at(-1)?.realizedPnl ?? 0;
  const unrealizedPnl = report.equityCurve.at(-1)?.unrealizedPnl ?? 0;
  const netPnl = round(realizedPnl + unrealizedPnl, 8);
  const averageTimeInTradeMs =
    report.trades.length > 0
      ? round(report.trades.reduce((sum, trade) => sum + trade.durationMs, 0) / report.trades.length, 8)
      : 0;

  const metrics: BacktestMetrics = {
    processedSnapshots: report.configSummary.datasetSize,
    decisionsGenerated: stats.decisionsGenerated,
    approvals: stats.approvals,
    reductions: stats.reductions,
    rejections: stats.rejections,
    ordersSubmitted: stats.ordersSubmitted,
    ordersCanceled: stats.ordersCanceled,
    ordersReplaced: stats.ordersReplaced,
    fills: report.fills.length,
    fillRatio:
      stats.submittedPassiveSize > 0 ? round(stats.makerFilledSize / stats.submittedPassiveSize, 8) : 0,
    totalTrades: report.trades.length,
    winRate: report.trades.length > 0 ? round(wins.length / report.trades.length, 8) : 0,
    avgWin: wins.length > 0 ? round(wins.reduce((sum, trade) => sum + trade.realizedPnl, 0) / wins.length, 8) : 0,
    avgLoss: losses.length > 0 ? round(losses.reduce((sum, trade) => sum + trade.realizedPnl, 0) / losses.length, 8) : 0,
    expectancy: report.trades.length > 0 ? round(report.trades.reduce((sum, trade) => sum + trade.realizedPnl, 0) / report.trades.length, 8) : 0,
    maxDrawdown: report.equityCurve.reduce((max, point) => Math.max(max, point.drawdown), 0),
    averageTimeInTradeMs,
    realizedPnl,
    unrealizedPnl,
    netPnl,
    finalEquity: report.equityCurve.at(-1)?.equity ?? report.configSummary.initialCash,
    aggressiveExitAttempts: stats.aggressiveExitAttempts,
    aggressiveExitRetries: stats.aggressiveExitRetries,
    aggressiveExitPartialCount: stats.aggressiveExitPartialCount,
    unresolvedAggressiveExitCount: report.residualAggressiveExits.length,
    unresolvedAggressiveExitSize: round(
      report.residualAggressiveExits.reduce((sum, exit) => sum + exit.remainingSize, 0),
      8,
    ),
  };

  return {
    ...report,
    metrics,
    marketTypeBreakdown: summarizeMarketTypes(report.trades),
  };
}

export function scoreReport(report: BacktestRunReport, objective: "netPnl" | "expectancy" | "winRate"): number {
  switch (objective) {
    case "expectancy":
      return report.metrics.expectancy;
    case "winRate":
      return report.metrics.winRate;
    case "netPnl":
    default:
      return report.metrics.netPnl;
  }
}
