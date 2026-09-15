import assert from "node:assert/strict";
import test from "node:test";
import {
  buildBoardFrame,
  createBoardFrameProfile,
  terrainFootprint,
} from "../src/geometry/buildBoardFrame.ts";
import { DEFAULT_RENDER_SETTINGS } from "../src/renderSettings.ts";

function insideConvexPolygon(point: [number, number], polygon: [number, number][]) {
  return polygon.every((a, index) => {
    const b = polygon[(index + 1) % polygon.length];
    return (
      (b[0] - a[0]) * (point[1] - a[1]) -
        (b[1] - a[1]) * (point[0] - a[0]) >=
      -1e-8
    );
  });
}

for (const radius of [7, 30]) {
  test(`board frame clears the complete terrain footprint at size ${radius}`, () => {
    const footprint = terrainFootprint(radius);
    const profile = createBoardFrameProfile(radius);
    assert.equal(footprint.length, 12);
    assert.equal(profile.opening.length, 12);
    for (const point of footprint)
      assert.ok(insideConvexPolygon(point, profile.opening));
  });
}

test("board frame keeps a six-sided outer silhouette", () => {
  const profile = createBoardFrameProfile(12);
  const normals = Array.from(
    { length: 6 },
    (_, side) => Math.PI / 6 + (side * Math.PI) / 3,
  );
  for (const [x, z] of profile.outer) {
    const sideDistance = Math.max(
      ...normals.map((angle) => x * Math.cos(angle) + z * Math.sin(angle)),
    );
    assert.ok(Math.abs(sideDistance - profile.outerApothem) < 1e-8);
  }
});

test("board frame geometry encloses the lowest possible seabed", () => {
  const settings = {
    ...DEFAULT_RENDER_SETTINGS,
    terrainSize: 10,
    seabedDepth: 1.3,
    seabedRoughness: 0.8,
    randomness: 0.9,
  };
  const geometry = buildBoardFrame(settings);
  geometry.computeBoundingBox();
  assert.ok(geometry.getAttribute("position").count > 0);
  assert.ok(
    geometry.boundingBox!.min.y <
      -settings.seabedDepth - settings.seabedRoughness * settings.randomness,
  );
  geometry.dispose();
});
