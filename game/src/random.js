// Seeded deterministic random helpers (mulberry32 + value noise).
// Rev2 note: the same seed must reproduce the same world for every shot —
// the dossier is byte-identical across runs because of this determinism.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeRng(seed) {
  const next = mulberry32(seed);
  return {
    next,
    range(min, max) { return min + (max - min) * next(); },
    int(min, max) { return Math.floor(min + (max - min + 1) * next()); },
    pick(list) { return list[Math.floor(next() * list.length)]; },
    chance(p) { return next() < p; },
  };
}

// Small 2D value-noise field, deterministic for a seed.
export function makeNoise(seed) {
  const rng = mulberry32(seed);
  const grid = new Float32Array(64 * 64);
  for (let i = 0; i < grid.length; i++) grid[i] = rng();
  function at(ix, iz) {
    const x = ((ix % 64) + 64) % 64, z = ((iz % 64) + 64) % 64;
    return grid[z * 64 + x];
  }
  function smooth(t) { return t * t * (3 - 2 * t); }
  return function noise(x, z) {
    const fx = Math.floor(x), fz = Math.floor(z);
    const tx = smooth(x - fx), tz = smooth(z - fz);
    const a = at(fx, fz), b = at(fx + 1, fz), c = at(fx, fz + 1), d = at(fx + 1, fz + 1);
    return a + (b - a) * tx + (c - a) * tz + (a - b - c + d) * tx * tz;
  };
}

export function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
export function lerp(a, b, t) { return a + (b - a) * t; }
export function dist2(ax, az, bx, bz) { const dx = ax - bx, dz = az - bz; return dx * dx + dz * dz; }

// Round 10 — deterministic 2D hash: a stable pseudo-random value in
// [0, 1) for a pair of integer coordinates, so surf foam, mist and dust
// look organic without any per-frame randomness (shots stay identical).
export function hash2(ix, iz) {
  let h = (ix * 374761393 + iz * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Round 10 — smoothstep 0..1 for fades (mist density, dusk blend,
// headlight ramp) without branching.
export function smoothstep(a, b, x) {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

// Round 10 — gaussian-ish jitter in [-1, 1] from a seeded rng, for
// exhaust puff sizes and pedestrian stride variation.
export function gauss(rng) {
  return (rng.next() + rng.next() + rng.next() - 1.5) * 2 / 3;
}
export function angleLerp(a, b, t) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}
