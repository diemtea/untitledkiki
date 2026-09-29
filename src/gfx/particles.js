// Square pixel particles: dust motes, fireflies, rain, leaves, smoke, sparkles.
import * as THREE from 'three';

const VS = /* glsl */ `
attribute float size;
attribute float alpha;
attribute float shape;
attribute vec3 pcolor;
uniform float uScale;
varying float vAlpha;
varying float vShape;
varying vec3 vColor;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = max(1.0, size * uScale / -mv.z);
  vAlpha = alpha;
  vShape = shape;
  vColor = pcolor;
}
`;
const FS = /* glsl */ `
varying float vAlpha;
varying float vShape;
varying vec3 vColor;
void main() {
  vec2 p = gl_PointCoord - 0.5;
  float a2 = 1.0;
  if (vShape > 0.5 && vShape < 1.5) { if (abs(p.x) > 0.1) discard; }       // rain streak
  else if (vShape > 2.5) { float r = length(p); if (r > 0.5) discard; a2 = smoothstep(0.5, 0.05, r); } // soft round puff (smoke, mist)
  else if (vShape > 1.5) {                                                   // glow: plus-shaped pixel sparkle
    float a = step(abs(p.x), 0.17) + step(abs(p.y), 0.17);
    if (a < 0.5 || length(p) > 0.5) discard;
  }
  if (vAlpha * a2 < 0.01) discard;
  gl_FragColor = vec4(vColor, vAlpha * a2);
}
`;

export class Particles {
  constructor(max = 1500, { additive = false } = {}) {
    this.max = max;
    this.pos = new Float32Array(max * 3);
    this.col = new Float32Array(max * 3);
    this.size = new Float32Array(max);
    this.alpha = new Float32Array(max);
    this.shape = new Float32Array(max);
    this.p = Array.from({ length: max }, () => ({ alive: false }));
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('pcolor', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('size', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('alpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('shape', new THREE.BufferAttribute(this.shape, 1).setUsage(THREE.DynamicDrawUsage));
    this.uniforms = { uScale: { value: 600 } };
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VS, fragmentShader: FS, uniforms: this.uniforms,
      transparent: true, depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
    this.cursor = 0;
    this.count = 0;
    this._c = new THREE.Color();
  }
  spawn(o) {
    let k = -1;
    for (let n = 0; n < this.max; n++) {
      const i = (this.cursor + n) % this.max;
      if (!this.p[i].alive) { k = i; break; }
    }
    if (k < 0) k = this.cursor;
    this.cursor = (k + 1) % this.max;
    const p = this.p[k];
    p.alive = true;
    p.x = o.x; p.y = o.y; p.z = o.z;
    p.vx = o.vx || 0; p.vy = o.vy || 0; p.vz = o.vz || 0;
    p.life = o.life || 1; p.age = 0;
    p.size = o.size || 0.12;
    p.a = o.alpha ?? 1;
    p.g = o.gravity || 0;
    p.drag = o.drag || 0;
    p.shape = o.shape || 0;
    p.wobble = o.wobble || 0;
    p.ph = Math.random() * 10;
    p.fadeIn = o.fadeIn ?? 0.1;
    p.twinkle = o.twinkle || 0;
    this._c.set(o.color || '#ffffff');
    p.r = this._c.r; p.gg = this._c.g; p.b = this._c.b;
    return p;
  }
  burst(x, y, z, n, opts) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = (opts.speed || 2) * (0.4 + Math.random() * 0.6);
      this.spawn({ x, y, z, vx: Math.cos(a) * s, vz: Math.sin(a) * s * 0.4, vy: (opts.up || 2) * (0.5 + Math.random()), ...opts });
    }
  }
  update(dt, t) {
    let n = 0;
    for (let i = 0; i < this.max; i++) {
      const p = this.p[i];
      if (!p.alive) { this.alpha[i] = 0; continue; }
      p.age += dt;
      if (p.age >= p.life) { p.alive = false; this.alpha[i] = 0; continue; }
      p.vy -= p.g * dt;
      const d = Math.exp(-p.drag * dt);
      p.vx *= d; p.vy *= d; p.vz *= d;
      p.x += p.vx * dt + (p.wobble ? Math.sin(t * 2 + p.ph) * p.wobble * dt : 0);
      p.y += p.vy * dt;
      p.z += p.vz * dt + (p.wobble ? Math.cos(t * 1.7 + p.ph) * p.wobble * dt * 0.6 : 0);
      const lt = p.age / p.life;
      let a = p.a * Math.min(1, lt / Math.max(0.001, p.fadeIn)) * Math.min(1, (1 - lt) / 0.25);
      if (p.twinkle) a *= 0.55 + 0.45 * Math.sin(t * p.twinkle + p.ph * 5);
      this.pos[i * 3] = p.x; this.pos[i * 3 + 1] = p.y; this.pos[i * 3 + 2] = p.z;
      this.col[i * 3] = p.r; this.col[i * 3 + 1] = p.gg; this.col[i * 3 + 2] = p.b;
      this.size[i] = p.size;
      this.alpha[i] = Math.max(0, a);
      this.shape[i] = p.shape;
      n++;
    }
    this.count = n;
    const g = this.points.geometry;
    g.attributes.position.needsUpdate = true;
    g.attributes.pcolor.needsUpdate = true;
    g.attributes.size.needsUpdate = true;
    g.attributes.alpha.needsUpdate = true;
    g.attributes.shape.needsUpdate = true;
  }
  clear() { for (const p of this.p) p.alive = false; }
}
