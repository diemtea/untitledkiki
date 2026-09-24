// All hand-authored pixel art lives here, as palette-indexed strings.
// Sprites are auto-outlined (selective, darkened-neighbour outlines) at build time.
import { C, mirror, spriteCanvas, flipCanvas, makeCanvas, ctx2d, drawRows, outlineCanvas, strip, recolor, px, rect, disc, shadeHex, tintHex, mixHex } from './pixel.js';
import { rng } from '../core/util.js';

// ---------------------------------------------------------------------------------------------
// Compose helpers
// ---------------------------------------------------------------------------------------------
function grid(w, h) {
  return Array.from({ length: h }, () => Array(w).fill('.'));
}
function stamp(g, rows, ox, oy) {
  rows.forEach((r, y) => {
    for (let x = 0; x < r.length; x++) {
      const ch = r[x];
      if (ch === '.' || ch === ' ') continue;
      const yy = oy + y, xx = ox + x;
      if (yy >= 0 && yy < g.length && xx >= 0 && xx < g[0].length) g[yy][xx] = ch;
    }
  });
}
const rowsOf = (g) => g.map((r) => r.join(''));

// ---------------------------------------------------------------------------------------------
// The young witch
// ---------------------------------------------------------------------------------------------
const WITCH_PAL = {
  h: C.hair, H: C.hairH, s: C.skin, S: C.skinS, c: C.blush, e: C.ink, m: '#c85a62',
  r: C.red, R: C.redD, p: C.redL, d: C.navy, D: C.navyD, l: C.navyL, b: C.boot, B: C.bootD,
  w: '#b27a45', W: '#6e4526', y: '#efcb72', Y: '#b98a3c', t: '#8a5a33',
  k: '#231d2c', K: '#3d3552', g: '#f5d24b', q: '#dca25a', Q: '#a36d31', n: '#e7c089',
};

const BOW = [
  '.rrr....', '.rpprr..', '.rrrrrrR', '..RrrrRr', '...RhhhR',
];
const W_FRONT_TOP = mirror([
  ...BOW,
  '..hhhhhh',
  '.hhhHHhh',
  '.hhHhhhh',
  '.hhshhss',
  '.hssssss',
  '.hssesss',
  '.hssesss',
  '.hscssss',
  '..hSssss',
  '...hdddS',
  '..dddddd',
  '.ddDddld',
  '.ddDdddd',
  '.ddDdddd',
  '.ssDdddd',
  '.Ddddddd',
  '..DDDDDD',
]);
// mouth — a single soft pixel keeps it cute
W_FRONT_TOP[12] = W_FRONT_TOP[12].slice(0, 7) + 'm' + W_FRONT_TOP[12].slice(8);

const W_BACK_TOP = mirror([
  ...BOW,
  '..hhhhhr',
  '.hhhHhrh',
  '.hhHhhrh',
  '.hhhhRhh',
  '.hhhhhhh',
  '.hhHhhhh',
  '.hhhhhhh',
  '.hhhhhhh',
  '..hhhhhh',
  '...hdddd',
  '..dddddd',
  '.ddDdddd',
  '.ddDdddd',
  '.ddDdddd',
  '.ssDdddd',
  '.Ddddddd',
  '..DDDDDD',
]);

const LEGS_FRONT = {
  idle: ['....ss....ss....', '...bbB....Bbb...'],
  a: ['....ss....bb....', '...bbB..........'],
  b: ['....bb....ss....', '..........Bbb...'],
};

const W_SIDE_HEAD = [
  '.....rrr........',
  '....rpprr.rr....',
  '....rrrrrRrpr...',
  '.....RrrRRrrr...',
  '.....hhhRRhhh...',
  '....hhhhhhhhhh..',
  '...hhhHHhhhhhhh.',
  '...hhHhhhhhhhhs.',
  '..hhhhhhhhhhshs.',
  '..hhhhhhhhssssss',
  '..hhhhhhhsssesss',
  '..hhhhhhhsssesss',
  '..hhhhhhhscssss.',
  '...hhhhhhSssssm.',
];
const W_SIDE_BODY = [
  '.....hhhhdSSd...',
  '......ddddddd...',
  '......dddDlddd..',
  '......dddDlddd..',
  '......dddDlddd..',
  '......dddDssdd..',
  '.....Dddddddddd.',
  '.....DDDDDDDDDD.',
];
const LEGS_SIDE = {
  idle: ['........ss......', '.......bbbB.....'],
  a: ['......s...s.....', '.....bbB..bbbB..'],
  b: ['.......ss.......', '.......bbbB.....'],
};
const W_SIDE_ARMS_SWING = {
  a: ['......ddddddd...', '.....ddDdlddd...', '.....ddDdlddd...', '....ssDdllddd...', '......dddddddd..', '.....Dddddddddd.'],
  b: ['......ddddddd...', '......ddddDldd..', '......ddddDldd..', '......ddddDlss..', '......dddddddd..', '.....Dddddddddd.'],
};

// Arms-up "found something!" pose: hands raised beside the head.
function cheerFrame() {
  const g = grid(16, 24);
  stamp(g, W_FRONT_TOP, 0, 0);
  stamp(g, LEGS_FRONT.idle, 0, 22);
  for (let y = 15; y < 20; y++) for (const x of [1, 2, 13, 14]) g[y][x] = '.';
  for (const [x, y, ch] of [[0, 10, 's'], [0, 11, 's'], [0, 12, 'd'], [1, 13, 'd'], [2, 14, 'd'], [15, 10, 's'], [15, 11, 's'], [15, 12, 'd'], [14, 13, 'd'], [13, 14, 'd']]) g[y][x] = ch;
  return rowsOf(g);
}

function witchFrame(top, legs, bodyOverride = null, bodyAt = 14) {
  const g = grid(16, 24);
  stamp(g, top, 0, 0);
  if (bodyOverride) {
    for (let y = bodyAt; y < 22; y++) g[y].fill('.');
    stamp(g, bodyOverride, 0, bodyAt);
  }
  stamp(g, legs, 0, 22);
  return rowsOf(g);
}

function sideFrame(legs, arms = null) {
  const g = grid(16, 24);
  stamp(g, W_SIDE_HEAD, 0, 0);
  stamp(g, W_SIDE_BODY, 0, 14);
  if (arms) {
    for (let y = 15; y < 21; y++) g[y].fill('.');
    stamp(g, arms, 0, 15);
    // keep neck
  }
  stamp(g, legs, 0, 22);
  return rowsOf(g);
}

// Flying pose: side view riding the broom with a wicker basket and Soot on the back.
function flyFrame(phase) {
  const g = grid(34, 28);
  const hx = 11, hy = 1 + (phase === 1 ? 0 : 0);
  // bristles (fanned straw) at the back
  const bristles = phase === 0
    ? ['..yy.....', '.yyYy....', 'yyYyyyRR.', 'YyyYyyRRw', 'yYyyYyRRW', 'YyYyyyRR.', '.yYyy....', '..Yy.....']
    : ['.yy......', 'yyYy.....', 'YyyyyyRR.', 'yYyYyyRRw', 'YyyyYyRRW', 'yYyyyyRR.', '.yyYy....', '...Yy....'];
  stamp(g, bristles, 0, 15);
  // broom handle
  for (let x = 8; x < 34; x++) { g[18][x] = 'w'; g[19][x] = 'W'; }
  g[18][33] = 't'; g[19][33] = 't';
  // skirt draping + fluttering hem
  const skirt = phase === 0
    ? ['.....dddddddd...', '...Ddddddddddd..', '..DDdDdddddDD...', '....DD.DDDD.....']
    : ['.....dddddddd...', '....Dddddddddd..', '..DDDddddddDD...', '.DD..DDDDD......'];
  stamp(g, skirt, hx + 0, 17);
  // head + torso leaning forward
  const head = W_SIDE_HEAD.map((r, i) => (phase === 1 && i < 4 ? '.' + r.slice(0, 15) : r));
  stamp(g, head, hx, hy);
  stamp(g, ['.....hhhhdSSd...', '......dddddddd..', '......ddddddddd.', '......dddddDlddss', '.......ddddDdd.ss'], hx, hy + 13);
  // legs dangling
  stamp(g, ['ss', 'ss', 'bbB'], hx + 10, 21);
  stamp(g, ['.ss', 'bbB'], hx + 7, 22);
  // basket hanging off the front
  stamp(g, ['..QQQ..', '.Q...Q.', 'qqqqqqq', 'qQqQqQq', 'QqQqQqQ', '.qqqqq.'], 27, 16);
  // Soot riding on the back of the broom
  const soot = ['k...k', 'kk.kk', 'kkkkk', 'kgkgk', 'kkkkk', '.kkkkk', 'kkkkkk'];
  stamp(g, soot, 7, 11);
  return rowsOf(g);
}

// ---------------------------------------------------------------------------------------------
// Soot, the black cat companion
// ---------------------------------------------------------------------------------------------
const CAT_PAL = { k: '#231d2c', K: '#3d3552', y: '#f5d24b', n: '#f09aa9', r: C.red, R: C.redD };
const SOOT_WALK_A = [
  '..........k...k.',
  '..........kk.kk.',
  '.kk......kkkkkkk',
  'k..k.....kykkkyk',
  'k........kkknkkk',
  'k.........kkkkk.',
  '.k....kkkkkrrr..',
  '..k.kkkkkkkkkk..',
  '...kkkkkkkkkKk..',
  '...kkKkkkkkkkk..',
  '...kk.k...kk.k..',
  '...k..k...k..k..',
];
const SOOT_WALK_B = SOOT_WALK_A.slice(0, 10).concat(['....kk....k.kk..', '....k.k..k...k..']);
const SOOT_SIT = [
  '..k......k..',
  '..kk....kk..',
  '..kkkkkkkk..',
  '.kkykkkkykk.',
  '.kkkkknkkkk.',
  '..kkkkkkkk..',
  '...krrrrk...',
  '..kkkkkkkk..',
  '.kkkkkkkkkk.',
  '.kkkKkkKkkkk',
  '.kkkkkkkkkkk',
  '.kkkkkkkkkk.',
  '..kk.kk.kk..',
];
const SOOT_SLEEP = [
  '................',
  '.......k...k....',
  '.......kk.kk....',
  '..kkkkkkkkkkkk..',
  '.kkkkkkkkkkkkkk.',
  'kkkkkkkkkkkkkkkk',
  'kKkkkkkkkkkkkKkk',
  '.kkkkkkkkkkkkkk.',
];

// ---------------------------------------------------------------------------------------------
// Guests (pets). Side-on bodies with front-facing heads read best at this size.
// ---------------------------------------------------------------------------------------------
const PETS = {
  dog: {
    pal: { o: '#e59a4a', O: '#b8692c', w: '#fff5e6', W: '#e3d0b8', e: C.ink, n: C.ink, t: '#f07a8a' },
    rows: [
      '.........O....O.',
      '........OoO..OoO',
      '........oooooooo',
      '........oewwwweo',
      '........oowwwwoo',
      '.o.......wwnnww.',
      '.oOoooooooowtww.',
      '.ooooooooooooo..',
      '.oooooOoooooow..',
      '..wwwwwwwwwwww..',
      '..ww.ww...ww.ww.',
    ],
  },
  cat: {
    pal: { o: '#f0b267', O: '#c7803d', w: '#fff5e6', e: '#3b6e3a', n: '#e88a9a' },
    rows: [
      '..........o...o.',
      '..........oo.oo.',
      '..o......ooooooo',
      '.o.o.....oeoooeo',
      '.o.......ooonooo',
      '..o.......owwwo.',
      '..o...oooooooo..',
      '...o.oOoOoOooo..',
      '....ooooooooooo.',
      '....oOoOoooooow.',
      '....o.o....o.o..',
    ],
  },
  bunny: {
    pal: { w: '#f7f1ea', W: '#d6ccc4', p: '#f4a8b8', e: C.ink, n: '#e0788c' },
    rows: [
      '..........ww.ww.',
      '..........wp.wp.',
      '..........wp.wp.',
      '..........wp.wp.',
      '.........wwwwwww',
      '.........wewwwew',
      '.........wwwnwww',
      '...ww.wwwwwwwww.',
      '..wwwwwwwwwwwww.',
      '..Wwwwwwwwwwwww.',
      '...WWwwwwwwWWw..',
      '....WW....WW....',
    ],
  },
  hedgehog: {
    pal: { s: '#7a5337', S: '#553824', t: '#c9a07a', f: '#f3dcc0', e: C.ink, n: C.ink },
    rows: [
      '....t.t.t.......',
      '...tsSsSsst.....',
      '..tsSsSsSsSst...',
      '.tsSsSsSsSsSff..',
      '.sSsSsSsSsSfeffn',
      'tsSsSsSsSsSffff.',
      '.SsSsSsSsSsSff..',
      '..fffffffffff...',
      '...ff.ff..ff.f..',
    ],
  },
  parrot: {
    pal: { g: '#48b25a', G: '#2f8043', y: '#f5d24b', r: '#e04a3f', b: '#3d7fd0', e: C.ink, k: '#3a3140', w: '#fff5e6' },
    rows: [
      '.....ggg....',
      '....gggggr..',
      '....gwegkk..',
      '....ggggkk..',
      '...ggyggk...',
      '...gGygg....',
      '..gGGggg....',
      '..gGGggg....',
      '..gGrggg....',
      '..GGrrgg....',
      '...Grrb.....',
      '...bbrb.....',
      '...bb.b.....',
      '...b..kk....',
      '..b...k.k...',
    ],
  },
  turtle: {
    pal: { g: '#6fae4b', G: '#4a7d33', s: '#a3743f', S: '#71502b', y: '#d9c56b', e: C.ink },
    rows: [
      '......SSSSS.....',
      '....SsysysyS....',
      '...SsysSsysyS.gg',
      '..SsSysysSysSgeg',
      '..SysysSysysSggg',
      '.GSSSSSSSSSSSgg.',
      '..gg.gg...gg.gg.',
    ],
  },
  frog: {
    pal: { g: '#74c05a', G: '#4b8c3b', y: '#e9f0a0', e: C.ink, w: '#fffbe8', p: '#f09aa9' },
    rows: [
      '...ww....ww.....',
      '..wwew..wwew....',
      '..gwwg..gwwg....',
      '.gggggggggggg...',
      '.gpgggggggggpg..',
      '.ggeeeeeeeeeg...',
      'Gggyyyyyyyyyggg.',
      'GGgyyyyyyyyygGG.',
      '.GGGGG...GGGGG..',
    ],
  },
  ferret: {
    pal: { f: '#e8d6b8', F: '#b99a73', m: '#6b4c38', e: C.ink, n: '#e88a9a', w: '#fffaf0' },
    rows: [
      '...........ff.ff',
      '..........ffffff',
      '..........fmemem',
      '..........fwwnww',
      'F..........wwww.',
      'FF...fffffffff..',
      '.FFfffffffffff..',
      '...fFfffffFfff..',
      '....FF.F....F.F.',
    ],
  },
  owl: {
    pal: { b: '#8d6444', B: '#5e412d', t: '#d8b58a', w: '#fff5e6', y: '#f5c542', e: C.ink, o: '#e8913c' },
    rows: [
      '..B........B..',
      '..bB......Bb..',
      '..bbbbbbbbbb..',
      '.bwwwbbbbwwwb.',
      '.bwyewbbwyewb.',
      '.bwwwbbobwwwb.',
      '.bbbbbbobbbbb.',
      '.bBtttttttBbb.',
      '.bBtbtbtbtBbb.',
      '.bBttttttBbbb.',
      '..bBtbtbtBbb..',
      '..bbttttbbbb..',
      '...BbbbbbbB...',
      '....o.oo.o....',
    ],
  },
  poodle: {
    pal: { p: '#f6c9d6', P: '#d99ab0', w: '#fff7fa', e: C.ink, n: C.ink, r: C.red },
    rows: [
      '..........ppp...',
      '.........ppppp..',
      '........Ppppppp.',
      '.pp.....PpepepP.',
      'pPpp....Pppnppp.',
      '.pp.....PPprrpP.',
      '..p..pppppppp...',
      '..ppppppppppp...',
      '..pPpppppppPp...',
      '...pp.......p...',
      '...p.p.....p.p..',
      '..ppp.....ppp...',
    ],
  },
};

// ---------------------------------------------------------------------------------------------
// Townsfolk — built from a template with swappable heads, hats and palettes
// ---------------------------------------------------------------------------------------------
const NPC_BODY = mirror([
  '...hSSSS',
  '..tttttt',
  '.ttTttLt',
  '.ttTtttt',
  '.ttTtttt',
  '.ssTuuuu',
  '..uuuuuu',
  '..UUUUUU',
]);
const NPC_BODY_APRON = mirror([
  '...hSSSS',
  '..tttaaa',
  '.ttTtaaa',
  '.ttTaaaa',
  '.ttTaaaa',
  '.ssTaaaa',
  '..uaaaaa',
  '..UUUUUU',
]);
const NPC_BODY_PANTS = mirror([
  '...hSSSS',
  '..tttttt',
  '.ttTttLt',
  '.ttTtttt',
  '.ttTtttt',
  '.ssTtttt',
  '...uuuuu',
  '...uuU.u',
]);
const NPC_LEGS = ['....ss....ss....', '...bbB....Bbb...'];
const NPC_LEGS_PANTS = ['....uu....uu....', '...bbB....Bbb...'];

const HEADS = {
  short: mirror([
    '........', '........', '........', '....hhhh', '..hhhhhh', '.hhhHHhh', '.hhHhhhh', '.hhshhss',
    '.hssssss', '.hssesss', '.hssesss', '.hscssss', '..sSssss', '...Sssss',
  ]),
  long: mirror([
    '........', '........', '........', '....hhhh', '..hhhhhh', '.hhhHHhh', '.hhHhhhh', '.hhshhss',
    'hhssssss', 'hhssesss', 'hhssesss', 'hhscssss', 'hhhSssss', '.hh.Ssss',
  ]),
  bun: mirror([
    '........', '.....hhh', '....hHhh', '....hhhh', '..hhhhhh', '.hhhHHhh', '.hhHhhss', '.hssssss',
    '.hssssss', '.hssssss', '.hssesss', '.hscssss', '..sSssss', '...Sssss',
  ]),
  bald: mirror([
    '........', '........', '........', '....ssss', '..ssssss', '.sssSsss', '.sssssss', '.hssssss',
    '.hssssss', '.hssesss', '.hssesss', '.hsssssm', '..hhhhhh', '...hhhhh',
  ]),
  pigtails: mirror([
    '........', '........', '........', '....hhhh', 'h.hhhhhh', 'hhhhHHhh', 'hhhHhhhh', '.hhshhss',
    '.hssssss', '.hssesss', '.hssesss', '.hscssss', '..sSssss', '...Sssss',
  ]),
};
const HATS = {
  cap: ['................', '................', '.....aaaaaa.....', '....aAaaaaAa....', '...aaaaaaaaaa...', '...AAAAAAAAAAAA.'],
  beanie: ['................', '.......aa.......', '.....aaaaaa.....', '....aAaAaAaa....', '...aaaaaaaaaa...', '...AAAAAAAAAA...'],
  straw: ['................', '................', '.....aaaaaa.....', '....aaaaaaaa....', '...AAAAAAAAAA...', '.aaaaaaaaaaaaaa.'],
  beret: ['................', '................', '.......a........', '....aaaaaaaa....', '...aaaAaaaaaa...', '...AAAAAAAAa....'],
  scarf: ['................', '................', '.....aaaaaa.....', '....aaaaaaaa....', '...aAaaaaaaAa...', '..aaa......aaa..'],
  tophat: ['.....aaaaaa.....', '.....aaaaaa.....', '.....aaaaaa.....', '.....AAAAAA.....', '....aaaaaaaa....', '..aaaaaaaaaaaa..'],
  glasses: null,
};

export const NPC_LOOKS = {
  baker: { head: 'bun', body: 'apron', pal: { h: '#a0522d', H: '#c97a4a', t: '#e8a33d', T: '#b87a22', L: '#f5c36b', a: '#fffaf0', u: '#e8a33d', U: '#b87a22', b: '#6b3a26', B: '#43241a' } },
  postmaster: { head: 'short', body: 'pants', hat: 'cap', pal: { h: '#6b6b6b', H: '#8c8c8c', t: '#3f63a8', T: '#2c4680', L: '#6b8fd0', u: '#2c3a5a', U: '#1e2842', a: '#3f63a8', A: '#2c4680', b: '#3a2a22', B: '#241814' }, mustache: true },
  fisher: { head: 'bald', body: 'pants', hat: 'beanie', pal: { h: '#8b6a4a', H: '#a88560', t: '#f2c230', T: '#c39318', L: '#ffe070', u: '#3a4f5f', U: '#26353f', a: '#c9453f', A: '#90302c', b: '#2d2d3a', B: '#1c1c26' } },
  grocer: { head: 'short', body: 'apron', pal: { h: '#3a2a20', H: '#5b4332', t: '#e9e2d0', T: '#bdb49f', L: '#fff', a: '#5a9a4a', u: '#5a4a3a', U: '#3a2e24', b: '#4a3024', B: '#2e1e16' } },
  curio: { head: 'bun', body: 'dress', glasses: true, pal: { h: '#d8d4dc', H: '#f2eef5', t: '#7a4f8f', T: '#583768', L: '#9a6fae', u: '#7a4f8f', U: '#583768', b: '#3a2a3a', B: '#24182a' } },
  painter: { head: 'short', body: 'pants', hat: 'beret', pal: { h: '#1f1c24', H: '#3a3542', t: '#e9e2d0', T: '#c2b8a3', L: '#fff', u: '#5d7fa8', U: '#3f5a7e', a: '#c9453f', A: '#8e2e2a', b: '#4a3024', B: '#2e1e16' } },
  inventor: { head: 'short', body: 'pants', glasses: true, pal: { h: '#3b2a22', H: '#5a4232', t: '#e4574c', T: '#b23c35', L: '#fff5ea', u: '#3a3a4a', U: '#262632', b: '#4a3024', B: '#2e1e16' }, stripes: true },
  farmer: { head: 'long', body: 'dress', hat: 'straw', pal: { h: '#e8c060', H: '#f7dc8a', t: '#6aa0d8', T: '#4a7ab0', L: '#9cc4ec', u: '#6aa0d8', U: '#4a7ab0', a: '#f2d58a', A: '#c9a44e', b: '#6b3a26', B: '#43241a' } },
  mayor: { head: 'bald', body: 'pants', hat: 'tophat', pal: { h: '#e8e8e8', H: '#fff', t: '#3a2f4a', T: '#261e32', L: '#5a4a6e', u: '#2a2436', U: '#1a1622', a: '#26202e', A: '#15111a', b: '#1e1a22', B: '#100e14' }, mustache: true },
  kid: { head: 'pigtails', body: 'dress', pal: { h: '#c0632f', H: '#e08a4e', t: '#f2a0b0', T: '#c77a8a', L: '#ffc8d2', u: '#f2a0b0', U: '#c77a8a', b: '#c9453f', B: '#8e2e2a' } },
};

// A pool of looks for the pet owners who book rooms
const OWNER_PALS = [
  { h: '#2f2622', H: '#4e3f36', t: '#79a36b', T: '#557a4a', L: '#a4c996', u: '#79a36b', U: '#557a4a' },
  { h: '#b0602e', H: '#d2854f', t: '#8fb8de', T: '#6690b8', L: '#bcd7ef', u: '#40506a', U: '#2a3549' },
  { h: '#e3c16a', H: '#f5dc95', t: '#d9695f', T: '#a94b44', L: '#f19a91', u: '#d9695f', U: '#a94b44' },
  { h: '#9a9a9a', H: '#c8c8c8', t: '#b58ad0', T: '#8b64a6', L: '#d4b3e8', u: '#4a3d5a', U: '#30283c' },
  { h: '#55372a', H: '#7a5341', t: '#f0d27a', T: '#c6a850', L: '#fff0b0', u: '#5a6f3e', U: '#3d4d2a' },
  { h: '#1e1b22', H: '#3b3642', t: '#5fb3a8', T: '#3f8279', L: '#94d6cd', u: '#5fb3a8', U: '#3f8279' },
  { h: '#7b3a2a', H: '#a2573f', t: '#e8e0cf', T: '#bfb49c', L: '#fffaf0', u: '#6a4a8a', U: '#4a3263' },
  { h: '#d8d0c0', H: '#fffaf0', t: '#6d8fb3', T: '#4d6d91', L: '#9ab8d6', u: '#6d8fb3', U: '#4d6d91' },
];
const OWNER_SKINS = [
  { s: '#f9d8bb', S: '#e7ab8e' },
  { s: '#e9b98f', S: '#c98f68' },
  { s: '#c68a5f', S: '#9e6642' },
  { s: '#8e5a3a', S: '#6b4028' },
  { s: '#f5d2c0', S: '#dca894' },
];
const OWNER_HEADS = ['short', 'long', 'bun', 'bald', 'pigtails'];
const OWNER_BODIES = ['dress', 'pants', 'apron', 'pants'];
const OWNER_HATS = [null, null, null, 'cap', 'straw', 'beret', 'scarf', 'beanie'];

export function randomOwnerLook(seed) {
  const r = rng(seed * 9301 + 49297);
  const pal = { ...r.pick(OWNER_PALS), ...r.pick(OWNER_SKINS), b: '#5a3a2a', B: '#3a241a' };
  pal.a = mixHex(pal.t, '#fff5e8', 0.6);
  pal.A = shadeHex(pal.a, 0.8);
  return { head: r.pick(OWNER_HEADS), body: r.pick(OWNER_BODIES), hat: r.pick(OWNER_HATS), glasses: r.chance(0.2), pal };
}

function npcRows(look, legsFrame = 0) {
  const g = grid(16, 24);
  const head = HEADS[look.head] || HEADS.short;
  stamp(g, head, 0, 0);
  const body = look.body === 'apron' ? NPC_BODY_APRON : look.body === 'pants' ? NPC_BODY_PANTS : NPC_BODY;
  stamp(g, body, 0, 14);
  if (look.stripes) {
    for (const y of [16, 18]) for (let x = 2; x < 14; x++) if (g[y][x] === 't') g[y][x] = 'L';
  }
  if (look.mustache) { g[12][6] = 'h'; g[12][7] = 'h'; g[12][8] = 'h'; g[12][9] = 'h'; }
  if (look.glasses) {
    for (const x of [3, 4, 5, 10, 11, 12]) g[9][x] = 'G';
    for (const x of [3, 5, 10, 12]) g[10][x] = 'Q';
    for (const x of [7, 8]) g[10][x] = 'G';
    for (const x of [3, 5, 10, 12]) g[11][x] = 'G';
  }
  if (look.hat && HATS[look.hat]) stamp(g, HATS[look.hat], 0, look.hat === 'tophat' ? 0 : 1);
  let legs = look.body === 'pants' ? NPC_LEGS_PANTS : NPC_LEGS;
  if (legsFrame === 1) legs = [legs[0], legs[1].replace('...bbB', '...bb.')];
  stamp(g, legs, 0, 22);
  return rowsOf(g);
}

function npcPal(look) {
  return {
    s: C.skin, S: C.skinS, c: C.blush, e: C.ink, m: '#b85a5a', G: '#4a4050', Q: '#dff1f7',
    ...look.pal,
    a: look.pal.a || '#fffaf0', A: look.pal.A || '#d8d0c0',
  };
}

// ---------------------------------------------------------------------------------------------
// Item icons (12x12 art, outlined -> 14x14)
// ---------------------------------------------------------------------------------------------
const IP = {
  // shared item palette
  e: C.ink, w: '#fffdf6', W: '#d8d0c4', g: '#5aa84a', G: '#3a7a34', l: '#9cd26a',
  r: '#d9393c', R: '#96243a', p: '#ff8a7a', o: '#f08a3a', O: '#b85a22', y: '#f5d24b', Y: '#c49a2a',
  b: '#8a5a33', B: '#5e3a20', t: '#c89a64', T: '#9a6e3e', s: '#c8c0b4', S: '#8e8578',
  u: '#5a8fd0', U: '#35629e', a: '#8ad8e8', A: '#4aa8c0', v: '#9a6ac0', V: '#6a4290', k: '#f4c9a8',
  n: '#f5e6c8', N: '#d6c29a', m: '#a0d8a0', M: '#5e9e6a', q: '#e8e0f8', z: '#ffe79a', h: '#e4a0c0', H: '#b86a90',
};
const ITEM_ART = {
  berries: ['....g.......', '...gGg......', '....gl......', '..vv.vv.....', '.vqVvvqV....', '.vvVvvvV....', '..VV.VVvv...', '.....vqvV...', '.....vvVV...', '......VV....'],
  mushroom: ['............', '...rrrrr....', '..rwrrrwr...', '.rrrrrwrrr..', '.rwrrrrrrwr.', '.RRRRRRRRRR.', '....nnN.....', '....nnN.....', '....nnN.....', '...nnnNN....'],
  carrot: ['.......g.g..', '......gGg...', '.......gG...', '......oo....', '.....ooO....', '....ooO.....', '...ooO......', '..ooO.......', '..oO........', '.oO.........'],
  fish: ['............', '.......uu...', '.....uuuuu..', 'u..uuauuuuu.', 'uuuuaaaaaewu', 'uuuuaaaaaaau', 'u..uUUUUUUu.', '.....UUUUU..', '.......UU...'],
  egg: ['............', '....nnn.....', '...nwwnn....', '..nwwnnnN...', '..nwnnnnN...', '..nnnnnnN...', '..nnnnnNN...', '...NNNNN....'],
  milk: ['....ss......', '....ww......', '....ww......', '...wwww.....', '..wwwwww....', '..wuuuuW....', '..wuwwuW....', '..wuuuuW....', '..wwwwwW....', '...WWWW.....'],
  honey: ['...bbbbb....', '...BBBBB....', '..yyyyyyy...', '..yzzyyyY...', '..yzyYYyY...', '..ybbbbbY...', '..ybwwbbY...', '..yyyyyyY...', '...YYYYY....'],
  seeds: ['..nnnnnnn...', '..nNnnnNn...', '..nyyyyyn...', '..nyYYYyn...', '..nyYeYyn...', '..nyYYYyn...', '..nyyyyyn...', '..nnnnnnn...', '..NNNNNNN...'],
  clover: ['............', '...gg.gg....', '..glgglgg...', '..ggggggg...', '...ggGgg....', '..gglGggg...', '..ggg.ggg...', '...g.G.g....', '.....G......', '....G.......'],
  mint: ['.....g......', '....glg.....', '...gllgg....', '...glggg....', '..gglGgg.g..', '..gggGgggl..', '...ggGggg...', '..gg.G.g....', '.glg.G......', '..g..G......'],
  catnip: ['....m.......', '...mmm..m...', '...mMm.mmm..', '..h.m..mMm..', '.hHh.m..m...', '..h..m.m....', '..mm.mm.....', '.mMm.m......', '..m..m......', '.....m......'],
  acorn: ['.....B......', '...bbbbb....', '..bTbTbTb...', '..TTTTTTT...', '...ooooo....', '...ooooO....', '...oooOO....', '....oOO.....', '.....O......'],
  moss: ['............', '............', '....g.l.....', '..lgggggl...', '.gglgGglgg..', '.gGgggggGg..', 'gggGgglgGgg.', 'sGgggGgggGs.', 'ssSsssssSss.'],
  apple: ['......B.....', '.....Bgg....', '...rrBrrr...', '..rprrrrrr..', '..rprrrrrR..', '..rrrrrrrR..', '..rrrrrrRR..', '...rrrrRR...', '....RRRR....'],
  wool: ['............', '...wwwww....', '..wwWwwww...', '.wwWwwwWww..', '.wWwwWwwWw..', '.wwwWwwWww..', '.wWwwwWwww..', '..wwWwwww...', '...wwwww.W..', '.........W..'],
  feather: ['.........ww.', '........wqw.', '.......wqqw.', '......wqqw..', '.....wqqw...', '....wqqw....', '...wqqw.....', '..wqww......', '..wW........', '.W..........'],
  driftwood: ['............', '............', '.........tt.', '.......ttTt.', '.....tttTT..', '...ttTttT...', '.tttTtTT....', 'tTtTTT......', '.TTT........'],
  pebble: ['............', '............', '....sss.....', '..sswsss....', '.sswsssss...', '.ssssssSS...', '..SSSSSS....', '............', '.......ss...', '......ssSS..'],
  seaglass: ['............', '.....aa.....', '....awaa....', '...awaaaA...', '...aaaaAA...', '..aaaaaAA...', '..aaaaAA....', '...AAAA.....'],
  pinecone: ['.....g......', '....bbb.....', '...bTbTb....', '..bTbTbTb...', '..TbTbTbT...', '..bTbTbTb...', '...TbTbT....', '....bTb.....', '.....b......'],
  twine: ['............', '...nnnnnn...', '..nNnNnNnn..', '..NnNnNnNn..', '..nNnNnNnn..', '..NnNnNnNn..', '..nNnNnNnn..', '...nnnnnn.n.', '..........n.', '.........n..'],
  cloth: ['............', '.hhhhhhhhh..', '.hwhhhhwhh..', '.hhhhwhhhh..', '.hhwhhhhwh..', '.hhhhhhhhH..', '.hwhhhwhhH..', '.hhhhhhhHH..', '..HHHHHHH...'],
  flower: ['...y.y......', '..yyzyy.....', '...yoy......', '..yyYyy.....', '...y.y......', '....g..v.v..', '....g.vvqvv.', '....gg.vVv..', '.....g..g...', '.....g.gG...'],
  shell: ['............', '.....hh.....', '....hwhh....', '...hwhwhh...', '..hwhwhwhh..', '..hhwhwhHh..', '..hhhhhhHH..', '...HhhhHH...', '....HHH.....'],
  starshard: ['.....z......', '.....z......', '....zwz.....', 'zzzzwwwzzzz.', '..zzwwwzz...', '...zzwzz....', '..zz...zz...', '.zz.....zz..'],
  oldcoin: ['............', '...YYYYY....', '..YyyyyyY...', '.YyyzzyyyY..', '.YyzyyyyyY..', '.YyzyyyyyY..', '.YyyyyyyyY..', '..YyyyyyY...', '...YYYYY....'],
  bottle: ['.......bb...', '......aww...', '.....aaaa...', '....aanna...', '...aanNna...', '..aanNnaa...', '..aannaa....', '..aaaaa.....', '...AAA......'],
  glassbead: ['............', '...vvvvv....', '..vqvvvvv...', '.vqvvvvvvV..', '.vvvv.vvvV..', '.vvvv.vvvV..', '.vvvvvvvVV..', '..vvvvvVV...', '...VVVVV....'],
  pearl: ['............', '............', '....wwww....', '...wwqqqw...', '..wwqqqqqW..', '..wqqqqqqW..', '..wqqqqqWW..', '...WqqqWW...', '....WWWW....'],
  brasskey: ['............', '..yyy.......', '.y...y......', '.y...y......', '..yyyyyyyyy.', '.......Y.Y..', '.......Y.Y..'],
  bundle_mossy: ['.....n......', '....nNn.....', '...ggggg....', '..gglgggg...', '.gglgggGgg..', '.ggggGgggg..', '.gGgggggGg..', '..gggGggg...', '...GGGGG....'],
  bundle_barnacle: ['............', '.BBBBBBBBBB.', '.bsbbbbbwbB.', '.bbbbyybbbB.', '.BBBByyBBBB.', '.bbbbbbsbbB.', '.bwbbbbbbbB.', '.bbbsbbbbwB.', '.BBBBBBBBBB.'],
  bundle_nest: ['............', '............', '..n.tt.t....', '.tTtwwwtTt..', '.TtwwnwwtT..', 'tTtTtTtTtTt.', '.TtTtTtTtT..', '..TTTTTTT...'],
  bundle_crate: ['............', 'tttttttttt..', 'tTTTTTTTTt..', 'tTttttttTt..', 'tTtTttTtTt..', 'tTttTTttTt..', 'tTtTttTtTt..', 'tTTTTTTTTt..', 'tttttttttt..'],
  treat_fish: ['............', '..nnnnnnnn..', '..nNNNNNNn..', '...ouooouo..', '..uuooouuo..', '..ouoouoo...', '..nnnnnnnn..', '...NNNNNN...'],
  treat_stew: ['...w..w.....', '....w..w....', '............', '.uuuuuuuuuu.', '.uoorbooboU.', '..uoggooU...', '..uuuuuuU...', '...UUUUU....'],
  treat_salad: ['............', '...o.l..o...', '..glgollgg..', '.uggoglgogu.', '.uuuuuuuuuU.', '..uuuuuuuU..', '...UUUUUU...'],
  treat_crumble: ['............', '...v.r.v....', '..nnvnrnnn..', '.nNnnNnnNnn.', '.uvvrvrvvvU.', '.uurrvvrruU.', '..uuuuuuuU..', '...UUUUUU...'],
  treat_seedcake: ['....y.y.....', '...nynnyn...', '..nnnnnnnn..', '..NyNNyNNN..', '..nnnnnnnn..', '..nynnnynn..', '..NNNNNNNN..'],
  treat_moss: ['............', '....l.g.....', '...ggggggg..', '..gglglgGg..', '..ggGggggG..', '..wwwwwwwW..', '...wwwwwW...', '....WWWW....'],
  treat_catnip: ['......m.....', '.....mMm....', '...nnnnnnn..', '..nhhhhhhhn.', '.nhhwhhwhhhn', '.NnnnnnnnnN.', '..NNNNNNNN..'],
  treat_apple: ['............', '..nrn..nrn..', '.nnwnn.nnwn.', '..nrn.nrn...', '....nnwnn...', '.nrn..nrn...', '.nwnn.......', '..n.........'],
  toy_yarn: ['............', '...rrrrr....', '..rrprrrr...', '.rprrprrrR..', '.rrrprrprR..', '.rprrrprrR..', '.rrprrrrRR..', '..rrrprRR...', '...RRRRR..r.', '.........rr.'],
  toy_stick: ['............', '.........bb.', '........bbB.', '.......bbB..', '......bbB...', '.....bbB.g..', '....bbB.gg..', '...bbB......', '..bbB.......', '..BB........'],
  toy_feather: ['...qq.......', '..qwqq......', '..qqwq......', '...qqr......', '....r.......', '.....b......', '......b.....', '.......b....', '........b...', '.........b..'],
  toy_pinecone: ['............', '....bbb.....', '...bTbTb....', '..bTbTbTb..n', '..TbTbTbT.n.', '..bTbTbTbn..', '...TbTbT....', '....bTb.....'],
  toy_chime: ['.....n......', '.....n......', '..nnnnnnn...', '..n..n..n...', '..h..a..h...', '.hwh.aa.hwh.', '.hhh.aA.hhh.', '..H...A..H..'],
  decor_cushion: ['............', '............', '..rrrrrrrr..', '.rprrrrrrrr.', '.rrrryrrrrR.', '.rrryyyrrrR.', '.rrrryrrrRR.', '.RrrrrrrrRR.', '..RRRRRRRR..'],
  decor_pond: ['............', '...ssssss...', '..saaaaaas..', '.saawaaaaAs.', '.saaaawaaAs.', '.sSaaaaaASs.', '..sSSSSSSs..', '...SSSSSS...'],
  decor_perch: ['............', '.tttttttttt.', '.TTTTTtTTTT.', '.....t......', '.....t......', '.....t......', '.....t......', '...ttttt....', '..TTTTTTT...'],
  decor_lamp: ['....yy......', '...yzzy.....', '...yzwy.....', '....yy......', '...bbbb.....', '..bzzzzb....', '..bzwzzb....', '..bzzzzb....', '...bbbb.....', '...BBBB.....'],
  decor_plant: ['...g..g.....', '..glg.glg...', '.glGglGlg...', '..gGgGgg....', '...gGgG.....', '..ooooooo...', '..oOOOOoo...', '...oooOO....', '...OOOO.....'],
  decor_rug: ['............', '............', 'n.n.n.n.n.n.', 'rrrrrrrrrrrr', 'ryyrryyrryyr', 'rrrruurrrrrr', 'ryyrryyrryyr', 'rrrrrrrrrrrr', 'n.n.n.n.n.n.'],
  gear_satchel: ['............', '...bb..bb...', '..b..bb..b..', '..tttttttt..', '.ttTTTTTTtt.', '.tttyttttTt.', '.ttttttttTt.', '.ttttttttTt.', '..TTTTTTTT..'],
  gear_basket: ['...TTTTTT...', '..T......T..', '.T........T.', 'tttttttttttt', 'tTtTtTtTtTtT', 'TtTtTtTtTtTt', '.tTtTtTtTtT.', '..TTTTTTTT..'],
  gear_bristles: ['........yy..', '.......yYy..', '......yYyy..', '.....rryYy..', '....bbrryy..', '...bb..yy...', '..bb........', '.bb.........', 'bb..........'],
  parcel: ['............', '.nnnnrnnnnn.', '.nNnnrnnNnn.', '.nnnnrnnnnn.', '.rrrrrrrrrr.', '.nnnnrnnnnN.', '.nNnnrnnnnN.', '.NNNNrNNNNN.', '....rr.rr...'],
  bread: ['............', '............', '...oooooo...', '..oyoyoyoo..', '.ooooooooOO.', '.oOoOoOoOOO.', '..OOOOOOOO..'],
  letter: ['............', '.wwwwwwwwww.', '.wWwwwwwwWw.', '.wwWwwwwWww.', '.wwwWwwWwww.', '.wwwwrrwwww.', '.wwwwrrwwww.', '.WWWWWWWWWW.'],
  balloon: ['...rrrr.....', '..rprrrr....', '..rprrrrR...', '..rrrrrrR...', '...rrrrR....', '....rRR.....', '.....n......', '.....n......', '....n.......', '....n.......'],
};

// ---------------------------------------------------------------------------------------------
// Small UI / world icons (bubbles etc.)
// ---------------------------------------------------------------------------------------------
const ICON_ART = {
  heart: ['.rr.rr.', 'rprrrrr', 'rrrrrrR', '.rrrrR.', '..rRR..', '...R...'],
  coin: ['.YYYY.', 'YyzyyY', 'YzyyyY', 'YyyyyY', 'YyyyyY', '.YYYY.'],
  star: ['...y...', '...y...', 'yyyzyyy', '.yyzyy.', '.yY.Yy.', 'yY...Yy'],
  bowl: ['.......', 'n..n..n', 'uuuuuuu', '.uuuuU.', '..UUU..'],
  zzz: ['uuuu...', '..u....', '.u.....', 'uuuu...', '....aaa', '.....a.', '....aaa'],
  sad: ['..WWW..', '.WwwwW.', 'WwwwwwW', '.WWWWW.', '.a.a.a.', 'a.a.a..'],
  exclaim: ['yy', 'yy', 'yy', 'yy', '..', 'yy'],
  paw: ['.b.b.', 'b.b.b', '.....', '.bbb.', 'bbbbb', '.bbb.'],
  sparkle: ['...w...', '...w...', '..wzw..', 'wwzzzww', '..wzw..', '...w...', '...w...'],
  mess: ['..t.t..', '.tTt.t.', 't.tTtT.', '.TtT.t.', '..T.T..'],
  pin: ['.rrr.', 'rpwrr', 'rrrrR', '.rrR.', '..R..'],
  arrow: ['...y...', '..yzy..', '.yzzzy.', 'yyzzzyy', '..yzy..', '..yzy..', '..YYY..'],
  sun: ['..y..y..', 'y..yy..y', '..yzzy..', '.yzzzzy.', '.yzzzzy.', '..yzzy..', 'y..yy..y', '..y..y..'],
  moon: ['..qqq..', '.qwq...', 'qwq....', 'qwq....', 'qwqq...', '.qwqqq.', '..qqq..'],
  cloud: ['........', '..www...', '.wwwww..', 'wwwwwwww', 'wWwwwwWw', '.WWWWWW.'],
  rain: ['..www...', '.wwwww..', 'wwwwwwww', '.WWWWWW.', '.a..a...', 'a..a..a.', '..a..a..'],
  bag: ['..bb.bb..', '.b..b..b.', 'ttttttttt', 'tTTTTTTTt', 'ttttyttTt', 'tttttttTt', '.TTTTTTT.'],
};

// ---------------------------------------------------------------------------------------------
// Procedural trees & plants (pixel-art blobs with top-left lighting)
// ---------------------------------------------------------------------------------------------
function blobCanopy(g, w, h, cx, cy, rx, ry, cols, seed, nBlobs = 9) {
  const r = rng(seed);
  const blobs = [];
  for (let i = 0; i < nBlobs; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r());
    blobs.push({ x: cx + Math.cos(a) * rx * 0.62 * d, y: cy + Math.sin(a) * ry * 0.62 * d, r: Math.min(rx, ry) * r.range(0.42, 0.58) });
  }
  blobs.push({ x: cx, y: cy, r: Math.min(rx, ry) * 0.62 });
  // render: each pixel shaded by distance to the blob's light side
  const [dark, mid, light, hi] = cols;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let best = null;
      for (const b of blobs) {
        const dx = x - b.x, dy = y - b.y;
        const dd = (dx * dx + dy * dy) / (b.r * b.r);
        if (dd <= 1 && (!best || b.y > best.b.y - 0.001)) best = { b, dx, dy, dd };
      }
      if (!best) continue;
      const { b, dx, dy } = best;
      const lx = (dx + b.r * 0.35) / b.r, ly = (dy + b.r * 0.45) / b.r;
      const lit = Math.sqrt(lx * lx + ly * ly);
      const dither = ((x + y) & 1) * 0.08;
      let col = mid;
      if (lit < 0.42 + dither) col = hi;
      else if (lit < 0.8 + dither) col = light;
      else if (dy > b.r * 0.2 || dx > b.r * 0.5) col = dark;
      g.fillStyle = col;
      g.fillRect(x, y, 1, 1);
    }
  }
  return blobs;
}

export function makeTree(kind, seed = 1) {
  const r = rng(seed);
  let c;
  if (kind === 'oak' || kind === 'apple' || kind === 'orange') {
    const w = 40, h = 52;
    c = makeCanvas(w, h);
    const g = ctx2d(c);
    // trunk
    rect(g, 17, 30, 6, 21, '#7a4d2e');
    rect(g, 17, 30, 2, 21, '#96633b');
    rect(g, 21, 30, 2, 21, '#5a3620');
    rect(g, 14, 48, 12, 3, '#6a4228');
    rect(g, 23, 36, 5, 2, '#7a4d2e');
    const pal = kind === 'oak'
      ? ['#3f6b2c', '#56893a', '#74a947', '#9cc85a']
      : ['#3d6a33', '#528a3f', '#6fa84c', '#94c663'];
    const blobs = blobCanopy(g, w, 40, 20, 18, 17, 15, pal, seed, 10);
    if (kind !== 'oak') {
      const fruit = kind === 'apple' ? ['#d9393c', '#ff7a6b'] : ['#f08a3a', '#ffc070'];
      for (let i = 0; i < 9; i++) {
        const b = blobs[i % blobs.length];
        const fx = Math.round(b.x + r.range(-b.r * 0.6, b.r * 0.6)), fy = Math.round(b.y + r.range(-b.r * 0.3, b.r * 0.7));
        rect(g, fx, fy, 2, 2, fruit[0]);
        px(g, fx, fy, fruit[1]);
      }
    }
  } else if (kind === 'pine') {
    const w = 30, h = 54;
    c = makeCanvas(w, h);
    const g = ctx2d(c);
    rect(g, 13, 42, 4, 11, '#6a4228');
    rect(g, 13, 42, 1, 11, '#8a5a36');
    const tiers = 5;
    for (let t = 0; t < tiers; t++) {
      const top = 2 + t * 8, bh = 14, half = 5 + t * 2.4;
      for (let y = 0; y < bh; y++) {
        const hw = (y / bh) * half + 1;
        for (let x = -Math.round(hw); x <= Math.round(hw); x++) {
          const edge = y > bh - 3 && ((x + y + t) % 3 === 0);
          if (edge && Math.abs(x) > hw - 2) continue;
          let col = '#3d6b3f';
          if (x < -hw * 0.2) col = '#548a4c';
          if (x < -hw * 0.55 && y < bh - 2) col = '#6fa65c';
          if (x > hw * 0.45) col = '#2c5033';
          if (y > bh - 3) col = x < 0 ? '#3d6b3f' : '#284a2f';
          px(g, 15 + x, top + y, col);
        }
      }
    }
  } else if (kind === 'cypress') {
    const w = 16, h = 56;
    c = makeCanvas(w, h);
    const g = ctx2d(c);
    rect(g, 7, 48, 2, 7, '#6a4228');
    for (let y = 0; y < 50; y++) {
      const t = y / 50;
      const hw = Math.sin(Math.min(1, t * 1.3) * Math.PI * 0.62) * 6.2 + 0.5;
      for (let x = -Math.round(hw); x <= Math.round(hw); x++) {
        let col = '#34603a';
        if (x < -hw * 0.3) col = '#4c7f45';
        if (x < -hw * 0.7 && (y % 4) < 3) col = '#66994f';
        if (x > hw * 0.4) col = '#244a2e';
        if ((y + x * 3) % 7 === 0) col = '#2a5233';
        px(g, 8 + x, y + 1, col);
      }
    }
  } else if (kind === 'bush' || kind === 'berrybush' || kind === 'hedge') {
    const w = kind === 'hedge' ? 18 : 20, h = 16;
    c = makeCanvas(w, h);
    const g = ctx2d(c);
    const blobs = blobCanopy(g, w, h, w / 2, 9, w / 2 - 1, 7, ['#3f6b2c', '#56893a', '#74a947', '#9cc85a'], seed, 6);
    if (kind === 'berrybush') {
      for (let i = 0; i < 7; i++) {
        const b = blobs[i % blobs.length];
        const fx = Math.round(b.x + r.range(-3, 3)), fy = Math.round(b.y + r.range(-2, 3));
        px(g, fx, fy, '#7b4bb0');
        px(g, fx + 1, fy, '#9a6ac0');
        px(g, fx, fy + 1, '#5a3288');
      }
    }
  } else if (kind === 'sunflower') {
    const w = 12, h = 26;
    c = makeCanvas(w, h);
    const g = ctx2d(c);
    rect(g, 5, 8, 2, 18, '#4a8a34');
    rect(g, 2, 14, 3, 2, '#5aa84a');
    rect(g, 7, 18, 3, 2, '#5aa84a');
    disc(g, 5.5, 5, 4.5, '#f5c542');
    disc(g, 5.5, 5, 2.2, '#7a4a22');
    px(g, 4, 4, '#9a6a3a');
  } else if (kind === 'reeds') {
    const w = 10, h = 16;
    c = makeCanvas(w, h);
    const g = ctx2d(c);
    for (const [x, top] of [[1, 5], [3, 1], [5, 4], [7, 2], [8, 7]]) {
      rect(g, x, top, 1, h - top, x % 2 ? '#6a9a4a' : '#86b35a');
      if (top < 4) rect(g, x, top, 1, 3, '#8a5a36');
    }
  } else {
    c = makeCanvas(8, 8);
  }
  return outlineCanvas(c, null, 0.55);
}

// ---------------------------------------------------------------------------------------------
// Public builders (cached)
// ---------------------------------------------------------------------------------------------
const cache = new Map();
function cached(key, fn) {
  if (!cache.has(key)) cache.set(key, fn());
  return cache.get(key);
}

export function witchSheet() {
  return cached('witch', () => {
    const P = WITCH_PAL;
    const mk = (rows) => spriteCanvas(rows, P);
    const down = [LEGS_FRONT.idle, LEGS_FRONT.a, LEGS_FRONT.idle, LEGS_FRONT.b].map((l) => mk(witchFrame(W_FRONT_TOP, l)));
    const up = [LEGS_FRONT.idle, LEGS_FRONT.a, LEGS_FRONT.idle, LEGS_FRONT.b].map((l) => mk(witchFrame(W_BACK_TOP, l)));
    const side = [
      mk(sideFrame(LEGS_SIDE.idle)),
      mk(sideFrame(LEGS_SIDE.a, W_SIDE_ARMS_SWING.a)),
      mk(sideFrame(LEGS_SIDE.b)),
      mk(sideFrame(LEGS_SIDE.a, W_SIDE_ARMS_SWING.b)),
    ];
    const cheer = mk(cheerFrame());
    const fly = [0, 1].map((ph) => mk(flyFrame(ph)));
    return { down, up, side, cheer, fly };
  });
}

export function sootSheet() {
  return cached('soot', () => ({
    walk: [spriteCanvas(SOOT_WALK_A, CAT_PAL), spriteCanvas(SOOT_WALK_B, CAT_PAL)],
    sit: spriteCanvas(SOOT_SIT, CAT_PAL),
    sleep: spriteCanvas(SOOT_SLEEP, CAT_PAL),
  }));
}

export function petCanvas(species) {
  return cached('pet:' + species, () => {
    const d = PETS[species] || PETS.cat;
    return spriteCanvas(d.rows, { e: C.ink, ...d.pal });
  });
}
export const PET_SPECIES = Object.keys(PETS);

export function npcCanvas(look, frame = 0) {
  const key = 'npc:' + JSON.stringify(look) + frame;
  return cached(key, () => spriteCanvas(npcRows(look, frame), npcPal(look)));
}

export function itemCanvas(id) {
  return cached('item:' + id, () => {
    const art = ITEM_ART[id];
    if (!art) {
      const c = makeCanvas(14, 14);
      const g = ctx2d(c);
      rect(g, 3, 3, 8, 8, '#d8d0c4');
      return outlineCanvas(c);
    }
    const raw = spriteCanvas(art, IP);
    // center into a 14x14 canvas
    const c = makeCanvas(14, 14);
    const g = ctx2d(c);
    g.drawImage(raw, Math.floor((14 - raw.width) / 2), Math.floor((14 - raw.height) / 2) + (raw.height < 12 ? 1 : 0));
    return c;
  });
}
export const ITEM_ART_IDS = Object.keys(ITEM_ART);

export function iconCanvas(id) {
  return cached('icon:' + id, () => spriteCanvas(ICON_ART[id] || ICON_ART.star, IP));
}

export function treeCanvas(kind, seed) {
  return cached(`tree:${kind}:${seed}`, () => makeTree(kind, seed));
}

// A thought/speech bubble with an icon inside (for pets & NPC markers)
export function bubbleCanvas(inner, style = 'thought') {
  const key = 'bubble:' + style + ':' + (inner?.dataset?.id || Math.random());
  return cached(key, () => {
    const w = 20, h = 20;
    const c = makeCanvas(w, h);
    const g = ctx2d(c);
    const bg = style === 'alert' ? '#fff3c4' : '#fffdf6';
    rect(g, 2, 1, 16, 14, bg);
    rect(g, 1, 2, 18, 12, bg);
    if (style === 'thought') { rect(g, 4, 16, 3, 2, bg); rect(g, 2, 18, 2, 2, bg); }
    else { rect(g, 8, 15, 4, 2, bg); rect(g, 9, 17, 2, 2, bg); }
    if (inner) g.drawImage(inner, Math.floor((w - inner.width) / 2), Math.floor((16 - inner.height) / 2));
    return outlineCanvas(c, '#4a3548');
  });
}

export { flipCanvas, strip, recolor, tintHex };

// ---------------------------------------------------------------------------------------------
// Small world decorations & node visuals (procedural)
// ---------------------------------------------------------------------------------------------
export function sheepCanvas(frame = 0, sheared = false) {
  return cached(`sheep:${frame}:${sheared}`, () => {
    const c = makeCanvas(18, 14), g = ctx2d(c);
    const wool = sheared ? '#e8e0d4' : '#fbf7ef', woolS = sheared ? '#c8beb0' : '#ddd4c8';
    const r = rng(7);
    if (sheared) { rect(g, 3, 5, 11, 5, wool); rect(g, 3, 9, 11, 1, woolS); }
    else {
      for (const [x, y, rr] of [[5, 6, 3.2], [9, 5, 3.4], [12, 6.5, 3], [7, 8, 3], [11, 8.5, 2.8]]) disc(g, x, y, rr, wool);
      for (let i = 0; i < 10; i++) px(g, r.int(3, 13), r.int(7, 10), woolS);
      for (let i = 0; i < 5; i++) px(g, r.int(4, 12), r.int(3, 5), '#ffffff');
    }
    // head
    rect(g, 13, 4, 4, 4, '#3a3140'); rect(g, 14, 8, 2, 1, '#3a3140');
    px(g, 14, 5, '#fff6e4'); px(g, 16, 5, '#fff6e4'); px(g, 12, 4, '#3a3140');
    // legs
    const legs = frame ? [[5, 1], [7, -1], [10, 1], [12, -1]] : [[5, 0], [7, 0], [10, 0], [12, 0]];
    for (const [x, o] of legs) rect(g, x, 11, 1, 3 + (o > 0 ? 0 : 0), '#3a3140');
    return outlineCanvas(c);
  });
}

export function chickenCanvas(frame = 0) {
  return cached('chicken:' + frame, () => {
    const c = makeCanvas(10, 10), g = ctx2d(c);
    disc(g, 4.5, 5.5, 3, '#fffaf0');
    rect(g, 6, 1, 3, 4, '#fffaf0');
    px(g, 7, 0, '#e04a3f'); px(g, 8, 0, '#e04a3f');
    px(g, 9, 3, '#f5b242'); px(g, 7, 2, '#2a1d2e'); px(g, 8, 4, '#e04a3f');
    rect(g, 1, 3, 2, 3, '#e8e0d4');
    rect(g, 3 + frame, 8, 1, 2, '#f5b242'); rect(g, 6 - frame, 8, 1, 2, '#f5b242');
    return outlineCanvas(c);
  });
}

export function gullCanvas(frame = 0) {
  return cached('gull:' + frame, () => {
    const c = makeCanvas(14, 8), g = ctx2d(c);
    if (frame === 0) {
      for (let i = 0; i < 6; i++) { px(g, 1 + i, 2 + Math.floor(i / 3), '#fffdf6'); px(g, 12 - i, 2 + Math.floor(i / 3), '#fffdf6'); }
      rect(g, 6, 4, 2, 2, '#fffdf6');
      px(g, 1, 2, '#6a6a7a'); px(g, 12, 2, '#6a6a7a'); px(g, 8, 4, '#f5b242');
    } else {
      for (let i = 0; i < 6; i++) { px(g, 1 + i, 5 - Math.floor(i / 2), '#fffdf6'); px(g, 12 - i, 5 - Math.floor(i / 2), '#fffdf6'); }
      rect(g, 6, 3, 2, 2, '#fffdf6');
      px(g, 8, 3, '#f5b242');
    }
    return c;
  });
}

export function rockCanvas(seed, mossy = false) {
  return cached(`rock:${seed}:${mossy}`, () => {
    const r = rng(seed);
    const w = r.int(10, 16), h = r.int(7, 10);
    const c = makeCanvas(w, h), g = ctx2d(c);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const dx = (x - w / 2 + 0.5) / (w / 2), dy = (y - h + 0.5) / h;
      if (dx * dx + dy * dy > 1) continue;
      let col = '#a39a8c';
      if (dx < -0.2 && dy < -0.5) col = '#c4bcae';
      else if (dx > 0.35 || dy > -0.25) col = '#857c6e';
      if (mossy && dy < -0.55 + Math.sin(x * 1.3) * 0.12) col = (x + y) % 2 ? '#6fa84c' : '#5a9040';
      px(g, x, y, col);
    }
    return outlineCanvas(c);
  });
}

export function tuftCanvas(kind, seed) {
  return cached(`tuft:${kind}:${seed}`, () => {
    const r = rng(seed);
    const c = makeCanvas(8, 7), g = ctx2d(c);
    const base = kind === 'forest' ? ['#4a7a30', '#6a9a42'] : kind === 'meadow' ? ['#6a9c3c', '#a6d466'] : ['#5d9136', '#8cc050'];
    for (let i = 0; i < 4; i++) {
      const x = r.int(1, 6), hgt = r.int(3, 6);
      for (let y = 0; y < hgt; y++) px(g, x + (y > 3 ? (i % 2 ? 1 : -1) : 0), 6 - y, y > hgt - 3 ? base[1] : base[0]);
    }
    if (kind === 'flower' || (kind === 'meadow' && r() < 0.5)) {
      const col = r.pick(['#fff6e4', '#f7a8c0', '#f5d24b', '#b8a8f0', '#e05a6a']);
      const x = r.int(2, 5);
      px(g, x, 1, col); px(g, x - 1, 2, col); px(g, x + 1, 2, col); px(g, x, 3, col); px(g, x, 2, '#f5d24b');
    }
    return c;
  });
}

export function nodeCanvas(visual, seed = 1) {
  switch (visual) {
    case 'berrybush': return treeCanvas('berrybush', seed);
    case 'bushEmpty': return treeCanvas('bush', seed);
    case 'sunflower': return treeCanvas('sunflower', seed);
    case 'sunflowerEmpty': return cached('sfe', () => { const c = makeCanvas(12, 26), g = ctx2d(c); rect(g, 5, 8, 2, 18, '#4a8a34'); disc(g, 5.5, 5, 2.5, '#7a4a22'); return outlineCanvas(c); });
    case 'mossrock': return rockCanvas(seed, true);
    case 'rock': return rockCanvas(seed, false);
    case 'beehive': return cached('hive', () => {
      const c = makeCanvas(14, 16), g = ctx2d(c);
      rect(g, 2, 13, 10, 3, '#6a4228');
      for (let y = 0; y < 12; y++) { const w = Math.round(Math.sin(((y + 2) / 14) * Math.PI) * 5.5); rect(g, 7 - w, 1 + y, w * 2, 1, y % 3 === 0 ? '#c49a3a' : '#e8c060'); }
      rect(g, 6, 9, 2, 2, '#3a2a22');
      return outlineCanvas(c);
    });
    case 'coop': return cached('coop', () => {
      const c = makeCanvas(24, 22), g = ctx2d(c);
      rect(g, 3, 9, 18, 12, '#c9563f'); rect(g, 3, 9, 18, 1, '#e27b5c');
      for (let x = 3; x < 21; x += 3) rect(g, x, 10, 1, 11, '#a8452f');
      for (let y = 0; y < 8; y++) rect(g, 12 - y - 1, 8 - y + 1, (y + 1) * 2, 1, '#6a4228');
      rect(g, 1, 8, 22, 2, '#8a5a36');
      rect(g, 10, 14, 4, 7, '#3a2a22');
      g.drawImage(chickenCanvas(0), 13, 12);
      return outlineCanvas(c);
    });
    case 'carrot': return cached('carrotTop' + seed, () => {
      const c = makeCanvas(8, 8), g = ctx2d(c);
      for (const [x, h] of [[2, 5], [4, 7], [6, 5]]) rect(g, x, 8 - h, 1, h - 2, '#5aa84a');
      px(g, 3, 3, '#7ac85a'); px(g, 5, 2, '#7ac85a');
      rect(g, 3, 6, 3, 2, '#f08a3a');
      return outlineCanvas(c);
    });
    case 'glint': return iconCanvas('sparkle');
    case 'sheep': return sheepCanvas(0);
    case 'pebbles': return itemCanvas('pebble');
    case 'herb': return itemCanvas('mint');
    case 'herb2': return itemCanvas('catnip');
    case 'flowerpatch': return itemCanvas('flower');
    case 'feathers': return itemCanvas('feather');
    case 'bundle': return itemCanvas('bundle_nest');
    default: return itemCanvas(visual);
  }
}
