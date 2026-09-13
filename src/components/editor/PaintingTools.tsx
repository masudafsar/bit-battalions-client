import { useEffect } from "react";
import type { Terrain } from "../../terrain";
import type { TerrainEditor } from "../../hooks/useTerrainEditor";
import TerrainPalette from "./TerrainPalette";
import BrushSettings from "./BrushSettings";

export default function PaintingTools({
  editor,
  onHint,
}: {
  editor: TerrainEditor;
  onHint: (value: Terrain | null) => void;
}) {
  useEffect(() => () => onHint(null), [onHint]);
  return (
    <section
      aria-label="Painting tools"
      className="absolute left-19 top-5 flex flex-col rounded-xl border border-line bg-paper/90 p-1.5 shadow-sm md:left-21"
    >
      <TerrainPalette
        terrain={editor.terrain}
        onSelect={editor.setTerrain}
        onHint={onHint}
      />
      <BrushSettings brush={editor.brush} onChange={editor.setBrush} />
    </section>
  );
}
