// Pixelated stylised sea: shallow/deep colour from a shore distance field, foam lines, glints.
import * as THREE from 'three';

const VS = /* glsl */ `
varying vec3 vWorld;
varying float vFogDepth;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  vec4 mv = viewMatrix * wp;
  vFogDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`;

const FS = /* glsl */ `
uniform float time;
uniform sampler2D tDist;
uniform vec2 mapSize;
uniform vec3 deep;
uniform vec3 shallow;
uniform vec3 foam;
uniform vec3 light;
uniform vec3 skyTint;
uniform float night;
uniform vec3 fogColor;
uniform float fogNear;
uniform float fogFar;
uniform float rain;
varying vec3 vWorld;
varying float vFogDepth;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

void main() {
  vec2 p = floor(vWorld.xz * 16.0) / 16.0 + 1.0 / 32.0;
  vec2 uv = p / mapSize;
  float d = 1.0;
  if (uv.x > 0.0 && uv.y > 0.0 && uv.x < 1.0 && uv.y < 1.0) d = texture2D(tDist, uv).r;
  float dt = d * 14.0; // distance to land in tiles

  vec3 col = mix(shallow, deep, smoothstep(0.2, 5.5, dt));
  // mid band of turquoise
  col = mix(col, mix(shallow, deep, 0.35) * vec3(0.9, 1.08, 1.05), smoothstep(1.2, 2.2, dt) * (1.0 - smoothstep(2.5, 6.0, dt)) * 0.5);

  // slow rolling swell bands
  float w1 = sin(p.x * 0.55 + p.y * 0.35 + time * 0.9 + sin(p.y * 0.4 + time * 0.3) * 1.8);
  float w2 = sin(p.x * 1.7 - p.y * 1.1 - time * 1.3);
  float band = w1 * 0.6 + w2 * 0.4;
  col += step(0.78, band) * vec3(0.06, 0.09, 0.1) * (0.4 + smoothstep(0.5, 4.0, dt));
  col -= step(band, -0.85) * vec3(0.03, 0.04, 0.04);

  // shore foam: two animated lines hugging the coast
  float f1 = 0.18 + 0.1 * sin(time * 1.6 + p.x * 1.3 + p.y * 0.8);
  float f2 = 0.62 + 0.18 * sin(time * 1.1 - p.x * 0.9 + p.y * 1.2);
  float foamMask = step(dt, f1) + step(abs(dt - f2), 0.06) * 0.8;
  foamMask *= step(0.001, dt);
  col = mix(col, foam, clamp(foamMask, 0.0, 1.0) * 0.9);

  // sparkles
  vec2 cell = floor(vWorld.xz * 4.0);
  float h = hash(cell);
  float tw = sin(time * (2.0 + h * 3.0) + h * 40.0);
  float sparkle = step(0.985, h) * step(0.6, tw) * smoothstep(1.0, 3.0, dt);
  col += sparkle * mix(vec3(0.9, 0.95, 1.0), vec3(1.0, 0.95, 0.75), night);

  // rain ripples
  if (rain > 0.0) {
    float rh = hash(floor(vWorld.xz * 3.0) + floor(time * 3.0));
    col += step(0.97, rh) * rain * 0.12;
  }

  col = col * light + skyTint * 0.12;

  float alpha = mix(0.45, 0.94, smoothstep(0.0, 3.0, dt));
  alpha = max(alpha, clamp(foamMask, 0.0, 1.0));

  float fogF = smoothstep(fogNear, fogFar, vFogDepth);
  col = mix(col, fogColor, fogF);
  gl_FragColor = vec4(col, alpha);
}
`;

export function createWater(shoreTex, W, H, y) {
  const size = 900;
  const geo = new THREE.PlaneGeometry(size, size, 1, 1);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.ShaderMaterial({
    vertexShader: VS,
    fragmentShader: FS,
    transparent: true,
    depthWrite: true,
    uniforms: {
      time: { value: 0 },
      tDist: { value: shoreTex },
      mapSize: { value: new THREE.Vector2(W, H) },
      deep: { value: new THREE.Color('#1c5c8f') },
      shallow: { value: new THREE.Color('#58c0cf') },
      foam: { value: new THREE.Color('#f2fbff') },
      light: { value: new THREE.Color(1, 1, 1) },
      skyTint: { value: new THREE.Color(0.6, 0.8, 1) },
      night: { value: 0 },
      fogColor: { value: new THREE.Color('#cfe6f0') },
      fogNear: { value: 60 },
      fogFar: { value: 220 },
      rain: { value: 0 },
    },
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(W / 2, y, H / 2);
  mesh.renderOrder = 1;
  mesh.name = 'water';
  return mesh;
}
