// Procedural pixel textures: terrain atlas, building facades, roofs and interior surfaces.
import * as THREE from 'three';
import { makeCanvas, ctx2d, px, rect, pixelTexture, shadeHex, tintHex, mixHex } from './pixel.js';
import { rng, hash2 } from '../core/util.js';

const T = 16;

// ---------------------------------------------------------------------------------------------
// Terrain atlas
// ---------------------------------------------------------------------------------------------
function speckle(g, ox, oy, r, cols, n) {
  for (let i = 0; i < n; i++) px(g, ox + r.int(0, 15), oy + r.int(0, 15), r.pick(cols));
}
// wrap-around pixel so features tile seamlessly across neighbouring tiles
function pw(g, ox, oy, x, y, col) { px(g, ox + (((x % T) + T) % T), oy + (((y % T) + T) % T), col); }
function blade(g, ox, oy, x, y, dark, light) {
  // a tiny Stardew-style grass tuft: two dark strokes with a bright tip
  pw(g, ox, oy, x, y, dark); pw(g, ox, oy, x - 1, y - 1, dark); pw(g, ox, oy, x + 1, y - 1, dark);
  pw(g, ox, oy, x - 1, y - 2, light); pw(g, ox, oy, x + 1, y - 2, light);
}
function flower(g, ox, oy, x, y, petal, center) {
  pw(g, ox, oy, x, y - 1, petal); pw(g, ox, oy, x - 1, y, petal); pw(g, ox, oy, x + 1, y, petal); pw(g, ox, oy, x, y + 1, petal);
  pw(g, ox, oy, x, y, center);
}
const FLOWERS = [['#ff8ab8', '#ffe070'], ['#fff8f0', '#ffd24a'], ['#ffd84a', '#ff9a3a'], ['#8ab4ff', '#fff8f0'], ['#d0a4ff', '#fff4c0'], ['#ff6a7a', '#ffe070']];

// Storybook palette: saturated, hue-shifted (teal-green shadows, lime highlights, plum-brown lines).
const GEN = {
  grass(g, ox, oy, r) {
    rect(g, ox, oy, T, T, '#5dbb46');
    speckle(g, ox, oy, r, ['#6cc84c', '#52ae44'], 26);
    for (let i = 0; i < 7; i++) blade(g, ox, oy, r.int(0, 15), r.int(0, 15), '#3f9a45', '#86d64e');
    for (let i = 0; i < 4; i++) pw(g, ox, oy, r.int(0, 15), r.int(0, 15), '#b4ec62');
    if (r() < 0.35) flower(g, ox, oy, r.int(2, 13), r.int(2, 13), ...r.pick(FLOWERS));
  },
  flowers(g, ox, oy, r) {
    GEN.grass(g, ox, oy, r);
    for (let i = 0; i < 4; i++) flower(g, ox, oy, r.int(1, 14), r.int(1, 14), ...r.pick(FLOWERS));
  },
  meadow(g, ox, oy, r) {
    rect(g, ox, oy, T, T, '#7ccc4a');
    speckle(g, ox, oy, r, ['#8ed852', '#6cbc46'], 30);
    for (let i = 0; i < 6; i++) blade(g, ox, oy, r.int(0, 15), r.int(0, 15), '#52a844', '#b0e862');
    for (let i = 0; i < 2; i++) flower(g, ox, oy, r.int(1, 14), r.int(1, 14), ...r.pick(FLOWERS));
    if (r() < 0.5) { const x = r.int(2, 13), y = r.int(2, 13); pw(g, ox, oy, x, y, '#fff8f0'); pw(g, ox, oy, x + 1, y + 1, '#fff8f0'); }
  },
  forest(g, ox, oy, r) {
    // ancient-forest moss: deep emerald with teal shadows and soft lime cushions
    rect(g, ox, oy, T, T, '#2f8a5a');
    speckle(g, ox, oy, r, ['#237a52', '#389a60', '#1f6a50'], 44);
    for (let i = 0; i < 3; i++) {
      const x = r.int(0, 15), y = r.int(0, 15);
      for (const [dx, dy, c] of [[0, 0, '#4aa860'], [1, 0, '#4aa860'], [0, 1, '#3c9a5a'], [1, 1, '#3c9a5a'], [0, -1, '#7ccc6a'], [-1, 0, '#3c9a5a']]) pw(g, ox, oy, x + dx, y + dy, c);
    }
    for (let i = 0; i < 3; i++) { const x = r.int(0, 15), y = r.int(0, 15); pw(g, ox, oy, x, y, r.pick(['#e89a5a', '#d87a8a', '#f0c060'])); }
    if (r() < 0.4) pw(g, ox, oy, r.int(0, 15), r.int(0, 15), '#b8fff0');
  },
  sand(g, ox, oy, r) {
    rect(g, ox, oy, T, T, '#fbe2ae');
    speckle(g, ox, oy, r, ['#f0cc90', '#fff2d0', '#f6d8a0'], 40);
    if (r() < 0.45) { const x = r.int(2, 13), y = r.int(2, 13); pw(g, ox, oy, x, y, '#ffb4c0'); pw(g, ox, oy, x + 1, y, '#f890a4'); }
    if (r() < 0.25) { const x = r.int(2, 13), y = r.int(2, 13); pw(g, ox, oy, x, y, '#8ae0e0'); }
  },
  wetsand(g, ox, oy, r) {
    rect(g, ox, oy, T, T, '#eec890');
    speckle(g, ox, oy, r, ['#dcb07a', '#f8dca8'], 36);
    for (let x = 0; x < T; x += 5) pw(g, ox, oy, x + r.int(0, 3), r.int(0, 15), '#fff0c8');
  },
  seabed(g, ox, oy, r) {
    rect(g, ox, oy, T, T, '#9ce4c8');
    speckle(g, ox, oy, r, ['#84d4b8', '#b4f0d4', '#f8e8b0'], 40);
  },
  cobble(g, ox, oy, r) {
    // round pastel cobbles with plum mortar
    rect(g, ox, oy, T, T, '#9a6a5e');
    const stones = ['#f6dcb8', '#eec4a0', '#f8e4c4', '#e4d2e0', '#dcdcb4', '#f4d0c0'];
    const rows = [[0, 4], [4, 4], [8, 4], [12, 4]];
    rows.forEach(([y0, h], ri) => {
      let x = -((ri * 3) % 5);
      while (x < T) {
        const w = r.int(4, 6);
        const base = r.pick(stones);
        for (let yy = 0; yy < h - 1; yy++)
          for (let xx = 0; xx < w - 1; xx++) {
            const corner = (yy === 0 || yy === h - 2) && (xx === 0 || xx === w - 2);
            if (corner) continue;
            let c = base;
            if (yy === 0 || xx === 0) c = tintHex(base, 0.45);
            if (yy === h - 2 || xx === w - 2) c = mixHex(base, '#b07a70', 0.35);
            pw(g, ox, oy, x + xx, y0 + yy, c);
          }
        x += w;
      }
    });
    if (r() < 0.3) { const x = r.int(1, 14); pw(g, ox, oy, x, 3, '#6cc04a'); pw(g, ox, oy, x + 1, 3, '#86d64e'); }
  },
  plaza(g, ox, oy, r) {
    rect(g, ox, oy, T, T, '#c89e8c');
    const stones = ['#fdf0d4', '#f8dcc4', '#f4e8d4', '#fbe6c4'];
    for (const [x, y] of [[0, 0], [8, 0], [0, 8], [8, 8]]) {
      const base = r.pick(stones);
      rect(g, ox + x, oy + y, 7, 7, base);
      rect(g, ox + x, oy + y, 7, 1, tintHex(base, 0.5));
      rect(g, ox + x, oy + y, 1, 7, tintHex(base, 0.3));
      rect(g, ox + x + 6, oy + y + 1, 1, 6, mixHex(base, '#c09080', 0.4));
      rect(g, ox + x + 1, oy + y + 6, 6, 1, mixHex(base, '#c09080', 0.3));
      if (r() < 0.4) px(g, ox + x + r.int(2, 4), oy + y + r.int(2, 4), mixHex(base, '#c0a0b0', 0.25));
    }
    if (r() < 0.5) { const x = r.pick([7, 15]), y = r.int(1, 14); pw(g, ox, oy, x, y, '#6cc04a'); pw(g, ox, oy, x, y - 1, '#9be05a'); }
  },
  dirt(g, ox, oy, r) {
    rect(g, ox, oy, T, T, '#e8ae6c');
    speckle(g, ox, oy, r, ['#d8985a', '#f6c888', '#dca064'], 46);
    for (let i = 0; i < 3; i++) { const x = r.int(1, 14), y = r.int(1, 14); pw(g, ox, oy, x, y, '#fbe0a8'); pw(g, ox, oy, x + 1, y + 1, '#b8744c'); pw(g, ox, oy, x, y + 1, '#c8845a'); }
  },
  planks(g, ox, oy, r) {
    for (let i = 0; i < 4; i++) {
      const base = r.pick(['#d68c4c', '#c87e42', '#e09a58']);
      rect(g, ox, oy + i * 4, T, 4, base);
      rect(g, ox, oy + i * 4, T, 1, tintHex(base, 0.3));
      rect(g, ox, oy + i * 4 + 3, T, 1, '#6a3a4a');
      const cut = r.int(3, 12);
      rect(g, ox + cut, oy + i * 4, 1, 3, '#8a4a44');
      px(g, ox + 1, oy + i * 4 + 1, '#5a3040');
      px(g, ox + 14, oy + i * 4 + 1, '#5a3040');
    }
  },
  farmland(g, ox, oy, r) {
    rect(g, ox, oy, T, T, '#8c5244');
    for (let y = 0; y < T; y += 4) {
      rect(g, ox, oy + y, T, 2, '#aa6a4e');
      rect(g, ox, oy + y, T, 1, '#c07e5a');
      rect(g, ox, oy + y + 3, T, 1, '#6a3a40');
    }
    speckle(g, ox, oy, r, ['#c48a62', '#744048'], 16);
  },
  rocktop(g, ox, oy, r) {
    rect(g, ox, oy, T, T, '#b4acd0');
    speckle(g, ox, oy, r, ['#c8c0e4', '#9c94bc', '#d8d0f0'], 50);
    for (let i = 0; i < 2; i++) { const x = r.int(1, 13), y = r.int(1, 13); rect(g, ox + x, oy + y, 3, 1, '#8c84ac'); }
    for (let i = 0; i < 2; i++) { const x = r.int(1, 14), y = r.int(1, 14); pw(g, ox, oy, x, y, '#6cc04a'); pw(g, ox, oy, x + 1, y, '#8ed852'); }
  },
  garden(g, ox, oy, r) {
    GEN.grass(g, ox, oy, r);
    for (let i = 0; i < 5; i++) flower(g, ox, oy, r.int(1, 14), r.int(1, 14), ...r.pick(FLOWERS));
  },
  // --- side faces ---
  cliffgrass(g, ox, oy, r) {
    // warm layered earth, violet towards the bottom, with a mossy lip and dangling vines
    const strata = ['#d88c52', '#c67a48', '#b0663e', '#9a5444'];
    for (let y = 0; y < T; y++) rect(g, ox, oy + y, T, 1, strata[Math.min(3, Math.floor(y / 4))]);
    for (let y = 3; y < T; y += 4) {
      rect(g, ox, oy + y, T, 1, '#8a4a4c');
      for (let i = 0; i < 2; i++) { const x = r.int(0, 13); rect(g, ox + x, oy + y - 2, r.int(2, 4), 1, '#e8a064'); }
    }
    speckle(g, ox, oy, r, ['#7a4050', '#f0b070'], 12);
    for (let x = 0; x < T; x++) {
      const d = 3 + ((hash2(x, 3, r.int(0, 999)) * 3) | 0);
      rect(g, ox + x, oy, 1, d, '#5dbb46');
      px(g, ox + x, oy + d, '#3f9a45');
      if (x % 3 === 0) px(g, ox + x, oy, '#b4ec62');
      if (x % 3 === 1) px(g, ox + x, oy + 1, '#86d64e');
    }
    // vines
    for (let k = 0; k < 2; k++) {
      const x = r.int(1, 14), len = r.int(5, 11);
      for (let y = 4; y < 4 + len && y < T; y++) {
        px(g, ox + x + (y % 4 === 0 ? 1 : 0), oy + y, '#3f9a45');
        if (y % 3 === 0) px(g, ox + x - 1, oy + y, '#6cc84c');
      }
      if (r() < 0.5) px(g, ox + x, oy + Math.min(T - 1, 4 + len), r.pick(['#ff8ab8', '#fff8f0', '#ffd84a']));
    }
  },
  cliffrock(g, ox, oy, r) {
    rect(g, ox, oy, T, T, '#7a76a0');
    for (let y = 0; y < T; y += 5) {
      let x = -(y % 7);
      while (x < T) {
        const w = r.int(5, 8);
        const base = r.pick(['#aaa6ca', '#9c98c0', '#b8b2d6', '#a0a8c4']);
        for (let yy = 0; yy < 4; yy++) for (let xx = 0; xx < w - 1; xx++) {
          const X = x + xx; if (X < 0 || X >= T || y + yy >= T) continue;
          px(g, ox + X, oy + y + yy, yy === 0 ? tintHex(base, 0.35) : yy === 3 ? mixHex(base, '#5a4a7a', 0.3) : base);
        }
        x += w;
      }
    }
    for (let i = 0; i < 3; i++) { const x = r.int(0, 14), y = r.int(0, 14); px(g, ox + x, oy + y, '#5dbb46'); px(g, ox + x + 1, oy + y, '#86d64e'); }
  },
  sandside(g, ox, oy, r) {
    rect(g, ox, oy, T, T, '#f0cc94');
    for (let y = 5; y < T; y += 5) rect(g, ox, oy + y, T, 1, '#dcae78');
    speckle(g, ox, oy, r, ['#e0b880', '#fbe2ae'], 30);
    rect(g, ox, oy, T, 1, '#fbe2ae');
  },
  stonewall(g, ox, oy, r) {
    rect(g, ox, oy, T, T, '#a88ea8');
    for (let y = 0; y < T; y += 4) {
      const off = (y / 4) % 2 ? 4 : 0;
      for (let x = -off; x < T; x += 8) {
        const base = r.pick(['#f6e2c4', '#ecd2b8', '#f2dcd0', '#e6dcc8']);
        for (let yy = 0; yy < 3; yy++) for (let xx = 0; xx < 7; xx++) {
          const X = x + xx; if (X < 0 || X >= T) continue;
          px(g, ox + X, oy + y + yy, yy === 0 ? tintHex(base, 0.45) : yy === 2 ? mixHex(base, '#a88ea8', 0.3) : base);
        }
      }
    }
    if (r() < 0.45) {
      const x0 = r.int(0, 10);
      for (let i = 0; i < 9; i++) { const x = x0 + r.int(0, 5), y = r.int(0, 15); pw(g, ox, oy, x, y, i % 3 ? '#4fae40' : '#86d64e'); }
    }
  },
  dockside(g, ox, oy, r) {
    rect(g, ox, oy, T, T, '#8a4a44');
    for (let x = 0; x < T; x += 8) { rect(g, ox + x + 1, oy, 5, T, '#c87e42'); rect(g, ox + x + 1, oy, 1, T, '#e09a58'); }
    rect(g, ox, oy, T, 3, '#d68c4c');
    rect(g, ox, oy + 11, T, 5, '#2fa888');
    rect(g, ox, oy + 11, T, 1, '#6ad8b0');
  },
};

export const TILE_NAMES = Object.keys(GEN);
const VARIANTS = 4;

export function buildTerrainAtlas() {
  const cols = VARIANTS;
  const rows = TILE_NAMES.length;
  const c = makeCanvas(cols * T, rows * T);
  const g = ctx2d(c);
  TILE_NAMES.forEach((name, ri) => {
    for (let v = 0; v < VARIANTS; v++) GEN[name](g, v * T, ri * T, rng(ri * 100 + v * 7 + 3));
  });
  const tex = pixelTexture(c);
  const inset = 0.02;
  const uv = (name, v = 0) => {
    const ri = TILE_NAMES.indexOf(name);
    const u0 = (v * T + inset) / c.width, u1 = ((v + 1) * T - inset) / c.width;
    const v1 = 1 - (ri * T + inset) / c.height, v0 = 1 - ((ri + 1) * T - inset) / c.height;
    return [u0, v0, u1, v1];
  };
  return { canvas: c, tex, uv, variants: VARIANTS };
}

// ---------------------------------------------------------------------------------------------
// Building facades
// ---------------------------------------------------------------------------------------------
export const WALL_COLORS = ['#fff0c8', '#ffe07a', '#b8f0d0', '#b0dcff', '#ffc4cc', '#ffcf9e', '#e4ccff', '#d8f4a0', '#fff6e8'];
export const SHUTTER_COLORS = ['#2fb0a0', '#3a70d8', '#e8503a', '#8a5ad0', '#f0a830', '#3cb878', '#e86aa0'];
export const ROOF_COLORS = [
  ['#e8503a', '#ff8e66', '#a42e30'], // tomato
  ['#d84a78', '#ff82a8', '#962a58'], // raspberry
  ['#f08a30', '#ffc064', '#b0501a'], // marigold
  ['#2fb0a0', '#70dcc8', '#1a7070'], // teal
  ['#3a70d8', '#78a8ff', '#24449a'], // cobalt
  ['#8a5ad0', '#be94f4', '#58389a'], // violet
];
const FLOWER_BOX = [['#ff6a8a', '#ffe070'], ['#ffd84a', '#ff8a3a'], ['#fff8f0', '#ff8ab8'], ['#8ab4ff', '#fff8f0'], ['#d0a4ff', '#ffe070']];

function plaster(g, w, h, base, r) {
  // soft storybook plaster: light top, gentle speckle, rosy weathering near the ground
  for (let y = 0; y < h; y++) rect(g, 0, y, w, 1, mixHex(tintHex(base, 0.18), base, Math.min(1, y / (h * 0.6))));
  const light = tintHex(base, 0.35), dark = mixHex(base, '#b890b0', 0.18);
  for (let i = 0; i < (w * h) / 26; i++) px(g, r.int(0, w - 1), r.int(0, h - 1), r() < 0.5 ? light : dark);
  for (let x = 0; x < w; x++) {
    const d = 2 + ((hash2(x, 1, 5) * 3) | 0);
    for (let y = h - d; y < h; y++) px(g, x, y, mixHex(base, '#a878a0', 0.3));
  }
}

function ivy(g, w, h, r) {
  // creeping ivy from the ground, with the odd flower
  const x0 = r.int(0, Math.max(0, w - 10));
  for (let k = 0; k < 3; k++) {
    let x = x0 + r.int(0, 8), y = h - 2;
    const top = r.int(Math.floor(h * 0.25), Math.floor(h * 0.7));
    while (y > top) {
      px(g, x, y, '#2f8050');
      if (r() < 0.55) { px(g, x - 1, y, '#4fae48'); px(g, x + 1, y - 1, '#6cc84c'); }
      if (r() < 0.12) px(g, x + 1, y, r.pick(['#ff8ab8', '#fff8f0']));
      y--; x += r() < 0.3 ? (r() < 0.5 ? -1 : 1) : 0;
    }
  }
}

function drawWindow(g, x, y, shutter, emissive, opts = {}) {
  const w = opts.w || 8, h = opts.h || 10;
  const frame = '#fffaf0', glass = '#2f6fa8', glassL = '#5ab0e0';
  if (shutter) {
    rect(g, x - 3, y, 3, h, shutter);
    rect(g, x + w, y, 3, h, shutter);
    for (let yy = 1; yy < h; yy += 2) { rect(g, x - 3, y + yy, 3, 1, mixHex(shutter, '#3a2050', 0.25)); rect(g, x + w, y + yy, 3, 1, mixHex(shutter, '#3a2050', 0.25)); }
    px(g, x - 2, y + (h >> 1), '#ffe070'); px(g, x + w + 1, y + (h >> 1), '#ffe070');
  }
  if (opts.round) {
    // porthole window
    for (let yy = -1; yy <= h; yy++) for (let xx = -1; xx <= w; xx++) {
      const dx = (xx - (w - 1) / 2) / ((w + 1) / 2), dy = (yy - (h - 1) / 2) / ((h + 1) / 2);
      const d = dx * dx + dy * dy;
      if (d > 1) continue;
      px(g, x + xx, y + yy, d > 0.62 ? frame : dy < -0.2 ? glassL : glass);
      if (emissive && d <= 0.62) px(emissive, x + xx, y + yy, '#ffcf73');
    }
    px(g, x + 2, y + 2, '#ffffff');
    return;
  }
  rect(g, x - 1, y - 1, w + 2, h + 2, frame);
  // arched top
  rect(g, x, y - 2, w, 1, frame); rect(g, x + 1, y - 3, w - 2, 1, frame);
  rect(g, x, y, w, h, glass);
  rect(g, x + 1, y - 2, w - 2, 2, glassL); rect(g, x, y, w, 2, glassL);
  px(g, x + 1, y + 1, '#ffffff'); px(g, x + 2, y + 2, '#c8f0ff');
  rect(g, x + (w >> 1), y - 2, 1, h + 2, frame);
  rect(g, x, y + (h >> 1), w, 1, frame);
  if (emissive) {
    rect(emissive, x, y - 2, w, h + 2, '#ffcf73');
    rect(emissive, x + (w >> 1), y - 2, 1, h + 2, '#000');
    rect(emissive, x, y + (h >> 1), w, 1, '#000');
  }
  if (opts.flowers) {
    const [pc, cc] = opts.flowers;
    rect(g, x - 2, y + h + 1, w + 4, 2, '#b0663e');
    rect(g, x - 2, y + h + 1, w + 4, 1, '#d88c52');
    for (let i = -1; i < w + 1; i += 2) {
      px(g, x + i, y + h, '#3cb050'); px(g, x + i + 1, y + h - 1, pc); px(g, x + i + 1, y + h, cc);
    }
    px(g, x - 2, y + h + 3, '#3cb050'); px(g, x + w + 1, y + h + 3, '#3cb050'); px(g, x + w + 1, y + h + 4, '#4fae48');
  }
}

function drawDoor(g, x, y, w, h, col, emissive) {
  // round-topped storybook door
  const frame = '#fffaf0';
  rect(g, x - 1, y, w + 2, h + 1, frame);
  rect(g, x, y - 2, w, 2, frame); rect(g, x + 1, y - 3, w - 2, 1, frame);
  rect(g, x, y, w, h, col);
  rect(g, x + 1, y - 2, w - 2, 2, col);
  for (let i = 2; i < w - 1; i += 3) rect(g, x + i, y + 4, 1, h - 5, mixHex(col, '#2a1a3a', 0.25));
  rect(g, x, y, 1, h, tintHex(col, 0.25));
  // little round window
  rect(g, x + 3, y, w - 6, 3, '#2f6fa8'); px(g, x + 3, y, '#5ab0e0');
  if (emissive) rect(emissive, x + 3, y, w - 6, 3, '#ffcf73');
  px(g, x + w - 3, y + (h >> 1) + 1, '#ffe070'); px(g, x + w - 3, y + (h >> 1) + 2, '#c89020');
  rect(g, x - 2, y + h, w + 4, 1, '#c8a8b8');
}

// Creates textures for a building. dims in tiles; returns {front, side, back, frontEm, sideEm}
export function makeBuildingTextures(opts) {
  const { w, d, h, seed = 1 } = opts;
  const r = rng(seed);
  const wall = opts.wall || r.pick(WALL_COLORS);
  const shutter = opts.shutter || r.pick(SHUTTER_COLORS);
  const flowers = r.pick(FLOWER_BOX);
  const hasIvy = opts.ivy ?? r() < 0.55;
  const make = (tw, face) => {
    const W = tw * T, H = Math.max(8, Math.round(h * T));
    const c = makeCanvas(W, H), g = ctx2d(c);
    const em = makeCanvas(W, H), ge = ctx2d(em);
    rect(ge, 0, 0, W, H, '#000');
    plaster(g, W, H, wall, r);
    if (opts.timber) {
      const beam = '#6a4a5a', beamL = '#8a6a78';
      rect(g, 0, 0, W, 2, beam);
      rect(g, 0, H - 3, W, 3, beam);
      rect(g, 0, T * 1 + 2, W, 2, beam); rect(g, 0, T * 1 + 2, W, 1, beamL);
      for (let x = 0; x < W; x += T * 1.5) { rect(g, Math.floor(x), 0, 2, H, beam); px(g, Math.floor(x), 3, beamL); }
      rect(g, W - 2, 0, 2, H, beam);
    } else {
      for (let y = 0; y < H; y += 6) { rect(g, 0, y, 3, 4, tintHex(wall, 0.5)); rect(g, W - 3, y, 3, 4, tintHex(wall, 0.5)); }
      rect(g, 0, H - 3, W, 3, mixHex(wall, '#8a5a7a', 0.35));
      rect(g, 0, 0, W, 2, tintHex(wall, 0.45));
    }
    const floors = Math.max(1, Math.floor((H - 6) / 22));
    const doorX = face === 'front' && opts.door !== false ? (opts.doorX ?? Math.floor(tw / 2)) : -99;
    for (let f = 0; f < floors; f++) {
      const wy = H - 25 - f * 22;
      const top = f === floors - 1 && floors > 1;
      for (let tx = 0; tx < tw; tx++) {
        if (face === 'front' && f === 0 && Math.abs(tx - doorX) < 1) continue;
        if (face === 'back' || (face === 'side' && tw < 2)) continue;
        if ((tx + f + seed) % 2 !== 0 && face === 'side') continue;
        const lit = r() < 0.75;
        const round = top && face === 'front' && (tx + seed) % 3 === 1;
        drawWindow(g, tx * T + 4, wy, face === 'front' && !round ? shutter : null, lit ? ge : null, { flowers: !round && (f === 0 || r() < 0.5) ? flowers : null, round, w: round ? 8 : 8, h: round ? 8 : 10 });
      }
    }
    if (face === 'front' && opts.door !== false) {
      const dw = 10, dh = 16;
      drawDoor(g, doorX * T + (T - dw) / 2, H - dh - 1, dw, dh, opts.doorColor || r.pick(['#e8503a', '#3a70d8', '#2fb0a0', '#8a5ad0', '#f0a830']), ge);
    }
    if (hasIvy && face !== 'back') ivy(g, W, H, r);
    const tex = pixelTexture(c);
    const emTex = pixelTexture(em);
    return { tex, emTex, canvas: c };
  };
  return { front: make(w, 'front'), side: make(d, 'side'), back: make(w, 'back'), wall };
}

// Gable-end triangle texture (same plaster as the wall)
export function makeGableTexture(wall, seed = 1) {
  const c = makeCanvas(T * 2, T * 2), g = ctx2d(c);
  plaster(g, c.width, c.height, wall, rng(seed));
  // round attic window with a heart-shaped vent
  for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) if (x * x + y * y <= 10) px(g, 16 + x, 18 + y, x * x + y * y > 5 ? '#fffaf0' : y < 0 ? '#5ab0e0' : '#2f6fa8');
  px(g, 15, 17, '#ffffff');
  return pixelTexture(c);
}

// Fish-scale shingles with bright rims — the storybook roof
export function makeRoofTexture(colors, seed = 1, cols = 4, rows = 4) {
  const [base, light, dark] = colors;
  const r = rng(seed);
  const c = makeCanvas(cols * T, rows * T), g = ctx2d(c);
  rect(g, 0, 0, c.width, c.height, dark);
  for (let y = 0; y < c.height; y += 4) {
    const off = (y / 4) % 2 ? 2 : 0;
    for (let x = -off; x < c.width; x += 4) {
      const tile = r() < 0.12 ? mixHex(base, light, 0.4) : r() < 0.08 ? mixHex(base, dark, 0.3) : base;
      // rounded scale: 4 wide, 4 tall with a curved bottom
      rect(g, x, y, 4, 3, tile);
      px(g, x + 1, y + 3, tile); px(g, x + 2, y + 3, tile);
      px(g, x + 1, y, light); px(g, x + 2, y, light); px(g, x, y + 1, mixHex(tile, light, 0.5));
      px(g, x + 3, y + 2, mixHex(tile, dark, 0.5));
    }
  }
  const t = pixelTexture(c, { repeat: true });
  return t;
}

// ---------------------------------------------------------------------------------------------
// Interior surfaces
// ---------------------------------------------------------------------------------------------
export function makeFloorTexture(kind = 'wood', seed = 1) {
  const r = rng(seed);
  const c = makeCanvas(T * 2, T * 2), g = ctx2d(c);
  if (kind === 'wood') {
    // honey planks with rosy seams
    for (let y = 0; y < 32; y += 4) {
      const base = r.pick(['#e0a060', '#d8964e', '#e8ac6a']);
      rect(g, 0, y, 32, 4, base);
      rect(g, 0, y, 32, 1, tintHex(base, 0.25));
      rect(g, 0, y + 3, 32, 1, '#9a5a4c');
      rect(g, ((y * 7) % 29) + 1, y, 1, 3, '#b0684c');
      rect(g, ((y * 13) % 23) + 5, y + 1, 3, 1, mixHex(base, '#b06a4a', 0.3));
    }
  } else if (kind === 'tile') {
    for (let y = 0; y < 32; y += 8) for (let x = 0; x < 32; x += 8) {
      const a = ((x + y) / 8) % 2 === 0;
      rect(g, x, y, 8, 8, a ? '#fff4e4' : '#3cb8a8');
      rect(g, x, y, 8, 1, a ? '#ffffff' : '#70dcc8');
      rect(g, x + 7, y, 1, 8, a ? '#e8d8c8' : '#228a80');
      if (a) px(g, x + 3, y + 3, '#ffc4d0');
    }
  } else if (kind === 'stone') {
    rect(g, 0, 0, 32, 32, '#b89aa8');
    for (let y = 0; y < 32; y += 8) for (let x = (y / 8) % 2 ? -4 : 0; x < 32; x += 8) {
      const base = r.pick(['#f4e0d0', '#ecd4c8', '#f8e8d4', '#e8dcec']);
      rect(g, x, y, 7, 7, base);
      rect(g, x, y, 7, 1, tintHex(base, 0.45));
    }
  }
  const t = pixelTexture(c, { repeat: true });
  return t;
}

// Patterned storybook wallpapers — each room gets its own colour and motif
export function makeWallpaperTexture(kind = 'cream', seed = 1) {
  const c = makeCanvas(T * 2, T * 2), g = ctx2d(c);
  const schemes = {
    cream: ['#fff0d0', '#ffe4b8', '#e8a040', 'star'],
    rose: ['#ffd0dc', '#ffbccc', '#ff6a8a', 'heart'],
    mint: ['#c8f4dc', '#b0ecca', '#3cb878', 'leaf'],
    sky: ['#cce8ff', '#b4dcff', '#fff8f0', 'cloud'],
    butter: ['#fff0a8', '#ffe488', '#e89030', 'paw'],
    lilac: ['#e8d8ff', '#dcc8ff', '#8a5ad0', 'moon'],
  };
  const [a, b, dot, motif] = schemes[kind] || schemes.cream;
  rect(g, 0, 0, 32, 32, a);
  for (let x = 0; x < 32; x += 8) rect(g, x, 0, 3, 32, b);
  const M = {
    star: [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]],
    heart: [[0, 0], [2, 0], [0, 1], [1, 1], [2, 1], [1, 2]],
    leaf: [[1, 0], [0, 1], [1, 1], [1, 2], [2, 1]],
    cloud: [[1, 0], [0, 1], [1, 1], [2, 1], [3, 1]],
    paw: [[0, 0], [2, 0], [1, 1], [0, 2], [1, 2], [2, 2]],
    moon: [[1, 0], [2, 0], [0, 1], [0, 2], [1, 3], [2, 3]],
  }[motif];
  for (let y = 3; y < 32; y += 16) for (let x = 4; x < 32; x += 16) {
    for (const [dx, dy] of M) px(g, x + dx, y + dy, dot);
    for (const [dx, dy] of M) px(g, ((x + 8) % 32) + dx, ((y + 8) % 32) + dy, dot);
  }
  return pixelTexture(c, { repeat: true });
}

export function makeWainscotTexture() {
  // painted panelling in dusky teal with gold trim
  const c = makeCanvas(32, 16), g = ctx2d(c);
  rect(g, 0, 0, 32, 16, '#2f7a78');
  rect(g, 0, 0, 32, 2, '#f2c14e'); rect(g, 0, 2, 32, 1, '#c8902a');
  for (let x = 0; x < 32; x += 8) { rect(g, x + 1, 4, 6, 10, '#3a9290'); rect(g, x + 1, 4, 6, 1, '#1f5a5a'); rect(g, x + 1, 13, 6, 1, '#5ab0a8'); }
  return pixelTexture(c, { repeat: true });
}

export function drawTexture(w, h, fn, opts) {
  const c = makeCanvas(w, h), g = ctx2d(c);
  fn(g, c);
  return pixelTexture(c, opts);
}

export { T as TEX_PX };

// Round turret wall (wraps around a cylinder): plaster with arched and round windows
export function makeTurretTexture(wall, h, seed = 3) {
  const r = rng(seed);
  const W = 128, H = Math.round(h * T);
  const c = makeCanvas(W, H), g = ctx2d(c);
  const em = makeCanvas(W, H), ge = ctx2d(em);
  rect(ge, 0, 0, W, H, '#000');
  plaster(g, W, H, wall, r);
  rect(g, 0, H - 3, W, 3, mixHex(wall, '#8a5a7a', 0.35));
  for (let f = 0; f < Math.floor((H - 10) / 22); f++) {
    const wy = H - 26 - f * 22;
    for (const x of [10, 42, 74, 106]) drawWindow(g, x, wy, null, r() < 0.8 ? ge : null, { round: f % 2 === 1, w: 8, h: f % 2 ? 8 : 10, flowers: f === 0 ? FLOWER_BOX[(x / 32) | 0] : null });
  }
  ivy(g, W, H, r);
  return { tex: pixelTexture(c, { repeat: true }), emTex: pixelTexture(em, { repeat: true }) };
}
