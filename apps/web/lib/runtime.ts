export type WebRuntimeConfig = {
  appName: string;
  traderBaseUrl: string;
};

export function getWebRuntimeConfig(): WebRuntimeConfig {
  return {
    appName: process.env.NEXT_PUBLIC_APP_NAME ?? "Polymarket Bot Dashboard",
    traderBaseUrl:
      process.env.TRADER_BASE_URL ??
      process.env.NEXT_PUBLIC_TRADER_BASE_URL ??
      "http://localhost:4000",
  };
}
