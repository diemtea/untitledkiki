// The outdoor island stage: Maravik town, woods, meadow, beaches, sky — walkable and flyable.
import * as THREE from 'three';
import { buildIsland, levelY, WATER_Y, T, W, H } from './island.js';
import { buildTerrainMesh, buildShoreTexture } from './terrain.js';
import { buildTerrainAtlas } from '../gfx/tiles.js';
import { createWater } from '../gfx/water.js';
import { createSky, createClouds } from '../gfx/sky.js';
import { SpriteBatch } from '../gfx/batch.js';
import { Particles } from '../gfx/particles.js';
import { Billboard } from '../gfx/billboard.js';
import { treeCanvas, nodeCanvas, npcCanvas, NPC_LOOKS, tuftCanvas, rockCanvas, sheepCanvas, chickenCanvas, gullCanvas, sootSheet, petCanvas, randomOwnerLook, itemCanvas, iconCanvas } from '../gfx/sprites.js';
import { buildBuilding, glowMaterials, lampPost, bench, barrel, crate, flowerPotCanvas, stall, fountain, windmill, lighthouse, boat, fence, signpost, launchpad } from './buildings.js';
import { Witch, CRUISE_Y } from '../entities/witch.js';
import { Actor } from '../entities/actor.js';
import { Sky } from './lighting.js';
import { rng, damp, clamp, hash2, dist } from '../core/util.js';
import { applySeeThrough, applySeeThroughTree, updateSeeThrough, ST } from '../gfx/seethrough.js';

export class Overworld {
  constructor(game) {
    this.name = 'world';
    this.game = game;
    const I = (this.I = buildIsland());
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.5, 520);
    this.skyState = new Sky();
    this.time = 0;
    this.bounds = { x0: -4, x1: W + 4, z0: -2, z1: H + 6 };

    // --- terrain & sea
    this.atlas = buildTerrainAtlas();
    this.terrain = buildTerrainMesh(I, this.atlas);
    this.scene.add(this.terrain);
    this.shoreTex = buildShoreTexture(I);
    this.water = createWater(this.shoreTex, W, H, WATER_Y);
    this.scene.add(this.water);
    this.sky = createSky();
    this.scene.add(this.sky);
    this.clouds = createClouds(24, { x0: -60, x1: W + 60, y0: 14, y1: 19, z0: -40, z1: H + 30 }, 9);
    this.scene.add(this.clouds);
    this.scene.fog = new THREE.Fog('#d8ecf4', 70, 260);

    // --- lights
    this.hemi = new THREE.HemisphereLight('#c8e4f8', '#8a9a60', 0.9);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight('#fff6e0', 2);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.left = -26; sc.right = 26; sc.top = 26; sc.bottom = -26; sc.near = 1; sc.far = 120;
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.03;
    this.scene.add(this.sun, this.sun.target);
    this.lampLights = [];
    for (let i = 0; i < 6; i++) {
      const l = new THREE.PointLight('#ffb45a', 0, 9, 1.6);
      this.lampLights.push(l);
      this.scene.add(l);
    }
    this.playerLight = new THREE.PointLight('#ffd9a8', 0, 6, 1.4);
    this.scene.add(this.playerLight);

    // --- buildings & props
    this.lamps = [];
    this.animated = [];
    this.colliders = [];
    this.buildingMeshes = {};
    for (const b of I.buildings) {
      const g = buildBuilding(b, levelY);
      applySeeThroughTree(g);
      this.scene.add(g);
      this.buildingMeshes[b.id] = g;
      if (b.kind === 'tower') { this.clockTower = g; this.colliders.push({ x: b.x + b.w / 2, z: b.z + b.d / 2, r: 2.4, top: 20 }); }
      if (g.userData.lanterns) for (const p of g.userData.lanterns) this.lamps.push({ pos: p.clone().add(g.position), mat: null });
    }
    const batch = new SpriteBatch();
    this.batch = batch;
    for (const p of I.props) this.addProp(p, batch);

    // --- trees
    for (const t of I.trees) {
      const variant = t.seed % 5;
      const c = treeCanvas(t.kind, variant + (t.kind === 'oak' ? 10 : t.kind === 'pine' ? 20 : 30));
      const y = levelY(I.height[I.idx(t.x | 0, t.z | 0)]);
      batch.add(c, t.x, y, t.z, { sway: t.kind === 'cypress' ? 0.6 : 1, scale: t.kind === 'cypress' ? 1.05 : 1 });
      if (t.kind === 'pine' || t.kind === 'cypress') this.colliders.push({ x: t.x, z: t.z, r: 0.4, top: y + 3.4 });
    }
    // decorative tufts, flowers & rocks
    const R = rng(99);
    for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
      const i = I.idx(x, z);
      const t = I.type[i];
      if (I.blocked[i]) continue;
      const y = levelY(I.height[i]);
      if (t === T.GRASS || t === T.MEADOW || t === T.FOREST || t === T.FLOWERS) {
        const n = t === T.MEADOW ? 2 : t === T.FOREST ? 2 : 1;
        for (let k = 0; k < n; k++) {
          if (R() > 0.42) continue;
          const kind = t === T.FOREST ? 'forest' : t === T.MEADOW ? 'meadow' : t === T.FLOWERS ? 'flower' : R() < 0.15 ? 'flower' : 'grass';
          batch.add(tuftCanvas(kind, R.int(0, 7)), x + R.range(0.15, 0.85), y, z + R.range(0.15, 0.85), { sway: 0.5, sink: 0.02 });
        }
      } else if ((t === T.SAND || t === T.ROCK) && R() < 0.05) {
        batch.add(rockCanvas(R.int(1, 6)), x + 0.5, y, z + 0.5, { sink: 0.1 });
      }
    }

    // --- forage nodes (visuals)
    this.nodeSprites = [];
    this.sheep = [];
    I.nodes.forEach((n, k) => {
      const y = levelY(I.height[I.idx(n.x | 0, n.z | 0)]);
      n.y = y;
      if (n.visual === 'sheep') {
        const a = new Actor([sheepCanvas(0), sheepCanvas(1)], { key: 'sheep', kind: 'animal', shadowR: 0.5, speed: 0.9, frameMap: { idle: [0], walk: [0, 1] } });
        a.place(n.x, y, n.z);
        a.home = { x: n.x, z: n.z };
        a.addTo(this.scene);
        a.nodeIndex = k;
        this.sheep.push(a);
        n.actor = a;
        return;
      }
      const seed = 50 + k;
      const full = nodeCanvas(n.visual, seed);
      const scale = ['shell', 'driftwood', 'glint', 'pebbles', 'feathers', 'bundle', 'herb', 'herb2', 'flowerpatch', 'clover', 'mushroom'].includes(n.visual) ? 0.75 : 1;
      const idFull = batch.add(full, n.x, y, n.z, { scale, sway: ['herb', 'herb2', 'flowerpatch', 'clover', 'sunflower'].includes(n.visual) ? 0.4 : 0 });
      let idEmpty = -1;
      if (n.visual === 'berrybush') idEmpty = batch.add(nodeCanvas('bushEmpty', seed), n.x, y, n.z, {});
      if (n.visual === 'sunflower') idEmpty = batch.add(nodeCanvas('sunflowerEmpty', seed), n.x, y, n.z, {});
      if (n.visual === 'beehive' || n.visual === 'coop' || n.visual === 'mossrock') idEmpty = -2; // stays visible
      this.nodeSprites[k] = { idFull, idEmpty };
    });
    // chickens pecking near the coop
    this.chickens = [];
    const coop = I.nodes.find((n) => n.visual === 'coop');
    if (coop) for (let i = 0; i < 3; i++) {
      const c = new Actor([chickenCanvas(0), chickenCanvas(1)], { key: 'chicken', kind: 'animal', shadowR: 0.2, speed: 1.2, frameMap: { idle: [0], walk: [0, 1] } });
      c.place(coop.x + 1 + i * 0.6, coop.y, coop.z + 1.2);
      c.home = { x: coop.x + 1.5, z: coop.z + 1.5 };
      c.addTo(this.scene);
      this.chickens.push(c);
    }

    this.scene.add(batch.build());
    applySeeThrough(batch.mesh.material);
    // hide empty variants initially
    for (const ns of this.nodeSprites) if (ns && ns.idEmpty >= 0) batch.setVisible(ns.idEmpty, false);

    // --- seagulls circling the harbour
    this.gulls = [];
    const gullTex = [gullCanvas(0), gullCanvas(1)];
    for (let i = 0; i < 5; i++) {
      const bb = new Billboard(gullTex, { key: 'gull', shadow: false });
      bb.mesh.userData = { cx: 50 + (i - 2) * 6, cz: 66 + (i % 2) * 4, r: 4 + i, sp: 0.3 + i * 0.05, y: 6 + i * 0.8, ph: i * 1.7 };
      this.scene.add(bb.mesh);
      this.gulls.push(bb);
    }

    // --- townsfolk
    this.npcs = {};
    for (const n of I.npcs) {
      const look = NPC_LOOKS[n.look];
      const a = new Actor([npcCanvas(look, 0)], { key: 'npc-' + n.id, kind: 'npc' });
      a.place(n.x, levelY(I.height[I.idx(n.x | 0, n.z | 0)]), n.z);
      a.addTo(this.scene);
      a.id = n.id;
      this.npcs[n.id] = a;
    }
    this.owners = {}; // guestId -> Actor

    // --- particles
    this.fx = new Particles(1400);
    this.glowFx = new Particles(500, { additive: true });
    this.scene.add(this.fx.points, this.glowFx.points);

    // --- player & followers
    this.witch = new Witch(this);
    this.witch.addTo(this.scene);
    const sheet = sootSheet();
    this.soot = new Actor([sheet.walk[0], sheet.walk[1], sheet.sit, sheet.sleep], { key: 'soot', kind: 'cat', shadowR: 0.3, frameMap: { idle: [2], walk: [0, 1], sleep: [3] } });
    this.soot.addTo(this.scene);
    this.followers = [];
    this.trail = [];
    this.markers = [];
    this.markerGroup = new THREE.Group();
    this.scene.add(this.markerGroup);
    this.dynamic = [];

    // camera rig
    this.cam = { target: new THREE.Vector3(), dist: 18, pitch: 0.62, fov: 30 };
    this.shake = 0;
  }

  // ------------------------------------------------------------------ world queries
  tileH(x, z) {
    const tx = Math.floor(x), tz = Math.floor(z);
    if (tx < 0 || tz < 0 || tx >= W || tz >= H) return -1;
    return this.I.height[tz * W + tx];
  }
  heightAt(x, z) { return this.tileH(x, z); }
  groundY(x, z) {
    const h = this.tileH(x, z);
    return h < 0 ? WATER_Y - 0.1 : levelY(h);
  }
  walkable(tx, tz) {
    if (tx < 0 || tz < 0 || tx >= W || tz >= H) return false;
    const i = tz * W + tx;
    return this.I.land[i] && !this.I.blocked[i] && this.I.type[i] !== T.WATER;
  }
  canWalkBox(x, z, r, fromH) {
    for (const [dx, dz] of [[-r, -r], [r, -r], [-r, r], [r, r]]) {
      const tx = Math.floor(x + dx), tz = Math.floor(z + dz);
      if (!this.walkable(tx, tz)) return false;
      if (Math.abs(this.I.height[tz * W + tx] - fromH) > 0.51) return false;
    }
    return true;
  }
  canLand(x, z) { return this.walkable(Math.floor(x), Math.floor(z)); }

  // ------------------------------------------------------------------ props
  addProp(p, batch) {
    const I = this.I;
    const y = levelY(I.height[I.idx(Math.floor(p.x), Math.floor(p.z))]);
    let obj = null;
    switch (p.kind) {
      case 'lamp': {
        obj = lampPost();
        obj.position.set(p.x - 0.2, y, p.z);
        this.lamps.push({ pos: obj.userData.lightOffset.clone().add(obj.position), mat: obj.userData.lanternMat });
        this.lanternMat = obj.userData.lanternMat;
        break;
      }
      case 'bench': obj = bench(); obj.position.set(p.x, y, p.z); break;
      case 'barrel': obj = barrel(); obj.position.set(p.x, y, p.z); break;
      case 'crate': obj = crate(); obj.position.set(p.x, y, p.z); break;
      case 'pot': batch.add(flowerPotCanvas(p.seed), p.x, y, p.z, { sway: 0.2 }); return;
      case 'stall': obj = stall(p.color); obj.position.set(p.x, y, p.z); break;
      case 'fountain': {
        obj = fountain(); obj.position.set(p.x, y, p.z);
        this.fountainPos = obj.position.clone().add(obj.userData.spray);
        break;
      }
      case 'windmill': {
        obj = windmill(); obj.position.set(p.x, y, p.z);
        this.windmillHub = obj.userData.hub;
        this.colliders.push({ x: p.x, z: p.z, r: 2.2, top: y + 7 });
        break;
      }
      case 'lighthouse': {
        obj = lighthouse(); obj.position.set(p.x, y, p.z);
        this.lighthouse = obj;
        this.colliders.push({ x: p.x, z: p.z, r: 1.8, top: y + 9 });
        break;
      }
      case 'boat': {
        obj = boat(p.color); obj.position.set(p.x, WATER_Y - 0.1, p.z);
        obj.rotation.y = hash2(p.x | 0, p.z | 0) * 0.8 - 0.4;
        this.animated.push({ obj, type: 'boat', ph: p.x });
        break;
      }
      case 'fence': obj = fence(p.dir); obj.position.set(p.x, y, p.z); break;
      case 'signpost': obj = signpost(p.text); obj.position.set(p.x, y, p.z); break;
      case 'launchpad': obj = launchpad(); obj.position.set(p.x, y + 0.01, p.z); break;
    }
    if (obj) {
      if (p.kind !== 'launchpad' && p.kind !== 'boat') applySeeThroughTree(obj);
      this.scene.add(obj);
    }
  }

  // ------------------------------------------------------------------ node state
  setNodeAvailable(k, avail) {
    const n = this.I.nodes[k];
    if (n.actor) {
      n.actor.bb.setFrame(0);
      const sheared = !avail;
      if (n.actor._sheared !== sheared) {
        n.actor._sheared = sheared;
        const s = new Billboard([sheepCanvas(0, sheared), sheepCanvas(1, sheared)], { key: 'sheep' + (sheared ? 'S' : '') });
        n.actor.group.remove(n.actor.bb.mesh);
        n.actor.bb = s;
        n.actor.group.add(s.mesh);
      }
      return;
    }
    const ns = this.nodeSprites[k];
    if (!ns) return;
    if (ns.idEmpty === -2) return;
    this.batch.setVisible(ns.idFull, avail);
    if (ns.idEmpty >= 0) this.batch.setVisible(ns.idEmpty, !avail);
  }

  // ------------------------------------------------------------------ owners, followers, markers
  showOwner(key, look, x, z) {
    if (this.owners[key]) return this.owners[key];
    const a = new Actor([npcCanvas(look, 0)], { key: 'owner-' + JSON.stringify(look).length + key, kind: 'npc' });
    a.place(x, this.groundY(x, z), z);
    a.addTo(this.scene);
    this.owners[key] = a;
    return a;
  }
  hideOwner(key) {
    const a = this.owners[key];
    if (a) { a.removeFrom(this.scene); delete this.owners[key]; }
  }
  setFollowers(list) {
    // list: [{key, species}]
    const keys = list.map((l) => l.key).join(',');
    if (keys === this._followKeys) return;
    this._followKeys = keys;
    for (const f of this.followers) f.removeFrom(this.scene);
    this.followers = list.map((l, i) => {
      const a = new Actor([petCanvas(l.species)], { key: 'pet-' + l.species, kind: 'pet', hop: true, shadowR: 0.3 });
      const p = this.witch.pos;
      a.place(p.x - 0.5 - i * 0.6, p.y, p.z + 0.4);
      a.addTo(this.scene);
      a.data = l;
      return a;
    });
    this.witch.setPassengers(list.map((l) => l.species));
  }
  setMarkers(list) {
    // list: [{x, z, y?, icon}] — floating objective markers (visible through walls)
    const sig = list.map((m) => `${m.icon}@${m.x.toFixed(1)},${m.z.toFixed(1)}`).join('|');
    if (sig === this._markerSig) return;
    this._markerSig = sig;
    this.markerGroup.clear();
    this.markers = list.map((m) => {
      const c = m.icon.startsWith('icon:') ? iconCanvas(m.icon.slice(5)) : itemCanvas(m.icon);
      const bb = new Billboard([c], { key: 'marker-' + m.icon, shadow: false, basic: true });
      bb.mesh.material = bb.mesh.material.clone();
      bb.mesh.material.depthTest = false;
      bb.mesh.material.transparent = true;
      bb.mesh.renderOrder = 20;
      const y = m.y ?? this.groundY(m.x, m.z) + 2.4;
      bb.mesh.position.set(m.x, y, m.z);
      bb.mesh.userData = { baseY: y, ph: Math.random() * 6 };
      this.markerGroup.add(bb.mesh);
      return bb;
    });
  }

  // ------------------------------------------------------------------ per-frame
  update(dt, t, hour, weather) {
    this.time = t;
    const S = this.skyState.compute(hour, weather);
    this.applySky(S, weather, t);
    const I = this.I;
    const w = this.witch;

    // player trail for followers
    const last = this.trail[this.trail.length - 1];
    if (!last || dist(last.x, last.z, w.pos.x, w.pos.z) > 0.15) {
      this.trail.push({ x: w.pos.x, z: w.pos.z });
      if (this.trail.length > 80) this.trail.shift();
    }
    const followSpacing = 5;
    const hideFollowers = w.flying;
    // Soot follows first
    const chain = [this.soot, ...this.followers];
    chain.forEach((a, i) => {
      a.setVisible(!hideFollowers);
      if (hideFollowers) { a.pos.copy(w.pos); a.pos.y = this.groundY(w.pos.x, w.pos.z); this.trail.length = 0; return; }
      const idx = this.trail.length - 1 - (i + 1) * followSpacing;
      const tp = this.trail[Math.max(0, idx)] || w.pos;
      const far = dist(a.pos.x, a.pos.z, w.pos.x, w.pos.z) > 8;
      if (far) a.pos.set(w.pos.x + 0.6, w.pos.y, w.pos.z + 0.3);
      if (idx >= 0 || dist(a.pos.x, a.pos.z, w.pos.x, w.pos.z) > 1.2) a.moveToward(tp.x, tp.z, dt, null, Math.max(3.5, Math.hypot(w.vel.x, w.vel.z) * 1.1), 0.05);
      else { a.vel.x = damp(a.vel.x, 0, 10, dt); a.vel.z = damp(a.vel.z, 0, 10, dt); }
      a.update(dt, this);
    });

    // npcs idle; owners too
    for (const a of Object.values(this.npcs)) a.update(dt, null);
    for (const a of Object.values(this.owners)) a.update(dt, null);
    // animals wander
    for (const a of [...this.sheep, ...this.chickens]) {
      if (!a.target || a.t > a.nextT) {
        a.nextT = a.t + 2 + Math.random() * 5;
        const r = a.kind === 'animal' && this.chickens.includes(a) ? 1.5 : 2.5;
        a.target = Math.random() < 0.4 ? null : { x: a.home.x + (Math.random() - 0.5) * r * 2, z: a.home.z + (Math.random() - 0.5) * r * 2 };
      }
      if (a.target) { if (a.moveToward(a.target.x, a.target.z, dt, this, a.speed, 0.1)) a.target = null; }
      else { a.vel.x = damp(a.vel.x, 0, 8, dt); a.vel.z = damp(a.vel.z, 0, 8, dt); }
      a.update(dt, this);
    }

    // gulls
    for (const g of this.gulls) {
      const u = g.mesh.userData;
      const a = t * u.sp + u.ph;
      g.mesh.position.set(u.cx + Math.cos(a) * u.r, u.y + Math.sin(t * 1.3 + u.ph) * 0.4, u.cz + Math.sin(a) * u.r * 0.6);
      g.setFrame(Math.floor(t * 3 + u.ph) % 2, Math.sin(a) > 0);
    }
    // windmill, lighthouse, boats, clock
    if (this.windmillHub) this.windmillHub.rotation.z -= dt * (0.5 + (weather.wind || 0) * 0.8);
    if (this.lighthouse) {
      const u = this.lighthouse.userData;
      u.beam.rotation.y += dt * 0.7;
      u.beamMat.opacity = S.lampOn ? 0.11 : 0;
      u.lampMat.emissiveIntensity = S.lampOn ? 2.2 : 0.3;
    }
    for (const an of this.animated) {
      if (an.type === 'boat') {
        an.obj.position.y = WATER_Y - 0.12 + Math.sin(t * 1.2 + an.ph) * 0.05;
        an.obj.rotation.z = Math.sin(t * 0.9 + an.ph) * 0.04;
      }
    }
    if (this.clockTower) {
      const c = this.clockTower.userData.clock;
      c.hourHand.rotation.z = -((hour % 12) / 12) * Math.PI * 2;
      c.minHand.rotation.z = -((hour % 1)) * Math.PI * 2;
    }
    // markers bob and scale with distance so they stay readable from the air
    for (const m of this.markers) {
      const u = m.mesh.userData;
      m.mesh.position.y = u.baseY + Math.sin(t * 2.5 + u.ph) * 0.15;
      const d = this.camera.position.distanceTo(m.mesh.position);
      const s = clamp(d / 18, 1, 3.2);
      m.mesh.scale.setScalar(s);
    }
    this.clouds.userData.update(dt, S.isNight ? new THREE.Color('#4a5680') : new THREE.Color(0.9, 0.9, 0.92).lerp(new THREE.Color(S.sun), 0.2));
    this.fadeClouds();
    this.batch.uniforms.uTime.value = t;
    this.batch.uniforms.uWind.value = 1 + (weather.wind || 0) * 1.5 + (weather.rain || 0);

    this.ambientParticles(dt, t, S, weather);
    this.fx.update(dt, t);
    this.glowFx.update(dt, t);
    this.updateCamera(dt);
    this.updateLampPool(S);
  }

  ambientParticles(dt, t, S, weather) {
    const c = this.cam.target;
    const R = Math.random;
    // dust motes / pollen in daylight
    if (!S.isNight && R() < dt * 14) {
      this.fx.spawn({ x: c.x + (R() - 0.5) * 24, y: c.y + R() * 4, z: c.z + (R() - 0.5) * 16, vx: 0.2, vy: 0.05, life: 5, size: 0.07, color: '#fff4c8', alpha: 0.7, wobble: 0.4, fadeIn: 0.3 });
    }
    // fireflies at night in green areas
    if (S.night > 0.5 && R() < dt * 10) {
      const x = c.x + (R() - 0.5) * 30, z = c.z + (R() - 0.5) * 22;
      const i = this.I.idx(clamp(x | 0, 0, W - 1), clamp(z | 0, 0, H - 1));
      const tt = this.I.type[i];
      if (tt === T.FOREST || tt === T.MEADOW || tt === T.GRASS || tt === T.FLOWERS || tt === T.GARDEN) {
        this.glowFx.spawn({ x, y: this.groundY(x, z) + 0.4 + R() * 1.2, z, life: 4 + R() * 3, size: 0.14, color: '#d8ff7a', alpha: 1, wobble: 0.8, twinkle: 5, shape: 2, fadeIn: 0.4 });
      }
    }
    // rain
    if (weather.rain > 0) {
      const n = Math.floor(dt * 400 * weather.rain + R());
      for (let k = 0; k < n; k++) {
        const x = c.x + (R() - 0.5) * 34, z = c.z + (R() - 0.5) * 26;
        this.fx.spawn({ x, y: c.y + 12 + R() * 4, z, vx: -1.5, vy: -22, life: 0.75, size: 0.35, color: '#c8dcf0', alpha: 0.55, shape: 1, fadeIn: 0.01 });
      }
    }
    // chimney smoke from a few houses
    if (R() < dt * 3) {
      const bs = this.I.buildings;
      const b = bs[Math.floor(R() * bs.length)];
      const inFront = b.z > this.witch.pos.z + 1.5 && !this.witch.flying;
      if ((b.kind === 'house' || b.kind === 'shop' || b.kind === 'hotel') && !inFront) {
        const x = b.x + b.w / 2 + (R() - 0.5), z = b.z + b.d * 0.3;
        this.fx.spawn({ x, y: levelY(b.base) + b.h + 1.9, z, vx: 0.35, vy: 0.5, life: 3.5, size: 0.34, color: S.isNight ? '#6a6a88' : '#e8e4e0', alpha: 0.45, wobble: 0.3, fadeIn: 0.2, shape: 3 });
      }
    }
    // fountain spray
    if (this.fountainPos && dist(c.x, c.z, this.fountainPos.x, this.fountainPos.z) < 30 && R() < dt * 30) {
      const a = R() * Math.PI * 2;
      this.fx.spawn({ x: this.fountainPos.x, y: this.fountainPos.y, z: this.fountainPos.z, vx: Math.cos(a) * 0.9, vz: Math.sin(a) * 0.9, vy: 2.2, gravity: 7, life: 0.7, size: 0.09, color: '#d8f4ff', alpha: 0.9 });
    }
    // glints on available shiny nodes
    if (R() < dt * 6) {
      const n = this.I.nodes[Math.floor(R() * this.I.nodes.length)];
      if (n && n.available && dist(c.x, c.z, n.x, n.z) < 26 && ['glint', 'shell', 'bundle', 'pebbles'].includes(n.visual)) {
        this.glowFx.spawn({ x: n.x + (R() - 0.5) * 0.3, y: n.y + 0.4, z: n.z + 0.1, vy: 0.3, life: 0.6, size: 0.2, color: '#fff8d0', shape: 2, fadeIn: 0.2 });
      }
    }
    // wind streaks while flying fast
    const w = this.witch;
    if (w.mode === 'fly' && (w.speed || 0) > 6 && R() < dt * 30) {
      this.fx.spawn({ x: w.pos.x + (R() - 0.5) * 6, y: w.pos.y + (R() - 0.3) * 3, z: w.pos.z + (R() - 0.5) * 4, vx: -w.vel.x * 1.4, vz: -w.vel.z * 1.4, life: 0.5, size: 0.08, color: '#ffffff', alpha: 0.6 });
    }
  }

  applySky(S, weather, t) {
    this.sun.color.copy(S.sun);
    this.sun.intensity = S.sunIntensity;
    this.hemi.color.copy(S.hemiSky);
    this.hemi.groundColor.copy(S.hemiGround);
    this.hemi.intensity = S.hemiIntensity;
    const f = this.cam.target;
    const ld = S.lightDir;
    // snap the shadow camera to texels to avoid shimmering
    const snap = 52 / 2048;
    const fx = Math.round(f.x / snap) * snap, fz = Math.round(f.z / snap) * snap;
    this.sun.position.set(fx + ld.x * 50, f.y + ld.y * 50, fz + ld.z * 50);
    this.sun.target.position.set(fx, f.y, fz);
    const u = this.sky.material.uniforms;
    u.top.value.copy(S.top);
    u.horizon.value.copy(S.horizon);
    u.bottom.value.copy(S.horizon).multiplyScalar(0.8);
    u.sunDir.value.copy(S.sunDir);
    u.sunColor.value.copy(S.sun).multiplyScalar(S.isNight ? 0 : 1);
    u.moonDir.value.set(-0.35, 0.55, -0.75);
    u.stars.value = S.stars;
    u.time.value = t;
    this.sky.position.copy(this.camera.position);
    this.scene.fog.color.copy(S.fog);
    const wu = this.water.material.uniforms;
    wu.time.value = t;
    wu.light.value.copy(S.light).multiplyScalar(1.15);
    wu.skyTint.value.copy(S.top);
    wu.night.value = S.night;
    wu.fogColor.value.copy(S.fog);
    wu.rain.value = weather.rain || 0;
    for (const m of glowMaterials) m.emissiveIntensity = S.glow;
    if (this.lanternMat) this.lanternMat.emissiveIntensity = S.lampOn ? 2.4 : 0.15;
    const post = this.game.renderer.post;
    post.tint.value.copy(S.tint);
    post.lift.value.copy(S.lift);
    post.saturation.value = S.saturation;
    this.S = S;
  }

  fadeClouds() {
    const cam = this.camera;
    const wp = this.witch.pos;
    const pd = cam.position.distanceTo(wp);
    const v = new THREE.Vector3(), pv = wp.clone().project(cam);
    for (const m of this.clouds.children) {
      v.copy(m.position).project(cam);
      const sd = Math.hypot((v.x - pv.x) * cam.aspect, v.y - pv.y);
      const closer = cam.position.distanceTo(m.position) < pd;
      const target = closer && sd < 0.9 ? 0.18 : 0.92;
      m.material.opacity += (target - m.material.opacity) * 0.1;
    }
  }

  updateLampPool(S) {
    const f = this.cam.target;
    const w = this.witch;
    this.playerLight.position.set(w.pos.x, w.pos.y + 1.4, w.pos.z + 0.8);
    this.playerLight.intensity = S.night > 0.4 ? 2.2 * S.night : 0;
    if (!S.lampOn) { for (const l of this.lampLights) l.intensity = 0; return; }
    const sorted = this.lamps.map((l) => ({ l, d: dist(l.pos.x, l.pos.z, f.x, f.z) })).sort((a, b) => a.d - b.d);
    this.lampLights.forEach((pl, i) => {
      const s = sorted[i];
      if (!s || s.d > 26) { pl.intensity = 0; return; }
      pl.position.copy(s.l.pos);
      pl.intensity = 7 * clamp(1.4 - s.d / 20, 0, 1);
    });
  }

  updateCamera(dt) {
    const w = this.witch;
    const fly = w.mode === 'fly' || w.mode === 'takeoff';
    const c = this.cam;
    const tgtDist = fly ? 32 : 20;
    const tgtPitch = fly ? 0.86 : 0.6;
    c.dist = damp(c.dist, tgtDist, 2.2, dt);
    c.pitch = damp(c.pitch, tgtPitch, 2.2, dt);
    const lookAhead = fly ? 0.6 : 0.25;
    const tx = w.pos.x + w.vel.x * lookAhead, tz = w.pos.z + w.vel.z * lookAhead;
    const ty = fly ? w.pos.y - 3 : w.pos.y + 0.9;
    const k = fly ? 4 : 7;
    c.target.x = damp(c.target.x, tx, k, dt);
    c.target.y = damp(c.target.y, ty, k * 0.7, dt);
    c.target.z = damp(c.target.z, tz, k, dt);
    const cam = this.camera;
    cam.position.set(c.target.x, c.target.y + Math.sin(c.pitch) * c.dist, c.target.z + Math.cos(c.pitch) * c.dist);
    if (this.shake > 0) { this.shake -= dt; cam.position.x += (Math.random() - 0.5) * this.shake * 0.3; cam.position.y += (Math.random() - 0.5) * this.shake * 0.3; }
    cam.lookAt(c.target);
    const post = this.game.renderer.post;
    post.focusDist.value = cam.position.distanceTo(fly ? w.pos : c.target);
    post.focusBand.value = fly ? 6 : 3.2;
    post.focusRange.value = fly ? 18 : 11;
    post.tiltShift.value = fly ? 0.45 : 0.3;
    cam.updateMatrixWorld();
    const wp = w.pos.clone();
    wp.y += fly ? 0.8 : 0.8;
    const feet = w.pos.clone();
    if (fly) feet.y = this.groundY(w.pos.x, w.pos.z);
    updateSeeThrough(cam, wp, this.game.renderer, true, !fly);
    ST.uST_PW.value.copy(feet);
    this.fx.uniforms.uScale.value = this.glowFx.uniforms.uScale.value = this.game.renderer.height * this.game.renderer.pixelRatio / (2 * Math.tan((cam.fov * Math.PI) / 360));
  }

  snapCamera() {
    const w = this.witch;
    this.cam.target.set(w.pos.x, w.pos.y + 0.9, w.pos.z);
    this.cam.dist = w.flying ? 32 : 20;
    this.cam.pitch = w.flying ? 0.86 : 0.6;
    this.trail.length = 0;
    this.soot.pos.set(w.pos.x - 0.7, w.pos.y, w.pos.z + 0.2);
    this.followers.forEach((f, i) => f.pos.set(w.pos.x + 0.7 + i * 0.5, w.pos.y, w.pos.z + 0.3));
    this.updateCamera(1);
  }
  resize(aspect) {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }
}
