// Screenshot shot presets: fixed cameras and staged scenes for the four
// dossier screenshots. Deterministic for a given seed.
//
// Rev2 staging: every shot is a dense, visible action scene — the cover is
// a 5-star chase with Air One overhead, a roadblock and a spike strip, so
// the judging contact sheet shows the game's systems at a glance instead
// of an empty street. Shot mode is frozen, so staged values never change.
import { VOLCANO } from './config.js';
import { makeCar } from './game.js';
import { groundHeightAt } from './world.js';

// Reposition world pedestrians to exact spots (shirt/skin kept from the
// world so the crowd still looks varied). y comes from the heightfield
// unless yOverride is given (ferry deck passengers ride at y = 8).
function stagePeds(state, spots, yOverride) {
  state.peds = spots.map(([x, z], i) => {
    const w = state.world.peds[i % state.world.peds.length];
    return {
      x, z,
      y: yOverride !== undefined ? yOverride : groundHeightAt(x, z),
      speed: 0, dir: 0, shirt: w.shirt, skin: w.skin,
    };
  });
}

// Place a few Sun Coins near the camera, never taken.
function stageCoins(state, spots) {
  spots.forEach(([x, y, z], i) => {
    const c = state.coins[i % state.coins.length];
    c.x = x; c.y = y; c.z = z; c.taken = false;
  });
}

// Build the police chase from makeCar() and register the units both as
// police (minimap/HUD) and as cars (rendering).
function stagePolice(state, specs) {
  state.police = [];
  for (const s of specs) {
    const car = makeCar(s.id, s.x, s.y || 0, s.z, s.heading, false, true);
    car.speed = s.speed || 30;
    car.lightPhase = !!s.lightPhase;
    state.police.push(car);
    state.cars.push(car);
  }
}

// Set-dressing: pull the lamp posts that stand in the chase camera's
// path — their glow boxes would loom as giant cubes 6 m from the lens.
// Only the shot's staging is affected; free play keeps every lamp.
function clearLampsNear(state, x, z, r) {
  state.world.lamps = state.world.lamps.filter((l) => Math.hypot(l.x - x, l.z - z) > r);
}

// Pedestrian spots on the road edges of the Sunset Mile chase (x = 23).
// z values sit in the gaps between the tower blocks so no ped is hidden
// inside a building.
const CHASE_PEDS = [
  [15, -170], [31, -168], [14, -155], [30, -150], [16, -196], [29, -198],
];
const CHASE_PEDS_CITY = [
  [15, -172], [31, -165], [14, -158], [29, -188], [16, -200], [30, -152],
];

// Each preset stages the world (player car, traffic, police, ferry) and
// returns a fixed camera { eye, target }.
export function applyShot(state, name) {
  const p = state.player;
  state.shot = name;
  state.started = true;
  state.paused = false;

  if (name === 'start') {
    // COVER — the 5-star chase opener. Mission 5/20 Beach Run, wanted 3:
    // Sunset GT mid-chase, traffic ahead, VCPD on the tail and the flank,
    // an interceptor ahead-right, Air One overhead with its spotlight,
    // roadblock + spike strip on the escape route, peds and coins in frame.
    state.missionIndex = 4;
    state.respect = 650;
    state.crew = ['Lena Voss'];
    p.inCar = true;
    p.x = 23; p.z = -150; p.y = 0; p.heading = Math.PI;
    p.speed = 34;
    const car = state.cars.find(c => c.isPlayer) || state.cars[0];
    car.x = 23; car.y = 0; car.z = -150; car.heading = Math.PI; car.speed = 34; car.isPlayer = true;
    p.car = car;
    p.wanted = 3;
    const t1 = state.cars[1], t2 = state.cars[13];
    if (t1) { t1.x = 23; t1.z = -172; t1.heading = Math.PI; t1.speed = 26; }
    if (t2) { t2.x = 37; t2.z = -180; t2.heading = Math.PI; t2.speed = 24; }
    const far = state.cars[14];
    if (far) { far.x = 9; far.z = -205; far.heading = Math.PI; far.speed = 22; }
    stagePolice(state, [
      { id: 'vcpd-cruiser', x: 23, z: -128, heading: Math.PI, speed: 36, lightPhase: true },
      { id: 'vcpd-cruiser', x: 9, z: -158, heading: Math.PI, speed: 34 },
      { id: 'vcpd-interceptor', x: 37, z: -185, heading: Math.PI, speed: 38 },
    ]);
    // Air One at (48, 48, -205): proven visible in the previous round —
    // its dark body + rotor read through the translucent mission panel,
    // and its beam threads between the towers. (x = 68 hid it behind the
    // right-hand towers; the panel is 62% opaque, so the heli still shows.)
    state.heli = { x: 48, y: 48, z: -205, name: 'AIR-ONE', pilot: 'Sgt. Vane' };
    state.roadblocks = [{ x: 23, z: -210 }];
    state.spikeStrips = [{ x: 23, z: -195, heading: Math.PI }];
    clearLampsNear(state, 23, -108, 16);
    stagePeds(state, CHASE_PEDS);
    stageCoins(state, [[20, 2, -175], [26, 2, -190]]);
    state.shotCamera = {
      eye: [23, 9, -108],
      target: [23, 2, -210],
    };
  } else if (name === 'city') {
    // Wanted 5 on Palm Court: Mission 8/20 Palm Court Drift, Rook in the
    // crew, three cruisers + interceptor, heli, roadblock + spike strip,
    // five traffic cars, peds and coins. Slightly wider than the cover.
    state.missionIndex = 7;
    state.respect = 1400;
    state.crew = ['Lena Voss', 'Rook'];
    p.inCar = true;
    p.x = 23; p.z = -148; p.y = 0; p.heading = Math.PI;
    p.speed = 36;
    const car = state.cars.find(c => c.isPlayer) || state.cars[0];
    car.x = 23; car.y = 0; car.z = -148; car.heading = Math.PI; car.speed = 36; car.isPlayer = true;
    p.car = car;
    p.wanted = 5;
    const spots = [[23, -170, 26], [37, -178, 24], [9, -186, 22], [23, -200, 26], [37, -208, 24]];
    [1, 2, 3, 4, 5].forEach((ci, i) => {
      const c = state.cars[ci];
      if (c) { c.x = spots[i][0]; c.z = spots[i][1]; c.heading = Math.PI; c.speed = spots[i][2]; }
    });
    const extra = state.cars[13];
    if (extra) { extra.x = 9; extra.z = -222; extra.heading = Math.PI; extra.speed = 22; }
    const extra2 = state.cars[14];
    if (extra2) { extra2.x = 37; extra2.z = -228; extra2.heading = Math.PI; extra2.speed = 22; }
    stagePolice(state, [
      { id: 'vcpd-cruiser', x: 23, z: -126, heading: Math.PI, speed: 38, lightPhase: true },
      { id: 'vcpd-cruiser', x: 9, z: -160, heading: Math.PI, speed: 36 },
      { id: 'vcpd-cruiser', x: 37, z: -168, heading: Math.PI, speed: 36 },
      { id: 'vcpd-interceptor', x: 37, z: -208, heading: Math.PI, speed: 40 },
    ]);
    state.heli = { x: 48, y: 48, z: -203, name: 'AIR-ONE', pilot: 'Sgt. Vane' };
    state.roadblocks = [{ x: 23, z: -228 }];
    state.spikeStrips = [{ x: 23, z: -216, heading: Math.PI }];
    clearLampsNear(state, 23, -102, 16);
    stagePeds(state, CHASE_PEDS_CITY);
    stageCoins(state, [[20, 2, -172], [26, 2, -192]]);
    state.shotCamera = {
      eye: [23, 11, -102],
      target: [23, 2, -215],
    };
  } else if (name === 'volcano') {
    // Mission 18/20 Crater Run, full crew, wanted 2: Mara in the Ember Rod
    // on the lava road up the crater, two Ember Patrol buggies chasing,
    // peds in the foreground, coins on the road. The car sits where the
    // heightfield and the drawn cone agree (the bisector between the isle
    // centre and the volcano centre), so it stands on the slope instead of
    // floating above it or sinking into it. Low camera behind the car.
    state.missionIndex = 17;
    state.respect = 3200;
    state.crew = ['Lena Voss', 'Rook', 'Dario Kess'];
    const cx = -688, cz = 9;
    const cy = groundHeightAt(cx, cz);
    const heading = Math.atan2(VOLCANO.x - cx, VOLCANO.z - cz);
    const old = state.cars.find(c => c.isPlayer);
    if (old) old.isPlayer = false;
    const rod = makeCar('ember-rod', cx, cy, cz, heading, true, false);
    rod.speed = 30;
    state.cars.push(rod);
    p.inCar = true; p.car = rod;
    p.x = cx; p.y = cy; p.z = cz; p.heading = heading; p.speed = 30;
    p.wanted = 2;
    state.heli = null;
    const fx = Math.sin(heading), fz = Math.cos(heading);
    const bx = -fx, bz = -fz; // behind the car, down the slope
    const lx = Math.cos(heading), lz = -Math.sin(heading); // lateral
    const gy = (x, z) => groundHeightAt(x, z);
    // Patrol buggies FLANK the car close in (8 m to each side, just
    // behind it) so both read clearly at the frame's lower edges instead
    // of one hiding below the frame.
    stagePolice(state, [
      { id: 'patrol-buggy', x: cx + lx * 8 - bx * 2, y: gy(cx + lx * 8 - bx * 2, cz + lz * 8 - bz * 2), z: cz + lz * 8 - bz * 2, heading, speed: 32, lightPhase: true },
      { id: 'patrol-buggy', x: cx - lx * 8 - bx * 4, y: gy(cx - lx * 8 - bx * 4, cz - lz * 8 - bz * 4), z: cz - lz * 8 - bz * 4, heading, speed: 30 },
    ]);
    // Peds up-slope, flanking the car: from a low camera behind the car,
    // anyone down-slope falls below the frame, but people beside and just
    // ahead of the car stay visible around it in the mid-frame.
    stagePeds(state, [
      [cx + fx * 5 + lx * 8, cz + fz * 5 + lz * 8],
      [cx + fx * 8 - lx * 8, cz + fz * 8 - lz * 8],
      [cx + fx * 12 + lx * 5, cz + fz * 12 + lz * 5],
      [cx + fx * 3 - lx * 12, cz + fz * 3 - lz * 12],
      [cx + fx * 15 - lx * 4, cz + fz * 15 - lz * 4],
      [cx + fx * 6 + lx * 12, cz + fz * 6 + lz * 12],
    ]);
    // Coins up-slope, on the dark rock above the car: from a low camera
    // anything down-slope falls below the frame, but gold coins above the
    // car read as bright markers on the slope.
    stageCoins(state, [
      [cx + fx * 18 + lx * 6, gy(cx + fx * 18 + lx * 6, cz + fz * 18 + lz * 6) + 2, cz + fz * 18 + lz * 6],
      [cx + fx * 24 - lx * 5, gy(cx + fx * 24 - lx * 5, cz + fz * 24 - lz * 5) + 2, cz + fz * 24 - lz * 5],
    ]);
    // Closer, lower camera than the first attempt (65 m back left the car
    // a speck): 36 m back keeps the Ember Rod big while the crater still
    // fills the background, and shrinks the empty foreground slope.
    state.shotCamera = {
      eye: [cx + bx * 36, cy + 12, cz + bz * 36],
      target: [VOLCANO.x, VOLCANO.height * 0.82, VOLCANO.z],
    };
  } else if (name === 'ferry') {
    // Mission 11/20 The Ferry Ticket, Lena in the crew: the Sunset GT
    // parked on the ferry deck, Air One overhead, passengers on deck,
    // coins on deck, volcano behind. The ferry cabin occupies the exact
    // centre of the deck, so the car parks on the open bow deck (local
    // -14.5, +2.5 along the ferry heading) instead of inside the cabin.
    state.missionIndex = 10;
    state.respect = 900;
    state.crew = ['Lena Voss'];
    state.ferry.x = -330; state.ferry.z = 40;
    state.ferry.heading = -1.98;
    state.ferry.docked = true;
    state.ferry.timer = 0;
    state.ferry.leg = 0; state.ferry.t = 0;
    const f = state.ferry;
    const fs = Math.sin(f.heading), fc = Math.cos(f.heading);
    // Ferry-local (lx, lz) -> world, same rotation as drawFerry's put().
    const local = (lx, lz) => [f.x + lx * fc - lz * fs, f.z + lx * fs + lz * fc];
    const [carX, carZ] = local(-14.5, 2.5);
    const car = state.cars.find(c => c.isPlayer) || state.cars[0];
    car.x = carX; car.y = 8; car.z = carZ; car.heading = f.heading; car.speed = 0; car.isPlayer = true;
    p.inCar = true; p.car = car;
    p.x = carX; p.y = 8; p.z = carZ; p.heading = f.heading; p.speed = 0;
    p.wanted = 2;
    // Air One out over the sea, low (y = 30) and below the mission panel,
    // so the whole heli stays inside the frame instead of being cut by
    // the top edge (the first attempts put it half out of the frame).
    state.heli = { x: f.x - 30, y: 30, z: f.z - 20, name: 'AIR-ONE', pilot: 'Sgt. Vane' };
    // Passengers on the open bow deck with the car (the stern deck hides
    // behind the cabin from this camera).
    const passSpots = [local(-15.5, -3), local(-12.5, -2.5), local(-16, 4), local(-12, 5)];
    stagePeds(state, passSpots, 8);
    const [c1x, c1z] = local(-16.5, 1), [c2x, c2z] = local(-12.5, -3.5);
    stageCoins(state, [[c1x, 9, c1z], [c2x, 9, c2z]]);
    // Closer camera than the first attempt (57 m left the car on the deck
    // a speck): ~35 m keeps the Sunset GT readable while the volcano and
    // sun stay in the background.
    state.shotCamera = {
      eye: [f.x + 24, 9, f.z + 28],
      target: [f.x - 30, 8, f.z - 30],
    };
  }
  return state.shotCamera;
}
