// The Sunset Garage — car upgrades for Vesper City: Ember Isle.
// Rook's shop on the south-east corner: park in the yard, press G, and
// buy engine, armour, tyres, nitro and chrome, one level at a time, up
// to level 3 each. The RACE SPEC kit is the top of the tree: it turns
// any car into a street-race machine. Upgrades live on the car, so the
// save file keeps them and the traffic never gets them.

export const GARAGE_UPGRADES = [
  { id: 'engine', name: 'Engine', price: 400, desc: '+8% top speed, +10% acceleration per level' },
  { id: 'armour', name: 'Armour', price: 350, desc: '+25 max HP per level, less crash damage' },
  { id: 'tyres', name: 'Tyres', price: 300, desc: '+12% grip per level, sharper turns' },
  { id: 'nitro', name: 'Nitro', price: 500, desc: 'Hold Shift for a nitro boost (100 units)' },
  { id: 'chrome', name: 'Chrome', price: 600, desc: 'Shine. Pure shine. Respect +50 per level' },
];

export const RACE_SPEC = { id: 'raceSpec', name: 'RACE SPEC Kit', price: 5000, desc: '+25% top speed, race livery, unlocks the pro circuits' };

export const GARAGE_MAX_LEVEL = 3;

export function garageUpgradesFor(car) {
  return GARAGE_UPGRADES.map((u) => ({
    ...u,
    level: car.upgrades[u.id] || 0,
    maxed: (car.upgrades[u.id] || 0) >= GARAGE_MAX_LEVEL,
    cost: u.price * ((car.upgrades[u.id] || 0) + 1),
  }));
}

export function buyUpgrade(car, id, cash) {
  const def = GARAGE_UPGRADES.find((u) => u.id === id);
  if (!def) return { ok: false, cost: 0, msg: 'No such upgrade.' };
  const level = car.upgrades[id] || 0;
  if (level >= GARAGE_MAX_LEVEL) return { ok: false, cost: 0, msg: `${def.name} is already max level ${GARAGE_MAX_LEVEL}.` };
  const cost = def.price * (level + 1);
  if (cash < cost) return { ok: false, cost, msg: `${def.name} Lv${level + 1} costs $${cost.toLocaleString()} — you have $${Math.floor(cash).toLocaleString()}.` };
  car.upgrades[id] = level + 1;
  if (id === 'armour') car.hp = Math.min(car.hp + 25, 100 + car.upgrades.armour * 25);
  if (id === 'nitro') car.nitroLeft = 100;
  return { ok: true, cost, msg: `${def.name} is now level ${level + 1} on the ${car.def.name}.` };
}

export function buyRaceSpec(car, cash) {
  if (car.upgrades.raceSpec) return { ok: false, cost: 0, msg: 'This car already has the RACE SPEC kit.' };
  const engineLevel = car.upgrades.engine || 0;
  if (engineLevel < 2) return { ok: false, cost: RACE_SPEC.price, msg: `RACE SPEC needs Engine Lv2 first (you have Lv${engineLevel}).` };
  if (cash < RACE_SPEC.price) return { ok: false, cost: RACE_SPEC.price, msg: `RACE SPEC costs $${RACE_SPEC.price.toLocaleString()} — you have $${Math.floor(cash).toLocaleString()}.` };
  car.upgrades.raceSpec = true;
  return { ok: true, cost: RACE_SPEC.price, msg: `RACE SPEC installed on the ${car.def.name} — +25% top speed, pro circuits unlocked.` };
}

// Max HP with armour: 100 base, +25 per armour level.
export function carMaxHp(car) {
  return 100 + (car.upgrades.armour || 0) * 25;
}

// Repair a car to full health at the garage. Costs $1 per missing HP.
export function repairCar(car, cash) {
  const max = carMaxHp(car);
  const missing = Math.max(0, max - car.hp);
  if (missing === 0) return { ok: false, cost: 0, msg: 'The car is already in perfect shape.' };
  const cost = missing;
  if (cash < cost) return { ok: false, cost, msg: `Repairs cost $${cost} — you have $${Math.floor(cash)}.` };
  car.hp = max;
  car.burning = false;
  return { ok: true, cost, msg: `Repaired to full health for $${cost}.` };
}

export function garageSummary(car) {
  return {
    car: car.def.name,
    hp: Math.round(car.hp),
    maxHp: carMaxHp(car),
    nitro: Math.round(car.nitroLeft),
    upgrades: garageUpgradesFor(car),
    raceSpec: !!car.upgrades.raceSpec,
  };
}

export function garageLabel(car) {
  const s = garageSummary(car);
  const ups = s.upgrades.map((u) => `${u.name} Lv${u.level}`).join(' · ');
  return `${s.car} — ${ups}${s.raceSpec ? ' · RACE SPEC' : ''}`;
}
