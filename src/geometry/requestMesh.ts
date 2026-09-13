import type { MeshProgress } from "./meshProgress";
import type { Cell } from "../terrain";
import type { RenderSettings } from "../renderSettings";
import type { MeshData } from "./meshTransfer";

export type MeshRequest = { cells: Cell[]; settings: RenderSettings; kind: "preview" | "export" };
export type MeshResponse =
  | ({ kind: "progress" } & MeshProgress)
  | { kind: "preview"; terrain: MeshData; water: MeshData; rivers: MeshData }
  | { kind: "export"; obj: string }
  | { kind: "error"; message: string };

// Each job owns its worker so obsolete builds can be interrupted immediately.
export function requestMesh(
  cells: Cell[], settings: RenderSettings, kind: MeshRequest["kind"], signal?: AbortSignal,
  onProgress?: (progress: MeshProgress) => void,
): Promise<Exclude<MeshResponse, { kind: "error" | "progress" }>> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Mesh generation cancelled", "AbortError"));
      return;
    }
    const worker = new Worker(new URL("./mesh.worker.ts", import.meta.url), { type: "module" });
    let settled = false;
    const cleanup = () => {
      settled = true;
      worker.terminate();
      signal?.removeEventListener("abort", abort);
    };
    const abort = () => {
      cleanup();
      reject(new DOMException("Mesh generation cancelled", "AbortError"));
    };
    signal?.addEventListener("abort", abort, { once: true });
    worker.onmessage = ({ data }: MessageEvent<MeshResponse>) => {
      if (settled) return;
      if (data.kind === "progress") {
        onProgress?.({ percent: data.percent, stage: data.stage });
        return;
      }
      cleanup();
      if (data.kind === "error") reject(new Error(data.message));
      else {
        onProgress?.({ percent: 100, stage: "Complete" });
        resolve(data);
      }
    };
    worker.onerror = worker.onmessageerror = () => {
      cleanup();
      reject(new Error("Mesh generation failed. Please try again."));
    };
    try {
      worker.postMessage({ cells, settings, kind } satisfies MeshRequest);
    } catch (error) {
      cleanup();
      reject(error);
    }
  });
}
