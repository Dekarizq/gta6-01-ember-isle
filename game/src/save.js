// Save data for Vesper City: Ember Isle.
// The whole game state as one plain JSON object: cash, respect, the
// mission list, the car, the businesses, the races, the standing, the
// coins, the weather and the player's place. This file owns the shape
// of a save and the conversions to and from it; saveslots.js owns the
// three slots on disk. Nothing here touches localStorage, so the logic
// sim can round-trip a save without a browser.

export const SAVE_VERSION = 8;

export function createSaveData() {
  return {
    version: SAVE_VERSION,
    cash: 500,
    respect: 0,
    health: 100,
    player: { x: -20, z: 300, angle: 0, inCar: false },
    missionsDone: [],
    currentMission: 1,
    coins: null,
    business: null,
    islandBusiness: null,
    races: null,
    standing: null,
    jobs: null,
    islandJobs: null,
    police: null,
    islandPolice: null,
    weather: null,
    car: null,
    wheel: null,
    ferry: null,
    day: 1,
    playtime: 0,
  };
}

// Validate a loaded save: version, numbers, lists. Returns the save
// or null when it is too broken to use.
export function validateSave(data) {
  if (!data || typeof data !== 'object') return null;
  if (data.version !== SAVE_VERSION) return null;
  if (!Number.isFinite(data.cash)) return null;
  if (!Number.isFinite(data.respect)) return null;
  if (!Array.isArray(data.missionsDone)) return null;
  return data;
}

// A one-line summary for the slot screen.
export function saveSummary(data) {
  if (!data) return 'Empty slot';
  return `Day ${data.day} · $${Math.floor(data.cash).toLocaleString()} · ${data.missionsDone.length}/20 missions · ${Math.floor((data.playtime || 0) / 60)} min played`;
}

// Merge a loaded save into a fresh one, so missing fields from an
// older save never crash the game.
export function mergeSave(fresh, loaded) {
  const out = { ...fresh };
  for (const key of Object.keys(loaded || {})) {
    if (key in out) out[key] = loaded[key];
  }
  return out;
}
