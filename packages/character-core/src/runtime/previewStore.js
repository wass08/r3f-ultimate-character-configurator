import { create } from "zustand";

// Live-preview state, separate from the action/performance store. When `clip` is
// set, the Character plays it on the existing mixer, overriding the event-driven
// pose, until cleared. `status` drives the Studio panel's spinner/feedback.
//
// status: 'idle' | 'parsing' | 'ready' | 'saving' | 'error'
export const usePreviewStore = create((set) => ({
  clip: null, // THREE.AnimationClip currently previewing (or null)
  clipName: null,
  source: null, // 'file' | 'library'
  status: "idle",
  error: null,

  setStatus: (status, error = null) => set({ status, error }),

  preview: (clip, clipName, source = "file") =>
    set({ clip, clipName, source, status: "ready", error: null }),

  clear: () => set({ clip: null, clipName: null, source: null, status: "idle", error: null }),
}));
