// Encounters: the little stories you stumble into while exploring. Each one has a default way
// through, extra ways that charms or a trusted pet unlock, and a gentle "Kind Words" path that never
// fails. Results are graded 0-3 stars; better results mean better finds. Every season adds a new layer.
import { trollCanvas, stumpCanvas, frogCanvas, raccoonCanvas, bearCanvas, duckCanvas, flameCanvas, crowCanvas, mooseCanvas, goatCanvas, whaleCanvas, hiveCanvas, vaneCanvas } from '../gfx/critters.js';
import { petCanvas, sheepCanvas, gullCanvas, itemCanvas } from '../gfx/sprites.js';
import { seasonIndex, hasSkill, seasonReached } from './year.js';
import { CHARMS, GAME_HELPERS, slotted, spendTag, addCharm, hasSlottedTag } from './charms.js';
import { ITEMS, SPECIES } from './data.js';
import { starsHTML } from '../ui/encounter.js';
import rhythm from '../minigames/rhythm.js';
import timing from '../minigames/timing.js';
import shell from '../minigames/shell.js';
import sneak from '../minigames/sneak.js';
import dodge from '../minigames/dodge.js';
import slide from '../minigames/slide.js';
import riddle from '../minigames/riddle.js';
import { pick, clamp } from '../core/util.js';

export const MINIGAMES = { rhythm, timing, shell, sneak, dodge, slide, riddle };

const KEYS = {
  rhythm1: (t) => (t ? 'tap in time' : '<kbd>E</kbd> / <kbd>Space</kbd> on the beat'),
  rhythm2: (t) => (t ? 'tap the top or bottom lane' : '<kbd>↑</kbd> high lane · <kbd>↓</kbd> low lane'),
  timing: (t) => (t ? 'tap when the marker is in the green' : '<kbd>E</kbd> when the marker is in the green'),
  shell: (t) => (t ? 'tap a cup, or the CHEAT! sign' : '<kbd>←</kbd><kbd>→</kbd> choose · <kbd>E</kbd> pick'),
  sneak: (t) => (t ? 'hold the screen to creep · let go when an eye opens' : 'hold <kbd>E</kbd> or <kbd>→</kbd> to creep · let go when an eye opens'),
  dodge: (t) => (t ? 'drag to steer' : '<kbd>W A S D</kbd> / arrows to steer'),
  slide: (t) => (t ? 'tap a fish, then tap where to slide it' : '<kbd>E</kbd> next fish · arrows slide · <kbd>Shift</kbd> reset'),
};

// rewards: [{item, n} | {coins} | {charm} | {rep}]
const I = (item, n = 1) => ({ item, n });
const once = (rec, key) => !(rec.got || {})[key];

// how each species "helps" when it rides along
const PET_HELP = {
  dog: 'barks encouragingly and wags at everyone', cat: 'gives everyone a long, knowing stare', bunny: 'thumps a very serious little foot',
  hedgehog: 'curls into a confident ball', turtle: 'waits with tremendous patience', parrot: 'repeats the right answer very loudly',
  frog: 'croaks exactly the right note', ferret: 'dooks and darts in to help', owl: 'hoots something terribly wise', poodle: 'strikes a dramatic pose',
};

// ================================================================== the encounters
export const ENCOUNTERS = [
  // ---------------------------------------------------------------- Grumbold, the bridge troll
  {
    id: 'troll', name: 'Grumbold', role: 'Bridge Troll', voice: 3, at: { x: 63.6, z: 31.4 }, scene: 'road', from: 0,
    where: 'the little bridge on the meadow road', petBest: ['frog', 'owl', 'parrot'],
    sprite: (si) => trollCanvas(['plain', 'kazoo', 'lute', 'concert'][si]),
    stage: (si) => [{ id: 'main', c: trollCanvas(['plain', 'kazoo', 'lute', 'concert'][si]), x: 96, y: 74, bob: 1 }],
    variant(si, x) {
      const riddles = [
        { q: '"Riddle one! What has a neck, but no head?"', a: [{ t: 'A bottle', score: 1 }, { t: 'A sweater', score: 0, r: '"A sweater has a HOLE for a head. Not the same. Pay attention."' }, { t: 'A very sad giraffe', score: 0, r: '"…I hate that you made me think about that."' }] },
        { q: '"What gets WETTER the more it dries?"', a: [{ t: 'A towel', score: 1 }, { t: 'A fish', score: 0, r: '"Fish don\'t dry. Fish are permanently wet. Look it up."' }, { t: 'The sea', score: 0 }] },
        { q: '"What has keys, but can\'t open locks?"', a: [{ t: 'A piano', score: 1 }, { t: 'A jailer', score: 0 }, { t: 'You, probably', score: 0, r: '"…Rude. Accurate. But rude."' }] },
        { q: '"What has to be broken before you can use it?"', a: [{ t: 'An egg', score: 1 }, { t: 'This bridge', score: 0, r: 'Grumbold gasps and hugs the bridge.' }, { t: 'A rule', score: 0 }] },
        { q: '"I\'m tall when I\'m young and short when I\'m old. What am I?"', a: [{ t: 'A candle', score: 1 }, { t: 'A troll', score: 0, r: '"Trolls just get wider. Ask my mother."' }, { t: 'A tree', score: 0 }] },
        { q: '"What can you catch, but never throw?"', a: [{ t: 'A cold', score: 1 }, { t: 'A ball', score: 0, r: '"You can THROW a ball. That\'s the whole point of a ball."' }, { t: 'Feelings', score: 0, r: '"…Can you? Can you throw them? Asking for me."' }] },
      ];
      const sad = [
        { q: '"What\'s green, lives under a bridge, and has never once been invited to a party?"', a: [{ t: 'You', score: 1, r: '"Correct. …But that\'s going to change this year, isn\'t it. Because of you."' }, { t: 'A frog', score: 0, r: '"Frogs get invited to EVERYTHING. Have you seen them? Delightful."' }, { t: 'Moss', score: 0 }] },
        { q: '"What gets bigger the more you take away from it?"', a: [{ t: 'A hole', score: 1 }, { t: 'A troll\'s appetite', score: 0 }, { t: 'Loneliness', score: 0, r: '"…That one\'s not a riddle. That\'s just true."' }] },
        { q: '"What can fill a whole room, but takes up no space at all?"', a: [{ t: 'Music', score: 1, r: '"YES. Music. My answer was \'light\', but yours is better."' }, { t: 'Light', score: 1 }, { t: 'A very big troll', score: 0 }] },
      ];
      if (si === 0) return {
        intro: ['A troll is sitting on the little bridge. Blocking it. With his entire self.', '"HALT. None shall pass without answering my RIDDLES. Three of them. I\'ve been practising."'],
        options: [
          { id: 'riddle', label: 'Answer his riddles', icon: 'icon:exclaim', game: 'riddle', params: { questions: riddles } },
          { id: 'kazoo', label: 'Play him a tune instead', charm: 'music', game: 'rhythm', params: { scene: 'road', beats: 12, bpm: 92, voice: 'square', root: 330 } },
          { id: 'bun', label: 'Offer him a honey bun', charm: 'treat', instant: 3 },
        ],
        lines: {
          riddle: ['Grumbold looks almost sorry for you. "None? Here. Have a pebble. For your troubles."', '"One. ONE. …Go on then, pass. I\'m not a monster. I\'m a troll. Different thing."', '"Two out of three. That\'s… a pass. Barely. Don\'t tell the other trolls."', 'Grumbold slumps. "All three. Nobody\'s EVER… fine. Fine! You may pass." He pushes a few toll coins at you, embarrassed.'],
          kazoo: ['Grumbold winces. Then, weirdly, he smiles.', 'Grumbold taps one enormous foot.', 'Grumbold sways. A single tear rolls into his moss. "…Teach me."', 'Grumbold is weeping openly. "THAT. I want to do THAT. Teach me how to do THAT." He gives you everything in his pockets.'],
          bun: [null, null, null, 'Grumbold eats the bun in one bite. Then a second, smaller bite, despite there being nothing left. "…You may pass."'],
        },
        kind: 'You tell Grumbold his bridge is the nicest bridge on the island. He goes very red and lets you through.',
        rewards: (g, rec) => [[I('pebble', 2)], [I('clover', 2), { coins: 5 }], [{ coins: 14 }, I('sunberry')], [{ coins: 25 }, once(rec, 'kazoo') ? { charm: 'kazoo', key: 'kazoo' } : I('sunberry', 2)]][g],
        after: (g, opt, x) => { if (opt === 'kazoo' && g >= 2) x.s.flags.trollMusic = true; },
      };
      if (si === 1) return {
        intro: ['Grumbold has a kazoo now. He holds it like a baby bird.', '"I\'ve been practising. My neighbours moved away. Unrelated." He raises the kazoo. "Play with me. Keep the beat and I\'ll… follow. Roughly."'],
        options: [
          { id: 'jam', label: 'Jam with Grumbold', icon: 'charm_kazoo', game: 'rhythm', params: { scene: 'road', beats: 16, bpm: 100, voice: 'square', root: 294 } },
          { id: 'riddle', label: 'Ask for a riddle instead', icon: 'icon:exclaim', game: 'riddle', params: { questions: riddles, count: 2 } },
          { id: 'bun', label: 'Offer a honey bun', charm: 'treat', instant: 3 },
        ],
        lines: {
          jam: ['"…We\'ll work on it."', '"Not bad! Not good! But not bad!"', '"We sound GREAT. I\'m thinking of starting a band."', '"That was BEAUTIFUL. I\'m starting a band. Don\'t tell anyone. Tell EVERYONE." He hands you a page of his "sheet music". It\'s mostly doodles of frogs.'],
          riddle: ['"Riddles are my past. MUSIC is my future." He plays a sad kazoo note.', '"Fine. But I\'m doing them on the kazoo next time."', '"Still got it."', '"STILL GOT IT." He kazoos triumphantly.'],
          bun: [null, null, null, 'He eats the bun, then plays you a little song about the bun. It\'s honestly very moving.'],
        },
        kind: 'You tell Grumbold his kazoo playing is "really something". He chooses to hear that as a compliment.',
        rewards: (g) => [[I('pebble')], [{ coins: 6 }], [{ coins: 14 }, I('sunberry')], [{ coins: 22 }, I('sheetmusic')]][g],
      };
      if (si === 2) return {
        intro: ['Grumbold has assembled a band: himself, a lute he can\'t play, and three frogs who owe him money.', '"We need a fourth. You\'re the fourth." One of the frogs is wearing a tiny bow tie. That\'s Gerald.'],
        options: [
          { id: 'band', label: 'Play with the band', icon: 'sheetmusic', game: 'rhythm', params: { scene: 'road', beats: 18, bpm: 104, lanes: 2, root: 262, gerald: true } },
          { id: 'bun', label: 'Feed the band (honey bun)', charm: 'treat', instant: 2 },
        ],
        lines: {
          band: ['The frogs file out in silence. Gerald stays behind to pat your hand.', '"A rough first rehearsal. Every great band has one."', '"We\'re getting TIGHT. Gerald\'s still flat, but in a charming way."', '"That\'s it. That\'s the sound. We\'re ready for the Lantern Festival." The frogs high-five. Gerald misses.'],
          bun: [null, null, 'The band takes a snack break that lasts the rest of the afternoon. Morale: excellent.', null],
        },
        kind: 'You clap for the band. They bow so deeply that one of the frogs falls in the brook.',
        rewards: (g) => [[I('moss')], [{ coins: 8 }, I('moss')], [{ coins: 16 }, I('sheetmusic')], [{ coins: 28 }, I('moonberry')]][g],
      };
      return {
        intro: ['Grumbold is wearing a top hat. It\'s too small. He has never been happier.', '"The Lantern Festival. The big stage. Me." He swallows. "One last rehearsal? For luck?"'],
        options: [
          { id: 'rehearse', label: 'Rehearse the big song', icon: 'sheetmusic', game: 'rhythm', params: { scene: 'road', beats: 22, bpm: 110, lanes: 2, root: 262, gerald: true } },
          { id: 'riddle', label: 'One riddle, for old times\' sake', icon: 'icon:exclaim', game: 'riddle', params: { questions: sad } },
          { id: 'bun', label: 'Share a honey bun', charm: 'treat', instant: 3 },
        ],
        lines: {
          rehearse: ['"…It\'ll be fine on the night. That\'s what they say. Isn\'t it?"', '"Good. Good! I\'m only a little bit terrified."', '"We\'re ready. I think we\'re actually ready."', 'For a moment, nobody says anything. Then Grumbold hugs you so hard your hat falls off. "Front row. Promise me."'],
          riddle: ['"Ha. You\'re terrible at riddles. I\'ll miss that."', '"Hm. Close enough."', '"You know me so well now."', '"…Thank you. For not just walking past my bridge, back in spring."'],
          bun: [null, null, null, 'You split the bun. Grumbold says it\'s the first time anyone has shared food with him. He makes you promise to come to the concert.'],
        },
        kind: 'You tell Grumbold he\'s going to be wonderful. He looks at his feet. "You think so?" You do.',
        rewards: (g) => [[I('pebble')], [{ coins: 10 }], [{ coins: 20 }, I('sunberry')], [{ coins: 30 }, I('goldhoney')]][g],
        after: (g, opt, x) => { if (g >= 1) x.s.flags.trollConcert = true; },
      };
    },
  },

  // ---------------------------------------------------------------- the ever-growing animal in the oak
  {
    id: 'treecat', name: 'Old Ole', role: 'Worried neighbour', voice: 1, at: { x: 54.6, z: 32.6 }, scene: 'tree', from: 0,
    where: 'the big oak below the hotel', petBest: ['dog', 'parrot', 'cat'],
    treeAnimal: true,
    animal: (si) => [petCanvas('cat'), goatCanvas(), sheepCanvas(0), mooseCanvas()][si],
    sprite: (si) => [petCanvas('cat'), goatCanvas(), sheepCanvas(0), mooseCanvas()][si],
    stage: (si) => [],
    variant(si, x) {
      const who = ['cat', 'goat', 'sheep', 'moose'][si];
      const intros = [
        ['Old Ole is wringing his hands under the big oak.', '"My cat\'s up the tree again! She does this every spring. Could you fetch her down?"'],
        ['Old Ole is staring up into the oak.', '"So. Don\'t ask me how. But my goat is up the tree."', 'A goat looks down at you from the branches, chewing thoughtfully.'],
        ['Old Ole doesn\'t even look surprised any more.', '"It\'s a sheep this time. I don\'t own a sheep. I don\'t know whose sheep it is."'],
        ['Old Ole is sitting on the bench with his head in his hands.', '"That\'s not my moose. I\'ve never seen that moose in my life."', 'The moose blinks at you from the top of the oak. The branches creak alarmingly.'],
      ][si];
      const ends = [
        ['The cat stays put, judging you. Ole climbs up with a ladder in the end.', 'She comes down one branch, then thinks better of it. Ole fetches a ladder.', 'She hops down into your basket and starts purring immediately.', 'She drops into your basket like that was always the plan. Old Ole cries a little.'],
        ['The goat eats a branch out of spite.', 'The goat comes most of the way, then eats your hat. You get it back. Mostly.', 'The goat clambers into your basket. It eats the basket. Just a little.', 'The goat hops down gracefully, like a goat who has done this before. It definitely has.'],
        ['The sheep refuses. It\'s made a little nest up there.', 'The sheep bleats and wobbles down one branch at a time.', 'The sheep tumbles into your basket like a cloud. Ole has no idea where to put it.', 'The sheep floats down into your basket, soft as a sigh. It leaves a tuft of wool as a thank-you.'],
        ['The moose remains. The moose is eternal.', 'The moose comes down a branch. The tree is not okay.', 'The moose settles into your basket. Your broom creaks in a way brooms should never creak.', 'The moose lowers itself into your basket with surprising grace. Ole stares. "…I suppose I have a moose now."'],
      ][si];
      return {
        intro: intros,
        options: [
          { id: 'coax', label: `Coax the ${who} down`, icon: 'gear_basket', game: 'timing', params: { kind: 'tree', animal: this.animal(si), speed: 0.9 + si * 0.25, zone: 0.2 - si * 0.02 } },
          { id: 'yarn', label: 'Dangle a yarn ball', charm: 'toy', instant: 3 },
          { id: 'bun', label: 'Tempt it with a honey bun', charm: 'treat', instant: 2 },
        ],
        lines: {
          coax: ends,
          yarn: [null, null, null, `The ${who} follows the yarn ball straight down into your basket. ${si === 3 ? 'Even the moose. Especially the moose.' : 'Easy.'}`],
          bun: [null, null, `The ${who} climbs down for the bun, and keeps a close eye on you in case there's another.`, null],
        },
        kind: `You and Ole sit under the tree and chat until the ${who} gets bored and climbs down by itself.`,
        rewards: (g) => [[I('apple')], [I('apple', 2)], [{ coins: 12 }, I('apple', 2)], [{ coins: 20 }, [I('catnip', 2), I('milk', 2), I('wool', 3), I('frostbloom')][si]]][g],
      };
    },
  },

  // ---------------------------------------------------------------- the honey bear
  {
    id: 'bear', name: 'The Bear', role: 'Definitely asleep', voice: 3, at: { x: 73.8, z: 25.8 }, scene: 'farm', from: 0,
    where: 'the beehive in the meadow', petBest: ['turtle', 'ferret'],
    sprite: () => bearCanvas(0),
    stage: () => [{ id: 'main', c: (t) => bearCanvas(0), x: 110, y: 90, bob: 1, bobSpeed: 1.2 }, { id: 'hive', c: hiveCanvas(), x: 160, y: 86 }],
    variant(si, x) {
      const first = !x.rec.times;
      const tail = first ? ' As you leave, the bear opens one eye. "I was awake the whole time," he says. "I just like the company."' : pick([' "Same time tomorrow?" the bear murmurs, without opening his eyes.', ' The bear waves a paw at you without waking up. Or pretending not to.', ' "You\'re getting better at that," says the bear, who is supposedly asleep.']);
      const intro = [
        ['A big brown bear is snoozing in front of the beehive. Very peacefully. Suspiciously peacefully.', 'The honey is right there. You could probably tiptoe past…'],
        ['The bear is napping in the sun, belly-up. The bees are buzzing loudly about it.', 'Summer naps are shorter. He peeks a lot more.'],
        ['The bear is "getting ready for hibernation", which so far mostly means eating.', 'He\'s asleep. Ish. Very light sleeper this time of year.'],
        ['The bear is hibernating, curled up by the hive under a blanket of snow.', 'He\'s REALLY asleep this time. …Probably.'],
      ][si];
      return {
        intro,
        options: [
          { id: 'sneak', label: 'Tiptoe to the hive', icon: 'honey', game: 'sneak', params: { peek: [0.8, 0.6, 0.55, 0.9][si], time: 30 } },
          { id: 'bun', label: 'Offer the bear a honey bun', charm: 'treat', instant: 3 },
          { id: 'yarn', label: 'Roll a yarn ball past him', charm: 'toy', instant: 2 },
        ],
        lines: {
          sneak: ['You never quite make it. The bear hands you a little honey anyway, looking amused.' + tail, 'You make it to the hive, just about.' + tail, 'You scoop up some honey without a sound.' + tail, 'You glide in and out like a shadow, with the very best honey from the very top of the hive.' + tail],
          bun: [null, null, null, 'The bear accepts the bun with enormous dignity, and steps aside. "A fair trade." He even helps with the lid.'],
          yarn: [null, null, 'The bear watches the yarn roll by. And keeps watching. And keeps watching. You help yourself to some honey.', null],
        },
        kind: 'You just ask. The bear opens one eye, sighs, and hands you a little jar. "You could have asked from the start, you know."',
        rewards: (g) => [[I('honey')], [I('honey')], [I('honey', 2)], [I('goldhoney'), I('honey')]][g],
      };
    },
  },

  // ---------------------------------------------------------------- the frog choir (and Gerald)
  {
    id: 'frogs', name: 'The Frog Choir', role: 'and Gerald', voice: 0, at: { x: 53.6, z: 42.6 }, scene: 'pond', from: 0,
    where: 'the fountain in the plaza', petBest: ['frog', 'parrot', 'owl'],
    sprite: () => frogCanvas(0, true),
    stage: () => [0, 1, 2, 3].map((i) => ({ id: i === 2 ? 'gerald' : 'f' + i, c: (t) => frogCanvas(Math.floor(t * 2 + i) % 3 === 0 ? 1 : 0, i === 2, i % 3), x: 48 + i * 32, y: 92 - (i % 2) * 4, bob: 1, ph: i, scale: 2 })),
    variant(si, x) {
      const performers = [0, 1, 2, 3].map((i) => ({ c0: frogCanvas(0, i === 2, i % 3), c1: frogCanvas(1, i === 2, i % 3), x: 76 + i * 30, y: 70 - (i % 2) * 3, sing: 1, wince: 1, scale: 2 }));
      const rain = x.s.weather.rain > 0;
      const intro = [
        ['Four frogs are sitting on the edge of the fountain, clearing their throats.', '"Ahem. We are the Maravik Frog Choir. We need a conductor. Our last one was a heron. It… didn\'t work out."', '"Keep the beat for us. And don\'t mind Gerald." Gerald is the one in the bow tie. Gerald is always flat. Everyone loves Gerald.'],
        [rain ? 'It\'s raining, and the Frog Choir is in heaven. "A RAIN CONCERT!"' : 'The Frog Choir is rehearsing their summer set. They\'d prefer rain, but they\'re professionals.', '"Gerald has been practising," says the lead frog. Gerald nods solemnly. Gerald is still flat.'],
        ['The choir is wearing little scarves. Autumn is their favourite season, apparently.', '"Gerald has been taking lessons," says the lead frog. "From a cricket." Gerald clears his throat with great confidence.'],
        ['The choir is huddled together on the frozen fountain in tiny knitted hats.', '"Last rehearsal before the Lantern Festival," says the lead frog. Gerald looks determined. Something is different about Gerald today.'],
      ][si];
      const pattern = [];
      const n = [14, 16, 18, 20][si];
      for (let i = 0, b = 0; i < n; i++) { pattern.push([b, (i * 5 + (i >> 1)) % 2, i % 4 === 2]); b += i % 4 === 3 ? 2 : 1; }
      return {
        intro,
        options: [
          { id: 'conduct', label: 'Conduct the choir', icon: 'icon:sparkle', game: 'rhythm', params: { scene: 'pond', lanes: 2, pattern, bpm: [88, 96, 104, 100][si], performers, geraldPerformer: 2, geraldFixed: si === 3, root: 196, voice: 'triangle' } },
          { id: 'kazoo', label: 'Accompany them on kazoo', charm: 'music', instant: 3 },
        ],
        lines: {
          conduct: si === 3
            ? ['The choir gets lost halfway. But then, at the very end, Gerald hits the note. Perfectly. The fountain goes silent.', 'And then, right at the end, Gerald hits the note. Perfectly in tune. Every frog in Maravik starts cheering.', 'Gerald hits the note. Perfectly in tune. Every frog in Maravik starts cheering. Gerald bows so low his hat falls off.', 'Gerald hits the note. PERFECTLY. The lead frog weeps. Somewhere, a heron feels something. Gerald gives you his tiny bow tie.']
            : ['The choir falls apart into confused croaks. Gerald keeps going, flat and proud.', '"Not bad for a first go," says the lead frog. Gerald was flat.', '"That\'s the best we\'ve sounded since the heron!" Gerald was flat, but with feeling.', '"MAGNIFICENT." The frogs bow. Gerald was flat, but it was the most beautiful flat note anyone has ever heard.'],
          kazoo: [null, null, null, 'You kazoo along. The choir is horrified at first, then delighted. Gerald is no longer the flattest one here, and he has never looked happier.'],
        },
        kind: 'You sit and listen to the whole set and clap at the end. Gerald clutches his heart.',
        rewards: (g, rec) => [[I('moss')], [I('moss', 2)], [{ coins: 10 }, I('moss', 2), ...(rain ? [I('sunberry')] : [])], [{ coins: 18 }, once(rec, 'shell') ? { charm: 'shell', key: 'shell' } : I('moonberry'), ...(rain ? [I('sunberry')] : [])]][g],
        after: (g, opt, x) => { if (si === 3 && opt === 'conduct') x.s.flags.geraldNote = true; },
      };
    },
  },

  // ---------------------------------------------------------------- Rocco's cups (summer)
  {
    id: 'raccoon', name: 'Rocco', role: 'Totally honest raccoon', voice: 2, at: { x: 58.6, z: 68.4 }, scene: 'dock', from: 1,
    where: 'the east pier of the harbour', petBest: ['ferret', 'cat', 'owl'],
    sprite: () => raccoonCanvas(0),
    stage: () => [{ id: 'main', c: raccoonCanvas(0), x: 96, y: 76, bob: 1 }],
    variant(si, x) {
      const intro = [
        null,
        ['A raccoon in a tiny green visor has set up a table made out of a crate.', '"Step right up! Find the pebble, win a prize! Totally fair! Totally on the level!"', '(He is not on the level. Watch his paws.)'],
        ['Rocco has upgraded to a nicer crate. He has a sign: ROCCO\'S CUPS — NOW EVEN FAIRER.', '"Back for more? I\'ve been working on my… technique."'],
        ['Rocco\'s sign now reads: UNDER NEW MANAGEMENT (ROCCO).', '"I\'ve gone straight," he says, shuffling his cups. "Mostly. Seasonally."'],
      ][si];
      const cheats = [null, [false, true, Math.random() < 0.5], [true, false, true], [Math.random() < 0.5, Math.random() < 0.5, true]][si];
      return {
        intro,
        options: [
          { id: 'play', label: 'Play Rocco\'s cups', icon: 'pebble', game: 'shell', params: { cheats, swaps: [[4, 6, 7], [4, 6, 7], [5, 7, 8], [6, 8, 9]][si], swapDur: [[0.5, 0.38, 0.32], [0.5, 0.38, 0.32], [0.42, 0.32, 0.27], [0.38, 0.3, 0.25]][si] } },
          { id: 'bun', label: 'Bribe him to play fair', charm: 'treat', instant: 2 },
        ],
        lines: {
          play: ['"Better luck next time, pal!" Rocco cackles, and tosses you a pebble out of pity.', '"Eh. You\'re learning." Rocco pays you, grudgingly.', '"Hmph. Sharp eyes." He counts out your winnings very, very slowly.', 'Rocco throws his visor on the ground. "NOBODY catches me. NOBODY." He gives you his lucky die. "Take it. It\'s clearly not lucky ENOUGH."'],
          bun: [null, null, 'Rocco eats the bun, plays perfectly fair, and still somehow wins one round. He gives you a cut anyway.', null],
        },
        kind: 'You tell Rocco he has very nimble paws. He looks pleased, then suspicious, then pleased again, and gives you a coin.',
        rewards: (g, rec) => [[I('pebble')], [{ coins: 8 }], [{ coins: 18 }, I('glassbead')], [once(rec, 'die') ? { item: 'luckydie', n: 1, key: 'die' } : I('oldcoin'), { coins: 25 }]][g],
      };
    },
  },

  // ---------------------------------------------------------------- the weathervane duck (summer)
  {
    id: 'duck', name: 'A Duck', role: 'Stuck on a weathervane', voice: 4, at: { x: 87.4, z: 59.6 }, scene: 'lighthouse', from: 1,
    where: 'the top of the lighthouse', petBest: ['parrot', 'owl', 'dog'],
    sprite: () => duckCanvas(),
    stage: () => [{ id: 'vane', c: vaneCanvas(), x: 96, y: 86, scale: 2 }, { id: 'main', c: duckCanvas(), x: 96, y: 62, bob: 1, scale: 2 }],
    variant(si, x) {
      const intro = [
        null,
        ['A duck is stuck on top of the lighthouse weathervane, spinning slowly in the breeze.', '"Quack." It is very calm about this.', '"Quack." (You get the feeling it has been up here since Tuesday.)'],
        ['The duck is back on the weathervane. The autumn wind is spinning it much faster now.', '"Quack," it says, going round. "Quack," it says again, coming back.'],
        ['The duck is frozen to the weathervane. It doesn\'t seem bothered.', '"Quack." A little icicle hangs from its beak. You\'ll have to warm it loose and catch it.'],
      ][si];
      return {
        intro,
        options: [
          { id: 'grab', label: si === 3 ? 'Thaw it with Warm Glow and catch it' : 'Catch it as it faces you', icon: 'feather', game: 'timing', params: { kind: 'duck', animal: duckCanvas(), speed: [1, 1.1, 1.5, 0.9][si], zone: 0.18 } },
          { id: 'bun', label: 'Lure it with a honey bun', charm: 'treat', instant: 2 },
        ],
        lines: {
          grab: ['You miss, a lot. Eventually the wind changes and the duck just flops off onto your broom.', 'You grab it on the second go. "Quack," it says, which you choose to take as thanks.', 'You pluck it neatly off the vane. "Quack!" It shakes out a few feathers for you.', 'A perfect catch. The duck looks at you with deep respect. "…Quack." It presses something into your hand with its beak.'],
          bun: [null, null, 'The duck hops onto your broom for the bun, and refuses to get off your broom for quite a while afterwards.', null],
        },
        kind: 'You hover next to the duck and keep it company until the wind drops and it can hop off by itself.',
        rewards: (g, rec) => [[I('feather')], [I('feather', 2)], [I('feather', 3), { coins: 10 }], [once(rec, 'feather') ? { charm: 'feather', key: 'feather' } : I('seaglass'), I('feather', 2), { coins: 14 }]][g],
      };
    },
  },

  // ---------------------------------------------------------------- the lighthouse spirit, your pen pal (summer)
  {
    id: 'flame', name: 'Wick', role: 'The lighthouse spirit', voice: 2, at: { x: 89.6, z: 62.2 }, scene: 'lighthouse', from: 1,
    where: 'the lighthouse window', petBest: ['owl', 'cat'],
    sprite: () => flameCanvas(0),
    stage: () => [{ id: 'main', c: (t) => flameCanvas(Math.floor(t * 3) % 2), x: 141, y: 34, bob: 1, scale: 2 }],
    variant(si, x) {
      const qs = [
        [
          { q: '"What do you like about the sea?"', a: [{ t: 'How it sparkles when your light touches it', score: 1, r: 'Wick glows a little brighter. "Oh. Nobody\'s ever said that."' }, { t: 'The fish, mostly', score: 1, r: '"The fish ARE good. Very sparkly."' }, { t: 'It\'s very wet', score: 0, r: '"…It is very wet. Thank you for that."' }] },
          { q: '"Do you think the ships like me? They just look at me and sail away."', a: [{ t: 'They look at you so they can get home', score: 1, r: 'Wick is quiet for a moment. "…Home. I hadn\'t thought of it like that."' }, { t: 'Ships don\'t have feelings', score: 0, r: '"Oh. Right. Of course."' }, { t: 'I like you, and I\'m not a ship', score: 1 }] },
          { q: '"Would you… write to me sometimes?"', a: [{ t: 'Every week. I promise.', score: 1, r: 'Wick flickers so hard it nearly goes out. "REALLY?"' }, { t: 'Maybe', score: 0 }, { t: 'I\'ll visit instead!', score: 1 }] },
        ],
        [
          { q: '"I read your letter forty times. Is it true you have a MOOSE now?"', a: [{ t: 'It\'s Old Ole\'s moose, technically', score: 1, r: '"Technically. I love that."' }, { t: 'No comment', score: 0 }, { t: 'I have a cat called Miles', score: 1, r: '"Miles. A good name. A lighthouse kind of name."' }] },
          { q: '"The nights are getting longer. Do you ever get lonely?"', a: [{ t: 'Sometimes. Then I visit friends.', score: 1, r: '"Friends," Wick repeats, softly. "Like me?"' }, { t: 'Never!', score: 0, r: '"Oh. Must be nice."' }, { t: 'That\'s why I come and see you', score: 1 }] },
          { q: '"What should I shine for, when there are no ships?"', a: [{ t: 'For anyone flying home late', score: 1, r: '"…For you, then. I\'ll shine for you."' }, { t: 'For the fish', score: 1 }, { t: 'Save your energy', score: 0 }] },
        ],
        [
          { q: '"Everyone in town is talking about the Lantern Festival. Will you be there?"', a: [{ t: 'I wouldn\'t miss it', score: 1 }, { t: 'If I\'m not too busy', score: 0 }, { t: 'Only if you shine for it', score: 1, r: 'Wick goes very still. "…I\'ve never been invited to anything."' }] },
          { q: '"Do you think I\'m a good lighthouse?"', a: [{ t: 'The best one I know', score: 1 }, { t: 'You\'re the only one I know', score: 1, r: '"Ha! Then I\'m the best by default. I\'ll take it."' }, { t: 'You could be brighter', score: 0, r: '"…Noted," says Wick, very small.' }] },
          { q: '"When your training year is over… will you still write?"', a: [{ t: 'Always', score: 1, r: 'Wick doesn\'t say anything. It just burns, warm and steady, like a promise.' }, { t: 'We\'ll see', score: 0 }, { t: 'I\'m not going anywhere', score: 1 }] },
        ],
      ][Math.max(0, si - 1)];
      return {
        intro: [
          null,
          ['A little flame flickers in the lighthouse window. It has a face. It waves.', '"Oh! A visitor! Nobody visits. Ships just look at me and leave." It brightens hopefully. "Can we… talk?"'],
          ['Wick is waiting in the window. It has clearly been waiting all day.', '"You came back! I have SO many questions."'],
          ['Wick is burning low against the cold, but it lights up the moment it sees you.', '"Snow! I\'ve never seen snow up close. It hisses when it lands on me. Rude, but beautiful."'],
        ][si],
        options: [
          { id: 'talk', label: 'Talk with Wick', icon: 'letter', game: 'riddle', params: { questions: qs, shuffle: false, answerShuffle: true } },
          { id: 'lantern', label: 'Share your Moon Lantern\'s light', charm: 'night', instant: 3 },
        ],
        lines: {
          talk: ['Wick flickers. "That\'s okay. Talking is hard. Thanks for trying."', '"Thank you for visiting," says Wick. "Really."', 'Wick glows warm and gold. "I\'ll write to you. Check your mailbox!"', 'Wick is so happy it shines out across the whole bay. Fishing boats toot their horns. "I\'ll write to you. EVERY DAY."'],
          lantern: [null, null, null, 'You hold your lantern up to the window. Two lights, side by side. Wick is quiet for a long time. "Oh," it says. "So that\'s what it\'s like."'],
        },
        kind: 'You just sit with Wick for a while, watching the sea go dark together. It doesn\'t need words.',
        rewards: (g) => [[I('shell')], [I('shell'), I('seaglass')], [I('seaglass', 2), { coins: 10 }], [I('pearl'), { coins: 12 }]][g],
        after: (g, opt, x) => { if (g >= 2) x.game.queueLetter?.('wick', si); },
      };
    },
  },

  // ---------------------------------------------------------------- the Stump Spirit (autumn)
  {
    id: 'stump', name: 'The Stump Spirit', role: 'Knows one note', voice: 4, at: { x: 25.5, z: 22.5 }, scene: 'woods', from: 2, skill: 'listen',
    where: 'a clearing in the Whispering Woods', petBest: ['frog', 'owl'],
    sprite: () => stumpCanvas(0),
    stage: () => [{ id: 'main', c: (t) => stumpCanvas(Math.floor(t * 1.5) % 2), x: 96, y: 92, bob: 0, scale: 2 }],
    variant(si, x) {
      const night = x.night;
      const two = si === 3;
      const melody = two ? [0, 7, 0, 7, 12, 7, 0, 7] : [0, 0, 0, 0, 0, 0, 0, 0];
      const performers = [{ c0: stumpCanvas(0), c1: stumpCanvas(1), x: 140, y: 76, sing: 1, scale: 2 }];
      return {
        intro: two
          ? ['The Stump Spirit is practically vibrating.', '"I LEARNED A SECOND NOTE." It demonstrates. Both notes. Over and over.', '"Will you sing with me? Two notes now. TWO."']
          : ['An old tree stump in the clearing is humming. One note. Just the one.', '"Hmmmmmmmm." It stops. "…You can HEAR me? Nobody can hear me. Your Spirit Ears must be very good."', '"I only know one note. Will you sing around it? Please?"'],
        options: [
          { id: 'sing', label: two ? 'Sing both notes with it' : 'Harmonise with the stump', icon: 'icon:sparkle', game: 'rhythm', params: { scene: 'woods', lanes: two ? 2 : 1, beats: two ? 18 : 14, bpm: two ? 92 : 84, melody, root: 220, voice: 'sine', performers } },
          { id: 'lantern', label: 'Light the Moon Lantern for it', charm: 'night', instant: 3 },
        ],
        lines: {
          sing: ['"Hm," says the stump. "Hmmm." It seems happy anyway.', 'The stump hums along, very pleased. A little mushroom sprouts beside it.', 'Your voices fill the clearing. Mushrooms pop up all around you, glowing.', night ? 'The clearing fills with light. Moonberries ripen on the stump in seconds, glowing blue. "Take them. Take them all. That was the best song I ever sang."' : 'Every hushling in the woods comes out to listen. "That," says the stump, "was the best song I ever sang."'],
          lantern: [null, null, null, 'By lantern light, the stump\'s old rings glow like a map of every song it ever knew. Moonberries ripen all around it. "Oh. I remember now," it whispers.'],
        },
        kind: 'You hum the one note with it. Just the one. The stump is so happy it sprouts a leaf.',
        rewards: (g, rec) => [[I('moss')], [I('moss', 2), I('mushroom')], [I('mushroom', 2), I('acorn', 2), ...(night ? [I('moonberry')] : [])], [I('moonberry', night ? 3 : 1), once(rec, 'lantern') ? { charm: 'lantern', key: 'lantern' } : I('glassbead')]][g],
      };
    },
  },

  // ---------------------------------------------------------------- Corvid Court (autumn)
  {
    id: 'crow', name: 'Corvid Court', role: 'Order! Order!', voice: 1, at: { x: 31.5, z: 30.6 }, scene: 'woods', from: 2,
    where: 'the edge of the Whispering Woods', petBest: ['owl', 'cat'],
    sprite: () => crowCanvas(false),
    stage: (si, s) => [{ id: 'main', c: crowCanvas(false), x: 96, y: 90, bob: 1, scale: 2 }, { id: 'judge', c: crowCanvas(false), x: 152, y: 62, flip: true, scale: 2 }, { id: 'sus', c: s.flags.magpieCaught ? crowCanvas(true) : crowCanvas(false), x: 40, y: 78, scale: 2 }],
    variant(si, x) {
      if (si === 2) return {
        intro: ['A circle of crows has convened a court on a fallen log. A small crow stands in the middle, looking miserable.', '"ORDER. The accused, Cornelius Crow, is charged with stealing every shiny thing in Maravik."', 'Cornelius: "I didn\'t! I LIKE shiny things, sure. But I\'d never TAKE them!" The judge points at you. "You, witch. You\'ve been everywhere. Find the truth."'],
        options: [
          { id: 'evidence', label: 'Examine the evidence', icon: 'charm_monocle', game: 'riddle', params: { shuffle: false, questions: [
            { q: 'Exhibit A: a stolen silver spoon. What do you notice?', a: [{ t: 'A black-and-WHITE feather stuck to it', score: 1, r: 'The court gasps. Crows are black all over. Every crow looks at their own feathers.' }, { t: 'It\'s a really nice spoon', score: 0, r: '"It IS a nice spoon," the judge admits. "Irrelevant, though."' }, { t: 'Crows love spoons', score: 0, r: 'Cornelius: "That\'s… not helping me!"' }] },
            { q: 'Exhibit B: muddy footprints from the scene. They\'re…', a: [{ t: 'Longer than a crow\'s', score: 1, r: '"Long-toed," murmurs the judge. "Interesting."' }, { t: 'Definitely crow-shaped', score: 0 }, { t: 'Very muddy', score: 0, r: '"Thank you, witch. Very helpful."' }] },
            { q: 'Now look around the court. Who looks suspicious?', a: [{ t: 'The "crow" with a white belly in the back row', score: 1, r: 'The crow in the back row freezes. Its costume slips. It\'s a MAGPIE. "I would have gotten away with it, too!"' }, { t: 'The judge', score: 0, r: '"How DARE you." (Fair question, though.)' }, { t: 'Cornelius, honestly', score: 0, r: 'Cornelius bursts into tears.' }] },
          ] } },
          { id: 'bun', label: 'Bribe the judge (honey bun)', charm: 'treat', instant: 1 },
        ],
        lines: {
          evidence: ['The court can\'t decide. Cornelius is sent home "on probation". He looks at you sadly.', 'The court lets Cornelius off with a warning. The real thief is still out there…', 'Cornelius is freed! The real thief flaps off into the trees. Cornelius gives you his favourite shiny thing.', 'A magpie in a crow costume is dragged off to Bird Jail (a nice hedge). Cornelius is free! He gives you his whole treasure collection.'],
          bun: [null, '"Justice is NOT for sale." The judge eats the bun anyway. Cornelius is let off with a warning, which feels somehow worse.', null, null],
        },
        kind: 'You vouch for Cornelius. The court lets him go home, but he\'s not quite cleared.',
        rewards: (g, rec) => [[I('feather')], [I('feather', 2)], [I('glassbead'), { coins: 8 }], [I('oldcoin'), I('seaglass'), once(rec, 'monocle') ? { charm: 'monocle', key: 'monocle' } : I('glassbead')]][g],
        after: (g, opt, x) => { if (g === 3) x.s.flags.magpieCaught = true; },
      };
      return {
        intro: ['The court is back in session. The magpie is appealing.', '"I was FRAMED," says the magpie. "By myself. In a costume. Which, admittedly, was mine."', 'The judge sighs. "Witch. Once more, please."'],
        options: [
          { id: 'evidence', label: 'Hear the appeal', icon: 'charm_monocle', game: 'riddle', params: { shuffle: false, questions: [
            { q: '"I was at home all night!" says the magpie. "Ask anyone!" Who saw her?', a: [{ t: 'Rocco, at the docks, playing cups', score: 1, r: 'Rocco, from the back: "She owes me THIRTEEN coins."' }, { t: 'Nobody', score: 0 }, { t: 'The moose', score: 0, r: 'The moose, somehow present, shakes its head.' }] },
            { q: '"And how would I even carry a SPOON?"', a: [{ t: 'In your beak. Like you\'re doing right now.', score: 1, r: 'The magpie slowly spits out a spoon.' }, { t: 'You couldn\'t', score: 0 }, { t: 'In a bag', score: 0 }] },
            { q: 'What should happen to the magpie?', a: [{ t: 'Give everything back, then join us for the festival', score: 1, r: 'The magpie blinks. Nobody has ever invited her anywhere. "…Can I bring shiny things?"' }, { t: 'Bird Jail forever', score: 0, r: 'The hedge rustles ominously.' }, { t: 'Let her keep the spoon', score: 1, r: '"Mercy," declares the judge. "She keeps ONE spoon."' }] },
          ] } },
          { id: 'bun', label: 'Bribe everyone (honey bun)', charm: 'treat', instant: 2 },
        ],
        lines: {
          evidence: ['The appeal drags on and on. Everyone goes home.', 'The appeal is denied, but kindly.', 'Case closed. The magpie returns every stolen thing, grumbling.', 'Case closed. The magpie returns everything and, in the end, apologises to Cornelius. They\'re best friends by sundown.'],
          bun: [null, null, 'The whole court shares the bun and agrees to "just move on, honestly".', null],
        },
        kind: 'You suggest everyone forgive each other. Surprisingly, they do.',
        rewards: (g) => [[I('feather')], [I('glassbead')], [I('oldcoin'), { coins: 10 }], [I('oldcoin', 2), I('pearl')]][g],
        after: (g, opt, x) => { if (g >= 2) x.s.flags.magpieFriend = true; },
      };
    },
  },

  // ---------------------------------------------------------------- the frozen pond (winter)
  {
    id: 'icefish', name: 'Three Fish', role: 'Very annoyed', voice: 0, at: { x: 46.5, z: 9.5 }, scene: 'ridge', from: 3, skill: 'warmth',
    where: 'the frozen pond on the North Ridge', petBest: ['turtle', 'frog'],
    sprite: () => itemCanvas('fish'),
    stage: () => [0, 1, 2].map((i) => ({ id: 'f' + i, c: itemCanvas('fish'), x: 60 + i * 36, y: 92, bob: 2, bobSpeed: 7, ph: i, scale: 2 })),
    variant(si, x) {
      return {
        intro: ['Up on the ridge, the little pond has frozen over. Three fish are stuck on top of the ice, flopping indignantly.', 'Their holes in the ice are right there. They just… cannot steer. At all.'],
        options: [
          { id: 'slide', label: 'Slide them home', icon: 'fish', game: 'slide', params: {} },
          { id: 'glow', label: 'Melt a hole under each fish (Warm Glow)', skill: 'warmth', instant: 2 },
        ],
        lines: {
          slide: ['You get one in, and the others sort of bounce off the edge. You melt them holes in the end.', 'The fish slide home one by one, grumbling.', 'Plop, plop, plop. The fish blow you bubbles of gratitude through the ice.', 'A perfect run. The fish do a little synchronised swim to celebrate. One of them spits out a frozen flower for you.'],
          glow: [null, null, 'Your Warm Glow melts a neat circle under each fish. Plop, plop, plop. Not as fun, but very effective.', null],
        },
        kind: 'You warm the ice with your hands until the fish can wriggle home. Your mittens will never be the same.',
        rewards: (g) => [[I('fish')], [I('fish', 2)], [I('fish', 2), I('frostbloom')], [I('frostbloom', 2), { coins: 20 }]][g],
      };
    },
  },

  // ---------------------------------------------------------------- AIR: a gull in a squall (summer+)
  {
    id: 'squall', name: 'A Little Gull', role: 'Caught in a squall', voice: 4, air: true, scene: 'storm', from: 1, skill: 'whistle',
    where: 'the sky over the sea',
    sprite: () => gullCanvas(0),
    stage: () => [{ id: 'main', c: (t) => gullCanvas(Math.floor(t * 6) % 2), x: 130, y: 56, bob: 3, bobSpeed: 5, scale: 2 }],
    variant(si, x) {
      const pets = x.party.map((g) => g.name);
      return {
        intro: ['A sudden squall! Hail rattles off your broom. A little gull is tumbling through it, squawking for help.', pets.length ? `${pets.join(' and ')} ${pets.length > 1 ? 'huddle' : 'huddles'} in the bottom of your basket.` : 'Your Wind Whistle hums in your pocket. You could fly in after it…'],
        options: [
          { id: 'fly', label: 'Fly in after the gull', icon: 'gear_bristles', game: 'dodge', params: { duration: [0, 14, 16, 18][si], rate: [0, 2.8, 3.4, 4][si], passengers: pets } },
        ],
        lines: {
          fly: ['You get battered about and never quite reach the gull. In the end, the squall blows over and it flaps off, looking a bit embarrassed for you.', 'You catch the gull, eventually, after more hail than anyone should experience.', 'You weave through the hail and scoop up the gull. It nuzzles into your basket.', 'You dart through the squall like it\'s nothing. The gull rides on your hat all the way to calm skies, and leaves you a gift.'],
        },
        kind: 'You wait out the squall in a cloud, then guide the gull home along the calm side of the storm.',
        rewards: (g, rec) => [[I('feather')], [I('feather', 2)], [I('feather', 2), I('cloudfluff')], [I('cloudfluff', 2), once(rec, 'tailwind') ? { charm: 'feather', key: 'tailwind' } : I('shell')]][g],
      };
    },
  },

  // ---------------------------------------------------------------- AIR: the cloud whale (once a season)
  {
    id: 'whale', name: 'The Cloud Whale', role: 'Once a season', voice: 4, air: true, scene: 'sky', from: 1, skill: 'whistle', perSeason: true,
    where: 'high above the island',
    sprite: () => whaleCanvas(0),
    stage: () => [{ id: 'main', c: (t) => whaleCanvas(Math.floor(t * 1.5) % 2), x: 100, y: 80, bob: 2, bobSpeed: 0.8, scale: 2 }],
    variant(si, x) {
      return {
        intro: ['The clouds part. Something enormous and gentle is swimming through the sky.', 'A whale, made of cloud. It sings, and you feel the song through your broom.'],
        options: [
          { id: 'photo', label: 'Take its photograph', icon: 'icon:sparkle', game: 'timing', params: { kind: 'whale', animal: (t) => whaleCanvas(Math.floor(t * 1.5) % 2), speed: 0.55, zone: 0.16 } },
          { id: 'watch', label: 'Just watch', icon: 'icon:heart', instant: 2 },
        ],
        lines: {
          photo: ['Every photo is a blur of white. It doesn\'t matter. You were there.', 'One photo comes out. Just the tail. You\'ll treasure it anyway.', 'Two good photos! The whale seems to pose for the second one.', 'Three perfect photos. In the last one, the whale is looking right at you. It sings once more, and a little of the song stays behind, in a jar.'],
          watch: [null, null, 'Some things are better watched than photographed. The whale circles you once, slowly, and a little of its song stays behind.', null],
        },
        kind: 'You watch the whale until it\'s just a cloud again.',
        rewards: (g) => [[I('cloudfluff')], [I('cloudfluff')], [I('cloudfluff'), I('whalesong')], [I('whalesong'), I('cloudfluff', 2), { rep: 2 }]][g],
        after: (g, opt, x) => { x.s.stats.whales = (x.s.stats.whales || 0) + 1; },
      };
    },
  },
];
export const ENC = Object.fromEntries(ENCOUNTERS.map((e) => [e.id, e]));

// ================================================================== availability
export function encRecord(s, id) {
  s.enc ||= {};
  return (s.enc[id] ||= { times: 0, best: 0, friend: 0, seasons: {}, got: {}, last: 0 });
}
export function encAvailable(s, def) {
  if (!seasonReached(s, def.from)) return false;
  if (def.skill && !hasSkill(s, def.skill)) return false;
  const rec = encRecord(s, def.id);
  if (rec.last === s.day) return false;
  if (def.perSeason) { const k = Math.floor((s.day - 1) / 7); if (rec.lastSeasonKey === k) return false; }
  return true;
}
export function friendsMade(s) { return ENCOUNTERS.filter((e) => (s.enc?.[e.id]?.friend || 0) > 0); }

// ================================================================== running one
export async function runEncounter(game, def) {
  const s = game.state;
  // in later years the seasons cycle again; encounters never fall back before their first season
  const si = Math.max(seasonIndex(s.day), def.from);
  const rec = encRecord(s, def.id);
  const hour = game.hour;
  const night = hour >= 20 || hour < 5;
  const party = s.guests.filter((g) => g.status === 'party' && !g.goingHome);
  const trusted = party.filter((g) => g.trusted);
  const x = { s, game, rec, si, night, party, first: !rec.times };
  const v = def.variant(si, x);
  const ui = game.encounterUI;
  ui.show({ scene: def.scene, season: si, hour, rain: s.weather.rain > 0 });
  ui.setActors(def.stage(si, s));
  ui.setWho({ name: def.name, role: def.role, voice: def.voice });
  ui.setBanner(`<b>${def.name}</b><small>${def.where}</small>`, 2400);
  game.audio.sfx('spirit');
  for (const line of v.intro) await ui.say(line);

  // ---------------------------------------------------- build the ACT menu
  const opts = [];
  const tagsHave = new Set(slotted(s).filter(Boolean).map((id) => CHARMS[id].tag));
  for (const o of v.options) {
    if (o.charm && !tagsHave.has(o.charm)) continue;
    if (o.skill && !hasSkill(s, o.skill)) continue;
    const charmId = o.charm ? slotted(s).find((id) => id && CHARMS[id].tag === o.charm) : null;
    opts.push({ ...o, label: o.label, sub: charmId ? `uses your ${CHARMS[charmId].name}` : o.game ? gameBlurb(o.game) : '', icon: charmId ? CHARMS[charmId].icon : o.icon, cls: charmId ? 'charm' : '' });
    // helper charms make a game gentler
    if (o.game && !o.charm) {
      for (const tag of GAME_HELPERS[o.game] || []) {
        if (!tagsHave.has(tag)) continue;
        const id = slotted(s).find((c) => c && CHARMS[c].tag === tag);
        opts.push({ ...o, id: o.id, helper: tag, label: `${o.label}, with ${CHARMS[id].name}`, sub: CHARMS[id].desc, icon: CHARMS[id].icon, cls: 'charm', params: { ...o.params, [tag]: true } });
      }
    }
  }
  for (const pet of trusted) {
    if (def.air) break;
    const best = (def.petBest || []).includes(pet.species);
    opts.push({ id: 'pet', pet, label: `Let ${pet.name} help`, sub: `${pet.name} the ${SPECIES[pet.species].name.toLowerCase()} ${best ? 'is perfect for this!' : 'wants to try'} · a little risky`, icon: 'pet:' + pet.species, cls: 'pet' });
  }
  if (tagsHave.has('wish')) opts.push({ id: 'wish', label: 'Make a wish', sub: 'uses your Wishing Star: a perfect result', icon: 'starshard', cls: 'charm', instant: 3, charm: 'wish' });
  opts.push({ id: 'kind', label: 'Kind Words', sub: 'always works, never shines', icon: 'icon:heart', instant: 1 });
  opts.push({ id: 'leave', label: 'Leave for now', sub: '', icon: 'icon:pin' });

  const k = await ui.choose(opts.map((o) => ({ label: o.label, sub: o.sub, icon: o.icon, cls: o.cls })), 'What will you do?');
  const opt = opts[k];
  if (opt.id === 'leave') { ui.hide(); return null; }

  // ---------------------------------------------------- play it out
  let grade = 0, extra = {};
  let lineKey = opt.id;
  if (opt.charm) { const used = spendTag(s, opt.charm); game.ui.toast(`Used ${CHARMS[used].name}`, CHARMS[used].icon); game.completeGoal('charm1'); }
  if (opt.helper) { const used = spendTag(s, opt.helper); game.ui.toast(`Used ${CHARMS[used].name}`, CHARMS[used].icon); game.completeGoal('charm1'); }
  if (opt.id === 'pet') {
    const p = opt.pet;
    const best = (def.petBest || []).includes(p.species);
    const chance = clamp(0.5 + (p.trust || 1) * 0.1 + (best ? 0.25 : 0), 0, 0.92);
    ui.setActors([...ui.actors, { id: 'pet', c: petCanvas(p.species), x: 40, y: 98, bob: 1 }]);
    await ui.say(`${p.name} ${PET_HELP[p.species] || 'tries to help'}…`);
    if (Math.random() < chance) {
      grade = 3;
      p.joy = clamp(p.joy + 20, 0, 100);
      p.adventures = (p.adventures || 0) + 1;
      ui.actor('pet').hopT = 0.4;
      game.audio.petVoice(p.species);
      await ui.say(`It works! ${p.name} is the hero of the day.`);
      game.completeGoal('outing');
    } else {
      grade = 1;
      p.joy = clamp(p.joy - 18, 0, 100);
      p.spooked = (p.spooked || 0) + 1;
      ui.actor('pet').shakeT = 0.5;
      game.audio.sfx('bad');
      await ui.say(`Oh no. ${p.name} gets a fright and hides in your satchel. They'll need extra cuddles tonight.`);
    }
    lineKey = v.lines[def.id] ? def.id : v.options[0].id;
  } else if (opt.id === 'kind') {
    grade = 1;
  } else if (opt.id === 'wish') {
    grade = 3; lineKey = v.options[0].id;
    await ui.say('You hold the Wishing Star up and make a wish. It bursts into a thousand sparks…');
  } else if (opt.instant != null) {
    grade = opt.instant;
  } else if (opt.game) {
    const g = MINIGAMES[opt.game];
    const keys = KEYS[opt.game === 'rhythm' ? (opt.params.lanes === 2 ? 'rhythm2' : 'rhythm1') : opt.game];
    const res = await ui.play(g, { ...opt.params, who: { name: def.name, role: def.role, voice: def.voice }, keys: keys ? keys(game.isTouch) : '', howto: howTo(opt.game, opt.params) });
    if (typeof res === 'object') { grade = res.grade; extra = res; } else grade = res;
    ui.setActors(def.stage(si, s));
  }
  // passengers get rattled by a rough flight
  if (extra.hits && party.length) for (const p of party) { p.joy = clamp(p.joy - extra.hits * 8, 0, 100); }

  // ---------------------------------------------------- lucky clover
  if (grade < 3 && hasSlottedTag(s, 'luck')) {
    const c = await ui.choose([{ label: 'Use your Lucky Clover', sub: `turn ${grade}★ into ${grade + 1}★`, icon: 'clover', cls: 'charm' }, { label: 'Keep it for later', icon: 'icon:pin' }], `${starsHTML(grade)} Not bad! Your Lucky Clover is twitching…`.replace(/<[^>]+>/g, ''));
    if (c === 0) { spendTag(s, 'luck'); grade++; game.audio.sfx('sparkle'); ui.fx.burst(96, 50, { n: 24, colors: ['#6ac25a', '#b8ec72', '#ffe48a'] }); }
  }

  // ---------------------------------------------------- outcome
  const lines = v.lines[lineKey] || v.lines[v.options[0].id];
  let text = opt.id === 'kind' ? v.kind : (lines && (lines[grade] || lines.find((l, i) => l && i <= grade) || lines.filter(Boolean)[0])) || '';
  const main = ui.actor('main');
  if (main && grade >= 2) main.hopT = 0.4;
  if (grade >= 2) ui.fx.burst(96, 46, { n: 22, colors: ['#ffe48a', '#fffdf6', '#ff9ac0', '#9ce4ff'] });
  game.audio.sfx(grade >= 2 ? 'happy' : 'good');
  if (text) await ui.say(text);
  const rewards = (v.rewards ? v.rewards(grade, rec) : []).filter(Boolean);
  const got = applyRewards(game, rewards, rec);
  // records & friendship
  rec.times++;
  rec.last = s.day;
  if (def.perSeason) rec.lastSeasonKey = Math.floor((s.day - 1) / 7);
  const prevBest = rec.seasons[si] || 0;
  rec.seasons[si] = Math.max(prevBest, grade);
  rec.best = Math.max(rec.best, grade);
  let friendUp = false;
  if (grade >= 2 && !rec['f' + si]) { rec['f' + si] = true; rec.friend = (rec.friend || 0) + 1; friendUp = true; }
  s.stats.encounters = (s.stats.encounters || 0) + 1;
  if (grade === 3) { s.stats.perfects = (s.stats.perfects || 0) + 1; game.completeGoal('perfect'); }
  v.after?.(grade, opt.id === 'pet' || opt.id === 'wish' ? v.options[0].id : opt.id, x);
  const friends = friendsMade(s).length;
  if (friends >= 5) game.completeGoal('friends5');
  if (friends >= 10) game.completeGoal('friends10');
  await ui.say(`${starsLine(grade)}  ${got.length ? 'You got: ' + got.join(', ') + '.' : ''}${friendUp ? `  ${def.name} ${rec.friend > 1 ? 'likes you even more' : 'counts you as a friend now'}! ♥` : ''}`, { name: 'Result', role: ['', 'Okay', 'Great', 'Perfect!'][grade] || 'Gentle' });
  ui.hide();
  game.markDirty();
  return { grade };
}

function starsLine(g) { return '★'.repeat(g) + '☆'.repeat(3 - g); }

export function applyRewards(game, rewards, rec) {
  const s = game.state;
  const got = [];
  for (const r of rewards) {
    if (r.charm) { addCharm(s, r.charm); got.push(`${CHARMS[r.charm].name} charm`); game.ui.toast(`New charm: ${CHARMS[r.charm].name}! ${CHARMS[r.charm].desc}`, CHARMS[r.charm].icon, { gold: true, life: 5 }); }
    else if (r.item) { game.giveItem(r.item, r.n || 1, { quiet: true }); got.push(`${r.n > 1 ? r.n + ' ' : ''}${ITEMS[r.item].name}`); if (!s.discovered[r.item]) s.discovered[r.item] = false; }
    else if (r.coins) { game.addCoins(r.coins); got.push(`${r.coins} coins`); }
    else if (r.rep) { game.addRep(r.rep); got.push(`${r.rep} reputation`); }
    if (r.key) { rec.got ||= {}; rec.got[r.key] = true; }
  }
  return got;
}

function gameBlurb(game) {
  return { rhythm: 'a rhythm game', timing: 'a timing game', shell: 'a game of cups', sneak: 'a sneaking game', dodge: 'a flying game', slide: 'an ice puzzle', riddle: 'a talking game' }[game] || '';
}
function howTo(game, p) {
  return {
    rhythm: p.lanes === 2 ? 'Notes glide along two lanes. Hit each one as it reaches the ring!' : 'Hit each note as it reaches the ring!',
    timing: 'Wait for the marker to swing into the green, then go!',
    shell: 'Follow the pebble… and keep an eye on those paws.',
    sneak: 'Creep toward the hive. Freeze whenever an eye opens!',
    dodge: 'Dodge the hail and reach the creature in trouble!',
    slide: 'Fish slide until they hit something. Get every fish into a hole.',
  }[game] || '';
}
