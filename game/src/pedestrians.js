// Pedestrians for Vesper City: Ember Isle.
// Ordinary people walking the sidewalks: shoppers, fishermen, tourists.
// They stroll, wait at corners, and run away when shots are fired or a
// car comes at them. Pure logic; the world loop steps them and the
// engine draws them as small figures.

import { makeRng, clamp } from './random.js';
import { roadLines } from './city.js';

const FIRST_NAMES = ['Ana', 'Beto', 'Celia', 'Dario', 'Elena', 'Felix', 'Greta', 'Hugo', 'Ines', 'Jonas', 'Kira', 'Leo', 'Mira', 'Nico', 'Olga', 'Pablo', 'Rosa', 'Tomas', 'Uma', 'Vera'];
const SHIRT_COLORS = [[0.9, 0.3, 0.3], [0.3, 0.6, 0.9], [0.95, 0.8, 0.3], [0.4, 0.8, 0.4], [0.85, 0.5, 0.85], [0.95, 0.95, 0.9], [0.3, 0.3, 0.35], [0.9, 0.55, 0.2]];

// A pedestrian: a name, a shirt, a place, a destination and a mood.
export function makePedestrian(rng, x, z) {
  const lines = roadLines();
  return {
    name: rng.pick(FIRST_NAMES),
    shirt: rng.pick(SHIRT_COLORS),
    x, z,
    angle: rng.range(0, Math.PI * 2),
    speed: rng.range(1.2, 2.2),
    target: { x: rng.pick(lines), z: rng.pick(lines) },
    fleeing: false,
    fleeTimer: 0,
    waitTimer: rng.range(0, 4),
  };
}

export function makeCrowd(rng, count) {
  const lines = roadLines();
  const peds = [];
  for (let i = 0; i < count; i += 1) {
    peds.push(makePedestrian(rng, rng.pick(lines) + rng.range(-6, 6), rng.pick(lines) + rng.range(-6, 6)));
  }
  return peds;
}

// One step: walk toward the target, wait at corners, flee from danger.
export function stepPedestrians(peds, dt, danger, rng) {
  const lines = roadLines();
  for (const p of peds) {
    // Danger nearby (gunfire, explosion, speeding car): run away.
    if (danger && danger.x !== undefined) {
      const d = Math.sqrt((p.x - danger.x) * (p.x - danger.x) + (p.z - danger.z) * (p.z - danger.z));
      if (d < danger.radius) {
        p.fleeing = true;
        p.fleeTimer = 3;
        const a = Math.atan2(p.x - danger.x, p.z - danger.z);
        p.angle = a;
      }
    }
    if (p.fleeTimer > 0) {
      p.fleeTimer -= dt;
      p.x += Math.sin(p.angle) * 5 * dt;
      p.z += Math.cos(p.angle) * 5 * dt;
      if (p.fleeTimer <= 0) p.fleeing = false;
      continue;
    }
    if (p.waitTimer > 0) {
      p.waitTimer -= dt;
      continue;
    }
    const dx = p.target.x - p.x;
    const dz = p.target.z - p.z;
    const d = Math.sqrt(dx * dx + dz * dz);
    if (d < 2) {
      p.target = { x: rng.pick(lines), z: rng.pick(lines) };
      p.waitTimer = rng.range(1, 5);
      continue;
    }
    p.angle = Math.atan2(dx, dz);
    p.x += Math.sin(p.angle) * p.speed * dt;
    p.z += Math.cos(p.angle) * p.speed * dt;
    p.x = clamp(p.x, -230, 230);
    p.z = clamp(p.z, -230, 230);
  }
}

// Render boxes for a pedestrian: legs, torso, head.
export function pedBoxes(p) {
  return [
    { x: p.x, y: 0.45, z: p.z, w: 0.5, h: 0.9, d: 0.4, color: [0.2, 0.2, 0.25], yaw: p.angle },
    { x: p.x, y: 1.15, z: p.z, w: 0.6, h: 0.7, d: 0.45, color: p.shirt, yaw: p.angle },
    { x: p.x, y: 1.7, z: p.z, w: 0.4, h: 0.4, d: 0.4, color: [0.85, 0.65, 0.5], yaw: p.angle },
  ];
}

// The nearest pedestrian to a point (for talking, bumping, missions).
export function nearestPed(peds, x, z, maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const p of peds) {
    const d = Math.sqrt((p.x - x) * (p.x - x) + (p.z - z) * (p.z - z));
    if (d < bestD) { bestD = d; best = p; }
  }
  return best;
}

export { makeRng };
