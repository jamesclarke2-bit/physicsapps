const test = require('node:test');
const assert = require('node:assert/strict');
const MM = require('../src/motionModel.js');
const Fmt = require('../src/format.js');
const Scn = require('../src/scenarios.js');
const Mis = require('../src/misconceptions.js');
const GC = require('../src/graphCompare.js');
const QG = require('../src/quantGenerators.js');
const RC = require('../src/reconstruction.js');
const LV = require('../src/levels.js');
const PG = require('../src/progress.js');

const close = (a, b, tol = 1e-6) => assert.ok(Math.abs(a - b) <= tol, `${a} ≉ ${b}`);

// ---------------------------------------------------------------- motion model
test('uniform acceleration matches suvat exactly', () => {
  const m = MM.createMotion({ s0: 2, v0: 3, segments: [{ duration: 4, a: -1.5 }] });
  const st = MM.stateAt(m, 4);
  close(st.v, 3 - 6);
  close(st.s, 2 + 12 - 0.75 * 16);
  close(st.a, -1.5);
});

test('variable acceleration (jerk) integrates exactly', () => {
  const m = MM.createMotion({ v0: 0, segments: [{ duration: 5, a: 4, jerk: -0.8 }] });
  const st = MM.stateAt(m, 5);
  close(st.a, 0);
  close(st.v, 10); // area of the a–t triangle
  close(st.s, 0.5 * 4 * 25 - (0.8 * 125) / 6);
});

test('state is continuous across segment boundaries', () => {
  const m = MM.fromVelocityPoints([[0, 0], [5, 10], [10, 10], [14, 0]]);
  const before = MM.stateAt(m, 5 - 1e-9);
  const after = MM.stateAt(m, 5 + 1e-9);
  close(before.v, after.v, 1e-6);
  close(before.s, after.s, 1e-6);
  close(MM.stateAt(m, 14).s, 25 + 50 + 20);
});

test('ball thrown up: reversal at the top, distance ≠ displacement', () => {
  const ball = Scn.getScenario('ball-thrown-up').motion;
  assert.deepEqual(MM.reversalTimes(ball).map((t) => Math.round(t * 1000) / 1000), [1.5]);
  close(MM.displacementBetween(ball, 0, 3), 0);
  close(MM.distanceBetween(ball, 0, 3), 2 * 11.25);
});

test('phases classify speeding up / slowing down by the signs of v and a', () => {
  const overshoot = Scn.getScenario('overshoot').motion; // v 6 → −6, a = −2
  const ph = MM.phases(overshoot);
  assert.equal(ph.length, 2);
  assert.deepEqual([ph[0].direction, ph[0].trend], [1, 'slowing-down']);
  assert.deepEqual([ph[1].direction, ph[1].trend], [-1, 'speeding-up']);
  close(ph[0].t1, 3);
});

test('rests and momentary stops are told apart from reversals', () => {
  const walk = Scn.getScenario('walk-to-shop').motion;
  const vz = MM.velocityZeros(walk);
  assert.deepEqual(vz.rests, [[4, 6]]);
  assert.equal(walk.idealised, true);
  const car = Scn.getScenario('car-trip').motion;
  assert.equal(MM.reversalTimes(car).length, 0);
  assert.equal(car.idealised, false);
});

test('extents include turning points inside segments', () => {
  const ball = Scn.getScenario('ball-thrown-up').motion;
  const ext = MM.extents(ball);
  close(ext.s[1], 11.25);
  close(ext.v[0], -15);
  close(ext.v[1], 15);
});

test('every library scenario builds and has a positive duration and story', () => {
  Scn.SCENARIO_DEFS.forEach((d) => {
    const sc = Scn.getScenario(d.id);
    assert.ok(sc.motion.duration > 0, d.id);
    assert.ok(sc.story.length > 20, d.id);
    assert.ok(sc.tier >= 1 && sc.tier <= 5, d.id);
  });
});

test('scenario stories agree with their motions', () => {
  close(MM.stateAt(Scn.getScenario('cyclist-brakes').motion, 4).v, 0);
  close(MM.stateAt(Scn.getScenario('reverse-braking').motion, 3).v, 0);
  close(MM.stateAt(Scn.getScenario('emergency-stop').motion, 5).v, 0);
  close(MM.stateAt(Scn.getScenario('skydiver').motion, 10).v, -50);
  close(MM.stateAt(Scn.getScenario('rocket').motion, 5).a, 4);
  close(MM.stateAt(Scn.getScenario('pendulum-cart').motion, 2).v, 2);
  close(MM.stateAt(Scn.getScenario('pendulum-cart').motion, 8).s, 0, 1e-6);
});

test('random scenarios are valid for every tier', () => {
  const R = Fmt.createRng(7);
  for (let tier = 1; tier <= 5; tier++) {
    for (let k = 0; k < 30; k++) {
      const sc = Scn.randomScenario(tier, R);
      assert.ok(sc.motion.duration > 0);
      assert.ok(MM.phases(sc.motion).length >= 1);
    }
  }
});

// ---------------------------------------------------------------- format
test('signed formatting uses a true minus sign and shows +', () => {
  assert.equal(Fmt.signed(-2.5), '−2.5');
  assert.equal(Fmt.signed(3), '+3');
  assert.equal(Fmt.signed(0), '0');
  assert.equal(Fmt.num(-0.0001), '0');
});

test('answers parse with any minus character, fractions and units', () => {
  assert.equal(Fmt.parseAnswer('−3'), -3);
  assert.equal(Fmt.parseAnswer('–4.5'), -4.5);
  assert.equal(Fmt.parseAnswer(' 12 m/s'), 12);
  assert.equal(Fmt.parseAnswer('1/2'), 0.5);
  assert.ok(Number.isNaN(Fmt.parseAnswer('abc')));
});

test('seeded RNG is reproducible', () => {
  const a = Fmt.createRng(42);
  const b = Fmt.createRng(42);
  for (let i = 0; i < 10; i++) assert.equal(a.next(), b.next());
});

// ---------------------------------------------------------------- misconceptions
test('every Fix the Mistake case points at a real scenario and misconception, with 4 options per step', () => {
  Mis.FIX_CASES.forEach((c) => {
    assert.ok(Mis.MISCONCEPTIONS[c.misconception], c.id);
    assert.ok(Scn.getScenario(c.scenario), c.id);
    ['what', 'why', 'correct'].forEach((k) => assert.equal(c[k].length, 4, c.id + ' ' + k));
    const T = Scn.getScenario(c.scenario).motion.duration;
    assert.ok(c.window[0] >= 0 && c.window[1] <= T + 1e-9, c.id);
  });
});

test('Fix the Mistake facts check out against the engine', () => {
  const shuttle = Scn.getScenario('shuttle-run').motion;
  close(MM.displacementBetween(shuttle, 0, 10), 9);
  close(MM.distanceBetween(shuttle, 0, 10), 39);
  const drone = Scn.getScenario('drone').motion;
  const s12 = MM.stateAt(drone, 12).s;
  const s14 = MM.stateAt(drone, 14).s;
  assert.ok(s12 > 0 && s14 < 0, 'drone crosses its launch height in the 12–14 s window');
  close(MM.stateAt(Scn.getScenario('trolley-ramp').motion, 5).v, -2);
  close(MM.stateAt(Scn.getScenario('car-trip').motion, 7).a, 0);
  close(MM.stateAt(Scn.getScenario('sprinter').motion, 5).v, 10);
  const walk = Scn.getScenario('walk-to-shop').motion;
  close(MM.displacementBetween(walk, 0, 10), 0);
  close(MM.distanceBetween(walk, 0, 10), 16);
});

// ---------------------------------------------------------------- sketch comparison
test('a perfect sketch passes, a sign-flipped one fails with a named misconception', () => {
  const m = Scn.getScenario('reverse-speeding-up').motion;
  const N = 80;
  const perfect = GC.targetSamples(m, 'v', N);
  const res = GC.compareSketch(m, 'v', perfect);
  assert.equal(res.pass, true);
  const flipped = perfect.map((y) => -y);
  const bad = GC.compareSketch(m, 'v', flipped);
  assert.equal(bad.pass, false);
  assert.ok(bad.misconceptions.includes('neg-velocity-slowing'));
});

test('drawing acceleration as negative while braking backwards is diagnosed', () => {
  const m = Scn.getScenario('reverse-braking').motion; // a = +2
  const N = 60;
  const wrong = new Array(N).fill(-2);
  const res = GC.compareSketch(m, 'a', wrong);
  assert.equal(res.pass, false);
  assert.ok(res.misconceptions.includes('backwards-neg-accel'));
});

test('a partial sketch is asked to cover the whole journey', () => {
  const m = Scn.getScenario('car-trip').motion;
  const s = GC.targetSamples(m, 's', 50).map((y, i) => (i < 20 ? y : null));
  const res = GC.compareSketch(m, 's', s);
  assert.equal(res.pass, false);
  assert.match(res.feedback[0].message, /whole journey/);
});

test('a slightly wobbly but correct sketch still passes', () => {
  const m = Scn.getScenario('car-trip').motion;
  const s = GC.targetSamples(m, 'v', 80).map((y, i) => y + Math.sin(i) * 0.6);
  assert.equal(GC.compareSketch(m, 'v', s).pass, true);
});

test('sketchFromVertices interpolates straight lines', () => {
  const s = GC.sketchFromVertices([[0, 0], [10, 10]], 10, 11);
  close(s[5], 5);
});

// ---------------------------------------------------------------- quantitative generators
test('every generator produces an answer that matches the engine and marks itself correct', () => {
  Object.keys(QG.GENERATORS).forEach((topic) => {
    for (let seed = 1; seed <= 40; seed++) {
      const qn = QG.generate(topic, Fmt.createRng(seed * 977 + topic.length));
      assert.ok(Number.isFinite(qn.answer), topic);
      assert.ok(qn.steps.length >= 2, topic);
      assert.ok(qn.tol >= 0.02, topic + ': tolerance at least 2%');
      assert.equal(QG.mark(qn, String(qn.answer)).correct, true, topic);
      assert.ok(qn.graph && qn.graph.motion && qn.graph.motion.duration > 0, topic);
    }
  });
});

test('generator answers agree with an independent engine calculation', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const R = () => Fmt.createRng(seed);
    const d = QG.generate('distance', R());
    close(d.answer, MM.distanceBetween(d.graph.motion, 0, d.graph.motion.duration));
    const da = QG.generate('disp-area', R());
    close(da.answer, MM.displacementBetween(da.graph.motion, 0, da.graph.motion.duration));
    const dv = QG.generate('dv-area', R());
    close(dv.answer, MM.stateAt(dv.graph.motion, dv.graph.motion.duration).v);
    const tr = QG.generate('trapezium-vmax', R());
    close(tr.answer, MM.extents(tr.graph.motion).v[1]);
    const rt = QG.generate('reverse-time', R());
    close(rt.answer, MM.reversalTimes(rt.graph.motion)[0]);
    const va = QG.generate('variable-accel', R());
    close(va.answer, MM.stateAt(va.graph.motion, va.graph.motion.duration).v);
    const ci = QG.generate('calc-integral', R());
    close(ci.answer, MM.displacementBetween(ci.graph.motion, 0, ci.graph.motion.duration));
    const op = QG.generate('optimise', R());
    close(op.answer, MM.extents(op.graph.motion).v[1]);
  }
});

test('marking names the misconception behind a predictable wrong answer', () => {
  let found = false;
  for (let seed = 1; seed <= 30 && !found; seed++) {
    const qn = QG.generate('distance', Fmt.createRng(seed));
    const disp = MM.displacementBetween(qn.graph.motion, 0, qn.graph.motion.duration);
    if (Math.abs(disp - qn.answer) > 0.5) {
      const res = QG.mark(qn, String(disp));
      assert.equal(res.correct, false);
      assert.equal(res.misconception, 'displacement-distance');
      found = true;
    }
  }
  assert.ok(found);
  const neg = QG.generate('acc-gradient', Fmt.createRng(5));
  if (neg.answer !== 0) assert.match(QG.mark(neg, String(-neg.answer)).message, /sign/i);
  assert.equal(QG.mark(neg, 'banana').unreadable, true);
});

// ---------------------------------------------------------------- reconstruction
test('every gallery design satisfies its own challenge', () => {
  RC.CHALLENGES.forEach((c) => {
    RC.gallery(c).forEach((g) => {
      const res = RC.checkDesign(c, g.vertices);
      assert.equal(res.valid, true, c.id + ' / ' + g.label + ': ' + JSON.stringify(res.checks.filter((x) => !x.ok)));
    });
  });
});

test('a starting design is NOT already valid', () => {
  RC.CHALLENGES.forEach((c) => assert.equal(RC.checkDesign(c, RC.startingVertices(c)).valid, false, c.id));
});

test('areas: displacement subtracts, distance adds', () => {
  const a = RC.areas([[0, 0], [2, 4], [4, 0], [6, -4], [8, 0]]);
  close(a.displacement, 0);
  close(a.distance, 16);
});

// ---------------------------------------------------------------- levels & progress
test('every level refers to a known type and skills', () => {
  const ids = new Set();
  LV.LEVELS.forEach((lv) => {
    assert.ok(!ids.has(lv.id), 'unique id ' + lv.id);
    ids.add(lv.id);
    assert.ok(LV.TYPE_INFO[lv.type], lv.id);
    lv.skills.forEach((s) => assert.ok(LV.SKILLS[s], lv.id + ' skill ' + s));
    if (lv.type === 'quant') lv.config.topics.forEach((t) => assert.ok(QG.GENERATORS[t], lv.id + ' topic ' + t));
  });
});

test('calculus is never required, and only appears in Mathematical Extension mode', () => {
  const std = LV.visibleLevels({ course: 'extension', mathMode: 'standard' });
  assert.ok(!std.some((lv) => lv.calculus));
  const ext = LV.visibleLevels({ course: 'extension', mathMode: 'extension' });
  assert.ok(ext.some((lv) => lv.calculus));
  LV.LEVELS.filter((lv) => lv.calculus).forEach((lv) => assert.notEqual(lv.tier, 'gcse'));
});

test('completing the GCSE core alone unlocks every stage', () => {
  const prog = {};
  LV.LEVELS.filter((lv) => lv.tier === 'gcse').forEach((lv) => (prog[lv.id] = { completed: true }));
  LV.STAGES.forEach((st) => assert.equal(LV.stageUnlocked(st.id, prog, {}), true));
  assert.equal(LV.stageUnlocked(2, {}, {}), false);
  assert.equal(LV.stageUnlocked(6, {}, { unlockAll: true }), true);
});

function memoryStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
}

test('progress: XP, streaks, misconceptions and stars', () => {
  const store = PG.createStore(memoryStorage(), () => 1000);
  for (let i = 0; i < 5; i++) store.recordAnswer({ correct: true, skills: ['signs'], tier: 'gcse' });
  assert.equal(store.state.bestStreak, 5);
  assert.ok(store.state.badges['streak-5']);
  store.recordAnswer({ correct: false, skills: ['signs'], misconception: 'neg-velocity-slowing', questionType: 'x' });
  assert.equal(store.state.streak, 0);
  assert.equal(store.state.misconceptions['neg-velocity-slowing'], 1);
  const res = store.recordAnswer({ correct: true, skills: ['signs'], questionType: 'x' });
  assert.ok(res.events.some((e) => e.id === 'comeback'));
  const done = store.completeLevel(LV.getLevel('1-1'), 9, 10, 60000);
  assert.equal(done.stars, 3);
  assert.ok(store.state.levels['1-1'].completed);
  assert.ok(store.mastery('signs') > 0 && store.mastery('signs') <= 1);
});

test('progress survives a reload in the same session and clears on reset', () => {
  const storage = memoryStorage();
  const a = PG.createStore(storage);
  a.recordAnswer({ correct: true, skills: ['area'] });
  const b = PG.createStore(storage);
  assert.equal(b.state.xp, a.state.xp);
  b.reset();
  assert.equal(PG.createStore(storage).state.xp, 0);
});

test('a broken or blocked storage never throws', () => {
  const throwing = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() { throw new Error('blocked'); } };
  const s = PG.createStore(throwing);
  s.recordAnswer({ correct: true, skills: ['area'] });
  assert.ok(s.state.xp > 0);
  const nul = PG.createStore(null);
  nul.reset();
});

// ---------------------------------------------------------------- air resistance
const DM = require('../src/dragModel.js');

test('drag engine matches the exact quadratic-drag results for every upward preset', () => {
  DM.PRESETS.filter((p) => p.v0 > 0).forEach((p) => {
    const g = 9.81;
    const sim = DM.simulate({ v0: p.v0, s0: p.s0, mass: p.mass, k: DM.kForTerminal(p.mass, g, p.vT), g });
    const H = DM.analytic.apexHeight(p.v0, g, p.vT);
    const tUp = DM.analytic.timeToApex(p.v0, g, p.vT);
    close(sim.apex.t, tUp, tUp * 1e-4);
    close(sim.apex.s, H, H * 1e-4);
    close(Math.abs(sim.landing.v), DM.analytic.landingSpeed(p.v0, p.vT), p.vT * 1e-3);
    close(sim.T, tUp + DM.analytic.fallTime(H, g, p.vT), sim.T * 1e-4);
    close(MM.stateAt(sim.motion, sim.T).s, 0, H * 1e-4);
  });
});

test('with drag: |a| > g going up, a = −g exactly at the top, |a| < g coming down', () => {
  const g = 9.81;
  const sim = DM.simulate({ v0: 20, mass: 0.06, k: DM.kForTerminal(0.06, g, 15), g });
  assert.ok(MM.stateAt(sim.motion, 0.5).a < -g);
  close(MM.stateAt(sim.motion, sim.apex.t).a, -g, 1e-3);
  assert.ok(MM.stateAt(sim.motion, sim.T - 0.3).a > -g);
  assert.ok(sim.T - sim.apex.t > sim.apex.t, 'the fall takes longer than the rise');
  const f = sim.forcesAt(sim.apex.t);
  close(f.D, 0, 1e-6);
  close(f.R, f.W, 1e-6);
  const up = sim.forcesAt(0.5);
  assert.ok(up.D < 0 && up.W < 0, 'going up, drag and weight both act down');
  const down = sim.forcesAt(sim.T - 0.3);
  assert.ok(down.D > 0, 'coming down, drag acts up');
});

test('a dropped object approaches terminal velocity and never exceeds it', () => {
  const g = 9.81;
  const sim = DM.simulate({ s0: 1500, v0: 0, mass: 80, k: DM.kForTerminal(80, g, 55), g });
  assert.ok(Math.abs(sim.landing.v) < 55 && Math.abs(sim.landing.v) > 54.9);
  for (let i = 0; i <= 50; i++) assert.ok(Math.abs(MM.stateAt(sim.motion, (sim.T * i) / 50).v) <= 55 + 1e-6);
});

test('no drag gives an exact single uniform-acceleration motion', () => {
  const sim = DM.simulate({ v0: 20, mass: 1, k: 0, g: 10 });
  assert.equal(sim.motion.segments.length, 1);
  close(sim.T, 4);
  close(sim.apex.s, 20);
});

test('a drag motion has no spurious jumps and its phases are: up slowing, then down speeding up', () => {
  const sc = Scn.getScenario('ball-drag');
  assert.equal(sc.motion.idealised, false);
  const ph = MM.phases(sc.motion);
  assert.deepEqual(ph.map((p) => [p.direction, p.trend]), [[1, 'slowing-down'], [-1, 'speeding-up']]);
});
