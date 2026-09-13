import type { MeshProgress } from "../geometry/meshProgress";
import type { Cell } from "../terrain";
import {
  DEFAULT_RENDER_SETTINGS,
  type RenderSettings,
} from "../renderSettings";
function download(contents: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function exportMap(
  cells: Cell[],
  settings: RenderSettings = DEFAULT_RENDER_SETTINGS,
) {
  download(
    JSON.stringify(
      { version: 2, name: "Untitled world", cells, settings },
      null,
      2,
    ),
    "hexterra-world.json",
    "application/json",
  );
}
export async function exportMesh(
  cells: Cell[],
  settings: RenderSettings = DEFAULT_RENDER_SETTINGS,
  onProgress?: (progress: MeshProgress) => void,
) {
  const { requestMesh } = await import("../geometry/requestMesh");
  const result = await requestMesh(cells, settings, "export", undefined, onProgress);
  if (result.kind !== "export") throw new Error("Unexpected mesh result");
  download(result.obj, "hexterra-terrain.obj", "text/plain");
}
