import { useTerrainEditor } from "./hooks/useTerrainEditor";
import { exportMap, exportMesh } from "./utils/exportWorld";
import EditorHeader from "./components/editor/EditorHeader";
import EditorViewport from "./components/editor/EditorViewport";
import EditorStatus from "./components/editor/EditorStatus";
import RenderSettingsPanel from "./components/editor/RenderSettingsPanel";
export default function App() {
  const editor = useTerrainEditor();
  async function downloadMesh() {
    try {
      await exportMesh(editor.cells, editor.renderSettings);
      editor.setNotice("Terrain and water exported as OBJ.");
    } catch {
      editor.setNotice("Mesh export failed. Please try again.");
    }
  }
  return (
    <main className="grid h-dvh min-h-150 grid-cols-1 grid-rows-[64px_minmax(0,1fr)_34px] overflow-hidden md:grid-rows-[76px_minmax(0,1fr)_39px]">
      <EditorHeader
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
      {editor.settingsOpen && (
        <RenderSettingsPanel
          settings={editor.renderSettings}
          onClose={() => editor.setSettingsOpen(false)}
          onApply={(settings) => {
            editor.applySettings(settings);
            editor.setMode("preview");
            editor.setSettingsOpen(false);
          }}
        />
      )}
      <EditorViewport editor={editor} />
      <EditorStatus cells={editor.cells} preview={editor.mode === "preview"} />
    </main>
  );
}
