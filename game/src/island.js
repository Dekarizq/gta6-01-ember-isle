// Ember Isle — the volcanic second map across the Sunset Sea.
// A lava volcano with a glowing crater, a black-sand beach, a fishing
// village, Ember Town, a resort, a night market and a lighthouse. The
// volcano is built tall on purpose (88 metres, a beacon of lava light
// above the crater that ignores fog) so its cone is visible from far
// away, from the ferry and from the city shore. Pure data, like the
// city: the engine turns it into geometry, the world loop walks it.

import { WORLD, GOLD } from './config.js';
import { districtBaseColor, lavaColor } from './textures.js';

export const ISLAND = {
  x: WORLD.islandX,
  z: WORLD.islandZ,
  size: WORLD.islandSize,
  volcanoRadius: WORLD.volcanoRadius,
  volcanoHeight: WORLD.volcanoHeight,
};

// Which island district a point belongs to, by distance from the crater.
export function islandDistrictAt(x, z) {
  const dx = x - ISLAND.x;
  const dz = z - ISLAND.z;
  const d = Math.sqrt(dx * dx + dz * dz);
  if (d < ISLAND.volcanoRadius * 0.55) return { name: 'Volcano Rim' };
  if (d < ISLAND.volcanoRadius) return { name: 'Volcano Rim' };
  if (x > ISLAND.x + 150 && Math.abs(z) < 120) return { name: 'Ember Resort' };
  if (x < ISLAND.x - 120 && Math.abs(z) < 110) return { name: 'Fisher Village' };
  if (z > 150) return { name: 'Night Market' };
  if (z < -150) return { name: 'Black Sand Beach' };
  if (x > ISLAND.x + 200) return { name: 'Lighthouse Point' };
  return { name: 'Ember Town' };
}

// The island's road network: a ring around the volcano plus four spokes
// to the dock, the village, the resort and the lighthouse. Cars and
// missions walk these points; nothing is ever placed inside a building.
export function islandRoadPoints() {
  const cx = ISLAND.x;
  const cz = ISLAND.z;
  const ring = [];
  for (let i = 0; i < 12; i += 1) {
    const a = (i / 12) * Math.PI * 2;
    ring.push({ x: cx + Math.cos(a) * 190, z: cz + Math.sin(a) * 190 });
  }
  return {
    ring,
    dock: { x: cx - 240, z: 30 },
    village: { x: cx - 170, z: -40 },
    resort: { x: cx + 190, z: 60 },
    lighthouse: { x: cx + 235, z: -120 },
    market: { x: cx + 40, z: 190 },
    craterRoad: { x: cx + 40, z: -120 },
  };
}

export function generateIsland(rng) {
  const cx = ISLAND.x;
  const cz = ISLAND.z;
  const buildings = [];
  const stalls = [];
  const rocks = [];
  // Ember Town: a small grid of warm-stone houses around the crater road.
  for (let gx = -2; gx <= 2; gx += 1) {
    for (let gz = -2; gz <= 2; gz += 1) {
      if (gx === 0 && gz === 0) continue;
      const x = cx + gx * 42 + rng.range(-6, 6);
      const z = cz + gz * 42 + rng.range(-6, 6);
      const d = Math.sqrt((x - cx) * (x - cx) + (z - cz) * (z - cz));
      if (d < 165) continue; // keep the volcano clear
      buildings.push({
        x, z,
        w: rng.range(9, 15), d: rng.range(9, 15), h: rng.range(6, 14),
        color: districtBaseColor(rng, 'Ember Town'), district: 'Ember Town',
      });
    }
  }
  // Fisher Village: low huts on the west shore.
  for (let i = 0; i < 8; i += 1) {
    buildings.push({
      x: cx - 190 + rng.range(-25, 25), z: -90 + i * 24 + rng.range(-6, 6),
      w: rng.range(8, 12), d: rng.range(8, 12), h: rng.range(4, 7),
      color: districtBaseColor(rng, 'Fisher Village'), district: 'Fisher Village',
    });
  }
  // Resort: white blocks on the east shore.
  for (let i = 0; i < 5; i += 1) {
    buildings.push({
      x: cx + 180 + rng.range(-15, 15), z: -20 + i * 34,
      w: rng.range(12, 18), d: rng.range(10, 14), h: rng.range(8, 16),
      color: [0.95, 0.88, 0.7], district: 'Ember Resort',
    });
  }
  // Night market: lantern stalls on the south shore — three in the
  // market row, three moved to the south beach foreground, close to
  // where the volcano shot's camera stands, so the shot's foreground
  // is lit market life instead of empty dark sand.
  const marketGoods = ['Grilled fish', 'Obsidian charms', 'Lava lamps', 'Palm wine', 'Volcano postcards', 'Black sand jars'];
  const stallSpots = [
    { x: cx - 60, z: cz + 195 },
    { x: cx - 34, z: cz + 195 },
    { x: cx - 8, z: cz + 195 },
    { x: cx - 105, z: cz + 238 },
    { x: cx - 60, z: cz + 245 },
    { x: cx + 75, z: cz + 238 },
  ];
  for (let i = 0; i < 6; i += 1) {
    stalls.push({
      x: stallSpots[i].x, z: stallSpots[i].z,
      goods: marketGoods[i],
      color: rng.pick([[0.9, 0.5, 0.85], [0.95, 0.7, 0.2], [0.5, 0.8, 0.9]]),
    });
  }
  // Obsidian rocks on the black beach, for the collector.
  for (let i = 0; i < 12; i += 1) {
    rocks.push({
      x: cx + rng.range(-240, 240), z: cz - 200 + rng.range(-30, 30),
      size: rng.range(1.2, 2.6),
    });
  }
  // The lighthouse on the east point.
  const lighthouse = { x: cx + 235, z: -120, h: 42 };
  // The second crater: a smaller cone south-west of the main one.
  const crater2 = { x: cx - 150, z: cz + 130, radius: 55, height: 34 };
  return { buildings, stalls, rocks, lighthouse, crater2 };
}

// The volcano cone as stacked terraces: each step a shrinking box, so
// the cone reads as a mountain from far away and the crater glows at
// the top. The beacon pillar above the crater ignores fog entirely.
export function volcanoBoxes(pulse) {
  const boxes = [];
  const cx = ISLAND.x;
  const cz = ISLAND.z;
  const steps = 7;
  for (let i = 0; i < steps; i += 1) {
    const t = i / steps;
    const r = ISLAND.volcanoRadius * (1 - t * 0.82);
    const y0 = ISLAND.volcanoHeight * t;
    const h = ISLAND.volcanoHeight / steps + 2;
    const shade = 0.55 + t * 0.35;
    boxes.push({
      x: cx, y: y0 + h / 2, z: cz, w: r * 2, h, d: r * 2,
      color: [0.32 * shade + 0.1, 0.2 * shade + 0.05, 0.16 * shade + 0.04],
      yaw: 0,
    });
  }
  // The crater: a glowing lava disc at the summit.
  boxes.push({
    x: cx, y: ISLAND.volcanoHeight + 1, z: cz,
    w: ISLAND.volcanoRadius * 0.36, h: 2, d: ISLAND.volcanoRadius * 0.36,
    color: lavaColor(pulse), yaw: 0, noFog: true,
  });
  // The crater rim: four bright slabs around the disc's edge, so the
  // glow reads from a low camera instead of a disc seen edge-on.
  const rimR = ISLAND.volcanoRadius * 0.36 * 0.55 + 4;
  const rimColor = lavaColor(1.0);
  boxes.push({ x: cx, y: ISLAND.volcanoHeight + 1.5, z: cz - rimR, w: 16, h: 2, d: 7, color: rimColor, yaw: 0, noFog: true });
  boxes.push({ x: cx, y: ISLAND.volcanoHeight + 1.5, z: cz + rimR, w: 16, h: 2, d: 7, color: rimColor, yaw: 0, noFog: true });
  boxes.push({ x: cx - rimR, y: ISLAND.volcanoHeight + 1.5, z: cz, w: 7, h: 2, d: 16, color: rimColor, yaw: 0, noFog: true });
  boxes.push({ x: cx + rimR, y: ISLAND.volcanoHeight + 1.5, z: cz, w: 7, h: 2, d: 16, color: rimColor, yaw: 0, noFog: true });
  // Lava flows down the flanks: stepped bright slabs, one step per
  // terrace, on all four sides — the south flow faces the volcano
  // shot's camera head-on. Step heights follow the terrace tops
  // (surface ~90 at r=42, ~65 at r=78, ~40 at r=112).
  const lava = lavaColor(1.0);
  const flowSteps = [
    { r: 42, y: 91 },
    { r: 78, y: 66 },
    { r: 112, y: 41 },
  ];
  for (const s of flowSteps) {
    boxes.push({ x: cx, y: s.y, z: cz - s.r, w: 8, h: 2, d: 40, color: lava, yaw: 0, noFog: true });
    boxes.push({ x: cx, y: s.y, z: cz + s.r, w: 8, h: 2, d: 40, color: lava, yaw: 0, noFog: true });
    boxes.push({ x: cx + s.r, y: s.y, z: cz, w: 40, h: 2, d: 8, color: lava, yaw: 0, noFog: true });
    boxes.push({ x: cx - s.r, y: s.y, z: cz, w: 40, h: 2, d: 8, color: lava, yaw: 0, noFog: true });
  }
  // The beacon: a wide pillar of lava light above the crater, visible
  // from the ferry and the city shore through any fog, with two dimmer
  // side pillars so the column reads as light, not a thin line.
  boxes.push({
    x: cx, y: ISLAND.volcanoHeight + 55, z: cz,
    w: 22, h: 110, d: 22, color: lavaColor(Math.max(pulse, 0.6)), yaw: 0, noFog: true,
  });
  boxes.push({
    x: cx - 20, y: ISLAND.volcanoHeight + 35, z: cz,
    w: 8, h: 70, d: 8, color: lavaColor(Math.max(pulse, 0.5)), yaw: 0, noFog: true,
  });
  boxes.push({
    x: cx + 20, y: ISLAND.volcanoHeight + 35, z: cz,
    w: 8, h: 70, d: 8, color: lavaColor(Math.max(pulse, 0.5)), yaw: 0, noFog: true,
  });
  // Smoke: dark slabs drifting above the crater, overlapping into a
  // plume and offset with the pulse so it looks alive against the sky.
  for (let i = 0; i < 5; i += 1) {
    const s = 16 + i * 2;
    boxes.push({
      x: cx + (i - 2) * 5 + pulse * 4, y: 100 + i * 8, z: cz - 6 + i * 3,
      w: s, h: s * 0.7, d: s, color: [0.25, 0.22, 0.22], yaw: 0,
    });
  }
  return boxes;
}

// Render boxes for the whole island: volcano, town, village, resort,
// market stalls, rocks, lighthouse and the second crater.
export function islandBoxes(island, pulse) {
  const boxes = volcanoBoxes(pulse);
  const cx = ISLAND.x;
  const cz = ISLAND.z;
  for (const b of island.buildings) {
    boxes.push({ x: b.x, y: b.h / 2, z: b.z, w: b.w, h: b.h, d: b.d, color: b.color, yaw: 0 });
  }
  for (const s of island.stalls) {
    boxes.push({ x: s.x, y: 2.2, z: s.z, w: 5, h: 1.0, d: 4, color: s.color, yaw: 0 });
    boxes.push({ x: s.x, y: 1.0, z: s.z, w: 0.4, h: 2.0, d: 0.4, color: [0.4, 0.3, 0.2], yaw: 0 });
  }
  for (const r of island.rocks) {
    boxes.push({ x: r.x, y: r.size / 2, z: r.z, w: r.size, h: r.size, d: r.size, color: [0.08, 0.08, 0.12], yaw: r.x * 0.01 });
  }
  const lh = island.lighthouse;
  boxes.push({ x: lh.x, y: lh.h / 2, z: lh.z, w: 8, h: lh.h, d: 8, color: [0.95, 0.93, 0.85], yaw: 0 });
  boxes.push({ x: lh.x, y: lh.h + 1.5, z: lh.z, w: 5, h: 3, d: 5, color: [1.0, 0.9, 0.4], yaw: 0, noFog: true });
  // Second crater: smaller terraces, south-west.
  const c2 = island.crater2;
  for (let i = 0; i < 4; i += 1) {
    const t = i / 4;
    const r = c2.radius * (1 - t * 0.75);
    boxes.push({
      x: c2.x, y: c2.height * t + c2.height / 8, z: c2.z,
      w: r * 2, h: c2.height / 4 + 1, d: r * 2,
      color: [0.35, 0.22, 0.18], yaw: 0,
    });
  }
  boxes.push({
    x: c2.x, y: c2.height + 0.5, z: c2.z,
    w: c2.radius * 0.55, h: 1.5, d: c2.radius * 0.55, color: lavaColor(pulse), yaw: 0, noFog: true,
  });
  // Lanterns by the south-beach market stalls: small gold lights, no
  // fog, so the volcano shot's foreground glows at golden hour.
  const lanterns = [
    { x: cx - 105, z: cz + 236 },
    { x: cx - 60, z: cz + 243 },
    { x: cx + 75, z: cz + 236 },
  ];
  for (const l of lanterns) {
    boxes.push({ x: l.x, y: 3, z: l.z, w: 1.2, h: 2.4, d: 1.2, color: [1.0, 0.8, 0.3], yaw: 0, noFog: true });
  }
  // The island ground itself is drawn by the world loop as slabs; the
  // ring road is a dark strip around the volcano.
  const roads = islandRoadPoints();
  for (const p of roads.ring) {
    boxes.push({ x: p.x, y: 0.25, z: p.z, w: 16, h: 0.5, d: 16, color: [0.2, 0.19, 0.21], yaw: 0 });
  }
  void cx; void cz;
  return boxes;
}

// Is a point inside the volcano cone (blocked ground)?
export function insideVolcano(x, z) {
  const dx = x - ISLAND.x;
  const dz = z - ISLAND.z;
  return Math.sqrt(dx * dx + dz * dz) < ISLAND.volcanoRadius * 0.9;
}
