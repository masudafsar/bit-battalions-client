import { useId } from "react";
import type { MeshProgress } from "../../geometry/meshProgress";

export default function MeshLoading({
  label = "Generating mesh…",
  progress,
}: {
  label?: string;
  progress?: MeshProgress;
}) {
  const labelId = useId();
  const percent = progress?.percent ?? 0;
  const stage = progress?.stage ?? label;
  return (
    <div className="pointer-events-none absolute inset-0 z-10 grid place-content-center bg-paper/70 p-5">
      <div className="w-72 max-w-full rounded-xl border border-line bg-paper px-5 py-4 text-accent shadow-lg">
        <div className="mb-3 flex items-center justify-between gap-4 text-sm">
          <span id={labelId} role="status" aria-live="polite" className="font-semibold">
            {stage}
          </span>
          <span className="font-semibold tabular-nums">{percent}%</span>
        </div>
        <div
          role="progressbar"
          aria-labelledby={labelId}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          aria-valuetext={`${stage} — ${percent}%`}
          className="h-2 overflow-hidden rounded-full bg-selected"
        >
          <div className="h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
        </div>
        <p className="mt-2 text-xs text-muted">
          {progress ? label : "Preparing…"}
        </p>
      </div>
    </div>
  );
}
