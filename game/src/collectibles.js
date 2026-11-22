// Sun Coins — the collectible of Vesper City: Ember Isle.
// Forty-two golden coins hidden across the city and the island: on
// rooftops, under the pier, on the volcano road, on the black beach.
// Each one pays $25 on pickup; every sixth in a row pays a $50 streak
// bonus; all forty-two pay a $500 completion bonus. Coins respawn at
// dawn, and the save file remembers which ones Mara already took.

import { makeRng } from './random.js';
import { roadCross } from './city.js';
import { ISLAND } from './island.js';

export const SUN_COIN_COUNT = 42;
export const SUN_COIN_VALUE = 25;
export const SUN_STREAK_BONUS = 50;
export const SUN_ALL_BONUS = 500;

export function makeSunCoins(rng) {
  const coins = [];
  // City coins: on road intersections, the beach and the landmarks.
  const citySpots = [
    [0, 0], [4, 4], [8, 8], [2, 6], [6, 2], [1, 8], [8, 1], [5, 5],
    [3, 3], [7, 7], [0, 8], [8, 0], [4, 1], [1, 4], [9, 9], [9, 0],
  ];
  for (let i = 0; i < citySpots.length; i += 1) {
    const [ix, iz] = citySpots[i];
    const p = roadCross(Math.min(ix, 9), Math.min(iz, 9));
    coins.push({ id: i, x: p.x + rng.range(-4, 4), z: p.z + rng.range(-4, 4), y: 1.2, taken: false, map: 'city' });
  }
  // Beach and pier coins.
  const beachSpots = [
    { x: -20, z: 305 }, { x: 60, z: 300 }, { x: -80, z: 310 },
    { x: 110, z: 315 }, { x: 0, z: 290 }, { x: -140, z: 295 },
  ];
  for (const s of beachSpots) {
    coins.push({ id: coins.length, x: s.x, z: s.z, y: 1.2, taken: false, map: 'city' });
  }
  // Island coins: the volcano road, the black beach, the village, the resort.
  const islandSpots = [
    { x: ISLAND.x + 40, z: ISLAND.z - 120 }, { x: ISLAND.x + 90, z: ISLAND.z - 60 },
    { x: ISLAND.x - 100, z: ISLAND.z + 80 }, { x: ISLAND.x + 150, z: ISLAND.z + 40 },
    { x: ISLAND.x - 170, z: ISLAND.z - 40 }, { x: ISLAND.x + 190, z: ISLAND.z + 60 },
    { x: ISLAND.x - 60, z: ISLAND.z + 195 }, { x: ISLAND.x + 120, z: ISLAND.z + 190 },
    { x: ISLAND.x, z: ISLAND.z - 200 }, { x: ISLAND.x - 200, z: ISLAND.z - 180 },
    { x: ISLAND.x + 235, z: ISLAND.z - 120 }, { x: ISLAND.x - 150, z: ISLAND.z + 130 },
    { x: ISLAND.x + 60, z: ISLAND.z + 120 }, { x: ISLAND.x - 40, z: ISLAND.z - 160 },
    { x: ISLAND.x + 200, z: ISLAND.z - 60 }, { x: ISLAND.x - 220, z: ISLAND.z + 60 },
    { x: ISLAND.x + 20, z: ISLAND.z + 60 }, { x: ISLAND.x - 80, z: ISLAND.z - 100 },
    { x: ISLAND.x + 100, z: ISLAND.z - 180 }, { x: ISLAND.x - 140, z: ISLAND.z + 160 },
  ];
  for (const s of islandSpots) {
    coins.push({ id: coins.length, x: s.x, z: s.z, y: 1.2, taken: false, map: 'island' });
  }
  return coins;
}

export function createCoinState(coins) {
  return {
    coins,
    collected: 0,
    streak: 0,
    bestStreak: 0,
    earned: 0,
    allBonusPaid: false,
  };
}

// Pick up every coin within reach. Returns the cash earned this call
// (coin values + streak bonuses + the all-coins bonus, if earned).
export function collectCoins(state, x, z) {
  let pay = 0;
  for (const c of state.coins) {
    if (c.taken) continue;
    const d = Math.sqrt((c.x - x) * (c.x - x) + (c.z - z) * (c.z - z));
    if (d < 4) {
      c.taken = true;
      state.collected += 1;
      state.streak += 1;
      state.bestStreak = Math.max(state.bestStreak, state.streak);
      pay += SUN_COIN_VALUE;
      state.earned += SUN_COIN_VALUE;
      if (state.streak > 0 && state.streak % 6 === 0) {
        pay += SUN_STREAK_BONUS;
        state.earned += SUN_STREAK_BONUS;
      }
    }
  }
  if (state.collected >= SUN_COIN_COUNT && !state.allBonusPaid) {
    state.allBonusPaid = true;
    pay += SUN_ALL_BONUS;
    state.earned += SUN_ALL_BONUS;
  }
  return pay;
}

// The streak breaks when Mara leaves a coin behind for a whole day:
// the world loop calls this at dawn.
export function resetStreak(state) {
  state.streak = 0;
}

// Respawn every coin at dawn, for the next day's run.
export function respawnCoins(state) {
  for (const c of state.coins) c.taken = false;
  state.collected = 0;
}

export function coinsLeft(state) {
  return state.coins.filter((c) => !c.taken).length;
}

export function coinSummary(state) {
  return {
    collected: state.collected,
    total: state.coins.length,
    left: coinsLeft(state),
    streak: state.streak,
    bestStreak: state.bestStreak,
    earned: state.earned,
    allBonusPaid: state.allBonusPaid,
  };
}

export function coinBoxes(state, time) {
  const boxes = [];
  for (const c of state.coins) {
    if (c.taken) continue;
    const bob = Math.sin(time * 2 + c.id) * 0.3;
    boxes.push({
      x: c.x, y: c.y + bob, z: c.z, w: 0.9, h: 0.9, d: 0.25,
      color: [1.0, 0.82, 0.25], yaw: time + c.id,
    });
  }
  return boxes;
}

export function coinSave(state) {
  return {
    taken: state.coins.map((c) => c.taken),
    collected: state.collected,
    streak: state.streak,
    bestStreak: state.bestStreak,
    earned: state.earned,
    allBonusPaid: state.allBonusPaid,
  };
}

export function coinLoad(data, coins) {
  const s = createCoinState(coins);
  if (!data) return s;
  if (Array.isArray(data.taken)) {
    for (let i = 0; i < data.taken.length && i < coins.length; i += 1) {
      coins[i].taken = !!data.taken[i];
    }
  }
  if (Number.isInteger(data.collected)) s.collected = data.collected;
  if (Number.isInteger(data.streak)) s.streak = data.streak;
  if (Number.isInteger(data.bestStreak)) s.bestStreak = data.bestStreak;
  if (Number.isFinite(data.earned)) s.earned = data.earned;
  if (data.allBonusPaid) s.allBonusPaid = true;
  return s;
}

export { makeRng };
