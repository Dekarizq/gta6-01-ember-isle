// The weapon wheel for Vesper City: Ember Isle.
// Hold Q and the wheel opens: four slots around Mara — fists, the
// Vesper 9mm, the Mako SMG and the Golden 12-Gauge. The wheel is a
// pure state machine: it owns the four weapons, the ammo, the fire
// timers and the selected slot, and the world loop asks it what Mara
// is holding and whether she may fire. The HUD draws the wheel from
// this state, so the wheel and the game can never disagree.

import { WEAPONS } from './config.js';
import { weaponById } from './combat.js';

export function createWeaponWheel() {
  return {
    weapons: WEAPONS.map((w) => ({ ...w, ammoLeft: w.ammo })),
    selected: 0,
    open: false,
    cooldown: 0,
    lastFired: 0,
    shotsFired: 0,
    hits: 0,
  };
}

export function wheelWeapon(wheel) {
  return wheel.weapons[wheel.selected];
}

export function wheelSelect(wheel, index) {
  if (index >= 0 && index < wheel.weapons.length) {
    wheel.selected = index;
    wheel.cooldown = Math.max(wheel.cooldown, 0.15);
  }
  return wheelWeapon(wheel);
}

export function wheelNext(wheel) {
  return wheelSelect(wheel, (wheel.selected + 1) % wheel.weapons.length);
}

export function wheelPrev(wheel) {
  return wheelSelect(wheel, (wheel.selected - 1 + wheel.weapons.length) % wheel.weapons.length);
}

// May the selected weapon fire right now? Cooldown and ammo both count.
export function wheelCanFire(wheel, time) {
  const w = wheelWeapon(wheel);
  if (wheel.cooldown > 0) return false;
  if (time - wheel.lastFired < w.rate) return false;
  if (w.ammoLeft !== Infinity && w.ammoLeft <= 0) return false;
  return true;
}

// Fire: spend ammo, set the cooldown, count the shot. Returns the
// weapon fired, or null when the wheel refuses.
export function wheelFire(wheel, time) {
  if (!wheelCanFire(wheel, time)) return null;
  const w = wheelWeapon(wheel);
  if (w.ammoLeft !== Infinity) w.ammoLeft -= 1;
  wheel.lastFired = time;
  wheel.cooldown = w.rate;
  wheel.shotsFired += 1;
  return w;
}

export function wheelTick(wheel, dt) {
  if (wheel.cooldown > 0) wheel.cooldown -= dt;
}

export function wheelReload(wheel, id, amount) {
  const w = wheel.weapons.find((x) => x.id === id);
  if (!w || w.ammo === Infinity) return 0;
  const before = w.ammoLeft;
  w.ammoLeft = Math.min(w.ammo, w.ammoLeft + amount);
  return w.ammoLeft - before;
}

export function wheelAmmo(wheel, id) {
  const w = wheel.weapons.find((x) => x.id === id);
  return w ? w.ammoLeft : 0;
}

// The wheel's HUD rows: one per slot, with ammo and the selected mark.
export function wheelRows(wheel) {
  return wheel.weapons.map((w, i) => ({
    index: i + 1,
    name: w.name,
    ammo: w.ammoLeft === Infinity ? '∞' : `${w.ammoLeft}`,
    selected: i === wheel.selected,
    damage: w.damage,
    range: w.range,
  }));
}

export function wheelAccuracy(wheel) {
  if (wheel.shotsFired === 0) return 0;
  return Math.round((wheel.hits / wheel.shotsFired) * 100);
}

export function wheelSummary(wheel) {
  return {
    selected: wheelWeapon(wheel).name,
    shotsFired: wheel.shotsFired,
    hits: wheel.hits,
    accuracy: wheelAccuracy(wheel),
    rows: wheelRows(wheel),
  };
}

export { weaponById };
