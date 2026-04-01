import type {
  MakerSignalConfig,
  MarketScannerSnapshot,
  PaperTradingSnapshot,
  RiskEngineConfig,
  RunMode,
  TraderRuntimeSnapshot,
} from "@polymarket-bot/shared";

export type DashboardTraderConfigModel = {
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

export type DashboardConfigModels = {
  sourceLabel: string;
  notes: string[];
  traderConfig: DashboardTraderConfigModel;
  strategyDefaults: MakerSignalConfig;
  riskEngineDefaults: RiskEngineConfig;
};

export type DashboardSnapshot = {
  fetchedAt: string;
  traderBaseUrl: string;
  runtime: TraderRuntimeSnapshot | null;
  scanner: MarketScannerSnapshot | null;
  paper: PaperTradingSnapshot | null;
  models: DashboardConfigModels;
  errors: {
    paper?: string;
    runtime?: string;
    scanner?: string;
  };
};
