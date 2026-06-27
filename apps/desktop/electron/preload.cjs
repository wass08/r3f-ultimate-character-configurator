// Bridge between the Electron main process and the companion renderer.
//
// Two responsibilities:
//   1. Click-through control  — let the renderer pin/unpin the pet window when
//      the pointer is over the character or interactive UI.
//   2. Event delivery         — the MAIN process owns the gateway connection and
//      pushes each received notification event into the renderer here, so the
//      character reacts. The renderer never opens its own socket in pet mode.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("pet", {
  // --- click-through ---
  setClickThrough: (on) => ipcRenderer.send("set-clickthrough", on),
  onClickThrough: (cb) => ipcRenderer.on("clickthrough", (_e, on) => cb(on)),

  // --- notification events from the gateway (via main) ---
  // Returns an unsubscribe fn so React effects can clean up.
  onEvent: (cb) => {
    const handler = (_e, event) => cb(event);
    ipcRenderer.on("companion-event", handler);
    return () => ipcRenderer.removeListener("companion-event", handler);
  },
  // Gateway connection status pushed from main: 'online' | 'connecting' | 'offline'.
  onGatewayStatus: (cb) => {
    const handler = (_e, status) => cb(status);
    ipcRenderer.on("gateway-status", handler);
    return () => ipcRenderer.removeListener("gateway-status", handler);
  },

  // --- pose library ---
  // Convert a dropped FBX/GLB (by its filesystem path) into the pose library.
  // Resolves to { name, file, url, count }.
  convertPose: ({ path, name }) => ipcRenderer.invoke("convert-pose", { path, name }),
});
