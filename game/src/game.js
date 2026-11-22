// Vesper City: Ember Isle — the simulation. No drawing and no browser in here
// except localStorage for saves: the player (on foot and in cars), traffic,
// VCPD + Ember Patrol, the ferry, 20 story missions, races, businesses, the
// garage, weapons, radio state, weather, Sun Coins and wanted levels.
// step() advances one fixed 1/60 s step and returns event flags.
import {
  STEP, CITY, ISLAND, PIER, FERRY_ROUTE, MISSIONS, MISSION_POINTS, RACES,
  BUSINESSES, VEHICLES, WEAPONS, RADIO, COP_UNITS, ISLAND_PATROL, PLAYER,
  SUN_COINS, SAVE_KEY, DIALOGUE,
} from './config.js';
import { buildWorld } from './world.js';

export const EVENT_COIN = 1;
export const EVENT_MISSION = 2;
export const EVENT_WASTED = 4;
export const EVENT_BUSTED = 8;
export const EVENT_CASH = 16;

const TAU = Math.PI * 2;
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function dist2(ax, az, bx, bz) { const dx = ax - bx, dz = az - bz; return dx * dx + dz * dz; }
function angDiff(a, b) {
  let d = (a - b) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}
function onIsland(x, z) {
  return dist2(x, z, ISLAND.x, ISLAND.z) < 235 * 235;
}
function inCity(x, z) {
  return Math.abs(x) < CITY.half && Math.abs(z) < CITY.half;
}
function inLane(x, z) {
  return x > -770 && x < -370 && Math.abs(z) < 100;
}

export function createGame(random) {
  const world = buildWorld(random);
  const state = {
    time: 0, dayT: 0.72, storm: 0, lightning: 0,
    cash: 500, health: PLAYER.health, wanted: 0, wantedTimer: 0,
    weapon: 1, weaponTimer: 0, tracer: 0, tracerFrom: null, tracerTo: null,
    mission: 0, waypoint: 0, missionTimer: 0, chaseHold: 0,
    coins: 0, coinsTaken: 0, rank: 'Street Rookie',
    standing: {}, owned: [], garage: { engine: 0, armour: 0, tyres: 0, nitro: 0, chrome: 0 },
    station: 0, radioOn: true,
    busted: 0, wasted: 0, screen: 'title',
    ferry: { t: 0.02, dir: 1, x: FERRY_ROUTE.from.x, z: FERRY_ROUTE.from.z, aboard: false, ox: 0, oz: 0 },
    player: {
      x: world.spawn.x, z: world.spawn.z, yaw: world.spawn.yaw, speed: 0,
      onFoot: true, car: null, px: world.spawn.x, pz: world.spawn.z, pyaw: world.spawn.yaw,
    },
    cars: [], traffic: [], cops: [], heli: null, peds: [], pickups: [],
    rival: null, roadblock: null, spike: null, toast: '', toastT: 0,
    race: null, raceTime: 0, raceBest: 0,
    minimap: { x: 0, z: 0 },
  };
  for (const d of [...Array(15).keys()]) state.standing[d] = 0;

  function toast(msg, t) {
    state.toast = msg;
    state.toastT = t || 3.5;
  }

  // ---- cars ----
  function makeCar(x, z, yaw, model, owned) {
    return {
      x, z, yaw, speed: 0, model, owned: !!owned, health: 100,
      color: VEHICLES[model].color, w: 4.6, l: 9.2, driver: owned ? 'player' : 'traffic',
    };
  }
  function spawnParked() {
    state.cars = [];
    const spots = [
      [-42, -252, 0], [84, -294, 1], [-252, -126, 2], [252, -126, 3], [-168, 126, 4],
      [294, 84, 0], [-294, 42, 1], [126, 294, 2], [-42, 210, 3], [210, -294, 4],
      [-880, 240, 0], [-800, 200, 4], [-1060, 210, 1], [-740, 120, 2],
    ];
    for (const [x, z, m] of spots) state.cars.push(makeCar(x, z, random() * TAU, m, false));
    // Mara's Sunset GT waits near the start, on the street.
    state.cars.push(makeCar(-42, -238, Math.PI, 0, true));
  }
  function spawnTraffic() {
    state.traffic = [];
    for (let i = 0; i < 14; i += 1) {
      const x = -340 + random() * 680;
      const z = -340 + random() * 680;
      const car = makeCar(x, z, (Math.floor(random() * 4) * Math.PI) / 2, Math.floor(random() * 5), false);
      car.speed = 10 + random() * 8;
      car.axis = random() < 0.5 ? 'x' : 'z';
      state.traffic.push(car);
    }
  }
  function spawnPeds() {
    state.peds = [];
    for (let i = 0; i < 24; i += 1) {
      const x = -340 + random() * 680;
      const z = -340 + random() * 680;
      state.peds.push({
        x, z, yaw: random() * TAU, speed: 1.2 + random(), flee: 0,
        color: [random(), random() * 0.7, random() * 0.8 + 0.2], health: 100,
      });
    }
    for (let i = 0; i < 10; i += 1) {
      const a = random() * TAU;
      state.peds.push({
        x: ISLAND.x + Math.cos(a) * (60 + random() * 120),
        z: ISLAND.z + Math.sin(a) * (60 + random() * 120),
        yaw: random() * TAU, speed: 1 + random(), flee: 0,
        color: [random(), 0.5 + random() * 0.5, random() * 0.5], health: 100,
      });
    }
  }

  // ---- collisions: circle vs building AABBs, push out ----
  function collide(x, z, r) {
    for (const c of world.colliders) {
      if (x + r < c.x0 || x - r > c.x1 || z + r < c.z0 || z - r > c.z1) continue;
      const dxl = x - c.x0, dxr = c.x1 - x, dzl = z - c.z0, dzr = c.z1 - z;
      const m = Math.min(dxl, dxr, dzl, dzr);
      if (m === dxl) x = c.x0 - r;
      else if (m === dxr) x = c.x1 + r;
      else if (m === dzl) z = c.z0 - r;
      else z = c.z1 + r;
    }
    return [x, z];
  }
  function landOk(x, z) {
    return inCity(x, z) || onIsland(x, z) || inLane(x, z);
  }

  // ---- missions ----
  function currentMission() {
    return MISSIONS[Math.min(state.mission, MISSIONS.length - 1)];
  }
  function missionTarget() {
    const m = currentMission();
    const pts = MISSION_POINTS[m.id] || [[0, 0]];
    return pts[Math.min(state.waypoint, pts.length - 1)];
  }
  function startMissionPickups() {
    const m = currentMission();
    state.pickups = [];
    if (m.verb === 'collect' || m.verb === 'deliver') {
      const pts = MISSION_POINTS[m.id] || [];
      for (const [x, z] of pts) state.pickups.push({ x, z, taken: false });
    }
    if (m.verb === 'chase') {
      const [x, z] = missionTarget();
      state.rival = makeCar(x + 20, z, 0, 4, false);
      state.rival.speed = 26;
      state.rival.flee = true;
    } else state.rival = null;
    if (m.verb === 'escape' && state.wanted < 2) state.wanted = 2;
    state.missionTimer = 0;
    state.chaseHold = 0;
  }
  function completeMission() {
    const m = currentMission();
    state.cash += m.cash;
    const district = m.place;
    state.standing[district] = (state.standing[district] || 0) + 1;
    state.rank = state.mission >= 19 ? 'Queen of Ember' : state.mission >= 11 ? 'Ember Royalty'
      : state.mission >= 5 ? 'Vesper Rising' : 'Street Rookie';
    toast(`Mission complete: ${m.name} — +$${m.cash}`, 4);
    state.mission = Math.min(state.mission + 1, MISSIONS.length - 1);
    state.waypoint = 0;
    state.wanted = Math.max(0, state.wanted - 2);
    saveGame(true);
    startMissionPickups();
    return EVENT_MISSION | EVENT_CASH;
  }
  function advanceWaypoint() {
    const m = currentMission();
    const pts = MISSION_POINTS[m.id] || [];
    state.waypoint += 1;
    if (state.waypoint >= pts.length) return completeMission();
    toast(`Next: head to the marker`, 2.5);
    return 0;
  }

  // ---- police ----
  function wantedMax() {
    return onIsland(state.player.x, state.player.z) ? 4 : 6;
  }
  function spawnCop() {
    const p = state.player;
    const a = random() * TAU;
    const x = clamp(p.x + Math.cos(a) * 90, -360, 360);
    const z = clamp(p.z + Math.sin(a) * 90, -360, 360);
    const unit = onIsland(p.x, p.z)
      ? ISLAND_PATROL[state.cops.length % ISLAND_PATROL.length]
      : COP_UNITS[state.cops.length % COP_UNITS.length];
    const cop = makeCar(x, z, 0, 5, false);
    cop.unit = unit.name;
    cop.tactic = unit.tactic;
    cop.speed = 20;
    state.cops.push(cop);
  }
  function updateCops(dt) {
    const p = state.player;
    const want = Math.min(state.wanted, wantedMax());
    while (state.cops.length < want) spawnCop();
    while (state.cops.length > want) state.cops.pop();
    for (const cop of state.cops) {
      const dx = p.x - cop.x, dz = p.z - cop.z;
      const d = Math.hypot(dx, dz) || 1;
      const targetYaw = Math.atan2(dx, dz);
      cop.yaw += clamp(angDiff(targetYaw, cop.yaw), -2.2 * dt, 2.2 * dt);
      const top = 46 + state.wanted * 2;
      cop.speed = clamp(cop.speed + (cop.tactic === 'ram' ? 30 : 24) * dt, 0, top);
      const nx = cop.x + Math.sin(cop.yaw) * cop.speed * dt;
      const nz = cop.z + Math.cos(cop.yaw) * cop.speed * dt;
      const [cx, cz] = collide(nx, nz, 2.4);
      if (landOk(cx, cz)) { cop.x = cx; cop.z = cz; }
      // Ram the player.
      if (d < 7 && !p.onFoot) {
        state.health -= 6 * dt * 10;
        p.speed *= 0.985;
        if (state.health <= 0) return EVENT_WASTED;
      }
      // Bust on foot.
      if (d < 3 && p.onFoot) {
        state.busted += dt;
        if (state.busted > 2) {
          const fine = Math.min(state.cash, 300);
          state.cash -= fine;
          state.wanted = 0;
          state.cops = [];
          state.busted = 0;
          state.player.x = -300; state.player.z = -180;
          state.player.onFoot = true; state.player.car = null;
          toast(`BUSTED by VCPD — fined $${fine}`, 4);
          return EVENT_BUSTED;
        }
      }
    }
    // Helicopter at wanted 3+.
    if (state.wanted >= 3 && !state.heli) state.heli = { x: p.x, z: p.z, a: 0 };
    if (state.wanted < 3) state.heli = null;
    if (state.heli) {
      state.heli.a += dt * 0.5;
      state.heli.x = p.x + Math.cos(state.heli.a) * 40;
      state.heli.z = p.z + Math.sin(state.heli.a) * 40;
    }
    // Roadblock at wanted 4+: two cruisers parked across the road ahead.
    if (state.wanted >= 4 && !state.roadblock) {
      state.roadblock = { x: p.x + Math.sin(p.yaw) * 70, z: p.z + Math.cos(p.yaw) * 70 };
    }
    if (state.wanted < 4) state.roadblock = null;
    return 0;
  }

  // ---- ferry ----
  function ferryPos(t) {
    const s = t < 0.5 ? t * 2 : (1 - t) * 2;
    const e = s * s * (3 - 2 * s); // smoothstep
    return {
      x: FERRY_ROUTE.from.x + (FERRY_ROUTE.to.x - FERRY_ROUTE.from.x) * e,
      z: FERRY_ROUTE.from.z + (FERRY_ROUTE.to.z - FERRY_ROUTE.from.z) * e,
    };
  }
  function updateFerry(dt) {
    const f = state.ferry;
    f.t += (dt / FERRY_ROUTE.period) * f.dir;
    if (f.t >= 1) { f.t = 1; f.dir = -1; }
    if (f.t <= 0) { f.t = 0; f.dir = 1; }
    const pos = ferryPos(f.t);
    f.x = pos.x; f.z = pos.z;
    if (f.aboard) {
      state.player.x = f.x + f.ox;
      state.player.z = f.z + f.oz;
    }
  }
  function boardFerry() {
    const f = state.ferry;
    const p = state.player;
    if (!f.aboard && dist2(p.x, p.z, f.x, f.z) < 16 * 16 && p.onFoot) {
      const docked = f.t < 0.06 || f.t > 0.94;
      if (!docked) { toast('Ferry is mid-crossing — wait at the pier', 2.5); return; }
      if (state.owned.length === 0 && state.cash < FERRY_ROUTE.fare) {
        toast('Ferry fare $50 — not enough cash', 2.5); return;
      }
      if (state.owned.length === 0) state.cash -= FERRY_ROUTE.fare;
      f.aboard = true; f.ox = 0; f.oz = 0;
      toast(state.owned.length ? 'Ferry boarding — free for business owners' : 'Ferry ticket $50 — crossing to Ember Isle', 3);
    } else if (f.aboard) {
      const docked = f.t < 0.06 || f.t > 0.94;
      if (docked) {
        f.aboard = false;
        const near = dist2(f.x, f.z, FERRY_ROUTE.from.x, FERRY_ROUTE.from.z)
          < dist2(f.x, f.z, FERRY_ROUTE.to.x, FERRY_ROUTE.to.z);
        p.x = near ? FERRY_ROUTE.from.x + 8 : FERRY_ROUTE.to.x + 8;
        p.z = near ? FERRY_ROUTE.from.z : FERRY_ROUTE.to.z;
        toast(near ? 'Back in Vesper City' : 'Welcome to Ember Isle', 3);
      }
    }
  }

  // ---- shooting ----
  function shoot() {
    const w = WEAPONS[state.weapon];
    if (state.weaponTimer > 0 || state.player.onFoot === false && false) return;
    state.weaponTimer = w.rate;
    const p = state.player;
    const fx = Math.sin(p.yaw), fz = Math.cos(p.yaw);
    state.tracer = 0.12;
    state.tracerFrom = [p.x, 2, p.z];
    state.tracerTo = [p.x + fx * w.range, 2, p.z + fz * w.range];
    let hit = null;
    let best = w.range;
    const targets = [...state.peds, ...state.cops, ...(state.rival ? [state.rival] : [])];
    for (const t of targets) {
      const dx = t.x - p.x, dz = t.z - p.z;
      const along = dx * fx + dz * fz;
      if (along < 0 || along > w.range) continue;
      const perp = Math.abs(dx * fz - dz * fx);
      if (perp < 3 && along < best) { best = along; hit = t; }
    }
    if (hit) {
      hit.health -= w.damage;
      state.tracerTo = [hit.x, 2, hit.z];
      if (hit.health <= 0 && state.peds.includes(hit)) {
        hit.health = 100;
        hit.x = p.x + (random() - 0.5) * 300;
        hit.z = p.z + (random() - 0.5) * 300;
        state.wanted = Math.min(wantedMax(), state.wanted + 1);
      }
    }
  }

  // ---- save ----
  function saveGame(auto) {
    try {
      const data = {
        cash: state.cash, mission: state.mission, coins: state.coinsTaken,
        owned: state.owned, garage: state.garage, station: state.station,
        standing: state.standing, auto: !!auto, time: state.time,
      };
      window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch { /* storage off: session-only */ }
  }
  function loadGame() {
    try {
      const raw = window.localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const d = JSON.parse(raw);
      state.cash = d.cash; state.mission = d.mission; state.coinsTaken = d.coins;
      state.owned = d.owned || []; state.garage = d.garage || state.garage;
      state.station = d.station || 0; state.standing = d.standing || state.standing;
      for (const c of world.coins.slice(0, state.coinsTaken)) c.taken = true;
      state.coins = state.coinsTaken;
      return true;
    } catch { return false; }
  }

  function reset() {
    state.time = 0; state.dayT = 0.72; state.storm = 0;
    state.cash = 500; state.health = PLAYER.health; state.wanted = 0;
    state.mission = 0; state.waypoint = 0; state.coins = 0; state.coinsTaken = 0;
    state.owned = []; state.station = 0; state.cops = []; state.heli = null;
    state.race = null; state.busted = 0; state.wasted = 0;
    state.player.x = world.spawn.x; state.player.z = world.spawn.z;
    state.player.yaw = world.spawn.yaw; state.player.speed = 0;
    state.player.onFoot = true; state.player.car = null;
    for (const c of world.coins) c.taken = false;
    spawnParked(); spawnTraffic(); spawnPeds();
    startMissionPickups();
  }

  function step(dt, input) {
    let events = 0;
    state.time += dt;
    state.dayT = (state.dayT + dt / 240) % 1;
    if (state.toastT > 0) state.toastT -= dt;
    if (state.weaponTimer > 0) state.weaponTimer -= dt;
    if (state.tracer > 0) state.tracer -= dt;
    state.missionTimer += dt;

    // Storms roll in at random and pass after ~40 s.
    if (state.storm <= 0 && random() < dt / 240) { state.storm = 40; toast('Hurricane storm rolling in!', 3); }
    if (state.storm > 0) {
      state.storm -= dt;
      if (random() < dt * 0.5) state.lightning = 0.18;
    }
    if (state.lightning > 0) state.lightning -= dt;

    updateFerry(dt);
    const p = state.player;

    // Business income: one in-game day pays every owned business.
    if (Math.floor(state.time / 240) > Math.floor((state.time - dt) / 240) && state.owned.length) {
      let pay = 0;
      for (const b of state.owned) pay += BUSINESSES[b].income;
      state.cash += pay;
      toast(`Business income +$${pay}`, 3);
      events |= EVENT_CASH;
    }

    // ---- player movement ----
    if (p.onFoot && !state.ferry.aboard) {
      const sp = input.sprint ? PLAYER.runSpeed : PLAYER.walkSpeed;
      let mx = 0, mz = 0;
      if (input.fwd) { mx += Math.sin(p.yaw); mz += Math.cos(p.yaw); }
      if (input.back) { mx -= Math.sin(p.yaw); mz -= Math.cos(p.yaw); }
      if (input.left) p.yaw += 2.6 * dt;
      if (input.right) p.yaw -= 2.6 * dt;
      const nx = p.x + mx * sp * dt, nz = p.z + mz * sp * dt;
      const [cx, cz] = collide(nx, nz, 1);
      if (landOk(cx, cz) || dist2(cx, cz, state.ferry.x, state.ferry.z) < 144) { p.x = cx; p.z = cz; }
    } else if (p.onFoot && state.ferry.aboard) {
      const f = state.ferry;
      if (input.fwd) f.oz += 6 * dt;
      if (input.back) f.oz -= 6 * dt;
      if (input.left) f.ox -= 6 * dt;
      if (input.right) f.ox += 6 * dt;
      f.ox = clamp(f.ox, -9, 9); f.oz = clamp(f.oz, -17, 17);
    } else if (p.car) {
      const car = p.car;
      const top = VEHICLES[car.model].top + state.garage.engine * 6 + (state.garage.nitro ? 10 : 0);
      const acc = VEHICLES[car.model].accel + state.garage.engine * 4;
      if (input.fwd) car.speed += acc * dt;
      if (input.back) car.speed -= (car.speed > 0 ? PLAYER.brake : acc * 0.6) * dt;
      if (!input.fwd && !input.back) car.speed -= Math.sign(car.speed) * 8 * dt;
      car.speed = clamp(car.speed, -PLAYER.maxReverse, top);
      if (Math.abs(car.speed) < 0.2 && !input.fwd && !input.back) car.speed = 0;
      const steer = (input.left ? 1 : 0) - (input.right ? 1 : 0);
      const grip = input.handbrake ? PLAYER.handbrakeGrip : PLAYER.grip;
      // A stopped car can still turn its wheels a little: without a minimum
      // turn rate the car deadlocks mid-turn at speed 0 and never recovers.
      car.yaw += steer * clamp(Math.abs(car.speed) / 20, 0.3, 1) * 1.9 * dt * (car.speed < 0 ? -1 : 1) * (grip / PLAYER.grip + 0.4);
      const nx = car.x + Math.sin(car.yaw) * car.speed * dt;
      const nz = car.z + Math.cos(car.yaw) * car.speed * dt;
      const [cx, cz] = collide(nx, nz, 2.4);
      if (landOk(cx, cz)) {
        if (cx !== nx || cz !== nz) {
          // Only a hard hit hurts: grinding along a wall at low speed is free.
          const impact = Math.abs(car.speed);
          car.speed *= 0.5;
          if (impact > 15) state.health -= (impact - 15) * 0.2;
        }
        car.x = cx; car.z = cz;
      } else car.speed *= 0.6;
      p.x = car.x; p.z = car.z; p.yaw = car.yaw; p.speed = car.speed;
      // Spike strip at wanted 5+.
      if (state.wanted >= 5 && !state.spike) {
        state.spike = { x: p.x + Math.sin(p.yaw) * 50, z: p.z + Math.cos(p.yaw) * 50 };
      }
      if (state.wanted < 5) state.spike = null;
      if (state.spike && dist2(p.x, p.z, state.spike.x, state.spike.z) < 16) {
        car.speed *= 0.4; state.health -= 2; toast('Spike strip! Tyres shredded', 2);
      }
      // Wanted for speeding past a cop.
      if (Math.abs(car.speed) > 45 && state.cops.length && random() < dt * 0.2) {
        state.wanted = Math.min(wantedMax(), state.wanted + 1);
      }
    }

    // ---- edge actions ----
    if (input.enter) {
      if (state.ferry.aboard) boardFerry();
      else if (p.onFoot) {
        let bestCar = null, bestD = 36;
        for (const car of [...state.cars, ...state.traffic]) {
          const d = dist2(p.x, p.z, car.x, car.z);
          if (d < bestD) { bestD = d; bestCar = car; }
        }
        const nearFerry = dist2(p.x, p.z, state.ferry.x, state.ferry.z) < 256;
        if (nearFerry && (state.ferry.t < 0.06 || state.ferry.t > 0.94)) boardFerry();
        else if (bestCar) {
          p.car = bestCar; p.onFoot = false;
          bestCar.driver = 'player';
          if (!bestCar.owned) {
            state.wanted = Math.min(wantedMax(), state.wanted + 1);
            toast(`Stole a ${VEHICLES[bestCar.model].name} — VCPD alerted`, 3);
          }
        }
      } else {
        p.car.driver = 'traffic';
        p.car = null; p.onFoot = true;
        p.x += Math.sin(p.yaw + Math.PI / 2) * 3;
        p.z += Math.cos(p.yaw + Math.PI / 2) * 3;
      }
    }
    if (input.shoot) shoot();
    if (input.weaponWheel) {
      state.weapon = (state.weapon + 1) % WEAPONS.length;
      toast(`Weapon: ${WEAPONS[state.weapon].name}`, 1.5);
    }
    if (input.radio) {
      state.station = (state.station + 1) % RADIO.length;
      toast(`${RADIO[state.station].name} — ${RADIO[state.station].dj}`, 2);
    }
    if (input.business) {
      let near = null, bestD = 100;
      for (let i = 0; i < BUSINESSES.length; i += 1) {
        const b = BUSINESSES[i];
        const d = dist2(p.x, p.z, b.x, b.z);
        if (d < bestD) { bestD = d; near = i; }
      }
      if (near !== null && !state.owned.includes(near)) {
        const b = BUSINESSES[near];
        if (state.cash >= b.price) {
          state.cash -= b.price; state.owned.push(near);
          toast(`Bought ${b.name} — earns $${b.income}/day`, 3.5);
          events |= EVENT_CASH;
        } else toast(`${b.name} costs $${b.price} — you have $${state.cash}`, 3);
      } else if (near !== null) toast('You already own this business', 2);
    }
    if (input.garage) {
      const gx = 300, gz = 40;
      if (dist2(p.x, p.z, gx, gz) < 400 && p.car) {
        const parts = ['engine', 'armour', 'tyres', 'nitro', 'chrome'];
        const part = parts[Math.floor(random() * parts.length)];
        const cost = 400 + state.garage[part] * 300;
        if (state.cash >= cost && state.garage[part] < 3) {
          state.cash -= cost; state.garage[part] += 1;
          toast(`Garage: ${part} upgraded to level ${state.garage[part]}`, 3);
        } else toast('Garage: upgrade maxed or not enough cash', 2);
      } else toast('Garage is in Old Town (300, 40) — bring a car', 2.5);
    }
    if (input.save) { saveGame(false); toast('Game saved — 3 slots, autosave on', 2); }

    // ---- traffic ----
    for (const car of state.traffic) {
      if (car === p.car) continue;
      const fx = Math.sin(car.yaw), fz = Math.cos(car.yaw);
      let nx = car.x + fx * car.speed * dt;
      let nz = car.z + fz * car.speed * dt;
      if (!inCity(nx, nz) && !onIsland(nx, nz)) {
        car.yaw += Math.PI / 2;
        nx = car.x; nz = car.z;
      }
      if (random() < dt * 0.05) car.yaw += (random() < 0.5 ? -1 : 1) * Math.PI / 2;
      const [cx, cz] = collide(nx, nz, 2.4);
      car.x = cx; car.z = cz;
    }

    // ---- pedestrians ----
    for (const ped of state.peds) {
      if (ped.flee > 0) {
        ped.flee -= dt;
        const dx = ped.x - p.x, dz = ped.z - p.z;
        const d = Math.hypot(dx, dz) || 1;
        ped.x += (dx / d) * 5 * dt;
        ped.z += (dz / d) * 5 * dt;
      } else {
        ped.x += Math.sin(ped.yaw) * ped.speed * dt;
        ped.z += Math.cos(ped.yaw) * ped.speed * dt;
        if (random() < dt * 0.1) ped.yaw = random() * TAU;
        if (!landOk(ped.x, ped.z)) { ped.yaw += Math.PI; ped.x += Math.sin(ped.yaw) * 2; ped.z += Math.cos(ped.yaw) * 2; }
      }
      if (dist2(ped.x, ped.z, p.x, p.z) < 9 && state.weaponTimer > 0) ped.flee = 3;
    }

    // ---- rival (chase missions) ----
    if (state.rival) {
      const r = state.rival;
      const dx = r.x - p.x, dz = r.z - p.z;
      const d = Math.hypot(dx, dz) || 1;
      const fleeYaw = Math.atan2(dx, dz);
      r.yaw += clamp(angDiff(fleeYaw, r.yaw), -2 * dt, 2 * dt);
      r.speed = clamp(r.speed + 10 * dt, 0, 50);
      const nx = r.x + Math.sin(r.yaw) * r.speed * dt;
      const nz = r.z + Math.cos(r.yaw) * r.speed * dt;
      const [cx, cz] = collide(nx, nz, 2.4);
      if (landOk(cx, cz)) { r.x = cx; r.z = cz; }
      if (d < 12) {
        state.chaseHold += dt;
        if (state.chaseHold > 4) { state.rival = null; events |= advanceWaypoint(); }
      } else state.chaseHold = Math.max(0, state.chaseHold - dt);
    }

    // ---- wanted decay ----
    if (state.wanted > 0) {
      state.wantedTimer += dt;
      if (state.cops.length === 0 && state.wantedTimer > 8) {
        state.wanted -= 1; state.wantedTimer = 0;
        if (state.wanted === 0) toast('You lost the heat', 2.5);
      }
    } else state.wantedTimer = 0;

    // ---- coins ----
    for (const c of world.coins) {
      if (!c.taken && dist2(p.x, p.z, c.x, c.z) < 12) {
        c.taken = true; state.coins += 1; state.coinsTaken += 1; state.cash += 50;
        events |= EVENT_COIN | EVENT_CASH;
        if (state.coins % 10 === 0) toast(`Sun Coins: ${state.coins}/${SUN_COINS} — +$50`, 2.5);
      }
    }

    // ---- mission progress ----
    const m = currentMission();
    if (m.verb === 'collect' || m.verb === 'deliver') {
      let done = true;
      for (const pk of state.pickups) {
        if (!pk.taken && dist2(p.x, p.z, pk.x, pk.z) < 100) { pk.taken = true; toast('Pickup collected', 2); }
        if (!pk.taken) done = false;
      }
      if (done && state.pickups.length) events |= completeMission();
    } else if (m.verb !== 'chase' || !state.rival) {
      const [tx, tz] = missionTarget();
      if (dist2(p.x, p.z, tx, tz) < 144) {
        if (m.verb === 'escape' && state.wanted > 0) {
          if (state.wantedTimer > 5) events |= advanceWaypoint();
        } else events |= advanceWaypoint();
      }
    }

    // ---- race mode (side jobs, J) ----
    if (input.jobs && !state.race) {
      const race = RACES[Math.floor(random() * RACES.length)];
      state.race = { ...race, cp: 0, time: 0 };
      toast(`Race: ${race.name} — ${race.laps} laps, entry $${race.entry}`, 3);
    }
    if (state.race) {
      state.race.time += dt;
      const cps = MISSION_POINTS[11];
      const [tx, tz] = cps[state.race.cp % cps.length];
      if (dist2(p.x, p.z, tx, tz) < 144) {
        state.race.cp += 1;
        if (state.race.cp >= cps.length * state.race.laps) {
          const prize = state.race.entry * 5;
          state.cash += prize;
          toast(`Race won! +$${prize} in ${state.race.time.toFixed(1)}s`, 4);
          state.raceBest = state.race.time;
          state.race = null;
          events |= EVENT_CASH;
        }
      }
    }

    // ---- police update ----
    const copEvent = updateCops(dt);
    events |= copEvent;
    if (copEvent & EVENT_WASTED) {
      state.health = PLAYER.health;
      state.wanted = 0; state.cops = []; state.heli = null;
      state.cash = Math.max(0, state.cash - 200);
      state.player.x = 60; state.player.z = -300;
      state.player.onFoot = true; state.player.car = null;
      toast('WASTED — woke up at Vesper General, -$200', 4);
    }

    // Health regen on foot, slow.
    if (p.onFoot && state.health < PLAYER.health) state.health = Math.min(PLAYER.health, state.health + 2 * dt);

    state.minimap.x = p.x; state.minimap.z = p.z;
    return events;
  }

  // ---- rendering: statics + every dynamic box, then the camera ----
  function render(renderer) {
    const p = state.player;
    for (const s of world.statics) {
      renderer.box(s[0], s[1], s[2], s[3], s[4], s[5], [s[6], s[7], s[8]], s[9] === 1, s[10]);
    }
    // Volcano smoke: five dark boxes drifting above the crater with the pulse.
    const pulse = 0.5 + 0.5 * Math.sin(state.time * 0.8);
    for (let i = 0; i < 5; i += 1) {
      const sy = ISLAND.volcanoH + 12 + i * 14 + pulse * 6;
      renderer.box(ISLAND.x + Math.sin(state.time * 0.3 + i * 1.7) * 18, sy, ISLAND.z + Math.cos(state.time * 0.22 + i) * 14,
        16 + i * 4, 9, 16 + i * 4, [0.22, 0.2, 0.2], false, 0);
    }
    // Lava sparks while the volcano is erupting (pulse high).
    if (pulse > 0.72) {
      for (let i = 0; i < 10; i += 1) {
        const a = (i / 10) * TAU + state.time;
        renderer.box(ISLAND.x + Math.cos(a) * 30, ISLAND.volcanoH + 8 + (i % 3) * 7,
          ISLAND.z + Math.sin(a) * 30, 2.5, 2.5, 2.5, [1.0, 0.6, 0.1], true, 0);
      }
    }
    // Ferry: big hull, cabin, funnel, deck lights, flag, foam wake.
    const f = state.ferry;
    const fyaw = Math.atan2(FERRY_ROUTE.to.x - FERRY_ROUTE.from.x, FERRY_ROUTE.to.z - FERRY_ROUTE.from.z);
    const fwdX = Math.sin(fyaw), fwdZ = Math.cos(fyaw);
    const sideX = Math.cos(fyaw), sideZ = -Math.sin(fyaw);
    renderer.box(f.x, 2.5, f.z, 22, 5, 40, [0.94, 0.94, 0.96], false, fyaw);
    renderer.box(f.x, 5.5, f.z, 22.5, 1, 40.5, [0.15, 0.35, 0.65], false, fyaw);
    renderer.box(f.x, 0.9, f.z, 22.4, 1.4, 40.4, [0.6, 0.15, 0.1], false, fyaw);
    // Portholes along both sides of the hull.
    for (let i = 0; i < 5; i += 1) {
      const along = -15 + i * 7.5;
      for (const s of [-1, 1]) {
        renderer.box(f.x + sideX * s * 11.2 + fwdX * along, 3, f.z + sideZ * s * 11.2 + fwdZ * along,
          0.6, 1.6, 1.6, [0.12, 0.18, 0.28], false, fyaw);
      }
    }
    renderer.box(f.x, 8, f.z, 16, 6, 28, [0.96, 0.96, 0.94], false, fyaw);
    renderer.box(f.x, 12, f.z, 12, 4, 18, [0.85, 0.75, 0.6], false, fyaw);
    // Lit window strips along both sides of the cabin, gold and noFog.
    for (const s of [-1, 1]) {
      renderer.box(f.x + sideX * s * 8.2, 9, f.z, 0.8, 1.8, 24, [1.0, 0.8, 0.35], true, fyaw);
    }
    renderer.box(f.x + 5, 14.5, f.z - 8, 4, 7, 4, [0.9, 0.25, 0.15], false, fyaw);
    renderer.box(f.x - 7, 11.5, f.z + 8, 2, 2, 2, [1.0, 0.8, 0.3], true, fyaw);
    renderer.box(f.x + 7, 11.5, f.z + 8, 2, 2, 2, [1.0, 0.8, 0.3], true, fyaw);
    renderer.box(f.x, 16, f.z + 14, 0.6, 8, 0.6, [0.3, 0.3, 0.3], false, fyaw);
    renderer.box(f.x, 19, f.z + 14, 6, 3.5, 0.6, [0.95, 0.3, 0.2], false, fyaw);
    const wx = f.x - Math.sin(fyaw) * 34, wz = f.z - Math.cos(fyaw) * 34;
    renderer.box(wx, 0.2, wz, 7, 0.5, 11, [0.9, 0.93, 0.95], false, fyaw);
    renderer.box(wx - Math.sin(fyaw) * 11, 0.2, wz - Math.cos(fyaw) * 11, 5, 0.5, 8, [0.9, 0.93, 0.95], false, fyaw);
    // Cars: parked + traffic + cops + rival.
    const drawCar = (car, isPlayer) => {
      const top = isPlayer && state.garage.chrome ? [1.0, 0.85, 0.4] : car.color;
      renderer.box(car.x, 1.6, car.z, car.w, 2.2, car.l, top, false, car.yaw);
      renderer.box(car.x, 3.4, car.z - Math.cos(car.yaw) * 0.5, car.w * 0.78, 1.8, car.l * 0.5,
        [0.12, 0.14, 0.2], false, car.yaw);
      renderer.box(car.x, 3.6, car.z + Math.cos(car.yaw) * car.l * 0.32, car.w * 0.8, 1.2, 0.8,
        [0.7, 0.85, 0.95], false, car.yaw);
      const wy = Math.sin(car.yaw), wz = Math.cos(car.yaw);
      const px = Math.cos(car.yaw), pz = -Math.sin(car.yaw);
      for (const s of [-1, 1]) for (const t of [-0.32, 0.32]) {
        renderer.box(car.x + px * s * 2.1 + wy * t * car.l, 1, car.z + pz * s * 2.1 + wz * t * car.l,
          1.4, 1.6, 1.4, [0.05, 0.05, 0.06], false, 0);
      }
      if (car.model === 5) { // VCPD cruiser: light bar flashing red/blue
        const flash = Math.floor(state.time * 4) % 2 === 0;
        renderer.box(car.x, 4.6, car.z, 2.4, 0.9, 1.4, flash ? [1.0, 0.1, 0.1] : [0.15, 0.3, 1.0], true, car.yaw);
        renderer.box(car.x, 1.6, car.z, car.w + 0.2, 0.9, car.l * 0.4, [0.95, 0.95, 0.95], false, car.yaw);
      }
    };
    for (const car of state.cars) drawCar(car, car === p.car);
    for (const car of state.traffic) drawCar(car, car === p.car);
    for (const cop of state.cops) drawCar(cop, false);
    if (state.rival) drawCar(state.rival, false);
    // Roadblock + spike strip.
    if (state.roadblock) {
      renderer.box(state.roadblock.x, 1.6, state.roadblock.z, 4.6, 2.2, 9, [0.08, 0.08, 0.1], false, 0);
      renderer.box(state.roadblock.x + 6, 1.6, state.roadblock.z, 4.6, 2.2, 9, [0.08, 0.08, 0.1], false, 0);
      renderer.box(state.roadblock.x + 3, 4.4, state.roadblock.z, 2, 0.8, 1.2, [1.0, 0.1, 0.1], true, 0);
    }
    if (state.spike) {
      renderer.box(state.spike.x, 0.6, state.spike.z, 10, 0.8, 2, [0.7, 0.7, 0.75], false, 0);
    }
    // Helicopter.
    if (state.heli) {
      renderer.box(state.heli.x, 55, state.heli.z, 8, 3, 12, [0.1, 0.12, 0.16], false, state.heli.a);
      renderer.box(state.heli.x, 57.5, state.heli.z, 18, 0.5, 1.2, [0.2, 0.2, 0.22], false, state.heli.a + state.time * 9);
      renderer.box(state.heli.x, 53, state.heli.z, 2, 2, 2, [1.0, 0.2, 0.2], true, 0);
    }
    // Player on foot.
    if (p.onFoot) {
      renderer.box(p.x, 1.8, p.z, 1.6, 3.6, 1.2, [0.85, 0.3, 0.25], false, p.yaw);
      renderer.box(p.x, 4.2, p.z, 1.3, 1.3, 1.1, [0.95, 0.75, 0.6], false, p.yaw);
      renderer.box(p.x, 3.1, p.z, 1.9, 0.8, 1.3, [0.15, 0.15, 0.18], false, p.yaw);
    }
    // Pedestrians.
    for (const ped of state.peds) {
      if (Math.abs(ped.x - p.x) > 220 && Math.abs(ped.z - p.z) > 220) continue;
      renderer.box(ped.x, 1.7, ped.z, 1.4, 3.4, 1, ped.color, false, ped.yaw);
      renderer.box(ped.x, 3.9, ped.z, 1.1, 1.1, 0.9, [0.9, 0.72, 0.58], false, ped.yaw);
    }
    // Sun Coins: spinning gold boxes.
    for (const c of world.coins) {
      if (c.taken) continue;
      if (Math.abs(c.x - p.x) > 200 && Math.abs(c.z - p.z) > 200) continue;
      renderer.box(c.x, c.y + Math.sin(state.time * 2 + c.x) * 0.5, c.z, 2, 2, 0.7,
        [1.0, 0.8, 0.2], true, state.time * 2);
    }
    // Mission pickups + waypoint beacon.
    for (const pk of state.pickups) {
      if (pk.taken) continue;
      renderer.box(pk.x, 2, pk.z, 4, 4, 4, [1.0, 0.65, 0.1], true, state.time);
      renderer.box(pk.x, 12, pk.z, 2, 20, 2, [1.0, 0.8, 0.3], true, 0);
    }
    const [tx, tz] = missionTarget();
    renderer.box(tx, 25, tz, 3, 50, 3, [1.0, 0.75, 0.2], true, 0);
    renderer.box(tx, 1.5, tz, 10, 1, 10, [1.0, 0.75, 0.2], true, 0);
    // Businesses for sale: green markers.
    for (let i = 0; i < BUSINESSES.length; i += 1) {
      if (state.owned.includes(i)) continue;
      const b = BUSINESSES[i];
      if (Math.abs(b.x - p.x) > 200 && Math.abs(b.z - p.z) > 200) continue;
      renderer.box(b.x, 8, b.z, 2, 14, 2, [0.2, 0.9, 0.3], true, 0);
      renderer.box(b.x, 1.5, b.z, 8, 1, 8, [0.2, 0.9, 0.3], true, 0);
    }
    // Weapon tracer.
    if (state.tracer > 0 && state.tracerFrom && state.tracerTo) {
      const [fx, fy, fz] = state.tracerFrom;
      const [tx2, ty2, tz2] = state.tracerTo;
      const mx = (fx + tx2) / 2, my = (fy + ty2) / 2, mz = (fz + tz2) / 2;
      const len = Math.hypot(tx2 - fx, tz2 - fz) || 1;
      renderer.box(mx, my, mz, 0.4, 0.4, len, [1.0, 0.9, 0.4], true, Math.atan2(tx2 - fx, tz2 - fz));
    }
    // Hurricane rain: thin streaks around the camera when a storm is on.
    if (state.storm > 0) {
      for (let i = 0; i < 40; i += 1) {
        const rx = p.x + ((i * 37) % 80) - 40;
        const rz = p.z + ((i * 53) % 80) - 40;
        const ry = 4 + ((state.time * 30 + i * 7) % 24);
        renderer.box(rx, ry, rz, 0.25, 5, 0.25, [0.7, 0.8, 0.95], true, 0);
      }
    }
  }

  function camera() {
    const p = state.player;
    const back = p.onFoot ? 9 : 15;
    const up = p.onFoot ? 5 : 7;
    const eye = [
      p.x - Math.sin(p.yaw) * back,
      up + (p.onFoot ? 0 : 0),
      p.z - Math.cos(p.yaw) * back,
    ];
    const target = [p.x + Math.sin(p.yaw) * 10, 3, p.z + Math.cos(p.yaw) * 10];
    return { eye, target };
  }

  function hud() {
    const m = currentMission();
    const [tx, tz] = missionTarget();
    const dx = tx - state.player.x, dz = tz - state.player.z;
    const dist = Math.hypot(dx, dz);
    const bearing = Math.atan2(dx, -dz); // 0 = north (-z)
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const dir = dirs[Math.round(((bearing + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 4)) % 8];
    return {
      cash: state.cash, health: Math.round(state.health), wanted: state.wanted,
      rank: state.rank, coins: state.coins, mission: m, missionText: m.text,
      dialogue: DIALOGUE[m.id] || '',
      gps: { dist: Math.round(dist), dir },
      police: state.cops.map((c) => ({
        unit: c.unit || 'VCPD Unit', tactic: (c.tactic || 'chase').toUpperCase(),
        dist: Math.round(Math.hypot(c.x - state.player.x, c.z - state.player.z)),
      })),
      speed: Math.round(Math.abs(state.player.speed || 0) * 3.6),
      station: RADIO[state.station], weapon: WEAPONS[state.weapon],
      toast: state.toastT > 0 ? state.toast : '',
      dayT: state.dayT, storm: state.storm > 0, lightning: state.lightning > 0,
      target: [tx, tz], player: [state.player.x, state.player.z],
      cops: state.cops.map((c) => [c.x, c.z]),
      ferry: [state.ferry.x, state.ferry.z],
      race: state.race, owned: state.owned.length, onFoot: state.player.onFoot,
      garage: state.garage,
    };
  }

  reset();
  return {
    state, world, step, render, camera, hud, reset, loadGame, saveGame,
    currentMission, missionTarget, boardFerry,
    get stepSize() { return STEP; },
  };
}
