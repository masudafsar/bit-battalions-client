import { useEffect, useMemo } from "react";
import type { Cell } from "../../terrain";
import type { RenderSettings } from "../../renderSettings";
import { buildRiverMesh } from "../../geometry/buildRiverMesh";
export default function RiverSurface({
  cells,
  settings,
}: {
  cells: Cell[];
  settings?: RenderSettings;
}) {
  const geometry = useMemo(
    () => buildRiverMesh(cells, settings),
    [cells, settings],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} renderOrder={3} raycast={() => null}>
      <meshBasicMaterial
        color="#438fa8"
        polygonOffset
        polygonOffsetFactor={-2}
      />
    </mesh>
  );
}
