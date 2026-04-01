import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { BacktestSummary, EquityCurvePoint } from "./types.js";

function csvEscape(value: string | number | boolean | null | undefined): string {
  const stringValue = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function toCsv<T extends Record<string, string | number | boolean | null | undefined>>(
  rows: T[],
): string {
  if (rows.length === 0) {
    return "";
  }

  const headers = Object.keys(rows[0]);
  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(",")),
  ].join("\n");
}

function renderEquityCurveSvg(points: EquityCurvePoint[]): string {
  const width = 900;
  const height = 280;
  const padding = 24;
  if (points.length === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"></svg>`;
  }

  const minEquity = Math.min(...points.map((point) => point.equity));
  const maxEquity = Math.max(...points.map((point) => point.equity));
  const range = Math.max(maxEquity - minEquity, 1e-9);
  const xStep = points.length > 1 ? (width - padding * 2) / (points.length - 1) : 0;

  const polyline = points
    .map((point, index) => {
      const x = padding + index * xStep;
      const normalized = (point.equity - minEquity) / range;
      const y = height - padding - normalized * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect width="100%" height="100%" fill="#fffaf0" />`,
    `<polyline fill="none" stroke="#0f766e" stroke-width="2" points="${polyline}" />`,
    `</svg>`,
  ].join("");
}

function flattenDecisionLog(summary: BacktestSummary) {
  return summary.bestRun.riskDecisions.map((record) => ({
    ts: record.ts,
    marketId: record.marketId,
    outcomeTokenId: record.outcomeTokenId,
    marketType: record.marketType,
    actionType: record.strategyDecision.actionType,
    side: record.strategyDecision.side ?? "",
    heuristicScore: record.strategyDecision.heuristicScore,
    confidence: record.strategyDecision.confidence,
    estimatedFairValue: record.strategyDecision.estimatedFairValue ?? "",
    estimatedEdge: record.strategyDecision.estimatedEdge ?? "",
    targetEntryPrice: record.strategyDecision.targetEntryPrice ?? "",
    targetSize: record.strategyDecision.targetSize,
    approved: record.riskDecision.approved,
    riskAction: record.riskDecision.action,
    approvedSize: record.riskDecision.metadata.approvedSize,
    decisionNotional: record.riskDecision.metadata.decisionNotional,
    midpoint: record.market.midpoint ?? "",
    spread: record.market.spread ?? "",
    topBookDepth: record.market.topBookDepth,
    timeToExpiryHours: record.market.timeToExpiryHours ?? "",
    liquidity: record.market.liquidity ?? "",
    volume24hr: record.market.volume24hr ?? "",
    volume: record.market.volume ?? "",
    positionSize: record.inventory.positionSize,
    averageEntryPrice: record.inventory.averageEntryPrice ?? "",
    midpointFeature: record.features.midpoint ?? "",
    spreadFeature: record.features.spread ?? "",
    microprice: record.features.microprice ?? "",
    topBookImbalance: record.features.topBookImbalance,
    shortTermMidpointDrift: record.features.shortTermMidpointDrift,
    shortTermSpreadDelta: record.features.shortTermSpreadDelta,
    recentOrderBookPressure: record.features.recentOrderBookPressure,
    recentVolatilityProxy: record.features.recentVolatilityProxy,
    inventoryAwareBias: record.features.inventoryAwareBias,
    observationCount: record.features.observationCount,
    lastUpdateTs: record.features.lastUpdateTs,
    reasonCodes: record.strategyDecision.reasonCodes.join("|"),
    riskReasonCodes: record.riskDecision.reasonCodes.join("|"),
  }));
}

export async function writeBacktestSummary(
  summary: BacktestSummary,
  outputDir: string,
  options: {
    writeJson: boolean;
    writeCsv: boolean;
    writeSvgEquityCurve: boolean;
  },
): Promise<void> {
  await mkdir(outputDir, { recursive: true });

  if (options.writeJson) {
    await writeFile(
      path.join(outputDir, "report.json"),
      `${JSON.stringify(summary, null, 2)}\n`,
      "utf8",
    );
  }

  if (options.writeCsv) {
    await writeFile(
      path.join(outputDir, "trades.csv"),
      toCsv(summary.bestRun.trades),
      "utf8",
    );
    await writeFile(
      path.join(outputDir, "equity-curve.csv"),
      toCsv(summary.bestRun.equityCurve),
      "utf8",
    );
    await writeFile(
      path.join(outputDir, "market-type-breakdown.csv"),
      toCsv(summary.bestRun.marketTypeBreakdown),
      "utf8",
    );
    await writeFile(
      path.join(outputDir, "decision-log.csv"),
      toCsv(flattenDecisionLog(summary)),
      "utf8",
    );
    if (summary.sweepResults.length > 0) {
      await writeFile(
        path.join(outputDir, "sweep-summary.csv"),
        toCsv(
          summary.sweepResults.map((result) => ({
            parameterSetId: result.parameterSetId,
            score: result.score,
            overrides: JSON.stringify(result.overrides),
            netPnl: result.report.metrics.netPnl,
            expectancy: result.report.metrics.expectancy,
            winRate: result.report.metrics.winRate,
          })),
        ),
        "utf8",
      );
    }
    if (summary.walkForwardResults.length > 0) {
      await writeFile(
        path.join(outputDir, "walk-forward-summary.csv"),
        toCsv(
          summary.walkForwardResults.map((foldResult) => ({
            foldIndex: foldResult.fold.foldIndex,
            selectedParameterSetId: foldResult.selectedParameterSetId,
            trainScore: foldResult.trainScore,
            testNetPnl: foldResult.testReport.metrics.netPnl,
            testExpectancy: foldResult.testReport.metrics.expectancy,
            testWinRate: foldResult.testReport.metrics.winRate,
          })),
        ),
        "utf8",
      );
    }
  }

  if (options.writeSvgEquityCurve) {
    await writeFile(
      path.join(outputDir, "equity-curve.svg"),
      renderEquityCurveSvg(summary.bestRun.equityCurve),
      "utf8",
    );
  }
}
