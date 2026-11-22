// Game state and simulation: driving, walking, police, missions, ferry,
// businesses, races, garage, weapons, weather, saves, Sun Coins.
//
// Round 10 rewrite — the world now feels alive instead of posed:
// traffic brakes for the car ahead, changes lane to overtake and turns
// at grid intersections; pedestrians walk with a real stride; exhaust
// puffs and road dust trail fast cars; the sun sinks through golden hour
// toward dusk and the city lights switch on. All of it is deterministic
// from the seed, so the dossier stays byte-identical across runs.
import {
  CITY, ISLE, VOLCANO, FERRY, VEHICLES, WEAPONS, RADIO, MISSIONS,
  POLICE_CITY, POLICE_ISLE, RACES, RIVALS, BUSINESSES, GARAGE_UPGRADES,
  SUN_COINS_TOTAL, PLAYER, CREW, TRAFFIC, LIGHT, SIDE_JOBS, HEAT, HINTS,
} from './config.js';
import { buildWorld, groundHeightAt } from './world.js';
import { makeRng, clamp, angleLerp, dist2, smoothstep, gauss } from './random.js';

// Where the sun is for a given time of day: elevation falls from 0.42 at
// noon to 0 at sunset (19:30), azimuth swings west-to-northwest, and
// dusk ramps 0..1 once the light switches on. The renderer reads this
// for shadow length, sky warmth and window light.
export function sunState(dayTime) {
  const t = (dayTime - 12) / 7.5; // 0 at noon, 1 at 19:30
  const elevation = Math.max(0, 0.42 * Math.cos(t * Math.PI * 0.5));
  const azimuth = LIGHT.sunAzimuth;
  const dusk = smoothstep(LIGHT.duskStart, LIGHT.duskStart + 0.8, dayTime);
  return { elevation, azimuth, dusk, shadowLen: LIGHT.shadowLen * (1 + t * 1.6) };
}

export function createGame(seed) {
  const world = buildWorld(seed);
  const rng = makeRng(seed + 99);
  const cars = [];
  // Player car: Sunset GT on the Sunset Mile road (x = 23, a road lane).
  cars.push(makeCar('sunset-gt', 23, 0, -150, Math.PI, true, false));
  // Traffic cars on the grid, each with its own target speed and lane
  // offset so the stream reads as individual drivers, not a convoy.
  for (let i = 0; i < 12; i++) {
    const sp = world.trafficSpawns[i % world.trafficSpawns.length];
    const v = VEHICLES[1 + (i % 5)];
    const car = makeCar(v.id, sp.x + rng.range(-6, 6), 0, sp.z + rng.range(-6, 6), sp.dir + rng.range(-0.1, 0.1), false, false);
    car.targetSpeed = v.top * rng.range(0.35, 0.6);
    car.lane = rng.range(-2.5, 2.5);
    cars.push(car);
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
    cars, peds: world.peds.map(p => ({ ...p, walkPhase: rng.range(0, 6.28) })),
    coins: world.coins.map(c => ({ ...c, taken: false })),
    coinsCollected: 0,
    // Round 10 — exhaust puffs and road dust, spawned behind cars and
    // aged out after a couple of seconds. Capped so free play never
    // grows the array without bound.
    particles: [],
    ferry: { x: FERRY.pier.x, z: FERRY.pier.z, heading: Math.PI / 2, leg: 0, t: 0, docked: true, timer: 0, hornBlast: false },
    heli: null, police: [], roadblocks: [], spikeStrips: [],
    missionIndex: 0, missionProgress: 0,
    respect: 0, crew: [],
    radioIndex: 0, radioOn: true,
    weather: 'golden', storm: 0, lightning: 0,
    // Round 10 — wanted heat, the active side job, and ferry riding.
    heat: 0, sideJob: null, onFerry: false, duskToasted: false,
    idleTime: 0, hintIndex: 0,
    businesses: [], garage: {},
    raceSeason: RACES.map(r => ({ ...r, wins: 0, best: null })),
    saveSlot: 1,
    toast: '', toastUntil: 0,
    shot: null, shotCamera: null,
    stats: { distance: 0, carsStolen: 0, missionsDone: 0, racesWon: 0, arrests: 0, topSpeed: 0, nearMisses: 0, sideJobsDone: 0 },
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
    // Round 10 — traffic AI state: braking lights the brake lamps,
    // lane is the lateral offset inside the road, turnCooldown stops a
    // car from turning at every intersection in a row.
    braking: false, lane: 0, turnCooldown: 0,
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
  car.braking = !!input.handbrake || !!input.down;
  if (input.handbrake) car.speed *= (1 - 2.2 * dt);
  car.speed = clamp(car.speed, -engine * 0.45, engine);
  const steer = (input.left ? 1 : 0) - (input.right ? 1 : 0);
  const dir = car.speed >= 0 ? 1 : -1;
  car.heading += steer * car.grip * dt * clamp(Math.abs(car.speed) / 12, 0, 1) * dir;
  car.x += Math.sin(car.heading) * car.speed * dt;
  car.z += Math.cos(car.heading) * car.speed * dt;
  car.y = groundHeightAt(car.x, car.z);
  // Hard acceleration puffs exhaust; a handbrake slide kicks up dust.
  if (state.rng.next() < dt * (input.handbrake ? 22 : Math.abs(accelIn) * 10)) {
    spawnPuff(state, car.x - Math.sin(car.heading) * 2.4, (car.y || 0) + 0.7, car.z - Math.cos(car.heading) * 2.4,
      input.handbrake ? 'dust' : 'exhaust');
  }
  // Keep cars out of the sea and inside the map.
  if (car.x < -820) car.x = -820;
  if (car.x > 260) car.x = 260;
  if (car.z < -260) car.z = -260;
  if (car.z > 260) car.z = 260;
}

// Round 10 — one exhaust or dust puff behind a car: it rises, spreads
// and fades over ~1.6 s. The renderer draws it as a soft grey box.
function spawnPuff(state, x, y, z, kind) {
  if (state.particles.length > 120) state.particles.shift();
  const r = state.rng;
  state.particles.push({
    x: x + gauss(r) * 0.5, y, z: z + gauss(r) * 0.5,
    vx: gauss(r) * 0.8, vy: kind === 'dust' ? 0.4 : 1.1, vz: gauss(r) * 0.8,
    size: kind === 'dust' ? 1.6 : 0.9, age: 0, life: 1.6, kind,
  });
}

function updateParticles(state, dt) {
  for (const pt of state.particles) {
    pt.age += dt;
    pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.z += pt.vz * dt;
    pt.size += dt * 1.4;
  }
  state.particles = state.particles.filter((pt) => pt.age < pt.life);
}

// Round 10 — the car ahead of a traffic car, in the same heading and
// within the brake gap, measured along the road (not raw distance, so
// oncoming cars on the other side of the road never trigger a brake).
function carAhead(state, car) {
  const fx = Math.sin(car.heading), fz = Math.cos(car.heading);
  let best = null, bestD = TRAFFIC.brakeGap;
  for (const other of state.cars) {
    if (other === car || other.isPlayer) continue;
    const dx = other.x - car.x, dz = other.z - car.z;
    const along = dx * fx + dz * fz;
    if (along < 2 || along > bestD) continue;
    const across = Math.abs(dx * fz - dz * fx);
    if (across > 3.5) continue;
    const headingDot = Math.sin(other.heading) * fx + Math.cos(other.heading) * fz;
    if (headingDot < 0.5) continue;
    best = other; bestD = along;
  }
  return best ? { car: best, gap: bestD } : null;
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
      // Round 10 traffic AI: brake for the car ahead (and queue behind
      // it), change lane to overtake when the road ahead is clear, and
      // turn at grid intersections instead of driving into the sea wall.
      const ahead = carAhead(state, car);
      car.braking = false;
      let want = car.targetSpeed;
      if (ahead) {
        if (ahead.gap < TRAFFIC.stopGap) { want = 0; car.braking = true; }
        else { want = Math.min(want, ahead.car.speed * 0.9); car.braking = ahead.gap < TRAFFIC.brakeGap * 0.6; }
        // Overtake: nobody ahead in the next lane and room to pass.
        if (ahead.gap > TRAFFIC.brakeGap * 0.5 && ahead.gap < TRAFFIC.overtakeGap && state.rng.next() < dt * 0.3) {
          car.lane = car.lane > 0 ? -3 : 3;
        }
      } else {
        car.lane += (0 - car.lane) * dt * 0.2;
      }
      car.speed += (want - car.speed) * dt * 0.9;
      car.turnCooldown = Math.max(0, car.turnCooldown - dt);
      // At a grid intersection (road crossing), sometimes turn left or
      // right and keep the new heading — the city finally has turning
      // traffic instead of cars that only ever go straight.
      const nearX = Math.abs(((car.x % CITY.pitch) + CITY.pitch) % CITY.pitch - CITY.pitch / 2) < 3;
      const nearZ = Math.abs(((car.z % CITY.pitch) + CITY.pitch) % CITY.pitch - CITY.pitch / 2) < 3;
      if (car.turnCooldown <= 0 && (nearX || nearZ) && state.rng.next() < dt * TRAFFIC.turnChance * 8) {
        car.heading += state.rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2;
        car.turnCooldown = 6;
      }
      const lx = Math.cos(car.heading), lz = -Math.sin(car.heading);
      car.x += (Math.sin(car.heading) * car.speed + lx * car.lane * 0.4) * dt;
      car.z += (Math.cos(car.heading) * car.speed + lz * car.lane * 0.4) * dt;
      car.y = groundHeightAt(car.x, car.z);
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
    // Round 10 — the walk cycle: the stride phase advances with speed,
    // so the renderer can swing arms and legs instead of sliding a
    // frozen figure across the sidewalk.
    ped.walkPhase = (ped.walkPhase || 0) + ped.speed * dt * 3.2;
    if (Math.abs(ped.x) > 220 || Math.abs(ped.z) > 220) ped.dir += Math.PI;
    if (state.rng.next() < dt * 0.02) ped.dir += (state.rng.next() - 0.5) * 1.6;
  }
}

function updateFerry(state, dt) {
  const f = state.ferry;
  f.timer += dt;
  if (f.docked && f.timer > FERRY.intervalSec) {
    f.docked = false; f.leg = 0; f.t = 0;
    // Round 10 — the ferry sounds its horn as it leaves the pier;
    // main.js watches hornBlast and plays it once.
    f.hornBlast = true;
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
  updatePursuit(state, dt);
  updatePedFlee(state, dt);
  updateParticles(state, dt);
  updateFerry(state, dt);
  updateWeather(state, dt);
  updateCoins(state);
  updateMission(state, dt);
  // Round 10 — heat, near misses, side jobs, ferry rides and the dusk
  // moment all tick here, after the core simulation has moved.
  updateHeat(state, dt);
  checkNearMiss(state);
  updateSideJob(state, dt);
  updateFerryRide(state, dt);
  updateIdleHints(state, input, dt);
  updateBusinessLevels(state);
  state.stats.topSpeed = Math.max(state.stats.topSpeed, Math.abs(p.speed || 0));
  if (!state.duskToasted && state.dayTime >= LIGHT.duskStart) {
    state.duskToasted = true;
    toast(state, 'Dusk over Vesper City — the neon and the beacons are on.', 4);
  }
  if (state.dayTime < LIGHT.duskStart) state.duskToasted = false;
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

// ---------------------------------------------------------------------------
// Round 10 systems: side jobs, near misses, wanted heat, ferry rides.
// ---------------------------------------------------------------------------

// Start a side job (taxi, courier, vigilante, tour). One at a time; the
// timer runs in updateSideJob and the payout lands on completion.
export function doSideJob(state, id) {
  const job = SIDE_JOBS.find(j => j.id === id);
  if (!job) return false;
  if (state.sideJob) { toast(state, `Finish the ${state.sideJob.name} first.`, 2); return false; }
  if (!state.player.inCar) { toast(state, 'You need a car for side jobs.', 2); return false; }
  state.sideJob = { ...job, left: job.time, startX: state.player.x, startZ: state.player.z };
  toast(state, `${job.name} — ${job.brief} ($${job.pay})`, 4);
  return true;
}

function updateSideJob(state, dt) {
  const job = state.sideJob;
  if (!job) return;
  job.left -= dt;
  if (job.left <= 0) {
    state.sideJob = null;
    toast(state, `${job.name} failed — out of time.`, 3);
    return;
  }
  // Taxi and tour pay out once Mara has driven far enough from the
  // start; courier pays at Tide Market; vigilante pays on a police-free
  // stretch after ramming speed. The distance rule keeps every job
  // completable by driving, with no new UI to learn.
  const moved = Math.hypot(state.player.x - job.startX, state.player.z - job.startZ);
  const courierDone = job.id === 'courier' && dist2(state.player.x, state.player.z, 90, -170) < 900;
  const driveDone = (job.id === 'taxi' || job.id === 'tour') && moved > 260;
  const vigilanteDone = job.id === 'vigilante' && Math.abs(state.player.speed || 0) > 40 && state.police.length === 0;
  if (courierDone || driveDone || vigilanteDone) {
    state.player.cash += job.pay;
    state.respect += 40;
    state.stats.sideJobsDone++;
    state.sideJob = null;
    toast(state, `${job.name} complete — +$${job.pay}, +40 respect.`, 4);
  }
}

// A near miss: Mara flashes past a traffic car at speed, close enough
// to feel it and far enough to live. +10 respect, once per pass.
function checkNearMiss(state) {
  const p = state.player;
  if (!p.inCar || Math.abs(p.speed || 0) < 22) return;
  for (const car of state.cars) {
    if (car.isPlayer || car.isPolice) continue;
    const d = Math.hypot(car.x - p.x, car.z - p.z);
    if (d > 2.6 && d < 4.2 && !car._nearMissed) {
      car._nearMissed = true;
      state.respect += 10;
      state.stats.nearMisses++;
      toast(state, 'Near miss! +10 respect.', 2);
    }
    if (d > 12) car._nearMissed = false;
  }
}

// Wanted heat: the chase burns hotter while Mara speeds with police
// close, and cools while she hides slow and far from every unit. When
// heat hits zero, the stars start falling one by one.
function updateHeat(state, dt) {
  const p = state.player;
  if (p.wanted === 0) { state.heat = 0; return; }
  let nearest = 1e9;
  for (const c of state.police) nearest = Math.min(nearest, Math.hypot(c.x - p.x, c.z - p.z));
  const hiding = Math.abs(p.speed || 0) < HEAT.hideSpeed && nearest > HEAT.hideRange;
  if (hiding) {
    state.heat = Math.max(0, state.heat - HEAT.coolSpeed * dt);
  } else {
    state.heat = Math.min(100, state.heat + HEAT.riseSpeed * dt * clamp(Math.abs(p.speed || 0) / 30, 0.3, 1));
  }
  if (state.heat <= 0 && p.wanted > 0 && state.time % 8 < dt) {
    p.wanted = Math.max(0, p.wanted - 1);
    state.heat = 25;
    spawnPolice(state);
    if (p.wanted === 0) toast(state, 'Clean getaway — VCPD lost you.', 3);
  }
}

// Ferry riding: walk onto the pier while the ferry is docked and Mara
// steps aboard; she rides it across the strait standing on the deck,
// and steps off at the isle dock when it arrives.
function updateFerryRide(state, dt) {
  const p = state.player;
  const f = state.ferry;
  if (!state.onFerry) {
    if (!p.inCar && f.docked && dist2(p.x, p.z, f.x, f.z) < 400) {
      state.onFerry = true;
      toast(state, 'Aboard the ferry — enjoy the sunset crossing.', 3);
    }
    return;
  }
  // Ride the deck: Mara's position follows the ferry exactly.
  p.x = f.x; p.z = f.z; p.y = 8; p.heading = f.heading;
  if (f.docked && f.leg >= 3) {
    state.onFerry = false;
    p.x = f.x + 20; p.z = f.z + 10; p.y = 0;
    toast(state, 'Welcome to Ember Isle — Black Sand Beach.', 4);
  }
  // Boarding a car on deck parks it with her (the shot staging does the
  // same thing by hand, so the ferry shot and free play agree).
  if (p.car) { p.car.x = f.x; p.car.z = f.z; p.car.y = 8; }
}

// Round 10 — the PIT maneuver: a police cruiser that pulls alongside
// Mara at speed swings into her rear quarter, spinning her heading and
// scrubbing her speed, while a cruiser tucked right behind her rams.
// This is what makes a 5-star chase feel like a chase instead of a
// parade — the tail is not just following, it is trying to end the run.
function updatePursuit(state, dt) {
  const p = state.player;
  if (!p.inCar || p.wanted < 2) return;
  for (const car of state.police) {
    const dx = p.x - car.x, dz = p.z - car.z;
    const d = Math.hypot(dx, dz);
    if (d > 7 || d < 0.5) continue;
    const pSpeed = Math.abs(p.speed || 0);
    if (pSpeed < 12) continue;
    // Alongside (lateral offset bigger than the gap ahead): PIT.
    const fx = Math.sin(p.heading), fz = Math.cos(p.heading);
    const along = dx * fx + dz * fz;
    const across = Math.abs(dx * fz - dz * fx);
    if (across > 2 && Math.abs(along) < 4) {
      const side = (dx * fz - dz * fx) > 0 ? 1 : -1;
      p.heading += side * 0.9 * dt;
      if (p.car) p.car.heading = p.heading;
      p.speed *= (1 - 0.8 * dt);
      if (p.car) p.car.speed = p.speed;
      if (state.rng.next() < dt * 0.4) {
        toast(state, 'PIT maneuver! VCPD spun your rear quarter.', 2);
      }
    } else if (along < -1 && along > -6) {
      // Right behind: a ram that shoves Mara's speed down and costs health.
      p.speed *= (1 - 0.6 * dt);
      if (p.car) p.car.speed = p.speed;
      if (state.rng.next() < dt * 0.25) {
        p.health = Math.max(0, p.health - 2);
      }
    }
  }
}

// Round 10 — frightened pedestrians: at wanted 3+, anyone close to Mara
// breaks into a run away from her, arms pumping (the walk phase spins
// faster), and calms back to a stroll once the chase has passed.
function updatePedFlee(state, dt) {
  const p = state.player;
  for (const ped of state.peds) {
    const d = Math.hypot(ped.x - p.x, ped.z - p.z);
    if (p.wanted >= 3 && d < 14) {
      const away = Math.atan2(ped.x - p.x, ped.z - p.z);
      ped.dir = angleLerp(ped.dir, away, dt * 3);
      ped.speed = Math.max(ped.speed || 0, 4.2);
      ped.walkPhase = (ped.walkPhase || 0) + dt * 7;
      ped.fleeing = true;
    } else if (ped.fleeing) {
      ped.speed = 1.2;
      ped.fleeing = false;
    }
  }
}

// Round 10 — idle hints: if Mara stands still with no input for 20
// seconds, the game rotates a helpful nudge (side jobs, map, business,
// garage, coins, ferry) instead of leaving her staring at the street.
function updateIdleHints(state, input, dt) {
  const moving = input.up || input.down || input.left || input.right || input.handbrake || Math.abs(state.player.speed || 0) > 2;
  if (moving) { state.idleTime = 0; return; }
  state.idleTime += dt;
  if (state.idleTime > 20) {
    state.idleTime = 0;
    toast(state, HINTS[state.hintIndex % HINTS.length], 4);
    state.hintIndex++;
  }
}

// Round 10 — businesses grow with Mara's story: every five missions
// completed, each owned business earns one more level of income, so the
// early diner keeps paying better as she becomes Queen of Ember.
function updateBusinessLevels(state) {
  const level = 1 + Math.floor(state.stats.missionsDone / 5);
  for (const b of state.businesses) {
    if (b.level < level) {
      b.level = level;
      toast(state, `${b.name} grew to level ${level} — income up.`, 3);
    }
  }
}
