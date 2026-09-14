import { position, type Cell } from "./terrain.ts";
import type { RenderSettings } from "./renderSettings.ts";
import { corner, cornerKey, buildRiverGraph } from "./geometry/riverGraph.ts";
import { getRiverNetwork } from "./geometry/riverNetwork.ts";
const graphCache = new WeakMap<Cell[], ReturnType<typeof buildRiverGraph>>();
function graphFor(cells: Cell[]) {
  let graph = graphCache.get(cells);
  if (!graph) {
    graph = buildRiverGraph(cells);
    graphCache.set(cells, graph);
  }
  return graph;
}
export function selectRiverCorner(
  cells: Cell[],
  index: number,
  x: number,
  z: number,
  draft: string[],
  settings: RenderSettings,
) {
  const graph = graphFor(cells),
    cell = cells[index];
  const p = Array.from({ length: 6 }, (_, i) => corner(cell, i)).sort(
    (a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z),
  )[0];
  const key = cornerKey(p.x, p.z),
    node = graph.get(key)!;
  const result = (message: string, path = draft, next = cells) => ({
    message,
    draft: path,
    cells: next,
  });
  if (!draft.length) {
    if (!node.cells.some((c) => c.type === "mountain") || !node.adjacent.size)
      return result("Start at a mountain corner with a dry edge.");
    return result("Drag through neighboring corners. Escape cancels.", [key]);
  }
  if (key === draft[draft.length - 1])
    return result("Drag to continue, or Escape to cancel.");
  if (key === draft[draft.length - 2])
    return result("Last edge removed.", draft.slice(0, -1));
  if (draft.includes(key)) return result("A river cannot loop back on itself.");
  if (!graph.get(draft[draft.length - 1])?.adjacent.has(key))
    return result(
      "Choose a neighboring corner on an edge with land on BOTH sides.",
    );
  const path = [...draft, key],
    existing = getRiverNetwork(cells, settings);
  if (
    !node.ocean &&
    !existing.segments.some((s) => cornerKey(s.a.x, s.a.z) === key)
  )
    return result(
      "Continue along dry edges to the coast or an existing river.",
      path,
    );
  const owner = cells.findIndex(
    (c) =>
      c.type === "mountain" &&
      Array.from({ length: 6 }, (_, i) => corner(c, i)).some(
        (p) => cornerKey(p.x, p.z) === path[0],
      ),
  );
  if (owner < 0)
    return result("The source is no longer a mountain. Start again.", []);
  const next = cells.map((c, i) =>
    i === owner ? { ...c, riverPath: path } : c,
  );
  if (
    !getRiverNetwork(next, settings).validSources.has(
      `${cells[owner].q},${cells[owner].r}`,
    )
  )
    return result(
      "Invalid river: the selected path must drain to the sea without loops.",
    );
  return result("Manual river saved.", [], next);
}

/** Sample the actual pointer stroke; never search for a route to a distant corner. */
export function dragRiverCorners(
  cells: Cell[],
  from: { x: number; z: number },
  to: { x: number; z: number },
  draft: string[],
  settings: RenderSettings,
) {
  let result = { cells, draft, message: "" };
  if (!draft.length) return result;
  const steps = Math.ceil(Math.hypot(to.x - from.x, to.z - from.z) / 0.12);
  for (let i = 1; i <= steps; i++) {
    const t = i / steps,
      x = from.x + (to.x - from.x) * t,
      z = from.z + (to.z - from.z) * t;
    let index = -1,
      distance = Infinity;
    cells.forEach((c, j) => {
      const [cx, , cz] = position(c.q, c.r),
        d = (cx - x) ** 2 + (cz - z) ** 2;
      if (d < distance) {
        distance = d;
        index = j;
      }
    });
    if (index < 0 || distance > 1.01) break;
    const next = selectRiverCorner(cells, index, x, z, result.draft, settings);
    if (next.draft !== result.draft || next.cells !== cells) result = next;
    if (result.cells !== cells) break;
  }
  return result;
}

/** Delete the selected path and tributaries that would lose their sea outlet. */
export function removeRiverAt(
  cells: Cell[],
  x: number,
  z: number,
  settings: RenderSettings,
) {
  let selected = -1,
    nearest = 0.32;
  cells.forEach((cell, index) => {
    const path = cell.riverPath;
    if (!path) return;
    for (let i = 1; i < path.length; i++) {
      const [ax, az] = path[i - 1].split(",").map((n) => Number(n) / 1e6),
        [bx, bz] = path[i].split(",").map((n) => Number(n) / 1e6);
      const dx = bx - ax,
        dz = bz - az,
        length = dx * dx + dz * dz;
      if (!length) continue;
      const t = Math.max(
          0,
          Math.min(1, ((x - ax) * dx + (z - az) * dz) / length),
        ),
        distance = Math.hypot(x - ax - t * dx, z - az - t * dz);
      if (distance < nearest) {
        nearest = distance;
        selected = index;
      }
    }
  });
  if (selected < 0) return { cells, removed: 0 };
  const clear = (cell: Cell) => {
    const next = { ...cell };
    delete next.riverPath;
    return next;
  };
  const before = getRiverNetwork(cells, settings).validSources;
  let next = cells.map((c, i) => (i === selected ? clear(c) : c)),
    removed = 1;
  const after = getRiverNetwork(next, settings).validSources;
  next = next.map((c) => {
    const key = `${c.q},${c.r}`;
    if (c.riverPath && before.has(key) && !after.has(key)) {
      removed++;
      return clear(c);
    }
    return c;
  });
  return { cells: next, removed };
}
