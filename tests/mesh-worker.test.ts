import { createMeshProgress } from "../src/geometry/meshProgress.ts";
import { buildRiverMesh } from "../src/geometry/buildRiverMesh.ts";
import { meshOBJ } from "../src/geometry/meshOBJ.ts";
import assert from "node:assert/strict";
import test from "node:test";
import { buildTerrainMesh } from "../src/geometry/buildTerrainMesh.ts";
import { buildWaterMesh } from "../src/geometry/buildWaterMesh.ts";
import { packMesh, unpackMesh, meshBuffers } from "../src/geometry/meshTransfer.ts";
import { requestMesh } from "../src/geometry/requestMesh.ts";
import { generate } from "../src/terrain.ts";
import { DEFAULT_RENDER_SETTINGS } from "../src/renderSettings.ts";

test("worker transfer preserves indexed terrain and water attributes without copying buffers", () => {
  const terrain = buildTerrainMesh(generate(1, 7));
  const water = buildWaterMesh(terrain);
  for (const geometry of [terrain, water]) {
    const expected = geometry.toJSON();
    const packed = packMesh(geometry);
    const buffers = meshBuffers(packed);
    const received = structuredClone(packed, { transfer: buffers });
    assert.ok(buffers.every((buffer) => buffer.byteLength === 0));
    const restored = unpackMesh(received);
    assert.deepEqual(restored.toJSON().data, expected.data);
    restored.dispose();
    geometry.dispose();
  }
});

test("mesh jobs terminate on completion, cancellation and worker errors", async (t) => {
  class FakeWorker {
    static jobs: FakeWorker[] = [];
    onmessage?: (event: { data: unknown }) => void;
    onerror?: () => void;
    onmessageerror?: () => void;
    terminated = false;
    constructor() { FakeWorker.jobs.push(this); }
    postMessage() {}
    terminate() { this.terminated = true; }
  }
  const previous = Object.getOwnPropertyDescriptor(globalThis, "Worker");
  Object.defineProperty(globalThis, "Worker", { value: FakeWorker, configurable: true });
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, "Worker", previous);
    else Reflect.deleteProperty(globalThis, "Worker");
  });
  const cells = generate(1, 7);
  const controller = new AbortController();
  const pending = requestMesh(cells, DEFAULT_RENDER_SETTINGS, "preview", controller.signal);
  const cancelled = FakeWorker.jobs.at(-1)!;
  controller.abort();
  await assert.rejects(pending, { name: "AbortError" });
  assert.equal(cancelled.terminated, true);

  const updates: number[] = [];
  const successful = requestMesh(cells, DEFAULT_RENDER_SETTINGS, "export", undefined, (p) => updates.push(p.percent));
  const complete = FakeWorker.jobs.at(-1)!;
  complete.onmessage!({ data: { kind: "progress", percent: 42, stage: "Building terrain" } });
  assert.equal(complete.terminated, false);
  assert.deepEqual(updates, [42]);
  complete.onmessage!({ data: { kind: "export", obj: "o Terrain" } });
  assert.deepEqual(await successful, { kind: "export", obj: "o Terrain" });
  assert.equal(complete.terminated, true);
  assert.deepEqual(updates, [42, 100]);
  complete.onmessage!({ data: { kind: "progress", percent: 50, stage: "Late message" } });
  assert.deepEqual(updates, [42, 100]);

  for (const event of ["onerror", "onmessageerror"] as const) {
    const failed = requestMesh(cells, DEFAULT_RENDER_SETTINGS, "preview");
    const worker = FakeWorker.jobs.at(-1)!;
    worker[event]!();
    await assert.rejects(failed, /Mesh generation failed/);
    assert.equal(worker.terminated, true);
  }
});


test("progress is monotonic, bounded and reports stage changes at shared boundaries", () => {
  const events: { percent: number; stage: string }[] = [];
  const stage = createMeshProgress((progress) => events.push(progress));
  const terrain = stage(0, 70, "Terrain");
  for (let i = 0; i <= 1000; i++) terrain(i / 1000);
  stage(70, 85, "Water")(0);
  stage(70, 85, "Water")(1);
  stage(85, 100, "Finishing")(1);
  terrain(0.5);
  assert.equal(events[0].percent, 0);
  assert.equal(events.at(-1)?.percent, 99);
  assert.ok(events.length < 105);
  assert.ok(events.every((event, index) => !index || event.percent >= events[index - 1].percent));
  assert.ok(events.some((event) => event.percent === 70 && event.stage === "Water"));
});

test("geometry and OBJ report intermediate completed work without changing output", () => {
  const fractions: number[] = [];
  const report = (fraction: number) => fractions.push(fraction);
  const check = () => {
    assert.equal(fractions[0], 0);
    assert.equal(fractions.at(-1), 1);
    assert.ok(fractions.every((f, i) => f >= 0 && f <= 1 && (!i || f >= fractions[i - 1])));
    fractions.length = 0;
  };
  const cells = generate(1, 7);
  const terrain = buildTerrainMesh(cells, DEFAULT_RENDER_SETTINGS, report);
  assert.ok(fractions.some((f) => f > 0 && f < 0.7));
  check();
  const water = buildWaterMesh(terrain, report);
  check();
  const rivers = buildRiverMesh(cells, DEFAULT_RENDER_SETTINGS, false, report);
  check();
  const obj = meshOBJ(terrain, water, rivers, report);
  assert.ok(fractions.some((f) => f > 0 && f < 1));
  check();
  assert.equal(obj, meshOBJ(terrain, water, rivers));
  [terrain, water, rivers].forEach((geometry) => geometry.dispose());
});
