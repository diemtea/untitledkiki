// Broom & Board, inside: a cut-away diorama with kitchen, workshop, lobby and six guest rooms.
import * as THREE from 'three';
import { makeFloorTexture, makeWallpaperTexture, makeWainscotTexture, drawTexture } from '../gfx/tiles.js';
import { makeCanvas, ctx2d, rect, px, disc, outlineCanvas, pixelTexture, shadeHex, tintHex } from '../gfx/pixel.js';
import { Billboard, blobShadow, groundDecal } from '../gfx/billboard.js';
import { itemCanvas, iconCanvas, petCanvas, sootSheet, treeCanvas } from '../gfx/sprites.js';
import { Particles } from '../gfx/particles.js';
import { Witch } from '../entities/witch.js';
import { Actor } from '../entities/actor.js';
import { damp, clamp, dist, rng } from '../core/util.js';
import { applySeeThroughTree, updateSeeThrough } from '../gfx/seethrough.js';

export const HW = 47; // interior width (tiles)
export const HD = 12; // interior depth
const WALL_H = 3.0;
const LOW = 0.55;

export const ROOM_COLORS = ['rose', 'mint', 'sky', 'butter', 'lilac', 'cream'];
export function roomBounds(i) {
  const x0 = 22 + i * 4;
  return { x0: x0 + 1, x1: x0 + 4, z0: 1, z1: 7, door: { x: x0 + 2.5, z: 7.5 }, cx: x0 + 2.5, cz: 4 };
}

function lam(o) { return new THREE.MeshLambertMaterial(o); }

// ------------------------------------------------------------------ furniture art
function canvasOf(w, h, fn, outline = true) {
  const c = makeCanvas(w, h), g = ctx2d(c);
  fn(g);
  return outline ? outlineCanvas(c) : c;
}
const ART = {
  shelf: () => canvasOf(30, 34, (g) => {
    rect(g, 0, 0, 30, 34, '#8a5a36'); rect(g, 2, 2, 26, 30, '#6a4228');
    for (const y of [11, 21, 31]) rect(g, 1, y, 28, 2, '#b07a48');
    const jars = [['#f5d24b', '#c49a2a'], ['#d9393c', '#96243a'], ['#9cd26a', '#5a9a3a'], ['#f0a060', '#b86a30'], ['#c8b0e8', '#8a70b0']];
    for (let row = 0; row < 3; row++) for (let k = 0; k < 4; k++) {
      const [a, b] = jars[(row * 3 + k) % jars.length];
      const x = 3 + k * 6.5, y = 4 + row * 10;
      rect(g, x, y + 1, 5, 6, a); rect(g, x + 3, y + 2, 1, 4, b); rect(g, x, y, 5, 1, '#d8d0c4'); px(g, x + 1, y + 2, '#fffdf6');
    }
  }),
  stove: () => canvasOf(30, 30, (g) => {
    rect(g, 0, 4, 30, 26, '#8f8270'); rect(g, 0, 4, 30, 2, '#b8aa93');
    for (let y = 8; y < 30; y += 4) for (let x = (y / 4) % 2 ? 0 : 4; x < 30; x += 8) rect(g, x, y, 7, 3, '#a39a8c');
    rect(g, 7, 13, 16, 14, '#2a1d2e'); rect(g, 8, 14, 14, 12, '#3a2430');
    rect(g, 2, 0, 26, 4, '#6a4228');
  }),
  fire: (f) => canvasOf(14, 12, (g) => {
    const cols = ['#ffe07a', '#ffb040', '#f06a30'];
    for (let x = 0; x < 14; x++) {
      const h = 4 + Math.round(Math.abs(Math.sin(x * 1.3 + f * 2)) * 6);
      for (let y = 0; y < h; y++) px(g, x, 11 - y, cols[Math.min(2, Math.floor((y / h) * 3 + (x % 3 === f % 3 ? 0.5 : 0)))]);
    }
  }, false),
  crate: () => canvasOf(22, 18, (g) => {
    rect(g, 0, 4, 22, 14, '#b07a48'); for (let x = 0; x < 22; x += 5) rect(g, x, 4, 1, 14, '#8a5a36');
    rect(g, 0, 4, 22, 2, '#c89a64');
    // spilling materials
    rect(g, 3, 1, 5, 4, '#c89a64'); rect(g, 9, 0, 3, 5, '#fbf7ef'); rect(g, 13, 2, 6, 3, '#a39a8c'); px(g, 16, 1, '#8ad8e8');
  }),
  mailbox: () => canvasOf(12, 22, (g) => {
    rect(g, 5, 10, 2, 12, '#6a4228');
    rect(g, 1, 2, 10, 9, '#d9393c'); rect(g, 1, 1, 10, 2, '#ff7a6b'); rect(g, 3, 5, 6, 1, '#6e1a28');
    rect(g, 10, 3, 2, 4, '#f2c14e');
  }),
  bowl: () => canvasOf(10, 5, (g) => { rect(g, 0, 1, 10, 3, '#5a8fd0'); rect(g, 1, 4, 8, 1, '#35629e'); rect(g, 1, 0, 8, 1, '#c89a64'); }),
  bowlEmpty: () => canvasOf(10, 5, (g) => { rect(g, 0, 1, 10, 3, '#5a8fd0'); rect(g, 1, 4, 8, 1, '#35629e'); rect(g, 1, 1, 8, 1, '#2a4a7a'); }),
  petbed: (col) => canvasOf(22, 10, (g) => {
    rect(g, 0, 2, 22, 8, shadeHex(col, 0.8)); rect(g, 1, 1, 20, 2, col); rect(g, 3, 4, 16, 4, tintHex(col, 0.5));
  }),
  plant: () => { const c = treeCanvas('bush', 77); const out = makeCanvas(20, 26); const g = ctx2d(out); g.drawImage(c, 0, 0); rect(g, 5, 16, 10, 9, '#c9563f'); rect(g, 4, 16, 12, 2, '#e27b5c'); return outlineCanvas(out); },
  cabinet: () => canvasOf(22, 38, (g) => {
    rect(g, 0, 0, 22, 38, '#6a4228'); rect(g, 2, 2, 18, 30, '#bfe0e8'); rect(g, 2, 2, 18, 30, 'rgba(160,210,230,0.9)');
    for (const y of [11, 21]) rect(g, 2, y, 18, 2, '#8a5a36');
    rect(g, 10, 2, 1, 30, '#8a5a36');
    px(g, 4, 4, '#fffdf6'); px(g, 5, 5, '#fffdf6'); px(g, 13, 14, '#fffdf6');
    rect(g, 0, 32, 22, 6, '#8a5a36');
  }),
  boards: () => canvasOf(32, 34, (g) => {
    for (const [y, a] of [[6, 0.1], [15, -0.08], [24, 0.06]]) {
      for (let x = 0; x < 32; x++) rect(g, x, Math.round(y + (x - 16) * a), 1, 5, x % 11 === 0 ? '#8a5a36' : '#b07a48');
      px(g, 3, Math.round(y + (3 - 16) * a) + 2, '#3a2a22'); px(g, 28, Math.round(y + (28 - 16) * a) + 2, '#3a2a22');
    }
  }),
  window: () => canvasOf(24, 26, (g) => {
    rect(g, 0, 0, 24, 26, '#fff8ec'); rect(g, 2, 2, 20, 21, '#000');
    rect(g, 11, 2, 2, 21, '#fff8ec'); rect(g, 2, 12, 20, 2, '#fff8ec');
    rect(g, 0, 23, 24, 3, '#b07a48');
  }, false),
  curtains: (col) => canvasOf(30, 28, (g) => {
    for (let x = 0; x < 6; x++) { rect(g, x, 0, 1, 28 - x * 2, x % 2 ? col : shadeHex(col, 0.85)); rect(g, 29 - x, 0, 1, 28 - x * 2, x % 2 ? col : shadeHex(col, 0.85)); }
    rect(g, 0, 0, 30, 2, '#6a4228');
  }, false),
  bell: () => canvasOf(10, 8, (g) => { disc(g, 5, 5, 3.5, '#f2c14e'); rect(g, 1, 7, 9, 1, '#6a4228'); px(g, 5, 1, '#c48a2c'); px(g, 3, 4, '#fff0a0'); }),
  ledger: () => canvasOf(14, 6, (g) => { rect(g, 0, 1, 14, 5, '#2e3a6b'); rect(g, 1, 0, 12, 2, '#fffdf6'); rect(g, 6, 0, 2, 6, '#d9393c'); }),
  sortSign: () => canvasOf(40, 10, (g) => {
    const cols = ['#e88a4a', '#8a5a36', '#8a70b0'];
    for (let k = 0; k < 3; k++) { rect(g, k * 14, 2, 12, 8, cols[k]); rect(g, k * 14 + 1, 0, 10, 3, tintHex(cols[k], 0.3)); }
  }),
  frame: (seed) => canvasOf(18, 14, (g) => {
    const r = rng(seed);
    rect(g, 0, 0, 18, 14, '#b07a48'); rect(g, 2, 2, 14, 10, r.pick(['#8ecae6', '#f4b89a', '#bfe0c9']));
    rect(g, 2, 8, 14, 4, r.pick(['#5aa84a', '#2f78a8', '#79ad45']));
    disc(g, 12, 5, 1.5, '#fff0a0');
    rect(g, 4, 6, 3, 3, '#c9563f');
  }),
  broomRack: () => canvasOf(20, 30, (g) => {
    rect(g, 0, 4, 20, 2, '#6a4228');
    for (const x of [4, 10, 15]) { rect(g, x, 5, 1, 17, '#b27a45'); rect(g, x - 2, 20, 5, 9, '#efcb72'); rect(g, x - 2, 20, 5, 1, '#d9393c'); }
  }),
  zzzLamp: () => canvasOf(8, 18, (g) => { rect(g, 3, 6, 2, 11, '#3a3346'); rect(g, 1, 17, 6, 1, '#3a3346'); rect(g, 0, 0, 8, 6, '#ffe8a0'); rect(g, 1, 1, 6, 1, '#fff8d0'); }),
};

export class Hotel {
  constructor(game) {
    this.name = 'hotel';
    this.game = game;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#1b1626');
    this.camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.5, 200);
    this.grid = new Int8Array(HW * HD); // 0 floor, 1 blocked
    this.fx = new Particles(600);
    this.glowFx = new Particles(300, { additive: true });
    this.scene.add(this.fx.points, this.glowFx.points);
    this.roomObjs = [];
    this.guestActors = {};
    this.messMeshes = [];
    this.decorMeshes = [];
    this.lights = [];
    this.pool = [];
    for (let i = 0; i < 6; i++) { const l = new THREE.PointLight('#ffc070', 0, 7, 1.5); this.pool.push(l); this.scene.add(l); }
    this.build();
    this.witch = new Witch(this);
    this.witch.addTo(this.scene);
    const sheet = sootSheet();
    this.soot = new Actor([sheet.walk[0], sheet.walk[1], sheet.sit, sheet.sleep], { key: 'soot', kind: 'cat', shadowR: 0.3, frameMap: { idle: [2], walk: [0, 1], sleep: [3] } });
    this.soot.addTo(this.scene);
    this.followers = [];
    this.trail = [];
    this.cam = { target: new THREE.Vector3(15, 0, 6), dist: 17, pitch: 0.74 };
    this.bounds = null;
    this.colliders = [];
  }

  // ------------------------------------------------------------------ world interface
  heightAt() { return 0; }
  groundY() { return 0; }
  walkable(tx, tz) {
    if (tx < 0 || tz < 0 || tx >= HW || tz >= HD) return false;
    return this.grid[tz * HW + tx] === 0;
  }
  canWalkBox(x, z, r) {
    for (const [dx, dz] of [[-r, -r], [r, -r], [-r, r], [r, r]]) if (!this.walkable(Math.floor(x + dx), Math.floor(z + dz))) return false;
    return true;
  }
  canLand() { return false; }
  block(x0, z0, w, d) { for (let z = z0; z < z0 + d; z++) for (let x = x0; x < x0 + w; x++) if (x >= 0 && z >= 0 && x < HW && z < HD) this.grid[z * HW + x] = 1; }
  unblock(x0, z0, w, d) { for (let z = z0; z < z0 + d; z++) for (let x = x0; x < x0 + w; x++) if (x >= 0 && z >= 0 && x < HW && z < HD) this.grid[z * HW + x] = 0; }

  // ------------------------------------------------------------------ construction
  floor(x0, z0, w, d, tex) {
    const t = tex.clone();
    t.needsUpdate = true;
    t.repeat.set(w / 2, d / 2);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), lam({ map: t }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(x0 + w / 2, 0, z0 + d / 2);
    m.receiveShadow = true;
    m.material.userData.seeThrough = true; // floors never dither
    this.scene.add(m);
    return m;
  }
  wall(x0, z0, w, d, h, paper, opts = {}) {
    // box wall; front face (+z) gets wallpaper + wainscot, top gets a wood cap
    const g = new THREE.Group();
    const pt = paper.clone(); pt.needsUpdate = true; pt.repeat.set(Math.max(w, d) / 2, h / 2);
    const side = lam({ map: pt });
    const cap = lam({ color: '#6a4228' });
    const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [side, side, cap, cap, side, side]);
    box.position.set(x0 + w / 2, h / 2, z0 + d / 2);
    box.castShadow = !opts.noShadow;
    box.receiveShadow = true;
    g.add(box);
    if (h > 1 && !opts.noWainscot) {
      const wt = this.wainscot.clone(); wt.needsUpdate = true; wt.repeat.set(Math.max(w, d) / 2, 1);
      const wm = new THREE.Mesh(new THREE.BoxGeometry(w + 0.04, 0.9, d + 0.04), lam({ map: wt }));
      wm.position.set(x0 + w / 2, 0.45, z0 + d / 2);
      wm.receiveShadow = true;
      g.add(wm);
    }
    this.scene.add(g);
    return g;
  }
  sprite(canvas, x, z, opts = {}) {
    const bb = new Billboard([canvas], { key: opts.key || 'hotel-' + Math.random(), shadow: opts.shadow !== false, scale: opts.scale || 1, basic: opts.basic, emissive: opts.emissive });
    bb.mesh.position.set(x, opts.y || 0, z);
    this.scene.add(bb.mesh);
    return bb;
  }
  box(x, z, w, d, h, mat, y = 0) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y + h / 2, z);
    m.castShadow = true;
    m.receiveShadow = true;
    this.scene.add(m);
    return m;
  }
  // Light "spots" are virtual; a small pool of real PointLights follows the camera (cheap shaders).
  pointLight(x, y, z, color = '#ffb866', intensity = 4, range = 7) {
    const spot = { pos: new THREE.Vector3(x, y, z), color: new THREE.Color(color), base: intensity, range, visible: true };
    this.lights.push(spot);
    return spot;
  }

  build() {
    const woodF = makeFloorTexture('wood', 3), tileF = makeFloorTexture('tile', 4), stoneF = makeFloorTexture('stone', 5);
    const cream = makeWallpaperTexture('cream'), rose = makeWallpaperTexture('rose');
    this.wainscot = makeWainscotTexture();
    const S = this.scene;
    // ground outside the building (dark soil so the edges read)
    const out = new THREE.Mesh(new THREE.PlaneGeometry(120, 60), lam({ color: '#2a2232' }));
    out.rotation.x = -Math.PI / 2; out.position.set(HW / 2, -0.02, HD / 2);
    out.material.userData.seeThrough = true;
    S.add(out);
    this.floor(1, 1, 9, 5, tileF);     // kitchen
    this.floor(1, 6, 9, 5, stoneF);    // workshop
    this.floor(10, 1, 12, 10, woodF);  // lobby
    this.floor(22, 1, 24, 10, woodF);  // guest wing
    // block everything, then carve walkable floor
    this.grid.fill(1);
    this.unblock(1, 1, 45, 10);
    // outer walls
    this.wall(0, 0, HW, 1, WALL_H, cream);                   // back wall
    this.wall(0, 0, 1, HD, WALL_H, cream);                   // west
    this.wall(HW - 1, 0, 1, HD, WALL_H, cream);              // east
    this.wall(0, HD - 1, 15, 1, LOW, cream, { noWainscot: true });           // south (low, cut-away) left of door
    this.wall(17, HD - 1, HW - 17, 1, LOW, cream, { noWainscot: true });     // south right of door
    this.block(0, 11, HW, 1); this.unblock(15, 11, 2, 1);
    // door posts (low, so they never hide the witch)
    const frame = lam({ color: '#6a4228' });
    this.box(14.9, 11.5, 0.25, 0.9, 0.9, frame); this.box(17.1, 11.5, 0.25, 0.9, 0.9, frame);
    const mat = drawTexture(32, 16, (g) => { rect(g, 0, 0, 32, 16, '#8e3a2d'); rect(g, 2, 2, 28, 12, '#c9563f'); for (let x = 4; x < 28; x += 4) rect(g, x, 7, 2, 2, '#f2c14e'); });
    const doormat = new THREE.Mesh(new THREE.PlaneGeometry(2, 1), lam({ map: mat }));
    doormat.rotation.x = -Math.PI / 2; doormat.position.set(16, 0.01, 10.4); doormat.receiveShadow = true;
    doormat.material.userData.seeThrough = true;
    S.add(doormat);
    // kitchen/workshop divider (low) with a gap
    this.wall(1, 6, 3, 0.4, LOW + 0.3, cream, { noWainscot: true });
    this.wall(6, 6, 4, 0.4, LOW + 0.3, cream, { noWainscot: true });
    this.block(1, 6, 3, 1); this.block(6, 6, 4, 1);
    // west wing / lobby divider (tall, with door gap)
    this.wall(10, 1, 0.4, 3, WALL_H, cream);
    this.wall(10, 7, 0.4, 4, WALL_H, cream);
    this.block(9, 1, 1, 3); this.block(9, 7, 1, 4);

    // --- back-wall windows (sky shows through) and wall decor
    this.windows = [];
    const winTex = pixelTexture(ART.window());
    // soft sunbeams slanting in from each window (additive, only by day)
    const beamTex = drawTexture(8, 32, (g) => {
      for (let y = 0; y < 32; y++) { const a = Math.pow(1 - y / 32, 1.4) * 0.55; g.fillStyle = `rgba(255,236,190,${a})`; g.fillRect(0, y, 8, 1); }
    });
    beamTex.magFilter = THREE.LinearFilter; beamTex.minFilter = THREE.LinearFilter;
    this.beamMat = new THREE.MeshBasicMaterial({ map: beamTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.5, side: THREE.DoubleSide, fog: false });
    this.beams = [];
    const addBeam = (x) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 4.2), this.beamMat);
      m.position.set(x + 0.45, 1.05, 2.45);
      m.rotation.set(-1.05, 0, -0.18);
      m.renderOrder = 4;
      S.add(m);
      this.beams.push(m);
    };
    const addWindow = (x, y = 1.9) => {
      addBeam(x);
      const skyMat = new THREE.MeshBasicMaterial({ color: '#8ecae6' });
      const sky = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.3), skyMat);
      sky.position.set(x, y, 1.02);
      const fr = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.62), lam({ map: winTex, transparent: true, alphaTest: 0.5 }));
      fr.material.map.colorSpace = THREE.SRGBColorSpace;
      fr.position.set(x, y - 0.03, 1.04);
      // make the black panes see-through by alpha: treat pure black as transparent
      fr.material.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <alphatest_fragment>', 'if (diffuseColor.r + diffuseColor.g + diffuseColor.b < 0.02) discard;\n#include <alphatest_fragment>'); };
      S.add(sky, fr);
      this.windows.push(skyMat);
    };
    [3, 7.5, 12.5, 19.5].forEach((x) => addWindow(x));
    for (let i = 0; i < 6; i++) addWindow(roomBounds(i).cx);
    this.sprite(ART.frame(3), 15.5, 1.1, { y: 1.5, shadow: false, key: 'frame3' });
    this.sprite(ART.frame(8), 17.3, 1.1, { y: 1.7, shadow: false, key: 'frame8' });

    // --- kitchen
    this.sprite(ART.shelf(), 7.5, 1.4, { key: 'shelf' });
    this.block(6, 1, 3, 1);
    this.sprite(ART.stove(), 2.4, 1.4, { key: 'stove' });
    this.block(1, 1, 3, 1);
    this.fire = [0, 1, 2].map((f) => pixelTexture(ART.fire(f)));
    this.fireBB = this.sprite(ART.fire(0), 2.4, 1.55, { y: 0.28, shadow: false, key: 'fire', basic: true });
    this.fireBB.mesh.material = new THREE.MeshBasicMaterial({ map: this.fire[0], transparent: true, alphaTest: 0.3, color: new THREE.Color(2.2, 1.6, 1.0) });
    this.pointLight(2.4, 1.0, 2.4, '#ff9a40', 5, 7);
    // cauldron
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.48, 0.8, 12), lam({ color: '#2f2a38' }));
    pot.position.set(4.5, 0.55, 3.6); pot.castShadow = true;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.07, 6, 16), lam({ color: '#4a4458' }));
    rim.rotation.x = Math.PI / 2; rim.position.set(4.5, 0.95, 3.6);
    this.brewMat = lam({ color: '#7ad870', emissive: new THREE.Color('#3aa040'), emissiveIntensity: 0.9 });
    const brew = new THREE.Mesh(new THREE.CircleGeometry(0.56, 12), this.brewMat);
    brew.rotation.x = -Math.PI / 2; brew.position.set(4.5, 0.9, 3.6);
    for (const [dx, dz] of [[-0.35, -0.25], [0.35, -0.25], [0, 0.4]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.35, 0.1), lam({ color: '#2f2a38' }));
      leg.position.set(4.5 + dx, 0.17, 3.6 + dz);
      S.add(leg);
    }
    S.add(pot, rim, brew);
    this.cauldronPos = new THREE.Vector3(4.5, 0.95, 3.6);
    this.block(4, 3, 1, 1);
    this.brewLight = this.pointLight(4.5, 1.6, 3.9, '#7aff80', 1.2, 4);
    // prep table
    const woodMat = lam({ map: drawTexture(16, 16, (g) => { rect(g, 0, 0, 16, 16, '#a8703f'); for (let y = 0; y < 16; y += 4) rect(g, 0, y + 3, 16, 1, '#7e5030'); }, { repeat: true }) });
    this.box(7.5, 4.2, 2.2, 0.9, 0.8, woodMat);
    this.block(6, 4, 3, 1);
    for (const [k, id] of [[0, 'carrot'], [1, 'fish'], [2, 'apple']]) this.sprite(itemCanvas(id), 6.8 + k * 0.6, 4.2, { y: 0.8, scale: 0.6, shadow: false, key: 'prep' + id });

    // --- workshop
    this.box(4.5, 9.4, 2.6, 1.0, 0.85, woodMat);
    this.block(3, 9, 3, 1);
    for (const [k, id] of [[0, 'twine'], [1, 'wool'], [2, 'toy_yarn']]) this.sprite(itemCanvas(id), 3.7 + k * 0.7, 9.4, { y: 0.85, scale: 0.6, shadow: false, key: 'bench' + id });
    this.sprite(ART.crate(), 1.9, 8.6, { key: 'crate' });
    this.block(1, 8, 2, 1);
    this.sprite(ART.broomRack(), 8.5, 7.3, { key: 'brooms' });
    this.pointLight(4.5, 2.6, 8.5, '#ffc070', 3, 7);

    // --- lobby
    const deskMat = lam({ map: drawTexture(32, 16, (g) => { rect(g, 0, 0, 32, 16, '#8a5a36'); rect(g, 0, 0, 32, 3, '#b07a48'); for (let x = 2; x < 32; x += 8) rect(g, x, 5, 6, 8, '#6a4228'); }, { repeat: true }) });
    this.box(15.5, 4.4, 3.4, 0.9, 1.0, deskMat);
    this.block(14, 4, 4, 1);
    this.sprite(ART.bell(), 14.6, 4.3, { y: 1.0, scale: 0.8, shadow: false, key: 'bell' });
    this.sprite(ART.ledger(), 16.2, 4.3, { y: 1.0, scale: 0.9, shadow: false, key: 'ledger' });
    this.sprite(ART.zzzLamp(), 17.0, 4.3, { y: 1.0, scale: 0.9, shadow: false, key: 'desklamp' });
    this.pointLight(16.5, 2.0, 5.0, '#ffc070', 3.5, 7);
    // mailbox by the door
    this.mailbox = this.sprite(ART.mailbox(), 13.4, 10.2, { key: 'mailbox' });
    this.block(13, 10, 1, 1);
    // sorting table with three bins
    this.box(19.2, 8.2, 2.2, 1.1, 0.78, woodMat);
    this.block(18, 8, 2, 1);
    this.sprite(ART.sortSign(), 19.2, 8.25, { y: 0.78, scale: 0.9, shadow: false, key: 'sortbins' });
    // curio cabinet
    this.sprite(ART.cabinet(), 11.6, 1.4, { key: 'cabinet' });
    this.block(11, 1, 1, 1);
    // your bed & Soot's cushion
    const quilt = lam({ map: drawTexture(32, 32, (g) => { rect(g, 0, 0, 32, 32, '#2e3a6b'); for (let y = 0; y < 32; y += 8) for (let x = (y / 8) % 2 ? 4 : 0; x < 32; x += 8) rect(g, x, y, 4, 4, '#46558f'); rect(g, 0, 0, 32, 8, '#fff6e4'); }, { repeat: false }) });
    this.box(19.8, 2.4, 1.6, 2.4, 0.55, [woodMat, woodMat, quilt, woodMat, woodMat, woodMat]);
    const pillow = this.box(19.8, 1.5, 1.2, 0.5, 0.18, lam({ color: '#fffdf6' }), 0.55);
    this.block(19, 1, 2, 3);
    this.sprite(ART.petbed('#d9393c'), 18.2, 2.2, { key: 'sootbed' });
    this.sprite(ART.plant(), 12.2, 9.9, { key: 'plant1' });
    this.block(12, 9, 1, 1);
    this.sprite(ART.plant(), 20.7, 9.9, { key: 'plant2' });
    this.block(20, 9, 1, 1);
    // rug
    const rugTex = drawTexture(48, 32, (g) => {
      rect(g, 0, 0, 48, 32, '#a02538'); rect(g, 2, 2, 44, 28, '#d9393c'); rect(g, 5, 5, 38, 22, '#2e3a6b');
      for (let x = 8; x < 40; x += 6) for (let y = 8; y < 24; y += 6) { px(g, x, y, '#f2c14e'); px(g, x + 1, y + 1, '#f2c14e'); }
    });
    const rug = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 3), lam({ map: rugTex }));
    rug.rotation.x = -Math.PI / 2; rug.position.set(16, 0.012, 7.4); rug.receiveShadow = true;
    rug.material.userData.seeThrough = true;
    S.add(rug);
    this.pointLight(12.5, 2.3, 8.0, '#ffc070', 3, 7);
    // a warm ceiling lamp over the rug that only matters after dark
    this.nightLight = new THREE.PointLight('#ffc27a', 0, 9, 1.3);
    this.nightLight.position.set(16, 3.2, 7.2);
    S.add(this.nightLight);
    this.pointLight(19.5, 2.3, 3.2, '#ffc070', 2.5, 6);

    // --- guest rooms
    const paperBy = ROOM_COLORS.map((c) => makeWallpaperTexture(c));
    for (let i = 0; i < 6; i++) {
      const rb = roomBounds(i);
      const x0 = rb.x0 - 1;
      const obj = { i, rb, meshes: [] };
      // side wall (between rooms) — full height, thin
      this.wall(x0 + 0.3, 1, 0.4, 6.4, WALL_H, i === 0 ? cream : paperBy[i]); this.block(x0, 1, 1, 7);
      // back wallpaper panel for this room
      const pt = paperBy[i].clone(); pt.needsUpdate = true; pt.repeat.set(1.5, 1.5);
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(3, WALL_H), lam({ map: pt }));
      panel.position.set(x0 + 2.5, WALL_H / 2, 1.005);
      S.add(panel);
      // low front wall with door gap
      this.wall(x0 + 0.7, 7.3, 1.35, 0.35, LOW, paperBy[i], { noWainscot: true });
      this.wall(x0 + 2.95, 7.3, 1.35, 0.35, LOW, paperBy[i], { noWainscot: true });
      this.block(x0, 7, 2, 1); this.block(x0 + 3, 7, 1, 1);
      // pet bed, bowls
      obj.bed = this.sprite(ART.petbed(['#d9393c', '#4f8a6a', '#3f6fa8', '#f2c14e', '#8a5a8a', '#e27b5c'][i]), rb.cx + 0.6, 1.9, { key: 'petbed' + i });
      obj.bowl = this.sprite(ART.bowl(), rb.x0 + 0.5, 5.9, { key: 'bowl', scale: 0.9 });
      obj.bowlEmpty = this.sprite(ART.bowlEmpty(), rb.x0 + 0.5, 5.9, { key: 'bowlE', scale: 0.9 });
      obj.bowl.mesh.visible = false;
      // boards for locked rooms
      obj.boards = this.sprite(ART.boards(), rb.door.x, 7.6, { key: 'boards' });
      obj.lockCrate = this.sprite(ART.crate(), rb.cx, 4, { key: 'lockcrate' });
      obj.light = this.pointLight(rb.cx, 2.4, 4.2, '#ffc070', 2.2, 5.5);
      this.roomObjs.push(obj);
    }
    // hallway lights
    for (const x of [26, 34, 42]) this.pointLight(x, 2.3, 9.2, '#ffc070', 2.4, 6.5);

    // lighting
    this.hemi = new THREE.HemisphereLight('#fff0dc', '#4a3a40', 0.9);
    S.add(this.hemi);
    this.sun = new THREE.DirectionalLight('#fff0d8', 1.2);
    this.sun.position.set(HW / 2 - 12, 22, 20);
    this.sun.target.position.set(HW / 2, 0, 5);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 1024);
    const sc = this.sun.shadow.camera;
    sc.left = -28; sc.right = 28; sc.top = 12; sc.bottom = -12; sc.near = 1; sc.far = 70;
    this.sun.shadow.bias = -0.0008;
    this.sun.shadow.normalBias = 0.03;
    S.add(this.sun, this.sun.target);

    applySeeThroughTree(this.scene);
    this.messPool = [];
  }

  // ------------------------------------------------------------------ dynamic state from the game
  syncRooms(state) {
    this.roomObjs.forEach((o) => {
      const room = state.rooms[o.i];
      const open = room.unlocked;
      o.boards.mesh.visible = !open;
      o.lockCrate.mesh.visible = !open;
      o.light.visible = open;
      const rb = o.rb;
      if (open) this.unblock(rb.door.x | 0, 7, 1, 1); else this.block(rb.door.x | 0, 7, 1, 1);
      const guest = state.guests.find((g) => g.room === o.i && g.status === 'in-room');
      o.bowl.mesh.visible = !!(guest && guest.fedRecently);
      o.bowlEmpty.mesh.visible = open && !o.bowl.mesh.visible;
      // decor
      const sig = (room.decor || []).join(',');
      if (o.decorSig !== sig) {
        o.decorSig = sig;
        (o.decor || []).forEach((m) => this.scene.remove(m));
        o.decor = (room.decor || []).map((id, k) => {
          const spot = [[rb.x0 + 0.6, 2.2], [rb.x1 - 0.6, 5.4], [rb.cx, 4.8]][k] || [rb.cx, 4];
          const bb = new Billboard([itemCanvas(id)], { key: 'decor-' + id, scale: id === 'decor_lamp' || id === 'decor_perch' ? 1.4 : 1.2 });
          bb.mesh.position.set(spot[0], 0, spot[1]);
          if (id === 'decor_lamp') bb.mesh.material = new THREE.MeshLambertMaterial({ map: bb.sheet.tex, alphaTest: 0.5, emissive: new THREE.Color('#ffe080'), emissiveMap: bb.sheet.tex, emissiveIntensity: 0.8 });
          this.scene.add(bb.mesh);
          return bb.mesh;
        });
      }
      // messes
      const messes = open ? room.messes || [] : [];
      const msig = messes.map((m) => m.x.toFixed(2)).join(',');
      if (o.messSig !== msig) {
        o.messSig = msig;
        (o.messMeshes || []).forEach((m) => this.scene.remove(m));
        o.messMeshes = messes.map((m) => {
          const bb = new Billboard([iconCanvas('mess')], { key: 'mess', shadow: false, scale: 1.2 });
          bb.mesh.position.set(m.x, 0, m.z);
          this.scene.add(bb.mesh);
          return bb.mesh;
        });
      }
    });
  }

  syncGuests(state) {
    const inRoom = state.guests.filter((g) => g.status === 'in-room');
    const ids = new Set(inRoom.map((g) => g.id));
    for (const [id, a] of Object.entries(this.guestActors)) {
      if (!ids.has(+id)) { a.removeFrom(this.scene); delete this.guestActors[id]; }
    }
    for (const g of inRoom) {
      let a = this.guestActors[g.id];
      if (!a) {
        a = new Actor([petCanvas(g.species)], { key: 'pet-' + g.species, kind: 'pet', hop: true, shadowR: 0.3, speed: 1.4 });
        const rb = roomBounds(g.room);
        a.place(rb.cx + (Math.random() - 0.5), 0, rb.cz + (Math.random() - 0.5) * 2);
        a.addTo(this.scene);
        a.guest = g;
        this.guestActors[g.id] = a;
      }
      a.guest = g;
    }
  }

  setFollowers(list) {
    const keys = list.map((l) => l.key).join(',');
    if (keys === this._followKeys) return;
    this._followKeys = keys;
    for (const f of this.followers) f.removeFrom(this.scene);
    this.followers = list.map((l, i) => {
      const a = new Actor([petCanvas(l.species)], { key: 'pet-' + l.species, kind: 'pet', hop: true, shadowR: 0.3 });
      a.place(this.witch.pos.x - 0.6 - i * 0.5, 0, this.witch.pos.z + 0.3);
      a.addTo(this.scene);
      a.data = l;
      return a;
    });
  }

  // ------------------------------------------------------------------ per-frame
  update(dt, t, hour, weather, S) {
    const w = this.witch;
    // followers trail
    const last = this.trail[this.trail.length - 1];
    if (!last || dist(last.x, last.z, w.pos.x, w.pos.z) > 0.15) { this.trail.push({ x: w.pos.x, z: w.pos.z }); if (this.trail.length > 80) this.trail.shift(); }
    [this.soot, ...this.followers].forEach((a, i) => {
      const idx = this.trail.length - 1 - (i + 1) * 5;
      const tp = this.trail[Math.max(0, idx)] || w.pos;
      if (idx >= 0) a.moveToward(tp.x, tp.z, dt, null, 4, 0.05);
      else { a.vel.x = damp(a.vel.x, 0, 10, dt); a.vel.z = damp(a.vel.z, 0, 10, dt); }
      a.update(dt, null);
    });
    // guests wander inside their rooms, sleep at night
    const night = hour >= 22 || hour < 6;
    for (const a of Object.values(this.guestActors)) {
      const g = a.guest;
      const rb = roomBounds(g.room);
      const nocturnal = g.species === 'owl';
      a.sleeping = nocturnal ? !night && hour > 9 && hour < 17 : night;
      if (a.sleeping) {
        a.moveToward(rb.cx + 0.6, 2.4, dt, this, 1.2, 0.1);
      } else {
        if (!a.target || a.t > (a.nextT || 0)) {
          a.nextT = a.t + 1.5 + Math.random() * 4;
          a.target = Math.random() < 0.35 ? null : { x: rb.x0 + 0.4 + Math.random() * (rb.x1 - rb.x0 - 0.8), z: rb.z0 + 0.8 + Math.random() * (rb.z1 - rb.z0 - 1.4) };
        }
        if (a.target) { if (a.moveToward(a.target.x, a.target.z, dt, this, a.speed, 0.1)) a.target = null; }
        else { a.vel.x = damp(a.vel.x, 0, 8, dt); a.vel.z = damp(a.vel.z, 0, 8, dt); }
      }
      a.update(dt, null);
      a.pos.x = clamp(a.pos.x, rb.x0 + 0.3, rb.x1 - 0.3);
      a.pos.z = clamp(a.pos.z, rb.z0 + 0.5, rb.z1 - 0.4);
      // bubble
      a.setBubble(...this.game.guestBubble(g, a.sleeping));
    }
    // fire flicker & brew bubbles
    this.fireBB.mesh.material.map = this.fire[Math.floor(t * 8) % 3];
    if (Math.random() < dt * 8) {
      const p = this.cauldronPos;
      this.glowFx.spawn({ x: p.x + (Math.random() - 0.5) * 0.7, y: p.y, z: p.z + (Math.random() - 0.5) * 0.5, vy: 0.6, life: 0.9, size: 0.1, color: '#9aff90', shape: 2, alpha: 0.9 });
    }
    if (Math.random() < dt * 2) this.fx.spawn({ x: 2.4 + (Math.random() - 0.5) * 0.4, y: 1.2, z: 1.6, vy: 0.8, vx: 0.1, life: 1.5, size: 0.14, color: '#8a8090', alpha: 0.4, wobble: 0.3 });
    const f = this.cam.target;
    const near = this.lights.filter((l) => l.visible).map((l) => ({ l, d: Math.abs(l.pos.x - f.x) + Math.abs(l.pos.z - f.z) * 0.5 })).sort((a, b) => a.d - b.d);
    this.pool.forEach((pl, i) => {
      const s = near[i];
      if (!s || s.d > 16) { pl.intensity = 0; return; }
      pl.position.copy(s.l.pos);
      pl.color.copy(s.l.color);
      pl.distance = s.l.range;
      pl.intensity = s.l.base * (0.92 + Math.sin(t * 9 + s.l.pos.x) * 0.04 + Math.random() * 0.04) * Math.min(1, (17 - s.d) / 4);
    });
    // time-of-day: windows show the sky, sunlight through windows by day
    const day = S && !S.isNight;
    for (const m of this.windows) m.color.copy(S ? S.horizon : new THREE.Color('#8ecae6')).lerp(S ? S.top : new THREE.Color('#5aa8e0'), 0.5).multiplyScalar(day ? 1.1 : 0.7);
    this.sun.intensity = day ? 0.9 * (S.sunIntensity / 2) + 0.2 : 0.15;
    const beamK = S ? Math.max(0, Math.min(1, (S.sunIntensity - 0.6) / 1.2)) * (1 - (this.game.state.weather.cloud || 0) * 0.7) : 0;
    this.beamMat.opacity = day ? 0.55 * beamK : 0;
    this.beamMat.color.copy(S ? S.sun : new THREE.Color(1, 1, 1));
    this.sun.color.copy(S ? S.sun : new THREE.Color('#fff'));
    this.hemi.intensity = day ? 0.95 : 0.8;
    this.hemi.color.set(day ? '#fff0dc' : '#b0a0c8');
    this.nightLight.intensity = day ? 0 : 5;
    const post = this.game.renderer.post;
    post.tint.value.set(day ? 1.02 : 0.92, day ? 0.99 : 0.9, day ? 0.95 : 1.0);
    post.lift.value.set(0.02, 0.01, 0.03);
    post.saturation.value = 1.08;
    this.fx.update(dt, t);
    this.glowFx.update(dt, t);
    this.updateCamera(dt);
  }

  updateCamera(dt) {
    const w = this.witch, c = this.cam;
    const tx = clamp(w.pos.x, 8, HW - 8), tz = clamp(w.pos.z, 3.5, 8);
    c.target.x = damp(c.target.x, tx, 6, dt);
    c.target.y = 0.8;
    c.target.z = damp(c.target.z, tz, 6, dt);
    const cam = this.camera;
    cam.position.set(c.target.x, c.target.y + Math.sin(c.pitch) * c.dist, c.target.z + Math.cos(c.pitch) * c.dist);
    cam.lookAt(c.target);
    cam.updateMatrixWorld();
    const post = this.game.renderer.post;
    post.focusDist.value = cam.position.distanceTo(w.pos);
    post.focusBand.value = 3.5;
    post.focusRange.value = 9;
    post.tiltShift.value = 0.45;
    const wp = w.pos.clone(); wp.y += 0.8;
    updateSeeThrough(cam, wp, this.game.renderer, true, false);
    this.fx.uniforms.uScale.value = this.glowFx.uniforms.uScale.value = this.game.renderer.height * this.game.renderer.pixelRatio / (2 * Math.tan((cam.fov * Math.PI) / 360));
  }
  snapCamera() {
    const w = this.witch;
    this.cam.target.set(clamp(w.pos.x, 8, HW - 8), 0.8, clamp(w.pos.z, 3.5, 8));
    this.trail.length = 0;
    this.soot.pos.set(w.pos.x - 0.7, 0, w.pos.z - 0.3);
    this.followers.forEach((f, i) => f.pos.set(w.pos.x + 0.7 + i * 0.5, 0, w.pos.z - 0.3));
    this.updateCamera(1);
  }
  resize(aspect) { this.camera.aspect = aspect; this.camera.updateProjectionMatrix(); }
}
