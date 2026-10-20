// Charms: thank-you cards from grateful guests (and the odd troll). Pack them into your charm slots
// before heading out; each one is spent when you play it in an encounter.
import { slotsFor } from './year.js';
import { pick } from '../core/util.js';

// tag = what it does in encounters. "Path" charms unlock a whole new way through an encounter;
// "helper" charms make a minigame gentler; luck and wish bend the result itself.
export const CHARMS = {
  bun: { name: 'Honey Bun', icon: 'charm_bun', tag: 'treat', kind: 'path', desc: 'Everyone can be bribed. Everyone.' },
  kazoo: { name: 'Tin Kazoo', icon: 'charm_kazoo', tag: 'music', kind: 'path', desc: 'Play a tune instead of doing the thing.' },
  yarn: { name: 'Yarn Ball', icon: 'toy_yarn', tag: 'toy', kind: 'path', desc: 'No animal alive can ignore a yarn ball.' },
  lantern: { name: 'Moon Lantern', icon: 'charm_lantern', tag: 'night', kind: 'path', desc: 'A light for secret things. Some encounters change by its glow.' },
  gloves: { name: 'Thick Mittens', icon: 'charm_gloves', tag: 'grip', kind: 'helper', desc: 'A steadier grip: wider timing windows.' },
  lavender: { name: 'Lavender Sachet', icon: 'charm_lavender', tag: 'calm', kind: 'helper', desc: 'Calms everyone down. Things move slower.' },
  shell: { name: 'Echo Shell', icon: 'shell', tag: 'song', kind: 'helper', desc: 'Hear the beat clearly: wider rhythm windows.' },
  monocle: { name: 'Keen Monocle', icon: 'charm_monocle', tag: 'sight', kind: 'helper', desc: 'Spot tricks, tells and wrong answers.' },
  feather: { name: 'Tailwind Feather', icon: 'feather', tag: 'wind', kind: 'helper', desc: 'Sky encounters get gentler. Whoosh.' },
  clover: { name: 'Lucky Clover', icon: 'clover', tag: 'luck', kind: 'luck', desc: 'After any encounter: bump the result up one star.' },
  star: { name: 'Wishing Star', icon: 'starshard', tag: 'wish', kind: 'wish', desc: 'One perfect outcome, anywhere. Use it wisely.' },
};

// Which helper charms matter for which minigame
export const GAME_HELPERS = {
  rhythm: ['song', 'calm'],
  timing: ['grip', 'calm'],
  shell: ['sight', 'calm'],
  sneak: ['calm'],
  dodge: ['wind', 'calm'],
  riddle: ['sight'],
  slide: [],
};

// What each species tends to leave in its thank-you card
const THANKS = {
  dog: ['bun', 'yarn', 'gloves'], cat: ['yarn', 'lantern', 'monocle'], bunny: ['clover', 'lavender', 'bun'],
  hedgehog: ['gloves', 'bun', 'lavender'], turtle: ['lavender', 'shell', 'clover'], parrot: ['kazoo', 'feather', 'shell'],
  frog: ['shell', 'kazoo', 'lavender'], ferret: ['monocle', 'yarn', 'gloves'], owl: ['lantern', 'monocle', 'feather'],
  poodle: ['star', 'clover', 'bun'],
};
export function thankYouCharm(species, stars) {
  const pool = THANKS[species] || ['bun'];
  if (stars >= 5 && Math.random() < 0.18) return pick(['clover', 'star', 'clover']);
  return pick(pool);
}

// ------------------------------------------------------------------ collection & slots
export function charmCount(s, id) { return s.charms[id] || 0; }
export function addCharm(s, id, n = 1) { s.charms[id] = (s.charms[id] || 0) + n; }
export function slotted(s) {
  const n = slotsFor(s);
  s.slots ||= [];
  while (s.slots.length < n) s.slots.push(null);
  return s.slots.slice(0, n);
}
export function slottedTags(s) { return slotted(s).filter(Boolean).map((id) => CHARMS[id].tag); }
export function hasSlottedTag(s, tag) { return slotted(s).some((id) => id && CHARMS[id].tag === tag); }
export function equipCharm(s, id) {
  const slots = slotted(s);
  const free = slots.indexOf(null);
  if (free < 0 || !charmCount(s, id)) return false;
  s.charms[id]--;
  if (!s.charms[id]) delete s.charms[id];
  s.slots[free] = id;
  return true;
}
export function unequipCharm(s, i) {
  const id = s.slots[i];
  if (!id) return;
  addCharm(s, id);
  s.slots[i] = null;
}
// Spend the first slotted charm with this tag (returns its id)
export function spendTag(s, tag) {
  const i = slotted(s).findIndex((id) => id && CHARMS[id].tag === tag);
  if (i < 0) return null;
  const id = s.slots[i];
  s.slots[i] = null;
  s.stats.charmsUsed = (s.stats.charmsUsed || 0) + 1;
  return id;
}
