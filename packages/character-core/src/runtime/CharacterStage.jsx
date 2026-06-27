import { ContactShadows, Environment, Float } from "@react-three/drei";
import { Suspense } from "react";
import { Character } from "./Character";
import { CharacterGLB } from "./CharacterGLB";
import { useCharacterStore } from "../actions/characterStore";

// Lean scene: no ground plane (so it can float on a transparent desktop window),
// soft key/fill/rim lights, a contact shadow for grounding, and a gentle idle
// bob that calms down while an action is performing.
//
// Renders an exported character GLB when `models.characterUrl` is set (authored
// in the web configurator), otherwise the built-in base mesh. Both bind the same
// Poses.glb clips. Keyed by url so swapping characters cleanly remounts.
export const CharacterStage = ({ models, onActivity }) => {
  const playing = useCharacterStore((s) => s.playing);

  const body = models.characterUrl ? (
    <CharacterGLB
      key={models.characterUrl}
      position-y={-0.9}
      characterUrl={models.characterUrl}
      posesUrl={models.posesUrl}
      onActivity={onActivity}
    />
  ) : (
    <Character
      position-y={-0.9}
      armatureUrl={models.armatureUrl}
      posesUrl={models.posesUrl}
      onActivity={onActivity}
    />
  );

  return (
    <>
      <Environment preset="sunset" environmentIntensity={0.35} />

      <directionalLight position={[5, 6, 5]} intensity={2.2} castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0001} />
      <directionalLight position={[-5, 5, 5]} intensity={0.6} />
      <directionalLight position={[3, 3, -5]} intensity={4} color="#ff3b3b" />
      <directionalLight position={[-3, 3, -5]} intensity={5} color="#3cb1ff" />

      <Float floatIntensity={playing ? 0.15 : 0.6} rotationIntensity={playing ? 0.05 : 0.25} speed={playing ? 1.5 : 2.5}>
        {/* Suspense so swapping to a freshly-loaded character GLB doesn't blank the scene */}
        <Suspense fallback={null}>{body}</Suspense>
      </Float>

      <ContactShadows position={[0, -0.92, 0]} opacity={0.5} scale={6} blur={2.4} far={3} color="#000000" />
    </>
  );
};
