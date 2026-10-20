// Dodge (in the air): weave through a squall of hailstones, then catch the creature in trouble.
// ↑/↓ (and ←/→) to steer, or drag on the screen. Every hit rattles whoever is riding in your basket.
import { hailCanvas } from '../gfx/critters.js';
import { witchSheet, gullCanvas } from '../gfx/sprites.js';
import { clamp } from '../core/util.js';

export default {
  create(host, p) {
    const dur = p.duration || 15;
    const rate = (p.rate || 3.2) * (p.wind ? 0.6 : 1) * (p.calm ? 0.8 : 1);
    const spd = (p.speed || 70) * (p.wind ? 0.85 : 1) * (p.calm ? 0.85 : 1);
    const st = { x: 40, y: 54, t: 0, hail: [], spawn: 0.6, hits: 0, inv: 0, rescued: false, target: null };
    const ws = witchSheet();
    return {
      update(dt) {
        st.t += dt;
        // steering
        const a = host.axis();
        if (host.pointer.down) {
          st.x += clamp(host.pointer.x - 20 - st.x, -1, 1) * dt * 90;
          st.y += clamp(host.pointer.y - st.y, -1, 1) * dt * 90;
        } else { st.x += a.x * dt * 70; st.y += a.y * dt * 80; }
        st.x = clamp(st.x, 16, 150); st.y = clamp(st.y, 16, 100);
        // hail
        st.spawn -= dt;
        if (st.spawn <= 0 && st.t < dur - 2.5) {
          st.spawn = 1 / rate * (0.6 + Math.random() * 0.8);
          st.hail.push({ x: 200, y: 6 + Math.random() * 96, vx: -spd * (0.8 + Math.random() * 0.5), vy: 8 + Math.random() * 18 });
        }
        for (const h of st.hail) { h.x += h.vx * dt; h.y += h.vy * dt; }
        st.hail = st.hail.filter((h) => h.x > -8 && h.y < 116);
        st.inv = Math.max(0, st.inv - dt);
        if (st.inv <= 0) for (const h of st.hail) {
          if (Math.abs(h.x - (st.x + 4)) < 9 && Math.abs(h.y - (st.y - 8)) < 7) {
            st.hits++; st.inv = 1.1; h.x = -20;
            host.sfx('bad'); host.shake(0.3);
            host.fx.burst(st.x, st.y - 8, { n: 8, colors: ['#ffffff', '#9ce4ff'] });
            if (p.passengers?.length) host.say(`Bonk! ${p.passengers.join(' and ')} ${p.passengers.length > 1 ? 'yelp' : 'yelps'} in the basket.`);
            break;
          }
        }
        // the creature in trouble appears near the end and tumbles toward you
        if (st.t > dur - 4 && !st.target) st.target = { x: 200, y: 40 };
        if (st.target && !st.rescued) {
          st.target.x += (Math.max(st.x + 30, 110) - st.target.x) * dt * 0.9 - dt * 6;
          st.target.y += Math.sin(st.t * 5) * dt * 20;
          if (Math.abs(st.target.x - st.x) < 14 && Math.abs(st.target.y - (st.y - 8)) < 12) {
            st.rescued = true; host.sfx('happy');
            host.fx.burst(st.x, st.y - 10, { n: 18, colors: ['#ffe48a', '#fffdf6', '#ff9ac0'] });
            host.say(p.rescueLine || 'Got you! The poor thing tucks itself into your basket.');
          }
        }
        host.hud(`<span class="enc-chip">${'♥'.repeat(Math.max(0, 3 - st.hits))}${'♡'.repeat(Math.min(3, st.hits))}</span><span class="enc-chip">${st.rescued ? '✓ rescued' : st.target ? 'catch it!' : Math.ceil(dur - st.t) + 's'}</span>`);
        if (st.t >= dur + (st.rescued ? 0 : 2.5)) {
          let grade = Math.max(0, 3 - st.hits);
          if (!st.rescued) grade = Math.min(grade, 1);
          return { grade, hits: st.hits, rescued: st.rescued };
        }
        return null;
      },
      draw(g) {
        host.paint('storm');
        const t = host.t;
        // wind streaks
        g.fillStyle = 'rgba(255,255,255,0.5)';
        for (let i = 0; i < 12; i++) g.fillRect(((i * 53 - t * 160) % 220 + 220) % 220 - 20, (i * 37) % 108, 10, 1);
        for (const h of st.hail) host.spr(hailCanvas(), h.x, h.y + 3, { scale: 2 });
        if (st.target && !st.rescued) host.spr(p.creature ? p.creature(t) : gullCanvas(Math.floor(t * 6) % 2), st.target.x, st.target.y, { flip: true, scale: 2 });
        if (!(st.inv > 0 && Math.floor(t * 12) % 2)) host.spr(ws.fly[Math.floor(t * 4) % 2], st.x, st.y);
        if (st.rescued) host.spr(p.creature ? p.creature(t) : gullCanvas(0), st.x + 12, st.y - 14);
      },
    };
  },
};
