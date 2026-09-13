import type { MeshProgress } from "../geometry/meshProgress";
import { useEffect, useState } from "react";
import type { Cell } from "../terrain";
import type { RenderSettings } from "../renderSettings";
import { requestMesh } from "../geometry/requestMesh";
import { unpackMesh } from "../geometry/meshTransfer";
import type { BufferGeometry } from "three";

export type PreviewMesh = {
  terrain: BufferGeometry;
  water: BufferGeometry;
  rivers: BufferGeometry;
};

export function usePreviewMesh(
  cells: Cell[],
  settings: RenderSettings,
  enabled: boolean,
) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{
    cells: Cell[];
    settings: RenderSettings;
    attempt: number;
    progress?: MeshProgress;
    meshes?: PreviewMesh;
    error?: string;
  } | null>(null);
  // A return to preview must not reuse geometry disposed on leaving it.
  if (!enabled && result) setResult(null);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    let meshes: PreviewMesh | undefined;
    requestMesh(cells, settings, "preview", controller.signal, (progress) => {
      if (!controller.signal.aborted) setResult({ cells, settings, attempt, progress });
    }).then((data) => {
      if (controller.signal.aborted || data.kind !== "preview") return;
      meshes = {
        terrain: unpackMesh(data.terrain),
        water: unpackMesh(data.water),
        rivers: unpackMesh(data.rivers),
      };
      setResult({ cells, settings, attempt, meshes });
    }).catch(() => {
      if (!controller.signal.aborted) {
        setResult({ cells, settings, attempt, error: "Mesh generation failed. Please try again." });
      }
    });
    return () => {
      controller.abort();
      if (meshes) Object.values(meshes).forEach((geometry) => geometry.dispose());
    };
  }, [cells, settings, enabled, attempt]);
  // Associate results with their inputs: a late result never replaces a newer map.
  const current =
    enabled && result?.cells === cells &&
    result.settings === settings && result.attempt === attempt
      ? result
      : null;
  return {
    meshes: current?.meshes,
    loading: enabled && !current?.meshes && !current?.error,
    progress: current?.progress,
    error: current?.error,
    retry: () => setAttempt((value) => value + 1),
  };
}
