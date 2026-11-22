// The four screenshot scenes behind ?shot=start|city|volcano|ferry.
// Each one stages the real game state (no fake renders) and returns the
// camera to shoot it with. The sun sits west, so every shot camera looks
// west or north-west: the sunset is in the frame by construction.
import { ISLAND, FERRY_ROUTE } from './config.js';

// Put Mara in the Sunset GT, mid-chase on the Sunset Mile avenue, heading
// west into the sunset: wanted 2, two traffic cars ahead, one VCPD cruiser
// closing from behind.
function stageCity(game) {
  const s = game.state;
  const p = s.player;
  const gt = s.cars.find((c) => c.owned) || s.cars[0];
  gt.x = 110; gt.z = -126; gt.yaw = -Math.PI / 2; gt.speed = 28;
  p.car = gt; p.onFoot = false; p.x = gt.x; p.z = gt.z; p.yaw = gt.yaw; p.speed = 28;
  s.wanted = 2;
  s.traffic[0].x = 66; s.traffic[0].z = -126; s.traffic[0].yaw = -Math.PI / 2; s.traffic[0].speed = 22;
  s.traffic[1].x = 38; s.traffic[1].z = -140; s.traffic[1].yaw = -Math.PI / 2; s.traffic[1].speed = 20;
  if (!s.cops.length) s.cops.push({ ...s.cars[0], model: 5, x: 150, z: -126, yaw: -Math.PI / 2, speed: 30, unit: 'Unit 7 — Vega', tactic: 'ram' });
  s.cops[0].x = 152; s.cops[0].z = -126; s.cops[0].yaw = -Math.PI / 2; s.cops[0].speed = 30;
  s.dayT = 0.72;
  return null; // use the chase camera
}

function stageVolcano(game) {
  const s = game.state;
  s.dayT = 0.72;
  s.time = 2.4; // lava pulse high: sparks + smoke lit
  return {
    eye: [ISLAND.x - 40, 35, ISLAND.z + 260],
    target: [ISLAND.x, 78, ISLAND.z],
  };
}

function stageFerry(game) {
  const s = game.state;
  const f = s.ferry;
  f.t = 0.45; f.dir = 1;
  f.x = FERRY_ROUTE.from.x + (FERRY_ROUTE.to.x - FERRY_ROUTE.from.x) * 0.45;
  f.z = FERRY_ROUTE.from.z + (FERRY_ROUTE.to.z - FERRY_ROUTE.from.z) * 0.45;
  s.dayT = 0.72;
  // Camera east of the ferry, low and close, looking west: the big hull fills
  // the frame, Ember Isle and the volcano rise behind it, the sun hangs left.
  return {
    eye: [f.x + 30, 10, f.z + 32],
    target: [f.x - 15, 8, f.z - 8],
  };
}

function stageStart(game) {
  game.state.dayT = 0.72;
  // High east of the city, looking west over the skyline to the sunset and sea.
  return {
    eye: [360, 130, 170],
    target: [-600, 35, -80],
  };
}

export function stageShot(name, game) {
  game.reset();
  if (name === 'city') return { screen: 'play', camera: stageCity(game) };
  if (name === 'volcano') return { screen: 'play', camera: stageVolcano(game) };
  if (name === 'ferry') return { screen: 'play', camera: stageFerry(game) };
  return { screen: 'title', camera: stageStart(game) };
}
