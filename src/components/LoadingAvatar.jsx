import { animated, useSpring } from "@react-spring/three";

export const LoadingAvatar = ({ loading }) => {
  const { positionY } = useSpring({
    positionY: loading ? 0 : -4,
  });
  return (
    <animated.group position-y={positionY}>
      <mesh>
        <cylinderGeometry args={[0.7, 0.7, 4]} />
        <meshStandardMaterial
          color={"orange"}
          emissive={"orange"}
          emissiveIntensity={5}
          opacity={0.1}
          transparent
        />
      </mesh>
      <mesh position-y={2}>
        <cylinderGeometry args={[0.8, 0.8, 0.1]} />
        <meshStandardMaterial
          color={"orange"}
          emissive={"orange"}
          emissiveIntensity={4}
          opacity={0.8}
          transparent
        />
      </mesh>
      <mesh>
        <cylinderGeometry args={[0.8, 0.8, 0.1]} />
        <meshStandardMaterial
          color={"orange"}
          emissive={"orange"}
          emissiveIntensity={4}
          opacity={0.8}
          transparent
        />
      </mesh>
    </animated.group>
  );
};
