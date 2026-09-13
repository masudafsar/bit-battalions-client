import type { ReportProgress } from "./meshProgress.ts";
import type { BufferGeometry } from "three";

export function meshOBJ(
  terrain: BufferGeometry,
  water: BufferGeometry,
  rivers: BufferGeometry,
  onProgress?: ReportProgress,
) {
  const lines = ["# Hexterra procedural terrain and water; static surface"];
  let offset = 0;
  let completed = 0;
  const total = [terrain, water, rivers].reduce((sum, geometry) =>
    sum + geometry.getAttribute("position").count * 2 +
    (geometry.index?.count ?? geometry.getAttribute("position").count) / 3, 0);
  const advance = () => {
    if (++completed % 1024 === 0) onProgress?.(0.99 * completed / total);
  };
  onProgress?.(0);
  for (const [name, geometry] of [
    ["Terrain", terrain],
    ["Water", water],
    ["Rivers", rivers],
  ] as const) {
    const positions = geometry.getAttribute("position"),
      normals = geometry.getAttribute("normal"),
      index = geometry.getIndex();
    if (!positions.count) continue;
    lines.push(`o ${name}`);
    for (let i = 0; i < positions.count; i++) {
      advance();
      lines.push(
        `v ${positions.getX(i)} ${positions.getY(i)} ${positions.getZ(i)}`,
      );
    }
    for (let i = 0; i < normals.count; i++) {
      advance();
      lines.push(
        `vn ${normals.getX(i)} ${normals.getY(i)} ${normals.getZ(i)}`,
      );
    }
    for (let i = 0; i < (index?.count ?? positions.count); i += 3) {
      advance();
      lines.push(
        `f ${[0, 1, 2]
          .map((j) => {
            const v = (index ? index.getX(i + j) : i + j) + offset + 1;
            return `${v}//${v}`;
          })
          .join(" ")}`,
      );
    }
    offset += positions.count;
  }
  const obj = lines.join("\n");
  onProgress?.(1);
  return obj;
}
