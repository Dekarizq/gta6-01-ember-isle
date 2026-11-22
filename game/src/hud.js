// The HUD for Vesper City: Ember Isle.
// A dense but slim overlay: cash and health top-left, the mission
// panel down the left, small chips down the right (radio, weather,
// businesses, ferry), the minimap bottom-right, the controls hint
// bottom-left, and the message toast at the bottom centre. Panels are
// narrow on purpose — nothing overlaps the minimap at 1280x720, and
// nothing is cut off at the bottom. The HUD never draws in WebGL; it
// writes text into the DOM and draws the minimap on a 2D canvas.

import { RESPECT_RANKS, CREW } from './config.js';
import { wantedStars } from './police.js';

// The respect rank for a point total.
export function respectRank(points) {
  let rank = RESPECT_RANKS[0];
  for (const r of RESPECT_RANKS) {
    if (points >= r.at) rank = r;
  }
  const next = RESPECT_RANKS.find((r) => r.at > points);
  return {
    name: rank.name,
    at: rank.at,
    next: next ? next.name : null,
    nextAt: next ? next.at : null,
    progress: next ? Math.round(((points - rank.at) / (next.at - rank.at)) * 100) : 100,
  };
}

export function crewLabel() {
  return `CREW: ${CREW.join(' · ')}`;
}

// Build the HUD DOM inside a container element. Returns the element
// handles the world loop updates every frame.
export function createHudElements(container) {
  const el = (tag, cls, parent) => {
    const d = container.ownerDocument.createElement(tag);
    if (cls) d.className = cls;
    (parent || container).appendChild(d);
    return d;
  };
  const hud = {};
  hud.root = el('div', 'hud');
  const topLeft = el('div', 'hud-topleft', hud.root);
  hud.cash = el('div', 'hud-cash', topLeft);
  hud.health = el('div', 'hud-health', topLeft);
  hud.wanted = el('div', 'hud-wanted', topLeft);
  hud.rank = el('div', 'hud-rank', topLeft);
  hud.mission = el('div', 'hud-mission', hud.root);
  hud.missionTitle = el('div', 'hud-mission-title', hud.mission);
  hud.missionStep = el('div', 'hud-mission-step', hud.mission);
  hud.missionNext = el('div', 'hud-mission-next', hud.mission);
  const right = el('div', 'hud-right', hud.root);
  hud.radio = el('div', 'hud-chip', right);
  hud.weather = el('div', 'hud-chip', right);
  hud.business = el('div', 'hud-chip', right);
  hud.ferry = el('div', 'hud-chip', right);
  hud.police = el('div', 'hud-chip', right);
  hud.speed = el('div', 'hud-speed', hud.root);
  hud.controls = el('div', 'hud-controls', hud.root);
  hud.controls.textContent = 'WASD drive · E steal car · Click shoot · Hold Q weapons · R radio · G garage · B business · J jobs · L GPS · K save';
  hud.toast = el('div', 'hud-toast', hud.root);
  hud.wheel = el('div', 'hud-wheel', hud.root);
  hud.minimap = el('canvas', 'hud-minimap', hud.root);
  hud.minimap.width = 180;
  hud.minimap.height = 180;
  return hud;
}

// Update every HUD text field from the game state. Called once a frame.
export function updateHud(hud, s) {
  const rank = respectRank(s.respect);
  hud.cash.textContent = `$${Math.floor(s.cash).toLocaleString()}`;
  hud.health.textContent = `HEALTH ${Math.max(0, Math.round(s.health))} · ${s.inCar ? s.carName : 'On foot — press E near a car to steal it'}`;
  hud.wanted.textContent = `WANTED ${wantedStars(s.wanted)}`;
  hud.rank.textContent = `${rank.name} · ${s.respect} RESPECT · next ${rank.next || 'MAX'} ${rank.progress}%`;
  if (s.mission) {
    hud.missionTitle.textContent = `MISSION ${s.mission.id}/20 · ${s.mission.title.toUpperCase()}`;
    hud.missionStep.textContent = `STAGE — ${s.missionStep}`;
    hud.missionNext.textContent = s.missionNext ? `NEXT ${s.missionNext}m` : '';
  } else {
    hud.missionTitle.textContent = 'NO MISSION — drive to the next marker';
    hud.missionStep.textContent = '';
    hud.missionNext.textContent = '';
  }
  hud.radio.textContent = s.radioLabel || '';
  hud.weather.textContent = s.weatherLabel || '';
  hud.business.textContent = s.businessLabel || '';
  hud.ferry.textContent = s.ferryLabel || '';
  hud.police.textContent = s.policeLabel || '';
  hud.speed.textContent = s.inCar ? `${Math.round(Math.abs(s.speed) * 3.2)}\nKM/H\n${s.carName}` : '0\nKM/H\nON FOOT';
  if (s.toast) hud.toast.textContent = s.toast;
  hud.toast.style.opacity = s.toast ? '1' : '0';
  // The weapon wheel: four slots, the selected one highlighted.
  if (s.wheelOpen) {
    hud.wheel.style.display = 'block';
    hud.wheel.innerHTML = s.wheelRows.map((r) => `<div class="${r.selected ? 'sel' : ''}">${r.index} ${r.name} ${r.ammo}</div>`).join('');
  } else {
    hud.wheel.style.display = 'none';
  }
}

// -------------------------------------------------------------- minimap
// The minimap: a 2D top-down view of both maps. City roads are thin
// lines, the island is a circle with a volcano dot, the sea is blue,
// the player is a gold dot, the mission target is a pulsing star, the
// police are red dots and the ferry is a white dot on the water.
const MAP_BOUNDS = { x0: -300, x1: 1600, z0: -300, z1: 320 };

export function drawMinimap(canvas, s, time) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  const sx = (x) => ((x - MAP_BOUNDS.x0) / (MAP_BOUNDS.x1 - MAP_BOUNDS.x0)) * W;
  const sz = (z) => ((z - MAP_BOUNDS.z0) / (MAP_BOUNDS.z1 - MAP_BOUNDS.z0)) * H;
  ctx.fillStyle = '#1a2a3a';
  ctx.fillRect(0, 0, W, H);
  // The sea.
  ctx.fillStyle = '#274b6d';
  ctx.fillRect(sx(280), 0, sx(990) - sx(280), H);
  // The city ground.
  ctx.fillStyle = '#3a3230';
  ctx.fillRect(sx(-230), sz(-230), sx(230) - sx(-230), sz(230) - sz(-230));
  // City roads.
  ctx.strokeStyle = '#5a5148';
  ctx.lineWidth = 1;
  for (const c of s.roadLines || []) {
    ctx.beginPath();
    ctx.moveTo(sx(c), sz(-230));
    ctx.lineTo(sx(c), sz(230));
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(sx(-230), sz(c));
    ctx.lineTo(sx(230), sz(c));
    ctx.stroke();
  }
  // The island: a dark circle with a lava dot.
  ctx.fillStyle = '#2e2a28';
  ctx.beginPath();
  ctx.arc(sx(1250), sz(0), 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff5510';
  ctx.beginPath();
  ctx.arc(sx(1250), sz(0), 3, 0, Math.PI * 2);
  ctx.fill();
  // The ferry.
  if (s.ferry) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(sx(s.ferry.x), sz(s.ferry.z), 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // The mission target: a pulsing gold star.
  if (s.missionTarget) {
    const pulse = 3 + Math.sin((time || 0) * 5) * 1.5;
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(sx(s.missionTarget.x), sz(s.missionTarget.z), pulse, 0, Math.PI * 2);
    ctx.fill();
  }
  // Police dots.
  ctx.fillStyle = '#ff3355';
  for (const c of s.policeDots || []) {
    ctx.beginPath();
    ctx.arc(sx(c.x), sz(c.z), 2, 0, Math.PI * 2);
    ctx.fill();
  }
  // The player: a gold dot with a direction tick.
  ctx.fillStyle = '#ffd166';
  ctx.beginPath();
  ctx.arc(sx(s.x), sz(s.z), 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(sx(s.x), sz(s.z));
  ctx.lineTo(sx(s.x + Math.sin(s.angle) * 12), sz(s.z + Math.cos(s.angle) * 12));
  ctx.stroke();
  // The GPS route, when one is set.
  if (s.route && s.route.length > 1) {
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(sx(s.x), sz(s.z));
    for (const p of s.route) ctx.lineTo(sx(p.x), sz(p.z));
    ctx.stroke();
  }
}

// The title screen lines: the game name, the subtitle and the prompt.
export function titleLines() {
  return {
    title: 'VESPER CITY',
    subtitle: 'EMBER ISLE',
    tagline: 'A golden-hour open world. Twenty missions. One volcano. One crown.',
    prompt: 'Press ENTER or click to start · WASD to drive · E to steal a car',
    stats: '20 story missions · 8 radio stations · ferry to Ember Isle · 6 street races',
  };
}
