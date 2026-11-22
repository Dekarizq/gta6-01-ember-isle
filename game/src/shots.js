// Screenshot shot presets: fixed cameras and staged scenes for the four
// dossier screenshots. Deterministic for a given seed.
import { ISLE, VOLCANO, FERRY } from './config.js';
import { makeCar } from './game.js';

// Each preset stages the world (player car, traffic, police, ferry) and
// returns a fixed camera { eye, target }.
export function applyShot(state, name) {
  const p = state.player;
  state.shot = name;
  state.started = true;
  state.paused = false;

  if (name === 'start') {
    // Cover view from the south-east beach, looking north-west: city skyline
    // centre, sea + sun on the left, volcano far left, palms right foreground.
    p.x = 230; p.z = 260; p.y = 2; p.heading = 0;
    p.inCar = false; p.car = null;
    state.shotCamera = {
      eye: [230, 18, 260],
      target: [-420, 40, -320],
    };
  } else if (name === 'city') {
    // High-speed chase on a road lane (x = 23): player in the Sunset GT,
    // wanted 2, two traffic cars ahead, one VCPD cruiser behind, lit towers
    // on both sides. Heading PI drives toward -z; the camera sits behind.
    p.inCar = true;
    p.x = 23; p.z = -150; p.y = 0; p.heading = Math.PI;
    p.speed = 34;
    const car = state.cars.find(c => c.isPlayer) || state.cars[0];
    car.x = 23; car.z = -150; car.heading = Math.PI; car.speed = 34; car.isPlayer = true;
    p.car = car;
    p.wanted = 2;
    const t1 = state.cars[1], t2 = state.cars[2];
    if (t1) { t1.x = 23; t1.z = -172; t1.heading = Math.PI; t1.speed = 26; }
    if (t2) { t2.x = 37; t2.z = -180; t2.heading = Math.PI; t2.speed = 24; }
    // One VCPD cruiser right behind the player, lights flashing.
    const cruiser = makeCar('vcpd-cruiser', 23, 0, -132, Math.PI, false, true);
    cruiser.speed = 36; cruiser.lightPhase = true;
    state.police = [cruiser];
    state.cars.push(cruiser);
    state.shotCamera = {
      eye: [23, 12, -112],
      target: [23, 3, -200],
    };
  } else if (name === 'volcano') {
    // Low, close view of the volcano (~280 m) from the south, so the sun
    // clears the cone's left shoulder: crater ring, lava flows, beacon,
    // night-market stalls + lanterns in the foreground, sun visible.
    p.inCar = false; p.car = null;
    p.x = ISLE.x + 60; p.z = ISLE.z + 150; p.y = 3; p.heading = 0;
    state.shotCamera = {
      eye: [ISLE.x + 60, 16, ISLE.z + 220],
      target: [VOLCANO.x, VOLCANO.height * 0.72, VOLCANO.z],
    };
  } else if (name === 'ferry') {
    // Low, close ferry shot: big hull fills ~40% of the frame, city + isle
    // behind, sun on the horizon, two more boats on the route.
    // Keep the ferry docked-in-place so the staged framing never drifts.
    state.ferry.x = -330; state.ferry.z = 40;
    state.ferry.heading = -1.98;
    state.ferry.docked = true;
    state.ferry.timer = 0;
    state.ferry.leg = 0; state.ferry.t = 0;
    p.inCar = false; p.car = null;
    p.x = -300; p.z = 78; p.y = 2; p.heading = 0;
    const f = state.ferry;
    // Camera south-east of the ferry looking north-west: hull fills ~40% of
    // the frame, sun on the left, volcano on the right, city + isle behind.
    state.shotCamera = {
      eye: [f.x + 40, 10, f.z + 45],
      target: [f.x - 50, 8, f.z - 60],
    };
  }
  return state.shotCamera;
}
