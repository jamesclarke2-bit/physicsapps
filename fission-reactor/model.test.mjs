// Run with:  node --test _template/model.test.mjs   (every app keeps a model.test.mjs next to its model.js)
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const M = require('./model.js');
const Sim = (() => { // load shared/sim.js rng without a browser
  global.window = {}; require('../shared/sim.js'); return global.window.Sim;
})();

test('small-angle period matches 2*pi*sqrt(L/g)', () => {
  assert.ok(Math.abs(M.period(1, 0.001) - 2.0064) < 1e-3);
});
test('large amplitude lengthens the period', () => {
  assert.ok(M.period(1, 40) > M.period(1, 10));
  assert.ok(M.smallAnglePct(10) < 1 && M.smallAnglePct(40) > 1);
});
test('T^2 is proportional to L (gradient 4*pi^2/g)', () => {
  const xs = [0.2, 0.4, 0.6, 0.8, 1.0], ys = xs.map(L => M.period(L, 5) ** 2);
  const f = Sim.linfit(xs, ys);
  assert.ok(Math.abs(f.slope - 4 * Math.PI ** 2 / M.G) / f.slope < 0.01);
  assert.ok(Math.abs(f.intercept) < 0.01);
});
test('measuring to the top of the bob gives a positive-intercept systematic error', () => {
  const xs = [0.2, 0.4, 0.6, 0.8, 1.0], ys = xs.map(L => M.period(M.trueLength(L, 'top'), 5) ** 2);
  assert.ok(Sim.linfit(xs, ys).intercept > 0.03);
});
test('median half-range of 3 readings is about the biggest source (anomalies excluded by using the median)', () => {
  const r = Sim.rng(7), hs = [];
  for (let i = 0; i < 4001; i++) hs.push(Sim.stats([0, 1, 2].map(() => M.measure(0.5, 10, 1, 'video', 'centre', r))).half);
  hs.sort((a, b) => a - b);
  const ratio = hs[2000] / M.biggest(M.period(0.5, 10), 'video');
  assert.ok(ratio > 0.6 && ratio < 1.3, 'ratio ' + ratio);
});
test('timing more oscillations lowers the % uncertainty until judgement dominates', () => {
  assert.ok(M.uncPct(0.5, 10, 10, 'stopwatch', 'centre') < M.uncPct(0.5, 10, 1, 'stopwatch', 'centre'));
});
