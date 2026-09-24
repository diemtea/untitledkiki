// Builds the terraced diorama terrain mesh from the island tile map.
import * as THREE from 'three';
import { TYPE_INFO, T, levelY, SEABED_Y } from './island.js';
import { hash2 } from '../core/util.js';

export function buildTerrainMesh(I, atlas) {
  const { W, H, type, height } = I;
  const pos = [], nor = [], uv = [], col = [], ind = [];
  let vi = 0;
  const yAt = (x, z) => {
    if (x < 0 || z < 0 || x >= W || z >= H) return SEABED_Y;
    return levelY(height[z * W + x]);
  };

  function quad(p, n, uvr, c) {
    // p: 4 corners [a,b,c,d] in CCW order seen from the normal side: a(top-left) b(top-right) c(bottom-right) d(bottom-left)
    for (let k = 0; k < 4; k++) {
      pos.push(...p[k]);
      nor.push(...n);
      col.push(c[k], c[k], c[k]);
    }
    const [u0, v0, u1, v1] = uvr;
    uv.push(u0, v1, u1, v1, u1, v0, u0, v0);
    ind.push(vi, vi + 3, vi + 1, vi + 1, vi + 3, vi + 2);
    vi += 4;
  }

  const AO = 0.72;
  for (let z = 0; z < H; z++) {
    for (let x = 0; x < W; x++) {
      const i = z * W + x;
      const t = type[i];
      const info = TYPE_INFO[t];
      const y = yAt(x, z);
      const variant = Math.floor(hash2(x, z, 9) * atlas.variants);
      // --- top face, with corner AO from higher neighbours
      const occ = (dx, dz) => (yAt(x + dx, z + dz) > y + 0.01 ? 1 : 0);
      const cornerAO = (sx, sz) => {
        const a = occ(sx, 0), b = occ(0, sz), c = occ(sx, sz);
        const n = a + b + (a && b ? 1 : c);
        return 1 - n * (1 - AO) * 0.5;
      };
      // corners: NW(-x,-z) NE(+x,-z) SE(+x,+z) SW(-x,+z); quad order a=NW,b=NE,c=SE,d=SW (normal up)
      quad(
        [[x, y, z], [x + 1, y, z], [x + 1, y, z + 1], [x, y, z + 1]],
        [0, 1, 0],
        atlas.uv(info.top, variant),
        [cornerAO(-1, -1), cornerAO(1, -1), cornerAO(1, 1), cornerAO(-1, 1)],
      );
      // --- side faces toward lower neighbours
      const sides = [
        [0, 1, [0, 0, 1]],  // south (+z) — the one the camera sees most
        [1, 0, [1, 0, 0]],  // east
        [-1, 0, [-1, 0, 0]], // west
        [0, -1, [0, 0, -1]], // north
      ];
      for (const [dx, dz, n] of sides) {
        const ny = yAt(x + dx, z + dz);
        if (ny >= y - 0.001) continue;
        let top = y;
        let seg = 0;
        while (top > ny + 0.001) {
          const bottom = Math.max(ny, top - 1);
          const hgt = top - bottom;
          const sideName = seg === 0 ? info.side : (info.side === 'cliffgrass' ? 'cliffrock' : info.side === 'dockside' ? 'dockside' : info.side);
          const [u0, v0, u1, v1] = atlas.uv(sideName, (variant + seg) % atlas.variants);
          const vv0 = v1 - (v1 - v0) * hgt; // take the top part of the tile
          let a, b, c, d;
          if (dz === 1) { a = [x, top, z + 1]; b = [x + 1, top, z + 1]; c = [x + 1, bottom, z + 1]; d = [x, bottom, z + 1]; }
          else if (dz === -1) { a = [x + 1, top, z]; b = [x, top, z]; c = [x, bottom, z]; d = [x + 1, bottom, z]; }
          else if (dx === 1) { a = [x + 1, top, z + 1]; b = [x + 1, top, z]; c = [x + 1, bottom, z]; d = [x + 1, bottom, z + 1]; }
          else { a = [x, top, z]; b = [x, top, z + 1]; c = [x, bottom, z + 1]; d = [x, bottom, z]; }
          const shadeTop = 1.0, shadeBot = bottom <= ny + 0.001 ? 0.62 : 0.85;
          quad([a, b, c, d], n, [u0, vv0, u1, v1], [shadeTop, shadeTop, shadeBot, shadeBot]);
          top = bottom;
          seg++;
        }
      }
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(ind);
  g.computeBoundingSphere();
  const mat = new THREE.MeshLambertMaterial({ map: atlas.tex, vertexColors: true });
  const mesh = new THREE.Mesh(g, mat);
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  mesh.name = 'terrain';
  return mesh;
}

// High-resolution signed-ish distance field (in tiles) from water to land, for the water shader.
export function buildShoreTexture(I, res = 4) {
  const { W, H, type, height } = I;
  const w = W * res, h = H * res;
  const INF = 1e9;
  const d = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const tx = (x / res) | 0, tz = (y / res) | 0;
    const i = tz * W + tx;
    const landish = type[i] !== T.WATER;
    d[y * w + x] = landish ? 0 : INF;
  }
  // two-pass chamfer distance transform
  const a = 1, b = Math.SQRT2;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const k = y * w + x;
    let v = d[k];
    if (x > 0) v = Math.min(v, d[k - 1] + a);
    if (y > 0) v = Math.min(v, d[k - w] + a);
    if (x > 0 && y > 0) v = Math.min(v, d[k - w - 1] + b);
    if (x < w - 1 && y > 0) v = Math.min(v, d[k - w + 1] + b);
    d[k] = v;
  }
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) {
    const k = y * w + x;
    let v = d[k];
    if (x < w - 1) v = Math.min(v, d[k + 1] + a);
    if (y < h - 1) v = Math.min(v, d[k + w] + a);
    if (x < w - 1 && y < h - 1) v = Math.min(v, d[k + w + 1] + b);
    if (x > 0 && y < h - 1) v = Math.min(v, d[k + w - 1] + b);
    d[k] = v;
  }
  const data = new Uint8Array(w * h * 4);
  for (let k = 0; k < w * h; k++) {
    const tiles = d[k] / res; // distance in tiles
    const v = Math.min(255, Math.round((tiles / 14) * 255));
    data[k * 4] = v; data[k * 4 + 1] = v; data[k * 4 + 2] = v; data[k * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.flipY = false;
  tex.needsUpdate = true;
  return tex;
}
