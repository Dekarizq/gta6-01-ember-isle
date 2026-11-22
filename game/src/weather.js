// Weather for Vesper City: Ember Isle.
// A full day cycle (dawn, noon, golden hour, night) and a hurricane
// front that builds over seven days: warm build-up, the front offshore,
// the storm itself with lightning, and the calm after. The weather owns
// the clock, the lava pulse, the storm state and the lightning flashes;
// the world loop asks it for the light, and the HUD shows the forecast.

import { clamp } from './random.js';

export const DAY_LENGTH_SEC = 240; // one in-game day = 4 real minutes
export const WEEK_DAYS = 7;

export function createWeather() {
  return {
    day: 1,
    dayT: 0.72, // 0..1 through the day; 0.72 = golden hour
    elapsed: 0,
    stormDay: 3, // the hurricane front arrives on day 3
    storm: 0, // 0 = calm, 1 = full storm
    lightning: 0, // flash timer, counts down
    lightningTimer: 8,
    lavaPulse: 0.5, // volcano glow, 0..1
    rain: 0,
  };
}

// The seven-day forecast: what the HUD shows for tomorrow.
export function forecastFor(weather, dayOffset) {
  const day = ((weather.day - 1 + dayOffset) % WEEK_DAYS) + 1;
  if (day < weather.stormDay) return { day, label: 'Golden Hour', storm: 0 };
  if (day === weather.stormDay) return { day, label: 'Warm Build-Up', storm: 0.25 };
  if (day === weather.stormDay + 1) return { day, label: 'Clouds Gathering', storm: 0.5 };
  if (day === weather.stormDay + 2) return { day, label: 'The Front Is Offshore', storm: 0.75 };
  if (day === weather.stormDay + 3) return { day, label: 'HURRICANE', storm: 1 };
  return { day, label: 'Calm After The Storm', storm: 0.1 };
}

// One weather step: advance the clock, build the storm, flash the
// lightning, pulse the lava.
export function stepWeather(weather, dt, rng) {
  weather.elapsed += dt;
  weather.dayT += dt / DAY_LENGTH_SEC;
  if (weather.dayT >= 1) {
    weather.dayT -= 1;
    weather.day += 1;
    if (weather.day > WEEK_DAYS) weather.day = 1;
  }
  // The storm builds over the week: calm, then the front, then the hit.
  const target = weather.day < weather.stormDay ? 0
    : weather.day === weather.stormDay ? 0.25
    : weather.day === weather.stormDay + 1 ? 0.5
    : weather.day === weather.stormDay + 2 ? 0.75
    : weather.day === weather.stormDay + 3 ? 1
    : 0.1;
  weather.storm += clamp(target - weather.storm, -dt * 0.05, dt * 0.05);
  weather.rain = weather.storm;
  // Lightning: random strikes while the storm is up.
  weather.lightningTimer -= dt;
  if (weather.lightningTimer <= 0) {
    weather.lightningTimer = weather.storm > 0.5 ? (rng ? rng.range(3, 9) : 6) : 999;
    if (weather.storm > 0.5) weather.lightning = 0.35;
  }
  if (weather.lightning > 0) weather.lightning -= dt;
  // The lava breathes: slow pulse, faster when the storm is up.
  weather.lavaPulse = 0.5 + 0.35 * Math.sin(weather.elapsed * 0.5) + weather.storm * 0.15;
  weather.lavaPulse = clamp(weather.lavaPulse, 0.05, 1);
  return weather;
}

// Is it night? The day is dark before 0.25 and after 0.8.
export function isNight(weather) {
  return weather.dayT < 0.22 || weather.dayT > 0.82;
}

// Is it golden hour? The hour the game is named for.
export function isGoldenHour(weather) {
  return weather.dayT > 0.68 && weather.dayT < 0.82;
}

// The hour on the clock, 0..23, for the HUD.
export function weatherHour(weather) {
  return Math.floor(weather.dayT * 24);
}

export function weatherLabel(weather) {
  const h = weatherHour(weather);
  const hh = String(h).padStart(2, '0');
  const fc = forecastFor(weather, 0);
  const dayName = isGoldenHour(weather) ? 'GOLDEN HOUR' : isNight(weather) ? 'NIGHT' : 'DAY';
  return `${dayName} · DAY ${weather.day}/${WEEK_DAYS} · ${hh}:00 · ${fc.label.toUpperCase()}`;
}

export function weatherSummary(weather) {
  return {
    day: weather.day,
    dayT: Math.round(weather.dayT * 100) / 100,
    hour: weatherHour(weather),
    storm: Math.round(weather.storm * 100) / 100,
    lightning: weather.lightning > 0,
    lavaPulse: Math.round(weather.lavaPulse * 100) / 100,
    goldenHour: isGoldenHour(weather),
    night: isNight(weather),
  };
}

export function weatherSave(weather) {
  return { day: weather.day, dayT: weather.dayT, storm: weather.storm, lavaPulse: weather.lavaPulse };
}

export function weatherLoad(data) {
  const w = createWeather();
  if (!data) return w;
  if (Number.isInteger(data.day)) w.day = clamp(data.day, 1, 7);
  if (typeof data.dayT === 'number') w.dayT = clamp(data.dayT, 0, 1);
  if (typeof data.storm === 'number') w.storm = clamp(data.storm, 0, 1);
  if (typeof data.lavaPulse === 'number') w.lavaPulse = clamp(data.lavaPulse, 0, 1);
  return w;
}
