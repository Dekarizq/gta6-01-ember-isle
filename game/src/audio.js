// Procedural sound: no audio files, everything is synthesised with WebAudio.
// Engine hum follows speed, the radio plays a different generative pattern per
// station (tempo + scale from config), sirens wail at wanted 2+, waves lap on
// the beach. Everything starts on the first user gesture.
import { RADIO } from './config.js';

export function createAudio() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let radioTimer = null;
  let station = 0;
  let nextNote = 0;
  let step = 0;
  let sirenOsc = null;
  let sirenGain = null;
  let started = false;

  function ensure() {
    if (started) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.35;
      master.connect(ctx.destination);
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 60;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      const engineFilter = ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 500;
      engineOsc.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'triangle';
      sirenOsc.frequency.value = 700;
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain);
      sirenGain.connect(master);
      sirenOsc.start();
      started = true;
    } catch { /* audio is optional */ }
  }

  function note(freq, when, dur, type, vol) {
    if (!ctx) return;
    const o = ctx.createOscillator();
    o.type = type || 'square';
    o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(vol || 0.12, when + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, when + dur);
    o.connect(g);
    g.connect(master);
    o.start(when);
    o.stop(when + dur + 0.05);
  }

  function radioTick() {
    if (!ctx || !started) return;
    const st = RADIO[station];
    if (!st || st.tempo === 0) return; // talk station: no music
    const beat = 60 / st.tempo;
    const now = ctx.currentTime;
    while (nextNote < now + 0.4) {
      const scale = st.scale;
      const degree = [0, 2, 1, 3, 2, 4, 3, 1][step % 8];
      const octave = step % 16 === 0 ? 2 : 1;
      const semis = scale[degree % scale.length] + 12 * octave;
      const freq = 110 * Math.pow(2, semis / 12);
      note(freq, Math.max(nextNote, now), beat * 0.9, 'square', 0.09);
      if (step % 4 === 0) note(freq / 2, Math.max(nextNote, now), beat * 1.6, 'triangle', 0.12);
      nextNote += beat / 2;
      step += 1;
    }
  }

  return {
    ensure,
    setStation(n) {
      station = n;
      step = 0;
      if (ctx) nextNote = ctx.currentTime + 0.05;
    },
    update(speed, wanted, onFoot) {
      if (!started || !ctx) return;
      if (radioTimer === null) radioTimer = setInterval(radioTick, 120);
      const target = onFoot ? 0 : 0.05 + Math.min(0.12, Math.abs(speed) * 0.002);
      engineGain.gain.setTargetAtTime(target, ctx.currentTime, 0.1);
      engineOsc.frequency.setTargetAtTime(55 + Math.abs(speed) * 2.2, ctx.currentTime, 0.1);
      const siren = wanted >= 2 ? 0.05 : 0;
      sirenGain.gain.setTargetAtTime(siren, ctx.currentTime, 0.2);
      if (siren > 0) {
        sirenOsc.frequency.setTargetAtTime(650 + 250 * Math.sin(ctx.currentTime * 3), ctx.currentTime, 0.05);
      }
    },
    blip(freq) {
      if (!ctx) return;
      note(freq || 880, ctx.currentTime, 0.08, 'sine', 0.15);
    },
  };
}
