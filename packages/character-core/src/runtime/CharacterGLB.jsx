import { useGLTF } from "@react-three/drei";
import { useEffect, useRef } from "react";
import { useCharacterAnimation } from "./useCharacterAnimation";

// Renders a *complete character GLB* exported from the web configurator (body +
// equipped assets, skinned to the mixamorig skeleton) and binds the Poses.glb
// clips to it. Because the export keeps the same skeleton and the Armature
// transform is baked in, we render the scene as-is (no extra rotation/scale) and
// the animation hook drives it exactly like the base mesh.
//
// `characterUrl` may be a normal URL, a blob: URL (drag-dropped file), or a
// packaged asset path. Export uncompressed (no Draco) so it loads without a
// decoder in the pet.
export const CharacterGLB = ({ characterUrl, posesUrl, onActivity, ...props }) => {
  const group = useRef();
  const { scene } = useGLTF(characterUrl);
  const { animations } = useGLTF(posesUrl);
  useCharacterAnimation(group, animations);

  useEffect(() => {
    scene.traverse((o) => {
      if (o.isMesh || o.isSkinnedMesh) o.castShadow = true;
    });
  }, [scene]);

  return (
    <group
      ref={group}
      {...props}
      dispose={null}
      onPointerOver={(e) => {
        e.stopPropagation();
        onActivity?.(true);
        document.body.style.cursor = "grab";
      }}
      onPointerOut={() => {
        onActivity?.(false);
        document.body.style.cursor = "auto";
      }}
    >
      <primitive object={scene} />
    </group>
  );
};
