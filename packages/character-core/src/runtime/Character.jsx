import { useGLTF } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import { MeshStandardMaterial } from "three";
import { useCharacterAnimation } from "./useCharacterAnimation";

// The default, backend-free body: renders the base mesh directly (no PocketBase
// asset catalog needed) so there's always a visible character. Used when no
// exported character GLB has been loaded — see CharacterGLB for that.
export const Character = ({ armatureUrl, posesUrl, onActivity, ...props }) => {
  const group = useRef();
  const { nodes } = useGLTF(armatureUrl);
  const { animations } = useGLTF(posesUrl);
  useCharacterAnimation(group, animations);

  // Pleasant default skin so the base mesh reads on its own. Cloned so we never
  // mutate the shared GLTF cache.
  const skin = useMemo(
    () => new MeshStandardMaterial({ color: 0xf5c6a5, roughness: 0.9 }),
    []
  );
  useEffect(() => {
    const mesh = nodes.Plane;
    if (mesh) {
      mesh.material = skin;
      mesh.castShadow = true;
    }
  }, [nodes, skin]);

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
      <group name="Scene">
        <group name="Armature" rotation={[Math.PI / 2, 0, 0]} scale={0.01}>
          {nodes.mixamorigHips && <primitive object={nodes.mixamorigHips} />}
          {nodes.Plane && <primitive object={nodes.Plane} />}
        </group>
      </group>
    </group>
  );
};
