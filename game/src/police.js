// The VCPD — Vesper City Police Department.
// Named units with their own tactics, a police helicopter at three
// stars, roadblocks at four and spike strips at five. Wanted runs 0-6:
// stealing a car is one star, hurting someone is two, and the city
// never forgets quickly. The patrol is a self-contained system: it owns
// its cops, its helicopter, its roadblock and its heat, it steps itself
// every frame, and it renders its own boxes.

import { makeCar, carBoxes } from './vehicles.js';
import { clamp } from './random.js';

// The six VCPD units, in the order they join a chase.
export const VCPD_UNITS = [
  { callsign: 'VCPD-11', officer: 'Sgt. Vega', tactic: 'RAM', beat: { x: -60, z: -60 }, home: 'Sunset Mile', line: 'Vega: "You can run, but the city is a circle."', speed: 34, aggression: 0.9 },
  { callsign: 'VCPD-22', officer: 'Ofc. Maro', tactic: 'PIT', beat: { x: 60, z: 60 }, home: 'Glass Quarter', line: 'Maro: "One spin, one stop. That is the whole job."', speed: 32, aggression: 0.75 },
  { callsign: 'VCPD-33', officer: 'Ofc. Inez', tactic: 'BLOCKADE', beat: { x: -60, z: 120 }, home: 'Harbor Docks', line: 'Inez: "The road ahead is closed. The road behind is you."', speed: 30, aggression: 0.6 },
  { callsign: 'VCPD-44', officer: 'Sgt. Boro', tactic: 'PURSUIT', beat: { x: 120, z: -60 }, home: 'Sunset Shore', line: 'Boro: "I do not hurry. Hurrying is for people who lose."', speed: 36, aggression: 0.85 },
  { callsign: 'VCPD-55', officer: 'Ofc. Nala', tactic: 'RAM', beat: { x: 0, z: -120 }, home: 'Old Town', line: 'Nala: "The north lanes are mine. All of them."', speed: 35, aggression: 0.95 },
  { callsign: 'VCPD-66', officer: 'Sgt. Oka', tactic: 'PIT', beat: { x: 150, z: 120 }, home: 'Marina District', line: 'Oka: "The marina is closed to criminals. And to you."', speed: 33, aggression: 0.8 },
];

export const VCPD_CAR = {
  id: 'police', name: 'VCPD Cruiser', color: [0.12, 0.14, 0.2], top: 44, accel: 24, brake: 36, grip: 3.4, len: 4.7,
};

export function createPolice() {
  return {
    cops: [],
    wanted: 0,
    heat: 0,
    heli: null, // {x, y, z} when the helicopter is up
    roadblock: null,
    spikes: [], // spike strip positions
    chatterTimer: 0,
    lastChatter: null,
    busted: 0,
    escapes: 0,
    rams: 0,
    timer: 0, // wanted decay timer
  };
}

// How many cruisers the heat calls out: one per wanted star.
export function policeStrength(wanted) {
  return clamp(wanted, 0, 6);
}

export function addWanted(police, amount) {
  police.wanted = clamp(police.wanted + amount, 0, 6);
  police.heat = police.wanted;
  police.timer = 0;
  return police.wanted;
}

export function clearWanted(police) {
  police.wanted = 0;
  police.heat = 0;
  police.cops = [];
  police.heli = null;
  police.roadblock = null;
  police.spikes = [];
  return 0;
}

function spawnCop(police, unit, px, pz) {
  const car = makeCar(VCPD_CAR, unit.beat.x, unit.beat.z, 0, { driver: true });
  car.unit = unit;
  car.patrol = true;
  car.targetX = px;
  car.targetZ = pz;
  police.cops.push(car);
  return car;
}

// Lay a roadblock ahead of the player, on the nearest road line.
export function layRoadblock(police, px, pz) {
  if (police.roadblock) return police.roadblock;
  police.roadblock = { x: px + 30, z: pz + 10, angle: 0, unit: VCPD_UNITS[2] };
  return police.roadblock;
}

export function laySpikes(police, px, pz) {
  if (police.spikes.length >= 2) return police.spikes;
  police.spikes.push({ x: px + 18, z: pz, angle: 0 });
  return police.spikes;
}

// Step the whole department: match cop count to the heat, steer every
// cop toward the player, bring the helicopter at three stars, lay the
// roadblock at four and spikes at five, let the radio chatter, and let
// the heat decay when the player stays out of sight.
export function stepPolice(police, dt, player, rng, time) {
  const wanted = police.wanted;
  const want = policeStrength(wanted);
  while (police.cops.length < want) {
    const unit = VCPD_UNITS[police.cops.length];
    if (!unit) break;
    spawnCop(police, unit, player.x, player.z);
  }
  while (police.cops.length > want) {
    police.cops.pop();
    police.escapes += 1;
  }
  // Helicopter at three stars or more.
  if (wanted >= 3 && !police.heli) police.heli = { x: player.x, y: 90, z: player.z - 40 };
  if (wanted < 3) police.heli = null;
  if (police.heli) {
    police.heli.x += (player.x - police.heli.x) * dt * 0.4;
    police.heli.z += (player.z - police.heli.z) * dt * 0.4;
    police.heli.y = 90 + Math.sin(time * 0.7) * 4;
  }
  if (wanted >= 4 && !police.roadblock) layRoadblock(police, player.x, player.z);
  if (wanted <= 2 && police.roadblock) police.roadblock = null;
  if (wanted >= 5 && police.spikes.length === 0) laySpikes(police, player.x, player.z);
  if (wanted <= 3) police.spikes = [];
  // Every cop steers toward the player and closes in.
  for (const cop of police.cops) {
    const unit = cop.unit || VCPD_UNITS[0];
    const speed = unit.speed * (0.8 + unit.aggression * 0.3);
    let tx = player.x;
    let tz = player.z;
    if (unit.tactic === 'PIT') {
      tx = player.x + Math.sin(player.angle || 0) * 8;
      tz = player.z + Math.cos(player.angle || 0) * 8;
    }
    if (unit.tactic === 'BLOCKADE') {
      tx = player.x + Math.sin(player.angle || 0) * 24;
      tz = player.z + Math.cos(player.angle || 0) * 24;
    }
    const dx = tx - cop.x;
    const dz = tz - cop.z;
    const dist = Math.sqrt(dx * dx + dz * dz) || 1;
    const targetAngle = Math.atan2(dx, dz);
    let da = targetAngle - cop.angle;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    cop.angle += clamp(da, -2.4 * dt, 2.4 * dt);
    cop.speed = Math.min(speed, (cop.speed || 0) + 14 * dt);
    cop.x += Math.sin(cop.angle) * cop.speed * dt;
    cop.z += Math.cos(cop.angle) * cop.speed * dt;
    if (dist < 4 && !player.inCar) cop.speed = 0;
    if (dist < 5 && player.inCar && unit.tactic === 'RAM' && !cop.ramCooldown) {
      police.rams += 1;
      cop.ramCooldown = 2;
    }
    if (cop.ramCooldown) cop.ramCooldown -= dt;
  }
  // Radio chatter every six seconds during a chase.
  police.chatterTimer += dt;
  if (police.chatterTimer > 6 && police.cops.length > 0) {
    police.chatterTimer = 0;
    const unit = police.cops[Math.floor((rng ? rng.next() : Math.random()) * police.cops.length)].unit;
    police.lastChatter = unit ? unit.line : null;
  }
  // Heat decays after 25 quiet seconds with no crime.
  if (wanted > 0) {
    police.timer += dt;
    if (police.timer > 25) {
      police.wanted = Math.max(0, wanted - 1);
      police.heat = police.wanted;
      police.timer = 0;
    }
  }
  return police;
}

export function policeLabel(police) {
  if (!police || police.cops.length === 0) {
    return 'VCPD RESPONSE · 0 UNITS — the coast is clear.';
  }
  const tactics = police.cops.map((c) => (c.unit ? c.unit.tactic : 'PATROL')).join(' + ');
  const heli = police.heli ? ' · AIR ONE UP' : '';
  const rb = police.roadblock ? ' · ROADBLOCK UP' : '';
  return `VCPD RESPONSE · ${police.cops.length} UNITS · ${tactics}${heli}${rb}`;
}

export function wantedStars(wanted) {
  const n = clamp(wanted || 0, 0, 6);
  return '★'.repeat(n) + '☆'.repeat(6 - n);
}

// Render boxes for the department: cruisers with flashing light bars,
// the helicopter, the roadblock barriers and the spike strips.
export function policeBoxes(police, time) {
  const boxes = [];
  const flash = Math.sin((time || 0) * 10) > 0;
  for (const cop of police.cops) {
    boxes.push(...carBoxes(cop));
    boxes.push({ x: cop.x, y: 1.6, z: cop.z, w: 1.2, h: 0.35, d: 0.8, color: flash ? [0.2, 0.4, 1] : [0.9, 0.2, 0.2], yaw: cop.angle });
  }
  if (police.heli) {
    const h = police.heli;
    boxes.push({ x: h.x, y: h.y, z: h.z, w: 6, h: 2, d: 3, color: [0.15, 0.16, 0.2], yaw: 0 });
    boxes.push({ x: h.x, y: h.y + 1.5, z: h.z, w: 9, h: 0.25, d: 0.6, color: [0.3, 0.3, 0.32], yaw: (time || 0) * 6 });
    boxes.push({ x: h.x, y: h.y - 1, z: h.z, w: 1, h: 0.5, d: 1, color: flash ? [1, 0.2, 0.2] : [1, 0.9, 0.3], yaw: 0 });
  }
  if (police.roadblock) {
    const rb = police.roadblock;
    boxes.push({ x: rb.x, y: 0.55, z: rb.z, w: 2.0, h: 0.75, d: 4.4, color: [0.95, 0.85, 0.3], yaw: rb.angle });
    boxes.push({ x: rb.x + 6, y: 0.55, z: rb.z + 2, w: 2.0, h: 0.75, d: 4.4, color: [0.95, 0.85, 0.3], yaw: rb.angle });
    boxes.push({ x: rb.x - 6, y: 1.4, z: rb.z - 2, w: 3.0, h: 1.6, d: 0.3, color: [0.9, 0.2, 0.2], yaw: rb.angle });
  }
  for (const s of police.spikes) {
    boxes.push({ x: s.x, y: 0.2, z: s.z, w: 4, h: 0.4, d: 1.2, color: [0.5, 0.5, 0.55], yaw: s.angle });
  }
  return boxes;
}

export function policeSummary(police) {
  return {
    units: police.cops.length,
    wanted: police.wanted,
    heli: !!police.heli,
    roadblock: !!police.roadblock,
    rams: police.rams,
    escapes: police.escapes,
    chatter: police.lastChatter,
  };
}

export function policeSave(police) {
  return { wanted: police.wanted, heat: police.heat, busted: police.busted, escapes: police.escapes, rams: police.rams };
}

export function policeLoad(data) {
  const p = createPolice();
  if (!data || typeof data !== 'object') return p;
  p.wanted = data.wanted || 0;
  p.heat = data.heat || 0;
  p.busted = data.busted || 0;
  p.escapes = data.escapes || 0;
  p.rams = data.rams || 0;
  return p;
}
