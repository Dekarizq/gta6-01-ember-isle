// Procedural colour helpers for Vesper City: Ember Isle.
// Every colour in the game is computed, never loaded: building palettes
// per district, window strips, lava glow, and the small utilities that
// turn a hex strip into the RGB array the renderer wants.

import { GOLD, WINDOW_STRIP } from './config.js';

// '#ffd166' -> [1.0, 0.82, 0.4]
export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

// Multiply a colour by a scalar (darken / lighten).
export function shadeColor(color, f) {
  return [color[0] * f, color[1] * f, color[2] * f];
}

// Blend two colours by t in [0, 1].
export function lerpColor(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

// A warm building base colour for a district, with a shaded variation.
export function districtBaseColor(rng, districtName) {
  const warm = [GOLD.sand, GOLD.cream, GOLD.terracotta, GOLD.gold, GOLD.rose];
  if (districtName === 'Marina District') {
    return rng.pick([[0.92, 0.9, 0.84], [0.75, 0.85, 0.85], [0.55, 0.7, 0.75]]);
  }
  if (districtName === 'Old Town') {
    return rng.pick([[0.58, 0.3, 0.22], [0.7, 0.52, 0.34], [0.8, 0.68, 0.5]]);
  }
  if (districtName === 'Ember Town') {
    return rng.pick([[0.85, 0.45, 0.2], [0.9, 0.6, 0.35], [0.75, 0.4, 0.3]]);
  }
  if (districtName === 'Fisher Village') {
    return rng.pick([[0.6, 0.65, 0.55], [0.7, 0.6, 0.45], [0.55, 0.55, 0.6]]);
  }
  const base = rng.pick(warm);
  const shade = rng.range(0.9, 1.15);
  return [base[0] * shade, base[1] * shade, base[2] * shade];
}

// A random window strip colour from the shared palette.
export function windowStrip(rng) {
  return hexToRgb(rng.pick(WINDOW_STRIP));
}

// Lava colour by pulse (0..1): deep red at rest, bright orange erupting.
export function lavaColor(pulse) {
  return lerpColor([0.55, 0.08, 0.02], [1.0, 0.55, 0.12], pulse);
}

// Sea colour by time of day (0..1): deep blue at noon, gold at dusk.
export function seaColor(dayT) {
  const dusk = Math.max(0, 1 - Math.abs(dayT - 0.75) * 4);
  return lerpColor([0.08, 0.32, 0.55], [0.45, 0.35, 0.35], dusk * 0.7);
}

// Sky clear colour by time of day: golden at dusk, blue at noon.
export function skyColor(dayT) {
  const noon = [0.45, 0.65, 0.9];
  const dusk = [0.98, 0.62, 0.28];
  const w = Math.max(0, 1 - Math.abs(dayT - 0.78) * 5);
  return lerpColor(noon, dusk, w);
}

// Fog colour follows the sky.
export function fogColor(dayT) {
  return skyColor(dayT);
}

// A car's paint with a slight per-car variation.
export function carPaint(rng, base) {
  const f = rng.range(0.9, 1.08);
  return [Math.min(1, base[0] * f), Math.min(1, base[1] * f), Math.min(1, base[2] * f)];
}
