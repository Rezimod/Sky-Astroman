import { createLogger } from "@polymarket-bot/shared";

import { SlidingWindowRateLimiter } from "./rate-limiter.js";
import type {
  FetchLike,
  LoggerLike,
  RateLimitGroup,
  RawBookSummary,
  RawGammaMarket,
} from "./types.js";

type RequestOptions = {
  baseUrl: string;
  path: string;
  query?: Record<string, string | number | boolean | undefined>;
  rateLimitGroup: RateLimitGroup;
};

const DEFAULT_HEADERS = {
  accept: "application/json",
};

export class PolymarketRestClient {
  private readonly gammaLimiter = new SlidingWindowRateLimiter(300, 10_000);
  private readonly clobLimiter = new SlidingWindowRateLimiter(1_500, 10_000);
  private readonly logger: LoggerLike;

  constructor(
    private readonly urls: {
      gammaUrl: string;
      clobUrl: string;
    },
    private readonly fetchImpl: FetchLike = fetch,
    logger?: LoggerLike,
  ) {
    this.logger = logger ?? createLogger("polymarket-rest");
  }

  async listMarkets(query: Record<string, string | number | boolean | undefined>) {
    return this.requestJson<RawGammaMarket[]>({
      baseUrl: this.urls.gammaUrl,
      path: "/markets",
      query,
      rateLimitGroup: "gamma",
    });
  }

  async getMarketById(id: string) {
    return this.requestJson<RawGammaMarket>({
      baseUrl: this.urls.gammaUrl,
      path: `/markets/${encodeURIComponent(id)}`,
      rateLimitGroup: "gamma",
    });
  }

  async getMarketBySlug(slug: string) {
    return this.requestJson<RawGammaMarket>({
      baseUrl: this.urls.gammaUrl,
      path: `/markets/slug/${encodeURIComponent(slug)}`,
      rateLimitGroup: "gamma",
    });
  }

  async getBook(tokenId: string) {
    return this.requestJson<RawBookSummary>({
      baseUrl: this.urls.clobUrl,
      path: "/book",
      query: {
        token_id: tokenId,
      },
      rateLimitGroup: "clob",
    });
  }

  private async requestJson<T>({
    baseUrl,
    path,
    query,
    rateLimitGroup,
  }: RequestOptions): Promise<T> {
    const limiter = rateLimitGroup === "gamma" ? this.gammaLimiter : this.clobLimiter;
    await limiter.acquire();

    const url = new URL(path, baseUrl);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await this.fetchImpl(url, {
        headers: DEFAULT_HEADERS,
      });

      if (response.ok) {
        return (await response.json()) as T;
      }

      const shouldRetry =
        response.status === 429 || response.status === 408 || response.status >= 500;

      this.logger.warn("polymarket rest request failed", {
        attempt,
        path,
        rateLimitGroup,
        status: response.status,
        url: url.toString(),
      });

      if (!shouldRetry || attempt === 3) {
        const body = await response.text();
        throw new Error(
          `Polymarket request failed (${response.status}) for ${url.toString()}: ${body}`,
        );
      }

      const retryAfter = Number(response.headers.get("retry-after"));
      const waitMs = Number.isFinite(retryAfter)
        ? retryAfter * 1_000
        : Math.min(1_000 * 2 ** attempt, 5_000);

      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }

    throw new Error(`Unexpected request exhaustion for ${url.toString()}`);
  }
}
