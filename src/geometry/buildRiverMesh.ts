import { BufferGeometry, Float32BufferAttribute } from "three";
import { position, type Cell } from "../terrain.ts";
import { riverDirections } from "../river.ts";
import { createTerrainField, SEA_LEVEL } from "./terrainField.ts";
import type { RenderSettings } from "../renderSettings.ts";

export function buildRiverMesh(cells: Cell[], settings?: RenderSettings) {
  const field = settings ? createTerrainField(cells, settings) : null;
  const vertices: number[] = [];
  const indices: number[] = [];
  const existing = new Set(cells.map((c) => `${c.q},${c.r}`));
  const point = (x: number, z: number) => {
    const i = vertices.length / 3;
    vertices.push(
      x,
      field ? Math.max(field(x, z).height, SEA_LEVEL + 0.008) + 0.055 : 0.04,
      z,
    );
    return i;
  };
  for (const c of cells) {
    if (c.river === undefined) continue;
    const [x, , z] = position(c.q, c.r);
    const center = point(x, z);
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6,
        b = ((i + 1) * Math.PI) / 6;
      indices.push(
        center,
        point(x + Math.cos(b) * 0.17, z + Math.sin(b) * 0.17),
        point(x + Math.cos(a) * 0.17, z + Math.sin(a) * 0.17),
      );
    }
    riverDirections.forEach(([dq, dr], direction) => {
      if (
        !(c.river! & (1 << direction)) ||
        !existing.has(`${c.q + dq},${c.r + dr}`)
      )
        return;
      const [endX, , endZ] = position(c.q + dq, c.r + dr);
      const dx = (endX - x) / 2,
        dz = (endZ - z) / 2,
        length = Math.hypot(dx, dz),
        px = (-dz / length) * 0.15,
        pz = (dx / length) * 0.15;
      for (let i = 0; i < 8; i++) {
        const t = i / 8,
          u = (i + 1) / 8;
        const a = point(x + dx * t + px, z + dz * t + pz),
          b = point(x + dx * t - px, z + dz * t - pz),
          d = point(x + dx * u + px, z + dz * u + pz),
          e = point(x + dx * u - px, z + dz * u - pz);
        indices.push(a, d, b, b, d, e);
      }
    });
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
