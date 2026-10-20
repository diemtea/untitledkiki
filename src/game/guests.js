// Guest pets: needs, wishes, care actions and checkout reviews.
import { SPECIES, ITEMS, PET_NAMES } from './data.js';
import { storeTake, storeCount } from './state.js';
import { clamp, pick } from '../core/util.js';
import { roomBounds } from '../world/hotel.js';

export const MAX_MESS = 3;

export function isNight(min) { const h = (min / 60) % 24; return h >= 22 || h < 6; }

// Later in the year, some guests wish for rare finds that only encounters give.
const RARE_WISHES = [[], ['sunberry', 'goldhoney'], ['sunberry', 'goldhoney', 'moonberry'], ['goldhoney', 'moonberry', 'moonberry']];
export function makeWish(sp, rng = Math.random, si = 0) {
  const S = SPECIES[sp];
  const rare = RARE_WISHES[si] || [];
  if (rare.length && rng() < [0, 0.2, 0.32, 0.42][si]) return { kind: 'food', id: rare[Math.floor(rng() * rare.length)], rare: true };
  const opts = [];
  for (const f of S.foods) opts.push({ kind: 'food', id: f });
  for (const t of S.treats) opts.push({ kind: 'treat', id: t }, { kind: 'treat', id: t });
  for (const t of S.toys) opts.push({ kind: 'toy', id: t });
  for (const d of S.decor) opts.push({ kind: 'decor', id: d });
  if (S.walkLover) opts.push({ kind: 'walk', id: 'icon:paw' }, { kind: 'walk', id: 'icon:paw' });
  else opts.push({ kind: 'walk', id: 'icon:paw' });
  return opts[Math.floor(rng() * opts.length)];
}
export function wishText(w) {
  if (!w) return '';
  if (w.kind === 'walk') return 'a walk outside';
  const it = ITEMS[w.id];
  if (w.kind === 'decor') return `a ${it.name} in their room`;
  return (/^[aeiou]/i.test(it.name) ? 'an ' : 'a ') + it.name;
}

export const hasQuirk = (g, q) => !!(g.quirks && g.quirks.includes(q));

export function tickGuests(state, dMin, weather) {
  const night = isNight(state.time);
  const hour = (state.time / 60) % 24;
  for (const g of state.guests) {
    if (g.status !== 'in-room' && g.status !== 'party') continue;
    const S = SPECIES[g.species];
    const owlish = S.nocturnal || hasQuirk(g, 'nightowl');
    const asleep = g.status === 'in-room' && !g.escaped && (owlish ? !night && hour > 9 && hour < 17 : night);
    const f = asleep ? 0.3 : 1;
    g.hunger = clamp(g.hunger - (S.hunger / 60) * dMin * f, 0, 100);
    if (g.status === 'in-room') {
      const room = state.rooms[g.room];
      const decor = room.decor || [];
      const liked = decor.some((d) => S.decor.includes(d));
      let jf = liked ? 0.55 : decor.length ? 0.8 : 1;
      if (g.toy) jf *= S.toys.includes(g.toy) ? 0.55 : 0.75;
      if (S.rainLover && weather.rain > 0) jf *= 0.5;
      // quirks
      if (hasQuirk(g, 'stormy') && weather.rain > 0 && !decor.includes('decor_cushion')) jf *= 2.2;
      if (hasQuirk(g, 'clingy')) jf *= 1.45;
      if (hasQuirk(g, 'nightowl') && (hour >= 20 || hour < 2) && state.time - (g.lastPet ?? -999) > 120) jf *= 1.8;
      if (hasQuirk(g, 'catfoe') && state.guests.some((o) => o !== g && o.species === 'cat' && o.status === 'in-room' && Math.abs(o.room - g.room) === 1)) jf *= 1.6;
      g.joy = clamp(g.joy - (S.joy / 60) * dMin * f * jf, 0, 100);
      if (liked && !asleep) g.joy = clamp(g.joy + (2 / 60) * dMin, 0, 100);
      // messes
      if (!asleep && Math.random() < (S.mess * (hasQuirk(g, 'messy') ? 2 : 1) / 60) * dMin && (room.messes || []).length < MAX_MESS) {
        const rb = roomBounds(g.room);
        room.messes ||= [];
        room.messes.push({ x: rb.x0 + 0.5 + Math.random() * (rb.x1 - rb.x0 - 1), z: rb.z0 + 1.2 + Math.random() * (rb.z1 - rb.z0 - 2) });
      }
    } else {
      // outside with you: walks are the best
      g.joy = clamp(g.joy + ((S.walkLover ? 16 : 9) / 60) * dMin, 0, 100);
      g.walkMins = (g.walkMins || 0) + dMin;
      if (g.wish && g.wish.kind === 'walk' && !g.wishDone && g.walkMins > 45) { g.wishDone = true; g._wishToast = true; }
    }
    if (g.fedAt != null && state.time - g.fedAt > 180) g.fedRecently = false;
  }
}

// hourly satisfaction sample
export function sampleGuests(state) {
  for (const g of state.guests) {
    if (g.status !== 'in-room' && g.status !== 'party') continue;
    let tidy = g.status === 'in-room' ? 100 - (state.rooms[g.room].messes || []).length * 30 : 100;
    if (g.escaped) tidy -= 40;
    const s = g.hunger * 0.4 + g.joy * 0.4 + tidy * 0.2;
    g.sum = (g.sum || 0) + s;
    g.samples = (g.samples || 0) + 1;
  }
}

export function guestMood(g) {
  const v = (g.hunger + g.joy) / 2;
  return v > 75 ? 'happy' : v > 45 ? 'ok' : 'sad';
}

// ---------------------------------------------------------------- actions
export function actPet(state, g) {
  const since = state.time - (g.lastPet ?? -999);
  const S = SPECIES[g.species];
  let gain = since > 90 ? 14 : 3;
  if (hasQuirk(g, 'clingy')) gain = Math.round(gain * 1.5);
  const h = (state.time / 60) % 24;
  if (hasQuirk(g, 'nightowl') && (h >= 20 || h < 2)) gain += 6;
  g.joy = clamp(g.joy + gain, 0, 100);
  g.lastPet = state.time;
  return { gain, msg: since > 90 ? `${g.name} leans into the scritches.` : `${g.name} is happy, but a little over-cuddled.` };
}

export function actFeed(state, g, id) {
  if (!storeTake(state, id, 1)) return null;
  const S = SPECIES[g.species];
  const it = ITEMS[id];
  const isTreat = it.cat === 'treat';
  const liked = it.rare || (isTreat ? S.treats.includes(id) : S.foods.includes(id));
  let hunger = isTreat ? 60 : it.rare ? 45 : liked ? 32 : 20;
  let joy = isTreat ? (liked ? 35 : 12) : it.rare ? 40 : liked ? 10 : 0;
  if (hasQuirk(g, 'picky') && !liked) { hunger = 5; joy = -4; }
  g.hunger = clamp(g.hunger + hunger, 0, 100);
  g.joy = clamp(g.joy + joy, 0, 100);
  if (liked) g.favFed = (g.favFed || 0) + 1;
  g.fedRecently = true;
  g.fedAt = state.time;
  let wish = false;
  if (g.wish && !g.wishDone && (g.wish.kind === 'food' || g.wish.kind === 'treat') && g.wish.id === id) { g.wishDone = true; g.joy = clamp(g.joy + 25, 0, 100); wish = true; }
  return { liked, wish, isTreat };
}

export function actToy(state, g, id) {
  if (g.toy) return null;
  if (!storeTake(state, id, 1)) return null;
  const S = SPECIES[g.species];
  const liked = S.toys.includes(id);
  g.toy = id;
  g.joy = clamp(g.joy + (liked ? 40 : 22), 0, 100);
  let wish = false;
  if (g.wish && !g.wishDone && g.wish.kind === 'toy' && g.wish.id === id) { g.wishDone = true; g.joy = clamp(g.joy + 20, 0, 100); wish = true; }
  return { liked, wish };
}

export function actDecorate(state, roomIdx, id) {
  const room = state.rooms[roomIdx];
  room.decor ||= [];
  if (room.decor.length >= 3) return null;
  if (!storeTake(state, id, 1)) return null;
  room.decor.push(id);
  const g = state.guests.find((x) => x.room === roomIdx && x.status === 'in-room');
  let wish = false, liked = false;
  if (g) {
    const S = SPECIES[g.species];
    liked = S.decor.includes(id);
    g.joy = clamp(g.joy + (liked ? 25 : 8), 0, 100);
    if (g.wish && !g.wishDone && g.wish.kind === 'decor' && g.wish.id === id) { g.wishDone = true; g.joy = clamp(g.joy + 20, 0, 100); wish = true; }
  }
  return { g, liked, wish };
}

// ---------------------------------------------------------------- checkout
const REVIEWS = {
  5: ['Absolutely magical! {pet} came home glowing. We’ll be back!', '{pet} hasn’t stopped purring about the little witch’s hotel. Five stars!', 'Best stay {pet} has ever had. The service is simply enchanting.'],
  4: ['{pet} had a lovely time. Very cozy!', 'Warm, clean and friendly. {pet} approves.', 'A charming stay — {pet} made a new friend.'],
  3: ['{pet} was fine. A little bored at times.', 'Decent stay. {pet} seemed a bit peckish.', 'Nice enough! Room for improvement.'],
  2: ['{pet} came home rather hungry and grumpy.', 'Hmm. {pet} did not seem very happy.'],
  1: ['Oh dear. {pet} was quite miserable.', '{pet} will need a lot of cuddles to recover.'],
};

export function scoreGuest(state, g, lateHome = false) {
  const S = SPECIES[g.species];
  const avg = g.samples ? g.sum / g.samples : (g.hunger + g.joy) / 2;
  const room = state.rooms[g.room] || { decor: [] };
  let score = avg;
  if (g.wishDone) score += 12;
  score += Math.min(g.favFed || 0, 3) * 3;
  if ((room.decor || []).some((d) => S.decor.includes(d))) score += 6;
  if (g.toy && S.toys.includes(g.toy)) score += 4;
  // adventures together (and the odd fright)
  score += Math.min(2, g.adventures || 0) * 4 - Math.min(2, g.spooked || 0) * 4;
  let stars = score >= 86 ? 5 : score >= 70 ? 4 : score >= 54 ? 3 : score >= 38 ? 2 : 1;
  if (lateHome) stars = Math.max(1, stars - 1);
  const pay = g.rate * g.nights;
  const tipPct = [0, 0, 0.05, 0.25, 0.45, 0.75][stars];
  let tip = Math.round(pay * tipPct);
  if (g.toy) tip += Math.round(pay * 0.1);
  if (lateHome) tip = 0;
  let text = pick(REVIEWS[stars]).replace('{pet}', g.name);
  if (g.adventures && stars >= 4) text += ` ${g.name} won't stop telling everyone about their big adventure with you!`;
  return { stars, pay, tip, text, score: Math.round(score) };
}

export function randomPetName(species, used) {
  const pool = PET_NAMES[species].filter((n) => !used.has(n));
  return pick(pool.length ? pool : PET_NAMES[species]);
}
