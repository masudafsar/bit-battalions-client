import { Grid2X2, Mountain } from "lucide-react";
export default function EditorViewToggle({
  mode,
  onChange,
}: {
  mode: "edit" | "preview";
  onChange: (mode: "edit" | "preview") => void;
}) {
  return (
    <div
      className="flex gap-1 rounded-lg border border-line bg-paper/90 p-1"
      role="group"
      aria-label="Editor view"
    >
      {(["edit", "preview"] as const).map((value) => (
        <button
          key={value}
          aria-pressed={mode === value}
          onClick={() => onChange(value)}
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-2 text-[10px] ${mode === value ? "bg-accent text-white" : "text-muted hover:bg-selected"}`}
        >
          {value === "edit" ? <Grid2X2 size={13} /> : <Mountain size={13} />}{" "}
          {value === "edit" ? "Edit grid" : "Terrain mesh"}
        </button>
      ))}
    </div>
  );
}
