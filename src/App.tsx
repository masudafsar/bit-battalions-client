import type { MeshProgress } from "./geometry/meshProgress";
import { useRef, useState } from "react";
import MeshLoading from "./components/editor/MeshLoading";
import { useTerrainEditor } from "./hooks/useTerrainEditor";
import { exportMap, exportMesh } from "./utils/exportWorld";
import EditorHeader from "./components/editor/EditorHeader";
import EditorViewport from "./components/editor/EditorViewport";
import EditorStatus from "./components/editor/EditorStatus";
import RenderSettingsPanel from "./components/editor/RenderSettingsPanel";
export default function App() {
  const editor = useTerrainEditor();
  const [liveSettings, setLiveSettings] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<MeshProgress>();
  const exportPending = useRef(false);
  async function downloadMesh() {
    if (exportPending.current) return;
    exportPending.current = true;
    setExportProgress(undefined);
    setExporting(true);
    try {
      await exportMesh(editor.cells, editor.renderSettings, setExportProgress);
      editor.setNotice("Terrain and water exported as OBJ.");
    } catch {
      editor.setNotice("Mesh export failed. Please try again.");
    } finally {
      exportPending.current = false;
      setExporting(false);
    }
  }
  return (
    <main className="grid h-dvh min-h-150 grid-cols-1 grid-rows-[64px_minmax(0,1fr)_34px] overflow-hidden md:grid-rows-[76px_minmax(0,1fr)_39px]">
      <EditorHeader
        exporting={exporting}
        mode={editor.mode}
        onModeChange={editor.setMode}
        onGenerate={editor.regenerate}
        onOpenSettings={() => editor.setSettingsOpen(true)}
        saveError={editor.saveError}
        onExportMap={() => {
          exportMap(editor.cells, editor.renderSettings);
          editor.setNotice("Your map has been exported.");
        }}
        onExportMesh={downloadMesh}
      />
      <div className="relative flex min-h-0 min-w-0 overflow-hidden">
        <div className="grid min-h-0 min-w-0 flex-1">
          <EditorViewport editor={editor} />
        </div>
      {editor.settingsOpen && (
        <RenderSettingsPanel
          settings={editor.renderSettings}
          live={liveSettings}
          onLiveChange={setLiveSettings}
          onPreview={(settings) => {
            editor.applySettings(settings);
            editor.setMode("preview");
          }}
          onClose={() => editor.setSettingsOpen(false)}
          onApply={(settings) => {
            editor.applySettings(settings);
            editor.setMode("preview");
            editor.setSettingsOpen(false);
          }}
        />
      )}
      </div>
      {exporting && <MeshLoading label="Preparing mesh export…" progress={exportProgress} />}
      <EditorStatus cells={editor.cells} preview={editor.mode === "preview"} />
    </main>
  );
}
