// node --test force-mass-acceleration/model.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const M = require('./model.js');
global.window = {}; require('../shared/sim.js'); const Sim = global.window.Sim;
const base = { nh: 5, k: 0, constant: true, tilt: 0, hanger: true };
const S = o => Object.assign({}, base, o);
const near = (a, b, tol) => assert.ok(Math.abs(a - b) <= tol, `${a} vs ${b}`);

test('hand-checked value: nh=5 flat, constant mass', () => {
  // mh = 0.01+0.1 = 0.11 kg; Mt = 0.6+0.02*5 = 0.70; net = 0.11*9.81 - 0.011*0.7*9.81 = 1.0791-0.075537 = 1.003563; Msys = 0.70+0.11+0.005 = 0.815
  near(M.accel(S({})), 1.003563 / 0.815, 1e-9);
});
test('trolley does not move with the empty hanger on a flat track (friction)', () => {
  assert.equal(M.moves(S({ nh: 0 })), false);
  assert.equal(M.accel(S({ nh: 0 })), 0);
});
test('with total mass constant, a against F is a straight line with gradient 1/Msys and a negative intercept', () => {
  const nhs = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], xs = nhs.map(n => M.force(S({ nh: n }))), ys = nhs.map(n => M.accel(S({ nh: n })));
  const f = Sim.linfit(xs, ys);
  near(f.slope, 1 / M.sysMass(S({})), 0.03); // friction f = mu Mt g shrinks slightly as masses move to the hanger, so the gradient is about 1% above 1/Msys
  assert.ok(f.intercept < -0.05, 'intercept ' + f.intercept);
  // residuals are tiny: really linear
  xs.forEach((x, i) => near(ys[i], f.slope * x + f.intercept, 1e-6));
});
test('NOT keeping total mass constant makes a against F curve', () => {
  const nhs = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], xs = nhs.map(n => M.force(S({ nh: n, constant: false }))), ys = nhs.map(n => M.accel(S({ nh: n, constant: false })));
  const f = Sim.linfit(xs, ys); let worst = 0; xs.forEach((x, i) => { worst = Math.max(worst, Math.abs(ys[i] - (f.slope * x + f.intercept))); });
  assert.ok(worst > 0.01, 'curvature ' + worst);
});
test('compensating friction by tilting removes the intercept', () => {
  const th = M.compensationAngle(); near(th, 0.63, 0.02);
  const s = S({ nh: 4, tilt: th }); near(M.accel(s), M.force(s) / M.sysMass(s), 1e-6);
  assert.ok(M.frictionEffectPct(s) < 1);
  assert.ok(M.frictionEffectPct(S({ nh: 4 })) > 5);
});
test('a against 1/m with fixed hanger is linear with intercept close to -mu g', () => {
  const ks = [0, 1, 2, 3, 4, 5], xs = ks.map(k => 1 / M.sysMass(S({ nh: 5, k }))), ys = ks.map(k => M.accel(S({ nh: 5, k })));
  const f = Sim.linfit(xs, ys); near(f.intercept, -M.MU_K * M.G, 0.02);
});
test('ramp with no hanger: a = g(sin - mu cos), independent of mass', () => {
  const a1 = M.accel(S({ hanger: false, tilt: 10, k: 0 })), a2 = M.accel(S({ hanger: false, tilt: 10, k: 5 }));
  near(a1, M.G * (Math.sin(10 * Math.PI / 180) - M.MU_K * Math.cos(10 * Math.PI / 180)), 1e-9); near(a1, a2, 1e-9);
});
test('SUVAT consistency for a gate run (all four equations agree)', () => {
  const a = M.accel(S({ nh: 6 })), g = M.gateRun(a, 0.3, 1.2), { u, v, t, d } = g;
  near(v, u + a * t, 1e-9); near(d, u * t + 0.5 * a * t * t, 1e-9); near(v * v, u * u + 2 * a * d, 1e-9); near(d, (u + v) / 2 * t, 1e-9);
});
test('percentage uncertainty in a is about twice that in t (stopwatch, from rest)', () => {
  const s = S({ nh: 5 }), a = M.accel(s), t = M.timeToDistance(a, 1.0), pt = 100 * M.biggest(t, 'stopwatch') / t;
  near(M.accelUncPct(s, 0, 1.0, 'stopwatch'), 2 * pt, 1e-9);
});
test('timer choice matters: video beats stopwatch for a quick run', () => {
  const s = S({ nh: 8 }); assert.ok(M.accelUncPct(s, 0, 1.0, 'video') < M.accelUncPct(s, 0, 1.0, 'stopwatch'));
  assert.equal(M.longEnough(s, 0, 0.4, 'stopwatch'), false);
  assert.equal(M.longEnough(s, 0, 1.5, 'stopwatch'), true);
});
test('median half-range of 3 readings is about the biggest source', () => {
  const r = Sim.rng(11), s = S({ nh: 3 }), hs = [], t = M.timeToDistance(M.accel(s), 1.0);
  for (let i = 0; i < 4001; i++) hs.push(Sim.stats([0, 1, 2].map(() => M.measureTime(s, 1.0, 'video', r))).half);
  hs.sort((a, b) => a - b); const ratio = hs[2000] / M.biggest(t, 'video'); assert.ok(ratio > 0.6 && ratio < 1.3, 'ratio ' + ratio);
});
test('gate readings: mean u and v close to truth, noise small', () => {
  const r = Sim.rng(5), s = S({ nh: 6 }), a = M.accel(s), g = M.gateRun(a, 0.3, 1.2); let su = 0, sv = 0, n = 2000;
  for (let i = 0; i < n; i++) { const m = M.measureGates(s, 0.3, 1.2, r); su += m.u; sv += m.v; }
  near(su / n, g.u, g.u * 0.03); near(sv / n, g.v, g.v * 0.03);
});

test('longer timings have a smaller percentage uncertainty (all timers)', () => {
  const s = S({ nh: 5 });
  for (const timer of ['stopwatch', 'video', 'gates']) {
    let prev = Infinity;
    for (const x2 of [0.6, 0.8, 1.0, 1.4, 1.8]) { const u = M.accelUncPct(s, 0.3, x2, timer); assert.ok(u < prev, timer + ' ' + x2 + ': ' + u + ' vs ' + prev); prev = u; }
  }
});

test('a bigger tilt has a smaller percentage uncertainty in sin(theta)', () => {
  let prev = Infinity;
  for (const d of [1, 2, 4, 6, 10, 15]) { const p = M.sinTiltPct(d); assert.ok(p < prev); prev = p; }
  near(M.sinTiltPct(6), 100 * Math.cos(6 * Math.PI / 180) * (0.5 * Math.PI / 180) / Math.sin(6 * Math.PI / 180), 1e-9);
});

test('with no hanger the ideal acceleration is g sin(theta)', () => {
  const s = S({ hanger: false, tilt: 6 });
  near(M.idealAccel(s), M.G * Math.sin(6 * Math.PI / 180), 1e-9);
  assert.ok(M.moves(s) && M.frictionEffectPct(s) > 0 && M.frictionEffectPct(s) < 20);
});
