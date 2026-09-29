// Broom & Board — main game controller: loop, clock, stages, interactions, day cycle.
import * as THREE from 'three';
import { Renderer } from '../gfx/renderer.js';
import { Input } from '../core/input.js';
import { Audio } from '../core/audio.js';
import { UI, img, iconURL } from '../ui/ui.js';
import { Overworld } from '../world/overworld.js';
import { Hotel, roomBounds } from '../world/hotel.js';
import { CRUISE_Y } from '../entities/witch.js';
import { Billboard } from '../gfx/billboard.js';
import { itemCanvas, iconCanvas, NPC_LOOKS } from '../gfx/sprites.js';
import { Menus } from './menus.js';
import * as ST from './state.js';
import { ITEMS, SPECIES, GOALS, NPCS, UPGRADES } from './data.js';
import { tickGuests, sampleGuests, scoreGuest, makeWish, wishText, isNight } from './guests.js';
import { morningMail, makeDeliveries, freeRooms } from './jobs.js';
import { talk, sootHint, TEACH, GIFTS } from './townfolk.js';
import { Title } from '../ui/title.js';
import { clamp, dist, pick, fmtTime, randInt, chance } from '../core/util.js';

const MIN_PER_SEC = 1.4; // game minutes per real second
const HOTEL_DOOR_OUT = { x: 50.5, z: 26.4 };
const HOTEL_SPAWN_IN = { x: 16, z: 9.0 };
const REP_FOR_STARS = [0, 0, 1, 2, 3, 5];

export class Game {
  constructor(canvas, uiRoot) {
    this.canvas = canvas;
    this.isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    this.uiRoot = uiRoot;
    this.t = 0;
    this.mode = 'loading';
    this.floaters = [];
    this.dirty = true;
  }

  // ================================================================== boot
  async boot() {
    this.renderer = new Renderer(this.canvas);
    this.input = new Input();
    this.audio = new Audio();
    this.state = ST.newState();
    this.ui = new UI(this.uiRoot, this);
    this.menus = new Menus(this);
    const loading = document.createElement('div');
    loading.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#fff6e4;font-size:28px;background:#1b1626;font-family:var(--font)';
    loading.textContent = 'Sweeping the hotel…';
    this.uiRoot.appendChild(loading);
    await Promise.race([document.fonts?.ready, new Promise((r) => setTimeout(r, 1500))]);
    await new Promise((r) => setTimeout(r, 30));
    this.world = new Overworld(this);
    this.hotel = new Hotel(this);
    this.renderer.onResize = () => this.onResize();
    this.onResize();
    this.stage = this.world;
    loading.remove();
    this.title = new Title(this);
    this.toTitle();
    this.last = performance.now();
    requestAnimationFrame((t) => this.frame(t));
    window.addEventListener('beforeunload', () => { if (this.mode === 'play') this.save(); });
  }

  onResize() {
    const a = this.renderer.width / this.renderer.height;
    this.world?.resize(a);
    this.hotel?.resize(a);
  }

  toTitle() {
    this.mode = 'title';
    this.ui.showHUD(false);
    this.ui.showTouch(false);
    this.ui.prompt(null);
    this.stage = this.world;
    const w = this.world.witch;
    w.place(50, 50);
    w.mode = 'fly';
    w.walkBB.mesh.visible = false;
    w.flyBB.mesh.visible = true;
    w.pos.y = CRUISE_Y;
    this.world.setFollowers([]);
    this.world.setMarkers([]);
    this.world.snapCamera();
    this.titleAngle = 0;
    this.title.show();
  }

  startNew(name) {
    this.state = ST.newState(name || 'Wren');
    this.applySettings();
    this.state.letters.push(...morningMail(this.state, this.world.I.homes, true));
    this.rollWeather(true);
    this.resetNodes();
    this.state.flags.introPending = true;
    this.beginPlay();
  }
  continueGame() {
    const s = ST.load();
    if (!s) return this.startNew('Wren');
    this.state = s;
    this.applySettings();
    this.beginPlay();
  }
  applySettings() {
    const st = this.state.settings;
    this.audio.setVolumes(st.music, st.sfx);
    this.renderer.setQuality(st.quality || 'high');
    this.applyUpgrades();
  }
  applyUpgrades() {
    const b = this.state.upgrades.broom;
    this.world.witch.flySpeed = 8.5 * (1 + b * 0.25);
  }

  beginPlay() {
    this.title.hide();
    this.mode = 'play';
    this.ui.showHUD(true);
    this.ui.showTouch(true);
    for (let k = 0; k < this.world.I.nodes.length; k++) this.world.setNodeAvailable(k, this.nodeAvailable(k));
    this.world.I.nodes.forEach((n, k) => (n.available = this.nodeAvailable(k)));
    this.setupEvents();
    const loc = this.state.loc || { stage: 'hotel', ...HOTEL_SPAWN_IN };
    this.world.witch.mode = 'walk';
    this.world.witch.walkBB.mesh.visible = true;
    this.world.witch.flyBB.mesh.visible = false;
    if (loc.stage === 'world') this.switchStage('world', loc, true);
    else this.switchStage('hotel', loc, true);
    this.renderer.post.iris.value = 0;
    this.irisOpen();
    if (this.state.flags.introPending) setTimeout(() => this.intro(), 700);
  }

  // Debug helper for automated playtests: run the simulation without rendering.
  debugStep(seconds, dt = 0.05) {
    for (let t = 0; t < seconds; t += dt) { this.t += dt; this.update(dt); this.input.endFrame(); }
  }

  // ================================================================== loop
  frame(now) {
    const ft = Math.min(250, Math.max(1, now - this.last));
    this.frameMs = this.frameMs ? this.frameMs * 0.95 + ft * 0.05 : 16;
    this.fps = 1000 / this.frameMs;
    this.autoQuality(ft);
    const dt = Math.min(0.05, (now - this.last) / 1000 || 0.016);
    this.last = now;
    this.t += dt;
    try {
      this.update(dt);
    } catch (e) {
      console.error(e);
    }
    this.renderer.render(this.stage.scene, this.stage.camera, this.t);
    this.input.endFrame();
    requestAnimationFrame((t) => this.frame(t));
  }

  // Step graphics down once if the device clearly struggles (the player can change it in settings).
  autoQuality(ft) {
    if (this.mode !== 'play' || document.hidden || this.state.settings.qualityLocked || navigator.webdriver) return;
    this.slowT = (this.slowT || 0) + (ft > 40 ? ft / 1000 : -ft / 2000);
    this.slowT = Math.max(0, this.slowT);
    if (this.slowT > 5) {
      this.slowT = 0;
      const q = this.renderer.quality;
      const next = q === 'high' ? 'medium' : q === 'medium' ? 'low' : null;
      if (!next) return;
      this.renderer.setQuality(next);
      this.state.settings.quality = next;
      this.onResize();
      this.ui.toast(`Switched to ${next === 'medium' ? 'balanced' : 'fast'} graphics for smoother play.`, 'icon:sparkle');
    }
  }

  get hour() { return ((this.state.time / 60) % 24 + 24) % 24; }

  update(dt) {
    const input = this.input;
    this.updateTransition(dt);
    if (this.mode === 'title') {
      this.titleAngle += dt * 0.12;
      const w = this.world.witch;
      const a = this.titleAngle;
      const tx = 52 + Math.cos(a) * 16, tz = 48 + Math.sin(a) * 10;
      w.vel.set((tx - w.pos.x) * 1.5, 0, (tz - w.pos.z) * 1.5);
      w.pos.x += w.vel.x * dt; w.pos.z += w.vel.z * dt;
      w.pos.y = CRUISE_Y + Math.sin(this.t * 1.8) * 0.12;
      if (Math.abs(w.vel.x) > 0.4) w.flip = w.vel.x < 0;
      w.speed = Math.hypot(w.vel.x, w.vel.z);
      w.sync(this.t);
      this.world.update(dt, this.t, 17.6, { cloud: 0, rain: 0, wind: 0.3 });
      this.audio.play('day');
      return;
    }
    if (this.mode !== 'play') return;
    const s = this.state;

    // ---------------------------------------------------------- input
    const uiTook = this.ui.handleKeys(input);
    const busy = this.ui.busy || this.transitioning || this.cutscene;
    if (!uiTook && !busy) {
      if (input.pressed('bag')) { input.consume('bag'); this.openBag(); }
      else if (input.pressed('journal')) { input.consume('journal'); this.openJournal(); }
      else if (input.pressed('map')) { input.consume('map'); this.openMap(); }
      else if (input.pressed('pause')) { input.consume('pause'); this.openPause(); }
      else if (input.pressed('fly')) { input.consume('fly'); this.toggleFly(); }
      else if (input.pressed('interact')) { input.consume('interact'); this.interact(); }
    }

    // ---------------------------------------------------------- clock
    if (!busy) this.advanceTime(dt * MIN_PER_SEC);

    // ---------------------------------------------------------- stage update
    const st = this.stage;
    st.witch.frozen = busy;
    st.witch.update(dt, input, this.t);
    const weather = s.weather;
    const S = this.world.skyState.compute(this.hour, weather);
    if (st === this.world) {
      st.update(dt, this.t, this.hour, weather);
      this.updateWorldDynamic(dt);
    } else {
      st.update(dt, this.t, this.hour, weather, S);
    }
    this.updateFloaters(dt);
    this.updateFireworks(dt);

    // ---------------------------------------------------------- interaction prompt
    this.current = busy ? null : this.findInteractable();
    if (this.current) this.ui.prompt(`<kbd>E</kbd> ${this.current.label}`);
    else if (!busy && st === this.world && !st.witch.flying && this.onLaunchpad()) this.ui.prompt(this.isTouch ? 'Tap Fly to hop on your broom' : `<kbd>F</kbd> Hop on your broom`);
    else if (!busy && st === this.world && st.witch.mode === 'fly' && st.witch.outOfBounds) this.ui.prompt(`The sea wind pushes you back…`);
    else this.ui.prompt(null);

    if (this.dirty) this.syncStages();
    this.ui.updateHUD(this);
    this.updateCompass();
    this.updateAudio();
  }

  // ================================================================== time
  advanceTime(dMin) {
    const s = this.state;
    const before = s.time;
    s.time += dMin;
    tickGuests(s, dMin, s.weather);
    if (Math.floor(before / 60) !== Math.floor(s.time / 60)) this.onHour(Math.floor(s.time / 60));
    for (const g of s.guests) if (g._wishToast) { g._wishToast = false; this.wishGranted(g); }
    // pickup deadline
    for (const g of s.guests) {
      if (g.status === 'booked' && s.time > g.pickupBy) {
        g.status = 'cancelled';
        this.ui.toast(`${g.owner.name} gave up waiting and took ${g.name} along.`, 'icon:sad');
        this.markDirty();
      }
    }
    if (s.time >= 26 * 60 && !this.endingDay) this.endDay(true);
  }

  onHour(h) {
    const s = this.state;
    sampleGuests(s);
    this.markDirty();
    const hh = h % 24;
    if (hh === 22 && this.stage) this.ui.toast('It’s getting late. Your bed is waiting at the hotel.', 'icon:moon');
    if (hh === 8) for (const g of s.guests) if (g.status === 'in-room' && g.checkout <= s.day) this.ui.toast(`${g.name} goes home today!`, 'pet:' + g.species);
    // falling stars on clear nights
    if ((hh >= 20 || hh <= 1) && s.weather.rain === 0 && !this.endingDay) {
      if (Math.random() < 0.45 && this.stars.filter((x) => !x.taken).length < 2) this.spawnStar();
    }
  }

  // ================================================================== stages & transitions
  irisClose(cb, center = null, hold = false) {
    this.transitioning = true;
    this.trans = { dir: -1, cb, t: 0, hold };
    if (center) this.renderer.post.irisCenter.value.copy(center); else this.renderer.post.irisCenter.value.set(0.5, 0.5);
  }
  irisOpen() {
    this.transitioning = true;
    this.trans = { dir: 1, t: 0 };
  }
  updateTransition(dt) {
    const tr = this.trans;
    if (!tr) return;
    tr.t += dt / 0.5;
    const k = clamp(tr.t, 0, 1);
    const e = k * k * (3 - 2 * k);
    this.renderer.post.iris.value = tr.dir < 0 ? 1.5 * (1 - e) : 1.5 * e;
    if (k >= 1) {
      this.trans = null;
      this.transitioning = false;
      if (tr.dir < 0) {
        this.renderer.post.iris.value = 0;
        tr.cb?.();
        if (!tr.hold) this.irisOpen();
        else this.transitioning = true;
      } else this.renderer.post.iris.value = 1.5;
    }
  }

  switchStage(name, at, instant = false) {
    const go = () => {
      const st = name === 'world' ? this.world : this.hotel;
      this.stage = st;
      st.witch.place(at.x, at.z);
      if (name === 'hotel') st.witch.facing = 'up';
      this.state.loc = { stage: name, x: at.x, z: at.z };
      this.markDirty();
      this.syncStages();
      st.snapCamera();
    };
    if (instant) go(); else this.irisClose(go);
  }

  enterHotel() {
    this.audio.sfx('door');
    this.irisClose(() => {
      const s = this.state;
      // guests in your party check in / return to their rooms
      const arriving = [];
      for (const g of s.guests) {
        if (g.status !== 'party' || g.goingHome) continue;
        g.status = 'in-room';
        if (!g.checkedIn) {
          arriving.push(g);
          g.checkedIn = true;
          g.checkout = s.day + g.nights;
          g.wish = makeWish(g.species);
        }
      }
      this.stage = this.hotel;
      this.hotel.witch.place(HOTEL_SPAWN_IN.x, HOTEL_SPAWN_IN.z);
      this.state.loc = { stage: 'hotel', ...HOTEL_SPAWN_IN };
      this.markDirty();
      this.syncStages();
      this.hotel.snapCamera();
      if (arriving.length) setTimeout(() => this.checkIn(arriving), 600);
    }, new THREE.Vector2(0.5, 0.45));
  }

  exitHotel() {
    this.audio.sfx('door');
    this.irisClose(() => {
      this.stage = this.world;
      const w = this.world.witch;
      w.place(HOTEL_DOOR_OUT.x, HOTEL_DOOR_OUT.z + 0.4);
      w.facing = 'down';
      this.state.loc = { stage: 'world', ...HOTEL_DOOR_OUT };
      this.markDirty();
      this.syncStages();
      this.world.snapCamera();
      if (!this.state.flags.flyHint) {
        this.state.flags.flyHint = true;
        setTimeout(() => this.ui.toast(this.isTouch ? 'Tap Fly to hop on your broom!' : 'Press F to hop on your broom and fly!', 'gear_bristles', { life: 5 }), 700);
      }
    });
  }

  markDirty() { this.dirty = true; }
  syncStages() {
    this.dirty = false;
    const s = this.state;
    const party = this.party().map((g) => ({ key: 'g' + g.id, species: g.species }));
    this.world.setFollowers(party);
    this.hotel.setFollowers(party);
    this.hotel.syncRooms(s);
    this.hotel.syncGuests(s);
    // owners waiting at their doors
    const want = new Map();
    for (const g of s.guests) {
      if (g.status === 'booked' || (g.status === 'party' && g.goingHome) || (g.status === 'in-room' && g.checkout <= s.day && s.time >= 8 * 60)) {
        want.set('o' + g.id, g);
      }
    }
    for (const key of Object.keys(this.world.owners)) if (!want.has(key)) this.world.hideOwner(key);
    for (const [key, g] of want) {
      const look = typeof g.owner.look === 'string' ? NPC_LOOKS[g.owner.look] : g.owner.look;
      const a = this.world.showOwner(key, look, g.owner.door.x + 0.9, g.owner.door.z + 0.3);
      a.guest = g;
    }
    // node visuals
    this.world.I.nodes.forEach((n, k) => {
      const av = this.nodeAvailable(k);
      if (n.available !== av) { n.available = av; this.world.setNodeAvailable(k, av); }
    });
  }

  party() { return this.state.guests.filter((g) => g.status === 'party'); }
  partyList() { return this.party(); }
  satchelCap() { return ST.satchelCap(this.state); }

  // ================================================================== interaction
  findInteractable() {
    const list = this.stage === this.world ? this.worldInteractables() : this.hotelInteractables();
    const p = this.stage.witch.pos;
    let best = null, bd = 1e9;
    for (const it of list) {
      const d = dist(p.x, p.z, it.x, it.z);
      if (d < it.r && d < bd) { best = it; bd = d; }
    }
    return best;
  }
  async interact() {
    const it = this.current;
    if (!it) {
      if (this.stage === this.world && this.world.witch.flying) return;
      return;
    }
    this.cutscene = true;
    try { await it.act(); } finally { this.cutscene = false; this.markDirty(); }
  }

  worldInteractables() {
    const w = this.world, s = this.state, list = [];
    const carrying = s.jobs.filter((j) => j.status === 'carrying');
    if (w.witch.flying) {
      if (w.witch.mode !== 'fly') return list;
      for (const j of carrying) list.push({ x: j.to.door.x, z: j.to.door.z - 0.5, r: 3.4, label: `Drop the parcel for ${j.to.name}!`, act: () => this.airDrop(j) });
      return list;
    }
    list.push({ x: HOTEL_DOOR_OUT.x, z: HOTEL_DOOR_OUT.z - 0.3, r: 1.3, label: 'Enter Broom & Board', act: () => this.enterHotel() });
    for (const [id, a] of Object.entries(w.npcs)) list.push({ x: a.pos.x, z: a.pos.z, r: 1.6, label: `Talk to ${NPCS[id].name}`, act: () => talk(this, id) });
    for (const g of s.guests) {
      const d = g.owner.door;
      if (g.status === 'booked') list.push({ x: d.x + 0.9, z: d.z + 0.3, r: 1.7, label: `Pick up ${g.name} from ${g.owner.name}`, act: () => this.pickup(g) });
      if (g.status === 'party' && g.goingHome) list.push({ x: d.x + 0.9, z: d.z + 0.3, r: 1.7, label: `Bring ${g.name} home`, act: () => this.returnPet(g) });
      if (g.status === 'in-room' && g.checkout <= s.day && s.time >= 8 * 60) list.push({ x: d.x + 0.9, z: d.z + 0.3, r: 1.5, label: `Talk to ${g.owner.name}`, act: () => this.ui.say(this.ownerSpeaker(g), `Is ${g.name} ready to come home? I’ll be right here waiting!`) });
    }
    for (const j of carrying) list.push({ x: j.to.door.x, z: j.to.door.z, r: 1.5, label: `Deliver the parcel to ${j.to.name}`, act: () => this.deliver(j, false) });
    w.I.nodes.forEach((n, k) => {
      if (!n.available) return;
      const p = n.actor ? n.actor.pos : n;
      list.push({ x: p.x, z: p.z, r: n.actor ? 1.5 : 1.25, label: this.gatherLabel(n), act: () => this.forage(k) });
    });
    for (const a of w.spirits || []) list.push({ x: a.pos.x, z: a.pos.z, r: 1.4, label: s.spirits && s.spirits[a.spiritIndex] ? 'Wave to the hushling' : 'Greet the forest spirit', act: () => this.greetSpirit(a) });
    for (const st of this.stars) if (!st.taken && st.landed) list.push({ x: st.x, z: st.z, r: 1.6, label: 'Pick up the Star Shard', act: () => this.takeStar(st) });
    const chest = this.chest;
    if (chest && !s.flags.chestOpened) list.push({ x: chest.x, z: chest.z, r: 1.5, label: 'Old sea chest', act: () => this.openChest() });
    return list;
  }

  gatherLabel(n) {
    const verbs = { sheep: 'Brush the sheep', beehive: 'Collect honey', coop: 'Collect eggs', berrybush: 'Pick berries', sunflower: 'Gather sunflower seeds', carrot: 'Pull a carrot', mossrock: 'Gather moss', bundle: 'Pick up the bundle' };
    return verbs[n.visual] || `Pick up ${ITEMS[n.item].name}`;
  }

  hotelInteractables() {
    const s = this.state, H = this.hotel, list = [];
    const unread = s.letters.filter((l) => !l.read).length;
    list.push({ x: 16, z: 10.8, r: 1.2, label: 'Go outside', act: () => this.exitHotel() });
    list.push({ x: 13.4, z: 10.2, r: 1.2, label: unread ? `Check the mailbox (${unread} new!)` : 'Check the mailbox', act: () => this.menus.mail() });
    list.push({ x: 15.5, z: 5.3, r: 1.4, label: 'Guest ledger & renovations', act: () => this.menus.ledger() });
    list.push({ x: 19.2, z: 9.0, r: 1.5, label: 'Sort your satchel', act: () => this.menus.sort() });
    list.push({ x: 11.6, z: 2.1, r: 1.3, label: 'Curio cabinet', act: () => this.menus.storage('curios') });
    list.push({ x: 7.5, z: 2.2, r: 1.4, label: 'Pantry shelf', act: () => this.menus.storage('pantry') });
    list.push({ x: 4.5, z: 4.5, r: 1.3, label: 'Brew treats in the cauldron', act: () => this.menus.brew() });
    list.push({ x: 4.5, z: 8.5, r: 1.4, label: 'Workbench', act: () => this.menus.craft() });
    list.push({ x: 1.9, z: 9.4, r: 1.3, label: 'Workshop storage', act: () => this.menus.storage('workshop') });
    list.push({ x: 19.8, z: 4.2, r: 1.3, label: 'Go to sleep', act: () => this.trySleep() });
    list.push({ x: H.soot.pos.x, z: H.soot.pos.z, r: 0.9, label: 'Pet Soot', act: () => sootHint(this) });
    for (let i = 0; i < 6; i++) {
      const rb = roomBounds(i);
      const room = s.rooms[i];
      if (!room.unlocked) {
        list.push({ x: rb.door.x, z: rb.door.z + 0.6, r: 1.1, label: s.renovating === i ? 'Renovations begin tonight' : `Room ${i + 1}: renovation plans`, act: () => this.menus.ledger('renovate') });
        continue;
      }
      list.push({ x: rb.x1 - 0.7, z: 5.6, r: 0.9, label: `Decorate room ${i + 1}`, act: () => this.menus.decorate(i) });
      (room.messes || []).forEach((m, k) => list.push({ x: m.x, z: m.z, r: 0.8, label: 'Tidy up the mess', act: () => this.cleanMess(i, k) }));
    }
    for (const a of Object.values(H.guestActors)) list.push({ x: a.pos.x, z: a.pos.z, r: 1.0, label: `Care for ${a.guest.name}`, act: () => this.menus.care(a.guest) });
    return list;
  }

  onLaunchpad() {
    const p = this.world.witch.pos;
    return dist(p.x, p.z, 50.5, 27.6) < 1.5;
  }

  // ================================================================== flight
  toggleFly() {
    if (this.stage !== this.world) { this.ui.toast('You can’t fly indoors!', 'icon:exclaim'); return; }
    const w = this.world.witch;
    if (w.mode === 'walk') {
      const cap = ST.basketCap(this.state);
      if (this.party().length > cap) { this.ui.toast(`Your basket only fits ${cap} pet${cap > 1 ? 's' : ''}! Upgrade it at Fen’s.`, 'gear_basket'); this.audio.sfx('error'); return; }
      w.startTakeoff();
      this.audio.sfx('whoosh');
      this.world.fx.burst(w.pos.x, w.pos.y + 0.3, w.pos.z, 14, { color: '#fff6e4', size: 0.14, life: 0.7, speed: 3, up: 1.5, gravity: 2 });
    } else if (w.mode === 'fly') {
      if (!w.startLanding()) { this.ui.toast('Can’t land here — find open ground.', 'icon:exclaim'); this.audio.sfx('error'); return; }
      this.audio.sfx('land');
    }
  }

  // ================================================================== world actions
  ownerSpeaker(g) {
    return { name: g.owner.name, role: 'Pet owner', portrait: g.owner.look, voice: g.id % 5 };
  }

  async pickup(g) {
    const s = this.state;
    if (this.party().length >= 3) { this.ui.toast('You can only look after 3 pets at once out here!', 'icon:paw'); return; }
    await this.ui.say(this.ownerSpeaker(g), pick([
      `Oh, you came! This is ${g.name}. ${g.nights > 1 ? `See you in ${g.nights} days` : 'See you tomorrow'}, sweetie. Be good for the witch!`,
      `Thank goodness. ${g.name} has been waiting by the door all morning. Take good care of them!`,
      `Here’s ${g.name}! They love ${ITEMS[SPECIES[g.species].foods[0]].name.toLowerCase()}, just so you know.`,
    ]));
    g.status = 'party';
    this.audio.petVoice(g.species);
    this.ui.toast(`${g.name} is coming with you!`, 'pet:' + g.species);
    const cap = ST.basketCap(s);
    if (this.party().length > cap) this.ui.toast(`Your basket fits ${cap} — you’ll have to walk!`, 'gear_basket');
    this.markDirty();
  }

  async checkIn(list) {
    const s = this.state;
    for (const g of list) {
      g.hunger = Math.min(g.hunger, 70);
      s.flags['met_' + g.species] = true;
      s.stats.guests++;
      this.completeGoal('firstGuest');
      this.audio.petVoice(g.species);
      this.ui.toast(`${g.name} checked into room ${g.room + 1}! They wish for ${wishText(g.wish)}.`, 'pet:' + g.species, { life: 5 });
    }
    if (s.guests.filter((g) => g.status === 'in-room').length >= 4) this.completeGoal('fullHouse');
    if (!s.flags.careHint) {
      s.flags.careHint = true;
      await this.ui.say({ name: 'Soot', role: 'Your cat', portrait: 'soot', voice: 4 }, `Our first guest! Walk up to ${list[0].name} in their room and press E to feed, pet or play. The bubble over their head shows what they want most.`);
    }
    this.markDirty();
  }

  takeGuest(g, goingHome) {
    g.status = 'party';
    g.goingHome = goingHome;
    g.walkMins = 0;
    this.audio.petVoice(g.species);
    this.ui.toast(goingHome ? `Take ${g.name} home to ${g.owner.label}.` : `${g.name} is ready for a walk!`, 'pet:' + g.species);
    this.markDirty();
  }

  async returnPet(g, late = false) {
    const s = this.state;
    const res = scoreGuest(s, g, late);
    g.status = 'done';
    const sp = this.ownerSpeaker(g);
    this.markDirty();
    const total = res.pay + res.tip;
    const repGain = REP_FOR_STARS[res.stars];
    s.coins += total;
    s.stats.earned += total;
    s.today.earned += total;
    s.rep += repGain;
    const review = { stars: res.stars, text: res.text, owner: g.owner.name, pet: g.name, day: s.day };
    s.reviews.push(review);
    s.today.reviews.push(review);
    if (res.stars === 5) { s.stats.fiveStars++; this.completeGoal('fiveStar'); }
    if (g.vip) s.flags.vipDone = true;
    this.checkRepGoals();
    if (late) return;
    await this.ui.say(sp, `${g.name}! My darling! ${res.text}`);
    this.audio.sfx('deliver');
    this.ui.toast(`+${res.pay} coins${res.tip ? ` and a ${res.tip} coin tip` : ''}!`, 'icon:coin', { gold: true });
    this.ui.toast(`${'★'.repeat(res.stars)} review · +${repGain} reputation`, 'icon:star', { gold: true });
    this.world.fx.burst(this.world.witch.pos.x, this.world.witch.pos.y + 1, this.world.witch.pos.z, 20, { color: '#ffd36b', size: 0.12, life: 1, speed: 2.5, up: 3, gravity: 5 });
  }

  async deliver(j, air) {
    const s = this.state;
    ST.removeFromSatchel(s, 'parcel', 1, (slot) => slot.jobId === j.id);
    j.status = 'done';
    const onTime = s.time <= j.due;
    const reward = j.reward + (onTime ? 5 : 0) + (air ? 3 : 0);
    s.coins += reward;
    s.stats.earned += reward;
    s.today.earned += reward;
    s.today.deliveries++;
    s.stats.deliveries++;
    s.rep += 0.5;
    this.completeGoal('firstDelivery');
    if (s.stats.deliveries >= 10) this.completeGoal('deliveries10');
    this.checkRepGoals();
    this.audio.sfx('deliver');
    this.ui.toast(`${air ? 'Special air delivery! ' : ''}Delivered to ${j.to.name}: +${reward} coins${onTime ? ' (on time!)' : ''}`, 'parcel', { gold: true });
    this.markDirty();
  }

  airDrop(j) {
    const w = this.world.witch;
    const bb = new Billboard([itemCanvas('parcel')], { key: 'dropparcel', shadow: true });
    const chute = new Billboard([itemCanvas('balloon')], { key: 'dropchute', shadow: false, scale: 1.2 });
    chute.mesh.position.y = 0.7;
    bb.mesh.add(chute.mesh);
    bb.mesh.position.copy(w.pos);
    this.world.scene.add(bb.mesh);
    this.audio.sfx('drop');
    const target = new THREE.Vector3(j.to.door.x, this.world.groundY(j.to.door.x, j.to.door.z), j.to.door.z + 0.2);
    this.floaters.push({ mesh: bb.mesh, from: w.pos.clone(), to: target, t: 0, dur: 1.8, scene: this.world.scene, onDone: () => { this.world.fx.burst(target.x, target.y + 0.3, target.z, 12, { color: '#fff6e4', size: 0.1, life: 0.6, speed: 2, up: 2, gravity: 5 }); } });
    ST.removeFromSatchel(this.state, 'parcel', 1, (slot) => slot.jobId === j.id);
    j.status = 'dropping';
    setTimeout(() => { j.status = 'carrying'; this.state.satchel.push({ id: 'parcel', n: 1, jobId: j.id }); this.deliver(j, true); }, 1800);
  }

  forage(k) {
    const s = this.state;
    const n = this.world.I.nodes[k];
    const amounts = { wool: 2, egg: randInt(1, 2), honey: 1, berries: randInt(2, 3), mushroom: randInt(1, 2), seeds: randInt(2, 3), carrot: randInt(1, 2), shell: 1, driftwood: randInt(1, 2), clover: randInt(1, 2), flower: randInt(1, 2), mint: randInt(1, 2), catnip: randInt(1, 2), acorn: randInt(1, 3), pinecone: randInt(1, 2), moss: randInt(1, 2), feather: randInt(1, 2), pebble: randInt(1, 3), apple: randInt(1, 2) };
    const amt = amounts[n.item] || 1;
    if (!ST.canFit(s, n.item, 1)) { this.ui.toast('Your satchel is full! Sort it back at the hotel.', 'icon:bag'); this.audio.sfx('error'); return; }
    const got = ST.addToSatchel(s, n.item, amt);
    s.nodes[k] = s.day;
    if (n.once) s.nodes[k] = 99999;
    n.available = false;
    this.world.setNodeAvailable(k, false);
    s.today.found += got;
    this.audio.sfx(n.visual === 'sheep' ? 'sweep' : 'pickup');
    if (n.visual === 'sheep') this.audio.tone?.('sine', 300, 260, 0.3, 0.1);
    this.world.witch.cheer(0.7);
    const p = n.actor ? n.actor.pos : n;
    this.world.glowFx.burst(p.x, (n.y || 0) + 0.6, p.z, 10, { color: '#fff4b0', size: 0.14, life: 0.7, speed: 1.8, up: 2, gravity: 3, shape: 2 });
    const fresh = !s.discovered[n.item];
    this.ui.toast(`+${got} ${ITEMS[n.item].name}${fresh ? ' — new!' : ''}`, n.item, { gold: fresh });
    if (n.item === 'brasskey') this.ui.toast('A brass key! Maybe Madame Odette knows what it opens.', 'brasskey', { life: 5 });
    this.markDirty();
  }

  nodeAvailable(k) {
    const d = this.state.nodes[k];
    return d == null || (d < this.state.day && d !== 99999);
  }
  resetNodes() { /* nodes become available again each day by comparing harvest day */ }

  // ================================================================== events: stars, balloon, sky loot, chest
  setupEvents() {
    const s = this.state;
    const w = this.world;
    // clear old visuals
    for (const st of this.stars || []) w.scene.remove(st.mesh);
    for (const l of this.skyLoot || []) w.scene.remove(l.mesh);
    if (this.balloonMesh) w.scene.remove(this.balloonMesh);
    this.stars = [];
    this.skyLoot = [];
    this.balloonMesh = null;
    this.skyTimer = 6;
    // balloon
    const ev = s.events.balloon;
    if (ev && !ev.done && !ev.caught) {
      const bb = new Billboard([itemCanvas('balloon')], { key: 'balloon', shadow: true, scale: 1.6 });
      bb.mesh.position.set(ev.x, CRUISE_Y + 0.3, ev.z);
      w.scene.add(bb.mesh);
      this.balloonMesh = bb.mesh;
    }
    // old chest next to the lighthouse
    if (!this.chest) {
      const c = document.createElement('canvas');
      const chestC = itemCanvas('bundle_barnacle');
      const bb = new Billboard([chestC], { key: 'chest', scale: 1.3 });
      const x = 88.5, z = 61.8;
      bb.mesh.position.set(x, w.groundY(x, z), z);
      w.scene.add(bb.mesh);
      this.chest = { x, z, mesh: bb.mesh };
    }
    this.chest.mesh.visible = !s.flags.chestOpened;
  }

  spawnStar() {
    const w = this.world;
    const I = w.I;
    for (let tries = 0; tries < 60; tries++) {
      const x = randInt(8, I.W - 8) + 0.5, z = randInt(8, I.H - 10) + 0.5;
      if (!w.walkable(Math.floor(x), Math.floor(z))) continue;
      const y = w.groundY(x, z);
      const bb = new Billboard([itemCanvas('starshard')], { key: 'starshard', shadow: false, basic: true, scale: 1.1 });
      bb.mesh.material = new THREE.MeshBasicMaterial({ map: bb.sheet.tex, alphaTest: 0.5, color: new THREE.Color(2.2, 2.0, 1.4) });
      bb.mesh.position.set(x + 20, y + 40, z - 30);
      w.scene.add(bb.mesh);
      const star = { x, z, y, mesh: bb.mesh, t: 0, landed: false, taken: false };
      this.stars.push(star);
      this.audio.sfx('star');
      if (this.stage === this.world) this.ui.toast('A star is falling! Look for its glow.', 'icon:star', { life: 4 });
      return;
    }
  }

  takeStar(st) {
    if (!ST.canFit(this.state, 'starshard')) { this.ui.toast('Your satchel is full!', 'icon:bag'); return; }
    ST.addToSatchel(this.state, 'starshard', 1);
    st.taken = true;
    this.world.scene.remove(st.mesh);
    this.audio.sfx('sparkle');
    this.world.witch.cheer(1.2);
    this.completeGoal('starshard');
    this.ui.toast('+1 Star Shard! It hums with warmth.', 'starshard', { gold: true });
    this.state.today.found++;
  }

  greetSpirit(a) {
    const s = this.state;
    s.spirits ||= {};
    a.rattleT = 1.2;
    a.coolT = 3;
    this.audio.sfx('rattle');
    this.world.glowFx.burst(a.pos.x, a.pos.y + 0.8, a.pos.z, 16, { color: '#dffff0', size: 0.16, life: 1.1, speed: 1.4, up: 2.2, gravity: 0.6, shape: 2 });
    if (s.spirits[a.spiritIndex]) { this.ui.toast('The hushling rattles happily.', 'icon:sparkle'); return; }
    s.spirits[a.spiritIndex] = s.day;
    const n = Object.keys(s.spirits).length;
    const total = this.world.spirits.length;
    this.audio.sfx('spirit');
    const [gift, words] = pick([['moss', 'a tuft of soft moss'], ['mushroom', 'a mushroom'], ['berries', 'a handful of berries'], ['acorn', 'an acorn']]);
    this.giveItem(gift, 1, { quiet: true });
    this.ui.toast(`A hushling rattles its head and leaves you ${words}. Forest spirits greeted: ${n}/${total}`, gift, { gold: true, life: 4.5 });
    if (n >= total) {
      this.completeGoal('spirits');
      this.addRep(2, 'The forest spirits trust you');
    }
    this.markDirty();
  }

  async openChest() {
    const s = this.state;
    if (ST.countSatchel(s, 'brasskey') < 1) {
      await this.ui.say(null, 'An old sea chest, crusted with barnacles. It’s locked tight. The keyhole looks like it takes a brass key.');
      return;
    }
    ST.removeFromSatchel(s, 'brasskey', 1);
    s.flags.chestOpened = true;
    this.chest.mesh.visible = false;
    this.audio.sfx('sparkle');
    await this.ui.say(null, 'The brass key turns with a satisfying clunk! Inside: a Star Lamp, a pearl, and a pouch of old coins.');
    ST.storeAdd(s, 'decor_lamp', 1);
    this.giveItem('pearl', 1);
    this.addCoins(60, 'The lighthouse keeper’s treasure');
    this.ui.toast('The Star Lamp was sent to your workshop.', 'decor_lamp', { gold: true });
  }

  updateWorldDynamic(dt) {
    const w = this.world, s = this.state;
    const wp = w.witch.pos;
    // falling stars
    for (const st of this.stars) {
      if (st.taken) continue;
      if (!st.landed) {
        st.t += dt / 2.2;
        const k = Math.min(1, st.t);
        st.mesh.position.set(st.x + 20 * (1 - k), st.y + 40 * (1 - k) * (1 - k) + 0.1, st.z - 30 * (1 - k));
        if (Math.random() < 0.8) w.glowFx.spawn({ x: st.mesh.position.x, y: st.mesh.position.y + 0.3, z: st.mesh.position.z, life: 0.9, size: 0.22, color: '#fff0a0', shape: 2 });
        if (k >= 1) { st.landed = true; w.glowFx.burst(st.x, st.y + 0.4, st.z, 24, { color: '#ffe890', size: 0.16, life: 1.2, speed: 3, up: 3, gravity: 4, shape: 2 }); }
      } else {
        st.mesh.position.y = st.y + 0.15 + Math.sin(this.t * 2) * 0.1;
        if (Math.random() < dt * 6) w.glowFx.spawn({ x: st.x + (Math.random() - 0.5) * 0.4, y: st.y + 0.4, z: st.z, vy: 1.2, life: 1.2, size: 0.14, color: '#fff4c0', shape: 2 });
      }
    }
    // balloon: bobbing, caught by flying into it
    const ev = s.events.balloon;
    if (this.balloonMesh && ev) {
      this.balloonMesh.position.x = ev.x + Math.sin(this.t * 0.3) * 2;
      this.balloonMesh.position.z = ev.z + Math.cos(this.t * 0.25) * 1.5;
      this.balloonMesh.position.y = CRUISE_Y - 0.4 + Math.sin(this.t * 1.1) * 0.3;
      if (w.witch.mode === 'fly' && this.balloonMesh.position.distanceTo(wp) < 1.8) {
        if (ST.canFit(s, 'balloon')) {
          ST.addToSatchel(s, 'balloon', 1);
          ev.caught = true;
          w.scene.remove(this.balloonMesh);
          this.balloonMesh = null;
          this.audio.sfx('pickup');
          this.ui.toast('Caught Lotta’s balloon! Bring it back to her in the plaza.', 'balloon', { gold: true, life: 4 });
        }
      }
    }
    // sky loot while flying
    if (w.witch.mode === 'fly') {
      this.skyTimer -= dt;
      if (this.skyTimer <= 0 && this.skyLoot.length < 4) {
        this.skyTimer = 7 + Math.random() * 8;
        const night = this.hour >= 20 || this.hour < 5;
        const r = Math.random();
        const id = night && r < 0.08 ? 'starshard' : r < 0.12 ? 'bundle_nest' : r < 0.25 ? 'seeds' : 'feather';
        const ang = Math.atan2(w.witch.vel.z, w.witch.vel.x) + (Math.random() - 0.5) * 1.2;
        const d = 10 + Math.random() * 6;
        const bb = new Billboard([itemCanvas(id)], { key: 'sky-' + id, shadow: false, basic: true, scale: 1.3 });
        bb.mesh.position.set(wp.x + Math.cos(ang) * d, CRUISE_Y + 0.3, wp.z + Math.sin(ang) * d);
        w.scene.add(bb.mesh);
        this.skyLoot.push({ id, mesh: bb.mesh, life: 25 });
      }
    }
    for (let i = this.skyLoot.length - 1; i >= 0; i--) {
      const l = this.skyLoot[i];
      l.life -= dt;
      l.mesh.position.y = CRUISE_Y + 0.3 + Math.sin(this.t * 2 + i) * 0.25;
      l.mesh.position.x += Math.sin(this.t * 0.7 + i) * dt * 0.4;
      if (Math.random() < dt * 4) w.glowFx.spawn({ x: l.mesh.position.x, y: l.mesh.position.y + 0.3, z: l.mesh.position.z, life: 0.5, size: 0.14, color: '#ffffff', shape: 2 });
      const hit = w.witch.mode === 'fly' && dist(l.mesh.position.x, l.mesh.position.z, wp.x, wp.z) < 1.6;
      if (hit && ST.canFit(s, l.id)) {
        ST.addToSatchel(s, l.id, 1);
        s.today.found++;
        this.audio.sfx('pickup');
        this.ui.toast(`Caught ${ITEMS[l.id].name} in mid-air!`, l.id);
        if (l.id === 'starshard') this.completeGoal('starshard');
      }
      if (hit || l.life <= 0) { w.scene.remove(l.mesh); this.skyLoot.splice(i, 1); }
    }
    // speech bubbles: townsfolk with something for you, owners waiting with their pets
    this.bubbleT = (this.bubbleT || 0) - dt;
    if (this.bubbleT <= 0) {
      this.bubbleT = 0.5;
      for (const [id, a] of Object.entries(w.npcs)) a.setBubble(...this.npcBubble(id));
      for (const a of Object.values(w.owners)) {
        const g = a.guest;
        if (!g) continue;
        if (g.status === 'booked') a.setBubble('alert', 'pet:' + g.species);
        else if (g.status === 'party' && g.goingHome) a.setBubble('thought', 'icon:heart');
        else a.setBubble('thought', 'pet:' + g.species);
      }
    }
    // gentle nudges while you're out
    for (const g of s.guests) {
      if (g.status !== 'in-room') continue;
      if (g.hunger < 25 && g.warnedHungry !== s.day) { g.warnedHungry = s.day; this.ui.toast(`${g.name} is getting hungry back at the hotel.`, 'pet:' + g.species, { life: 4 }); }
      if (g.joy < 25 && g.warnedSad !== s.day) { g.warnedSad = s.day; this.ui.toast(`${g.name} is feeling lonely at the hotel.`, 'pet:' + g.species, { life: 4 }); }
    }
    // glowing things borrow lights from the world's light pool
    this.world.glowSpots = this.stars.filter((st) => !st.taken && st.landed).map((st) => ({ pos: new THREE.Vector3(st.x, st.y + 0.8, st.z), color: '#ffe890', power: 4 + Math.sin(this.t * 4) }));
    // markers
    this.world.setMarkers(this.mapMarkers().filter((m) => m.world));
  }

  npcBubble(id) {
    const s = this.state;
    const f = s.npc[id];
    if (!f || !f.met) return ['alert', 'icon:exclaim'];
    if (id === 'lotta') { const ev = s.events.balloon; return ev && !ev.done ? ['alert', 'balloon'] : [null]; }
    if (id === 'aldo' || id === 'honeycutt') {
      const key = id + ':' + s.day;
      const offers = s.offers && s.offers[key];
      if (!offers || offers.some((o) => o.status === 'offered')) return ['alert', 'parcel'];
    }
    if (((f.talks || 0) >= 1 || id === 'greta') && (TEACH[id] || []).some((r) => !s.recipes.includes(r))) return ['alert', 'icon:sparkle'];
    if (GIFTS[id] && f.gift !== s.day) return ['thought', GIFTS[id]];
    return [null];
  }

  mapMarkers() {
    const s = this.state, list = [];
    const w = this.world;
    const p = this.stage === this.world ? w.witch.pos : { x: HOTEL_DOOR_OUT.x, z: HOTEL_DOOR_OUT.z };
    list.push({ icon: 'icon:pin', x: p.x, z: p.z, size: 26 });
    for (const g of s.guests) {
      if (g.status === 'booked' || (g.status === 'party' && g.goingHome)) list.push({ icon: 'icon:paw', x: g.owner.door.x + 0.9, z: g.owner.door.z, world: true });
    }
    for (const j of s.jobs) if (j.status === 'carrying') list.push({ icon: 'parcel', x: j.to.door.x, z: j.to.door.z, world: true });
    for (const st of this.stars || []) if (!st.taken) list.push({ icon: 'icon:star', x: st.x, z: st.z, world: st.landed });
    if (this.balloonMesh) list.push({ icon: 'balloon', x: this.balloonMesh.position.x, z: this.balloonMesh.position.z, world: false });
    const ev = s.events.balloon;
    if (ev && ev.caught && !ev.done) list.push({ icon: 'icon:exclaim', x: w.npcs.lotta.pos.x, z: w.npcs.lotta.pos.z, world: true });
    for (const id of ['aldo', 'honeycutt', 'pim', 'odette', 'fen', 'marlo', 'greta', 'ivy']) {
      const a = w.npcs[id];
      if (a) list.push({ icon: 'icon:exclaim', x: a.pos.x, z: a.pos.z, size: 16 });
    }
    return list;
  }

  updateCompass() {
    if (this.stage !== this.world || this.ui.busy || this.mode !== 'play') { this.ui.compassTo(null); return; }
    const w = this.world;
    const wp = w.witch.pos;
    const ms = this.mapMarkers().filter((m) => m.world);
    if (!ms.length) { this.ui.compassTo(null); return; }
    let best = null, bd = 1e9;
    for (const m of ms) { const d = dist(m.x, m.z, wp.x, wp.z); if (d < bd) { bd = d; best = m; } }
    const v = new THREE.Vector3(best.x, w.groundY(best.x, best.z) + 1, best.z).project(w.camera);
    const onScreen = v.z < 1 && Math.abs(v.x) < 0.92 && Math.abs(v.y) < 0.88;
    if (onScreen || bd < 4) { this.ui.compassTo(null); return; }
    const W = this.renderer.width, H = this.renderer.height;
    let dx = v.x, dy = -v.y;
    if (v.z > 1) { dx = -dx; dy = -dy; }
    const k = Math.max(Math.abs(dx) / 0.9, Math.abs(dy) / 0.8);
    const x = (dx / k * 0.5 + 0.5) * W, y = (dy / k * 0.5 + 0.5) * H;
    this.ui.compassTo({ x, y, angle: Math.atan2(dy * H, dx * W) + Math.PI / 2 });
  }

  // ================================================================== hotel actions
  cleanMess(roomIdx, k) {
    const room = this.state.rooms[roomIdx];
    const m = room.messes[k];
    room.messes.splice(k, 1);
    this.audio.sfx('sweep');
    this.hotel.fx.burst(m.x, 0.2, m.z, 10, { color: '#e8dcc4', size: 0.1, life: 0.6, speed: 1.5, up: 1.5, gravity: 4 });
    this.hotel.glowFx.burst(m.x, 0.4, m.z, 6, { color: '#ffffff', size: 0.14, life: 0.6, speed: 1, up: 1.5, gravity: 1, shape: 2 });
    this.ui.toast('Squeaky clean!', 'icon:sparkle');
    const g = this.state.guests.find((x) => x.room === roomIdx && x.status === 'in-room');
    if (g) g.joy = clamp(g.joy + 4, 0, 100);
    this.markDirty();
  }

  heartsAt(g) {
    const a = this.hotel.guestActors[g.id];
    if (!a) return;
    for (let i = 0; i < 4; i++) {
      const bb = new Billboard([iconCanvas('heart')], { key: 'heart', shadow: false, basic: true, scale: 0.8 });
      bb.mesh.material = bb.mesh.material.clone();
      bb.mesh.material.transparent = true;
      const from = a.pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.6, 0.8, 0.1));
      bb.mesh.position.copy(from);
      this.hotel.scene.add(bb.mesh);
      this.floaters.push({ mesh: bb.mesh, from, to: from.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.4, 1.4, 0)), t: -i * 0.12, dur: 1.0, scene: this.hotel.scene, fade: true });
    }
  }

  brewFx() {
    const p = this.hotel.cauldronPos;
    this.hotel.glowFx.burst(p.x, p.y + 0.2, p.z, 30, { color: '#b0ff90', size: 0.16, life: 1.1, speed: 2, up: 3, gravity: 3, shape: 2 });
    this.hotel.fx.burst(p.x, p.y + 0.3, p.z, 16, { color: '#e8fff0', size: 0.3, life: 1.3, speed: 0.8, up: 1.5, gravity: -0.5 });
  }

  wishGranted(g) {
    this.audio.sfx('sparkle');
    this.ui.toast(`${g.name}’s wish came true! They’re overjoyed.`, 'icon:heart', { gold: true, life: 4 });
    this.heartsAt(g);
  }

  guestBubble(g, sleeping) {
    if (sleeping) return ['thought', 'icon:zzz'];
    if (g.checkout <= this.state.day) return ['alert', 'icon:paw'];
    if (g.hunger < 30) return ['thought', 'icon:bowl'];
    if (g.wish && !g.wishDone && g.joy < 85) return ['thought', g.wish.kind === 'walk' ? 'icon:paw' : g.wish.id];
    if (g.joy < 30) return ['thought', 'icon:sad'];
    if (g.joy > 80 && g.hunger > 60) return ['thought', 'icon:heart'];
    return [null];
  }

  updateFloaters(dt) {
    for (let i = this.floaters.length - 1; i >= 0; i--) {
      const f = this.floaters[i];
      f.t += dt / f.dur;
      const k = clamp(f.t, 0, 1);
      if (f.t >= 0) {
        f.mesh.position.lerpVectors(f.from, f.to, f.fade ? 1 - (1 - k) * (1 - k) : k);
        if (!f.fade) f.mesh.position.x += Math.sin(k * 9) * 0.15;
        if (f.fade) f.mesh.material.opacity = 1 - k;
      }
      if (f.t >= 1) { f.scene.remove(f.mesh); this.floaters.splice(i, 1); f.onDone?.(); }
    }
  }

  // ================================================================== bookings & jobs
  acceptBooking(l) {
    const s = this.state;
    const free = freeRooms(s);
    if (!free.length) return;
    const g = {
      id: s.nextId++, name: l.petName, species: l.species, owner: l.owner, nights: l.nights, rate: l.rate,
      status: 'booked', room: free[0], hunger: 80, joy: 70, pickupBy: l.pickupBy, vip: !!l.vip, day: s.day,
    };
    s.guests.push(g);
    s.letters = s.letters.filter((x) => x !== l);
    this.audio.sfx('paper');
    this.ui.toast(`Booked! Pick up ${g.name} at ${g.owner.label} by ${fmtTime(g.pickupBy)}.`, 'pet:' + g.species, { life: 4.5 });
    this.markDirty();
  }

  jobOffers(npcId) {
    const s = this.state;
    s.offers ||= {};
    const key = npcId + ':' + s.day;
    if (!s.offers[key]) {
      const from = npcId === 'aldo' ? { x: 60, z: 46.5, kind: 'parcel', npc: 'aldo' } : { x: 40.5, z: 46.5, kind: 'bread', npc: 'honeycutt' };
      const n = npcId === 'aldo' ? randInt(2, 3) : randInt(1, 2);
      s.offers = { [key]: makeDeliveries(s, this.world.I.homes, from, n), ...Object.fromEntries(Object.entries(s.offers).filter(([k]) => k.endsWith(':' + s.day))) };
    }
    return s.offers[key];
  }

  // ================================================================== economy helpers
  giveItem(id, n = 1, opts = {}) {
    const got = ST.addToSatchel(this.state, id, n);
    if (got < n) {
      ST.storeAdd(this.state, id, n - got);
      if (!opts.quiet) this.ui.toast(`Satchel full — sent ${ITEMS[id].name} to the hotel.`, id);
    } else if (!opts.quiet) this.ui.toast(`Got ${n > 1 ? n + ' ' : ''}${ITEMS[id].name}`, id);
    this.state.discovered[id] ||= false;
    return true;
  }
  addCoins(n, why) {
    this.state.coins += n;
    this.state.stats.earned += n;
    this.state.today.earned += n;
    this.audio.sfx('coin');
    if (why) this.ui.toast(`${why}: +${n} coins`, 'icon:coin', { gold: true });
  }
  addRep(n, why) {
    this.state.rep += n;
    if (why) this.ui.toast(`${why}: +${n} reputation`, 'icon:star', { gold: true });
    this.checkRepGoals();
  }
  checkRepGoals() {
    const s = this.state;
    if (s.rep >= 10) this.completeGoal('rep10');
    if (s.rooms.every((r) => r.unlocked) && s.rep >= 30) {
      if (!s.goals.grand) { this.completeGoal('grand'); this.celebrate(); }
    }
  }
  completeGoal(id) {
    const s = this.state;
    if (s.goals[id]) return;
    s.goals[id] = s.day;
    const gl = GOALS.find((g) => g.id === id);
    if (!gl) return;
    s.coins += gl.reward;
    this.audio.sfx('sparkle');
    this.ui.toast(`Goal complete: ${gl.text} (+${gl.reward} coins)`, 'icon:star', { gold: true, life: 4 });
  }
  haveAnywhere(id) { return ST.storeCount(this.state, id) + ST.countSatchel(this.state, id); }
  hasAnywhere(needs) { return Object.entries(needs).every(([id, n]) => this.haveAnywhere(id) >= n); }
  takeAnywhere(needs) {
    if (!this.hasAnywhere(needs)) return false;
    for (const [id, n] of Object.entries(needs)) {
      const fromBag = ST.removeFromSatchel(this.state, id, n);
      if (fromBag < n) ST.storeTake(this.state, id, n - fromBag);
    }
    return true;
  }

  fireworks(seconds = 25) {
    this.fireworksT = seconds;
  }
  updateFireworks(dt) {
    if (!this.fireworksT || this.fireworksT <= 0 || this.stage !== this.world) return;
    this.fireworksT -= dt;
    if (Math.random() < dt * 2.2) {
      const w = this.world;
      const x = 42 + Math.random() * 18, z = 44 + Math.random() * 14, y = 14 + Math.random() * 6;
      const col = pick(['#ff7a6b', '#f5d24b', '#8ecae6', '#b8a8f0', '#9cd26a', '#fff6e4']);
      w.glowFx.burst(x, y, z, 46, { color: col, size: 0.28, life: 1.6, speed: 5, up: 1.5, gravity: 2.5, shape: 2, fadeIn: 0.02 });
      this.audio.noise(0.5, 0.3, 300, 80);
    }
  }

  async celebrate() {
    this.fireworks(40);
    await this.ui.say({ name: 'Soot', role: 'Your cat', portrait: 'soot', voice: 4 }, 'Six rooms, glowing reviews, and the whole town talking about us. Great-Aunt Hilde would be SO proud. The Broom & Board is officially the Grand Broom & Board!');
    this.ui.toast('The Grand Broom & Board! Thank you for playing — the hotel stays open forever.', 'icon:star', { gold: true, life: 7 });
  }

  // ================================================================== day cycle
  async trySleep() {
    const h = this.hour;
    if (h >= 6 && h < 18) {
      const k = await this.ui.say({ name: this.state.name, role: 'You', portrait: 'witch' }, 'It’s still daytime… take a nap until tomorrow morning?', ['Sleep until morning', 'Not yet']);
      if (k !== 0) return;
    }
    this.endDay(false);
  }

  endDay(passedOut) {
    if (this.endingDay) return;
    this.endingDay = true;
    const s = this.state;
    this.cutscene = true;
    this.audio.sfx('sleep');
    this.irisClose(() => {
      const notes = [];
      if (passedOut) notes.push('You dozed off outside at 2am… Soot dragged you home by the cape. (Try to get to bed earlier!)');
      // pets still with you head home or back to rooms
      for (const g of s.guests) {
        if (g.status === 'party' && !g.goingHome) g.status = 'in-room';
      }
      // late check-outs: owners came by the hotel themselves
      for (const g of s.guests) {
        if ((g.status === 'in-room' || (g.status === 'party' && g.goingHome)) && g.checkout <= s.day) {
          this.returnPet(g, true);
          notes.push(`${g.owner.name} had to fetch ${g.name} from the hotel themselves. No tip, and a grumpier review.`);
        }
        if (g.status === 'booked') g.status = 'cancelled';
      }
      // overnight: a night's sleep for everyone
      for (let k = 0; k < 16; k++) { s.time = 23 * 60 + k * 30; tickGuests(s, 30, s.weather); }
      sampleGuests(s);
      // renovation
      if (s.renovating != null) {
        s.rooms[s.renovating].unlocked = true;
        notes.push(`Bruno’s crew finished Room ${s.renovating + 1} overnight. It smells of fresh paint!`);
        if (s.rooms.filter((r) => r.unlocked).length >= 3) this.completeGoal('room3');
        s.renovating = null;
        this.checkRepGoals();
      }
      const report = { day: s.day, earned: s.today.earned, deliveries: s.today.deliveries, found: s.today.found, reviews: s.today.reviews, notes };
      // new day
      s.day++;
      s.time = 7 * 60;
      s.today = { earned: 0, reviews: [], deliveries: 0, found: 0 };
      s.guests = s.guests.filter((g) => g.status !== 'done' && g.status !== 'cancelled');
      s.jobs = s.jobs.filter((j) => j.status !== 'done');
      s.letters = s.letters.filter((l) => l.type !== 'booking');
      s.letters.push(...morningMail(s, this.world.I.homes, false));
      if (s.day % 3 === 0) s.letters.push({ type: 'note', from: pick(['A happy customer', 'Mrs. Honeycutt', 'Lotta (age 7)', 'The Maravik Gazette']), text: pick(['Thank you for looking after my little one. The whole town is talking about your hotel!', 'Everyone says the witch on the hill is the kindest in the land. Keep it up, dear!', 'I drew you and your cat flying over the fountain. It’s on our fridge now.', 'LOCAL WITCH’S PET HOTEL A HIT — our reporter’s dog gave it five paws.']), read: false });
      this.rollWeather(false);
      s.events = {};
      if (s.day >= 2 && Math.random() < 0.35) s.events.balloon = { x: 40 + Math.random() * 25, z: 38 + Math.random() * 20 };
      this.setupEvents();
      // wake up at home
      this.stage = this.hotel;
      this.hotel.witch.place(19.5, 4.8);
      s.loc = { stage: 'hotel', x: 19.5, z: 4.8 };
      this.world.witch.mode = 'walk';
      this.world.witch.walkBB.mesh.visible = true;
      this.world.witch.flyBB.mesh.visible = false;
      this.markDirty();
      this.syncStages();
      this.hotel.snapCamera();
      this.save();
      this.renderer.post.iris.value = 0;
      this.menus.summary(report, () => {
        if (!this.endingDay) return;
        this.endingDay = false;
        this.cutscene = false;
        this.irisOpen();
        this.audio.sfx('bell');
        const wx = s.weather.rain ? 'It’s raining — frogs will be delighted.' : s.weather.cloud > 0.3 ? 'A cloudy morning.' : 'A bright, breezy morning!';
        this.ui.toast(`Day ${s.day}. ${wx}`, s.weather.rain ? 'icon:rain' : s.weather.cloud > 0.3 ? 'icon:cloud' : 'icon:sun', { life: 4 });
        if (s.letters.some((l) => !l.read)) this.ui.toast('You have mail!', 'letter');
      });
    }, null, true);
  }

  rollWeather(first) {
    const s = this.state;
    const r = Math.random();
    if (first || r < 0.55) s.weather = { kind: 'sunny', cloud: 0, rain: 0, wind: 0.2 };
    else if (r < 0.78) s.weather = { kind: 'cloudy', cloud: 0.6, rain: 0, wind: 0.5 };
    else if (r < 0.94) s.weather = { kind: 'rain', cloud: 1, rain: 1, wind: 0.6 };
    else s.weather = { kind: 'windy', cloud: 0.2, rain: 0, wind: 1.2 };
  }

  // ================================================================== tasks for the HUD
  todayTasks() {
    const s = this.state;
    const t = [];
    const unread = s.letters.filter((l) => !l.read && l.type === 'booking').length;
    if (unread) t.push({ text: `Read the ${unread > 1 ? unread + ' booking letters' : 'booking letter'} in the mailbox`, icon: 'letter' });
    for (const g of s.guests) {
      if (g.status === 'booked') t.push({ text: `Pick up ${g.name} at ${g.owner.label} (by ${fmtTime(g.pickupBy)})`, icon: 'pet:' + g.species });
      if (g.status === 'party' && g.goingHome) t.push({ text: `Bring ${g.name} home to ${g.owner.name}`, icon: 'pet:' + g.species });
      if (g.status === 'party' && !g.goingHome) t.push({ text: g.checkedIn ? `Walking ${g.name}` : `Bring ${g.name} to the hotel`, icon: 'pet:' + g.species });
      if (g.status === 'in-room' && g.checkout <= s.day) t.push({ text: `${g.name} goes home today — fetch them from room ${g.room + 1}`, icon: 'icon:paw' });
      else if (g.status === 'in-room' && g.hunger < 30) t.push({ text: `${g.name} is hungry`, icon: 'icon:bowl' });
    }
    for (const j of s.jobs) if (j.status === 'carrying') t.push({ text: `Deliver to ${j.to.label}`, icon: 'parcel' });
    const ev = s.events.balloon;
    if (ev && !ev.done && s.npc.lotta?.met) t.push({ text: ev.caught ? 'Return the balloon to Lotta' : 'Find Lotta’s red balloon in the sky', icon: 'balloon' });
    const loot = s.satchel.filter((x) => x.id !== 'parcel' && x.id !== 'balloon').length;
    if (loot >= 4 && this.stage === this.hotel) t.push({ text: 'Sort your satchel at the sorting table', icon: 'icon:bag' });
    if (this.hour >= 21 || this.hour < 5) t.push({ text: 'Head to bed before 2am', icon: 'icon:moon' });
    if (!t.length && s.day === 1 && !s.stats.deliveries) t.push({ text: 'Visit Aldo at the Post Office for parcels', icon: 'parcel' });
    return t.slice(0, 6);
  }

  // ================================================================== intro
  async intro() {
    const s = this.state;
    s.flags.introPending = false;
    this.cutscene = true;
    const soot = { name: 'Soot', role: 'Your cat', portrait: 'soot', voice: 4 };
    const me = { name: s.name, role: 'Young witch', portrait: 'witch', voice: 2 };
    await this.ui.say(soot, 'Mrrow. So this is it. Great-Aunt Hilde’s old inn on the hill… and it’s all yours now.');
    await this.ui.say(me, 'Broom & Board — a hotel for pets! Every witch needs a trade in her training year, and this one is mine.');
    await this.ui.say(soot, 'Here’s how it works. Owners write to us. You fly down to Maravik, collect their pets, deliver parcels, and gather whatever you find.');
    await this.ui.say(soot, 'Then you come home, sort your loot, brew treats and keep our guests happy. Happy guests, good reviews. Good reviews, more guests.');
    await this.ui.say(soot, this.isTouch ? 'I think I heard the mailbox by the front door. Go on, check it! (Move with the stick, tap Act to interact.)' : 'I think I heard the mailbox by the front door. Go on, check it! (Walk with WASD, press E to interact.)');
    this.cutscene = false;
    this.save();
  }

  // ================================================================== menus
  openBag() { if (this.mode === 'play' && !this.ui.dialogOpen) this.menus.bag(); }
  openJournal() { if (this.mode === 'play' && !this.ui.dialogOpen) this.menus.journal(); }
  openMap() { if (this.mode === 'play' && !this.ui.dialogOpen) this.menus.map(); }
  openPause() { if (this.mode === 'play' && !this.ui.dialogOpen) this.menus.pause(); }

  save() {
    if (this.mode !== 'play') return;
    const s = this.state;
    const w = this.stage === this.world ? this.world.witch : this.hotel.witch;
    if (!(this.stage === this.world && w.flying)) s.loc = { stage: this.stage === this.world ? 'world' : 'hotel', x: w.pos.x, z: w.pos.z };
    ST.save(s);
  }

  // ================================================================== audio
  updateAudio() {
    const a = this.audio;
    if (!a.ctx) return;
    const h = this.hour;
    const night = h >= 20 || h < 6;
    const w = this.stage.witch;
    if (this.stage === this.world) {
      a.play(w.flying ? 'fly' : night ? 'night' : 'day');
      a.setAmbience('wind', w.flying ? 0.4 + (w.speed || 0) / 14 : this.state.weather.wind * 0.3);
      const I = this.world.I;
      const tx = clamp(Math.floor(w.pos.x), 0, I.W - 1), tz = clamp(Math.floor(w.pos.z), 0, I.H - 1);
      const c = I.coast[tz * I.W + tx];
      a.setAmbience('sea', w.flying ? 0.2 : clamp(1 - c / 7, 0.05, 1));
      a.setAmbience('rain', this.state.weather.rain);
    } else {
      a.play(night ? 'night' : 'hotel');
      a.setAmbience('wind', 0);
      a.setAmbience('sea', 0.05);
      a.setAmbience('rain', this.state.weather.rain * 0.4);
    }
  }
}
