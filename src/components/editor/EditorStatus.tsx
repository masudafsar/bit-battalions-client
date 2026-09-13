import { Hexagon } from "lucide-react";
import { terrainInfo, type Cell, type Terrain } from "../../terrain";
export default function EditorStatus({
  cells,
  preview,
}: {
  cells: Cell[];
  preview: boolean;
}) {
  return (
    <footer className="col-span-full row-start-3 flex items-center justify-between gap-2 border-t border-line bg-paper px-4 text-[9px] text-muted md:row-start-3 md:px-6">
      <span className="flex items-center gap-1.5">
        <Hexagon size={12} />
        {cells.length} hexagons
        <span className="ml-2 hidden sm:inline">
          {preview ? "Terrain + water" : "Editing grid"}
        </span>
      </span>
      <div className="flex gap-3 md:gap-6">
        {(["water", "land", "mountain"] as Terrain[]).map((t) => (
          <span key={t} className="flex items-center gap-1.5">
            <i
              className="size-1.5 rounded-full"
              style={{ background: terrainInfo[t].color }}
            />
            {terrainInfo[t].label}
            <strong className="hidden font-medium sm:inline">
              {cells.filter((c) => c.type === t).length}
            </strong>
          </span>
        ))}
      </div>
      <span className="hidden lg:block">
        Right-click to orbit · Scroll to zoom
      </span>
    </footer>
  );
}
