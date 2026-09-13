import assert from "node:assert/strict";
import test from "node:test";
import { generate } from "../src/terrain.ts";
import { buildHexGrid } from "../src/geometry/buildHexGrid.ts";
import { buildTerrainMesh } from "../src/geometry/buildTerrainMesh.ts";
test("mesh grid follows hex borders and remains above water", () => {
  const cells = generate(1, 7);
  const terrain = buildTerrainMesh(cells);
  const grid = buildHexGrid(cells, terrain);
  const p = grid.getAttribute("position");
  assert.ok(p.count > 0);
  for (let i = 0; i < p.count; i++)
    assert.ok(Number.isFinite(p.getY(i)) && p.getY(i) > 0.12);
  grid.dispose();
  terrain.dispose();
});
