import { createMeshProgress } from "./meshProgress";
import { buildTerrainMesh } from "./buildTerrainMesh";
import { buildWaterMesh } from "./buildWaterMesh";
import { buildRiverMesh } from "./buildRiverMesh";
import { meshBuffers, packMesh } from "./meshTransfer";
import { meshOBJ } from "./meshOBJ";
import type { MeshRequest, MeshResponse } from "./requestMesh";

self.onmessage = ({ data }: MessageEvent<MeshRequest>) => {
  const stage = createMeshProgress((progress) => {
    self.postMessage({ kind: "progress", ...progress } satisfies MeshResponse);
  });
  try {
    const terrain = buildTerrainMesh(data.cells, data.settings, stage(0, 70, "Building terrain"));
    const water = buildWaterMesh(terrain, stage(70, 85, "Building water"));
    const rivers = buildRiverMesh(data.cells, data.settings, false, stage(85, 90, "Building rivers"));
    try {
      if (data.kind === "export") {
        self.postMessage({ kind: "export", obj: meshOBJ(terrain, water, rivers, stage(90, 99, "Writing OBJ")) } satisfies MeshResponse);
      } else {
        stage(90, 99, "Preparing preview")(0);
        const meshes = { terrain: packMesh(terrain), water: packMesh(water), rivers: packMesh(rivers) };
        stage(90, 99, "Preparing preview")(1);
        self.postMessage({ kind: "preview", ...meshes } satisfies MeshResponse,
          { transfer: Object.values(meshes).flatMap(meshBuffers) });
      }
    } finally {
      terrain.dispose();
      water.dispose();
      rivers.dispose();
    }
  } catch {
    self.postMessage({ kind: "error", message: "Mesh generation failed. Please try again." } satisfies MeshResponse);
  }
};
