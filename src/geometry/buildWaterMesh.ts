import { BufferGeometry, Color, Float32BufferAttribute } from "three";
import { SEA_LEVEL } from "./terrainField.ts";
type Point = { x: number; y: number; z: number };
/** Clip the water to the actual terrain/sea-level intersection, not hex borders. */
export function buildWaterMesh(terrain: BufferGeometry) {
  const source = terrain.getAttribute("position"),
    triangles = terrain.getIndex()!;
  const vertices: number[] = [],
    colors: number[] = [],
    depths: number[] = [];
  const vertex = (p: Point) => {
    const depth = Math.max(0, SEA_LEVEL - p.y);
    const color = new Color("#b1d3bd")
      .lerp(new Color("#318f99"), Math.min(1, depth * 2.4))
      .lerp(new Color("#215c78"), Math.max(0, (depth - 0.4) * 0.65));
    vertices.push(p.x, SEA_LEVEL + 0.008, p.z);
    colors.push(color.r, color.g, color.b);
    depths.push(depth);
  };
  for (let i = 0; i < triangles.count; i += 3) {
    const points = [0, 1, 2].map((j) => {
        const k = triangles.getX(i + j);
        return { x: source.getX(k), y: source.getY(k), z: source.getZ(k) };
      }),
      polygon: Point[] = [];
    for (let j = 0; j < 3; j++) {
      const a = points[j],
        b = points[(j + 1) % 3],
        inside = a.y < SEA_LEVEL,
        nextInside = b.y < SEA_LEVEL;
      if (inside) polygon.push(a);
      if (inside !== nextInside) {
        const t = (SEA_LEVEL - a.y) / (b.y - a.y);
        polygon.push({
          x: a.x + (b.x - a.x) * t,
          y: SEA_LEVEL,
          z: a.z + (b.z - a.z) * t,
        });
      }
    }
    for (let j = 1; j < polygon.length - 1; j++) {
      vertex(polygon[0]);
      vertex(polygon[j]);
      vertex(polygon[j + 1]);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(vertices, 3));
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  geometry.setAttribute("waterDepth", new Float32BufferAttribute(depths, 1));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}
