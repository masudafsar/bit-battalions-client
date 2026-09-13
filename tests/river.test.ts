import assert from "node:assert/strict";
import test from "node:test";
import { generate, type Cell } from "../src/terrain.ts";
import { addRiverSource } from "../src/river.ts";
import {
  corner,
  cornerKey,
  getRiverNetwork,
} from "../src/geometry/riverNetwork.ts";
import { createTerrainField, SEA_LEVEL } from "../src/geometry/terrainField.ts";
import { createBaseTerrainField } from "../src/geometry/baseTerrainField.ts";
import { DEFAULT_RENDER_SETTINGS as settings } from "../src/renderSettings.ts";
import { buildRiverMesh } from "../src/geometry/buildRiverMesh.ts";
function fixture(): Cell[] {
  return generate(3, 7).map((c) => ({
    ...c,
    type:
      Math.max(Math.abs(c.q), Math.abs(c.r), Math.abs(c.q + c.r)) >= 5
        ? "water"
        : c.q === 0 && Math.abs(c.r) <= 2
          ? "mountain"
          : "land",
  }));
}
test("only mountain sources draining into boundary-connected sea are accepted", () => {
  const cells = fixture(),
    index = cells.findIndex((c) => c.q === 0 && c.r === 0),
    p = corner(cells[index], 0);
  const result = addRiverSource(cells, index, p.x, p.z, settings);
  assert.notEqual(result.cells, cells);
  assert.equal(result.cells[index].riverSource, 0);
  assert.equal(cells[index].riverSource, undefined);
  const land = cells.findIndex((c) => c.type === "land");
  assert.equal(addRiverSource(cells, land, 0, 0, settings).cells, cells);
  const noSea = cells.map(
    (c) => ({ ...c, type: c.type === "water" ? "land" : c.type }) as Cell,
  );
  assert.equal(addRiverSource(noSea, index, p.x, p.z, settings).cells, noSea);
  const lake = noSea.map(
    (c) => ({ ...c, type: c.q === 2 && c.r === 0 ? "water" : c.type }) as Cell,
  );
  assert.equal(addRiverSource(lake, index, p.x, p.z, settings).cells, lake);
});
test("corner-edge drainage is acyclic, downhill, branched and carved into the terrain", () => {
  const cells = fixture().map((c) =>
    c.type === "mountain" ? { ...c, riverSource: 0 } : c,
  );
  const network = getRiverNetwork(cells, settings),
    field = createTerrainField(cells, settings),
    base = createBaseTerrainField(cells, settings);
  assert.equal(network.validSources.size, 5);
  assert.ok(network.segments.length > 0);
  const incoming = new Map<string, number>();
  for (const c of cells.filter((c) => c.riverSource !== undefined)) {
    const p = corner(c, 0);
    let key = cornerKey(p.x, p.z);
    const visited = new Set<string>();
    for (;;) {
      assert.ok(!visited.has(key));
      visited.add(key);
      const n = network.nodes.get(key)!;
      if (!n.next) {
        assert.ok(n.height < SEA_LEVEL);
        break;
      }
      const next = network.nodes.get(n.next)!;
      assert.ok(n.adjacent.has(n.next));
      assert.ok(n.water > next.water);
      assert.ok(Math.abs(Math.hypot(n.x - next.x, n.z - next.z) - 1) < 1e-6);
      incoming.set(n.next, (incoming.get(n.next) ?? 0) + 1);
      key = n.next;
    }
  }
  assert.ok(
    network.segments.some((s) => s.endWidth > 0.065),
    "tributaries increase downstream width",
  );
  let carved = 0;
  for (const s of network.segments) {
    const x = (s.a.x + s.b.x) / 2,
      z = (s.a.z + s.b.z) / 2,
      y = (s.a.y + s.b.y) / 2;
    assert.ok(s.a.y > s.b.y);
    assert.ok(field(x, z).height <= y - 0.13);
    if (field(x, z).height < base(x, z).height - 0.1) carved++;
  }
  assert.ok(carved > 20);
  const mesh = buildRiverMesh(cells, settings),
    normals = mesh.getAttribute("normal");
  assert.ok(normals.count > 0);
  for (let i = 0; i < normals.count; i++) assert.ok(normals.getY(i) > 0);
  mesh.dispose();
});
test("seeded edge meanders are repeatable and terrain edits invalidate old sources", () => {
  const cells = fixture().map((c) =>
    c.type === "mountain" ? { ...c, riverSource: 0 } : c,
  );
  const a = getRiverNetwork(cells, settings),
    b = getRiverNetwork([...cells], settings);
  assert.deepEqual(a.segments, b.segments);
  assert.notDeepEqual(
    a.segments,
    getRiverNetwork(cells, { ...settings, seed: settings.seed + 1 }).segments,
  );
  const invalid = cells.map(
    (c) => ({ ...c, type: c.type === "mountain" ? "land" : c.type }) as Cell,
  );
  assert.equal(getRiverNetwork(invalid, settings).segments.length, 0);
  const removedSea = cells.map(
    (c) => ({ ...c, type: c.type === "water" ? "land" : c.type }) as Cell,
  );
  assert.equal(getRiverNetwork(removedSea, settings).segments.length, 0);
});

test("large maps preserve valid downhill drainage without repeated graph construction", () => {
  const cells = generate(47, 30).map((c) =>
    c.type === "mountain" ? { ...c, riverSource: 0 } : c,
  );
  const network = getRiverNetwork(cells, settings);
  assert.ok(network.validSources.size > 0);
  assert.equal(getRiverNetwork(cells, settings), network);
  assert.ok(network.segments.every((s) => s.a.y > s.b.y));
});

test("single streams taper gradually and carved beds suppress high-frequency terrain noise", () => {
  const cells = fixture().map((c) =>
    c.q === 0 && c.r === 0 ? { ...c, riverSource: 0 } : c,
  );
  const noisy = {
    ...settings,
    noiseSize: 0.3,
    landRoughness: 1.5,
    randomness: 1,
  };
  const network = getRiverNetwork(cells, noisy),
    field = createTerrainField(cells, noisy);
  assert.ok(network.segments.length > 8);
  assert.ok(Math.min(...network.segments.map((s) => s.width)) <= 0.036);
  assert.ok(Math.max(...network.segments.map((s) => s.endWidth)) > 0.055);
  for (const s of network.segments) {
    assert.ok(s.endWidth >= s.width);
    assert.ok(s.endWidth < 0.12);
    assert.ok(s.endWidth - s.width < 0.002);
    const a = field(
      s.a.x + (s.b.x - s.a.x) * 0.1,
      s.a.z + (s.b.z - s.a.z) * 0.1,
    ).height;
    const b = field(
      s.a.x + (s.b.x - s.a.x) * 0.9,
      s.a.z + (s.b.z - s.a.z) * 0.9,
    ).height;
    assert.ok(a > b, `bed must descend despite terrain noise: ${a} -> ${b}`);
  }
});
