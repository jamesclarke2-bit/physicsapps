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
    if (p.type === 'table') p.table.rows.forEach((r, ri) => p.table.cols.forEach((c, ci) => { if (c.kind === 'input') a[Q.cellKey(p, ri, ci)] = { v: String(+(+r.cells[ci]).toPrecision(4)) }; }));
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
  'q16.c': 'Background is always there and does not decay, so the reading never falls below background and takes longer to halve'
};
function withWritten(q, a) { q.parts.forEach(p => { if (p.type === 'written') a[p.id] = GOOD[q.id + '.' + p.id]; }); return a; }

test('there are 16 questions; every written part has a model answer and key ideas', () => {
  assert.equal(Q.questions.length, 16);
  Q.questions.forEach(q => q.parts.forEach(p => { if (p.type === 'written') { assert.ok(p.model && p.points.length); assert.ok(GOOD[q.id + '.' + p.id], q.id + p.id); } }));
});
test('model answers earn full marks on every question', () => {
  Q.questions.forEach(q => {
    const a = withWritten(q, fullAnswers(q));
    if (q.id === 'q14') { a.a1 = { v: '13', u: 'd' }; a.a2 = { v: '15', u: 'd' }; a.a3 = { v: '14', u: 'd' }; a.a4 = { v: '14', u: 'd' }; a.a5 = { v: '1', u: 'd' }; a.a6 = { v: '7.1', u: '%' }; }
    const r = Q.markQuestion(q, a); assert.equal(r.total, Q.questionMax(q), q.id + ' got ' + r.total + '/' + r.max + ' ' + JSON.stringify(r.parts));
  });
});
test('blank answers earn nothing', () => { Q.questions.forEach(q => assert.equal(Q.markQuestion(q, {}).total, 0, q.id)); });
test('nonsense written answers earn nothing', () => {
  [['q1', 'a'], ['q7', 'b'], ['q8', 'c'], ['q12', 'b'], ['q16', 'c']].forEach(([id, part]) => assert.equal(Q.markQuestion(byId(id), { [part]: 'I do not know' }).parts[part].marks, 0, id));
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
test('the 16 questions are worth the total shown on the README', () => { assert.equal(Q.totalMarks(), 70); });
