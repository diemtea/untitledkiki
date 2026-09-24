import { buildIsland, W, H } from '../src/world/island.js';
import { writeFileSync } from 'fs';
const I = buildIsland();
const S = 8;
const cols = { 0: [47,120,168], 1: [236,217,166], 2: [216,192,138], 3: [121,173,69], 4: [150,190,90], 5: [139,187,78], 6: [80,130,55], 7: [180,170,150], 8: [210,200,180], 9: [194,154,100], 10: [168,112,63], 11: [138,94,58], 12: [163,154,140], 13: [200,110,120] };
const buf = Buffer.alloc(W * S * H * S * 3);
for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
  const i = z * W + x;
  let c = cols[I.type[i]] || [255, 0, 255];
  const h = I.height[i];
  const f = I.type[i] === 0 ? 1 : 0.7 + h * 0.08;
  c = c.map((v) => Math.min(255, v * f));
  if (I.blocked[i]) c = c.map((v) => v * 0.55);
  for (let yy = 0; yy < S; yy++) for (let xx = 0; xx < S; xx++) {
    let cc = c;
    if (h % 1 !== 0 && (xx + yy) % 4 === 0) cc = [255, 255, 255];
    const o = ((z * S + yy) * W * S + x * S + xx) * 3;
    buf[o] = cc[0]; buf[o + 1] = cc[1]; buf[o + 2] = cc[2];
  }
}
const mark = (x, z, col, r = 3) => { for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) { const X = Math.round(x * S) + xx, Y = Math.round(z * S) + yy; if (X < 0 || Y < 0 || X >= W * S || Y >= H * S) continue; const o = (Y * W * S + X) * 3; buf[o] = col[0]; buf[o + 1] = col[1]; buf[o + 2] = col[2]; } };
I.trees.forEach((t) => mark(t.x, t.z, [30, 70, 30], 2));
I.nodes.forEach((n) => mark(n.x, n.z, [255, 220, 0], 2));
I.npcs.forEach((n) => mark(n.x, n.z, [255, 0, 0], 3));
I.buildings.forEach((b) => mark(b.door.x, b.door.z, [0, 0, 255], 2));
I.props.forEach((p) => mark(p.x, p.z, [255, 255, 255], 1));
writeFileSync('tools/shots/map.ppm', Buffer.concat([Buffer.from(`P6 ${W * S} ${H * S} 255\n`), buf]));
console.log('trees', I.trees.length, 'nodes', I.nodes.length, 'buildings', I.buildings.length, 'props', I.props.length);
