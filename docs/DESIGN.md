# Broom & Board: design notes (version 2)

This is the design we worked out together, and where each piece lives in the code. The second half is a
guide to adding your own content.

## Pillars

1. **Two halves that feed each other.** Out in the world you find things and make friends. At home you
   look after guests. Each half powers the other.
2. **Cozy, but with room to be good at it.** You can't lose. A child can finish the year happily; an
   expert finishes it with every friend made, every encounter at ★★★ and a much bigger festival.
3. **Undertale-style encounters, not combat.** Funny, quirky little stories with recurring jokes and
   genre-bending minigames. Kindness always works. Cleverness shines.
4. **A handmade world that lasts.** A small island, layered: the same places change with the seasons,
   the weather and the time of day.

## The loop

> **Morning:** read the mail, accept bookings, **pack charms** →
> **fly out:** pick up pets, deliver parcels, forage, and **land at encounters** (rarely, one finds you in
> the sky) → **fly home:** sort your loot, brew, craft, care for guests →
> **checkout:** happy guests leave **thank-you cards with charms inside** → sleep → next day.

## The year

| Season | Days | New region | Witch skill | Charm slots | Guests |
| --- | --- | --- | --- | --- | --- |
| Spring | 1–7 | town & meadow | **Kind Words** (every encounter has a gentle path) | 1 | one simple need |
| Summer | 8–14 | coast & sky | **Wind Whistle** (sky encounters) | 2 | first quirks, first rare wishes |
| Autumn | 15–21 | Whispering Woods | **Spirit Ears** (spirits talk to you) | 3 | 1–2 quirks, rarer wishes |
| Winter | 22–28 | North Ridge | **Warm Glow** (thaw ice) | 3 | quirky regulars, the rarest wishes |

Day 28 ends with the **Lantern Festival**: everyone you befriended turns up, the goose gives back what it
stole, and Miles finally tells you about Great-Aunt Hilde. Then a **year book** sums up your year, and the
game continues forever with the seasons cycling.

Code: `src/game/year.js` (calendar, skills, slots), `src/game/story.js` (season mornings, festival).

## Charms

Thank-you cards from happy guests (4★+ checkouts), first-time ★★★ rewards from new friends, and Madame
Odette's stall. Pack them in **Bag → Charms** at the hotel. Each one is spent when you play it; unused ones
stay packed.

| Kind | What it does | Charms |
| --- | --- | --- |
| **Path** | adds a whole new way through an encounter | Honey Bun (bribe), Tin Kazoo (music), Yarn Ball (distract), Moon Lantern (night secrets) |
| **Helper** | makes a minigame gentler | Thick Mittens (timing), Lavender Sachet (slows things), Echo Shell (rhythm), Keen Monocle (spot tricks), Tailwind Feather (sky) |
| **Luck** | after any encounter, +1★ | Lucky Clover |
| **Wish** | a perfect result anywhere | Wishing Star |

Code: `src/game/charms.js`.

## Encounters

Every encounter has:

- a **default option** (usually a minigame),
- **charm options** that appear only if you packed the right charm,
- a **pet option** if a trusted guest is riding along (a little risky: success is ★★★ and a happy pet,
  failure is a spooked pet who needs extra cuddles),
- **Kind Words**, which always gives ★,
- **Leave for now**.

Results are graded 0–3★; better grades give rarer finds. Your first ★★ or better in each season raises
your friendship (shown as hearts in Journal → Friends).

| Encounter | Where | From | Minigame | Seasonal layers |
| --- | --- | --- | --- | --- |
| Grumbold the bridge troll | meadow road | spring | riddles | riddles → kazoo lessons → his band → the festival concert |
| Something in the oak | below the hotel | spring | timing | a cat → a goat → a sheep → a moose |
| The honey bear | meadow beehive | spring | sneaking | "I was awake the whole time." Gets sleepier toward winter |
| The Frog Choir (and Gerald) | plaza fountain | spring | 2-lane rhythm | Gerald is always flat… until winter |
| Rocco's cups | east pier | summer | shell game (catch the cheat) | more cheating, then "under new management" |
| The weathervane duck | lighthouse | summer | timing | faster autumn winds, frozen in winter |
| Wick, the lighthouse spirit | lighthouse | summer | talking | becomes your pen pal (letters arrive in the mailbox) |
| The Stump Spirit | Whispering Woods | autumn | rhythm | knows one note; learns a second in winter |
| Corvid Court | woods edge | autumn | evidence | a magpie in a crow costume; the appeal in winter |
| Three fish | North Ridge pond | winter | ice-slide puzzle | |
| A gull in a squall | over the sea (sky) | summer | dodging hail | your passengers get rattled when you're hit |
| The cloud whale | anywhere (sky), once a season | summer | photography (timing) | pure wonder |

Code: `src/game/encounters.js` (all content), `src/ui/encounter.js` (the screen), `src/minigames/*`.

## Difficulty scaling

- **Guests** get harder by *combining simple traits*, not by bigger numbers: one need in spring, then
  quirks from summer (`QUIRKS` in `src/game/data.js`, effects in `src/game/guests.js`), then wishes for
  rare encounter-only finds (sun berries, golden honey, moonberries).
- **Exploration** gets deeper in the same places: harder seasonal variants, night-only secrets (Moon
  Lantern, the Stump Spirit's moonberries), rain bonuses (the frog choir), sky encounters once you can
  whistle up the wind, and the ridge in winter.
- **Regulars:** a pet you looked after well comes back. Each 4★+ stay adds trust; at trust 1 the owner lets
  their pet join your adventures.

## Running gags

- **The goose** steals one thing from your satchel each season while you walk through town. At the
  festival it returns everything, plus a medal.
- **The snail mail snail** crawls up the hill road all year. It arrives the day before the festival with a
  letter from Hilde: "hi."
- **Gerald**, the flat frog.
- **Grumbold's music career.**
- **The ever-larger animal in the oak.**

## Ideas for later

- More encounters per region (the hushlings' hide-and-seek, a rival pigeon courier, a lost yeti cub).
- Charm crafting at the workbench.
- A second-year story ("Grumbold on tour").
- Rival bookings: two owners want the same room.

---

# Adding your own content

All content is plain JavaScript data, so you can add to it without touching the engine. Run `npm run dev`,
edit a file, and the browser reloads.

## A new encounter

Add an entry to `ENCOUNTERS` in `src/game/encounters.js`:

```js
{
  id: 'owl', name: 'Professor Hoot', role: 'Retired riddle-setter', voice: 1,
  at: { x: 30, z: 40 },          // where they stand on the island (use tools/mapdump.mjs to find spots)
  scene: 'meadow',               // stage backdrop: meadow, road, tree, pond, farm, woods, beach, dock, lighthouse, ridge, sky, storm
  from: 1,                       // first season (0 spring … 3 winter)
  where: 'the old signpost',     // shown in the journal and task list
  petBest: ['owl'],              // species that are especially good at helping
  sprite: (si) => petCanvas('owl'),                              // how they look in the world
  stage: (si) => [{ id: 'main', c: petCanvas('owl'), x: 96, y: 80, scale: 2, bob: 1 }],
  variant(si, x) {               // si = season; x has the state, the record, night, party pets…
    return {
      intro: ['An owl in spectacles peers down at you.', '"Riddle me this, young witch."'],
      options: [
        { id: 'riddle', label: 'Accept the challenge', icon: 'icon:exclaim', game: 'riddle',
          params: { questions: [{ q: '"What has roots nobody sees?"', a: [{ t: 'A mountain', score: 1 }, { t: 'A carrot', score: 0 }] }] } },
        { id: 'bun', label: 'Offer a honey bun', charm: 'treat', instant: 3 },   // needs a packed "treat" charm
      ],
      lines: {                   // what happens, indexed by grade 0..3
        riddle: ['"Hm."', '"Close."', '"Well reasoned!"', '"Splendid! Take this."'],
        bun: [null, null, null, 'He eats it with great dignity.'],
      },
      kind: 'You tell him his spectacles are very distinguished. He agrees.',
      rewards: (g) => [[I('feather')], [I('feather', 2)], [{ coins: 12 }], [I('moonberry')]][g],
    };
  },
},
```

Options can use `game:` (a minigame), `instant:` (a fixed grade), `charm:` (shown only when a charm with
that tag is packed) or `skill:` (needs a witch skill). Helper charms, pets, Kind Words and Leave are added
automatically. Air encounters set `air: true` and are spawned in `updateSkyEncounters` in `story.js`.

Test it with `tools/run.sh tools/enc.mjs owl 9 0`: it plays the encounter and saves screenshots to
`tools/shots/`.

## A new charm

Add it to `CHARMS` in `src/game/charms.js` with a `tag` and a `kind`. A **path** charm works as soon as an
encounter option uses `charm: '<tag>'`. A **helper** charm also needs its tag in `GAME_HELPERS` for the
minigames it affects, and the minigame needs to read `params.<tag>`. Add art to `ITEM_ART` in
`src/gfx/sprites.js`, and optionally to `THANKS` so guests give it out.

## A new quirk

Add it to `QUIRKS` in `src/game/data.js` (name, icon, description), then give it an effect in
`tickGuests`, `actFeed` or `actPet` in `src/game/guests.js` (look at `hasQuirk(g, 'clingy')` for a
pattern). Quirks are rolled by season in `rollQuirks` in `src/game/jobs.js`.

## A new minigame

Make a file in `src/minigames/` exporting either:

- `{ create(host, params) { return { update(dt) { … return grade or null }, draw(g) { … } } } }` for
  real-time games, or
- `{ async run(host, params) { … return grade } }` for talking games.

`host` gives you `W`/`H` (the 192×108 stage), `paint(scene)`, `spr(canvas, x, y, {scale, flip})`,
`pressed('interact' | 'left' | …)`, `held()`, `axis()`, `tap`/`pointer` (touch), `fx.burst()`, `shake()`,
`sfx()`, `tone()`, `hud(html)` and `say(text)`. Register it in `MINIGAMES` in `encounters.js`, and add a
key hint and a how-to line there too.
