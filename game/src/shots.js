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
    // title instead of empty sea haze.
    game.cameraAngle = Math.PI;
    return null;
  }
  game.state = 'playing';
  if (shot === 'city') {
    // Downtown at golden hour: Mara driving the Sunset GT through the
    // Glass Quarter, wanted 2, traffic around her, mission 7 active.
    game.player.x = 24;
    game.player.z = 24;
    game.player.angle = 0;
    game.player.inCar = true;
    game.car = game.playerCar;
    game.playerCar.x = 24;
    game.playerCar.z = 24;
    game.playerCar.angle = 0;
    game.playerCar.speed = 18;
    game.police.wanted = 2;
    game.police.heat = 2;
    game.currentMission = 7;
    game.missionStep = 0;
    return null;
  }
  if (shot === 'volcano') {
    // The volcano from the south shore: Mara on foot on the black
    // beach, the whole cone and its lava beacon in frame, mission 14
    // active. Camera about 300m out, low enough that the crater is
    // above the horizon, with the beacon glowing above the fog.
    game.player.x = ISLAND.x - 40;
    game.player.z = ISLAND.z + 270;
    game.player.angle = Math.PI;
    game.player.inCar = false;
    game.currentMission = 14;
    game.missionStep = 0;
    game.weather.dayT = 0.72;
    const eye = [ISLAND.x - 40, 45, ISLAND.z + 300];
    const target = [ISLAND.x, 60, ISLAND.z];
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
    const eye = [game.ferry.x - 50, 20, game.ferry.z + 55];
    const target = [game.ferry.x + 40, 6, game.ferry.z - 5];
    return { eye, target };
  }
  return null;
}

// A one-line description of each shot, for the dossier and the tests.
export function shotDescription(shot) {
  return {
    start: 'Title screen: Vesper City — Ember Isle, golden hour.',
    city: 'Downtown Glass Quarter at golden hour, driving with wanted 2.',
    volcano: 'The volcano cone and lava beacon from the black beach, 300m away.',
    ferry: 'The ferry mid-crossing on the Sunset Sea, island ahead.',
  }[shot] || 'Vesper City: Ember Isle.';
}
