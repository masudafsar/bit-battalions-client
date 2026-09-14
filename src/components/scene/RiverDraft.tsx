import { useMemo, useEffect } from "react";
import { BufferGeometry, Float32BufferAttribute } from "three";
function ribbon(path: string[], radius: number) {
  const vertices: number[] = [];
  const points = path.map((key) => key.split(",").map((n) => Number(n) / 1e6));
  const triangle = (
    ax: number,
    az: number,
    bx: number,
    bz: number,
    cx: number,
    cz: number,
  ) => vertices.push(ax, 0.12, az, bx, 0.12, bz, cx, 0.12, cz);
  points.forEach(([x, z], i) => {
    for (let j = 0; j < 20; j++) {
      const a = (j * Math.PI) / 10,
        b = ((j + 1) * Math.PI) / 10;
      triangle(
        x,
        z,
        x + Math.cos(b) * radius,
        z + Math.sin(b) * radius,
        x + Math.cos(a) * radius,
        z + Math.sin(a) * radius,
      );
    }
    if (!i) return;
    const [px, pz] = points[i - 1],
      dx = x - px,
      dz = z - pz,
      length = Math.hypot(dx, dz);
    if (!length) return;
    const nx = (-dz / length) * radius,
      nz = (dx / length) * radius;
    triangle(px + nx, pz + nz, x + nx, z + nz, px - nx, pz - nz);
    triangle(px - nx, pz - nz, x + nx, z + nz, x - nx, z - nz);
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(vertices, 3));
  return geometry;
}
export default function RiverDraft({
  path,
  terrainSize,
}: {
  path: string[];
  terrainSize: number;
}) {
  const scale = Math.max(1, terrainSize / 8);
  const geometries = useMemo(
    () => ({
      border: ribbon(path, 0.22 * scale),
      fill: ribbon(path, 0.13 * scale),
    }),
    [path, scale],
  );
  useEffect(
    () => () => {
      geometries.border.dispose();
      geometries.fill.dispose();
    },
    [geometries],
  );
  const last = path
    .at(-1)
    ?.split(",")
    .map((n) => Number(n) / 1e6);
  return (
    <group>
      <mesh geometry={geometries.border} renderOrder={6} raycast={() => null}>
        <meshBasicMaterial
          color="#ffffff"
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
      <mesh geometry={geometries.fill} renderOrder={7} raycast={() => null}>
        <meshBasicMaterial
          color="#6039e0"
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
      {last && (
        <group
          position={[last[0], 0.15, last[1]]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <mesh renderOrder={8} raycast={() => null}>
            <circleGeometry args={[0.32 * scale, 24]} />
            <meshBasicMaterial
              color="#ffffff"
              depthTest={false}
              depthWrite={false}
            />
          </mesh>
          <mesh renderOrder={9} raycast={() => null}>
            <ringGeometry args={[0.13 * scale, 0.24 * scale, 24]} />
            <meshBasicMaterial
              color="#6039e0"
              depthTest={false}
              depthWrite={false}
            />
          </mesh>
        </group>
      )}
    </group>
  );
}
