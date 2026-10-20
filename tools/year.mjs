// Year flow playtest: season ceremony, trusted pet in an encounter, checkout charm, the finale.
let pw;
try { pw = await import('playwright'); } catch { pw = await import('/opt/node22/lib/node_modules/playwright/index.mjs'); }
const browser = await pw.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const logs = [];
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}\n${e.stack}`));
page.on('console', (m) => { if (m.type() === 'error') logs.push(m.text()); });
await page.goto('http://localhost:5173/', { waitUntil: 'load' });
await page.waitForFunction(() => window.__game && window.__game.mode === 'title', null, { timeout: 60000 });
const shot = async (n) => { await page.screenshot({ path: `tools/shots/year_${n}.png` }); console.log('shot', n); };
// helper that clicks through dialogs / cards / modals until idle (or until `until` returns true)
await page.exposeFunction('logLine', (t) => console.log('   ', t));
const drive = (n = 80, keepModal = false) => page.evaluate(async ([n, keepModal]) => {
  const g = window.__game;
  for (let i = 0; i < n; i++) {
    const card = document.querySelector('.season-card');
    if (card) { card.dispatchEvent(new Event('pointerdown')); await new Promise((r) => setTimeout(r, 700)); continue; }
    const u = g.encounterUI;
    if (u.open) { if (u._onNav) u._onNav(0, 0, true); else if (u._onAdvance) { u._onAdvance(); u._onAdvance?.(); } await new Promise((r) => setTimeout(r, 60)); continue; }
    if (g.ui.dialogOpen) { const t = document.querySelector('#dialog .text').textContent; g.ui.advance(); g.ui.advance(); if (i % 1 === 0) window.logLine(t.slice(0, 110)); await new Promise((r) => setTimeout(r, 60)); continue; }
    if (g.ui.modal && !keepModal) { g.ui.closeModal(); await new Promise((r) => setTimeout(r, 300)); continue; }
    if (g.transitioning || g.endingDay) { await new Promise((r) => setTimeout(r, 200)); continue; }
    await new Promise((r) => setTimeout(r, 150));
    if (!g.ui.dialogOpen && !g.cutscene && !document.querySelector('.season-card')) return i;
  }
  return -1;
}, [n, keepModal]);
await page.evaluate(() => { const g = window.__game; g.intro = async () => {}; g.audio.init(); g.startNew('Wren'); g.state.flags.introPending = false; });
await page.waitForTimeout(500);

// 1. end of spring -> summer ceremony
console.log('--- season change');
await page.evaluate(() => { const g = window.__game; g.state.day = 7; g.endDay(false); });
await page.waitForTimeout(2500);
await page.evaluate(() => window.__game.ui.closeModal());
await page.waitForTimeout(1500);
await shot('summercard');
await drive(60);
await shot('summer');
console.log(await page.evaluate(() => JSON.stringify({ day: window.__game.state.day, slots: window.__game.state.slots, w: window.__game.state.weather.kind })));

// 2. a trusted regular with quirks helps in an encounter
console.log('--- trusted pet');
await page.evaluate(() => {
  const g = window.__game, s = g.state;
  const home = g.world.I.homes[2];
  s.guests.push({ id: 900, name: 'Biscuit', species: 'dog', owner: { name: 'Nora Bell', home: home.id, door: home.door, label: home.label, look: 'baker' }, nights: 2, rate: 22, status: 'party', room: 0, hunger: 80, joy: 60, checkedIn: true, checkout: s.day + 1, quirks: ['clingy', 'stormy'], trusted: true, trust: 2, regular: true, day: s.day });
  g.markDirty();
  g.switchStage('world', { x: 62, z: 33 }, true);
  window.__done = false; g.debugEncounter('troll').then(() => (window.__done = true));
});
await page.waitForTimeout(1200);
for (let i = 0; i < 10; i++) { const m = await page.evaluate(() => { const u = window.__game.encounterUI; if (u._onNav) return 1; u._onAdvance?.(); u._onAdvance?.(); return 0; }); if (m) break; await page.waitForTimeout(150); }
await page.waitForTimeout(300);
await shot('petmenu');
const petIdx = await page.evaluate(() => [...document.querySelectorAll('.enc-opt')].findIndex((b) => b.innerText.includes('Biscuit')));
console.log('pet option index', petIdx);
await page.evaluate((k) => document.querySelectorAll('.enc-opt')[k].click(), petIdx);
await page.waitForTimeout(800);
await shot('pethelp');
await drive(60);
console.log(await page.evaluate(() => JSON.stringify({ joy: window.__game.state.guests.find((g) => g.id === 900).joy, adv: window.__game.state.guests.find((g) => g.id === 900).adventures, spooked: window.__game.state.guests.find((g) => g.id === 900).spooked })));

// 3. checkout -> thank-you charm + regular trust
console.log('--- checkout');
await page.evaluate(async () => {
  const g = window.__game, s = g.state;
  const b = s.guests.find((x) => x.id === 900);
  b.goingHome = true; b.sum = 92 * 5; b.samples = 5;
  window.__p = g.returnPet(b);
});
await drive(40);
console.log(await page.evaluate(() => JSON.stringify({ charms: window.__game.state.charms, regulars: window.__game.state.regulars })));

// 4. the finale
console.log('--- finale');
await page.evaluate(() => {
  const g = window.__game, s = g.state;
  s.day = 28; s.time = 18.5 * 60;
  for (const id of ['troll', 'frogs', 'bear', 'raccoon', 'flame', 'stump', 'crow', 'treecat']) s.enc[id] = { times: 3, best: 3, friend: 2, seasons: {}, got: {}, last: 0 };
  s.flags.trollConcert = true; s.flags.geraldNote = true; s.flags.magpieFriend = true;
  s.gags.gooseLoot = ['berries', 'shell']; s.gags.snailHome = 27;
  g.switchStage('world', { x: 50.5, z: 48 }, true);
  g.markDirty();
});
await page.waitForTimeout(500);
await page.evaluate(() => { window.__fin = import('/src/game/story.js').then((st) => st.finale(window.__game)); });
await page.waitForTimeout(4000);
await shot('festival1');
await drive(9);
await shot('festival2');
await drive(16);
await shot('festival3');
await drive(30, true);
await page.waitForTimeout(800);
await shot('yearbook');
await drive(10);
console.log(await page.evaluate(() => JSON.stringify({ finale: window.__game.state.year, goals: Object.keys(window.__game.state.goals) })));
console.log(logs.slice(0, 10).join('\n'));
await browser.close();
