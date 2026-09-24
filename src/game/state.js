// Persistent game state + inventory helpers + save/load.
import { ITEMS } from './data.js';

const SAVE_KEY = 'broom-and-board-save-v1';
export const STACK = 5;
export const SATCHEL_CAPS = [8, 10, 14];
export const BASKET_CAPS = [1, 2, 3];

export function newState(name = 'Wren') {
  return {
    v: 1,
    name,
    day: 1,
    time: 7 * 60 + 30,
    weather: { kind: 'sunny', cloud: 0, rain: 0, wind: 0.2 },
    coins: 40,
    rep: 0,
    satchel: [],
    storage: {
      pantry: { carrot: 2, fish: 2, egg: 2, mint: 2, clover: 1 },
      workshop: { twine: 2, driftwood: 1 },
      curios: {},
    },
    upgrades: { satchel: 0, basket: 0, broom: 0 },
    rooms: Array.from({ length: 6 }, (_, i) => ({ unlocked: i < 2, decor: [], messes: [] })),
    renovating: null,
    guests: [],
    nextId: 1,
    letters: [],
    jobs: [],
    nodes: {},
    npc: {},
    recipes: ['treat_fish', 'treat_salad'],
    discovered: {},
    goals: {},
    stats: { deliveries: 0, guests: 0, fiveStars: 0, sorted: 0, brewed: 0, crafted: 0, earned: 0 },
    flags: {},
    events: {},
    reviews: [],
    today: { earned: 0, reviews: [], deliveries: 0, found: 0 },
    loc: { stage: 'hotel', x: 16, z: 9.5 },
    settings: { music: 0.5, sfx: 0.7, quality: 'high' },
  };
}

export function save(state) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    return true;
  } catch (e) {
    return false;
  }
}
export function load() {
  try {
    const s = localStorage.getItem(SAVE_KEY);
    if (!s) return null;
    const st = JSON.parse(s);
    if (!st || st.v !== 1) return null;
    return { ...newState(st.name), ...st };
  } catch (e) {
    return null;
  }
}
export function hasSave() {
  try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; }
}
export function wipeSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
}

// ------------------------------------------------------------------ satchel
export const satchelCap = (s) => SATCHEL_CAPS[s.upgrades.satchel] || 8;
export const basketCap = (s) => BASKET_CAPS[s.upgrades.basket] || 1;
const stackable = (id) => ITEMS[id] && ITEMS[id].cat !== 'parcel' && ITEMS[id].cat !== 'special';

// returns how many were added
export function addToSatchel(s, id, n = 1, extra = null) {
  let left = n;
  if (stackable(id)) {
    for (const slot of s.satchel) {
      if (slot.id === id && slot.n < STACK) {
        const k = Math.min(STACK - slot.n, left);
        slot.n += k; left -= k;
        if (!left) return n;
      }
    }
  }
  while (left > 0 && s.satchel.length < satchelCap(s)) {
    const k = stackable(id) ? Math.min(STACK, left) : 1;
    s.satchel.push({ id, n: k, ...(extra || {}) });
    left -= k;
  }
  return n - left;
}
export function canFit(s, id, n = 1) {
  let room = 0;
  if (stackable(id)) for (const slot of s.satchel) if (slot.id === id) room += STACK - slot.n;
  room += (satchelCap(s) - s.satchel.length) * (stackable(id) ? STACK : 1);
  return room >= n;
}
export function countSatchel(s, id) {
  return s.satchel.reduce((a, x) => a + (x.id === id ? x.n : 0), 0);
}
export function removeFromSatchel(s, id, n = 1, pred = null) {
  let left = n;
  for (let i = s.satchel.length - 1; i >= 0 && left > 0; i--) {
    const slot = s.satchel[i];
    if (slot.id !== id || (pred && !pred(slot))) continue;
    const k = Math.min(slot.n, left);
    slot.n -= k; left -= k;
    if (slot.n <= 0) s.satchel.splice(i, 1);
  }
  return n - left;
}

// ------------------------------------------------------------------ storage (pantry/workshop/curios)
export function binOf(id) { return ITEMS[id]?.bin; }
export function storeCount(s, id) {
  const b = binOf(id);
  return b ? s.storage[b][id] || 0 : 0;
}
export function storeAdd(s, id, n = 1) {
  const b = binOf(id);
  if (!b) return;
  s.storage[b][id] = (s.storage[b][id] || 0) + n;
}
export function storeTake(s, id, n = 1) {
  const b = binOf(id);
  if (!b || (s.storage[b][id] || 0) < n) return false;
  s.storage[b][id] -= n;
  if (s.storage[b][id] <= 0) delete s.storage[b][id];
  return true;
}
export function hasAll(s, needs) {
  return Object.entries(needs).every(([id, n]) => storeCount(s, id) >= n);
}
export function takeAll(s, needs) {
  if (!hasAll(s, needs)) return false;
  for (const [id, n] of Object.entries(needs)) storeTake(s, id, n);
  return true;
}
