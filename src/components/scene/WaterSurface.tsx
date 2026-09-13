import type { BufferGeometry } from "three";
export default function WaterSurface({
  geometry,
  opacity,
}: {
  geometry: BufferGeometry;
  opacity: number;
}) {
  return (
    <mesh geometry={geometry} renderOrder={1}>
      <meshBasicMaterial
        color="#318e9d"
        transparent
        opacity={opacity}
        depthWrite={false}
      />
    </mesh>
  );
}
