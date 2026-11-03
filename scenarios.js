/**
 * Scenario library: real-world one-dimensional journeys, each with a story,
 * a chosen positive direction, a cartoon object to animate and an exact
 * motion for the engine.
 *
 * Tiers match Graph Detective's difficulty ladder:
 *   1 Beginner      – constant velocity stages (idealised sharp corners)
 *   2 Intermediate  – uniform acceleration and deceleration
 *   3 Advanced      – multi-stage journeys, one reversal
 *   4 Expert        – complex piecewise journeys, several reversals / rests
 *   5 Mastery       – non-uniform acceleration, sign surprises
 *
 * Stories are first drafts, to be checked by the teacher.
 */

const ScnMM = typeof module !== 'undefined' && module.exports ? require('./motionModel.js') : window.MotionModel;
const ScnFmt = typeof module !== 'undefined' && module.exports ? require('./format.js') : window.Fmt;
const ScnDrag = typeof module !== 'undefined' && module.exports ? require('./dragModel.js') : window.DragModel;

const HORIZONTAL = { orientation: 'horizontal', pos: 'to the right', neg: 'to the left', posShort: 'right' };
const VERTICAL = { orientation: 'vertical', pos: 'upwards', neg: 'downwards', posShort: 'up' };

function def(base, extra) {
  return Object.assign({}, base, extra);
}

const SCENARIO_DEFS = [
  // ---------------- Tier 1: constant velocity stages ----------------
  def(HORIZONTAL, {
    id: 'walk-to-shop',
    tier: 1,
    title: 'Walk to the shop',
    object: 'person',
    story: 'Maya walks 8 m to the shop in 4 s, waits there for 2 s, then walks back home in 4 s.',
    build: () => ScnMM.fromDisplacementPoints([[0, 0], [4, 8], [6, 8], [10, 0]]),
  }),
  def(HORIZONTAL, {
    id: 'steady-car',
    tier: 1,
    title: 'Steady car',
    object: 'car',
    story: 'A car drives to the right at a steady 5 m/s for 8 s.',
    build: () => ScnMM.createMotion({ s0: 0, v0: 5, segments: [{ duration: 8 }] }),
    equation: { s0: 0, u: 5, a: 0 },
  }),
  def(HORIZONTAL, {
    id: 'reversing-steady',
    tier: 1,
    title: 'Reversing at a steady speed',
    object: 'car',
    story: 'A car starts 18 m to the right of the lamp post and reverses to the left at a steady 3 m/s for 6 s.',
    build: () => ScnMM.createMotion({ s0: 18, v0: -3, segments: [{ duration: 6 }] }),
    equation: { s0: 18, u: -3, a: 0 },
  }),
  def(HORIZONTAL, {
    id: 'bus-stop',
    tier: 1,
    title: 'Bus with a stop',
    object: 'bus',
    story: 'A bus travels 20 m in 5 s, stops for 3 s at a bus stop, then travels another 20 m in 4 s.',
    build: () => ScnMM.fromDisplacementPoints([[0, 0], [5, 20], [8, 20], [12, 40]]),
  }),
  def(HORIZONTAL, {
    id: 'dog-fetch',
    tier: 1,
    title: 'Dog fetching a stick',
    object: 'dog',
    story: 'A dog sprints 12 m out to a stick in 2 s, spends 1 s picking it up, then trots back 12 m in 6 s.',
    build: () => ScnMM.fromDisplacementPoints([[0, 0], [2, 12], [3, 12], [9, 0]]),
  }),

  // ---------------- Tier 2: uniform acceleration ----------------
  def(HORIZONTAL, {
    id: 'car-trip',
    tier: 2,
    title: 'Car between traffic lights',
    object: 'car',
    story: 'A car accelerates from rest at 2 m/s² for 5 s, cruises at 10 m/s for 5 s, then brakes to rest in 4 s.',
    build: () => ScnMM.fromVelocityPoints([[0, 0], [5, 10], [10, 10], [14, 0]]),
  }),
  def(HORIZONTAL, {
    id: 'cyclist-brakes',
    tier: 2,
    title: 'Cyclist braking',
    object: 'cyclist',
    story: 'A cyclist moving right at 8 m/s brakes steadily and stops in 4 s.',
    build: () => ScnMM.createMotion({ s0: 0, v0: 8, segments: [{ duration: 4, a: -2 }] }),
    equation: { s0: 0, u: 8, a: -2 },
  }),
  def(HORIZONTAL, {
    id: 'reverse-speeding-up',
    tier: 2,
    title: 'Reversing and speeding up',
    object: 'car',
    story: 'A car starts from rest and reverses to the left, speeding up steadily for 4 s. Its acceleration is −1.5 m/s² — negative, yet it is speeding up.',
    build: () => ScnMM.createMotion({ s0: 12, v0: 0, segments: [{ duration: 4, a: -1.5 }] }),
    equation: { s0: 12, u: 0, a: -1.5 },
    misconceptions: ['neg-accel-deceleration'],
  }),
  def(HORIZONTAL, {
    id: 'reverse-braking',
    tier: 2,
    title: 'Braking while reversing',
    object: 'car',
    story: 'A car reversing to the left at 6 m/s brakes to rest in 3 s. Its acceleration is +2 m/s² — positive, yet it is slowing down.',
    build: () => ScnMM.createMotion({ s0: 12, v0: -6, segments: [{ duration: 3, a: 2 }] }),
    equation: { s0: 12, u: -6, a: 2 },
    misconceptions: ['backwards-neg-accel', 'pos-gradient-speeding'],
  }),
  def(HORIZONTAL, {
    id: 'train-journey',
    tier: 2,
    title: 'Train between stations',
    object: 'train',
    story: 'A train pulls out of a station, accelerating for 10 s to 15 m/s, cruises for 20 s, then decelerates for 15 s to stop at the next station.',
    build: () => ScnMM.fromVelocityPoints([[0, 0], [10, 15], [30, 15], [45, 0]]),
  }),

  // ---------------- Tier 3: one reversal / multi-stage ----------------
  def(VERTICAL, {
    id: 'ball-thrown-up',
    tier: 3,
    title: 'Ball thrown upwards',
    object: 'ball',
    story: 'A ball is thrown straight up at 15 m/s and caught at the same height 3 s later. Take g = 10 m/s². Up is positive.',
    build: () => ScnMM.createMotion({ s0: 0, v0: 15, segments: [{ duration: 3, a: -10 }] }),
    equation: { s0: 0, u: 15, a: -10 },
    misconceptions: ['zero-crossing-stops', 'velocity-acceleration-same'],
  }),
  def(HORIZONTAL, {
    id: 'trolley-ramp',
    tier: 3,
    title: 'Trolley up a ramp',
    object: 'trolley',
    story: 'A trolley is pushed up a ramp at 3 m/s. It slows, stops for an instant, then rolls back down. Up the ramp (right) is positive; its acceleration is −1 m/s² throughout.',
    build: () => ScnMM.createMotion({ s0: 0, v0: 3, segments: [{ duration: 6, a: -1 }] }),
    equation: { s0: 0, u: 3, a: -1 },
    misconceptions: ['zero-crossing-stops'],
  }),
  def(HORIZONTAL, {
    id: 'overshoot',
    tier: 3,
    title: 'Overshooting the parking space',
    object: 'car',
    story: 'A car moving right at 6 m/s brakes with acceleration −2 m/s². It stops after 3 s but the driver keeps the same acceleration (now reversing) for another 3 s.',
    build: () => ScnMM.createMotion({ s0: 0, v0: 6, segments: [{ duration: 6, a: -2 }] }),
    equation: { s0: 0, u: 6, a: -2 },
  }),
  def(HORIZONTAL, {
    id: 'shuttle-run',
    tier: 3,
    title: 'Shuttle run',
    object: 'runner',
    story: 'A runner accelerates to 6 m/s, slows to touch a line, then sprints back towards the start.',
    build: () => ScnMM.fromVelocityPoints([[0, 0], [2, 6], [4, 6], [6, 0], [8, -6], [9, -6], [10, 0]]),
  }),
  def(VERTICAL, {
    id: 'lift',
    tier: 3,
    title: 'Lift going up then down',
    object: 'lift',
    story: 'A lift goes up three floors, waits, then comes back down past its starting floor. Up is positive.',
    build: () =>
      ScnMM.fromVelocityPoints([[0, 0], [2, 2], [6, 2], [8, 0], [10, 0], [12, -2], [17, -2], [19, 0]]),
  }),

  // ---------------- Tier 4: complex piecewise ----------------
  def(HORIZONTAL, {
    id: 'parking',
    tier: 4,
    title: 'Parallel parking',
    object: 'car',
    story: 'A driver pulls forward, stops, reverses into a space, stops, then edges forward to straighten up.',
    build: () =>
      ScnMM.fromVelocityPoints([[0, 0], [1, 2], [3, 2], [4, 0], [5, 0], [6, -3], [8, -3], [9, 0], [10, 0], [11, 1], [12, 0]]),
  }),
  def(VERTICAL, {
    id: 'drone',
    tier: 4,
    title: 'Delivery drone',
    object: 'drone',
    story: 'A drone climbs, hovers, drops below its launch height to deliver a parcel, then climbs back.',
    build: () =>
      ScnMM.fromVelocityPoints([[0, 0], [2, 4], [4, 4], [6, 0], [8, 0], [10, -4], [14, -4], [16, 0], [17, 0], [19, 4], [20, 4], [22, 0]]),
  }),
  def(HORIZONTAL, {
    id: 'zigzag',
    tier: 4,
    title: 'Robot vacuum',
    object: 'robot',
    story: 'A robot vacuum moves back and forth along a hallway with steadily changing velocity — it never stops for longer than an instant.',
    build: () => ScnMM.fromVelocityPoints([[0, 3], [3, -3], [5, 1], [7, -1], [10, 2]]),
  }),

  // ---------------- Tier 5: non-uniform acceleration ----------------
  def(HORIZONTAL, {
    id: 'sprinter',
    tier: 5,
    title: 'Sprinter: decreasing acceleration',
    object: 'runner',
    story: 'A sprinter’s acceleration starts at 4 m/s² and falls steadily to zero over 5 s; she then holds her top speed for 3 s.',
    build: () => ScnMM.createMotion({ s0: 0, v0: 0, segments: [{ duration: 5, a: 4, jerk: -0.8 }, { duration: 3 }] }),
    misconceptions: ['steeper-greater-accel'],
  }),
  def(VERTICAL, {
    id: 'rocket',
    tier: 5,
    title: 'Rocket: increasing acceleration',
    object: 'rocket',
    story: 'As a rocket burns fuel it gets lighter, so its acceleration rises from 1 m/s² to 4 m/s² over 5 s. Up is positive.',
    build: () => ScnMM.createMotion({ s0: 0, v0: 0, segments: [{ duration: 5, a: 1, jerk: 0.6 }] }),
  }),
  def(HORIZONTAL, {
    id: 'emergency-stop',
    tier: 5,
    title: 'Braking harder and harder',
    object: 'car',
    story: 'A car at 20 m/s brakes with increasing deceleration: its acceleration goes from 0 to −8 m/s² over 5 s, when it stops.',
    build: () => ScnMM.createMotion({ s0: 0, v0: 20, segments: [{ duration: 5, a: 0, jerk: -1.6 }] }),
  }),
  def(VERTICAL, {
    id: 'skydiver',
    tier: 5,
    title: 'Skydiver reaching terminal velocity',
    object: 'skydiver',
    story: 'A skydiver falls from rest. Air resistance grows, so the (negative) acceleration shrinks from −10 m/s² to zero over 10 s; she then falls at a steady 50 m/s. Up is positive.',
    build: () => ScnMM.createMotion({ s0: 600, v0: 0, segments: [{ duration: 10, a: -10, jerk: 1 }, { duration: 4 }] }),
    misconceptions: ['neg-accel-deceleration', 'neg-velocity-slowing'],
  }),
  def(VERTICAL, {
    id: 'ball-drag',
    tier: 5,
    title: 'Ball thrown up, with air resistance',
    object: 'ball',
    story: 'A ball is thrown straight up at 20 m/s and caught at the same height. Air resistance acts on it (its terminal speed is 15 m/s). Up is positive; g = 9.81 N/kg.',
    build: () => ScnDrag.simulate({ v0: 20, mass: 0.06, k: ScnDrag.kForTerminal(0.06, 9.81, 15), g: 9.81, n: 160 }).motion,
    misconceptions: ['drag-direction', 'top-no-forces', 'drag-symmetric'],
  }),
  def(HORIZONTAL, {
    id: 'pendulum-cart',
    tier: 5,
    title: 'Cart on a spring',
    object: 'trolley',
    story: 'A cart on a spring is pushed right, then pulled back. Its acceleration changes smoothly from +2 m/s² to −2 m/s² and back again.',
    build: () => ScnMM.createMotion({ s0: 0, v0: 0, segments: [{ duration: 4, a: 2, jerk: -1 }, { duration: 4, a: -2, jerk: 1 }] }),
    misconceptions: ['zero-crossing-stops'],
  }),
];

const SCENARIO_CACHE = {};

/** Get a scenario by id, with its motion built and cached. */
function getScenario(id) {
  if (SCENARIO_CACHE[id]) return SCENARIO_CACHE[id];
  const d = SCENARIO_DEFS.find((x) => x.id === id);
  if (!d) throw new Error('Unknown scenario ' + id);
  const sc = Object.assign({}, d, { motion: d.build() });
  SCENARIO_CACHE[id] = sc;
  return sc;
}

function listScenarios(tier) {
  return SCENARIO_DEFS.filter((d) => tier === undefined || d.tier === tier).map((d) => getScenario(d.id));
}

/**
 * Random scenario for a tier (1–5). Numbers are kept "nice" so every value
 * can be read off a graph exactly.
 */
function randomScenario(tier, rng) {
  const R = rng || ScnFmt.createRng(ScnFmt.randomSeed());
  const frame = R.next() < 0.25 ? VERTICAL : HORIZONTAL;
  const object = frame === VERTICAL ? R.pick(['lift', 'drone', 'ball']) : R.pick(['car', 'cyclist', 'trolley', 'runner', 'robot']);
  let motion;
  let story;
  if (tier <= 1) {
    const pts = [[0, R.int(0, 2) * 5]];
    let t = 0;
    const stages = R.int(2, 3);
    for (let i = 0; i < stages; i++) {
      t += R.int(2, 4);
      const v = R.pick([-4, -3, -2, 0, 2, 3, 4, 5]);
      const dt = t - pts[pts.length - 1][0];
      pts.push([t, pts[pts.length - 1][1] + v * dt]);
    }
    motion = ScnMM.fromDisplacementPoints(pts);
    story = 'An object moves in stages, each at a constant velocity.';
  } else if (tier === 2) {
    const dir = R.sign();
    const v1 = dir * R.int(2, 6) * 2;
    const pts = [[0, 0], [R.int(2, 4), v1]];
    pts.push([pts[1][0] + R.int(2, 4), v1]);
    pts.push([pts[2][0] + R.int(2, 4), 0]);
    motion = ScnMM.fromVelocityPoints(pts, dir < 0 ? 40 : 0);
    story = 'An object speeds up from rest, travels at a steady speed, then slows to a stop.';
  } else if (tier === 3) {
    const u = R.sign() * R.int(2, 5) * 2;
    const a = -Math.sign(u) * R.pick([1, 2]);
    const tStop = -u / a;
    motion = ScnMM.createMotion({ s0: 0, v0: u, segments: [{ duration: tStop * 2, a }] });
    story = 'An object is launched, slows down under a constant acceleration, stops for an instant and comes back.';
  } else if (tier === 4) {
    const pts = [[0, 0]];
    let t = 0;
    const n = R.int(4, 6);
    for (let i = 0; i < n; i++) {
      t += R.int(1, 3);
      pts.push([t, i === n - 1 ? 0 : R.pick([-6, -4, -2, 0, 2, 4, 6])]);
    }
    motion = ScnMM.fromVelocityPoints(pts);
    story = 'A multi-stage journey with changes of direction.';
  } else {
    const a0 = R.pick([-3, -2, 2, 3]);
    const j = -a0 / R.pick([2, 3, 4]);
    motion = ScnMM.createMotion({ s0: 0, v0: R.pick([-4, 0, 4]), segments: [{ duration: Math.abs(a0 / j) * 2, a: a0, jerk: j }] });
    story = 'An object whose acceleration changes steadily with time.';
  }
  return Object.assign({}, frame, {
    id: 'random-' + tier + '-' + Math.floor(R.next() * 1e6),
    tier,
    title: 'Mystery motion',
    object,
    story,
    motion,
    generated: true,
  });
}

/** Equation string for a uniform-acceleration scenario: s = s0 + ut + ½at². */
function equationText(eq) {
  const parts = [];
  if (eq.s0) parts.push(ScnFmt.num(eq.s0));
  if (eq.u) parts.push((parts.length ? (eq.u < 0 ? ' − ' : ' + ') : eq.u < 0 ? '−' : '') + ScnFmt.trimNumber(Math.abs(eq.u)) + 't');
  if (eq.a) {
    const half = eq.a / 2;
    parts.push((parts.length ? (half < 0 ? ' − ' : ' + ') : half < 0 ? '−' : '') + ScnFmt.trimNumber(Math.abs(half)) + 't²');
  }
  return 's = ' + (parts.length ? parts.join('') : '0');
}

const scenariosApi = { SCENARIO_DEFS, getScenario, listScenarios, randomScenario, equationText, HORIZONTAL, VERTICAL };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = scenariosApi;
} else if (typeof window !== 'undefined') {
  window.Scenarios = scenariosApi;
}
