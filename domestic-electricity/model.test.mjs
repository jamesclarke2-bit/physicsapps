// Tests for the domestic electricity model. Run: node --test domestic-electricity/model.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const M = createRequire(import.meta.url)('./model.js');
const close = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} is not ${b}`);

test('mains values match the wording in the lesson', () => {
  assert.equal(M.MAINS_V, 230); assert.equal(M.MAINS_F, 50);
});

test('hand-checked values', () => {
  close(M.power(10, 230), 2300);                 // kettle, 10 A
  close(M.current(920), 4);                      // 920 W microwave
  close(M.current(2500), 10.8696, 1e-4);         // 2500 W kettle
  close(M.energy(10, 230, 180), 414000);         // plenary question 5
  close(M.current(1500), 6.5217, 1e-4);          // plenary question 2
  assert.equal(M.fuseFor(M.current(1500)), 13);
  assert.equal(M.fuseFor(M.current(2500)), 13);
  assert.equal(M.fuseFor(M.current(900)), 5);
  assert.equal(M.fuseFor(M.current(120)), 3);
});

test('limiting cases', () => {
  assert.equal(M.fuseFor(0), 3);                 // any current below the smallest fuse
  assert.equal(M.fuseFor(13), null);             // a fuse must be above the current, not equal to it
  assert.equal(M.fuseFor(20), null);
  assert.equal(M.fuseFor(0.5, 'hard'), 1);
});

test('the fuse is always the lowest rating above the current', () => {
  for (const set of Object.keys(M.FUSES)) for (const a of M.APPLIANCES) {
    const I = M.current(a.P), f = M.fuseFor(I, set);
    assert.ok(f !== null && f > I, `${a.name} ${set}`);
    assert.ok(M.FUSES[set].filter(x => x > I).every(x => x >= f), `${a.name} ${set} not the lowest`);
    assert.equal(M.verdict(f, I, set), 'right');
    for (const x of M.FUSES[set]) if (x !== f) assert.equal(M.verdict(x, I, set), x < I ? 'low' : 'high');
  }
});

test('no appliance current is within 5% of a fuse rating', () => {
  for (const a of M.APPLIANCES) for (const f of M.FUSES.hard) {
    const I = M.current(a.P); assert.ok(Math.abs(I - f) / f >= M.MARGIN, `${a.name}: ${I.toFixed(2)} A is too close to ${f} A`);
  }
});

test('each standard fuse is the answer for at least three appliances', () => {
  for (const f of M.FUSES.std) assert.ok(M.APPLIANCES.filter(a => M.fuseFor(M.current(a.P)) === f).length >= 3, `${f} A`);
});

test('worksheet appliances exist and cover every standard fuse', () => {
  const fs = M.WORKSHEET_APPLIANCES.map(n => { const a = M.appliance(n); assert.ok(a, n); return M.fuseFor(M.current(a.P)); });
  for (const f of M.FUSES.std) assert.ok(fs.includes(f), `${f} A missing from the worksheet table`);
});

test('fuse demo currents sit either side of the rating', () => {
  assert.ok(M.FUSE_DEMO.currents[0] < M.FUSE_DEMO.rating && M.FUSE_DEMO.currents[1] > M.FUSE_DEMO.rating);
});

test('earth wire numbers', () => {
  close(M.bodyCurrent(), 0.1);                                   // "about 0.1 A" in the lesson
  assert.ok(M.bodyCurrent() < M.EARTH.fuse / 50);                // far too small to melt the fuse
  assert.ok(M.EARTH.normalI < M.EARTH.fuse);                     // kettle runs without melting its fuse
  assert.equal(M.fuseFor(M.EARTH.normalI), M.EARTH.fuse);
});
