import { useEffect, useMemo } from "react";
import type { Cell } from "../../terrain";
import type { RenderSettings } from "../../renderSettings";
import { buildRiverMesh } from "../../geometry/buildRiverMesh";
export default function RiverSurface({
  cells,
  settings,
  flat,
}: {
  cells: Cell[];
  settings: RenderSettings;
  flat: boolean;
}) {
  const geometry = useMemo(
    () => buildRiverMesh(cells, settings, flat),
    [cells, settings, flat],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} renderOrder={3} raycast={() => null}>
      <meshBasicMaterial
        color="#438fa8"
        vertexColors
        polygonOffset
        polygonOffsetFactor={-2}
      />
    </mesh>
  );
}
