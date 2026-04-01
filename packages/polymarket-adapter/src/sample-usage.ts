import { createLogger } from "@polymarket-bot/shared";

import { PolymarketMarketDataAdapter } from "./client.js";

async function main() {
  const logger = createLogger("polymarket-sample");
  const adapter = new PolymarketMarketDataAdapter({
    restUrl: process.env.POLYMARKET_REST_URL ?? "https://clob.polymarket.com",
    wsUrl: process.env.POLYMARKET_WS_URL ?? "wss://ws-subscriptions-clob.polymarket.com/ws/market",
    gammaUrl: process.env.POLYMARKET_GAMMA_URL ?? "https://gamma-api.polymarket.com",
    logger,
  });

  await adapter.start();

  const markets = await adapter.listActiveCandidateMarkets({
    limit: 10,
    minLiquidity: 10_000,
    maxHoursToExpiry: 72,
  });

  const selectedMarket = markets.find((market) => market.outcomes.length > 0) ?? markets[0];

  if (!selectedMarket || selectedMarket.outcomes.length === 0) {
    throw new Error("No candidate markets with order-book-enabled outcomes were found.");
  }

  logger.info("selected market", {
    marketId: selectedMarket.marketId,
    question: selectedMarket.question,
    tokenId: selectedMarket.outcomes[0]?.tokenId,
  });

  const subscription = await adapter.subscribeToOrderBook({
    tokenIds: [selectedMarket.outcomes[0].tokenId],
    onEvent(event) {
      if (event.type === "orderbook_snapshot" || event.type === "orderbook_delta") {
        console.log(JSON.stringify(event.topOfBook));
      }

      if (event.type === "top_of_book") {
        console.log(JSON.stringify(event.topOfBook));
      }
    },
    onStatusChange(status) {
      logger.info("subscription status changed", { status });
    },
    onError(error) {
      logger.error("subscription error", { error: error.message });
    },
  });

  process.on("SIGINT", async () => {
    await subscription.close();
    await adapter.stop();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
