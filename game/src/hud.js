// HUD: cash, health, wanted stars, mission panel, speed, minimap, toasts,
// weapon wheel, title screen, pause and map overlays.
import { RADIO, WEAPONS, MISSIONS, DISTRICTS, CITY, ISLE, VOLCANO, SUN_COINS_TOTAL, CONTROLS_TEXT } from './config.js';
import { currentMission } from './game.js';

export function buildHud(document) {
  const hud = document.createElement('div');
  hud.id = 'hud';
  hud.innerHTML = `
    <div id="top-left">
      <div id="cash">$0</div>
      <div id="health-bar"><div id="health-fill"></div><span id="health-text">100</span></div>
      <div id="wanted"></div>
      <div id="rank">Rookie Driver</div>
    </div>
    <div id="mission-panel">
      <div id="mission-title">MISSION</div>
      <div id="mission-brief"></div>
      <div id="mission-count"></div>
    </div>
    <div id="top-right">
      <div id="clock">17:24</div>
      <div id="weather">GOLDEN HOUR</div>
      <div id="radio">SUNSET 88.1</div>
      <div id="coins">Sun Coins 0/${SUN_COINS_TOTAL}</div>
    </div>
    <div id="speed-box"><span id="speed">0</span><span id="speed-unit">mph</span></div>
    <canvas id="minimap" width="180" height="180"></canvas>
    <div id="toast"></div>
    <div id="weapon-wheel"></div>
    <div id="controls-hint">${CONTROLS_TEXT}</div>
    <div id="title-screen">
      <h1>VESPER CITY</h1>
      <h2>EMBER ISLE</h2>
      <p class="tagline">Take back the city. Rule the island.</p>
      <p class="start">Press ENTER or click to start</p>
      <p class="credits">Mara Voss · 20 story missions · 6 street races · 10 businesses · 42 Sun Coins</p>
    </div>
    <div id="pause-screen" style="display:none">
      <h1>PAUSED</h1>
      <p>Press P to resume · K to save · M for map</p>
    </div>
    <div id="map-screen" style="display:none">
      <h1>MAP — VESPER CITY &amp; EMBER ISLE</h1>
      <canvas id="bigmap" width="760" height="520"></canvas>
      <p>Press M to close</p>
    </div>`;
  document.body.appendChild(hud);
  return hud;
}

function fmtClock(dayTime) {
  const h = Math.floor(dayTime) % 24;
  const m = Math.floor((dayTime % 1) * 60);
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}

export function updateHud(state, document) {
  const $ = (id) => document.getElementById(id);
  const p = state.player;
  $('cash').textContent = '$' + p.cash.toLocaleString('en-US');
  $('health-fill').style.width = p.health + '%';
  $('health-fill').style.background = p.health > 50 ? '#37d67a' : p.health > 25 ? '#ffb02e' : '#ff3b30';
  $('health-text').textContent = Math.round(p.health);
  $('wanted').textContent = '★'.repeat(p.wanted) + '☆'.repeat(Math.max(0, 6 - p.wanted));
  $('wanted').style.color = p.wanted > 0 ? '#ff3b30' : '#ffd23c';
  $('rank').textContent = p.rank;
  const m = currentMission(state);
  if (m) {
    $('mission-title').textContent = `MISSION ${m.id}/20 — ${m.title.toUpperCase()}`;
    $('mission-brief').textContent = m.brief;
    $('mission-count').textContent = `Reward $${m.reward} · ${m.area === 'isle' ? 'Ember Isle' : 'Vesper City'}`;
  } else {
    $('mission-title').textContent = 'ALL MISSIONS COMPLETE';
    $('mission-brief').textContent = 'You are the Queen of Ember.';
    $('mission-count').textContent = '';
  }
  $('clock').textContent = fmtClock(state.dayTime);
  $('weather').textContent = state.weather === 'hurricane' ? '⚡ HURRICANE' : state.dayTime < 6 || state.dayTime > 19 ? 'NIGHT' : 'GOLDEN HOUR';
  const st = RADIO[state.radioIndex];
  $('radio').textContent = (state.radioOn ? '♪ ' : '♪ muted ') + st.name + ' — ' + st.dj;
  $('coins').textContent = `Sun Coins ${state.coinsCollected}/${SUN_COINS_TOTAL}`;
  $('speed').textContent = Math.round(Math.abs(p.speed || 0) * 1.6);
  const toastEl = $('toast');
  toastEl.textContent = state.time < state.toastUntil ? state.toast : '';
  toastEl.style.opacity = state.time < state.toastUntil ? '1' : '0';
  $('title-screen').style.display = state.started ? 'none' : 'flex';
  $('pause-screen').style.display = state.paused ? 'flex' : 'none';
  $('map-screen').style.display = state.showMap ? 'flex' : 'none';
  // Weapon wheel (hold Q).
  const wheel = $('weapon-wheel');
  if (state.showWheel) {
    wheel.style.display = 'block';
    wheel.innerHTML = WEAPONS.map((w, i) =>
      `<div class="wheel-item${i === p.weapon ? ' active' : ''}">${w.name}</div>`).join('');
  } else {
    wheel.style.display = 'none';
  }
  drawMinimap(state, $('minimap'));
  if (state.showMap) drawBigMap(state, $('bigmap'));
}

function drawMinimap(state, canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.fillStyle = 'rgba(10,12,20,0.85)';
  ctx.fillRect(0, 0, W, H);
  const scale = W / 1100;
  const ox = W / 2 - (state.player.x + 300) * scale;
  const oy = H / 2 - (state.player.z + 40) * scale;
  const X = (x) => ox + x * scale, Z = (z) => oy + z * scale;
  // Sea.
  ctx.fillStyle = '#1d4a7a';
  ctx.fillRect(0, 0, W, H);
  // City + isle land.
  ctx.fillStyle = '#3a3f4a';
  ctx.fillRect(X(-230), Z(-230), 460 * scale, 460 * scale);
  ctx.fillStyle = '#2c2f38';
  ctx.beginPath(); ctx.arc(X(ISLE.x), Z(ISLE.z), ISLE.radius * scale, 0, Math.PI * 2); ctx.fill();
  // Volcano.
  ctx.fillStyle = '#ff5c1f';
  ctx.beginPath(); ctx.arc(X(VOLCANO.x), Z(VOLCANO.z), 14, 0, Math.PI * 2); ctx.fill();
  // Mission target.
  const m = currentMission(state);
  if (m) {
    const d = DISTRICTS.find(dd => dd.name === m.target);
    if (d) {
      ctx.fillStyle = '#ffd23c';
      ctx.beginPath(); ctx.arc(X(d.x), Z(d.z), 6, 0, Math.PI * 2); ctx.fill();
    }
  }
  // Police.
  ctx.fillStyle = '#3b82f6';
  for (const c of state.police) { ctx.fillRect(X(c.x) - 2, Z(c.z) - 2, 4, 4); }
  // Player arrow.
  ctx.save();
  ctx.translate(X(state.player.x), Z(state.player.z));
  ctx.rotate(state.player.heading);
  ctx.fillStyle = '#ff5c1f';
  ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(5, 6); ctx.lineTo(-5, 6); ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.strokeRect(0.5, 0.5, W - 1, H - 1);
}

function drawBigMap(state, canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.fillStyle = '#0e1a2e'; ctx.fillRect(0, 0, W, H);
  const scale = W / 1150;
  const X = (x) => (x + 850) * scale, Z = (z) => (z + 330) * scale;
  ctx.fillStyle = '#2e3440';
  ctx.fillRect(X(-230), Z(-230), 460 * scale, 460 * scale);
  ctx.beginPath(); ctx.arc(X(ISLE.x), Z(ISLE.z), ISLE.radius * scale, 0, Math.PI * 2);
  ctx.fillStyle = '#3d2f2a'; ctx.fill();
  ctx.fillStyle = '#ff5c1f';
  ctx.beginPath(); ctx.arc(X(VOLCANO.x), Z(VOLCANO.z), 12, 0, Math.PI * 2); ctx.fill();
  ctx.font = '13px sans-serif';
  for (const d of DISTRICTS) {
    ctx.fillStyle = '#ffd23c';
    ctx.fillRect(X(d.x) - 2, Z(d.z) - 2, 4, 4);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(d.name, X(d.x) + 5, Z(d.z) + 4);
  }
  ctx.fillStyle = '#ff5c1f';
  ctx.beginPath(); ctx.arc(X(state.player.x), Z(state.player.z), 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillText('MARA VOSS', X(state.player.x) + 8, Z(state.player.z) + 4);
}
