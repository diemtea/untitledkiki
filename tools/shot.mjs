// Usage: node tools/shot.mjs <url> <out.png> [width height waitMs] [evalJS]
let pw;
try { pw = await import('playwright'); } catch { pw = await import('/opt/node22/lib/node_modules/playwright/index.mjs'); }
const { chromium } = pw;
const [url, out, w = '1400', h = '1500', wait = '1500', evalJs] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}\n${e.stack}`));
await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(+wait);
if (evalJs) { const r = await page.evaluate(evalJs); if (r !== undefined) console.log('eval:', JSON.stringify(r)); await page.waitForTimeout(800); }
await page.screenshot({ path: out });
console.log(logs.slice(0, 40).join('\n'));
await browser.close();
