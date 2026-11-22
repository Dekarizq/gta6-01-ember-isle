// District standing for Vesper City: Ember Isle.
// Fifteen districts, one reputation each. Earn standing by doing
// things in a district — missions, races, jobs, businesses — and each
// level unlocks something there: cheaper shops, double job pay, a free
// tune-up, a car that spawns every morning, and at level 5 the police
// look away for thirty seconds. Standing is the long game: the Queen
// of Ember finale needs Ember Town at level 3.

import { STANDING_THRESHOLDS, STANDING_UNLOCKS, standingLevel, unlocksForLevel, districtStandingRow, allDistrictNames } from './districts.js';
import { clamp } from './random.js';

export function createStanding() {
  const points = {};
  for (const name of allDistrictNames()) points[name] = 0;
  return { points, earned: 0, lookawayUntil: 0 };
}

// Earn standing in a district. Returns the new level (and whether it
// went up, for the HUD fanfare).
export function addStanding(standing, district, amount) {
  if (!(district in standing.points)) standing.points[district] = 0;
  const before = standingLevel(standing.points[district]);
  standing.points[district] += amount;
  standing.earned += amount;
  const after = standingLevel(standing.points[district]);
  return { level: after, leveledUp: after > before, points: standing.points[district] };
}

export function standingPoints(standing, district) {
  return standing.points[district] || 0;
}

export function standingLevelOf(standing, district) {
  return standingLevel(standing.points[district] || 0);
}

// The best district: the one Mara has earned the most standing in.
export function topDistrict(standing) {
  let best = null;
  let bestPts = -1;
  for (const name of Object.keys(standing.points)) {
    if (standing.points[name] > bestPts) { bestPts = standing.points[name]; best = name; }
  }
  return { name: best, points: bestPts, level: standingLevel(bestPts) };
}

// Total standing across all districts, for the title screen.
export function totalStanding(standing) {
  let total = 0;
  for (const name of Object.keys(standing.points)) total += standing.points[name];
  return total;
}

// Level 5 perk: the police look away. Call when Mara reaches level 5
// in a district; the world loop checks lookawayUntil against the clock.
export function grantLookaway(standing, time) {
  standing.lookawayUntil = time + 30;
  return standing.lookawayUntil;
}

export function isLookaway(standing, time) {
  return time < standing.lookawayUntil;
}

// All fifteen rows for the HUD standing panel, richest first.
export function standingRows(standing) {
  const rows = [];
  for (const name of Object.keys(standing.points)) {
    rows.push(districtStandingRow(name, standing.points[name]));
  }
  rows.sort((a, b) => b.points - a.points);
  return rows;
}

export function standingSummary(standing) {
  const rows = standingRows(standing);
  const top = topDistrict(standing);
  return {
    total: totalStanding(standing),
    earned: standing.earned,
    top: top.name,
    topLevel: top.level,
    rows,
  };
}

// What a district unlocks at its current level, for the HUD hint.
export function standingUnlocks(standing, district) {
  const level = standingLevelOf(standing, district);
  return { level, unlocks: unlocksForLevel(level) };
}

export function standingSave(standing) {
  return { points: standing.points, earned: standing.earned, lookawayUntil: standing.lookawayUntil };
}

export function standingLoad(data) {
  const s = createStanding();
  if (!data) return s;
  if (data.points && typeof data.points === 'object') {
    for (const name of Object.keys(data.points)) {
      if (name in s.points) s.points[name] = clamp(Math.floor(data.points[name]) || 0, 0, 100000);
    }
  }
  if (Number.isFinite(data.earned)) s.earned = data.earned;
  if (Number.isFinite(data.lookawayUntil)) s.lookawayUntil = data.lookawayUntil;
  return s;
}

export { STANDING_THRESHOLDS, STANDING_UNLOCKS };
