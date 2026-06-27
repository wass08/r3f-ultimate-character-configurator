// @companion/character-core — a standalone, event-driven 3D character.
//
// Pipeline:  source → bus.publish(event) → action catalog classifies → runtime
//            performs (pose + 2D VFX) → settles back to idle.
//
// Subpath entry points (see package.json "exports"):
//   @companion/character-core           full runtime (React + three) — this file
//   @companion/character-core/events    pure-JS schema + bus (safe in Node)
//   @companion/character-core/actions   pure-JS action catalog + classifier

// Pure-JS core (also re-exported here for renderer convenience)
export * from "./events";
export * from "./actions/actions";

// Runtime (React + three)
export { CharacterCanvas } from "./runtime/CharacterCanvas";
export { CharacterStage } from "./runtime/CharacterStage";
export { Character } from "./runtime/Character";
export { CharacterGLB } from "./runtime/CharacterGLB";
export { ActionFX } from "./runtime/vfx/ActionFX";
export { HUD } from "./runtime/overlays/HUD";
export { NotificationCard } from "./runtime/overlays/NotificationCard";
export { DevTriggerPanel } from "./runtime/overlays/DevTriggerPanel";
export { PoseStudio } from "./runtime/overlays/PoseStudio";
export { useCharacterStore, triggerAction } from "./actions/characterStore";
export { usePreviewStore } from "./runtime/previewStore";
export { parseAnimationFile, parseAnimationBuffer, fetchAnimationClips } from "./runtime/loadClips";
