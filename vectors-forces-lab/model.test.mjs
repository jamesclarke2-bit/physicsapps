// Run with:  node --test vectors-forces-lab/model.test.mjs
// No random readings in this app (it is an explorer, not an experiment), so there is no half-range test.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const M = require('./model.js');
const near = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} vs ${b}`);

test('no wind, aimed straight: all forward, no miss', () => {
  const g = M.golf(40, 0, 0);
  near(g.f, 40); near(g.s, 0); near(g.R, 40); near(g.miss, 0); near(g.alphaDeg, 0);
});
test('hand check: 40 m/s ball, 8 m/s wind, aimed straight (3-4-5 style: 40, 8)', () => {
  const g = M.golf(40, 8, 0);
  near(g.R, Math.sqrt(1664), 1e-9);            // 40.79
  near(g.alphaDeg, 11.31, 0.01);               // atan(0.2)
  near(g.miss, 30, 1e-9);                      // 150 x 0.2
});
test('aiming upwind by asin(w/u) cancels the wind exactly', () => {
  const a = M.aimAngle(40, 8);
  near(a, -11.537, 0.001);
  const g = M.golf(40, 8, a);
  near(g.s, 0, 1e-9); near(g.miss, 0, 1e-9); near(g.alphaDeg, 0, 1e-9);
  near(g.R, 39.19, 0.01);                      // slower along the line: u cos(theta)
  assert.ok(M.onTarget(g.miss));
});
test('aim angle is clamped when the wind is as strong as the ball speed', () => {
  near(M.aimAngle(10, 15), -90);
});
test('resultant is never less than the forward speed and obeys Pythagoras', () => {
  for (const th of [-30, -10, 0, 15, 40]) {
    const g = M.golf(50, 6, th);
    assert.ok(g.R >= g.f - 1e-12);
    near(g.R * g.R, g.f * g.f + g.s * g.s, 1e-9);
  }
});
test('on target means within 6 m of the flag', () => {
  assert.ok(M.onTarget(5.9) && M.onTarget(-6) && !M.onTarget(6.1));
});

test('bag: hanging straight down gives zero moment and zero muscle force', () => {
  const b = M.bag(4, 0, 4);
  near(b.x, 0); near(b.M, 0); near(b.F, 0); near(b.ratio, 0);
});
test('bag: default shoulder model, 4 kg held out sideways with d = 4 cm', () => {
  const b = M.bag(4, 90, 4);
  near(b.W, 39.24, 1e-9); near(b.x, 0.65); near(b.M, 25.506, 1e-9);
  near(b.F, 637.65, 0.01); near(b.ratio, 16.25, 1e-9);
});
test('bag: muscle force is x / d times the weight, and grows with sin(angle)', () => {
  let last = -1;
  for (const p of [0, 15, 30, 45, 60, 75, 90]) {
    const b = M.bag(3, p, 5);
    near(b.F, b.W * b.x / b.d, 1e-9);
    assert.ok(b.F > last); last = b.F;
  }
});
test('bag: a smaller lever arm needs a bigger force, in inverse proportion', () => {
  near(M.bag(4, 90, 2).F / M.bag(4, 90, 4).F, 2, 1e-12);
});
test('bag: the formula reproduces W x / d for a 350 N weight at x = 0.20 m, d = 4 cm', () => {
  const b = M.bag(350 / M.G, Math.asin(0.2 / M.L_ARM) / M.RAD, 4);
  near(b.W, 350, 1e-9); near(b.x, 0.2, 1e-9); near(b.F, 350 * 0.2 / 0.04, 1e-6);
});
