// Encounter characters: the bridge troll, the stump spirit, the frog choir (and Gerald), the
// raccoon gambler, the honey bear, the weathervane duck, the cloud whale, the goose, the snail…
// Same conventions as sprites.js: palette-indexed strings, auto-outlined at build time.
import { mirror, spriteCanvas, makeCanvas, ctx2d } from './pixel.js';

const cache = new Map();
const cached = (k, fn) => { if (!cache.has(k)) cache.set(k, fn()); return cache.get(k); };

function grid(rows) { return rows.map((r) => r.split('')); }
function stamp(g, rows, ox, oy) {
  rows.forEach((r, y) => {
    for (let x = 0; x < r.length; x++) {
      const ch = r[x];
      if (ch === '.' || ch === ' ') continue;
      const yy = oy + y, xx = ox + x;
      if (yy >= 0 && yy < g.length && xx >= 0 && xx < g[0].length) g[yy][xx] = ch === '_' ? '.' : ch;
    }
  });
}
const rowsOf = (g) => g.map((r) => r.join(''));
const pad = (rows, w) => rows.map((r) => r.padEnd(w, '.'));

// ---------------------------------------------------------------------------------------------
// Grumbold, the bridge troll. Seasons give him a kazoo, a lute, then a bow tie and top hat.
// ---------------------------------------------------------------------------------------------
const TROLL_PAL = {
  k: '#8cc8a0', K: '#5a9a84', d: '#3e6e6a', n: '#f0a090', N: '#c87870', e: '#2a1d2e', w: '#fffdf6',
  m: '#6ac25a', M: '#3e8a44', v: '#b0703a', V: '#7a4626', b: '#f5d24b', r: '#ff3b52', R: '#b8204a',
  y: '#f5d24b', Y: '#c48a2c', t: '#c89a64', T: '#8e5a34', h: '#3a2a48', H: '#5a4470',
};
const TROLL_L = [
  '.........mmm',
  '.......mmMmm',
  '......mMmmMm',
  '.....mkkkkkk',
  '....kkkkkkkk',
  '...kkkkkkkkk',
  '..kMMMMkkkkk',
  '..kkwwekkkkk',
  'kk.kweekkkkn',
  'kKkkkkkkkknn',
  '.kkkkkkkknnn',
  '..kkkkkkknnN',
  '..kkkkkkkkkk',
  '..kkkkdeeeee',
  '..kkkwkkkkkk',
  '...kkkkkkkkk',
  '....Kkkkkkkk',
  '.....KKKkkkk',
  '....vvvvvvkk',
  '...vvvvvvvkk',
  '..kvvvvvvvkk',
  '.kkvvvvvvbkk',
  'kkkvvvvvvvkk',
  'kk.vvvvvvbkk',
  'k..VVVVVVVkk',
  '...ddddd.ddd',
  '...ddddd....',
  '..eeeeee....',
];
export function trollCanvas(look = 'plain') {
  return cached('troll:' + look, () => {
    const g = grid(mirror(TROLL_L));
    if (look === 'kazoo') stamp(g, ['.....y', 'rrrrrrrr', 'rrrrrrRR', '.RRRRRR'], 12, 12);
    if (look === 'lute') stamp(g, ['..........TT', '.........TtT', '.tttt...TT..', 'ttTTtt.TT...', 'tTeeTtTT....', 'ttTTttT.....', '.tttt.......'], 4, 17);
    if (look === 'concert') {
      stamp(g, ['....hhhhhhhh....', '....hHhhhhhh....', '....hhhhhhhh....', '....rrrrrrrr....', '..hhhhhhhhhhhh..'], 4, -2);
      stamp(g, ['rr.rr', 'rRrRr', 'rr.rr'], 10, 17);
    }
    return spriteCanvas(rowsOf(g), TROLL_PAL);
  });
}

// ---------------------------------------------------------------------------------------------
// The Stump Spirit: knows exactly one note (two, by winter). Frames: 0 idle, 1 singing.
// ---------------------------------------------------------------------------------------------
const STUMP_PAL = { b: '#9a6a48', B: '#6a4436', t: '#e8c890', T: '#c89a64', e: '#2a1d2e', a: '#7af0ff', A: '#30b8d8', g: '#4fae48', l: '#a8e070', o: '#4a2e44', m: '#6ac25a' };
const STUMP_L = [
  '.........l',
  '........lg',
  '.........g',
  '....bbbbbb',
  '...btttTtt',
  '..bttTttTt',
  '..bbtttttt',
  '..Bbbbbbbb',
  '..Bbbbbbbb',
  '..BbbaAbbb',
  '..BbbAAbbb',
  '..Bbbbbbbb',
  '..BbbbbbBb',
  '..Bbbbbmbb',
  '.BBbbbbbbb',
  'BBbBbbbbBb',
  'B..BB.bBBb',
];
export function stumpCanvas(frame = 0) {
  return cached('stump:' + frame, () => {
    const g = grid(mirror(STUMP_L));
    if (frame === 1) stamp(g, ['ooo', 'ooo'], 9, 12);
    else stamp(g, ['.o.'], 9, 12);
    return spriteCanvas(rowsOf(g), STUMP_PAL);
  });
}

// ---------------------------------------------------------------------------------------------
// Choir frogs and Gerald (always flat; wears a very small bow tie). Frames: 0 shut, 1 singing.
// ---------------------------------------------------------------------------------------------
const FROG_PAL = { g: '#6ac25a', G: '#3e8a44', l: '#b8ec72', w: '#fffdf6', e: '#2a1d2e', p: '#ff8aa0', r: '#ff3b52', R: '#b8204a', y: '#f5d24b' };
const FROG_SHUT = ['..ww....ww..', '.wewg..gwew.', '.gggggggggg.', 'gggggggggggg', 'glllllllllgg', 'GgGGGGGGGgGG', '.Gg.gggg.gG.', 'GG.......GG.'];
const FROG_SING = ['..ww....ww..', '.wewg..gwew.', '.gggggggggg.', 'ggggeeeegggg', 'gllepppelllg', 'GgGeeeeeGgGG', '.Gg.gggg.gG.', 'GG.......GG.'];
export function frogCanvas(frame = 0, gerald = false, tint = 0) {
  return cached(`frog:${frame}:${gerald}:${tint}`, () => {
    const g = grid(frame ? FROG_SING : FROG_SHUT);
    if (gerald) stamp(g, ['rr.rr', 'rRyRr'], 3, 6);
    const pal = { ...FROG_PAL };
    if (tint === 1) Object.assign(pal, { g: '#5ab88a', G: '#2e7a64', l: '#a8e8c0' });
    if (tint === 2) Object.assign(pal, { g: '#8ac04a', G: '#5a8a2e', l: '#d8f08a' });
    if (gerald) Object.assign(pal, { g: '#7ab86a', G: '#4a7a46', l: '#c8e8a0' });
    return spriteCanvas(rowsOf(g), pal);
  });
}

// ---------------------------------------------------------------------------------------------
// Rocco the raccoon gambler, in a tiny green visor. Frames: 0 smug, 1 caught.
// ---------------------------------------------------------------------------------------------
const RACCOON_PAL = { s: '#a8a0b8', S: '#787090', d: '#4a4460', w: '#fffdf6', e: '#2a1d2e', g: '#3ec27a', G: '#1e8a5a', n: '#2a1d2e', p: '#ff8aa0', y: '#f5d24b' };
const RACCOON_L = [
  '.dd.....',
  '.dSd....',
  '.dSSssss',
  '..gggggg',
  '.GGGGGGG',
  '..ssssss',
  '.sdddddd',
  '.sddwedd',
  '.ssddddd',
  '..ssswww',
  '...ssswn',
  '....ssss',
  '...sssss',
  '..ssswww',
  '.ssssww.',
  '.sssssss',
  '..sS..sS',
];
export function raccoonCanvas(frame = 0) {
  return cached('raccoon:' + frame, () => {
    const g = grid(mirror(RACCOON_L));
    // striped tail curling out to the right
    const out = g.map((r) => [...r, '.', '.', '.', '.', '.']);
    stamp(out, ['..dd', '.dsSd', 'dSdS', 'SdS.', 'dS..'], 15, 10);
    if (frame === 1) stamp(out, ['...', '.e.', '...'], 6, 7), stamp(out, ['...', '.e.', '...'], 9, 7), stamp(out, ['ww', 'ww'], 3, 11);
    if (frame === 0) stamp(out, ['eee'], 6, 7);
    return spriteCanvas(rowsOf(out), RACCOON_PAL);
  });
}

// ---------------------------------------------------------------------------------------------
// The honey bear (he is awake. he has been awake the whole time). Frames: 0 asleep, 1 peeking, 2 eyes open.
// ---------------------------------------------------------------------------------------------
const BEAR_PAL = { b: '#b0703a', B: '#7a4626', d: '#4e2e2a', t: '#e8b880', e: '#2a1d2e', w: '#fffdf6', p: '#ff8aa0', z: '#c8d8ff' };
const BEAR_L = [
  '...bbb..........',
  '..bdbbb.........',
  '..bdbbbbbbbb....',
  '...bbbbbbbbbbb..',
  '....bbbbbbbbbbbb',
  '...bbbbbbbbbbbbb',
  '..bbbbbbbbbbbbbb',
  '..bbbbbbbbbbbbbb',
  '..bbbbbbbbbbbttt',
  '..bbbbbbbbbbtttt',
  '..pbbbbbbbbttttd',
  '..bbbbbbbbbbtttt',
  '...bbbbbbbbbbttt',
  '....bbbbbbbbbbbb',
  '...BBbbbbbbbbbbb',
  '..BBbbbbbbbbtttt',
  '.BBbbbbbbbbttttt',
  'BBbbbbbbbbtttttt',
  'Bbbbbbbbbbtttttt',
  'Bbbbbbbbbbbttttt',
  'BBbbbbbbbbbbtttt',
  '.BBbbbbbbbbbbbbb',
  '..BBBttt..BBBBtt',
  '..tttttt...ttttt',
];
export function bearCanvas(frame = 0) {
  return cached('bear:' + frame, () => {
    const g = grid(mirror(BEAR_L));
    if (frame === 0) { stamp(g, ['ddd'], 9, 8); stamp(g, ['ddd'], 20, 8); }
    if (frame === 1) { stamp(g, ['ddd'], 9, 8); stamp(g, ['.w.', 'wew'], 20, 7); }
    if (frame === 2) { stamp(g, ['.w.', 'wew'], 9, 7); stamp(g, ['.w.', 'wew'], 20, 7); }
    return spriteCanvas(rowsOf(g), BEAR_PAL);
  });
}

// ---------------------------------------------------------------------------------------------
// Small side-view critters
// ---------------------------------------------------------------------------------------------
const DUCK_PAL = { w: '#fffdf6', W: '#d8d0e4', y: '#f5d24b', o: '#ff9a3a', O: '#c86a22', e: '#2a1d2e', g: '#3ec27a', b: '#5a8fd0' };
export function duckCanvas() {
  return cached('duck', () => spriteCanvas(['...ggg....', '..ggegoo..', '..gggoOo..', '...ww.....', 'w.wwww....', 'wwwbwwww..', 'WwwwwwwW..', '.WWWWWW...', '...o.o....'], DUCK_PAL));
}

const GOOSE_PAL = { w: '#fffdf6', W: '#cfc8dc', o: '#ff9a3a', O: '#c86a22', e: '#2a1d2e', r: '#ff3b52', y: '#f5d24b', Y: '#c48a2c' };
// frame 0 walk, 1 honk, 2 with medal
export function gooseCanvas(frame = 0) {
  return cached('goose:' + frame, () => {
    const rows = frame === 1
      ? ['....ww......', '...weoOo....', '...wwoo.....', '...ww.......', '...ww.......', '..www.......', 'w.wwwww.....', 'wwwWwwwww...', 'WwwwwwwwW...', '.WWWWWWW....', '...o..o.....', '..oo.oo.....']
      : ['...ww.......', '..wewoo.....', '..wwwoO.....', '...ww.......', '...ww.......', '..www.......', 'w.wwwww.....', 'wwwWwwwww...', 'WwwwwwwwW...', '.WWWWWWW....', '...o..o.....', '..oo.oo.....'];
    const g = grid(rows);
    if (frame === 2) stamp(g, ['r', 'r', 'yY', 'YY'], 3, 5);
    return spriteCanvas(rowsOf(g), GOOSE_PAL);
  });
}

const SNAIL_PAL = { s: '#ff9ac0', S: '#c8608a', w: '#ffe6f0', k: '#e8d4b0', K: '#b8a080', e: '#2a1d2e', b: '#8a5a33', B: '#5e3a20', n: '#fff6e4', r: '#ff3b52' };
export function snailCanvas() {
  return cached('snail', () => spriteCanvas(['.......e.e..', '.......k.k..', '..ss...kkk..', '.swwS..kek..', 'swssSs.kkk..', 'sSwwSsbbkk..', 'sSSSsbnrbkk.', '.ssssbBBbkkk', 'kkkkkkkkkkkK', '.KKKKKKKKKK.'], SNAIL_PAL));
}

const CROW_PAL = { k: '#3a3450', K: '#24203a', y: '#f5d24b', e: '#fffdf6', w: '#fffdf6', b: '#4a6ad0', o: '#ff9a3a' };
export function crowCanvas(magpie = false) {
  return cached('crow:' + magpie, () => {
    const g = grid(['...kkk.....', '..kkekoo...', '..kkkk.....', '.kkkkkk....', 'kkkKkkkk...', 'kKkkkkkkk..', 'KkkkkkkKK..', '.KKKKKK....', '...y.y.....']);
    if (magpie) stamp(g, ['...', '...', '...', '.w.', 'wwb', 'wbw', '.bw'], 2, 1);
    return spriteCanvas(rowsOf(g), CROW_PAL);
  });
}

const FLAME_PAL = { y: '#ffe48a', Y: '#ffb45c', o: '#ff8a3a', w: '#fffdf6', e: '#2a1d2e', p: '#ff8aa0' };
export function flameCanvas(frame = 0) {
  return cached('flame:' + frame, () => {
    const L = frame ? ['....o', '...oy', '..oyy', '.oyyw', '.oyww', 'oyywe', 'oyyww', 'oyyyp', '.oyyy', '.ooyy', '..ooo'] : ['....o', '....o', '...oy', '..oyy', '.oyww', 'oyywe', 'oyyww', 'oyyyp', '.oyyy', '.ooyy', '..ooo'];
    return spriteCanvas(mirror(L), FLAME_PAL);
  });
}

const MOOSE_PAL = { b: '#9a6044', B: '#6a3c30', d: '#4a2a2a', t: '#e8c8a0', T: '#c89a74', e: '#2a1d2e', w: '#fffdf6', n: '#3a2430' };
const MOOSE_L = [
  'TT.T........',
  'TtTT..T.....',
  '.TtTTTt.....',
  '..TTtTT.....',
  '....TTtT....',
  '......Tbbbbb',
  '.....bbbbbbb',
  '....bbwebbbb',
  '....bbbbbbbb',
  '.....bbbbbbb',
  '.....bbbbbbb',
  '......bbbbbb',
  '......bbbnnb',
  '......bbbbbb',
  '.......dbbbb',
  '.......ddddd',
];
export function mooseCanvas() {
  return cached('moose', () => spriteCanvas(mirror(MOOSE_L), MOOSE_PAL));
}

const GOAT_PAL = { w: '#fffdf6', W: '#d8d0c4', e: '#2a1d2e', h: '#c89a64', H: '#8e5a34', p: '#ff8aa0', b: '#8a5a33' };
export function goatCanvas() {
  return cached('goat', () => spriteCanvas(['h.h.........', 'HhHh........', '.wwww.......', 'wewwwp......', 'wwwwwwwwwww.', '.Wwwwwwwwwww', '..wwwwwwwwW.', '..WWWWWWWWW.', '..w.w...w.w.', '..b.b...b.b.'], GOAT_PAL));
}

// ---------------------------------------------------------------------------------------------
// The cloud whale: a once-a-season sight. Frames 0/1 flick the tail.
// ---------------------------------------------------------------------------------------------
const WHALE_PAL = { w: '#fffdf6', W: '#dcd6f4', q: '#b8b0e8', Q: '#8a84c8', e: '#2a1d2e', p: '#ffc4dc', b: '#cfe8ff' };
export function whaleCanvas(frame = 0) {
  return cached('whale:' + frame, () => {
    const tail = frame ? ['ww.', 'wWw', '.WW', '..W'] : ['..W', '.WW', 'wWw', 'ww.'];
    const body = [
      '..........wwwwwwwwwww.......',
      '.......wwwwwwwwwwwwwwwww....',
      '.....wwwwwwwwwwwwwwwwwwwww..',
      '...wwwwwwwwwwwwwwwwwwwwwwwww',
      '..wwewwwwwwwwwwwwwwwwwwwwwwW',
      '.wwwwwwwwwwwwwwwwwwwwwwwwwWW',
      'wwpwwwwwwwwwwwwwwwwwwwwwwWWq',
      'WWWWWWWWWWWWWWWWWWWWWWWWWWqq',
      '.qWqWqWqWqWqWqWqWqWqWqWqqqq.',
      '..qqqqqqqqqqqqqqqqqqqqqqqQ..',
      '....QQqqqqqqqqqqqqqqqqQQ....',
      '.......QQQQQQQQQQQQQQ.......',
    ];
    const g = grid(['', '', '', ...body].map((r) => r.padEnd(28, '.') + '....'));
    stamp(g, tail, 28, frame ? 4 : 6);
    stamp(g, ['.ww', 'wWw', 'WW.'], 12, 12);
    stamp(g, frame ? ['.b.b', 'b.b.', '.bb.'] : ['b..b', '.bb.', '.bb.'], 9, 0);
    stamp(g, ['.e..e', '..ee.'], 3, 9);
    return spriteCanvas(rowsOf(g), WHALE_PAL);
  });
}

// ---------------------------------------------------------------------------------------------
// Minigame props
// ---------------------------------------------------------------------------------------------
const PROP_PAL = { b: '#b0703a', B: '#7a4626', t: '#e8c890', T: '#c89a64', s: '#cfd4e8', S: '#8e94b8', w: '#fffdf6', a: '#9ce4ff', A: '#5aa8d8', e: '#2a1d2e', y: '#f5d24b', Y: '#c48a2c', u: '#5a8fd0', U: '#35629e', o: '#ff9a3a', r: '#ff3b52', g: '#6ac25a' };
export function cupCanvas() { return cached('cup', () => spriteCanvas(['..rrrrrr..', '.rrwrrrrr.', '.rwrrrrrr.', '.rrrrrrrr.', 'rrrrrrrrrr', 'rRRRRRRRRr', 'RRRRRRRRRR'], { ...PROP_PAL, R: '#b8204a' })); }
export function hailCanvas() { return cached('hail', () => spriteCanvas(['.ww.', 'wwaw', 'waaA', '.AA.'], PROP_PAL)); }
export function fishSlideCanvas(color = 0) {
  const cols = [['#ff9a3a', '#c86a22'], ['#5ac8e8', '#2e8ab0'], ['#ff8ac0', '#c85a8a']][color % 3];
  return cached('slidefish:' + color, () => spriteCanvas(['...oo...', '.oooooO.', 'ooewooOo', 'ooooooOo', '.oOOOOO.', '..O..O..'].map((r) => r), { ...PROP_PAL, o: cols[0], O: cols[1] }));
}
export function hiveCanvas() { return cached('hive', () => spriteCanvas(['...bb...', '..yyyy..', '.yYYYYy.', 'yyyyyyyy', 'YYYYYYYY', 'yyyeyyyy', 'YYYYYYYY', '.yyyyyy.', '..YYYY..'], PROP_PAL)); }
export function vaneCanvas() { return cached('vane', () => spriteCanvas(['....y....', '...yYy...', '....Y....', 'yYYYYYYYy', '....Y....', '....Y....', '....Y....', '....Y....', '...YYY...'], PROP_PAL)); }
export function noteCanvas(kind = 0) {
  const pal = { ...PROP_PAL, n: ['#ffe48a', '#9ce4ff', '#ff9ac0', '#b8ec72'][kind % 4], N: ['#c48a2c', '#5aa8d8', '#c85a8a', '#5a8a2e'][kind % 4] };
  return cached('note:' + kind, () => spriteCanvas(['...nN', '...nN', '...nN', '.nnnN', 'nnnnN', 'nnnN.', '.NN..'], pal));
}
export function wobbleNoteCanvas() {
  return cached('note:wobble', () => spriteCanvas(['..g.g', '.g.g.', '...nN', '.nnnN', 'nnnnN', 'nnnN.', '.NN..'], { ...PROP_PAL, n: '#b8d870', N: '#6a8a3a' }));
}
export function basketCanvas() {
  return cached('basket', () => spriteCanvas(['.T......T.', 'T........T', 'tttttttttt', 'tTtTtTtTtT', 'TtTtTtTtTt', '.TTTTTTTT.'], PROP_PAL));
}

// Utility: scale a canvas by an integer factor (nearest neighbour)
export function scaled(c, k) {
  const o = makeCanvas(c.width * k, c.height * k);
  const g = ctx2d(o);
  g.imageSmoothingEnabled = false;
  g.drawImage(c, 0, 0, o.width, o.height);
  return o;
}
