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

const GEN = {
  grass(g, ox, oy, r) {
    rect(g, ox, oy, T, T, '#79ad45');
    speckle(g, ox, oy, r, ['#86b94d', '#6ea03f'], 40);
    for (let i = 0; i < 6; i++) {
      const x = ox + r.int(1, 14), y = oy + r.int(2, 15);
      px(g, x, y, '#5d9136');
      px(g, x - 1, y - 1, '#6a9c3c');
      px(g, x + 1, y - 1, '#6a9c3c');
    }
    for (let i = 0; i < 3; i++) px(g, ox + r.int(0, 15), oy + r.int(0, 15), '#a6d060');
  },
  flowers(g, ox, oy, r) {
    GEN.grass(g, ox, oy, r);
    const cols = [['#fff6e4', '#f5d24b'], ['#f7a8c0', '#fff6e4'], ['#f5d24b', '#f08a3a'], ['#b8a8f0', '#fff6e4']];
    for (let i = 0; i < 4; i++) {
      const [a, b] = r.pick(cols);
      const x = ox + r.int(2, 13), y = oy + r.int(2, 13);
      px(g, x, y - 1, a); px(g, x - 1, y, a); px(g, x + 1, y, a); px(g, x, y + 1, a); px(g, x, y, b);
    }
  },
  meadow(g, ox, oy, r) {
    rect(g, ox, oy, T, T, '#8bbb4e');
    speckle(g, ox, oy, r, ['#9cc85a', '#7aab45', '#a8d466'], 50);
    for (let i = 0; i < 5; i++) {
      const x = ox + r.int(1, 14), y = oy + r.int(3, 15);
      px(g, x, y, '#6a9c3c'); px(g, x, y - 1, '#7aab45'); px(g, x, y - 2, '#b0da70');
    }
  },
  forest(g, ox, oy, r) {
    rect(g, ox, oy, T, T, '#5d8c3a');
    speckle(g, ox, oy, r, ['#517c33', '#6a9a42', '#4a7030'], 60);
    for (let i = 0; i < 5; i++) {
      const x = ox + r.int(1, 14), y = oy + r.int(1, 14);
      const c = r.pick(['#a0703a', '#c28a44', '#8a5a2e']);
      px(g, x, y, c); px(g, x + 1, y, c);
    }
  },
  sand(g, ox, oy, r) {
    rect(g, ox, oy, T, T, '#ecd9a6');
    speckle(g, ox, oy, r, ['#e2cc92', '#f5e6bd', '#d9c186'], 45);
    if (r() < 0.4) { const x = ox + r.int(2, 13), y = oy + r.int(2, 13); px(g, x, y, '#f7c9c0'); px(g, x + 1, y, '#e8aaa0'); }
  },
  wetsand(g, ox, oy, r) {
    rect(g, ox, oy, T, T, '#d8c08a');
    speckle(g, ox, oy, r, ['#cdb27a', '#e2cc92'], 40);
  },
  seabed(g, ox, oy, r) {
    rect(g, ox, oy, T, T, '#c9b27c');
    speckle(g, ox, oy, r, ['#b89e6a', '#d6c08c', '#9fb07a'], 50);
  },
  cobble(g, ox, oy, r) {
    rect(g, ox, oy, T, T, '#8f8270');
    const rows = [[0, 4], [4, 4], [8, 4], [12, 4]];
    rows.forEach(([y0, h], ri) => {
      let x = -((ri * 3) % 5);
      while (x < T) {
        const w = r.int(4, 6);
        const base = r.pick(['#c8baa0', '#bcae94', '#d4c6aa', '#b4a58c']);
        for (let yy = 0; yy < h - 1; yy++)
          for (let xx = 0; xx < w - 1; xx++) {
            const X = x + xx;
            if (X < 0 || X >= T) continue;
            const corner = (yy === 0 || yy === h - 2) && (xx === 0 || xx === w - 2);
            if (corner) continue;
            let c = base;
            if (yy === 0 || xx === 0) c = tintHex(base, 0.25);
            if (yy === h - 2 || xx === w - 2) c = shadeHex(base, 0.85);
            px(g, ox + X, oy + y0 + yy, c);
          }
        x += w;
      }
    });
  },
  plaza(g, ox, oy, r) {
    rect(g, ox, oy, T, T, '#a8987e');
    for (const [x, y] of [[0, 0], [8, 0], [0, 8], [8, 8]]) {
      const base = r.pick(['#dccfb4', '#d2c4a8', '#e4d8be', '#cbbc9e']);
      rect(g, ox + x, oy + y, 7, 7, base);
      rect(g, ox + x, oy + y, 7, 1, tintHex(base, 0.3));
      rect(g, ox + x + 6, oy + y + 1, 1, 6, shadeHex(base, 0.88));
      if (r() < 0.5) px(g, ox + x + r.int(1, 5), oy + y + r.int(1, 5), shadeHex(base, 0.9));
    }
  },
  dirt(g, ox, oy, r) {
    rect(g, ox, oy, T, T, '#c29a64');
    speckle(g, ox, oy, r, ['#b48a56', '#cfa874', '#a87e4c'], 50);
    for (let i = 0; i < 3; i++) { const x = ox + r.int(1, 14), y = oy + r.int(1, 14); px(g, x, y, '#e0c9a0'); px(g, x + 1, y + 1, '#8a6a44'); }
  },
  planks(g, ox, oy, r) {
    for (let i = 0; i < 4; i++) {
      const base = r.pick(['#a8703f', '#9c653a', '#b27a47']);
      rect(g, ox, oy + i * 4, T, 4, base);
      rect(g, ox, oy + i * 4, T, 1, tintHex(base, 0.18));
      rect(g, ox, oy + i * 4 + 3, T, 1, '#5e3a22');
      const cut = r.int(3, 12);
      rect(g, ox + cut, oy + i * 4, 1, 3, '#6e4428');
      px(g, ox + 1, oy + i * 4 + 1, '#4a2e1c');
      px(g, ox + 14, oy + i * 4 + 1, '#4a2e1c');
    }
  },
  farmland(g, ox, oy, r) {
    rect(g, ox, oy, T, T, '#8a5e3a');
    for (let y = 0; y < T; y += 4) {
      rect(g, ox, oy + y, T, 2, '#a07048');
      rect(g, ox, oy + y + 3, T, 1, '#6e4a2c');
    }
    speckle(g, ox, oy, r, ['#b0825a', '#74502f'], 20);
  },
  rocktop(g, ox, oy, r) {
    rect(g, ox, oy, T, T, '#a39a8c');
    speckle(g, ox, oy, r, ['#b5ad9f', '#8f8678', '#c4bcae'], 60);
    for (let i = 0; i < 3; i++) { const x = ox + r.int(1, 13), y = oy + r.int(1, 13); rect(g, x, y, 3, 1, '#857c6e'); }
  },
  garden(g, ox, oy, r) {
    GEN.grass(g, ox, oy, r);
    for (let i = 0; i < 6; i++) {
      const x = ox + r.int(1, 14), y = oy + r.int(1, 14);
      const c = r.pick(['#e05a6a', '#ff8fa0', '#f5d24b', '#fff6e4', '#b08af0']);
      px(g, x, y, c);
    }
  },
  // --- side faces ---
  cliffgrass(g, ox, oy, r) {
    rect(g, ox, oy, T, T, '#9a6e46');
    for (let y = 0; y < T; y += 4) {
      rect(g, ox, oy + y + 3, T, 1, '#7e5636');
      for (let i = 0; i < 3; i++) { const x = ox + r.int(0, 13); rect(g, x, oy + y + 1, r.int(2, 4), 1, '#ae8156'); }
    }
    speckle(g, ox, oy, r, ['#6e4a2c', '#b08a60'], 16);
    // grass lip draping over the edge
    for (let x = 0; x < T; x++) {
      const d = 2 + ((hash2(x, 3, r.int(0, 999)) * 3) | 0);
      rect(g, ox + x, oy, 1, d, '#79ad45');
      px(g, ox + x, oy + d, '#55852f');
      if (x % 3 === 0) px(g, ox + x, oy, '#9ccb5a');
    }
  },
  cliffrock(g, ox, oy, r) {
    rect(g, ox, oy, T, T, '#8f8678');
    for (let y = 0; y < T; y += 5) {
      let x = -(y % 7);
      while (x < T) {
        const w = r.int(5, 8);
        const base = r.pick(['#a39a8c', '#978e80', '#b0a898']);
        for (let yy = 0; yy < 4; yy++) for (let xx = 0; xx < w - 1; xx++) {
          const X = x + xx; if (X < 0 || X >= T || y + yy >= T) continue;
          px(g, ox + X, oy + y + yy, yy === 0 ? tintHex(base, 0.2) : yy === 3 ? shadeHex(base, 0.85) : base);
        }
        x += w;
      }
    }
  },
  sandside(g, ox, oy, r) {
    rect(g, ox, oy, T, T, '#d9c186');
    speckle(g, ox, oy, r, ['#cdb27a', '#e6d2a0'], 40);
    rect(g, ox, oy, T, 1, '#ecd9a6');
  },
  stonewall(g, ox, oy, r) {
    rect(g, ox, oy, T, T, '#8a7e6c');
    for (let y = 0; y < T; y += 4) {
      const off = (y / 4) % 2 ? 4 : 0;
      for (let x = -off; x < T; x += 8) {
        const base = r.pick(['#cfc2a6', '#c4b698', '#d8ccb2']);
        for (let yy = 0; yy < 3; yy++) for (let xx = 0; xx < 7; xx++) {
          const X = x + xx; if (X < 0 || X >= T) continue;
          px(g, ox + X, oy + y + yy, yy === 0 ? tintHex(base, 0.25) : yy === 2 ? shadeHex(base, 0.88) : base);
        }
      }
    }
  },
  dockside(g, ox, oy, r) {
    rect(g, ox, oy, T, T, '#6e4428');
    for (let x = 0; x < T; x += 8) { rect(g, ox + x + 1, oy, 5, T, '#8a5a36'); rect(g, ox + x + 1, oy, 1, T, '#a06c42'); }
    rect(g, ox, oy, T, 3, '#a8703f');
    rect(g, ox, oy + 12, T, 4, '#3e5a4a');
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
export const WALL_COLORS = ['#f2e3c6', '#f4d58d', '#bfe0c9', '#a8d0e6', '#f2b5a7', '#f7ecd8', '#e8c9a0', '#d8e6b8', '#f0c8a0'];
export const SHUTTER_COLORS = ['#4f8a6a', '#3f6fa8', '#b84a3a', '#6a8a3a', '#7a5a9a', '#2f6f7a'];
export const ROOF_COLORS = [
  ['#c9563f', '#e27b5c', '#8e3a2d'],
  ['#b8503a', '#d4704e', '#7e3226'],
  ['#d06a42', '#ec9064', '#94462c'],
  ['#4f8a86', '#6fb0a8', '#34605e'],
  ['#5a6f9a', '#7b91bc', '#3d4d6e'],
  ['#8a5a8a', '#a87aa8', '#5e3c5e'],
];

function plaster(g, w, h, base, r) {
  rect(g, 0, 0, w, h, base);
  const light = tintHex(base, 0.25), dark = shadeHex(base, 0.92);
  for (let i = 0; i < (w * h) / 10; i++) px(g, r.int(0, w - 1), r.int(0, h - 1), r() < 0.5 ? light : dark);
  // soft weathering near the ground
  for (let x = 0; x < w; x++) {
    const d = 2 + ((hash2(x, 1, 5) * 3) | 0);
    for (let y = h - d; y < h; y++) px(g, x, y, shadeHex(base, 0.84));
  }
}

function drawWindow(g, x, y, shutter, emissive, opts = {}) {
  const w = opts.w || 8, h = opts.h || 10;
  // shutters
  if (shutter) {
    rect(g, x - 3, y, 3, h, shutter);
    rect(g, x + w, y, 3, h, shutter);
    for (let yy = 1; yy < h; yy += 2) { rect(g, x - 3, y + yy, 3, 1, shadeHex(shutter, 0.8)); rect(g, x + w, y + yy, 3, 1, shadeHex(shutter, 0.8)); }
  }
  rect(g, x - 1, y - 1, w + 2, h + 2, '#fff8ec');
  if (opts.arch) { rect(g, x, y - 2, w, 1, '#fff8ec'); rect(g, x + 1, y - 3, w - 2, 1, '#fff8ec'); }
  rect(g, x, y, w, h, '#35507a');
  rect(g, x, y, w, 2, '#4a6a98');
  px(g, x + 1, y + 2, '#8ab4d8'); px(g, x + 2, y + 3, '#8ab4d8');
  rect(g, x + (w >> 1) - 0 , y, 1, h, '#fff8ec');
  rect(g, x, y + (h >> 1), w, 1, '#fff8ec');
  if (emissive) {
    rect(emissive, x, y, w, h, '#ffcf73');
    rect(emissive, x + (w >> 1), y, 1, h, '#000');
    rect(emissive, x, y + (h >> 1), w, 1, '#000');
  }
  // flower box
  if (opts.flowers) {
    rect(g, x - 1, y + h + 1, w + 2, 2, '#8a5a36');
    for (let i = 0; i < w + 2; i += 2) {
      px(g, x - 1 + i, y + h, opts.flowers);
      px(g, x + i, y + h, '#4f8a3a');
    }
  }
}

function drawDoor(g, x, y, w, h, col, emissive) {
  rect(g, x - 1, y - 2, w + 2, h + 2, '#fff8ec');
  rect(g, x, y - 1, w, h + 1, col);
  rect(g, x + 1, y - 2, w - 2, 1, '#fff8ec');
  for (let i = 1; i < w; i += 3) rect(g, x + i, y, 1, h, shadeHex(col, 0.8));
  rect(g, x, y - 1, w, 1, shadeHex(col, 0.7));
  px(g, x + w - 3, y + (h >> 1), '#f2c14e');
  // small transom window
  rect(g, x + 2, y + 1, w - 4, 3, '#35507a');
  if (emissive) rect(emissive, x + 2, y + 1, w - 4, 3, '#ffcf73');
  rect(g, x - 2, y + h, w + 4, 1, '#b0a898');
}

// Creates textures for a building. dims in tiles; returns {front, side, back, frontEm, sideEm}
export function makeBuildingTextures(opts) {
  const { w, d, h, seed = 1 } = opts;
  const r = rng(seed);
  const wall = opts.wall || r.pick(WALL_COLORS);
  const shutter = opts.shutter || r.pick(SHUTTER_COLORS);
  const flowers = r.pick(['#e05a6a', '#ff8fa0', '#f5d24b', '#fff6e4', '#e87a3a']);
  const make = (tw, face) => {
    const W = tw * T, H = h * T;
    const c = makeCanvas(W, H), g = ctx2d(c);
    const em = makeCanvas(W, H), ge = ctx2d(em);
    rect(ge, 0, 0, W, H, '#000');
    plaster(g, W, H, wall, r);
    if (opts.timber) {
      const beam = '#6a4228';
      rect(g, 0, 0, W, 2, beam);
      rect(g, 0, H - 3, W, 3, beam);
      rect(g, 0, T * 1 + 2, W, 2, beam);
      for (let x = 0; x < W; x += T * 1.5) rect(g, Math.floor(x), 0, 2, H, beam);
      rect(g, W - 2, 0, 2, H, beam);
    } else {
      // corner quoins
      for (let y = 0; y < H; y += 6) { rect(g, 0, y, 3, 4, tintHex(wall, 0.35)); rect(g, W - 3, y, 3, 4, tintHex(wall, 0.35)); }
      rect(g, 0, H - 3, W, 3, shadeHex(wall, 0.72));
    }
    const floors = Math.max(1, Math.floor((h * T - 6) / 22));
    const doorX = face === 'front' && opts.door !== false ? (opts.doorX ?? Math.floor(tw / 2)) : -99;
    for (let f = 0; f < floors; f++) {
      const wy = H - 26 - f * 22;
      for (let tx = 0; tx < tw; tx++) {
        if (face === 'front' && f === 0 && Math.abs(tx - doorX) < 1) continue;
        if (face === 'back' || (face === 'side' && tw < 2)) continue;
        if ((tx + f + seed) % (face === 'side' ? 2 : 1) !== 0 && face === 'side') continue;
        const lit = r() < 0.7;
        drawWindow(g, tx * T + 4, wy, face === 'front' ? shutter : null, lit ? ge : null, { flowers: f === 0 || r() < 0.4 ? flowers : null, arch: opts.arch });
      }
    }
    if (face === 'front' && opts.door !== false) {
      const dw = 10, dh = 17;
      drawDoor(g, doorX * T + (T - dw) / 2, H - dh - 1, dw, dh, opts.doorColor || r.pick(['#6a3f26', '#3f6fa8', '#4f8a6a', '#8e3a2d']), ge);
    }
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
  // small round attic window
  rect(g, 13, 16, 6, 6, '#fff8ec');
  rect(g, 14, 17, 4, 4, '#35507a');
  return pixelTexture(c);
}

export function makeRoofTexture(colors, seed = 1, cols = 4, rows = 4) {
  const [base, light, dark] = colors;
  const r = rng(seed);
  const c = makeCanvas(cols * T, rows * T), g = ctx2d(c);
  rect(g, 0, 0, c.width, c.height, dark);
  for (let y = 0; y < c.height; y += 4) {
    const off = (y / 4) % 2 ? 2 : 0;
    for (let x = -off; x < c.width; x += 4) {
      const tile = r() < 0.12 ? mixHex(base, light, 0.5) : r() < 0.1 ? shadeHex(base, 0.9) : base;
      rect(g, x, y, 4, 3, tile);
      px(g, x, y, light);
      px(g, x + 1, y, light);
      px(g, x + 3, y + 2, shadeHex(tile, 0.8));
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
    for (let y = 0; y < 32; y += 4) {
      const base = r.pick(['#b07a48', '#a8703f', '#bb8452']);
      rect(g, 0, y, 32, 4, base);
      rect(g, 0, y, 32, 1, tintHex(base, 0.15));
      rect(g, 0, y + 3, 32, 1, '#6e4428');
      rect(g, ((y * 7) % 29) + 1, y, 1, 3, '#7e5030');
      rect(g, ((y * 13) % 23) + 5, y + 1, 3, 1, shadeHex(base, 0.9));
    }
  } else if (kind === 'tile') {
    for (let y = 0; y < 32; y += 8) for (let x = 0; x < 32; x += 8) {
      const a = ((x + y) / 8) % 2 === 0;
      rect(g, x, y, 8, 8, a ? '#f2e8d8' : '#c9563f');
      rect(g, x, y, 8, 1, a ? '#fffaf0' : '#e27b5c');
      rect(g, x + 7, y, 1, 8, a ? '#d8ccb8' : '#a8452f');
    }
  } else if (kind === 'stone') {
    rect(g, 0, 0, 32, 32, '#a8987e');
    for (let y = 0; y < 32; y += 8) for (let x = (y / 8) % 2 ? -4 : 0; x < 32; x += 8) {
      const base = r.pick(['#d8ccb2', '#cfc2a6', '#e0d4ba']);
      rect(g, x, y, 7, 7, base);
      rect(g, x, y, 7, 1, tintHex(base, 0.3));
    }
  }
  const t = pixelTexture(c, { repeat: true });
  return t;
}

export function makeWallpaperTexture(kind = 'cream', seed = 1) {
  const c = makeCanvas(T * 2, T * 2), g = ctx2d(c);
  const schemes = {
    cream: ['#f4e6c8', '#e8d4ae', '#d9a0a0'],
    rose: ['#f2cfc6', '#e6b4aa', '#fff4ea'],
    mint: ['#cfe6d2', '#b4d4b8', '#fff4ea'],
    sky: ['#cfe0ee', '#b4cce0', '#fff4ea'],
    butter: ['#f6e3a8', '#e6cc86', '#fff4ea'],
    lilac: ['#e0d4ee', '#c8b8dc', '#fff4ea'],
  };
  const [a, b, dot] = schemes[kind] || schemes.cream;
  rect(g, 0, 0, 32, 32, a);
  for (let x = 0; x < 32; x += 8) rect(g, x, 0, 2, 32, b);
  for (let y = 2; y < 32; y += 8) for (let x = 4; x < 32; x += 8) {
    px(g, x + 1, y, dot); px(g, x, y + 1, dot); px(g, x + 2, y + 1, dot); px(g, x + 1, y + 2, dot);
  }
  return pixelTexture(c, { repeat: true });
}

export function makeWainscotTexture() {
  const c = makeCanvas(32, 16), g = ctx2d(c);
  rect(g, 0, 0, 32, 16, '#8a5a36');
  rect(g, 0, 0, 32, 2, '#b07a48');
  for (let x = 0; x < 32; x += 8) { rect(g, x + 1, 4, 6, 10, '#9c653a'); rect(g, x + 1, 4, 6, 1, '#6e4428'); rect(g, x + 1, 13, 6, 1, '#b07a48'); }
  return pixelTexture(c, { repeat: true });
}

// A simple procedural texture from a draw callback
export function drawTexture(w, h, fn, opts) {
  const c = makeCanvas(w, h), g = ctx2d(c);
  fn(g, c);
  return pixelTexture(c, opts);
}

export { T as TEX_PX };
