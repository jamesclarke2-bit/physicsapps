// Automated quality gate for every app.   Run:  node tools/check.mjs   (or  node tools/check.mjs cupcake-case-drop)
// Needs: playwright (npm i -D playwright && npx playwright install chromium). Exits 1 if anything fails.
// Checks per app: model tests; no page errors; title + one h1; tabs switch and show their panel; buttons and images have names;
// no horizontal scroll at 400px wide; light and dark both render; screenshots saved to .check/ for a human look.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { spawnSync } from 'node:child_process';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const skip = new Set(['node_modules', 'shared', 'tools', 'docs', '.git', '.check', '.github']);
let apps = fs.readdirSync(root, { withFileTypes: true }).filter(d => d.isDirectory() && !skip.has(d.name) && fs.existsSync(path.join(root, d.name, 'index.html'))).map(d => d.name);
if (process.argv[2]) apps = [process.argv[2]];
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0])); const f = fs.existsSync(p) && fs.statSync(p).isDirectory() ? path.join(p, 'index.html') : p;
  if (!f.startsWith(root) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
}).listen(0);
const port = server.address().port;
const NOISE = /ERR_TUNNEL|ERR_NAME_NOT_RESOLVED|ERR_INTERNET_DISCONNECTED|fonts\.(googleapis|gstatic)|Failed to load resource/;
let failures = 0; const fail = (a, m) => { failures++; console.log('  FAIL', a + ':', m); };
fs.mkdirSync(path.join(root, '.check'), { recursive: true });

// 1. model tests
for (const a of apps) {
  const t = path.join(root, a, 'model.test.mjs');
  if (fs.existsSync(t)) { const r = spawnSync('node', ['--test', t], { encoding: 'utf8' }); console.log((r.status ? 'FAIL' : 'ok  '), a, 'model tests'); if (r.status) { failures++; console.log(r.stdout.split('\n').filter(l => /not ok|Error|assert/.test(l)).slice(0, 6).join('\n')); } }
  else if (a !== 'motion-graphs') console.log('warn', a, 'has no model.test.mjs');
}
// 2. browser checks
const browser = await chromium.launch();
for (const a of apps) {
  console.log('app', a);
  for (const scheme of ['light', 'dark']) {
    for (const [w, h] of [[1100, 900], [400, 800]]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: scheme }); const page = await ctx.newPage(); const errs = [];
      page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !NOISE.test(m.text())) errs.push(m.text()); });
      await page.goto(`http://localhost:${port}/${a}/`); await page.waitForTimeout(400);
      const tag = `${a} ${scheme} ${w}px`;
      if (!(await page.title()).trim()) fail(tag, 'empty <title>');
      const h1 = await page.locator('h1').count(); if (h1 < 1) fail(tag, 'no h1');
      const tabs = page.locator('[role=tab]'); const n = await tabs.count();
      for (let i = 0; i < n; i++) {
        await tabs.nth(i).click(); await page.waitForTimeout(150);
        const ctl = await tabs.nth(i).getAttribute('aria-controls');
        if (ctl && !(await page.locator('#' + ctl).isVisible())) fail(tag, `tab ${i} panel #${ctl} not visible`);
        if (w === 400 && (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1))) fail(tag, `horizontal scroll on tab ${i}`);
        if (w === 1100 && scheme === 'light') await page.screenshot({ path: path.join(root, '.check', `${a}-tab${i}.png`) });
      }
      if (n) await tabs.nth(0).click();
      const unnamed = await page.evaluate(() => [...document.querySelectorAll('button,[role=button]')].filter(b => !(b.textContent.trim() || b.getAttribute('aria-label') || b.getAttribute('title'))).length);
      if (unnamed) fail(tag, `${unnamed} button(s) without a name`);
      const noAlt = await page.evaluate(() => [...document.querySelectorAll('img')].filter(i => !i.hasAttribute('alt')).length);
      if (noAlt) fail(tag, `${noAlt} image(s) without alt`);
      errs.forEach(e => fail(tag, 'console/page error: ' + e));
      await ctx.close();
    }
  }
}
await browser.close(); server.close();
console.log(failures ? `\n${failures} problem(s)` : '\nAll checks passed. Look at .check/*.png before publishing.');
process.exit(failures ? 1 : 0);
