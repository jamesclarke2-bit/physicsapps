// Run with:  node --test half-life-isotopes/model.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const M = require('./model.js');
const Q = require('./questions.js');
const Sim = (() => { global.window = {}; require('../shared/sim.js'); return global.window.Sim; })();
const near = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} vs ${b}`);

/* ---------- model ---------- */
test('limiting cases: nothing gone at t = 0, half gone at one half-life, 1/8 after three', () => {
  near(M.fraction(0, 6), 1); near(M.fraction(6, 6), 0.5); near(M.fraction(18, 6), 0.125);
  assert.ok(M.fraction(1e6, 6) < 1e-12);
});
test('hand-checked values: 800 Bq of Tc-99m after 18 h is 100 Bq; Co-60 after 10 y is 27.0%; Tc-99m after 24 h is 6.25%', () => {
  near(M.after(800, 18, 6), 100); near(M.pctLeft(10, 'y', M.ISO.Co60), 27.04, 0.01); near(M.pctLeft(24, 'h', M.ISO.Tc99m), 6.25, 1e-9);
});
test('ln(N) against t is a straight line with gradient -ln2/T', () => {
  const ts = [0, 6, 12, 18, 24], ys = ts.map(t => Math.log(800 * M.fraction(t, 6)));
  const f = Sim.linfit(ts, ys); near(f.slope, -Math.LN2 / 6, 1e-12); near(f.r2, 1, 1e-12);
});
test('unit conversion and A = lambda N', () => {
  near(M.convert(2.5, 'd', 'h'), 60); near(M.convert(1, 'Gy', 'y'), 1e9, 1);
  near(M.lambdaPerSecond(M.ISO.Tc99m), Math.LN2 / 21600, 1e-15);
  const N = M.nucleiFromActivity(800, M.ISO.Tc99m); near(M.activityFromNuclei(N, M.ISO.Tc99m), 800, 1e-9);
});
test('equal numbers of nuclei: the shorter half-life has the higher activity (ratio = T_long / T_short)', () => {
  const x = M.make('custom', 2, 'h', 'X'), y = M.make('custom', 3, 'd', 'Y'), N = 1e12;
  near(M.activityFromNuclei(N, x) / M.activityFromNuclei(N, y), 36, 1e-9);
});
test('random decay: about half the sample is left at one half-life, and decay times are sorted', () => {
  const t = M.decayTimes(20000, 6, Sim.rng(3));
  for (let i = 1; i < t.length; i++) assert.ok(t[i] >= t[i - 1]);
  near(M.remainingAt(t, 6) / 20000, 0.5, 0.01); near(M.remainingAt(t, 18) / 20000, 0.125, 0.01);
  assert.equal(M.remainingAt(t, -1), 20000);
});
test('without background subtraction the successive halving times get longer (systematic error); with it they equal T', () => {
  const raw = M.exactHalvingTimes(1, 400, 20, false), net = M.exactHalvingTimes(1, 400, 20, true);
  net.forEach(v => near(v, 1, 1e-9));
  assert.ok(raw[0] > 1 && raw[1] > raw[0] && raw[2] > raw[1]);
  near(raw[0], 1.074, 0.001);
});
test('simulated halving readings: net readings average about T, raw readings are biased long', () => {
  let netSum = 0, rawSum = 0, runs = 600;
  for (let s = 1; s <= runs; s++) {
    const t = M.decayTimes(1000, 1, Sim.rng(s));
    netSum += M.mean(M.halvingReadings(t, 400, 20, true).readings); rawSum += M.mean(M.halvingReadings(t, 400, 20, false).readings);
  }
  near(netSum / runs, 1, 0.02); near(rawSum / runs, M.mean(M.exactHalvingTimes(1, 400, 20, false)), 0.05); assert.ok(rawSum / runs > 1.15, 'raw mean ' + rawSum / runs);
});
test('biggest source of error is the scatter of a small sample: median half-range of 3 readings is about 12% of T at 200 nuclei and falls as 1/sqrt(N)', () => {
  const med = N => { const hs = []; for (let s = 1; s <= 1200; s++) hs.push(M.halfRange(M.halvingReadings(M.decayTimes(N, 1, Sim.rng(s)), N, 0, true).readings)); hs.sort((a, b) => a - b); return hs[600]; };
  const m200 = med(200), m100 = med(100), m1000 = med(1000);
  assert.ok(m200 > 0.07 && m200 < 0.18, 'N=200 median half-range ' + m200);
  assert.ok(m100 / m1000 > 2.6 && m100 / m1000 < 3.8, 'ratio ' + m100 / m1000);
});
test('crossTime: the time to fall to half is the (N/2)th decay time', () => {
  const t = M.decayTimes(200, 1, Sim.rng(9)); assert.equal(M.crossTime(t, 0.5), t[99]); assert.equal(M.crossTime(t, 1), 0);
});

/* ---------- choosing the isotope ---------- */
test('jobs: the default targets pick the isotopes a teacher would expect', () => {
  const ids = s => M.passing(M.SCN[s]).sort().join(',');
  assert.equal(ids('tracer'), 'Tc99m'); assert.equal(ids('therapy'), 'I131'); assert.equal(ids('smoke'), 'Am241');
  assert.equal(ids('thickness'), 'Sr90'); assert.equal(ids('rtg'), 'Pu238'); assert.equal(ids('dating_organic'), 'C14');
  assert.equal(ids('leak'), 'I123,Na24'); assert.equal(ids('dating_rock'), 'K40,U238'); assert.equal(ids('radiotherapy'), 'Co60,Cs137');
});
test('jobs: each failing check says why, and changing a target changes the result', () => {
  const ck = M.evaluate(M.SCN.tracer, 'I131'); assert.ok(ck.some(c => c.key === 'type' && !c.ok) && ck.some(c => c.key === 'fade' && !c.ok));
  assert.ok(!M.passes(M.SCN.tracer, 'I123')); assert.ok(M.passes(M.SCN.tracer, 'I123', { fadeMax: 10 }));
  assert.ok(M.evaluate(M.SCN.smoke, 'Ra226').some(c => c.key === 'strong' && !c.ok));
});

/* ---------- marking ---------- */
const byId = Q.byId;
function fullAnswers(q) {
  const a = {};
  q.parts.forEach(p => {
    if (p.type === 'num') p.inputs.forEach(i => { if (i.ans !== null) a[i.id] = { v: String(+(+i.ans).toPrecision(4)), u: i.units ? i.units.find(u => u === i.ansUnit) ?? i.units[0] : i.ansUnit }; });
    if (p.type === 'table') p.table.rows.forEach((r, ri) => p.table.cols.forEach((c, ci) => { if (c.kind === 'input' && r.cells[ci] !== null) a[Q.cellKey(p, ri, ci)] = { v: String(+(+r.cells[ci]).toPrecision(4)) }; }));
    if (p.type === 'choice') a[p.id] = p.correct;
  });
  return a;
}
const GOOD = {
  'q1.a': 'The time taken for the activity of a sample to fall to half',
  'q1.b': 'You cannot predict which nucleus will decay or when, but for a large number of nuclei you can predict the proportion that decay',
  'q7.b': 'Alpha ionises the air and is stopped by paper or a few cm of air so it is safe',
  'q7.c': 'It has a long half-life of hundreds of years so it lasts for years',
  'q8.b': 'Gamma passes out of the body so the camera can detect it. Alpha and beta would be absorbed by the body',
  'q8.c': 'Long enough to carry out the scan but short enough that it decays quickly so the patient is not radioactive for long',
  'q10.b': 'After 9 half-lives 1/512 is left which is more than 1/1000',
  'q11.b': 'Its half-life is far too long so almost none will have decayed in 3000 years and the change is too small to measure',
  'q11.c': 'So many half-lives have passed that almost none is left',
  'q12.b': 'It falls quickly at first then more slowly. The technetium with the short half-life decays away quickly leaving the iodine which decays slowly',
  'q13.b': 'X has the shorter half-life so its nuclei decay more quickly, so more nuclei decay each second',
  'q15.b': 'The uncertainty of 1 hour is the same but B measured a longer time so it is a smaller percentage',
  'q16.c': 'Background is always there and does not decay, so the reading never falls below background and takes longer to halve',
  'q17.b': 'So only the background is detected. Radiation from the source would add to the count and make the background too high',
  'q17.c': 'The counts are random so they differ each time. Repeating lets me spot an anomaly and calculate a mean',
  'q18.c': 'B counted for longer so recorded more counts, so the random scatter is a smaller percentage of the total',
  'q20.d': 'The raw readings fall then level off at the background and never reach zero. The net count rate keeps halving towards zero because the background has been subtracted',
  'q21.c': 'The background is the same at every distance so it is in every reading. The raw readings do not fall by a factor of 4 but the net count rate does',
  'q22.c': 'Paper hardly changes the count rate so there is no alpha. Aluminium reduces it a lot so there is beta. Some still gets through the aluminium but lead stops it so there is gamma',
  'q19.d': 'Background is always present so it is in every reading. Forgetting it is a systematic error, the same in every reading, so repeating does not remove it. Subtract the mean background to get the net count rate'
};
function withWritten(q, a) { q.parts.forEach(p => { if (p.type === 'written') a[p.id] = GOOD[q.id + '.' + p.id]; }); return a; }

test('there are 22 questions; every written part has a model answer and key ideas', () => {
  assert.equal(Q.questions.length, 22);
  Q.questions.forEach(q => q.parts.forEach(p => { if (p.type === 'written') { assert.ok(p.model && p.points.length); assert.ok(GOOD[q.id + '.' + p.id], q.id + p.id); } }));
});
const E17 = { a1: { v: '28' }, a2: { v: '30' }, a3: { v: '33' }, a4: { v: '26' }, a5: { v: '32' }, a6: { v: '29.8' }, a7: { v: '3.5' }, a8: { v: '11.7', u: '%' } };
const E19 = { a1: { v: '48' }, a2: { v: '52' }, a3: { v: '50' }, a4: { v: '50' }, b1: { v: '1650' }, b2: { v: '150' }, b3: { v: '1600' }, b4: { v: '100' }, b5: { v: '4' }, b6: { v: '2', u: 'd' }, b7: { v: '2.31', u: 'd' }, c1: { v: '5' }, c2: { v: '10', u: 'd' } };
const E20 = { a1: { v: '38' }, a2: { v: '40' }, a3: { v: '42' }, a4: { v: '40' }, 'b.r0c0': { v: '1640' }, 'b.r0c1': { v: '1600' }, 'b.r1c0': { v: '840' }, 'b.r1c1': { v: '800' }, 'b.r2c0': { v: '440' }, 'b.r2c1': { v: '400' }, 'b.r3c0': { v: '240' }, 'b.r3c1': { v: '200' }, 'b.r4c0': { v: '140' }, 'b.r4c1': { v: '100' }, 'b.r5c0': { v: '90' }, 'b.r5c1': { v: '50' },
  c1: { v: '3' }, c2: { v: '2', u: 'd' }, c3: { v: '2.166', u: 'd' }, c4: { v: '8.3', u: '%' } };
test('model answers earn full marks on every question', () => {
  Q.questions.forEach(q => {
    const a = withWritten(q, fullAnswers(q));
    if (q.id === 'q14') { a.a1 = { v: '13', u: 'd' }; a.a2 = { v: '15', u: 'd' }; a.a3 = { v: '14', u: 'd' }; a.a4 = { v: '14', u: 'd' }; a.a5 = { v: '1', u: 'd' }; a.a6 = { v: '7.1', u: '%' }; }
    if (q.id === 'q17') Object.assign(a, E17);
    if (q.id === 'q19') Object.assign(a, E19);
    if (q.id === 'q20') Object.assign(a, E20);
    const r = Q.markQuestion(q, a); assert.equal(r.total, Q.questionMax(q), q.id + ' got ' + r.total + '/' + r.max + ' ' + JSON.stringify(r.parts));
  });
});
test('blank answers earn nothing', () => { Q.questions.forEach(q => assert.equal(Q.markQuestion(q, {}).total, 0, q.id)); });
test('nonsense written answers earn nothing', () => {
  [['q1', 'a'], ['q7', 'b'], ['q8', 'c'], ['q12', 'b'], ['q16', 'c'], ['q17', 'b'], ['q17', 'c'], ['q18', 'c'], ['q19', 'd'], ['q20', 'd'], ['q21', 'c'], ['q22', 'c']].forEach(([id, part]) => assert.equal(Q.markQuestion(byId(id), { [part]: 'I do not know' }).parts[part].marks, 0, id));
});
test('half-life is not "the time to decay completely": one mark and a note', () => {
  const r = Q.markQuestion(byId('q1'), { a: 'The time it takes for the sample to decay completely' }).parts.a;
  assert.equal(r.marks, 1); assert.ok(r.items.some(i => i.ok === 'note'));
});
test('numbers: any equivalent unit, standard form, fractions and percentages are accepted', () => {
  const q = byId('q10'); assert.equal(Q.markQuestion(q, { a1: { v: '10' }, a2: { v: '2.5', u: 'd' }, a3: { v: '80', u: 'd' } }).parts.a.marks, 3);
  assert.equal(Q.markQuestion(byId('q4'), { a1: { v: '3' }, a2: { v: '1/8', u: '' }, a3: { v: '12.5' } }).total, 3);
  assert.equal(Q.markQuestion(byId('q4'), { a1: { v: '3' }, a2: { v: '12.5%', u: '' }, a3: { v: '12.5%' } }).total, 3);
  assert.equal(Q.markQuestion(byId('q5'), { a1: { v: '2.5', u: 'd' }, a2: { v: '4' }, a3: { v: '0.06', u: 'kBq' } }).parts.a.inputs.a3.status, 'yes');
});
test('a wrong unit dimension does not score', () => {
  const r = Q.markQuestion(byId('q5'), { a1: { v: '60', u: 'min' }, a2: { v: '3' }, a3: { v: '120', u: 'Bq' } }).parts.a;
  assert.equal(r.inputs.a1.status, 'no'); assert.equal(r.inputs.a2.status, 'no');
});
test('follow-through: a wrong half-life count still earns the final mark if the working is consistent', () => {
  const r = Q.markQuestion(byId('q5'), { a1: { v: '60', u: 'h' }, a2: { v: '3' }, a3: { v: '120', u: 'Bq' } }).parts.a;
  assert.equal(r.inputs.a2.status, 'no'); assert.equal(r.inputs.a3.status, 'ecf'); assert.equal(r.marks, 2);
  const t = Q.markQuestion(byId('q2'), { 'a.r0c0': { v: '1' }, 'a.r0c1': { v: '400' }, 'a.r1c0': { v: '3' }, 'a.r1c1': { v: '100' }, 'a.r2c0': { v: '3' }, 'a.r2c1': { v: '100' }, 'a.r3c0': { v: '4' }, 'a.r3c1': { v: '50' } });
  assert.equal(t.parts.a.cells['a.r1c0'], 'no'); assert.equal(t.parts.a.cells['a.r1c1'], 'ecf'); assert.equal(t.parts.a.marks, 3);
});
test('a correct final answer with no working earns the working marks; groups stay separate', () => {
  const r = Q.markQuestion(byId('q5'), { a3: { v: '60', u: 'Bq' } }).parts.a; assert.equal(r.marks, 3);
  const q9 = Q.markQuestion(byId('q9'), { a2: { v: '15.9', u: 'y' } }).parts.a; assert.equal(q9.marks, 2);
});
test('background: raw readings used as if net are followed through, not ignored', () => {
  const r = Q.markQuestion(byId('q6'), { a1: { v: '420' }, a2: { v: '70' }, a3: { v: '2.585' }, a4: { v: '1.16', u: 'd' } }).parts.a;
  assert.equal(r.inputs.a1.status, 'no'); assert.equal(r.inputs.a3.status, 'ecf'); assert.equal(r.inputs.a4.status, 'ecf'); assert.equal(r.marks, 2);
});
test('your own readings are marked for the mean, half the range and percentage', () => {
  const a = { a1: { v: '12', u: 'd' }, a2: { v: '15', u: 'd' }, a3: { v: '16', u: 'd' }, a4: { v: '14.33', u: 'd' }, a5: { v: '2', u: 'd' }, a6: { v: '14', u: '%' } };
  const r = Q.markQuestion(byId('q14'), a); assert.equal(r.total, 4);
  a.a5 = { v: '4', u: 'd' }; assert.equal(Q.markQuestion(byId('q14'), a).parts.a.inputs.a5.status, 'no');
  assert.equal(Q.markQuestion(byId('q14'), { ...a, a1: { v: '1', u: 'd' } }).parts.a.items.filter(i => i.marks === 0 && i.ok === 'no').length >= 1, true);
});
test('claiming a missed written point is allowed and flagged', () => {
  const r = Q.markQuestion(byId('q7'), { b: 'It is safe', c: '' }, { 'q7.b.0': true }).parts.b; assert.ok(r.items.some(i => i.ok === 'self')); assert.equal(r.marks, 2);
});
test('the 22 questions are worth the total shown on the README', () => { assert.equal(Q.totalMarks(), 124); });

/* ---------- Geiger counter bench: background, repeating and counting time ---------- */
const CFG = { bg: 50, net0: 1600, unit: 'd', src: { iso: 'custom', T: 2, unit: 'd', name: 'Z' } };
test('bench: random counts have mean = variance (Poisson) and the right mean', () => {
  const r = Sim.rng(21); const a = Array.from({ length: 6000 }, () => M.poisson(30, r)); const m = a.reduce((x, y) => x + y) / a.length, v = a.reduce((x, y) => x + (y - m) ** 2, 0) / a.length;
  near(m, 30, 0.6); near(v, 30, 2.5); assert.equal(M.poisson(0, r), 0);
  const b = Array.from({ length: 3000 }, () => M.poisson(400, r)); near(b.reduce((x, y) => x + y) / b.length, 400, 2);
});
test('bench: true rate is background alone with the source away, and background plus the decaying net rate with it in place', () => {
  near(M.benchRate(CFG, false, 0), 50); near(M.benchRate(CFG, true, 0), 1650); near(M.benchRate(CFG, true, 8), 150); near(M.benchRate(CFG, false, 8), 50);
  near(M.toCpm(150, 300), 30);
});
test('bench: background readings scatter about the true value, so a single reading is not the background (why we repeat)', () => {
  const r = Sim.rng(5), cfg = { ...CFG, bg: 30 }, v = Array.from({ length: 5 }, () => M.benchCount(cfg, false, 0, 60, r));
  assert.ok(new Set(v).size > 1); assert.ok(v.every(x => x > 8 && x < 60));
});
test('bench: a longer count has a smaller percentage uncertainty (about 1/sqrt(5) for 5 times the time)', () => {
  const med = sec => { const out = []; for (let s = 1; s <= 600; s++) { const r = Sim.rng(s), v = Array.from({ length: 3 }, () => M.toCpm(M.benchCount({ ...CFG, bg: 30 }, false, 0, sec, r), sec)); out.push(M.halfRange(v) / M.mean(v)); } out.sort((a, b) => a - b); return out[300]; };
  const short = med(60), long = med(300); assert.ok(long < short * 0.6 && long > short * 0.3, `${short} ${long}`);
});
test('bench: forgetting to subtract the background gives a half-life that is too long; subtracting recovers it', () => {
  let rawBad = 0, ok = 0;
  for (let s = 1; s <= 200; s++) {
    const r = Sim.rng(s), cr = (src, d) => M.toCpm(M.benchCount(CFG, src, d, 300, r), 300), bg = M.mean([1, 2, 3].map(() => cr(false, 0))), r0 = cr(true, 0), r8 = cr(true, 8);
    const net = 8 / (Math.log((r0 - bg) / (r8 - bg)) / Math.LN2), raw = 8 / (Math.log(r0 / r8) / Math.LN2);
    if (Math.abs(net - 2) < 0.15) ok++; if (raw > 2.2) rawBad++;
  }
  assert.ok(ok > 190, 'corrected half-life close to 2 days: ' + ok); assert.ok(rawBad > 190, 'raw half-life too long: ' + rawBad);
});
test('why repeat: spotting anomalies, a mean and the spread earn marks; "repeating reduces the uncertainty" earns none and is corrected', () => {
  const q = Q.byId('q17');
  assert.equal(Q.markQuestion(q, { c: 'The counts are random so they differ each time. Repeating lets me spot an anomaly and calculate a mean.' }).parts.c.marks, 3);
  assert.equal(Q.markQuestion(q, { c: 'To get a mean.' }).parts.c.marks, 1);
  const bad = Q.markQuestion(q, { c: 'Repeating makes it more accurate and reduces the uncertainty.' }).parts.c;
  assert.equal(bad.marks, 0); assert.ok(bad.items.some(i => i.ok === 'note'));
});
test('why repeat (multiple choice): only the statement about spread, anomalies and a mean (and not removing a faulty method) is correct', () => {
  const q = Q.byId('q18'); assert.equal(Q.markQuestion(q, { b: 'b' }).parts.b.marks, 1);
  ['a', 'c', 'd'].forEach(o => assert.equal(Q.markQuestion(q, { b: o }).parts.b.marks, 0, o));
});
test('Q17: readings with the source still in place are told they are not background, but the mean is still followed through', () => {
  const q = Q.byId('q17'), a = { a1: { v: '820' }, a2: { v: '790' }, a3: { v: '805' }, a6: { v: '805' }, a7: { v: '15' }, a8: { v: '1.9', u: '%' } };
  const r = Q.markQuestion(q, a).parts.a; assert.equal(r.marks, 3); assert.ok(r.items.some(i => i.ok === 'no' && /not background/.test(i.text)));
  assert.equal(Q.markQuestion(q, { a1: { v: '28' }, a2: { v: '31' } }).parts.a.items.some(i => /at least three/.test(i.text)), true);
});
test('Q18: the 5-minute counts give a smaller percentage uncertainty than the 1-minute counts (computed from the given data)', () => {
  const q = Q.byId('q18'), inp = q.parts[0].inputs;
  assert.ok(inp[5].ans < inp[2].ans); near(inp[0].ans, 24.667, 0.001); near(inp[3].ans, 25, 1e-9); near(inp[5].ans, 5.2, 1e-9);
});
test('Q19: forgetting to subtract the background is followed through, and its half-life is flagged as too long', () => {
  const q = Q.byId('q19');
  const raw = { ...E19, b3: { v: '1650' }, b4: { v: '150' }, b5: { v: '3.46' }, b6: { v: '2.31', u: 'd' }, c1: { v: '5.4' }, c2: { v: '12.5', u: 'd' } };
  const r = Q.markQuestion(q, raw); assert.equal(r.parts.b.inputs.b3.status, 'no'); assert.equal(r.parts.b.inputs.b5.status, 'ecf'); assert.ok(r.parts.b.items.some(i => i.ok === 'no' && /looks wrong/.test(i.text)));
  assert.ok(r.total < Q.questionMax(q));
});

test('bench physics: inverse square, range of alpha, and absorbers stop the right radiation', () => {
  const cfg = s => ({ bg: 0, unit: 'd', src: M.BENCH_SOURCES[s] });
  near(M.benchNet(cfg('C'), 0, 10), 400); near(M.benchNet(cfg('C'), 0, 20), 100); near(M.benchNet(cfg('C'), 0, 40), 25);   // doubling the distance divides by 4
  assert.equal(M.benchNet(cfg('A'), 0, 10), 0); assert.ok(M.benchNet(cfg('A'), 0, 5) > 0); assert.equal(M.benchNet(cfg('B'), 0, 150), 0);
  ['paper', 'aluminium', 'lead'].forEach(a => assert.equal(M.benchNet(cfg('A'), 0, 5, a), 0));                          // alpha stopped by paper
  assert.ok(M.benchNet(cfg('B'), 0, 5, 'paper') > 0.85 * 1600); assert.ok(M.benchNet(cfg('B'), 0, 5, 'aluminium') < 0.05 * 1600); assert.equal(M.benchNet(cfg('B'), 0, 5, 'lead'), 0);   // beta: paper no, aluminium yes
  assert.ok(M.benchNet(cfg('C'), 0, 5, 'aluminium') > 0.85 * 1600); near(M.benchNet(cfg('C'), 0, 5, 'lead'), 160);       // gamma: lead reduces, never fully
  [1000, 940, 378, 40].forEach((v, k) => near(M.benchNet(cfg('D'), 0, 5, ['none', 'paper', 'aluminium', 'lead'][k]), v));
});
test('bench: the decay curve with background flattens at the background; the net curve keeps halving', () => {
  const c = { bg: 40, unit: 'd', src: M.BENCH_SOURCES.Z };
  [0, 2, 4, 6, 8, 10].forEach(t => near(M.benchRate(c, true, t) - M.benchRate(c, false, t), 1600 * Math.pow(0.5, t / 2), 1e-9));
  assert.ok(M.benchRate(c, true, 40) < 40.01 && M.benchRate(c, true, 40) > 40);
  const raw = t => M.benchRate(c, true, t); assert.ok(Math.abs(6 / Math.log2(raw(0) / raw(6)) - 2) > 0.1);  // without subtracting, half-life is wrong
});
test('Q21 and Q22 tables: raw readings are background plus net; net x d^2 is constant; D data match the model', () => {
  const t = Q.byId('q21').parts[0].table; t.rows.forEach(r => { near(r.cells[0] - r.cells[1], 30); near(r.cells[2], 40000); });
  const u = Q.byId('q22').parts[0].table; assert.deepEqual(u.rows.map(r => r.cells[0]), [1030, 970, 408, 70]);
});
test('Q20: forgetting the background is followed through and its half-life is longer; wrong net values are flagged', () => {
  const q = Q.byId('q20'), a = { ...E20 };
  [0, 1, 2, 3, 4, 5].forEach(r => { a['b.r' + r + 'c1'] = a['b.r' + r + 'c0']; });
  const r = Q.markQuestion(q, a); assert.equal(r.parts.b.cells['b.r0c1'], 'no'); assert.ok(r.parts.b.marks < 3);
  assert.equal(Q.markQuestion(q, withWritten(q, { ...E20 })).total, Q.questionMax(q));
});
