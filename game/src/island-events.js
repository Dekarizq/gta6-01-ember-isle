// Island events — the random life of Ember Isle.
// Eight random events that fire on the island: a lava festival at the
// night market, a fisherman who lost his nets, a tourist who wants a
// photo at the crater, a smuggler's boat in the cove, a goat on the
// north road, a storm warning from the lighthouse, a resort wedding,
// and a volcano tremor that shakes the whole island. Each event is a
// small story with a reward; the world loop rolls one every few
// minutes, and the HUD announces it.

import { ISLAND } from './island.js';

export const ISLAND_EVENTS = [
  { id: 'lava-festival', name: 'Lava Festival', district: 'Night Market', reward: 300, respect: 40, blurb: 'The market is dancing and the volcano is just watching. Join the dance.' },
  { id: 'lost-nets', name: 'Lost Nets', district: 'Fisher Village', reward: 180, respect: 25, blurb: 'A fisherman lost his nets in the storm. Dive in and fetch them.' },
  { id: 'crater-photo', name: 'Crater Photo', district: 'Volcano Rim', reward: 220, respect: 30, blurb: 'A tourist will pay for a photo at the crater rim. Drive them there.' },
  { id: 'smuggler-boat', name: 'Smuggler Boat', district: 'Black Sand Beach', reward: 450, respect: 45, blurb: 'A boat with no lights in the cove. Nobody asks questions. Everybody pays.' },
  { id: 'goat-road', name: 'Goat on the Road', district: 'Ember Town', reward: 100, respect: 15, blurb: 'One goat on the north road. The goat has right of way. Move it gently.' },
  { id: 'storm-warning', name: 'Storm Warning', district: 'Lighthouse Point', reward: 200, respect: 30, blurb: 'The lighthouse keeper needs the warning carried to the village before the rain.' },
  { id: 'resort-wedding', name: 'Resort Wedding', district: 'Ember Resort', reward: 350, respect: 35, blurb: 'A wedding at the resort needs a driver with a clean car. Yours is close enough.' },
  { id: 'volcano-tremor', name: 'Volcano Tremor', district: 'Volcano Rim', reward: 500, respect: 60, blurb: 'The volcano shook and the crater road is blocked. Clear it before the lava report.' },
];

export function eventById(id) {
  return ISLAND_EVENTS.find((e) => e.id === id) || ISLAND_EVENTS[0];
}

export function createIslandEvents() {
  return {
    active: null, // {def, target, timeLeft}
    completed: 0,
    earned: 0,
    timer: 90, // seconds until the next event roll
  };
}

// Roll a random event. Returns the event or null when the roll says no.
export function rollIslandEvent(events, rng) {
  if (events.active) return null;
  const def = rng.pick(ISLAND_EVENTS);
  const spots = {
    'lava-festival': { x: ISLAND.x + 40, z: ISLAND.z + 195 },
    'lost-nets': { x: ISLAND.x - 200, z: ISLAND.z + 120 },
    'crater-photo': { x: ISLAND.x + 40, z: ISLAND.z - 120 },
    'smuggler-boat': { x: ISLAND.x - 220, z: ISLAND.z + 180 },
    'goat-road': { x: ISLAND.x + 120, z: ISLAND.z - 40 },
    'storm-warning': { x: ISLAND.x + 235, z: ISLAND.z - 120 },
    'resort-wedding': { x: ISLAND.x + 190, z: ISLAND.z + 60 },
    'volcano-tremor': { x: ISLAND.x + 60, z: ISLAND.z - 100 },
  };
  events.active = {
    def,
    target: spots[def.id] || { x: ISLAND.x, z: ISLAND.z },
    timeLeft: 120,
  };
  return events.active;
}

// Step the event timer. Returns 'done' when the player reaches the
// target, 'expired' when the timer runs out, or null.
export function stepIslandEvent(events, dt, px, pz) {
  events.timer -= dt;
  const ev = events.active;
  if (!ev) {
    if (events.timer <= 0) {
      events.timer = 90;
      return { event: 'roll' };
    }
    return null;
  }
  ev.timeLeft -= dt;
  if (ev.timeLeft <= 0) {
    events.active = null;
    return { event: 'expired', def: ev.def };
  }
  const d = Math.sqrt((ev.target.x - px) * (ev.target.x - px) + (ev.target.z - pz) * (ev.target.z - pz));
  if (d < 10) {
    events.active = null;
    events.completed += 1;
    events.earned += ev.def.reward;
    return { event: 'done', def: ev.def, pay: ev.def.reward, respect: ev.def.respect };
  }
  return null;
}

export function islandEventLabel(events) {
  if (!events.active) return 'The island is quiet — for now.';
  const ev = events.active;
  return `${ev.def.name} — ${Math.ceil(ev.timeLeft)}s left · $${ev.def.reward}`;
}

export function islandEventSummary(events) {
  return {
    active: events.active ? events.active.def.name : null,
    completed: events.completed,
    earned: events.earned,
    nextIn: Math.ceil(events.timer),
  };
}

export function islandEventSave(events) {
  return { completed: events.completed, earned: events.earned };
}

export function islandEventLoad(data) {
  const e = createIslandEvents();
  if (!data) return e;
  if (Number.isInteger(data.completed)) e.completed = data.completed;
  if (Number.isFinite(data.earned)) e.earned = data.earned;
  return e;
}
