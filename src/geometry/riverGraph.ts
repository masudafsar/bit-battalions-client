import { position, type Cell } from "../terrain.ts";
export const cornerKey = (x: number, z: number) =>
  `${Math.round(x * 1e6)},${Math.round(z * 1e6)}`;
export function corner(cell: Cell, index: number) {
  const [x, , z] = position(cell.q, cell.r),
    a = Math.PI / 6 + (index * Math.PI) / 3;
  return { x: x + Math.cos(a), z: z + Math.sin(a) };
}
export type CornerNode = {
  x: number;
  z: number;
  cells: Cell[];
  adjacent: Set<string>;
  ocean: boolean;
};
export function buildRiverGraph(cells: Cell[]) {
  const nodes = new Map<string, CornerNode>(),
    lookup = new Map(cells.map((c) => [`${c.q},${c.r}`, c]));
  const directions = [
    [1, 0],
    [0, 1],
    [-1, 1],
    [-1, 0],
    [0, -1],
    [1, -1],
  ];
  const ocean = new Set<Cell>(),
    flood = cells.filter(
      (c) =>
        c.type === "water" &&
        directions.some(([q, r]) => !lookup.has(`${c.q + q},${c.r + r}`)),
    );
  for (const c of flood) ocean.add(c);
  for (let i = 0; i < flood.length; i++)
    for (const [q, r] of directions) {
      const c = lookup.get(`${flood[i].q + q},${flood[i].r + r}`);
      if (c?.type === "water" && !ocean.has(c)) {
        ocean.add(c);
        flood.push(c);
      }
    }
  const edges = new Map<string, { a: string; b: string; cells: Cell[] }>();
  for (const c of cells) {
    const keys = Array.from({ length: 6 }, (_, i) => {
      const p = corner(c, i),
        key = cornerKey(p.x, p.z);
      let n = nodes.get(key);
      if (!n) {
        n = { ...p, cells: [], adjacent: new Set(), ocean: false };
        nodes.set(key, n);
      }
      n.cells.push(c);
      n.ocean ||= ocean.has(c);
      return key;
    });
    for (let i = 0; i < 6; i++) {
      const a = keys[i],
        b = keys[(i + 1) % 6],
        key = [a, b].sort().join("/"),
        e = edges.get(key) ?? { a, b, cells: [] };
      e.cells.push(c);
      edges.set(key, e);
    }
  }
  // Only interior edges with TWO dry incident cells are drawable.
  for (const e of edges.values())
    if (e.cells.length === 2 && e.cells.every((c) => c.type !== "water")) {
      nodes.get(e.a)!.adjacent.add(e.b);
      nodes.get(e.b)!.adjacent.add(e.a);
    }
  return nodes;
}
