// Timing: a cursor swings back and forth; press when it's in the sweet spot. Three rounds.
// kind 'tree'  — coax an animal (cat… goat… sheep… moose) down the branches and into your basket
// kind 'duck'  — grab a duck spinning on a weathervane when it faces you
// kind 'whale' — photograph the cloud whale as it glides through the frame
import { basketCanvas, vaneCanvas } from '../gfx/critters.js';
import { witchSheet } from '../gfx/sprites.js';
import { clamp } from '../core/util.js';

export default {
  create(host, p) {
    const rounds = p.rounds || 3;
    const speed0 = (p.speed || 1) * (p.calm ? 0.7 : 1);
    const zone0 = (p.zone || 0.16) * (p.grip ? 1.6 : 1);
    const st = { round: 0, pos: 0, dir: 1, wins: 0, results: [], phase: 'aim', wait: 0, center: 0.5, flash: 0 };
    const newRound = () => {
      st.center = 0.25 + Math.random() * 0.5;
      st.zone = zone0 * (1 - st.round * 0.12);
      st.speed = speed0 * (1 + st.round * 0.28);
      st.pos = Math.random() < 0.5 ? 0 : 1;
      st.dir = st.pos ? -1 : 1;
      st.phase = 'aim';
    };
    newRound();
    const branchY = [24, 40, 56, 76];
    const animal = p.animal;
    const wsheet = witchSheet();
    return {
      update(dt) {
        st.flash = Math.max(0, st.flash - dt);
        if (st.phase === 'aim') {
          // ease-in-out ping-pong
          st.pos += st.dir * dt * st.speed * 0.9;
          if (st.pos > 1) { st.pos = 1; st.dir = -1; }
          if (st.pos < 0) { st.pos = 0; st.dir = 1; }
          if (host.pressed('interact') || host.tap) {
            const off = Math.abs(st.pos - st.center);
            const ok = off < st.zone / 2;
            st.results.push(ok ? (off < st.zone / 6 ? 'perfect' : 'ok') : 'miss');
            if (ok) { st.wins++; host.sfx('good'); host.fx.burst(p.kind === 'whale' ? 96 : 96, 54, { n: 14, colors: ['#ffe48a', '#fffdf6', '#ff9ac0'] }); }
            else { host.sfx('bad'); host.shake(0.2); }
            st.flash = p.kind === 'whale' ? 0.25 : 0;
            st.phase = 'react';
            st.wait = 0.9;
          }
        } else {
          st.wait -= dt;
          if (st.wait <= 0) {
            st.round++;
            if (st.round >= rounds) return st.wins >= 3 && st.results.every((r) => r === 'perfect') ? 3 : Math.min(3, st.wins);
            newRound();
          }
        }
        host.hud(`<span class="enc-chip">${st.results.map((r) => (r === 'miss' ? '✗' : r === 'perfect' ? '✦' : '✓')).join(' ') || '…'}</span>`);
        return null;
      },
      draw(g) {
        const t = host.t;
        if (p.kind === 'tree') {
          host.paint('tree');
          // the animal works its way down: one branch per success
          const step = st.wins;
          const y = branchY[Math.min(step, 3)];
          const x = 64 + [8, -14, 12, 34][Math.min(step, 3)];
          const wob = st.phase === 'aim' ? Math.round(Math.sin(t * 3) * 1) : 0;
          if (step < 3) host.spr(animal, x + wob, y, { flip: step % 2 === 1 });
          // the witch hovers with her basket
          const fx = 140, fy = 80 + Math.round(Math.sin(t * 2) * 2);
          host.spr(wsheet.fly[Math.floor(t * 4) % 2], fx, fy, { flip: true });
          host.spr(basketCanvas(), 112, 96);
          if (step >= 3) host.spr(animal, 112, 92);
        } else if (p.kind === 'duck') {
          host.paint('lighthouse');
          const ang = (st.pos - st.center) * Math.PI * 1.6;
          const sx = Math.cos(ang);
          // a little red roof with the weathervane on top
          for (let i = 0; i < 12; i++) { g.fillStyle = i % 3 ? '#e8503a' : '#c9563f'; g.fillRect(70 - i * 2, 74 + i, 52 + i * 4, 1); }
          g.fillStyle = '#9a3a2d'; g.fillRect(48, 86, 96, 2);
          host.spr(vaneCanvas(), 96, 76, { scale: 2 });
          const dc = animal;
          g.save();
          g.imageSmoothingEnabled = false;
          g.translate(96, 50 + Math.round(Math.sin(t * 3)));
          g.scale((Math.abs(sx) < 0.15 ? 0.15 : Math.abs(sx)) * 2 * Math.sign(sx || 1), 2);
          g.drawImage(dc, -dc.width / 2, -dc.height);
          g.restore();
          if (Math.abs(st.pos - st.center) < st.zone / 2 && st.phase === 'aim') { g.fillStyle = '#ffe48a'; g.fillRect(95, 18, 2, 4); g.fillRect(95, 24, 2, 2); }
          host.spr(wsheet.fly[Math.floor(t * 4) % 2], 30, 72 + Math.round(Math.sin(t * 2) * 2));
        } else if (p.kind === 'whale') {
          host.paint('sky');
          // frame
          const wx = 192 + 60 - st.pos * 312;
          host.spr(animal(t), wx, 80, { scale: 2 });
          g.fillStyle = '#fffdf6';
          const fx0 = 66, fx1 = 126, fy0 = 26, fy1 = 82;
          for (const [x, y] of [[fx0, fy0], [fx1 - 8, fy0], [fx0, fy1 - 2], [fx1 - 8, fy1 - 2]]) g.fillRect(x, y, 8, 2);
          for (const [x, y] of [[fx0, fy0], [fx1 - 2, fy0], [fx0, fy1 - 8], [fx1 - 2, fy1 - 8]]) g.fillRect(x, y, 2, 8);
          if (st.flash > 0) { g.fillStyle = `rgba(255,255,255,${st.flash * 3})`; g.fillRect(0, 0, 192, 108); }
        }
        // the meter
        const x0 = 36, x1 = 156, y = 101;
        g.fillStyle = 'rgba(30,26,48,0.75)'; g.fillRect(x0 - 2, y - 3, x1 - x0 + 4, 7);
        const zx0 = x0 + (st.center - st.zone / 2) * (x1 - x0), zx1 = x0 + (st.center + st.zone / 2) * (x1 - x0);
        g.fillStyle = '#6ac25a'; g.fillRect(Math.round(zx0), y - 2, Math.max(2, Math.round(zx1 - zx0)), 5);
        g.fillStyle = '#b8ec72'; g.fillRect(Math.round(x0 + st.center * (x1 - x0)) - 1, y - 2, 2, 5);
        const cx = Math.round(x0 + clamp(st.pos, 0, 1) * (x1 - x0));
        g.fillStyle = '#fffdf6'; g.fillRect(cx - 1, y - 5, 3, 9);
        g.fillStyle = '#ff3b52'; g.fillRect(cx, y - 4, 1, 7);
      },
    };
  },
};
