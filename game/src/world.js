// World generation: city grid, island, volcano, palms, traffic and pedestrians.
// Deterministic from a seed so screenshots and replays match.
import { CITY, ISLE, VOLCANO, DISTRICTS, FERRY } from './config.js';
import { makeRng, makeNoise, clamp } from './random.js';

export function buildWorld(seed) {
  const rng = makeRng(seed);
  const noise = makeNoise(seed * 7 + 13);
  const buildings = [];
  const palms = [];
  const lamps = [];
  const coins = [];
  const peds = [];
  const trafficSpawns = [];

  // 9x9 city blocks. Each block holds 1-4 towers; height grows toward centre.
  const half = CITY.blocks / 2;
  for (let bx = -4; bx <= 4; bx++) {
    for (let bz = -4; bz <= 4; bz++) {
      const cx = bx * CITY.pitch, cz = bz * CITY.pitch;
      const dCenter = Math.sqrt(bx * bx + bz * bz) / half;
      const n = rng.int(1, 4);
      for (let i = 0; i < n; i++) {
        const ox = rng.range(-8, 8), oz = rng.range(-8, 8);
        const w = rng.range(10, 16), d = rng.range(10, 16);
        const h = Math.round((10 + (1 - dCenter) * 52 + noise(bx * 3 + i, bz * 3) * 26) * 2) / 2;
        const gold = rng.chance(0.72);
        buildings.push({
          x: cx + ox, z: cz + oz, w, d, h,
          color: gold ? pickGold(rng) : pickGlass(rng),
          glass: !gold,
          windows: Math.max(2, Math.floor(h / 4)),
          roof: rng.chance(0.3),
        });
      }
      // Street lamps at block corners.
      lamps.push({ x: cx + 22, z: cz + 22 });
      lamps.push({ x: cx - 22, z: cz - 22 });
    }
  }

  // Beach palms along the east shore (x > 195) and the pier.
  for (let i = 0; i < 64; i++) {
    const z = rng.range(-200, 210);
    const x = rng.range(196, 236);
    palms.push({ x, z, h: rng.range(7, 12), lean: rng.range(-0.25, 0.25), phase: rng.range(0, 6.28) });
  }
  for (let i = 0; i < 26; i++) {
    palms.push({ x: rng.range(-230, 230), z: rng.range(196, 228), h: rng.range(6, 11), lean: rng.range(-0.2, 0.2), phase: rng.range(0, 6.28) });
  }
  // Island palms around the ring road.
  for (let i = 0; i < 40; i++) {
    const a = rng.range(0, Math.PI * 2);
    const r = rng.range(120, 178);
    palms.push({ x: ISLE.x + Math.cos(a) * r, z: ISLE.z + Math.sin(a) * r * 0.85, h: rng.range(6, 11), lean: rng.range(-0.2, 0.2), phase: rng.range(0, 6.28) });
  }

  // 42 Sun Coins scattered: city rooftops, beach, island, crater rim.
  for (let i = 0; i < SUN_COINS_TOTAL_PLACEMENTS; i++) {
    const spot = i % 4;
    if (spot === 0) coins.push({ x: rng.range(-200, 200), z: rng.range(-200, 200), y: rng.range(4, 26) });
    else if (spot === 1) coins.push({ x: rng.range(200, 235), z: rng.range(-200, 200), y: 2 });
    else if (spot === 2) coins.push({ x: ISLE.x + rng.range(-170, 170), z: ISLE.z + rng.range(-150, 150), y: 2 });
    else coins.push({ x: VOLCANO.x + rng.range(-60, 60), z: VOLCANO.z + rng.range(-60, 60), y: rng.range(20, 60) });
  }

  // Pedestrians on sidewalks.
  for (let i = 0; i < 46; i++) {
    peds.push({
      x: rng.range(-200, 200), z: rng.range(-200, 200),
      speed: rng.range(0.8, 2.2), dir: rng.range(0, Math.PI * 2),
      shirt: pickShirt(rng), skin: pickSkin(rng),
    });
  }
  for (let i = 0; i < 18; i++) {
    peds.push({
      x: ISLE.x + rng.range(-150, 150), z: ISLE.z + rng.range(-130, 130),
      speed: rng.range(0.8, 2), dir: rng.range(0, Math.PI * 2),
      shirt: pickShirt(rng), skin: pickSkin(rng),
    });
  }

  // Traffic spawn points on the grid roads (roads sit at half-pitch offsets).
  for (let i = 0; i < 26; i++) {
    const horizontal = rng.chance(0.5);
    const lane = rng.int(-4, 4) * CITY.pitch + CITY.pitch / 2;
    trafficSpawns.push({
      x: horizontal ? rng.range(-200, 200) : lane,
      z: horizontal ? lane : rng.range(-200, 200),
      dir: horizontal ? (rng.chance(0.5) ? 0 : Math.PI) : (rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2),
    });
  }

  // Volcano lava flows: three ribbons down the slopes, precomputed waypoints.
  const lavaFlows = [];
  for (const a of [0.4, 2.2, 4.1]) {
    const pts = [];
    for (let t = 0; t <= 1.001; t += 0.125) {
      const r = VOLCANO.craterR + t * (VOLCANO.base - VOLCANO.craterR);
      pts.push({
        x: VOLCANO.x + Math.cos(a) * r,
        z: VOLCANO.z + Math.sin(a) * r,
        y: volcanoHeightAt(r) + 0.6,
        w: 3 + Math.sin(t * Math.PI) * 4,
      });
    }
    lavaFlows.push(pts);
  }

  // Ferry route waypoints: pier -> open sea -> isle dock.
  const ferryRoute = [
    { x: FERRY.pier.x, z: FERRY.pier.z },
    { x: -330, z: 40 },
    { x: -430, z: -10 },
    { x: FERRY.isleDock.x, z: FERRY.isleDock.z },
  ];

  return {
    seed, buildings, palms, lamps, coins, peds, trafficSpawns,
    lavaFlows, ferryRoute,
    districts: DISTRICTS,
    volcano: VOLCANO, isle: ISLE,
  };
}

const SUN_COINS_TOTAL_PLACEMENTS = 42;

function pickGold(rng) {
  return rng.pick(['#c98a2e', '#d9a441', '#b57a24', '#e0aa4e', '#a86f1e', '#d4af37']);
}
function pickGlass(rng) {
  return rng.pick(['#3a6a8a', '#2e5a78', '#4a7a9a', '#35607e']);
}
function pickShirt(rng) {
  return rng.pick(['#ff5c5c', '#4db8ff', '#ffd23c', '#7aff8a', '#ff8ad8', '#ffffff', '#ff9a3c']);
}
function pickSkin(rng) {
  return rng.pick(['#e8b88a', '#c98d5f', '#8a5a33', '#f2c9a0', '#6e4423']);
}

// Cone profile: height falls linearly from crater rim to base radius.
export function volcanoHeightAt(r) {
  const v = VOLCANO;
  if (r <= v.craterR) return v.height;
  const t = clamp((r - v.craterR) / (v.base - v.craterR), 0, 1);
  return v.height * (1 - t);
}

export function groundHeightAt(x, z) {
  const dIsle = Math.sqrt((x - ISLE.x) ** 2 + (z - ISLE.z) ** 2);
  if (dIsle < VOLCANO.base) {
    return volcanoHeightAt(dIsle);
  }
  if (dIsle < ISLE.radius) return 2.5;
  if (x > 195) return 1.2; // beach sand
  if (Math.abs(x) <= CITY.half + 20 && Math.abs(z) <= CITY.half + 20) return 0;
  return 0; // sea level handled by sea plane
}

export function isSea(x, z) {
  const dIsle = Math.sqrt((x - ISLE.x) ** 2 + (z - ISLE.z) ** 2);
  if (dIsle < ISLE.radius) return false;
  if (x > 200) return false;
  if (Math.abs(x) <= CITY.half + 24 && Math.abs(z) <= CITY.half + 24) return false;
  return true;
}
