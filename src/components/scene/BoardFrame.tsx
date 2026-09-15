import { useEffect, useMemo } from "react";
import { DoubleSide } from "three";
import type { RenderSettings } from "../../renderSettings";
import { buildBoardFrame } from "../../geometry/buildBoardFrame";

export default function BoardFrame({ settings }: { settings: RenderSettings }) {
  const geometry = useMemo(() => buildBoardFrame(settings), [settings]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh geometry={geometry} raycast={() => null}>
      <meshStandardMaterial
        vertexColors
        roughness={0.78}
        metalness={0.04}
        side={DoubleSide}
      />
    </mesh>
  );
}
