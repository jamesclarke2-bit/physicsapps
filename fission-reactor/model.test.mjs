// Run with:  node --test fission-reactor/model.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const M = require('./model.js');
const near = (a, b, tol) => Math.abs(a - b) <= tol * Math.abs(b);

test('fissions per second at 900 MW with 3.2e-11 J each is 2.8e19', () => {
  assert.ok(near(M.fissionsPerSecond(900, 3.2e-11), 2.8125e19, 1e-9));
  const s = M.create(); s.n = 1; assert.ok(near(M.derive(s).fissions, 2.8125e19, 1e-9));
});
test('critical when the rods are 25 % in', () => {
  assert.ok(near(M.CRITICAL_INSERTION, 0.75, 1e-9) || Math.abs(M.CRITICAL_INSERTION - 0.25) < 1e-9);
  const s = M.create(); s.rods = M.CRITICAL_INSERTION; assert.ok(Math.abs(M.kEff(s) - 1) < 1e-9);
  assert.equal(M.derive(s).status, 'Critical');
});
test('rods fully in: subcritical, the neutron population dies back', () => {
  const s = M.create(); s.n = 1; s.rods = 1; M.run(s, 20);
  assert.equal(M.derive(s).status, 'Subcritical'); assert.ok(s.n < 0.01);
});
test('rods at the critical position hold the power steady', () => {
  const s = M.create(); s.n = 0.5; s.rods = M.CRITICAL_INSERTION; const n0 = s.n; M.run(s, 30);
  assert.ok(near(s.n, n0, 0.01));
});
test('rods withdrawn too far: supercritical, population grows exponentially with the expected doubling time', () => {
  const s = M.create(); s.n = 0.1; s.rods = 0.1; const k = M.kEff(s); assert.ok(k > 1.005);
  const t2 = Math.LN2 * M.TAU / (k - 1); M.run(s, t2); assert.ok(near(s.n, 0.2, 0.03));
  assert.equal(M.derive(s).status, 'Supercritical');
});
test('full power with the pump at full flow settles near 300 C and makes 315 MW of electricity', () => {
  const s = M.create(); s.pump = 1; s.n = 1; s.rods = M.CRITICAL_INSERTION; s.T = 300; s.pd = 54;
  M.run(s, 60); const d = M.derive(s);
  assert.ok(Math.abs(s.T - 300) < 3, 'T ' + s.T);
  assert.ok(near(d.Pe, 0.35 * d.Q, 1e-9) && near(d.Pe, 315, 0.02));
  assert.ok(near(d.Pe + d.waste, d.Q, 1e-9));
});
test('energy is conserved: at steady state heat removed equals the thermal power', () => {
  const s = M.create(); s.pump = 1; s.n = 0.6; s.rods = M.CRITICAL_INSERTION; M.run(s, 400);
  const d = M.derive(s); assert.ok(near(d.Q, d.P, 0.01));
});
test('after shutdown there is still decay heat: with no pump the core keeps heating', () => {
  const s = M.create(); s.pump = 1; s.n = 1; s.rods = M.CRITICAL_INSERTION; s.T = 300; M.run(s, 60);
  s.scrammed = true; s.pump = 0; const T0 = s.T; M.run(s, 20);
  assert.ok(s.n < 0.01 && s.T > T0 + 10, 'T ' + s.T + ' from ' + T0);
});
test('shutdown with the pump running cools the reactor down safely', () => {
  const s = M.create(); s.pump = 1; s.n = 1; s.rods = M.CRITICAL_INSERTION; s.T = 300; M.run(s, 30);
  s.rods = 1; M.run(s, 200); assert.ok(s.T < 100 && !s.damaged);
});
test('rods all the way out with the safety system on: automatic shutdown stops it before damage', () => {
  const s = M.create(); s.pump = 1; s.rods = 0; M.run(s, 120);
  assert.ok(s.scrammed && !s.damaged && !s.melted, 'T ' + s.T);
  assert.equal(M.derive(s).status, 'Emergency shutdown (SCRAM)');
});
test('rods out with the safety system off: overheating, damage, then meltdown', () => {
  const s = M.create(); s.pump = 1; s.auto = false; s.rods = 0; M.run(s, 200);
  assert.ok(s.damaged && s.melted);
  assert.equal(M.derive(s).status, 'Meltdown');
});
test('no coolant at critical power: temperature rises to damage', () => {
  const s = M.create(); s.n = 1; s.rods = M.CRITICAL_INSERTION; s.T = 300; s.missing.coolant = true; s.auto = false; M.run(s, 60);
  assert.ok(s.damaged);
});
test('no moderator: the chain reaction cannot be sustained even with the rods out', () => {
  const s = M.create(); s.n = 1; s.rods = 0; s.missing.moderator = true; M.run(s, 30);
  assert.ok(M.kEff(s) < 1 && s.n < 0.01);
});
test('no control rods: they cannot be inserted, so the safety system cannot shut it down', () => {
  const s = M.create(); s.pump = 1; s.missing.rods = true; M.run(s, 120);
  assert.ok(M.kEff(s) > 1 && (s.damaged || s.melted));
});
test('no shielding: the radiation at the outer wall is 1000 times bigger', () => {
  const s = M.create(); s.n = 1; const a = M.derive(s).dose; s.missing.shield = true;
  assert.ok(near(M.derive(s).dose / a, 1000, 1e-9));
});
test('turbine disconnected: no electricity but the heat is still removed', () => {
  const s = M.create(); s.pump = 1; s.T = 300; s.turbine = false; const d = M.derive(s); assert.equal(d.Pe, 0); assert.ok(d.Q > 0);
});
