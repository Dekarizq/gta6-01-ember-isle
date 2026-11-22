// World generation: city grid, island, volcano, palms, traffic and pedestrians.
// Deterministic from a seed so screenshots and replays match.
// Round 10 note: the city, isle and volcano are unchanged, but the shore
// is dressed — beach umbrellas, surfboards, ferry-route buoys and pier
// props are seeded here and drawn by the renderer, so the new beach and
// pier shots have foreground life instead of empty sand and sea.
import { CITY, ISLE, VOLCANO, DISTRICTS, FERRY, BEACH, HARBOR, DOCKS } from './config.js';
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
  // Round 10 — beach dressing and sea markers, all seeded so every run
  // stages the same shore: umbrellas + surfboards on Sunset Beach,
  // orange buoys along the ferry route, crates and benches on the pier.
  const umbrellas = [];
  const surfboards = [];
  const buoys = [];
  const pierProps = [];

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

  // Volcano lava flows: four ribbons down the slopes, precomputed waypoints.
  // The 1.5 rad flow runs down the face the volcano camera sees, so the
  // dark cone carries a bright glowing ribbon in the shot (the old three
  // left that face bare); it sits ~33 m from the lava road, clear of the car.
  const lavaFlows = [];
  for (const a of [0.4, 1.5, 2.2, 4.1]) {
    const pts = [];
    for (let t = 0; t <= 1.001; t += 0.125) {
      const r = VOLCANO.craterR + t * (VOLCANO.base - VOLCANO.craterR);
      pts.push({
        x: VOLCANO.x + Math.cos(a) * r,
        z: VOLCANO.z + Math.sin(a) * r,
        y: volcanoHeightAt(r) + 0.6,
        w: 4 + Math.sin(t * Math.PI) * 5,
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

  // Round 10 — Sunset Beach dressing: striped umbrellas in a loose row
  // above the surf line, surfboards stuck upright in the sand between
  // them, colours picked from the same sunset palette as the city.
  // They sit east of the beach road (x >= 224) so the Round 10 pier
  // chase shot keeps a clear driving line.
  const umbrellaCols = ['#ff5c3c', '#ffd23c', '#2fa8ff', '#ff8ad8', '#7aff8a'];
  for (let i = 0; i < BEACH.umbrellas; i++) {
    umbrellas.push({
      x: rng.range(226, 244), z: rng.range(-190, 190),
      color: umbrellaCols[i % umbrellaCols.length],
      tilt: rng.range(-0.12, 0.12),
    });
  }
  for (let i = 0; i < BEACH.surfboards; i++) {
    surfboards.push({
      x: rng.range(224, 240), z: rng.range(-180, 180),
      color: umbrellaCols[(i + 2) % umbrellaCols.length],
      lean: rng.range(-0.2, 0.2),
    });
  }
  // Round 10 — orange marker buoys bobbing along the ferry route, so the
  // strait reads as a sailed channel instead of empty blue.
  for (let i = 0; i < BEACH.buoys; i++) {
    const t = (i + 0.5) / BEACH.buoys;
    const a = ferryRoute[1], b = ferryRoute[2];
    buoys.push({
      x: a.x + (b.x - a.x) * t + rng.range(-14, 14),
      z: a.z + (b.z - a.z) * t + rng.range(-14, 14),
      phase: rng.range(0, 6.28),
    });
  }
  // Round 10 — Sunset Pier props: fish crates stacked near the pier root
  // and wooden benches facing the sunset, for the pier chase shot.
  for (let i = 0; i < BEACH.pierCrates; i++) {
    pierProps.push({
      x: FERRY.pier.x - 6 - i * 3.2, z: FERRY.pier.z + (i % 2 ? 3.4 : -3.4),
      kind: i < 3 ? 'crate' : 'bench',
    });
  }

  // Round 10 — the lived-in isle and the working harbour, all seeded:
  // fishing-village huts with thatched roofs on the isle's south shore,
  // white resort blocks on the north shore, three container cranes over
  // Harbor Docks, and big bright billboards on four city towers.
  const villageHuts = [];
  for (let i = 0; i < HARBOR.villageHuts; i++) {
    villageHuts.push({
      x: HARBOR.villageX + rng.range(-70, 70), z: HARBOR.villageZ + rng.range(-25, 25),
      w: rng.range(5, 8), h: rng.range(3, 5),
      roof: rng.pick(['#c98a2e', '#8a5a26', '#a86f1e']),
      wall: rng.pick(['#e8dcc0', '#d8c8a8', '#c8b898']),
    });
  }
  const resortBlocks = [];
  for (let i = 0; i < HARBOR.resortBlocks; i++) {
    resortBlocks.push({
      x: HARBOR.resortX - 60 + i * 42, z: HARBOR.resortZ + (i % 2 ? 14 : -12),
      w: 26, h: 12 + i * 4, d: 18,
      color: i % 2 ? '#f2ede0' : '#d8e8f2',
    });
  }
  const cranes = [];
  for (let i = 0; i < HARBOR.cranes; i++) {
    cranes.push({
      x: HARBOR.craneX + i * 36, z: HARBOR.craneZ + (i % 2 ? 18 : -16),
      h: 46 + i * 6, reach: 34,
    });
  }
  // Billboards sit on four of the tallest towers, facing the roads.
  const billboards = [];
  const tall = [...buildings].sort((a, b) => b.h - a.h).slice(0, HARBOR.billboards);
  const boardCols = ['#ff5c8a', '#2fd8ff', '#ffd23c', '#7aff8a'];
  tall.forEach((b, i) => {
    billboards.push({ x: b.x, y: b.h + 4, z: b.z + b.d / 2 + 0.6, color: boardCols[i % boardCols.length] });
  });

  // Round 10 — dock containers stacked in rows at Harbor Docks, and bus
  // stops with benches and signs on four of the city's main roads.
  const containers = [];
  const contCols = ['#b8202e', '#2e5a78', '#c98a2e', '#4a7a3a'];
  for (let i = 0; i < DOCKS.containers; i++) {
    const row = Math.floor(i / 4), col = i % 4;
    containers.push({
      x: DOCKS.containerX + col * 8, z: DOCKS.containerZ + row * 7,
      level: row === 2 && col % 2 === 0 ? 1 : 0,
      color: contCols[i % contCols.length],
    });
  }
  const busStops = [];
  for (const [bx, bz] of [[23, 69], [-69, 23], [115, -23], [-23, -115]]) {
    busStops.push({ x: bx, z: bz });
  }

  return {
    seed, buildings, palms, lamps, coins, peds, trafficSpawns,
    lavaFlows, ferryRoute, umbrellas, surfboards, buoys, pierProps,
    villageHuts, resortBlocks, cranes, billboards, containers, busStops,
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
