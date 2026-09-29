// Time-of-day palettes: dawn peach, cerulean noon, golden hour, indigo night with warm windows.
import * as THREE from 'three';
import { lerp, clamp, smooth } from '../core/util.js';

const K = [
  // Storybook palettes: saturated, hue-shifted (violet shadows, gold highlights), pink dawns and dusks.
  // sh/hl = split-tone multipliers for shadows / highlights; dream = soft glow amount.
  { h: 0, top: '#161458', hor: '#3a3a90', sun: '#b8c4ff', si: 0.6, hs: '#7a7ad8', hg: '#2a2a50', hi: 0.9, fog: '#262a66', tint: [0.9, 0.9, 1.04], lift: [0.03, 0.03, 0.07], sat: 1.12, stars: 1, glow: 1.7, sh: [0.88, 0.86, 1.16], hl: [1.06, 1.0, 0.9], dream: 0.26 },
  { h: 4.5, top: '#262066', hor: '#4a44a0', sun: '#b8c4ff', si: 0.55, hs: '#7a74d8', hg: '#2e2a56', hi: 0.88, fog: '#343478', tint: [0.9, 0.9, 1.04], lift: [0.03, 0.03, 0.07], sat: 1.1, stars: 0.9, glow: 1.5, sh: [0.88, 0.86, 1.16], hl: [1.06, 1.0, 0.9], dream: 0.24 },
  { h: 6, top: '#7a78e0', hor: '#ffb4b8', sun: '#ffbc96', si: 1.05, hs: '#c4aef0', hg: '#8a6a80', hi: 0.9, fog: '#f8c4d4', tint: [1.04, 0.96, 0.99], lift: [0.03, 0.01, 0.03], sat: 1.18, stars: 0.15, glow: 0.6, sh: [0.9, 0.8, 1.22], hl: [1.08, 1.0, 0.92], dream: 0.22 },
  { h: 7.5, top: '#4ab2f8', hor: '#ffeccc', sun: '#ffeeb8', si: 1.75, hs: '#b8ccff', hg: '#7aa050', hi: 1.0, fog: '#eaf2ff', tint: [1.03, 1.0, 0.97], lift: [0.01, 0.01, 0.02], sat: 1.24, stars: 0, glow: 0.0, sh: [0.88, 0.86, 1.18], hl: [1.07, 1.02, 0.9], dream: 0.15 },
  { h: 12, top: '#2f9cf5', hor: '#c2f2ff', sun: '#fff4d2', si: 2.0, hs: '#b4d6ff', hg: '#80b050', hi: 1.02, fog: '#dcf6ff', tint: [1.02, 1.01, 0.98], lift: [0.0, 0.01, 0.02], sat: 1.26, stars: 0, glow: 0.0, sh: [0.88, 0.88, 1.16], hl: [1.06, 1.03, 0.92], dream: 0.13 },
  { h: 16, top: '#3a98f0', hor: '#e2f6ea', sun: '#fff0c8', si: 1.9, hs: '#b8d2ff', hg: '#88a850', hi: 0.98, fog: '#eaf6ee', tint: [1.03, 1.0, 0.97], lift: [0.0, 0.01, 0.02], sat: 1.26, stars: 0, glow: 0.0, sh: [0.88, 0.86, 1.16], hl: [1.07, 1.02, 0.9], dream: 0.15 },
  { h: 18.3, top: '#6a78e0', hor: '#ffc884', sun: '#ffb45c', si: 1.65, hs: '#e8b8dc', hg: '#8a6050', hi: 0.92, fog: '#ffd2aa', tint: [1.06, 0.98, 0.92], lift: [0.03, 0.01, 0.03], sat: 1.26, stars: 0, glow: 0.4, sh: [0.95, 0.78, 1.2], hl: [1.1, 1.0, 0.86], dream: 0.22 },
  { h: 19.6, top: '#4a4ab8', hor: '#ff9ca4', sun: '#ff8c7a', si: 0.95, hs: '#bca2e4', hg: '#4a3a60', hi: 0.88, fog: '#da92bc', tint: [1.0, 0.93, 0.99], lift: [0.03, 0.01, 0.05], sat: 1.22, stars: 0.35, glow: 1.2, sh: [0.9, 0.76, 1.28], hl: [1.08, 0.98, 0.9], dream: 0.24 },
  { h: 21, top: '#1e1a66', hor: '#4a44a0', sun: '#b8c4ff', si: 0.62, hs: '#7a74d8', hg: '#2e2a56', hi: 0.9, fog: '#2e2e74', tint: [0.9, 0.9, 1.04], lift: [0.03, 0.03, 0.07], sat: 1.12, stars: 0.95, glow: 1.7, sh: [0.88, 0.86, 1.16], hl: [1.06, 1.0, 0.9], dream: 0.26 },
  { h: 24, top: '#161458', hor: '#3a3a90', sun: '#b8c4ff', si: 0.6, hs: '#7a7ad8', hg: '#2a2a50', hi: 0.9, fog: '#262a66', tint: [0.9, 0.9, 1.04], lift: [0.03, 0.03, 0.07], sat: 1.12, stars: 1, glow: 1.7, sh: [0.88, 0.86, 1.16], hl: [1.06, 1.0, 0.9], dream: 0.26 },
];
const cA = new THREE.Color(), cB = new THREE.Color();
function lerpColor(out, a, b, t) {
  cA.set(a); cB.set(b);
  return out.copy(cA).lerp(cB, t);
}

export class Sky {
  constructor() {
    this.top = new THREE.Color();
    this.horizon = new THREE.Color();
    this.sun = new THREE.Color();
    this.hemiSky = new THREE.Color();
    this.hemiGround = new THREE.Color();
    this.fog = new THREE.Color();
    this.tint = new THREE.Vector3();
    this.lift = new THREE.Vector3();
    this.shadowTint = new THREE.Vector3();
    this.highlightTint = new THREE.Vector3();
    this.sunDir = new THREE.Vector3();
    this.moonDir = new THREE.Vector3(-0.3, 0.8, 0.4).normalize();
    this.light = new THREE.Color();
  }
  // hour: 0..24 (float); weather: {cloud 0..1, rain 0..1}
  compute(hour, weather = { cloud: 0, rain: 0 }) {
    hour = ((hour % 24) + 24) % 24;
    let i = 0;
    while (i < K.length - 2 && K[i + 1].h <= hour) i++;
    const a = K[i], b = K[i + 1];
    const t = smooth(clamp((hour - a.h) / (b.h - a.h), 0, 1));
    lerpColor(this.top, a.top, b.top, t);
    lerpColor(this.horizon, a.hor, b.hor, t);
    lerpColor(this.sun, a.sun, b.sun, t);
    lerpColor(this.hemiSky, a.hs, b.hs, t);
    lerpColor(this.hemiGround, a.hg, b.hg, t);
    lerpColor(this.fog, a.fog, b.fog, t);
    this.sunIntensity = lerp(a.si, b.si, t);
    this.hemiIntensity = lerp(a.hi, b.hi, t);
    this.tint.set(lerp(a.tint[0], b.tint[0], t), lerp(a.tint[1], b.tint[1], t), lerp(a.tint[2], b.tint[2], t));
    this.lift.set(lerp(a.lift[0], b.lift[0], t), lerp(a.lift[1], b.lift[1], t), lerp(a.lift[2], b.lift[2], t));
    this.saturation = lerp(a.sat, b.sat, t);
    this.shadowTint.set(lerp(a.sh[0], b.sh[0], t), lerp(a.sh[1], b.sh[1], t), lerp(a.sh[2], b.sh[2], t));
    this.highlightTint.set(lerp(a.hl[0], b.hl[0], t), lerp(a.hl[1], b.hl[1], t), lerp(a.hl[2], b.hl[2], t));
    this.dream = lerp(a.dream, b.dream, t);
    this.stars = lerp(a.stars, b.stars, t);
    this.glow = lerp(a.glow, b.glow, t);
    this.night = clamp(this.stars, 0, 1);

    // Sun arcs from the east through the south (behind the camera) to the west.
    const dayT = clamp((hour - 5.5) / 14, 0, 1); // 5:30 -> 19:30
    const az = dayT * Math.PI; // 0 east, pi/2 south, pi west
    const el = Math.sin(dayT * Math.PI) * 0.95 + 0.18;
    this.sunDir.set(Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el) * 0.8 + 0.35).normalize();
    this.isNight = hour < 5.6 || hour > 20.3;
    if (this.isNight) this.lightDir = this.moonDir; else this.lightDir = this.sunDir;

    // weather: overcast flattens and cools everything
    const cl = weather.cloud || 0, rn = weather.rain || 0;
    if (cl > 0) {
      // soft lavender overcast rather than dull grey
      this.top.lerp(new THREE.Color('#8a90c8'), cl * 0.6);
      this.horizon.lerp(new THREE.Color('#d4d0ec'), cl * 0.6);
      this.fog.lerp(new THREE.Color('#b8b8dc'), cl * 0.6);
      this.dream += cl * 0.06;
      this.sunIntensity *= 1 - cl * 0.55;
      this.hemiIntensity *= 1 + cl * 0.15;
      this.saturation *= 1 - cl * 0.1;
      this.tint.multiplyScalar(1 - rn * 0.12);
    }
    this.light.copy(this.hemiSky).multiplyScalar(0.35 + this.hemiIntensity * 0.3).add(cA.copy(this.sun).multiplyScalar(this.sunIntensity * 0.3));
    this.lampOn = hour > 18.6 || hour < 6.6 || rn > 0.5 ? 1 : 0;
    return this;
  }
}
