// The static world: Vesper City, Ember Isle, the bay between them.
// Everything here is deterministic from the seed. Boxes are plain arrays:
// [x, y, z, w, h, d, r, g, b, noFog, yaw]. Dynamic things (cars, ferry, smoke,
// people, coins) live in game.js and are drawn on top of these each frame.
import { CITY, ISLAND, PIER, SEA_LINE, SUN, SUN_COINS } from './config.js';
import { range } from './random.js';

const GOLD = [0.95, 0.72, 0.32];
const CREAM = [0.96, 0.88, 0.74];
const ROSE = [0.92, 0.6, 0.5];
const SAND = [0.9, 0.78, 0.55];

function shade(base, f) {
  return [base[0] * f, base[1] * f, base[2] * f];
}

export function buildWorld(random) {
  const statics = [];
  const colliders = [];
  const coins = [];

  const add = (x, y, z, w, h, d, c, noFog, yaw) => {
    statics.push([x, y, z, w, h, d, c[0], c[1], c[2], noFog ? 1 : 0, yaw || 0]);
  };
  const solid = (x, z, w, d) => {
    colliders.push({ x0: x - w / 2, z0: z - d / 2, x1: x + w / 2, z1: z + d / 2 });
  };

  // ---- ground: city slab, beach, island sand, sea bands ----
  add(0, -0.6, 0, 820, 1, 820, [0.32, 0.3, 0.32], 0, 0); // city ground
  add(-392, -0.5, 0, 60, 1, 700, SAND, 0, 0); // beach strip
  add(ISLAND.x, -0.6, ISLAND.z, 500, 1, 500, [0.16, 0.15, 0.14], 0, 0); // island base
  add(ISLAND.x, -0.4, ISLAND.z, 470, 1, 470, SAND, 0, 0); // black sand ring
  add(ISLAND.x, -0.3, ISLAND.z, 430, 1, 430, [0.24, 0.22, 0.2], 0, 0); // dark sand
  // Sea: three long bands running east-west, so the sunset paints a warm road
  // of light down the middle of the bay and blue water on either side.
  add(-950, -0.9, -190, 1150, 1, 240, [0.2, 0.38, 0.62], 0, 0); // north band
  add(-950, -0.85, 0, 1150, 1, 90, [0.95, 0.6, 0.3], 0, 0); // sun-reflection band
  add(-950, -0.9, 190, 1150, 1, 240, [0.14, 0.34, 0.52], 0, 0); // south band
  // Sun glints: small gold slabs scattered on the warm band.
  for (let i = 0; i < 9; i += 1) {
    const gx = -480 - random() * 600;
    const gz = -55 + random() * 110;
    add(gx, -0.4, gz, 26 + random() * 30, 0.5, 5 + random() * 4, [1.0, 0.8, 0.4], 1, 0);
  }
  // Far horizon band + a few high clouds so the sky is never a flat field.
  add(-1250, 6, 0, 8, 60, 1600, [1.0, 0.78, 0.52], 1, 0);
  for (let i = 0; i < 7; i += 1) {
    add(-700 - random() * 500, 190 + random() * 90, -500 + random() * 1000,
      120 + random() * 160, 8, 26 + random() * 20, [1.0, 0.85, 0.7], 0, 0);
  }

  // ---- the sun: a big disc on the western horizon + wide halos, noFog.
  // Colours run past 1.0 on purpose: the face toward the camera is shaded
  // 0.62, so only HDR values stay brighter than the orange sky.
  add(SUN.x, SUN.y, SUN.z, 3, SUN.disc, SUN.disc, [1.6, 1.35, 0.8], 1, 0);
  add(SUN.x - 6, SUN.y, SUN.z, 2, SUN.halo, SUN.halo, [1.7, 1.15, 0.6], 1, 0);
  add(SUN.x - 12, SUN.y, SUN.z, 2, SUN.halo * 1.7, SUN.halo * 1.7, [1.5, 0.9, 0.45], 1, 0);

  // ---- Vesper City: 9x9 blocks, streets between them ----
  const pitch = CITY.block + CITY.street; // 84
  const start = -((CITY.blocks - 1) * pitch) / 2;
  const palettes = [GOLD, CREAM, ROSE, [0.85, 0.62, 0.45], [0.7, 0.55, 0.6], [0.98, 0.8, 0.55]];
  for (let bx = 0; bx < CITY.blocks; bx += 1) {
    for (let bz = 0; bz < CITY.blocks; bz += 1) {
      const cx = start + bx * pitch;
      const cz = start + bz * pitch;
      // Street slab under every block edge is the city ground itself; draw the
      // asphalt cross at block corners so roads read from above.
      const glass = bx >= 4 && bx <= 6 && bz <= 2; // Glass Quarter, north-east
      const towers = 1 + Math.floor(random() * 3);
      for (let t = 0; t < towers; t += 1) {
        const w = 14 + random() * 18;
        const d = 14 + random() * 18;
        const h = glass ? 55 + random() * 55 : 14 + random() * 42;
        // Keep every tower inside its block: the offset can never push a
        // tower's edge past the block (half 31), so streets stay clear.
        const maxOff = Math.max(2, 29 - Math.max(w, d) / 2);
        const ox = (random() - 0.5) * 2 * maxOff;
        const oz = (random() - 0.5) * 2 * maxOff;
        const base = glass ? [0.75, 0.68, 0.55] : palettes[Math.floor(random() * palettes.length)];
        const col = shade(base, 0.85 + random() * 0.3);
        add(cx + ox, h / 2, cz + oz, w, h, d, col, 0, 0);
        solid(cx + ox, cz + oz, w, d);
        // Roof rim + antenna on the tall ones.
        if (h > 55) {
          add(cx + ox, h + 1, cz + oz, w * 0.7, 2, d * 0.7, shade(col, 0.7), 0, 0);
          add(cx + ox, h + 8, cz + oz, 1.5, 14, 1.5, [0.9, 0.3, 0.2], 1, 0);
        }
        // Lit window strips on the east face: gold, noFog, so towers never read flat.
        if (h > 30) {
          const rows = Math.floor(h / 12);
          for (let r = 0; r < rows; r += 1) {
            add(cx + ox + w / 2 + 0.4, 6 + r * 12, cz + oz, 0.8, 5, d * 0.72,
              [1.0, 0.8, 0.4], 1, 0);
          }
          add(cx + ox, 6, cz + oz + d / 2 + 0.4, w * 0.72, 5, 0.8, [1.0, 0.75, 0.35], 1, 0);
        }
      }
    }
  }
  // Street markings: centre dashes along the two main avenues.
  for (let i = -4; i <= 4; i += 1) {
    const p = i * pitch;
    for (let s = -340; s < 340; s += 46) {
      add(p, 0.1, s, 1.6, 0.4, 14, [0.95, 0.85, 0.4], 0, 0);
      add(s, 0.1, p, 14, 0.4, 1.6, [0.95, 0.85, 0.4], 0, 0);
    }
  }
  // Sunset Pier: wooden planks reaching into the bay, with lamp posts.
  for (let s = 0; s < 10; s += 1) {
    add(PIER.x - s * 4.5, 1.2, 0, 4.4, 1, 26, [0.55, 0.38, 0.22], 0, 0);
  }
  for (let s = 0; s < 5; s += 1) {
    add(PIER.x - s * 9, 5, -11, 1.2, 8, 1.2, [0.2, 0.18, 0.16], 0, 0);
    add(PIER.x - s * 9, 9.5, -11, 2.5, 2.5, 2.5, [1.0, 0.8, 0.35], 1, 0);
    add(PIER.x - s * 9, 5, 11, 1.2, 8, 1.2, [0.2, 0.18, 0.16], 0, 0);
    add(PIER.x - s * 9, 9.5, 11, 2.5, 2.5, 2.5, [1.0, 0.8, 0.35], 1, 0);
  }
  // Palms along the beach, leaning toward the sea.
  for (let i = 0; i < 26; i += 1) {
    const pz = -330 + i * 26 + range(random, -6, 6);
    const px = -372 + range(random, -6, 6);
    add(px, 6, pz, 1.6, 12, 1.6, [0.45, 0.3, 0.18], 0, 0);
    add(px - 3, 13, pz, 9, 2.5, 9, [0.15, 0.5, 0.2], 0, 0);
    add(px + 2, 12, pz + 2, 7, 2, 7, [0.2, 0.58, 0.22], 0, 0);
  }
  // Marina boats moored at the south-east marina.
  for (let i = 0; i < 5; i += 1) {
    const bx = 150 + i * 42;
    add(bx, 1.5, 352, 10, 3, 26, [0.95, 0.95, 0.95], 0, 0);
    add(bx, 4.5, 352, 6, 4, 12, [0.85, 0.6, 0.3], 0, 0);
  }

  // ---- Ember Isle: volcano, village, market, lighthouse, resort ----
  const vx = ISLAND.x, vz = ISLAND.z;
  // Volcano terraces: seven stacked slabs, dark rock warming toward the top.
  // Colours are kept bright enough to read through the golden-hour haze.
  const terraces = [
    [300, 18, 0.62], [252, 36, 0.68], [208, 56, 0.74], [168, 78, 0.8],
    [130, 100, 0.86], [96, 122, 0.92], [64, 142, 0.98],
  ];
  for (const [size, h, f] of terraces) {
    add(vx, h / 2, vz, size, h, size, [0.5 * f + 0.1, 0.32 * f + 0.05, 0.26 * f + 0.04], 0, 0);
  }
  // Lava disc at the summit + a bright crater rim ring that reads from the side.
  add(vx, ISLAND.volcanoH - 2, vz, 46, 3, 46, [1.0, 0.55, 0.1], 1, 0);
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2;
    add(vx + Math.cos(a) * 26, ISLAND.volcanoH - 1, vz + Math.sin(a) * 26,
      12, 5, 12, [1.0, 0.62, 0.12], 1, 0);
  }
  // Three lava flows running down the slopes, bright and noFog. Each flow is
  // four slabs laid on the terrace tops, stepping down the cone, so the stream
  // reads from the side instead of being buried inside the terraces.
  const flows = [
    { dx: 1, dz: 0.25 }, { dx: -0.6, dz: 0.8 }, { dx: -0.2, dz: -1 },
  ];
  const flowSteps = [
    { r: 36, y: 124 }, { r: 72, y: 80 }, { r: 108, y: 38 }, { r: 142, y: 20 },
  ];
  for (const fl of flows) {
    const len = Math.hypot(fl.dx, fl.dz) || 1;
    const nx = fl.dx / len, nz = fl.dz / len;
    const ang = Math.atan2(nx, nz);
    for (const st of flowSteps) {
      add(vx + nx * st.r, st.y, vz + nz * st.r, 9, 2.5, 42, [1.0, 0.5, 0.08], 1, ang);
    }
  }
  // Beacon: a wide column of light above the crater + two dimmer side pillars.
  add(vx, ISLAND.volcanoH + 55, vz, 22, 110, 22, [1.0, 0.45, 0.08], 1, 0);
  add(vx - 34, ISLAND.volcanoH + 34, vz, 8, 68, 8, [0.9, 0.35, 0.08], 1, 0);
  add(vx + 34, ISLAND.volcanoH + 34, vz, 8, 68, 8, [0.9, 0.35, 0.08], 1, 0);
  // Second crater, smaller, south-east of the main cone, with a bigger lava disc.
  add(vx + 150, 22, vz + 120, 90, 44, 90, [0.4, 0.26, 0.2], 0, 0);
  add(vx + 150, 45, vz + 120, 50, 3, 50, [1.0, 0.55, 0.1], 1, 0);
  // Lighthouse on the eastern point, white with red bands, lamp on top.
  add(vx + 190, 18, vz - 40, 12, 36, 12, [0.95, 0.93, 0.88], 0, 0);
  add(vx + 190, 12, vz - 40, 12.6, 4, 12.6, [0.85, 0.2, 0.15], 0, 0);
  add(vx + 190, 26, vz - 40, 12.6, 4, 12.6, [0.85, 0.2, 0.15], 0, 0);
  add(vx + 190, 38, vz - 40, 6, 5, 6, [1.0, 0.85, 0.4], 1, 0);
  // Ember Village: fishermen's huts around the south beach.
  for (let i = 0; i < 9; i += 1) {
    const hx = vx - 90 + i * 22 + range(random, -5, 5);
    const hz = vz + 150 + range(random, -8, 8);
    add(hx, 4, hz, 12, 8, 10, shade(CREAM, 0.8 + random() * 0.2), 0, 0);
    add(hx, 9.5, hz, 13, 3, 11, [0.7, 0.3, 0.15], 0, 0);
  }
  // Night market: six stalls with striped awnings on the south beach, near the
  // volcano-shot camera, plus three lit lanterns in the foreground.
  const stallCols = [[0.9, 0.25, 0.2], [0.95, 0.75, 0.2], [0.2, 0.55, 0.85], [0.85, 0.4, 0.7], [0.3, 0.75, 0.35], [0.95, 0.5, 0.15]];
  for (let i = 0; i < 6; i += 1) {
    const sx = vx - 70 + i * 26;
    const sz = vz + 218 + (i % 2) * 12;
    add(sx, 3, sz, 10, 6, 8, [0.5, 0.35, 0.22], 0, 0);
    add(sx, 7.5, sz, 12, 1.5, 10, stallCols[i], 0, 0);
    add(sx, 5, sz + 4.5, 8, 3, 1, [1.0, 0.8, 0.3], 1, 0);
  }
  for (let i = 0; i < 3; i += 1) {
    const lx = vx - 46 + i * 34;
    add(lx, 5, vz + 238, 1, 10, 1, [0.25, 0.2, 0.15], 0, 0);
    add(lx, 11, vz + 238, 3.5, 4.5, 3.5, [1.0, 0.75, 0.25], 1, 0);
  }
  // Resort: white blocks + a blue pool on the north-east shore.
  for (let i = 0; i < 4; i += 1) {
    add(vx + 120 + i * 30, 8, vz + 120, 22, 16, 18, [0.96, 0.94, 0.9], 0, 0);
    add(vx + 120 + i * 30, 17, vz + 120, 18, 2, 14, [0.2, 0.6, 0.8], 0, 0);
  }
  add(vx + 150, 0.6, vz + 80, 40, 1, 22, [0.15, 0.55, 0.85], 0, 0);
  // Island dirt roads: pale slabs from dock to village to market.
  add(vx + 110, -0.1, vz + 100, 260, 0.6, 12, [0.7, 0.6, 0.45], 0, 0);
  add(vx - 40, -0.1, vz + 190, 12, 0.6, 130, [0.7, 0.6, 0.45], 0, 0);
  // Two other boats on the ferry route so the bay never reads empty.
  add(-560, 1.5, 40, 12, 3, 30, [0.9, 0.9, 0.92], 0, 0.3);
  add(-640, 1.5, -30, 9, 3, 22, [0.85, 0.6, 0.3], 0, -0.4);

  // ---- Sun Coins: 42 glowing pickups, city + island ----
  const coinSpots = [];
  for (let i = 0; i < 24; i += 1) {
    coinSpots.push([start + Math.floor(random() * 9) * pitch + range(random, -20, 20),
      start + Math.floor(random() * 9) * pitch + range(random, -20, 20)]);
  }
  for (let i = 0; i < 18; i += 1) {
    const a = random() * Math.PI * 2;
    const r = 60 + random() * 150;
    coinSpots.push([vx + Math.cos(a) * r, vz + Math.sin(a) * r]);
  }
  for (const [cx, cz] of coinSpots) coins.push({ x: cx, z: cz, y: 2.5, taken: false });

  return { statics, colliders, coins, spawn: { x: -42, z: -210, yaw: Math.PI } };
}
