// Generic sprite actors: townsfolk, pets, Soot, animals. Idle bob, wander, follow, bubbles.
import * as THREE from 'three';
import { Billboard, blobShadow } from '../gfx/billboard.js';
import { bubbleCanvas, iconCanvas, itemCanvas, petCanvas } from '../gfx/sprites.js';
import { damp, clamp } from '../core/util.js';

export class Actor {
  // frames: canvases; opts: { key, kind: 'npc'|'pet'|'cat'|'animal', shadowR, hop }
  constructor(frames, opts = {}) {
    this.bb = new Billboard(frames, { key: opts.key });
    this.group = new THREE.Group();
    this.group.add(this.bb.mesh);
    this.shadow = blobShadow(opts.shadowR || 0.36, 0.28);
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.kind = opts.kind || 'npc';
    this.hop = opts.hop || false;
    this.frames = frames.length;
    this.flip = false;
    this.t = Math.random() * 10;
    this.animDist = 0;
    this.bubble = null;
    this.bubbleKey = null;
    this.visible = true;
    this.frameMap = opts.frameMap || null; // {idle:[..], walk:[..]}
    this.speed = opts.speed || 3.2;
    this.home = null;
    this.wanderR = 0;
    this.target = null;
    this.data = opts.data || {};
  }
  addTo(scene) { scene.add(this.group, this.shadow); return this; }
  removeFrom(scene) { scene.remove(this.group, this.shadow); }
  place(x, y, z) {
    this.pos.set(x, y, z);
    this.sync();
  }
  setVisible(v) {
    this.visible = v;
    this.group.visible = v;
    this.shadow.visible = v;
  }
  setBubble(kind, inner = null) {
    const key = kind ? kind + ':' + (inner || '') : null;
    if (key === this.bubbleKey) return;
    this.bubbleKey = key;
    if (this.bubble) { this.group.remove(this.bubble.mesh); this.bubble = null; }
    if (!kind) return;
    let innerCanvas = null;
    if (inner) innerCanvas = inner.startsWith('icon:') ? iconCanvas(inner.slice(5)) : inner.startsWith('pet:') ? petCanvas(inner.slice(4)) : itemCanvas(inner);
    const c = bubbleCanvas(innerCanvas, kind === 'alert' ? 'alert' : kind);
    const bb = new Billboard([c], { key: 'bubble:' + key, shadow: false, basic: true });
    bb.mesh.position.y = this.bb.h + 0.1;
    bb.mesh.renderOrder = 6;
    this.bubble = bb;
    this.group.add(bb.mesh);
  }
  // Move toward (tx,tz) using a walkability function; returns true when arrived
  moveToward(tx, tz, dt, world, speed = this.speed, stopDist = 0.1) {
    const dx = tx - this.pos.x, dz = tz - this.pos.z;
    const d = Math.hypot(dx, dz);
    if (d < stopDist) { this.vel.x = damp(this.vel.x, 0, 12, dt); this.vel.z = damp(this.vel.z, 0, 12, dt); return true; }
    const s = Math.min(speed, d / Math.max(dt, 0.001));
    this.vel.x = damp(this.vel.x, (dx / d) * s, 10, dt);
    this.vel.z = damp(this.vel.z, (dz / d) * s, 10, dt);
    const nx = this.pos.x + this.vel.x * dt, nz = this.pos.z + this.vel.z * dt;
    if (!world || world.canWalkBox(nx, nz, 0.18, world.heightAt(this.pos.x, this.pos.z))) { this.pos.x = nx; this.pos.z = nz; }
    else if (world.canWalkBox(nx, this.pos.z, 0.18, world.heightAt(this.pos.x, this.pos.z))) this.pos.x = nx;
    else if (world.canWalkBox(this.pos.x, nz, 0.18, world.heightAt(this.pos.x, this.pos.z))) this.pos.z = nz;
    return false;
  }
  update(dt, world) {
    this.t += dt;
    const sp = Math.hypot(this.vel.x, this.vel.z);
    this.animDist += sp * dt;
    if (Math.abs(this.vel.x) > 0.15) this.flip = this.vel.x < 0;
    if (world) this.pos.y = damp(this.pos.y, world.groundY(this.pos.x, this.pos.z), 14, dt);
    this.moving = sp > 0.25;
    this.sync();
  }
  sync() {
    this.group.position.copy(this.pos);
    let frame = 0;
    let yoff = 0;
    const fm = this.frameMap;
    if (fm) {
      const list = this.moving ? fm.walk : this.sleeping && fm.sleep ? fm.sleep : fm.idle;
      frame = list[Math.floor((this.moving ? this.animDist * 3 : this.t * 1.5)) % list.length];
    } else if (this.frames > 1) {
      frame = Math.floor(this.t * 1.2) % this.frames;
    }
    if (this.hop && this.moving) yoff = Math.abs(Math.sin(this.animDist * 3.2)) * 0.22;
    else if (!this.moving && this.kind !== 'npc') yoff = 0;
    this.bb.setFrame(frame, this.flip);
    this.bb.mesh.position.y = yoff;
    // idle breathing: squash the sprite a hair
    const breathe = this.moving ? 1 : 1 + Math.sin(this.t * 2.2) * 0.018;
    this.bb.mesh.scale.set(1 / Math.sqrt(breathe), breathe, 1);
    this.shadow.position.set(this.pos.x, this.pos.y + 0.03, this.pos.z + 0.04);
    this.shadow.visible = this.visible;
    if (this.bubble) this.bubble.mesh.position.y = this.bb.h + 0.15 + Math.sin(this.t * 3) * 0.05;
  }
}
