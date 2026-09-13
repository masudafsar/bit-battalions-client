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
) {
  const { buildTerrainMesh } = await import("../geometry/buildTerrainMesh");
  const { buildWaterMesh } = await import("../geometry/buildWaterMesh");
  const { buildRiverMesh } = await import("../geometry/buildRiverMesh");
  const rivers = buildRiverMesh(cells, settings);
  const terrain = buildTerrainMesh(cells, settings),
    water = buildWaterMesh(terrain);
  try {
    const lines = ["# Hexterra procedural terrain and water; static surface"];
    let offset = 0;
    for (const [name, geometry] of [
      ["Terrain", terrain],
      ["Water", water],
      ["Rivers", rivers],
    ] as const) {
      const positions = geometry.getAttribute("position"),
        normals = geometry.getAttribute("normal"),
        index = geometry.getIndex();
      if (!positions.count) continue;
      lines.push(`o ${name}`);
      for (let i = 0; i < positions.count; i++)
        lines.push(
          `v ${positions.getX(i)} ${positions.getY(i)} ${positions.getZ(i)}`,
        );
      for (let i = 0; i < normals.count; i++)
        lines.push(
          `vn ${normals.getX(i)} ${normals.getY(i)} ${normals.getZ(i)}`,
        );
      for (let i = 0; i < (index?.count ?? positions.count); i += 3)
        lines.push(
          `f ${[0, 1, 2]
            .map((j) => {
              const v = (index ? index.getX(i + j) : i + j) + offset + 1;
              return `${v}//${v}`;
            })
            .join(" ")}`,
        );
      offset += positions.count;
    }
    download(lines.join("\n"), "hexterra-terrain.obj", "text/plain");
  } finally {
    rivers.dispose();
    terrain.dispose();
    water.dispose();
  }
}
