import assert from "node:assert/strict";
import test from "node:test";
import { generate } from "../src/terrain.ts";
import { drawRiver, riverDirections } from "../src/river.ts";
import { buildRiverMesh } from "../src/geometry/buildRiverMesh.ts";

test("river strokes fill skipped cells with reciprocal links and preserve terrain", () => {
  const cells = generate();
  const a = cells.find((c) => c.q === -4 && c.r === 0)!,
    b = cells.find((c) => c.q === 4 && c.r === 0)!;
  const next = drawRiver(cells, a, b);
  assert.equal(next.filter((c) => c.river !== undefined).length, 9);
  assert.deepEqual(
    next.map((c) => c.type),
    cells.map((c) => c.type),
  );
  assert.ok(cells.every((c) => c.river === undefined));
  for (const c of next)
    riverDirections.forEach(([dq, dr], i) => {
      if ((c.river ?? 0) & (1 << i))
        assert.ok(
          (next.find((n) => n.q === c.q + dq && n.r === c.r + dr)!.river ?? 0) &
            (1 << ((i + 3) % 6)),
        );
    });
  assert.deepEqual(drawRiver(next, a, b), next);
  const mesh = buildRiverMesh(next),
    normals = mesh.getAttribute("normal");
  assert.ok(normals.count > 0);
  for (let i = 0; i < normals.count; i++) assert.ok(normals.getY(i) > 0);
  mesh.dispose();
});
