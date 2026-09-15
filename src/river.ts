import { position, type Cell } from "./terrain.ts";
import type { RenderSettings } from "./renderSettings.ts";
import { corner, cornerKey, buildRiverGraph } from "./geometry/riverGraph.ts";
import { getRiverNetwork } from "./geometry/riverNetwork.ts";
const graphCache = new WeakMap<Cell[], ReturnType<typeof buildRiverGraph>>();
export type RiverReference = { owner: number; pathIndex: number };
const pathsFor = (cell: Cell) =>
  cell.riverPaths ?? (cell.riverPath ? [cell.riverPath] : []);
const sourceId = (cell: Cell, pathIndex: number) =>
  pathIndex ? `${cell.q},${cell.r}@${pathIndex}` : `${cell.q},${cell.r}`;
function withPaths(cell: Cell, paths: string[][]) {
  const next = { ...cell };
  delete next.riverPath;
  delete next.riverPaths;
  if (paths.length === 1) next.riverPath = paths[0];
  else if (paths.length) next.riverPaths = paths;
  return next;
}
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
  editing?: RiverReference | number,
  rewind = false,
) {
  const graph = graphFor(cells),
    cell = cells[index],
    edit =
      typeof editing === "number" ? { owner: editing, pathIndex: 0 } : editing;
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
  if (edit && rewind && draft.includes(key))
    return result("Redraw from this corner. Escape keeps the original river.", draft.slice(0, draft.indexOf(key) + 1));
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
    existing = getRiverNetwork(
      edit === undefined ? cells : cellsWithoutRiver(cells, edit),
      settings,
    );
  if (
    !node.ocean &&
    !existing.segments.some((s) => cornerKey(s.a.x, s.a.z) === key)
  )
    return result(
      "Continue along dry edges to the coast or an existing river.",
      path,
    );
  const owner = edit?.owner ?? cells.findIndex(
    (c) =>
      c.type === "mountain" &&
      Array.from({ length: 6 }, (_, i) => corner(c, i)).some(
        (p) => cornerKey(p.x, p.z) === path[0],
      ),
  );
  if (owner < 0)
    return result("The source is no longer a mountain. Start again.", []);
  const pathIndex = edit?.pathIndex ?? pathsFor(cells[owner]).length;
  const next = cells.map((c, i) => {
    if (i !== owner) return c;
    const paths = pathsFor(c);
    return withPaths(
      c,
      edit ? paths.map((stored, j) => (j === pathIndex ? path : stored)) : [...paths, path],
    );
  });
  if (
    !getRiverNetwork(next, settings).validSources.has(
      sourceId(cells[owner], pathIndex),
    )
  )
    return result(
      "Invalid river: the selected path must drain to the sea without loops.",
    );
  if (edit) {
    const valid = getRiverNetwork(next, settings).validSources;
    if ([...getRiverNetwork(cells, settings).validSources].some((source) => !valid.has(source)))
      return result("This edit disconnects a tributary. Keep its junction on the new path.", path);
  }
  return result(edit === undefined ? "Manual river saved." : "River updated. Undo restores the original path.", [], next);
}

/** Sample the actual pointer stroke; never search for a route to a distant corner. */
export function dragRiverCorners(
  cells: Cell[],
  from: { x: number; z: number },
  to: { x: number; z: number },
  draft: string[],
  settings: RenderSettings,
  editing?: RiverReference | number,
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
    const next = selectRiverCorner(cells, index, x, z, result.draft, settings, editing);
    if (next.draft !== result.draft || next.cells !== cells) result = next;
    if (result.cells !== cells) break;
  }
  return result;
}

/** Hit-test stored paths for both editing and deletion. */
function riverAt(cells: Cell[], x: number, z: number) {
  let selected: RiverReference | undefined,
    nearest = 0.32;
  cells.forEach((cell, index) => {
    pathsFor(cell).forEach((path, pathIndex) => {
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
        selected = { owner: index, pathIndex };
      }
    }
    });
  });
  return selected;
}
const excludedRiverCache = new WeakMap<Cell[], Map<string, Cell[]>>();
function cellsWithoutRiver(cells: Cell[], reference: RiverReference) {
  let cache = excludedRiverCache.get(cells);
  if (!cache) { cache = new Map(); excludedRiverCache.set(cells, cache); }
  const key = `${reference.owner}:${reference.pathIndex}`,
    cached = cache.get(key);
  if (cached) return cached;
  const result = cells.map((c, i) => {
    if (i !== reference.owner) return c;
    return withPaths(c, pathsFor(c).filter((_, j) => j !== reference.pathIndex));
  });
  cache.set(key, result);
  return result;
}
/** Begin an immutable edit at the nearest corner, retaining its upstream prefix. */
export function editRiverAt(cells: Cell[], x: number, z: number) {
  const reference = riverAt(cells, x, z);
  if (!reference) return { owner: -1, pathIndex: -1, draft: [] as string[] };
  const path = pathsFor(cells[reference.owner])[reference.pathIndex];
  let nearest = Infinity, point = 0;
  // The outlet itself has no downstream section to redraw.
  for (let i = 0; i < path.length - 1; i++) {
    const [px, pz] = path[i].split(",").map((n) => Number(n) / 1e6);
    const distance = Math.hypot(px - x, pz - z);
    if (distance < nearest) { nearest = distance; point = i; }
  }
  return { ...reference, draft: path.slice(0, point + 1) };
}
/** Delete the selected path and tributaries that would lose their sea outlet. */
export function removeRiverAt(cells: Cell[], x: number, z: number, settings: RenderSettings) {
  const selected = riverAt(cells, x, z);
  if (!selected) return { cells, removed: 0 };
  const before = getRiverNetwork(cells, settings).validSources;
  const validPaths = new Set<string[]>();
  cells.forEach((cell) =>
    pathsFor(cell).forEach((path, index) => {
      if (before.has(sourceId(cell, index))) validPaths.add(path);
    }),
  );
  let next = cells.map((c, i) =>
      i === selected.owner
        ? withPaths(c, pathsFor(c).filter((_, j) => j !== selected.pathIndex))
        : c,
    ),
    removed = 1;
  const after = getRiverNetwork(next, settings).validSources;
  next = next.map((cell) => {
    const paths = pathsFor(cell);
    const retained = paths.filter(
      (path, index) =>
        !validPaths.has(path) || after.has(sourceId(cell, index)),
    );
    removed += paths.length - retained.length;
    return retained.length === paths.length ? cell : withPaths(cell, retained);
  });
  return { cells: next, removed };
}
