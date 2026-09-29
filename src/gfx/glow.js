// A field of soft glowing points animated entirely on the GPU: spirit wisps, luminous mushrooms,
// lantern halos, moonflowers and sparkles. One draw call for hundreds of lights.
import * as THREE from 'three';

const VS = /* glsl */ `
attribute vec3 gcolor;
attribute float gsize;
attribute float gphase;
attribute float gmotion;
attribute float gnight;
uniform float uTime;
uniform float uScale;
uniform float uNight;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec3 p = position;
  float t = uTime;
  if (gmotion > 0.5 && gmotion < 1.5) {
    // wandering wisp
    p += vec3(sin(t * 0.37 + gphase) * 1.1 + sin(t * 0.9 + gphase * 3.0) * 0.3,
              sin(t * 0.8 + gphase * 2.0) * 0.45 + 0.2,
              cos(t * 0.29 + gphase) * 0.9);
  } else if (gmotion > 1.5) {
    // orbiting sparkle
    float a = t * (0.6 + fract(gphase) * 0.6) + gphase * 6.28;
    p += vec3(cos(a) * 1.6, sin(t * 1.3 + gphase) * 0.4, sin(a) * 1.6);
  }
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float tw = 0.65 + 0.35 * sin(t * (1.5 + fract(gphase * 7.0) * 2.5) + gphase * 11.0);
  float vis = gnight > 0.5 ? uNight : mix(0.55, 1.0, uNight);
  vAlpha = tw * vis;
  vColor = gcolor;
  gl_PointSize = max(1.0, gsize * uScale / -mv.z * (0.85 + 0.3 * tw));
}
`;
const FS = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec2 q = gl_PointCoord - 0.5;
  float d = length(q);
  if (d > 0.5 || vAlpha < 0.01) discard;
  // bright pixel core + soft halo
  float core = step(abs(q.x), 0.12) * step(abs(q.y), 0.12);
  float halo = pow(1.0 - d * 2.0, 1.8) * 0.7;
  float a = max(core, halo) * vAlpha;
  gl_FragColor = vec4(vColor * a * 1.8, a);
}
`;

export class GlowField {
  constructor() {
    this.items = [];
    this.uniforms = { uTime: { value: 0 }, uScale: { value: 600 }, uNight: { value: 0 } };
  }
  add(x, y, z, color = '#bfffea', size = 0.3, motion = 0, nightOnly = false, phase = Math.random() * 100) {
    this.items.push({ x, y, z, color: new THREE.Color(color), size, motion, nightOnly, phase });
  }
  build() {
    const n = this.items.length;
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), size = new Float32Array(n), ph = new Float32Array(n), mo = new Float32Array(n), ni = new Float32Array(n);
    this.items.forEach((it, i) => {
      pos.set([it.x, it.y, it.z], i * 3);
      col.set([it.color.r, it.color.g, it.color.b], i * 3);
      size[i] = it.size; ph[i] = it.phase; mo[i] = it.motion; ni[i] = it.nightOnly ? 1 : 0;
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('gcolor', new THREE.BufferAttribute(col, 3));
    g.setAttribute('gsize', new THREE.BufferAttribute(size, 1));
    g.setAttribute('gphase', new THREE.BufferAttribute(ph, 1));
    g.setAttribute('gmotion', new THREE.BufferAttribute(mo, 1));
    g.setAttribute('gnight', new THREE.BufferAttribute(ni, 1));
    const mat = new THREE.ShaderMaterial({
      vertexShader: VS, fragmentShader: FS, uniforms: this.uniforms,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(g, mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 6;
    return this.points;
  }
  update(t, night, scale) {
    this.uniforms.uTime.value = t;
    this.uniforms.uNight.value = night;
    this.uniforms.uScale.value = scale;
  }
}

// Slanted additive light shafts (god rays) for the ancient forest and interiors.
let beamTex = null;
export function lightShaft(width = 1.6, height = 6) {
  if (!beamTex) {
    const c = document.createElement('canvas');
    c.width = 8; c.height = 64;
    const g = c.getContext('2d');
    for (let y = 0; y < 64; y++) {
      const a = Math.pow(1 - y / 64, 1.2) * Math.min(1, y / 6) * 0.6;
      g.fillStyle = `rgba(255,244,200,${a})`;
      g.fillRect(0, y, 8, 1);
    }
    g.clearRect(0, 0, 1, 64); g.clearRect(7, 0, 1, 64);
    beamTex = new THREE.CanvasTexture(c);
    beamTex.colorSpace = THREE.SRGBColorSpace;
  }
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ map: beamTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false, opacity: 0.5 }),
  );
  m.renderOrder = 4;
  return m;
}
