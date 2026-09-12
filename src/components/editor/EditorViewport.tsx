import PaintingTools from "./PaintingTools";
import { lazy, Suspense, useState } from "react";
import { Check, Grid2X2 } from "lucide-react";
import type { TerrainEditor } from "../../hooks/useTerrainEditor";
import { terrainInfo, type Terrain } from "../../terrain";
import ViewportToolbar from "./ViewportToolbar";
import CameraControls from "./CameraControls";
import EditorHelp from "./EditorHelp";
const TerrainScene = lazy(() => import("../TerrainScene"));
export default function EditorViewport({ editor }: { editor: TerrainEditor }) {
  const [showGrid, setShowGrid] = useState(false);
  const [materialHint, setMaterialHint] = useState<Terrain | null>(null);
  const hint =
    materialHint &&
    editor.mode === "edit" &&
    !editor.navigate
      ? terrainInfo[materialHint]
      : null;
  const [help, setHelp] = useState(false);
  const selected = editor.hover !== null ? editor.cells[editor.hover] : null;
  const preview = editor.mode === "preview";
  return (
    <section
      aria-label="Interactive 3D hex terrain editor"
      className="relative row-start-2 min-h-0 touch-none overflow-hidden bg-[radial-gradient(ellipse_at_50%_43%,#f0f3e9_0%,#e7ecdf_60%,#dfe5d8_100%)]"
    >
      <div className="absolute inset-0">
        <Suspense
          fallback={
            <div className="grid h-full place-content-center text-sm text-muted">
              Growing your little world…
            </div>
          }
        >
          <TerrainScene
            cells={editor.cells}
            settings={editor.renderSettings}
            mode={editor.mode}
            showGrid={showGrid}
            onPaint={editor.paint}
            onHover={editor.setHover}
            navigate={editor.navigate}
            cameraTool={editor.cameraTool}
            reset={editor.reset}
            zoom={editor.zoom}
            onBackend={editor.setBackend}
          />
        </Suspense>
      </div>
      <div className="absolute right-4 top-5 flex items-center gap-2 md:right-6">
        {preview && (
          <button
            aria-label="Show terrain grid"
            aria-pressed={showGrid}
            title={showGrid ? "Hide terrain grid" : "Show terrain grid"}
            onClick={() => setShowGrid((v) => !v)}
            className={`flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-[10px] ${showGrid ? "bg-accent text-white" : "bg-paper/90 text-muted hover:bg-selected"}`}
          >
            <Grid2X2 size={14} />
            Grid
          </button>
        )}
        <span className="flex items-center gap-1.5 rounded-md border border-line bg-paper/60 px-2 py-1.5 text-[9px] text-muted">
          <span className="size-1.5 rounded-full bg-[#729565]" />
          {editor.backend}
        </span>
      </div>
      <ViewportToolbar editor={editor} />
      <CameraControls editor={editor} />
      {!preview && !editor.navigate && <PaintingTools editor={editor} onHint={setMaterialHint} />}
      {hint && (
        <aside
          role="status"
          className="pointer-events-none absolute bottom-16 left-5 max-w-[calc(100%-100px)] rounded-xl border border-line bg-paper/95 px-4 py-3 shadow-sm"
        >
          <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-accent">
            <span
              className="size-2 rounded-full"
              style={{ background: hint.color }}
            />
            {hint.label}
          </div>
          <p className="text-[11px] text-muted">{hint.description}</p>
        </aside>
      )}
      <div className="absolute bottom-5 left-5 right-52 flex min-h-9 items-center">
        <div className="flex items-center gap-2 text-[10px] text-accent">
          <span
            className="size-2 rounded-full"
            style={{ background: terrainInfo[editor.terrain].color }}
          />
          {preview
            ? "Procedural landscape"
            : editor.navigate
              ? editor.cameraTool === "pan"
                ? "Pan mode"
                : "Orbit mode"
              : `Painting ${terrainInfo[editor.terrain].label.toLowerCase()}`}
          {
            <span className="ml-2 hidden border-l border-line pl-3 text-[9px] text-muted sm:inline">
              {preview || editor.navigate
                ? editor.cameraTool === "pan"
                  ? "Drag to pan"
                  : "Drag to orbit"
                : selected
                  ? `Q ${selected.q} · R ${selected.r}`
                  : "Click & drag to paint"}
            </span>
          }
        </div>
      </div>
      <button
        aria-label="Show controls"
        onClick={() => setHelp((v) => !v)}
        className="absolute bottom-16 right-5 size-5 rounded-full border border-muted/40 text-[10px] text-muted"
      >
        ?
      </button>
      {help && <EditorHelp onClose={() => setHelp(false)} />}
      {editor.notice && (
        <div
          role="status"
          className="absolute bottom-28 left-1/2 flex max-w-[90%] -translate-x-1/2 items-center gap-2 rounded-lg border border-line bg-paper px-4 py-3 text-[11px] text-accent shadow-lg"
        >
          <Check className="shrink-0" size={16} />
          {editor.notice}
        </div>
      )}
    </section>
  );
}
