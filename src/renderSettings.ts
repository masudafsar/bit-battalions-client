export const settingControls = [
  {
    key: "terrainSize",
    label: "Terrain size (hex radius)",
    min: 7,
    max: 30,
    step: 1,
  },
  { key: "noiseSize", label: "Noise size", min: 0.3, max: 3, step: 0.1 },
  { key: "randomness", label: "Randomness", min: 0, max: 2, step: 0.1 },
  {
    key: "landHeight",
    label: "Land elevation",
    min: 0.3,
    max: 1.5,
    step: 0.05,
  },
  {
    key: "landRoughness",
    label: "Ground variation",
    min: 0,
    max: 0.8,
    step: 0.05,
  },
  {
    key: "mountainMinHeight",
    label: "Minimum peak height",
    min: 0,
    max: 12,
    step: 0.1,
  },
  {
    key: "mountainMaxHeight",
    label: "Maximum peak height",
    min: 0,
    max: 12,
    step: 0.1,
  },
  {
    key: "mountainRoughness",
    label: "Rock roughness",
    min: 0,
    max: 1,
    step: 0.05,
  },
  { key: "beachAmount", label: "Sandy coastline", min: 0, max: 1, step: 0.05 },
  { key: "beachWidth", label: "Beach width", min: 0.7, max: 2, step: 0.1 },
  { key: "seabedDepth", label: "Sea depth", min: 0.3, max: 2, step: 0.05 },
  {
    key: "seabedRoughness",
    label: "Seabed variation",
    min: 0,
    max: 0.8,
    step: 0.05,
  },
  {
    key: "waterOpacity",
    label: "Water opacity",
    min: 0.05,
    max: 0.7,
    step: 0.01,
  },
] as const;
export type RenderSettings = Record<
  (typeof settingControls)[number]["key"],
  number
> & { seed: number };
export const DEFAULT_RENDER_SETTINGS: RenderSettings = {
  seed: 731,
  terrainSize: 8,
  noiseSize: 1,
  randomness: 1,
  landHeight: 0.75,
  landRoughness: 0.4,
  mountainMinHeight: 3.4,
  mountainMaxHeight: 6.6,
  mountainRoughness: 0.45,
  beachAmount: 0.65,
  beachWidth: 1.4,
  seabedDepth: 0.85,
  seabedRoughness: 0.35,
  waterOpacity: 0.28,
};
export function normalizeSettings(value: unknown): RenderSettings {
  const result = { ...DEFAULT_RENDER_SETTINGS };
  if (!value || typeof value !== "object") return result;
  const data = value as Record<string, unknown>;
  // Migrate the previous height multiplier without losing saved landscapes.
  if (
    typeof data.mountainHeight === "number" &&
    Number.isFinite(data.mountainHeight)
  ) {
    const scale = Math.max(0, Math.min(2, data.mountainHeight));
    result.mountainMinHeight = Math.min(12, 3.4 * scale);
    result.mountainMaxHeight = Math.min(12, 6.6 * scale);
  }
  for (const { key, min, max } of settingControls)
    if (typeof data[key] === "number" && Number.isFinite(data[key]))
      result[key] = Math.max(min, Math.min(max, data[key]));
  if (typeof data.seed === "number" && Number.isFinite(data.seed))
    result.seed = Math.max(0, Math.min(999999, Math.round(data.seed)));
  result.terrainSize = Math.round(result.terrainSize);
  if (result.mountainMinHeight > result.mountainMaxHeight)
    [result.mountainMinHeight, result.mountainMaxHeight] = [
      result.mountainMaxHeight,
      result.mountainMinHeight,
    ];
  return result;
}
export function resolveSettings(
  input: number | RenderSettings = DEFAULT_RENDER_SETTINGS,
) {
  return typeof input === "number"
    ? { ...DEFAULT_RENDER_SETTINGS, seed: input }
    : normalizeSettings(input);
}
