// HD-2D render pipeline: scene -> (depth-of-field blur pyramid + bloom) -> graded composite.
import * as THREE from 'three';

const QUAD_VS = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const DOWN_FS = /* glsl */ `
uniform sampler2D tSrc;
uniform vec2 texel;
uniform float threshold;
varying vec2 vUv;
void main() {
  vec3 c = texture2D(tSrc, vUv + texel * vec2(-0.5, -0.5)).rgb;
  c += texture2D(tSrc, vUv + texel * vec2(0.5, -0.5)).rgb;
  c += texture2D(tSrc, vUv + texel * vec2(-0.5, 0.5)).rgb;
  c += texture2D(tSrc, vUv + texel * vec2(0.5, 0.5)).rgb;
  c *= 0.25;
  if (threshold > 0.0) {
    float l = max(max(c.r, c.g), c.b);
    float k = smoothstep(threshold, threshold + 0.35, l);
    c *= k;
  }
  gl_FragColor = vec4(c, 1.0);
}
`;

const BLUR_FS = /* glsl */ `
uniform sampler2D tSrc;
uniform vec2 dir;
varying vec2 vUv;
void main() {
  vec3 c = texture2D(tSrc, vUv).rgb * 0.227027;
  c += texture2D(tSrc, vUv + dir * 1.3846).rgb * 0.316216;
  c += texture2D(tSrc, vUv - dir * 1.3846).rgb * 0.316216;
  c += texture2D(tSrc, vUv + dir * 3.2308).rgb * 0.070270;
  c += texture2D(tSrc, vUv - dir * 3.2308).rgb * 0.070270;
  gl_FragColor = vec4(c, 1.0);
}
`;

const COMPOSITE_FS = /* glsl */ `
#include <packing>
uniform sampler2D tScene;
uniform sampler2D tDepth;
uniform sampler2D tBlur1;
uniform sampler2D tBlur2;
uniform sampler2D tBloom1;
uniform sampler2D tBloom2;
uniform float cameraNear;
uniform float cameraFar;
uniform float focusDist;
uniform float focusBand;
uniform float focusRange;
uniform float dofStrength;
uniform float bloomStrength;
uniform float vignette;
uniform vec3 tint;
uniform vec3 lift;
uniform float saturation;
uniform float contrast;
uniform float time;
uniform float fade;
uniform vec3 fadeColor;
uniform float iris;
uniform vec2 irisCenter;
uniform vec2 resolution;
uniform float grain;
uniform float tiltShift;
varying vec2 vUv;

float viewDepth(vec2 uv) {
  float d = texture2D(tDepth, uv).x;
  return -perspectiveDepthToViewZ(d, cameraNear, cameraFar);
}

vec3 softClip(vec3 c) {
  // gentle shoulder so bloom-bright lanterns don't clip harshly
  vec3 x = max(c - 0.82, 0.0);
  return min(c, 0.82) + x / (1.0 + x * 2.2);
}

void main() {
  vec3 sharp = texture2D(tScene, vUv).rgb;
  vec3 b1 = texture2D(tBlur1, vUv).rgb;
  vec3 b2 = texture2D(tBlur2, vUv).rgb;

  float d = viewDepth(vUv);
  float coc = smoothstep(0.0, focusRange, abs(d - focusDist) - focusBand);
  // foreground (closer than focus) blurs a little faster, like a real macro lens
  if (d < focusDist) coc = min(1.0, coc * 1.35);
  // tilt-shift band keeps the diorama feel even when depth is flat
  float band = abs(vUv.y - 0.5) * 2.0;
  coc = max(coc, smoothstep(0.55, 1.0, band) * tiltShift);
  coc *= dofStrength;

  vec3 col = mix(sharp, b1, smoothstep(0.0, 0.5, coc));
  col = mix(col, b2, smoothstep(0.45, 1.0, coc));

  vec3 bloom = texture2D(tBloom1, vUv).rgb * 0.6 + texture2D(tBloom2, vUv).rgb * 0.9;
  col += bloom * bloomStrength;

  // grade
  col = col * tint + lift * (1.0 - col);
  float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(vec3(l), col, saturation);
  col = (col - 0.5) * contrast + 0.5;
  col = softClip(max(col, 0.0));

  // vignette
  vec2 q = vUv - 0.5;
  q.x *= resolution.x / resolution.y;
  float v = smoothstep(0.35, 1.05, length(q) * 1.15);
  col *= 1.0 - v * vignette;

  // grain
  float n = fract(sin(dot(vUv * resolution + time * 61.0, vec2(12.9898, 78.233))) * 43758.5453);
  col += (n - 0.5) * grain;

  // fade / iris transitions
  col = mix(col, fadeColor, fade);
  if (iris < 1.49) {
    vec2 p = (vUv - irisCenter);
    p.x *= resolution.x / resolution.y;
    float r = length(p);
    float edge = smoothstep(iris, iris + 0.006, r);
    col = mix(col, fadeColor, edge);
  }

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
  #include <colorspace_fragment>
}
`;

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    const gl = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false });
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFShadowMap;
    gl.outputColorSpace = THREE.SRGBColorSpace;
    gl.toneMapping = THREE.NoToneMapping;
    gl.autoClear = true;
    this.gl = gl;
    this.quality = 'high';
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    this.quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quadScene = new THREE.Scene();
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    this.quad.frustumCulled = false;
    this.quadScene.add(this.quad);

    const mk = (fs, uniforms) => new THREE.ShaderMaterial({ vertexShader: QUAD_VS, fragmentShader: fs, uniforms, depthTest: false, depthWrite: false });
    this.downMat = mk(DOWN_FS, { tSrc: { value: null }, texel: { value: new THREE.Vector2() }, threshold: { value: 0 } });
    this.blurMat = mk(BLUR_FS, { tSrc: { value: null }, dir: { value: new THREE.Vector2() } });
    this.compMat = mk(COMPOSITE_FS, {
      tScene: { value: null }, tDepth: { value: null }, tBlur1: { value: null }, tBlur2: { value: null },
      tBloom1: { value: null }, tBloom2: { value: null },
      cameraNear: { value: 0.5 }, cameraFar: { value: 400 },
      focusDist: { value: 20 }, focusBand: { value: 3 }, focusRange: { value: 14 }, dofStrength: { value: 1 },
      bloomStrength: { value: 0.8 }, vignette: { value: 0.35 },
      tint: { value: new THREE.Vector3(1, 1, 1) }, lift: { value: new THREE.Vector3(0, 0, 0) },
      saturation: { value: 1.08 }, contrast: { value: 1.04 }, time: { value: 0 },
      fade: { value: 0 }, fadeColor: { value: new THREE.Vector3(0.07, 0.05, 0.1) },
      iris: { value: 1.5 }, irisCenter: { value: new THREE.Vector2(0.5, 0.5) },
      resolution: { value: new THREE.Vector2(1, 1) }, grain: { value: 0.018 }, tiltShift: { value: 0.35 },
    });
    this.post = this.compMat.uniforms;

    this.targets = {};
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  setQuality(q) {
    this.quality = q;
    this.pixelRatio = q === 'low' ? 1 : Math.min(window.devicePixelRatio || 1, 2);
    this.gl.shadowMap.enabled = q !== 'low';
    this.resize();
  }

  resize() {
    const w = Math.max(1, window.innerWidth), h = Math.max(1, window.innerHeight);
    this.width = w; this.height = h;
    this.gl.setPixelRatio(this.pixelRatio);
    this.gl.setSize(w, h, false);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    const W = Math.floor(w * this.pixelRatio), H = Math.floor(h * this.pixelRatio);
    for (const t of Object.values(this.targets)) { t.depthTexture?.dispose(); t.dispose(); }
    const opts = { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false };
    const scene = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
    scene.depthTexture = new THREE.DepthTexture(W, H);
    scene.depthTexture.type = THREE.UnsignedIntType;
    const hw = Math.max(1, W >> 1), hh = Math.max(1, H >> 1), qw = Math.max(1, W >> 2), qh = Math.max(1, H >> 2);
    this.targets = {
      scene,
      h1: new THREE.WebGLRenderTarget(hw, hh, opts), h2: new THREE.WebGLRenderTarget(hw, hh, opts), h3: new THREE.WebGLRenderTarget(hw, hh, opts),
      q1: new THREE.WebGLRenderTarget(qw, qh, opts), q2: new THREE.WebGLRenderTarget(qw, qh, opts), q3: new THREE.WebGLRenderTarget(qw, qh, opts),
    };
    this.post.resolution.value.set(W, H);
    this.onResize?.(w, h);
  }

  pass(mat, target) {
    this.quad.material = mat;
    this.gl.setRenderTarget(target);
    this.gl.render(this.quadScene, this.quadCam);
  }
  down(src, dst, threshold = 0) {
    this.downMat.uniforms.tSrc.value = src.texture;
    this.downMat.uniforms.texel.value.set(1 / src.width, 1 / src.height);
    this.downMat.uniforms.threshold.value = threshold;
    this.pass(this.downMat, dst);
  }
  blur(a, tmp, spread = 1) {
    this.blurMat.uniforms.tSrc.value = a.texture;
    this.blurMat.uniforms.dir.value.set(spread / a.width, 0);
    this.pass(this.blurMat, tmp);
    this.blurMat.uniforms.tSrc.value = tmp.texture;
    this.blurMat.uniforms.dir.value.set(0, spread / a.height);
    this.pass(this.blurMat, a);
  }

  render(scene, camera, time) {
    const T = this.targets;
    const gl = this.gl;
    gl.setRenderTarget(T.scene);
    gl.render(scene, camera);

    const fx = this.quality !== 'low';
    if (fx) {
      // depth-of-field pyramid
      this.down(T.scene, T.h1);
      this.blur(T.h1, T.h2, 1.0);
      this.down(T.h1, T.q1);
      this.blur(T.q1, T.q2, 1.2);
      this.blur(T.q1, T.q2, 2.0);
      // bloom
      this.down(T.scene, T.h3, 0.86);
      this.blur(T.h3, T.h2, 1.0);
      this.down(T.h3, T.q3);
      this.blur(T.q3, T.q2, 1.5);
      this.blur(T.q3, T.q2, 2.5);
    }

    const u = this.post;
    u.tScene.value = T.scene.texture;
    u.tDepth.value = T.scene.depthTexture;
    u.tBlur1.value = fx ? T.h1.texture : T.scene.texture;
    u.tBlur2.value = fx ? T.q1.texture : T.scene.texture;
    u.tBloom1.value = T.h3.texture;
    u.tBloom2.value = T.q3.texture;
    u.cameraNear.value = camera.near;
    u.cameraFar.value = camera.far;
    u.time.value = time % 100;
    const saveBloom = u.bloomStrength.value, saveDof = u.dofStrength.value;
    if (!fx) { u.bloomStrength.value = 0; u.dofStrength.value = 0; }
    this.quad.material = this.compMat;
    gl.setRenderTarget(null);
    gl.render(this.quadScene, this.quadCam);
    u.bloomStrength.value = saveBloom; u.dofStrength.value = saveDof;
  }
}
