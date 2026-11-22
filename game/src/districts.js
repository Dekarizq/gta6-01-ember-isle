// District data for Vesper City: Ember Isle.
// Fifteen districts across two maps, each with its own palette, a short
// description for the HUD, and the standing unlocks that open as the
// player earns respect there. The standing system reads this file; the
// city and island generators only name districts, they never own them.

import { DISTRICTS } from './config.js';

// Standing thresholds: points needed for each level (0..5).
export const STANDING_THRESHOLDS = [0, 100, 250, 500, 900, 1500];

export function standingLevel(points) {
  let level = 0;
  for (let i = 0; i < STANDING_THRESHOLDS.length; i += 1) {
    if (points >= STANDING_THRESHOLDS[i]) level = i;
  }
  return level;
}

// What each standing level unlocks in a district.
export const STANDING_UNLOCKS = [
  [], // level 0: nothing yet
  ['Corner shop prices drop 10%'], // level 1
  ['Side jobs pay double in this district'], // level 2
  ['A free garage tune-up in this district'], // level 3
  ['A new car spawns here every morning'], // level 4
  ['The district is yours: police look away for 30 seconds'], // level 5
];

export function unlocksForLevel(level) {
  const out = [];
  for (let i = 1; i <= level && i < STANDING_UNLOCKS.length; i += 1) {
    out.push(...STANDING_UNLOCKS[i]);
  }
  return out;
}

// One-line description per district, for the HUD and the title screen.
export const DISTRICT_BLURBS = {
  'Sunset Mile': 'Neon towers and the long golden boulevard.',
  'Harbor Docks': 'Cranes, crates and the smell of the sea.',
  'Old Vesper': 'Brick lanes where the city began.',
  'Glass Quarter': 'Downtown glass, the Storm Spire watching over it.',
  'Sunset Shore': 'East-side streets that catch the last light.',
  'Sunset Beach': 'Sand, palms, umbrellas and the pier.',
  'Marina District': 'White quays, teal water, tied-up boats.',
  'Old Town': 'Church bells and the night market.',
  'Ember Town': 'The island capital, warm stone under the volcano.',
  'Fisher Village': 'Nets, boats and the smell of grilled fish.',
  'Black Sand Beach': 'Volcanic sand that crunches under the tyres.',
  'Volcano Rim': 'Lava glow, sulphur and the crater road.',
  'Ember Resort': 'Pools, palms and tourists with cameras.',
  'Night Market': 'Lanterns, stalls and fried everything.',
  'Lighthouse Point': 'The beam that never sleeps.',
};

export function districtBlurb(name) {
  return DISTRICT_BLURBS[name] || 'A corner of Vesper City.';
}

// All fifteen district names, in map order.
export function allDistrictNames() {
  return DISTRICTS.map((d) => d.name);
}

// The district a point belongs to on either map: city districts first,
// then the island's, by distance from the island centre.
export function districtAtPoint(x, z, cityDistrictAt, islandDistrictAt) {
  // Island first when far east: the island owns everything past the sea.
  if (x > 900) return islandDistrictAt(x, z);
  return cityDistrictAt(x, z);
}

// A summary row for the HUD standing panel.
export function districtStandingRow(name, points) {
  const level = standingLevel(points);
  const next = level + 1 < STANDING_THRESHOLDS.length
    ? STANDING_THRESHOLDS[level + 1] - points
    : 0;
  return { name, points, level, next, blurb: districtBlurb(name) };
}
