// Conversations with the people of Maravik.
import { NPCS, ITEMS, RECIPES, BOTTLE_NOTES } from './data.js';
import { pick } from '../core/util.js';
import { countSatchel, removeFromSatchel } from './state.js';

const LINES = {
  honeycutt: {
    intro: 'Oh! You must be the new witch who took over the old inn on the hill. Welcome to Maravik, dear! I’m Mrs. Honeycutt. If you ever need work, my bread always needs delivering.',
    chat: ['The secret to good bread? Patience, butter, and humming while you knead.', 'My husband says your broom zipped right past our window this morning. He nearly dropped his tea!', 'Flying in the rain? Keep a loaf under your coat, it stays warm for ages.', 'Pets are like dough, dear. A little warmth and they rise right up.'],
    voice: 3,
  },
  aldo: {
    intro: 'Postmaster Aldo, at your service! A witch with a broom is exactly what this town needs. Parcels move so slowly up these hills.',
    chat: ['Neither rain nor wind nor seagulls shall stop the post! Well. Seagulls sometimes.', 'Did you know you can drop a parcel from your broom? Hover over the house and let it float down. Very stylish.', 'Every parcel has a story. Mostly socks. But still!'],
    voice: 1,
  },
  odette: {
    intro: 'Mm. A young witch. I collect curiosities, child — shells, old coins, bits of fallen stars. Bring me treasures and I’ll pay you fairly.',
    chat: ['Star Shards fall on clear nights. Look up after dark, and follow the glow.', 'That little island to the south-west? Nobody goes there. Which is precisely why you should.', 'The lighthouse keeper left a chest behind when he retired. Locked, of course.'],
    voice: 4,
  },
  fen: {
    intro: 'Whoa, a real flying broom! I’m Fen. I build flying machines — well, I try to. Maybe I can improve your broom? And your basket? And your bag? I have SO many ideas.',
    chat: ['Someday I’ll fly too. I’ve almost got the propeller bicycle working. Almost.', 'Aerodynamics are just physics being polite to birds.', 'If you find feathers, bring them! Bristles love feathers.'],
    voice: 2,
  },
  pim: {
    intro: 'Fresh produce! Carrots, fish, milk, eggs! Oh — a customer with a broom. I’m Pim. Buy, sell, or just admire my apples.',
    chat: ['Everything’s fresher when the sun is out. That’s science.', 'The farm up north sends me carrots, but between you and me, Greta keeps the best ones.', 'If you ever have spare food, I’ll buy it.'],
    voice: 0,
  },
  marlo: {
    intro: 'Ahoy there. Marlo’s the name, fishing’s the game. Sea’s been generous. Want a sardine or three?',
    chat: ['The tide brings in all sorts. Shells, glass, the odd bottle with a note inside.', 'Gulls know when you’ve got fish. They always know.', 'Beautiful day to be on the water. Or above it, I suppose, in your case.'],
    voice: 3,
  },
  greta: {
    intro: 'Hello, hello! I’m Greta, I run the farm here. Sheep, hens, carrots, bees — help yourself to a little, just be gentle with the sheep.',
    chat: ['Brush the sheep and you’ll get wool. They love it, honestly.', 'The bees are grumpy before noon. Like me.', 'My hens lay more when the weather’s warm.'],
    voice: 0,
  },
  ivy: {
    intro: 'Oh, hi! Sorry, I was painting the light between the trees. I’m Ivy. I live out here because the city was too loud. You’re the flying witch, right? That’s amazing.',
    chat: ['Sometimes I can’t paint at all. Then I go for a walk and it comes back. Same with magic, I bet.', 'The forest mushrooms are delicious, but frogs like them more than I do.', 'You should paint sometime. Or fly. Is flying like painting? Probably.'],
    voice: 2,
  },
  mayor: {
    intro: 'Ahem! Mayor Bellweather. Welcome, welcome. A hotel for pets, eh? Splendid for tourism. Do keep the reviews glowing, young lady.',
    chat: ['Maravik has the finest clock tower on the coast. I checked.', 'Reputation is everything in business. And in politics. And in pet hotels, apparently.', 'My dear Duchess Fifi is very particular about her accommodations.'],
    voice: 1,
  },
  lotta: {
    intro: 'Hi! I’m Lotta! Is that your cat? Can he talk? He looks like he can talk.',
    chat: ['When I grow up I’m going to be a witch too. Or a baker. Or a witch baker!', 'Soot winked at me. I saw it.', 'The fountain has coins in it. Don’t tell anyone I told you.'],
    voice: 2,
  },
};

export const TEACH = {
  greta: ['treat_stew', 'treat_apple'],
  honeycutt: ['treat_crumble', 'treat_seedcake'],
  ivy: ['treat_moss'],
  odette: ['treat_catnip'],
};
export const GIFTS = { marlo: 'fish', greta: 'egg', honeycutt: 'bread', ivy: 'flower', pim: 'apple' };

export function speaker(id) {
  const n = NPCS[id];
  return { name: n.name, role: n.role, portrait: id === 'soot' ? 'soot' : n.look, voice: LINES[id]?.voice || 0 };
}

export async function talk(game, id) {
  const s = game.state;
  const sp = speaker(id);
  const L = LINES[id];
  const flags = (s.npc[id] ||= { met: false, gift: 0, chat: 0 });
  game.audio.sfx('open');
  const firstTalk = !flags.met;
  if (!flags.met) {
    flags.met = true;
    await game.ui.say(sp, L.intro);
  }
  // recipe teaching (once they know you a little)
  const teach = (TEACH[id] || []).filter((r) => !s.recipes.includes(r));
  if (teach.length && ((flags.talks || 0) >= 1 || id === 'greta')) {
    const r = teach[0];
    s.recipes.push(r);
    await game.ui.say(sp, `Here — let me write down my recipe for ${ITEMS[r].name}. Your guests will love it. (Brew it at your cauldron!)`);
    game.ui.toast(`Learned recipe: ${ITEMS[r].name}`, r, { gold: true });
    game.audio.sfx('sparkle');
  }
  // daily gift
  if (GIFTS[id] && flags.gift !== s.day) {
    flags.gift = s.day;
    const item = GIFTS[id];
    if (game.giveItem(item, 1, { quiet: true })) {
      await game.ui.say(sp, pick([`Oh, take this ${ITEMS[item].name.toLowerCase()} — on the house!`, `Here, I had a spare ${ITEMS[item].name.toLowerCase()}. For your guests!`]));
      game.ui.toast(`Got ${ITEMS[item].name}`, item);
    }
  }
  // special events
  if (id === 'lotta') return lottaTalk(game, sp);
  if (id === 'odette' && countSatchel(s, 'brasskey') > 0 && !s.flags.keyHint) {
    s.flags.keyHint = true;
    await game.ui.say(sp, 'Is that a brass key? That looks like the lighthouse keeper’s. His old chest sits beside the lighthouse. Go on, then!');
  }
  if (countSatchel(s, 'bottle') > 0 && id === 'marlo') {
    removeFromSatchel(s, 'bottle', 1);
    const note = BOTTLE_NOTES[(s.flags.notes || 0) % BOTTLE_NOTES.length];
    s.flags.notes = (s.flags.notes || 0) + 1;
    await game.ui.say(sp, 'A bottle, eh? Let’s pop it open… “' + note + '”');
    game.addCoins(8, 'Marlo pays for the bottle');
  }

  const opts = [];
  const acts = [];
  const add = (label, fn) => { opts.push(label); acts.push(fn); };
  if (id === 'aldo') add('Any parcels?', () => game.menus.jobBoard('aldo'));
  if (id === 'honeycutt') add('Bread to deliver?', () => game.menus.jobBoard('honeycutt'));
  if (id === 'pim' || id === 'marlo' || id === 'greta') add('Let’s trade', () => game.menus.shop(id));
  if (id === 'odette') add('Sell treasures', () => game.menus.shop(id));
  if (id === 'fen') add('Upgrade my gear', () => game.menus.upgrades());
  add('Chat', async () => {
    flags.chat++;
    await game.ui.say(sp, pick(L.chat));
  });
  add('Bye!', null);
  flags.talks = (flags.talks || 0) + (firstTalk ? 1 : 1);
  const k = await game.ui.say(sp, pick(['What can I do for you?', 'Hello again!', 'Oh, it’s you! What’s up?', 'Lovely to see you.']), opts);
  if (acts[k]) await acts[k]();
}

async function lottaTalk(game, sp) {
  const s = game.state;
  const ev = s.events.balloon;
  if (countSatchel(s, 'balloon') > 0) {
    removeFromSatchel(s, 'balloon', 1);
    ev.done = true;
    await game.ui.say(sp, 'MY BALLOON!! You found it! You flew all the way up there? You’re the best witch EVER. Here, this is my favourite marble.');
    game.giveItem('glassbead', 1);
    game.addRep(1, 'Lotta is overjoyed');
    game.audio.sfx('happy');
    return;
  }
  if (ev && !ev.done) {
    await game.ui.say(sp, 'Waaah! My red balloon floated away! It went up, up, somewhere over the town… could you catch it with your broom? Please?');
    return;
  }
  await game.ui.say(sp, pick(LINES.lotta.chat));
}

// Soot, the resident cat, gives hints about what to do next.
export async function sootHint(game) {
  const s = game.state;
  const sp = { name: 'Soot', role: 'Your cat', portrait: 'soot', voice: 4 };
  game.audio.sfx('meow');
  const unread = s.letters.filter((l) => !l.read).length;
  const booked = s.guests.filter((g) => g.status === 'booked');
  const due = s.guests.filter((g) => g.status === 'in-room' && g.checkout <= s.day);
  const hungry = s.guests.filter((g) => g.status === 'in-room' && g.hunger < 35);
  const messy = s.rooms.some((r) => (r.messes || []).length);
  const loot = s.satchel.filter((x) => x.id !== 'parcel' && x.id !== 'balloon').length;
  let line;
  if (unread) line = 'Mrrp. There’s mail in the box by the door. Could be a booking!';
  else if (due.length) line = `${due[0].name} goes home today. Take them back to ${due[0].owner.name} before midnight.`;
  else if (hungry.length) line = `${hungry[0].name} looks hungry. Feed them something from the pantry. Favourite foods count double.`;
  else if (booked.length) line = `${booked[0].owner.name} is waiting with ${booked[0].name}. Hop on the broom with F and go fetch them!`;
  else if (loot >= 3) line = 'Your satchel is bulging. Sort it at the sorting table in the lobby.';
  else if (messy) line = 'Somebody made a mess in their room. Sweep it up before the guests notice.';
  else if ((s.time / 60) >= 21) line = 'It’s late. Even witches need sleep. The bed’s right there…';
  else line = pick([
    'Brewed treats make guests much happier than plain food. The cauldron is in the kitchen.',
    'Toys and room decor keep guests cheerful while you’re out. Craft them at the workbench.',
    'Each guest wishes for something special. Look at the bubble above their head.',
    'Aldo at the post office always has parcels. Easy coins.',
    'Falling stars drop Star Shards at night. Very valuable. Very shiny.',
    'More reputation means more bookings, fancier guests and bigger rooms.',
  ]);
  await game.ui.say(sp, line);
}
