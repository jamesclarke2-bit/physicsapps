/**
 * Quantitative question generators.
 *
 * Every generator takes a seeded RNG and returns a self-contained question:
 *   { topic, tier, skills, text, graph, answer, unit, tol, steps, wrongs }
 *
 * - `graph` is { motion, quantity, schematic?, highlight?: [t0, t1], tangentAt? }
 * - `steps` is the full worked answer, shown after the student commits.
 * - `wrongs` lists predictable wrong answers, each tagged with the
 *   misconception behind it, so feedback can say WHY an answer is wrong.
 *
 * Numbers are chosen so every value can be read exactly off the graph, and
 * every constant a question needs is stated in its own text.
 */

const QgMM = typeof module !== 'undefined' && module.exports ? require('./motionModel.js') : window.MotionModel;
const QgFmt = typeof module !== 'undefined' && module.exports ? require('./format.js') : window.Fmt;

const n = (x, dp) => QgFmt.num(x, dp === undefined ? 2 : dp);
const sg = (x, dp) => QgFmt.signed(x, dp === undefined ? 2 : dp);

function q(base) {
  return Object.assign({ tol: 0.02, wrongs: [], steps: [], skills: [] }, base);
}

// ---------------------------------------------------------------------------
// Foundation
// ---------------------------------------------------------------------------

/** Velocity from the gradient of a displacement–time graph (stages at constant velocity). */
function velocityFromGradient(R) {
  const pts = [[0, R.int(0, 3) * 4]];
  let t = 0;
  const vels = [];
  for (let i = 0; i < 3; i++) {
    const dt = R.int(2, 4);
    let v = R.pick([-4, -3, -2, 0, 2, 3, 4, 5, 6]);
    if (i === 0 && v === 0) v = 3;
    t += dt;
    vels.push(v);
    pts.push([t, pts[pts.length - 1][1] + v * dt]);
  }
  // make sure at least one stage is negative, so signs matter
  const motion = QgMM.fromDisplacementPoints(pts);
  const k = R.int(0, 2);
  const p0 = pts[k];
  const p1 = pts[k + 1];
  const v = (p1[1] - p0[1]) / (p1[0] - p0[0]);
  const wrongs = [];
  if (v !== 0) wrongs.push({ value: -v, misconception: 'neg-velocity-slowing', message: 'Right size, wrong sign. The displacement ' + (v < 0 ? 'decreases' : 'increases') + ', so the velocity is ' + (v < 0 ? 'negative' : 'positive') + '.' });
  if (p1[1] !== v) wrongs.push({ value: p1[1], misconception: 'gradient-vs-value', message: 'That is the displacement at ' + n(p1[0]) + ' s — the HEIGHT of the graph. Velocity is the GRADIENT: change in displacement ÷ time taken.' });
  return q({
    topic: 'vel-gradient',
    tier: 'gcse',
    skills: ['gradient', 'velocity'],
    text: 'The displacement–time graph shows an object moving along a straight line (positive = right). Find its velocity between t = ' + n(p0[0]) + ' s and t = ' + n(p1[0]) + ' s.',
    graph: { motion, quantity: 's', highlight: [p0[0], p1[0]] },
    answer: v,
    unit: 'm/s',
    signed: true,
    steps: [
      'Velocity = gradient of the s–t graph = change in displacement ÷ change in time.',
      'Change in displacement = ' + n(p1[1]) + ' − ' + n(p0[1]) + ' = ' + sg(p1[1] - p0[1]) + ' m.',
      'Change in time = ' + n(p1[0]) + ' − ' + n(p0[0]) + ' = ' + n(p1[0] - p0[0]) + ' s.',
      'Velocity = ' + sg(p1[1] - p0[1]) + ' ÷ ' + n(p1[0] - p0[0]) + ' = ' + sg(v) + ' m/s' + (v < 0 ? ' (moving left).' : v > 0 ? ' (moving right).' : ' (at rest).'),
    ],
    wrongs,
  });
}

/** Acceleration from the gradient of a velocity–time graph. */
function accelerationFromGradient(R) {
  const pts = [[0, R.pick([-6, -4, 0, 2, 4])]];
  let t = 0;
  for (let i = 0; i < 3; i++) {
    t += R.int(2, 4);
    pts.push([t, R.pick([-8, -6, -4, -2, 0, 2, 4, 6, 8])]);
  }
  const motion = QgMM.fromVelocityPoints(pts);
  const k = R.int(0, 2);
  const p0 = pts[k];
  const p1 = pts[k + 1];
  const a = (p1[1] - p0[1]) / (p1[0] - p0[0]);
  const wrongs = [];
  if (a !== 0) {
    const backwards = p0[1] + p1[1] < 0;
    wrongs.push({ value: -a, misconception: backwards ? 'backwards-neg-accel' : 'neg-accel-slowing', message: 'Right size, wrong sign. Velocity goes from ' + sg(p0[1]) + ' to ' + sg(p1[1]) + ' m/s — it ' + (a > 0 ? 'INCREASES' : 'DECREASES') + ', so the acceleration is ' + (a > 0 ? 'positive' : 'negative') + ' whichever way the object is moving.' });
  }
  if (p1[1] !== a) wrongs.push({ value: p1[1], misconception: 'velocity-acceleration-same', message: 'That is the velocity at ' + n(p1[0]) + ' s. Acceleration is how fast the velocity CHANGES — the gradient.' });
  return q({
    topic: 'acc-gradient',
    tier: 'gcse',
    skills: ['gradient', 'acceleration'],
    text: 'The velocity–time graph shows an object moving along a straight line (positive = right). Find its acceleration between t = ' + n(p0[0]) + ' s and t = ' + n(p1[0]) + ' s.',
    graph: { motion, quantity: 'v', highlight: [p0[0], p1[0]] },
    answer: a,
    unit: 'm/s²',
    signed: true,
    steps: [
      'Acceleration = gradient of the v–t graph = change in velocity ÷ change in time.',
      'Change in velocity = ' + sg(p1[1]) + ' − (' + sg(p0[1]) + ') = ' + sg(p1[1] - p0[1]) + ' m/s.',
      'Change in time = ' + n(p1[0] - p0[0]) + ' s.',
      'Acceleration = ' + sg(p1[1] - p0[1]) + ' ÷ ' + n(p1[0] - p0[0]) + ' = ' + sg(a) + ' m/s².',
    ],
    wrongs,
  });
}

// ---------------------------------------------------------------------------
// Intermediate
// ---------------------------------------------------------------------------

/** Displacement from the area under a velocity–time graph (all one direction). */
function displacementFromArea(R) {
  const dir = R.next() < 0.3 ? -1 : 1;
  const V = dir * R.int(2, 6) * 2;
  const t1 = R.int(2, 5);
  const t2 = t1 + R.int(2, 6);
  const t3 = t2 + R.int(2, 5);
  const motion = QgMM.fromVelocityPoints([[0, 0], [t1, V], [t2, V], [t3, 0]]);
  const A1 = 0.5 * t1 * V;
  const A2 = (t2 - t1) * V;
  const A3 = 0.5 * (t3 - t2) * V;
  const s = A1 + A2 + A3;
  return q({
    topic: 'disp-area',
    tier: 'gcse',
    skills: ['area', 'displacement'],
    text: 'The velocity–time graph shows a journey along a straight line (positive = right). Find the displacement of the object after ' + n(t3) + ' s.',
    graph: { motion, quantity: 'v', shadeArea: [0, t3] },
    answer: s,
    unit: 'm',
    signed: true,
    steps: [
      'Displacement = area between the v–t graph and the time axis' + (dir < 0 ? ' (below the axis, so negative).' : '.'),
      'Triangle 0–' + n(t1) + ' s: ½ × ' + n(t1) + ' × ' + sg(V) + ' = ' + sg(A1) + ' m.',
      'Rectangle ' + n(t1) + '–' + n(t2) + ' s: ' + n(t2 - t1) + ' × ' + sg(V) + ' = ' + sg(A2) + ' m.',
      'Triangle ' + n(t2) + '–' + n(t3) + ' s: ½ × ' + n(t3 - t2) + ' × ' + sg(V) + ' = ' + sg(A3) + ' m.',
      'Total displacement = ' + sg(s) + ' m.',
    ],
    wrongs: [
      { value: V * t3, misconception: null, message: 'That treats the whole graph as a rectangle. The sloping parts are triangles: use ½ × base × height for those.' },
      { value: -s, misconception: 'neg-velocity-slowing', message: 'Check the sign: the area is ' + (s < 0 ? 'below' : 'above') + ' the axis, so the displacement is ' + (s < 0 ? 'negative' : 'positive') + '.' },
    ],
  });
}

/** Velocity at a later time from an acceleration–time graph and a stated starting velocity. */
function velocityFromAccelArea(R) {
  const u = R.pick([-6, -4, 0, 2, 5]);
  const a1 = R.pick([-3, -2, 2, 3]);
  const a2 = R.pick([-2, -1, 0, 1, 2]);
  const t1 = R.int(2, 4);
  const t2 = t1 + R.int(2, 4);
  const motion = QgMM.createMotion({ v0: u, segments: [{ duration: t1, a: a1 }, { duration: t2 - t1, a: a2 }] });
  const dv = a1 * t1 + a2 * (t2 - t1);
  const v = u + dv;
  return q({
    topic: 'dv-area',
    tier: 'gcse',
    skills: ['area', 'acceleration'],
    text: 'An object’s acceleration is shown on the a–t graph (positive = right). At t = 0 its velocity is ' + sg(u) + ' m/s. Find its velocity at t = ' + n(t2) + ' s.',
    graph: { motion, quantity: 'a', shadeArea: [0, t2] },
    answer: v,
    unit: 'm/s',
    signed: true,
    steps: [
      'Area under an a–t graph = CHANGE in velocity (m/s² × s = m/s).',
      'Area 0–' + n(t1) + ' s: ' + sg(a1) + ' × ' + n(t1) + ' = ' + sg(a1 * t1) + ' m/s.',
      'Area ' + n(t1) + '–' + n(t2) + ' s: ' + sg(a2) + ' × ' + n(t2 - t1) + ' = ' + sg(a2 * (t2 - t1)) + ' m/s.',
      'Change in velocity = ' + sg(dv) + ' m/s.',
      'Final velocity = starting velocity + change = ' + sg(u) + ' + (' + sg(dv) + ') = ' + sg(v) + ' m/s.',
    ],
    wrongs: u !== 0 ? [{ value: dv, misconception: 'area-always-distance', message: 'That is the CHANGE in velocity. Add it to the starting velocity of ' + sg(u) + ' m/s.' }] : [],
  });
}

// ---------------------------------------------------------------------------
// Advanced / Challenge
// ---------------------------------------------------------------------------

function crossingVelocityGraph(R) {
  const V1 = R.int(2, 4) * 2;
  const V2 = -R.int(1, 3) * 2;
  const t1 = R.int(2, 4);
  const t2 = t1 + R.int(1, 3);
  // the graph crosses zero at a whole number of seconds, so it can be read exactly
  const tz = t2 + R.int(1, 3);
  const t3 = tz + R.int(1, 2);
  const t4 = t3 + R.int(1, 3);
  const pts = [[0, 0], [t1, V1], [t2, V1], [tz, 0], [t3, V2], [t4, V2]];
  return { pts, motion: QgMM.fromVelocityPoints(pts) };
}

/** Total distance travelled when the velocity changes sign. */
function distanceTravelled(R) {
  const { pts, motion } = crossingVelocityGraph(R);
  const T = pts[pts.length - 1][0];
  const disp = QgMM.displacementBetween(motion, 0, T);
  const dist = QgMM.distanceBetween(motion, 0, T);
  const tz = QgMM.reversalTimes(motion)[0];
  const forward = QgMM.displacementBetween(motion, 0, tz);
  const back = QgMM.displacementBetween(motion, tz, T);
  return q({
    topic: 'distance',
    tier: 'gcse',
    skills: ['area', 'displacement', 'multistage'],
    text: 'The v–t graph shows an object moving along a straight line (positive = right). Find the total DISTANCE it travels in the first ' + n(T) + ' s.',
    graph: { motion, quantity: 'v', shadeArea: [0, T], markZero: true },
    answer: dist,
    unit: 'm',
    signed: false,
    steps: [
      'The graph crosses the time axis at t = ' + n(tz) + ' s: the object stops for an instant and reverses.',
      'Area above the axis (0–' + n(tz) + ' s) = ' + sg(forward) + ' m: distance ' + n(Math.abs(forward)) + ' m to the right.',
      'Area below the axis (' + n(tz) + '–' + n(T) + ' s) = ' + sg(back) + ' m: distance ' + n(Math.abs(back)) + ' m to the left.',
      'Distance = ' + n(Math.abs(forward)) + ' + ' + n(Math.abs(back)) + ' = ' + n(dist) + ' m (all counted as positive).',
      'Compare: displacement = ' + sg(forward) + ' + (' + sg(back) + ') = ' + sg(disp) + ' m.',
    ],
    wrongs: [{ value: disp, misconception: 'displacement-distance', message: 'That is the displacement (areas below the axis subtracted). Distance counts every metre travelled, so ADD the size of the area below the axis.' }],
  });
}

/** Net displacement when the velocity changes sign. */
function netDisplacement(R) {
  const base = distanceTravelled(R);
  const motion = base.graph.motion;
  const T = motion.duration;
  const disp = QgMM.displacementBetween(motion, 0, T);
  const dist = QgMM.distanceBetween(motion, 0, T);
  return q(
    Object.assign({}, base, {
      topic: 'displacement-net',
      text: 'The v–t graph shows an object moving along a straight line (positive = right). Find its DISPLACEMENT after ' + n(T) + ' s.',
      answer: disp,
      signed: true,
      steps: base.steps.slice(0, 3).concat(['Displacement = area above − area below = ' + sg(disp) + ' m.']),
      wrongs: [{ value: dist, misconception: 'area-always-distance', message: 'That is the total distance. For displacement, area BELOW the axis is negative — subtract it.' }],
    })
  );
}

/** Average velocity and average speed for an out-and-back journey on an s–t graph. */
function averages(R, which) {
  const out = R.int(3, 6) * 4;
  const back = out + R.int(1, 3) * 4;
  const t1 = R.int(2, 4) * 2;
  const t2 = t1 + R.int(1, 2) * 2;
  const t3 = t2 + R.int(2, 4) * 2;
  const motion = QgMM.fromDisplacementPoints([[0, 0], [t1, out], [t2, out], [t3, out - back]]);
  const disp = out - back;
  const dist = out + back;
  const avgV = disp / t3;
  const avgS = dist / t3;
  if (which === 'speed') {
    return q({
      topic: 'avg-speed',
      tier: 'gcse',
      skills: ['displacement', 'multistage'],
      text: 'The s–t graph shows a walk along a straight path (positive = right). Find the AVERAGE SPEED over the whole ' + n(t3) + ' s.',
      graph: { motion, quantity: 's' },
      answer: avgS,
      unit: 'm/s',
      signed: false,
      steps: [
        'Average speed = total DISTANCE ÷ total time.',
        'Distance = ' + n(out) + ' m out + ' + n(back) + ' m back = ' + n(dist) + ' m.',
        'Average speed = ' + n(dist) + ' ÷ ' + n(t3) + ' = ' + n(avgS) + ' m/s.',
      ],
      wrongs: [{ value: Math.abs(avgV), misconception: 'displacement-distance', message: 'That uses the displacement. Average SPEED uses the total distance travelled.' }, { value: avgV, misconception: 'displacement-distance', message: 'That is the average velocity. Average speed uses distance, not displacement.' }],
    });
  }
  return q({
    topic: 'avg-velocity',
    tier: 'gcse',
    skills: ['displacement', 'multistage', 'signs'],
    text: 'The s–t graph shows a walk along a straight path (positive = right). Find the AVERAGE VELOCITY over the whole ' + n(t3) + ' s.',
    graph: { motion, quantity: 's' },
    answer: avgV,
    unit: 'm/s',
    signed: true,
    steps: [
      'Average velocity = total DISPLACEMENT ÷ total time.',
      'Displacement = final position − starting position = ' + sg(disp) + ' − 0 = ' + sg(disp) + ' m.',
      'Average velocity = ' + sg(disp) + ' ÷ ' + n(t3) + ' = ' + sg(avgV) + ' m/s.',
    ],
    wrongs: [{ value: avgS, misconception: 'displacement-distance', message: 'That is the average SPEED (total distance ÷ time). Average velocity uses displacement — where you end up relative to the start.' }],
  });
}

/** When does the object change direction? (constant acceleration opposing the initial velocity) */
function whenReverses(R, fromAccel) {
  const u = R.sign() * R.int(2, 6) * 2;
  const a = -Math.sign(u) * R.pick([1, 2, 4]);
  const tz = -u / a;
  const T = tz + R.int(2, 4);
  const motion = QgMM.createMotion({ v0: u, segments: [{ duration: T, a }] });
  if (fromAccel) {
    return q({
      topic: 'reverse-from-a',
      tier: 'alevel',
      skills: ['acceleration', 'signs', 'area'],
      text: 'An object moving along a straight line (positive = right) has the constant acceleration shown. At t = 0 its velocity is ' + sg(u) + ' m/s. At what time does it change direction?',
      graph: { motion, quantity: 'a' },
      answer: tz,
      unit: 's',
      signed: false,
      steps: [
        'It changes direction when its velocity passes through zero.',
        'The area under the a–t graph from 0 to t is the change in velocity: ' + sg(a) + ' × t.',
        'Set ' + sg(u) + ' + (' + sg(a) + ')t = 0, so t = ' + n(Math.abs(u)) + ' ÷ ' + n(Math.abs(a)) + ' = ' + n(tz) + ' s.',
      ],
      wrongs: [],
    });
  }
  return q({
    topic: 'reverse-time',
    tier: 'gcse',
    skills: ['velocity', 'signs'],
    text: 'The v–t graph shows an object moving along a straight line (positive = right). At what time does it change direction?',
    graph: { motion, quantity: 'v', hideZero: true },
    answer: tz,
    unit: 's',
    signed: false,
    steps: [
      'The object changes direction where its velocity changes sign — where the v–t graph crosses the time axis.',
      'The velocity starts at ' + sg(u) + ' m/s and changes by ' + sg(a) + ' m/s every second.',
      'Time to reach zero = ' + n(Math.abs(u)) + ' ÷ ' + n(Math.abs(a)) + ' = ' + n(tz) + ' s.',
    ],
    wrongs: [{ value: 0, misconception: 'zero-crossing-stops', message: 'Look for where the VELOCITY is zero, not where the graph starts.' }],
  });
}

// ---------------------------------------------------------------------------
// A-level
// ---------------------------------------------------------------------------

/** Trapezium journey: given total time, total distance and the accel/decel times, find the maximum velocity. */
function trapeziumMaxVelocity(R) {
  const V = R.int(3, 8) * 2;
  const ta = R.int(2, 5);
  const td = R.int(2, 5);
  const T = ta + td + R.int(3, 10);
  const D = V * (T - (ta + td) / 2);
  const motion = QgMM.fromVelocityPoints([[0, 0], [ta, V], [T - td, V], [T, 0]]);
  return q({
    topic: 'trapezium-vmax',
    tier: 'alevel',
    skills: ['reconstruction', 'area', 'alevel'],
    text: 'A train starts from rest, accelerates uniformly for ' + n(ta) + ' s, travels at a constant maximum velocity, then decelerates uniformly for ' + n(td) + ' s to stop. The whole journey takes ' + n(T) + ' s and covers ' + n(D) + ' m. Find the maximum velocity.',
    graph: { motion, quantity: 'v', schematic: true },
    answer: V,
    unit: 'm/s',
    signed: false,
    steps: [
      'Sketch the v–t graph: a trapezium with height V (unknown).',
      'Area = displacement: ½·' + n(ta) + '·V + (' + n(T) + ' − ' + n(ta) + ' − ' + n(td) + ')·V + ½·' + n(td) + '·V = ' + n(D) + '.',
      'So V × (' + n(T) + ' − ½(' + n(ta) + ' + ' + n(td) + ')) = V × ' + n(T - (ta + td) / 2) + ' = ' + n(D) + '.',
      'V = ' + n(D) + ' ÷ ' + n(T - (ta + td) / 2) + ' = ' + n(V) + ' m/s.',
    ],
    wrongs: [{ value: D / T, misconception: null, message: 'That is the average velocity. The maximum is larger, because the train spends time below top speed while speeding up and slowing down.' }],
  });
}

/** Find an unknown deceleration given total time and distance for a triangle-shaped v–t graph. */
function unknownDeceleration(R) {
  const V = R.int(3, 8) * 2;
  const a = R.pick([1, 2, 4]);
  const t1 = V / a;
  const t2 = R.pick([2, 4, 5, 8]);
  const T = t1 + t2;
  const D = 0.5 * V * T;
  const b = V / t2;
  const motion = QgMM.fromVelocityPoints([[0, 0], [t1, V], [T, 0]]);
  return q({
    topic: 'unknown-decel',
    tier: 'alevel',
    skills: ['reconstruction', 'gradient', 'alevel'],
    text: 'A cyclist starts from rest and accelerates uniformly at ' + n(a) + ' m/s², then immediately brakes uniformly to rest. The whole journey takes ' + n(T) + ' s and covers ' + n(D) + ' m. Find the size of the braking deceleration.',
    graph: { motion, quantity: 'v', schematic: true },
    answer: b,
    unit: 'm/s²',
    signed: false,
    steps: [
      'The v–t graph is a triangle with base ' + n(T) + ' s and height V.',
      'Area = ½ × ' + n(T) + ' × V = ' + n(D) + ', so V = ' + n(V) + ' m/s.',
      'Accelerating at ' + n(a) + ' m/s² takes V ÷ a = ' + n(t1) + ' s, leaving ' + n(t2) + ' s for braking.',
      'Deceleration = ' + n(V) + ' ÷ ' + n(t2) + ' = ' + n(b) + ' m/s² (acceleration = ' + sg(-b) + ' m/s²).',
    ],
    wrongs: [{ value: a, misconception: null, message: 'That assumes braking takes as long as speeding up. Find V from the area first, then the braking time.' }],
  });
}

/** Missing section: given the maximum velocity and the total displacement, find the end time. */
function missingEndTime(R) {
  const V = R.int(2, 6) * 2;
  const t1 = R.int(2, 4);
  const t2 = t1 + R.int(3, 8);
  const T = t2 + R.int(2, 6);
  const D = V * (t2 - t1) + 0.5 * V * t1 + 0.5 * V * (T - t2);
  const motion = QgMM.fromVelocityPoints([[0, 0], [t1, V], [t2, V], [T, 0]]);
  return q({
    topic: 'missing-section',
    tier: 'alevel',
    skills: ['reconstruction', 'area', 'alevel'],
    text: 'A lift accelerates uniformly from rest to ' + n(V) + ' m/s in ' + n(t1) + ' s, moves at that speed until t = ' + n(t2) + ' s, then decelerates uniformly to rest. It travels ' + n(D) + ' m in total. At what time does it stop?',
    graph: { motion, quantity: 'v', hideAfter: t2 },
    answer: T,
    unit: 's',
    signed: false,
    steps: [
      'Area up to ' + n(t2) + ' s = ½·' + n(t1) + '·' + n(V) + ' + ' + n(t2 - t1) + '·' + n(V) + ' = ' + n(0.5 * t1 * V + (t2 - t1) * V) + ' m.',
      'Remaining distance = ' + n(D) + ' − ' + n(0.5 * t1 * V + (t2 - t1) * V) + ' = ' + n(0.5 * V * (T - t2)) + ' m, a triangle of height ' + n(V) + ' m/s.',
      '½ × base × ' + n(V) + ' = ' + n(0.5 * V * (T - t2)) + ', so base = ' + n(T - t2) + ' s.',
      'It stops at t = ' + n(t2) + ' + ' + n(T - t2) + ' = ' + n(T) + ' s.',
    ],
    wrongs: [{ value: T - t2, misconception: null, message: 'That is how long the deceleration lasts. Add it to ' + n(t2) + ' s to get the time it stops.' }],
  });
}

/** Area under a linearly decreasing a–t graph (non-uniform acceleration). */
function variableAcceleration(R) {
  const a0 = R.pick([2, 3, 4, 6]);
  const T = R.pick([2, 4, 5, 6]);
  const u = R.pick([0, 2, 5]);
  const motion = QgMM.createMotion({ v0: u, segments: [{ duration: T, a: a0, jerk: -a0 / T }] });
  const v = u + 0.5 * a0 * T;
  return q({
    topic: 'variable-accel',
    tier: 'alevel',
    skills: ['area', 'acceleration', 'alevel'],
    text: 'A car’s acceleration falls steadily from ' + n(a0) + ' m/s² to zero over ' + n(T) + ' s, as shown. Its velocity at t = 0 is ' + sg(u) + ' m/s. Find its velocity at t = ' + n(T) + ' s.',
    graph: { motion, quantity: 'a', shadeArea: [0, T] },
    answer: v,
    unit: 'm/s',
    signed: true,
    steps: [
      'Change in velocity = area under the a–t graph — a triangle here.',
      'Area = ½ × ' + n(T) + ' × ' + n(a0) + ' = ' + n(0.5 * a0 * T) + ' m/s.',
      'Final velocity = ' + sg(u) + ' + ' + n(0.5 * a0 * T) + ' = ' + sg(v) + ' m/s.',
      'Note: the acceleration is DECREASING but still positive, so the car keeps speeding up — just less and less quickly.',
    ],
    wrongs: [{ value: u + a0 * T, misconception: null, message: 'That treats the acceleration as constant at ' + n(a0) + ' m/s². It falls to zero, so use the area of the triangle.' }, { value: u, misconception: 'steeper-greater-accel', message: 'Falling acceleration does not mean falling velocity: the acceleration is still positive, so the velocity still increases.' }],
  });
}

/** Instantaneous velocity from a tangent on a curved s–t graph. */
function tangentVelocity(R) {
  const a = R.pick([1, 2, -1, -2]);
  const u = a > 0 ? R.pick([0, 1, 2]) : R.pick([8, 10, 12]);
  const T = 6;
  const t = R.int(2, 4);
  const motion = QgMM.createMotion({ v0: u, segments: [{ duration: T, a }] });
  const v = u + a * t;
  return q({
    topic: 'tangent',
    tier: 'alevel',
    skills: ['gradient', 'velocity', 'alevel'],
    text: 'The s–t graph is curved. Draw a tangent at t = ' + n(t) + ' s and use it to estimate the object’s velocity at that instant. (A tolerance of 10% is allowed for an estimate.)',
    graph: { motion, quantity: 's', tangentAt: t, tangentHidden: true },
    answer: v,
    unit: 'm/s',
    signed: true,
    tol: 0.1,
    steps: [
      'The velocity at an instant is the gradient of the TANGENT to the s–t graph at that time.',
      'A tangent drawn at t = ' + n(t) + ' s just touches the curve there without crossing it.',
      'Pick two far-apart points on the tangent and calculate rise ÷ run.',
      'The exact value is ' + sg(v) + ' m/s.',
    ],
    wrongs: [{ value: QgMM.stateAt(motion, t).s / t, misconception: 'gradient-vs-value', message: 'That is the gradient of a line from the origin (an AVERAGE velocity). For the velocity at an instant, use the tangent at that point.' }],
  });
}

/** Optimisation (A*): minimum possible top speed for a journey of fixed distance and time with limited acceleration. */
function optimiseMinTopSpeed(R) {
  const a = R.pick([1, 2]);
  const V = R.pick([6, 8, 10, 12]);
  const ta = V / a;
  const T = 2 * ta + R.pick([2, 4, 6, 10]);
  const D = V * (T - ta);
  const motion = QgMM.fromVelocityPoints([[0, 0], [ta, V], [T - ta, V], [T, 0]]);
  return q({
    topic: 'optimise',
    tier: 'extension',
    skills: ['reconstruction', 'alevel'],
    text: 'A tram must travel ' + n(D) + ' m between stops in exactly ' + n(T) + ' s, starting and ending at rest. Its acceleration and deceleration can be at most ' + n(a) + ' m/s². What is the LOWEST possible top speed it can use?',
    graph: { motion, quantity: 'v', schematic: true },
    answer: V,
    unit: 'm/s',
    signed: false,
    steps: [
      'To keep the top speed as low as possible, reach it as quickly as possible: accelerate and decelerate at the maximum ' + n(a) + ' m/s², and cruise in between.',
      'With top speed V, each speed change takes V/' + n(a) + ' s, so area = V(T − V/' + n(a) + ') = D.',
      'V(' + n(T) + ' − V/' + n(a) + ') = ' + n(D) + '  →  V² − ' + n(a * T) + 'V + ' + n(a * D) + ' = 0.',
      'Solving, V = ' + n(V) + ' m/s (the other root is too big: it would need more time than the journey has).',
    ],
    wrongs: [{ value: D / T, misconception: null, message: 'That would need the tram to be at full speed instantly. It has to speed up and slow down, so the top speed must be higher than the average.' }],
  });
}

// ---------------------------------------------------------------------------
// Mathematical extension (calculus)
// ---------------------------------------------------------------------------

function calcDerivative(R) {
  const p = R.pick([1, 2]);
  const qq = R.pick([-6, -3, 0, 3]);
  const r = R.pick([0, 2, 4]);
  const t = R.int(1, 3);
  // s = p t³ + q t² + r t  →  v = 3p t² + 2q t + r,  a = 6p t + 2q
  const motion = QgMM.createMotion({ v0: r, segments: [{ duration: 4, a: 2 * qq, jerk: 6 * p }] });
  const wantAccel = R.next() < 0.5;
  const v = 3 * p * t * t + 2 * qq * t + r;
  const acc = 6 * p * t + 2 * qq;
  const sStr = 's = ' + (p === 1 ? '' : p) + 't³' + (qq ? (qq < 0 ? ' − ' : ' + ') + Math.abs(qq) + 't²' : '') + (r ? ' + ' + r + 't' : '');
  return q({
    topic: 'calc-derivative',
    tier: 'extension',
    skills: ['maths', 'gradient'],
    text: 'An object’s displacement is ' + sStr + ' (s in metres, t in seconds). Find its ' + (wantAccel ? 'acceleration' : 'velocity') + ' at t = ' + t + ' s.',
    graph: { motion, quantity: 's', tangentAt: t },
    answer: wantAccel ? acc : v,
    unit: wantAccel ? 'm/s²' : 'm/s',
    signed: true,
    steps: [
      'v = ds/dt = ' + 3 * p + 't²' + (qq ? (qq < 0 ? ' − ' : ' + ') + Math.abs(2 * qq) + 't' : '') + (r ? ' + ' + r : '') + '.',
      wantAccel ? 'a = dv/dt = ' + 6 * p + 't' + (qq ? (qq < 0 ? ' − ' : ' + ') + Math.abs(2 * qq) : '') + '.' : 'At t = ' + t + ': v = ' + sg(v) + ' m/s.',
      wantAccel ? 'At t = ' + t + ': a = ' + sg(acc) + ' m/s².' : 'This is the gradient of the tangent to the s–t graph at t = ' + t + ' s.',
    ],
    wrongs: [{ value: QgMM.stateAt(motion, t).s, misconception: 'gradient-vs-value', message: 'That is the displacement itself. Differentiate to get the rate of change.' }],
  });
}

function calcIntegral(R) {
  const p = R.pick([1, 3]);
  const c = R.pick([-4, 0, 2]);
  const T = R.pick([2, 3]);
  // v = 3p t² ... keep coefficients so the integral is whole: v = 3p t² + c → s = p t³ + c t
  const motion = QgMM.createMotion({ v0: c, segments: [{ duration: T, a: 0, jerk: 6 * p }] });
  const s = p * T * T * T + c * T;
  return q({
    topic: 'calc-integral',
    tier: 'extension',
    skills: ['maths', 'area'],
    text: 'An object’s velocity is v = ' + 3 * p + 't²' + (c ? (c < 0 ? ' − ' : ' + ') + Math.abs(c) : '') + ' m/s. Find its displacement between t = 0 and t = ' + T + ' s.',
    graph: { motion, quantity: 'v', shadeArea: [0, T] },
    answer: s,
    unit: 'm',
    signed: true,
    steps: [
      's = ∫v dt from 0 to ' + T + ' = [' + (p === 1 ? '' : p) + 't³' + (c ? (c < 0 ? ' − ' : ' + ') + Math.abs(c) + 't' : '') + '] from 0 to ' + T + '.',
      '= ' + n(p * T * T * T) + (c ? (c < 0 ? ' − ' : ' + ') + n(Math.abs(c * T)) : '') + ' = ' + sg(s) + ' m.',
      'This is exactly the signed area under the v–t graph between 0 and ' + T + ' s.',
    ],
    wrongs: [{ value: 3 * p * T * T + c, misconception: 'area-always-distance', message: 'That is the velocity at t = ' + T + ' s. Displacement is the area under the v–t graph — integrate.' }],
  });
}

// ---------------------------------------------------------------------------

const GENERATORS = {
  'vel-gradient': { make: velocityFromGradient, label: 'Velocity from a gradient', tier: 'gcse', band: 1 },
  'acc-gradient': { make: accelerationFromGradient, label: 'Acceleration from a gradient', tier: 'gcse', band: 1 },
  'disp-area': { make: displacementFromArea, label: 'Displacement from an area', tier: 'gcse', band: 2 },
  'dv-area': { make: velocityFromAccelArea, label: 'Change in velocity from an a–t graph', tier: 'gcse', band: 2 },
  distance: { make: distanceTravelled, label: 'Total distance travelled', tier: 'gcse', band: 3 },
  'displacement-net': { make: netDisplacement, label: 'Net displacement', tier: 'gcse', band: 3 },
  'avg-velocity': { make: (R) => averages(R, 'velocity'), label: 'Average velocity', tier: 'gcse', band: 3 },
  'avg-speed': { make: (R) => averages(R, 'speed'), label: 'Average speed', tier: 'gcse', band: 3 },
  'reverse-time': { make: (R) => whenReverses(R, false), label: 'When does it change direction?', tier: 'gcse', band: 4 },
  'reverse-from-a': { make: (R) => whenReverses(R, true), label: 'Direction change from an a–t graph', tier: 'alevel', band: 4 },
  'trapezium-vmax': { make: trapeziumMaxVelocity, label: 'Maximum velocity of a journey', tier: 'alevel', band: 5 },
  'unknown-decel': { make: unknownDeceleration, label: 'Unknown deceleration', tier: 'alevel', band: 5 },
  'missing-section': { make: missingEndTime, label: 'Missing graph section', tier: 'alevel', band: 5 },
  'variable-accel': { make: variableAcceleration, label: 'Non-uniform acceleration', tier: 'alevel', band: 5 },
  tangent: { make: tangentVelocity, label: 'Instantaneous velocity from a tangent', tier: 'alevel', band: 5 },
  optimise: { make: optimiseMinTopSpeed, label: 'Optimisation: lowest top speed (A*)', tier: 'extension', band: 6 },
  'calc-derivative': { make: calcDerivative, label: 'Calculus: differentiate s(t)', tier: 'extension', band: 6, calculus: true },
  'calc-integral': { make: calcIntegral, label: 'Calculus: integrate v(t)', tier: 'extension', band: 6, calculus: true },
};

function generate(topic, rng) {
  const g = GENERATORS[topic];
  if (!g) throw new Error('Unknown topic ' + topic);
  const R = rng || QgFmt.createRng(QgFmt.randomSeed());
  const out = g.make(R);
  out.topicLabel = g.label;
  return out;
}

/**
 * Mark a typed answer. Returns { correct, message, misconception }.
 * Checks the predictable wrong answers first so the feedback can name the misconception.
 */
function mark(question, typed) {
  const val = QgFmt.parseAnswer(typed);
  if (!isFinite(val)) return { correct: false, message: 'Type a number (use − for negative values).', misconception: null, unreadable: true };
  if (QgFmt.withinTolerance(val, question.answer, question.tol)) return { correct: true, message: 'Correct.', misconception: null };
  for (let i = 0; i < question.wrongs.length; i++) {
    const w = question.wrongs[i];
    if (Math.abs(w.value - question.answer) > 1e-9 && QgFmt.withinTolerance(val, w.value, Math.max(question.tol, 0.02))) {
      return { correct: false, message: w.message, misconception: w.misconception };
    }
  }
  if (question.signed && QgFmt.withinTolerance(-val, question.answer, question.tol) && question.answer !== 0) {
    return { correct: false, message: 'The size is right but the sign is wrong. Positive is to the right; think about which way the quantity points.', misconception: 'neg-velocity-slowing' };
  }
  if (!question.signed && val < 0) return { correct: false, message: 'This quantity can’t be negative.', misconception: 'speed-velocity' };
  return { correct: false, message: 'Not quite. Look at the worked answer to see where it went differently.', misconception: null };
}

const quantApi = { GENERATORS, generate, mark };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = quantApi;
} else if (typeof window !== 'undefined') {
  window.QuantGen = quantApi;
}
