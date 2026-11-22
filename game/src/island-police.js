// The Ember Island Patrol — the island's own law.
// Vesper City has the VCPD; Ember Isle has its own patrol, smaller,
// louder and closer to the volcano. Four named units with their own
// tactics, their own radio chatter, and a roadblock on the volcano
// bridge — plus a wanted system separate from the city's: the island
// counts its own heat, and the heat follows Mara back across the ferry
// if she leaves with stars on her name. The patrol only exists on the
// island; the VCPD never crosses the water, and the patrol never
// leaves the island.

import { ISLAND } from './island.js';
import { makeCar, carBoxes } from './vehicles.js';
import { clamp } from './random.js';

// The four patrol units, in the order they join a chase.
export const ISLAND_PATROL_UNITS = [
  { callsign: 'EIP-7', officer: 'Sgt. Kana', tactic: 'RAM', beat: { x: 680, z: 30 }, home: 'Ember Town crossroads', line: 'Kana: "You can run, but the island is small."', speed: 30, aggression: 0.9 },
  { callsign: 'EIP-12', officer: 'Ofc. Rolo', tactic: 'PIT', beat: { x: 560, z: 30 }, home: 'Fisher Village square', line: 'Rolo: "One spin, one stop. That is the whole job."', speed: 28, aggression: 0.75 },
  { callsign: 'EIP-23', officer: 'Ofc. Mina', tactic: 'BLOCKADE', beat: { x: 740, z: -30 }, home: 'St. Ember Church', line: 'Mina: "The road ahead is closed. The road behind is lava."', speed: 26, aggression: 0.6 },
  { callsign: 'EIP-31', officer: 'Sgt. Boro', tactic: 'PURSUIT', beat: { x: 800, z: 120 }, home: 'Ember Resort', line: 'Boro: "I do not hurry. Hurrying is for people who lose."', speed: 32, aggression: 0.85 },
];

export const ISLAND_PATROL_CAR = {
  id: 'patrol', name: 'Ember Patrol Cruiser', color: [0.92, 0.92, 0.9], top: 30, accel: 20, brake: 32, grip: 3.0, len: 4.6,
};

export const ISLAND_ROADBLOCK_POINT = { x: 700, z: -60, angle: Math.PI / 2 };

export function createIslandPolice() {
  return {
    cops: [],
    roadblock: null,
    heat: 0,
    wanted: 0,
    chatterTimer: 0,
    lastChatter: null,
    busted: 0,
    escapes: 0,
    rams: 0,
  };
}

export function islandPatrolStrength(wanted) {
  if (wanted <= 0) return 0;
  if (wanted === 1) return 1;
  if (wanted === 2) return 2;
  if (wanted === 3) return 3;
  return 4;
}

export function addIslandWanted(police, amount) {
  police.wanted = clamp(police.wanted + amount, 0, 4);
  police.heat = police.wanted;
  return police.wanted;
}

export function clearIslandWanted(police) {
  police.wanted = 0;
  police.heat = 0;
  police.cops = [];
  police.roadblock = null;
  return 0;
}

function spawnIslandCop(police, unit, px, pz) {
  const car = makeCar(ISLAND_PATROL_CAR, unit.beat.x, unit.beat.z, 0, { driver: true });
  car.unit = unit;
  car.patrol = true;
  car.targetX = px;
  car.targetZ = pz;
  police.cops.push(car);
  return car;
}

export function layIslandRoadblock(police) {
  if (police.roadblock) return police.roadblock;
  police.roadblock = {
    x: ISLAND_ROADBLOCK_POINT.x, z: ISLAND_ROADBLOCK_POINT.z,
    angle: ISLAND_ROADBLOCK_POINT.angle, unit: ISLAND_PATROL_UNITS[2],
  };
  return police.roadblock;
}

export function clearIslandRoadblock(police) {
  police.roadblock = null;
}

// Step the patrol: match the cop count to the heat, steer every cop
// toward the player, lay the roadblock when the heat is high, and let
// the radio chatter. Cops drive on the island roads — they steer toward
// the player in a straight line and the island collision keeps them out
// of the buildings, the same as the player.
export function stepIslandPolice(police, dt, player, rng, wanted, time) {
  const want = islandPatrolStrength(wanted);
  while (police.cops.length < want) {
    const unit = ISLAND_PATROL_UNITS[police.cops.length];
    if (!unit) break;
    spawnIslandCop(police, unit, player.x, player.z);
  }
  while (police.cops.length > want) {
    police.cops.pop();
    police.escapes += 1;
  }
  if (wanted >= 3 && !police.roadblock) layIslandRoadblock(police);
  if (wanted <= 1 && police.roadblock) clearIslandRoadblock(police);
  for (const cop of police.cops) {
    const unit = cop.unit || ISLAND_PATROL_UNITS[0];
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
  police.chatterTimer += dt;
  if (police.chatterTimer > 6 && police.cops.length > 0) {
    police.chatterTimer = 0;
    const unit = police.cops[Math.floor((rng ? rng.next() : Math.random()) * police.cops.length)].unit;
    police.lastChatter = unit ? unit.line : null;
  }
  void time;
  return police;
}

export function islandPoliceLabel(police, wanted) {
  if (!police || police.cops.length === 0) {
    return 'EMBER PATROL · 0 UNITS — the island is quiet.';
  }
  const tactics = police.cops.map((c) => (c.unit ? c.unit.tactic : 'PATROL')).join(' + ');
  const rb = police.roadblock ? ' · ROADBLOCK UP' : '';
  void wanted;
  return `EMBER PATROL · ${police.cops.length} UNITS · ${tactics}${rb}`;
}

export function islandWantedStars(wanted) {
  const n = clamp(wanted || 0, 0, 4);
  return '★'.repeat(n) + '☆'.repeat(4 - n);
}

// The patrol's boxes: the cruisers with flashing island-blue light
// bars, plus the roadblock barriers and the warning sign.
export function islandPoliceBoxes(police, time) {
  const boxes = [];
  const flash = Math.sin((time || 0) * 10) > 0;
  for (const cop of police.cops) {
    boxes.push(...carBoxes(cop));
    boxes.push({ x: cop.x, y: 1.6, z: cop.z, w: 1.2, h: 0.35, d: 0.8, color: flash ? [0.2, 0.4, 1] : [0.9, 0.2, 0.2], yaw: cop.angle });
    boxes.push({ x: cop.x, y: 0.5, z: cop.z, w: 2.1, h: 0.3, d: 4.7, color: [0.15, 0.5, 0.55], yaw: cop.angle });
  }
  if (police.roadblock) {
    const rb = police.roadblock;
    boxes.push({ x: rb.x, y: 0.55, z: rb.z, w: 2.0, h: 0.75, d: 4.4, color: [0.95, 0.85, 0.3], yaw: rb.angle });
    boxes.push({ x: rb.x + 6, y: 0.55, z: rb.z + 2, w: 2.0, h: 0.75, d: 4.4, color: [0.95, 0.85, 0.3], yaw: rb.angle });
    boxes.push({ x: rb.x - 6, y: 1.4, z: rb.z - 2, w: 3.0, h: 1.6, d: 0.3, color: [0.9, 0.2, 0.2], yaw: rb.angle });
  }
  return boxes;
}

export const ISLAND_PATROL_CHATTER = {
  start: [
    'Dispatch: "All units, the Sunset King is on the island."',
    'Kana: "Eyes on the ferry dock. She came by boat, she leaves by boat."',
    'Rolo: "I have the village. Nobody parks here without paying."',
  ],
  close: [
    'Mina: "She is close. Close the north road."',
    'Boro: "I see her. I always see her."',
    'Kana: "Ram her. Gently. The island needs the car intact."',
  ],
  lost: [
    'Dispatch: "Units, we lost her. Check the beach."',
    'Rolo: "She went into the palm grove. I am not going in there."',
    'Mina: "The volcano hides everyone eventually."',
  ],
  roadblock: [
    'Mina: "Roadblock is up on the volcano bridge."',
    'Dispatch: "All units, the north road is closed."',
    'Boro: "She will try the beach road. She always tries the beach road."',
  ],
};

export function islandChatter(kind, index) {
  const lines = ISLAND_PATROL_CHATTER[kind] || ISLAND_PATROL_CHATTER.start;
  return lines[(index || 0) % lines.length];
}

export function islandPoliceSummary(police) {
  return {
    units: police.cops.length,
    wanted: police.wanted,
    roadblock: !!police.roadblock,
    rams: police.rams,
    escapes: police.escapes,
    chatter: police.lastChatter,
  };
}

export function islandPoliceSave(police) {
  return { wanted: police.wanted, heat: police.heat, busted: police.busted, escapes: police.escapes, rams: police.rams };
}

export function islandPoliceLoad(data) {
  const p = createIslandPolice();
  if (!data || typeof data !== 'object') return p;
  p.wanted = data.wanted || 0;
  p.heat = data.heat || 0;
  p.busted = data.busted || 0;
  p.escapes = data.escapes || 0;
  p.rams = data.rams || 0;
  return p;
}

export { ISLAND };
