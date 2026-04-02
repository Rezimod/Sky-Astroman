import type { RunMode } from "./types/index.js";

type EnvRecord = Record<string, string | undefined>;

export type TraderConfig = {
  appEnv: string;
  runMode: RunMode;
  logLevel: string;
  databaseUrl: string;
  dataDir: string;
  trader: {
    host: string;
    port: number;
  };
  polymarket: {
    restUrl: string;
    wsUrl: string;
    chainId: number;
    privateKey?: string;
    funderAddress?: string;
  };
  risk: {
    maxNotionalPerMarket: number;
    maxGrossExposure: number;
    maxDailyLoss: number;
    maxOpenOrders: number;
    allowTakerExitsOnly: boolean;
  };
  scanner: {
    enabled: boolean;
    refreshIntervalMs: number;
    marketLimit: number;
    maxCandidates: number;
    minLiquidity: number;
    minVolume24hr: number;
    minTopBookDepth: number;
    maxSpreadCents: number;
    minHoursToExpiry: number;
    maxHoursToExpiry: number;
    preferredHoursToExpiry: number;
    minUpdateFrequencyPerMinute: number;
    activityWindowMs: number;
    weights: {
      liquidity: number;
      volume24hr: number;
      topBookDepth: number;
      spread: number;
      updateFrequency: number;
      expiry: number;
    };
  };
};

export type TraderPublicConfig = {
  appEnv: string;
  runMode: RunMode;
  databaseUrl: string;
  dataDir: string;
  trader: {
    host: string;
    port: number;
  };
  polymarket: {
    restUrl: string;
    wsUrl: string;
    chainId: number;
    privateKeyConfigured: boolean;
    funderAddressConfigured: boolean;
  };
  risk: TraderConfig["risk"];
  scanner: TraderConfig["scanner"];
};

function requireString(env: EnvRecord, key: string, fallback?: string): string {
  const value = env[key] ?? fallback;

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

function parseNumber(env: EnvRecord, key: string, fallback: number): number {
  const rawValue = env[key];

  if (!rawValue) {
    return fallback;
  }

  const value = Number(rawValue);

  if (Number.isNaN(value)) {
    throw new Error(`Environment variable ${key} must be numeric.`);
  }

  return value;
}

function parseBoolean(env: EnvRecord, key: string, fallback: boolean): boolean {
  const rawValue = env[key];

  if (!rawValue) {
    return fallback;
  }

  switch (rawValue.toLowerCase()) {
    case "true":
    case "1":
      return true;
    case "false":
    case "0":
      return false;
    default:
      throw new Error(`Environment variable ${key} must be boolean (true/false/1/0).`);
  }
}

export function loadTraderConfig(env: EnvRecord = process.env): TraderConfig {
  const runMode = requireString(env, "RUN_MODE", "paper") as RunMode;

  if (!["paper", "live", "replay"].includes(runMode)) {
    throw new Error(`Unsupported RUN_MODE: ${runMode}`);
  }

  if (runMode === "live") {
    throw new Error(
      "RUN_MODE=live is disabled because authenticated order placement is not implemented yet.",
    );
  }

  return {
    appEnv: requireString(env, "APP_ENV", "development"),
    runMode,
    logLevel: requireString(env, "LOG_LEVEL", "info"),
    databaseUrl: requireString(env, "DATABASE_URL", "./data/trader.sqlite"),
    dataDir: requireString(env, "DATA_DIR", "./data"),
    trader: {
      host: requireString(env, "TRADER_HOST", "0.0.0.0"),
      port: parseNumber(env, "TRADER_PORT", parseNumber(env, "PORT", 4000)),
    },
    polymarket: {
      restUrl: requireString(env, "POLYMARKET_REST_URL", "https://clob.polymarket.com"),
      wsUrl: requireString(
        env,
        "POLYMARKET_WS_URL",
        "wss://ws-subscriptions-clob.polymarket.com/ws/market",
      ),
      chainId: parseNumber(env, "POLYMARKET_CHAIN_ID", 137),
      privateKey: env.POLYMARKET_PRIVATE_KEY,
      funderAddress: env.POLYMARKET_FUNDER_ADDRESS,
    },
    risk: {
      maxNotionalPerMarket: parseNumber(env, "MAX_NOTIONAL_PER_MARKET", 250),
      maxGrossExposure: parseNumber(env, "MAX_GROSS_EXPOSURE", 1000),
      maxDailyLoss: parseNumber(env, "MAX_DAILY_LOSS", 150),
      maxOpenOrders: parseNumber(env, "MAX_OPEN_ORDERS", 20),
      allowTakerExitsOnly: parseBoolean(env, "ALLOW_TAKER_EXITS_ONLY", true),
    },
    scanner: {
      enabled: parseBoolean(env, "SCANNER_ENABLED", true),
      refreshIntervalMs: parseNumber(env, "SCANNER_REFRESH_INTERVAL_MS", 120_000),
      marketLimit: parseNumber(env, "SCANNER_MARKET_LIMIT", 30),
      maxCandidates: parseNumber(env, "SCANNER_MAX_CANDIDATES", 12),
      minLiquidity: parseNumber(env, "SCANNER_MIN_LIQUIDITY", 10_000),
      minVolume24hr: parseNumber(env, "SCANNER_MIN_VOLUME_24H", 2_500),
      minTopBookDepth: parseNumber(env, "SCANNER_MIN_TOP_BOOK_DEPTH", 200),
      maxSpreadCents: parseNumber(env, "SCANNER_MAX_SPREAD_CENTS", 6),
      minHoursToExpiry: parseNumber(env, "SCANNER_MIN_HOURS_TO_EXPIRY", 2),
      maxHoursToExpiry: parseNumber(env, "SCANNER_MAX_HOURS_TO_EXPIRY", 72),
      preferredHoursToExpiry: parseNumber(env, "SCANNER_PREFERRED_HOURS_TO_EXPIRY", 24),
      minUpdateFrequencyPerMinute: parseNumber(env, "SCANNER_MIN_UPDATE_FREQUENCY_PER_MINUTE", 0),
      activityWindowMs: parseNumber(env, "SCANNER_ACTIVITY_WINDOW_MS", 300_000),
      weights: {
        liquidity: parseNumber(env, "SCANNER_WEIGHT_LIQUIDITY", 0.24),
        volume24hr: parseNumber(env, "SCANNER_WEIGHT_VOLUME_24H", 0.18),
        topBookDepth: parseNumber(env, "SCANNER_WEIGHT_TOP_BOOK_DEPTH", 0.2),
        spread: parseNumber(env, "SCANNER_WEIGHT_SPREAD", 0.18),
        updateFrequency: parseNumber(env, "SCANNER_WEIGHT_UPDATE_FREQUENCY", 0.12),
        expiry: parseNumber(env, "SCANNER_WEIGHT_EXPIRY", 0.08),
      },
    },
  };
}

export function sanitizeTraderConfig(config: TraderConfig): TraderPublicConfig {
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
    scanner: {
      ...config.scanner,
      weights: { ...config.scanner.weights },
    },
  };
}
