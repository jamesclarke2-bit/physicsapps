/**
 * Compare a student's sketched graph with the true graph of a motion and
 * produce targeted, physics-based feedback.
 *
 * A sketch is an array of N values (or null where nothing was drawn) at
 * evenly spaced times from 0 to the motion's duration. Marking is
 * deliberately forgiving about exact numbers — it is a sketch — and strict
 * about the physics: the right sign, the right gradient direction, and the
 * right curvature in each phase of the journey.
 */

const GcMM = typeof module !== 'undefined' && module.exports ? require('./motionModel.js') : window.MotionModel;
const GcFmt = typeof module !== 'undefined' && module.exports ? require('./format.js') : window.Fmt;

const QUANTITY_WORDS = {
  s: { name: 'displacement', unit: 'm' },
  v: { name: 'velocity', unit: 'm/s' },
  a: { name: 'acceleration', unit: 'm/s²' },
};

function targetSamples(motion, quantity, n) {
  const out = [];
  for (let k = 0; k < n; k++) {
    const t = (motion.duration * k) / (n - 1);
    out.push(GcMM.stateAt(motion, t)[quantity]);
  }
  return out;
}

/** Least-squares gradient of the student's points with indices in [i0, i1]. Null if too few. */
function fitSlope(values, times, i0, i1) {
  let n = 0;
  let st = 0;
  let sy = 0;
  let stt = 0;
  let sty = 0;
  for (let i = i0; i <= i1; i++) {
    if (values[i] === null || values[i] === undefined) continue;
    n++;
    st += times[i];
    sy += values[i];
    stt += times[i] * times[i];
    sty += times[i] * values[i];
  }
  if (n < 3) return null;
  const den = n * stt - st * st;
  if (Math.abs(den) < 1e-12) return null;
  return (n * sty - st * sy) / den;
}

function mean(values, i0, i1) {
  let n = 0;
  let sum = 0;
  for (let i = i0; i <= i1; i++) {
    if (values[i] === null || values[i] === undefined) continue;
    n++;
    sum += values[i];
  }
  return n ? sum / n : null;
}

function fmtTime(t) {
  return GcFmt.trimNumber(t, 1) + ' s';
}

/**
 * compareSketch(motion, quantity, student) → {
 *   score, pass, closeness, signAgreement, slopeAgreement, coverage,
 *   feedback: [{ t0, t1, message, misconception }], misconceptions: []
 * }
 */
function compareSketch(motion, quantity, student) {
  const N = student.length;
  const T = motion.duration;
  const times = [];
  for (let k = 0; k < N; k++) times.push((T * k) / (N - 1));
  const target = targetSamples(motion, quantity, N);
  const ext = GcMM.extents(motion)[quantity];
  const span = Math.max(ext[1] - ext[0], Math.max(Math.abs(ext[0]), Math.abs(ext[1])), 1);
  const tol = 0.12 * span;
  const signTol = 0.06 * span;
  const words = QUANTITY_WORDS[quantity];

  let covered = 0;
  let close = 0;
  let signN = 0;
  let signOk = 0;
  for (let k = 0; k < N; k++) {
    const y = student[k];
    if (y === null || y === undefined) continue;
    covered++;
    if (Math.abs(y - target[k]) <= tol) close++;
    const ts = GcMM.signOf(target[k], signTol);
    const ss = GcMM.signOf(y, signTol);
    if (ts !== 0 || ss !== 0) {
      signN++;
      if (ts === ss) signOk++;
    }
  }
  const coverage = covered / N;
  const closeness = covered ? close / covered : 0;
  const signAgreement = signN ? signOk / signN : 1;

  const feedback = [];
  const misconceptions = [];
  const addFeedback = (t0, t1, message, misconception, priority) => {
    feedback.push({ t0, t1, message, misconception: misconception || null, priority: priority || 1 });
    if (misconception && misconceptions.indexOf(misconception) < 0) misconceptions.push(misconception);
  };

  if (coverage < 0.8) {
    addFeedback(0, T, 'Your sketch needs to cover the whole journey, from 0 to ' + fmtTime(T) + '.', null, 5);
  }

  // Phase-by-phase physics checks.
  const phases = GcMM.phases(motion);
  let slopeN = 0;
  let slopeOk = 0;
  phases.forEach((ph) => {
    const len = ph.t1 - ph.t0;
    if (len < T * 0.04) return; // too short to judge from a sketch
    const i0 = Math.ceil(((ph.t0 + 0.2 * len) / T) * (N - 1));
    const i1 = Math.floor(((ph.t1 - 0.2 * len) / T) * (N - 1));
    if (i1 - i0 < 2) return;
    const mid = GcMM.stateAt(motion, (ph.t0 + ph.t1) / 2);
    const stuSlope = fitSlope(student, times, i0, i1);
    const stuMean = mean(student, i0, i1);
    if (stuSlope === null || stuMean === null) return;

    // The true gradient of this graph in this phase is the next quantity down.
    const trueSlope = quantity === 's' ? mid.v : quantity === 'v' ? mid.a : (GcMM.stateAt(motion, ph.t0 + 0.75 * len).a - GcMM.stateAt(motion, ph.t0 + 0.25 * len).a) / (0.5 * len);
    const slopeScale = span / T;
    const tsSlope = GcMM.signOf(trueSlope, 0.15 * slopeScale);
    const ssSlope = GcMM.signOf(stuSlope, 0.15 * slopeScale);
    slopeN++;
    if (tsSlope === ssSlope) slopeOk++;

    const when = 'Between ' + fmtTime(ph.t0) + ' and ' + fmtTime(ph.t1);
    const trueMean = mean(targetSamples(motion, quantity, N), i0, i1);
    const tSign = GcMM.signOf(trueMean, signTol);
    const sSign = GcMM.signOf(stuMean, signTol);

    if (quantity === 's') {
      if (tsSlope !== ssSlope) {
        if (ph.trend === 'rest') addFeedback(ph.t0, ph.t1, when + ' the object is at rest, so its displacement doesn’t change: the line should be horizontal.', 'gradient-vs-value', 3);
        else if (ph.direction < 0) addFeedback(ph.t0, ph.t1, when + ' the object moves in the negative direction, so its displacement must DECREASE — a downward gradient.', 'pos-gradient-speeding', 3);
        else addFeedback(ph.t0, ph.t1, when + ' the object moves in the positive direction, so its displacement must INCREASE — an upward gradient.', 'gradient-vs-value', 3);
      } else if (ph.trend === 'speeding-up' || ph.trend === 'slowing-down') {
        // curvature: compare gradients of first and second halves
        const half = Math.floor((i0 + i1) / 2);
        const g1 = fitSlope(student, times, i0, half);
        const g2 = fitSlope(student, times, half, i1);
        if (g1 !== null && g2 !== null) {
          const steeper = Math.abs(g2) > Math.abs(g1) * 1.08;
          const shallower = Math.abs(g2) < Math.abs(g1) * 0.92;
          if (ph.trend === 'speeding-up' && !steeper) addFeedback(ph.t0, ph.t1, when + ' the object is speeding up, so the s–t graph should get STEEPER (a curve), because its gradient is the velocity.', null, 2);
          if (ph.trend === 'slowing-down' && !shallower) addFeedback(ph.t0, ph.t1, when + ' the object is slowing down, so the s–t graph should get LESS steep, levelling off.', null, 2);
        }
      }
    } else if (quantity === 'v') {
      if (tSign !== 0 && sSign !== 0 && tSign !== sSign) {
        if (tSign > 0 && ph.trend === 'slowing-down') addFeedback(ph.t0, ph.t1, when + ' the object is slowing down but still moving in the positive direction — slowing down makes velocity shrink TOWARDS zero, not go negative.', 'neg-velocity-slowing', 4);
        else if (tSign < 0) addFeedback(ph.t0, ph.t1, when + ' the object moves in the negative direction, so its velocity is negative — the graph belongs below the time axis.', 'neg-velocity-slowing', 4);
        else addFeedback(ph.t0, ph.t1, when + ' the object moves in the positive direction, so its velocity is positive — above the time axis.', 'neg-velocity-slowing', 4);
      } else if (tsSlope !== ssSlope) {
        if (ph.direction < 0 && ph.trend === 'slowing-down') addFeedback(ph.t0, ph.t1, when + ' the object is moving backwards but slowing down, so its velocity rises towards zero: the gradient (acceleration) is POSITIVE.', 'backwards-neg-accel', 3);
        else if (ph.direction < 0 && ph.trend === 'speeding-up') addFeedback(ph.t0, ph.t1, when + ' the object speeds up in the negative direction, so the velocity becomes MORE negative: a downward gradient.', 'neg-accel-slowing', 3);
        else if (tsSlope === 0) addFeedback(ph.t0, ph.t1, when + ' the velocity is constant, so the v–t line should be horizontal (zero acceleration).', 'pos-gradient-speeding', 3);
        else addFeedback(ph.t0, ph.t1, when + ' check the gradient: it is the acceleration, which is ' + (tsSlope > 0 ? 'positive' : 'negative') + ' here.', null, 2);
      }
    } else {
      if (tSign !== sSign) {
        if (tSign === 0) addFeedback(ph.t0, ph.t1, when + ' the velocity is not changing, so the acceleration is ZERO, even though the object may be moving.', 'velocity-acceleration-same', 4);
        else if (tSign > 0 && ph.direction < 0) addFeedback(ph.t0, ph.t1, when + ' the object moves backwards but slows down, so its acceleration is POSITIVE (opposite to its velocity).', 'backwards-neg-accel', 4);
        else if (tSign < 0 && ph.direction < 0) addFeedback(ph.t0, ph.t1, when + ' the object speeds up in the negative direction: velocity and acceleration are BOTH negative.', 'neg-accel-slowing', 4);
        else if (tSign < 0) addFeedback(ph.t0, ph.t1, when + ' the object moving in the positive direction is slowing down, so its acceleration is negative.', null, 3);
        else addFeedback(ph.t0, ph.t1, when + ' the velocity is increasing, so the acceleration is positive.', null, 3);
      }
    }
    // Magnitude nudge when the physics is right but the numbers are off.
    if (Math.abs(stuMean - trueMean) > 2 * tol && tSign === sSign) {
      addFeedback(ph.t0, ph.t1, when + ' the shape is right but your ' + words.name + ' values are ' + (stuMean > trueMean ? 'too large' : 'too small') + ' — read the numbers off carefully.', null, 1);
    }
  });

  const slopeAgreement = slopeN ? slopeOk / slopeN : 1;
  const score = coverage < 0.8 ? 0 : 0.5 * closeness + 0.25 * signAgreement + 0.25 * slopeAgreement;
  const pass = coverage >= 0.8 && score >= 0.72 && closeness >= 0.55;
  feedback.sort((x, y) => y.priority - x.priority || x.t0 - y.t0);
  return { score, pass, closeness, signAgreement, slopeAgreement, coverage, feedback: feedback.slice(0, 3), misconceptions, tolerance: tol };
}

/** Build a sketch array from a list of [t, value] vertices (straight lines between them). */
function sketchFromVertices(vertices, T, N) {
  const pts = vertices.slice().sort((p, q) => p[0] - q[0]);
  const out = [];
  for (let k = 0; k < N; k++) {
    const t = (T * k) / (N - 1);
    if (!pts.length || t < pts[0][0] - 1e-9 || t > pts[pts.length - 1][0] + 1e-9) {
      out.push(null);
      continue;
    }
    let i = 1;
    while (i < pts.length && pts[i][0] < t) i++;
    if (i >= pts.length) {
      out.push(pts[pts.length - 1][1]);
      continue;
    }
    const p = pts[i - 1];
    const q = pts[i];
    const f = q[0] === p[0] ? 1 : (t - p[0]) / (q[0] - p[0]);
    out.push(p[1] + f * (q[1] - p[1]));
  }
  return out;
}

const graphCompareApi = { compareSketch, sketchFromVertices, targetSamples, QUANTITY_WORDS };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = graphCompareApi;
} else if (typeof window !== 'undefined') {
  window.GraphCompare = graphCompareApi;
}
