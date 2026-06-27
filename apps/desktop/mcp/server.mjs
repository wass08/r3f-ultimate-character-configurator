// MCP server — the external entry point for the character companion.
//
// Any MCP client (Claude in a GitHub Action, a Slack bot, your editor) can call
// `send_character_notification`; the server forwards it to the gateway, which
// broadcasts to every connected companion. This is what makes the character
// react to the outside world instead of only the local dev panel.
//
// Transport: stdio. Configure in an MCP client as:
//   { "command": "node", "args": ["apps/desktop/mcp/server.mjs"],
//     "env": { "GATEWAY_URL": "http://localhost:8787" } }

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { EVENT_KINDS, SENTIMENTS, SOURCES, normalizeEvent } from "@companion/character-core/events";
import { ACTIONS, actionFor } from "@companion/character-core/actions";

const GATEWAY_URL = (process.env.GATEWAY_URL || "http://localhost:8787").replace(/\/$/, "");
const GATEWAY_TOKEN = process.env.GATEWAY_TOKEN || "";

const server = new McpServer({ name: "character-companion", version: "0.1.0" });

server.registerTool(
  "send_character_notification",
  {
    title: "Make the character react to a notification",
    description:
      "Send a notification event to the on-screen character companion. It classifies the event and plays an animated reaction (celebrate, matrix, angry, wink, facepalm, alert, …). Use this to surface deploys, CI results, task completions, mentions, or emails as a fun physical reaction.",
    inputSchema: {
      kind: z
        .string()
        .describe(`What happened. Known kinds: ${EVENT_KINDS.join(", ")}. Unknown values map to a default reaction.`),
      title: z.string().optional().describe("Short headline shown on the notification card."),
      body: z.string().optional().describe("Optional longer text."),
      sentiment: z.enum(SENTIMENTS).optional().describe("Tone; inferred from the text if omitted."),
      actor: z.string().optional().describe("Who triggered it, e.g. 'boss', 'ci-bot'. Affects nuanced reactions."),
      source: z.enum(SOURCES).optional().describe("Where it came from. Defaults to 'mcp'."),
      intensity: z.number().min(0).max(1).optional().describe("How strongly to react (0–1)."),
    },
  },
  async (args) => {
    const event = normalizeEvent({ ...args, source: args.source || "mcp" });
    const action = actionFor(event);
    const result = await post(event);
    return {
      content: [
        {
          type: "text",
          text: result.ok
            ? `🎭 "${event.title}" → ${action.label} ${action.emoji || ""} (pose: ${action.pose}). Delivered to ${result.clients ?? "?"} companion(s).`
            : `⚠️ Could not reach the gateway at ${GATEWAY_URL}: ${result.error}. Is it running? (npm run gateway)`,
        },
      ],
      isError: !result.ok,
    };
  }
);

server.registerTool(
  "list_actions",
  {
    title: "List the character's actions",
    description: "Return the catalog of actions and the event kinds that trigger them.",
    inputSchema: {},
  },
  async () => ({
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            kinds: EVENT_KINDS,
            actions: Object.values(ACTIONS).map((r) => ({
              id: r.id,
              label: r.label,
              pose: r.pose,
              vfx: r.vfx,
              emoji: r.emoji,
            })),
          },
          null,
          2
        ),
      },
    ],
  })
);

async function post(event) {
  try {
    const res = await fetch(`${GATEWAY_URL}/notify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(GATEWAY_TOKEN ? { Authorization: `Bearer ${GATEWAY_TOKEN}` } : {}),
      },
      body: JSON.stringify(event),
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const data = await res.json().catch(() => ({}));
    return { ok: true, clients: data.accepted };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`character-companion MCP server ready → gateway ${GATEWAY_URL}`);
