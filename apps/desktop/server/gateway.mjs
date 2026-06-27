// Notification gateway — the single ingress for the companion.
//
//   POST /notify   accept an event (or array), normalize, broadcast over WS
//   GET  /events   recent events (debug / late-joining clients)
//   GET  /health   liveness + connected client count
//   WS   /         clients subscribe here and receive normalized events
//
// Both the MCP server and any plain webhook (GitHub Action, Slack, an email
// rule) POST to /notify; the browser/Electron companion connects over WS. Zero
// framework — Node http + the `ws` package.

import http from "node:http";
import { WebSocketServer } from "ws";
import { normalizeEvent } from "@companion/character-core/events";

const PORT = Number(process.env.GATEWAY_PORT || 8787);
const TOKEN = process.env.GATEWAY_TOKEN || ""; // optional shared secret
const recent = []; // ring buffer of recent events
const MAX_RECENT = 50;

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  cors(res);

  if (req.method === "OPTIONS") return res.writeHead(204).end();

  if (req.method === "GET" && url.pathname === "/health") {
    return json(res, 200, { ok: true, clients: wss.clients.size, recent: recent.length });
  }

  if (req.method === "GET" && url.pathname === "/events") {
    return json(res, 200, recent);
  }

  if (req.method === "POST" && url.pathname === "/notify") {
    if (TOKEN && req.headers.authorization !== `Bearer ${TOKEN}`) {
      return json(res, 401, { error: "unauthorized" });
    }
    return readBody(req, (err, payload) => {
      if (err) return json(res, 400, { error: "invalid JSON" });
      const items = Array.isArray(payload) ? payload : [payload];
      const events = items.map(normalizeEvent);
      events.forEach(broadcast);
      return json(res, 200, { accepted: events.length, ids: events.map((e) => e.id) });
    });
  }

  return json(res, 404, { error: "not found" });
});

const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  // Replay the last few events so a freshly-opened companion isn't blank.
  ws.send(JSON.stringify(recent.slice(-5)));
});

function broadcast(event) {
  recent.push(event);
  if (recent.length > MAX_RECENT) recent.shift();
  const frame = JSON.stringify({ type: "event", event });
  for (const client of wss.clients) {
    if (client.readyState === 1) client.send(frame);
  }
  console.log(`📨 ${event.source}/${event.kind}  →  ${wss.clients.size} client(s)`);
}

// ---- helpers ---------------------------------------------------------------
function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
}
function json(res, code, obj) {
  res.writeHead(code, { "Content-Type": "application/json" });
  res.end(JSON.stringify(obj));
}
function readBody(req, cb) {
  let raw = "";
  req.on("data", (c) => {
    raw += c;
    if (raw.length > 1e6) req.destroy(); // 1MB guard
  });
  req.on("end", () => {
    try {
      cb(null, raw ? JSON.parse(raw) : {});
    } catch (e) {
      cb(e);
    }
  });
  req.on("error", cb);
}

server.listen(PORT, () => {
  console.log(`🛰️  Character gateway on http://localhost:${PORT}`);
  console.log(`   POST http://localhost:${PORT}/notify   WS ws://localhost:${PORT}`);
  if (TOKEN) console.log("   🔒 auth required (GATEWAY_TOKEN set)");
});
