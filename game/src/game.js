// Game state and simulation: driving, walking, police, missions, ferry,
// businesses, races, garage, weapons, weather, saves, Sun Coins.
import {
  CITY, ISLE, VOLCANO, FERRY, VEHICLES, WEAPONS, RADIO, MISSIONS,
  POLICE_CITY, POLICE_ISLE, RACES, RIVALS, BUSINESSES, GARAGE_UPGRADES,
  SUN_COINS_TOTAL, PLAYER, CREW,
} from './config.js';
import { buildWorld, groundHeightAt } from './world.js';
import { makeRng, clamp, angleLerp, dist2 } from './random.js';

export function createGame(seed) {
  const world = buildWorld(seed);
  const rng = makeRng(seed + 99);
  const cars = [];
  // Player car: Sunset GT on the Sunset Mile road (x = 23, a road lane).
  cars.push(makeCar('sunset-gt', 23, 0, -150, Math.PI, true, false));
  // Traffic cars on the grid.
  for (let i = 0; i < 12; i++) {
    const sp = world.trafficSpawns[i % world.trafficSpawns.length];
    const v = VEHICLES[1 + (i % 5)];
    cars.push(makeCar(v.id, sp.x + rng.range(-6, 6), 0, sp.z + rng.range(-6, 6), sp.dir + rng.range(-0.1, 0.1), false, false));
  }
  // Two traffic cars ahead + one VCPD cruiser behind for the city chase shot.
  cars.push(makeCar('copper-cab', 23, 0, -118, Math.PI, false, false));
  cars.push(makeCar('palm-cruiser', 37, 0, -126, Math.PI, false, false));

  const state = {
    seed, world, rng,
    time: 0, dayTime: 17.4, // golden hour start
    started: false, paused: false, showMap: false,
    player: {
      name: PLAYER.name, x: 23, y: 0, z: -138, heading: Math.PI,
      speed: 0, health: PLAYER.startHealth, cash: PLAYER.startCash,
      inCar: true, car: cars[0], onFootSpeed: 0,
      weapon: 0, wanted: 0, rank: 'Rookie Driver', standing: {},
    },
    cars, peds: world.peds.map(p => ({ ...p })),
    coins: world.coins.map(c => ({ ...c, taken: false })),
    coinsCollected: 0,
    ferry: { x: FERRY.pier.x, z: FERRY.pier.z, heading: Math.PI / 2, leg: 0, t: 0, docked: true, timer: 0 },
    heli: null, police: [], roadblocks: [], spikeStrips: [],
    missionIndex: 0, missionProgress: 0,
    respect: 0, crew: [],
    radioIndex: 0, radioOn: true,
    weather: 'golden', storm: 0, lightning: 0,
    businesses: [], garage: {},
    raceSeason: RACES.map(r => ({ ...r, wins: 0, best: null })),
    saveSlot: 1,
    toast: '', toastUntil: 0,
    shot: null, shotCamera: null,
    stats: { distance: 0, carsStolen: 0, missionsDone: 0, racesWon: 0, arrests: 0 },
    freePlay: false,
  };
  for (const d of world.districts) state.player.standing[d.name] = 0;
  return state;
}

export function makeCar(id, x, y, z, heading, isPlayer, isPolice) {
  const v = VEHICLES.find(vv => vv.id === id) || VEHICLES[0];
  return {
    id, name: v.name, x, y, z, heading, speed: 0,
    top: v.top, accel: v.accel, grip: v.grip, color: v.color,
    isPlayer, isPolice, lightPhase: false, ai: !isPlayer,
    targetSpeed: 10, steer: 0,
  };
}

export function toast(state, msg, dur = 3) {
  state.toast = msg; state.toastUntil = state.time + dur;
}

export function currentMission(state) {
  return MISSIONS[state.missionIndex] || null;
}

export function completeMission(state) {
  const m = currentMission(state);
  if (!m) return;
  state.player.cash += m.reward;
  state.stats.missionsDone++;
  state.respect += 100 + Math.round(m.reward / 10);
  state.missionIndex = Math.min(state.missionIndex + 1, MISSIONS.length);
  toast(state, `Mission complete: ${m.title} — +$${m.reward}`, 4);
  // Crew joins as the mission count passes each threshold.
  for (const c of CREW) {
    if (state.missionIndex === c.joinAfter && !state.crew.includes(c.name)) {
      state.crew.push(c.name);
      toast(state, `${c.name} joined your crew — ${c.role}!`, 5);
    }
  }
  if (state.missionIndex >= MISSIONS.length) {
    state.player.rank = 'Queen of Ember';
    toast(state, 'You are the Queen of Ember. Vesper City is yours.', 6);
  } else if (state.missionIndex >= 12) {
    state.player.rank = 'Isle Boss';
  } else if (state.missionIndex >= 6) {
    state.player.rank = 'Street King';
  }
}

export function raiseWanted(state, n) {
  const p = state.player;
  p.wanted = clamp(p.wanted + n, 0, 6);
  spawnPolice(state);
}

export function spawnPolice(state) {
  const p = state.player;
  const isIsle = Math.abs(p.x - ISLE.x) < 220 && Math.abs(p.z - ISLE.z) < 200;
  const max = isIsle ? Math.min(p.wanted, 4) : p.wanted;
  const roster = isIsle ? POLICE_ISLE : POLICE_CITY;
  while (state.police.length < max) {
    const i = state.police.length;
    const unit = roster[i % roster.length];
    const angle = (i / Math.max(1, max)) * Math.PI * 2;
    const car = makeCar(isIsle ? 'patrol-buggy' : (i === 3 ? 'vcpd-interceptor' : 'vcpd-cruiser'),
      p.x + Math.cos(angle) * 60, 0, p.z + Math.sin(angle) * 60, angle, false, true);
    car.unit = unit; car.tactic = unit.tactic;
    state.police.push(car);
    state.cars.push(car);
  }
  while (state.police.length > max) {
    const gone = state.police.pop();
    state.cars = state.cars.filter(c => c !== gone);
  }
  // Helicopter at wanted 3+ in the city.
  if (!isIsle && p.wanted >= 3 && !state.heli) {
    state.heli = { x: p.x + 40, y: 55, z: p.z - 40, name: 'AIR-ONE', pilot: 'Sgt. Vane' };
    toast(state, 'VCPD Air One is overhead — lose the spotlight!', 4);
  }
  if (p.wanted < 3) state.heli = null;
  // Roadblock at wanted 2+.
  if (!isIsle && p.wanted >= 2 && state.roadblocks.length === 0) {
    const a = p.heading;
    state.roadblocks.push({ x: p.x + Math.sin(a) * 90, z: p.z + Math.cos(a) * 90 });
  }
  if (p.wanted < 2) state.roadblocks = [];
  // Spike strip at wanted 4+: one strip laid across the escape route ahead.
  if (!isIsle && p.wanted >= 4) {
    const a = p.heading;
    state.spikeStrips = [{ x: p.x + Math.sin(a) * 70, z: p.z + Math.cos(a) * 70, heading: a }];
  } else if (p.wanted < 4) {
    state.spikeStrips = [];
  }
}

function driveCar(car, input, dt, state) {
  const accelIn = input.up ? 1 : input.down ? -0.6 : 0;
  const engine = car.top * (1 + (state.garage.engine || 0) * 0.12);
  car.speed += accelIn * car.accel * dt;
  car.speed -= car.speed * 0.55 * dt;
  if (input.handbrake) car.speed *= (1 - 2.2 * dt);
  car.speed = clamp(car.speed, -engine * 0.45, engine);
  const steer = (input.left ? 1 : 0) - (input.right ? 1 : 0);
  const dir = car.speed >= 0 ? 1 : -1;
  car.heading += steer * car.grip * dt * clamp(Math.abs(car.speed) / 12, 0, 1) * dir;
  car.x += Math.sin(car.heading) * car.speed * dt;
  car.z += Math.cos(car.heading) * car.speed * dt;
  car.y = groundHeightAt(car.x, car.z);
  // Keep cars out of the sea and inside the map.
  if (car.x < -820) car.x = -820;
  if (car.x > 260) car.x = 260;
  if (car.z < -260) car.z = -260;
  if (car.z > 260) car.z = 260;
}

function updateTraffic(state, dt) {
  for (const car of state.cars) {
    if (car.isPlayer) continue;
    if (car.isPolice) {
      // Police chase the player.
      const p = state.player;
      const dx = p.x - car.x, dz = p.z - car.z;
      const want = Math.atan2(dx, dz);
      car.heading = angleLerp(car.heading, want, dt * 1.4);
      car.speed = Math.min(car.speed + 18 * dt, car.top * 0.95);
      car.x += Math.sin(car.heading) * car.speed * dt;
      car.z += Math.cos(car.heading) * car.speed * dt;
      car.lightPhase = Math.floor(state.time * 4) % 2 === 0;
      if (Math.hypot(dx, dz) < 4) {
        state.player.health = Math.max(0, state.player.health - 2 * dt);
        if (state.player.health <= 0) {
          state.player.health = 100; state.player.wanted = 0;
          state.player.x = 23; state.player.z = -138;
          toast(state, 'Busted! VCPD took your cash — you start again on Sunset Mile.', 4);
          state.player.cash = Math.max(0, state.player.cash - 200);
          spawnPolice(state);
        }
      }
    } else {
      // Traffic cruises along its heading, gently steering on the grid.
      car.speed += (car.targetSpeed - car.speed) * dt * 0.5;
      car.x += Math.sin(car.heading) * car.speed * dt;
      car.z += Math.cos(car.heading) * car.speed * dt;
      if (car.x > 230 || car.x < -230 || car.z > 230 || car.z < -230) {
        car.heading += Math.PI / 2;
        car.x = clamp(car.x, -220, 220); car.z = clamp(car.z, -220, 220);
      }
    }
  }
}

function updatePeds(state, dt) {
  for (const ped of state.peds) {
    ped.x += Math.sin(ped.dir) * ped.speed * dt;
    ped.z += Math.cos(ped.dir) * ped.speed * dt;
    if (Math.abs(ped.x) > 220 || Math.abs(ped.z) > 220) ped.dir += Math.PI;
    if (state.rng.next() < dt * 0.02) ped.dir += (state.rng.next() - 0.5) * 1.6;
  }
}

function updateFerry(state, dt) {
  const f = state.ferry;
  f.timer += dt;
  if (f.docked && f.timer > FERRY.intervalSec) {
    f.docked = false; f.leg = 0; f.t = 0;
    toast(state, 'Ferry departing Sunset Pier for Ember Isle!', 3);
  }
  if (!f.docked) {
    const route = state.world.ferryRoute;
    const a = route[f.leg], b = route[Math.min(f.leg + 1, route.length - 1)];
    const segLen = Math.hypot(b.x - a.x, b.z - a.z);
    f.t += (FERRY.speed * dt) / segLen;
    if (f.t >= 1) { f.leg++; f.t = 0; if (f.leg >= route.length - 1) { f.docked = true; f.timer = 0; f.x = b.x; f.z = b.z; } }
    if (!f.docked) {
      f.x = a.x + (b.x - a.x) * f.t;
      f.z = a.z + (b.z - a.z) * f.t;
      f.heading = Math.atan2(b.x - a.x, b.z - a.z);
    }
  }
}

function updateWeather(state, dt) {
  state.dayTime = (state.dayTime + dt / 240) % 24; // full day in 4 minutes
  if (state.rng.next() < dt * 0.004 && state.weather !== 'hurricane') {
    state.weather = 'hurricane'; state.storm = 1;
    toast(state, 'HURRICANE WARNING — lightning over Ember Isle!', 4);
  }
  if (state.weather === 'hurricane') {
    state.storm = Math.max(0, state.storm - dt * 0.02);
    if (state.rng.next() < dt * 0.5) state.lightning = 0.15;
    if (state.storm <= 0) state.weather = 'golden';
  }
  state.lightning = Math.max(0, state.lightning - dt);
}

function updateCoins(state) {
  const p = state.player;
  for (const coin of state.coins) {
    if (coin.taken) continue;
    if (dist2(p.x, p.z, coin.x, coin.z) < 9 && Math.abs(p.y - coin.y) < 8) {
      coin.taken = true; state.coinsCollected++;
      const value = state.crew.includes('Dario Kess') ? 75 : 50;
      state.player.cash += value;
      state.respect += 25;
      toast(state, `Sun Coin ${state.coinsCollected}/${SUN_COINS_TOTAL} — +$${value}`, 2);
    }
  }
}

function updateMission(state, dt) {
  const m = currentMission(state);
  if (!m) return;
  state.missionProgress += dt * 0.02;
  // Driving to the mission district advances it; reaching it completes it.
  const d = state.world.districts.find(dd => dd.name === m.target);
  if (d && dist2(state.player.x, state.player.z, d.x, d.z) < 1600) {
    completeMission(state);
    state.missionProgress = 0;
  }
}

export function buyBusiness(state, id) {
  const b = BUSINESSES.find(bb => bb.id === id);
  if (!b) return false;
  if (state.businesses.some(bb => bb.id === id)) return false;
  if (state.player.cash < b.cost) { toast(state, `Need $${b.cost} for ${b.name}.`, 2); return false; }
  state.player.cash -= b.cost;
  state.businesses.push({ ...b, level: 1 });
  toast(state, `You own ${b.name} — +$${b.income}/day passive income.`, 3);
  return true;
}

export function buyUpgrade(state, id) {
  const u = GARAGE_UPGRADES.find(g => g.id === id);
  if (!u) return false;
  const lvl = state.garage[id] || 0;
  if (lvl >= u.levels) return false;
  const baseCost = u.cost[lvl];
  // Rook the mechanic cuts every garage price by 15% once he joins.
  const cost = state.crew.includes('Rook') ? Math.round(baseCost * 0.85) : baseCost;
  if (state.player.cash < cost) { toast(state, `Need $${cost} for ${u.name} Lv${lvl + 1}.`, 2); return false; }
  state.player.cash -= cost;
  state.garage[id] = lvl + 1;
  toast(state, `${u.name} upgraded to level ${lvl + 1}${state.crew.includes('Rook') ? ' (Rook discount −15%)' : ''}.`, 3);
  return true;
}

export function startRace(state, id) {
  const r = state.raceSeason.find(rr => rr.id === id);
  if (!r) return false;
  if (state.player.cash < r.bet) { toast(state, `Need $${r.bet} to enter ${r.name}.`, 2); return false; }
  state.player.cash -= r.bet;
  // Simple seeded outcome: skill + car upgrades vs rivals.
  const skill = 0.45 + (state.garage.engine || 0) * 0.08 + (state.garage.tyres || 0) * 0.05 + (state.garage.nitro || 0) * 0.06;
  const won = state.rng.next() < skill;
  if (won) {
    const prize = r.bet * 4;
    state.player.cash += prize; r.wins++; state.stats.racesWon++;
    toast(state, `You won ${r.name}! +$${prize}`, 4);
  } else {
    const winner = RIVALS[state.rng.int(0, RIVALS.length - 1)];
    toast(state, `${winner} won ${r.name}. Your $${r.bet} is gone.`, 3);
  }
  return won;
}

export function saveGame(state, slot) {
  try {
    const data = {
      cash: state.player.cash, health: state.player.health,
      missionIndex: state.missionIndex, coinsCollected: state.coinsCollected,
      businesses: state.businesses, garage: state.garage,
      x: state.player.x, z: state.player.z, dayTime: state.dayTime,
    };
    localStorage.setItem(`vesper-city-save-${slot}`, JSON.stringify(data));
    toast(state, `Saved to slot ${slot}.`, 2);
    return true;
  } catch (e) { return false; }
}

export function loadGame(state, slot) {
  try {
    const raw = localStorage.getItem(`vesper-city-save-${slot}`);
    if (!raw) return false;
    const d = JSON.parse(raw);
    state.player.cash = d.cash; state.player.health = d.health;
    state.missionIndex = d.missionIndex; state.coinsCollected = d.coinsCollected;
    state.businesses = d.businesses || []; state.garage = d.garage || {};
    state.player.x = d.x; state.player.z = d.z; state.dayTime = d.dayTime;
    toast(state, `Loaded save slot ${slot}.`, 2);
    return true;
  } catch (e) { return false; }
}

export function update(state, input, dt) {
  state.time += dt;
  if (!state.started || state.paused) return;
  const p = state.player;
  if (p.inCar && p.car) {
    driveCar(p.car, input, dt, state);
    p.x = p.car.x; p.y = p.car.y; p.z = p.car.z; p.heading = p.car.heading;
    p.speed = p.car.speed;
    state.stats.distance += Math.abs(p.speed) * dt;
  } else {
    const sp = input.sprint ? 9 : 4.5;
    const mx = (input.up ? 1 : 0) - (input.down ? 1 : 0);
    const mz = (input.left ? -1 : 0) + (input.right ? 1 : 0);
    const len = Math.hypot(mx, mz) || 1;
    p.x += Math.sin(p.heading) * mx * sp * dt + Math.cos(p.heading) * mz * sp * dt;
    p.z += Math.cos(p.heading) * mx * sp * dt - Math.sin(p.heading) * mz * sp * dt;
    p.y = groundHeightAt(p.x, p.z);
    p.speed = sp * (Math.abs(mx) + Math.abs(mz) > 0 ? 1 : 0);
  }
  // Collisions with buildings slow the player and raise heat.
  for (const b of state.world.buildings) {
    if (Math.abs(p.x - b.x) < b.w / 2 + 2 && Math.abs(p.z - b.z) < b.d / 2 + 2) {
      if (p.inCar && Math.abs(p.speed) > 8) {
        p.speed *= 0.3; if (p.car) p.car.speed *= 0.3;
        p.health = Math.max(0, p.health - 4);
        raiseWanted(state, 1);
        toast(state, 'You smashed into a tower — VCPD noticed.', 2);
      }
      p.x += p.x > b.x ? 2.5 : -2.5;
    }
  }
  updateTraffic(state, dt);
  updatePeds(state, dt);
  updateFerry(state, dt);
  updateWeather(state, dt);
  updateCoins(state);
  updateMission(state, dt);
  // Passive income ticks once per in-game day.
  if (Math.floor(state.dayTime) === 6 && !state._paidToday) {
    state._paidToday = true;
    const income = state.businesses.reduce((s, b) => s + b.income * b.level, 0);
    if (income > 0) { state.player.cash += income; toast(state, `Business income: +$${income}`, 3); }
  }
  if (Math.floor(state.dayTime) !== 6) state._paidToday = false;
  // Wanted cools down when the player hides.
  if (p.wanted > 0 && Math.abs(p.speed) < 1 && state.time % 10 < dt) {
    p.wanted = Math.max(0, p.wanted - 1);
    spawnPolice(state);
  }
  if (state.heli) {
    state.heli.x += (p.x - state.heli.x) * dt * 0.3;
    state.heli.z += (p.z - state.heli.z) * dt * 0.3;
  }
}

export function enterExitCar(state) {
  const p = state.player;
  if (p.inCar) {
    p.inCar = false; p.car.isPlayer = false; p.car = null;
    p.x += Math.sin(p.heading + Math.PI / 2) * 3;
    p.z += Math.cos(p.heading + Math.PI / 2) * 3;
    toast(state, 'On foot — press E near a car to steal it.', 2);
  } else {
    let best = null, bd = 1e9;
    for (const car of state.cars) {
      if (car.isPolice) continue;
      const d = dist2(p.x, p.z, car.x, car.z);
      if (d < bd) { bd = d; best = car; }
    }
    if (best && bd < 36) {
      p.inCar = true; p.car = best; best.isPlayer = true;
      state.stats.carsStolen++;
      state.respect += 50;
      raiseWanted(state, 1);
      toast(state, `You stole the ${best.name}! Wanted level ${p.wanted}.`, 3);
    } else {
      toast(state, 'No car close enough to steal.', 2);
    }
  }
}

export function cycleRadio(state, dir = 1) {
  state.radioIndex = (state.radioIndex + dir + RADIO.length) % RADIO.length;
  const st = RADIO[state.radioIndex];
  toast(state, `Radio: ${st.name} — ${st.genre} with ${st.dj}`, 2);
}

export function fireWeapon(state) {
  const w = WEAPONS[state.player.weapon];
  const p = state.player;
  for (const car of state.police) {
    const d = Math.hypot(car.x - p.x, car.z - p.z);
    if (d < w.range) {
      car.health = (car.health || 100) - w.damage;
      if (car.health <= 0) {
        state.cars = state.cars.filter(c => c !== car);
        state.police = state.police.filter(c => c !== car);
        state.player.cash += 100;
        toast(state, `VCPD unit down — +$100`, 2);
      }
    }
  }
  raiseWanted(state, 1);
}
