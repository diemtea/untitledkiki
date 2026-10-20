// Ice pond: fish slide across the ice until they bump into a rock, the edge or another fish. Slide
// every fish into a hole. E (or tap) picks a fish, arrows push it (or tap beside it). R resets.
import { fishSlideCanvas } from '../gfx/critters.js';

// '#' rock, 'O' hole, 'F' fish, '.' ice. Verified solvable (tools/slidecheck.mjs); par = fewest moves.
export const LEVELS = [
  { par: 2, map: ['.........', '.F.....#.', '.........', '......O..', '.........'] },
  { par: 4, map: ['..#......', 'F.......#', '....#....', '.O.......', '....F..O.'] },
  { par: 6, map: ['#...F....', '.........', '..O..#..F', '#........', '...#...O.'] },
];
const DIRS = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
const CS = 12, GX = 42, GY = 22, GW = 9, GH = 5;

export function parse(map) {
  const fish = [], holes = [], rocks = new Set();
  map.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === 'F') fish.push({ x, y, done: false });
    if (ch === 'O') holes.push({ x, y, full: false });
    if (ch === '#') rocks.add(x + ',' + y);
  }));
  return { fish, holes, rocks };
}
// slide one fish; returns path of cells
export function slideFish(lv, i, [dx, dy]) {
  const f = lv.fish[i];
  const path = [];
  let x = f.x, y = f.y;
  for (;;) {
    const nx = x + dx, ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) break;
    if (lv.rocks.has(nx + ',' + ny)) break;
    if (lv.fish.some((o, k) => k !== i && !o.done && o.x === nx && o.y === ny)) break;
    x = nx; y = ny;
    path.push({ x, y });
    const hole = lv.holes.find((h) => !h.full && h.x === x && h.y === y);
    if (hole) { hole.full = true; f.done = true; break; }
  }
  f.x = x; f.y = y;
  return path;
}

export default {
  create(host, p) {
    const levels = p.levels || LEVELS;
    const limit = p.time || 120;
    const st = { li: 0, moves: 0, sel: 0, solved: 0, t: 0, anim: null, results: [], pause: 0 };
    const load = () => { st.lv = parse(levels[st.li].map); st.moves = 0; st.sel = 0; st.anim = null; };
    load();
    const selFish = () => st.lv.fish[st.sel];
    const nextSel = () => {
      const n = st.lv.fish.length;
      for (let k = 1; k <= n; k++) { const j = (st.sel + k) % n; if (!st.lv.fish[j].done) { st.sel = j; return; } }
    };
    const push = (dir) => {
      const f = selFish();
      if (!f || f.done) return;
      const from = { x: f.x, y: f.y };
      const path = slideFish(st.lv, st.sel, DIRS[dir]);
      if (!path.length) { host.sfx('bad'); return; }
      st.moves++;
      st.anim = { i: st.sel, from, path, t: 0 };
      host.audio.noise(0.25, 0.12, 3000, 1200, 0, 'highpass');
    };
    return {
      update(dt) {
        st.t += dt;
        if (st.pause > 0) {
          st.pause -= dt;
          if (st.pause <= 0) {
            st.li++;
            if (st.li >= levels.length) return st.solved;
            load();
          }
          return null;
        }
        if (st.anim) {
          st.anim.t += dt * 14;
          if (st.anim.t >= st.anim.path.length) {
            const f = st.lv.fish[st.anim.i];
            if (f.done) { host.sfx('pop'); host.fx.burst(GX + f.x * CS + 6, GY + f.y * CS + 6, { n: 10, colors: ['#9ce4ff', '#fffdf6'] }); nextSel(); }
            st.anim = null;
            if (st.lv.fish.every((x) => x.done)) {
              const par = levels[st.li].par;
              const good = st.moves <= par + 1;
              if (good) st.solved++;
              st.results.push(st.moves <= par ? '✦' : good ? '✓' : '~');
              host.sfx('happy');
              host.say(st.moves <= par ? `Solved in ${st.moves}: as few as possible! The fish applaud with their fins.` : good ? `Solved in ${st.moves} moves. Nicely done.` : `Solved in ${st.moves} moves. A bit of a scenic route, but the fish don't mind.`);
              st.pause = 1.6;
            }
          }
          return null;
        }
        if (st.t > limit) return st.solved;
        for (const d of Object.keys(DIRS)) if (host.pressed(d)) push(d);
        if (host.pressed('interact')) { nextSel(); host.sfx('click'); }
        if (host.pressed('run') || host.held('cancel') && false) { load(); }
        const tap = host.tap;
        if (tap) {
          const cx = Math.floor((tap.x - GX) / CS), cy = Math.floor((tap.y - GY) / CS);
          const hit = st.lv.fish.findIndex((f) => !f.done && f.x === cx && f.y === cy);
          if (hit >= 0) { st.sel = hit; host.sfx('click'); }
          else if (tap.y > GY + GH * CS + 2 && tap.x > 150) load();
          else {
            const f = selFish();
            if (f) {
              const dx = cx - f.x, dy = cy - f.y;
              if (Math.abs(dx) > Math.abs(dy)) push(dx > 0 ? 'right' : 'left'); else if (dy) push(dy > 0 ? 'down' : 'up');
            }
          }
        }
        host.hud(`<span class="enc-chip">Pond ${st.li + 1}/${levels.length}</span><span class="enc-chip">moves ${st.moves} · par ${levels[st.li].par}</span><span class="enc-chip">${st.results.join(' ')}</span>`);
        return null;
      },
      draw(g) {
        host.paint('ridge');
        const t = host.t;
        // the pond
        g.fillStyle = '#8ab8e8'; g.fillRect(GX - 4, GY - 4, GW * CS + 8, GH * CS + 8);
        for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
          g.fillStyle = (x + y) % 2 ? '#cfe8ff' : '#dff0ff';
          g.fillRect(GX + x * CS, GY + y * CS, CS, CS);
          if ((x * 7 + y * 3) % 5 === 0) { g.fillStyle = '#ffffff'; g.fillRect(GX + x * CS + 3, GY + y * CS + 4, 4, 1); }
        }
        for (const h of st.lv.holes) {
          g.fillStyle = h.full ? '#2e5a8a' : '#1e3a6a'; g.fillRect(GX + h.x * CS + 2, GY + h.y * CS + 3, CS - 4, CS - 5);
          g.fillStyle = '#4a7ab8'; g.fillRect(GX + h.x * CS + 3, GY + h.y * CS + 3, CS - 6, 1);
        }
        for (const r of st.lv.rocks) {
          const [x, y] = r.split(',').map(Number);
          g.fillStyle = '#8e94b8'; g.fillRect(GX + x * CS + 1, GY + y * CS + 2, CS - 2, CS - 3);
          g.fillStyle = '#ffffff'; g.fillRect(GX + x * CS + 1, GY + y * CS + 1, CS - 2, 3);
          g.fillStyle = '#5a6088'; g.fillRect(GX + x * CS + 1, GY + y * CS + CS - 2, CS - 2, 1);
        }
        st.lv.fish.forEach((f, i) => {
          let fx = f.x, fy = f.y;
          if (st.anim && st.anim.i === i) {
            const k = Math.min(st.anim.t, st.anim.path.length);
            const a = Math.floor(k), b = k - a;
            const p0 = a === 0 ? st.anim.from : st.anim.path[a - 1];
            const p1 = st.anim.path[Math.min(a, st.anim.path.length - 1)];
            fx = p0.x + (p1.x - p0.x) * b; fy = p0.y + (p1.y - p0.y) * b;
          } else if (f.done) return;
          const px = GX + fx * CS + 6, py = GY + fy * CS + 10;
          if (i === st.sel && !f.done) {
            g.fillStyle = '#ffe48a';
            const bob = Math.round(Math.sin(t * 6));
            g.fillRect(px - 1, py - 12 + bob, 3, 2); g.fillRect(px, py - 10 + bob, 1, 1);
          }
          host.spr(fishSlideCanvas(i), px, py);
        });
        g.fillStyle = 'rgba(30,26,48,0.6)'; g.fillRect(152, 90, 36, 11);
        g.fillStyle = '#fff6e4'; g.fillRect(155, 94, 2, 3); g.fillRect(157, 93, 3, 1); g.fillRect(160, 94, 1, 2);
        g.fillStyle = '#fff6e4';
        // "RESET"
        const R = [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [1, 0], [2, 1], [1, 2], [2, 3], [2, 4]];
        for (const [x, y] of R) g.fillRect(164 + x, 93 + y, 1, 1);
      },
    };
  },
};
