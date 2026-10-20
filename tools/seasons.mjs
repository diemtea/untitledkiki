// Season views: node tools/seasons.mjs  -> tools/shots/season_<si>_<view>.png
let pw;
try { pw = await import('playwright'); } catch { pw = await import('/opt/node22/lib/node_modules/playwright/index.mjs'); }
const browser = await pw.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const logs = [];
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}\n${e.stack}`));
page.on('console', (m) => { if (m.type() === 'error') logs.push(m.text()); });
await page.goto('http://localhost:5173/', { waitUntil: 'load' });
await page.waitForFunction(() => window.__game && window.__game.mode === 'title', null, { timeout: 60000 });
await page.evaluate(() => { const g = window.__game; g.intro = async () => {}; g.startNew('Wren'); g.state.flags.introPending = false; });
const views = (process.env.VIEWS || 'road:61,33.5;plaza:51,46.5;woods:28,26').split(';').map((v) => { const [n, p] = v.split(':'); const [x, z] = p.split(',').map(Number); return { n, x, z }; });
const seasons = (process.env.SEASONS || '0,1,2,3').split(',').map(Number);
for (const si of seasons) {
  await page.evaluate(async (si) => {
    const g = window.__game;
    const story = await import('/src/game/story.js');
    g.state.day = 1 + si * 7 + 2;
    g.state.time = 11 * 60;
    g.rollWeather(false);
    if (si === 3) g.state.weather = { kind: 'snow', cloud: 0.6, rain: 0, snow: 1, wind: 0.4 };
    else g.state.weather = { kind: 'sunny', cloud: 0, rain: 0, wind: 0.2 };
    story.setupEncounterActors(g);
    story.setupSnail(g);
    story.applySeasonVisuals(g);
  }, si);
  for (const v of views) {
    await page.evaluate(({ x, z }) => { const g = window.__game; g.switchStage('world', { x, z }, true); g.debugStep(1.5); }, v);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `tools/shots/season_${si}_${v.n}.png` });
    console.log('shot', si, v.n);
  }
}
console.log(logs.slice(0, 10).join('\n'));
await browser.close();
