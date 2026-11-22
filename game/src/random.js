// Seeded random numbers for Vesper City: Ember Isle.
// Everything the game generates — the city, the island, traffic, the radio
// — comes from one seeded stream, so the same seed always builds the same
// world. A mulberry32 core plus the small helpers the generators use.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A small RNG object: next() in [0,1), int(a,b) inclusive, range(a,b),
// pick(list), chance(p), and a gaussian-ish jitter for natural variation.
export function makeRng(seed) {
  const next = mulberry32(seed);
  return {
    next,
    int(a, b) {
      return a + Math.floor(next() * (b - a + 1));
    },
    range(a, b) {
      return a + next() * (b - a);
    },
    pick(list) {
      return list[Math.floor(next() * list.length)];
    },
    chance(p) {
      return next() < p;
    },
    jitter(v, amount) {
      return v + (next() * 2 - 1) * amount;
    },
    // A stable hash of a string, so names and ids always seed the same way.
    hash(str) {
      let h = 2166136261;
      for (let i = 0; i < str.length; i += 1) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      return h >>> 0;
    },
  };
}

// Clamp a number into [a, b].
export function clamp(v, a, b) {
  return v < a ? a : v > b ? b : v;
}

// Linear interpolation.
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Wrap an angle into [-PI, PI].
export function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

// Distance between two points on the ground plane.
export function dist2d(ax, az, bx, bz) {
  const dx = ax - bx;
  const dz = az - bz;
  return Math.sqrt(dx * dx + dz * dz);
}

// A deterministic id from a seed and a label, for save files and tests.
export function seededId(seed, label) {
  const rng = makeRng(seed + label.length * 7919 + label.charCodeAt(0));
  return `${label}-${Math.floor(rng.next() * 90000 + 10000)}`;
}
