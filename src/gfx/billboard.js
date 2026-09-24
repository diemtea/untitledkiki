// Camera-facing pixel sprites that are lit, cast silhouette shadows and animate by frame.
import * as THREE from 'three';
import { PX, strip, pixelTexture, makeCanvas, ctx2d } from './pixel.js';

const stripCache = new Map();

// Normal tilted toward camera & sky so sprites catch sunlight and lanterns naturally.
const SPRITE_NORMAL = new THREE.Vector3(0, 0.62, 0.78).normalize();

export function stripTexture(key, frames) {
  if (!stripCache.has(key)) {
    const s = strip(frames);
    s.tex = pixelTexture(s.canvas);
    s.materials = {};
    stripCache.set(key, s);
  }
  return stripCache.get(key);
}

function spriteMaterial(s, opts) {
  const k = (opts.emissive ? 'e' : '') + (opts.basic ? 'b' : '') + (opts.unique ? Math.random() : '');
  if (!s.materials[k]) {
    const common = { map: s.tex, alphaTest: 0.5, side: THREE.DoubleSide };
    s.materials[k] = opts.basic
      ? new THREE.MeshBasicMaterial({ ...common, fog: true })
      : new THREE.MeshLambertMaterial({ ...common, emissive: opts.emissive ? new THREE.Color(opts.emissive) : new THREE.Color(0), emissiveMap: opts.emissive ? s.tex : null });
  }
  return s.materials[k];
}

export class Billboard {
  // frames: array of canvases (same size). opts: { key, shadow, basic, scale, anchorY }
  constructor(frames, opts = {}) {
    const key = opts.key || 'bb' + Math.random();
    this.sheet = stripTexture(key, frames);
    const { fw, fh, n } = this.sheet;
    const scale = opts.scale || 1;
    this.w = (fw / PX) * scale;
    this.h = (fh / PX) * scale;
    const geo = new THREE.PlaneGeometry(this.w, this.h);
    geo.translate(0, this.h / 2 - (opts.sink || 0), 0);
    const nrm = geo.attributes.normal;
    for (let i = 0; i < nrm.count; i++) nrm.setXYZ(i, SPRITE_NORMAL.x, SPRITE_NORMAL.y, SPRITE_NORMAL.z);
    this.geo = geo;
    this.mat = opts.material || spriteMaterial(this.sheet, opts);
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.castShadow = opts.shadow !== false;
    this.mesh.receiveShadow = opts.receive !== false;
    this.n = n;
    this.frame = -1;
    this.flip = false;
    this.setFrame(0, false);
  }
  setFrame(i, flip = this.flip) {
    i = ((i % this.n) + this.n) % this.n;
    if (i === this.frame && flip === this.flip) return;
    this.frame = i;
    this.flip = flip;
    let u0 = i / this.n + 0.0001, u1 = (i + 1) / this.n - 0.0001;
    if (flip) [u0, u1] = [u1, u0];
    const uv = this.geo.attributes.uv;
    // PlaneGeometry vertex order: TL, TR, BL, BR
    uv.setXY(0, u0, 1); uv.setXY(1, u1, 1); uv.setXY(2, u0, 0); uv.setXY(3, u1, 0);
    uv.needsUpdate = true;
  }
  dispose() { this.geo.dispose(); }
}

// Soft blob shadow for grounding characters (esp. when flying high above the ground)
let blobTex = null;
export function blobShadow(radius = 0.45, opacity = 0.32) {
  if (!blobTex) {
    const c = makeCanvas(16, 16), g = ctx2d(c);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const dx = (x - 7.5) / 7.5, dy = (y - 7.5) / 7.5;
      const d = dx * dx + dy * dy;
      if (d < 1) { g.fillStyle = `rgba(40,25,50,${d < 0.45 ? 1 : 0.55})`; g.fillRect(x, y, 1, 1); }
    }
    blobTex = pixelTexture(c);
  }
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(radius * 2, radius * 1.3),
    new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, opacity, depthWrite: false, fog: false }),
  );
  m.rotation.x = -Math.PI / 2;
  m.renderOrder = 2;
  return m;
}

// Flat textured quad lying on the ground (rugs, decals, messes)
export function groundDecal(canvas, w, h) {
  const tex = pixelTexture(canvas);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({ map: tex, transparent: true, alphaTest: 0.5, depthWrite: true }));
  m.rotation.x = -Math.PI / 2;
  m.receiveShadow = true;
  return m;
}
