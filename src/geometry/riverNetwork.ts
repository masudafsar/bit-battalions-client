import { position, type Cell } from "../terrain.ts";
import { createBaseTerrainField, SEA_LEVEL } from "./baseTerrainField.ts";
import { random } from "./noise.ts";
import type { RenderSettings } from "../renderSettings.ts";

type Node = {
  x: number;
  z: number;
  height: number;
  cells: Cell[];
  adjacent: Set<string>;
  next?: string;
  cost: number;
  water: number;
};
export type RiverPoint = { x: number; z: number; y: number };
export type RiverSegment = {
  a: RiverPoint;
  b: RiverPoint;
  width: number;
  endWidth: number;
};
export const cornerKey = (x: number, z: number) =>
  `${Math.round(x * 1e6)},${Math.round(z * 1e6)}`;
export function corner(cell: Cell, index: number) {
  const [x, , z] = position(cell.q, cell.r),
    angle = Math.PI / 6 + (index * Math.PI) / 3;
  return { x: x + Math.cos(angle), z: z + Math.sin(angle) };
}
// Binary heap keeps drainage construction O(V log V) at the largest map size.
class Queue {
  items: { key: string; cost: number }[] = [];
  push(item: { key: string; cost: number }) {
    let i = this.items.length;
    this.items.push(item);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.items[p].cost <= item.cost) break;
      this.items[i] = this.items[p];
      i = p;
    }
    this.items[i] = item;
  }
  pop() {
    const first = this.items[0],
      last = this.items.pop()!;
    if (this.items.length) {
      let i = 0;
      while (i * 2 + 1 < this.items.length) {
        let c = i * 2 + 1;
        if (
          c + 1 < this.items.length &&
          this.items[c + 1].cost < this.items[c].cost
        )
          c++;
        if (this.items[c].cost >= last.cost) break;
        this.items[i] = this.items[c];
        i = c;
      }
      this.items[i] = last;
    }
    return first;
  }
}
export function buildRiverNetwork(cells: Cell[], settings: RenderSettings) {
  const nodes = new Map<string, Node>(),
    field = createBaseTerrainField(cells, settings);
  const lookup = new Map(cells.map((c) => [`${c.q},${c.r}`, c]));
  const directions = [
    [1, 0],
    [0, 1],
    [-1, 1],
    [-1, 0],
    [0, -1],
    [1, -1],
  ];
  // Only water connected to the map boundary is an ocean outlet; inland lakes are not sinks.
  const ocean = new Set<Cell>(),
    flood = cells.filter(
      (c) =>
        c.type === "water" &&
        directions.some(([q, r]) => !lookup.has(`${c.q + q},${c.r + r}`)),
    );
  for (const c of flood) ocean.add(c);
  for (let i = 0; i < flood.length; i++)
    for (const [q, r] of directions) {
      const c = lookup.get(`${flood[i].q + q},${flood[i].r + r}`);
      if (c?.type === "water" && !ocean.has(c)) {
        ocean.add(c);
        flood.push(c);
      }
    }
  for (const cell of cells) {
    const keys = Array.from({ length: 6 }, (_, i) => {
      const p = corner(cell, i),
        key = cornerKey(p.x, p.z);
      let n = nodes.get(key);
      if (!n) {
        n = {
          ...p,
          height: field(p.x, p.z).height,
          cells: [],
          adjacent: new Set(),
          cost: Infinity,
          water: SEA_LEVEL + 0.01,
        };
        nodes.set(key, n);
      }
      n.cells.push(cell);
      return key;
    });
    for (let i = 0; i < 6; i++) {
      nodes.get(keys[i])!.adjacent.add(keys[(i + 1) % 6]);
      nodes.get(keys[(i + 1) % 6])!.adjacent.add(keys[i]);
    }
  }
  const queue = new Queue(),
    order: string[] = [];
  for (const [key, n] of nodes)
    if (n.cells.every((c) => ocean.has(c)) && n.height < SEA_LEVEL) {
      n.cost = 0;
      queue.push({ key, cost: 0 });
    }
  while (queue.items.length) {
    const item = queue.pop(),
      n = nodes.get(item.key)!;
    if (item.cost !== n.cost) continue;
    order.push(item.key);
    for (const key of n.adjacent) {
      const other = nodes.get(key)!;
      const uphill = Math.max(0, n.height - other.height);
      const cost =
        n.cost +
        1 +
        uphill * 18 +
        random(
          Math.round(other.x * 100),
          Math.round(other.z * 100),
          settings.seed,
        ) *
          1.6;
      if (cost < other.cost) {
        other.cost = cost;
        other.next = item.key;
        queue.push({ key, cost });
      }
    }
  }
  // A strictly descending water profile is shared by all tributaries, including confluences.
  for (const key of order) {
    const n = nodes.get(key)!;
    if (n.next) {
      const downstream = nodes.get(n.next)!;
      n.water = Math.max(
        downstream.water + 0.003,
        Math.min(n.height - 0.05, downstream.water + 0.32),
      );
    }
  }
  const flow = new Map<string, number>(),
    validSources = new Set<string>();
  for (const cell of cells) {
    if (cell.type !== "mountain" || cell.riverSource === undefined) continue;
    const p = corner(cell, cell.riverSource),
      key = cornerKey(p.x, p.z),
      source = nodes.get(key)!;
    if (
      !Number.isFinite(source.cost) ||
      !source.next ||
      source.height <= SEA_LEVEL + 0.08
    )
      continue;
    validSources.add(`${cell.q},${cell.r}`);
    let cursor: string | undefined = key;
    while (cursor) {
      const node: Node = nodes.get(cursor)!;
      if (!node.next) break;
      flow.set(cursor, (flow.get(cursor) ?? 0) + 1);
      cursor = node.next;
    }
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
  const network = cells.some((c) => c.riverSource !== undefined)
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
