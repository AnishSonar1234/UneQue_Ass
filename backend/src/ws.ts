import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage } from "http";
import type { Server } from "http";
import type { Lead } from "./store";

let wss: WebSocketServer | null = null;
const HEARTBEAT_INTERVAL_MS = 30_000;

type ExtWebSocket = WebSocket & { isAlive: boolean };

export function createWss(server: Server): WebSocketServer {
  wss = new WebSocketServer({ server, path: "/ws" });

  const interval = setInterval(() => {
    wss!.clients.forEach((rawWs) => {
      const ws = rawWs as ExtWebSocket;
      if (!ws.isAlive) {
        ws.terminate();
        return;
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, HEARTBEAT_INTERVAL_MS);

  wss.on("close", () => clearInterval(interval));

  wss.on("connection", (rawWs: WebSocket, _req: IncomingMessage) => {
    const ws = rawWs as ExtWebSocket;
    ws.isAlive = true;

    ws.on("pong", () => {
      ws.isAlive = true;
    });

    ws.on("error", (err) => {
      console.error("[ws] Client error:", err.message);
    });

    // Send hello
    safeSend(ws, { type: "hello" });
    console.log(`[ws] Client connected. Total: ${wss!.clients.size}`);

    ws.on("close", () => {
      console.log(`[ws] Client disconnected. Total: ${wss!.clients.size}`);
    });
  });

  console.log("[ws] WebSocket server ready on path /ws");
  return wss;
}

export function broadcastLead(lead: Lead): void {
  if (!wss) return;
  const msg = JSON.stringify({ type: "lead", data: lead });
  wss.clients.forEach((rawWs) => {
    const ws = rawWs as ExtWebSocket;
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(msg, (err) => {
        if (err) console.error("[ws] Send error:", err.message);
      });
    }
  });
}

export function getClientCount(): number {
  return wss?.clients.size ?? 0;
}

function safeSend(ws: WebSocket, data: unknown): void {
  try {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  } catch (err) {
    console.error("[ws] safeSend error:", err);
  }
}
