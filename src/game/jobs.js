// Booking letters, owners, and parcel deliveries.
import { SPECIES, OWNER_NAMES } from './data.js';
import { makeWish, randomPetName } from './guests.js';
import { randomOwnerLook } from '../gfx/sprites.js';
import { pick, shuffle, randInt, dist } from '../core/util.js';

export function unlockedSpecies(state) {
  return Object.entries(SPECIES).filter(([k, s]) => s.rep <= state.rep && k !== 'poodle').map(([k]) => k);
}

function freeRooms(state) {
  const taken = new Set(state.guests.filter((g) => ['booked', 'party', 'in-room'].includes(g.status)).map((g) => g.room));
  return state.rooms.map((r, i) => (r.unlocked && !taken.has(i) ? i : -1)).filter((i) => i >= 0);
}
export { freeRooms };

function busyHomes(state) {
  return new Set([
    ...state.guests.filter((g) => g.status !== 'done' && g.status !== 'cancelled').map((g) => g.owner.home),
    ...state.letters.filter((l) => l.type === 'booking').map((l) => l.owner.home),
  ]);
}

export function makeBooking(state, homes, opts = {}) {
  const busy = busyHomes(state);
  const freeHomes = homes.filter((h) => !busy.has(h.id));
  if (!freeHomes.length) return null;
  const home = opts.home ? homes.find((h) => h.id === opts.home) : pick(freeHomes);
  const species = opts.species || pick(unlockedSpecies(state));
  const usedNames = new Set(state.guests.filter((g) => g.status !== 'done').map((g) => g.name));
  const usedOwners = new Set(state.guests.filter((g) => g.status !== 'done').map((g) => g.owner.name));
  const ownerName = opts.ownerName || pick(OWNER_NAMES.filter((n) => !usedOwners.has(n)));
  const nights = opts.nights || randInt(1, species === 'owl' ? 2 : 3);
  const S = SPECIES[species];
  const rate = opts.rate || Math.round(S.rate * (1 + Math.min(state.rep, 40) * 0.012));
  const seed = state.nextId * 7919 + state.day * 31;
  return {
    type: 'booking',
    id: state.nextId++,
    day: state.day,
    species,
    petName: opts.petName || randomPetName(species, usedNames),
    nights,
    rate,
    pickupBy: 18 * 60,
    owner: { name: ownerName, home: home.id, door: home.door, label: home.label, look: opts.look || randomOwnerLook(seed) },
    text: opts.text || null,
    read: false,
  };
}

export function morningMail(state, homes, isFirstDay) {
  const letters = [];
  if (isFirstDay) {
    const b = makeBooking(state, homes, {
      species: 'dog', petName: 'Biscuit', ownerName: 'Nora Bell', nights: 1, rate: 22, home: 'house0',
      text: 'Dear new hotel keeper! I must visit my sister across the bay tonight. Could you take care of my corgi, Biscuit? He loves eggs and long walks. I’ll wait by my door on Main Street. — Nora',
    });
    if (b) letters.push(b);
    return letters;
  }
  const free = freeRooms(state).length;
  let n = Math.min(free, 1 + (state.rep >= 6 ? 1 : 0) + (state.rep >= 16 ? 1 : 0) + (Math.random() < 0.35 ? 1 : 0));
  if (free > 0 && n === 0) n = 1;
  for (let i = 0; i < n; i++) {
    const b = makeBooking(state, homes);
    if (b) letters.push(b);
  }
  // the mayor's VIP request
  if (state.rep >= 12 && !state.flags.vipDone && !state.flags.vipOffered && free > 0) {
    state.flags.vipOffered = true;
    const vip = makeBooking(state, homes, { species: 'poodle', petName: 'Duchess Fifi', ownerName: 'Mayor Bellweather', nights: 2, rate: 60, text: 'To the esteemed Broom & Board: my darling Duchess Fifi requires only the finest care for two nights. I shall await you by the clock tower. — Mayor Bellweather' });
    if (vip) { vip.vip = true; vip.owner.door = { x: 52.4, z: 41.2 }; vip.owner.label = 'the clock tower plaza'; vip.owner.look = 'mayor'; letters.push(vip); }
  }
  return letters;
}

// Parcel jobs offered by the post office / bakery
export function makeDeliveries(state, homes, from, n) {
  const jobs = [];
  const busy = new Set(state.jobs.filter((j) => j.status !== 'done').map((j) => j.to.id));
  const pool = shuffle(homes.filter((h) => !busy.has(h.id)));
  for (let i = 0; i < n && i < pool.length; i++) {
    const h = pool[i];
    const d = dist(from.x, from.z, h.door.x, h.door.z);
    jobs.push({
      id: state.nextId++,
      kind: from.kind,
      giver: from.npc,
      to: { id: h.id, door: h.door, label: h.label, name: pick(OWNER_NAMES) },
      reward: Math.round(8 + d * 0.35 + (from.kind === 'bread' ? 3 : 0)),
      due: (from.kind === 'bread' ? 13 : 17) * 60,
      status: 'offered',
      day: state.day,
    });
  }
  return jobs;
}
