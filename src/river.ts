import type { Cell } from "./terrain.ts";
import type { RenderSettings } from "./renderSettings.ts";
import { corner, getRiverNetwork } from "./geometry/riverNetwork.ts";
export function addRiverSource(
  cells: Cell[],
  index: number,
  x: number,
  z: number,
  settings: RenderSettings,
) {
  let cell = cells[index];
  let selected = 0,
    distance = Infinity;
  for (let i = 0; i < 6; i++) {
    const p = corner(cell, i),
      d = Math.hypot(p.x - x, p.z - z);
    if (d < distance) {
      distance = d;
      selected = i;
    }
  }
  // A corner belongs to up to three cells; accept it from either side of the edge.
  if (cell.type !== "mountain") {
    const target = corner(cell, selected);
    const owner = cells.findIndex(
      (c) =>
        c.type === "mountain" &&
        Array.from({ length: 6 }, (_, i) => corner(c, i)).some(
          (p) => Math.hypot(p.x - target.x, p.z - target.z) < 1e-6,
        ),
    );
    if (owner < 0)
      return { cells, error: "Choose a mountain corner as the river source." };
    index = owner;
    cell = cells[owner];
    selected = Array.from({ length: 6 }, (_, i) => i).find((i) => {
      const p = corner(cell, i);
      return Math.hypot(p.x - target.x, p.z - target.z) < 1e-6;
    })!;
  }
  if (cell.riverSource === selected) return { cells, error: "" };
  const next = cells.map((c, i) =>
    i === index ? { ...c, riverSource: selected } : c,
  );
  if (!getRiverNetwork(next, settings).validSources.has(`${cell.q},${cell.r}`))
    return {
      cells,
      error: "Invalid river: no route from this mountain to the sea.",
    };
  return {
    cells: next,
    error:
      "River connected to the sea. Add mountain sources to create tributaries.",
  };
}
