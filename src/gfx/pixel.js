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
  skin: '#ffdcc4',
  skinS: '#e7ab8e',
  blush: '#ff8aa0',
  hair: '#3a2438',
  hairH: '#6a4058',
  navy: '#343a8a',
  navyD: '#221f5a',
  navyL: '#5a62c0',
  red: '#ff3b52',
  redD: '#b8204a',
  redL: '#ff8aa0',
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

// ------------------------------------------------------------------ seasons
// Shift green foliage/grass toward a season: 0 spring (as painted), 1 summer (sun-warmed),
// 2 autumn (copper & gold), 3 winter (frosted). mode 'leaf' is bold, 'ground' is gentler.
function rgb2hsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  let h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
function hsl2rgb(h, s, l) {
  h = ((h % 360) + 360) % 360 / 360;
  if (!s) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = (t) => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}
export function seasonPixel(r, g, b, si, mode = 'leaf') {
  if (!si) return [r, g, b];
  const [h, s, l] = rgb2hsl(r, g, b);
  // how "green" is this pixel (soft edges so shading doesn't break)
  const top = 182;
  const hw = Math.min(Math.max(0, (h - 62) / 14), Math.max(0, (top - h) / 14), 1);
  let w = hw * Math.min(1, Math.max(0, (s - 0.16) / 0.12));
  // blossoms frost over in winter
  if (si === 3 && mode === 'leaf' && (h > 290 || h < 15) && s > 0.4 && l > 0.6) {
    const k = 0.7;
    return [r + (246 - r) * k, g + (246 - g) * k, b + (255 - b) * k];
  }
  if (w <= 0) return [r, g, b];
  let out;
  if (si === 1) out = hsl2rgb(h - 12, Math.min(1, s * 1.04), Math.min(1, l * 1.03));
  else if (si === 2) {
    if (mode === 'leaf') {
      const t = Math.min(1, Math.max(0, (h - 70) / 100));
      const nh = l < 0.32 ? 6 + t * 14 : 14 + t * 32;
      out = hsl2rgb(nh, Math.max(0.74, s), Math.min(0.74, l * 1.08 + 0.05));
    } else out = hsl2rgb(h - 50, s * 0.85, l * 1.02);
  } else {
    const snow = [244, 248, 255];
    const k = mode === 'leaf' ? (l > 0.45 ? 0.82 : l > 0.3 ? 0.5 : 0.22) : 0.86;
    const base = mode === 'leaf' ? hsl2rgb(h + 10, s * 0.6, l * 0.9) : hsl2rgb(215, 0.3, 0.8);
    out = base.map((v, i) => v + (snow[i] - v) * k * (mode === 'leaf' ? 1 : Math.min(1, 0.7 + l)));
  }
  return [r + (out[0] - r) * w, g + (out[1] - g) * w, b + (out[2] - b) * w];
}
export function seasonImageData(src, dst, si, mode) {
  const a = src.data, o = dst.data;
  for (let i = 0; i < a.length; i += 4) {
    if (!a[i + 3]) { o[i + 3] = 0; continue; }
    const [r, g, b] = seasonPixel(a[i], a[i + 1], a[i + 2], si, mode);
    o[i] = r; o[i + 1] = g; o[i + 2] = b; o[i + 3] = a[i + 3];
  }
  return dst;
}
const seasonCache = new Map();
export function seasonCanvas(c, si, mode = 'leaf') {
  if (!si || c.noSeason) return c;
  if (c.evergreen && si < 3) return c; // pines keep their needles until the snow comes
  let m = seasonCache.get(c);
  if (!m) { m = {}; seasonCache.set(c, m); }
  const k = si + mode;
  if (!m[k]) {
    const o = makeCanvas(c.width, c.height);
    const g = ctx2d(o);
    const src = ctx2d(c).getImageData(0, 0, c.width, c.height);
    g.putImageData(seasonImageData(src, g.createImageData(c.width, c.height), si, mode), 0, 0);
    m[k] = o;
  }
  return m[k];
}
