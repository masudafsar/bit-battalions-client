import { Leaf, Mountain, Waves } from "lucide-react";
import { terrainInfo, type Terrain } from "../../terrain";
const icons = { water: Waves, land: Leaf, mountain: Mountain };
const swatches = {
  water: "bg-[#d1e4e8] text-[#5891a6]",
  land: "bg-[#d6e1bd] text-[#6e8a4a]",
  mountain: "bg-[#e2e0d5] text-[#8a8d7e]",
};
export default function TerrainPalette({
  terrain,
  onSelect,
  onHint,
}: {
  terrain: Terrain;
  onSelect: (value: Terrain) => void;
  onHint: (value: Terrain | null) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Terrain material"
      className="flex flex-col gap-1"
    >
      {(["water", "land", "mountain"] as Terrain[]).map((t, i) => {
        const Icon = icons[t];
        return (
          <button
            key={t}
            aria-label={terrainInfo[t].label}
            aria-pressed={terrain === t}
            title={`${terrainInfo[t].label} (${i + 1}) · ${terrainInfo[t].description}`}
            onPointerEnter={() => onHint(t)}
            onPointerLeave={() => onHint(null)}
            onFocus={() => onHint(t)}
            onBlur={() => onHint(null)}
            onClick={() => onSelect(t)}
            className={`grid size-9 place-items-center rounded-md ${terrain === t ? swatches[t] : "text-muted hover:bg-selected"}`}
          >
            <Icon size={18} strokeWidth={1.6} />
          </button>
        );
      })}
    </div>
  );
}
