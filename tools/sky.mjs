// Sky encounter + goose + snail check
let pw;
try { pw = await import('playwright'); } catch { pw = await import('/opt/node22/lib/node_modules/playwright/index.mjs'); }
const browser = await pw.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const logs = [];
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}\n${e.stack}`));
page.on('console', (m) => { if (m.type() === 'error') logs.push(m.text()); });
await page.goto('http://localhost:5173/', { waitUntil: 'load' });
await page.waitForFunction(() => window.__game && window.__game.mode === 'title', null, { timeout: 60000 });
const shot = async (n) => { await page.screenshot({ path: `tools/shots/sky_${n}.png` }); console.log('shot', n); };
await page.evaluate(async () => {
  const g = window.__game; g.intro = async () => {}; g.startNew('Wren'); g.state.flags.introPending = false;
  const s = g.state; s.day = 9; s.time = 11 * 60;
  const story = await import('/src/game/story.js');
  story.setupEncounterActors(g); story.applySeasonVisuals(g);
  g.switchStage('world', { x: 50.5, z: 27.6 }, true);
  const w = g.world.witch;
  g.toggleFly();
  g.debugStep(3);
  w.pos.x = 52; w.pos.z = 74; w.vel.set(4, 0, 0);
  g.debugStep(0.2);
  const { ENC } = await import('/src/game/encounters.js');
  story.spawnSkyEvent(g, ENC.squall);
  g.debugStep(0.5);
});
await page.waitForTimeout(1500);
await shot('squall');
// fly into it
await page.evaluate(() => { const g = window.__game; const ev = g.skyEvent; g.world.witch.pos.x = ev.mesh.position.x; g.world.witch.pos.z = ev.mesh.position.z; g.debugStep(0.2); });
await page.waitForTimeout(1500);
console.log('mode', await page.evaluate(() => window.__game.world.witch.mode));
console.log('encounter open:', await page.evaluate(() => window.__game.encounterUI.open));
await shot('squall_enc');
await page.evaluate(() => { const u = window.__game.encounterUI; for (let i = 0; i < 5; i++) u._onAdvance?.(); });
await page.waitForTimeout(400);
await page.evaluate(() => document.querySelector('.enc-opt')?.click());
await page.waitForTimeout(3500);
await shot('squall_game');
await page.evaluate(() => { window.__game.encounterUI.game_ && (window.__game.encounterUI.game_.inst.update = () => ({ grade: 3, hits: 0 })); });
for (let i = 0; i < 20; i++) { await page.evaluate(() => { const u = window.__game.encounterUI; if (u._onNav) u._onNav(0, 0, true); else u._onAdvance?.(); }); await page.waitForTimeout(200); }
console.log('after:', await page.evaluate(() => JSON.stringify({ open: window.__game.encounterUI.open, mode: window.__game.world.witch.mode, cut: window.__game.cutscene, rec: window.__game.state.enc.squall })));
// the whale
await page.evaluate(async () => { const g = window.__game; const story = await import('/src/game/story.js'); const { ENC } = await import('/src/game/encounters.js'); g.world.witch.place(50, 40); g.world.witch.pos.y = 9; g.world.witch.vel.set(0, 0, -4); story.spawnSkyEvent(g, ENC.whale); g.debugStep(0.3); });
await page.waitForTimeout(1500);
await shot('whale');
// goose in town, spring
await page.evaluate(async () => {
  const g = window.__game, s = g.state;
  const story = await import('/src/game/story.js');
  story.clearSkyEvent(g);
  s.day = 4; s.gags = { gooseDay: { 0: 3 } };
  const w = g.world.witch; w.mode = 'walk'; w.walkBB.mesh.visible = true; w.flyBB.mesh.visible = false;
  g.switchStage('world', { x: 50.5, z: 50 }, true);
  g.giveItem('berries', 3, { quiet: true });
  story.setupSnail(g);
  g.debugStep(0.4);
});
await page.waitForTimeout(1200);
await shot('goose');
console.log('goose:', await page.evaluate(() => JSON.stringify(window.__game.state.gags)));
console.log(logs.slice(0, 10).join('\n'));
await browser.close();
