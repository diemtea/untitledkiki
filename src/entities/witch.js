// The player: a young witch who walks, and flies on her broom with Miles and a basket of guests.
import * as THREE from 'three';
import { Billboard, blobShadow } from '../gfx/billboard.js';
import { witchSheet, petCanvas } from '../gfx/sprites.js';
import { clamp, damp, lerp } from '../core/util.js';

export const CRUISE_Y = 10;

export class Witch {
  constructor(world) {
    this.world = world; // { canWalk(x,z,fromH), groundY(x,z), heightAt(x,z), colliders? }
    const s = witchSheet();
    const frames = [...s.down, ...s.up, ...s.side, s.cheer];
    this.walkBB = new Billboard(frames, { key: 'witch-walk' });
    this.flyBB = new Billboard(s.fly, { key: 'witch-fly' });
    this.group = new THREE.Group();
    this.group.add(this.walkBB.mesh, this.flyBB.mesh);
    this.flyBB.mesh.visible = false;
    this.shadow = blobShadow(0.42, 0.3);
    this.flyShadow = blobShadow(1.0, 0.25);
    this.flyShadow.visible = false;
    // basket passengers (pet heads peeking out)
    this.basket = new THREE.Group();
    this.flyBB.mesh.add(this.basket);
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.facing = 'down';
    this.flip = false;
    this.mode = 'walk'; // walk | takeoff | fly | land
    this.modeT = 0;
    this.animDist = 0;
    this.speedMul = 1;
    this.flySpeed = 8.5;
    this.cheerT = 0;
    this.bob = 0;
    this.frozen = false;
    this.lastGroundY = 0;
  }
  addTo(scene) {
    scene.add(this.group, this.shadow, this.flyShadow);
  }
  place(x, z) {
    this.pos.set(x, this.world.groundY(x, z), z);
    this.vel.set(0, 0, 0);
    this.mode = 'walk';
    this.walkBB.mesh.visible = true;
    this.flyBB.mesh.visible = false;
    this.sync();
  }
  get flying() { return this.mode !== 'walk'; }

  setPassengers(species) {
    this.basket.clear();
    species.slice(0, 3).forEach((sp, i) => {
      const bb = new Billboard([petCanvas(sp)], { key: 'pet-' + sp, shadow: false, scale: 0.55 });
      bb.mesh.position.set(0.82 - i * 0.26, 0.8 + (i % 2) * 0.05, 0.02 + i * 0.01);
      this.basket.add(bb.mesh);
    });
  }

  startTakeoff() {
    if (this.mode !== 'walk') return false;
    this.mode = 'takeoff';
    this.modeT = 0;
    this.startY = this.pos.y;
    this.walkBB.mesh.visible = false;
    this.flyBB.mesh.visible = true;
    return true;
  }
  startLanding() {
    if (this.mode !== 'fly') return false;
    const gy = this.world.groundY(this.pos.x, this.pos.z);
    if (!this.world.canLand(this.pos.x, this.pos.z)) return false;
    this.mode = 'land';
    this.modeT = 0;
    this.startY = this.pos.y;
    this.landY = gy;
    return true;
  }

  update(dt, input, t) {
    const ax = this.frozen ? { x: 0, y: 0 } : input.axis();
    if (this.mode === 'walk') this.updateWalk(dt, ax, input);
    else this.updateFly(dt, ax, input, t);
    if (this.cheerT > 0) this.cheerT -= dt;
    this.sync(t);
  }

  updateWalk(dt, ax, input) {
    const run = input.held('run');
    const speed = (run ? 6.2 : 4.0) * this.speedMul;
    const tvx = ax.x * speed, tvz = ax.y * speed;
    this.vel.x = damp(this.vel.x, tvx, 18, dt);
    this.vel.z = damp(this.vel.z, tvz, 18, dt);
    const r = 0.26;
    const nx = this.pos.x + this.vel.x * dt;
    const nz = this.pos.z + this.vel.z * dt;
    const h = this.world.heightAt(this.pos.x, this.pos.z);
    if (this.world.canWalkBox(nx, this.pos.z, r, h)) this.pos.x = nx; else this.vel.x = 0;
    if (this.world.canWalkBox(this.pos.x, nz, r, h)) this.pos.z = nz; else this.vel.z = 0;
    const gy = this.world.groundY(this.pos.x, this.pos.z);
    this.pos.y = damp(this.pos.y, gy, 20, dt);
    const sp = Math.hypot(this.vel.x, this.vel.z);
    if (Math.abs(ax.x) > 0.1 || Math.abs(ax.y) > 0.1) {
      if (Math.abs(ax.x) > Math.abs(ax.y) * 0.8) { this.facing = 'side'; this.flip = ax.x < 0; }
      else this.facing = ax.y < 0 ? 'up' : 'down';
    }
    this.animDist += sp * dt;
    this.moving = sp > 0.3;
  }

  updateFly(dt, ax, input, t) {
    if (this.mode === 'takeoff') {
      this.modeT += dt / 1.1;
      const k = Math.min(1, this.modeT);
      const e = 1 - (1 - k) * (1 - k);
      this.pos.y = lerp(this.startY, CRUISE_Y, e);
      if (k >= 1) this.mode = 'fly';
    } else if (this.mode === 'land') {
      this.modeT += dt / 1.0;
      const k = Math.min(1, this.modeT);
      const e = k * k * (3 - 2 * k);
      this.pos.y = lerp(this.startY, this.landY, e);
      this.vel.multiplyScalar(Math.exp(-4 * dt));
      this.pos.x += this.vel.x * dt;
      this.pos.z += this.vel.z * dt;
      if (k >= 1) {
        this.mode = 'walk';
        this.walkBB.mesh.visible = true;
        this.flyBB.mesh.visible = false;
        this.facing = 'down';
        this.vel.set(0, 0, 0);
      }
      return;
    }
    const boost = input.held('run') ? 1.55 : 1;
    const maxS = this.flySpeed * boost * this.speedMul;
    const tvx = ax.x * maxS, tvz = ax.y * maxS;
    const k = Math.abs(ax.x) + Math.abs(ax.y) > 0.05 ? 3.2 : 1.6;
    this.vel.x = damp(this.vel.x, tvx, k, dt);
    this.vel.z = damp(this.vel.z, tvz, k, dt);
    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;
    // tall landmarks
    for (const c of this.world.colliders || []) {
      const dx = this.pos.x - c.x, dz = this.pos.z - c.z;
      const d = Math.hypot(dx, dz);
      if (d < c.r && this.pos.y < c.top) {
        const push = (c.r - d) / Math.max(d, 0.001);
        this.pos.x += dx * push; this.pos.z += dz * push;
      }
    }
    // soft world bounds (a gentle headwind pushes you back)
    const b = this.world.bounds;
    if (b) {
      if (this.pos.x < b.x0) this.vel.x += (b.x0 - this.pos.x) * 4 * dt;
      if (this.pos.x > b.x1) this.vel.x -= (this.pos.x - b.x1) * 4 * dt;
      if (this.pos.z < b.z0) this.vel.z += (b.z0 - this.pos.z) * 4 * dt;
      if (this.pos.z > b.z1) this.vel.z -= (this.pos.z - b.z1) * 4 * dt;
      this.outOfBounds = this.pos.x < b.x0 || this.pos.x > b.x1 || this.pos.z < b.z0 || this.pos.z > b.z1;
    }
    if (this.mode === 'fly') this.pos.y = CRUISE_Y + Math.sin(t * 1.8) * 0.12;
    if (Math.abs(this.vel.x) > 0.4) this.flip = this.vel.x < 0;
    this.speed = Math.hypot(this.vel.x, this.vel.z);
  }

  cheer(sec = 1.1) { this.cheerT = sec; }

  sync(t = 0) {
    this.group.position.copy(this.pos);
    if (this.mode === 'walk') {
      const base = { down: 0, up: 4, side: 8 }[this.facing];
      let f = base;
      if (this.moving) f = base + (Math.floor(this.animDist * 2.6) % 4);
      if (this.cheerT > 0) f = 12;
      this.walkBB.setFrame(f, this.facing === 'side' && this.flip);
      this.walkBB.mesh.position.y = this.moving && (Math.floor(this.animDist * 2.6) % 2 === 1) ? 1 / 16 : 0;
      this.shadow.visible = true;
      this.flyShadow.visible = false;
      this.shadow.position.set(this.pos.x, this.pos.y + 0.03, this.pos.z + 0.05);
    } else {
      const ft = Math.floor(t * 6) % 2;
      this.flyBB.setFrame(ft, this.flip);
      this.flyBB.mesh.rotation.z = clamp(-this.vel.x * 0.01, -0.1, 0.1);
      this.basket.position.x = 0;
      this.basket.scale.x = this.flip ? -1 : 1;
      const gy = this.world.groundY(this.pos.x, this.pos.z);
      this.shadow.visible = false;
      this.flyShadow.visible = true;
      this.flyShadow.position.set(this.pos.x, Math.max(gy, -0.2) + 0.04, this.pos.z);
      const hgt = this.pos.y - gy;
      const s = clamp(1.2 - hgt * 0.04, 0.6, 1.2);
      this.flyShadow.scale.set(s, s, s);
      this.flyShadow.material.opacity = clamp(0.35 - hgt * 0.012, 0.12, 0.35);
    }
  }
}
