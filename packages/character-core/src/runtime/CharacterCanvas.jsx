import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect } from "react";
import { useCharacterStore } from "../actions/characterStore";
import { CharacterStage } from "./CharacterStage";
import { HUD } from "./overlays/HUD";
import { NotificationCard } from "./overlays/NotificationCard";
import { DevTriggerPanel } from "./overlays/DevTriggerPanel";
import { PoseStudio } from "./overlays/PoseStudio";
import { ActionFX } from "./vfx/ActionFX";

// The mountable character runtime. Give it a bus and the model URLs and it
// renders a transparent, self-contained character that performs an action for
// every event published on the bus. Knows nothing about Electron, the gateway,
// or the web app — the host wires those into the bus.
//
// Props:
//   bus           a character bus (createCharacterBus). Events → actions.
//   models        { armatureUrl, posesUrl }
//   connection    optional 'online'|'connecting'|'offline' for the HUD dot
//   showHUD       show the level/connection HUD (default true)
//   showPanel     show the dev trigger panel (default false)
//   onActivity    (active:boolean) called on character hover (host uses this for
//                 e.g. desktop click-through); also fed to the HUD as a handle
//   hudInteractive optional handlers spread onto the HUD (drag/hover region)
//   showStudio    show the Pose Studio (import/preview animations) (default false)
//   library       [{ name, url }] converted poses for the Studio library
//   onSavePose    optional (file, name) => Promise to persist an imported pose
//   onLoadCharacter optional (file) => void to swap in an exported character GLB
export function CharacterCanvas({
  bus,
  models,
  connection,
  showHUD = true,
  showPanel = false,
  onActivity,
  hudInteractive,
  showStudio = false,
  library = [],
  onSavePose,
  onLoadCharacter,
}) {
  // Bus → store. The single place events become performed actions.
  useEffect(() => {
    if (!bus) return;
    return bus.subscribe((event) => useCharacterStore.getState().trigger(event));
  }, [bus]);

  // Reflect host-provided connection status on the HUD.
  useEffect(() => {
    if (connection) useCharacterStore.getState().setConnection(connection);
  }, [connection]);

  return (
    <>
      <Canvas
        camera={{ position: [0, 0.35, 4.6], fov: 38 }}
        gl={{ alpha: true, preserveDrawingBuffer: true, antialias: true }}
        style={{ position: "fixed", inset: 0 }}
      >
        <Suspense fallback={null}>
          <CharacterStage models={models} onActivity={onActivity} />
        </Suspense>
      </Canvas>

      <ActionFX />
      <NotificationCard />
      {showHUD && <HUD interactive={hudInteractive} />}
      {showStudio && (
        <PoseStudio library={library} onSavePose={onSavePose} onLoadCharacter={onLoadCharacter} />
      )}
      {showPanel && <DevTriggerPanel bus={bus} />}
    </>
  );
}
