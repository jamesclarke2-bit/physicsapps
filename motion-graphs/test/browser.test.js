/**
 * Browser checks: every route renders without a script error, nothing
 * overflows sideways on a phone, and the core interactions actually work
 * (answering a question, drawing a sketch, running a program, revealing a
 * Detective case). Uses Playwright's Chromium; set PLAYWRIGHT_CHROMIUM_PATH
 * to point at a different Chromium if the bundled one isn't available.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

let chromium = null;
try {
  ({ chromium } = require('playwright'));
} catch (e) {
  chromium = null;
}

const ROOT = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
const LV = require('../src/levels.js');

function serve() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = decodeURIComponent(req.url.split('?')[0]);
      const file = path.join(ROOT, url === '/' ? 'index.html' : url);
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404);
        res.end();
        return;
      }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

let browser = null;
let server = null;
let base = '';
let launchError = null;
let skipped = 0;

test.before(async () => {
  if (!chromium) {
    launchError = new Error('playwright not installed');
    return;
  }
  try {
    const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH;
    browser = await chromium.launch(executablePath ? { executablePath } : {});
  } catch (e) {
    launchError = e;
    return;
  }
  server = await serve();
  base = 'http://127.0.0.1:' + server.address().port + '/index.html';
});

test.after(async () => {
  if (browser) await browser.close();
  if (server) server.close();
  if (skipped) console.warn('\n⚠  BROWSER TESTS SKIPPED — ' + skipped + ' test(s): Chromium unavailable (' + (launchError && launchError.message) + '). Set PLAYWRIGHT_CHROMIUM_PATH.\n');
});

function skipIfNoBrowser(t) {
  if (launchError) {
    skipped++;
    t.skip('Chromium unavailable');
    return true;
  }
  return false;
}

async function openPage(width, unlockAll, mathMode) {
  const page = await browser.newPage({ viewport: { width: width || 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.addInitScript(
    ([ua, mm]) => {
      try {
        const key = 'motion-graphs-mastery.session.v1';
        if (!sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, JSON.stringify({ version: 1, startedAt: Date.now(), xp: 0, streak: 0, bestStreak: 0, levels: {}, skills: {}, misconceptions: {}, activityTime: {}, counters: {}, badges: {}, history: [], missedTypes: {}, settings: { course: 'extension', mathMode: mm, unlockAll: ua, difficulty: 'adaptive' } }));
        }
      } catch (e) {}
    },
    [!!unlockAll, mathMode || 'extension']
  );
  return { page, errors };
}

const ROUTES = ['#/', '#/learn', '#/detective', '#/detective/3', '#/explore/lab', '#/explore/gradient', '#/explore/area', '#/insights', '#/dashboard', '#/teacher', '#/fix', '#/fix/neg-velocity-slowing', '#/fix/all', '#/privacy', '#/drag', '#/drag/quiz', '#/fix/drag-direction', '#/fix/top-no-forces'].concat(LV.LEVELS.map((lv) => '#/level/' + lv.id));

test('every route renders without script errors', async (t) => {
  if (skipIfNoBrowser(t)) return;
  const { page, errors } = await openPage(1280, true);
  for (const r of ROUTES) {
    await page.goto(base + r);
    await page.waitForTimeout(350);
    const text = await page.locator('main').innerText();
    assert.ok(text.trim().length > 30, r + ' rendered almost nothing');
  }
  assert.deepEqual(errors, []);
  await page.close();
});

test('no sideways scrolling on a 390px phone', async (t) => {
  if (skipIfNoBrowser(t)) return;
  const { page } = await openPage(390, true);
  const bad = [];
  for (const r of ROUTES) {
    await page.goto(base + r);
    await page.waitForTimeout(300);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (over > 1) bad.push(r + ' (+' + over + 'px)');
  }
  assert.deepEqual(bad, []);
  await page.close();
});

test('answering a Signs question records XP and shows feedback', async (t) => {
  if (skipIfNoBrowser(t)) return;
  const { page, errors } = await openPage(1280, false);
  await page.goto(base + '#/level/1-1');
  await page.waitForTimeout(300);
  await page.locator('.choice').first().click();
  await page.waitForSelector('.feedback');
  await page.getByRole('button', { name: /Next/ }).click();
  const dots = await page.locator('.round-dots span.ok, .round-dots span.no').count();
  assert.equal(dots, 1);
  const saved = await page.evaluate(() => JSON.parse(sessionStorage.getItem('motion-graphs-mastery.session.v1')).history.length);
  assert.equal(saved, 1);
  assert.deepEqual(errors, []);
  await page.close();
});

test('a whole level can be played to the stars screen, and Stage 2 then unlocks', async (t) => {
  if (skipIfNoBrowser(t)) return;
  const { page, errors } = await openPage(1280, false);
  for (const id of ['1-1', '1-2']) {
    await page.goto(base + '#/level/' + id);
    await page.waitForTimeout(250);
    for (let i = 0; i < 12; i++) {
      const choice = page.locator('.choice:not([disabled])').first();
      if (!(await choice.count())) break;
      await choice.click();
      const btn = page.getByRole('button', { name: /Next|Finish level/ });
      const label = await btn.innerText();
      await btn.click();
      if (/Finish/.test(label)) break;
    }
    await page.waitForSelector('.level-complete');
  }
  await page.goto(base + '#/learn');
  await page.waitForTimeout(250);
  const stage2Locked = await page.locator('.stage.locked .stage-num', { hasText: '2' }).count();
  assert.equal(stage2Locked, 0, 'Stage 2 should unlock after completing 2 of the 3 Stage 1 levels');
  assert.deepEqual(errors, []);
  await page.close();
});

test('Draw the Graph marks a sketch and Create the Motion runs a program', async (t) => {
  if (skipIfNoBrowser(t)) return;
  const { page, errors } = await openPage(1280, true);
  await page.goto(base + '#/level/3-4');
  await page.waitForTimeout(400);
  const canvas = page.locator('.graph-panel canvas').last();
  const box = await canvas.boundingBox();
  await page.mouse.move(box.x + 52, box.y + box.height / 2);
  await page.mouse.down();
  for (let x = 52; x < box.width - 10; x += 8) await page.mouse.move(box.x + x, box.y + box.height / 2 - x / 6);
  await page.mouse.up();
  await page.getByRole('button', { name: 'Check my graph' }).click();
  await page.waitForSelector('.feedback.ok, .feedback.no');

  await page.goto(base + '#/level/4-5');
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: '→ Forward' }).click();
  await page.getByRole('button', { name: '○ Coast' }).click();
  await page.getByRole('button', { name: /Run my program/ }).click();
  await page.waitForSelector('.feedback');
  assert.deepEqual(errors, []);
  await page.close();
});

test('Graph Detective reveals and marks a case', async (t) => {
  if (skipIfNoBrowser(t)) return;
  const { page, errors } = await openPage(1280, true);
  await page.goto(base + '#/detective/2');
  await page.waitForTimeout(400);
  const groups = page.locator('.case-file .segmented');
  const n = await groups.count();
  for (let i = 0; i < n; i++) await groups.nth(i).locator('button').first().click();
  await page.getByRole('button', { name: /reveal the motion/i }).click();
  await page.waitForSelector('.verdict');
  assert.ok((await page.locator('.case-file .stage-panel canvas').count()) >= 1);
  assert.deepEqual(errors, []);
  await page.close();
});

test('maths mode visibly changes the Gradient Explorer', async (t) => {
  if (skipIfNoBrowser(t)) return;
  const std = await openPage(1280, true, 'standard');
  await std.page.goto(base + '#/explore/gradient');
  await std.page.waitForTimeout(400);
  const stdChord = await std.page.locator('input[aria-label^="Width of the chord"]').isVisible();
  const stdText = await std.page.locator('main').innerText();
  const ext = await openPage(1280, true, 'extension');
  await ext.page.goto(base + '#/explore/gradient');
  await ext.page.waitForTimeout(400);
  const extChord = await ext.page.locator('input[aria-label^="Width of the chord"]').isVisible();
  const extText = await ext.page.locator('main').innerText();
  assert.equal(stdChord, false);
  assert.equal(extChord, true);
  assert.ok(!/ds\/dt/.test(stdText) && /ds\/dt/.test(extText));
  await std.page.close();
  await ext.page.close();
});

test('the teacher question bank generates a printable worksheet with graphs and answers', async (t) => {
  if (skipIfNoBrowser(t)) return;
  const { page, errors } = await openPage(1280, true);
  await page.goto(base + '#/teacher');
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'Generate worksheet' }).click();
  await page.waitForSelector('.worksheet img');
  assert.ok((await page.locator('.worksheet img').count()) >= 8);
  assert.match(await page.locator('.worksheet').innerText(), /Answers and worked solutions/);
  assert.deepEqual(errors, []);
  await page.close();
});

test('progress lives in sessionStorage only — never localStorage, cookies or the network', async (t) => {
  if (skipIfNoBrowser(t)) return;
  const { page } = await openPage(1280, false);
  const requests = [];
  page.on('request', (r) => requests.push(r.url()));
  await page.goto(base + '#/level/1-1');
  await page.waitForTimeout(300);
  await page.locator('.choice').first().click();
  const local = await page.evaluate(() => localStorage.length);
  const cookies = await page.context().cookies();
  assert.equal(local, 0);
  assert.equal(cookies.length, 0);
  assert.ok(requests.every((u) => u.startsWith('http://127.0.0.1')), 'only the site’s own files are requested');
  await page.close();
});

test('Air Resistance Lab: free-body diagram, presets, toggles and the quiz all work', async (t) => {
  if (skipIfNoBrowser(t)) return;
  const { page, errors } = await openPage(1280, true);
  await page.goto(base + '#/drag');
  await page.waitForTimeout(600);
  for (const name of ['Bullet fired up', 'Shuttlecock hit up', 'Skydiver jumps', 'Ball dropped from a tower', 'Ball thrown up']) {
    await page.getByRole('button', { name }).click();
    await page.waitForTimeout(250);
  }
  await page.getByRole('button', { name: 'Top' }).click();
  const label = await page.locator('canvas[aria-label^="Free-body diagram"]').getAttribute('aria-label');
  assert.match(label, /drag 0 newtons/);
  const comm = await page.locator('main .feedback').first().innerText();
  assert.match(comm, /At the top/);
  const tableBefore = await page.locator('.data-table').innerText();
  await page.locator('#drag-on').uncheck();
  await page.waitForTimeout(300);
  const tableAfter = await page.locator('.data-table').innerText();
  assert.notEqual(tableBefore, tableAfter);
  await page.goto(base + '#/drag/quiz');
  await page.waitForTimeout(400);
  for (let i = 0; i < 10; i++) {
    await page.locator('.choice:not([disabled])').first().click();
    await page.waitForSelector('canvas[aria-label^="Free-body diagram"]');
    const btn = page.getByRole('button', { name: /Next|Finish level/ });
    await btn.click();
  }
  await page.waitForSelector('.level-complete');
  assert.deepEqual(errors, []);
  await page.close();
});


test('Home opens on Explore freely; the stage map lives on the Learn page', async (t) => {
  if (skipIfNoBrowser(t)) return;
  const { page, errors } = await openPage(1280, false);
  await page.goto(base + '#/');
  await page.waitForTimeout(300);
  assert.equal(await page.locator('main h1').first().innerText(), 'Explore freely');
  assert.equal(await page.locator('main .stage').count(), 0, 'no stage map on home');
  assert.ok(await page.getByRole('link', { name: /Open the Motion Lab/ }).isVisible());
  assert.equal(await page.locator('.main-nav a[aria-current="page"]').innerText(), 'Explore');
  for (const n of ['Graph Detective', 'Misconception mode', 'Signs starter', 'Air resistance: predict first', 'Reconstruction lab']) assert.ok(await page.getByRole('link', { name: n }).isVisible(), n + ' should be on home');
  await page.getByRole('link', { name: 'All stages' }).click();
  await page.waitForSelector('main .stage');
  assert.equal(await page.locator('main .stage').count(), 6);
  assert.equal(await page.locator('.main-nav a[aria-current="page"]').innerText(), 'Learn');
  assert.deepEqual(errors, []);
  await page.close();
});
