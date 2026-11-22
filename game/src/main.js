// Vesper City: Ember Isle — bootstrap, main loop, key bindings, shot mode.
import { createGame, update, enterExitCar, cycleRadio, fireWeapon, saveGame, loadGame, buyBusiness, buyUpgrade, startRace, toast } from './game.js';
import { Renderer, renderFrame } from './render.js';
import { createInput } from './input.js';
import { buildHud, updateHud } from './hud.js';
import { RadioEngine } from './audio.js';
import { applyShot } from './shots.js';
import { BUSINESSES, GARAGE_UPGRADES, RACES, WEAPONS } from './config.js';

const params = new URLSearchParams(window.location.search);
const seed = parseInt(params.get('seed') || '1', 10) || 1;
const shotName = params.get('shot');

const state = createGame(seed);
const input = createInput();
const radio = new RadioEngine();
buildHud(document);

const canvas = document.createElement('canvas');
canvas.id = 'game-canvas';
document.body.prepend(canvas);
const renderer = new Renderer(canvas);
function fit() { renderer.resize(window.innerWidth, window.innerHeight); }
window.addEventListener('resize', fit);
fit();

// Shot mode: stage the scene and render a fixed, deterministic frame.
let shotTime = 0;
if (shotName) {
  applyShot(state, shotName);
  state.freePlay = false;
  shotTime = 12.5; // fixed golden-hour moment, deterministic
  window.__shotReady = true;
}

function startGame() {
  if (state.started) return;
  state.started = true;
  radio.ensure();
  radio.startStation(state.radioIndex);
  radio.uiBlip();
  toast(state, 'Welcome back to Vesper City, Mara. Mission 1: Homecoming.', 4);
}

window.addEventListener('keydown', (e) => {
  if (e.code === 'Enter' && !state.started) { startGame(); return; }
  if (!state.started) return;
  if (e.code === 'KeyP') { state.paused = !state.paused; radio.uiBlip(); }
  if (state.paused) return;
  if (e.code === 'KeyE') enterExitCar(state);
  if (e.code === 'KeyR') { cycleRadio(state, 1); radio.startStation(state.radioIndex); }
  if (e.code === 'KeyM') { state.showMap = !state.showMap; }
  if (e.code === 'KeyK') { saveGame(state, state.saveSlot); }
  if (e.code === 'KeyL') toast(state, 'GPS: follow the gold marker to your mission.', 2);
  if (e.code === 'KeyJ') {
    const r = RACES[state.stats.racesWon % RACES.length];
    startRace(state, r.id);
  }
  if (e.code === 'KeyB') {
    const next = BUSINESSES.find(b => !state.businesses.some(o => o.id === b.id));
    if (next) buyBusiness(state, next.id);
    else toast(state, 'You already own every business in Vesper City.', 2);
  }
  if (e.code === 'KeyG') {
    const next = GARAGE_UPGRADES.find(u => (state.garage[u.id] || 0) < u.levels);
    if (next) buyUpgrade(state, next.id);
    else toast(state, 'Garage fully upgraded — RACE SPEC installed.', 2);
  }
  if (e.code === 'KeyQ') state.showWheel = true;
});
window.addEventListener('keyup', (e) => {
  if (e.code === 'KeyQ') state.showWheel = false;
});
window.addEventListener('click', (e) => {
  if (!state.started) { startGame(); return; }
  if (e.target && e.target.id === 'game-canvas') {
    fireWeapon(state);
    radio.gunshot();
  }
});

let last = performance.now();
let frame = 0;
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
  last = now;
  frame++;
  if (shotName) {
    // Deterministic frozen frame for the screenshot.
    renderFrame(renderer, state.world, state, shotTime);
    updateHud(state, document);
    if (frame === 3) window.__shotDone = true;
    requestAnimationFrame(loop);
    return;
  }
  // Steering follows the mouse horizontally while driving.
  if (state.started && !state.paused) {
    const cx = window.innerWidth / 2;
    const dx = (input.mouseX - cx) / cx;
    if (Math.abs(dx) > 0.25) {
      state.player.heading += dx * dt * 0.9;
      if (state.player.car) state.player.car.heading = state.player.heading;
    }
    if (input.mouseDown && frame % 12 === 0) { fireWeapon(state); radio.gunshot(); }
    if (input.isDown('KeyQ')) {
      const idx = Math.floor((input.mouseX / window.innerWidth) * WEAPONS.length);
      state.player.weapon = Math.max(0, Math.min(WEAPONS.length - 1, idx));
    }
  }
  update(state, input, dt);
  renderFrame(renderer, state.world, state, state.time);
  updateHud(state, document);
  if (state.started && state.player.inCar && frame % 20 === 0) radio.engine(state.player.speed, 62);
  if (state.player.wanted >= 2 && frame % 90 === 0) radio.siren();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// Free-play self-test hook used by headless verification.
window.__vesper = {
  state,
  start: startGame,
  drive(seconds) {
    startGame();
    const inputSim = { up: true, down: false, left: false, right: false, handbrake: false, sprint: false };
    const steps = Math.floor(seconds * 60);
    for (let i = 0; i < steps; i++) update(state, inputSim, 1 / 60);
    return { x: state.player.x, z: state.player.z, cash: state.player.cash, wanted: state.player.wanted, mission: state.missionIndex };
  },
};

// Headless self-test: ?test=drive runs 60 s of free play and writes the
// result into the DOM so a headless browser can read it back.
if (params.get('test') === 'drive') {
  window.addEventListener('load', () => {
    window.setTimeout(() => {
      let result;
      try {
        result = window.__vesper.drive(60);
        result.ok = true;
      } catch (e) {
        result = { ok: false, error: String(e && e.message || e) };
      }
      const div = document.createElement('div');
      div.id = 'test-result';
      div.textContent = JSON.stringify(result);
      document.body.appendChild(div);
    }, 500);
  });
}
