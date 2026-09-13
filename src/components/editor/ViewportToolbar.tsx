import { Route, Hand, Orbit, Paintbrush, Redo2, Undo2 } from "lucide-react";
import type { TerrainEditor } from "../../hooks/useTerrainEditor";
export default function ViewportToolbar({ editor }: { editor: TerrainEditor }) {
  const buttons = [
    {
      label: "Paint terrain",
      icon: Paintbrush,
      active:
        editor.mode === "edit" &&
        !editor.navigate &&
        editor.paintTool === "terrain",
      action: () => {
        editor.setPaintTool("terrain");
        editor.setMode("edit");
        editor.setNavigate(false);
      },
      disabled: false,
    },
    {
      label: "Add paths",
      icon: Route,
      active:
        editor.mode === "edit" &&
        !editor.navigate &&
        editor.paintTool === "river",
      action: () => {
        editor.setPaintTool("river");
        editor.setMode("edit");
        editor.setNavigate(false);
      },
      disabled: false,
    },
    {
      label: "Orbit camera",
      icon: Orbit,
      active:
        (editor.navigate || editor.mode === "preview") &&
        editor.cameraTool === "orbit",
      action: () => {
        editor.setNavigate(true);
        editor.setCameraTool("orbit");
      },
      disabled: false,
    },
    {
      label: "Pan camera",
      icon: Hand,
      active:
        (editor.navigate || editor.mode === "preview") &&
        editor.cameraTool === "pan",
      action: () => {
        editor.setNavigate(true);
        editor.setCameraTool("pan");
      },
      disabled: false,
    },
    {
      label: "Undo",
      icon: Undo2,
      active: false,
      action: editor.undo,
      disabled: !editor.history.past.length,
    },
    {
      label: "Redo",
      icon: Redo2,
      active: false,
      action: editor.redo,
      disabled: !editor.history.future.length,
    },
  ];
  return (
    <div className="absolute left-4 top-5 flex flex-col gap-1 rounded-xl border border-line bg-paper/90 p-1.5 shadow-sm md:left-6">
      {buttons.map(({ label, icon: Icon, active, action, disabled }) => (
        <button
          key={label}
          title={label}
          aria-label={label}
          aria-pressed={
            label.endsWith("camera") ||
            label === "Paint terrain" ||
            label === "Add paths"
              ? active
              : undefined
          }
          onClick={action}
          disabled={disabled}
          className={`grid size-9 place-items-center rounded-md ${active ? "bg-[#e2eacd] text-accent" : "text-muted hover:bg-selected"}`}
        >
          <Icon size={18} />
        </button>
      ))}
    </div>
  );
}
