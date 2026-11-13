// Run with:  node --test projectile-motion/model.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const M = require('./model.js');
const E = require('./equations.js');
const Q = require('./questions.js');
const Sim = (() => { global.window = {}; require('../shared/sim.js'); return global.window.Sim; })();
const rel = (a, b) => Math.abs(a - b) / Math.max(Math.abs(b), 1e-9);

test('acceptance 1: simulated flight time, max height and range match closed form within 0.1% for 25 random inputs', () => {
  const r = Sim.rng(2026), rows = [];
  for (let i = 0; i < 25; i++) {
    const p = { u: 5 + 95 * r.next(), thetaDeg: 5 + 85 * r.next(), h0: -20 + 120 * r.next(), g: 1 + 19 * r.next() };
    const s = M.simulate(p, 0.001), c = M.summary(p);
    const e = { T: rel(s.flightTime, c.T), H: rel(s.maxHeight, c.H), R: c.R > 1e-9 ? rel(s.range, c.R) : Math.abs(s.range) };
    rows.push({ ...p, ...e });
    assert.ok(e.T < 1e-3 && e.H < 1e-3 && e.R < 1e-3, JSON.stringify({ p, s, c }));
  }
  const worst = k => Math.max(...rows.map(x => x[k]));
  console.log(`# 25 random launches: worst relative error T ${worst('T').toExponential(1)}, H ${worst('H').toExponential(1)}, R ${worst('R').toExponential(1)} (limit 1e-3)`);
});

test('hand-checked values (20 m/s at 45°, h0 = 0, g = 9.81)', () => {
  const s = M.summary({ u: 20, thetaDeg: 45, h0: 0, g: 9.81 });
  assert.ok(Math.abs(s.T - 2.883) < 1e-3);      // 2 x 14.142 / 9.81
  assert.ok(Math.abs(s.R - 40.775) < 1e-3);     // u^2 sin 2θ / g
  assert.ok(Math.abs(s.H - 10.194) < 1e-3);     // 14.142^2 / 19.62
});
test('limiting cases: vertical launch has no range, horizontal launch peaks at h0, 45° gives the longest range on flat ground', () => {
  assert.equal(M.range({ u: 20, thetaDeg: 90, h0: 0, g: 9.81 }), 0);
  assert.equal(M.maxHeight({ u: 20, thetaDeg: 0, h0: 30, g: 9.81 }), 30);
  assert.equal(M.timeToMax({ u: 20, thetaDeg: 0, h0: 30, g: 9.81 }), 0);
  const R = th => M.range({ u: 20, thetaDeg: th, h0: 0, g: 9.81 });
  assert.ok(R(45) > R(40) && R(45) > R(50));
  assert.equal(M.flightTime({ u: 0, thetaDeg: 0, h0: 0, g: 9.81 }), 0);
});
test('pit launch (h0 < 0): clears the pit when uy^2 + 2 g h0 >= 0, otherwise falls back to the pit floor', () => {
  const out = M.landing({ u: 30, thetaDeg: 60, h0: -20, g: 9.81 });
  assert.ok(out.pit && out.clearsPit && out.level === 0);
  const s = M.state({ u: 30, thetaDeg: 60, h0: -20, g: 9.81 }, out.t); assert.ok(Math.abs(s.y) < 1e-9 && s.vy < 0);
  const stuck = M.landing({ u: 10, thetaDeg: 60, h0: -20, g: 9.81 });
  assert.ok(stuck.pit && !stuck.clearsPit && stuck.level === -20);
});
test('independence: ux constant, ay = -g, horizontal speed does not change the fall time', () => {
  const p = { u: 25, thetaDeg: 35, h0: 10, g: 9.81 };
  const vx = [0, 0.5, 1, 2].map(t => M.state(p, t).vx), ay = [0, 0.5, 1, 2].map(t => M.state(p, t).ay);
  assert.ok(vx.every(v => v === vx[0])); assert.ok(ay.every(a => a === -9.81));
  assert.equal(M.flightTime({ u: 15, thetaDeg: 0, h0: 45, g: 9.81 }), M.flightTime({ u: 30, thetaDeg: 0, h0: 45, g: 9.81 }));
});
test('doubling u multiplies max height by 4 (prediction question)', () => {
  assert.ok(Math.abs(M.maxHeight({ u: 40, thetaDeg: 90, h0: 0, g: 9.81 }) / M.maxHeight({ u: 20, thetaDeg: 90, h0: 0, g: 9.81 }) - 4) < 1e-12);
});
test('collision hook: same point at the same time within 0.01 m', () => {
  const a = { u: 20, thetaDeg: 45, h0: 0, g: 9.81 };
  assert.ok(M.collide(a, { ...a }, 1));
  assert.ok(!M.collide(a, { ...a, h0: 0.02 }, 1));
});
test('Phase 1 refuses air resistance rather than silently ignoring it', () => {
  assert.throws(() => M.norm({ u: 10, thetaDeg: 10, h0: 0, g: 9.81, drag: true }));
});

test('acceptance 2 (model side): substitution text reproduces the live values', () => {
  const r = Sim.rng(5);
  for (let i = 0; i < 30; i++) {
    const p = { u: 100 * r.next(), thetaDeg: 90 * r.next(), h0: -20 + 120 * r.next(), g: 1 + 19 * r.next() };
    const t = M.flightTime(p) * r.next(), s = M.state(p, t), L = E.live(p, t);
    const y = E.stripTags(L.vertical.find(l => l.id === 'y').sub);
    // y = h0 + (uy × t) − 0.5 × g × (t²) = result m
    const m = y.match(/^y = \(?(−?[\d.]+)\)? \+ \(([\d.]+) × ([\d.]+)\) − 0\.5 × ([\d.]+) × \(([\d.]+)²\) = (−?[\d.]+) m$/);
    assert.ok(m, y);
    const n = m.slice(1).map(v => +v.replace('−', '-'));
    assert.equal(m[6], E.fmt(s.y), 'result equals the readout');
    assert.equal(m[3], E.fmt(s.t)); assert.equal(m[4], E.fmt(p.g)); assert.equal(m[2], E.fmt(M.norm(p).uy));
    const recomputed = n[0] + n[1] * n[2] - 0.5 * n[3] * n[4] * n[4];
    const bound = 0.005 * (1 + n[2] + n[1] + n[3] * n[4] + 0.5 * n[4] * n[4] + 0.01); // rounding of the shown values
    assert.ok(Math.abs(recomputed - n[5]) <= bound, `${y}: ${recomputed}`);
  }
});

test('questions: every numerical answer is a model quantity, every MCQ has a valid answer, every question has 4 support levels and a scaffold', () => {
  const ids = new Set();
  for (const q of Q.QUESTIONS) {
    assert.ok(!ids.has(q.id)); ids.add(q.id);
    assert.ok(Q.DIFFICULTY.includes(q.difficulty), q.id);
    assert.ok(['numerical', 'mcq', 'prediction'].includes(q.type));
    assert.equal(q.hints.length, 4, q.id); assert.ok(q.scaffold.length >= 2, q.id); assert.ok(q.markScheme.length >= 1, q.id);
    assert.ok(Q.SCENARIOS.some(s => s.id === q.scenario));
    if (q.type === 'numerical') { assert.ok(isFinite(Q.answerValue(q)) && q.tolerance > 0, q.id); assert.ok(Q.mark(q, Q.answerValue(q) * 1.015).correct); assert.ok(!Q.mark(q, Q.answerValue(q) * 1.03).correct); }
    else { assert.ok(q.options[q.answer] && q.options[q.answer].why === '', q.id); assert.ok(q.options.filter((o, i) => i !== q.answer).every(o => o.why), q.id); }
    for (const h of [q.hints[0], ...q.hints[1], ...q.hints[2], ...q.scaffold, ...q.markScheme]) assert.ok(!/\{\w+#?\}/.test(Q.fill(h, q.setup)), q.id + ': unfilled ' + h);
  }
});
test('scaffold steps guide without giving the numerical answer away', () => {
  for (const q of Q.QUESTIONS.filter(q => q.type === 'numerical')) {
    const ans = Q.answerValue(q).toFixed(2);
    q.scaffold.forEach(s => assert.ok(!Q.fill(s, q.setup).includes(ans), q.id));
    assert.ok(!Q.fill(q.hints[0], q.setup).includes(ans) && q.hints[1].every(h => !Q.fill(h, q.setup).includes(ans)), q.id);
  }
});
