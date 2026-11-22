// Procedural audio for Vesper City: Ember Isle.
// No audio files: every sound is synthesised with WebAudio — the engine
// hum, the radio plucks, gunshots, explosions, the ferry horn, the coin
// chime and the mission jingle. The audio context is created lazily on
// the first user gesture (browsers forbid sound before that), and every
// sound is a small function the world loop calls. Nothing here runs at
// import time, so the logic sim can import this file safely.

export function createAudio() {
  return {
    ctx: null,
    master: null,
    engineOsc: null,
    engineGain: null,
    radioTimer: 0,
    radioStep: 0,
    muted: false,
  };
}

// Create the context on first gesture. Returns true when sound is on.
export function audioInit(audio) {
  if (audio.ctx) return true;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return false;
    audio.ctx = new Ctx();
    audio.master = audio.ctx.createGain();
    audio.master.gain.value = 0.5;
    audio.master.connect(audio.ctx.destination);
    // The engine hum: a sawtooth whose pitch follows the speed.
    audio.engineOsc = audio.ctx.createOscillator();
    audio.engineOsc.type = 'sawtooth';
    audio.engineOsc.frequency.value = 60;
    audio.engineGain = audio.ctx.createGain();
    audio.engineGain.gain.value = 0;
    audio.engineOsc.connect(audio.engineGain);
    audio.engineGain.connect(audio.master);
    audio.engineOsc.start();
    return true;
  } catch {
    return false;
  }
}

function tone(audio, freq, dur, type, vol, when) {
  if (!audio.ctx || audio.muted) return;
  const t0 = audio.ctx.currentTime + (when || 0);
  const osc = audio.ctx.createOscillator();
  const gain = audio.ctx.createGain();
  osc.type = type || 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol || 0.2, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(gain);
  gain.connect(audio.master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noise(audio, dur, vol, filterFreq) {
  if (!audio.ctx || audio.muted) return;
  const t0 = audio.ctx.currentTime;
  const len = Math.floor(audio.ctx.sampleRate * dur);
  const buffer = audio.ctx.createBuffer(1, len, audio.ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = audio.ctx.createBufferSource();
  src.buffer = buffer;
  const filter = audio.ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = filterFreq || 1200;
  const gain = audio.ctx.createGain();
  gain.gain.value = vol || 0.3;
  src.connect(filter);
  filter.connect(gain);
  gain.connect(audio.master);
  src.start(t0);
}

// The engine hum follows the car's speed (0..1).
export function audioEngine(audio, speedNorm, inCar) {
  if (!audio.ctx || !audio.engineOsc) return;
  const target = inCar ? 0.04 + speedNorm * 0.1 : 0;
  audio.engineGain.gain.setTargetAtTime(target, audio.ctx.currentTime, 0.1);
  audio.engineOsc.frequency.setTargetAtTime(50 + speedNorm * 140, audio.ctx.currentTime, 0.1);
}

// One radio pluck: the note the current station plays.
export function audioRadioNote(audio, freq, dur) {
  tone(audio, freq, dur, 'triangle', 0.12);
  tone(audio, freq * 2, dur * 0.5, 'sine', 0.05);
}

// Step the radio: play the next note of the station on its beat.
export function audioRadioStep(audio, station, dt) {
  if (!audio.ctx || audio.muted || !station) return;
  audio.radioTimer -= dt;
  if (audio.radioTimer <= 0) {
    audio.radioTimer = 60 / station.tempo;
    const degree = [0, 2, 1, 3, 2, 4, 3, 5, 4, 2, 1, 0][audio.radioStep % 12];
    const semitones = station.scale[degree % station.scale.length]
      + 12 * Math.floor(degree / station.scale.length);
    const freq = station.root * Math.pow(2, semitones / 12);
    audioRadioNote(audio, freq, 0.4);
    audio.radioStep += 1;
  }
}

export function audioGunshot(audio) {
  noise(audio, 0.15, 0.4, 2500);
  tone(audio, 180, 0.08, 'square', 0.15);
}

export function audioExplosion(audio) {
  noise(audio, 0.9, 0.6, 400);
  tone(audio, 55, 0.7, 'sine', 0.4);
}

export function audioCoin(audio) {
  tone(audio, 1318, 0.12, 'sine', 0.18);
  tone(audio, 1760, 0.25, 'sine', 0.18, 0.09);
}

export function audioMission(audio) {
  tone(audio, 523, 0.15, 'triangle', 0.2);
  tone(audio, 659, 0.15, 'triangle', 0.2, 0.12);
  tone(audio, 784, 0.35, 'triangle', 0.22, 0.24);
}

export function audioHorn(audio) {
  tone(audio, 220, 0.5, 'sawtooth', 0.15);
  tone(audio, 277, 0.5, 'sawtooth', 0.12);
}

export function audioClick(audio) {
  tone(audio, 880, 0.05, 'square', 0.08);
}

export function audioBusted(audio) {
  tone(audio, 330, 0.2, 'sawtooth', 0.2);
  tone(audio, 220, 0.4, 'sawtooth', 0.2, 0.18);
}

export function audioMute(audio, muted) {
  audio.muted = muted;
  if (audio.master) audio.master.gain.value = muted ? 0 : 0.5;
}
