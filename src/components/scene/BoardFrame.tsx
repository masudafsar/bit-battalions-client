import { useEffect, useMemo } from "react";
import { BufferGeometry, Color, DoubleSide, Float32BufferAttribute } from "three";
import type { RenderSettings } from "../../renderSettings";

type Point = [number, number, number];

function ringPoint(radius: number, y: number, index: number): Point {
  const angle = (index * Math.PI) / 3;
  return [Math.cos(angle) * radius, y, Math.sin(angle) * radius];
}

function buildFrame(settings: RenderSettings) {
  const openingRadius = Math.sqrt(3) * settings.terrainSize + 0.58;
  const outerRadius = openingRadius + 1.05;
  const top = 0.34;
  const shoulder = top - 0.14;
  const bottom =
    -settings.seabedDepth -
    settings.seabedRoughness * settings.randomness -
    0.75;
  const vertices: number[] = [];
  const colors: number[] = [];

  const face = (a: Point, b: Point, c: Point, d: Point, color: string) => {
    const tint = new Color(color);
    vertices.push(...a, ...b, ...c, ...a, ...c, ...d);
    for (let i = 0; i < 6; i++) colors.push(tint.r, tint.g, tint.b);
  };

  for (let i = 0; i < 6; i++) {
    const next = (i + 1) % 6;
    const innerTop = ringPoint(openingRadius + 0.14, top, i);
    const innerTopNext = ringPoint(openingRadius + 0.14, top, next);
    const innerShoulder = ringPoint(openingRadius, shoulder, i);
    const innerShoulderNext = ringPoint(openingRadius, shoulder, next);
    const outerTop = ringPoint(outerRadius - 0.12, top, i);
    const outerTopNext = ringPoint(outerRadius - 0.12, top, next);
    const outerShoulder = ringPoint(outerRadius, shoulder, i);
    const outerShoulderNext = ringPoint(outerRadius, shoulder, next);

    face(innerTop, innerTopNext, outerTopNext, outerTop, "#8b6848");
    face(innerShoulder, innerShoulderNext, innerTopNext, innerTop, "#725037");
    face(outerTop, outerTopNext, outerShoulderNext, outerShoulder, "#67462f");
    face(
      innerShoulder,
      ringPoint(openingRadius, bottom, i),
      ringPoint(openingRadius, bottom, next),
      innerShoulderNext,
      "#4b3528",
    );
    face(
      outerShoulder,
      outerShoulderNext,
      ringPoint(outerRadius, bottom, next),
      ringPoint(outerRadius, bottom, i),
      "#523827",
    );
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(vertices, 3));
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

export default function BoardFrame({ settings }: { settings: RenderSettings }) {
  const geometry = useMemo(() => buildFrame(settings), [settings]);

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
