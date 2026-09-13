import { createMountainField } from "./mountainField.ts";
import { Color } from "three";
import { position, type Cell } from "../terrain.ts";
import { fbm, noise } from "./noise.ts";
import {
  resolveSettings,
  DEFAULT_RENDER_SETTINGS,
  type RenderSettings,
} from "../renderSettings.ts";
export const SEA_LEVEL = 0.12;
export function createBaseTerrainField(
  cells: Cell[],
  input: number | RenderSettings = DEFAULT_RENDER_SETTINGS,
) {
  const settings = resolveSettings(input);
  const { seed, randomness } = settings;
  const frequency = 1 / settings.noiseSize;
  const smooth = (a: number, b: number, x: number) => {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  const samples = cells.map((c) => {
    const [x, , z] = position(c.q, c.r);
    return { ...c, x, z };
  });
  const neighborhoods = new Map<string, typeof samples>();
  const searchRadius = Math.max(1.85, 2.8 * settings.beachWidth);
  const mountainField = createMountainField(cells, settings);
  return (x: number, z: number) => {
    const nx = x * frequency,
      nz = z * frequency;
    const wx = x + fbm(nx * 1.5, nz * 1.5, seed) * 0.36 * randomness,
      wz = z + fbm(nx * 1.5 + 31, nz * 1.5 - 17, seed + 1) * 0.36 * randomness;
    let total = 0,
      land = 0,
      mountain = 0,
      broadTotal = 0,
      broadLand = 0;
    const bx = Math.floor(wx / 6),
      bz = Math.floor(wz / 6);
    const bucket = `${bx},${bz}`;
    let nearby = neighborhoods.get(bucket);
    if (!nearby) {
      nearby = samples.filter(
        (c) =>
          c.x >= bx * 6 - searchRadius &&
          c.x <= (bx + 1) * 6 + searchRadius &&
          c.z >= bz * 6 - searchRadius &&
          c.z <= (bz + 1) * 6 + searchRadius,
      );
      neighborhoods.set(bucket, nearby);
    }
    for (const c of nearby) {
      const d = Math.hypot(wx - c.x, wz - c.z);
      const radius = 2.8 * settings.beachWidth;
      if (d < radius) {
        const t = 1 - d / radius,
          w = t * t * t * t * ((4 * d) / radius + 1);
        broadTotal += w;
        if (c.type !== "water") broadLand += w;
      }
      if (d >= 1.85) continue;
      const t = 1 - d / 1.85,
        w = t * t * t * t * ((4 * d) / 1.85 + 1);
      total += w;
      if (c.type !== "water") land += w;
      if (c.type === "mountain") mountain += w;
    }
    land /= total || 1;
    mountain /= total || 1;
    const coastNoise = (fbm(nx * 0.32, nz * 0.32, seed + 301) + 1) * 0.5;
    const beach =
      settings.beachAmount === 0
        ? 0
        : settings.beachAmount === 1
          ? 1
          : 1 -
            smooth(
              settings.beachAmount - 0.13,
              settings.beachAmount + 0.13,
              coastNoise,
            );
    const broad = broadLand / (broadTotal || 1);
    const coastalLand = land * (1 - beach) + broad * beach;
    const groundNoise =
      fbm(nx * 0.65, nz * 0.65, seed + 10) +
      noise(nx * 2.3, nz * 2.3, seed + 20) * 0.175;
    const hills = groundNoise * settings.landRoughness * randomness;
    const bed =
      -settings.seabedDepth +
      groundNoise * settings.seabedRoughness * randomness;
    let height =
      bed * (1 - coastalLand) + (settings.landHeight + hills) * coastalLand;
    if (mountain > 0.005) {
      const ridge = mountainField(x, z);
      const fracture =
        (1 - Math.abs(noise(nx * 2.1, nz * 2.1, seed + 70))) * 0.45 +
        noise(nx * 5.2, nz * 5.2, seed + 90) * 0.13;
      height +=
        Math.pow(mountain, 0.65) *
        Math.max(
          0,
          Math.min(
            settings.mountainMaxHeight,
            ridge +
              ((fracture * settings.mountainRoughness) / 0.45) * randomness,
          ),
        );
    }
    const variation = fbm(nx * 2, nz * 2, seed + 40) * randomness;
    const color = new Color("#536449");
    if (height < SEA_LEVEL + 0.12 + beach * 0.3)
      color.set("#c4b993").lerp(new Color("#ded0a4"), beach * 0.65);
    else
      color
        .set("#71914f")
        .lerp(new Color("#9ba96b"), Math.max(0, variation + 0.35));
    if (beach < 0.4 && land > 0.15 && land < 0.85 && height > SEA_LEVEL)
      color.lerp(new Color("#868373"), 1 - beach);
    if (mountain > 0.15 && height > 1.2) {
      const rock = Math.min(1, (height - 1.2) / 1.5);
      color.lerp(
        new Color("#716e63").lerp(new Color("#a5a191"), variation * 0.3 + 0.4),
        rock,
      );
    }
    const snowLine =
      5.05 + noise(nx * 1.3, nz * 1.3, seed + 56) * 0.45 * randomness;
    if (height > snowLine)
      color.lerp(new Color("#e9ede7"), Math.min(1, (height - snowLine) * 2.7));
    color.multiplyScalar(1 + variation * 0.07);
    return { height, color, beach };
  };
}
