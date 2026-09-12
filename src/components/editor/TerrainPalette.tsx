import { Check, Leaf, Mountain, Waves } from "lucide-react";
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
}: {
  terrain: Terrain;
  onSelect: (value: Terrain) => void;
}) {
  return (
    <div className="flex gap-2">
      {(["water", "land", "mountain"] as Terrain[]).map((t, i) => {
        const Icon = icons[t];
        return (
          <button
            key={t}
            aria-pressed={terrain === t}
            title={terrainInfo[t].description}
            onClick={() => onSelect(t)}
            className={`flex flex-1 items-center gap-2 rounded-lg border p-2 text-left ${terrain === t ? "border-accent/70 bg-selected" : "border-line bg-white hover:bg-selected/50"}`}
          >
            <span
              className={`grid size-8 shrink-0 place-items-center [clip-path:polygon(50%_0,100%_24%,100%_76%,50%_100%,0_76%,0_24%)] ${swatches[t]}`}
            >
              <Icon size={24} strokeWidth={1.4} />
            </span>
            <span className="flex flex-col gap-1.5">
              <strong className="text-[11px] font-semibold">
                {terrainInfo[t].label}
              </strong>
              <small className="hidden whitespace-nowrap text-[9px] text-muted sm:block">
                {terrainInfo[t].description}
              </small>
            </span>
            <span className="ml-auto hidden text-[10px] text-muted sm:block">
              {terrain === t ? <Check size={14} /> : i + 1}
            </span>
          </button>
        );
      })}
    </div>
  );
}
