import type { TerrainEditor } from "../../hooks/useTerrainEditor";
import TerrainPalette from "./TerrainPalette";
import BrushSettings from "./BrushSettings";

export default function PaintingTools({ editor }: { editor: TerrainEditor }) {
  return (
    <section
      aria-label="Painting tools"
      className="absolute bottom-28 left-4 right-4 mx-auto max-w-[620px] rounded-xl border border-line bg-paper/95 p-3 shadow-lg"
    >
      <TerrainPalette terrain={editor.terrain} onSelect={editor.setTerrain} />
      <BrushSettings brush={editor.brush} onChange={editor.setBrush} />
    </section>
  );
}
