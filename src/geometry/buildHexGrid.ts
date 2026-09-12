import { BufferGeometry, Float32BufferAttribute } from "three";
import { position, type Cell } from "../terrain.ts";
import { SEA_LEVEL } from "./terrainField.ts";

/** Follow the existing mesh vertices along hex borders, including the water surface. */
export function buildHexGrid(cells: Cell[], terrain: BufferGeometry) {
  const surface = terrain.getAttribute("position");
  const key = (x: number, z: number) =>
    `${Math.round((x * 16) / Math.sqrt(3))},${Math.round(z * 16)}`;
  const heights = new Map<string, number>();
  for (let i = 0; i < surface.count; i++)
    heights.set(key(surface.getX(i), surface.getZ(i)), surface.getY(i));
  const vertices: number[] = [];
  const seen = new Set<string>();
  for (const cell of cells) {
    const [x, , z] = position(cell.q, cell.r);
    for (let side = 0; side < 6; side++) {
      const a = Math.PI / 6 + (side * Math.PI) / 3,
        b = a + Math.PI / 3;
      const ax = x + Math.cos(a),
        az = z + Math.sin(a),
        bx = x + Math.cos(b),
        bz = z + Math.sin(b);
      const edge = [key(ax, az), key(bx, bz)].sort().join("/");
      if (seen.has(edge)) continue;
      seen.add(edge);
      for (let i = 0; i < 8; i++) {
        for (const t of [i / 8, (i + 1) / 8]) {
          const px = ax + (bx - ax) * t,
            pz = az + (bz - az) * t;
          const height = heights.get(key(px, pz));
          if (height === undefined)
            throw new Error("Missing hex border vertex");
          vertices.push(px, Math.max(height, SEA_LEVEL + 0.008) + 0.035, pz);
        }
      }
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(vertices, 3));
  return geometry;
}
