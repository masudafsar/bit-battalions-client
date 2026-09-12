import { generateLandscape } from "./geometry/generateLandscape.ts";
export type Terrain = "water" | "land" | "mountain";
export type Cell = { q: number; r: number; type: Terrain };
export const RADIUS = 8;
export const terrainInfo = {
  water: {
    label: "Water",
    description: "Oceans, seas & lakes",
    color: "#569fb6",
    height: 0.26,
  },
  land: {
    label: "Land",
    description: "Meadows & rolling plains",
    color: "#9cb575",
    height: 0.64,
  },
  mountain: {
    label: "Mountain",
    description: "Peaks, ridges & highlands",
    color: "#a6a493",
    height: 0.88,
  },
};
export const position = (q: number, r: number): [number, number, number] => [
  Math.sqrt(3) * (q + r / 2),
  0,
  1.5 * r,
];
export function normalizeTerrainSize(size: number) {
  return Number.isFinite(size)
    ? Math.max(7, Math.min(30, Math.round(size)))
    : RADIUS;
}
export function mapRadius(cells: Cell[]) {
  return Math.max(
    7,
    ...cells.map((c) =>
      Math.max(Math.abs(c.q), Math.abs(c.r), Math.abs(c.q + c.r)),
    ),
  );
}
export function resizeMap(cells: Cell[], size: number): Cell[] {
  const existing = new Map(cells.map((c) => [`${c.q},${c.r}`, c]));
  return generate(1, size).map(
    (c) => existing.get(`${c.q},${c.r}`) ?? { ...c, type: "water" },
  );
}
export function generate(seed = 1, size = RADIUS): Cell[] {
  return generateLandscape(seed, normalizeTerrainSize(size));
}

export function loadMap(size = RADIUS): Cell[] {
  try {
    const saved = JSON.parse(localStorage.getItem("hexterra-map-v1") || "null");
    const base = generate(1, size);
    if (
      Array.isArray(saved) &&
      saved.length === base.length &&
      saved.every(
        (c, i) =>
          c &&
          c.q === base[i].q &&
          c.r === base[i].r &&
          Object.hasOwn(terrainInfo, c.type),
      )
    )
      return saved;
  } catch {
    /* Use the initial landscape when storage is unavailable. */
  }
  return generate(1, size);
}
