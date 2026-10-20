// Rhythm: notes glide toward the ring; hit them on the beat. One lane (any key / tap) or two lanes
// (↑ high / ↓ low, or tap the top / bottom half). Gerald's notes wobble. They are always flat.
import { noteCanvas, wobbleNoteCanvas } from '../gfx/critters.js';
import { clamp } from '../core/util.js';

const HIT_X = 34;
const SCALE = [0, 2, 4, 7, 9, 12, 14, 16]; // major pentatonic-ish, in semitones

export default {
  create(host, p) {
    const bpm = (p.bpm || 96) * (p.calm ? 0.8 : 1);
    const spb = 60 / bpm;
    const lanes = p.lanes || 1;
    const win = (p.window || 0.15) * (p.song ? 1.6 : 1);
    const lead = 2; // beats a note is visible before it arrives
    // pattern: [[beat, lane, gerald?], ...]
    const notes = (p.pattern || defaultPattern(p.beats || 16, lanes)).map(([b, lane = 0, ger = false], i) => ({ t: (b + 4) * spb, lane, ger: !!ger, i, judged: null, deg: (p.melody || SCALE)[i % (p.melody || SCALE).length] }));
    const end = notes[notes.length - 1].t + 2 * spb;
    const laneY = lanes === 1 ? [86] : [78, 96];
    const st = { time: -0.2, notes, combo: 0, best: 0, score: 0, lastBeat: -1, flash: [], msg: '', msgT: 0 };
    const performers = p.performers || [];
    const play = (n, good) => {
      const base = p.root || 392;
      let f = base * Math.pow(2, n.deg / 12);
      if (n.ger && !p.geraldFixed) f *= Math.pow(2, -0.55 / 12) * 0.985; // flat. so flat.
      host.tone(p.voice || 'triangle', f, null, 0.28, good ? 0.16 : 0.1);
      host.tone('sine', f * 2, null, 0.2, 0.04);
    };
    return {
      update(dt) {
        st.time += dt;
        const T = st.time;
        // backing beat
        const beat = Math.floor(T / spb);
        if (beat !== st.lastBeat && T >= 0) {
          st.lastBeat = beat;
          if (T < end - spb) {
            host.tone('sine', 140, 55, 0.12, beat % 4 === 0 ? 0.22 : 0.12);
            if (beat >= 4) host.audio.noise(0.05, 0.05, 6000, 4000, spb / 2, 'highpass');
            for (const pf of performers) pf.bounce = 0.12;
          }
        }
        // input
        let laneHit = -1;
        const tap = host.tap;
        if (lanes === 1) { if (host.pressed('interact') || host.pressed('up') || host.pressed('down') || tap) laneHit = 0; }
        else {
          if (host.pressed('up')) laneHit = 0;
          else if (host.pressed('down')) laneHit = 1;
          else if (tap) laneHit = tap.y < 87 ? 0 : 1;
          else if (host.pressed('interact')) {
            // forgiving: whichever lane has the closest note
            let best = null;
            for (const n of notes) if (!n.judged && Math.abs(n.t - T) < win && (!best || Math.abs(n.t - T) < Math.abs(best.t - T))) best = n;
            laneHit = best ? best.lane : 0;
          }
        }
        if (laneHit >= 0) {
          let best = null;
          for (const n of notes) if (!n.judged && n.lane === laneHit && Math.abs(n.t - T) < win && (!best || Math.abs(n.t - T) < Math.abs(best.t - T))) best = n;
          if (best) {
            const err = Math.abs(best.t - T);
            best.judged = err < win * 0.45 ? 'perfect' : 'good';
            st.score += best.judged === 'perfect' ? 1 : 0.7;
            st.combo++; st.best = Math.max(st.best, st.combo);
            play(best, best.judged === 'perfect');
            host.fx.burst(HIT_X, laneY[best.lane] - 3, { n: best.judged === 'perfect' ? 12 : 6, colors: ['#ffe48a', '#ff9ac0', '#9ce4ff'], speed: 40, gravity: 30 });
            st.msg = best.ger && !p.geraldFixed ? 'Gerald! (flat)' : best.judged === 'perfect' ? 'Perfect!' : 'Good';
            st.msgT = 0.5;
            for (const pf of performers) if (pf.sing != null) pf.singT = 0.25;
            if (best.ger && p.geraldPerformer != null) performers[p.geraldPerformer].singT = 0.35;
          } else {
            st.flash.push({ lane: laneHit, t: 0.15 });
          }
        }
        // misses
        for (const n of notes) {
          if (!n.judged && T - n.t > win) {
            n.judged = 'miss'; st.combo = 0; st.msg = 'Miss'; st.msgT = 0.4;
            for (const pf of performers) if (pf.wince != null) pf.winceT = 0.3;
          }
        }
        for (const f of st.flash) f.t -= dt;
        st.flash = st.flash.filter((f) => f.t > 0);
        st.msgT -= dt;
        for (const pf of performers) { pf.bounce = Math.max(0, (pf.bounce || 0) - dt); pf.singT = Math.max(0, (pf.singT || 0) - dt); pf.winceT = Math.max(0, (pf.winceT || 0) - dt); }
        host.hud(`<span class="enc-chip">♪ ${notes.filter((n) => n.judged && n.judged !== 'miss').length}/${notes.length}</span>${st.combo > 2 ? `<span class="enc-chip gold">${st.combo} combo</span>` : ''}`);
        if (T > end) {
          const k = st.score / notes.length;
          return k >= 0.85 ? 3 : k >= 0.6 ? 2 : k >= 0.35 ? 1 : 0;
        }
        return null;
      },
      draw(g) {
        host.paint(p.scene || 'woods');
        const T = st.time;
        // performers
        for (const pf of performers) {
          const c = pf.singT > 0 ? pf.c1 : pf.c0;
          const y = pf.y - (pf.bounce > 0 ? 1 : 0) + (pf.winceT > 0 ? 1 : 0);
          host.spr(c, pf.x + (pf.winceT > 0 ? Math.round(Math.sin(T * 50)) : 0), y, { flip: pf.flip, scale: pf.scale });
        }
        // lanes
        for (let l = 0; l < lanes; l++) {
          const y = laneY[l];
          g.fillStyle = 'rgba(30,26,48,0.55)'; g.fillRect(0, y - 6, host.W, 12);
          g.fillStyle = 'rgba(255,246,228,0.25)'; g.fillRect(0, y - 6, host.W, 1); g.fillRect(0, y + 5, host.W, 1);
          // hit ring
          const pulse = (T / spb) % 1 < 0.15 ? 1 : 0;
          g.fillStyle = st.flash.some((f) => f.lane === l) ? '#ff8aa0' : pulse ? '#fffdf6' : '#ffe48a';
          ring(g, HIT_X, y, 6 + pulse);
          if (lanes === 2) { g.fillStyle = '#fff6e4'; g.fillRect(6, y - 1, 3, 2); g.fillRect(7, y + (l ? 1 : -2), 1, 1); }
        }
        // notes
        for (const n of notes) {
          if (n.judged && n.judged !== 'miss') continue;
          const dtn = n.t - T;
          if (dtn > lead * spb + 0.1) continue;
          const x = HIT_X + (dtn / (lead * spb)) * (host.W - HIT_X + 6);
          if (x < -8) continue;
          const c = n.ger ? wobbleNoteCanvas() : noteCanvas(n.i % 4);
          const wob = n.ger ? Math.round(Math.sin(T * 14 + n.i) * 1.5) : 0;
          host.spr(c, x, laneY[n.lane] + 4 + wob, { alpha: n.judged === 'miss' ? 0.35 : 1 });
        }
        // progress
        const k = clamp(T / end, 0, 1);
        g.fillStyle = 'rgba(30,26,48,0.6)'; g.fillRect(40, 3, 112, 3);
        g.fillStyle = '#ffe48a'; g.fillRect(40, 3, Math.round(112 * k), 3);
        if (st.msgT > 0) { g.fillStyle = '#fffdf6'; }
        if (T < 4 * spb) {
          const c = 4 - Math.floor(T / spb);
          host.hud(`<span class="enc-chip big">${c > 0 && T > 0 ? c : '♪'}</span>`);
        } else if (st.msgT > 0) host.hud(`<span class="enc-chip ${st.msg === 'Miss' ? '' : 'gold'}">${st.msg}</span>${st.combo > 2 ? `<span class="enc-chip gold">${st.combo} combo</span>` : ''}`);
      },
    };
  },
};

function ring(g, cx, cy, r) {
  for (let a = 0; a < 32; a++) {
    const x = Math.round(cx + Math.cos((a / 32) * Math.PI * 2) * r), y = Math.round(cy + Math.sin((a / 32) * Math.PI * 2) * r);
    g.fillRect(x, y, 1, 1);
  }
}

export function defaultPattern(n, lanes) {
  const out = [];
  let b = 0;
  for (let i = 0; i < n; i++) {
    out.push([b, lanes > 1 ? (i * 7 + (i >> 2)) % 2 : 0]);
    b += i % 4 === 3 ? 2 : 1;
  }
  return out;
}
