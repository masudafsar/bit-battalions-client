import type { Cell } from "./terrain.ts";
export const riverDirections = [
  [1, 0],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [0, -1],
  [1, -1],
] as const;
export function drawRiver(cells: Cell[], from: Cell, to: Cell): Cell[] {
  const steps = Math.max(
    Math.abs(to.q - from.q),
    Math.abs(to.r - from.r),
    Math.abs(to.q + to.r - from.q - from.r),
  );
  const updates = new Map<string, number>();
  const existing = new Map(cells.map((c) => [`${c.q},${c.r}`, c]));
  let previous: Cell | undefined;
  for (let i = 0; i <= steps; i++) {
    const t = steps ? i / steps : 0,
      x = from.q + (to.q - from.q) * t,
      z = from.r + (to.r - from.r) * t,
      y = -x - z;
    let q = Math.round(x),
      r = Math.round(z);
    const ry = Math.round(y);
    const dx = Math.abs(q - x),
      dz = Math.abs(r - z),
      dy = Math.abs(ry - y);
    if (dx > dy && dx > dz) q = -ry - r;
    else if (dz > dy) r = -q - ry;
    const key = `${q},${r}`,
      c = existing.get(key);
    if (!c) {
      previous = undefined;
      continue;
    }
    updates.set(key, updates.get(key) ?? c.river ?? 0);
    if (previous) {
      const direction = riverDirections.findIndex(
        ([dq, dr]) => previous!.q + dq === q && previous!.r + dr === r,
      );
      if (direction >= 0) {
        const prevKey = `${previous.q},${previous.r}`;
        updates.set(
          prevKey,
          (updates.get(prevKey) ?? previous.river ?? 0) | (1 << direction),
        );
        updates.set(key, updates.get(key)! | (1 << ((direction + 3) % 6)));
      }
    }
    previous = c;
  }
  return cells.map((c) => {
    const mask = updates.get(`${c.q},${c.r}`);
    return mask === undefined || mask === c.river ? c : { ...c, river: mask };
  });
}
