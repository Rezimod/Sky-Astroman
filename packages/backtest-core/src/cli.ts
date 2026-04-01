#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";

import { persistBacktestAuditTrail } from "./audit.js";
import { writeBacktestSummary } from "./serializer.js";
import { BacktestEngine, resolveBacktestConfig } from "./replay.js";
import type { BacktestSessionConfig } from "./types.js";

function parseArgs(argv: string[]) {
  const args = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];
    if (key.startsWith("--") && value && !value.startsWith("--")) {
      args.set(key, value);
      index += 1;
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const configPath = args.get("--config");
  if (!configPath) {
    throw new Error("Usage: npm run backtest -w @polymarket-bot/backtest-core -- --config <path>");
  }

  const absoluteConfigPath = path.resolve(configPath);
  const configDir = path.dirname(absoluteConfigPath);
  const config = JSON.parse(await readFile(absoluteConfigPath, "utf8")) as BacktestSessionConfig;
  const resolvedConfig: BacktestSessionConfig = {
    ...config,
    datasetPath: path.isAbsolute(config.datasetPath)
      ? config.datasetPath
      : path.resolve(configDir, config.datasetPath),
    outputDir: config.outputDir
      ? path.isAbsolute(config.outputDir)
        ? config.outputDir
        : path.resolve(configDir, config.outputDir)
      : undefined,
    audit: config.audit
      ? {
          ...config.audit,
          databasePath: config.audit.databasePath
            ? path.isAbsolute(config.audit.databasePath)
              ? config.audit.databasePath
              : path.resolve(configDir, config.audit.databasePath)
            : undefined,
          exportDir: config.audit.exportDir
            ? path.isAbsolute(config.audit.exportDir)
              ? config.audit.exportDir
              : path.resolve(configDir, config.audit.exportDir)
            : undefined,
        }
      : undefined,
  };
  const engine = new BacktestEngine(resolvedConfig);
  const summary = await engine.run();
  const backtestConfig = resolveBacktestConfig(resolvedConfig);

  const cliOutputDir = args.get("--output-dir");
  const outputDir = cliOutputDir
    ? path.resolve(cliOutputDir)
    : resolvedConfig.outputDir;
  if (outputDir) {
    await writeBacktestSummary(summary, path.resolve(outputDir), {
      writeJson: resolvedConfig.report?.writeJson ?? true,
      writeCsv: resolvedConfig.report?.writeCsv ?? true,
      writeSvgEquityCurve: resolvedConfig.report?.writeSvgEquityCurve ?? true,
    });
  }

  const auditDatabasePath = args.get("--audit-db")
    ? path.resolve(args.get("--audit-db")!)
    : resolvedConfig.audit?.databasePath;
  const auditExportDir = args.get("--audit-export-dir")
    ? path.resolve(args.get("--audit-export-dir")!)
    : resolvedConfig.audit?.exportDir ?? (outputDir ? path.join(outputDir, "audit") : undefined);

  if (auditDatabasePath) {
    await persistBacktestAuditTrail({
      summary,
      sessionConfig: resolvedConfig,
      resolvedConfig: backtestConfig,
      databasePath: auditDatabasePath,
      exportDir: auditExportDir,
    });
  }

  const result = summary.bestRun.metrics;
  process.stdout.write(
    [
      `session=${summary.sessionId}`,
      `netPnl=${result.netPnl}`,
      `expectancy=${result.expectancy}`,
      `winRate=${result.winRate}`,
      `drawdown=${result.maxDrawdown}`,
      `fillRatio=${result.fillRatio}`,
    ].join(" ") + "\n",
  );
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
