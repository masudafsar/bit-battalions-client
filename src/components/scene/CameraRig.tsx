import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import * as THREE from "three";
export default function CameraRig({
  terrainSize,
  reset,
  zoom,
  navigate,
  cameraTool,
}: {
  terrainSize: number;
  reset: number;
  zoom: number;
  navigate: boolean;
  cameraTool: "orbit" | "pan";
}) {
  const { camera, gl, invalidate, size } = useThree();
  const controls = useRef<OrbitControls | null>(null);
  useEffect(() => {
    const orbit = new OrbitControls(camera, gl.domElement);
    orbit.enableDamping = false;
    orbit.enablePan = true;
    orbit.screenSpacePanning = true;
    orbit.minDistance = 15;
    orbit.maxDistance = 600;
    orbit.minPolarAngle = 0.15;
    orbit.maxPolarAngle = Math.PI / 2.3;
    orbit.addEventListener("change", () => invalidate());
    controls.current = orbit;
    return () => {
      orbit.dispose();
      controls.current = null;
    };
  }, [camera, gl, invalidate]);
  useEffect(() => {
    if (!controls.current) return;
    controls.current.mouseButtons = {
      LEFT: navigate
        ? cameraTool === "pan"
          ? THREE.MOUSE.PAN
          : THREE.MOUSE.ROTATE
        : undefined,
      MIDDLE: THREE.MOUSE.PAN,
      RIGHT: THREE.MOUSE.ROTATE,
    };
    controls.current.touches = {
      ONE: navigate
        ? cameraTool === "pan"
          ? THREE.TOUCH.PAN
          : THREE.TOUCH.ROTATE
        : undefined,
      TWO: THREE.TOUCH.DOLLY_PAN,
    };
  }, [navigate, cameraTool]);
  useEffect(() => {
    camera.position
      .set(22, 27, 30)
      .multiplyScalar(
        (terrainSize / 8) * Math.max(1, 1.1 / (size.width / size.height)),
      );
    controls.current?.target.set(0, 0, 0);
    controls.current?.update();
    invalidate();
  }, [reset, terrainSize, camera, invalidate, size.width, size.height]);
  // Three.js cameras are intentionally mutable objects owned by the renderer.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    camera.zoom = zoom;
    camera.updateProjectionMatrix();
    invalidate();
  }, [zoom, camera, invalidate]);
  return null;
}
