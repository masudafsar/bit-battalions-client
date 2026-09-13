import type { Cell } from "../terrain.ts";
import { createBaseTerrainField, SEA_LEVEL } from "./baseTerrainField.ts";
import { random } from "./noise.ts";
import type { RenderSettings } from "../renderSettings.ts";
import { buildRiverGraph, type CornerNode } from "./riverGraph.ts";
export { corner, cornerKey } from "./riverGraph.ts";
type Node = CornerNode & {
  height: number;
  water: number;
  next?: string;
  cost: number;
};
export type RiverPoint = { x: number; z: number; y: number };
export type RiverSegment = {
  a: RiverPoint;
  b: RiverPoint;
  width: number;
  endWidth: number;
};
export function buildRiverNetwork(cells: Cell[], settings: RenderSettings) {
  const field = createBaseTerrainField(cells, settings),
    nodes = new Map<string, Node>();
  for (const [key, n] of buildRiverGraph(cells))
    nodes.set(key, {
      ...n,
      height: field(n.x, n.z).height,
      water: SEA_LEVEL + 0.01,
      cost: Infinity,
    });
  const paths = cells
    .filter((c) => c.riverPath?.length)
    .map((c) => ({ cell: c, path: c.riverPath! }));
  const conflicts = new Set<string>();
  for (const { path } of paths) {
    if (
      !nodes.get(path[0])?.cells.some((c) => c.type === "mountain") ||
      path.some(
        (key, i) =>
          !nodes.has(key) ||
          (i > 0 && !nodes.get(path[i - 1])!.adjacent.has(key)),
      )
    )
      continue;
    for (let i = 0; i < path.length - 1; i++) {
      const n = nodes.get(path[i])!;
      if (n.next && n.next !== path[i + 1]) conflicts.add(path[i]);
      n.next = path[i + 1];
    }
  }
  const flow = new Map<string, number>(),
    validSources = new Set<string>(),
    order: string[] = [];
  const included = new Set<string>();
  for (const { cell, path } of paths) {
    if (!nodes.get(path[0])?.cells.some((c) => c.type === "mountain")) continue;
    const chain: string[] = [],
      visited = new Set<string>();
    let key: string | undefined = path[0],
      valid = false;
    while (key) {
      if (visited.has(key) || conflicts.has(key)) break;
      visited.add(key);
      chain.push(key);
      const n: Node | undefined = nodes.get(key);
      if (!n) break;
      if (n.ocean) {
        valid = chain.length > 1;
        break;
      }
      if (!n.next || !n.adjacent.has(n.next)) break;
      key = n.next;
    }
    if (!valid || !path.every((key, i) => chain[i] === key)) continue;
    validSources.add(`${cell.q},${cell.r}`);
    for (let i = chain.length - 1; i >= 0; i--) {
      const key = chain[i],
        n = nodes.get(key)!;
      n.cost = chain.length - 1 - i;
      if (!included.has(key)) {
        included.add(key);
        order.push(key);
      }
      if (i < chain.length - 1) flow.set(key, (flow.get(key) ?? 0) + 1);
    }
  }
  // Topological order follows ONLY user-selected edges, never a shortest route.
  order.sort((a, b) => nodes.get(a)!.cost - nodes.get(b)!.cost);
  for (const key of order) {
    const n = nodes.get(key)!;
    if (n.ocean) {
      n.next = undefined;
      continue;
    }
    const downstream = nodes.get(n.next!)!;
    n.water = Math.max(
      downstream.water + 0.003,
      Math.min(n.height - 0.05, downstream.water + 0.32),
    );
  }
  // Accumulated upstream distance widens even a single, unbranched stream.
  const distance = new Map<string, number>();
  for (const key of [...order].reverse()) {
    const n = nodes.get(key)!;
    if (flow.has(key) && n.next)
      distance.set(
        n.next,
        Math.max(distance.get(n.next) ?? 0, (distance.get(key) ?? 0) + 1),
      );
  }
  const widthAt = (key: string) =>
    0.035 +
    0.065 * (1 - Math.exp(-(distance.get(key) ?? 0) / 10)) +
    Math.min(0.015, Math.max(0, (flow.get(key) ?? 1) - 1) * 0.003);
  const segments: RiverSegment[] = [],
    buckets = new Map<string, RiverSegment[]>();
  for (const key of flow.keys()) {
    const a = nodes.get(key)!,
      b = nodes.get(a.next!)!,
      dx = b.x - a.x,
      dz = b.z - a.z;
    const width = widthAt(key),
      endWidth = Math.max(width, widthAt(a.next!));
    const bend =
      (random(
        Math.round(a.x * 100),
        Math.round(a.z * 100),
        settings.seed + 917,
      ) -
        0.5) *
      0.22 *
      settings.randomness;
    const point = (t: number): RiverPoint => ({
      x: a.x + dx * t - dz * Math.sin(Math.PI * t) * bend,
      z: a.z + dz * t + dx * Math.sin(Math.PI * t) * bend,
      y: a.water + (b.water - a.water) * t,
    });
    for (let i = 0; i < 8; i++) {
      const segment = {
        a: point(i / 8),
        b: point((i + 1) / 8),
        width: width + ((endWidth - width) * i) / 8,
        endWidth: width + ((endWidth - width) * (i + 1)) / 8,
      };
      segments.push(segment);
      for (
        let x = Math.floor(Math.min(segment.a.x, segment.b.x) - 0.7);
        x <= Math.floor(Math.max(segment.a.x, segment.b.x) + 0.7);
        x++
      )
        for (
          let z = Math.floor(Math.min(segment.a.z, segment.b.z) - 0.7);
          z <= Math.floor(Math.max(segment.a.z, segment.b.z) + 0.7);
          z++
        ) {
          const k = `${x},${z}`,
            bucket = buckets.get(k) ?? [];
          bucket.push(segment);
          buckets.set(k, bucket);
        }
    }
  }
  return {
    nodes,
    segments,
    validSources,
    near: (x: number, z: number) =>
      buckets.get(`${Math.floor(x)},${Math.floor(z)}`) ?? [],
  };
}
type Network = ReturnType<typeof buildRiverNetwork>;
const cache = new WeakMap<Cell[], { key: string; network: Network }>();
export function getRiverNetwork(cells: Cell[], settings: RenderSettings) {
  const key = JSON.stringify(settings),
    entry = cache.get(cells);
  if (entry?.key === key) return entry.network;
  // No source means no graph construction during ordinary terrain painting.
  const network = cells.some((c) => c.riverPath !== undefined)
    ? buildRiverNetwork(cells, settings)
    : {
        nodes: new Map<string, Node>(),
        segments: [],
        validSources: new Set<string>(),
        near: () => [],
      };
  cache.set(cells, { key, network });
  return network;
}
