// Island businesses — own Ember Isle too.
// Four properties on the island: a resort, a volcano bar, a dive shop
// and a fish stall. Same rules as the city (buy, upgrade to level 3,
// passive income every day), but the island pays better — the volcano
// is good for tourism. The Queen of Ember finale needs an island
// business at level 2, so the island is not a holiday: it is a second
// empire to build.

import { ISLAND } from './island.js';
import { clamp } from './random.js';

export const ISLAND_BUSINESS_DEFS = [
  { id: 'ember-resort', name: 'Ember Resort', district: 'Ember Resort', cost: 9000, income: 260, upgrade: 6500, blurb: 'Pools, palms and tourists with cameras.' },
  { id: 'magma-bar', name: 'Magma Bar', district: 'Volcano Rim', cost: 7000, income: 210, upgrade: 5200, blurb: 'Lava on the rocks. Neat, no ice.' },
  { id: 'dive-shop', name: 'Black Sand Dive Shop', district: 'Black Sand Beach', cost: 6000, income: 170, upgrade: 4500, blurb: 'Tanks, fins and the black reef.' },
  { id: 'fish-stall', name: 'Dock Fish Stall', district: 'Fisher Village', cost: 3000, income: 90, upgrade: 2200, blurb: 'The morning catch, grilled by noon.' },
];

const ISLAND_BUSINESS_SPOTS = {
  'ember-resort': { dx: 190, dz: 60 },
  'magma-bar': { dx: 60, dz: -120 },
  'dive-shop': { dx: 40, dz: -200 },
  'fish-stall': { dx: -170, dz: -40 },
};

export const ISLAND_BUSINESS_MAX_LEVEL = 3;

export function islandBusinessDef(id) {
  return ISLAND_BUSINESS_DEFS.find((d) => d.id === id) || null;
}

export function createIslandBusiness() {
  return { owned: {}, earned: 0, bought: 0, upgraded: 0, lastDay: 1 };
}

export function islandBusinessPositions() {
  const out = {};
  for (const def of ISLAND_BUSINESS_DEFS) {
    const spot = ISLAND_BUSINESS_SPOTS[def.id];
    out[def.id] = { x: ISLAND.x + spot.dx, z: ISLAND.z + spot.dz, ...def };
  }
  return out;
}

export function islandBusinessLevel(state, id) {
  return state.owned[id] ? state.owned[id].level : 0;
}

export function maxIslandBusinessLevel(state) {
  let best = 0;
  for (const id of Object.keys(state.owned)) {
    best = Math.max(best, state.owned[id].level);
  }
  return best;
}

export function islandBusinessIncomePerDay(state) {
  let total = 0;
  for (const id of Object.keys(state.owned)) {
    const def = islandBusinessDef(id);
    if (def) total += def.income * state.owned[id].level;
  }
  return total;
}

export function buyIslandBusiness(state, id, cash) {
  const def = islandBusinessDef(id);
  if (!def) return { ok: false, cost: 0, msg: 'No such business.' };
  if (state.owned[id]) return { ok: false, cost: 0, msg: `You already own the ${def.name} — press B again to upgrade it.` };
  if (cash < def.cost) return { ok: false, cost: def.cost, msg: `The ${def.name} costs $${def.cost.toLocaleString()} — you have $${Math.floor(cash).toLocaleString()}.` };
  state.owned[id] = { level: 1, invested: def.cost };
  state.bought += 1;
  return { ok: true, cost: def.cost, msg: `You bought the ${def.name} for $${def.cost.toLocaleString()}! It pays $${def.income}/day.` };
}

export function upgradeIslandBusiness(state, id, cash) {
  const def = islandBusinessDef(id);
  if (!def) return { ok: false, cost: 0, msg: 'No such business.' };
  const owned = state.owned[id];
  if (!owned) return buyIslandBusiness(state, id, cash);
  if (owned.level >= ISLAND_BUSINESS_MAX_LEVEL) return { ok: false, cost: 0, msg: `The ${def.name} is already max level ${ISLAND_BUSINESS_MAX_LEVEL}.` };
  if (cash < def.upgrade) return { ok: false, cost: def.upgrade, msg: `Upgrading the ${def.name} costs $${def.upgrade.toLocaleString()} — you have $${Math.floor(cash).toLocaleString()}.` };
  owned.level += 1;
  owned.invested += def.upgrade;
  state.upgraded += 1;
  return { ok: true, cost: def.upgrade, msg: `The ${def.name} is now level ${owned.level} — it pays $${def.income * owned.level}/day.` };
}

export function collectIslandIncome(state, day) {
  const days = clamp(day - state.lastDay, 0, 7);
  if (days <= 0) return 0;
  const pay = islandBusinessIncomePerDay(state) * days;
  state.lastDay = day;
  if (pay > 0) state.earned += pay;
  return pay;
}

export function nearestIslandBusiness(state, x, z) {
  const positions = islandBusinessPositions();
  let best = null;
  let bestD = Infinity;
  for (const id of Object.keys(positions)) {
    const p = positions[id];
    const dx = x - p.x;
    const dz = z - p.z;
    const d = dx * dx + dz * dz;
    if (d < bestD) { bestD = d; best = p; }
  }
  if (!best) return null;
  const owned = state.owned[best.id];
  return {
    ...best,
    dist: Math.sqrt(bestD),
    level: owned ? owned.level : 0,
    cost: owned
      ? (owned.level >= ISLAND_BUSINESS_MAX_LEVEL ? null : best.upgrade)
      : best.cost,
    action: owned ? (owned.level >= ISLAND_BUSINESS_MAX_LEVEL ? 'max' : 'upgrade') : 'buy',
  };
}

export function islandBusinessBoxes(state, time) {
  const boxes = [];
  const positions = islandBusinessPositions();
  for (const id of Object.keys(positions)) {
    const p = positions[id];
    const owned = state.owned[id];
    if (owned) {
      const pulse = 1 + Math.sin(time * 2 + p.x) * 0.08;
      boxes.push({ x: p.x, y: 3.2, z: p.z, w: 0.6, h: 6.4, d: 0.6, color: [0.16, 0.12, 0.1], yaw: 0 });
      boxes.push({ x: p.x, y: 6.5, z: p.z, w: 8.4 * pulse, h: 1.8, d: 0.5, color: [0.12, 0.1, 0.08], yaw: 0 });
      boxes.push({ x: p.x, y: 6.5, z: p.z, w: 7.6 * pulse, h: 1.2, d: 0.6, color: [1.0, 0.55, 0.2], yaw: 0 });
      for (let l = 0; l < owned.level; l += 1) {
        boxes.push({ x: p.x - 2 + l * 2, y: 8.2, z: p.z, w: 1.4, h: 1.4, d: 0.5, color: [1.0, 0.75, 0.25], yaw: 0 });
      }
    } else {
      boxes.push({ x: p.x, y: 2.8, z: p.z, w: 0.6, h: 5.6, d: 0.6, color: [0.16, 0.12, 0.1], yaw: 0 });
      boxes.push({ x: p.x, y: 5.5, z: p.z, w: 7, h: 1.6, d: 0.5, color: [0.12, 0.1, 0.08], yaw: 0 });
      boxes.push({ x: p.x, y: 5.5, z: p.z, w: 6, h: 1.0, d: 0.6, color: [0.75, 0.8, 0.85], yaw: 0 });
    }
  }
  return boxes;
}

export function islandBusinessSummary(state) {
  return {
    owned: Object.keys(state.owned).length,
    total: ISLAND_BUSINESS_DEFS.length,
    incomePerDay: islandBusinessIncomePerDay(state),
    earned: state.earned,
    maxLevel: maxIslandBusinessLevel(state),
    list: Object.keys(state.owned).map((id) => {
      const def = islandBusinessDef(id);
      return { id, name: def.name, level: state.owned[id].level, income: def.income * state.owned[id].level };
    }),
  };
}

export function islandBusinessSave(state) {
  return { owned: state.owned, earned: state.earned, bought: state.bought, upgraded: state.upgraded, lastDay: state.lastDay };
}

export function islandBusinessLoad(data) {
  const s = createIslandBusiness();
  if (!data) return s;
  if (data.owned && typeof data.owned === 'object') {
    for (const id of Object.keys(data.owned)) {
      const def = islandBusinessDef(id);
      const lvl = data.owned[id] && data.owned[id].level;
      if (def && Number.isInteger(lvl)) {
        s.owned[id] = { level: clamp(lvl, 1, ISLAND_BUSINESS_MAX_LEVEL), invested: data.owned[id].invested || 0 };
      }
    }
  }
  if (Number.isFinite(data.earned)) s.earned = Math.max(0, Math.floor(data.earned));
  if (Number.isInteger(data.bought)) s.bought = data.bought;
  if (Number.isInteger(data.upgraded)) s.upgraded = data.upgraded;
  if (Number.isInteger(data.lastDay)) s.lastDay = clamp(data.lastDay, 1, 7);
  return s;
}
