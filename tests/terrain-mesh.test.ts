import { createMountainNetwork } from "../src/geometry/mountainField.ts";
import { normalizeSettings } from "../src/renderSettings.ts";
import assert from "node:assert/strict";
import test from "node:test";
import { buildTerrainMesh } from "../src/geometry/buildTerrainMesh.ts";
import { buildWaterMesh } from "../src/geometry/buildWaterMesh.ts";
import { createTerrainField, SEA_LEVEL } from "../src/geometry/terrainField.ts";
import { generate, position, resizeMap, mapRadius } from "../src/terrain.ts";

test("generated mesh is one welded manifold surface with one outer boundary", () => {
  const geometry = buildTerrainMesh(generate());
  try {
    const p = geometry.getAttribute("position"),
      n = geometry.getAttribute("normal"),
      index = geometry.getIndex()!;
    const unique = new Set<string>(),
      edges = new Map<string, number>(),
      adjacency = Array.from({ length: p.count }, () => new Set<number>());
    for (let i = 0; i < p.count; i++) {
      unique.add(
        `${Math.round(p.getX(i) * 1e5)},${Math.round(p.getZ(i) * 1e5)}`,
      );
      assert.ok(
        Number.isFinite(p.getY(i)) && n.getY(i) > 0,
        "finite height and upward normal",
      );
    }
    assert.equal(unique.size, p.count, "no duplicated seam vertices");
    for (let i = 0; i < index.count; i += 3)
      for (let j = 0; j < 3; j++) {
        const a = index.getX(i + j),
          b = index.getX(i + ((j + 1) % 3)),
          key = [a, b].sort((a, b) => a - b).join(",");
        edges.set(key, (edges.get(key) || 0) + 1);
        adjacency[a].add(b);
        adjacency[b].add(a);
      }
    const visited = new Set([0]),
      queue = [0];
    for (let k = 0; k < queue.length; k++)
      for (const next of adjacency[queue[k]])
        if (!visited.has(next)) {
          visited.add(next);
          queue.push(next);
        }
    assert.equal(
      visited.size,
      p.count,
      "all vertices belong to one connected surface",
    );
    const boundary = new Map<number, Set<number>>();
    for (const [key, count] of edges) {
      assert.ok(count === 1 || count === 2, "no non-manifold edges");
      if (count === 1) {
        const [a, b] = key.split(",").map(Number);
        if (!boundary.has(a)) boundary.set(a, new Set());
        if (!boundary.has(b)) boundary.set(b, new Set());
        boundary.get(a)!.add(b);
        boundary.get(b)!.add(a);
      }
    }
    assert.ok(boundary.size > 0);
    assert.ok(
      [...boundary.values()].every((v) => v.size === 2),
      "outer boundary has no cracks",
    );
    assert.equal(
      p.count - edges.size + index.count / 3,
      1,
      "disk topology: no internal holes",
    );
  } finally {
    geometry.dispose();
  }
});

test("cell selections control elevation while uniform water stays level", () => {
  const cells = generate().map((c) => ({ ...c, type: "water" as const }));
  const water = buildTerrainMesh(cells);
  const target = cells.findIndex((c) => c.q === 0 && c.r === 0);
  const changed = buildTerrainMesh(
    cells.map((c, i) => (i === target ? { ...c, type: "mountain" } : c)),
  );
  try {
    const a = water.getAttribute("position"),
      b = changed.getAttribute("position");
    assert.equal(a.count, b.count, "painting preserves topology");
    const [x, , z] = position(0, 0);
    let center = -1;
    for (let i = 0; i < a.count; i++) {
      assert.ok(a.getY(i) < SEA_LEVEL);
      if (Math.abs(a.getX(i) - x) < 1e-6 && Math.abs(a.getZ(i) - z) < 1e-6)
        center = i;
    }
    const surface = buildWaterMesh(water);
    const wp = surface.getAttribute("position");
    assert.ok(wp.count > 0);
    for (let i = 0; i < wp.count; i++)
      assert.ok(Math.abs(wp.getY(i) - SEA_LEVEL - 0.008) < 1e-6);
    surface.dispose();
    assert.ok(center >= 0);
    assert.ok(b.getY(center) > 3, "mountain changes the surface height");
  } finally {
    water.dispose();
    changed.dispose();
  }
});

test("seeded randomness is repeatable, changes with seed, and creates varied terrain", () => {
  const cells = generate();
  const a = createTerrainField(cells, 731),
    b = createTerrainField(cells, 731),
    c = createTerrainField(cells, 932);
  let differences = 0;
  const heights = new Set<number>();
  for (const cell of cells) {
    const [x, , z] = position(cell.q, cell.r);
    const first = a(x, z);
    assert.equal(first.height, b(x, z).height);
    if (Math.abs(first.height - c(x, z).height) > 0.001) differences++;
    if (cell.type === "land") heights.add(Math.round(first.height * 100));
  }
  assert.ok(differences > 30);
  assert.ok(heights.size > 10, "land is not flat");
});

test("neighboring mountains form elevated ridges and steep rock faces", () => {
  const cells = generate().map((c) => ({
    ...c,
    type: (c.r === 0 && Math.abs(c.q) < 3 ? "mountain" : "land") as
      "land" | "mountain",
  }));
  const field = createTerrainField(cells);
  let maxSlope = 0;
  for (let x = -3; x < 3; x += 0.15) {
    const ridge = field(x, 0).height;
    assert.ok(ridge > 2, "ridge stays elevated between peaks");
    for (let z = -1.5; z < 1.5; z += 0.15)
      maxSlope = Math.max(
        maxSlope,
        Math.abs(field(x, z + 0.1).height - field(x, z).height) / 0.1,
      );
  }
  assert.ok(maxSlope > 3, "mountain sides have steep gradients");
  const land = buildTerrainMesh(cells.map((c) => ({ ...c, type: "land" })));
  const water = buildWaterMesh(land);
  assert.equal(
    water.getAttribute("position").count,
    0,
    "no water sheet over dry land",
  );
  land.dispose();
  water.dispose();
});

test("isolated mountains carry broad foothills to their hex edges", () => {
  const settings = {
    ...normalizeSettings(null),
    seed: 42,
    randomness: 0,
    mountainMinHeight: 5,
    mountainMaxHeight: 5,
    mountainRoughness: 0,
  };
  const cells = generate().map((c) => ({
    ...c,
    type: (c.q === 0 && c.r === 0 ? "mountain" : "land") as
      | "land"
      | "mountain",
  }));
  const field = createTerrainField(cells, settings);
  const ground = createTerrainField(
    cells.map((c) => ({ ...c, type: "land" as const })),
    settings,
  );
  const centerRise = field(0, 0).height - ground(0, 0).height;
  for (let side = 0; side < 6; side++) {
    const angle = (side * Math.PI) / 3;
    const x = Math.cos(angle) * 0.82;
    const z = Math.sin(angle) * 0.82;
    assert.ok(
      field(x, z).height - ground(x, z).height > centerRise * 0.24,
      "foothills remain visibly elevated near every hex side",
    );
  }
});

test("render settings control mountain heights, ground noise, and seabed relief", () => {
  const defaults = normalizeSettings(null);
  const cells = generate();
  const low = createTerrainField(cells, {
    ...defaults,
    mountainMinHeight: 0.85,
    mountainMaxHeight: 1.65,
  });
  const high = createTerrainField(cells, {
    ...defaults,
    mountainMinHeight: 6.12,
    mountainMaxHeight: 11.88,
  });
  for (const c of cells.filter((c) => c.type === "mountain")) {
    const [x, , z] = position(c.q, c.r);
    assert.ok(high(x, z).height > low(x, z).height + 1);
  }
  const water = cells.map((c) => ({ ...c, type: "water" as const }));
  const flat = createTerrainField(water, { ...defaults, seabedRoughness: 0 });
  const uneven = createTerrainField(water, {
    ...defaults,
    seabedRoughness: 0.7,
  });
  const land = createTerrainField(
    cells.map((c) => ({ ...c, type: "land" as const })),
    { ...defaults, randomness: 0 },
  );
  const elevations = new Set();
  for (const c of cells) {
    const [x, , z] = position(c.q, c.r);
    assert.ok(Math.abs(flat(x, z).height + defaults.seabedDepth) < 1e-6);
    elevations.add(uneven(x, z).height.toFixed(3));
    assert.ok(Math.abs(land(x, z).height - defaults.landHeight) < 1e-6);
  }
  assert.ok(elevations.size > 20);
});

test("beach settings produce gentler coastal gradients than cliffs", () => {
  const cells = generate().map((c) => ({
    ...c,
    type: (c.q >= 0 ? "land" : "water") as "land" | "water",
  }));
  const defaults = normalizeSettings(null);
  const cliff = createTerrainField(cells, {
    ...defaults,
    randomness: 0,
    beachAmount: 0,
  });
  const beach = createTerrainField(cells, {
    ...defaults,
    randomness: 0,
    beachAmount: 1,
    beachWidth: 2,
  });
  let steep = 0,
    gentle = 0;
  for (let x = -3; x < 2; x += 0.05) {
    steep = Math.max(
      steep,
      Math.abs(cliff(x + 0.05, 0).height - cliff(x, 0).height) / 0.05,
    );
    gentle = Math.max(
      gentle,
      Math.abs(beach(x + 0.05, 0).height - beach(x, 0).height) / 0.05,
    );
  }
  assert.ok(
    gentle < steep * 0.65,
    `beach ${gentle} should be gentler than cliff ${steep}`,
  );
});

test("persisted settings reject invalid values and clamp supported ranges", () => {
  const value = normalizeSettings({
    noiseSize: NaN,
    waterOpacity: 99,
    seed: -4,
    mountainHeight: -3,
  });
  assert.equal(value.noiseSize, 1);
  assert.equal(value.waterOpacity, 0.7);
  assert.equal(value.seed, 0);
  assert.equal(value.mountainMinHeight, 0);
  assert.equal(value.mountainMaxHeight, 0);
});

test("mountain ranges migrate, normalize, and persist without changing values", () => {
  const old = normalizeSettings({ mountainHeight: 1.5 });
  assert.equal(old.mountainMinHeight, 5.1);
  assert.ok(Math.abs(old.mountainMaxHeight - 9.9) < 1e-10);
  const reversed = normalizeSettings({
    mountainMinHeight: 8,
    mountainMaxHeight: 2,
  });
  assert.equal(reversed.mountainMinHeight, 2);
  assert.equal(reversed.mountainMaxHeight, 8);
  assert.deepEqual(
    normalizeSettings(JSON.parse(JSON.stringify(reversed))),
    reversed,
  );
});

test("adjacent mountain clusters have curved, repeatable connections without triangular loops", () => {
  const cells = generate().map((c) => ({ ...c, type: "mountain" as const }));
  const settings = normalizeSettings({
    mountainMinHeight: 4,
    mountainMaxHeight: 7,
    randomness: 2,
  });
  const network = createMountainNetwork(cells, settings);
  assert.deepEqual(
    network,
    createMountainNetwork([...cells].reverse(), settings),
  );
  assert.equal(network.ridges.length, network.peaks.length - 1);
  const parent = network.peaks.map((_, i) => i);
  const root = (i: number): number => (parent[i] === i ? i : root(parent[i]));
  for (const ridge of network.ridges) {
    assert.notEqual(root(ridge.a), root(ridge.b), "no ridge cycles");
    parent[root(ridge.a)] = root(ridge.b);
    const a = ridge.points[0],
      b = ridge.points.at(-1)!,
      mid = ridge.points[6];
    assert.ok(
      Math.hypot(mid.x - (a.x + b.x) / 2, mid.z - (a.z + b.z) / 2) > 0.1,
    );
  }
  assert.ok(network.peaks.every((p) => p.height >= 4 && p.height <= 7));
});

test("terrain size is bounded and resizing preserves painted cells", () => {
  assert.equal(normalizeSettings({ terrainSize: 1 }).terrainSize, 7);
  assert.equal(normalizeSettings({ terrainSize: 99 }).terrainSize, 30);
  assert.equal(normalizeSettings({ terrainSize: 9.6 }).terrainSize, 10);
  const original = generate();
  const expanded = resizeMap(original, 30);
  assert.equal(expanded.length, 1 + 3 * 30 * 31);
  assert.equal(mapRadius(expanded), 30);
  const originals = new Map(original.map((c) => [`${c.q},${c.r}`, c]));
  for (const c of expanded) {
    const before = originals.get(`${c.q},${c.r}`);
    if (before) assert.deepEqual(c, before);
    else assert.equal(c.type, "water");
  }
  assert.deepEqual(resizeMap(expanded, 8), original);
  assert.equal(resizeMap(expanded, 7).length, 169);
});
