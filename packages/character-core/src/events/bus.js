import { normalizeEvent } from "./schema";

// The character's event pipeline — a tiny, dependency-free pub/sub bus.
//
// This is the seam that makes the character standalone: every source (the
// desktop tray, OS notifications, the gateway socket, the dev panel, an MCP
// call) publishes normalized events here, and the runtime subscribes. Nothing
// on either side knows about the web app, PocketBase, or each other.
export function createCharacterBus({ historySize = 50 } = {}) {
  const subscribers = new Set();
  const history = [];

  return {
    /** Normalize and fan out a raw event to all subscribers. Returns the event. */
    publish(raw) {
      const event = normalizeEvent(raw);
      history.push(event);
      if (history.length > historySize) history.shift();
      for (const fn of subscribers) {
        try {
          fn(event);
        } catch (err) {
          console.error("[character-bus] subscriber threw:", err);
        }
      }
      return event;
    },

    /** Subscribe to events. Returns an unsubscribe function. */
    subscribe(fn) {
      subscribers.add(fn);
      return () => subscribers.delete(fn);
    },

    /** Snapshot of recent events (newest last). */
    history: () => history.slice(),
  };
}
