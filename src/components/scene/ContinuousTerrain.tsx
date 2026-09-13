import TerrainGrid from "./TerrainGrid";
import { useEffect, useMemo } from "react";
import type { Cell } from "../../terrain";
import { buildTerrainMesh } from "../../geometry/buildTerrainMesh";
import { buildWaterMesh } from "../../geometry/buildWaterMesh";
import WaterSurface from "./WaterSurface";
import type { RenderSettings } from "../../renderSettings";
export default function ContinuousTerrain({
  cells,
  settings,
  showGrid,
}: {
  cells: Cell[];
  settings: RenderSettings;
  showGrid: boolean;
}) {
  const { terrain, water } = useMemo(() => {
    const terrain = buildTerrainMesh(cells, settings);
    return { terrain, water: buildWaterMesh(terrain) };
  }, [cells, settings]);
  useEffect(
    () => () => {
      terrain.dispose();
      water.dispose();
    },
    [terrain, water],
  );
  return (
    <group>
      <mesh geometry={terrain}>
        <meshStandardMaterial vertexColors roughness={0.95} />
      </mesh>
      {water.getAttribute("position").count > 0 && (
        <WaterSurface geometry={water} opacity={settings.waterOpacity} />
      )}
      {showGrid && <TerrainGrid cells={cells} terrain={terrain} />}
    </group>
  );
}
