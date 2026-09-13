import type { ReportProgress } from "./meshProgress.ts";
import { BufferGeometry, Float32BufferAttribute } from "three";
import type { Cell } from "../terrain.ts";
import {
  DEFAULT_RENDER_SETTINGS,
  type RenderSettings,
} from "../renderSettings.ts";
import { getRiverNetwork } from "./riverNetwork.ts";
export function buildRiverMesh(
  cells: Cell[],
  settings: RenderSettings = DEFAULT_RENDER_SETTINGS,
  flat = false,
  onProgress?: ReportProgress,
) {
  const network = getRiverNetwork(cells, settings),
    vertices: number[] = [],
    indices: number[] = [];
  let completed = 0;
  onProgress?.(0);
  for (const s of network.segments) {
    const dx = s.b.x - s.a.x,
      dz = s.b.z - s.a.z,
      length = Math.hypot(dx, dz),
      px = (-dz / length) * s.width,
      pz = (dx / length) * s.width;
    const start = vertices.length / 3;
    vertices.push(
      s.a.x + px,
      flat ? 0.04 : s.a.y,
      s.a.z + pz,
      s.a.x - px,
      flat ? 0.04 : s.a.y,
      s.a.z - pz,
      s.b.x + (px * s.endWidth) / s.width,
      flat ? 0.04 : s.b.y,
      s.b.z + (pz * s.endWidth) / s.width,
      s.b.x - (px * s.endWidth) / s.width,
      flat ? 0.04 : s.b.y,
      s.b.z - (pz * s.endWidth) / s.width,
    );
    indices.push(start, start + 2, start + 1, start + 1, start + 2, start + 3);
    // Rounded overlaps close bends and junctions without cracks.
    const center = vertices.length / 3;
    vertices.push(s.a.x, flat ? 0.04 : s.a.y, s.a.z);
    for (let i = 0; i <= 12; i++) {
      const a = (i * Math.PI) / 6;
      vertices.push(
        s.a.x + Math.cos(a) * s.width,
        flat ? 0.04 : s.a.y,
        s.a.z + Math.sin(a) * s.width,
      );
      if (i) indices.push(center, center + i + 1, center + i);
    }
    onProgress?.(0.95 * ++completed / network.segments.length);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  onProgress?.(1);
  return geometry;
}
