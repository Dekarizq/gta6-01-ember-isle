// DOM HUD: cash, health, wanted stars, rank, mission panel, speed, radio,
// toast, weapon wheel, title / pause / busted screens, and a live minimap
// drawn on a small 2D canvas (city grid, island, ferry, player, cops, marker).
import { ISLAND, CITY, FERRY_ROUTE } from './config.js';

export function createHud() {
  const root = document.getElementById('hud');
  const el = {};
  for (const id of ['cash', 'health', 'wanted', 'rank', 'mission', 'mission-text',
    'speed', 'radio', 'toast', 'coins', 'clock', 'wheel', 'title', 'pause',
    'prompt', 'race', 'gps', 'police', 'dialogue']) {
    el[id] = document.getElementById(id);
  }
  const map = document.getElementById('minimap');
  const mctx = map.getContext('2d');

  function stars(n) {
    return '★'.repeat(n) + '☆'.repeat(Math.max(0, 6 - n));
  }

  function drawMap(h) {
    const W = map.width, H = map.height;
    mctx.clearRect(0, 0, W, H);
    // Sea + land.
    mctx.fillStyle = '#274b7a';
    mctx.fillRect(0, 0, W, H);
    const toMap = (x, z) => [((x + 1150) / 1550) * W, ((z + 420) / 840) * H];
    const [cx0, cy0] = toMap(-CITY.half, -CITY.half);
    const [cx1, cy1] = toMap(CITY.half, CITY.half);
    mctx.fillStyle = '#8a7a5c';
    mctx.fillRect(cx0, cy0, cx1 - cx0, cy1 - cy0);
    // City grid.
    mctx.strokeStyle = 'rgba(40,36,30,0.6)';
    mctx.lineWidth = 1;
    for (let i = 0; i <= 9; i += 1) {
      const [gx] = toMap(-CITY.half + i * (2 * CITY.half) / 9, 0);
      mctx.beginPath(); mctx.moveTo(gx, cy0); mctx.lineTo(gx, cy1); mctx.stroke();
      const [, gy] = toMap(0, -CITY.half + i * (2 * CITY.half) / 9);
      mctx.beginPath(); mctx.moveTo(cx0, gy); mctx.lineTo(cx1, gy); mctx.stroke();
    }
    // Island.
    const [ix, iy] = toMap(ISLAND.x, ISLAND.z);
    mctx.fillStyle = '#5c4a38';
    mctx.beginPath(); mctx.arc(ix, iy, 16, 0, Math.PI * 2); mctx.fill();
    mctx.fillStyle = '#ff7a1a';
    mctx.beginPath(); mctx.arc(ix, iy, 4, 0, Math.PI * 2); mctx.fill();
    // Ferry route.
    const [fx0, fy0] = toMap(FERRY_ROUTE.from.x, FERRY_ROUTE.from.z);
    const [fx1, fy1] = toMap(FERRY_ROUTE.to.x, FERRY_ROUTE.to.z);
    mctx.strokeStyle = '#ffd76a';
    mctx.setLineDash([3, 3]);
    mctx.beginPath(); mctx.moveTo(fx0, fy0); mctx.lineTo(fx1, fy1); mctx.stroke();
    mctx.setLineDash([]);
    const [fx, fy] = toMap(h.ferry[0], h.ferry[1]);
    mctx.fillStyle = '#ffffff';
    mctx.fillRect(fx - 3, fy - 2, 6, 4);
    // Mission marker.
    const [tx, ty] = toMap(h.target[0], h.target[1]);
    mctx.fillStyle = '#ffd21f';
    mctx.beginPath(); mctx.arc(tx, ty, 5, 0, Math.PI * 2); mctx.fill();
    mctx.strokeStyle = '#ffd21f';
    mctx.beginPath(); mctx.arc(tx, ty, 8 + 2 * Math.sin(Date.now() / 300), 0, Math.PI * 2); mctx.stroke();
    // Cops.
    mctx.fillStyle = '#3a86ff';
    for (const [px, pz] of h.cops) {
      const [mx, my] = toMap(px, pz);
      mctx.beginPath(); mctx.arc(mx, my, 3, 0, Math.PI * 2); mctx.fill();
    }
    // Player.
    const [px, py] = toMap(h.player[0], h.player[1]);
    mctx.fillStyle = '#ff3b30';
    mctx.beginPath(); mctx.arc(px, py, 4, 0, Math.PI * 2); mctx.fill();
    mctx.strokeStyle = '#ffffff';
    mctx.lineWidth = 1.5;
    mctx.beginPath(); mctx.arc(px, py, 4, 0, Math.PI * 2); mctx.stroke();
  }

  function update(h, screen) {
    el.cash.textContent = `$${h.cash.toLocaleString('en-US')}`;
    el.health.textContent = `♥ ${h.health}`;
    el.health.style.color = h.health < 30 ? '#ff5a4e' : '#7dff8a';
    el.wanted.textContent = stars(h.wanted);
    el.wanted.style.color = h.wanted >= 4 ? '#ff5a4e' : '#ffd21f';
    el.rank.textContent = h.rank;
    el.coins.textContent = `☀ ${h.coins}/42`;
    el.mission.textContent = `${h.mission.id}. ${h.mission.name}`;
    el['mission-text'].textContent = h.missionText;
    el.speed.textContent = h.onFoot ? 'ON FOOT' : `${h.speed} km/h`;
    el.radio.textContent = `${h.station.name} • ${h.station.dj}`;
    const hh = Math.floor(h.dayT * 24);
    const mm = Math.floor((h.dayT * 24 - hh) * 60);
    el.clock.textContent = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}${h.storm ? ' ⛈ STORM' : ''}`;
    el.toast.textContent = h.toast || '';
    el.toast.style.opacity = h.toast ? '1' : '0';
    el.race.textContent = h.race ? `RACE ${h.race.name} — CP ${h.race.cp}/${h.race.laps * 6} — ${h.race.time.toFixed(1)}s` : '';
    el.wheel.textContent = `🔫 ${h.weapon.name}`;
    el.gps.textContent = `🧭 GPS ${h.gps.dist}m • ${h.gps.dir} to target`;
    el.dialogue.textContent = h.dialogue || '';
    if (h.police.length) {
      el.police.style.display = 'block';
      el.police.innerHTML = '<b>🚨 VCPD RESPONSE — ' + h.wanted + '★ · ' + h.police.length + ' UNITS</b><br>' +
        h.police.slice(0, 3).map((u) => `${u.unit} — ${u.tactic} · ${u.dist}m`).join('<br>');
    } else el.police.style.display = 'none';
    el.title.style.display = screen === 'title' ? 'flex' : 'none';
    el.pause.style.display = screen === 'paused' ? 'flex' : 'none';
    root.style.display = screen === 'title' ? 'none' : 'block';
    if (screen !== 'title') drawMap(h);
  }

  function showPrompt(text) {
    el.prompt.textContent = text || '';
  }

  return { update, showPrompt };
}
