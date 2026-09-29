// Tiny WebAudio synth: accordion-waltz by day, music-box lullaby by night, sfx and ambience.
const NOTE = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
function freq(n) {
  if (typeof n === 'number') return 440 * Math.pow(2, (n - 69) / 12);
  const m = /^([A-G][#b]?)(\d)$/.exec(n);
  const midi = 12 * (+m[2] + 1) + NOTE[m[1]];
  return 440 * Math.pow(2, (midi - 69) / 12);
}
function midiOf(n) { const m = /^([A-G][#b]?)(\d)$/.exec(n); return 12 * (+m[2] + 1) + NOTE[m[1]]; }
const CHORDS = {
  D: ['D3', 'F#3', 'A3'], Bm: ['B2', 'D3', 'F#3'], G: ['G2', 'B2', 'D3'], A: ['A2', 'C#3', 'E3'], A7: ['A2', 'C#3', 'G3'], 'F#m': ['F#2', 'A2', 'C#3'],
  F: ['F2', 'A2', 'C3'], Dm: ['D3', 'F3', 'A3'], Bb: ['Bb2', 'D3', 'F3'], C: ['C3', 'E3', 'G3'], Am: ['A2', 'C3', 'E3'],
};
const SONGS = {
  day: {
    bpm: 138, lead: 'accordion', comp: 'pluck', swing: 0,
    chords: ['D', 'Bm', 'G', 'A', 'D', 'F#m', 'G', 'A7', 'Bm', 'G', 'D', 'A', 'G', 'A', 'D', 'D'],
    mel: [[['A4', 1], ['D5', 1], ['F#5', 1]], [['E5', 2], ['D5', 1]], [['B4', 1], ['D5', 1], ['G5', 1]], [['F#5', 2], ['E5', 1]],
      [['F#5', 1], ['A5', 1], ['D6', 1]], [['C#6', 2], ['A5', 1]], [['B5', 1], ['A5', 1], ['G5', 1]], [['E5', 3]],
      [['D5', 1], ['F#5', 1], ['B5', 1]], [['A5', 2], ['G5', 1]], [['F#5', 1], ['E5', 1], ['D5', 1]], [['C#5', 2], ['E5', 1]],
      [['D5', 1], ['B4', 1], ['G5', 1]], [['F#5', 1.5], ['E5', 0.5], ['C#5', 1]], [['D5', 3]], [['A4', 1], ['B4', 1], ['C#5', 1]]],
  },
  night: {
    bpm: 84, lead: 'musicbox', comp: 'pad',
    chords: ['F', 'Dm', 'Bb', 'C', 'F', 'Am', 'Bb', 'C', 'Dm', 'Bb', 'F', 'C', 'Bb', 'C', 'F', 'F'],
    mel: [[['C5', 1], ['F5', 1], ['A5', 1]], [['G5', 2], ['F5', 1]], [['D5', 1], ['F5', 1], ['Bb5', 1]], [['A5', 2], ['G5', 1]],
      [['A5', 1], ['C6', 1], ['A5', 1]], [['E5', 2], ['C5', 1]], [['D5', 1], ['F5', 1], ['D5', 1]], [['G5', 3]],
      [['F5', 1], ['A5', 1], ['D6', 1]], [['C6', 2], ['Bb5', 1]], [['A5', 1], ['G5', 1], ['F5', 1]], [['E5', 2], ['G5', 1]],
      [['F5', 1], ['D5', 1], ['Bb4', 1]], [['C5', 1], ['E5', 1], ['G5', 1]], [['F5', 3]], [[null, 3]]],
  },
  hotel: {
    bpm: 104, lead: 'musicbox', comp: 'softpluck',
    chords: ['F', 'Dm', 'Bb', 'C', 'F', 'Am', 'Bb', 'C', 'Dm', 'Bb', 'F', 'C', 'Bb', 'C', 'F', 'F'],
    mel: null, // reuses night melody an octave down
  },
  fly: {
    bpm: 176, lead: 'accordion', comp: 'arp', transpose: 5,
    chords: ['D', 'Bm', 'G', 'A', 'D', 'F#m', 'G', 'A7', 'Bm', 'G', 'D', 'A', 'G', 'A', 'D', 'D'],
    mel: null, // reuses day melody
  },
};
SONGS.hotel.mel = SONGS.night.mel.map((bar) => bar.map(([n, d]) => [n ? n.replace(/\d/, (o) => String(+o - 1 + (n[0] < 'C' ? 0 : 0))) : null, d]));
SONGS.fly.mel = SONGS.day.mel;

export class Audio {
  constructor() {
    this.ctx = null;
    this.musicVol = 0.5;
    this.sfxVol = 0.7;
    this.track = null;
    this.muted = false;
  }
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());
    this.master = ctx.createGain();
    this.master.gain.value = 0.8;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 3;
    this.master.connect(comp).connect(ctx.destination);
    this.music = ctx.createGain();
    this.music.gain.value = this.musicVol * 0.55;
    this.music.connect(this.master);
    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = this.sfxVol;
    this.sfxBus.connect(this.master);
    // soft room reverb for music (simple feedback delay)
    const d = ctx.createDelay(1); d.delayTime.value = 0.23;
    const fb = ctx.createGain(); fb.gain.value = 0.28;
    const wet = ctx.createGain(); wet.gain.value = 0.22;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400;
    this.music.connect(d); d.connect(lp).connect(fb).connect(d); lp.connect(wet).connect(this.master);
    // noise buffer
    const nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = nb.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    this.noiseBuf = nb;
    this.ambience = {};
    for (const k of ['wind', 'sea', 'rain']) this.ambience[k] = this.makeNoiseLoop(k);
    this.songs = {};
    this.nextNote = 0;
    this.scheduler = setInterval(() => this.schedule(), 40);
  }
  setVolumes(music, sfx) {
    this.musicVol = music; this.sfxVol = sfx;
    if (!this.ctx) return;
    this.music.gain.setTargetAtTime(music * 0.55, this.ctx.currentTime, 0.1);
    this.sfxBus.gain.setTargetAtTime(sfx, this.ctx.currentTime, 0.1);
  }
  makeNoiseLoop(kind) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf; src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = kind === 'rain' ? 'highpass' : 'lowpass';
    f.frequency.value = kind === 'wind' ? 500 : kind === 'sea' ? 380 : 1800;
    const g = ctx.createGain(); g.gain.value = 0;
    src.connect(f).connect(g).connect(this.master);
    src.start();
    return { g, f };
  }
  setAmbience(kind, level) {
    if (!this.ctx) return;
    const a = this.ambience[kind];
    if (!a) return;
    const scale = kind === 'rain' ? 0.08 : kind === 'wind' ? 0.12 : 0.06;
    a.g.gain.setTargetAtTime(level * scale * this.sfxVol, this.ctx.currentTime, 0.3);
    if (kind === 'sea') a.f.frequency.setTargetAtTime(300 + Math.sin(this.ctx.currentTime * 0.4) * 120, this.ctx.currentTime, 0.5);
  }

  // ---------------------------------------------------------------- music
  play(name) {
    if (!this.ctx || this.track === name) return;
    this.track = name;
    const now = this.ctx.currentTime;
    this.music.gain.cancelScheduledValues(now);
    this.music.gain.setTargetAtTime(0, now, 0.25);
    this.music.gain.setTargetAtTime(this.musicVol * 0.55, now + 0.9, 0.4);
    this.song = SONGS[name];
    this.bar = 0;
    this.beatInBar = 0;
    this.nextNote = now + 1.0;
    this.melIdx = 0;
  }
  schedule() {
    if (!this.ctx || !this.song || this.muted) return;
    const ctx = this.ctx;
    const s = this.song;
    const spb = 60 / s.bpm;
    while (this.nextNote < ctx.currentTime + 0.15) {
      const t = this.nextNote;
      const bar = this.bar % s.chords.length;
      const chord = CHORDS[s.chords[bar]];
      const tr = s.transpose || 0;
      // melody bar
      let bt = t;
      for (const [n, d] of s.mel[bar]) {
        if (n) this.inst(s.lead, midiOf(n) + tr, bt, d * spb * 0.95, 0.16);
        bt += d * spb;
      }
      // accompaniment
      for (let b = 0; b < 3; b++) {
        const tb = t + b * spb;
        if (s.comp === 'arp') {
          for (let k = 0; k < 2; k++) this.inst('pluck', midiOf(chord[(b * 2 + k) % 3]) + 12 + tr, tb + k * spb * 0.5, spb * 0.45, 0.07);
          if (b === 0) this.inst('bass', midiOf(chord[0]) - 12 + tr, tb, spb * 1.4, 0.2);
        } else if (s.comp === 'pad') {
          if (b === 0) { for (const n of chord) this.inst('pad', midiOf(n) + 12, tb, spb * 2.9, 0.035); this.inst('bass', midiOf(chord[0]) - 12, tb, spb * 2.5, 0.12); }
        } else {
          if (b === 0) this.inst('bass', midiOf(chord[0]) - 12 + tr, tb, spb * 0.9, 0.22);
          else for (const n of chord) this.inst(s.comp === 'softpluck' ? 'softpluck' : 'pluck', midiOf(n) + 12 + tr, tb, spb * 0.4, s.comp === 'softpluck' ? 0.035 : 0.05);
        }
      }
      this.nextNote += 3 * spb;
      this.bar++;
    }
  }
  inst(kind, midi, t, dur, vol) {
    const ctx = this.ctx;
    const f = freq(midi);
    const g = ctx.createGain();
    g.connect(this.music);
    g.gain.setValueAtTime(0, t);
    if (kind === 'accordion') {
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1900; lp.Q.value = 0.8;
      lp.connect(g);
      for (const det of [-6, 7]) {
        const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det;
        const lfo = ctx.createOscillator(); lfo.frequency.value = 5.2; const lg = ctx.createGain(); lg.gain.value = 5;
        lfo.connect(lg).connect(o.detune);
        o.connect(lp); o.start(t); o.stop(t + dur + 0.15); lfo.start(t); lfo.stop(t + dur + 0.15);
      }
      g.gain.linearRampToValueAtTime(vol * 0.55, t + 0.04);
      g.gain.setValueAtTime(vol * 0.5, t + dur);
      g.gain.linearRampToValueAtTime(0, t + dur + 0.12);
    } else if (kind === 'musicbox') {
      for (const [mul, v] of [[1, 1], [2, 0.3], [4.01, 0.12]]) {
        const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f * mul;
        const og = ctx.createGain(); og.gain.value = v;
        o.connect(og).connect(g); o.start(t); o.stop(t + 1.8);
      }
      g.gain.linearRampToValueAtTime(vol * 0.9, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0008, t + 1.7);
    } else if (kind === 'pluck' || kind === 'softpluck') {
      const o = ctx.createOscillator(); o.type = kind === 'pluck' ? 'square' : 'triangle'; o.frequency.value = f;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(2600, t); lp.frequency.exponentialRampToValueAtTime(500, t + 0.25);
      o.connect(lp).connect(g); o.start(t); o.stop(t + dur + 0.3);
      g.gain.linearRampToValueAtTime(vol, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0008, t + dur + 0.25);
    } else if (kind === 'bass') {
      const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
      o.connect(g); o.start(t); o.stop(t + dur + 0.1);
      g.gain.linearRampToValueAtTime(vol, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    } else if (kind === 'pad') {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
      const o2 = ctx.createOscillator(); o2.type = 'triangle'; o2.frequency.value = f * 1.003;
      o.connect(g); o2.connect(g); o.start(t); o.stop(t + dur + 0.6); o2.start(t); o2.stop(t + dur + 0.6);
      g.gain.linearRampToValueAtTime(vol, t + 0.5);
      g.gain.linearRampToValueAtTime(0, t + dur + 0.5);
    }
  }

  // ---------------------------------------------------------------- sfx
  tone(type, f0, f1, dur, vol = 0.2, t = 0, dest = null) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const st = ctx.currentTime + t;
    const o = ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, st);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, st + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, st);
    g.gain.linearRampToValueAtTime(vol, st + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0008, st + dur);
    o.connect(g).connect(dest || this.sfxBus);
    o.start(st); o.stop(st + dur + 0.05);
  }
  noise(dur, vol, f0, f1, t = 0, type = 'bandpass') {
    if (!this.ctx) return;
    const ctx = this.ctx, st = ctx.currentTime + t;
    const src = ctx.createBufferSource(); src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type; f.Q.value = 1.2;
    f.frequency.setValueAtTime(f0, st); f.frequency.exponentialRampToValueAtTime(f1, st + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, st); g.gain.linearRampToValueAtTime(vol, st + dur * 0.2); g.gain.exponentialRampToValueAtTime(0.001, st + dur);
    src.connect(f).connect(g).connect(this.sfxBus);
    src.start(st, Math.random()); src.stop(st + dur + 0.05);
  }
  blip(voice = 0) {
    if (!this.ctx) return;
    const base = [520, 380, 640, 300, 720][voice % 5];
    this.tone('square', base + Math.random() * 60, null, 0.05, 0.035);
  }
  sfx(name) {
    if (!this.ctx) return;
    switch (name) {
      case 'pickup': this.tone('sine', 880, null, 0.12, 0.2); this.tone('sine', 1320, null, 0.2, 0.18, 0.07); break;
      case 'coin': this.tone('square', 988, null, 0.08, 0.1); this.tone('square', 1318, null, 0.28, 0.1, 0.07); break;
      case 'open': this.tone('triangle', 520, 780, 0.1, 0.12); break;
      case 'close': this.tone('triangle', 700, 460, 0.1, 0.1); break;
      case 'click': this.tone('square', 900, null, 0.03, 0.05); break;
      case 'whoosh': this.noise(0.8, 0.35, 300, 2400); break;
      case 'land': this.noise(0.4, 0.25, 1600, 200); this.tone('sine', 200, 120, 0.2, 0.15, 0.25); break;
      case 'meow': this.tone('sawtooth', 700, 950, 0.12, 0.06); this.tone('sawtooth', 950, 600, 0.25, 0.06, 0.1); break;
      case 'happy': [0, 4, 7, 12].forEach((s, i) => this.tone('sine', 660 * Math.pow(2, s / 12), null, 0.14, 0.14, i * 0.06)); break;
      case 'door': this.tone('sine', 140, 90, 0.25, 0.25); this.noise(0.3, 0.1, 400, 200, 0.02); break;
      case 'brew': for (let i = 0; i < 8; i++) this.tone('sine', 300 + Math.random() * 400, 500 + Math.random() * 500, 0.08, 0.1, i * 0.07); this.sfx('sparkle'); break;
      case 'craft': [0, 0.12, 0.24].forEach((t) => { this.noise(0.08, 0.3, 2000, 800, t); this.tone('square', 300, 200, 0.06, 0.06, t); }); this.tone('sine', 880, null, 0.3, 0.12, 0.4); break;
      case 'good': this.tone('sine', 660, null, 0.08, 0.15); this.tone('sine', 990, null, 0.16, 0.15, 0.06); break;
      case 'bad': this.tone('square', 220, 160, 0.18, 0.08); break;
      case 'pop': this.tone('sine', 400, 900, 0.1, 0.2); this.noise(0.1, 0.1, 3000, 1000); break;
      case 'bell': for (const [m, v] of [[1, 0.2], [2.7, 0.08], [5.4, 0.04]]) this.tone('sine', 1320 * m, null, 1.0, v); break;
      case 'paper': this.noise(0.25, 0.25, 3000, 5000, 0, 'highpass'); break;
      case 'sparkle': [0, 5, 9, 14, 17].forEach((s, i) => this.tone('sine', 1320 * Math.pow(2, s / 12), null, 0.2, 0.06, i * 0.05)); break;
      case 'deliver': [0, 4, 7].forEach((s, i) => this.tone('triangle', 523 * Math.pow(2, s / 12), null, 0.25, 0.14, i * 0.09)); this.sfx('coin'); break;
      case 'sleep': [12, 7, 4, 0].forEach((s, i) => this.tone('sine', 440 * Math.pow(2, s / 12), null, 0.5, 0.1, i * 0.2)); break;
      case 'error': this.tone('square', 180, null, 0.15, 0.07); this.tone('square', 150, null, 0.2, 0.07, 0.12); break;
      case 'star': this.tone('sine', 2000, 400, 1.2, 0.08); this.sfx('sparkle'); break;
      case 'sweep': this.noise(0.25, 0.3, 1200, 3000, 0, 'highpass'); this.noise(0.25, 0.3, 1200, 3000, 0.25, 'highpass'); break;
      case 'munch': [0, 0.12, 0.24].forEach((t) => this.noise(0.07, 0.35, 900, 500, t)); break;
      case 'drop': this.tone('sine', 900, 300, 0.4, 0.12); break;
      case 'rattle': for (let i = 0; i < 5; i++) { this.tone('square', 1400 + (i % 2) * 300, 900, 0.03, 0.035, i * 0.07); this.noise(0.03, 0.08, 3000, 2000, i * 0.07); } break;
      case 'spirit': [0, 7, 12, 16, 19].forEach((s, i) => this.tone('sine', 523 * Math.pow(2, s / 12), null, 0.6, 0.07, i * 0.09)); break;
      default: this.tone('sine', 600, null, 0.1, 0.1);
    }
  }
  petVoice(species) {
    if (!this.ctx) return;
    switch (species) {
      case 'dog': case 'poodle': this.tone('sawtooth', 420, 300, 0.12, 0.08); this.tone('sawtooth', 460, 320, 0.12, 0.08, 0.16); break;
      case 'cat': this.sfx('meow'); break;
      case 'bunny': case 'hedgehog': case 'ferret': this.tone('sine', 1400, 1800, 0.06, 0.1); this.tone('sine', 1500, 2000, 0.06, 0.1, 0.09); break;
      case 'parrot': this.tone('square', 1200, 1800, 0.08, 0.06); this.tone('square', 1800, 1100, 0.12, 0.06, 0.09); break;
      case 'frog': this.tone('square', 180, 120, 0.12, 0.1); this.tone('square', 200, 130, 0.14, 0.1, 0.18); break;
      case 'owl': this.tone('sine', 420, 380, 0.3, 0.14); this.tone('sine', 400, 350, 0.4, 0.14, 0.4); break;
      default: this.tone('sine', 800, 1000, 0.1, 0.1);
    }
  }
}
