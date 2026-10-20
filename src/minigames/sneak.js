// Sneak: tiptoe past the sleeping bear to borrow some honey. Hold → / E (or hold the screen) to creep
// forward; freeze when an eye opens. He is awake. He has been awake the whole time.
import { bearCanvas, hiveCanvas } from '../gfx/critters.js';
import { witchSheet } from '../gfx/sprites.js';

export default {
  create(host, p) {
    const calm = p.calm ? 1.5 : 1;
    const st = { x: 14, strikes: 0, t: 0, state: 'sleep', stT: 2.2 * calm, caughtT: 0, done: false, step: 0, z: 0 };
    const goal = 150;
    const limit = p.time || 30;
    const ws = witchSheet();
    const next = () => {
      if (st.state === 'sleep') { st.state = 'peek'; st.stT = (p.peek || 0.75) * (p.calm ? 1.3 : 1); host.tone('sine', 520, 560, 0.15, 0.06); }
      else if (st.state === 'peek') { st.state = 'awake'; st.stT = 1.0 + Math.random() * 0.8; }
      else { st.state = 'sleep'; st.stT = (1.6 + Math.random() * 2.2) * calm; }
    };
    return {
      update(dt) {
        st.t += dt;
        st.stT -= dt;
        if (st.stT <= 0) next();
        const moving = st.caughtT <= 0 && (host.held('interact') || host.held('right') || host.pointer.down);
        if (moving) {
          st.x += dt * 22;
          st.step += dt * 8;
          if (st.state === 'awake') {
            st.strikes++;
            st.caughtT = 1.3;
            host.sfx('bad');
            host.shake(0.25);
            host.say(['The bear looks right at you. "Oh! Hello." You freeze, very casually.', '"Hm? Oh, it\'s you again." He waves. You wave back. Awkward.', '"I can SEE you, you know." He sounds delighted about it.'][Math.min(2, st.strikes - 1)]);
            st.x = Math.max(14, st.x - 18);
          }
        }
        if (st.caughtT > 0) st.caughtT -= dt;
        // zzz while asleep
        st.z -= dt;
        if (st.state === 'sleep' && st.z <= 0) { st.z = 0.7; host.fx.burst(118, 40, { n: 1, color: '#c8d8ff', speed: 8, gravity: -14, life: 1.4 }); }
        host.hud(`<span class="enc-chip">${'♥'.repeat(Math.max(0, 3 - st.strikes))}${'♡'.repeat(Math.min(3, st.strikes))}</span><span class="enc-chip">${Math.max(0, Math.ceil(limit - st.t))}s</span>`);
        if (st.x >= goal) { host.sfx('happy'); return Math.max(0, 3 - st.strikes); }
        if (st.t > limit) return 0;
        return null;
      },
      draw(g) {
        host.paint('farm');
        const t = host.t;
        host.spr(hiveCanvas(), 168, 84);
        // little bees
        for (let i = 0; i < 3; i++) { g.fillStyle = '#f5d24b'; g.fillRect(168 + Math.round(Math.sin(t * 3 + i * 2) * 10), 66 + Math.round(Math.cos(t * 4 + i) * 6), 2, 1); }
        host.spr(bearCanvas(st.state === 'sleep' ? 0 : st.state === 'peek' ? 1 : 2), 118, 88 + (st.state === 'sleep' ? Math.round(Math.sin(t * 1.5)) : 0));
        const frame = st.caughtT > 0 ? ws.side[0] : ws.side[Math.floor(st.step) % ws.side.length];
        host.spr(frame, st.x, 98 + (st.caughtT > 0 ? 0 : -Math.round(Math.abs(Math.sin(st.step * 1.5)))));
        if (st.state === 'peek') { g.fillStyle = '#ffe48a'; g.fillRect(126, 58, 2, 6); g.fillRect(126, 66, 2, 2); }
        if (st.state === 'awake') { g.fillStyle = '#ff3b52'; g.fillRect(126, 58, 2, 6); g.fillRect(126, 66, 2, 2); }
        // progress line
        g.fillStyle = 'rgba(30,26,48,0.5)'; g.fillRect(14, 104, goal - 14, 2);
        g.fillStyle = '#ffe48a'; g.fillRect(14, 104, Math.max(0, st.x - 14), 2);
      },
    };
  },
};
