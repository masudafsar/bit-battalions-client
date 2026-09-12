import { Hexagon } from "lucide-react";
export default function BrushSettings({
  brush,
  onChange,
}: {
  brush: number;
  onChange: (size: number) => void;
}) {
  return (
    <div className="mt-3">
      <div className="mb-2 flex justify-between text-[11px]">
        <span>Brush size</span>
        <span className="text-muted">
          {brush === 1 ? "Single hex" : `${brush === 2 ? 7 : 19} hexes`}
        </span>
      </div>
      <div className="flex gap-1 rounded-lg bg-[#f0f2eb] p-1">
        {[1, 2, 3].map((n) => (
          <button
            key={n}
            aria-pressed={brush === n}
            onClick={() => onChange(n)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-[10px] ${brush === n ? "bg-white text-accent shadow-sm" : "text-muted hover:bg-white/50"}`}
          >
            <Hexagon size={12 + n * 3} />
            {["Small", "Medium", "Large"][n - 1]}
          </button>
        ))}
      </div>
    </div>
  );
}
