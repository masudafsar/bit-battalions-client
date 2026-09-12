import { Hexagon } from "lucide-react";
export default function BrushSettings({
  brush,
  onChange,
}: {
  brush: number;
  onChange: (size: number) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Brush size"
      className="mt-1.5 flex flex-col gap-1 border-t border-line pt-1.5"
    >
      {[1, 2, 3].map((n) => {
        const label = ["Small", "Medium", "Large"][n - 1];
        const count = [1, 7, 19][n - 1];
        return (
          <button
            key={n}
            aria-label={`${label} brush (${count} ${count === 1 ? "hex" : "hexes"})`}
            title={`${label} brush · ${count} ${count === 1 ? "hex" : "hexes"}`}
            aria-pressed={brush === n}
            onClick={() => onChange(n)}
            className={`grid size-9 place-items-center rounded-md ${brush === n ? "bg-[#e2eacd] text-accent" : "text-muted hover:bg-selected"}`}
          >
            <Hexagon size={10 + n * 5} strokeWidth={1.6} />
          </button>
        );
      })}
    </div>
  );
}
