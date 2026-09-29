// The island of Maravik: terrain layout, paths, buildings, nature and landmarks.
// Pure data (no three.js) so it can be inspected/debugged outside the browser.
import { fbm, rng, hash2, clamp } from '../core/util.js';

export const W = 100;
export const H = 84;
export const LEVEL = 0.6; // world units per terrace level
export const WATER_Y = -0.28;
export const SEABED_Y = -1.1;

export const T = {
  WATER: 0, SAND: 1, WETSAND: 2, GRASS: 3, FLOWERS: 4, MEADOW: 5, FOREST: 6, COBBLE: 7, PLAZA: 8,
  DIRT: 9, PLANKS: 10, FARMLAND: 11, ROCK: 12, GARDEN: 13,
};
export const TYPE_INFO = [
  { name: 'water', top: 'seabed', side: 'sandside' },
  { name: 'sand', top: 'sand', side: 'sandside' },
  { name: 'wetsand', top: 'wetsand', side: 'sandside' },
  { name: 'grass', top: 'grass', side: 'cliffgrass' },
  { name: 'flowers', top: 'flowers', side: 'cliffgrass' },
  { name: 'meadow', top: 'meadow', side: 'cliffgrass' },
  { name: 'forest', top: 'forest', side: 'cliffgrass' },
  { name: 'cobble', top: 'cobble', side: 'stonewall' },
  { name: 'plaza', top: 'plaza', side: 'stonewall' },
  { name: 'dirt', top: 'dirt', side: 'cliffrock' },
  { name: 'planks', top: 'planks', side: 'dockside' },
  { name: 'farmland', top: 'farmland', side: 'cliffgrass' },
  { name: 'rock', top: 'rocktop', side: 'cliffrock' },
  { name: 'garden', top: 'garden', side: 'stonewall' },
];

const HOUSE_COLORS = [
  ['cream', '#fff0c8'], ['butter-yellow', '#ffe07a'], ['mint', '#b8f0d0'], ['sky-blue', '#b0dcff'],
  ['rose-pink', '#ffc4cc'], ['apricot', '#ffcf9e'], ['lavender', '#e4ccff'], ['lime', '#d8f4a0'],
];

const ell = (x, z, cx, cz, rx, rz) => ((x - cx) / rx) ** 2 + ((z - cz) / rz) ** 2;
const inRect = (x, z, x0, z0, x1, z1) => x >= x0 && x <= x1 && z >= z0 && z <= z1;
// rounded rectangle test
function inRound(x, z, x0, z0, x1, z1, r) {
  if (!inRect(x, z, x0, z0, x1, z1)) return false;
  const cx = clamp(x, x0 + r, x1 - r), cz = clamp(z, z0 + r, z1 - r);
  return (x - cx) ** 2 + (z - cz) ** 2 <= r * r + 0.5;
}

export function buildIsland() {
  const N = W * H;
  const type = new Uint8Array(N);
  const height = new Float32Array(N).fill(-1);
  const blocked = new Uint8Array(N); // 1 = solid obstacle
  const zone = new Array(N).fill('');
  const idx = (x, z) => z * W + x;
  const inb = (x, z) => x >= 0 && z >= 0 && x < W && z < H;

  // ------------------------------------------------------------------ land mask
  const land = new Uint8Array(N);
  for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
    const j = 1 + (fbm(x * 0.13, z * 0.13, 7) - 0.5) * 0.42;
    const main = ell(x, z, 50, 37, 41, 28) < j;
    const south = ell(x, z, 51, 56, 28, 13) < j;
    const pen = ell(x, z, 81, 59, 14, 6.5) < j;
    const islet = ell(x, z, 15, 75, 4.2, 3.2) < 1 + (j - 1) * 0.5;
    const cove = ell(x, z, 5, 48, 9.5, 9) < 1;
    const bay = ell(x, z, 52, 76.5, 12.5, 9) < 1;
    const quayCut = inRect(x, z, 38, 64, 66, 84);
    let l = (main || south || pen || islet) && !cove && !bay && !(quayCut && !pen && !islet);
    if (x < 2 || z < 2 || x > W - 3 || z > H - 3) l = false;
    land[idx(x, z)] = l ? 1 : 0;
  }
  // coast distance (BFS from water)
  const coast = new Int16Array(N).fill(999);
  const q = [];
  for (let i = 0; i < N; i++) if (!land[i]) { coast[i] = 0; q.push(i); }
  for (let qi = 0; qi < q.length; qi++) {
    const i = q[qi], x = i % W, z = (i / W) | 0;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, nz = z + dz;
      if (!inb(nx, nz)) continue;
      const j = idx(nx, nz);
      if (coast[j] > coast[i] + 1) { coast[j] = coast[i] + 1; q.push(j); }
    }
  }

  // ------------------------------------------------------------------ base terrain
  for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
    const i = idx(x, z);
    if (!land[i]) { type[i] = T.WATER; height[i] = -1; continue; }
    const n = fbm(x * 0.2, z * 0.2, 3);
    let h = 1, t = n > 0.62 ? T.FLOWERS : T.GRASS;
    const harbor = inRect(x, z, 36, 58, 68, 66);
    const northCliff = z < 20;
    const lighthouseCliff = x > 86 && z > 54;
    if (coast[i] <= 2 && !harbor && !northCliff && !lighthouseCliff) {
      h = 0; t = coast[i] <= 1 ? T.WETSAND : T.SAND;
      if (coast[i] === 2) t = T.SAND;
    } else if (coast[i] === 3 && !harbor && !northCliff && n < 0.45) {
      h = 0; t = T.SAND;
    }
    // north ridge
    const ridgeLine = 13 + (fbm(x * 0.09, 3, 11) - 0.5) * 8;
    if (z < ridgeLine) { h = 4; t = n > 0.55 ? T.ROCK : T.GRASS; zone[i] = 'ridge'; }
    if (ell(x, z, 50, 8, 16, 5.5) < 1 + (n - 0.5) * 0.4) { h = 5; t = T.ROCK; }
    if (z >= ridgeLine && z < ridgeLine + 3 && h < 4 && x > 20 && x < 80) { h = 3; t = T.GRASS; }
    // forest plateau (north-west)
    const fj = 1 + (fbm(x * 0.15, z * 0.15, 21) - 0.5) * 0.35;
    if (ell(x, z, 24, 28, 18, 13) < fj && h < 2) { h = 2; t = T.FOREST; zone[i] = 'forest'; }
    if (ell(x, z, 19, 22, 9, 6) < fj && h < 3) { h = 3; t = T.FOREST; zone[i] = 'forest'; }
    // meadow plateau (north-east)
    const mj = 1 + (fbm(x * 0.15, z * 0.15, 31) - 0.5) * 0.35;
    if (ell(x, z, 77, 29, 16, 11.5) < mj && h < 2) { h = 2; t = T.MEADOW; zone[i] = 'meadow'; }
    if (ell(x, z, 80, 23, 7, 5) < mj && h < 3) { h = 3; t = T.MEADOW; zone[i] = 'meadow'; }
    // hotel hill
    if (inRound(x, z, 37, 14, 63, 32, 5) && h < 2) { h = 2; t = n > 0.6 ? T.FLOWERS : T.GRASS; zone[i] = 'hill'; }
    if (inRound(x, z, 40, 15, 60, 29, 4) && h < 3) { h = 3; t = T.GRASS; zone[i] = 'hotel'; }
    // lighthouse rock
    if (ell(x, z, 90, 60, 5, 4) < 1 && land[i]) { h = 2; t = n > 0.5 ? T.ROCK : T.GRASS; zone[i] = 'lighthouse'; }
    // west cove beach zone tag
    if (x < 22 && z > 36 && z < 64) zone[i] ||= 'beach';
    if (inRect(x, z, 28, 33, 74, 66)) zone[i] ||= 'town';
    if (ell(x, z, 15, 75, 5, 4) < 1) zone[i] = 'islet';
    type[i] = t; height[i] = h;
  }

  const set = (x, z, t, h) => {
    if (!inb(x, z)) return;
    const i = idx(x, z);
    if (!land[i] && t !== T.PLANKS) return;
    if (t != null) type[i] = t;
    if (h != null) height[i] = h;
  };
  const fill = (x0, z0, x1, z1, t, h) => { for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) set(x, z, t, h); };

  // ------------------------------------------------------------------ town ground
  fill(30, 34, 70, 63, null, 1);
  for (let z = 34; z <= 63; z++) for (let x = 30; x <= 70; x++) {
    const i = idx(x, z);
    if (!land[i]) continue;
    if (type[i] === T.SAND || type[i] === T.WETSAND || type[i] === T.MEADOW || type[i] === T.FOREST) type[i] = T.GRASS;
  }
  // Quay & harbour street
  fill(36, 60, 66, 63, T.COBBLE, 1);
  // Main street & hill street
  fill(28, 47, 72, 48, T.COBBLE, 1);
  fill(34, 35, 66, 36, T.COBBLE, 1);
  // Plaza
  fill(43, 37, 57, 46, T.PLAZA, 1);
  // N-S lanes
  fill(49, 33, 51, 60, T.COBBLE, 1);
  fill(38, 36, 39, 47, T.COBBLE, 1);
  fill(61, 36, 62, 47, T.COBBLE, 1);
  fill(33, 48, 34, 60, T.COBBLE, 1);
  fill(67, 48, 68, 60, T.COBBLE, 1);
  // Piers
  for (const px0 of [44, 58]) for (let z = 64; z <= 73; z++) for (let x = px0; x <= px0 + 1; x++) {
    const i = idx(x, z); type[i] = T.PLANKS; height[i] = 0.5; land[i] = 1;
  }
  for (let z = 71; z <= 73; z++) for (let x = 42; x <= 47; x++) { const i = idx(x, z); type[i] = T.PLANKS; height[i] = 0.5; land[i] = 1; }

  // Hotel top: courtyard + garden
  fill(44, 26, 56, 28, T.PLAZA, 3);
  fill(41, 17, 43, 25, T.GARDEN, 3);
  fill(57, 17, 59, 25, T.GARDEN, 3);
  // stairs from hotel down to town (z 29..34)
  fill(49, 29, 51, 29, T.PLAZA, 3);
  fill(49, 30, 51, 30, T.COBBLE, 2.5);
  fill(49, 31, 51, 31, T.COBBLE, 2);
  fill(49, 32, 51, 32, T.COBBLE, 1.5);
  fill(49, 33, 51, 33, T.COBBLE, 1);

  // ------------------------------------------------------------------ paths with auto steps
  const paths = [];
  function path(pts, width, t) {
    const visited = new Set();
    let prev = null;
    for (let s = 0; s < pts.length - 1; s++) {
      const [ax, az] = pts[s], [bx, bz] = pts[s + 1];
      const len = Math.hypot(bx - ax, bz - az);
      const steps = Math.ceil(len * 4);
      for (let k = 0; k <= steps; k++) {
        const px = ax + ((bx - ax) * k) / steps, pz = az + ((bz - az) * k) / steps;
        const cx = Math.round(px), cz = Math.round(pz);
        if (!inb(cx, cz) || !land[idx(cx, cz)]) continue;
        const key = idx(cx, cz);
        if (visited.has(key)) continue;
        visited.add(key);
        let h = height[key];
        if (prev != null && Math.abs(h - prev) > 0.5) h = prev + Math.sign(h - prev) * 0.5;
        prev = h;
        const r = width / 2;
        for (let dz = -Math.ceil(r); dz <= Math.ceil(r); dz++) for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx++) {
          if (dx * dx + dz * dz > r * r + 0.3) continue;
          const x = cx + dx, z = cz + dz;
          if (!inb(x, z) || !land[idx(x, z)]) continue;
          const j = idx(x, z);
          if (type[j] === T.PLANKS) continue;
          if (type[j] !== T.COBBLE && type[j] !== T.PLAZA) type[j] = t;
          height[j] = h;
        }
      }
    }
    paths.push({ pts, width, t });
  }
  // Town -> west beach
  path([[28, 47.5], [22, 49], [16, 50]], 2, T.DIRT);
  // Town -> forest
  path([[30, 47], [28, 41], [25, 35], [22, 30], [18, 26]], 2, T.DIRT);
  // Town -> meadow & farm
  path([[72, 47.5], [75, 42], [77, 36], [79, 30], [82, 25]], 2, T.DIRT);
  path([[77, 36], [84, 33], [89, 31]], 2, T.DIRT);
  // Town -> lighthouse
  path([[70, 50], [76, 54], [82, 58], [88, 60]], 2, T.DIRT);
  // Hill street -> hotel hill flank (east & west switchbacks)
  path([[36, 35], [36, 30], [40, 27], [44, 27]], 2, T.DIRT);
  path([[64, 35], [64, 30], [60, 27], [56, 27]], 2, T.DIRT);
  // forest trail loop
  path([[18, 26], [12, 30], [10, 36], [14, 40]], 2, T.DIRT);

  // Farm fields
  for (let z = 30; z <= 37; z++) for (let x = 83; x <= 89; x++) {
    const i = idx(x, z);
    if (land[i] && height[i] >= 1) { type[i] = (z % 3 === 2) ? T.DIRT : T.FARMLAND; height[i] = 2; }
  }

  // ------------------------------------------------------------------ objects
  const buildings = [];
  const trees = [];
  const props = [];
  const nodes = []; // forage spots
  const npcs = [];
  const landmarks = {};

  const block = (x0, z0, w, d) => {
    x0 = Math.floor(x0); z0 = Math.floor(z0);
    for (let z = z0; z < z0 + d; z++) for (let x = x0; x < x0 + w; x++) if (inb(x, z)) blocked[idx(x, z)] = 1;
  };
  const groundAt = (x, z) => height[idx(clamp(Math.round(x), 0, W - 1), clamp(Math.round(z), 0, H - 1))];

  function building(b) {
    // x,z = footprint min corner (tiles). Door is on the south face at column doorX.
    b.base = Math.max(...Array.from({ length: b.w }, (_, k) => height[idx(b.x + k, b.z + b.d - 1)]));
    for (let z = b.z; z < b.z + b.d; z++) for (let x = b.x; x < b.x + b.w; x++) {
      const i = idx(x, z);
      height[i] = b.base;
      if (type[i] !== T.PLAZA && type[i] !== T.COBBLE) type[i] = T.GRASS;
    }
    block(b.x, b.z, b.w, b.d);
    b.doorX ??= Math.floor(b.w / 2);
    b.door = { x: b.x + b.doorX + 0.5, z: b.z + b.d + 0.6 };
    buildings.push(b);
    return b;
  }

  building({ id: 'hotel', kind: 'hotel', x: 44, z: 19, w: 12, d: 6, h: 4.4, roof: 0, wall: '#fff2d8', shutter: '#8a5ad0', timber: true, doorX: 6, doorColor: '#e8503a', ivy: true });
  landmarks.hotelDoor = { x: 50.5, z: 25.7 };
  landmarks.launch = { x: 50.5, z: 27.5 };
  building({ id: 'clocktower', kind: 'tower', x: 53, z: 37, w: 3, d: 3, h: 9.5, roof: 3, wall: '#fff0d0', door: false });
  building({ id: 'bakery', kind: 'shop', x: 38, z: 41, w: 6, d: 5, h: 3.6, roof: 0, wall: '#ffe07a', shutter: '#3cb878', doorX: 2, sign: 'bread', name: "Honeycutt's Bakery" });
  building({ id: 'postoffice', kind: 'shop', x: 57, z: 41, w: 6, d: 5, h: 3.6, roof: 4, wall: '#fff0d8', shutter: '#e8503a', doorX: 3, sign: 'letter', name: 'Post Office' });
  building({ id: 'curio', kind: 'shop', x: 38, z: 54, w: 5, d: 5, h: 3.4, roof: 5, wall: '#e4ccff', shutter: '#8a5ad0', doorX: 2, sign: 'shell', name: "Odette's Curios" });
  building({ id: 'workshop', kind: 'shop', x: 62, z: 54, w: 5, d: 5, h: 3.2, roof: 3, wall: '#ffcf9e', shutter: '#2fb0a0', doorX: 2, timber: true, sign: 'gear_bristles', name: "Fen's Flight Works" });
  // Houses — Hill street row (on the slope), main street row, harbour row
  const houseSpots = [
    [31, 41, 4, 4], [65, 41, 4, 4], [69, 40, 3, 4],
    [29, 54, 3, 4], [44, 54, 4, 4], [52, 53, 4, 5], [57, 54, 4, 4],
    [40, 30, 4, 4], [56, 30, 4, 4],
    [24, 52, 4, 4],
  ];
  houseSpots.forEach(([x, z, w, d], k) => {
    const [colorName, wall] = HOUSE_COLORS[(k * 5) % HOUSE_COLORS.length];
    const street = z < 38 ? 'Hill Street' : z < 50 ? 'Main Street' : x < 30 ? 'the west lane' : 'Harbor Row';
    building({ id: 'house' + k, kind: 'house', x, z, w, d, h: 2.8 + ((k * 7) % 4) * 0.5, roof: k % 6, seed: 101 + k * 13, doorX: Math.floor(w / 2) - (k % 2), wall, label: `the ${colorName} house on ${street}` });
  });
  // countryside
  building({ id: 'farmhouse', kind: 'house', x: 84, z: 24, w: 5, d: 4, h: 3, roof: 0, wall: '#fff6e8', shutter: '#e8503a', timber: true, doorX: 2, seed: 777, label: 'the farmhouse in the meadow' });
  building({ id: 'cabin', kind: 'house', x: 13, z: 30, w: 4, d: 3, h: 2.6, roof: 3, wall: '#e8c898', shutter: '#3cb878', timber: true, ivy: true, doorX: 1, seed: 779, label: "Ivy's cabin in the woods", noGuests: true });
  building({ id: 'shack', kind: 'house', x: 37, z: 60, w: 3, d: 3, h: 2.4, roof: 4, wall: '#b0dcff', shutter: '#3a70d8', doorX: 1, seed: 780, label: "the fisher's shack by the quay" });

  // Special structures
  props.push({ kind: 'windmill', x: 80.5, z: 22.5, blocked: [80, 22, 2, 2] });
  block(80, 22, 2, 2);
  props.push({ kind: 'lighthouse', x: 91, z: 60 });
  block(90, 59, 2, 2);
  props.push({ kind: 'fountain', x: 50.5, z: 42 });
  block(49, 41, 3, 2);

  // Market stalls in the plaza
  props.push({ kind: 'stall', x: 45.5, z: 39, color: '#d9393c' });
  props.push({ kind: 'stall', x: 45.5, z: 43.4, color: '#3f8a6a' });
  block(44, 38, 2, 2); block(44, 42, 2, 2);

  // Lamp posts along streets
  const lamps = [
    [36, 46], [42, 46], [58, 46], [64, 46], [70, 46], [30, 46], [43, 37], [57, 40], [43, 45.4], [57, 45.4],
    [36, 59], [42, 59], [48, 59], [54, 59], [60, 59], [66, 59], [48, 33], [52, 33], [45, 25], [55.8, 25],
    [36, 34], [64, 34], [76, 53], [86, 58], [74, 42], [26, 49], [48, 29.5], [52, 29.5],
  ];
  lamps.forEach(([x, z]) => { props.push({ kind: 'lamp', x: x + 0.5, z: z + 0.5 }); block(x, z, 1, 1); });

  // Benches, barrels, crates, flower pots
  for (const [x, z] of [[48, 44.6], [52.5, 44.6], [40, 59], [62, 59]]) props.push({ kind: 'bench', x: x + 0.5, z: z + 0.5 });
  for (const [x, z] of [[43, 62], [44, 62], [57, 62], [60, 63], [61, 62], [65, 61], [37, 63]]) { props.push({ kind: (x + z) % 2 ? 'barrel' : 'crate', x: x + 0.5, z: z + 0.5 }); block(x, z, 1, 1); }
  for (const b of buildings) {
    if (b.kind !== 'house' && b.kind !== 'shop') continue;
    const dx = b.door.x;
    for (const off of [-1.5, 1.5]) {
      const px = dx + off, pz = b.z + b.d + 0.4;
      if (Math.abs(off) < b.w / 2 && hash2(px | 0, pz | 0, 3) < 0.7) props.push({ kind: 'pot', x: px, z: pz, seed: (px * 7 + pz) | 0 });
    }
  }
  // Boats in the bay
  props.push({ kind: 'boat', x: 51, z: 70, color: '#3f6fa8' });
  props.push({ kind: 'boat', x: 54.5, z: 67, color: '#d9393c' });
  props.push({ kind: 'boat', x: 63, z: 71, color: '#f2e3c6' });
  props.push({ kind: 'boat', x: 40, z: 68, color: '#4f8a6a' });
  // Fences around the farm & hotel garden
  for (let x = 83; x <= 89; x++) props.push({ kind: 'fence', x: x + 0.5, z: 29.3, dir: 'x' });
  for (let x = 83; x <= 89; x++) props.push({ kind: 'fence', x: x + 0.5, z: 38.3, dir: 'x' });
  // Signposts
  props.push({ kind: 'signpost', x: 29.5, z: 45.6, text: 'Woods' });
  props.push({ kind: 'signpost', x: 73.5, z: 45.6, text: 'Meadow' });
  props.push({ kind: 'signpost', x: 52.8, z: 29.6, text: 'Broom & Board' });
  // The hotel's launch pad (a round stone with a painted star)
  props.push({ kind: 'launchpad', x: 50.5, z: 27.6 });

  // ------------------------------------------------------------------ trees & nature
  const R = rng(4242);
  const canTree = (x, z) => {
    const i = idx(x, z);
    return land[i] && !blocked[i] && type[i] !== T.COBBLE && type[i] !== T.PLAZA && type[i] !== T.DIRT && type[i] !== T.PLANKS &&
      type[i] !== T.FARMLAND && type[i] !== T.WATER && height[i] % 1 === 0;
  };
  const nearBlocked = (x, z, r) => {
    for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
      const X = x + dx, Z = z + dz;
      if (inb(X, Z) && blocked[idx(X, Z)]) return true;
    }
    return false;
  };
  const occupied = new Set();
  function addTree(kind, x, z, opts = {}) {
    const k = idx(x, z);
    if (occupied.has(k)) return false;
    trees.push({ kind, x: x + 0.5 + R.range(-0.2, 0.2), z: z + 0.5 + R.range(-0.2, 0.2), seed: R.int(1, 99999), ...opts });
    occupied.add(k);
    blocked[k] = 1;
    return true;
  }
  // The Whispering Woods: old-growth giants and the great Spirit Tree on its mossy hill.
  const clearing = new Set();
  const clear = (cx, cz, r) => { for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) if (dx * dx + dz * dz <= r * r + 1) clearing.add(idx(cx + dx, cz + dz)); };
  landmarks.spiritTree = { x: 19.5, z: 20.6 };
  if (canTree(19, 20)) {
    trees.push({ kind: 'spirittree', x: 19.5, z: 20.6, seed: 7, giant: true });
    block(18, 20, 3, 1);
    clear(19, 22, 4);
    props.push({ kind: 'stonelantern', x: 17.3, z: 23.4 });
    props.push({ kind: 'stonelantern', x: 21.7, z: 23.4 });
    block(17, 23, 1, 1); block(21, 23, 1, 1);
  }
  for (const [x, z] of [[11, 25], [26, 21], [29, 30], [14, 34], [23, 36], [8, 31], [31, 25], [12, 19]]) {
    if (!canTree(x, z) || !canTree(x + 1, z) || zone[idx(x, z)] !== 'forest') continue;
    trees.push({ kind: 'ancient', x: x + 1, z: z + 0.6, seed: x * 31 + z, giant: true });
    block(x, z, 2, 1);
    clear(x, z, 2);
  }
  for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
    const i = idx(x, z);
    if (!canTree(x, z) || clearing.has(i)) continue;
    const zn = zone[i];
    const nearPath = (() => { for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { const j = idx(clamp(x + dx, 0, W - 1), clamp(z + dz, 0, H - 1)); if (type[j] === T.DIRT || type[j] === T.COBBLE) return true; } return false; })();
    if (nearPath) continue;
    const r = R();
    const dens = fbm(x * 0.12, z * 0.12, 55);
    if (zn === 'forest') {
      if (r < 0.2 + dens * 0.18) addTree(R() < 0.45 ? 'pine' : 'oak', x, z);
    } else if (zn === 'ridge') {
      if (r < 0.1) addTree('pine', x, z);
    } else if (zn === 'meadow') {
      if (r < 0.028) { const k = R(); addTree(k < 0.55 ? 'oak' : k < 0.8 ? 'goldtree' : 'blossom', x, z); }
    } else if (zn === 'hill') {
      if (r < 0.05 && !nearBlocked(x, z, 1)) { const k = R(); addTree(k < 0.4 ? 'blossom' : k < 0.75 ? 'cypress' : 'oak', x, z); }
    } else if (zn === 'town') {
      if (r < 0.04 && !nearBlocked(x, z, 1) && type[i] === T.GRASS) addTree(R() < 0.55 ? 'blossom' : 'cypress', x, z);
    } else if (zn === 'beach') {
      if (r < 0.02 && height[i] >= 1) addTree('oak', x, z);
    } else if (zn === 'islet') {
      if (x === 15 && z === 75) addTree('orange', x, z);
    } else if (height[i] >= 1 && r < 0.04 && !nearBlocked(x, z, 1)) {
      const k = R(); addTree(k < 0.45 ? 'oak' : k < 0.7 ? 'blossom' : 'cypress', x, z);
    }
  }
  // Orchard by the farm
  for (const [x, z] of [[76, 33], [78, 31], [80, 33], [76, 36], [79, 37]]) {
    if (canTree(x, z)) addTree('apple', x, z, { forage: 'apple' });
  }
  // Hotel garden blossom trees
  for (const [x, z] of [[42, 18], [58, 18]]) { const i = idx(x, z); blocked[i] = 0; addTree('blossom', x, z); }

  // Hushlings: eight shy forest spirits hiding around the Whispering Woods
  const spirits = [];
  const RS = rng(8080);
  const spiritSpots = [[20, 24], [15, 22], [12, 27], [26, 23], [28, 32], [15, 35], [9, 32], [22, 38], [31, 27], [11, 21]];
  const okSpirit = (x, z) => { const i = idx(x, z); return inb(x, z) && land[i] && !blocked[i] && zone[i] === 'forest' && height[i] % 1 === 0 && type[i] !== T.DIRT && !spirits.some((p) => Math.abs(p.x - x) + Math.abs(p.z - z) < 4); };
  for (const [sx, sz] of spiritSpots) {
    if (spirits.length >= 8) break;
    let found = null;
    for (let rr = 0; rr <= 3 && !found; rr++) for (let dz = -rr; dz <= rr && !found; dz++) for (let dx = -rr; dx <= rr && !found; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dz)) !== rr) continue;
      if (okSpirit(sx + dx, sz + dz)) found = [sx + dx, sz + dz];
    }
    if (found) spirits.push({ x: found[0] + 0.5 + RS.range(-0.2, 0.2), z: found[1] + 0.5 });
  }

  // Small non-blocking flora: ferns, toadstools and luminous mushrooms in the woods, flowering shrubs elsewhere
  const flora = [];
  const RF = rng(777);
  for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
    const i = idx(x, z);
    if (!land[i] || blocked[i] || type[i] === T.DIRT || type[i] === T.COBBLE || type[i] === T.PLAZA || type[i] === T.PLANKS || height[i] % 1 !== 0) continue;
    const zn = zone[i], k = RF();
    if (zn === 'forest') {
      if (k < 0.1) flora.push({ kind: 'fern', x: x + RF.range(0.2, 0.8), z: z + RF.range(0.2, 0.8) });
      else if (k < 0.14) flora.push({ kind: 'glowshroom', x: x + RF.range(0.2, 0.8), z: z + RF.range(0.2, 0.8), glow: true });
      else if (k < 0.16) flora.push({ kind: 'toadstool', x: x + 0.5, z: z + 0.5 });
    } else if ((zn === 'meadow' || zn === 'hill' || zn === 'hotel') && k < 0.025) {
      flora.push({ kind: 'flowerbush', x: x + 0.5, z: z + 0.5 });
    } else if (zn === 'town' && type[i] === T.GRASS && k < 0.03) {
      flora.push({ kind: 'flowerbush', x: x + 0.5, z: z + 0.5 });
    }
  }
  const trees2 = trees.filter((t) => t.kind === 'oak' && zone[idx(t.x | 0, t.z | 0)] === 'forest');
  trees2.slice(0, 12).forEach((t) => (t.forage = 'acorn'));
  trees.filter((t) => t.kind === 'pine').slice(0, 10).forEach((t) => (t.forage = 'pinecone'));

  // ------------------------------------------------------------------ forage nodes
  const nodeAt = (item, x, z, opts = {}) => {
    const i = idx(x | 0, z | 0);
    if (!land[i] || blocked[i]) return;
    nodes.push({ item, x: (x | 0) + 0.5, z: (z | 0) + 0.5, ...opts });
    blocked[i] = opts.solid ? 1 : 0;
  };
  const scatter = (item, pred, count, seed, opts) => {
    const r = rng(seed);
    let tries = 0, made = 0;
    while (made < count && tries < 4000) {
      tries++;
      const x = r.int(2, W - 3), z = r.int(2, H - 3);
      const i = idx(x, z);
      if (!land[i] || blocked[i] || !pred(i, x, z)) continue;
      if (nodes.some((n) => Math.abs(n.x - x - 0.5) < 2 && Math.abs(n.z - z - 0.5) < 2)) continue;
      nodeAt(item, x, z, opts);
      made++;
    }
  };
  const isType = (...ts) => (i) => ts.includes(type[i]);
  const inZone = (zn) => (i) => zone[i] === zn;
  scatter('berries', (i) => zone[i] === 'forest' && type[i] === T.FOREST, 9, 11, { visual: 'berrybush', solid: true });
  scatter('mushroom', (i) => zone[i] === 'forest' && type[i] === T.FOREST, 10, 12, { visual: 'mushroom' });
  scatter('moss', (i) => zone[i] === 'forest' || zone[i] === 'ridge', 6, 13, { visual: 'mossrock', solid: true });
  scatter('mint', (i) => zone[i] === 'forest' || zone[i] === 'hill', 5, 14, { visual: 'herb' });
  scatter('clover', inZone('meadow'), 7, 15, { visual: 'clover' });
  scatter('flower', (i) => zone[i] === 'meadow' || type[i] === T.FLOWERS, 8, 16, { visual: 'flowerpatch' });
  scatter('seeds', inZone('meadow'), 5, 17, { visual: 'sunflower', solid: true });
  scatter('shell', (i) => type[i] === T.SAND || type[i] === T.WETSAND, 9, 18, { visual: 'shell' });
  scatter('driftwood', isType(T.SAND, T.WETSAND), 7, 19, { visual: 'driftwood' });
  scatter('seaglass', isType(T.WETSAND), 5, 20, { visual: 'glint' });
  scatter('pebble', (i) => type[i] === T.WETSAND || zone[i] === 'ridge', 5, 21, { visual: 'pebbles' });
  scatter('catnip', (i) => type[i] === T.GARDEN, 3, 22, { visual: 'herb2' });
  scatter('carrot', (i) => type[i] === T.FARMLAND, 5, 23, { visual: 'carrot' });
  // fixed spots
  nodeAt('honey', 88, 27, { visual: 'beehive', solid: true });
  nodeAt('honey', 72, 24, { visual: 'beehive', solid: true });
  nodeAt('egg', 81, 27, { visual: 'coop', solid: true });
  nodeAt('wool', 74, 28, { visual: 'sheep', animal: true });
  nodeAt('wool', 70, 31, { visual: 'sheep', animal: true });
  nodeAt('wool', 82, 36, { visual: 'sheep', animal: true });
  nodeAt('feather', 82, 28, { visual: 'feathers' });
  nodeAt('bundle_crate', 64, 63, { visual: 'bundle' });
  nodeAt('bundle_mossy', 10, 28, { visual: 'bundle' });
  nodeAt('bundle_barnacle', 9, 55, { visual: 'bundle' });
  nodeAt('brasskey', 16, 76, { visual: 'glint', once: true });
  nodeAt('bundle_nest', 50, 11, { visual: 'bundle' });
  nodeAt('pearl', 88, 64, { visual: 'glint' });

  // ------------------------------------------------------------------ townsfolk posts
  const byId = Object.fromEntries(buildings.map((b) => [b.id, b]));
  const doorFront = (b, dx = 0, dz = 0.4) => ({ x: b.door.x + dx, z: b.door.z + dz });
  npcs.push({ id: 'honeycutt', look: 'baker', ...doorFront(byId.bakery, 1.2) });
  npcs.push({ id: 'aldo', look: 'postmaster', ...doorFront(byId.postoffice, 1.2) });
  npcs.push({ id: 'odette', look: 'curio', ...doorFront(byId.curio, 1.2) });
  npcs.push({ id: 'fen', look: 'inventor', ...doorFront(byId.workshop, -1.2) });
  npcs.push({ id: 'pim', look: 'grocer', x: 46.6, z: 40.6 });
  npcs.push({ id: 'marlo', look: 'fisher', x: 45.5, z: 66.5 });
  npcs.push({ id: 'greta', look: 'farmer', ...doorFront(byId.farmhouse, 1.2) });
  npcs.push({ id: 'ivy', look: 'painter', ...doorFront(byId.cabin, 1.3) });
  npcs.push({ id: 'mayor', look: 'mayor', x: 52.4, z: 40.6 });
  npcs.push({ id: 'lotta', look: 'kid', x: 53.5, z: 44.5 });

  // Owner houses available for bookings / deliveries
  const homes = buildings.filter((b) => b.kind === 'house' && !b.noGuests).map((b) => ({ id: b.id, door: b.door, wall: b.wall, label: b.label }));
  landmarks.plaza = { x: 50.5, z: 45 };
  landmarks.stall = { x: 45.5, z: 40.5 };

  return {
    W, H, LEVEL, type, height, blocked, land, zone, coast, buildings, trees, props, nodes, npcs, homes, paths, landmarks, flora, spirits,
    idx, inb, groundAt,
  };
}

// Y (world) for a tile height value
export const levelY = (h) => (h < 0 ? SEABED_Y : h * LEVEL);
