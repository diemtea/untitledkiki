// Booking letters, owners, and parcel deliveries.
import { SPECIES, OWNER_NAMES, QUIRKS } from './data.js';
import { seasonIndex } from './year.js';
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

// Guests get trickier as the year goes on: spring guests have one simple need, summer brings the
// first quirks, and by winter most guests have a couple of them.
export function rollQuirks(state, species) {
  const si = state.day > 28 ? 3 : seasonIndex(state.day);
  const n = si === 0 ? 0 : si === 1 ? (Math.random() < 0.5 ? 1 : 0) : si === 2 ? 1 + (Math.random() < 0.3 ? 1 : 0) : 1 + (Math.random() < 0.6 ? 1 : 0);
  const pool = Object.keys(QUIRKS).filter((q) => !(q === 'catfoe' && species === 'cat') && !(q === 'nightowl' && species === 'owl'));
  return shuffle(pool).slice(0, n);
}

export function makeBooking(state, homes, opts = {}) {
  const busy = busyHomes(state);
  const freeHomes = homes.filter((h) => !busy.has(h.id));
  if (!freeHomes.length) return null;
  const home = opts.home ? homes.find((h) => h.id === opts.home) : pick(freeHomes);
  if (!home) return null;
  const species = opts.species || pick(unlockedSpecies(state));
  const usedNames = new Set(state.guests.filter((g) => g.status !== 'done').map((g) => g.name));
  const usedOwners = new Set(state.guests.filter((g) => g.status !== 'done').map((g) => g.owner.name));
  const ownerName = opts.ownerName || pick(OWNER_NAMES.filter((n) => !usedOwners.has(n)));
  const nights = opts.nights || randInt(1, species === 'owl' ? 2 : 3);
  const S = SPECIES[species];
  const rate = opts.rate || Math.round(S.rate * (1 + Math.min(state.rep, 40) * 0.012));
  const seed = state.nextId * 7919 + state.day * 31;
  const quirks = opts.quirks || rollQuirks(state, species);
  return {
    type: 'booking',
    id: state.nextId++,
    day: state.day,
    species,
    petName: opts.petName || randomPetName(species, usedNames),
    nights,
    rate,
    pickupBy: quirks.includes('early') ? 12 * 60 : 18 * 60,
    owner: { name: ownerName, home: home.id, door: home.door, label: home.label, look: opts.look || randomOwnerLook(seed) },
    quirks,
    regular: !!opts.regular,
    trusted: !!opts.trusted,
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
  // returning regulars: the pets you've looked after well come back, and their owners trust you more
  const regs = Object.values(state.regulars || {}).filter((r) => r.lastDay < state.day - 1);
  for (let i = 0; i < n; i++) {
    let b = null;
    if (regs.length && Math.random() < 0.45) {
      const r = regs.splice(Math.floor(Math.random() * regs.length), 1)[0];
      const busyNow = busyHomes(state);
      if (!busyNow.has(r.owner.home)) {
        const trusted = r.trust >= 1;
        b = makeBooking(state, homes, {
          species: r.species, petName: r.name, ownerName: r.owner.name, home: r.owner.home, look: r.owner.look, regular: true, trusted,
          nights: randInt(1, 3),
          text: trusted
            ? `Dear Broom & Board! ${r.name} hasn't stopped talking about you since last time. Could you take them again? And this time ${r.name} can go on adventures with you, if you like. They're very brave (mostly). — ${r.owner.name}`
            : `Hello again! ${r.name} keeps sitting by the door, waiting to go back to the hotel on the hill. Would you have room? — ${r.owner.name}`,
        });
      }
    }
    if (!b) b = makeBooking(state, homes);
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
