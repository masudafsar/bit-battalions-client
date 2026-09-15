import { Waves, Route, TrainFront, X, Eraser, Pencil } from "lucide-react";
export default function PathTools({
  onCancel,
  drafting,
  action,
  onAction,
}: {
  onCancel: () => void;
  drafting: boolean;
  action: "draw" | "edit" | "erase";
  onAction: (action: "draw" | "edit" | "erase") => void;
}) {
  return (
    <section
      aria-label="Path tools"
      className="absolute left-19 top-5 flex flex-col gap-1 rounded-xl border border-line bg-paper/90 p-1.5 shadow-sm md:left-21"
    >
      <button
        aria-label="River"
        aria-pressed={action === "draw"}
        onClick={() => onAction("draw")}
        title="River · Drag through corners along dry edges"
        className={`grid size-9 place-items-center rounded-md ${action === "draw" ? "bg-[#d1e4e8] text-[#5891a6]" : "text-muted hover:bg-black/5"}`}
      >
        <Waves size={18} />
      </button>
      <button
        disabled
        aria-label="Road (coming soon)"
        title="Road · Coming soon"
        className="grid size-9 place-items-center rounded-md text-muted"
      >
        <Route size={18} />
      </button>
      <button
        disabled
        aria-label="Rail (coming soon)"
        title="Rail · Coming soon"
        className="grid size-9 place-items-center rounded-md text-muted"
      >
        <TrainFront size={18} />
      </button>
      <button
        aria-label="Edit river"
        aria-pressed={action === "edit"}
        onClick={() => onAction("edit")}
        title="Edit river · Drag from a point on an existing path to redraw downstream"
        className={`grid size-9 place-items-center rounded-md ${action === "edit" ? "bg-violet-100 text-violet-700" : "text-muted hover:bg-black/5"}`}
      >
        <Pencil size={18} />
      </button>
      <button
        aria-label="Delete river"
        aria-pressed={action === "erase"}
        onClick={() => onAction("erase")}
        title="Delete river · Also removes tributaries that lose their outlet"
        className={`grid size-9 place-items-center rounded-md ${action === "erase" ? "bg-red-100 text-red-700" : "text-muted hover:bg-black/5"}`}
      >
        <Eraser size={18} />
      </button>
      {drafting && (
        <button
          onClick={onCancel}
          aria-label="Cancel river path"
          title="Cancel river path (Escape)"
          className="grid size-9 place-items-center rounded-md text-muted hover:bg-black/5"
        >
          <X size={18} />
        </button>
      )}
    </section>
  );
}
