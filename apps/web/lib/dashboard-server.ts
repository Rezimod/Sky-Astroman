import {
  DEFAULT_MAKER_SIGNAL_CONFIG,
  DEFAULT_RISK_ENGINE_CONFIG,
  loadTraderConfig,
  type MarketScannerSnapshot,
  type PaperTradingSnapshot,
  type TraderConfig,
  type TraderRuntimeSnapshot,
} from "@polymarket-bot/shared";

import type { DashboardSnapshot, DashboardTraderConfigModel } from "./dashboard-types";
import { getWebRuntimeConfig } from "./runtime";

function withTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function sanitizeTraderConfig(config: TraderConfig): DashboardTraderConfigModel {
  return {
    appEnv: config.appEnv,
    runMode: config.runMode,
    databaseUrl: config.databaseUrl,
    dataDir: config.dataDir,
    trader: {
      host: config.trader.host,
      port: config.trader.port,
    },
    polymarket: {
      restUrl: config.polymarket.restUrl,
      wsUrl: config.polymarket.wsUrl,
      chainId: config.polymarket.chainId,
      privateKeyConfigured: Boolean(config.polymarket.privateKey),
      funderAddressConfigured: Boolean(config.polymarket.funderAddress),
    },
    risk: { ...config.risk },
    scanner: { ...config.scanner },
  };
}

function safeLoadTraderConfigModel(): DashboardTraderConfigModel {
  try {
    const envRunMode = process.env.RUN_MODE;
    const config = loadTraderConfig({
      ...process.env,
      RUN_MODE: envRunMode === "live" ? "paper" : envRunMode,
    });
    return sanitizeTraderConfig(config);
  } catch {
    return sanitizeTraderConfig(loadTraderConfig({ RUN_MODE: "paper" }));
  }
}

async function fetchTraderJson<T>(
  baseUrl: string,
  path: string,
): Promise<{ data: T | null; error?: string }> {
  try {
    const response = await fetch(new URL(path, withTrailingSlash(baseUrl)), {
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        data: null,
        error: `GET ${path} failed with status ${response.status}.`,
      };
    }

    return {
      data: (await response.json()) as T,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function loadDashboardSnapshot(): Promise<DashboardSnapshot> {
  const runtimeConfig = getWebRuntimeConfig();
  const [runtime, scanner, paper] = await Promise.all([
    fetchTraderJson<TraderRuntimeSnapshot>(runtimeConfig.traderBaseUrl, "runtime"),
    fetchTraderJson<MarketScannerSnapshot>(runtimeConfig.traderBaseUrl, "scanner"),
    fetchTraderJson<PaperTradingSnapshot>(runtimeConfig.traderBaseUrl, "paper"),
  ]);

  return {
    fetchedAt: new Date().toISOString(),
    traderBaseUrl: runtimeConfig.traderBaseUrl,
    runtime: runtime.data,
    scanner: scanner.data,
    paper: paper.data,
    models: {
      sourceLabel: "Shared backend models + web-side env resolution",
      notes: [
        "Live merged config is not published by the trader runtime yet.",
        "Paper trading metrics are local mark-to-mid estimates and should not be treated as live execution results.",
      ],
      traderConfig: safeLoadTraderConfigModel(),
      strategyDefaults: { ...DEFAULT_MAKER_SIGNAL_CONFIG },
      riskEngineDefaults: { ...DEFAULT_RISK_ENGINE_CONFIG },
    },
    errors: {
      ...(paper.error ? { paper: paper.error } : {}),
      ...(runtime.error ? { runtime: runtime.error } : {}),
      ...(scanner.error ? { scanner: scanner.error } : {}),
    },
  };
}
