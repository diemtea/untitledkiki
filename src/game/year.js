// The training year: four seasons of seven days, each opening a new region, a new witch skill and a
// new charm slot, ending in the Lantern Festival. After that the hotel stays open forever.

export const DAYS_PER_SEASON = 7;
export const FINALE_DAY = DAYS_PER_SEASON * 4;

export const SEASONS = [
  {
    id: 'spring', name: 'Spring', sub: 'Blossoms & first guests', region: 'the town and the meadow',
    skill: 'kindness', slots: 1, color: '#ff8ab8', icon: 'flower',
    tint: [1.0, 1.0, 1.0], card: 'The almond trees are in bloom and the hotel smells of fresh paint.',
  },
  {
    id: 'summer', name: 'Summer', sub: 'The coast & the sky', region: 'the beaches, the harbour and the open sky',
    skill: 'whistle', slots: 2, color: '#ffb43a', icon: 'icon:sun',
    tint: [1.03, 1.0, 0.95], card: 'Long golden days. The sea is warm, and the wind wants to play.',
  },
  {
    id: 'autumn', name: 'Autumn', sub: 'The deep woods', region: 'the Whispering Woods',
    skill: 'listen', slots: 3, color: '#ff7a3a', icon: 'acorn',
    tint: [1.06, 0.97, 0.9], card: 'Leaves like copper coins. Something old is waking up in the forest.',
  },
  {
    id: 'winter', name: 'Winter', sub: 'The far ridge', region: 'the frozen North Ridge',
    skill: 'warmth', slots: 3, color: '#8ad8ff', icon: 'frostbloom',
    tint: [0.95, 0.98, 1.06], card: 'Snow on the rooftops. The last week of your training year.',
  },
];

export const SKILLS = {
  kindness: { name: 'Kind Words', icon: 'icon:heart', desc: 'Every encounter has a gentle way through. It never fails, but it never shines either.' },
  whistle: { name: 'Wind Whistle', icon: 'feather', desc: 'Call a friendly breeze. You can now help creatures you meet in the sky.' },
  listen: { name: 'Spirit Ears', icon: 'icon:sparkle', desc: 'Hear the quiet voices of the woods. Forest spirits will talk to you.' },
  warmth: { name: 'Warm Glow', icon: 'decor_lamp', desc: 'A little hearth magic that thaws ice and warms cold paws.' },
};

// Day 1-7 spring, 8-14 summer, 15-21 autumn, 22-28 winter. After the festival the seasons keep turning.
export function seasonIndex(day) { return Math.floor((Math.max(1, day) - 1) / DAYS_PER_SEASON) % 4; }
export function season(day) { return SEASONS[seasonIndex(day)]; }
export function dayOfSeason(day) { return ((Math.max(1, day) - 1) % DAYS_PER_SEASON) + 1; }
export function yearNumber(day) { return Math.floor((Math.max(1, day) - 1) / FINALE_DAY) + 1; }
export function isFirstYear(day) { return day <= FINALE_DAY; }

// What you've unlocked so far (everything stays unlocked once the year is done).
export function slotsFor(state) {
  if (!isFirstYear(state.day) || state.year?.finale) return 3;
  return SEASONS[seasonIndex(state.day)].slots;
}
export function skillsFor(state) {
  const n = !isFirstYear(state.day) || state.year?.finale ? 4 : seasonIndex(state.day) + 1;
  return SEASONS.slice(0, n).map((s) => s.skill);
}
export function hasSkill(state, id) { return skillsFor(state).includes(id); }
// Encounters that first appear in a season stay available afterwards.
export function seasonReached(state, idx) { return !isFirstYear(state.day) || state.year?.finale || seasonIndex(state.day) >= idx; }
