// The shape of the year: season mornings, running gags (the goose, the snail mail snail), Wick's
// letters, encounter characters standing around the island, sky encounters, and the Lantern Festival.
import * as THREE from 'three';
import { Actor } from '../entities/actor.js';
import { Billboard } from '../gfx/billboard.js';
import { gooseCanvas, snailCanvas, whaleCanvas, trollCanvas, frogCanvas, raccoonCanvas, bearCanvas, duckCanvas, stumpCanvas, crowCanvas } from '../gfx/critters.js';
import { gullCanvas, npcCanvas, randomOwnerLook, petCanvas } from '../gfx/sprites.js';
import { makeCanvas, ctx2d } from '../gfx/pixel.js';
import { CRUISE_Y } from '../entities/witch.js';
import { ENCOUNTERS, ENC, encAvailable, runEncounter, friendsMade } from './encounters.js';
import { SEASONS, SKILLS, seasonIndex, dayOfSeason, hasSkill, seasonReached, isFirstYear, FINALE_DAY } from './year.js';
import { ITEMS } from './data.js';
import * as ST from './state.js';
import { dist, pick, clamp } from '../core/util.js';

const MILES = { name: 'Miles', role: 'Your cat', portrait: 'miles', voice: 4 };
const me = (s) => ({ name: s.name, role: 'Young witch', portrait: 'witch', voice: 2 });

// ================================================================== encounter characters in the world
export function setupEncounterActors(game) {
  const w = game.world, s = game.state;
  for (const e of game.encActors || []) { e.actor.removeFrom(w.scene); e.extra?.removeFrom(w.scene); }
  game.encActors = [];
  const si = seasonIndex(s.day);
  for (const def of ENCOUNTERS) {
    if (def.air || !seasonReached(s, def.from)) continue;
    const vsi = Math.max(si, def.from);
    const c = def.sprite(vsi, s);
    const actor = new Actor([c], { key: `enc-${def.id}-${vsi}`, kind: 'npc', shadowR: def.treeAnimal ? 0.01 : 0.45 });
    let { x, z } = def.at;
    let y = w.groundY(x, z);
    if (def.treeAnimal) { x = 53.9; z = 31.7; y = w.groundY(53.6, 31.4) + 2.3; actor.shadow.visible = false; }
    actor.place(x, y, z);
    actor.addTo(w.scene);
    if (def.treeAnimal) actor.shadow.visible = false;
    const entry = { def, actor };
    if (def.id === 'treecat') {
      entry.extra = new Actor([npcCanvas(randomOwnerLook(4242), 0)], { key: 'npc-ole', kind: 'npc' });
      entry.extra.place(def.at.x + 0.5, w.groundY(def.at.x + 0.5, def.at.z + 0.3), def.at.z + 0.3);
      entry.extra.addTo(w.scene);
    }
    game.encActors.push(entry);
  }
}
export function encounterBubbles(game) {
  const s = game.state;
  for (const e of game.encActors || []) {
    const avail = encAvailable(s, e.def);
    const rec = s.enc?.[e.def.id];
    const a = e.extra || e.actor;
    if (!avail) a.setBubble(null);
    else if (!rec || !rec.times) a.setBubble('alert', 'icon:exclaim');
    else a.setBubble('thought', 'icon:sparkle');
    if (e.extra) e.actor.setBubble(null);
  }
}
export function encounterInteractables(game, list) {
  const s = game.state;
  for (const e of game.encActors || []) {
    const def = e.def;
    const rec = s.enc?.[def.id];
    const avail = encAvailable(s, def);
    const label = !avail ? `${def.name} (come back tomorrow)` : rec?.times ? `Visit ${def.name}` : def.treeAnimal ? `Talk to ${def.name}` : `Meet ${def.name}`;
    list.push({ x: def.at.x, z: def.at.z, r: 1.7, label, act: () => (avail ? startEncounter(game, def) : game.ui.toast(`${def.name} has had enough excitement for one day. Come back tomorrow!`, 'icon:moon')) });
  }
}
export async function startEncounter(game, def) {
  game.world.witch.vel.set(0, 0, 0);
  try { await runEncounter(game, def); } catch (e) { console.error(e); game.encounterUI.hide(); }
}

// ================================================================== sky encounters
let stormTex = null;
function stormCloud() {
  if (stormTex) return stormTex;
  const c = makeCanvas(40, 20), g = ctx2d(c);
  g.fillStyle = '#5a5a80';
  for (const [x, y, r] of [[10, 12, 7], [20, 9, 9], [30, 12, 7], [15, 14, 6], [26, 14, 6]]) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = '#7a7aa8';
  for (const [x, y, r] of [[18, 7, 5], [27, 8, 4]]) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = '#ffe48a'; g.fillRect(19, 16, 2, 3); g.fillRect(18, 18, 2, 2);
  stormTex = c;
  return c;
}
export function updateSkyEncounters(game, dt) {
  const w = game.world, s = game.state, wit = w.witch;
  const ev = game.skyEvent;
  if (ev) {
    ev.life -= dt;
    ev.t += dt;
    const m = ev.mesh;
    m.position.x = ev.x + Math.sin(ev.t * 0.4) * 1.5 - ev.t * ev.drift;
    m.position.y = CRUISE_Y + ev.dy + Math.sin(ev.t * 1.4) * 0.3;
    m.position.z = ev.z;
    if (ev.gull) { ev.gull.position.set(m.position.x + Math.sin(ev.t * 5) * 0.5, m.position.y - 1.2 + Math.sin(ev.t * 7) * 0.2, m.position.z + 0.1); ev.gullBB.setFrame(Math.floor(ev.t * 8) % 2); }
    if (ev.def.id === 'whale') ev.bb.setFrame(Math.floor(ev.t * 1.5) % 2);
    if (Math.random() < dt * 8) w.glowFx.spawn({ x: m.position.x + (Math.random() - 0.5) * 3, y: m.position.y + (Math.random() - 0.5), z: m.position.z, life: 0.8, size: 0.2, color: ev.def.id === 'whale' ? '#e8e0ff' : '#c8dcff', shape: 2 });
    if (ev.def.id === 'squall' && Math.random() < dt * 30) w.fx.spawn({ x: m.position.x + (Math.random() - 0.5) * 2.4, y: m.position.y - 0.3, z: m.position.z, vy: -12, vx: -1, life: 0.5, size: 0.12, color: '#e8f4ff', alpha: 0.9 });
    const near = wit.mode === 'fly' && dist(m.position.x, m.position.z, wit.pos.x, wit.pos.z) < 2.6;
    if (near && !game.cutscene && !game.ui.busy) {
      clearSkyEvent(game);
      game.cutscene = true;
      startEncounter(game, ev.def).finally(() => { game.cutscene = false; game.markDirty(); });
      return;
    }
    if (ev.life <= 0) clearSkyEvent(game);
    return;
  }
  if (wit.mode !== 'fly' || !hasSkill(s, 'whistle') || game.cutscene) return;
  game.skyRoll = (game.skyRoll ?? 6) - dt;
  if (game.skyRoll > 0) return;
  game.skyRoll = 7;
  const I = w.I;
  const tx = clamp(Math.floor(wit.pos.x), 0, I.W - 1), tz = clamp(Math.floor(wit.pos.z), 0, I.H - 1);
  const overSea = !I.land[tz * I.W + tx];
  let def = null;
  if (encAvailable(s, ENC.whale) && Math.random() < 0.16) def = ENC.whale;
  else if (encAvailable(s, ENC.squall) && overSea && Math.random() < 0.45) def = ENC.squall;
  if (!def) return;
  spawnSkyEvent(game, def);
}
export function spawnSkyEvent(game, def) {
  const w = game.world, wit = w.witch;
  const ang = Math.atan2(wit.vel.z, wit.vel.x || 0.01);
  const d = 9;
  const x = wit.pos.x + Math.cos(ang) * d, z = wit.pos.z + Math.sin(ang) * d - 1.5;
  let bb;
  if (def.id === 'whale') bb = new Billboard([whaleCanvas(0), whaleCanvas(1)], { key: 'skywhale', shadow: true, basic: true, scale: 2.2 });
  else bb = new Billboard([stormCloud()], { key: 'stormcloud', shadow: false, basic: true, scale: 1.6 });
  bb.mesh.position.set(x, CRUISE_Y, z);
  w.scene.add(bb.mesh);
  const ev = { def, mesh: bb.mesh, bb, x, z, t: 0, life: 40, drift: def.id === 'whale' ? 0.5 : 0, dy: def.id === 'whale' ? 1.2 : 0.8 };
  if (def.id === 'squall') {
    const gb = new Billboard([gullCanvas(0), gullCanvas(1)], { key: 'skygull', shadow: false, basic: true });
    w.scene.add(gb.mesh);
    ev.gull = gb.mesh; ev.gullBB = gb;
  }
  game.skyEvent = ev;
  game.audio.sfx(def.id === 'whale' ? 'spirit' : 'whoosh');
  game.ui.toast(def.id === 'whale' ? 'Something enormous is drifting through the clouds…' : 'A squall is rolling in! Something is caught in it.', def.id === 'whale' ? 'cloudfluff' : 'icon:rain', { life: 4 });
}
export function clearSkyEvent(game) {
  const ev = game.skyEvent;
  if (!ev) return;
  game.world.scene.remove(ev.mesh);
  if (ev.gull) game.world.scene.remove(ev.gull);
  game.skyEvent = null;
}

// ================================================================== the goose
const GOOSE_LINES = [
  (it) => `HONK! A goose snatches your ${it} and waddles off at tremendous speed.`,
  (it) => `HONK!! The goose again! It takes your ${it}. It looks extremely pleased with itself.`,
  (it) => `HONK. The goose. Your ${it}. Gone. You're not even surprised any more.`,
  (it) => `honk. (The goose takes your ${it}, gently. Almost apologetically. It seems to be planning something.)`,
];
export function updateGoose(game, dt) {
  const s = game.state, w = game.world, wit = w.witch;
  const g = game.goose;
  if (g) {
    g.t += dt;
    g.actor.moveToward(g.to.x, g.to.z, dt, null, 5.5, 0.1);
    g.actor.update(dt, w);
    if (Math.random() < dt * 3) game.audio.tone('square', 520, 380, 0.08, 0.05);
    if (g.t > 3.2) { g.actor.removeFrom(w.scene); game.goose = null; }
    return;
  }
  if (!isFirstYear(s.day) || s.year?.finale || wit.mode !== 'walk' || game.cutscene || game.ui.busy) return;
  const si = seasonIndex(s.day);
  s.gags ||= {};
  const key = 'goose' + si;
  if (s.gags[key] || dayOfSeason(s.day) < (s.gags.gooseDay?.[si] || 3) || dayOfSeason(s.day) > 6) return;
  const I = w.I;
  const tx = clamp(Math.floor(wit.pos.x), 0, I.W - 1), tz = clamp(Math.floor(wit.pos.z), 0, I.H - 1);
  if (I.zone[tz * I.W + tx] !== 'town') return;
  const slots = s.satchel.filter((x) => ITEMS[x.id] && ['food', 'material', 'curio'].includes(ITEMS[x.id].cat) && x.id !== 'starshard');
  if (!slots.length) return;
  const slot = pick(slots);
  ST.removeFromSatchel(s, slot.id, 1);
  s.gags[key] = s.day;
  (s.gags.gooseLoot ||= []).push(slot.id);
  const a = new Actor([gooseCanvas(0), gooseCanvas(1)], { key: 'goose', kind: 'animal', shadowR: 0.25, speed: 5.5, frameMap: { idle: [1], walk: [0, 1] } });
  a.place(wit.pos.x + 0.8, wit.pos.y, wit.pos.z + 0.4);
  a.addTo(w.scene);
  const ang = Math.random() * Math.PI * 2;
  game.goose = { actor: a, t: 0, to: { x: wit.pos.x + Math.cos(ang) * 16, z: wit.pos.z + Math.sin(ang) * 16 } };
  game.audio.tone('square', 600, 420, 0.18, 0.12);
  game.audio.tone('square', 640, 400, 0.22, 0.12, 0.2);
  game.ui.toast(GOOSE_LINES[si](ITEMS[slot.id].name), 'icon:exclaim', { life: 5 });
  game.markDirty();
}

// ================================================================== the snail mail snail
export function snailProgress(s) { return clamp((s.day - 1) / (FINALE_DAY - 2), 0, 1); }
export function setupSnail(game) {
  const w = game.world, s = game.state;
  if (game.snail) game.snail.removeFrom(w.scene);
  game.snail = null;
  if (!isFirstYear(s.day) && s.gags?.snailHome) return;
  const k = snailProgress(s);
  const x = 51.4, z = 40.5 - k * 12.2;
  const a = new Actor([snailCanvas()], { key: 'snail', kind: 'animal', shadowR: 0.18 });
  a.place(x, w.groundY(x, z), z);
  a.addTo(w.scene);
  a.flip = true;
  game.snail = a;
}
export function snailInteractable(game, list) {
  const a = game.snail;
  if (!a) return;
  list.push({ x: a.pos.x, z: a.pos.z, r: 1.0, label: 'Look at the snail', act: () => snailTalk(game) });
}
async function snailTalk(game) {
  const s = game.state;
  const k = snailProgress(s);
  const lines = k < 0.05 ? 'A snail with a tiny mailbag is setting off up the hill road, toward the hotel. The bag says MARAVIK POST. It has a stamp on its shell.'
    : k < 0.3 ? 'The snail mail snail is making excellent progress. You think. It\'s hard to tell with snails.'
      : k < 0.55 ? 'The snail is about halfway up the hill. It seems very determined. The letter in its bag is addressed to the Broom & Board.'
        : k < 0.8 ? 'The snail stops to look at you. You could swear it nods. Then it keeps going. Slowly. So slowly.'
          : k < 1 ? 'The snail is nearly at the hotel. Its little mailbag is looking very worn. Whatever is inside, it has come a long way.'
            : 'The snail is resting by the hotel door, its delivery done. It looks proud.';
  await game.ui.say(null, lines);
}
const HILDE_LETTER = `hi.\n\n— Hilde\n\nP.S. If this snail ever reaches you, it means you stayed the whole year. I knew you would. I posted this the day I left you the inn, and I chose the slowest courier in Maravik on purpose.\n\nP.P.S. Look after Miles. He'll pretend he's looking after you. Let him.`;

// ================================================================== letters from Wick
const WICK = [
  null,
  'Dear witch,\nI counted the waves after you left. 4,012. That\'s a lot of waves to spend thinking about somebody. Come back soon?\n— Wick (the lighthouse) (that\'s me)',
  'Dear witch,\nA fishing boat got lost in the fog last night, and I shone SO hard. They made it home. I thought of you the whole time.\n— Wick',
  'Dear witch,\nI\'ve been practising for the festival. I can do a sort of… twinkle now. Don\'t tell anyone. It\'s a surprise.\n— your friend, Wick',
];
export function queueLetter(game, who, si) {
  const s = game.state;
  s.gags ||= {};
  const key = who + si;
  if (s.gags[key]) return;
  s.gags[key] = true;
  (s.pendingLetters ||= []).push({ type: 'note', from: 'Wick, at the lighthouse', text: WICK[si] || WICK[1], read: false });
}

// ================================================================== mornings
// Called after the end-of-day summary. Returns once any season ceremony is done.
export async function morning(game) {
  const s = game.state;
  s.gags ||= {};
  // letters that were promised yesterday
  if (s.pendingLetters?.length) { s.letters.push(...s.pendingLetters); s.pendingLetters = []; }
  // the snail arrives the day before the festival
  if (isFirstYear(s.day) && snailProgress(s) >= 1 && !s.gags.snailHome) {
    s.gags.snailHome = s.day;
    s.letters.push({ type: 'note', from: 'Hilde (via Snail Mail)', text: HILDE_LETTER, read: false, special: true });
    game.ui.toast('The snail mail snail has finally arrived. There\'s a letter for you.', 'letter', { gold: true, life: 5 });
  }
  setupSnail(game);
  setupEncounterActors(game);
  applySeasonVisuals(game);
  const si = seasonIndex(s.day);
  if (isFirstYear(s.day) && dayOfSeason(s.day) === 1 && s.day > 1 && !s.gags['intro' + si]) {
    s.gags['intro' + si] = true;
    planGoose(s);
    await seasonCeremony(game, si);
  }
  if (isFirstYear(s.day) && s.day === FINALE_DAY && !s.gags.festivalNotice) {
    s.gags.festivalNotice = true;
    await game.ui.say(MILES, 'Tonight\'s the Lantern Festival! It starts at six, down in the plaza. Everyone will be there.');
    await game.ui.say(MILES, '…Everyone you\'ve helped this year, I mean. Don\'t be late.');
  }
}
export function planGoose(s) {
  s.gags ||= {};
  s.gags.gooseDay ||= {};
  const si = seasonIndex(s.day);
  s.gags.gooseDay[si] ||= 2 + Math.floor(Math.random() * 5);
}

export function applySeasonVisuals(game) {
  const si = seasonIndex(game.state.day);
  game.world.applySeason(si);
  const t = SEASONS[si].tint;
  game.world.seasonTint = new THREE.Vector3(t[0], t[1], t[2]);
}

export function seasonCard(game, si) {
  const S = SEASONS[si];
  const el = document.createElement('div');
  el.className = 'season-card';
  el.style.setProperty('--sc', S.color);
  el.innerHTML = `<div class="sc-inner"><div class="sc-small">${si === 0 ? 'Your training year begins' : `Chapter ${si + 1} of 4`}</div><h1>${S.name}</h1><div class="sc-sub">${S.sub}</div><p>${S.card}</p></div>`;
  game.uiRoot.appendChild(el);
  game.audio.sfx('bell');
  return new Promise((r) => {
    const done = () => { el.classList.add('out'); setTimeout(() => { el.remove(); r(); }, 600); };
    const t = setTimeout(done, 4200);
    el.addEventListener('pointerdown', () => { clearTimeout(t); done(); }, { once: true });
  });
}

async function seasonCeremony(game, si) {
  const s = game.state;
  game.cutscene = true;
  await seasonCard(game, si);
  const sk = SKILLS[SEASONS[si].skill];
  const lines = [
    null,
    ['Mrrp. Summer already. You\'ve been at this a whole season, you know.', `I found something of Great-Aunt Hilde's in the attic. A little silver whistle: her ${sk.name}. She said a witch who can whistle up a breeze can help anyone in the sky.`, 'Your charm pouch has room for two charms now, too.', 'The coast is lovely this time of year. The harbour, the lighthouse… and I hear there\'s a raccoon down at the pier running some kind of "business".'],
    ['The woods are changing colour. Hilde loved autumn. She said it was the trees showing off before bed.', 'She used to say the old spirits in the Whispering Woods only talk to witches who know how to listen.', `…I think you're ready. Her book has a page for it: ${sk.name}. Three charm slots now, too. Look at you.`, 'Go and see the woods. Something in there has been humming all week.'],
    ['Snow.', 'Miles sits by the window for a long time.', 'Last week of your training year.', `Hilde wrote down her ${sk.name} spell for you. See? "For cold paws and frozen ponds." She underlined "paws" three times.`, 'There\'s a frozen pond up on the North Ridge that could use it. And on the last night, the Lantern Festival. The whole town goes.', '…Don\'t miss it, alright?'],
  ][si];
  for (const l of lines) await game.ui.say(MILES, l);
  game.ui.toast(`New skill: ${sk.name}. ${sk.desc}`, sk.icon, { gold: true, life: 6 });
  if (SEASONS[si].slots > SEASONS[si - 1].slots) game.ui.toast(`You can now carry ${SEASONS[si].slots} charms at once.`, 'charm_bun', { gold: true, life: 5 });
  game.cutscene = false;
}

// ================================================================== the Lantern Festival
export function festivalOpen(s) { return isFirstYear(s.day) && s.day === FINALE_DAY && !s.year?.finale && s.time >= 18 * 60; }
export function festivalInteractable(game, list) {
  const s = game.state;
  if (!festivalOpen(s)) return;
  list.push({ x: 50.5, z: 46.2, r: 2.2, label: 'Join the Lantern Festival', act: () => finale(game) });
}

export async function finale(game) {
  const s = game.state;
  if (s.year?.finale) return;
  s.year ||= {};
  game.cutscene = true;
  const w = game.world;
  // set the scene: evening in the plaza
  await new Promise((r) => game.irisClose(() => {
    game.stage = w;
    if (w.witch.mode !== 'walk') { w.witch.mode = 'walk'; w.witch.walkBB.mesh.visible = true; w.witch.flyBB.mesh.visible = false; }
    w.witch.place(50.5, 47.2);
    w.witch.facing = 'up';
    s.time = Math.max(s.time, 19.5 * 60);
    w.snapCamera();
    r();
  }));
  const guests = spawnFestival(game);
  game.fireworks(80);
  await wait(1200);
  const mayor = { name: 'Mayor Bellweather', role: 'Mayor', portrait: 'mayor', voice: 1 };
  await game.ui.say(mayor, `Friends! Neighbours! Frogs! Welcome to the Lantern Festival! This year we light our lanterns for someone special: the young witch on the hill, ${s.name}!`);
  await game.ui.say(mayor, 'A year ago the old inn was empty. Now look at it.');
  // everyone you befriended turns up
  const R = (id) => (s.enc?.[id]?.friend || 0) > 0;
  const beats = [];
  if (R('troll')) beats.push(s.flags.trollConcert ? 'Grumbold\'s band takes the stage, top hat and all. "This one\'s for the witch who stopped at my bridge," he says, and the whole plaza goes quiet.' : 'Grumbold the troll is here, standing very awkwardly at the edge of the crowd. He waves at you. He looks like he\'s having the best night of his life.');
  if (R('frogs')) beats.push(s.flags.geraldNote ? 'The Frog Choir sings. Gerald hits every note. Every single one. The lead frog has to sit down.' : 'The Frog Choir sings. Gerald is flat. It\'s perfect.');
  if (R('raccoon')) beats.push('Rocco is running a cups stall. It\'s completely rigged. Everyone is having a wonderful time.');
  if (R('bear')) beats.push('The bear has brought honey for everyone. He says he was awake for all of the festival planning.');
  if (R('flame')) beats.push('Out on the rock, the lighthouse flares gold, then pink, then green. Wick is twinkling.');
  if (R('stump')) beats.push('Somewhere in the woods, a stump is humming two notes. Very proudly.');
  if (R('crow')) beats.push(s.flags.magpieFriend ? 'Cornelius the crow and the magpie are sharing a single spoon.' : 'Cornelius the crow brought you something shiny. Of course he did.');
  if (R('treecat')) beats.push('Old Ole is here with his cat, a goat, a sheep and, somehow, the moose. Nobody asks.');
  if (R('duck')) beats.push('The duck is here. Nobody invited the duck. The duck is welcome.');
  if (R('squall') || R('whale')) beats.push('Above the rooftops, a little gull loops around the lanterns' + (R('whale') ? ', and far, far above it, a cloud the shape of a whale drifts slowly past.' : '.'));
  if (R('icefish')) beats.push('Someone has carried three fish down from the ridge in a bucket so they can see the lanterns too.');
  if (Object.keys(s.spirits || {}).length >= 8) beats.push('At the edge of the plaza, eight little hushlings rattle their heads in the lantern light.');
  if (!beats.length) beats.push('Pet owners from all over town have come, and their pets too. A dog barks. A parrot says your name.');
  for (const b of beats) await game.ui.say(null, b);
  if (guests.length) await game.ui.say(null, `So many of your guests are here: ${guests.slice(0, 6).join(', ')}${guests.length > 6 ? ` and ${guests.length - 6} more` : ''}. Every one of them remembers you.`);
  // the goose returns
  const loot = s.gags?.gooseLoot || [];
  if (loot.length) {
    await game.ui.say(null, 'HONK.');
    await game.ui.say(null, `The goose waddles up, drops everything it has stolen this year at your feet (${loot.length} thing${loot.length > 1 ? 's' : ''}), and then, very solemnly, a medal.`);
    for (const id of loot) game.giveItem(id, 1, { quiet: true });
    game.giveItem('goosemedal', 1, { quiet: true });
    s.gags.gooseLoot = [];
    game.ui.toast('The goose gave everything back. And a medal!', 'goosemedal', { gold: true, life: 5 });
  }
  await game.ui.say(mayor, 'To the Broom & Board!');
  await game.ui.say(null, 'Hundreds of paper lanterns rise over Maravik, all at once.');
  // the quiet part
  await new Promise((r) => game.irisClose(() => { w.witch.place(50.5, 27.2); w.witch.facing = 'down'; s.time = Math.max(s.time, 21.5 * 60); w.snapCamera(); r(); }));
  await wait(900);
  await game.ui.say(null, 'Later, on the hill above the town. The lanterns are still drifting out to sea.');
  await game.ui.say(MILES, 'Mrrow. Some festival.');
  await game.ui.say(me(s), 'Miles… can I ask you something? How long were you Great-Aunt Hilde\'s cat?');
  await game.ui.say(MILES, 'Twenty-two years. …I\'m still her cat, I think. You don\'t really stop.');
  await game.ui.say(MILES, 'When she got sick, she made me promise to look after whoever came next. I thought it was going to be a chore.');
  await game.ui.say(MILES, 'It wasn\'t.');
  if (s.gags?.snailHome) {
    await game.ui.say(MILES, 'She wrote you that letter, you know. The one the snail brought. She posted it a whole year ago.');
    await game.ui.say(me(s), 'She knew I\'d stay?');
  } else await game.ui.say(me(s), 'Do you think she knew I\'d stay?');
  await game.ui.say(MILES, 'She said a witch\'s training year isn\'t really about the training. It\'s about finding a place that\'s glad you came.');
  await game.ui.say(MILES, 'Look down there.');
  await game.ui.say(null, 'Down in the town, every window is lit.');
  await game.ui.say(MILES, 'That\'s a lot of glad.');
  await game.ui.say(me(s), '…Will you stay with me, Miles? Next year too?');
  await game.ui.say(MILES, 'Where else would I go? Somebody has to look after you.');
  await game.ui.say(MILES, '…And you have to look after me. That was the deal. Hilde said so.');
  s.year.finale = s.day;
  game.completeGoal('festival');
  game.addRep(5);
  game.save();
  await yearBook(game);
  clearFestival(game);
  game.cutscene = false;
  game.markDirty();
}
function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

function spawnFestival(game) {
  const w = game.world, s = game.state;
  clearFestival(game);
  game.festival = [];
  const R = (id) => (s.enc?.[id]?.friend || 0) > 0;
  const crowd = [];
  if (R('troll')) crowd.push(trollCanvas(s.flags.trollConcert ? 'concert' : 'plain'));
  if (R('frogs')) crowd.push(frogCanvas(1, true), frogCanvas(0, false, 1), frogCanvas(1, false, 2));
  if (R('raccoon')) crowd.push(raccoonCanvas(0));
  if (R('bear')) crowd.push(bearCanvas(2));
  if (R('duck')) crowd.push(duckCanvas());
  if (R('crow')) crowd.push(crowCanvas(false), ...(s.flags.magpieFriend ? [crowCanvas(true)] : []));
  if (R('stump')) crowd.push(stumpCanvas(1));
  if ((s.gags?.gooseLoot || []).length) crowd.push(gooseCanvas(2));
  const names = [];
  const pets = [];
  for (const r of Object.values(s.regulars || {})) { pets.push(petCanvas(r.species)); names.push(r.name); }
  for (const rv of s.reviews.slice(-12)) if (!names.includes(rv.pet)) names.push(rv.pet);
  const all = [...crowd, ...pets.slice(0, 8)];
  all.forEach((c, i) => {
    const a = Math.PI * (0.15 + 0.7 * (i / Math.max(1, all.length - 1)));
    const x = 50.5 + Math.cos(a) * 4.2, z = 45.6 - Math.sin(a) * 2.6;
    const actor = new Actor([c], { key: 'fest-' + i, kind: 'npc' });
    actor.place(x, w.groundY(x, z), z);
    actor.addTo(w.scene);
    game.festival.push(actor);
  });
  // lanterns rising
  game.lanternT = 60;
  return names;
}
function clearFestival(game) {
  for (const a of game.festival || []) a.removeFrom(game.world.scene);
  game.festival = [];
}
export function updateLanterns(game, dt) {
  if (!game.lanternT || game.lanternT <= 0) return;
  game.lanternT -= dt;
  const w = game.world;
  if (Math.random() < dt * 14) {
    const x = 50.5 + (Math.random() - 0.5) * 30, z = 45 + (Math.random() - 0.5) * 20;
    w.glowFx.spawn({ x, y: w.groundY(x, z) + 1, z, vy: 0.9 + Math.random() * 0.5, vx: 0.3, life: 14, size: 0.3, color: pick(['#ffd36b', '#ff9a5a', '#ffb8d8', '#ffe48a']), shape: 2, fadeIn: 0.15, wobble: 0.3 });
  }
}

// ================================================================== the year book
function yearBook(game) {
  const s = game.state;
  const friends = friendsMade(s);
  const friendIcons = friends.map((e) => {
    const c = e.sprite(Math.max(e.from, 3), s);
    return `<span class="yb-friend" title="${e.name}"><img class="px" src="${c.toDataURL()}"><small>${e.name}</small></span>`;
  }).join('');
  const st = s.stats;
  const n = friends.length;
  const verdict = n >= 11 ? 'Every single soul on the island knows your name. Hilde would be speechless. (She was never speechless.)'
    : n >= 8 ? 'Half the island would cross the sea for you now.'
      : n >= 4 ? 'You made real friends this year. That\'s the whole point.'
        : 'You kept the hotel open and the guests happy. A gentle year is still a good year.';
  const body = document.createElement('div');
  body.className = 'yearbook';
  body.innerHTML = `
    <p class="muted" style="margin-top:0">${s.name}'s training year at the Broom &amp; Board</p>
    <div class="yb-grid">
      <div><b>${st.guests}</b><span>guests hosted</span></div>
      <div><b>${st.fiveStars}</b><span>five-star reviews</span></div>
      <div><b>${st.deliveries}</b><span>deliveries</span></div>
      <div><b>${st.encounters || 0}</b><span>encounters</span></div>
      <div><b>${st.perfects || 0}</b><span>perfect results</span></div>
      <div><b>${st.charmsUsed || 0}</b><span>charms played</span></div>
      <div><b>${Object.keys(s.regulars || {}).length}</b><span>regulars</span></div>
      <div><b>${st.whales || 0}</b><span>whales seen</span></div>
    </div>
    <h3>Friends made (${n} of ${ENCOUNTERS.length})</h3>
    <div class="yb-friends">${friendIcons || '<span class="muted">Maybe next year!</span>'}</div>
    <p>${verdict}</p>
    <p class="muted">The Broom &amp; Board stays open, and the seasons keep turning. Every encounter is still out there to perfect, and new guests are already writing letters.</p>
    <button class="btn primary" style="font-size:20px">Keep playing ✦</button>`;
  return new Promise((r) => {
    body.querySelector('button').onclick = () => game.ui.closeModal();
    game.ui.openModal({ title: 'Your Training Year', sub: 'Thank you for playing', body, width: 640, onClose: r });
  });
}
