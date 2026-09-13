import { useMemo, useEffect } from "react";
import {
  BufferGeometry,
  Float32BufferAttribute,
  Line,
  LineBasicMaterial,
} from "three";
export default function RiverDraft({ path }: { path: string[] }) {
  const geometry = useMemo(() => {
    const points: number[] = [];
    for (const key of path) {
      const [x, z] = key.split(",").map((n) => Number(n) / 1e6);
      points.push(x, 0.08, z);
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(points, 3));
    return g;
  }, [path]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const material = useMemo(
    () => new LineBasicMaterial({ color: "#e3a743", depthTest: false }),
    [],
  );
  const line = useMemo(() => {
    const line = new Line(geometry, material);
    line.renderOrder = 6;
    line.raycast = () => {};
    return line;
  }, [geometry, material]);
  useEffect(() => () => material.dispose(), [material]);
  const last = path
    .at(-1)
    ?.split(",")
    .map((n) => Number(n) / 1e6);
  return (
    <group>
      <primitive object={line} />
      {last && (
        <mesh
          position={[last[0], 0.1, last[1]]}
          rotation={[-Math.PI / 2, 0, 0]}
          renderOrder={6}
          raycast={() => null}
        >
          <circleGeometry args={[0.14, 16]} />
          <meshBasicMaterial color="#e3a743" depthTest={false} />
        </mesh>
      )}
    </group>
  );
}
