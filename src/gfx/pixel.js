// Pixel-art toolkit: palettes, string-drawn sprites, auto outlines and textures.
import * as THREE from 'three';

export const PX = 16; // texels per world unit — every texture shares this density

// Kiki-inspired master palette: navy dress, red bow, terracotta roofs, sea blues, meadow greens.
export const C = {
  ink: '#2a1d2e',
  plum: '#4a3548',
  cream: '#fff6e4',
  paper: '#f4e6c8',
  white: '#fffdf6',
  skin: '#f9d8bb',
  skinS: '#e7ab8e',
  blush: '#f2968a',
  hair: '#3b2828',
  hairH: '#61433a',
  navy: '#2e3a6b',
  navyD: '#1e2548',
  navyL: '#4a5b99',
  red: '#dd3b3f',
  redD: '#a02538',
  redL: '#ff7a6b',
  boot: '#6b3a26',
  bootD: '#43241a',
  terracotta: '#c9563f',
  terracottaL: '#e27b5c',
  terracottaD: '#8e3a2d',
  grass: '#79ad45',
  grassL: '#9ccb5a',
  grassD: '#55852f',
  grassDD: '#3d6427',
  sand: '#ecd9a6',
  sandD: '#d4bd83',
  sea: '#2f78a8',
  seaD: '#1f5582',
  seaL: '#5fb2d6',
  foam: '#e8f7ff',
  wood: '#98613a',
  woodD: '#6a3f26',
  woodL: '#bb8350',
  stone: '#b8aa93',
  stoneD: '#8f8270',
  stoneL: '#d6cab2',
  gold: '#f2c14e',
  goldD: '#c48a2c',
  lantern: '#ffd36b',
};

export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export const rgbToHex = ([r, g, b]) =>
  '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');

// Darken while nudging hue toward cool purple — reads nicer than pure black outlines.
export function shadeRgb([r, g, b], f = 0.55) {
  return [r * f + 18 * (1 - f) * 0.6, g * f + 10 * (1 - f) * 0.4, b * f + 34 * (1 - f) * 0.7];
}
export function shadeHex(hex, f = 0.7) {
  return rgbToHex(shadeRgb(hexToRgb(hex), f));
}
export function tintHex(hex, f = 0.25) {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex([r + (255 - r) * f, g + (250 - g) * f, b + (235 - b) * f]);
}
export function mixHex(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return rgbToHex([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]);
}

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}
export function ctx2d(c) {
  const x = c.getContext('2d', { willReadFrequently: true });
  x.imageSmoothingEnabled = false;
  return x;
}

// Mirror helper: author the left half of a symmetric sprite.
export function mirror(rows) {
  return rows.map((r) => r + r.split('').reverse().join(''));
}

// Draw string rows onto a context using a char->color palette ('.' or ' ' = transparent).
export function drawRows(g, rows, pal, ox = 0, oy = 0, flip = false) {
  const w = rows.reduce((m, r) => Math.max(m, r.length), 0);
  for (let y = 0; y < rows.length; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      const col = pal[ch];
      if (!col) continue;
      g.fillStyle = col;
      g.fillRect(ox + (flip ? w - 1 - x : x), oy + y, 1, 1);
    }
  }
}

// Adds a 1px outline around opaque pixels. Outline colour is a darkened version of the
// neighbouring pixel ("selective outlining") unless a fixed colour is given.
export function outlineCanvas(canvas, fixed = null, strength = 0.42) {
  const w = canvas.width, h = canvas.height;
  const g = ctx2d(canvas);
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  const out = new Uint8ClampedArray(d);
  const fixedRgb = fixed ? hexToRgb(fixed) : null;
  const at = (x, y) => (y * w + x) * 4;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = at(x, y);
      if (d[i + 3] > 0) continue;
      let best = -1;
      const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (const [dx, dy] of nb) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const j = at(nx, ny);
        if (d[j + 3] > 0) { best = j; break; }
      }
      if (best >= 0) {
        const rgb = fixedRgb || shadeRgb([d[best], d[best + 1], d[best + 2]], strength);
        out[i] = rgb[0]; out[i + 1] = rgb[1]; out[i + 2] = rgb[2]; out[i + 3] = 255;
      }
    }
  }
  img.data.set(out);
  g.putImageData(img, 0, 0);
  return canvas;
}

// Build a canvas from rows. opts: { pad, outline (true|'#hex'|false), scale }
export function spriteCanvas(rows, pal, opts = {}) {
  const pad = opts.pad ?? (opts.outline === false ? 0 : 1);
  const w = rows.reduce((m, r) => Math.max(m, r.length), 0);
  const h = rows.length;
  const c = makeCanvas(w + pad * 2, h + pad * 2);
  const g = ctx2d(c);
  drawRows(g, rows, pal, pad, pad, !!opts.flip);
  if (opts.outline !== false) outlineCanvas(c, typeof opts.outline === 'string' ? opts.outline : null, opts.outlineStrength);
  return c;
}

export function flipCanvas(src) {
  const c = makeCanvas(src.width, src.height);
  const g = ctx2d(c);
  g.translate(src.width, 0);
  g.scale(-1, 1);
  g.drawImage(src, 0, 0);
  return c;
}

// Pack a list of equally-sized frames into a horizontal strip; returns {canvas, fw, fh, n, rect(i)}
export function strip(frames) {
  const fw = Math.max(...frames.map((f) => f.width));
  const fh = Math.max(...frames.map((f) => f.height));
  const c = makeCanvas(fw * frames.length, fh);
  const g = ctx2d(c);
  frames.forEach((f, i) => g.drawImage(f, i * fw + Math.floor((fw - f.width) / 2), fh - f.height));
  return { canvas: c, fw, fh, n: frames.length };
}

export function pixelTexture(canvas, { repeat = false } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.needsUpdate = true;
  return t;
}

// Scale a canvas up by an integer factor (for UI icons / portraits).
export function upscale(src, k) {
  const c = makeCanvas(src.width * k, src.height * k);
  const g = ctx2d(c);
  g.imageSmoothingEnabled = false;
  g.drawImage(src, 0, 0, c.width, c.height);
  return c;
}

// Recolour a canvas by exact-colour mapping {fromHex: toHex}.
export function recolor(src, map) {
  const c = makeCanvas(src.width, src.height);
  const g = ctx2d(c);
  g.drawImage(src, 0, 0);
  const img = g.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  const entries = Object.entries(map).map(([a, b]) => [hexToRgb(a), hexToRgb(b)]);
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    for (const [a, b] of entries) {
      if (d[i] === a[0] && d[i + 1] === a[1] && d[i + 2] === a[2]) {
        d[i] = b[0]; d[i + 1] = b[1]; d[i + 2] = b[2];
        break;
      }
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

// Fill helpers for procedural pixel drawing
export function px(g, x, y, col) {
  g.fillStyle = col;
  g.fillRect(x | 0, y | 0, 1, 1);
}
export function rect(g, x, y, w, h, col) {
  g.fillStyle = col;
  g.fillRect(x | 0, y | 0, w | 0, h | 0);
}
export function disc(g, cx, cy, r, col) {
  g.fillStyle = col;
  for (let y = -Math.ceil(r); y <= Math.ceil(r); y++)
    for (let x = -Math.ceil(r); x <= Math.ceil(r); x++)
      if (x * x + y * y <= r * r + r * 0.8) g.fillRect(Math.round(cx + x), Math.round(cy + y), 1, 1);
}
