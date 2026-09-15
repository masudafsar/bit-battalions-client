import type { PreviewMesh } from "../../hooks/usePreviewMesh";
import TerrainGrid from "./TerrainGrid";
import type { Cell } from "../../terrain";
import WaterSurface from "./WaterSurface";
import type { RenderSettings } from "../../renderSettings";
export default function ContinuousTerrain({
  cells,
  settings,
  showGrid,
  meshes,
}: {
  cells: Cell[];
  settings: RenderSettings;
  showGrid: boolean;
  meshes: PreviewMesh;
}) {
  const { terrain, water } = meshes;
  return (
    <group>
      <WaterSurface geometry={meshes.rivers} opacity={settings.waterOpacity} river />
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
