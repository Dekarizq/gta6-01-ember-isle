// Procedural audio: 8 radio stations (WebAudio oscillators, no assets),
// engine hum, sirens, gunshots and UI blips. Everything is synthesized.
// Rev2 (2026-11-23): audio untouched by the density revision — the siren()
// two-tone call is what the 5-star chase shots (wanted >= 2) already play.
import { RADIO } from './config.js';

const SCALES = {
  major: [0, 2, 4, 7, 9],
  minor: [0, 2, 3, 5, 7, 10],
  blues: [0, 3, 5, 6, 7, 10],
};

export class RadioEngine {
  constructor() {
    this.ctx = null; this.master = null; this.stationTimer = null;
    this.step = 0; this.playing = false;
  }

  ensure() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.14;
      this.master.connect(this.ctx.destination);
    } catch (e) { this.ctx = null; }
  }

  startStation(index) {
    this.ensure();
    if (!this.ctx) return;
    this.stopStation();
    const st = RADIO[index];
    if (!st || st.bpm === 0) { this.playTalk(index); return; } // talk station: soft static bed
    this.playing = true;
    this.step = 0;
    const scale = st.id === 'ember-rock' ? SCALES.minor : st.id === 'tide-jazz' ? SCALES.blues : SCALES.major;
    const beatMs = 60000 / st.bpm / 2;
    this.stationTimer = window.setInterval(() => {
      if (!this.playing || !this.ctx) return;
      const s = this.step++;
      const deg = scale[s % scale.length];
      const oct = 1 + Math.floor((s / scale.length) % 2);
      const freq = st.root * Math.pow(2, deg / 12) * oct;
      this.blip(freq, beatMs / 1000 * 0.9, s % 4 === 0 ? 'triangle' : 'sine', 0.5);
      if (s % 8 === 4) this.blip(st.root / 2, 0.3, 'sawtooth', 0.22);
      if (s % 16 === 0) this.blip(st.root * 2, 0.5, 'sine', 0.18);
    }, beatMs);
  }

  playTalk(index) {
    // Storm Talk: low filtered-noise bed with occasional blips.
    this.playing = true;
    this.stationTimer = window.setInterval(() => {
      if (!this.playing || !this.ctx) return;
      this.blip(180 + Math.random() * 120, 0.08, 'sine', 0.12);
    }, 700);
  }

  stopStation() {
    this.playing = false;
    if (this.stationTimer) { window.clearInterval(this.stationTimer); this.stationTimer = null; }
  }

  blip(freq, dur, type, vol) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur);
  }

  engine(speed, maxSpeed) {
    if (!this.ctx) return;
    const f = 50 + (Math.abs(speed) / Math.max(1, maxSpeed)) * 140;
    this.blip(f, 0.09, 'sawtooth', 0.05);
  }

  siren() {
    if (!this.ctx) return;
    this.blip(720, 0.18, 'sine', 0.12);
    window.setTimeout(() => this.blip(520, 0.18, 'sine', 0.12), 190);
  }

  gunshot() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const buf = this.ctx.createBuffer(1, 2205, 44100);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain(); g.gain.value = 0.3;
    src.connect(g); g.connect(this.master);
    src.start(t);
  }

  coin() { this.blip(1320, 0.12, 'sine', 0.25); window.setTimeout(() => this.blip(1760, 0.18, 'sine', 0.25), 90); }
  uiBlip() { this.blip(880, 0.07, 'sine', 0.2); }
}
