// Bridge between the renderer and the Electron pet shell (electron/preload.cjs).
//
// The desktop pet window is click-through by default so it never blocks the apps
// underneath. Hovering the character — or any interactive overlay — temporarily
// makes the window solid so you can actually click/drag it. Everything here is a
// no-op in a normal browser tab (window.pet is undefined), so the same code runs
// in both places.

const bridge = typeof window !== "undefined" ? window.pet : undefined;

export const inPet = !!bridge;

/** true  → user is interacting (window captures the mouse)
 *  false → pass clicks through to the desktop */
export function setInteractive(on) {
  bridge?.setClickThrough(!on);
}

/** Start pinned/click-through so the freshly-spawned pet doesn't grab the cursor. */
export function initPet() {
  bridge?.setClickThrough(true);
}

/** Subscribe to pinned-state changes pushed from the main process (shortcut toggle). */
export function onPinnedChange(cb) {
  bridge?.onClickThrough?.((clickThrough) => cb(clickThrough));
}

/**
 * Spread onto any DOM element that should be clickable: entering it makes the
 * window solid, leaving it returns to click-through. Empty object in the browser.
 */
export const interactive = inPet
  ? {
      onPointerEnter: () => setInteractive(true),
      onPointerLeave: () => setInteractive(false),
    }
  : {};
