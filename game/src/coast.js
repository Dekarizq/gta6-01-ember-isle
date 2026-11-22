// The coast: Sunset Beach, the Sunset Sea, the pier, the boat dock and
// the ferry terminal. The sea is a flat blue slab east of the city; the
// beach is sand south of the city; the pier reaches into the water and
// the ferry leaves from the terminal at its end. Boats bob on the water
// and the lighthouse beam sweeps at night.

import { WORLD, GOLD } from './config.js';
import { citySize } from './city.js';

export const FERRY_TERMINAL = { x: 300, z: 40 };
export const ISLAND_DOCK = { x: WORLD.islandX - 240, z: 30 };

export function coastPoints() {
  const size = citySize();
  return {
    pierEnd: { x: -20, z: size / 2 + 82 },
    boatDock: { x: 110, z: size / 2 + 56 },
    boardwalk: { x: 60, z: size / 2 + 20 },
    beach: { x: 0, z: size / 2 + 18 },
    ferryTerminal: FERRY_TERMINAL,
    islandDock: ISLAND_DOCK,
    seaCentre: { x: (WORLD.seaStartX + WORLD.islandX - 260) / 2, z: 0 },
  };
}

// Boats on the water: fishing boats near the dock, a yacht near the
// marina, a speedboat by the island. They drift slowly with the tide.
export function makeBoats(rng) {
  const boats = [];
  const defs = [
    { x: 130, z: 320, kind: 'fishing', color: [0.8, 0.6, 0.3] },
    { x: 200, z: 380, kind: 'fishing', color: [0.5, 0.65, 0.6] },
    { x: 420, z: 120, kind: 'yacht', color: [0.95, 0.93, 0.88] },
    { x: 700, z: -160, kind: 'speedboat', color: [0.9, 0.25, 0.3] },
    { x: 980, z: 160, kind: 'fishing', color: [0.6, 0.5, 0.4] },
    { x: 1180, z: -200, kind: 'speedboat', color: [0.2, 0.6, 0.7] },
  ];
  for (const d of defs) {
    boats.push({
      ...d,
      angle: rng.range(0, Math.PI * 2),
      bob: rng.range(0, Math.PI * 2),
      speed: rng.range(0.2, 0.6),
    });
  }
  return boats;
}

// Render boxes for the coast: the pier, the boardwalk, the boat dock,
// the ferry terminal and the boats (bobbing with the tide).
export function coastBoxes(coast, boats, time) {
  const boxes = [];
  const size = citySize();
  // The pier: a long wooden walkway into the sea, on stilts.
  for (let i = 0; i < 14; i += 1) {
    boxes.push({ x: -20, y: 1.2, z: size / 2 + 24 + i * 4.5, w: 8, h: 0.8, d: 4.2, color: [0.55, 0.4, 0.25], yaw: 0 });
  }
  // The boardwalk along the beach.
  boxes.push({ x: 60, y: 1.0, z: size / 2 + 20, w: 90, h: 0.8, d: 6, color: [0.6, 0.45, 0.28], yaw: 0 });
  // The boat dock.
  boxes.push({ x: 110, y: 1.2, z: size / 2 + 56, w: 16, h: 0.8, d: 8, color: [0.5, 0.38, 0.24], yaw: 0 });
  // The ferry terminal: a roofed waiting hall at the east quay.
  boxes.push({ x: FERRY_TERMINAL.x, y: 3, z: FERRY_TERMINAL.z, w: 22, h: 6, d: 14, color: [0.85, 0.8, 0.68], yaw: 0 });
  boxes.push({ x: FERRY_TERMINAL.x, y: 6.8, z: FERRY_TERMINAL.z, w: 24, h: 1.2, d: 16, color: [0.25, 0.6, 0.65], yaw: 0 });
  // The island dock: same hall, smaller, on the island's west shore.
  boxes.push({ x: ISLAND_DOCK.x, y: 3, z: ISLAND_DOCK.z, w: 18, h: 6, d: 12, color: [0.85, 0.7, 0.5], yaw: 0 });
  boxes.push({ x: ISLAND_DOCK.x, y: 6.8, z: ISLAND_DOCK.z, w: 20, h: 1.2, d: 14, color: [0.85, 0.45, 0.2], yaw: 0 });
  // Boats, bobbing gently.
  for (const b of boats) {
    const bob = Math.sin(time * 0.8 + b.bob) * 0.4;
    const len = b.kind === 'yacht' ? 14 : b.kind === 'speedboat' ? 7 : 9;
    boxes.push({ x: b.x, y: 0.6 + bob, z: b.z, w: 3.4, h: 1.4, d: len, color: b.color, yaw: b.angle });
    boxes.push({ x: b.x, y: 1.8 + bob, z: b.z, w: 2.0, h: 1.2, d: len * 0.5, color: [0.95, 0.93, 0.85], yaw: b.angle });
  }
  void coast;
  return boxes;
}

// Is a point in the sea (deep water the player cannot walk in)?
export function inSea(x, z) {
  const size = citySize();
  if (x > WORLD.seaStartX && x < WORLD.islandX - 260) return true;
  if (z > size / 2 + 60) return true;
  return false;
}
