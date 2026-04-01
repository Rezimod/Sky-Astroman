import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

import type {
  MarketScannerSnapshot,
  PaperTradingSnapshot,
  TraderRuntimeSnapshot,
} from "@polymarket-bot/shared";

function writeJson(response: ServerResponse, statusCode: number, body: unknown) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(body, null, 2));
}

export function createHttpServer(
  getSnapshot: () => TraderRuntimeSnapshot,
  getScannerSnapshot: () => MarketScannerSnapshot | null,
  getPaperSnapshot: () => PaperTradingSnapshot,
) {
  return createServer((request: IncomingMessage, response: ServerResponse) => {
    const url = request.url ?? "/";

    if (url === "/health") {
      writeJson(response, 200, {
        ...getSnapshot(),
      });
      return;
    }

    if (url === "/runtime") {
      writeJson(response, 200, getSnapshot());
      return;
    }

    if (url === "/scanner") {
      writeJson(response, 200, getScannerSnapshot());
      return;
    }

    if (url === "/paper") {
      writeJson(response, 200, getPaperSnapshot());
      return;
    }

    writeJson(response, 404, {
      ok: false,
      message: "Not found",
    });
  });
}
