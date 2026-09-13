import assert from "node:assert/strict";
import test from "node:test";
import { generate, type Cell } from "../src/terrain.ts";
import {
  buildRiverGraph,
  corner,
  cornerKey,
} from "../src/geometry/riverGraph.ts";
import { getRiverNetwork } from "../src/geometry/riverNetwork.ts";
import { selectRiverCorner } from "../src/river.ts";
import { DEFAULT_RENDER_SETTINGS as settings } from "../src/renderSettings.ts";
import { createTerrainField } from "../src/geometry/terrainField.ts";
import { buildTerrainMesh } from "../src/geometry/buildTerrainMesh.ts";
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
// Test fixture helper only: the application never computes a path for the user.
function route(cells: Cell[], source: Cell, target?: (key: string) => boolean) {
  const graph = buildRiverGraph(cells),
    p = corner(source, 0),
    start = cornerKey(p.x, p.z),
    queue = [[start]],
    seen = new Set([start]);
  for (const path of queue) {
    const key = path.at(-1)!;
    if (path.length > 1 && (target ? target(key) : graph.get(key)!.ocean))
      return path;
    for (const next of graph.get(key)!.adjacent)
      if (!seen.has(next)) {
        seen.add(next);
        queue.push([...path, next]);
      }
  }
  throw Error("missing test route");
}
function manualCells() {
  const cells = fixture(),
    source = cells.find((c) => c.q === 0 && c.r === 0)!;
  return cells.map((c) =>
    c === source ? { ...c, riverPath: route(cells, source) } : c,
  );
}
function click(cells: Cell[], key: string, draft: string[]) {
  const n = buildRiverGraph(cells).get(key)!;
  return selectRiverCorner(
    cells,
    cells.indexOf(n.cells[0]),
    n.x,
    n.z,
    draft,
    settings,
  );
}
test("manual corner clicks create only explicitly chosen edges and commit at the coast", () => {
  let cells = fixture();
  const source = cells.find((c) => c.q === 0 && c.r === 0)!,
    path = route(cells, source);
  let draft: string[] = [];
  for (let i = 0; i < path.length; i++) {
    const result = click(cells, path[i], draft);
    draft = result.draft;
    if (i < path.length - 1) {
      assert.equal(result.cells, cells);
      assert.equal(getRiverNetwork(cells, settings).segments.length, 0);
    } else cells = result.cells;
  }
  assert.equal(draft.length, 0);
  assert.deepEqual(cells.find((c) => c.riverPath)?.riverPath, path);
  const network = getRiverNetwork(cells, settings);
  assert.equal(network.segments.length, (path.length - 1) * 8);
  for (let i = 0; i < path.length - 1; i++)
    assert.equal(network.nodes.get(path[i])!.next, path[i + 1]);
});
test("edges require two dry cells; one or two water sides and map boundaries are forbidden", () => {
  const cells = fixture(),
    allDry = cells.map((c) => ({ ...c, type: "land" }) as Cell),
    dryGraph = buildRiverGraph(allDry);
  const a = [...dryGraph.keys()].find(
    (key) => dryGraph.get(key)!.adjacent.size,
  )!;
  const b = [...dryGraph.get(a)!.adjacent][0];
  const owners = dryGraph
    .get(a)!
    .cells.filter((c) => dryGraph.get(b)!.cells.includes(c));
  assert.equal(owners.length, 2);
  for (const count of [1, 2]) {
    const modified = allDry.map((c) =>
      owners.slice(0, count).includes(c) ? { ...c, type: "water" as const } : c,
    );
    assert.ok(!buildRiverGraph(modified).get(a)!.adjacent.has(b));
  }
  const graph = buildRiverGraph(cells);
  for (const [key, n] of graph)
    for (const next of n.adjacent) {
      const other = graph.get(next)!;
      const sides = n.cells.filter((c) => other.cells.includes(c));
      assert.equal(sides.length, 2);
      assert.ok(sides.every((c) => c.type !== "water"));
      assert.ok(
        Math.abs(Math.hypot(n.x - other.x, n.z - other.z) - 1) < 1e-6,
        key,
      );
    }
});
test("skipped corners and loops are rejected; clicking the previous corner removes an edge", () => {
  const cells = fixture(),
    path = route(
      cells,
      cells.find((c) => c.q === 0 && c.r === 0)!,
    );
  assert.deepEqual(click(cells, path[3], [path[0]]).draft, [path[0]]);
  assert.deepEqual(
    click(cells, path[0], path.slice(0, 3)).draft,
    path.slice(0, 3),
  );
  assert.deepEqual(click(cells, path[0], path.slice(0, 2)).draft, [path[0]]);
});
test("invalidated paths and legacy automatic sources never generate replacement routes", () => {
  const cells = manualCells(),
    path = cells.find((c) => c.riverPath)!.riverPath!,
    graph = buildRiverGraph(cells);
  const sides = graph
    .get(path[1])!
    .cells.filter((c) => graph.get(path[2])!.cells.includes(c));
  const changed = cells.map((c) =>
    c === sides[0] ? { ...c, type: "water" as const } : c,
  );
  assert.equal(getRiverNetwork(changed, settings).segments.length, 0);
  const legacy = fixture().map((c) =>
    c.type === "mountain" ? { ...c, riverSource: 0 } : c,
  );
  assert.equal(getRiverNetwork(legacy, settings).segments.length, 0);
  const noSea = cells.map(
    (c) => ({ ...c, type: c.type === "water" ? "land" : c.type }) as Cell,
  );
  assert.equal(getRiverNetwork(noSea, settings).segments.length, 0);
});
test("manually connected tributaries retain downstream slope, taper and seeded meanders", () => {
  const cells = manualCells(),
    trunk = cells.find((c) => c.riverPath)!.riverPath!,
    source = cells.find((c) => c.q === 0 && c.r === -2)!;
  const branch = route(cells, source, (key) => trunk.includes(key));
  const joined = cells.map((c) =>
    c === source ? { ...c, riverPath: branch } : c,
  );
  const network = getRiverNetwork(joined, settings);
  assert.equal(network.validSources.size, 2);
  const field = createTerrainField(joined, settings);
  assert.ok(
    network.segments.every(
      (s) => s.a.y > s.b.y && s.endWidth >= s.width && s.endWidth < 0.12,
    ),
  );
  for (const s of network.segments) {
    const x = (s.a.x + s.b.x) / 2,
      z = (s.a.z + s.b.z) / 2;
    assert.ok(field(x, z).height < (s.a.y + s.b.y) / 2 - 0.1);
  }
  assert.deepEqual(
    network.segments,
    getRiverNetwork([...joined], settings).segments,
  );
  assert.notDeepEqual(
    network.segments,
    getRiverNetwork(joined, { ...settings, seed: settings.seed + 1 }).segments,
  );
  const noisy = {
    ...settings,
    noiseSize: 0.3,
    landRoughness: 1.5,
    randomness: 1,
  };
  const n = getRiverNetwork(cells, noisy),
    f = createTerrainField(cells, noisy);
  for (const s of n.segments) {
    assert.ok(
      f(s.a.x + (s.b.x - s.a.x) * 0.1, s.a.z + (s.b.z - s.a.z) * 0.1).height >
        f(s.a.x + (s.b.x - s.a.x) * 0.9, s.a.z + (s.b.z - s.a.z) * 0.9).height,
    );
  }
});
test("the rendered terrain mesh resolves a narrow channel and stays welded", () => {
  const cells = manualCells();
  const network = getRiverNetwork(cells, settings),
    mesh = buildTerrainMesh(cells, settings),
    p = mesh.getAttribute("position"),
    indices = mesh.index!;
  const edges = new Map<string, number>();
  for (let i = 0; i < indices.count; i += 3) {
    const ids = [indices.getX(i), indices.getX(i + 1), indices.getX(i + 2)];
    for (let j = 0; j < 3; j++) {
      const a = ids[j],
        b = ids[(j + 1) % 3],
        key = a < b ? `${a},${b}` : `${b},${a}`;
      edges.set(key, (edges.get(key) ?? 0) + 1);
    }
  }
  assert.ok([...edges.values()].every((n) => n === 1 || n === 2));
  // All unpaired edges must be on the map perimeter, never near the river.
  for (const [key, count] of edges)
    if (count === 1) {
      const [a, b] = key.split(",").map(Number);
      assert.ok(
        Math.hypot((p.getX(a) + p.getX(b)) / 2, (p.getZ(a) + p.getZ(b)) / 2) >
          8,
      );
    }
  for (const s of network.segments) {
    const x = (s.a.x + s.b.x) / 2,
      z = (s.a.z + s.b.z) / 2,
      water = (s.a.y + s.b.y) / 2;
    let height: number | undefined;
    for (let i = 0; i < indices.count; i += 3) {
      const a = indices.getX(i),
        b = indices.getX(i + 1),
        c = indices.getX(i + 2),
        ax = p.getX(a),
        az = p.getZ(a),
        bx = p.getX(b),
        bz = p.getZ(b),
        cx = p.getX(c),
        cz = p.getZ(c);
      const d = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz),
        u = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / d,
        v = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / d;
      if (u >= -1e-6 && v >= -1e-6 && u + v <= 1 + 1e-6) {
        height = u * p.getY(a) + v * p.getY(b) + (1 - u - v) * p.getY(c);
        break;
      }
    }
    assert.ok(
      height !== undefined && height < water - 0.04,
      `channel mesh must stay submerged: ${height}, ${water}`,
    );
  }
  mesh.dispose();
});
