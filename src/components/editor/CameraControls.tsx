import { Minus, Plus, RotateCcw } from "lucide-react";
import type { TerrainEditor } from "../../hooks/useTerrainEditor";
export default function CameraControls({ editor }: { editor: TerrainEditor }) {
  return (
    <div className="absolute bottom-5 right-5 flex items-center gap-1 rounded-lg border border-line bg-paper/90 p-1 shadow-sm">
      <button
        aria-label="Zoom out"
        onClick={() => editor.setZoom((z) => Math.max(0.6, z - 0.15))}
        className="grid size-7 place-items-center rounded text-muted hover:bg-selected"
      >
        <Minus size={16} />
      </button>
      <span className="w-9 text-center text-[10px] text-muted">
        {Math.round(editor.zoom * 100)}%
      </span>
      <button
        aria-label="Zoom in"
        onClick={() => editor.setZoom((z) => Math.min(2.5, z + 0.15))}
        className="grid size-7 place-items-center rounded text-muted hover:bg-selected"
      >
        <Plus size={16} />
      </button>
      <span className="mx-1 h-4 w-px bg-line" />
      <button
        aria-label="Reset camera"
        onClick={() => {
          editor.setReset((r) => r + 1);
          editor.setZoom(1);
        }}
        className="grid size-7 place-items-center rounded text-muted hover:bg-selected"
      >
        <RotateCcw size={16} />
      </button>
    </div>
  );
}
