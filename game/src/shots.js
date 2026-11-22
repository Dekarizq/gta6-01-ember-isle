// Screenshot staging for Vesper City: Ember Isle.
// The dossier needs four screenshots of the game itself, taken by the
// browser at the URLs in shots.json (?shot=start, ?shot=city,
// ?shot=volcano, ?shot=ferry). Each shot is a real game state — a
// player, a car, a mission, a place — never a fake scene: the staging
// only moves the player and the camera, and the game renders what is
// really there. The volcano shot is staged from the south shore, far
// enough to see the whole cone and its lava beacon, with a clear
// sightline (no building in the way).

import { ISLAND } from './island.js';
import { FERRY_TERMINAL } from './coast.js';
import { spawnCop, VCPD_UNITS } from './police.js';

// The four shots, in dossier order.
export const SHOT_NAMES = ['start', 'city', 'volcano', 'ferry'];

export function shotFromQuery(query) {
  const params = new URLSearchParams(query || '');
  const shot = params.get('shot') || 'start';
  return SHOT_NAMES.includes(shot) ? shot : 'start';
}

// Stage a shot: move the player and the camera, set the mission and
// the wanted level, and return a camera override {eye, target} — or
// null to use the normal third-person camera.
export function applyShot(game, shot) {
  if (shot === 'start') {
    game.state = 'title';
    // Face the city from the beach, so the skyline sits behind the
    // title instead of empty sea haze. Sun high and to the left, clear
    // of the skyline.
    game.cameraAngle = Math.PI;
    game.sunOff = 380;
    game.sunY = 110;
    return null;
  }
  game.state = 'playing';
  if (shot === 'city') {
    // Downtown at golden hour: Mara driving the Sunset GT through the
    // Glass Quarter at speed, wanted 2, traffic ahead of her and a VCPD
    // cruiser closing in on her left, mission 7 active — a chase, not
    // a parked car on an empty road.
    game.player.x = 24;
    game.player.z = 24;
    game.player.angle = 0;
    game.player.inCar = true;
    game.car = game.playerCar;
    game.playerCar.x = 24;
    game.playerCar.z = 24;
    game.playerCar.angle = 0;
    game.playerCar.speed = 28;
    if (game.traffic[0]) {
      game.traffic[0].x = 20;
      game.traffic[0].z = 55;
      game.traffic[0].angle = 0;
      game.traffic[0].speed = 22;
    }
    if (game.traffic[1]) {
      game.traffic[1].x = 30;
      game.traffic[1].z = 78;
      game.traffic[1].angle = 0;
      game.traffic[1].speed = 20;
    }
    game.police.wanted = 2;
    game.police.heat = 2;
    const cop = spawnCop(game.police, VCPD_UNITS[0], game.player.x, game.player.z);
    cop.x = 14;
    cop.z = 34;
    cop.angle = 0;
    game.currentMission = 7;
    game.missionStep = 0;
    // Sun nearly straight ahead in the street slot, high enough to
    // clear the far skyline — a low sun here hides behind the towers.
    game.sunOff = 40;
    game.sunY = 110;
    return null;
  }
  if (shot === 'volcano') {
    // The volcano from the south shore: Mara on foot on the black
    // beach, 25m in front of the camera so she is in frame, the whole
    // cone, its lava flows and its beacon in frame, mission 14 active.
    // Camera 260m out and lower than before, so the crater, the beacon
    // and the south lava flow fill the frame instead of fog.
    game.player.x = ISLAND.x - 40;
    game.player.z = ISLAND.z + 235;
    game.player.angle = Math.PI;
    game.player.inCar = false;
    game.currentMission = 14;
    game.missionStep = 0;
    game.weather.dayT = 0.72;
    // Sun high and far to the left, beside the cone instead of behind
    // it — the cone spans ~29° from this camera, so a 380m offset still
    // hides the sun behind its left flank.
    game.sunOff = 600;
    game.sunY = 110;
    const eye = [ISLAND.x - 40, 35, ISLAND.z + 260];
    const target = [ISLAND.x, 75, ISLAND.z];
    return { eye, target };
  }
  if (shot === 'ferry') {
    // Mid-crossing: Mara on the ferry deck, the boat halfway across
    // the Sunset Sea, the island ahead and the city behind.
    game.ferry.state = 'crossing';
    game.ferry.progress = 0.5;
    game.ferry.direction = 1;
    game.ferry.boarded = true;
    game.ferry.x = FERRY_TERMINAL.x + (1250 - 240 - FERRY_TERMINAL.x) * 0.5;
    game.ferry.z = 40;
    game.player.x = game.ferry.x;
    game.player.z = game.ferry.z;
    game.player.inCar = false;
    game.player.angle = Math.PI / 2;
    game.currentMission = 13;
    game.missionStep = 0;
    // Sun high and to the left, over the open sea instead of behind
    // the volcano.
    game.sunOff = 380;
    game.sunY = 110;
    // Closer and lower than before, so the ferry fills ~40% of the
    // frame with the island and the city behind it, instead of a small
    // white box in empty grey water.
    const eye = [game.ferry.x - 35, 12, game.ferry.z + 38];
    const target = [game.ferry.x + 30, 8, game.ferry.z - 10];
    return { eye, target };
  }
  return null;
}

// A one-line description of each shot, for the dossier and the tests.
export function shotDescription(shot) {
  return {
    start: 'Title screen: Vesper City — Ember Isle, golden hour.',
    city: 'Downtown Glass Quarter at golden hour, driving with wanted 2.',
    volcano: 'The volcano cone, lava flows and beacon from the black beach, 260m away.',
    ferry: 'The ferry mid-crossing on the Sunset Sea, island ahead.',
  }[shot] || 'Vesper City: Ember Isle.';
}
