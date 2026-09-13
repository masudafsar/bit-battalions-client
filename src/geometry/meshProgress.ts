export type MeshProgress = { percent: number; stage: string };
export type ReportProgress = (fraction: number) => void;

// Weighted stages track completed work, not elapsed time. Only emit changes
// visible at whole-percent precision so large meshes cannot flood the UI.
export function createMeshProgress(report: (progress: MeshProgress) => void) {
  let previous = -1;
  let previousStage = "";
  return (start: number, end: number, stage: string): ReportProgress => (fraction) => {
    const percent = Math.min(99, Math.floor(start + (end - start) * fraction));
    if (percent < previous || (percent === previous && stage === previousStage)) return;
    previous = percent;
    previousStage = stage;
    report({ percent, stage });
  };
}
