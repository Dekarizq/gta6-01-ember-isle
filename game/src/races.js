// Street races for Vesper City: Ember Isle.
// Six circuits — three in the city, three on the island — with five AI
// rivals who have their own cars, speeds and taunts. A race is a loop
// of checkpoints: start the race, pay the bet, chase the gates, and
// finish ahead of the rivals. First place takes the reward plus the
// bet back; second and third take half the reward plus the bet back.
// Wins feed the Queen of Ember finale (three wins) and the season
// table, and the best time per circuit only ever improves.

import { roadCross } from './city.js';
import { ISLAND, islandRoadPoints } from './island.js';
import { clamp } from './random.js';

// The six circuits. par is the target time in seconds; bet is the
// entry fee; reward is the first-place prize; respect is the respect
// for winning.
export const RACE_CIRCUITS = [
  { id: 'mile-sprint', name: 'Sunset Mile Sprint', map: 'city', laps: 2, par: 95, bet: 500, reward: 1100, respect: 120, blurb: 'Two laps down the golden boulevard.' },
  { id: 'harbor-loop', name: 'Harbor Loop', map: 'city', laps: 2, par: 110, bet: 600, reward: 1300, respect: 140, blurb: 'Crates, cranes and a hairpin at the docks.' },
  { id: 'oldtown-night', name: 'Old Town Night Run', map: 'city', laps: 3, par: 130, bet: 800, reward: 1700, respect: 180, blurb: 'Three laps through the brick lanes after dark.' },
  { id: 'volcano-ring', name: 'Volcano Ring', map: 'island', laps: 2, par: 120, bet: 700, reward: 1600, respect: 180, blurb: 'Around the crater, with the lava on your left.' },
  { id: 'black-beach', name: 'Black Beach Dash', map: 'island', laps: 2, par: 100, bet: 600, reward: 1400, respect: 150, blurb: 'Sand, surf and a finish line at the lighthouse.' },
  { id: 'crater-climb', name: 'Crater Climb', map: 'island', laps: 1, par: 150, bet: 1000, reward: 2500, respect: 250, blurb: 'One lap up the volcano road. The pro circuit.' },
];

// The five rivals: name, car colour, base speed and a taunt.
export const RACE_RIVALS = [
  { id: 'vex', name: 'Vex', color: [0.9, 0.2, 0.3], speed: 0.92, taunt: 'Vex: "I was born in the fast lane. You were born in traffic."' },
  { id: 'nova', name: 'Nova', color: [0.3, 0.6, 0.95], speed: 0.88, taunt: 'Nova: "Nice car. Shame about the driver."' },
  { id: 'ghost', name: 'Ghost', color: [0.85, 0.85, 0.9], speed: 0.96, taunt: 'Ghost: "You will not see me. That is the point."' },
  { id: 'ember', name: 'Ember', color: [0.95, 0.5, 0.1], speed: 0.9, taunt: 'Ember: "The volcano taught me to drive. It is patient. I am not."' },
  { id: 'rook', name: 'Rook', color: [0.4, 0.8, 0.4], speed: 0.85, taunt: 'Rook: "I built your car, Mara. I know where it is weak."' },
];

export function raceCircuit(id) {
  return RACE_CIRCUITS.find((c) => c.id === id) || RACE_CIRCUITS[0];
}

// Gates for a circuit: the checkpoint loop the race follows.
export function raceGates(circuit) {
  if (circuit.map === 'island') {
    const roads = islandRoadPoints();
    const ring = roads.ring;
    const gates = [];
    const step = Math.max(1, Math.floor(ring.length / 4));
    for (let i = 0; i < ring.length; i += step) {
      gates.push({ x: ring[i].x, z: ring[i].z });
    }
    if (circuit.id === 'crater-climb') {
      gates.push({ x: ISLAND.x + 40, z: ISLAND.z - 120 });
      gates.push({ x: ISLAND.x, z: ISLAND.z - 60 });
    }
    return gates;
  }
  // City circuits: loops around the downtown blocks.
  const gates = [];
  const corners = [
    roadCross(2, 2), roadCross(7, 2), roadCross(7, 7), roadCross(2, 7),
  ];
  for (const c of corners) gates.push({ x: c.x, z: c.z });
  if (circuit.id === 'oldtown-night') {
    gates.push(roadCross(4, 1), roadCross(5, 8));
  }
  return gates;
}

export function createRaces() {
  return {
    active: null, // {circuit, gates, gateIndex, lap, rivals, elapsed, lastPosition, position}
    wins: 0,
    total: 0,
    earnings: 0,
    betsLost: 0,
    best: {}, // circuit id -> best time
    season: {}, // circuit id -> wins this season
    beaten: {}, // rival id -> times beaten
  };
}

// Start a race: pay the bet, place the rivals on the grid.
export function startRace(races, circuitId, elapsed, rng) {
  const circuit = raceCircuit(circuitId);
  const gates = raceGates(circuit);
  const rivals = RACE_RIVALS.map((r, i) => ({
    ...r,
    gateIndex: 0,
    lap: 1,
    progress: 0,
    finished: false,
    finishTime: 0,
    offset: (i + 1) * 6,
  }));
  races.active = {
    circuit,
    gates,
    gateIndex: 0,
    lap: 1,
    rivals,
    elapsed: 0,
    startElapsed: elapsed || 0,
    lastPosition: 6,
    position: 6,
  };
  return races.active;
}

// How far along the race the player is: lap * gates + gateIndex.
function playerProgress(race) {
  return (race.lap - 1) * race.gates.length + race.gateIndex;
}

// One race step: advance the player through gates, move the rivals,
// work out the live position, and finish or fail the race.
// playerPos: {x, z}. Returns events: [{type: 'gate'|'overtake'|'done'|'failed', ...}].
export function updateRace(races, px, pz, dt, elapsed) {
  const race = races.active;
  if (!race) return [];
  const events = [];
  race.elapsed += dt;
  // Player gates: within 12 metres of the next gate, take it.
  const gate = race.gates[race.gateIndex];
  if (gate) {
    const d = Math.sqrt((gate.x - px) * (gate.x - px) + (gate.z - pz) * (gate.z - pz));
    if (d < 12) {
      race.gateIndex += 1;
      events.push({ type: 'gate', index: race.gateIndex, lap: race.lap });
      if (race.gateIndex >= race.gates.length) {
        race.gateIndex = 0;
        race.lap += 1;
        if (race.lap > race.circuit.laps) {
          return finishRace(races, race, events);
        }
      }
    }
  }
  // Rivals: they move gate to gate at their own pace, with a wobble.
  for (const r of race.rivals) {
    if (r.finished) continue;
    const g = race.gates[r.gateIndex];
    if (!g) continue;
    r.progress += r.speed * dt * 0.55;
    if (r.progress >= 1) {
      r.progress = 0;
      r.gateIndex += 1;
      if (r.gateIndex >= race.gates.length) {
        r.gateIndex = 0;
        r.lap += 1;
        if (r.lap > race.circuit.laps) {
          r.finished = true;
          r.finishTime = race.elapsed;
        }
      }
    }
  }
  // Live position: rivals ahead of the player count against her.
  const ahead = race.rivals.filter((r) => {
    if (r.finished) return r.finishTime < race.elapsed;
    const rp = (r.lap - 1) * race.gates.length + r.gateIndex + r.progress;
    return rp > playerProgress(race);
  }).length;
  race.position = ahead + 1;
  if (race.position !== race.lastPosition) {
    events.push({ type: 'overtake', position: race.position, from: race.lastPosition });
    race.lastPosition = race.position;
  }
  // The clock: twice par and the league calls it. The bet is gone.
  if (race.elapsed > race.circuit.par * 2) {
    const bet = race.circuit.bet;
    races.betsLost += bet;
    races.total += 1;
    races.active = null;
    events.push({ type: 'failed', reason: 'time', bet });
    return events;
  }
  return events;
}

// Finish a race: who won, what it pays, and what the season says.
// First place takes the reward plus the bet back; second and third
// take half the reward plus the bet back; worse takes nothing and the
// bet is gone. The best time per circuit only improves, never worsens.
function finishRace(races, race, events) {
  const circuit = race.circuit;
  const ahead = race.rivals.filter((r) => r.finished && r.finishTime < race.elapsed).length;
  const position = ahead + 1;
  const time = race.elapsed;
  const prevBest = races.best[circuit.id];
  if (!prevBest || time < prevBest) races.best[circuit.id] = Math.round(time * 100) / 100;
  races.total += 1;
  let pay = 0;
  let respect = 0;
  let won = false;
  if (position === 1) {
    pay = circuit.reward + circuit.bet;
    respect = circuit.respect;
    won = true;
    races.wins += 1;
    races.season[circuit.id] = (races.season[circuit.id] || 0) + 1;
  } else if (position <= 3) {
    pay = Math.round(circuit.reward / 2) + circuit.bet;
    respect = Math.round(circuit.respect / 2);
  }
  races.earnings += pay;
  if (!won) races.betsLost += circuit.bet;
  for (const r of race.rivals) {
    if (!r.finished || r.finishTime > time) races.beaten[r.id] = (races.beaten[r.id] || 0) + 1;
  }
  races.active = null;
  events.push({
    type: 'done', position, time: Math.round(time * 100) / 100, pay, respect, won,
    circuit: circuit.name,
  });
  return events;
}

export function raceLabel(races) {
  const race = races.active;
  if (!race) return 'No race active — find a race start (press T near a checkered flag).';
  return `${race.circuit.name} — Lap ${Math.min(race.lap, race.circuit.laps)}/${race.circuit.laps} · P${race.position}/6 · ${Math.round(race.elapsed)}s / par ${race.circuit.par}s`;
}

// Render boxes for a race: the gates as checkered arches and the
// rivals as coloured cars on the road.
export function raceBoxes(races) {
  const boxes = [];
  const race = races.active;
  if (!race) return boxes;
  const gate = race.gates[race.gateIndex];
  if (gate) {
    boxes.push({ x: gate.x, y: 3, z: gate.z, w: 12, h: 0.8, d: 0.8, color: [1.0, 0.9, 0.2], yaw: 0 });
    boxes.push({ x: gate.x - 6, y: 1.5, z: gate.z, w: 0.6, h: 3, d: 0.6, color: [0.95, 0.95, 0.95], yaw: 0 });
    boxes.push({ x: gate.x + 6, y: 1.5, z: gate.z, w: 0.6, h: 3, d: 0.6, color: [0.1, 0.1, 0.1], yaw: 0 });
  }
  for (const r of race.rivals) {
    const g = race.gates[Math.min(r.gateIndex, race.gates.length - 1)] || { x: 0, z: 0 };
    boxes.push({ x: g.x + r.offset, y: 0.75, z: g.z, w: 2.0, h: 0.9, d: 4.4, color: r.color, yaw: 0 });
  }
  return boxes;
}

export function raceSummary(races) {
  return {
    active: races.active ? races.active.circuit.name : null,
    wins: races.wins,
    total: races.total,
    earnings: races.earnings,
    betsLost: races.betsLost,
    best: races.best,
    season: races.season,
  };
}

export function raceSave(races) {
  return { wins: races.wins, total: races.total, earnings: races.earnings, betsLost: races.betsLost, best: races.best, season: races.season, beaten: races.beaten };
}

export function raceLoad(data) {
  const r = createRaces();
  if (!data) return r;
  if (Number.isInteger(data.wins)) r.wins = data.wins;
  if (Number.isInteger(data.total)) r.total = data.total;
  if (Number.isFinite(data.earnings)) r.earnings = data.earnings;
  if (Number.isFinite(data.betsLost)) r.betsLost = data.betsLost;
  if (data.best && typeof data.best === 'object') r.best = data.best;
  if (data.season && typeof data.season === 'object') r.season = data.season;
  if (data.beaten && typeof data.beaten === 'object') r.beaten = data.beaten;
  return r;
}

export { clamp };
