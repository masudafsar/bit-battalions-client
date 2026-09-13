import FullscreenButton from "./FullscreenButton";
import EditorViewToggle from "./EditorViewToggle";
import {
  ArrowDownToLine,
  Check,
  Layers3,
  SlidersHorizontal,
  FileJson,
  Shuffle,
} from "lucide-react";
export default function EditorHeader({
  mode,
  exporting,
  onModeChange,
  onOpenSettings,
  onGenerate,
  saveError,
  onExportMap,
  onExportMesh,
}: {
  mode: "edit" | "preview";
  exporting: boolean;
  onModeChange: (mode: "edit" | "preview") => void;
  onOpenSettings: () => void;
  onGenerate: () => void;
  saveError: boolean;
  onExportMap: () => void;
  onExportMesh: () => void;
}) {
  return (
    <header className="col-span-full flex items-center justify-between gap-2 border-b border-line bg-paper px-2 sm:px-4 md:px-7">
      <a
        href="./"
        aria-label="Hexterra home"
        className="flex items-center gap-2 font-display text-xl font-extrabold tracking-tight text-accent"
      >
        <span className="grid size-9 place-items-center rounded-xl bg-selected">
          <Layers3 size={23} />
        </span>
        <span className="hidden lg:inline">hexterra</span>
        <span className="ml-2 hidden text-[9px] font-semibold tracking-[.2em] text-muted lg:inline">
          STUDIO
        </span>
      </a>
      <div className="hidden items-center gap-5 text-xs xl:flex">
        Untitled world
        <span className="flex items-center gap-1 text-[10px] text-muted">
          <Check size={13} />
          {saveError ? "Export to save" : "Autosaved"}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <EditorViewToggle mode={mode} onChange={onModeChange} />
        <button
          onClick={onOpenSettings}
          aria-label="Render settings"
          title="Render settings"
          className="flex items-center gap-2 rounded-lg border border-line p-2.5 text-[10px] text-accent hover:bg-selected"
        >
          <SlidersHorizontal size={15} />
          <span className="hidden sm:inline">Render settings</span>
        </button>
      </div>
      <div className="flex gap-1 sm:gap-2">
        <FullscreenButton />
        <button
          onClick={onGenerate}
          aria-label="Generate new landscape"
          title="Generate new landscape"
          className="rounded-lg border border-line p-2.5 text-accent hover:bg-selected"
        >
          <Shuffle size={15} />
        </button>
        <button
          onClick={onExportMap}
          className="rounded-lg border border-line px-3 py-2.5 text-[10px] hover:bg-selected"
          aria-label="Export map JSON"
        >
          <FileJson size={14} className="sm:hidden" />
          <span className="hidden sm:inline">Save JSON</span>
        </button>
        <button
          disabled={exporting}
          aria-label="Export mesh"
          onClick={onExportMesh}
          className="flex items-center gap-2 rounded-lg bg-accent px-3 py-2.5 text-[10px] text-white hover:bg-accent/90 disabled:cursor-wait disabled:opacity-60"
        >
          <ArrowDownToLine size={14} />
          <span className="hidden sm:inline">Export mesh</span>
        </button>
      </div>
    </header>
  );
}
