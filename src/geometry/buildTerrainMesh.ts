import { BufferGeometry, Float32BufferAttribute } from "three";
import { position, type Cell } from "../terrain.ts";

import { createTerrainField } from "./terrainField.ts";

import {
  DEFAULT_RENDER_SETTINGS,
  type RenderSettings,
} from "../renderSettings.ts";
const SUBDIVISIONS = 8;
/** A single indexed surface: adjacent hex sectors share the exact same vertices. */
export function buildTerrainMesh(
  cells: Cell[],
  settings: number | RenderSettings = DEFAULT_RENDER_SETTINGS,
) {
  const vertices: number[] = [],
    colors: number[] = [],
    indices: number[] = [];
  const shared = new Map<string, number>();
  const sampleField = createTerrainField(cells, settings);
  function vertex(x: number, z: number) {
    const key = `${Math.round(x * 1e6)},${Math.round(z * 1e6)}`;
    const existing = shared.get(key);
    if (existing !== undefined) return existing;
    const { height, color } = sampleField(x, z);
    const index = vertices.length / 3;
    vertices.push(x, height, z);
    colors.push(color.r, color.g, color.b);
    shared.set(key, index);
    return index;
  }
  for (const cell of cells) {
    const [x, , z] = position(cell.q, cell.r);
    for (let sector = 0; sector < 6; sector++) {
      const a = Math.PI / 6 + (sector * Math.PI) / 3,
        b = a + Math.PI / 3;
      const point = (i: number, j: number) =>
        vertex(
          x + (Math.cos(a) * i + Math.cos(b) * j) / SUBDIVISIONS,
          z + (Math.sin(a) * i + Math.sin(b) * j) / SUBDIVISIONS,
        );
      for (let i = 0; i < SUBDIVISIONS; i++)
        for (let j = 0; j < SUBDIVISIONS - i; j++) {
          indices.push(point(i, j), point(i, j + 1), point(i + 1, j));
          if (i + j < SUBDIVISIONS - 1)
            indices.push(point(i + 1, j), point(i, j + 1), point(i + 1, j + 1));
        }
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(vertices, 3));
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}
