// Dithered "see-through" circle: anything between the camera and the player is thinned out
// in a checkerboard pattern so foreground roofs and trees never hide the witch.
import * as THREE from 'three';

export const ST = {
  uST_P: { value: new THREE.Vector2(0.5, 0.5) },
  uST_Depth: { value: 20 },
  uST_Radius: { value: 0.15 },
  uST_Aspect: { value: 1.777 },
  uST_Res: { value: new THREE.Vector2(1280, 720) },
  uST_Pix: { value: 2 },
  uST_On: { value: 1 },
  uST_PW: { value: new THREE.Vector3() },
  uST_FG: { value: 1 },
};

export function applySeeThrough(mat) {
  if (!mat || mat.userData.seeThrough || !(mat.isMeshLambertMaterial || mat.isMeshStandardMaterial)) return;
  mat.userData.seeThrough = true;
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, r) => {
    if (prev) prev(sh, r);
    Object.assign(sh.uniforms, ST);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vSTWorld;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvSTWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
uniform vec2 uST_P; uniform float uST_Depth; uniform float uST_Radius; uniform float uST_Aspect; uniform vec2 uST_Res; uniform float uST_Pix; uniform float uST_On;
uniform vec3 uST_PW; uniform float uST_FG; varying vec3 vSTWorld;`)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
  if (uST_On > 0.5 && vViewPosition.z < uST_Depth - 1.2) {
    vec2 sp = gl_FragCoord.xy / uST_Res;
    vec2 dd = sp - uST_P; dd.x *= uST_Aspect;
    float rr = length(dd);
    if (rr < uST_Radius) {
      vec2 f = mod(floor(gl_FragCoord.xy / uST_Pix), 2.0);
      float edge = smoothstep(uST_Radius * 0.7, uST_Radius, rr);
      bool keep = (f.x + f.y) < 0.5 || (edge > 0.5 && (f.x + f.y) < 1.5);
      if (!keep) discard;
    }
  }
  if (uST_FG > 0.5) {
    // foreground cut-away: roofs and canopies south of the player thin out
    float fz = smoothstep(uST_PW.z + 2.5, uST_PW.z + 4.5, vSTWorld.z) * (1.0 - smoothstep(uST_PW.z + 22.0, uST_PW.z + 26.0, vSTWorld.z));
    float fy = smoothstep(uST_PW.y + 1.7, uST_PW.y + 2.6, vSTWorld.y);
    float fade = fz * fy;
    if (fade > 0.05) {
      vec2 f = mod(floor(gl_FragCoord.xy / uST_Pix), 2.0);
      float k = f.x + f.y * 2.0; // 0..3
      if ((k == 1.0 || k == 2.0) && fade > 0.3) discard;
    }
  }`);
  };
  const prevKey = mat.customProgramCacheKey?.bind(mat);
  mat.customProgramCacheKey = () => (prevKey ? prevKey() : '') + '|st';
  mat.needsUpdate = true;
}

export function applySeeThroughTree(obj) {
  obj.traverse((o) => {
    if (!o.isMesh) return;
    const ms = Array.isArray(o.material) ? o.material : [o.material];
    ms.forEach(applySeeThrough);
  });
}

const _v = new THREE.Vector3();
export function updateSeeThrough(camera, worldPos, renderer, enabled = true, foreground = true) {
  ST.uST_PW.value.copy(worldPos);
  ST.uST_FG.value = foreground ? 1 : 0;
  _v.copy(worldPos).project(camera);
  ST.uST_P.value.set(_v.x * 0.5 + 0.5, _v.y * 0.5 + 0.5);
  _v.copy(worldPos).applyMatrix4(camera.matrixWorldInverse);
  ST.uST_Depth.value = -_v.z;
  const W = renderer.width * renderer.pixelRatio, H = renderer.height * renderer.pixelRatio;
  ST.uST_Res.value.set(W, H);
  ST.uST_Aspect.value = W / H;
  ST.uST_Pix.value = Math.max(1, Math.round(renderer.pixelRatio * 2));
  ST.uST_On.value = enabled ? 1 : 0;
}
