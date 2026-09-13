/** Seeded value noise: edits never reshuffle untouched parts of the landscape. */
export function random(x: number, z: number, seed = 731) {
  let n = Math.imul(x | 0, 374761393) ^ Math.imul(z | 0, 668265263) ^ seed;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}
export function noise(x: number, z: number, seed = 731): number {
  const ix = Math.floor(x),
    iz = Math.floor(z);
  const u = x - ix,
    v = z - iz,
    a = u * u * (3 - 2 * u),
    b = v * v * (3 - 2 * v);
  const lerp = (x: number, y: number, t: number) => x + (y - x) * t;
  return (
    lerp(
      lerp(random(ix, iz, seed), random(ix + 1, iz, seed), a),
      lerp(random(ix, iz + 1, seed), random(ix + 1, iz + 1, seed), a),
      b,
    ) *
      2 -
    1
  );
}
export function fbm(x: number, z: number, seed = 731) {
  return (
    noise(x, z, seed) * 0.57 +
    noise(x * 2.13, z * 2.13, seed + 13) * 0.28 +
    noise(x * 4.37, z * 4.37, seed + 37) * 0.15
  );
}
