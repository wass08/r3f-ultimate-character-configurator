// Normalized notification-event envelope.
//
// Every source (GitHub, Slack, email, a manual dev trigger, an MCP call) gets
// squashed into this one shape so the reaction logic never has to care where an
// event came from. This is the contract shared by the browser, the gateway
// server and the MCP server — keep it dependency-free so it can be imported from
// anywhere (ESM browser + Node).

export const SOURCES = ["github", "slack", "email", "manual", "mcp", "system"];

export const SENTIMENTS = ["positive", "negative", "neutral", "urgent"];

// The "kinds" the reaction map knows how to react to. New kinds degrade
// gracefully: an unknown kind still produces a sensible default reaction.
export const EVENT_KINDS = [
  "task_completed",
  "deploy_succeeded",
  "deploy_failed",
  "ci_failed",
  "ci_passed",
  "pr_approved",
  "pr_changes_requested",
  "email_received",
  "mention",
  "info",
];

const slug = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const clamp01 = (n) => Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));

let counter = 0;
const localId = () => `evt_${(counter = (counter + 1) % 1e6)}_${performance?.now?.().toFixed?.(0) ?? ""}`;

/**
 * Normalize an arbitrary payload into a valid event envelope. Tolerant by
 * design — missing fields fall back to sane defaults rather than throwing, so a
 * half-configured GitHub Action or Slack hook still animates the character.
 *
 * @param {object} raw
 * @returns {{id:string, source:string, kind:string, sentiment:string,
 *   intensity:number, actor:(string|null), title:string, body:string,
 *   ts:number, meta:object}}
 */
export function normalizeEvent(raw = {}) {
  const kind = EVENT_KINDS.includes(raw.kind) ? raw.kind : slug(raw.kind) || "info";
  const sentiment = SENTIMENTS.includes(raw.sentiment) ? raw.sentiment : null;
  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : localId(),
    source: SOURCES.includes(raw.source) ? raw.source : "manual",
    kind,
    // sentiment may be inferred later in the rules layer if not supplied
    sentiment: sentiment,
    intensity: raw.intensity == null ? 0.6 : clamp01(raw.intensity),
    actor: raw.actor ? String(raw.actor) : null,
    title: String(raw.title ?? defaultTitle(kind)),
    body: String(raw.body ?? ""),
    ts: Number.isFinite(raw.ts) ? raw.ts : Date.now(),
    meta: raw.meta && typeof raw.meta === "object" ? raw.meta : {},
  };
}

function defaultTitle(kind) {
  return kind
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// A tiny JSON-schema-ish description, handy for the MCP tool definition and for
// documenting the HTTP endpoint without pulling in a validation library.
export const EVENT_JSON_SCHEMA = {
  type: "object",
  properties: {
    source: { type: "string", enum: SOURCES, description: "Origin of the event." },
    kind: {
      type: "string",
      description: `What happened. Known kinds: ${EVENT_KINDS.join(", ")}. Unknown values are accepted and mapped to a default reaction.`,
    },
    sentiment: { type: "string", enum: SENTIMENTS, description: "Emotional tone; inferred from kind if omitted." },
    intensity: { type: "number", minimum: 0, maximum: 1, description: "How strongly to react (0–1). Default 0.6." },
    actor: { type: "string", description: "Who triggered it, e.g. 'boss', 'ci-bot'. Used for nuanced reactions." },
    title: { type: "string", description: "Short headline shown on the notification card." },
    body: { type: "string", description: "Optional longer text." },
  },
  required: ["kind"],
};
