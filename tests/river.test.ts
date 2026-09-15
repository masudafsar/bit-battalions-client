import { removeRiverAt, editRiverAt } from "../src/river.ts";
import assert from "node:assert/strict";
import test from "node:test";
import { generate, generateWithRivers, type Cell } from "../src/terrain.ts";
import {
  buildRiverGraph,
  corner,
  cornerKey,
} from "../src/geometry/riverGraph.ts";
import { getRiverNetwork } from "../src/geometry/riverNetwork.ts";
import { selectRiverCorner, dragRiverCorners } from "../src/river.ts";
import {
  DEFAULT_RENDER_SETTINGS as settings,
  normalizeSettings,
} from "../src/renderSettings.ts";
import { createTerrainField } from "../src/geometry/terrainField.ts";
import { buildTerrainMesh } from "../src/geometry/buildTerrainMesh.ts";
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
function routeFromKey(cells: Cell[], start: string) {
  const graph = buildRiverGraph(cells),
    queue = [[start]],
    seen = new Set([start]);
  for (const path of queue) {
    const key = path.at(-1)!;
    if (path.length > 1 && graph.get(key)!.ocean) return path;
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
test("two source corners on one mountain cell keep independent river paths", () => {
  let cells = fixture();
  const source = cells.find((c) => c.q === 0 && c.r === 0)!;
  const routes = Array.from({ length: 6 }, (_, i) => corner(source, i))
    .map((point) => routeFromKey(cells, cornerKey(point.x, point.z)))
    .filter((path, index, all) => all.findIndex((other) => other[0] === path[0]) === index);
  assert.ok(routes.length >= 2);
  for (const path of routes.slice(0, 2)) {
    let draft: string[] = [];
    for (const key of path) {
      const node = buildRiverGraph(cells).get(key)!;
      const result = selectRiverCorner(
        cells,
        cells.indexOf(
          node.cells.find((cell) => cell.q === source.q && cell.r === source.r) ??
            node.cells[0],
        ),
        node.x,
        node.z,
        draft,
        settings,
      );
      draft = result.draft;
      cells = result.cells;
    }
  }
  const stored = cells.find(
    (cell) => cell.q === source.q && cell.r === source.r,
  )!;
  assert.equal(stored.riverPaths?.length, 2);
  assert.equal(getRiverNetwork(cells, settings).validSources.size, 2);
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
  const outlet = network.segments.filter((s) => Math.abs(s.b.y - (network.nodes.get(trunk.at(-1)!)!.water)) < 1e-9);
  assert.ok(outlet.length > 0);
  const mouth = network.nodes.get(trunk.at(-1)!)!;
  assert.ok(
    outlet.some(
      (s) => Math.hypot(s.b.x - mouth.x, s.b.z - mouth.z) < 1e-9,
    ),
  );
  assert.equal(mouth.water, mouth.height);
  const mouthField = createTerrainField(joined, settings);
  assert.ok(
    Math.abs(mouthField(mouth.x, mouth.z).height - mouth.water) < 1e-9,
    "the final river surface merges exactly into the generated seabed",
  );
  for (const s of outlet) assert.ok(Math.abs(s.endWidth - settings.riverMouthWidth) < 1e-9);
  assert.ok(network.segments.every((s) => s.endWidth <= settings.riverMouthWidth + 1e-9));
  const sourceKey = branch[0], sourceNode = network.nodes.get(sourceKey)!;
  const first = network.segments.find((s) => Math.hypot(s.a.x - sourceNode.x, s.a.z - sourceNode.z) < 1e-6)!;
  assert.ok(first.width <= settings.riverMouthWidth * 0.15);
  const field = createTerrainField(joined, settings);
  assert.ok(
    network.segments.every(
      (s) => s.a.y > s.b.y && s.endWidth >= s.width && s.endWidth < 0.12,
    ),
  );
  for (const s of network.segments) {
    const x = (s.a.x + s.b.x) / 2,
      z = (s.a.z + s.b.z) / 2,
      water = (s.a.y + s.b.y) / 2,
      depth = (s.channelDepth + s.endChannelDepth) / 2;
    assert.ok(field(x, z).height <= water + 1e-9);
    if (depth > 0.5) assert.ok(field(x, z).height < water - 0.04);
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
    const upstream = f(
      s.a.x + (s.b.x - s.a.x) * 0.1,
      s.a.z + (s.b.z - s.a.z) * 0.1,
    ).height;
    const downstream = f(
      s.a.x + (s.b.x - s.a.x) * 0.9,
      s.a.z + (s.b.z - s.a.z) * 0.9,
    ).height;
    assert.ok(
      upstream >= downstream - 1e-9,
      `the channel bed never climbs against the river flow: ${upstream} >= ${downstream}; depth ${s.channelDepth}-${s.endChannelDepth}; water ${s.a.y}-${s.b.y}`,
    );
  }
});

test("river render settings control width, depth, bank softness, and meanders", () => {
  const cells = manualCells();
  const baseline = getRiverNetwork(cells, settings);
  const wider = getRiverNetwork(cells, {
    ...settings,
    riverSourceWidth: 0.08,
    riverMouthWidth: 0.18,
  });
  assert.ok(wider.segments[0].width > baseline.segments[0].width);
  const segment = baseline.segments[Math.floor(baseline.segments.length / 2)];
  const x = (segment.a.x + segment.b.x) / 2,
    z = (segment.a.z + segment.b.z) / 2;
  const deep = createTerrainField(cells, { ...settings, riverDepth: 0.4 });
  const shallow = createTerrainField(cells, { ...settings, riverDepth: 0.04 });
  assert.ok(deep(x, z).height < shallow(x, z).height);
  const straight = getRiverNetwork(cells, { ...settings, riverMeander: 0 });
  assert.notDeepEqual(straight.segments, baseline.segments);
  const normalized = normalizeSettings({
    ...settings,
    riverSourceWidth: 0.12,
    riverMouthWidth: 0.04,
  });
  assert.equal(normalized.riverSourceWidth, 0.04);
  assert.equal(normalized.riverMouthWidth, 0.12);
});

test("corner smoothing rounds manual river turns without moving their selected endpoints", () => {
  const cells = manualCells();
  const sharp = getRiverNetwork(cells, { ...settings, riverCornerSmoothing: 0 });
  const smooth = getRiverNetwork(cells, { ...settings, riverCornerSmoothing: 1 });
  const alignment = (network: ReturnType<typeof getRiverNetwork>) => {
    let lowest = 1;
    for (let i = 8; i < network.segments.length; i += 8) {
      const before = network.segments[i - 1], after = network.segments[i];
      const ax = before.b.x - before.a.x,
        az = before.b.z - before.a.z,
        bx = after.b.x - after.a.x,
        bz = after.b.z - after.a.z;
      lowest = Math.min(lowest, (ax * bx + az * bz) / Math.hypot(ax, az) / Math.hypot(bx, bz));
    }
    return lowest;
  };
  assert.ok(alignment(smooth) > alignment(sharp));
  for (let i = 0; i < sharp.segments.length; i += 8) {
    assert.deepEqual(sharp.segments[i].a, smooth.segments[i].a);
    assert.deepEqual(sharp.segments[i + 7].b, smooth.segments[i + 7].b);
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
    const depth = (s.channelDepth + s.endChannelDepth) / 2;
    assert.ok(height !== undefined && height <= water + 1e-4);
    if (depth > 0.5)
      assert.ok(
        height < water - 0.04,
        `channel mesh must stay submerged: ${height}, ${water}`,
      );
  }
  mesh.dispose();
});

test("river mouths merge into final seabeds across terrain scales and depths", () => {
  const scenarios = [
    { seed: 17, size: 7, seabedDepth: 0.3, seabedRoughness: 0 },
    { seed: 731, size: 14, seabedDepth: 0.85, seabedRoughness: 0.35 },
    { seed: 991, size: 30, seabedDepth: 2, seabedRoughness: 0.8 },
  ];
  for (const scenario of scenarios) {
    const cells = generateWithRivers(scenario.seed, scenario.size);
    const renderSettings = normalizeSettings({
      ...scenario,
      randomness: scenario.size === 30 ? 2 : 1,
    });
    const network = getRiverNetwork(cells, renderSettings);
    const field = createTerrainField(cells, renderSettings);
    const mouths = cells.flatMap((cell) =>
      (cell.riverPaths ?? (cell.riverPath ? [cell.riverPath] : [])).map(
        (path) => path.at(-1)!,
      ),
    );
    assert.ok(mouths.length > 0);
    for (const key of mouths) {
      const mouth = network.nodes.get(key)!;
      assert.ok(mouth.ocean);
      assert.ok(Math.abs(field(mouth.x, mouth.z).height - mouth.water) < 1e-9);
      const outlet = network.segments.find(
        (segment) =>
          Math.hypot(segment.b.x - mouth.x, segment.b.z - mouth.z) < 1e-9,
      );
      assert.ok(outlet, "river reaches the center of its receiving water cell");
      assert.equal(outlet.endChannelDepth, 0);
      assert.ok(Math.abs(outlet.b.y - mouth.height) < 1e-9);
    }
  }
  const cells = generateWithRivers(731, 14);
  const riverMesh = buildRiverMesh(cells);
  const color = riverMesh.getAttribute("color");
  let transparentMouthVertices = 0;
  let opaqueRiverVertices = 0;
  for (let i = 0; i < color.count; i++) {
    if (color.getW(i) < 1e-9) transparentMouthVertices++;
    if (color.getW(i) > 1 - 1e-9) opaqueRiverVertices++;
  }
  assert.ok(transparentMouthVertices > 0);
  assert.ok(opaqueRiverVertices > 0);
  riverMesh.dispose();
});

test("drag strokes connect sampled corners and stop after saving without starting another river", () => {
  const cells = fixture(),
    source = cells.find((c) => c.q === 0 && c.r === 0)!,
    path = route(cells, source),
    graph = buildRiverGraph(cells);
  let result = click(cells, path[0], []);
  for (let i = 1; i < path.length; i++) {
    const a = graph.get(path[i - 1])!,
      b = graph.get(path[i])!;
    result = dragRiverCorners(cells, a, b, result.draft, settings);
    if (i < path.length - 1)
      assert.deepEqual(result.draft, path.slice(0, i + 1));
  }
  assert.deepEqual(result.cells.find((c) => c.riverPath)?.riverPath, path);
  assert.equal(result.draft.length, 0);
  assert.equal(
    dragRiverCorners(
      result.cells,
      graph.get(path[0])!,
      graph.get(path[1])!,
      [],
      settings,
    ).cells,
    result.cells,
  );
});

test("deleting rivers preserves unrelated terrain and removes only dependent tributaries", () => {
  const cells = manualCells(),
    trunk = cells.find((c) => c.riverPath)!.riverPath!,
    source = cells.find((c) => c.q === 0 && c.r === -2)!;
  const branch = route(cells, source, (key) => trunk.includes(key));
  const joined = cells.map((c) =>
    c === source ? { ...c, riverPath: branch } : c,
  );
  const midpoint = (path: string[]) => {
    const [ax, az] = path[0].split(",").map((n) => Number(n) / 1e6),
      [bx, bz] = path[1].split(",").map((n) => Number(n) / 1e6);
    return [(ax + bx) / 2, (az + bz) / 2];
  };
  const [x, z] = midpoint(branch),
    deleted = removeRiverAt(joined, x, z, settings);
  assert.equal(deleted.removed, 1);
  assert.equal(getRiverNetwork(deleted.cells, settings).validSources.size, 1);
  assert.deepEqual(deleted.cells.find((c) => c.riverPath)!.riverPath, trunk);
  const [tx, tz] = midpoint(trunk),
    all = removeRiverAt(joined, tx, tz, settings);
  assert.equal(all.removed, 2);
  assert.equal(getRiverNetwork(all.cells, settings).segments.length, 0);
  assert.deepEqual(
    all.cells.map((c) => c.type),
    joined.map((c) => c.type),
  );
  assert.equal(
    joined.filter((c) => c.riverPath).length,
    2,
    "history snapshot remains unchanged",
  );
  assert.equal(removeRiverAt(joined, 999, 999, settings).cells, joined);
});

test("editing selects an immutable upstream prefix and redraws without joining its old path", () => {
  const cells = manualCells(), owner = cells.findIndex((c) => c.riverPath);
  const old = cells[owner].riverPath!, graph = buildRiverGraph(cells);
  const point = graph.get(old[2])!;
  const selection = editRiverAt(cells, point.x, point.z);
  assert.equal(selection.owner, owner);
  assert.deepEqual(selection.draft, old.slice(0, 3));
  assert.deepEqual(cells[owner].riverPath, old);
  assert.equal(editRiverAt(cells, 999, 999).owner, -1);
  let result = { cells, draft: selection.draft, message: "" };
  for (let i = 3; i < old.length; i++) {
    result = dragRiverCorners(cells, graph.get(old[i - 1])!, graph.get(old[i])!, result.draft, settings, owner);
    if (i < old.length - 1) assert.equal(result.cells, cells);
  }
  assert.notEqual(result.cells, cells);
  assert.deepEqual(result.cells[owner].riverPath, old);
  assert.equal(result.draft.length, 0);
  const start = graph.get(old[0])!;
  assert.deepEqual(selectRiverCorner(cells, cells.indexOf(start.cells[0]), start.x, start.z, selection.draft, settings, owner, true).draft, [old[0]]);
});

test("editing can replace a river with a different manual outlet and preserve the old snapshot", () => {
  const cells = manualCells(), owner = cells.findIndex((c) => c.riverPath);
  const old = [...cells[owner].riverPath!], graph = buildRiverGraph(cells);
  const alternate = route(cells, cells[owner], (key) => graph.get(key)!.ocean && key !== old.at(-1));
  let result = { cells, draft: [old[0]], message: "" };
  for (let i = 1; i < alternate.length; i++)
    result = dragRiverCorners(cells, graph.get(alternate[i - 1])!, graph.get(alternate[i])!, result.draft, settings, owner);
  assert.deepEqual(result.cells[owner].riverPath, alternate);
  assert.deepEqual(cells[owner].riverPath, old);
  assert.ok(getRiverNetwork(result.cells, settings).validSources.has("0,0"));
});

test("editing rejects a new trunk that disconnects an existing tributary", () => {
  const cells = manualCells(), owner = cells.findIndex((c) => c.riverPath);
  const trunk = cells[owner].riverPath!, source = cells.find((c) => c.q === 0 && c.r === -2)!;
  const baseGraph = buildRiverGraph(cells), start = corner(source, 0);
  const branchQueue = [[cornerKey(start.x, start.z)]], branchSeen = new Set(trunk.slice(0, 3));
  let branch: string[] = [];
  for (const path of branchQueue) {
    if (trunk.slice(3, -1).includes(path.at(-1)!)) { branch = path; break; }
    for (const key of baseGraph.get(path.at(-1)!)!.adjacent)
      if (!branchSeen.has(key)) { branchSeen.add(key); branchQueue.push([...path, key]); }
  }
  assert.ok(branch.length);
  const joined = cells.map((c) => c === source ? { ...c, riverPath: branch } : c);
  const graph = buildRiverGraph(joined);
  // Find a coast route avoiding the tributary junction.
  const queue = [[trunk[0]]], seen = new Set([trunk[0], ...branch]);
  let alternate: string[] = [];
  for (const path of queue) {
    if (graph.get(path.at(-1)!)!.ocean) { alternate = path; break; }
    for (const key of graph.get(path.at(-1)!)!.adjacent)
      if (!seen.has(key)) { seen.add(key); queue.push([...path, key]); }
  }
  assert.ok(alternate.length);
  let result = { cells: joined, draft: [trunk[0]], message: "" };
  for (let i = 1; i < alternate.length; i++) {
    const p = graph.get(alternate[i])!;
    result = selectRiverCorner(joined, joined.indexOf(p.cells[0]), p.x, p.z, result.draft, settings, owner);
  }
  assert.equal(result.cells, joined);
  assert.match(result.message, /tributary/);
  assert.equal(getRiverNetwork(joined, settings).validSources.size, 2);
});
