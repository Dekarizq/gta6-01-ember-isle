// Vesper City: Ember Isle — entry point.
// Boots the game in the browser: the renderer, the HUD, the input,
// the title screen, and the screenshot staging (?shot=start/city/
// volcano/ferry&seed=1). The loop is the same stepGame the Node sim
// drives — the browser only adds the canvas, the DOM and the clock.
// Exposes window.__game and window.__fps for debugging and for the
// screenshot tooling.

import { WORLD } from './src/config.js';
import { createGame, stepGame, renderGame, gameHudState } from './src/world.js';
import { Renderer } from './src/engine.js';
import { createInput, attachInput } from './src/input.js';
import { createHudElements, updateHud, drawMinimap, titleLines } from './src/hud.js';
import { applyShot, shotFromQuery } from './src/shots.js';

const params = new URLSearchParams(window.location.search);
const seed = parseInt(params.get('seed') || String(WORLD.seed), 10) || WORLD.seed;
const shot = shotFromQuery(window.location.search);

const game = createGame(seed);
const canvas = document.getElementById('game');
const renderer = new Renderer(canvas);
const hudRoot = document.getElementById('hud');
const hud = createHudElements(hudRoot);
const title = document.getElementById('title');
const lines = titleLines();
document.getElementById('title-name').textContent = lines.title;
document.getElementById('title-sub').textContent = lines.subtitle;
document.getElementById('title-tag').textContent = lines.tagline;
document.getElementById('title-prompt').textContent = lines.prompt;
document.getElementById('title-stats').textContent = lines.stats;

// Screenshot staging: move the player and the camera for the shot,
// or leave the title screen up for ?shot=start.
const cameraOverride = applyShot(game, shot);

// Input: keyboard, mouse click to shoot, wheel to switch weapons.
const input = game.input;
attachInput(input, window);
canvas.addEventListener('mousedown', () => {
  input.mousePressed = true;
  input.mouseDown = true;
});
window.addEventListener('mouseup', () => {
  input.mouseDown = false;
});
window.addEventListener('wheel', (e) => {
  input.wheel = e.deltaY > 0 ? 1 : -1;
  setTimeout(() => { input.wheel = 0; }, 50);
}, { passive: true });

// Resize the canvas to the window — through the renderer, so the
// WebGL viewport and aspect follow the canvas size. (Without this the
// scene renders into the canvas's default 300x150 viewport in the
// bottom-left corner and the rest of the screen is flat sky colour.)
function resize() {
  renderer.resize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', resize);
resize();

// Mute toggle.
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyM') game.muted = !game.muted;
});

window.__game = game;
window.__fps = 0;

let last = performance.now();
let frames = 0;
let fpsTime = 0;

function loop(now) {
  const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
  last = now;
  stepGame(game, input, dt);
  // The ferry sails, so its shot camera must track it every frame —
  // a fixed camera stares at the water where the ferry used to be.
  // Closer and lower than the first framing, so the ferry fills ~40%
  // of the frame with the island behind it.
  const cam = shot === 'ferry'
    ? { eye: [game.ferry.x - 35, 12, game.ferry.z + 38], target: [game.ferry.x + 30, 8, game.ferry.z - 10] }
    : cameraOverride;
  renderGame(game, renderer, cam);
  const hs = gameHudState(game);
  updateHud(hud, hs);
  drawMinimap(hud.minimap, hs, game.time);
  title.style.display = game.state === 'title' ? 'flex' : 'none';
  // FPS counter, once a second.
  frames += 1;
  fpsTime += dt;
  if (fpsTime >= 1) {
    window.__fps = Math.round(frames / fpsTime);
    frames = 0;
    fpsTime = 0;
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
