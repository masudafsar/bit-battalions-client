import { BufferAttribute, BufferGeometry, Sphere, Vector3 } from "three";

export type MeshData = {
  attributes: Record<string, { array: Float32Array; itemSize: number }>;
  boundingSphere: { center: [number, number, number]; radius: number } | null;
  index: Uint16Array | Uint32Array | null;
};

export function packMesh(geometry: BufferGeometry): MeshData {
  return {
    boundingSphere: geometry.boundingSphere
      ? {
          center: geometry.boundingSphere.center.toArray(),
          radius: geometry.boundingSphere.radius,
        }
      : null,
    attributes: Object.fromEntries(
      Object.entries(geometry.attributes).map(([name, attribute]) => [
        name,
        { array: attribute.array as Float32Array, itemSize: attribute.itemSize },
      ]),
    ),
    index: (geometry.index?.array as MeshData["index"]) ?? null,
  };
}

export function unpackMesh(data: MeshData): BufferGeometry {
  const geometry = new BufferGeometry();
  for (const [name, { array, itemSize }] of Object.entries(data.attributes)) {
    geometry.setAttribute(name, new BufferAttribute(array, itemSize));
  }
  if (data.boundingSphere) {
    geometry.boundingSphere = new Sphere(
      new Vector3(...data.boundingSphere.center),
      data.boundingSphere.radius,
    );
  }
  if (data.index) geometry.setIndex(new BufferAttribute(data.index, 1));
  return geometry;
}

export function meshBuffers(mesh: MeshData): ArrayBuffer[] {
  return [
    ...Object.values(mesh.attributes).map(({ array }) => array.buffer as ArrayBuffer),
    ...(mesh.index ? [mesh.index.buffer as ArrayBuffer] : []),
  ];
}
