// Vehicles for Vesper City: Ember Isle.
// Car definitions, simple arcade driving physics, and the traffic that
// fills the roads. A car is a box with a cabin, a speed and a steering
// angle; driving is acceleration, braking and grip-limited turning, with
// building collision handled by the city. Traffic cars follow the road
// lines and turn at intersections, so the streets always feel alive.

import { VEHICLES } from './config.js';
import { clamp, wrapAngle } from './random.js';
import { roadLines, roadCross, hitsBuilding } from './city.js';

export function vehicleDef(id) {
  return VEHICLES.find((v) => v.id === id) || VEHICLES[0];
}

// A live car: position, heading, speed, health, owner and upgrades.
export function makeCar(def, x, z, angle, opts) {
  const o = opts || {};
  return {
    def,
    x, z,
    angle: angle || 0,
    speed: 0,
    steer: 0,
    hp: 100,
    burning: false,
    exploded: false,
    driver: !!o.driver,
    parked: !!o.parked,
    color: o.color || def.color,
    upgrades: o.upgrades || { engine: 0, armour: 0, tyres: 0, nitro: 0, chrome: 0, raceSpec: false },
    nitroLeft: 100,
  };
}

// Top speed with upgrades: engine adds 8% a level, RACE SPEC adds 25%.
export function carTopSpeed(car) {
  let top = car.def.top;
  top *= 1 + car.upgrades.engine * 0.08;
  if (car.upgrades.raceSpec) top *= 1.25;
  return top;
}

export function carAccel(car) {
  return car.def.accel * (1 + car.upgrades.engine * 0.1);
}

// One physics step for a player-driven car. input: {throttle, brake,
// steer, handbrake, nitro}. Returns nothing; mutates the car.
export function stepCar(car, input, dt, buildings) {
  const top = carTopSpeed(car);
  const accel = carAccel(car);
  const grip = car.def.grip * (1 + car.upgrades.tyres * 0.12);
  if (input.nitro && car.nitroLeft > 0 && input.throttle > 0) {
    car.speed += accel * 1.8 * dt;
    car.nitroLeft = Math.max(0, car.nitroLeft - 30 * dt);
  } else if (input.throttle > 0) {
    car.speed += accel * dt;
  } else if (input.brake > 0) {
    car.speed -= car.def.brake * dt;
  } else {
    car.speed -= Math.sign(car.speed) * 8 * dt;
    if (Math.abs(car.speed) < 0.5) car.speed = 0;
  }
  if (input.handbrake) car.speed *= Math.max(0, 1 - 4 * dt);
  car.speed = clamp(car.speed, -top * 0.35, top);
  // Steering: sharper at low speed, gentler at high speed.
  const steerTarget = clamp(input.steer || 0, -1, 1);
  const steerRate = input.handbrake ? 4.5 : 2.6;
  car.steer += clamp(steerTarget - car.steer, -steerRate * dt, steerRate * dt);
  const speedFactor = clamp(Math.abs(car.speed) / top, 0, 1);
  const turnRate = grip * (0.35 + 0.65 * (1 - speedFactor)) * (input.handbrake ? 1.5 : 1);
  car.angle += car.steer * turnRate * (car.speed / top) * dt * 2.2;
  const nx = car.x + Math.sin(car.angle) * car.speed * dt;
  const nz = car.z + Math.cos(car.angle) * car.speed * dt;
  // Building collision: slide along walls, lose speed on impact.
  const hit = buildings ? hitsBuilding(nx, nz, 2.2, buildings) : null;
  if (hit) {
    car.speed *= 0.4;
    car.hp = Math.max(0, car.hp - Math.abs(car.speed) * 0.4);
    if (car.hp < 30) car.burning = true;
  } else {
    car.x = nx;
    car.z = nz;
  }
  if (car.hp <= 0 && !car.exploded) {
    car.exploded = true;
    car.burning = true;
  }
}

// -------------------------------------------------------------- traffic
// Spawn traffic cars on the road lines.
export function makeTraffic(rng, count) {
  const lines = roadLines();
  const cars = [];
  for (let i = 0; i < count; i += 1) {
    const def = rng.pick(VEHICLES.filter((v) => v.id !== 'police'));
    const vertical = rng.next() < 0.5;
    const line = rng.pick(lines);
    const along = rng.range(-200, 200);
    const x = vertical ? line : along;
    const z = vertical ? along : line;
    const angle = vertical ? (rng.next() < 0.5 ? 0 : Math.PI) : (rng.next() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
    const car = makeCar(def, x, z, angle, { driver: true });
    car.speed = rng.range(8, 16);
    cars.push(car);
  }
  return cars;
}

// One traffic step: follow the current road, turn at intersections,
// slow down for the car ahead.
export function stepTraffic(cars, dt, buildings, rng) {
  const lines = roadLines();
  for (const car of cars) {
    if (car.exploded) continue;
    // Pick the nearest road line and stay on it.
    let best = lines[0];
    let bestD = Infinity;
    const alongAxis = Math.abs(Math.sin(car.angle)) > Math.abs(Math.cos(car.angle));
    for (const c of lines) {
      const d = alongAxis ? Math.abs(car.x - c) : Math.abs(car.z - c);
      if (d < bestD) { bestD = d; best = c; }
    }
    // Steer gently back onto the line.
    const offset = alongAxis ? car.x - best : car.z - best;
    const desired = clamp(-offset * 0.08, -0.4, 0.4);
    car.steer += clamp(desired - car.steer, -1.5 * dt, 1.5 * dt);
    car.angle += car.steer * dt * 0.5;
    // At an intersection, sometimes turn.
    const nearCross = lines.some((c) => Math.abs((alongAxis ? car.z : car.x) - c) < 2);
    if (nearCross && rng.next() < dt * 0.25) {
      car.angle += (rng.next() < 0.5 ? 1 : -1) * (Math.PI / 2);
      car.angle = Math.round(car.angle / (Math.PI / 2)) * (Math.PI / 2);
    }
    const nx = car.x + Math.sin(car.angle) * car.speed * dt;
    const nz = car.z + Math.cos(car.angle) * car.speed * dt;
    if (buildings && hitsBuilding(nx, nz, 2.2, buildings)) {
      car.angle += Math.PI / 2;
      car.speed *= 0.5;
    } else {
      car.x = nx;
      car.z = nz;
    }
    // Keep traffic inside the city.
    if (Math.abs(car.x) > 240 || Math.abs(car.z) > 240) {
      car.angle += Math.PI;
      car.x = clamp(car.x, -230, 230);
      car.z = clamp(car.z, -230, 230);
    }
  }
}

// Render boxes for a car: body, cabin, wheels and a burning flame.
export function carBoxes(car) {
  const boxes = [];
  const c = car.color;
  boxes.push({ x: car.x, y: 0.75, z: car.z, w: 2.0, h: 0.9, d: car.def.len, color: c, yaw: car.angle });
  boxes.push({ x: car.x, y: 1.45, z: car.z - 0.2, w: 1.7, h: 0.7, d: car.def.len * 0.5, color: [0.12, 0.14, 0.18], yaw: car.angle });
  const wheelColor = [0.08, 0.08, 0.09];
  for (const [dx, dz] of [[-0.95, 1.4], [0.95, 1.4], [-0.95, -1.4], [0.95, -1.4]]) {
    boxes.push({ x: car.x + dx * Math.cos(car.angle), y: 0.35, z: car.z + dz * Math.cos(car.angle), w: 0.35, h: 0.7, d: 0.7, color: wheelColor, yaw: car.angle });
  }
  if (car.burning) {
    boxes.push({ x: car.x, y: 1.8, z: car.z, w: 1.2, h: 1.6, d: 1.2, color: [1.0, 0.45, 0.1], yaw: 0 });
    boxes.push({ x: car.x, y: 3.0, z: car.z, w: 0.7, h: 1.0, d: 0.7, color: [0.9, 0.85, 0.3], yaw: 0 });
  }
  return boxes;
}

// The nearest drivable car to a point (for carjacking with E).
export function nearestCar(cars, x, z, maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const car of cars) {
    if (car.exploded) continue;
    const d = Math.sqrt((car.x - x) * (car.x - x) + (car.z - z) * (car.z - z));
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}

export function carDisplayName(car) {
  return car.def.name;
}

export { roadCross };
export { wrapAngle };
