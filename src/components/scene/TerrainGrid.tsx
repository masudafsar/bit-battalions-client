import { useEffect, useMemo } from "react";
import type { BufferGeometry } from "three";
import type { Cell } from "../../terrain";
import { buildHexGrid } from "../../geometry/buildHexGrid";
export default function TerrainGrid({
  cells,
  terrain,
}: {
  cells: Cell[];
  terrain: BufferGeometry;
}) {
  const geometry = useMemo(
    () => buildHexGrid(cells, terrain),
    [cells, terrain],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <lineSegments geometry={geometry} renderOrder={2} raycast={() => null}>
      <lineBasicMaterial
        color="#304d41"
        transparent
        opacity={0.5}
        depthWrite={false}
      />
    </lineSegments>
  );
}
