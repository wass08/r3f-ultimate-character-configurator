# Reactive Character Companion — Design & MVP

A 3D animated character that reacts to your notifications. A deploy succeeds and
it throws on shades to a Matrix code-rain; a passive-aggressive email from your
boss and an angry bird gets launched at the toast; you finish a task and confetti
goes off. External apps (GitHub Actions, Slack, email rules, any MCP client)
drive it through a single notification endpoint.

The character is a **standalone, event-driven runtime** — deliberately separate
from the web infra. A lightweight Electron shell loads it and wires the OS side
(tray, taskbar, notifications). It reuses the configurator's rig (`Armature.glb`)
and its `Poses.glb` clip library, but depends on neither the configurator nor
PocketBase.

---

## Monorepo layout

```
packages/character-core/      ← standalone character: bus + actions + runtime (no web infra)
  src/events/    schema.js, bus.js          pure JS — safe to import from Node
  src/actions/   actions.js, characterStore.js
  src/runtime/   Character, CharacterStage, CharacterCanvas, vfx/, overlays/   (React + three)

apps/desktop/                 ← lightweight Electron shell
  electron/      main.cjs (window + tray + gateway socket), preload.cjs
  src/           main.jsx (bus ← preload), petBridge.js
  server/        gateway.mjs   (POST /notify + WS)
  mcp/           server.mjs    (MCP tool → gateway)
  public/models/ Armature.glb, Poses.glb

(root)                        ← the original web character configurator, untouched
```

`packages/*` and `apps/*` are npm workspaces.

---

## Pipeline

```
 source ─▶ bus.publish(event) ─▶ action catalog classifies ─▶ runtime performs ─▶ settles to idle
 (tray, OS notif,                (events/schema +              (pose + 2D VFX,
  gateway, MCP, dev panel)        actions/actions)             characterStore queue)
```

The **event bus** (`events/bus.js`) is the seam that makes the character
standalone: every source publishes a normalized event, the runtime subscribes,
and neither side knows about the other, the web app, or PocketBase.

### How events reach the desktop character

```
 GitHub Action / Slack / email / MCP client
        │  POST /notify  (MCP server forwards here too)
        ▼
   gateway.mjs ── WS broadcast ──▶ Electron main (one socket) ── preload IPC ──▶ renderer
                                                                                    │ bus.publish
                                                                                    ▼
                                                                              character reacts
```

The **renderer never opens a socket** — the Electron *main* process owns the
single gateway connection and pushes events through the preload bridge, where
`apps/desktop/src/main.jsx` publishes them onto the bus. The system **tray** is a
second native source: it can inject a test event the same way.

### The event envelope (`events/schema.js`)

```jsonc
{
  "id": "evt_…", "source": "github|slack|email|manual|mcp|system",
  "kind": "deploy_succeeded|ci_failed|task_completed|email_received|mention|…",
  "sentiment": "positive|negative|neutral|urgent",  // inferred if omitted
  "intensity": 0.0-1.0, "actor": "boss|ci-bot|…",
  "title": "…", "body": "…", "ts": 0, "meta": {}
}
```

`normalizeEvent()` is tolerant: only `kind` really matters, and unknown kinds
still map to a default action.

### Actions (`actions/actions.js`)

An **Action = pose + 2D VFX + timing + theme**, all data so new ones are trivial
to add as the character "evolves". `classify(event)` maps an event to an action.

| Action     | Pose (Poses.glb) | VFX        | Triggered by                              |
|------------|------------------|------------|-------------------------------------------|
| celebrate  | King             | confetti   | task_completed, pr_approved, ci_passed    |
| matrix     | Cool             | code-rain  | deploy_succeeded                          |
| angry      | Punch            | projectile | email_received · negative · from boss     |
| wink       | Chill            | hearts     | email_received · positive                 |
| facepalm   | Dram             | rain cloud | ci_failed, deploy_failed, changes req.    |
| alert      | Ninja            | pulse ring | mention / urgent                          |
| think      | Busy             | thought    | neutral / unknown                         |
| idle       | Idle             | —          | resting state                             |

`characterStore.js` plays one action at a time; bursts queue into a little
performance, then settle back to Idle. Each action grants XP → levels (gates
fancier VFX later).

### Package boundaries

`@companion/character-core` exposes three entry points so Node services never
pull in three.js/React:

- `@companion/character-core` — full runtime (React + three)
- `@companion/character-core/events` — pure-JS schema + bus (used by the gateway)
- `@companion/character-core/actions` — pure-JS catalog + classifier (used by MCP)

The runtime owns **no asset paths** and **nothing shell-specific**: model URLs
and an `onActivity` hover callback are injected by the host, so the same
`CharacterCanvas` runs in Electron or a plain browser tab.

---

## Running it

```bash
npm install                                  # first time (installs Electron)

npm run gateway                              # 1) notification gateway (:8787)
npm run desktop                              # 2) vite + the Electron desktop pet
```

Fire a test reaction from anywhere:

```bash
curl -X POST localhost:8787/notify -H 'content-type: application/json' \
  -d '{"source":"github","kind":"deploy_succeeded","title":"Prod deploy ✅"}'
```

**Pet controls:** tray menu (show/hide, pin, send test event, quit);
`Ctrl/Cmd+Shift+P` pin (click-through), `Ctrl/Cmd+Shift+H` hide. Hover the
character or drag the HUD pill to move it.

### Author on the web, render on the pet

The web configurator is the character authoring tool; the pet renders whatever you
export.

1. Customize the avatar in the web app, then click **Export for Pet** — it writes
   a complete, **uncompressed** character GLB (body + equipped assets on the
   `mixamorig:` skeleton; no Draco, so it loads with no decoder). This is separate
   from **Download**, which is Draco-compressed.
2. In the pet's **Pose Studio → Character → Load .glb…**, pick that file. The pet
   swaps to it live (blob URL) and `CharacterGLB` binds the same `Poses.glb`
   actions to it — the export preserves the skeleton, so every reaction still
   works.
3. To make it the default character across restarts, save the exported file as
   `apps/desktop/public/models/character.glb`; the renderer loads it on startup.

`CharacterStage` picks `CharacterGLB` (exported) vs `Character` (built-in base
mesh) from `models.characterUrl`; both share `useCharacterAnimation`.

### Pose Studio — import & preview animations

The desktop app has a **Pose Studio** panel (top-right) for adding new actions
from Mixamo or anywhere:

- **Live preview (no conversion):** drop an `.fbx` / `.glb` and it's parsed
  in-renderer (`runtime/loadClips.js` via `FBXLoader`/`GLTFLoader`) and played on
  the character immediately, reusing the existing animation mixer. Works because
  every Mixamo rig shares the `mixamorig:` bone names the skeleton already uses.
- **Persist to the library (CLI conversion):**
  ```bash
  npm run add-pose -- ~/Downloads/Wave.fbx Wave   # fbx2gltf + gltf-transform
  ```
  Converts FBX→GLB, renames the clip, drops it in
  `apps/desktop/public/models/poses/`, and updates `poses.json`. The same
  converter backs Pose Studio's **Save to library** button (renderer → preload →
  main → `scripts/convert-pose.mjs`). Library poses appear as one-click previews.

To turn a library pose into an event-driven action, add it to `POSES` in
`actions/actions.js` and reference it from an action.

### MCP wiring (GitHub / Slack / editor agents)

```jsonc
{ "command": "node", "args": ["apps/desktop/mcp/server.mjs"],
  "env": { "GATEWAY_URL": "http://localhost:8787" } }
```

Tools: `send_character_notification` (main entry point), `list_actions`.

---

## Roadmap (post-MVP)

1. **Evolution** — XP unlocks new poses/VFX tiers; cosmetics from the configurator.
2. **Bespoke 3D animations** — jump, wave, ride/bounce on the toast, fire the bird.
3. **Native notification taps** — read OS notifications directly (macOS/Windows) as a tray-side source.
4. **Source adapters** — first-class Slack/Gmail/Linear apps over the same `/notify`.
5. **Tauri shell** — swap the Electron host for a ~3MB Tauri build; `character-core` already knows nothing about the host.
6. **User-editable rules** — drag-to-map events → actions in the UI.
```
