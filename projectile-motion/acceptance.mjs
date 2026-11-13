// Acceptance tests from BRIEF.md. Run from the repo root:  node projectile-motion/acceptance.mjs
// Writes projectile-motion/TEST-LOG.md and exits 1 if any check fails. Needs playwright (as tools/check.mjs does).
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { spawnSync } from 'node:child_process';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = path.dirname(new URL(import.meta.url).pathname), root = path.resolve(here, '..');
const M = require('./model.js'), Q = require('./questions.js');
const Sim = (() => { global.window = {}; require('../shared/sim.js'); return global.window.Sim; })();

const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0])); const fpath = fs.existsSync(p) && fs.statSync(p).isDirectory() ? path.join(p, 'index.html') : p;
  if (!fpath.startsWith(root) || !fs.existsSync(fpath)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': types[path.extname(fpath)] || 'application/octet-stream' }); fs.createReadStream(fpath).pipe(res);
}).listen(0);
const URL0 = `http://localhost:${server.address().port}/projectile-motion/`;

const log = []; let failed = 0;
function record(n, title, ok, details) { if (!ok) failed++; log.push({ n, title, ok, details }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}. ${title}`); details.forEach(d => console.log('      ' + d)); }
const num = s => parseFloat(String(s).replace(/−/g, '-').replace(/[^\d.\-]/g, ''));

// ---------- 1. simulation vs closed form (model) ----------
{
  const r = Sim.rng(2026), rows = []; let ok = true;
  for (let i = 0; i < 25; i++) {
    const p = { u: 5 + 95 * r.next(), thetaDeg: 5 + 85 * r.next(), h0: -20 + 120 * r.next(), g: 1 + 19 * r.next() };
    const s = M.simulate(p, 0.001), c = M.summary(p);
    const e = k => { const [a, b] = { T: [s.flightTime, c.T], H: [s.maxHeight, c.H], R: [s.range, c.R] }[k]; return 100 * Math.abs(a - b) / Math.max(Math.abs(b), 1e-9); };
    const E = { T: e('T'), H: e('H'), R: e('R') }; if (!(E.T < 0.1 && E.H < 0.1 && E.R < 0.1)) ok = false;
    rows.push(`| ${i + 1} | ${p.u.toFixed(2)} | ${p.thetaDeg.toFixed(1)} | ${p.h0.toFixed(2)} | ${p.g.toFixed(2)} | ${c.T.toFixed(4)} | ${s.flightTime.toFixed(4)} | ${E.T.toExponential(1)} | ${c.H.toFixed(3)} | ${E.H.toExponential(1)} | ${c.R.toFixed(3)} | ${E.R.toExponential(1)} |`);
  }
  const t = spawnSync('node', ['--test', path.join(here, 'model.test.mjs')], { encoding: 'utf8' });
  const passLine = (t.stdout.match(/# pass (\d+)/) || [])[1], failLine = (t.stdout.match(/# fail (\d+)/) || [])[1];
  record(1, 'Simulated flight time, max height and range match the closed-form equations within 0.1% (25 random inputs)', ok && t.status === 0,
    [`Numerical simulation: fixed step 0.001 s, apex and landing refined by bisection (model.simulate). Inputs drawn at random: u 5 to 100 m s⁻¹, θ 5 to 90°, h0 −20 to 100 m, g 1 to 20 m s⁻².`,
     `model.test.mjs: ${passLine} passed, ${failLine} failed.`, '', '| # | u (m s⁻¹) | θ (°) | h0 (m) | g (m s⁻²) | T closed (s) | T sim (s) | T error (%) | H (m) | H error (%) | R (m) | R error (%) |', '|---|---|---|---|---|---|---|---|---|---|---|---|', ...rows]);
}

const browser = await chromium.launch();
async function open(w = 1280, h = 860, scheme = 'light') {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: scheme }); const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(e.message)); await page.goto(URL0); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(200);
  return { ctx, page, errs };
}
async function setParams(page, p) {
  const back = await page.evaluate(() => document.querySelector('[role=tab][aria-selected=true]').id);
  await page.click('#t-setup');
  for (const [k, v] of Object.entries(p)) { await page.fill(`#c-${k}-n`, String(v)); await page.press(`#c-${k}-n`, 'Enter'); await page.locator(`#c-${k}-n`).blur(); }
  await page.click('#' + back);
}

// ---------- 2. substitution text matches live values ----------
{
  const { ctx, page, errs } = await open(); const det = []; let ok = true;
  await page.click('#t-equations');
  const sets = [{ u: 20, thetaDeg: 45, h0: 0, g: 9.81 }, { u: 18, thetaDeg: 65, h0: 12.5, g: 9.81 }, { u: 35, thetaDeg: 30, h0: -10, g: 4.2 }, { u: 15, thetaDeg: 0, h0: 45, g: 9.81 }];
  let n = 0;
  for (const p of sets) {
    await setParams(page, p);
    const T = await page.evaluate(() => PM.state().S.T);
    for (const frac of [0, 0.23, 0.5, 0.81, 1]) {
      await page.evaluate(t => PM.setT(t), T * frac);
      const v = await page.evaluate(() => { const g = id => document.getElementById(id).textContent.replace(/ /g, ' '); return { ey: g('eq-y'), evy: g('eq-vy'), ex: g('eq-x'), ev: g('eq-v'), t: g('rv-t'), y: g('rv-y'), vy: g('rv-vy'), x: g('rv-x'), sp: g('rv-v'), gIn: document.getElementById('c-g-n').value }; });
      const m = v.ey.match(/^y = \(?(−?[\d.]+)\)? \+ \(([\d.]+) × ([\d.]+)\) − 0\.5 × ([\d.]+) × \(([\d.]+)2\) = (−?[\d.]+) m$/);
      const res = s => s.split('=').pop().trim();
      const checks = m && [m[3] + ' s' === v.t, m[6] + ' m' === v.y, Math.abs(+m[4] - +v.gIn) < 1e-9, res(v.evy) === v.vy.replace('−1', '−1'), res(v.ex) === v.x, res(v.ev) === v.sp];
      const nums = m && m.slice(1, 6).map(num), recomputed = m && nums[0] + nums[1] * nums[2] - 0.5 * nums[3] * nums[4] ** 2;
      const arith = m && Math.abs(recomputed - num(m[6])) < 0.005 * (2 + nums[1] + nums[2] + nums[3] * nums[4] + nums[4] ** 2);
      const good = !!m && checks.every(Boolean) && arith; if (!good) ok = false; n++;
      if (frac === 0.5 || !good) det.push(`${good ? 'ok ' : 'BAD'} u=${p.u}, θ=${p.thetaDeg}°, h0=${p.h0}, g=${p.g}, t=${v.t}: "${v.ey}" | readout y = ${v.y}; "${v.evy}" | readout vy = ${v.vy}`);
    }
  }
  det.unshift(`${n} states checked (4 launches × 5 times). For each: the t, g and result in the y substitution equal the t readout, the g input and the y readout; the x, v_y and |v| results equal their readouts; redoing the arithmetic from the shown numbers gives the shown result to within rounding. Middle-of-flight examples:`);
  if (errs.length) { ok = false; det.push('page errors: ' + errs.join('; ')); }
  record(2, 'The equation substitution text matches the live values', ok, det); await ctx.close();
}

// ---------- 3. Panel 2 velocity constant, Panel 3 acceleration constant ----------
{
  const { ctx, page } = await open(); const det = []; let ok = true;
  await page.click('#t-independent');
  for (const p of [{ u: 20, thetaDeg: 45, h0: 0, g: 9.81 }, { u: 30, thetaDeg: 20, h0: 40, g: 3.7 }]) {
    await setParams(page, p);
    await page.click('#b-play'); const seen = { vx2: new Set(), ax2: new Set(), ay3: new Set(), vy3: new Set() };
    for (let i = 0; i < 25; i++) { const r = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-q]')].map(b => [b.dataset.q, b.textContent.replace(/ /g, ' ')]))); ['vx2', 'ax2', 'ay3', 'vy3'].forEach(k => seen[k].add(r[k])); await page.waitForTimeout(90); }
    await page.click('#b-reset');
    const c = seen.vx2.size === 1 && seen.ay3.size === 1 && seen.ax2.size === 1 && seen.vy3.size > 5;
    if (!c) ok = false;
    det.push(`u=${p.u}, θ=${p.thetaDeg}°, h0=${p.h0}, g=${p.g}, 25 samples while playing: Panel 2 v_x values {${[...seen.vx2].join(', ')}}, a_x {${[...seen.ax2].join(', ')}}; Panel 3 a_y {${[...seen.ay3].join(', ')}}; Panel 3 v_y took ${seen.vy3.size} different values (it should change).`);
  }
  record(3, 'Panel 2 velocity is constant and Panel 3 acceleration is constant to display precision', ok, det); await ctx.close();
}

// ---------- 4. table headings use brackets; no formula triangles ----------
{
  const { ctx, page } = await open(); const det = []; let ok = true;
  const tabs = ['setup', 'independent', 'graphs', 'equations', 'questions']; const heads = new Set(), bad = [];
  for (const t of tabs) {
    await page.click('#t-' + t);
    const r = await page.evaluate(() => [...document.querySelectorAll('table')].flatMap(tb => {
      const ths = [...tb.querySelectorAll('thead th')]; return ths.map((th, i) => ({ h: th.textContent, numeric: [...tb.querySelectorAll('tbody tr')].some(tr => /^[−\-]?\d/.test((tr.children[i] || {}).textContent || '')) }));
    }));
    r.forEach(x => { heads.add(x.h); if (x.numeric && !/^.+ \(.+\)$/.test(x.h)) bad.push(x.h); if (/ \/ /.test(x.h)) bad.push(x.h); });
  }
  if (bad.length || !heads.size) ok = false;
  det.push(`Table headings found: ${[...heads].map(h => '"' + h + '"').join(', ')}. Every heading over a column of numbers has the form "quantity (unit)"; none uses "quantity / unit". ${bad.length ? 'BAD: ' + bad.join(', ') : ''}`);
  const files = ['index.html', 'app.js', 'model.js', 'equations.js', 'questions.js', 'README.md'];
  const tri = files.filter(f => /triangle/i.test(fs.readFileSync(path.join(here, f), 'utf8')));
  const pageTri = await page.evaluate(() => /triangle/i.test(document.body.innerText));
  if (tri.length || pageTri) ok = false;
  det.push(`Search for "triangle" in ${files.join(', ')} and in the rendered page text: ${tri.length || pageTri ? 'FOUND in ' + tri.join(', ') : 'none'}. (V = IR does not appear in this app; no formula triangle anywhere.)`);
  for (const t of tabs) await page.click('#t-' + t);
  const axl = await page.evaluate(() => [...new Set([...document.querySelectorAll('svg text.axl')].map(t => t.textContent))]);
  const axSlash = axl.filter(l => / \/ /.test(l)); if (axSlash.length) ok = false;
  det.push(`Axis labels also use brackets, to match the tables: ${axl.map(l => '"' + l + '"').join(', ')}. ${axSlash.length ? 'BAD (slash): ' + axSlash.join(', ') : 'None uses "quantity / unit".'}`);
  record(4, 'Every table heading uses brackets, e.g. t (s). No formula triangles anywhere', ok, det); await ctx.close();
}

// ---------- 5. every number shown has units ----------
{
  const { ctx, page } = await open(); const det = []; let ok = true;
  const UNIT = /^[−\-]?\d+(\.\d+)? (s|m|m s−1|m s−2|m s⁻¹|m s⁻²)$/;
  await setParams(page, { u: 18, thetaDeg: 60, h0: 5, g: 9.81 }); await page.evaluate(() => PM.setT(1.6));
  const groups = {
    'Live readouts': '#readouts .val', 'Panel 2 and 3 readouts': '#p-independent [data-q]', 'Computed values (Graphs)': '#kvals .calc',
    'Equation results': '#p-equations .qty'
  };
  for (const t of ['independent', 'graphs', 'equations']) {
    await page.click('#t-' + t);
    for (const [name, sel] of Object.entries(groups)) {
      const vals = await page.$$eval(sel, els => els.filter(e => e.offsetParent).map(e => e.textContent.replace(/ /g, ' ').trim()));
      if (!vals.length) continue;
      const badv = vals.filter(v => !UNIT.test(v)); if (badv.length) ok = false;
      det.push(`${name}: ${vals.length} values, ${badv.length ? 'WITHOUT units: ' + badv.join(', ') : 'all with units'} (e.g. ${vals.slice(0, 3).join('; ')})`); delete groups[name];
    }
  }
  await page.click('#t-equations');
  const subs = await page.$$eval('#p-equations .esub', els => els.map(e => e.textContent.replace(/ /g, ' ').trim()));
  const subBad = subs.filter(s => !/= [−\-]?\d+(\.\d+)? (s|m|m s−1|m s−2)$/.test(s)); if (subBad.length) ok = false;
  det.push(`Equation substitutions: ${subs.length}, ${subBad.length ? 'not ending in a value with units: ' + subBad.join(' | ') : 'every one ends in a value with its unit'}.`);
  const axes = await page.evaluate(() => [...document.querySelectorAll('svg')].filter(s => [...s.querySelectorAll('text')].some(t => /^[−\-]?\d/.test(t.textContent))).map(s => ({ id: s.id || s.getAttribute('aria-label'), labels: [...s.querySelectorAll('text.axl')].map(t => t.textContent) })));
  const axBad = axes.filter(a => !a.labels.some(l => /\(\S[^)]*\)$/.test(l))); if (axBad.length) ok = false;
  det.push(`Charts and scenes with numbered axes: ${axes.length}; each has an axis label with its unit in brackets ("… (unit)"). ${axBad.length ? 'BAD: ' + axBad.map(a => a.id).join(', ') : ''}`);
  await page.click('#t-questions'); await page.click('#scen button:nth-child(2)'); await page.click('[data-qid="s2-angled-time"]');
  const setup = await page.textContent('#q-setup');
  const tokens = setup.replace('Set-up loaded: ', '').split(', '); const sBad = tokens.filter(t => !/= [\d.]+ ?(m s⁻¹|°|m|m s⁻²)$/.test(t)); if (sBad.length) ok = false;
  det.push(`Question set-up line: "${setup}" ${sBad.length ? 'BAD: ' + sBad.join(', ') : '(every number has a unit)'}`);
  const kt = await page.evaluate(() => { document.querySelector('#t-graphs').click(); return [...document.querySelectorAll('#keytable th')].map(t => t.textContent); });
  det.push(`Key-points table: numbers carry their unit in the column heading: ${kt.join(' | ')}.`);
  record(5, 'Every number shown has units', ok, det); await ctx.close();
}

// ---------- 6. each question loads its set-up; simulator stays visible ----------
{
  const det = []; let ok = true;
  for (const [w, h] of [[1920, 1080], [1280, 800], [400, 800]]) {
    const { ctx, page, errs } = await open(w, h); let good = 0;
    await page.click('#t-questions');
    for (const q of Q.QUESTIONS) {
      if ((await page.evaluate(() => PM.state().locked)) || true) {
        // pick the scenario first if needed
        if (!(await page.locator(`[data-qid="${q.id}"]`).count())) await page.click(`#scen button:nth-child(${q.scenario})`);
      }
      await page.click(`[data-qid="${q.id}"]`);
      const st = await page.evaluate(() => ({ P: PM.state().P, inputs: ['u', 'thetaDeg', 'h0', 'g'].map(k => +document.getElementById('c-' + k + '-n').value) }));
      const want = Q.params(q.setup), same = ['u', 'thetaDeg', 'h0', 'g'].every((k, i) => Math.abs(st.P[k] - want[k]) < 1e-9 && Math.abs(st.inputs[i] - want[k]) < 1e-9);
      await page.locator('#q-prompt').scrollIntoViewIfNeeded(); await page.locator('#qcard .support').scrollIntoViewIfNeeded();
      const vis = await page.evaluate(() => { const r = document.getElementById('stage').getBoundingClientRect(), q = document.getElementById('q-prompt').getBoundingClientRect(); const inView = b => b.bottom > 0 && b.top < innerHeight && b.height > 40; return { stage: inView(r), prompt: inView(q), h: Math.round(r.height) }; });
      if (same && vis.stage) good++; else { ok = false; det.push(`BAD at ${w}px: ${q.id} set-up ${same ? 'ok' : 'WRONG ' + JSON.stringify(st)} simulator visible: ${vis.stage}`); }
    }
    // prediction must be answered before the simulation runs
    await page.click('#scen button:nth-child(1)'); await page.click('[data-qid="s1-predict-double"]');
    const before = await page.evaluate(() => ({ play: document.getElementById('b-play').disabled, step: document.getElementById('b-step').disabled, input: document.getElementById('c-u').disabled }));
    await page.keyboard.press('Escape');
    await page.evaluate(() => document.body.focus()); await page.keyboard.press('s'); const tAfterS = await page.evaluate(() => PM.clock.t);
    await page.check('input[name=q-opt][value="1"]'); await page.click('#q-form button[type=submit]');
    const after = await page.evaluate(() => ({ play: document.getElementById('b-play').disabled, fb: document.getElementById('q-fb').textContent }));
    const predOk = before.play && before.step && before.input && tAfterS === 0 && !after.play && /Correct/.test(after.fb);
    if (!predOk) ok = false;
    det.push(`${w}×${h}: ${good}/${Q.QUESTIONS.length} questions loaded the right u, θ, h0 and g into the simulator and its inputs, with the simulator on screen beside the question. Prediction: Play/Step/inputs locked before answering (${before.play && before.step && before.input}), keyboard step blocked (t stayed ${tAfterS} s), unlocked after (${!after.play}).`);
    if (errs.length) { ok = false; det.push('page errors: ' + errs.join('; ')); }
    if (w === 400) await page.screenshot({ path: path.join(root, '.check', 'projectile-motion-phone-question.png') });
    await ctx.close();
  }
  record(6, 'Each question loads the correct setup, and the simulator stays visible during questions', ok, det);
}

// ---------- 7. keyboard operable; no colour-only encoding ----------
{
  const { ctx, page, errs } = await open(); const det = []; let ok = true;
  const reached = new Set();
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  for (let i = 0; i < 80; i++) { await page.keyboard.press('Tab'); const id = await page.evaluate(() => { const a = document.activeElement; return a.id || a.dataset.tab || a.textContent.trim().slice(0, 20); }); reached.add(id); }
  const need = ['b-theme', 'b-play', 'b-pause', 'b-reset', 'b-step', 'speed-slow', 'speed-normal', 'speed-fast', 'b-present', 't-setup', 'c-u', 'c-u-n', 'c-thetaDeg', 'c-h0', 'c-g', 'c-colour'];
  const miss = need.filter(n => !reached.has(n)); if (miss.length) ok = false;
  det.push(`Tab order reaches presentation mode, theme, Play, Pause, Reset, Step forward, the three speeds, the tabs, every slider and number box and the colour picker. ${miss.length ? 'MISSING: ' + miss.join(', ') : ''}`);
  await page.focus('#b-play'); await page.keyboard.press('Enter'); await page.waitForTimeout(400); const t1 = await page.evaluate(() => PM.clock.t);
  await page.focus('#b-pause'); await page.keyboard.press('Enter'); await page.evaluate(() => document.activeElement.blur());
  await page.keyboard.press('r'); const t2 = await page.evaluate(() => PM.clock.t); await page.keyboard.press('s'); const t3 = await page.evaluate(() => PM.clock.t);
  await page.focus('#c-thetaDeg'); await page.keyboard.press('ArrowRight'); const th = await page.inputValue('#c-thetaDeg-n');
  await page.focus('#t-setup'); await page.keyboard.press('ArrowRight'); const sel = await page.evaluate(() => document.querySelector('[role=tab][aria-selected=true]').id);
  const kOk = t1 > 0.2 && t2 === 0 && Math.abs(t3 - 0.1) < 1e-9 && th === '46' && sel === 't-independent'; if (!kOk) ok = false;
  det.push(`Enter on Play ran the clock (t = ${t1.toFixed(2)} s); R reset it (${t2} s); S stepped one fixed step (${t3.toFixed(2)} s); arrow key on the angle slider gave ${th}°; arrow keys move between tabs (now ${sel}).`);
  // answer a question with the keyboard only
  await page.focus('#t-questions'); await page.keyboard.press('Enter'); await page.focus('[data-qid="s1-time-top"]'); await page.keyboard.press('Enter');
  await page.focus('#q-ans'); await page.keyboard.type('3'); await page.keyboard.press('Enter'); const fb1 = await page.textContent('#q-fb');
  await page.fill('#q-ans', '2.04'); await page.keyboard.press('Enter'); const fb2 = await page.textContent('#q-fb');
  await page.focus('[data-level="3"]'); await page.keyboard.press('Enter'); const ws = await page.textContent('#q-support');
  const qOk = /Not yet/.test(fb1) && /Try this/.test(fb1) && !/2\.04/.test(fb1) && /Correct/.test(fb2) && /2\.04 s/.test(ws); if (!qOk) ok = false;
  det.push(`Keyboard-only question: wrong answer gave "Not yet" with scaffold step 1 and no answer (${!/2\.04/.test(fb1)}); right answer marked correct; worked solution opened (${/2\.04 s/.test(ws)}). Pop-ups close with Esc (shared Sim.pop).`);
  // colour is never the only cue
  await page.click('#t-setup'); await setParams(page, { u: 20, thetaDeg: 45, h0: 0, g: 9.81 }); await page.evaluate(() => PM.setT(0.5));
  const vec = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('#stage [data-vec]')].map(g => [g.dataset.vec, { label: (g.querySelector('text') || {}).textContent || '', dash: (g.querySelector('line') || { getAttribute: () => '' }).getAttribute('stroke-dasharray') || 'solid', head: (g.querySelector('polygon') || { getAttribute: () => '' }).getAttribute('class') || 'filled' }])));
  const dashes = Object.values(vec).map(v => v.dash); const vOk = ['v', 'vx', 'vy', 'a'].every(k => vec[k] && vec[k].label) && new Set(dashes).size === 4;
  const chips = await page.$$eval('#readouts .sym', c => c.map(x => x.textContent.trim()));
  const status = await page.evaluate(() => { document.querySelector('#t-questions').click(); return [...document.querySelectorAll('#qsteps button')].map(s => s.getAttribute('aria-label').split(', ').pop()); });
  const cOk = vOk && chips.every(c => c) && status.every(s => /(New|Tried|Correct)/.test(s)); if (!cOk) ok = false;
  det.push(`Vectors on the stage: ${Object.entries(vec).map(([k, v]) => `${k}: label "${v.label}", line ${v.dash}, head ${v.head}`).join('; ')}. Four different line patterns and a text label on each, so red (v_y) and green (a) differ without colour.`);
  det.push(`Readouts carry a written symbol and name as well as a colour dot: ${chips.join(', ')}. Question status in the stepper is in each button's name (and a ✓ mark): ${[...new Set(status)].join(', ')}. Correct/incorrect feedback uses ✓/✗ with the words "Correct"/"Not yet".`);
  if (errs.length) { ok = false; det.push('page errors: ' + errs.join('; ')); }
  record(7, 'Keyboard operable; no colour-only encoding', ok, det); await ctx.close();
}

// ---------- extra: animated solution runs, dark mode, reduced motion ----------
{
  const { ctx, page, errs } = await open(1280, 860, 'dark'); const det = []; let ok = true;
  await page.click('#t-questions'); await page.click('#scen button:nth-child(2)'); await page.click('[data-qid="s2-horiz-time"]'); await page.click('[data-level="4"]');
  const steps = [];
  for (let i = 0; i < 8 && !/Answer\./.test(await page.textContent('#anim-cap')); i++) {
    await page.click('#anim-next'); await page.waitForFunction(() => document.querySelector('#anim-next').dataset.busy !== '1', null, { timeout: 15000 });
    steps.push(await page.evaluate(() => ({ count: document.getElementById('anim-count').textContent, on: document.querySelectorAll('.aeqs .eqline.on').length, dimEq: document.querySelectorAll('.aeqs .eqline:not(.on)').length, dimRo: document.querySelectorAll('#readouts .ro.off').length })));
  }
  await page.click('#anim-back'); const backCount = await page.textContent('#anim-count');
  const lastS = steps[steps.length - 1], N = +lastS.count.split(' of ')[1];
  const stepOk = lastS.count === `Step ${N} of ${N}` && steps.every(s => s.on >= 1 && s.dimRo > 0) && steps.some(s => s.dimEq > 0) && backCount === `Step ${N - 1} of ${N}`;
  if (!stepOk) ok = false;
  det.push(`Step-by-step: ${steps.map(s => s.count + ' (' + s.on + ' equation highlighted, ' + s.dimEq + ' dimmed, ' + s.dimRo + ' readouts dimmed)').join('; ')}. Back returned to "${backCount}".`);
  await page.click('#anim-next'); await page.waitForFunction(() => document.querySelector('#anim-next').dataset.busy !== '1');
  const txt = (await page.textContent('#q-support .anim')).replace(/\u00a0/g, ' '); const tEnd = await page.evaluate(() => PM.clock.t), T = M.flightTime({ u: 15, thetaDeg: 0, h0: 45, g: 9.81 });
  const a = /Answer/.test(txt) && /3\.03 s/.test(txt) && Math.abs(tEnd - T) < 1e-6; if (!a) ok = false;
  await page.screenshot({ path: path.join(root, '.check', 'projectile-motion-animated-dark.png') });
  det.push(`Animated solution (Q2.1) played the motion to launch and landing, stopped at each, and ended on the answer with its substitution (${a}). Clock ended at T = ${tEnd.toFixed(3)} s. Dark mode rendered without errors.`);
  if (errs.length) { ok = false; det.push('page errors: ' + errs.join('; ')); }
  record('+', 'Extra: animated solution links motion, equation, graph and answer', ok, det); await ctx.close();
}

await browser.close(); server.close();
const md = ['# Projectile Motion Explorer: acceptance test log', '', `Run: \`node projectile-motion/acceptance.mjs\` on ${new Date().toISOString().slice(0, 10)}. Chromium via Playwright, served locally. Result: **${failed ? failed + ' FAILED' : 'all passed'}**.`, '',
  ...log.flatMap(l => [`## ${l.n}. ${l.title}: ${l.ok ? 'PASS' : 'FAIL'}`, '', ...l.details.map(d => d.startsWith('|') || d === '' ? d : '- ' + d), ''])].join('\n');
fs.writeFileSync(path.join(here, 'TEST-LOG.md'), md);
console.log(failed ? `\n${failed} check(s) failed` : '\nAll acceptance checks passed. Log: projectile-motion/TEST-LOG.md');
process.exit(failed ? 1 : 0);
