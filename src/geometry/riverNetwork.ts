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
  channelDepth: number;
  endChannelDepth: number;
};
export function buildRiverNetwork(cells: Cell[], settings: RenderSettings) {
  const field = createBaseTerrainField(cells, settings),
    nodes = new Map<string, Node>();
  for (const [key, n] of buildRiverGraph(cells)) {
    const sampledHeight = field(n.x, n.z).height;
    const height = n.ocean
      ? Math.min(
          sampledHeight,
          SEA_LEVEL +
            0.008 -
            settings.riverDepth -
            settings.riverMouthWidth * 0.7,
        )
      : sampledHeight;
    nodes.set(key, {
      ...n,
      height,
      // A river mouth terminates at the receiving water cell's seabed. This
      // lets the channel continue into the water instead of stopping at the
      // shoreline while keeping the underwater end merged with the terrain.
      water: n.ocean ? height : SEA_LEVEL + 0.008,
      cost: Infinity,
    });
  }
  const paths = cells.flatMap((cell) => {
    const stored = cell.riverPaths ?? (cell.riverPath ? [cell.riverPath] : []);
    return stored.map((path, index) => ({
      cell,
      path,
      source: index ? `${cell.q},${cell.r}@${index}` : `${cell.q},${cell.r}`,
    }));
  });
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
  for (const { path, source } of paths) {
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
    validSources.add(source);
    for (let i = chain.length - 1; i >= 0; i--) {
      const key = chain[i],
        n = nodes.get(key)!;
      n.cost = chain.length - 1 - i;
      if (!included.has(key)) {
        included.add(key);
        order.push(key);
      }
      flow.set(key, (flow.get(key) ?? 0) + 1);
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
      SEA_LEVEL + 0.008,
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
  const outletFlow = new Map<string, number>();
  for (const key of order) {
    const node = nodes.get(key)!;
    outletFlow.set(key, node.ocean ? flow.get(key)! : outletFlow.get(node.next!)!);
  }
  const widthAt = (key: string) => {
    const upstream = distance.get(key) ?? 0;
    const progress = upstream / Math.max(1, upstream + nodes.get(key)!.cost);
    // Tributaries contribute discharge; every basin reaches its configured mouth width.
    const discharge = Math.sqrt((flow.get(key) ?? 1) / outletFlow.get(key)!);
    const source = Math.min(settings.riverSourceWidth, settings.riverMouthWidth * 0.15);
    return source + (settings.riverMouthWidth - source) * progress * discharge;
  };
  const segments: RiverSegment[] = [],
    buckets = new Map<string, RiverSegment[]>();
  const incoming = new Map<string, string[]>();
  for (const key of flow.keys()) {
    if (!nodes.get(key)!.next) continue;
    const next = nodes.get(key)!.next!;
    const list = incoming.get(next) ?? [];
    list.push(key);
    incoming.set(next, list);
  }
  const unit = (x: number, z: number) => {
    const length = Math.hypot(x, z);
    return length ? { x: x / length, z: z / length } : { x: 0, z: 0 };
  };
  const blend = (
    edge: { x: number; z: number },
    continuation: { x: number; z: number } | undefined,
  ) =>
    !continuation
      ? edge
      : unit(
          edge.x * (1 - settings.riverCornerSmoothing) +
            continuation.x * settings.riverCornerSmoothing,
          edge.z * (1 - settings.riverCornerSmoothing) +
            continuation.z * settings.riverCornerSmoothing,
        );
  for (const key of flow.keys()) {
    if (nodes.get(key)!.ocean) continue;
    const a = nodes.get(key)!,
      b = nodes.get(a.next!)!,
      dx = b.x - a.x,
      dz = b.z - a.z;
    const width = widthAt(key),
      endWidth = Math.max(width, widthAt(a.next!)),
      length = Math.hypot(dx, dz),
      edge = unit(dx, dz),
      previous = incoming.get(key)?.[0],
      previousNode = previous ? nodes.get(previous)! : undefined,
      start = blend(
        edge,
        previousNode ? unit(a.x - previousNode.x, a.z - previousNode.z) : undefined,
      ),
      nextNode = b.next ? nodes.get(b.next) : undefined,
      end = blend(
        edge,
        nextNode ? unit(nextNode.x - b.x, nextNode.z - b.z) : undefined,
      );
    const bend =
      (random(
        Math.round(a.x * 100),
        Math.round(a.z * 100),
        settings.seed + 917,
      ) -
        0.5) *
      settings.riverMeander *
      settings.randomness;
    const point = (t: number): RiverPoint => {
      const inverse = 1 - t,
        c1x = a.x + start.x * length / 3,
        c1z = a.z + start.z * length / 3,
        c2x = b.x - end.x * length / 3,
        c2z = b.z - end.z * length / 3,
        curve = Math.sin(Math.PI * t) ** 2 * bend;
      return {
        x:
          inverse ** 3 * a.x +
          3 * inverse ** 2 * t * c1x +
          3 * inverse * t ** 2 * c2x +
          t ** 3 * b.x -
          dz * curve,
        z:
          inverse ** 3 * a.z +
          3 * inverse ** 2 * t * c1z +
          3 * inverse * t ** 2 * c2z +
          t ** 3 * b.z +
          dx * curve,
        y: a.water + (b.water - a.water) * t,
      };
    };
    for (let i = 0; i < 8; i++) {
      const segment = {
        a: point(i / 8),
        b: point((i + 1) / 8),
        width: width + ((endWidth - width) * i) / 8,
        endWidth: width + ((endWidth - width) * (i + 1)) / 8,
        channelDepth: b.ocean ? 1 - i / 8 : 1,
        endChannelDepth: b.ocean ? 1 - (i + 1) / 8 : 1,
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
  const network = cells.some(
    (c) => c.riverPath !== undefined || c.riverPaths?.length,
  )
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
