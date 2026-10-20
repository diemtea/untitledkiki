// Shell game with Rocco the raccoon. Watch the pebble, pick the cup… unless he palms it mid-shuffle.
// Spot the glint of his paw and call CHEATER! instead. ←/→ choose, E select (or tap a cup / the sign).
import { cupCanvas, raccoonCanvas } from '../gfx/critters.js';
import { itemCanvas } from '../gfx/sprites.js';

const CUP_X = [60, 96, 132];
const CUP_Y = 84;

export default {
  create(host, p) {
    const rounds = p.rounds || 3;
    const slow = (p.calm ? 0.75 : 1) * (p.sight ? 0.85 : 1);
    const cheats = p.cheats || [false, true, Math.random() < 0.5];
    const st = { round: 0, phase: 'show', t: 0, wins: 0, sel: 0, results: [], line: '' };
    const setup = () => {
      st.slots = [0, 1, 2]; // which cup id sits at each position
      st.cupPos = [0, 1, 2].map((i) => ({ x: CUP_X[i], y: CUP_Y, lift: 0 }));
      st.pebble = Math.floor(Math.random() * 3); // cup id with the pebble
      st.swaps = [];
      const n = (p.swaps || [4, 6, 8])[st.round] || 6;
      for (let i = 0; i < n; i++) { const a = Math.floor(Math.random() * 3); let b = Math.floor(Math.random() * 2); if (b >= a) b++; st.swaps.push([a, b]); }
      st.swapDur = ((p.swapDur || [0.5, 0.38, 0.3])[st.round] || 0.35) / slow;
      st.cheat = !!cheats[st.round];
      st.cheatAt = st.cheat ? 1 + Math.floor(Math.random() * Math.max(1, n - 2)) : -1;
      st.palmed = false;
      st.glint = 0;
      st.phase = 'show'; st.t = 0; st.si = 0; st.liftCup = null; st.caught = false;
    };
    setup();
    const pos = (cupId) => st.cupPos[cupId];
    const cupAt = (slot) => st.slots[slot];
    return {
      update(dt) {
        st.t += dt;
        st.glint = Math.max(0, st.glint - dt);
        if (st.phase === 'show') {
          // lift the pebble cup for a peek
          const c = pos(st.pebble);
          c.lift = st.t < 0.3 ? st.t / 0.3 * 10 : st.t < 1.1 ? 10 : Math.max(0, 10 - (st.t - 1.1) / 0.3 * 10);
          if (st.t > 1.5) { st.phase = 'shuffle'; st.t = 0; host.say('Watch closely…'); }
        } else if (st.phase === 'shuffle') {
          const k = Math.min(1, st.t / st.swapDur);
          const [a, b] = st.swaps[st.si];
          const ca = pos(cupAt(a)), cb = pos(cupAt(b));
          const xa = CUP_X[a], xb = CUP_X[b];
          ca.x = xa + (xb - xa) * ease(k); ca.y = CUP_Y - Math.sin(k * Math.PI) * 8;
          cb.x = xb + (xa - xb) * ease(k); cb.y = CUP_Y + Math.sin(k * Math.PI) * 4;
          if (st.si === st.cheatAt && !st.palmed && k > 0.5) {
            st.palmed = true;
            st.glint = p.sight ? 0.7 : 0.28;
            host.tone('sine', 2400, 3000, 0.08, 0.05);
          }
          if (k >= 1) {
            ca.y = cb.y = CUP_Y;
            [st.slots[a], st.slots[b]] = [st.slots[b], st.slots[a]];
            st.si++; st.t = 0;
            host.tone('triangle', 300 + st.si * 20, null, 0.05, 0.05);
            if (st.si >= st.swaps.length) { st.phase = 'pick'; st.sel = 1; host.say(st.round === 0 ? 'Which cup hides the pebble? (Or is Rocco up to something?)' : 'Pick a cup… or call him out.'); }
          }
        } else if (st.phase === 'pick') {
          if (host.pressed('left')) { st.sel = (st.sel + 3) % 4; host.sfx('click'); }
          if (host.pressed('right')) { st.sel = (st.sel + 1) % 4; host.sfx('click'); }
          const tap = host.tap;
          let choice = null;
          if (tap) {
            if (tap.x > 150 && tap.y < 40) choice = 3;
            else { let best = 0; for (let i = 0; i < 3; i++) if (Math.abs(CUP_X[i] - tap.x) < Math.abs(CUP_X[best] - tap.x)) best = i; if (Math.abs(CUP_X[best] - tap.x) < 18) choice = best; }
          }
          if (host.pressed('interact')) choice = st.sel;
          if (choice != null) {
            let ok;
            if (choice === 3) {
              ok = st.cheat;
              st.line = ok ? 'Rocco freezes. "…How. HOW?" He slides the pebble back out of his sleeve.' : 'Rocco gasps, deeply offended. "I would NEVER." (He would.)';
            } else {
              const cup = cupAt(choice);
              ok = !st.cheat && cup === st.pebble;
              pos(cup).lift = 10;
              st.liftCup = cup;
              st.line = st.cheat ? 'Empty! Of course it is. Rocco whistles innocently.' : ok ? 'There it is! Rocco narrows his eyes.' : 'Empty. Rocco grins with far too many teeth.';
            }
            if (ok) { st.wins++; host.sfx('good'); host.fx.burst(choice === 3 ? 170 : CUP_X[choice], choice === 3 ? 16 : 70, { n: 14 }); } else host.sfx('bad');
            st.results.push(ok);
            st.caught = choice === 3 && ok;
            host.say(st.line);
            st.phase = 'reveal'; st.t = 0;
          }
        } else if (st.phase === 'reveal') {
          if (st.t > 1.8) {
            st.round++;
            if (st.round >= rounds) return st.wins;
            setup();
          }
        }
        host.hud(`<span class="enc-chip">Round ${Math.min(st.round + 1, rounds)}/${rounds}</span><span class="enc-chip">${st.results.map((r) => (r ? '✓' : '✗')).join(' ')}</span>`);
        return null;
      },
      draw(g) {
        host.paint('dock');
        const t = host.t;
        // Rocco behind his crate table
        host.spr(raccoonCanvas(st.caught && st.phase === 'reveal' ? 1 : 0), 96, 66 + Math.round(Math.sin(t * 3) * 0.6));
        g.fillStyle = '#7a4626'; g.fillRect(36, 76, 120, 18);
        g.fillStyle = '#b0703a'; g.fillRect(36, 74, 120, 4);
        g.fillStyle = '#9a5a36'; for (let x = 40; x < 156; x += 16) g.fillRect(x, 78, 1, 16);
        // paw glint (the tell)
        if (st.glint > 0) {
          g.fillStyle = '#fffdf6';
          const gx = 108, gy = 58;
          g.fillRect(gx - 3, gy, 7, 1); g.fillRect(gx, gy - 3, 1, 7);
          if (p.sight) { g.fillStyle = '#ffe48a'; g.fillRect(gx - 1, gy - 1, 3, 3); }
        }
        // pebble (visible while its cup is lifted)
        const showPebble = (st.phase === 'show') || (st.phase === 'reveal' && st.liftCup === st.pebble && !st.cheat) || (st.phase === 'reveal' && st.caught);
        if (showPebble) {
          const c = st.caught ? { x: 96, y: CUP_Y } : pos(st.pebble);
          host.spr(itemCanvas('pebble'), c.x, CUP_Y + 1);
        }
        for (let id = 0; id < 3; id++) {
          const c = pos(id);
          host.spr(cupCanvas(), c.x, c.y - (c.lift || 0));
        }
        // selector + the CHEATER sign
        g.fillStyle = st.phase === 'pick' && st.sel === 3 ? '#ff3b52' : '#b8204a';
        g.fillRect(150, 6, 38, 14);
        g.fillStyle = '#fffdf6'; g.fillRect(151, 7, 36, 1);
        drawWord(g, 'CHEAT!', 153, 10);
        if (st.phase === 'pick') {
          const x = st.sel < 3 ? CUP_X[st.sel] : 169;
          const y = st.sel < 3 ? 92 + Math.round(Math.sin(t * 6)) : 24 + Math.round(Math.sin(t * 6));
          g.fillStyle = '#ffe48a'; g.fillRect(x - 2, y, 5, 2); g.fillRect(x - 1, y + 2, 3, 1); g.fillRect(x, y + 3, 1, 1);
        }
        if (st.phase === 'reveal' && st.liftCup != null) { pos(st.liftCup).lift = 10; }
      },
    };
  },
};

function ease(k) { return k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; }

// a 3x5 pixel font for tiny signs
const FONT = {
  C: ['111', '100', '100', '100', '111'], H: ['101', '101', '111', '101', '101'], E: ['111', '100', '110', '100', '111'],
  A: ['010', '101', '111', '101', '101'], T: ['111', '010', '010', '010', '010'], '!': ['1', '1', '1', '0', '1'],
  O: ['111', '101', '101', '101', '111'], K: ['101', '110', '100', '110', '101'], G: ['111', '100', '101', '101', '111'],
  P: ['110', '101', '110', '100', '100'], R: ['110', '101', '110', '101', '101'], S: ['111', '100', '111', '001', '111'],
  N: ['101', '111', '111', '101', '101'], I: ['111', '010', '010', '010', '111'], U: ['101', '101', '101', '101', '111'],
  L: ['100', '100', '100', '100', '111'], Y: ['101', '101', '010', '010', '010'], ' ': ['0', '0', '0', '0', '0'],
};
export function drawWord(g, word, x, y) {
  for (const ch of word) {
    const f = FONT[ch] || FONT[' '];
    f.forEach((row, yy) => { for (let xx = 0; xx < row.length; xx++) if (row[xx] === '1') g.fillRect(x + xx, y + yy, 1, 1); });
    x += f[0].length + 1;
  }
}
