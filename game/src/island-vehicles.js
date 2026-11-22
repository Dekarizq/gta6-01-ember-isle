// Island vehicles — cars and boats for Ember Isle.
// Four island cars and two boats, with their own colours and stats.
// Island cars are lighter and grippier (the volcano road is steep and
// the black sand is soft); the boats are for the fishing charter and
// the smuggling run. Same shape as the city vehicles, so the world
// loop drives them with the same physics.

import { ISLAND_VEHICLES } from './config.js';
import { makeCar } from './vehicles.js';

export function islandVehicleDef(id) {
  return ISLAND_VEHICLES.find((v) => v.id === id) || ISLAND_VEHICLES[0];
}

// Spawn the island's parked cars: a buggy by the dock, a roadster at
// the resort, a van in the village, a cabrio at the market.
export function makeIslandCars(rng) {
  const spots = [
    { id: 'ember-buggy', dx: -230, dz: 45 },
    { id: 'lava-roadster', dx: 190, dz: 80 },
    { id: 'fish-van', dx: -170, dz: -20 },
    { id: 'resort-cabrio', dx: 40, dz: 200 },
  ];
  const cars = [];
  for (const s of spots) {
    const def = islandVehicleDef(s.id);
    const car = makeCar(def, 1250 + s.dx, s.dz, rng.range(0, Math.PI * 2), { parked: true });
    cars.push(car);
  }
  return cars;
}

// Island boats: a fishing boat at the dock and a speedboat at the cove.
export function makeIslandBoats(rng) {
  return [
    { id: 'fishing-boat', name: 'Fishing Boat', x: 1010, z: 120, angle: rng.range(0, Math.PI * 2), color: [0.8, 0.6, 0.3], len: 9, speed: 0 },
    { id: 'speedboat', name: 'Island Speedboat', x: 1060, z: -140, angle: rng.range(0, Math.PI * 2), color: [0.9, 0.25, 0.3], len: 7, speed: 0 },
  ];
}

// Render boxes for an island car: body, cabin, wheels — same shape as
// a city car, with the island paint.
export function islandCarBoxes(car) {
  const boxes = [];
  const c = car.color;
  boxes.push({ x: car.x, y: 0.75, z: car.z, w: 2.0, h: 0.9, d: car.def.len, color: c, yaw: car.angle });
  boxes.push({ x: car.x, y: 1.45, z: car.z - 0.2, w: 1.7, h: 0.7, d: car.def.len * 0.5, color: [0.12, 0.14, 0.18], yaw: car.angle });
  for (const [dx, dz] of [[-0.95, 1.4], [0.95, 1.4], [-0.95, -1.4], [0.95, -1.4]]) {
    boxes.push({ x: car.x + dx, y: 0.35, z: car.z + dz, w: 0.35, h: 0.7, d: 0.7, color: [0.08, 0.08, 0.09], yaw: car.angle });
  }
  return boxes;
}

// Render boxes for an island boat: hull and cabin, bobbing on the water.
export function islandBoatBoxes(boat, time) {
  const bob = Math.sin((time || 0) * 0.8 + boat.x) * 0.3;
  return [
    { x: boat.x, y: 0.6 + bob, z: boat.z, w: 3.4, h: 1.4, d: boat.len, color: boat.color, yaw: boat.angle },
    { x: boat.x, y: 1.8 + bob, z: boat.z, w: 2.0, h: 1.2, d: boat.len * 0.5, color: [0.95, 0.93, 0.85], yaw: boat.angle },
  ];
}

// The nearest island car to a point (for carjacking on the island).
export function nearestIslandCar(cars, x, z, maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const car of cars) {
    if (car.exploded) continue;
    const d = Math.sqrt((car.x - x) * (car.x - x) + (car.z - z) * (car.z - z));
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}
