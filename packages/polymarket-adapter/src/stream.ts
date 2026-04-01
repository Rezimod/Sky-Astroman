import {
  createLogger,
  type MarketStreamEvent,
  type SubscriptionStatus,
} from "@polymarket-bot/shared";
import WebSocket from "ws";

import {
  applyBestBidAskEvent,
  applyBookEvent,
  applyLastTradePriceEvent,
  applyPriceChangeEvent,
  applyTickSizeChangeEvent,
  createOrderBookState,
} from "./orderbook-state.js";
import type {
  LoggerLike,
  OrderBookSubscriptionHandle,
  OrderBookSubscriptionOptions,
  RawMarketChannelEvent,
  WebSocketFactory,
} from "./types.js";

type OrderBookStateMap = Map<string, ReturnType<typeof createOrderBookState>>;
const DEFAULT_CONNECT_TIMEOUT_MS = 10_000;

function parseMarketChannelPayload(payload: string): RawMarketChannelEvent[] {
  const parsed = JSON.parse(payload) as unknown;
  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.filter(
    (entry): entry is RawMarketChannelEvent =>
      typeof entry === "object" && entry !== null && "event_type" in entry,
  );
}

function reconnectDelay(attempt: number): number {
  const baseDelay = Math.min(1_000 * 2 ** attempt, 30_000);
  const jitter = Math.floor(Math.random() * 500);
  return baseDelay + jitter;
}

export class PolymarketOrderBookSubscription implements OrderBookSubscriptionHandle {
  private status: SubscriptionStatus = "connecting";
  private socket?: WebSocket;
  private reconnectTimer?: NodeJS.Timeout;
  private closed = false;
  private reconnectAttempts = 0;
  private readonly orderBooks: OrderBookStateMap = new Map();
  private readonly logger: LoggerLike;

  constructor(
    private readonly wsUrl: string,
    private readonly options: OrderBookSubscriptionOptions,
    private readonly webSocketFactory: WebSocketFactory = (url) => new WebSocket(url),
    logger?: LoggerLike,
  ) {
    this.logger = logger ?? createLogger("polymarket-stream");
  }

  async connect(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      let settled = false;
      let timeout: NodeJS.Timeout | undefined;

      const settle = (callback: () => void) => {
        if (settled) {
          return;
        }
        settled = true;
        if (timeout) {
          clearTimeout(timeout);
        }
        callback();
      };

      timeout = setTimeout(() => {
        settle(() => reject(new Error("Timed out waiting for Polymarket websocket to open.")));
        if (this.socket && this.socket.readyState <= WebSocket.OPEN) {
          this.socket.close();
        }
      }, this.options.connectTimeoutMs ?? DEFAULT_CONNECT_TIMEOUT_MS);

      this.openSocket({
        onOpen: () => settle(resolve),
        onFailure: (error) => settle(() => reject(error)),
      });
    });
  }

  getStatus(): SubscriptionStatus {
    return this.status;
  }

  getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }

  async close(): Promise<void> {
    this.closed = true;
    this.setStatus("closed");

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    if (this.socket && this.socket.readyState <= WebSocket.OPEN) {
      this.socket.close();
    }
  }

  private openSocket(callbacks?: {
    onOpen?: () => void;
    onFailure?: (error: Error) => void;
  }) {
    const socket = this.webSocketFactory(this.wsUrl);
    this.socket = socket;
    this.setStatus(this.reconnectAttempts === 0 ? "connecting" : "reconnecting");

    socket.on("open", () => {
      this.reconnectAttempts = 0;
      this.setStatus("connected");
      this.logger.info("polymarket websocket connected", {
        tokenIds: this.options.tokenIds,
      });

      socket.send(
        JSON.stringify({
          type: "market",
          assets_ids: this.options.tokenIds,
          custom_feature_enabled: this.options.customFeatureEnabled ?? true,
        }),
      );
      callbacks?.onOpen?.();
    });

    socket.on("message", (data) => {
      try {
        this.handlePayload(data.toString());
      } catch (error) {
        const normalizedError =
          error instanceof Error ? error : new Error("Unknown websocket parsing error");
        this.options.onError?.(normalizedError);
        this.logger.error("failed to handle websocket payload", {
          error: normalizedError.message,
        });
      }
    });

    socket.on("error", (error) => {
      const normalizedError = error instanceof Error ? error : new Error("Unknown websocket error");
      this.options.onError?.(normalizedError);
      this.logger.error("polymarket websocket error", {
        error: normalizedError.message,
      });
      if (this.status !== "connected") {
        callbacks?.onFailure?.(normalizedError);
      }
    });

    socket.on("close", (code) => {
      this.logger.warn("polymarket websocket closed", {
        code,
        reconnectAttempts: this.reconnectAttempts,
      });

      if (!this.closed) {
        this.scheduleReconnect();
      }
      if (!this.closed && this.status !== "connected") {
        callbacks?.onFailure?.(
          new Error(`Polymarket websocket closed before open (code=${code}).`),
        );
      }
    });
  }

  private handlePayload(payload: string) {
    const events = parseMarketChannelPayload(payload);

    for (const event of events) {
      switch (event.event_type) {
        case "book": {
          const applied = applyBookEvent(event);
          this.orderBooks.set(event.asset_id, applied.state);
          this.emit(applied.event);
          break;
        }
        case "price_change": {
          const existingState = this.orderBooks.get(event.asset_id);
          if (!existingState) {
            break;
          }

          const applied = applyPriceChangeEvent(existingState, event);
          this.orderBooks.set(event.asset_id, applied.state);
          this.emit(applied.event);
          break;
        }
        case "best_bid_ask":
          this.emit(applyBestBidAskEvent(event));
          break;
        case "last_trade_price":
          this.emit(applyLastTradePriceEvent(event));
          break;
        case "tick_size_change":
          this.emit(applyTickSizeChangeEvent(event));
          break;
        default:
          this.logger.warn("ignoring unsupported market channel event", {
            eventType: (event as { event_type?: string }).event_type,
          });
      }
    }
  }

  private emit(event: MarketStreamEvent) {
    this.options.onEvent(event);
  }

  private scheduleReconnect() {
    this.reconnectAttempts += 1;
    this.setStatus("reconnecting");
    const waitMs = reconnectDelay(this.reconnectAttempts);

    this.reconnectTimer = setTimeout(() => {
      if (!this.closed) {
        this.openSocket();
      }
    }, waitMs);
  }

  private setStatus(status: SubscriptionStatus) {
    this.status = status;
    this.options.onStatusChange?.(status);
  }
}

export { parseMarketChannelPayload };
