import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";

import { PolymarketMarketDataAdapter } from "./client.js";

class FakeWebSocket extends EventEmitter {
  readyState = 0;
  sentMessages: string[] = [];

  send(payload: string) {
    this.sentMessages.push(payload);
  }

  close() {
    this.readyState = 3;
    this.emit("close", 1000);
  }

  open() {
    this.readyState = 1;
    this.emit("open");
  }
}

test("market data adapter health reflects reconnect attempts and recovers", async () => {
  const originalSetTimeout = global.setTimeout;
  const originalClearTimeout = global.clearTimeout;
  const sockets: FakeWebSocket[] = [];
  const statuses: string[] = [];

  try {
    const adapter = new PolymarketMarketDataAdapter({
      restUrl: "https://example.test/rest",
      wsUrl: "wss://example.test/ws",
      webSocketFactory: () => {
        const socket = new FakeWebSocket();
        sockets.push(socket);
        setImmediate(() => socket.open());
        return socket as never;
      },
    });

    await adapter.start();
    const subscription = await adapter.subscribeToOrderBook({
      tokenIds: ["t1"],
      connectTimeoutMs: 100,
      onEvent: () => {},
      onStatusChange: (status) => statuses.push(status),
    });

    assert.equal(adapter.getHealth().status, "running");
    global.setTimeout = ((callback: (...args: unknown[]) => void) => {
      setImmediate(callback);
      return 1 as unknown as NodeJS.Timeout;
    }) as typeof setTimeout;
    global.clearTimeout = (() => undefined) as typeof clearTimeout;
    sockets[0]?.emit("close", 1006);
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));

    assert.ok(statuses.includes("reconnecting"));
    assert.ok(sockets.length >= 2);
    assert.equal(adapter.getHealth().reconnectAttempts, 1);
    assert.equal(adapter.getHealth().status, "running");

    await subscription.close();
    await adapter.stop();
  } finally {
    global.setTimeout = originalSetTimeout;
    global.clearTimeout = originalClearTimeout;
  }
});
