// Visual effects for Vesper City: Ember Isle.
// Particles, explosions, muzzle flashes, dust and the lava glow — the
// small things that make a box city feel like a game. Effects are
// plain data (a list of particles with a position, a velocity, a
// colour and a life); the world loop steps them and the engine draws
// them as tiny boxes. No DOM, no WebGL here: just numbers.

import { clamp } from './random.js';

export function createEffects() {
  return {
    particles: [], // {x,y,z,vx,vy,vz,color,life,maxLife,size}
    flashes: [], // {x,y,z,life}
    shake: 0, // screen shake, 0..1
  };
}

export function spawnParticles(effects, x, y, z, color, count, speed, life) {
  for (let i = 0; i < count; i += 1) {
    const a = Math.random() * Math.PI * 2;
    const up = Math.random() * 0.8 + 0.2;
    effects.particles.push({
      x, y, z,
      vx: Math.cos(a) * speed * Math.random(),
      vy: up * speed,
      vz: Math.sin(a) * speed * Math.random(),
      color,
      life: life * (0.6 + Math.random() * 0.4),
      maxLife: life,
      size: 0.4 + Math.random() * 0.5,
    });
  }
}

export function spawnExplosion(effects, x, y, z) {
  spawnParticles(effects, x, y + 1, z, [1.0, 0.5, 0.1], 26, 9, 1.1);
  spawnParticles(effects, x, y + 1, z, [0.9, 0.85, 0.3], 14, 6, 0.7);
  spawnParticles(effects, x, y + 1, z, [0.25, 0.22, 0.2], 18, 5, 1.6);
  effects.flashes.push({ x, y: y + 2, z, life: 0.18 });
  effects.shake = Math.min(1, effects.shake + 0.7);
}

export function spawnMuzzle(effects, x, y, z) {
  spawnParticles(effects, x, y, z, [1.0, 0.85, 0.3], 4, 4, 0.15);
  effects.flashes.push({ x, y, z, life: 0.06 });
}

export function spawnDust(effects, x, y, z) {
  spawnParticles(effects, x, y, z, [0.75, 0.65, 0.5], 2, 2, 0.5);
}

export function spawnLavaSparks(effects, x, y, z) {
  spawnParticles(effects, x, y, z, [1.0, 0.4, 0.1], 3, 3, 0.9);
}

export function stepEffects(effects, dt) {
  for (const p of effects.particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.z += p.vz * dt;
    p.vy -= 9 * dt; // gravity pulls the sparks down
    if (p.y < 0.2) { p.y = 0.2; p.vy = 0; }
  }
  effects.particles = effects.particles.filter((p) => p.life > 0);
  for (const f of effects.flashes) f.life -= dt;
  effects.flashes = effects.flashes.filter((f) => f.life > 0);
  if (effects.shake > 0) effects.shake = Math.max(0, effects.shake - dt * 1.5);
}

// Render boxes for the effects: particles as fading boxes, flashes as
// bright cubes that shrink as they die.
export function effectBoxes(effects) {
  const boxes = [];
  for (const p of effects.particles) {
    const t = clamp(p.life / p.maxLife, 0, 1);
    boxes.push({
      x: p.x, y: p.y, z: p.z, w: p.size, h: p.size, d: p.size,
      color: [p.color[0] * t + 0.1, p.color[1] * t + 0.05, p.color[2] * t],
      yaw: 0,
    });
  }
  for (const f of effects.flashes) {
    const s = 2 + f.life * 8;
    boxes.push({ x: f.x, y: f.y, z: f.z, w: s, h: s, d: s, color: [1.0, 0.9, 0.5], yaw: 0 });
  }
  return boxes;
}

export function effectCount(effects) {
  return effects.particles.length + effects.flashes.length;
}
