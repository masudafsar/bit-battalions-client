import { LessDepth, LessEqualDepth, type BufferGeometry } from "three";
export default function WaterSurface({
  geometry,
  opacity,
  river = false,
}: {
  geometry: BufferGeometry;
  opacity: number;
  river?: boolean;
}) {
  return (
    <mesh geometry={geometry} renderOrder={river ? 2 : 1} raycast={() => null}>
      <meshBasicMaterial
        color="#318e9d"
        vertexColors={river}
        transparent
        opacity={opacity}
        depthWrite={river}
        depthFunc={river ? LessDepth : LessEqualDepth}
      />
    </mesh>
  );
}
