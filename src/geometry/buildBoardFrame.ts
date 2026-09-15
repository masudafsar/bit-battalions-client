import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
} from "three";
import type { RenderSettings } from "../renderSettings.ts";

export type BoardPoint = [number, number];

type Point3 = [number, number, number];

const SQRT_3 = Math.sqrt(3);
const HEX_APOTHEM_FACTOR = Math.cos(Math.PI / 6);
const OPENING_CLEARANCE = 0.08;
const FRAME_WIDTH = 1.05;

function cross(origin: BoardPoint, a: BoardPoint, b: BoardPoint) {
  return (
    (a[0] - origin[0]) * (b[1] - origin[1]) -
    (a[1] - origin[1]) * (b[0] - origin[0])
  );
}

function convexHull(points: BoardPoint[]) {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const half = (input: BoardPoint[]) => {
    const result: BoardPoint[] = [];
    for (const point of input) {
      while (
        result.length >= 2 &&
        cross(result.at(-2)!, result.at(-1)!, point) <= 1e-9
      )
        result.pop();
      result.push(point);
    }
    return result;
  };
  const lower = half(sorted);
  const upper = half([...sorted].reverse());
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

function expand(point: BoardPoint, amount: number): BoardPoint {
  const length = Math.hypot(...point);
  return [
    point[0] + (point[0] / length) * amount,
    point[1] + (point[1] / length) * amount,
  ];
}

/** Exact convex footprint of the outer corners of a pointy-top hex map. */
export function terrainFootprint(radius: number): BoardPoint[] {
  const centerHull: BoardPoint[] = [
    [SQRT_3 * radius, 0],
    [(SQRT_3 * radius) / 2, 1.5 * radius],
    [(-SQRT_3 * radius) / 2, 1.5 * radius],
    [-SQRT_3 * radius, 0],
    [(-SQRT_3 * radius) / 2, -1.5 * radius],
    [(SQRT_3 * radius) / 2, -1.5 * radius],
  ];
  const cellCorners = Array.from({ length: 6 }, (_, index): BoardPoint => {
    const angle = Math.PI / 6 + (index * Math.PI) / 3;
    return [Math.cos(angle), Math.sin(angle)];
  });
  return convexHull(
    centerHull.flatMap(([x, z]) =>
      cellCorners.map(([cornerX, cornerZ]): BoardPoint => [
        x + cornerX,
        z + cornerZ,
      ]),
    ),
  );
}

function regularHexBoundary(angle: number, apothem: number): BoardPoint {
  let alignment = -Infinity;
  for (let side = 0; side < 6; side++)
    alignment = Math.max(
      alignment,
      Math.cos(angle - (Math.PI / 6 + (side * Math.PI) / 3)),
    );
  const distance = apothem / alignment;
  return [Math.cos(angle) * distance, Math.sin(angle) * distance];
}

export type BoardFrameProfile = {
  opening: BoardPoint[];
  innerTop: BoardPoint[];
  outerTop: BoardPoint[];
  outer: BoardPoint[];
  outerApothem: number;
};

export function createBoardFrameProfile(radius: number): BoardFrameProfile {
  const opening = terrainFootprint(radius).map((point) =>
    expand(point, OPENING_CLEARANCE),
  );
  const innerTop = opening.map((point) => expand(point, 0.14));
  const normals = Array.from(
    { length: 6 },
    (_, side) => Math.PI / 6 + (side * Math.PI) / 3,
  );
  const innerApothem = Math.max(
    ...innerTop.flatMap(([x, z]) =>
      normals.map((angle) => x * Math.cos(angle) + z * Math.sin(angle)),
    ),
  );
  const outerApothem = innerApothem + FRAME_WIDTH;
  const outer = innerTop.map((point) =>
    regularHexBoundary(Math.atan2(point[1], point[0]), outerApothem),
  );
  const outerTop = outer.map((point) => expand(point, -0.12));
  return { opening, innerTop, outerTop, outer, outerApothem };
}

export function buildBoardFrame(settings: RenderSettings) {
  const profile = createBoardFrameProfile(settings.terrainSize);
  const top = 0.34;
  const shoulder = top - 0.14;
  const bottom =
    -settings.seabedDepth -
    settings.seabedRoughness * settings.randomness -
    0.75;
  const vertices: number[] = [];
  const colors: number[] = [];
  const at = ([x, z]: BoardPoint, y: number): Point3 => [x, y, z];
  const face = (a: Point3, b: Point3, c: Point3, d: Point3, color: string) => {
    const tint = new Color(color);
    vertices.push(...a, ...b, ...c, ...a, ...c, ...d);
    for (let i = 0; i < 6; i++) colors.push(tint.r, tint.g, tint.b);
  };

  for (let i = 0; i < profile.opening.length; i++) {
    const next = (i + 1) % profile.opening.length;
    face(
      at(profile.innerTop[i], top),
      at(profile.innerTop[next], top),
      at(profile.outerTop[next], top),
      at(profile.outerTop[i], top),
      "#8b6848",
    );
    face(
      at(profile.opening[i], shoulder),
      at(profile.opening[next], shoulder),
      at(profile.innerTop[next], top),
      at(profile.innerTop[i], top),
      "#725037",
    );
    face(
      at(profile.outerTop[i], top),
      at(profile.outerTop[next], top),
      at(profile.outer[next], shoulder),
      at(profile.outer[i], shoulder),
      "#67462f",
    );
    face(
      at(profile.opening[i], shoulder),
      at(profile.opening[i], bottom),
      at(profile.opening[next], bottom),
      at(profile.opening[next], shoulder),
      "#4b3528",
    );
    face(
      at(profile.outer[i], shoulder),
      at(profile.outer[next], shoulder),
      at(profile.outer[next], bottom),
      at(profile.outer[i], bottom),
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

export const boardOuterCircumradius = (profile: BoardFrameProfile) =>
  profile.outerApothem / HEX_APOTHEM_FACTOR;
