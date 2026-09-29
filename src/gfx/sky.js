// Sky dome with gradient, sun glow, moon and pixel stars; plus drifting pixel-art clouds.
import * as THREE from 'three';
import { makeCanvas, ctx2d, outlineCanvas, pixelTexture } from './pixel.js';
import { rng } from '../core/util.js';

const VS = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww;
}
`;
const FS = /* glsl */ `
uniform vec3 top;
uniform vec3 horizon;
uniform vec3 bottom;
uniform vec3 sunDir;
uniform vec3 sunColor;
uniform vec3 moonDir;
uniform float stars;
uniform float time;
varying vec3 vDir;
float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453); }
void main() {
  vec3 d = normalize(vDir);
  float h = d.y;
  vec3 col = mix(horizon, top, smoothstep(0.0, 0.55, h));
  col = mix(col, bottom, smoothstep(0.0, -0.25, h));
  // warm band near the horizon
  col += sunColor * 0.18 * exp(-abs(h) * 9.0);
  // sun
  float sd = max(dot(d, normalize(sunDir)), 0.0);
  col += sunColor * (pow(sd, 450.0) * 2.5 + pow(sd, 18.0) * 0.28);
  // big storybook moon with a soft halo
  float md = max(dot(d, normalize(moonDir)), 0.0);
  col += vec3(1.0, 0.96, 0.84) * (step(0.9985, md) * 1.4 + pow(md, 40.0) * 0.22 + pow(md, 8.0) * 0.06) * stars;
  // aurora ribbons dancing above the horizon on clear nights
  if (stars > 0.05 && h > 0.0) {
    float band = sin(d.x * 6.0 + time * 0.12 + sin(d.z * 4.0 + time * 0.07) * 2.0);
    float curtain = smoothstep(0.05, 0.22, h) * (1.0 - smoothstep(0.25, 0.6, h));
    float a = pow(max(band, 0.0), 3.0) * curtain;
    vec3 aur = mix(vec3(0.2, 1.0, 0.7), vec3(0.8, 0.4, 1.0), smoothstep(0.12, 0.45, h));
    col += aur * a * 0.35 * stars;
  }
  // pixel stars in a few colours
  if (stars > 0.01 && h > 0.02) {
    vec3 q = floor(d * 220.0);
    float s = hash(q);
    float tw = 0.6 + 0.4 * sin(time * (1.0 + s * 4.0) + s * 30.0);
    vec3 sc = mix(vec3(1.0, 0.95, 0.8), mix(vec3(0.7, 0.85, 1.0), vec3(1.0, 0.7, 0.9), fract(s * 97.0)), fract(s * 31.0));
    col += step(0.9955, s) * tw * stars * sc * 1.2 * smoothstep(0.02, 0.2, h);
  }
  gl_FragColor = vec4(col, 1.0);
}
`;

export function createSky() {
  const geo = new THREE.SphereGeometry(400, 32, 16);
  const mat = new THREE.ShaderMaterial({
    vertexShader: VS,
    fragmentShader: FS,
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: true,
    uniforms: {
      top: { value: new THREE.Color('#5aa8e0') },
      horizon: { value: new THREE.Color('#d8eef5') },
      bottom: { value: new THREE.Color('#9cc8d8') },
      sunDir: { value: new THREE.Vector3(0.3, 0.6, -0.7) },
      sunColor: { value: new THREE.Color('#fff0c0') },
      moonDir: { value: new THREE.Vector3(-0.4, 0.5, -0.7) },
      stars: { value: 0 },
      time: { value: 0 },
    },
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = -10;
  mesh.name = 'sky';
  return mesh;
}

// ------------------------------------------------------------------------ clouds
export function cloudCanvas(seed) {
  const r = rng(seed);
  const w = 112, h = 52;
  const c = makeCanvas(w, h);
  const g = ctx2d(c);
  const blobs = [];
  const n = r.int(5, 8);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    blobs.push({ x: 12 + t * (w - 24) + r.range(-4, 4), y: h - 12 - Math.sin(t * Math.PI) * r.range(8, 16), r: r.range(8, 13) * (0.7 + Math.sin(t * Math.PI) * 0.5) });
  }
  const cols = ['#ffffff', '#fff6fb', '#f0dff4', '#dcc8ee'];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let inside = false, lit = 9;
    for (const b of blobs) {
      const dx = x - b.x, dy = y - b.y;
      const dd = Math.sqrt(dx * dx + dy * dy) / b.r;
      if (dd <= 1) {
        inside = true;
        const l = Math.sqrt((dx + b.r * 0.4) ** 2 + (dy + b.r * 0.55) ** 2) / b.r;
        lit = Math.min(lit, l);
      }
    }
    if (!inside || y > h - 6) continue;
    const dith = ((x + y) & 1) * 0.07;
    let col = cols[1];
    if (lit < 0.55 + dith) col = cols[0];
    else if (lit > 1.05 + dith) col = cols[2];
    if (y > h - 10) col = cols[3];
    g.fillStyle = col;
    g.fillRect(x, y, 1, 1);
  }
  return outlineCanvas(c, '#c8b4e4');
}

export function createClouds(count, bounds, seed = 5) {
  const r = rng(seed);
  const group = new THREE.Group();
  const textures = [0, 1, 2, 3, 4].map((i) => pixelTexture(cloudCanvas(seed * 10 + i)));
  const clouds = [];
  for (let i = 0; i < count; i++) {
    const tex = textures[i % textures.length];
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.02, depthWrite: false, fog: true, opacity: 0.82 });
    const s = r.range(0.9, 1.6);
    const geo = new THREE.PlaneGeometry(112 / 8 * s, 52 / 8 * s);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(r.range(bounds.x0, bounds.x1), r.range(bounds.y0, bounds.y1), r.range(bounds.z0, bounds.z1));
    m.userData.speed = r.range(0.25, 0.6);
    group.add(m);
    clouds.push(m);
  }
  group.userData.update = (dt, tint) => {
    for (const m of clouds) {
      m.position.x += m.userData.speed * dt;
      if (m.position.x > bounds.x1) m.position.x = bounds.x0;
      m.material.color.copy(tint);
    }
  };
  return group;
}
