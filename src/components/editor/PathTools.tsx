import { Waves, Route, TrainFront, X } from "lucide-react";
export default function PathTools({
  onCancel,
  drafting,
}: {
  onCancel: () => void;
  drafting: boolean;
}) {
  return (
    <section
      aria-label="Path tools"
      className="absolute left-19 top-5 flex flex-col gap-1 rounded-xl border border-line bg-paper/90 p-1.5 shadow-sm md:left-21"
    >
      <button
        aria-label="River"
        aria-pressed
        title="River · Select consecutive corners along dry edges"
        className="grid size-9 place-items-center rounded-md bg-[#d1e4e8] text-[#5891a6]"
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
