import { generateLandscape } from "./geometry/generateLandscape.ts";
import { random } from "./geometry/noise.ts";
import { buildRiverGraph } from "./geometry/riverGraph.ts";
export type Terrain = "water" | "land" | "mountain";
export type Cell = {
  q: number;
  r: number;
  type: Terrain;
  river?: number;
  riverSource?: number;
  riverPath?: string[];
  riverPaths?: string[][];
};
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

/** Generate a deterministic, shared-downstream river network for a new landscape. */
export function generateWithRivers(seed = 1, size = RADIUS): Cell[] {
  const cells = generate(seed, size),
    graph = buildRiverGraph(cells),
    distance = new Map<string, number>(),
    queue: string[] = [];
  for (const [key, node] of graph)
    if (node.ocean) {
      distance.set(key, 0);
      queue.push(key);
    }
  for (let i = 0; i < queue.length; i++) {
    const key = queue[i],
      step = distance.get(key)! + 1;
    for (const next of graph.get(key)!.adjacent)
      if (!distance.has(next)) {
        distance.set(next, step);
        queue.push(next);
      }
  }
  const downstream = new Map<string, string>();
  for (const [key, node] of graph) {
    const step = distance.get(key);
    if (!step) continue;
    const options = [...node.adjacent].filter(
      (next) => distance.get(next) === step - 1,
    );
    if (!options.length) continue;
    options.sort((a, b) => {
      const an = graph.get(a)!,
        bn = graph.get(b)!;
      return (
        random(Math.round(an.x * 100), Math.round(an.z * 100), seed + 1201) -
        random(Math.round(bn.x * 100), Math.round(bn.z * 100), seed + 1201)
      );
    });
    downstream.set(key, options[0]);
  }
  const candidates = [...graph.entries()]
    .filter(
      ([key, node]) =>
        distance.has(key) &&
        node.adjacent.size > 0 &&
        node.cells.some((cell) => cell.type === "mountain"),
    )
    .sort(([, a], [, b]) =>
      random(Math.round(a.x * 100), Math.round(a.z * 100), seed + 1709) -
      random(Math.round(b.x * 100), Math.round(b.z * 100), seed + 1709),
    );
  const paths = new Map<string, string[][]>(),
    sources = new Set<string>(),
    wanted = Math.max(1, Math.min(4, Math.floor(size / 8) + 1));
  for (const [start, node] of candidates) {
    if (paths.size >= wanted) break;
    const source = node.cells.find((cell) => cell.type === "mountain")!,
      sourceKey = `${source.q},${source.r}`;
    if (sources.has(sourceKey)) continue;
    const path = [start];
    let key = start;
    while (!graph.get(key)!.ocean && downstream.has(key)) {
      key = downstream.get(key)!;
      path.push(key);
    }
    if (path.length < 3 || !graph.get(path.at(-1)!)!.ocean) continue;
    sources.add(sourceKey);
    paths.set(sourceKey, [path]);
  }
  return cells.map((cell) => {
    const riverPaths = paths.get(`${cell.q},${cell.r}`);
    return riverPaths ? { ...cell, riverPath: riverPaths[0] } : cell;
  });
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
          Object.hasOwn(terrainInfo, c.type) &&
          (c.riverPath === undefined ||
            (Array.isArray(c.riverPath) &&
              c.riverPath.length <= 20000 &&
              c.riverPath.every(
                (key: unknown) =>
                  typeof key === "string" && /^-?\d+,-?\d+$/.test(key),
              ))) &&
          (c.riverPaths === undefined ||
            (Array.isArray(c.riverPaths) &&
              c.riverPaths.length <= 128 &&
              c.riverPaths.every(
                (path: unknown) =>
                  Array.isArray(path) &&
                  path.length <= 20000 &&
                  path.every(
                    (key: unknown) =>
                      typeof key === "string" && /^-?\d+,-?\d+$/.test(key),
                  ),
              ))) &&
          (c.riverSource === undefined ||
            (Number.isInteger(c.riverSource) &&
              c.riverSource >= 0 &&
              c.riverSource < 6)) &&
          (c.river === undefined ||
            (Number.isInteger(c.river) && c.river >= 0 && c.river <= 63)),
      )
    )
      return saved;
  } catch {
    /* Use the initial landscape when storage is unavailable. */
  }
  return generate(1, size);
}
