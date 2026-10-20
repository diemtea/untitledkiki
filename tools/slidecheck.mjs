// Verifies every ice-pond level is solvable and prints the minimum number of moves (its par).
import { LEVELS, parse, slideFish } from '../src/minigames/slide.js';
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const key = (lv) => lv.fish.map((f) => (f.done ? 'D' : f.x + ',' + f.y)).join('|');
const clone = (lv) => ({ fish: lv.fish.map((f) => ({ ...f })), holes: lv.holes.map((h) => ({ ...h })), rocks: lv.rocks });
let ok = true;
LEVELS.forEach((L, i) => {
  const start = parse(L.map);
  const seen = new Set([key(start)]);
  let frontier = [start], depth = 0, found = -1;
  while (frontier.length && depth < 14 && found < 0) {
    const next = [];
    for (const lv of frontier) {
      for (let f = 0; f < lv.fish.length; f++) {
        if (lv.fish[f].done) continue;
        for (const d of DIRS) {
          const n = clone(lv);
          if (!slideFish(n, f, d).length) continue;
          if (n.fish.every((x) => x.done)) { found = depth + 1; break; }
          const k = key(n);
          if (!seen.has(k)) { seen.add(k); next.push(n); }
        }
        if (found >= 0) break;
      }
      if (found >= 0) break;
    }
    frontier = next; depth++;
  }
  console.log(`level ${i + 1}: ${found < 0 ? 'UNSOLVABLE' : 'min moves ' + found}, par ${L.par}`);
  if (found < 0 || found !== L.par) ok = false;
});
process.exit(ok ? 0 : 1);
