import { position, type Cell } from "../terrain.ts";
import type { RenderSettings } from "../renderSettings.ts";
import { fbm, random } from "./noise.ts";

type Peak = { q: number; r: number; x: number; z: number; height: number };
type Point = { x: number; z: number; height: number };
const PEAK_FALLOFF = 2.45;
const RIDGE_FALLOFF = 3.05;

export function createMountainNetwork(cells: Cell[], settings: RenderSettings) {
  const {
    seed,
    randomness,
    mountainMinHeight: min,
    mountainMaxHeight: max,
  } = settings;
  const peaks: Peak[] = cells
    .filter((c) => c.type === "mountain")
    .sort((a, b) => a.q - b.q || a.r - b.r)
    .map((c) => {
      const [x, , z] = position(c.q, c.r);
      const amount =
        0.5 + (random(c.q, c.r, seed + 9) - 0.5) * Math.min(1, randomness);
      return {
        q: c.q,
        r: c.r,
        x: x + (random(c.q, c.r, seed) - 0.5) * 0.7 * randomness,
        z: z + (random(c.q, c.r, seed + 3) - 0.5) * 0.7 * randomness,
        height: min + (max - min) * amount,
      };
    });
  const edges = peaks.flatMap((a, i) =>
    peaks.slice(i + 1).flatMap((b, j) =>
      Math.max(
        Math.abs(a.q - b.q),
        Math.abs(a.r - b.r),
        Math.abs(a.q + a.r - b.q - b.r),
      ) === 1
        ? [
            {
              a: i,
              b: i + j + 1,
              weight: random(a.q + b.q, a.r + b.r, seed + 177),
            },
          ]
        : [],
    ),
  );
  edges.sort((a, b) => a.weight - b.weight || a.a - b.a || a.b - b.b);
  const parents = peaks.map((_, i) => i);
  const root = (i: number): number =>
    parents[i] === i ? i : (parents[i] = root(parents[i]));
  const ridges: { a: number; b: number; points: Point[] }[] = [];
  // A spanning forest connects every adjacent cluster without triangular ridge loops.
  for (const edge of edges) {
    const ra = root(edge.a),
      rb = root(edge.b);
    if (ra === rb) continue;
    parents[ra] = rb;
    const a = peaks[edge.a],
      b = peaks[edge.b];
    const dx = b.x - a.x,
      dz = b.z - a.z,
      length = Math.hypot(dx, dz);
    const bend =
      (0.18 + edge.weight * 0.3) *
      (edge.weight < 0.5 ? -1 : 1) *
      Math.min(randomness, 1.5);
    const points = Array.from({ length: 13 }, (_, i) => {
      const t = i / 12,
        envelope = Math.sin(Math.PI * t);
      const offset =
        envelope * (bend + Math.sin(t * Math.PI * 2) * 0.08 * randomness);
      return {
        x: a.x + dx * t - (dz / length) * offset,
        z: a.z + dz * t + (dx / length) * offset,
        height:
          a.height +
          (b.height - a.height) * t -
          envelope * Math.min(a.height, b.height) * 0.18,
      };
    });
    ridges.push({ a: edge.a, b: edge.b, points });
  }
  return { peaks, ridges };
}

export function createMountainField(cells: Cell[], settings: RenderSettings) {
  const { peaks, ridges } = createMountainNetwork(cells, settings);
  const paths = ridges.map((r) =>
    r.points.slice(1).map((b, i) => ({ a: r.points[i], b })),
  );
  // Smooth union softens intersecting rock faces while keeping sharp ridge crests.
  const merge = (a: number, b: number) => {
    const h = Math.max(0, 0.5 - Math.abs(a - b)) / 0.5;
    return Math.max(a, b) + h * h * 0.125;
  };
  return (x: number, z: number) => {
    const nx = x / settings.noiseSize,
      nz = z / settings.noiseSize;
    const wx =
      x +
      fbm(nx * 1.1, nz * 1.1, settings.seed + 811) * 0.18 * settings.randomness;
    const wz =
      z +
      fbm(nx * 1.1 + 19, nz * 1.1, settings.seed + 812) *
        0.18 *
        settings.randomness;
    let height = -100;
    // Let foothills reach the hex boundary instead of concentrating the whole
    // elevation around the center. Rock noise still supplies the sharp crest.
    for (const p of peaks)
      height = merge(
        height,
        p.height - Math.hypot(wx - p.x, wz - p.z) * PEAK_FALLOFF,
      );
    for (const segments of paths) {
      let ridgeHeight = -100;
      for (const { a, b } of segments) {
        // Skip distant segments before doing projection math.
        if (Math.abs(wx - a.x) > 5 || Math.abs(wz - a.z) > 5) continue;
        const dx = b.x - a.x,
          dz = b.z - a.z;
        const t = Math.max(
          0,
          Math.min(
            1,
            ((wx - a.x) * dx + (wz - a.z) * dz) / (dx * dx + dz * dz),
          ),
        );
        const candidate =
          a.height +
          (b.height - a.height) * t -
          Math.hypot(wx - a.x - dx * t, wz - a.z - dz * t) *
            RIDGE_FALLOFF;
        // Union each entire ridge once, avoiding bumps at polyline sample boundaries.
        ridgeHeight = Math.max(ridgeHeight, candidate);
      }
      height = merge(height, ridgeHeight);
    }
    return Math.max(0, Math.min(settings.mountainMaxHeight, height));
  };
}
