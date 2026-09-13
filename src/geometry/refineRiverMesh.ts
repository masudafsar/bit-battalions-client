import type { RiverSegment } from "./riverNetwork.ts";
/** Split shared edges on both sides, preserving a welded surface at refinement boundaries. */
export function refineRiverMesh(
  vertices: number[],
  triangles: number[],
  vertex: (x: number, z: number) => number,
  near: (x: number, z: number) => RiverSegment[],
) {
  let faces = triangles;
  const edge = (a: number, b: number) => (a < b ? `${a},${b}` : `${b},${a}`);
  for (let pass = 0; pass < 2; pass++) {
    const splits = new Map<string, number>();
    for (let i = 0; i < faces.length; i += 3) {
      const ids = faces.slice(i, i + 3),
        x = ids.reduce((v, id) => v + vertices[id * 3], 0) / 3,
        z = ids.reduce((v, id) => v + vertices[id * 3 + 2], 0) / 3;
      const close = near(x, z).some((s) => {
        const dx = s.b.x - s.a.x,
          dz = s.b.z - s.a.z,
          t = Math.max(
            0,
            Math.min(
              1,
              ((x - s.a.x) * dx + (z - s.a.z) * dz) / (dx * dx + dz * dz),
            ),
          );
        return (
          Math.hypot(x - s.a.x - dx * t, z - s.a.z - dz * t) < s.endWidth + 0.18
        );
      });
      if (!close) continue;
      for (let j = 0; j < 3; j++) {
        const a = ids[j],
          b = ids[(j + 1) % 3],
          key = edge(a, b);
        if (!splits.has(key))
          splits.set(
            key,
            vertex(
              (vertices[a * 3] + vertices[b * 3]) / 2,
              (vertices[a * 3 + 2] + vertices[b * 3 + 2]) / 2,
            ),
          );
      }
    }
    const next: number[] = [];
    for (let i = 0; i < faces.length; i += 3) {
      const ids = faces.slice(i, i + 3),
        outline: number[] = [];
      let split = false;
      for (let j = 0; j < 3; j++) {
        outline.push(ids[j]);
        const mid = splits.get(edge(ids[j], ids[(j + 1) % 3]));
        if (mid !== undefined) {
          outline.push(mid);
          split = true;
        }
      }
      if (!split) {
        next.push(...ids);
        continue;
      }
      const center = vertex(
        ids.reduce((v, id) => v + vertices[id * 3], 0) / 3,
        ids.reduce((v, id) => v + vertices[id * 3 + 2], 0) / 3,
      );
      for (let j = 0; j < outline.length; j++)
        next.push(center, outline[j], outline[(j + 1) % outline.length]);
    }
    faces = next;
  }
  return faces;
}
