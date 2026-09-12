import { useEffect, useMemo } from "react";
import { type ThreeEvent } from "@react-three/fiber";
import { BufferGeometry, Float32BufferAttribute, Color } from "three";
import { position, terrainInfo, type Cell } from "../../terrain";

export default function EditableGrid({
  cells,
  onPaint,
  onHover,
  navigate,
}: {
  cells: Cell[];
  onPaint: (index: number) => void;
  onHover: (index: number | null) => void;
  navigate: boolean;
}) {
  const geometry = useMemo(() => {
    const vertices: number[] = [],
      colors: number[] = [],
      lines: number[] = [];
    cells.forEach((c) => {
      const [x, , z] = position(c.q, c.r),
        color = new Color(terrainInfo[c.type].color);
      for (let k = 0; k < 6; k++) {
        const a = Math.PI / 6 + (k * Math.PI) / 3,
          b = a + Math.PI / 3;
        const first = [x + Math.cos(a), 0, z + Math.sin(a)],
          second = [x + Math.cos(b), 0, z + Math.sin(b)];
        vertices.push(x, 0, z, ...second, ...first);
        for (let j = 0; j < 3; j++) colors.push(color.r, color.g, color.b);
        lines.push(first[0], 0.015, first[2], second[0], 0.015, second[2]);
      }
    });
    const surface = new BufferGeometry();
    surface.setAttribute("position", new Float32BufferAttribute(vertices, 3));
    surface.setAttribute("color", new Float32BufferAttribute(colors, 3));
    surface.computeVertexNormals();
    const outline = new BufferGeometry();
    outline.setAttribute("position", new Float32BufferAttribute(lines, 3));
    return { surface, outline };
  }, [cells]);
  useEffect(
    () => () => {
      geometry.surface.dispose();
      geometry.outline.dispose();
    },
    [geometry],
  );
  function pointer(e: ThreeEvent<PointerEvent>, down = false) {
    e.stopPropagation();
    if (e.faceIndex == null) return;
    const index = Math.floor(e.faceIndex / 6);
    onHover(index);
    if (!navigate && (down || e.buttons === 1)) onPaint(index);
  }
  return (
    <group>
      <mesh
        geometry={geometry.surface}
        onPointerDown={(e) => {
          if (e.button === 0) pointer(e, true);
        }}
        onPointerMove={(e) => pointer(e)}
        onPointerOut={() => onHover(null)}
      >
        <meshBasicMaterial vertexColors />
      </mesh>
      <lineSegments geometry={geometry.outline} raycast={() => null}>
        <lineBasicMaterial color="#31433b" transparent opacity={0.3} />
      </lineSegments>
    </group>
  );
}
