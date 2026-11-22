// Combat for Vesper City: Ember Isle.
// Shooting, explosions and the enemies who shoot back. A shot is a ray
// from the camera: the nearest enemy, car or pedestrian inside the
// weapon's range and a small cone takes the damage. Enemies are simple
// actors with health who fire back when close. Cars burn below 30 hp
// and explode at 0, and an explosion hurts everything near it.

import { WEAPONS } from './config.js';
import { clamp } from './random.js';

// An enemy: a Tide Kings thug with a name, a place and health.
export function makeEnemy(rng, x, z, name) {
  return {
    name: name || 'Tide Kings thug',
    x, z,
    angle: rng ? rng.range(0, Math.PI * 2) : 0,
    hp: 60,
    alive: true,
    shootTimer: rng ? rng.range(0.5, 1.5) : 1,
    color: [0.35, 0.25, 0.55],
  };
}

export function makeEnemies(rng, spots) {
  return spots.map((s, i) => makeEnemy(rng, s.x, s.z, s.name || `Tide Kings thug ${i + 1}`));
}

// Fire one shot. origin: {x, y, z, angle}; weapon: a WEAPONS entry.
// targets: {enemies, cars, peds} — the first thing inside the cone and
// range takes the damage. Returns a report for the HUD and the sim.
export function fireShot(origin, weapon, targets, rng) {
  const dirX = Math.sin(origin.angle);
  const dirZ = Math.cos(origin.angle);
  let best = null;
  let bestD = weapon.range;
  const consider = (obj, kind) => {
    const dx = obj.x - origin.x;
    const dz = obj.z - origin.z;
    const d = Math.sqrt(dx * dx + dz * dz);
    if (d > weapon.range || d < 0.5) return;
    const dot = (dx * dirX + dz * dirZ) / d;
    if (dot < 0.94) return; // outside the aim cone
    if (d < bestD) { bestD = d; best = { obj, kind, d }; }
  };
  for (const e of targets.enemies || []) if (e.alive) consider(e, 'enemy');
  for (const c of targets.cars || []) if (!c.exploded) consider(c, 'car');
  for (const p of targets.peds || []) consider(p, 'ped');
  if (!best) return { hit: false, kind: null, damage: 0, dist: weapon.range };
  const damage = weapon.damage * (rng ? rng.range(0.9, 1.1) : 1);
  if (best.kind === 'enemy') {
    best.obj.hp -= damage;
    if (best.obj.hp <= 0) best.obj.alive = false;
  } else if (best.kind === 'car') {
    best.obj.hp = Math.max(0, best.obj.hp - damage);
    if (best.obj.hp < 30) best.obj.burning = true;
    if (best.obj.hp <= 0) best.obj.exploded = true;
  } else if (best.kind === 'ped') {
    best.obj.fleeing = true;
    best.obj.fleeTimer = 5;
  }
  return { hit: true, kind: best.kind, damage: Math.round(damage), dist: Math.round(bestD * 10) / 10 };
}

// Enemies shoot back: each alive enemy fires at the player when close
// enough, on a timer. Returns the damage dealt this step.
export function enemiesShoot(enemies, player, dt) {
  let damage = 0;
  for (const e of enemies) {
    if (!e.alive) continue;
    const dx = player.x - e.x;
    const dz = player.z - e.z;
    const d = Math.sqrt(dx * dx + dz * dz);
    e.shootTimer -= dt;
    if (d < 45 && e.shootTimer <= 0) {
      e.shootTimer = 1.6;
      e.angle = Math.atan2(dx, dz);
      // Hit chance falls with distance; the player is a moving target.
      const hitChance = clamp(0.55 - d / 120, 0.08, 0.55);
      if (Math.random() < hitChance) damage += 8;
    }
  }
  return damage;
}

// An explosion at (x,z): damages every enemy, car and the player
// inside the radius, and returns who was hurt.
export function explodeAt(x, z, radius, targets, player) {
  const hurt = { enemies: 0, cars: 0, player: 0 };
  const bang = (obj) => {
    const d = Math.sqrt((obj.x - x) * (obj.x - x) + (obj.z - z) * (obj.z - z));
    return d < radius;
  };
  for (const e of targets.enemies || []) {
    if (e.alive && bang(e)) {
      e.hp -= 80;
      if (e.hp <= 0) e.alive = false;
      hurt.enemies += 1;
    }
  }
  for (const c of targets.cars || []) {
    if (!c.exploded && bang(c)) {
      c.hp = 0;
      c.exploded = true;
      c.burning = true;
      hurt.cars += 1;
    }
  }
  if (player && bang(player)) hurt.player = 25;
  return hurt;
}

// Render boxes for enemies: legs, torso, head, and a gun when alive.
export function enemyBoxes(e) {
  if (!e.alive) return [];
  return [
    { x: e.x, y: 0.45, z: e.z, w: 0.5, h: 0.9, d: 0.4, color: [0.15, 0.12, 0.18], yaw: e.angle },
    { x: e.x, y: 1.15, z: e.z, w: 0.65, h: 0.7, d: 0.45, color: e.color, yaw: e.angle },
    { x: e.x, y: 1.7, z: e.z, w: 0.4, h: 0.4, d: 0.4, color: [0.85, 0.65, 0.5], yaw: e.angle },
    { x: e.x, y: 1.2, z: e.z, w: 0.25, h: 0.2, d: 0.9, color: [0.1, 0.1, 0.12], yaw: e.angle },
  ];
}

export function weaponById(id) {
  return WEAPONS.find((w) => w.id === id) || WEAPONS[0];
}

export function aliveEnemies(enemies) {
  return enemies.filter((e) => e.alive).length;
}
