import assert from "node:assert/strict";
import test from "node:test";
import { generate } from "../src/terrain.ts";

test("landscapes are repeatable with varied coverage at every supported scale", () => {
  for (const size of [7, 8, 16, 30]) {
    for (const seed of [1, 42, 731, 9531, 999999]) {
      const cells = generate(seed, size);
      assert.equal(cells.length, 1 + 3 * size * (size + 1));
      assert.deepEqual(cells, generate(seed, size));
      for (const type of ["water", "land", "mountain"]) {
        const share =
          cells.filter((c) => c.type === type).length / cells.length;
        assert.ok(
          share > 0.035 && share < 0.7,
          `${size}/${seed}: ${type} coverage ${share}`,
        );
      }
    }
  }
});

test("large landscapes differ across seeds and do not repeat translated interior patches", () => {
  const a = generate(731, 30),
    b = generate(732, 30);
  assert.ok(a.filter((c, i) => c.type !== b[i].type).length / a.length > 0.25);
  const map = new Map(a.map((c) => [`${c.q},${c.r}`, c.type]));
  const patches = new Set<string>();
  for (const q of [-12, -6, 0, 6, 12])
    for (const r of [-12, -6, 0, 6, 12]) {
      const patch = [];
      for (let x = 0; x < 6; x++)
        for (let z = 0; z < 6; z++) patch.push(map.get(`${q + x},${r + z}`));
      patches.add(patch.join(","));
    }
  assert.ok(patches.size >= 20, `${patches.size} distinct interior patches`);
});
