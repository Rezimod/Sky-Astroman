import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";

import { PolymarketOrderBookSubscription } from "./stream.js";

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

test("websocket connect resolves only after first open", async () => {
  let socket: FakeWebSocket | undefined;

  const subscription = new PolymarketOrderBookSubscription(
    "wss://example.test/ws",
    {
      tokenIds: ["t1"],
      connectTimeoutMs: 100,
      onEvent: () => {},
    },
    () => {
      socket = new FakeWebSocket();
      setImmediate(() => socket?.open());
      return socket as never;
    },
  );

  await subscription.connect();

  assert.equal(subscription.getStatus(), "connected");
  assert.ok(socket);
  assert.equal(socket.sentMessages.length, 1);

  await subscription.close();
});

test("websocket connect rejects on timeout before open", async () => {
  const subscription = new PolymarketOrderBookSubscription(
    "wss://example.test/ws",
    {
      tokenIds: ["t1"],
      connectTimeoutMs: 20,
      onEvent: () => {},
    },
    () => new FakeWebSocket() as never,
  );

  await assert.rejects(
    () => subscription.connect(),
    /Timed out waiting for Polymarket websocket to open/,
  );
});

test("websocket subscription reconnects after an unexpected close", async () => {
  const originalSetTimeout = global.setTimeout;
  const originalClearTimeout = global.clearTimeout;
  const statuses: string[] = [];
  const sockets: FakeWebSocket[] = [];

  try {
    const subscription = new PolymarketOrderBookSubscription(
      "wss://example.test/ws",
      {
        tokenIds: ["t1"],
        connectTimeoutMs: 100,
        onEvent: () => {},
        onStatusChange: (status) => statuses.push(status),
      },
      () => {
        const socket = new FakeWebSocket();
        sockets.push(socket);
        setImmediate(() => socket.open());
        return socket as never;
      },
    );

    await subscription.connect();
    global.setTimeout = ((callback: (...args: unknown[]) => void) => {
      setImmediate(callback);
      return 1 as unknown as NodeJS.Timeout;
    }) as typeof setTimeout;
    global.clearTimeout = (() => undefined) as typeof clearTimeout;
    sockets[0]?.emit("close", 1006);
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));

    assert.ok(sockets.length >= 2);
    assert.equal(subscription.getStatus(), "connected");
    assert.ok(statuses.includes("reconnecting"));
    assert.equal(subscription.getReconnectAttempts(), 0);

    await subscription.close();
  } finally {
    global.setTimeout = originalSetTimeout;
    global.clearTimeout = originalClearTimeout;
  }
});
