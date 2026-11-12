// node --test ramp-practical/model.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const M = require('./model.js');
global.window = {}; require('../shared/sim.js'); const Sim = global.window.Sim;
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, (msg || '') + ` ${a} vs ${b}`);
const rad = d => d * Math.PI / 180;

test('hand-checked value: a at 10 degrees = g (sin 10 - mu cos 10)', () => {
  near(M.accel(10), 9.81 * (Math.sin(rad(10)) - 0.011 * Math.cos(rad(10))), 1e-12);
  near(M.accel(10), 1.59722, 1e-5);
});
test('limiting cases: no motion on a very gentle slope; friction always lowers a', () => {
  assert.equal(M.moves(0.7), false); assert.equal(M.moves(0.9), true);
  assert.equal(M.measureTime(0.5, 1, 'video', Sim.rng(1)), null);
  for (const th of [1, 3, 6, 10, 20]) assert.ok(M.accel(th) < M.ideal(th));
  near(M.frictionPct(10), 100 * 0.011 / Math.tan(rad(10)), 1e-9);
});
test('from rest: t^2 and v^2 are both proportional to s, gradients 2/a and 2a (product 4), intercepts zero', () => {
  const th = 8, a = M.accel(th), ss = [0.4, 0.6, 0.8, 1.0, 1.2, 1.4, 1.6];
  const ft = Sim.linfit(ss, ss.map(s => M.timeFor(th, s) ** 2)), fv = Sim.linfit(ss, ss.map(s => M.speedFor(th, s) ** 2));
  near(ft.slope, 2 / a, 1e-9); near(fv.slope, 2 * a, 1e-9); near(ft.slope * fv.slope, 4, 1e-9);
  near(ft.intercept, 0, 1e-9); near(fv.intercept, 0, 1e-9);
  near(M.aFromT(1, M.timeFor(th, 1)), a, 1e-9); near(M.aFromV(1, M.speedFor(th, 1)), a, 1e-9);
});
test('friction does not spoil v^2 against s: a from the gradient is below g sin(theta) but the line is still straight through the origin', () => {
  const th = 8, ss = [0.4, 1.0, 1.6], f = Sim.linfit(ss, ss.map(s => M.speedFor(th, s) ** 2));
  assert.ok(f.slope / 2 < M.ideal(th) * 0.95); near(f.r2, 1, 1e-12);
});
test('a against sin(theta): gradient close to g, NEGATIVE intercept about -mu g (the systematic error)', () => {
  const ths = [3, 6, 9, 12, 15, 18], f = Sim.linfit(ths.map(t => Math.sin(rad(t))), ths.map(M.accel));
  near(f.slope, 9.81, 9.81 * 0.015); assert.ok(f.intercept < -0.09 && f.intercept > -0.13, 'intercept ' + f.intercept);
});
test('a bigger angle has a smaller % uncertainty in sin(theta); trigonometry beats the protractor', () => {
  let prev = Infinity;
  for (const d of [2, 4, 8, 12, 20]) { const p = M.sinPct(d, 'protractor', 2); assert.ok(p < prev); prev = p; }
  for (const ell of [1, 2, 3]) for (const d of [2, 5, 10, 20]) assert.ok(M.sinPct(d, 'trig', ell) < M.sinPct(d, 'protractor', ell) / 10);
  near(Math.cos(rad(7)) * rad(M.angleUncDeg(7, 'trig', 2)), 0.0005 / 2, 1e-12);
  near(M.sinPct(6, 'protractor', 2), 100 * Math.cos(rad(6)) * rad(0.5) / Math.sin(rad(6)), 1e-9);
});
test('longer runs have a smaller % uncertainty (stopwatch and video); the gate is about 2% whatever you do', () => {
  for (const timer of ['stopwatch', 'video']) { let prev = Infinity; for (const s of [0.4, 0.8, 1.2, 1.8, 2.8]) { const u = M.accelUncPct(8, s, timer); assert.ok(u < prev, timer + ' ' + s); prev = u; } }
  for (const th of [3, 8, 20]) for (const s of [0.4, 1, 2]) near(M.accelUncPct(th, s, 'gate'), 2, 0.2);
  assert.ok(M.accelUncPct(8, 1, 'video') < M.accelUncPct(8, 1, 'stopwatch'));
});
test('design trade-off: the stopwatch only reaches 5% on the longest ramp at a small angle, where friction is a big fraction of the slope force', () => {
  assert.ok(M.accelUncPct(8, 1, 'stopwatch') > 5);
  assert.ok(M.accelUncPct(4, 2.8, 'stopwatch') < 5 && M.frictionPct(4) > 5);
  assert.equal(M.longEnough(20, 0.4, 'stopwatch'), false); assert.equal(M.longEnough(4, 2.8, 'stopwatch'), true); assert.equal(M.longEnough(20, 0.4, 'gate'), true);
});
test('median half-range of 3 readings is about the biggest source (video time, light-gate speed)', () => {
  const r = Sim.rng(11), th = 6, s = 1.0, ht = [], hv = [];
  for (let i = 0; i < 4001; i++) { ht.push(Sim.stats([0, 1, 2].map(() => M.measureTime(th, s, 'video', r))).half); hv.push(Sim.stats([0, 1, 2].map(() => M.measureSpeed(th, s, r))).half); }
  ht.sort((a, b) => a - b); hv.sort((a, b) => a - b);
  const rt = ht[2000] / M.biggest(th, s, 'video'), rv = hv[2000] / (M.speedFor(th, s) * 0.01);
  assert.ok(rt > 0.6 && rt < 1.3, 'time ratio ' + rt); assert.ok(rv > 0.6 && rv < 1.3, 'speed ratio ' + rv);
});
test('validation helper: accepted value inside result +/- uncertainty', () => {
  assert.equal(M.agrees(9.7, 0.3, 9.81).within, true); assert.equal(M.agrees(9.4, 0.3, 9.81).within, false);
  near(M.agrees(9.4, 0.3, 9.81).pctDiff, 100 * 0.41 / 9.81, 1e-9); near(M.agrees(9.4, 0.3, 9.81).pctUnc, 100 * 0.3 / 9.4, 1e-9);
});

/* ---- Sim.lineUnc (shared helper) ---- */
test('lineUnc: exact line with no error bars; bars bracket the true gradient; curved data is flagged', () => {
  const xs = [1, 2, 3, 4, 5], exact = xs.map(x => ({ x, y: 2 * x + 1 }));
  const f0 = Sim.lineUnc(exact); near(f0.slope, 2, 1e-9); near(f0.dSlope, 0, 1e-9); assert.ok(f0.all);
  const bars = xs.map((x, i) => ({ x, y: 2 * x + 1 + [0.05, -0.08, 0.06, -0.04, 0.07][i], ey: 0.1 })), f = Sim.lineUnc(bars);
  assert.ok(f.all && f.shallow.slope <= 2 && f.steep.slope >= 2 && f.dSlope > 0.01 && f.dSlope < 0.2, JSON.stringify(f));
  const curve = Sim.lineUnc(xs.map(x => ({ x, y: x * x, ey: 0.1 }))); assert.equal(curve.all, false); assert.ok(curve.hit < 5);
});

/* ---- what the student should find (teaching outcomes) ---- */
function stageB(timer, method, angles, seed, ell, s) {
  const r = Sim.rng(seed), pts = angles.map(th => {
    const st = Sim.stats([0, 1, 2].map(() => timer === 'gate' ? M.measureSpeed(th, s, r) : M.measureTime(th, s, timer, r)), { res: M.TIMERS[timer].res });
    const a = timer === 'gate' ? M.aFromV(s, st.mean) : M.aFromT(s, st.mean), da = timer === 'gate' ? st.mean * st.half / s : a * 2 * st.half / st.mean;
    return { x: Math.sin(rad(th)), y: a, ex: M.sinUnc(th, method, ell), ey: da };
  });
  return Sim.lineUnc(pts);
}
test('Stage B, gate and trigonometry: g is usually validated AND friction usually shows up as a non-zero intercept', () => {
  let g = 0, i = 0; const N = 400;
  for (let k = 0; k < N; k++) { const f = stageB('gate', 'trig', [3, 6, 9, 12, 15, 18], 100 + k, 2, 1.0); if (M.agrees(f.slope, f.dSlope, M.ACCEPTED_G).within) g++; if (Math.abs(f.intercept) > f.dIntercept) i++; }
  assert.ok(g / N > 0.8, 'gradient validated ' + g / N); assert.ok(i / N > 0.7, 'friction seen ' + i / N);
});
test('Stage B, protractor: big x error bars hide the friction (weak validation, not a better result)', () => {
  let g = 0, i = 0; const N = 400;
  for (let k = 0; k < N; k++) { const f = stageB('gate', 'protractor', [3, 6, 9, 12, 15, 18], 100 + k, 2, 1.0); if (M.agrees(f.slope, f.dSlope, M.ACCEPTED_G).within) g++; if (Math.abs(f.intercept) > f.dIntercept) i++; }
  assert.ok(g / N > 0.95, 'gradient validated ' + g / N); assert.ok(i / N < 0.15, 'friction seen ' + i / N);
});
test('Stage A: both t^2 and v^2 against s are straight through the origin with the true gradients (most of the time)', () => {
  const th = 8, a = M.accel(th), ss = [0.4, 0.6, 0.8, 1.0, 1.2, 1.4, 1.6]; let ti = 0, vi = 0, tg = 0, vg = 0; const N = 400;
  for (let k = 0; k < N; k++) {
    const r = Sim.rng(900 + k), pt = [], pv = [];
    for (const s of ss) {
      const T = Sim.stats([0, 1, 2].map(() => M.measureTime(th, s, 'video', r)), { res: 0.001 }), V = Sim.stats([0, 1, 2].map(() => M.measureSpeed(th, s, r)), { res: 0.001 });
      pt.push({ x: s, y: T.mean ** 2, ey: 2 * T.mean * T.half }); pv.push({ x: s, y: V.mean ** 2, ey: 2 * V.mean * V.half });
    }
    const ft = Sim.lineUnc(pt), fv = Sim.lineUnc(pv);
    if (Math.abs(ft.intercept) <= ft.dIntercept) ti++; if (Math.abs(fv.intercept) <= fv.dIntercept) vi++;
    if (Math.abs(ft.slope - 2 / a) <= ft.dSlope) tg++; if (Math.abs(fv.slope - 2 * a) <= fv.dSlope) vg++;
  }
  for (const [n, c] of [['t intercept', ti], ['v intercept', vi], ['t gradient', tg], ['v gradient', vg]]) assert.ok(c / N > 0.8, n + ' ' + c / N);
});
