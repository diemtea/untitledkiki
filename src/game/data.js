// Game content: items, recipes, crafts, guests, townsfolk, upgrades and goals.

// cat: food | material | curio | treat | toy | decor | bundle | parcel | special
// bin (where sorting sends it): pantry | workshop | curios
export const ITEMS = {
  // --- pantry: raw foods
  berries: { name: 'Wild Berries', cat: 'food', value: 3, desc: 'Plump and purple, from the Whispering Woods.' },
  mushroom: { name: 'Button Mushroom', cat: 'food', value: 3, desc: 'Grows in the shady forest floor.' },
  carrot: { name: 'Carrot', cat: 'food', value: 3, desc: 'Crunchy. Bunnies go wild for these.' },
  fish: { name: 'Sardine', cat: 'food', value: 5, desc: 'Fresh from Marlo’s morning catch.' },
  egg: { name: 'Speckled Egg', cat: 'food', value: 4, desc: 'Laid by Greta’s hens.' },
  milk: { name: 'Bottle of Milk', cat: 'food', value: 4, desc: 'Creamy farm milk.' },
  honey: { name: 'Meadow Honey', cat: 'food', value: 8, desc: 'Golden and sticky. Bees were thanked.' },
  seeds: { name: 'Sunflower Seeds', cat: 'food', value: 3, desc: 'A birdie favourite.' },
  clover: { name: 'Clover', cat: 'food', value: 2, desc: 'Sweet meadow clover. Maybe a lucky one?' },
  mint: { name: 'Wild Mint', cat: 'food', value: 2, desc: 'Fresh and cooling.' },
  catnip: { name: 'Catnip', cat: 'food', value: 4, desc: 'Grows in the hotel garden. Cats adore it.' },
  acorn: { name: 'Acorn', cat: 'food', value: 2, desc: 'A tiny hat on a tiny nut.' },
  moss: { name: 'Soft Moss', cat: 'food', value: 2, desc: 'Damp and springy. Frogs think it’s delicious.' },
  apple: { name: 'Red Apple', cat: 'food', value: 3, desc: 'From the orchard by the farm.' },
  bread: { name: 'Crusty Loaf', cat: 'food', value: 5, desc: 'Still warm from Honeycutt’s oven.' },
  // --- workshop: materials
  wool: { name: 'Wool Tuft', cat: 'material', value: 4, desc: 'Brushed from a friendly meadow sheep.' },
  feather: { name: 'Feather', cat: 'material', value: 2, desc: 'Drifted down on the breeze.' },
  driftwood: { name: 'Driftwood', cat: 'material', value: 3, desc: 'Smoothed by the sea.' },
  pebble: { name: 'Smooth Pebble', cat: 'material', value: 1, desc: 'Nice and round.' },
  seaglass: { name: 'Sea Glass', cat: 'material', value: 6, desc: 'A frosted green gem from the tide.' },
  pinecone: { name: 'Pinecone', cat: 'material', value: 1, desc: 'Fallen from the tall pines.' },
  twine: { name: 'Twine', cat: 'material', value: 4, desc: 'Useful for tying things together.' },
  cloth: { name: 'Cloth Scrap', cat: 'material', value: 5, desc: 'A pretty patterned remnant.' },
  flower: { name: 'Wildflowers', cat: 'material', value: 2, desc: 'A little meadow bouquet.' },
  // --- curios
  shell: { name: 'Spiral Shell', cat: 'curio', value: 6, desc: 'You can hear the sea inside.' },
  starshard: { name: 'Star Shard', cat: 'curio', value: 40, desc: 'A sliver of a falling star. Warm to the touch.' },
  oldcoin: { name: 'Old Coin', cat: 'curio', value: 20, desc: 'Stamped with a king nobody remembers.' },
  bottle: { name: 'Message in a Bottle', cat: 'curio', value: 15, desc: 'There’s a rolled-up note inside.' },
  glassbead: { name: 'Glass Bead', cat: 'curio', value: 12, desc: 'Violet swirls, like a tiny galaxy.' },
  pearl: { name: 'Pearl', cat: 'curio', value: 30, desc: 'Found in a tide pool by the lighthouse.' },
  brasskey: { name: 'Brass Key', cat: 'curio', value: 5, desc: 'Old and green. What does it open?' },
  // --- bundles (opened at the sorting table)
  bundle_mossy: { name: 'Mossy Pouch', cat: 'bundle', value: 0, desc: 'Something rattles inside. Open it at the sorting table.' },
  bundle_barnacle: { name: 'Barnacled Box', cat: 'bundle', value: 0, desc: 'Washed up on the beach. Open it at the sorting table.' },
  bundle_nest: { name: 'Tangled Nest', cat: 'bundle', value: 0, desc: 'Fell from high up. Open it at the sorting table.' },
  bundle_crate: { name: 'Lost Crate', cat: 'bundle', value: 0, desc: 'Fell off a boat. Open it at the sorting table.' },
  // --- treats (brewed)
  treat_fish: { name: 'Fish Crackers', cat: 'treat', value: 14, desc: 'Crunchy, fishy, irresistible to cats and owls.' },
  treat_stew: { name: 'Hearty Stew', cat: 'treat', value: 18, desc: 'A warming bowl for dogs and ferrets.' },
  treat_salad: { name: 'Garden Salad', cat: 'treat', value: 12, desc: 'Crisp and green. Bunnies and turtles cheer.' },
  treat_crumble: { name: 'Berry Crumble', cat: 'treat', value: 16, desc: 'Hedgehogs and parrots swoon.' },
  treat_seedcake: { name: 'Seed Cake', cat: 'treat', value: 14, desc: 'Birds of all feathers love it.' },
  treat_moss: { name: 'Moss Pudding', cat: 'treat', value: 12, desc: 'Wobbly. Frogs and turtles think it’s fine dining.' },
  treat_catnip: { name: 'Catnip Tart', cat: 'treat', value: 20, desc: 'Makes any cat purr like an engine.' },
  treat_apple: { name: 'Apple Chips', cat: 'treat', value: 10, desc: 'Sweet, crunchy, loved by nibblers.' },
  // --- toys (crafted; given to a guest, who keeps it for their stay)
  toy_yarn: { name: 'Yarn Ball', cat: 'toy', value: 12, desc: 'For batting, chasing and tangling.' },
  toy_stick: { name: 'Fetch Stick', cat: 'toy', value: 8, desc: 'The best stick. Dogs agree.' },
  toy_feather: { name: 'Feather Wand', cat: 'toy', value: 12, desc: 'Swish, swish! Cats and birds go wild.' },
  toy_pinecone: { name: 'Pinecone Puzzle', cat: 'toy', value: 10, desc: 'Treats hidden in the scales.' },
  toy_chime: { name: 'Shell Chime', cat: 'toy', value: 14, desc: 'Tinkles softly in the breeze.' },
  // --- decor (crafted; placed in a guest room permanently)
  decor_cushion: { name: 'Cozy Cushion', cat: 'decor', value: 20, desc: 'A plump red cushion for napping.' },
  decor_pond: { name: 'Pebble Pond', cat: 'decor', value: 20, desc: 'A little pool for splashy guests.' },
  decor_perch: { name: 'Driftwood Perch', cat: 'decor', value: 18, desc: 'A lookout for birds.' },
  decor_lamp: { name: 'Star Lamp', cat: 'decor', value: 40, desc: 'Glows softly all night with starlight.' },
  decor_plant: { name: 'Potted Fern', cat: 'decor', value: 16, desc: 'Brings the woods indoors.' },
  decor_rug: { name: 'Woven Rug', cat: 'decor', value: 20, desc: 'Warm under paws.' },
  // --- special
  parcel: { name: 'Parcel', cat: 'parcel', value: 0, desc: 'Someone is waiting for this!' },
  balloon: { name: 'Red Balloon', cat: 'special', value: 0, desc: 'Lotta’s lost balloon.' },
};
for (const [id, it] of Object.entries(ITEMS)) {
  it.id = id;
  it.bin = it.cat === 'food' || it.cat === 'treat' ? 'pantry' : it.cat === 'material' || it.cat === 'toy' || it.cat === 'decor' ? 'workshop' : it.cat === 'curio' ? 'curios' : null;
}

export const BINS = {
  pantry: { name: 'Pantry', desc: 'Foods & treats', icon: 'carrot' },
  workshop: { name: 'Workshop', desc: 'Materials, toys & decor', icon: 'driftwood' },
  curios: { name: 'Curio Cabinet', desc: 'Shiny things & treasures', icon: 'shell' },
};

export const BUNDLE_LOOT = {
  bundle_mossy: [['berries', 3], ['mushroom', 3], ['moss', 2], ['acorn', 2], ['glassbead', 1], ['oldcoin', 0.6], ['cloth', 1]],
  bundle_barnacle: [['shell', 3], ['seaglass', 2], ['pearl', 0.6], ['bottle', 1], ['oldcoin', 1], ['driftwood', 2], ['twine', 1]],
  bundle_nest: [['feather', 3], ['seeds', 2], ['glassbead', 1], ['twine', 1], ['egg', 1], ['starshard', 0.3]],
  bundle_crate: [['twine', 2], ['cloth', 2], ['fish', 2], ['apple', 2], ['oldcoin', 0.8], ['bottle', 0.6], ['milk', 1]],
};

// Brewing at the cauldron
export const RECIPES = [
  { id: 'treat_fish', needs: { fish: 1, mint: 1 }, teacher: null },
  { id: 'treat_salad', needs: { carrot: 1, clover: 1, mint: 1 }, teacher: null },
  { id: 'treat_stew', needs: { fish: 1, carrot: 1, mushroom: 1 }, teacher: 'greta' },
  { id: 'treat_crumble', needs: { berries: 2, acorn: 1, honey: 1 }, teacher: 'honeycutt' },
  { id: 'treat_seedcake', needs: { seeds: 2, honey: 1, egg: 1 }, teacher: 'honeycutt' },
  { id: 'treat_moss', needs: { moss: 2, mushroom: 1 }, teacher: 'ivy' },
  { id: 'treat_catnip', needs: { catnip: 1, milk: 1, egg: 1 }, teacher: 'odette' },
  { id: 'treat_apple', needs: { apple: 2 }, teacher: 'greta' },
];

// Crafting at the workbench
export const CRAFTS = [
  { id: 'toy_yarn', needs: { wool: 2 } },
  { id: 'toy_stick', needs: { driftwood: 1 } },
  { id: 'toy_feather', needs: { feather: 2, twine: 1 } },
  { id: 'toy_pinecone', needs: { pinecone: 2, twine: 1 } },
  { id: 'toy_chime', needs: { shell: 1, seaglass: 1, twine: 1 } },
  { id: 'decor_cushion', needs: { wool: 2, cloth: 1 } },
  { id: 'decor_pond', needs: { pebble: 3, seaglass: 1 } },
  { id: 'decor_perch', needs: { driftwood: 2, twine: 1 } },
  { id: 'decor_plant', needs: { moss: 1, pebble: 1, flower: 1 } },
  { id: 'decor_rug', needs: { wool: 2, flower: 2 } },
  { id: 'decor_lamp', needs: { starshard: 1, seaglass: 1 } },
];

// Gear upgrades from Fen's Flight Works
export const UPGRADES = [
  { id: 'satchel1', kind: 'satchel', level: 1, name: 'Patchwork Satchel', desc: 'Satchel holds 10 stacks.', coins: 40, needs: { wool: 2, cloth: 1 } },
  { id: 'satchel2', kind: 'satchel', level: 2, name: 'Explorer’s Satchel', desc: 'Satchel holds 14 stacks.', coins: 120, needs: { cloth: 2, twine: 2 }, after: 'satchel1' },
  { id: 'basket1', kind: 'basket', level: 1, name: 'Wide Wicker Basket', desc: 'Carry 2 pets on your broom.', coins: 50, needs: { driftwood: 3, twine: 1 } },
  { id: 'basket2', kind: 'basket', level: 2, name: 'Double-Decker Basket', desc: 'Carry 3 pets on your broom.', coins: 150, needs: { driftwood: 4, twine: 2, cloth: 1 }, after: 'basket1' },
  { id: 'broom1', kind: 'broom', level: 1, name: 'Swift Bristles', desc: 'Fly 25% faster.', coins: 70, needs: { feather: 4, twine: 1 } },
  { id: 'broom2', kind: 'broom', level: 2, name: 'Comet Charm', desc: 'Fly 50% faster. Leaves a sparkly trail!', coins: 180, needs: { starshard: 1, feather: 4 }, after: 'broom1' },
];

// Hotel renovations (done overnight by Bruno's crew)
export const RENOVATIONS = [
  { room: 2, coins: 80, needs: { driftwood: 4 }, rep: 3 },
  { room: 3, coins: 160, needs: { driftwood: 6, pebble: 4 }, rep: 8 },
  { room: 4, coins: 260, needs: { driftwood: 8, wool: 4 }, rep: 15 },
  { room: 5, coins: 400, needs: { driftwood: 10, seaglass: 3 }, rep: 24 },
];

export const SPECIES = {
  dog: { name: 'Corgi', rate: 20, rep: 0, foods: ['egg', 'fish', 'bread'], treats: ['treat_stew'], toys: ['toy_stick'], decor: ['decor_rug', 'decor_cushion'], hunger: 6.5, joy: 5.5, mess: 0.14, walkLover: true, noise: 'woof' },
  cat: { name: 'Tabby Cat', rate: 22, rep: 0, foods: ['fish', 'milk'], treats: ['treat_fish', 'treat_catnip'], toys: ['toy_yarn', 'toy_feather'], decor: ['decor_cushion', 'decor_lamp'], hunger: 5, joy: 5, mess: 0.08, noise: 'mew' },
  bunny: { name: 'Bunny', rate: 18, rep: 0, foods: ['carrot', 'clover', 'apple'], treats: ['treat_salad', 'treat_apple'], toys: ['toy_chime'], decor: ['decor_plant', 'decor_cushion'], hunger: 6, joy: 4.5, mess: 0.12, noise: 'squeak' },
  hedgehog: { name: 'Hedgehog', rate: 20, rep: 0, foods: ['berries', 'apple', 'mushroom'], treats: ['treat_crumble', 'treat_apple'], toys: ['toy_pinecone'], decor: ['decor_plant'], hunger: 5, joy: 4, mess: 0.1, noise: 'huff' },
  turtle: { name: 'Turtle', rate: 24, rep: 3, foods: ['clover', 'mushroom', 'moss'], treats: ['treat_salad', 'treat_moss'], toys: [], decor: ['decor_pond', 'decor_lamp'], hunger: 3.5, joy: 3, mess: 0.06, noise: 'blink' },
  parrot: { name: 'Parrot', rate: 26, rep: 3, foods: ['seeds', 'apple', 'berries'], treats: ['treat_seedcake', 'treat_crumble'], toys: ['toy_feather', 'toy_chime'], decor: ['decor_perch'], hunger: 5.5, joy: 6, mess: 0.12, noise: 'squawk' },
  frog: { name: 'Frog', rate: 22, rep: 8, foods: ['moss', 'mushroom'], treats: ['treat_moss'], toys: [], decor: ['decor_pond', 'decor_plant'], hunger: 4, joy: 4, mess: 0.08, rainLover: true, noise: 'ribbit' },
  ferret: { name: 'Ferret', rate: 26, rep: 8, foods: ['egg', 'fish'], treats: ['treat_stew'], toys: ['toy_yarn', 'toy_pinecone'], decor: ['decor_rug'], hunger: 6, joy: 7, mess: 0.16, walkLover: true, noise: 'dook' },
  owl: { name: 'Owl', rate: 32, rep: 15, foods: ['fish', 'egg'], treats: ['treat_fish', 'treat_seedcake'], toys: ['toy_feather'], decor: ['decor_perch', 'decor_lamp'], hunger: 4.5, joy: 4.5, mess: 0.06, nocturnal: true, noise: 'hoo' },
  poodle: { name: 'Royal Poodle', rate: 60, rep: 99, foods: ['egg', 'milk', 'bread'], treats: ['treat_stew', 'treat_crumble'], toys: ['toy_stick', 'toy_chime'], decor: ['decor_cushion', 'decor_rug', 'decor_lamp'], hunger: 6, joy: 6.5, mess: 0.1, walkLover: true, noise: 'yip' },
};

export const PET_NAMES = {
  dog: ['Biscuit', 'Waffles', 'Pudding', 'Maple', 'Bean', 'Nutmeg', 'Toast', 'Dumpling', 'Pretzel', 'Barnaby'],
  cat: ['Mochi', 'Pepper', 'Olive', 'Luna', 'Figaro', 'Juniper', 'Marmalade', 'Tofu', 'Saffron', 'Cleo'],
  bunny: ['Clover', 'Button', 'Sprout', 'Thistle', 'Cocoa', 'Bramblebun', 'Parsnip', 'Daisy'],
  hedgehog: ['Bramble', 'Conker', 'Prickles', 'Hazel', 'Truffle', 'Pip', 'Chestnut'],
  turtle: ['Sheldon', 'Basil', 'Captain Slow', 'Moss', 'Pebble', 'Tortellini'],
  parrot: ['Captain', 'Kiwi', 'Mango', 'Rio', 'Polly', 'Admiral Beaks'],
  frog: ['Pickles', 'Lily', 'Hopkins', 'Puddle', 'Ribbon', 'Sir Croaks'],
  ferret: ['Noodle', 'Ziggy', 'Bandit', 'Socks', 'Wiggles', 'Rascal'],
  owl: ['Hoot', 'Professor', 'Midnight', 'Sage', 'Wren', 'Archimedes'],
  poodle: ['Duchess Fifi'],
};

export const OWNER_NAMES = [
  'Nora Bell', 'Mr. Lindqvist', 'Old Ole', 'Dr. Hale', 'Signe', 'Aunt Ruth', 'Mr. Bjorn', 'Elsa Moss', 'Captain Rask',
  'Hilde', 'Tobias', 'Mrs. Abernathy', 'Mr. Petrov', 'Ingrid', 'Grandpa Sten', 'Ms. Okafor', 'Rosalind', 'the Carlsson twins',
  'Mr. Farrow', 'Madame Colette', 'Pieter', 'Lucia', 'Ms. Tanaka', 'Mr. Oyelaran',
];

export const NPCS = {
  honeycutt: { name: 'Mrs. Honeycutt', role: 'Baker', look: 'baker' },
  aldo: { name: 'Aldo', role: 'Postmaster', look: 'postmaster' },
  odette: { name: 'Madame Odette', role: 'Curio Dealer', look: 'curio' },
  fen: { name: 'Fen', role: 'Inventor', look: 'inventor' },
  pim: { name: 'Pim', role: 'Grocer', look: 'grocer' },
  marlo: { name: 'Marlo', role: 'Fisher', look: 'fisher' },
  greta: { name: 'Greta', role: 'Farmer', look: 'farmer' },
  ivy: { name: 'Ivy', role: 'Painter', look: 'painter' },
  mayor: { name: 'Mayor Bellweather', role: 'Mayor', look: 'mayor' },
  lotta: { name: 'Lotta', role: 'Town kid', look: 'kid' },
  soot: { name: 'Soot', role: 'Your cat', look: null },
};

export const SHOPS = {
  pim: { sells: ['carrot', 'fish', 'milk', 'egg', 'seeds', 'apple', 'twine', 'bread'], markup: 1.3, buys: ['food'] },
  marlo: { sells: ['fish'], markup: 0.8, buys: ['shell', 'driftwood'] },
  greta: { sells: ['egg', 'milk', 'carrot', 'apple', 'wool'], markup: 1.1, buys: [] },
  odette: { sells: ['cloth', 'twine', 'glassbead'], markup: 1.5, buys: ['curio', 'material'] },
};

export const GOALS = [
  { id: 'firstGuest', text: 'Check in your first guest', reward: 10 },
  { id: 'firstDelivery', text: 'Complete a delivery', reward: 10 },
  { id: 'firstSort', text: 'Sort your satchel at the sorting table', reward: 5 },
  { id: 'firstBrew', text: 'Brew a treat in the cauldron', reward: 10 },
  { id: 'firstCraft', text: 'Craft something at the workbench', reward: 10 },
  { id: 'fiveStar', text: 'Earn a 5-star review', reward: 25 },
  { id: 'room3', text: 'Renovate a third guest room', reward: 20 },
  { id: 'rep10', text: 'Reach 10 reputation', reward: 30 },
  { id: 'starshard', text: 'Catch a falling Star Shard', reward: 20 },
  { id: 'fullHouse', text: 'Host 4 guests at once', reward: 40 },
  { id: 'upgrade', text: 'Buy gear at Fen’s Flight Works', reward: 15 },
  { id: 'deliveries10', text: 'Complete 10 deliveries', reward: 40 },
  { id: 'spirits', text: 'Greet all eight hushlings in the Whispering Woods', reward: 40 },
  { id: 'grand', text: 'Open all six rooms and reach 30 reputation', reward: 100 },
];

export const BOTTLE_NOTES = [
  'To whoever finds this: the best view on the island is from the top of the northern ridge at sunrise. — A.',
  'Dear sea, please bring back my lucky hat. Yours, Marlo (age 9)',
  'Recipe for happiness: one warm loaf, two good friends, and a cat on your lap.',
  'If you are reading this, look for the Brass Key on the little island to the south-west. The lighthouse keeper’s chest still waits.',
  'The stars fall more often on clear nights after rain. Keep your eyes up, little witch.',
];
