import type { Cell } from "./terrain.ts";
import type { RenderSettings } from "./renderSettings.ts";
import { corner, cornerKey, buildRiverGraph } from "./geometry/riverGraph.ts";
import { getRiverNetwork } from "./geometry/riverNetwork.ts";
export function selectRiverCorner(
  cells: Cell[],
  index: number,
  x: number,
  z: number,
  draft: string[],
  settings: RenderSettings,
) {
  const graph = buildRiverGraph(cells),
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
    return result("Select the next adjacent corner. Escape cancels.", [key]);
  }
  if (key === draft[draft.length - 1])
    return result("Select an adjacent corner, or Escape to cancel.");
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
