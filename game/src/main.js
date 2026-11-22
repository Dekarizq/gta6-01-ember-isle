// Boot and the one loop: input every frame, the world in fixed 1/60 s steps,
// WebGL paint, DOM HUD. Screens: title, play, paused.
// ?shot=start|city|volcano|ferry (&seed=N) stages that scene, paints twice and
// sets window.__shotReady for a screenshot.
// ?sim=1 (&seed=N) runs a 60-second headless free-play autopilot and writes
// its result as JSON into #sim-result, for local verification.
import { STEP, SKY } from './config.js';
import { createRandom } from './random.js';
import { createGame, EVENT_WASTED, EVENT_BUSTED } from './game.js';
import { createRenderer } from './render.js';
import { createInput } from './input.js';
import { createHud } from './hud.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const sim = params.get('sim') === '1';
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const flash = document.getElementById('flash');
const game = createGame(createRandom(seed));
const renderer = createRenderer(canvas);
const hud = createHud();
const audio = createAudio();
let screen = 'title';
let cameraOverride = null;

function skyFor(dayT) {
  // Golden hour most of the day; dusk late, pale dawn early.
  if (dayT > 0.82 || dayT < 0.08) return SKY.dusk;
  return SKY.clear;
}

function paint() {
  const cam = cameraOverride || game.camera();
  game.render(renderer);
  const out = renderer.draw(cam, skyFor(game.state.dayT));
  if (flash) flash.style.opacity = game.state.lightning > 0 ? '0.55' : '0';
  return { boxes: out.boxes, drawn: out.verts };
}

function runShot(name) {
  const staged = stageShot(name, game);
  screen = staged.screen;
  cameraOverride = staged.camera;
  game.state.screen = screen;
  let painted = 0;
  function paintFrame() {
    paint();
    hud.update(game.hud(), screen);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paintFrame);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paintFrame);
}

// Headless self-test: drive toward the mission marker for 60 simulated
// seconds (enter the nearest car first), then report. No rendering per step,
// only a paint every second to count boxes — it must finish with no errors.
function runSim() {
  const result = { seed, steps: 0, events: 0, errors: [], boxes: 0, trace: [], final: null };
  try {
    game.reset();
    game.state.screen = 'play';
    const p = game.state.player;
    // Walk to the Sunset GT and steal in.
    const gt = game.state.cars.find((c) => c.owned);
    p.x = gt.x + 3; p.z = gt.z;
    game.step(STEP, { fwd: false, back: false, left: false, right: false, enter: true });
    const total = 60 / STEP;
    let stuckT = 0;
    let reversing = 0;
    for (let i = 0; i < total; i += 1) {
      const [tx, tz] = game.missionTarget();
      const dx = tx - p.x, dz = tz - p.z;
      // Manhattan steering: follow the street grid, one axis at a time.
      const want = Math.abs(dx) > 10 ? Math.atan2(Math.sign(dx), 0) : Math.atan2(0, Math.sign(dz));
      let diff = want - p.yaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const speed = Math.abs(p.speed || 0);
      if (speed < 0.5 && !p.onFoot) stuckT += STEP; else stuckT = 0;
      if (stuckT > 3) { reversing = 1; stuckT = 0; }
      if (reversing > 0) reversing -= STEP;
      const input = {
        // Brake through very sharp turns (back is the brake while moving
        // forward): a slow turn has a much smaller radius, so the car stays
        // on the street instead of sliding wide into the buildings.
        fwd: reversing <= 0 && Math.abs(diff) < 0.9,
        back: reversing > 0 || Math.abs(diff) > 0.9,
        left: reversing > 0 ? diff < -0.12 : diff > 0.12,
        right: reversing > 0 ? diff > 0.12 : diff < -0.12,
        handbrake: false, sprint: false,
      };
      result.events |= game.step(STEP, input);
      result.steps += 1;
      if (i % 600 === 0) {
        result.trace.push([i, Math.round(p.x), Math.round(p.z), +p.yaw.toFixed(2),
          Math.round(Math.abs(p.speed || 0)), game.state.waypoint]);
      }
      if (i % 60 === 0) {
        const c = paint();
        result.boxes = c.boxes;
      }
      if (game.state.health <= 0) { result.errors.push('wasted during sim'); break; }
    }
    result.final = {
      x: Math.round(p.x), z: Math.round(p.z), cash: game.state.cash,
      mission: game.state.mission, waypoint: game.state.waypoint,
      wanted: game.state.wanted, coins: game.state.coins,
      speed: Math.round(Math.abs(p.speed || 0)),
    };
    result.ok = result.errors.length === 0;
  } catch (e) {
    result.ok = false;
    result.errors.push(String(e && e.message ? e.message : e));
  }
  const el = document.getElementById('sim-result');
  if (el) el.textContent = JSON.stringify(result);
  window.__simResult = result;
  window.__shotReady = true;
}

function runGame() {
  const input = createInput(canvas);
  let accumulator = 0;
  let last = performance.now();
  let saved = game.loadGame();
  if (saved) hud.showPrompt('Save loaded — welcome back to Vesper City');
  game.state.screen = 'title';

  function startGame() {
    audio.ensure();
    game.reset();
    screen = 'play';
    game.state.screen = 'play';
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const keys = input.read();
    if (keys.confirm && screen === 'title') startGame();
    else if (keys.pause && screen === 'play') { screen = 'paused'; game.state.screen = 'paused'; }
    else if ((keys.pause || keys.confirm) && screen === 'paused') { screen = 'play'; game.state.screen = 'play'; }
    if (screen === 'play') {
      while (accumulator >= STEP) {
        const ev = game.step(STEP, keys);
        if (ev & EVENT_WASTED) audio.blip(220);
        if (ev & EVENT_BUSTED) audio.blip(330);
        accumulator -= STEP;
        keys.enter = false; keys.shoot = false; keys.weaponWheel = false;
        keys.radio = false; keys.garage = false; keys.business = false;
        keys.jobs = false; keys.save = false; keys.map = false;
      }
      audio.update(game.state.player.speed || 0, game.state.wanted, game.state.player.onFoot);
    } else accumulator = 0;
    paint();
    hud.update(game.hud(), screen);
    if (keys.map && screen === 'play') {
      const m = document.getElementById('minimap');
      m.style.width = m.style.width === '440px' ? '220px' : '440px';
      m.style.height = m.style.height === '240px' ? '120px' : '240px';
    }
  }
  requestAnimationFrame(frame);
}

if (sim) runSim();
else if (shot) runShot(shot);
else runGame();
