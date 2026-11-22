// The ferry — the Sunset Sea crossing between Vesper City and Ember Isle.
// A big boat that runs from the Sunset Pier terminal to the Ember Dock
// every 90 in-game seconds. Boarding takes 4 seconds standing still on
// the dock, the crossing takes 12 seconds across the water, and the
// fare is $50 — free if Mara owns any business. The ferry is a state
// machine: dockedCity -> boarding -> crossing -> dockedIsland, and back
// again. During the crossing the player rides the boat; the world loop
// moves her with it, and the HUD shows the crossing percentage.

import { ECONOMY } from './config.js';
import { FERRY_TERMINAL, ISLAND_DOCK } from './coast.js';
import { clamp } from './random.js';

export const FERRY_STATES = ['dockedCity', 'boarding', 'crossing', 'dockedIsland'];

export function createFerry() {
  return {
    state: 'dockedCity',
    // Where the boat is right now: lerps between the two docks.
    x: FERRY_TERMINAL.x,
    z: FERRY_TERMINAL.z,
    progress: 0, // 0 = city dock, 1 = island dock
    timer: 0, // time in the current state
    direction: 1, // 1 = city->island, -1 = island->city
    trips: 0,
    faresPaid: 0,
    boarded: false, // is the player on board?
  };
}

// Can the player board right now? Only when the ferry is docked on
// the player's side and the player stands on the dock.
export function canBoard(ferry, px, pz) {
  if (ferry.state === 'dockedCity') {
    const d = Math.sqrt((px - FERRY_TERMINAL.x) * (px - FERRY_TERMINAL.x) + (pz - FERRY_TERMINAL.z) * (pz - FERRY_TERMINAL.z));
    return d < 14;
  }
  if (ferry.state === 'dockedIsland') {
    const d = Math.sqrt((px - ISLAND_DOCK.x) * (px - ISLAND_DOCK.x) + (pz - ISLAND_DOCK.z) * (pz - ISLAND_DOCK.z));
    return d < 14;
  }
  return false;
}

// Start boarding: the player steps on, the fare is taken (unless she
// owns a business), and the boat leaves after 4 seconds.
export function startBoarding(ferry, ownsBusiness) {
  if (ferry.state !== 'dockedCity' && ferry.state !== 'dockedIsland') return { ok: false, msg: 'The ferry is not here.' };
  ferry.state = 'boarding';
  ferry.timer = 0;
  ferry.boarded = true;
  // Direction follows where the boat is: city dock -> island, island dock -> city.
  ferry.direction = ferry.progress < 0.5 ? 1 : -1;
  const fare = ownsBusiness ? 0 : ECONOMY.ferryFare;
  if (!ownsBusiness) ferry.faresPaid += fare;
  return { ok: true, fare, msg: fare === 0 ? 'Business owner — the ferry is free for you.' : `Ferry fare $${fare} — boarding now.` };
}

// One ferry step. Returns events: [{type: 'departed'|'arrived', ...}].
export function stepFerry(ferry, dt) {
  const events = [];
  ferry.timer += dt;
  if (ferry.state === 'boarding' && ferry.timer >= 4) {
    ferry.state = 'crossing';
    ferry.timer = 0;
    events.push({ type: 'departed', direction: ferry.direction });
  } else if (ferry.state === 'crossing') {
    const speed = 1 / ECONOMY.ferryCrossSec;
    ferry.progress = clamp(ferry.progress + ferry.direction * speed * dt, 0, 1);
    ferry.x = FERRY_TERMINAL.x + (ISLAND_DOCK.x - FERRY_TERMINAL.x) * ferry.progress;
    ferry.z = FERRY_TERMINAL.z + (ISLAND_DOCK.z - FERRY_TERMINAL.z) * ferry.progress;
    if ((ferry.direction === 1 && ferry.progress >= 1) || (ferry.direction === -1 && ferry.progress <= 0)) {
      ferry.state = ferry.direction === 1 ? 'dockedIsland' : 'dockedCity';
      ferry.timer = 0;
      ferry.trips += 1;
      events.push({ type: 'arrived', at: ferry.state === 'dockedIsland' ? 'Ember Isle' : 'Vesper City' });
    }
  } else if ((ferry.state === 'dockedCity' || ferry.state === 'dockedIsland') && ferry.timer >= ECONOMY.ferryIntervalSec) {
    // The ferry waits at the dock, then sails back empty if nobody boards.
    ferry.timer = 0;
    ferry.state = 'crossing';
    ferry.direction = ferry.progress < 0.5 ? 1 : -1;
    events.push({ type: 'departed', direction: ferry.direction, empty: true });
  }
  return events;
}

// Where the player should stand while riding: on the boat's deck.
export function ferryDeckPosition(ferry) {
  return { x: ferry.x, z: ferry.z };
}

export function ferryLabel(ferry) {
  if (ferry.state === 'dockedCity') return 'Ferry to Ember Isle · $50 · stand on the dock';
  if (ferry.state === 'dockedIsland') return 'Ferry to Vesper City · $50 · stand on the dock';
  if (ferry.state === 'boarding') return `Ferry boarding — ${Math.max(0, 4 - Math.floor(ferry.timer))}s to departure`;
  const pct = Math.round(ferry.progress * 100);
  const dest = ferry.direction === 1 ? 'Ember Isle' : 'Vesper City';
  return `Ferry crossing — ${pct}% · to ${dest}`;
}

// Render boxes for the ferry: a big white hull with a teal stripe and
// a cabin, bobbing gently on the water.
export function ferryBoxes(ferry, time) {
  const bob = Math.sin((time || 0) * 0.8) * 0.3;
  const boxes = [
    { x: ferry.x, y: 1.2 + bob, z: ferry.z, w: 14, h: 2.4, d: 26, color: [0.92, 0.9, 0.85], yaw: 0 },
    { x: ferry.x, y: 2.6 + bob, z: ferry.z, w: 10, h: 1.6, d: 18, color: [0.25, 0.6, 0.65], yaw: 0 },
    { x: ferry.x, y: 4.2 + bob, z: ferry.z, w: 8, h: 1.6, d: 12, color: [0.95, 0.93, 0.85], yaw: 0 },
    { x: ferry.x, y: 0.4 + bob, z: ferry.z, w: 14.6, h: 0.8, d: 26.6, color: [0.2, 0.35, 0.5], yaw: 0 },
  ];
  return boxes;
}

export function ferrySummary(ferry) {
  return {
    state: ferry.state,
    progress: Math.round(ferry.progress * 100) / 100,
    trips: ferry.trips,
    faresPaid: ferry.faresPaid,
    boarded: ferry.boarded,
  };
}

export function ferrySave(ferry) {
  return { state: ferry.state, progress: ferry.progress, trips: ferry.trips, faresPaid: ferry.faresPaid };
}

export function ferryLoad(data) {
  const f = createFerry();
  if (!data) return f;
  if (FERRY_STATES.includes(data.state)) f.state = data.state;
  if (typeof data.progress === 'number') f.progress = clamp(data.progress, 0, 1);
  if (Number.isInteger(data.trips)) f.trips = data.trips;
  if (Number.isFinite(data.faresPaid)) f.faresPaid = data.faresPaid;
  f.x = FERRY_TERMINAL.x + (ISLAND_DOCK.x - FERRY_TERMINAL.x) * f.progress;
  f.z = FERRY_TERMINAL.z + (ISLAND_DOCK.z - FERRY_TERMINAL.z) * f.progress;
  return f;
}
