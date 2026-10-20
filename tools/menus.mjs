// Menu screenshots: mail with quirky bookings, guest care, journal year/friends pages.
let pw;
try { pw = await import('playwright'); } catch { pw = await import('/opt/node22/lib/node_modules/playwright/index.mjs'); }
const browser = await pw.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const logs = [];
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}\n${e.stack}`));
await page.goto('http://localhost:5173/', { waitUntil: 'load' });
await page.waitForFunction(() => window.__game && window.__game.mode === 'title', null, { timeout: 60000 });
const shot = async (n) => { await page.waitForTimeout(500); await page.screenshot({ path: `tools/shots/menu_${n}.png` }); console.log('shot', n); };
await page.evaluate(async () => {
  const g = window.__game; g.intro = async () => {}; g.startNew('Wren'); g.state.flags.introPending = false;
  const s = g.state;
  s.day = 16; s.rep = 14;
  const jobs = await import('/src/game/jobs.js');
  s.letters = [];
  for (let i = 0; i < 3; i++) { const b = jobs.makeBooking(s, g.world.I.homes); if (b) s.letters.push(b); }
  s.regulars = { 'Nora Bell|Biscuit': { name: 'Biscuit', species: 'dog', owner: { name: 'Nora Bell', home: 'house0', door: g.world.I.homes[0].door, label: g.world.I.homes[0].label, look: 'baker' }, stays: 1, trust: 1, lastDay: 1 } };
  const r = jobs.morningMail(s, g.world.I.homes, false);
  s.letters.push(...r);
  s.enc = { troll: { times: 4, best: 3, friend: 3, seasons: {}, got: {} }, bear: { times: 2, best: 2, friend: 1, seasons: {}, got: {} }, frogs: { times: 1, best: 1, friend: 0, seasons: {}, got: {} } };
  g.menus.mail();
});
await shot('mail');
await page.evaluate(() => { const g = window.__game; g.ui.closeModal(); g.menus.journal('year'); });
await shot('year');
await page.evaluate(() => { const g = window.__game; g.ui.closeModal(); g.menus.journal('friends'); });
await shot('friends');
await page.evaluate(() => {
  const g = window.__game, s = g.state;
  g.ui.closeModal();
  const home = g.world.I.homes[1];
  const guest = { id: 901, name: 'Pepper', species: 'cat', owner: { name: 'Signe', home: home.id, door: home.door, label: home.label, look: 'baker' }, nights: 2, rate: 22, status: 'in-room', room: 1, hunger: 60, joy: 55, checkedIn: true, checkout: s.day + 1, quirks: ['escape', 'nightowl'], trusted: true, regular: true, day: s.day, wish: { kind: 'food', id: 'moonberry', rare: true } };
  s.guests.push(guest);
  s.rooms[1].unlocked = true;
  g.markDirty();
  g.menus.care(guest);
});
await shot('care');
await page.evaluate(() => { const g = window.__game; g.ui.closeModal(); const p = g.state.guests.find((x) => x.id === 901); p.escaped = { x: 18, z: 7.4 }; g.markDirty(); g.hotel.witch.place(16, 8.5); });
await page.waitForTimeout(1500);
await shot('escape');
console.log(logs.join('\n'));
await browser.close();
