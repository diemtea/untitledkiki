// Merges many static pixel sprites into one atlas + one mesh (one draw call, swaying foliage).
import * as THREE from 'three';
import { PX, makeCanvas, ctx2d, pixelTexture } from './pixel.js';

const SPRITE_NORMAL = new THREE.Vector3(0, 0.62, 0.78).normalize();

export class SpriteBatch {
  constructor() {
    this.items = [];
    this.canvases = new Map(); // canvas -> atlas rect
  }
  // add a sprite: canvas, world position (bottom-centre), opts {scale, sway, sink}
  add(canvas, x, y, z, opts = {}) {
    this.items.push({ canvas, x, y, z, scale: opts.scale || 1, sway: opts.sway || 0, sink: opts.sink ?? 0.06, ref: opts.ref });
    this.canvases.set(canvas, null);
    return this.items.length - 1;
  }
  build({ shadow = true, swayMaterial = true } = {}) {
    // shelf-pack canvases
    const list = [...this.canvases.keys()].sort((a, b) => b.height - a.height);
    const maxW = 1024;
    let x = 0, y = 0, rowH = 0;
    for (const c of list) {
      if (x + c.width + 1 > maxW) { x = 0; y += rowH + 1; rowH = 0; }
      this.canvases.set(c, { x, y, w: c.width, h: c.height });
      x += c.width + 1;
      rowH = Math.max(rowH, c.height);
    }
    const aw = maxW, ah = 1 << Math.ceil(Math.log2(Math.max(16, y + rowH + 1)));
    const atlas = makeCanvas(aw, ah);
    const g = ctx2d(atlas);
    for (const [c, r] of this.canvases) g.drawImage(c, r.x, r.y);
    const tex = pixelTexture(atlas);

    const n = this.items.length;
    const pos = new Float32Array(n * 12), nor = new Float32Array(n * 12), uv = new Float32Array(n * 8), sway = new Float32Array(n * 4);
    const ind = [];
    this.items.forEach((it, k) => {
      const r = this.canvases.get(it.canvas);
      const w = (r.w / PX) * it.scale, h = (r.h / PX) * it.scale;
      const x0 = it.x - w / 2, x1 = it.x + w / 2, y0 = it.y - it.sink, y1 = it.y - it.sink + h;
      const p = [x0, y1, it.z, x1, y1, it.z, x0, y0, it.z, x1, y0, it.z];
      pos.set(p, k * 12);
      for (let v = 0; v < 4; v++) nor.set([SPRITE_NORMAL.x, SPRITE_NORMAL.y, SPRITE_NORMAL.z], k * 12 + v * 3);
      const u0 = (r.x + 0.01) / aw, u1 = (r.x + r.w - 0.01) / aw;
      const v1 = 1 - (r.y + 0.01) / ah, v0 = 1 - (r.y + r.h - 0.01) / ah;
      uv.set([u0, v1, u1, v1, u0, v0, u1, v0], k * 8);
      sway.set([it.sway, it.sway, 0, 0], k * 4);
      const b = k * 4;
      ind.push(b, b + 2, b + 1, b + 1, b + 2, b + 3);
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setAttribute('sway', new THREE.BufferAttribute(sway, 1));
    geo.setIndex(ind);
    geo.computeBoundingSphere();
    const mat = new THREE.MeshLambertMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide });
    this.uniforms = { uTime: { value: 0 }, uWind: { value: 1 } };
    if (swayMaterial) {
      mat.onBeforeCompile = (sh) => {
        sh.uniforms.uTime = this.uniforms.uTime;
        sh.uniforms.uWind = this.uniforms.uWind;
        sh.vertexShader = sh.vertexShader
          .replace('#include <common>', '#include <common>\nattribute float sway;\nuniform float uTime;\nuniform float uWind;')
          .replace('#include <begin_vertex>', `#include <begin_vertex>
            float ph = position.x * 0.37 + position.z * 0.23;
            float s = sin(uTime * 1.6 + ph) * 0.5 + sin(uTime * 2.7 + ph * 1.7) * 0.25;
            transformed.x += floor(s * sway * uWind * 16.0 * 0.06 + 0.5) / 16.0;`);
      };
    }
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = shadow;
    mesh.receiveShadow = true;
    this.mesh = mesh;
    this.atlasTex = tex;
    return mesh;
  }
  // Hide / show an individual sprite by collapsing its quad (for harvested nodes)
  setVisible(k, visible) {
    const it = this.items[k];
    const pos = this.mesh.geometry.attributes.position;
    const r = this.canvases.get(it.canvas);
    const w = (r.w / PX) * it.scale, h = (r.h / PX) * it.scale;
    const x0 = it.x - w / 2, x1 = it.x + w / 2, y0 = it.y - it.sink, y1 = visible ? it.y - it.sink + h : y0;
    const xx1 = visible ? x1 : x0;
    pos.array.set([x0, y1, it.z, xx1, y1, it.z, x0, y0, it.z, xx1, y0, it.z], k * 12);
    pos.needsUpdate = true;
  }
}
