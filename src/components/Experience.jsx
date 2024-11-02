import { animated, useSpring } from "@react-spring/three";
import {
  Environment,
  Float,
  Gltf,
  SoftShadows,
  useProgress,
} from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { useConfiguratorStore } from "../store";
import { Avatar } from "./Avatar";
import { CameraManager } from "./CameraManager";
import { LoadingAvatar } from "./LoadingAvatar";

export const Experience = () => {
  const setScreenshot = useConfiguratorStore((state) => state.setScreenshot);
  const gl = useThree((state) => state.gl);
  useEffect(() => {
    const screenshot = () => {
      const overlayCanvas = document.createElement("canvas");

      overlayCanvas.width = gl.domElement.width;
      overlayCanvas.height = gl.domElement.height;
      const overlayCtx = overlayCanvas.getContext("2d");
      if (!overlayCtx) {
        return;
      }
      // Draw the original rendered image onto the overlay canvas
      overlayCtx.drawImage(gl.domElement, 0, 0);

      // Create an image element for the logo
      const logo = new Image();
      logo.src = "/images/wawasensei-white.png";
      logo.crossOrigin = "anonymous";
      logo.onload = () => {
        // Draw the logo onto the overlay canvas
        const logoWidth = 765 / 4; // Adjust the width of the logo
        const logoHeight = 370 / 4; // Adjust the height of the logo
        const x = overlayCanvas.width - logoWidth - 42; // Adjust the position of the logo
        const y = overlayCanvas.height - logoHeight - 42; // Adjust the position of the logo
        overlayCtx.drawImage(logo, x, y, logoWidth, logoHeight);

        // Create a link element to download the image
        const link = document.createElement("a");
        const date = new Date();
        link.setAttribute(
          "download",
          `Avatar_${
            date.toISOString().split("T")[0]
          }_${date.toLocaleTimeString()}.png`
        );
        link.setAttribute(
          "href",
          overlayCanvas
            .toDataURL("image/png")
            .replace("image/png", "image/octet-stream")
        );
        link.click();
      };
    };
    setScreenshot(screenshot);
  }, [gl]);

  const { active } = useProgress();
  const [loading, setLoading] = useState(active);
  const setLoadingAt = useRef(0);

  useEffect(() => {
    let timeout;
    if (active) {
      timeout = setTimeout(() => {
        setLoading(true);
        setLoadingAt.current = Date.now();
      }, 50); // show spinner only after 50ms
    } else {
      timeout = setTimeout(() => {
        setLoading(false);
      }, Math.max(0, 2000 - (Date.now() - setLoadingAt.current))); // show spinner for at least 2s
    }
    return () => clearTimeout(timeout);
  }, [active]);

  const { scale, spin, floatHeight } = useSpring({
    scale: loading ? 0.5 : 1,
    spin: loading ? Math.PI * 8 : 0,
    floatHeight: loading ? 0.5 : 0,
  });

  return (
    <>
      <CameraManager loading={loading} />
      <Environment preset="sunset" environmentIntensity={0.3} />

      <mesh receiveShadow rotation-x={-Math.PI / 2} position-y={-0.31}>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#333" roughness={0.85} />
      </mesh>

      <SoftShadows size={52} samples={16} focus={0.5} />

      {/* Key Light */}
      <directionalLight
        position={[5, 5, 5]}
        intensity={2.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0001}
      />
      {/* Fill Light */}
      <directionalLight position={[-5, 5, 5]} intensity={0.7} />
      {/* Back Lights */}
      <directionalLight position={[3, 3, -5]} intensity={6} color={"#ff3b3b"} />
      <directionalLight
        position={[-3, 3, -5]}
        intensity={8}
        color={"#3cb1ff"}
      />

      <AvatarWrapper loading={loading}>
        <animated.group
          scale={scale}
          position-y={floatHeight}
          rotation-y={spin}
        >
          <Avatar />
        </animated.group>
      </AvatarWrapper>
      <Gltf
        position-y={-0.31}
        src="/models/Teleporter Base.glb"
        castShadow
        receiveShadow
      />
      <LoadingAvatar loading={loading} />
    </>
  );
};

const AvatarWrapper = ({ loading, children }) => {
  return loading ? (
    <Float floatIntensity={1} speed={6}>
      {children}
    </Float>
  ) : (
    children
  );
};
