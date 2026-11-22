// Save slots for Vesper City: Ember Isle.
// Three slots in localStorage, plus autosave. Slot 1 is the autosave
// slot: the game writes it whenever a mission ends. The slot screen
// shows each slot's summary, and loading a slot rebuilds the whole
// game state from the save data. In Node (the logic sim) there is no
// localStorage, so the slots fall back to a memory store — the same
// code, the same shape, no browser needed.

import { SAVE_VERSION, validateSave, saveSummary } from './save.js';

const SLOT_KEY = (n) => `vesper-city-ember-isle-save-${n}`;
export const SLOT_COUNT = 3;

// A memory fallback for environments without localStorage.
const memoryStore = {};

function storeGet(key) {
  try {
    if (typeof localStorage !== 'undefined') return localStorage.getItem(key);
  } catch { /* private mode */ }
  return memoryStore[key] ?? null;
}

function storeSet(key, value) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
      return;
    }
  } catch { /* private mode */ }
  memoryStore[key] = value;
}

export function loadSlot(n) {
  const raw = storeGet(SLOT_KEY(n));
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    return validateSave(data);
  } catch {
    return null;
  }
}

export function saveSlot(n, data) {
  const stamped = { ...data, version: SAVE_VERSION, savedAt: new Date().toISOString() };
  storeSet(SLOT_KEY(n), JSON.stringify(stamped));
  return stamped;
}

export function slotSummary(n) {
  const data = loadSlot(n);
  return data ? saveSummary(data) : 'Empty slot';
}

export function slotSummaries() {
  const out = [];
  for (let i = 1; i <= SLOT_COUNT; i += 1) {
    out.push({ slot: i, summary: slotSummary(i), filled: !!loadSlot(i) });
  }
  return out;
}

// Autosave: slot 1, written whenever a mission ends or a day passes.
export function autosave(data) {
  return saveSlot(1, data);
}

export function autosaveSummary() {
  return slotSummary(1);
}
