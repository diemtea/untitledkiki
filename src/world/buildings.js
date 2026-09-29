// Meshes for buildings, landmarks and street props of the seaside town.
import * as THREE from 'three';
import { makeBuildingTextures, makeGableTexture, makeRoofTexture, makeTurretTexture, ROOF_COLORS, drawTexture } from '../gfx/tiles.js';
import { makeCanvas, ctx2d, rect, px, disc, outlineCanvas, pixelTexture, shadeHex, tintHex, PX } from '../gfx/pixel.js';
import { itemCanvas } from '../gfx/sprites.js';
import { Billboard } from '../gfx/billboard.js';
import { rng } from '../core/util.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const glowMaterials = []; // window materials whose emissive follows the time of day

function lambert(opts) { return new THREE.MeshLambertMaterial(opts); }

function wallMat(t) {
  const m = lambert({ map: t.tex, emissiveMap: t.emTex, emissive: new THREE.Color('#ffc46a'), emissiveIntensity: 0 });
  glowMaterials.push(m);
  return m;
}

// Gable roof with ridge along X. Returns group positioned at wall top.
function gableRoof(w, d, pitchH, colors, seed, wall) {
  const g = new THREE.Group();
  const oh = 0.28; // overhang
  const W = w + oh * 2, D = d + oh * 2;
  const rise = pitchH;
  const slope = Math.hypot(D / 2, rise);
  const tex = makeRoofTexture(colors, seed);
  tex.repeat.set(W / 4, slope / 4);
  const mat = lambert({ map: tex, side: THREE.DoubleSide });
  const geo = new THREE.BufferGeometry();
  // two slopes: south (+z) and north (-z)
  const x0 = -W / 2, x1 = W / 2, zS = D / 2, zN = -D / 2, yE = -0.05, yR = rise;
  const v = [
    x0, yR, 0, x1, yR, 0, x1, yE, zS, x0, yE, zS, // south slope
    x1, yR, 0, x0, yR, 0, x0, yE, zN, x1, yE, zN, // north slope
  ];
  const uv = [0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0];
  geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex([0, 3, 1, 1, 3, 2, 4, 7, 5, 5, 7, 6]);
  geo.computeVertexNormals();
  const roof = new THREE.Mesh(geo, mat);
  roof.castShadow = true;
  roof.receiveShadow = true;
  g.add(roof);
  // gable ends
  const gtex = makeGableTexture(wall, seed);
  const gmat = lambert({ map: gtex });
  const tri = new THREE.BufferGeometry();
  const hd = d / 2;
  tri.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, hd, 0, 0, -hd, 0, rise * (hd / (D / 2)), 0], 3));
  tri.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0.5, 0.8], 2));
  tri.setIndex([0, 1, 2]);
  tri.computeVertexNormals();
  for (const side of [-1, 1]) {
    const m = new THREE.Mesh(tri, gmat);
    m.position.x = (side * w) / 2;
    m.rotation.y = side > 0 ? 0 : Math.PI;
    m.material.side = THREE.DoubleSide;
    m.castShadow = true;
    g.add(m);
  }
  // ridge cap
  const cap = new THREE.Mesh(new THREE.BoxGeometry(W + 0.05, 0.14, 0.22), lambert({ color: colors[2] }));
  cap.position.y = rise + 0.02;
  cap.castShadow = true;
  g.add(cap);
  return g;
}

function chimney(x, y, z, color = '#e07050') {
  const tex = drawTexture(16, 24, (g) => {
    rect(g, 0, 0, 16, 24, color);
    for (let yy = 0; yy < 24; yy += 4) for (let xx = (yy / 4) % 2 ? -4 : 0; xx < 16; xx += 8) { rect(g, xx, yy, 7, 3, tintHex(color, 0.2)); rect(g, xx, yy + 3, 8, 1, '#fff0d8'); }
    rect(g, 0, 0, 16, 3, '#6a4a5a');
  });
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.4, 0.55), lambert({ map: tex }));
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

function signCanvas(iconId, board = '#8a5a36') {
  const c = makeCanvas(22, 18), g = ctx2d(c);
  rect(g, 1, 3, 20, 14, board);
  rect(g, 1, 3, 20, 1, tintHex(board, 0.3));
  rect(g, 2, 16, 18, 1, shadeHex(board, 0.7));
  rect(g, 5, 0, 1, 3, '#3a2a22'); rect(g, 16, 0, 1, 3, '#3a2a22');
  const ic = itemCanvas(iconId);
  g.drawImage(ic, 4, 3);
  return outlineCanvas(c);
}

function hotelSignCanvas() {
  const c = makeCanvas(40, 24), g = ctx2d(c);
  rect(g, 1, 4, 38, 19, '#2e3a6b');
  rect(g, 2, 5, 36, 17, '#3d4b80');
  rect(g, 1, 4, 38, 1, '#6a7ab0');
  // broom
  for (let i = 0; i < 22; i++) px(g, 8 + i, 17 - Math.floor(i * 0.45), '#c89a64');
  rect(g, 4, 17, 6, 3, '#efcb72'); rect(g, 3, 18, 2, 2, '#efcb72'); rect(g, 9, 17, 2, 3, '#d9393c');
  // paw
  disc(g, 30, 15, 2.6, '#fff6e4');
  for (const [x, y] of [[26, 11], [29, 9], [32, 9], [35, 11]]) disc(g, x, y, 1, '#fff6e4');
  // stars
  for (const [x, y] of [[6, 8], [18, 7], [23, 12]]) { px(g, x, y, '#f5d24b'); px(g, x - 1, y, '#f5d24b'); px(g, x + 1, y, '#f5d24b'); px(g, x, y - 1, '#f5d24b'); px(g, x, y + 1, '#f5d24b'); }
  rect(g, 8, 0, 1, 4, '#3a2a22'); rect(g, 31, 0, 1, 4, '#3a2a22');
  return outlineCanvas(c);
}

export function buildBuilding(b, levelY) {
  const group = new THREE.Group();
  const baseY = levelY(b.base);
  group.position.set(b.x + b.w / 2, baseY, b.z + b.d / 2);
  const seed = b.seed || b.x * 31 + b.z * 17;
  const r = rng(seed);
  const hTiles = Math.round(b.h * 1);
  const texH = b.h;
  const tx = makeBuildingTextures({ w: b.w, d: b.d, h: texH, seed, wall: b.wall, shutter: b.shutter, timber: b.timber, door: b.door !== false, doorX: b.doorX, doorColor: b.doorColor, arch: b.kind === 'shop' || b.kind === 'hotel', ivy: b.ivy });
  b.wall = tx.wall;
  const front = wallMat(tx.front), side = wallMat(tx.side), back = wallMat(tx.back);
  const plain = lambert({ color: tx.wall });

  if (b.kind === 'tower') {
    // Clock tower: tall body, clock face, pyramid spire
    const body = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), [side, side, plain, plain, front, back]);
    body.position.y = b.h / 2;
    body.castShadow = body.receiveShadow = true;
    group.add(body);
    const faceTex = drawTexture(32, 32, (g) => {
      disc(g, 15.5, 15.5, 14.5, '#3a2f4a');
      disc(g, 15.5, 15.5, 13, '#fff8ec');
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2;
        px(g, 15.5 + Math.sin(a) * 11, 15.5 - Math.cos(a) * 11, '#3a2f4a');
        if (k % 3 === 0) px(g, 15.5 + Math.sin(a) * 10, 15.5 - Math.cos(a) * 10, '#3a2f4a');
      }
    });
    const face = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.2), lambert({ map: faceTex, transparent: true, alphaTest: 0.5, emissive: new THREE.Color('#fff0c8'), emissiveMap: faceTex, emissiveIntensity: 0 }));
    glowMaterials.push(face.material);
    face.position.set(0, b.h - 1.6, b.d / 2 + 0.02);
    group.add(face);
    const handMat = lambert({ color: '#2a1d2e' });
    const hourHand = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.55, 0.02), handMat);
    hourHand.geometry.translate(0, 0.27, 0);
    const minHand = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.85, 0.02), handMat);
    minHand.geometry.translate(0, 0.42, 0);
    hourHand.position.copy(face.position).z += 0.02;
    minHand.position.copy(face.position).z += 0.03;
    group.add(hourHand, minHand);
    group.userData.clock = { hourHand, minHand };
    // belfry band
    const band = new THREE.Mesh(new THREE.BoxGeometry(b.w + 0.3, 0.3, b.d + 0.3), lambert({ color: '#d8c8a8' }));
    band.position.y = b.h;
    group.add(band);
    const spireTex = makeRoofTexture(ROOF_COLORS[3], seed, 2, 2);
    spireTex.repeat.set(2, 2);
    const spire = new THREE.Mesh(new THREE.ConeGeometry(b.w * 0.78, 3.4, 4, 1), lambert({ map: spireTex }));
    spire.rotation.y = Math.PI / 4;
    spire.position.y = b.h + 1.85;
    spire.castShadow = true;
    group.add(spire);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 4), lambert({ color: '#f2c14e', emissive: '#6a4a10' }));
    ball.position.y = b.h + 3.65;
    group.add(ball);
    return group;
  }

  const body = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), [side, side, plain, plain, front, back]);
  body.position.y = b.h / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);
  // base plinth
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(b.w + 0.12, 0.22, b.d + 0.12), lambert({ color: '#b0a08a' }));
  plinth.position.y = 0.1;
  plinth.receiveShadow = true;
  group.add(plinth);

  const roofCols = ROOF_COLORS[(b.roof ?? r.int(0, ROOF_COLORS.length - 1)) % ROOF_COLORS.length];
  const roof = gableRoof(b.w, b.d, Math.max(1.6, b.d * 0.62), roofCols, seed, tx.wall);
  roof.position.y = b.h;
  group.add(roof);
  if (b.kind !== 'barn' && r() < 0.8) group.add(chimney((r() - 0.5) * (b.w - 1.5), b.h + 1.0, -b.d * 0.18));

  const doorWorld = { x: b.door?.x ?? 0, z: b.door?.z ?? 0 };
  const frontZ = b.d / 2;
  if (b.kind === 'shop' && b.sign) {
    const s = new Billboard([signCanvas(b.sign)], { key: 'sign:' + b.sign });
    s.mesh.position.set(b.doorX - b.w / 2 + 0.5 + 1.1, 2.2, frontZ + 0.35);
    group.add(s.mesh);
    // striped awning over the door
    const aw = drawTexture(32, 16, (g) => {
      const c1 = roofCols[0];
      for (let x = 0; x < 32; x += 8) { rect(g, x, 0, 4, 16, '#fff6e4'); rect(g, x + 4, 0, 4, 16, c1); }
      for (let x = 0; x < 32; x += 4) rect(g, x + 1, 14, 2, 2, x % 8 ? c1 : '#fff6e4');
      rect(g, 0, 13, 32, 1, 'rgba(0,0,0,0)');
    });
    const awning = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.9), lambert({ map: aw, side: THREE.DoubleSide, transparent: true, alphaTest: 0.5 }));
    awning.position.set(b.doorX - b.w / 2 + 0.5, 1.75, frontZ + 0.38);
    awning.rotation.x = -0.9;
    awning.castShadow = true;
    group.add(awning);
  }
  if (b.kind === 'hotel') {
    const s = new Billboard([hotelSignCanvas()], { key: 'hotelsign', scale: 1 });
    s.mesh.position.set(b.doorX - b.w / 2 + 0.5 + 2.3, 2.1, frontZ + 0.4);
    group.add(s.mesh);
    // little balcony with flower boxes
    const bal = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.15, 0.8), lambert({ color: '#8a5a36' }));
    bal.position.set(0, 2.5, frontZ + 0.4);
    bal.castShadow = true;
    group.add(bal);
    const railTex = drawTexture(32, 8, (g) => { rect(g, 0, 0, 32, 2, '#6a4228'); for (let x = 1; x < 32; x += 3) rect(g, x, 2, 1, 6, '#6a4228'); });
    const rail = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.6), lambert({ map: railTex, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide }));
    rail.position.set(0, 2.85, frontZ + 0.8);
    group.add(rail);
    // the turret: a round tower in the corner topped with a crooked witch's hat
    const tH = b.h + 2.4, tR = 1.3;
    const tt = makeTurretTexture(tx.wall, tH, seed + 5);
    tt.tex.repeat.set(1, 1);
    const turretMat = lambert({ map: tt.tex, emissiveMap: tt.emTex, emissive: new THREE.Color('#ffc46a'), emissiveIntensity: 0 });
    glowMaterials.push(turretMat);
    const turret = new THREE.Mesh(new THREE.CylinderGeometry(tR, tR + 0.08, tH, 20, 1, true), turretMat);
    const tx0 = b.w / 2 - 0.4, tz0 = frontZ - 0.9;
    turret.position.set(tx0, tH / 2, tz0);
    turret.rotation.y = -0.4;
    turret.castShadow = turret.receiveShadow = true;
    group.add(turret);
    const pts = [];
    const hatH = 4.2;
    pts.push(new THREE.Vector2(0.0, -0.02), new THREE.Vector2(tR + 0.55, 0.0), new THREE.Vector2(tR + 0.45, 0.18), new THREE.Vector2(tR + 0.05, 0.22));
    for (let i = 1; i <= 12; i++) { const t = i / 12; pts.push(new THREE.Vector2((tR + 0.05) * Math.pow(1 - t, 1.35) + 0.03, 0.22 + t * hatH)); }
    const hatGeo = new THREE.LatheGeometry(pts, 18);
    const hp = hatGeo.attributes.position;
    for (let i = 0; i < hp.count; i++) { const y = hp.getY(i); if (y > hatH * 0.55) hp.setX(i, hp.getX(i) + Math.pow((y - hatH * 0.55) / hatH, 2) * 2.4); }
    hatGeo.computeVertexNormals();
    const hatTex = makeRoofTexture(ROOF_COLORS[5], seed + 9, 2, 2);
    hatTex.repeat.set(4, 2);
    const hat = new THREE.Mesh(hatGeo, lambert({ map: hatTex, side: THREE.DoubleSide }));
    hat.position.set(tx0, tH, tz0);
    hat.castShadow = true;
    group.add(hat);
    const band = new THREE.Mesh(new THREE.TorusGeometry(tR + 0.02, 0.1, 6, 20), lambert({ color: '#f2c14e', emissive: new THREE.Color('#6a4a10') }));
    band.rotation.x = Math.PI / 2;
    band.position.set(tx0, tH + 0.42, tz0);
    group.add(band);
    // a golden crescent moon on the tip
    const moonCanvas = makeCanvas(12, 12), mg = ctx2d(moonCanvas);
    for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) {
      const a = (x - 5.5) ** 2 + (y - 6) ** 2 <= 25, b2 = (x - 8) ** 2 + (y - 4.5) ** 2 <= 17;
      if (a && !b2) px(mg, x, y, x < 4 ? '#fff4a8' : '#ffd84a');
    }
    const moon = new Billboard([outlineCanvas(moonCanvas, '#8a5a1a')], { key: 'hotelmoon', shadow: false, basic: true, scale: 1.3 });
    moon.mesh.material = new THREE.MeshBasicMaterial({ map: moon.sheet.tex, alphaTest: 0.5, color: new THREE.Color(1.6, 1.4, 0.9) });
    moon.mesh.position.set(tx0 + 2.4 * Math.pow(0.45, 2) + 0.05, tH + hatH + 0.05, tz0);
    group.add(moon.mesh);
    group.userData.moonTip = moon.mesh;
    // door lanterns
    group.userData.lanterns = [new THREE.Vector3(b.doorX - b.w / 2 + 0.5 - 0.9, 1.9, frontZ + 0.25), new THREE.Vector3(b.doorX - b.w / 2 + 0.5 + 0.9, 1.9, frontZ + 0.25)];
  }
  group.userData.doorWorld = doorWorld;
  return group;
}

// ------------------------------------------------------------------------ props
const PROP_TEX = {};
function woodTex() {
  return (PROP_TEX.wood ||= drawTexture(16, 16, (g) => {
    rect(g, 0, 0, 16, 16, '#8a5a36');
    for (let y = 0; y < 16; y += 4) { rect(g, 0, y, 16, 1, '#a06c42'); rect(g, 0, y + 3, 16, 1, '#5e3a22'); }
  }, { repeat: true }));
}
function ironMat() { return (PROP_TEX.iron ||= lambert({ color: '#2f2a38' })); }

let lampIronGeo = null, lanternMat = null;
export function lampPost() {
  const g = new THREE.Group();
  if (!lampIronGeo) {
    const parts = [];
    const add = (geo, x, y, z, ry = 0) => { if (ry) geo.rotateY(ry); geo.translate(x, y, z); parts.push(geo.toNonIndexed()); };
    add(new THREE.BoxGeometry(0.14, 2.2, 0.14), 0, 1.1, 0);
    add(new THREE.BoxGeometry(0.5, 0.08, 0.08), 0.18, 2.2, 0);
    add(new THREE.ConeGeometry(0.22, 0.18, 4), 0.38, 2.24, 0, Math.PI / 4);
    add(new THREE.BoxGeometry(0.3, 0.2, 0.3), 0, 0.1, 0);
    parts.forEach((p) => p.deleteAttribute('uv'));
    lampIronGeo = mergeGeometries(parts);
    lanternMat = lambert({ color: '#fff0c0', emissive: new THREE.Color('#ffb84a'), emissiveIntensity: 0.2 });
  }
  const iron = new THREE.Mesh(lampIronGeo, ironMat());
  iron.castShadow = true;
  const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.34, 0.26), lanternMat);
  lantern.position.set(0.38, 2.0, 0);
  g.add(iron, lantern);
  g.userData.lanternMat = lanternMat;
  g.userData.lightOffset = new THREE.Vector3(0.38, 1.9, 0.1);
  return g;
}

export function bench() {
  const g = new THREE.Group();
  const m = lambert({ map: woodTex() });
  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.1, 0.4), m);
  seat.position.y = 0.42;
  const back = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.35, 0.08), m);
  back.position.set(0, 0.7, -0.17);
  for (const x of [-0.55, 0.55]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.42, 0.36), ironMat()); l.position.set(x, 0.21, 0); g.add(l); }
  g.add(seat, back);
  g.traverse((o) => (o.castShadow = true));
  return g;
}

export function barrel() {
  const tex = (PROP_TEX.barrel ||= drawTexture(32, 16, (g) => {
    rect(g, 0, 0, 32, 16, '#8a5a36');
    for (let x = 0; x < 32; x += 4) rect(g, x, 0, 1, 16, '#6a4228');
    rect(g, 0, 2, 32, 2, '#4a4450'); rect(g, 0, 12, 32, 2, '#4a4450');
  }));
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.3, 0.8, 8), [lambert({ map: tex }), lambert({ color: '#a06c42' }), lambert({ color: '#6a4228' })]);
  m.position.y = 0.4;
  m.castShadow = true;
  const g = new THREE.Group();
  g.add(m);
  return g;
}

export function crate() {
  const tex = (PROP_TEX.crate ||= drawTexture(16, 16, (g) => {
    rect(g, 0, 0, 16, 16, '#b07a48');
    rect(g, 0, 0, 16, 2, '#7e5030'); rect(g, 0, 14, 16, 2, '#7e5030'); rect(g, 0, 0, 2, 16, '#7e5030'); rect(g, 14, 0, 2, 16, '#7e5030');
    for (let i = 2; i < 14; i++) px(g, i, i, '#7e5030');
  }));
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), lambert({ map: tex }));
  m.position.y = 0.35;
  m.rotation.y = 0.2;
  m.castShadow = true;
  const g = new THREE.Group();
  g.add(m);
  return g;
}

export function flowerPotCanvas(seed) {
  const r = rng(seed);
  const c = makeCanvas(10, 12), g = ctx2d(c);
  rect(g, 2, 7, 6, 5, '#c9563f');
  rect(g, 1, 7, 8, 1, '#e27b5c');
  rect(g, 6, 8, 2, 4, '#9e3f2e');
  const cols = [['#e05a6a', '#ff9aaa'], ['#f5d24b', '#fff0a0'], ['#b08af0', '#e0d0ff'], ['#fff6e4', '#f5d24b']];
  const [a, b] = r.pick(cols);
  for (const [x, y] of [[2, 4], [4, 2], [6, 4], [5, 5], [3, 6], [7, 6]]) { px(g, x, y, a); }
  for (const [x, y] of [[3, 5], [5, 3], [6, 6], [2, 6]]) px(g, x, y, '#4f8a3a');
  px(g, 4, 2, b); px(g, 2, 4, b);
  return outlineCanvas(c);
}

export function stall(color) {
  const g = new THREE.Group();
  const wood = lambert({ map: woodTex() });
  const table = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.7, 0.9), wood);
  table.position.y = 0.35;
  table.castShadow = table.receiveShadow = true;
  g.add(table);
  for (const [x, z] of [[-0.85, -0.4], [0.85, -0.4], [-0.85, 0.4], [0.85, 0.4]]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.9, 0.08), wood);
    p.position.set(x, 0.95, z);
    g.add(p);
  }
  const aw = drawTexture(32, 16, (gg) => {
    for (let x = 0; x < 32; x += 8) { rect(gg, x, 0, 4, 16, '#fff6e4'); rect(gg, x + 4, 0, 4, 16, color); }
    for (let x = 0; x < 32; x += 4) rect(gg, x + 1, 14, 2, 2, x % 8 ? color : '#fff6e4');
  });
  const awning = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 1.3), lambert({ map: aw, side: THREE.DoubleSide, transparent: true, alphaTest: 0.5 }));
  awning.position.set(0, 1.95, 0.05);
  awning.rotation.x = -1.05;
  awning.castShadow = true;
  g.add(awning);
  // goods on the table
  const goods = ['apple', 'carrot', 'fish', 'bread', 'honey', 'egg', 'milk', 'seeds'];
  const r = rng(color.length * 7);
  for (let i = 0; i < 4; i++) {
    const bb = new Billboard([itemCanvas(r.pick(goods))], { key: 'good' + i + color, shadow: false, scale: 0.8 });
    bb.mesh.position.set(-0.6 + i * 0.4, 0.7, 0.2);
    g.add(bb.mesh);
  }
  return g;
}

export function fountain() {
  const g = new THREE.Group();
  const stone = (PROP_TEX.stone ||= drawTexture(16, 16, (gg) => {
    rect(gg, 0, 0, 16, 16, '#cfc2a6');
    for (let y = 0; y < 16; y += 4) rect(gg, 0, y + 3, 16, 1, '#a8987e');
    for (let x = 0; x < 16; x += 5) rect(gg, x, 0, 1, 16, '#b8aa90');
  }, { repeat: true }));
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.55, 0.55, 12), lambert({ map: stone }));
  basin.position.y = 0.27;
  basin.castShadow = basin.receiveShadow = true;
  const waterMat = lambert({ color: '#6fc4d8', emissive: new THREE.Color('#1a4a5a'), transparent: true, opacity: 0.9 });
  const water = new THREE.Mesh(new THREE.CylinderGeometry(1.28, 1.28, 0.1, 12), waterMat);
  water.position.y = 0.5;
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 1.4, 8), lambert({ map: stone }));
  pillar.position.y = 0.9;
  pillar.castShadow = true;
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.25, 0.25, 10), lambert({ map: stone }));
  bowl.position.y = 1.6;
  bowl.castShadow = true;
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), lambert({ color: '#f2c14e' }));
  top.position.y = 1.85;
  g.add(basin, water, pillar, bowl, top);
  g.userData.spray = new THREE.Vector3(0, 1.9, 0);
  return g;
}

export function windmill() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.35, 4.2, 8), lambert({ color: '#f2e3c6' }));
  body.position.y = 2.1;
  body.castShadow = body.receiveShadow = true;
  const doorTex = drawTexture(16, 16, (gg) => { rect(gg, 4, 2, 8, 14, '#6a3f26'); rect(gg, 5, 3, 6, 1, '#8a5a36'); });
  const door = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.1), lambert({ map: doorTex, transparent: true, alphaTest: 0.5 }));
  door.position.set(0, 0.55, 1.33);
  door.rotation.x = -0.09;
  const capTex = makeRoofTexture(ROOF_COLORS[0], 5, 2, 2);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(1.25, 1.4, 8), lambert({ map: capTex }));
  cap.position.y = 4.9;
  cap.castShadow = true;
  const hub = new THREE.Group();
  hub.position.set(0, 4.2, 1.2);
  const sailTex = drawTexture(8, 32, (gg) => {
    rect(gg, 3, 0, 2, 32, '#6a4228');
    for (let y = 4; y < 32; y += 3) rect(gg, 0, y, 8, 2, '#fff6e4');
    for (let y = 4; y < 32; y += 6) rect(gg, 0, y, 8, 1, '#d8ccb8');
  });
  const sailMat = lambert({ map: sailTex, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide });
  for (let k = 0; k < 4; k++) {
    const arm = new THREE.Group();
    const sail = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 3.0), sailMat);
    sail.position.y = 1.7;
    sail.castShadow = true;
    arm.add(sail);
    arm.rotation.z = (k * Math.PI) / 2;
    hub.add(arm);
  }
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 4), lambert({ color: '#6a4228' }));
  hub.add(knob);
  g.add(body, door, cap, hub);
  g.userData.hub = hub;
  return g;
}

export function lighthouse() {
  const g = new THREE.Group();
  const stripes = drawTexture(16, 32, (gg) => {
    for (let y = 0; y < 32; y += 8) { rect(gg, 0, y, 16, 4, '#fff6ec'); rect(gg, 0, y + 4, 16, 4, '#d9393c'); }
  }, { repeat: true });
  stripes.repeat.set(3, 2);
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.25, 6.5, 10), lambert({ map: stripes }));
  tower.position.y = 3.25;
  tower.castShadow = tower.receiveShadow = true;
  const gallery = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.18, 12), ironMat());
  gallery.position.y = 6.55;
  const lampMat = lambert({ color: '#fff4c0', emissive: new THREE.Color('#ffd070'), emissiveIntensity: 0.4 });
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.9, 10), lampMat);
  lamp.position.y = 7.1;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.85, 0.9, 10), lambert({ color: '#3a3346' }));
  roof.position.y = 8.0;
  roof.castShadow = true;
  // rotating beam
  const beamMat = new THREE.MeshBasicMaterial({ color: '#fff0b0', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const beamGeo = new THREE.CylinderGeometry(0.3, 2.6, 22, 12, 1, true);
  beamGeo.rotateZ(Math.PI / 2);
  beamGeo.translate(11, 0, 0);
  const beam = new THREE.Mesh(beamGeo, beamMat);
  beam.position.y = 7.1;
  g.add(tower, gallery, lamp, roof, beam);
  g.userData = { lampMat, beam, beamMat };
  return g;
}

export function boat(color) {
  const g = new THREE.Group();
  const shape = new THREE.Shape();
  shape.moveTo(0, -1.4);
  shape.quadraticCurveTo(0.75, -0.6, 0.62, 0.9);
  shape.lineTo(-0.62, 0.9);
  shape.quadraticCurveTo(-0.75, -0.6, 0, -1.4);
  const paint = lambert({ color });
  const hull = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.5, bevelEnabled: false }), [paint, paint]);
  hull.rotation.x = Math.PI / 2;
  hull.position.y = 0.32;
  hull.castShadow = true;
  const stripe = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.1, bevelEnabled: false }), [lambert({ color: '#fff6ec' }), lambert({ color: '#fff6ec' })]);
  stripe.rotation.x = Math.PI / 2;
  stripe.position.y = 0.1;
  stripe.scale.set(1.02, 1.02, 1);
  const deckTex = woodTex().clone();
  deckTex.needsUpdate = true;
  deckTex.repeat.set(0.8, 0.8);
  const deck = new THREE.Mesh(new THREE.ShapeGeometry(shape), lambert({ map: deckTex }));
  deck.rotation.x = -Math.PI / 2;
  deck.position.y = 0.335;
  deck.scale.set(0.82, 0.82, 1);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 5), lambert({ color: '#6a4228' }));
  mast.position.set(0, 1.4, 0.2);
  mast.castShadow = true;
  const sailGeo = new THREE.BufferGeometry();
  sailGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 2.5, 0, 0, 0.55, 0, 0.95, 0.55, 0], 3));
  sailGeo.computeVertexNormals();
  const sail = new THREE.Mesh(sailGeo, lambert({ color: '#fff6ec', side: THREE.DoubleSide }));
  sail.position.set(0.05, 0.2, 0.2);
  sail.castShadow = true;
  g.add(hull, stripe, deck, mast, sail);
  return g;
}

export function fence(dir = 'x') {
  const g = new THREE.Group();
  const m = lambert({ color: '#c8a070' });
  const p = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.7, 0.12), m);
  p.position.set(-0.5, 0.35, 0);
  const r1 = new THREE.Mesh(new THREE.BoxGeometry(1, 0.08, 0.06), m);
  r1.position.y = 0.5;
  const r2 = r1.clone();
  r2.position.y = 0.25;
  g.add(p, r1, r2);
  if (dir === 'z') g.rotation.y = Math.PI / 2;
  g.traverse((o) => (o.castShadow = true));
  return g;
}

export function signpost(text) {
  const g = new THREE.Group();
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.3, 0.12), lambert({ color: '#6a4228' }));
  post.position.y = 0.65;
  post.castShadow = true;
  const c = makeCanvas(24, 10), gg = ctx2d(c);
  rect(gg, 0, 1, 21, 8, '#b07a48');
  rect(gg, 21, 2, 2, 6, '#b07a48'); rect(gg, 23, 4, 1, 2, '#b07a48');
  rect(gg, 0, 1, 21, 1, '#c89a64');
  for (let i = 0; i < Math.min(text.length, 6); i++) rect(gg, 3 + i * 3, 4, 2, 2, '#5e3a22');
  const board = new Billboard([outlineCanvas(c)], { key: 'signpost' + text });
  board.mesh.position.set(0.3, 0.95, 0.08);
  g.add(post, board.mesh);
  return g;
}

export function launchpad() {
  const tex = drawTexture(32, 32, (gg) => {
    disc(gg, 15.5, 15.5, 15, '#b8aa93');
    disc(gg, 15.5, 15.5, 13, '#d6cab2');
    // painted star
    const pts = [];
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2 - Math.PI / 2;
      const rr = k % 2 ? 4.2 : 10;
      pts.push([15.5 + Math.cos(a) * rr, 15.5 + Math.sin(a) * rr]);
    }
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
      let inside = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i], [xj, yj] = pts[j];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
      }
      if (inside) px(gg, x, y, '#d9393c');
    }
  });
  const m = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.4, 0.12, 16), [lambert({ color: '#9a8c78' }), lambert({ map: tex }), lambert({ color: '#9a8c78' })]);
  m.position.y = 0.06;
  m.receiveShadow = true;
  const g = new THREE.Group();
  g.add(m);
  return g;
}
