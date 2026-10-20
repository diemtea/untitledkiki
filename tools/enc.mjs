// Encounter playtest: node tools/enc.mjs <id> [day] [option index] [shots...]
// Starts a game, jumps to the given day, opens the encounter, picks an option, screenshots the
// intro, the menu, the minigame (a few frames) and the result.
let pw;
try { pw = await import('playwright'); } catch { pw = await import('/opt/node22/lib/node_modules/playwright/index.mjs'); }
const [id = 'troll', day = '1', optArg = '0', prefix = id] = process.argv.slice(2);
const browser = await pw.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const logs = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}\n${e.stack}`));
await page.goto(process.env.URL || 'http://localhost:5173/', { waitUntil: 'load' });
await page.waitForFunction(() => window.__game && window.__game.mode === 'title', null, { timeout: 60000 });
await page.evaluate(async ([day]) => {
  const g = window.__game;
  g.audio.init();
  g.intro = async () => { g.state.flags.introPending = false; };
  g.startNew('Wren');
  g.state.flags.introPending = false;
  g.state.day = +day;
  g.state.time = 10 * 60;
  for (let i = 0; i < 40 && (g.ui.dialogOpen || document.querySelector('.season-card')); i++) { document.querySelector('.season-card')?.dispatchEvent(new Event('pointerdown')); g.ui.advance(); await new Promise((r) => setTimeout(r, 50)); }
  g.cutscene = false;
  g.state.charms = { bun: 2, gloves: 1, kazoo: 1, yarn: 1, lantern: 1, lavender: 1, clover: 1, monocle: 1, shell: 1, feather: 1, star: 1 };
  g.state.slots = ['kazoo', 'lavender', 'clover'];
  g.switchStage('world', { x: 50, z: 40 }, true);
}, [day]);
await page.waitForTimeout(800);
const shot = async (n) => { await page.screenshot({ path: `tools/shots/${prefix}_${n}.png` }); console.log('shot', `${prefix}_${n}`); };
await page.evaluate((id) => { window.__encDone = false; window.__game.debugEncounter(id).then(() => (window.__encDone = true)); }, id);
await page.waitForTimeout(1200);
await shot('intro');
// advance through the intro until the menu appears
for (let i = 0; i < 20; i++) {
  const st = await page.evaluate(() => { const u = window.__game.encounterUI; if (u._onNav) return 'menu'; if (u._onAdvance) { u._onAdvance(); u._onAdvance?.(); } return 'adv'; });
  if (st === 'menu') break;
  await page.waitForTimeout(150);
}
await page.waitForTimeout(400);
await shot('menu');
const opts = await page.evaluate(() => [...document.querySelectorAll('.enc-opt')].map((b) => b.innerText.replace(/\n/g, ' / ')));
console.log('options:', JSON.stringify(opts));
await page.evaluate((k) => { document.querySelectorAll('.enc-opt')[k]?.click(); }, +optArg);
// let the minigame (if any) run a bit, with some random presses
for (let f = 0; f < 3; f++) {
  await page.waitForTimeout(f === 0 ? 2500 : 1800);
  await shot('game' + f);
}
// drive the rest: answer talk prompts, force-finish real-time games
for (let i = 0; i < 60; i++) {
  const done = await page.evaluate(() => {
    const u = window.__game.encounterUI;
    if (window.__encDone) return 'done';
    if (u.game_) { u.game_.inst.update = () => 2; return 'game'; }
    if (u._onNav) { u._onNav(0, 0, true); return 'nav'; }
    if (u._onAdvance) { const t = u.text.textContent; u._onAdvance(); u._onAdvance?.(); return 'adv:' + t.slice(0, 120); }
    return 'wait';
  });
  if (done === 'done') break;
  if (done.startsWith('adv:')) console.log('  ', done.slice(4));
  if (i === 6) await shot('result');
  await page.waitForTimeout(250);
}
const rec = await page.evaluate((id) => JSON.stringify({ rec: window.__game.state.enc[id], satchel: window.__game.state.satchel.map((x) => x.id + 'x' + x.n), coins: window.__game.state.coins, slots: window.__game.state.slots }), id);
console.log(rec);
console.log(logs.slice(0, 20).join('\n'));
await browser.close();
