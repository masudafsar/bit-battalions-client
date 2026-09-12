import type { Cell } from "../terrain.ts";
import { fbm, noise, random } from "./noise.ts";

/** Warped continental noise with independent mountain belts, in world coordinates. */
export function generateLandscape(seed: number, radius: number): Cell[] {
  const key = Number.isFinite(seed) ? Math.round(seed) | 0 : 1;
  const scale = 4 + radius * 0.28;
  const offsetX = random(17, 31, key) * 1000;
  const offsetZ = random(71, 13, key) * 1000;
  const samples = [];
  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      if (Math.abs(q + r) > radius) continue;
      const x = Math.sqrt(3) * (q + r / 2),
        z = 1.5 * r;
      const u = x / scale + offsetX,
        v = z / scale + offsetZ;
      const wx = u + fbm(u * 0.6, v * 0.6, key + 103) * 1.3;
      const wz = v + fbm(u * 0.6 + 41, v * 0.6 - 23, key + 211) * 1.3;
      const edge = Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r)) / radius;
      const continental = fbm(wx * 0.65, wz * 0.65, key + 307);
      const coast = noise(x * 0.32 + offsetX, z * 0.32 + offsetZ, key + 409);
      const elevation = continental + coast * 0.12 - Math.pow(edge, 4) * 0.36;
      const belt = 1 - Math.abs(noise(wx * 1.2, wz * 1.2, key + 503));
      const uplift = fbm(wx * 0.75 + 37, wz * 0.75 - 19, key + 601);
      samples.push({ q, r, elevation, rock: belt * 0.7 + uplift * 0.3 });
    }
  }
  // Seeded coverage keeps small and large maps useful without imposing a repeated shape.
  const waterShare = 0.36 + random(43, 67, key) * 0.18;
  const levels = samples.map((c) => c.elevation).sort((a, b) => a - b);
  const seaLevel = levels[Math.floor(levels.length * waterShare)];
  const uplands = samples.filter((c) => c.elevation > seaLevel + 0.035);
  const rocks = uplands.map((c) => c.rock).sort((a, b) => a - b);
  const mountainLevel =
    rocks[Math.floor(rocks.length * (0.73 + random(31, 41, key) * 0.1))] ??
    Infinity;
  return samples.map(({ q, r, elevation, rock }) => ({
    q,
    r,
    type:
      elevation <= seaLevel
        ? "water"
        : elevation > seaLevel + 0.035 && rock >= mountainLevel
          ? "mountain"
          : "land",
  }));
}
