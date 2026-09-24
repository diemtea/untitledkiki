// Scripted playtest: node tools/play.mjs tools/playtests/<steps.json> ; steps: [{click:"sel"}|{key:"KeyE",ms}|{wait}|{shot:"name"}|{eval:"js"}]
let pw;
try { pw = await import('playwright'); } catch { pw = await import('/opt/node22/lib/node_modules/playwright/index.mjs'); }
const { chromium } = pw;
import { readFileSync } from 'fs';
const steps = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const W = +(process.argv[3] || 1280), H = +(process.argv[4] || 720);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
const logs = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}\n${e.stack}`));
await page.goto(process.env.URL || 'http://localhost:5173/', { waitUntil: 'load' });
for (const st of steps) {
  try {
    if (st.wait) await page.waitForTimeout(st.wait);
    if (st.click) await page.click(st.click, { timeout: 5000 });
    if (st.fill) await page.fill(st.fill[0], st.fill[1]);
    if (st.key) { await page.keyboard.down(st.key); await page.waitForTimeout(st.ms || 60); await page.keyboard.up(st.key); await page.waitForTimeout(st.after ?? 150); }
    if (st.keys) { for (const k of st.keys) await page.keyboard.down(k); await page.waitForTimeout(st.ms || 60); for (const k of st.keys) await page.keyboard.up(k); await page.waitForTimeout(st.after ?? 150); }
    if (st.eval) { const r = await page.evaluate(st.eval); if (r !== undefined) console.log('eval:', typeof r === 'string' ? r : JSON.stringify(r)); }
    if (st.shot) { await page.screenshot({ path: `tools/shots/${st.shot}.png` }); console.log('shot', st.shot); }
  } catch (e) { console.log('step failed', JSON.stringify(st), e.message.split('\n')[0]); }
}
console.log(logs.slice(0, 30).join('\n'));
await browser.close();
