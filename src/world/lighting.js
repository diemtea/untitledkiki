// Time-of-day palettes: dawn peach, cerulean noon, golden hour, indigo night with warm windows.
import * as THREE from 'three';
import { lerp, clamp, smooth } from '../core/util.js';

const K = [
  // hour, sky top, horizon, sun colour, sun int, hemi sky, hemi ground, hemi int, fog, tint, lift, sat, stars, glow
  { h: 0, top: '#0f1a3a', hor: '#2a3a6a', sun: '#8aa4e8', si: 0.35, hs: '#3a4a8a', hg: '#1a1a30', hi: 0.55, fog: '#1e2a50', tint: [0.72, 0.78, 1.0], lift: [0.02, 0.02, 0.06], sat: 0.85, stars: 1, glow: 1.6 },
  { h: 4.5, top: '#1a2450', hor: '#3a4a7a', sun: '#8aa4e8', si: 0.3, hs: '#3a4a8a', hg: '#1a1a30', hi: 0.55, fog: '#28345c', tint: [0.75, 0.8, 1.0], lift: [0.02, 0.02, 0.06], sat: 0.85, stars: 0.9, glow: 1.4 },
  { h: 6, top: '#6a7ab8', hor: '#f4b89a', sun: '#ffb080', si: 0.9, hs: '#9aa8d8', hg: '#6a5060', hi: 0.7, fog: '#e8b8a8', tint: [1.0, 0.92, 0.9], lift: [0.03, 0.01, 0.02], sat: 1.0, stars: 0.2, glow: 0.6 },
  { h: 7.5, top: '#6aaee0', hor: '#ffe0c0', sun: '#ffe0b0', si: 1.6, hs: '#b8d4f0', hg: '#8a8060', hi: 0.8, fog: '#f0e0d0', tint: [1.02, 0.99, 0.95], lift: [0.01, 0.01, 0.0], sat: 1.06, stars: 0, glow: 0.0 },
  { h: 12, top: '#4a9ee0', hor: '#d0ecf8', sun: '#fff6e0', si: 2.0, hs: '#c8e4f8', hg: '#8a9a60', hi: 0.85, fog: '#d8ecf4', tint: [1.0, 1.0, 1.0], lift: [0.0, 0.0, 0.0], sat: 1.08, stars: 0, glow: 0.0 },
  { h: 16, top: '#4a9ad8', hor: '#e8ecd8', sun: '#fff0d0', si: 1.9, hs: '#c8e0f0', hg: '#8a9060', hi: 0.8, fog: '#e4ecdc', tint: [1.02, 1.0, 0.96], lift: [0.0, 0.0, 0.0], sat: 1.08, stars: 0, glow: 0.0 },
  { h: 18.3, top: '#6a88c8', hor: '#ffc080', sun: '#ffb060', si: 1.5, hs: '#e0b8b0', hg: '#7a6050', hi: 0.75, fog: '#f4c8a0', tint: [1.05, 0.96, 0.88], lift: [0.03, 0.01, 0.01], sat: 1.08, stars: 0, glow: 0.4 },
  { h: 19.6, top: '#4a5a98', hor: '#f0a080', sun: '#ff9a60', si: 0.8, hs: '#b0a0b8', hg: '#4a3a50', hi: 0.72, fog: '#c8949a', tint: [1.0, 0.9, 0.9], lift: [0.02, 0.01, 0.03], sat: 1.04, stars: 0.3, glow: 1.2 },
  { h: 21, top: '#1a2450', hor: '#4a4a80', sun: '#8aa4e8', si: 0.4, hs: '#4a5a9a', hg: '#1e1e36', hi: 0.6, fog: '#2e3860', tint: [0.75, 0.8, 1.0], lift: [0.02, 0.02, 0.06], sat: 0.88, stars: 0.9, glow: 1.6 },
  { h: 24, top: '#0f1a3a', hor: '#2a3a6a', sun: '#8aa4e8', si: 0.35, hs: '#3a4a8a', hg: '#1a1a30', hi: 0.55, fog: '#1e2a50', tint: [0.72, 0.78, 1.0], lift: [0.02, 0.02, 0.06], sat: 0.85, stars: 1, glow: 1.6 },
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
      const grey = new THREE.Color('#9aa4b4');
      this.top.lerp(grey, cl * 0.6);
      this.horizon.lerp(new THREE.Color('#c4cad4'), cl * 0.6);
      this.fog.lerp(new THREE.Color('#aab4c0'), cl * 0.6);
      this.sunIntensity *= 1 - cl * 0.55;
      this.hemiIntensity *= 1 + cl * 0.15;
      this.saturation *= 1 - cl * 0.18;
      this.tint.multiplyScalar(1 - rn * 0.12);
    }
    this.light.copy(this.hemiSky).multiplyScalar(0.35 + this.hemiIntensity * 0.3).add(cA.copy(this.sun).multiplyScalar(this.sunIntensity * 0.3));
    this.lampOn = hour > 18.6 || hour < 6.6 || rn > 0.5 ? 1 : 0;
    return this;
  }
}
