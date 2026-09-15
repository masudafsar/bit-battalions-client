import { createBaseTerrainField } from "./baseTerrainField.ts";
import { getRiverNetwork } from "./riverNetwork.ts";
import {
  resolveSettings,
  DEFAULT_RENDER_SETTINGS,
  type RenderSettings,
} from "../renderSettings.ts";
import type { Cell } from "../terrain.ts";
export { SEA_LEVEL } from "./baseTerrainField.ts";
export function createTerrainField(
  cells: Cell[],
  input: number | RenderSettings = DEFAULT_RENDER_SETTINGS,
) {
  const settings = resolveSettings(input);
  const base = createBaseTerrainField(cells, settings);
  const network = getRiverNetwork(cells, settings);
  return (x: number, z: number) => {
    const sample = base(x, z);
    const originalHeight = sample.height;
    let closest = Infinity;
    for (const segment of network.near(x, z)) {
      const dx = segment.b.x - segment.a.x,
        dz = segment.b.z - segment.a.z;
      const t = Math.max(
        0,
        Math.min(
          1,
          ((x - segment.a.x) * dx + (z - segment.a.z) * dz) /
            (dx * dx + dz * dz),
        ),
      );
      const distance = Math.hypot(
        x - segment.a.x - dx * t,
        z - segment.a.z - dz * t,
      );
      const width = segment.width + (segment.endWidth - segment.width) * t;
      if (distance > width + settings.riverBankWidth || distance >= closest)
        continue;
      closest = distance;
      const water = segment.a.y + (segment.b.y - segment.a.y) * t;
      const bed = water - (settings.riverDepth + width * 0.7);
      // Replace the noisy bed, rather than min() which preserves pits and reverse slopes.
      // A shallow parabolic section rises to the waterline and then to stable banks.
      const inner = Math.min(1, distance / (width * 1.5));
      const channel = bed + (water + 0.06 - bed) * inner * inner;
      const blend = Math.max(
        0,
        Math.min(
          1,
          (distance - width * 1.5) /
            Math.max(0.01, settings.riverBankWidth - width * 0.5),
        ),
      );
      const smooth = blend * blend * (3 - 2 * blend);
      sample.height = channel * (1 - smooth) + originalHeight * smooth;
    }
    return sample;
  };
}
