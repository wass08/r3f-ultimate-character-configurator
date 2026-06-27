import { create } from "zustand";
import { normalizeEvent } from "../events/schema";
import { actionFor, ACTIONS, levelFromXp, xpForLevel } from "./actions";

// The character's performance state. One action plays at a time; incoming events
// queue so a burst of notifications becomes a little performance instead of a
// flicker. When the queue drains the character settles back into Idle.
//
// This is the consumer end of the event bus: a bus subscriber calls trigger()
// (see runtime/CharacterCanvas). It also works standalone for tests/dev.

const IDLE = { ...ACTIONS.idle, event: null, sentiment: "neutral" };
const MAX_QUEUE = 8; // burst guard — drop the oldest beyond this
const MAX_HISTORY = 30;

let playTimer = null;

export const useCharacterStore = create((set, get) => ({
  current: IDLE, // action currently performing
  playing: false, // true while a non-idle action is on screen
  queue: [], // actions waiting their turn
  history: [], // recent events, newest first (for the feed/debug)
  xp: 0,
  level: 1,
  connection: "offline", // 'offline' | 'connecting' | 'online'
  setConnection: (connection) => set({ connection }),

  /** Entry point. Accepts a raw or normalized event and enqueues an action. */
  trigger: (rawEvent) => {
    const event = normalizeEvent(rawEvent);
    const action = actionFor(event);

    set((s) => ({
      history: [event, ...s.history].slice(0, MAX_HISTORY),
    }));

    if (get().playing) {
      set((s) => ({ queue: [...s.queue, action].slice(-MAX_QUEUE) }));
    } else {
      get()._play(action);
    }
    return action;
  },

  /** Internal: start performing an action and schedule the return to idle. */
  _play: (action) => {
    if (playTimer) clearTimeout(playTimer);
    set((s) => {
      const xp = s.xp + (action.xp || 0);
      return {
        current: action,
        playing: action.id !== "idle",
        xp,
        level: levelFromXp(xp),
      };
    });
    if (action.id === "idle" || !action.durationMs) return;
    playTimer = setTimeout(() => get()._advance(), action.durationMs);
  },

  /** Internal: pop the next queued action, or settle into idle. */
  _advance: () => {
    const { queue } = get();
    if (queue.length) {
      const [next, ...rest] = queue;
      set({ queue: rest });
      get()._play(next);
    } else {
      set({ current: IDLE, playing: false });
    }
  },

  /** Force-stop everything and return to idle. */
  reset: () => {
    if (playTimer) clearTimeout(playTimer);
    set({ current: IDLE, playing: false, queue: [] });
  },

  xpProgress: () => {
    const { level, xp } = get();
    const floor = xpForLevel(level);
    const ceil = xpForLevel(level + 1);
    return ceil === floor ? 1 : (xp - floor) / (ceil - floor);
  },
}));

// Convenience for non-React callers (tests, dev console).
export const triggerAction = (event) => useCharacterStore.getState().trigger(event);
