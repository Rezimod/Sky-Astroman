import type {
  MakerSignalConfig,
  MarketScannerSnapshot,
  PaperTradingSnapshot,
  RiskEngineConfig,
  TraderPublicConfig,
  TraderRuntimeSnapshot,
} from "@polymarket-bot/shared";

export type DashboardTraderConfigModel = TraderPublicConfig;

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
    config?: string;
    paper?: string;
    runtime?: string;
    scanner?: string;
  };
};
