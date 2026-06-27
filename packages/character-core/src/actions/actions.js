// Declarative action catalog.
//
// An Action = a base pose (one of the Poses.glb clips) + a 2D VFX overlay +
// timing + theming. Everything is data so new actions are trivial to add as the
// character "evolves". `classify()` turns a normalized event into an action id;
// it is intentionally simple and ordered so user overrides can slot in later.

// Pose clips that actually exist in /models/Poses.glb:
//   Idle, Chill, Cool, Dram, King, Ninja, Busy, Punch
export const POSES = {
  Idle: "Idle",
  Chill: "Chill",
  Cool: "Cool",
  Dram: "Dram",
  King: "King",
  Ninja: "Ninja",
  Busy: "Busy",
  Punch: "Punch",
};

// VFX ids are interpreted by the runtime overlay (ActionFX.jsx). Keeping them as
// plain strings decouples the action catalog from the rendering.
export const ACTIONS = {
  idle: {
    id: "idle",
    label: "Idle",
    pose: POSES.Idle,
    vfx: null,
    durationMs: 0, // idle is the resting state, never auto-expires
    accent: "#8b8bff",
    xp: 0,
  },
  celebrate: {
    id: "celebrate",
    label: "Celebrate",
    pose: POSES.King,
    vfx: "confetti",
    durationMs: 4200,
    accent: "#ffd34e",
    xp: 15,
    emoji: "🎉",
  },
  matrix: {
    id: "matrix",
    label: "We're in",
    pose: POSES.Cool,
    vfx: "matrix",
    durationMs: 4800,
    accent: "#27ff7c",
    xp: 12,
    emoji: "🟢",
  },
  angry: {
    id: "angry",
    label: "Incoming!",
    pose: POSES.Punch,
    vfx: "projectile", // an "angry bird" fired at the notification card
    durationMs: 3800,
    accent: "#ff4d4d",
    xp: 8,
    emoji: "💢",
  },
  wink: {
    id: "wink",
    label: "Aw, thanks",
    pose: POSES.Chill,
    vfx: "hearts",
    durationMs: 3600,
    accent: "#ff7ec8",
    xp: 10,
    emoji: "😉",
  },
  facepalm: {
    id: "facepalm",
    label: "Oh no",
    pose: POSES.Dram,
    vfx: "raincloud",
    durationMs: 4200,
    accent: "#6aa0ff",
    xp: 6,
    emoji: "🤦",
  },
  alert: {
    id: "alert",
    label: "Heads up",
    pose: POSES.Ninja,
    vfx: "pulse",
    durationMs: 3200,
    accent: "#ff9d3c",
    xp: 7,
    emoji: "⚡",
  },
  think: {
    id: "think",
    label: "Hmm",
    pose: POSES.Busy,
    vfx: "thought",
    durationMs: 3000,
    accent: "#9bb0c9",
    xp: 4,
    emoji: "💭",
  },
};

export const DEFAULT_ACTION_ID = "think";

// Words that hint an email/message is a complaint vs. praise, used only when the
// caller didn't give us an explicit sentiment.
const NEGATIVE_HINTS = /\b(missed|overdue|urgent|asap|broke|broken|fail|failed|issue|problem|bug|wrong|deadline|escalat|reminder|still waiting|where is)\b/i;
const POSITIVE_HINTS = /\b(thank|thanks|great|awesome|appreciate|well done|good job|nice work|congrats|kudos|love it|amazing|shipped)\b/i;

function inferSentiment(event) {
  if (event.sentiment) return event.sentiment;
  const text = `${event.title} ${event.body}`;
  if (POSITIVE_HINTS.test(text)) return "positive";
  if (NEGATIVE_HINTS.test(text)) return "negative";
  return "neutral";
}

/**
 * Map a normalized event to a reaction id. Order matters: the most specific
 * rules win. This is deliberately a plain function (not a config object) so the
 * branching on actor/sentiment/intensity stays readable.
 */
export function classify(event) {
  const sentiment = inferSentiment(event);
  const fromBoss = /boss|manager|lead|director|ceo|cto/i.test(event.actor || "");

  switch (event.kind) {
    case "task_completed":
    case "pr_approved":
    case "ci_passed":
      return "celebrate";

    case "deploy_succeeded":
      return "matrix";

    case "deploy_failed":
    case "ci_failed":
    case "pr_changes_requested":
      return "facepalm";

    case "email_received":
      if (sentiment === "positive") return "wink";
      if (sentiment === "negative") return fromBoss ? "angry" : "facepalm";
      return "think";

    case "mention":
      return "alert";

    default:
      // Fall back on sentiment for unknown kinds so the character still emotes.
      if (sentiment === "positive") return "celebrate";
      if (sentiment === "negative") return "facepalm";
      if (sentiment === "urgent") return "alert";
      return DEFAULT_ACTION_ID;
  }
}

/** Resolve a normalized event to a full action object (with the live event attached). */
export function actionFor(event) {
  const id = classify(event);
  const action = ACTIONS[id] || ACTIONS[DEFAULT_ACTION_ID];
  return { ...action, event, sentiment: inferSentiment(event) };
}

// XP needed to reach the *next* level. Simple curve; level gates nicer VFX later.
export function levelFromXp(xp) {
  return Math.floor(Math.sqrt(xp / 25)) + 1;
}
export function xpForLevel(level) {
  return Math.pow(level - 1, 2) * 25;
}
