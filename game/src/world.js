// The world — Vesper City: Ember Isle, one game state.
// This file owns the game: the state, the loop, the mission engine,
// the busted/wasted rules, the ferry rides, the saves, and the render
// list. Every variable is declared at the top of its scope before it
// is used (the v8 crash was a variable used before its declaration —
// never again). The loop is pure logic plus the input object: the Node
// sim drives it with a fake input, the browser drives it with the real
// one, and both call exactly the same stepGame.

import { makeRng, clamp, wrapAngle } from './random.js';
import { WORLD, PLAYER, VEHICLES, ISLAND_VEHICLES, WEAPONS, RADIO_STATIONS, ECONOMY, RESPECT_RANKS } from './config.js';
import { generateCity, cityBoxes, roadLines, roadCross, hitsBuilding, resolveBuildingCollision, nearestLandmark, citySize } from './city.js';
import { ISLAND, generateIsland, islandBoxes, volcanoBoxes, islandDistrictAt, islandRoadPoints, insideVolcano } from './island.js';
import { FERRY_TERMINAL, ISLAND_DOCK, coastPoints, makeBoats, coastBoxes, inSea } from './coast.js';
import { makeCar, carTopSpeed, stepCar, makeTraffic, stepTraffic, carBoxes, nearestCar, carDisplayName, vehicleDef } from './vehicles.js';
import { makeCrowd, stepPedestrians, pedBoxes, nearestPed } from './pedestrians.js';
import { createPolice, addWanted, clearWanted, stepPolice, policeBoxes, policeLabel, policeSummary, policeSave, policeLoad, wantedStars } from './police.js';
import { createIslandPolice, addIslandWanted, stepIslandPolice, islandPoliceBoxes, islandPoliceLabel, islandPoliceSummary, islandPoliceSave, islandPoliceLoad, islandWantedStars } from './island-police.js';
import { makeEnemies, makeEnemy, fireShot, enemiesShoot, explodeAt, enemyBoxes, aliveEnemies, weaponById } from './combat.js';
import { createWeaponWheel, wheelWeapon, wheelSelect, wheelNext, wheelPrev, wheelCanFire, wheelFire, wheelTick, wheelReload, wheelRows, wheelSummary } from './weapon-wheel.js';
import { buyUpgrade, buyRaceSpec, garageSummary, garageLabel, repairCar } from './garage.js';
import { createBusiness, buyBusiness, upgradeBusiness, collectIncome, nearestBusiness, businessBoxes, businessLabel, businessSummary, businessSave, businessLoad, maxBusinessLevel } from './business.js';
import { createIslandBusiness, buyIslandBusiness, upgradeIslandBusiness, collectIslandIncome, nearestIslandBusiness, islandBusinessBoxes, islandBusinessSummary, islandBusinessSave, islandBusinessLoad, maxIslandBusinessLevel } from './island-business.js';
import { createRaces, startRace, updateRace, raceLabel, raceBoxes, raceSummary, raceSave, raceLoad, RACE_CIRCUITS } from './races.js';
import { createStanding, addStanding, standingLevelOf, topDistrict, totalStanding, grantLookaway, isLookaway, standingRows, standingSummary, standingSave, standingLoad } from './standing.js';
import { createJobs, offerJob, startJob, stepJob, jobLabel, jobSummary, jobSave, jobLoad } from './side-jobs.js';
import { createIslandJobs, offerIslandJob, startIslandJob, stepIslandJob, islandJobLabel, islandJobSummary, islandJobSave, islandJobLoad } from './island-jobs.js';
import { makeSunCoins, createCoinState, collectCoins, resetStreak, respawnCoins, coinBoxes, coinSummary, coinSave, coinLoad } from './collectibles.js';
import { createFerry, canBoard, startBoarding, stepFerry, ferryDeckPosition, ferryLabel, ferryBoxes, ferrySummary, ferrySave, ferryLoad } from './ferry.js';
import { createWeather, stepWeather, isNight, isGoldenHour, weatherLabel, weatherSummary, weatherSave, weatherLoad, DAY_LENGTH_SEC } from './weather.js';
import { stationById, nextStation, prevStation, stationLabel, djLine, radioPartOfDay, stationNextNote } from './radio.js';
import { EMBER_STATION, emberDjLine, emberPartOfDay, emberRadioLabel, emberNextNote } from './island-radio.js';
import { createAudio, audioInit, audioEngine, audioRadioStep, audioGunshot, audioExplosion, audioCoin, audioMission, audioHorn, audioClick, audioBusted, audioMute } from './audio.js';
import { createInput, keyDown, keyPressed, clearPressed, driveInput, walkInput } from './input.js';
import { buildRoute, nextWaypoint, gpsHint, routeDistance, targetLandmark } from './gps.js';
import { districtAt } from './city.js';
import { districtAtPoint } from './districts.js';
import { createSaveData, validateSave, saveSummary, mergeSave, SAVE_VERSION } from './save.js';
import { loadSlot, saveSlot, slotSummaries, autosave } from './saveslots.js';
import { createEffects, spawnParticles, spawnExplosion, spawnMuzzle, spawnDust, spawnLavaSparks, stepEffects, effectBoxes } from './visuals.js';
import { makeIslandCars, makeIslandBoats, islandCarBoxes, islandBoatBoxes, nearestIslandCar, islandVehicleDef } from './island-vehicles.js';
import { createIslandEvents, rollIslandEvent, stepIslandEvent, islandEventLabel, islandEventSummary, islandEventSave, islandEventLoad } from './island-events.js';
import { buildCityMissions, cityFinaleGateMet, CITY_MISSION_COUNT } from './missions.js';
import { buildIslandMissions, islandFinaleGateMet, TOTAL_MISSIONS } from './island-missions.js';
import { Renderer, thirdPersonCamera } from './engine.js';

// ------------------------------------------------------------ creation
export function createGame(seed) {
  const rng = makeRng(seed || WORLD.seed);
  const city = generateCity(rng);
  const island = generateIsland(rng);
  const coast = coastPoints();
  const boats = makeBoats(rng);
  const missions = [...buildCityMissions(city, coast), ...buildIslandMissions(island)];
  const playerCar = makeCar(VEHICLES[0], PLAYER.startX, PLAYER.startZ + 6, 0, { parked: true });
  const game = {
    seed: seed || WORLD.seed,
    rng,
    city,
    island,
    coast,
    boats,
    missions,
    state: 'title', // title | playing
    time: 0,
    playtime: 0,
    player: {
      x: PLAYER.startX, z: PLAYER.startZ, angle: 0,
      health: PLAYER.health, inCar: false,
    },
    cash: PLAYER.startCash,
    respect: 0,
    car: null, // the car Mara is driving right now
    playerCar, // her own Sunset GT, parked near the start
    traffic: makeTraffic(rng, 22),
    peds: makeCrowd(rng, 30),
    police: createPolice(),
    islandPolice: createIslandPolice(),
    wheel: createWeaponWheel(),
    business: createBusiness(),
    islandBusiness: createIslandBusiness(),
    races: createRaces(),
    standing: createStanding(),
    jobs: createJobs(),
    islandJobs: createIslandJobs(),
    coins: createCoinState(makeSunCoins(rng)),
    ferry: createFerry(),
    weather: createWeather(),
    audio: createAudio(),
    input: createInput(),
    effects: createEffects(),
    islandCars: makeIslandCars(rng),
    islandBoats: makeIslandBoats(rng),
    islandEvents: createIslandEvents(),
    currentMission: 1,
    missionStep: 0,
    missionsDone: [],
    storyComplete: false,
    enemies: [],
    enemiesSpawned: false,
    gateBlocked: null, // {mission, missing} when the finale gate is not met
    cameraAngle: 0,
    toast: '',
    toastT: 0,
    route: [],
    raceIndex: 0,
    bustedTimer: 0,
    day: 1,
    djIndex: 0,
    stationId: RADIO_STATIONS[0].id,
    muted: false,
    shotsFired: 0,
  };
  return game;
}

// Is Mara on the island? Everything east of the sea counts.
export function onIsland(game) {
  return game.player.x > 900;
}

export function currentMissionDef(game) {
  return game.missions.find((m) => m.id === game.currentMission) || null;
}

export function missionTarget(game) {
  const m = currentMissionDef(game);
  if (!m) return null;
  return m.steps[game.missionStep] || null;
}

export function setToast(game, msg) {
  game.toast = msg;
  game.toastT = 4;
}

// ------------------------------------------------------------ sky & fog
// The sky follows the day: golden hour is warm gold, night is deep
// blue, the storm is grey. Fog is the same colour, near 60m, far
// 520m — far enough that the volcano cone (seen from 300m on the
// beach) stays visible, with its no-fog lava beacon glowing above it.
export function skyAndFog(game) {
  const w = game.weather;
  if (isNight(w)) {
    return {
      clear: [0.05, 0.07, 0.14],
      fog: [0.08, 0.1, 0.18],
      sun: [0.9, 0.9, 1.0],
    };
  }
  if (w.storm > 0.6) {
    return {
      clear: [0.35, 0.38, 0.42],
      fog: [0.4, 0.42, 0.45],
      sun: [0.7, 0.7, 0.7],
    };
  }
  if (isGoldenHour(w)) {
    return {
      clear: [0.99, 0.68, 0.38],
      fog: [0.98, 0.72, 0.45],
      sun: [1.0, 0.85, 0.5],
    };
  }
  return {
    clear: [0.55, 0.75, 0.9],
    fog: [0.65, 0.78, 0.9],
    sun: [1.0, 0.95, 0.8],
  };
}

// ------------------------------------------------------------ the loop
export function stepGame(game, input, dt) {
  game.time += dt;
  const w = game.weather;
  stepWeather(w, dt, game.rng);
  // A new day: respawn the coins, collect the business income, pay the
  // island businesses too.
  if (w.day !== game.day) {
    game.day = w.day;
    respawnCoins(game.coins);
    resetStreak(game.coins);
    const pay = collectIncome(game.business, game.day);
    const ipay = collectIslandIncome(game.islandBusiness, game.day);
    if (pay + ipay > 0) {
      game.cash += pay + ipay;
      setToast(game, `Day ${game.day} — your businesses paid $${(pay + ipay).toLocaleString()}.`);
    }
  }
  stepEffects(game.effects, dt);
  // The lava breathes: a few sparks off the crater every second.
  if (game.time % 1 < dt) {
    spawnLavaSparks(game.effects, ISLAND.x + game.rng.range(-20, 20), 88, ISLAND.z + game.rng.range(-20, 20));
  }
  if (game.state === 'title') {
    if (input && (keyPressed(input, 'Enter') || input.mousePressed)) {
      game.state = 'playing';
      audioInit(game.audio);
      audioClick(game.audio);
      setToast(game, 'Welcome back, Mara. Mission 1: Homecoming — drive to the Sunset Garage.');
    }
    return;
  }
  game.playtime += dt;
  if (game.toastT > 0) {
    game.toastT -= dt;
    if (game.toastT <= 0) game.toast = '';
  }
  const p = game.player;
  const island = onIsland(game);
  // ---- police & island police
  stepPolice(game.police, dt, p, game.rng, game.time);
  stepIslandPolice(game.islandPolice, dt, p, game.rng, game.islandPolice.wanted, game.time);
  // ---- traffic & pedestrians
  stepTraffic(game.traffic, dt, game.city.buildings, game.rng);
  stepPedestrians(game.peds, dt, { x: p.x, z: p.z }, game.rng);
  // ---- ferry
  const ferryEvents = stepFerry(game.ferry, dt);
  for (const ev of ferryEvents) {
    if (ev.type === 'arrived') {
      if (game.ferry.boarded) {
        game.ferry.boarded = false;
        const dock = game.ferry.direction === 1 ? ISLAND_DOCK : FERRY_TERMINAL;
        p.x = dock.x;
        p.z = dock.z;
        setToast(game, `Arrived at ${ev.at}. Welcome.`);
      }
    }
    if (ev.type === 'departed' && game.ferry.boarded) {
      setToast(game, `The ferry is crossing — ${game.ferry.direction === 1 ? 'Ember Isle' : 'Vesper City'}.`);
    }
  }
  if (game.ferry.boarded && (game.ferry.state === 'crossing' || game.ferry.state === 'boarding')) {
    const deck = ferryDeckPosition(game.ferry);
    p.x = deck.x;
    p.z = deck.z;
  }
  // ---- movement
  if (p.inCar && game.car) {
    const drive = driveInput(input);
    stepCar(game.car, drive, dt, game.city.buildings);
    p.x = game.car.x;
    p.z = game.car.z;
    p.angle = game.car.angle;
    game.cameraAngle = wrapAngle(game.cameraAngle + wrapAngle(game.car.angle - game.cameraAngle) * Math.min(1, dt * 3));
    if (Math.abs(game.car.speed) > 20 && game.rng.next() < dt * 2) {
      spawnDust(game.effects, game.car.x, 0.3, game.car.z);
    }
    audioEngine(game.audio, Math.abs(game.car.speed) / carTopSpeed(game.car), true);
  } else {
    const walk = walkInput(input, game.cameraAngle);
    if (walk.moving) {
      const speed = walk.sprint ? PLAYER.runSpeed : PLAYER.walkSpeed;
      const nx = p.x + walk.x * speed * dt;
      const nz = p.z + walk.z * speed * dt;
      const hit = resolveBuildingCollision(nx, nz, 0.8, game.city.buildings);
      if (!inSea(hit.x, hit.z) || island) {
        p.x = hit.x;
        p.z = hit.z;
      }
      p.angle = Math.atan2(walk.x, walk.z);
      game.cameraAngle = wrapAngle(game.cameraAngle + wrapAngle(p.angle - game.cameraAngle) * Math.min(1, dt * 5));
    }
    audioEngine(game.audio, 0, false);
  }
  // ---- E: enter / exit / carjack
  if (input && keyPressed(input, 'KeyE')) {
    if (p.inCar && game.car) {
      const car = game.car;
      p.inCar = false;
      game.car = null;
      p.x = car.x + Math.sin(car.angle + Math.PI / 2) * 3;
      p.z = car.z + Math.cos(car.angle + Math.PI / 2) * 3;
      audioClick(game.audio);
    } else {
      const allCars = [...game.traffic, game.playerCar, ...game.islandCars];
      const near = nearestCar(allCars, p.x, p.z, 6);
      if (near) {
        if (near.driver) {
          near.driver = false;
          addWanted(game.police, 1);
          setToast(game, 'You jacked that car — the VCPD noticed. Wanted +1.');
        }
        p.inCar = true;
        game.car = near;
        near.parked = false;
        audioHorn(game.audio);
      }
    }
  }
  // ---- F: board the ferry
  if (input && keyPressed(input, 'KeyF')) {
    if (canBoard(game.ferry, p.x, p.z)) {
      const owns = Object.keys(game.business.owned).length > 0 || Object.keys(game.islandBusiness.owned).length > 0;
      const res = startBoarding(game.ferry, owns);
      if (res.ok) {
        game.cash -= res.fare;
        setToast(game, res.msg);
      }
    } else {
      setToast(game, 'The ferry is not here — stand on the dock and wait for it.');
    }
  }
  // ---- Q: weapon wheel
  game.wheel.open = !!(input && keyDown(input, 'KeyQ'));
  if (input && keyDown(input, 'KeyQ')) {
    if (keyPressed(input, 'Digit1')) wheelSelect(game.wheel, 0);
    if (keyPressed(input, 'Digit2')) wheelSelect(game.wheel, 1);
    if (keyPressed(input, 'Digit3')) wheelSelect(game.wheel, 2);
    if (keyPressed(input, 'Digit4')) wheelSelect(game.wheel, 3);
    if (input.wheel > 0) wheelNext(game.wheel);
    if (input.wheel < 0) wheelPrev(game.wheel);
  }
  wheelTick(game.wheel, dt);
  // ---- mouse: fire
  if (input && input.mousePressed) {
    const fired = wheelFire(game.wheel, game.time);
    if (fired) {
      game.shotsFired += 1;
      const origin = { x: p.x, y: 1.5, z: p.z, angle: p.angle };
      const report = fireShot(origin, fired, { enemies: game.enemies, cars: [...game.traffic, game.playerCar, ...game.islandCars], peds: game.peds }, game.rng);
      if (report.hit) game.wheel.hits += 1;
      if (report.kind === 'ped') addWanted(game.police, 1);
      spawnMuzzle(game.effects, p.x + Math.sin(p.angle) * 1.5, 1.5, p.z + Math.cos(p.angle) * 1.5);
      audioGunshot(game.audio);
    }
  }
  // ---- R: next radio station
  if (input && keyPressed(input, 'KeyR')) {
    game.stationId = nextStation(game.stationId).id;
    setToast(game, stationLabel(stationById(game.stationId)));
  }
  audioRadioStep(game.audio, island ? EMBER_STATION : stationById(game.stationId), dt);
  // ---- G: garage — buy the cheapest un-maxed upgrade, or RACE SPEC
  if (input && keyPressed(input, 'KeyG')) {
    if (game.car) {
      const ups = game.car.upgrades;
      const order = ['engine', 'tyres', 'armour', 'nitro', 'chrome'];
      let bought = false;
      for (const id of order) {
        if ((ups[id] || 0) < 3) {
          const res = buyUpgrade(game.car, id, game.cash);
          if (res.ok) { game.cash -= res.cost; setToast(game, res.msg); bought = true; }
          else setToast(game, res.msg);
          break;
        }
      }
      if (!bought && !ups.raceSpec) {
        const res = buyRaceSpec(game.car, game.cash);
        if (res.ok) game.cash -= res.cost;
        setToast(game, res.msg);
      }
      if (!bought && ups.raceSpec) {
        const res = repairCar(game.car, game.cash);
        if (res.ok) game.cash -= res.cost;
        setToast(game, res.msg);
      }
    } else {
      setToast(game, 'The garage works on cars — get in one first.');
    }
  }
  // ---- B: business — buy or upgrade the nearest one
  if (input && keyPressed(input, 'KeyB')) {
    if (island) {
      const near = nearestIslandBusiness(game.islandBusiness, p.x, p.z);
      if (near && near.dist < 12) {
        const res = near.level > 0 ? upgradeIslandBusiness(game.islandBusiness, near.id, game.cash) : buyIslandBusiness(game.islandBusiness, near.id, game.cash);
        if (res.ok) {
          game.cash -= res.cost;
          if (near.level === 0 && near.district) addStanding(game.standing, near.district, 50);
        }
        setToast(game, res.msg);
      } else {
        setToast(game, 'No business nearby — look for a FOR SALE board on the island.');
      }
    } else {
      const near = nearestBusiness(game.business, p.x, p.z);
      if (near && near.dist < 12) {
        const res = near.level > 0 ? upgradeBusiness(game.business, near.id, game.cash) : buyBusiness(game.business, near.id, game.cash);
        if (res.ok) {
          game.cash -= res.cost;
          if (near.level === 0 && near.district) addStanding(game.standing, near.district, 50);
        }
        setToast(game, res.msg);
      } else {
        setToast(game, 'No business nearby — look for a FOR SALE board.');
      }
    }
  }
  // ---- J: side jobs — offer, then start
  if (input && keyPressed(input, 'KeyJ')) {
    const jobs = island ? game.islandJobs : game.jobs;
    if (!jobs.active && !jobs.offered) {
      const offered = island ? offerIslandJob(jobs, game.rng) : offerJob(jobs, game.rng);
      if (offered) setToast(game, `Job offered: ${offered.type ? offered.type.name : 'a job'} — press J again to start.`);
    } else if (!jobs.active && jobs.offered) {
      const started = island ? startIslandJob(jobs, game.rng) : startJob(jobs, game.rng);
      if (started) setToast(game, 'Job started — follow the GPS marker.');
    }
  }
  const jobEvent = island ? stepIslandJob(game.islandJobs, dt, p.x, p.z) : stepJob(game.jobs, dt, p.x, p.z);
  if (jobEvent && jobEvent.event === 'done') {
    game.cash += jobEvent.pay;
    game.respect += jobEvent.respect || 0;
    // A finished job earns standing where it finished.
    const jobDistrict = districtAtPoint(p.x, p.z, districtAt, islandDistrictAt);
    addStanding(game.standing, jobDistrict.name, 30);
    setToast(game, `Job done — $${jobEvent.pay} and ${jobEvent.respect || 0} respect.`);
    audioMission(game.audio);
  }
  // ---- T: street race — the next circuit in rotation
  if (input && keyPressed(input, 'KeyT')) {
    if (!game.races.active) {
      const circuit = RACE_CIRCUITS[game.raceIndex % RACE_CIRCUITS.length];
      game.raceIndex += 1;
      if (game.cash >= circuit.bet) {
        game.cash -= circuit.bet;
        startRace(game.races, circuit.id, game.time, game.rng);
        setToast(game, `${circuit.name} — bet $${circuit.bet}, ${circuit.laps} laps, par ${circuit.par}s. GO!`);
      } else {
        setToast(game, `${circuit.name} needs a $${circuit.bet} bet — you have $${Math.floor(game.cash)}.`);
      }
    } else {
      setToast(game, raceLabel(game.races));
    }
  }
  const raceEvents = updateRace(game.races, p.x, p.z, dt, game.time);
  for (const ev of raceEvents) {
    if (ev.type === 'done') {
      game.cash += ev.pay;
      game.respect += ev.respect;
      if (ev.won) addStanding(game.standing, island ? 'Ember Town' : 'Sunset Mile', 60);
      setToast(game, ev.won ? `${ev.circuit} — YOU WON! P${ev.position}, $${ev.pay}, ${ev.respect} respect.` : `${ev.circuit} — P${ev.position}, $${ev.pay}.`);
      audioMission(game.audio);
    }
    if (ev.type === 'failed') {
      setToast(game, `Race failed — the clock ran out and the $${ev.bet} bet is gone.`);
    }
    if (ev.type === 'gate') {
      audioClick(game.audio);
    }
  }
  // ---- K: quick save to slot 2
  if (input && keyPressed(input, 'KeyK')) {
    saveSlot(2, exportSave(game));
    setToast(game, 'Saved to slot 2.');
  }
  // ---- L: GPS hint
  if (input && keyPressed(input, 'KeyL')) {
    const target = missionTarget(game);
    if (target) setToast(game, gpsHint(game.route, p.x, p.z, p.angle, targetLandmark(target.x, target.z, game.city.landmarks)));
  }
  // ---- coins
  const coinPay = collectCoins(game.coins, p.x, p.z);
  if (coinPay > 0) {
    game.cash += coinPay;
    setToast(game, `Sun Coin +$${coinPay} — ${game.coins.collected}/42 collected.`);
    audioCoin(game.audio);
  }
  // ---- island events
  const evResult = stepIslandEvent(game.islandEvents, dt, p.x, p.z);
  if (evResult && evResult.event === 'roll') {
    const ev = rollIslandEvent(game.islandEvents, game.rng);
    if (ev) setToast(game, `Island event: ${ev.def.name} — ${ev.def.blurb}`);
  }
  if (evResult && evResult.event === 'done') {
    game.cash += evResult.pay;
    game.respect += evResult.respect;
    // An island event earns standing in the district where it happened.
    if (evResult.def.district) addStanding(game.standing, evResult.def.district, 40);
    setToast(game, `${evResult.def.name} done — $${evResult.pay}, ${evResult.respect} respect.`);
    audioMission(game.audio);
  }
  // ---- enemies shoot back
  const dmg = enemiesShoot(game.enemies, p, dt);
  if (dmg > 0) {
    p.health -= dmg;
    if (p.health <= 0) wasted(game);
  }
  // ---- busted: a cop close by while slow or on foot
  const wanted = game.police.wanted;
  if (wanted > 0 && !isLookaway(game.standing, game.time)) {
    const nearCop = game.police.cops.find((c) => {
      if (typeof c.x !== 'number') return false;
      const d = Math.sqrt((c.x - p.x) * (c.x - p.x) + (c.z - p.z) * (c.z - p.z));
      return d < 4;
    });
    const slow = !p.inCar || (game.car && Math.abs(game.car.speed) < 2);
    if (nearCop && slow) {
      game.bustedTimer += dt;
      if (game.bustedTimer > 2) busted(game);
    } else {
      game.bustedTimer = 0;
    }
  } else {
    game.bustedTimer = 0;
  }
  // ---- explosions: any car that just hit 0 hp
  const allCars = [...game.traffic, game.playerCar, ...game.islandCars];
  for (const car of allCars) {
    if (car.exploded && !car.fxDone) {
      car.fxDone = true;
      spawnExplosion(game.effects, car.x, 1, car.z);
      const hurt = explodeAt(car.x, car.z, 8, { enemies: game.enemies, cars: allCars, peds: game.peds }, p);
      if (hurt.player > 0) {
        p.health -= hurt.player;
        if (p.health <= 0) wasted(game);
      }
      audioExplosion(game.audio);
      if (car === game.car) {
        p.inCar = false;
        game.car = null;
        setToast(game, 'Your car exploded! Get out and find another one.');
      }
    }
  }
  // ---- missions
  stepMissions(game, dt);
  // ---- GPS route to the current target
  const target = missionTarget(game);
  if (target) {
    game.route = island || target.x > 900
      ? [{ x: p.x, z: p.z }, { x: target.x, z: target.z }]
      : buildRoute(p.x, p.z, target.x, target.z);
  } else {
    game.route = [];
  }
  // ---- wanted decay: 25 quiet seconds clears one star
  if (wanted > 0) {
    game.police.timer += dt;
    if (game.police.timer > 25) {
      game.police.timer = 0;
      game.police.wanted = Math.max(0, game.police.wanted - 1);
    }
  }
  if (input) clearPressed(input);
}

// Wasted: Mara is down. She wakes at the hospital, health restored,
// 10% of her cash gone, wanted cleared.
export function wasted(game) {
  const p = game.player;
  const lost = Math.floor(game.cash * 0.1);
  game.cash -= lost;
  p.health = PLAYER.health;
  clearWanted(game.police);
  const hospital = game.city.landmarks.find((l) => l.id === 'hospital') || { x: -160, z: 150 };
  p.x = hospital.x;
  p.z = hospital.z;
  p.inCar = false;
  game.car = null;
  setToast(game, `WASTED — you woke at St. Mara Hospital. Lost $${lost}.`);
  audioBusted(game.audio);
}

// Busted: the VCPD caught her. Same price, back at the garage.
export function busted(game) {
  const p = game.player;
  const lost = Math.floor(game.cash * 0.1);
  game.cash -= lost;
  p.health = PLAYER.health;
  clearWanted(game.police);
  game.bustedTimer = 0;
  const garage = game.city.landmarks.find((l) => l.id === 'garage') || { x: 160, z: 160 };
  p.x = garage.x;
  p.z = garage.z;
  p.inCar = false;
  game.car = null;
  setToast(game, `BUSTED — the VCPD caught you. Lost $${lost}, back at the garage.`);
  audioBusted(game.audio);
}

// ------------------------------------------------------------ missions
export function stepMissions(game, dt) {
  const m = currentMissionDef(game);
  if (!m) return;
  // The finale gates: mission 12 needs a level-2 business and 2,000
  // respect; mission 20 needs an island business at level 2, 3,000
  // respect, Ember Town standing 3 and 3 race wins. When the gate is
  // not met the mission waits and tells Mara what is missing.
  if (m.id === 12) {
    const gate = cityFinaleGateMet(game.business, game.respect);
    if (!gate.ok) {
      const key = gate.missing.join('|');
      if (!game.gateBlocked || game.gateBlocked.key !== key) {
        game.gateBlocked = { mission: 12, missing: gate.missing, key };
        setToast(game, `Mission 12 locked — you still need: ${gate.missing.join('; ')}.`);
      }
      return;
    }
  }
  if (m.id === 20) {
    const gate = islandFinaleGateMet(game.islandBusiness, game.respect, game.standing, game.races);
    if (!gate.ok) {
      const key = gate.missing.join('|');
      if (!game.gateBlocked || game.gateBlocked.key !== key) {
        game.gateBlocked = { mission: 20, missing: gate.missing, key };
        setToast(game, `Mission 20 locked — you still need: ${gate.missing.join('; ')}.`);
      }
      return;
    }
  }
  game.gateBlocked = null;
  const step = m.steps[game.missionStep];
  if (!step) return;
  const p = game.player;
  const d = Math.sqrt((step.x - p.x) * (step.x - p.x) + (step.z - p.z) * (step.z - p.z));
  if (step.kind === 'eliminate') {
    // Spawn the thugs when Mara gets close, finish when they are all down.
    if (!game.enemiesSpawned && d < 80) {
      game.enemiesSpawned = true;
      const spots = [
        { x: step.x + 6, z: step.z },
        { x: step.x - 6, z: step.z + 4 },
        { x: step.x, z: step.z - 6 },
        { x: step.x + 4, z: step.z + 8 },
      ];
      game.enemies = makeEnemies(game.rng, spots);
      setToast(game, `Ambush at ${step.text} — take them all down!`);
    }
    if (game.enemiesSpawned && aliveEnemies(game.enemies) === 0) {
      game.enemiesSpawned = false;
      game.enemies = [];
      advanceMission(game, m);
    }
    return;
  }
  if (d < 8) advanceMission(game, m);
}

function advanceMission(game, m) {
  game.missionStep += 1;
  if (game.missionStep >= m.steps.length) {
    // Guard: a finished mission never pays twice (the last mission
    // used to repeat every frame because currentMission stayed at 20).
    if (!game.missionsDone.includes(m.id)) {
      game.missionsDone.push(m.id);
      game.cash += m.reward;
      game.respect += m.respect;
      const district = m.district || 'Sunset Beach';
      addStanding(game.standing, district, Math.round(m.respect / 2));
      setToast(game, `${m.title} complete — $${m.reward}, ${m.respect} respect. ${m.outro}`);
      audioMission(game.audio);
      autosave(exportSave(game));
    }
    if (m.id >= TOTAL_MISSIONS) {
      // The story is over: Mara is Queen of Ember. The mission engine
      // stops here — currentMission null means "no mission", not "20".
      game.currentMission = null;
      game.storyComplete = true;
      setToast(game, 'THE CROWN IS YOURS — Queen of Ember. Twenty missions, one volcano, one city. Thank you for playing, Mara.');
    } else {
      game.currentMission = m.id + 1;
    }
    game.missionStep = 0;
    game.enemies = [];
    game.enemiesSpawned = false;
  } else {
    const next = m.steps[game.missionStep];
    setToast(game, next.text);
  }
}

// ------------------------------------------------------------ rendering
// The full render list: ground slabs, then every box in the world.
export function renderGame(game, renderer, cameraOverride) {
  const sky = skyAndFog(game);
  const cam = cameraOverride || thirdPersonCamera(game.player.x, game.player.z, game.cameraAngle, 14, 7);
  const fogNear = 60;
  const fogFar = 520;
  renderer.begin(cam.eye, cam.target, sky.fog, fogNear, fogFar, sky.clear);
  const w = game.weather;
  // Ground slabs.
  renderer.ground(0, 0, 460, 460, 0, [0.22, 0.21, 0.2]); // city asphalt
  // City blocks: lighter slabs between the roads, so the grid reads.
  const lines = roadLines();
  for (let i = 0; i < lines.length - 1; i += 1) {
    for (let j = 0; j < lines.length - 1; j += 1) {
      const cx = (lines[i] + lines[i + 1]) / 2;
      const cz = (lines[j] + lines[j + 1]) / 2;
      const shade = 0.32 + ((i + j) % 3) * 0.02;
      renderer.ground(cx, cz, 34, 34, 0.05, [shade, shade * 0.94, shade * 0.88]);
    }
  }
  renderer.ground(0, 285, 460, 150, 0, [0.85, 0.72, 0.5]); // Sunset Beach sand
  renderer.ground(900, 0, 1300, 900, -0.5, [0.16, 0.32, 0.45]); // the Sunset Sea
  renderer.ground(ISLAND.x, ISLAND.z, 560, 560, 0, [0.2, 0.18, 0.17]); // island ground
  renderer.ground(ISLAND.x, ISLAND.z - 210, 520, 110, 0.02, [0.1, 0.09, 0.09]); // black sand beach
  // The sun disc — a bright pillar on the horizon, no fog.
  const sunA = 0.5;
  renderer.pillar(game.player.x + Math.sin(sunA) * 400, 60, game.player.z + Math.cos(sunA) * 400, 26, 26, 2, sky.sun);
  // The lava beacon — a tall glowing pillar above the crater, no fog,
  // so the volcano is visible from the city side of the sea.
  const pulse = w.lavaPulse;
  renderer.pillar(ISLAND.x, 88 + 18 * pulse, ISLAND.z, 8, 36 + 24 * pulse, 8, [1.0, 0.35 + 0.2 * pulse, 0.05]);
  // The GPS marker: a gold pillar over the current objective — only
  // while playing, never on the title screen (the first step sits
  // under the player's feet and the pillar would fill the title).
  const target = missionTarget(game);
  if (target && game.state === 'playing') {
    renderer.pillar(target.x, 6, target.z, 1.2, 12, 1.2, [1.0, 0.84, 0.3]);
  }
  // Every box in the world.
  const boxes = collectBoxes(game);
  for (const b of boxes) {
    renderer.box(b.x, b.y, b.z, b.w, b.h, b.d, b.color, b.yaw || 0, !!b.noFog);
  }
  renderer.end();
  return boxes.length;
}

export function collectBoxes(game) {
  const boxes = [];
  boxes.push(...cityBoxes(game.city));
  boxes.push(...islandBoxes(game.island, game.weather.lavaPulse));
  boxes.push(...volcanoBoxes(game.weather.lavaPulse));
  boxes.push(...coastBoxes(game.coast, game.boats, game.time));
  boxes.push(...businessBoxes(game.business, game.time));
  boxes.push(...islandBusinessBoxes(game.islandBusiness, game.time));
  boxes.push(...coinBoxes(game.coins, game.time));
  boxes.push(...raceBoxes(game.races));
  boxes.push(...effectBoxes(game.effects));
  for (const car of game.traffic) {
    if (!car.exploded || car.burning) boxes.push(...carBoxes(car));
  }
  boxes.push(...carBoxes(game.playerCar));
  for (const car of game.islandCars) boxes.push(...islandCarBoxes(car));
  for (const boat of game.islandBoats) boxes.push(...islandBoatBoxes(boat, game.time));
  for (const ped of game.peds) boxes.push(...pedBoxes(ped));
  boxes.push(...policeBoxes(game.police, game.time));
  boxes.push(...islandPoliceBoxes(game.islandPolice, game.time));
  boxes.push(...ferryBoxes(game.ferry, game.time));
  for (const e of game.enemies) boxes.push(...enemyBoxes(e));
  // Mara herself, on foot: gold shirt, dark trousers, hair.
  if (!game.player.inCar) {
    const p = game.player;
    boxes.push({ x: p.x, y: 0.45, z: p.z, w: 0.5, h: 0.9, d: 0.4, color: [0.15, 0.12, 0.18], yaw: p.angle });
    boxes.push({ x: p.x, y: 1.15, z: p.z, w: 0.65, h: 0.7, d: 0.45, color: [0.95, 0.75, 0.25], yaw: p.angle });
    boxes.push({ x: p.x, y: 1.7, z: p.z, w: 0.4, h: 0.4, d: 0.4, color: [0.3, 0.2, 0.12], yaw: p.angle });
  }
  return boxes;
}

// ------------------------------------------------------------ HUD state
export function gameHudState(game) {
  const m = currentMissionDef(game);
  const target = missionTarget(game);
  const p = game.player;
  const island = onIsland(game);
  const station = island ? EMBER_STATION : stationById(game.stationId);
  const radio = island ? emberRadioLabel() : stationLabel(station);
  const policeDots = game.police.cops
    .filter((c) => typeof c.x === 'number')
    .map((c) => ({ x: c.x, z: c.z }));
  return {
    cash: game.cash,
    health: p.health,
    respect: game.respect,
    wanted: island ? game.islandPolice.wanted : game.police.wanted,
    inCar: p.inCar,
    carName: game.car ? carDisplayName(game.car) : '',
    speed: game.car ? game.car.speed : 0,
    x: p.x,
    z: p.z,
    angle: p.angle,
    mission: m ? { id: m.id, title: m.title } : null,
    missionStep: target ? target.text : '',
    missionNext: target ? `${Math.round(Math.sqrt((target.x - p.x) * (target.x - p.x) + (target.z - p.z) * (target.z - p.z)))}m` : '',
    missionTarget: target ? { x: target.x, z: target.z } : null,
    radioLabel: radio,
    weatherLabel: weatherLabel(game.weather),
    businessLabel: island ? islandBusinessSummary(game.islandBusiness).owned + ' island businesses' : businessLabel(game.business),
    ferryLabel: ferryLabel(game.ferry),
    policeLabel: island ? islandPoliceLabel(game.islandPolice, game.islandPolice.wanted) : policeLabel(game.police),
    toast: game.toast,
    wheelOpen: game.wheel.open,
    wheelRows: wheelRows(game.wheel),
    roadLines: roadLines(),
    policeDots,
    ferry: { x: game.ferry.x, z: game.ferry.z },
    route: game.route,
    gateBlocked: game.gateBlocked,
  };
}

// ------------------------------------------------------------ save/load
export function exportSave(game) {
  const data = createSaveData();
  data.cash = Math.floor(game.cash);
  data.respect = game.respect;
  data.health = Math.round(game.player.health);
  data.player = { x: game.player.x, z: game.player.z, angle: game.player.angle, inCar: game.player.inCar };
  data.missionsDone = [...game.missionsDone];
  data.currentMission = game.currentMission;
  data.coins = coinSave(game.coins);
  data.business = businessSave(game.business);
  data.islandBusiness = islandBusinessSave(game.islandBusiness);
  data.races = raceSave(game.races);
  data.standing = standingSave(game.standing);
  data.jobs = jobSave(game.jobs);
  data.islandJobs = islandJobSave(game.islandJobs);
  data.police = policeSave(game.police);
  data.islandPolice = islandPoliceSave(game.islandPolice);
  data.weather = weatherSave(game.weather);
  data.car = { upgrades: game.playerCar.upgrades, hp: game.playerCar.hp };
  data.wheel = wheelSummary(game.wheel);
  data.ferry = ferrySave(game.ferry);
  data.day = game.day;
  data.playtime = Math.floor(game.playtime);
  return data;
}

export function importSave(game, data) {
  const valid = validateSave(data);
  if (!valid) return false;
  const merged = mergeSave(createSaveData(), valid);
  game.cash = merged.cash;
  game.respect = merged.respect;
  game.player.health = merged.health;
  game.player.x = merged.player.x;
  game.player.z = merged.player.z;
  game.player.angle = merged.player.angle;
  game.missionsDone = [...merged.missionsDone];
  game.currentMission = merged.currentMission;
  game.missionStep = 0;
  if (merged.coins) game.coins = coinLoad(merged.coins, game.coins.coins);
  if (merged.business) game.business = businessLoad(merged.business);
  if (merged.islandBusiness) game.islandBusiness = islandBusinessLoad(merged.islandBusiness);
  if (merged.races) game.races = raceLoad(merged.races);
  if (merged.standing) game.standing = standingLoad(merged.standing);
  if (merged.jobs) game.jobs = jobLoad(merged.jobs);
  if (merged.islandJobs) game.islandJobs = islandJobLoad(merged.islandJobs);
  if (merged.police) game.police = policeLoad(merged.police);
  if (merged.islandPolice) game.islandPolice = islandPoliceLoad(merged.islandPolice);
  if (merged.weather) game.weather = weatherLoad(merged.weather);
  if (merged.car) {
    game.playerCar.upgrades = merged.car.upgrades || game.playerCar.upgrades;
    game.playerCar.hp = merged.car.hp || 100;
  }
  if (merged.ferry) game.ferry = ferryLoad(merged.ferry);
  game.day = merged.day || 1;
  game.playtime = merged.playtime || 0;
  game.state = 'playing';
  return true;
}

export { SAVE_VERSION, slotSummaries, loadSlot, saveSlot, autosave };
export { RESPECT_RANKS, ECONOMY, WEAPONS, VEHICLES, ISLAND_VEHICLES };
export { wantedStars, islandWantedStars };
export { TOTAL_MISSIONS, CITY_MISSION_COUNT };
