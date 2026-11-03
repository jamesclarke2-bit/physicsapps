/**
 * Motion engine for one-dimensional motion.
 *
 * A motion is a starting state (s0, v0) followed by a list of segments.
 * Inside each segment the acceleration changes linearly with time:
 *
 *     a(τ) = a0 + j·τ                 (j = "jerk", 0 for uniform acceleration)
 *     v(τ) = vStart + a0·τ + ½·j·τ²
 *     s(τ) = sStart + vStart·τ + ½·a0·τ² + ⅙·j·τ³
 *
 * where τ is the time since the segment began. This covers every motion the
 * game needs: rest, constant velocity, uniform acceleration, and increasing /
 * decreasing acceleration (non-uniform motion), all with exact values rather
 * than a step-by-step numerical approximation.
 *
 * A segment may also carry `vSet`: the velocity is set instantly at the start
 * of that segment. Real objects can't do this (it needs an infinite
 * acceleration), but GCSE displacement-time graphs with sharp corners are
 * drawn exactly this way, so the engine supports it and flags the motion as
 * `idealised` so the acceleration-time graph can say so.
 *
 * Sign convention: everything is signed along one axis. Positive s, v and a
 * all point in the scenario's chosen positive direction.
 */

const MM_EPS = 1e-9;

/**
 * Build a motion. `segments` is [{ duration, a = 0, jerk = 0, vSet }].
 * Returns a frozen object with precomputed segment start states.
 */
function createMotion(spec) {
  const s0 = spec.s0 || 0;
  const v0 = spec.v0 || 0;
  const segs = [];
  let t = 0;
  let s = s0;
  let v = v0;
  let idealised = false;
  (spec.segments || []).forEach((raw) => {
    const duration = Number(raw.duration);
    if (!(duration > 0)) throw new Error('Each segment needs a positive duration');
    if (raw.vSet !== undefined && raw.vSet !== null) {
      if (Math.abs(raw.vSet - v) > MM_EPS) idealised = true;
      v = raw.vSet;
    }
    const a0 = raw.a || 0;
    const j = raw.jerk || 0;
    const seg = { t0: t, t1: t + duration, duration, a0, j, sStart: s, vStart: v, vJump: raw.vSet !== undefined && raw.vSet !== null };
    segs.push(seg);
    // advance to the end of the segment
    s = s + v * duration + 0.5 * a0 * duration * duration + (j * duration * duration * duration) / 6;
    v = v + a0 * duration + 0.5 * j * duration * duration;
    t += duration;
  });
  if (segs.length === 0) throw new Error('A motion needs at least one segment');
  return Object.freeze({ s0, v0, segments: segs, duration: t, idealised });
}

/** Convenience: a piecewise-linear velocity-time graph through the given points [[t, v], ...]. */
function fromVelocityPoints(points, s0) {
  if (points.length < 2) throw new Error('Need at least two points');
  const segments = [];
  for (let i = 1; i < points.length; i++) {
    const dt = points[i][0] - points[i - 1][0];
    if (dt <= 0) {
      // a vertical step in the v-t graph = an instant velocity change at the next segment
      continue;
    }
    const seg = { duration: dt, a: (points[i][1] - points[i - 1][1]) / dt };
    // If the previous point's time equals the one before it, the velocity jumped.
    if (i >= 2 && points[i - 1][0] === points[i - 2][0]) seg.vSet = points[i - 1][1];
    segments.push(seg);
  }
  return createMotion({ s0: s0 || 0, v0: points[0][1], segments });
}

/** Convenience: a piecewise-linear displacement-time graph (constant velocity stages, idealised corners). */
function fromDisplacementPoints(points) {
  const segments = [];
  for (let i = 1; i < points.length; i++) {
    const dt = points[i][0] - points[i - 1][0];
    const vel = (points[i][1] - points[i - 1][1]) / dt;
    segments.push({ duration: dt, a: 0, vSet: vel });
  }
  const first = segments[0].vSet;
  return createMotion({ s0: points[0][1], v0: first, segments });
}

function segmentIndexAt(motion, t) {
  // binary search: drag motions are built from hundreds of short segments
  const segs = motion.segments;
  if (t <= segs[0].t0) return 0;
  let lo = 0;
  let hi = segs.length - 1;
  if (t >= segs[hi].t1 - MM_EPS) return hi;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (t < segs[mid].t1 - MM_EPS) hi = mid;
    else lo = mid + 1;
  }
  return lo;
}

function stateInSegment(seg, tau) {
  const { a0, j, sStart, vStart } = seg;
  return {
    s: sStart + vStart * tau + 0.5 * a0 * tau * tau + (j * tau * tau * tau) / 6,
    v: vStart + a0 * tau + 0.5 * j * tau * tau,
    a: a0 + j * tau,
  };
}

/** Displacement, velocity and acceleration at time t (clamped to the motion's duration). */
function stateAt(motion, t) {
  const tc = Math.min(Math.max(t, 0), motion.duration);
  const i = segmentIndexAt(motion, tc);
  const seg = motion.segments[i];
  const st = stateInSegment(seg, tc - seg.t0);
  st.t = tc;
  return st;
}

/** Sample n+1 evenly spaced points. Returns { t: [], s: [], v: [], a: [] }. */
function sample(motion, n) {
  const count = n || 200;
  const out = { t: [], s: [], v: [], a: [] };
  for (let k = 0; k <= count; k++) {
    const t = (motion.duration * k) / count;
    const st = stateAt(motion, t);
    out.t.push(t);
    out.s.push(st.s);
    out.v.push(st.v);
    out.a.push(st.a);
  }
  return out;
}

/** Real roots of p + q·x + r·x² in [lo, hi] (sorted). Handles the degenerate linear/constant cases. */
function rootsInInterval(p, q, r, lo, hi) {
  const roots = [];
  const push = (x) => {
    if (x >= lo - MM_EPS && x <= hi + MM_EPS) roots.push(Math.min(Math.max(x, lo), hi));
  };
  if (Math.abs(r) < MM_EPS) {
    if (Math.abs(q) < MM_EPS) return roots; // constant: either never zero or zero everywhere (caller handles)
    push(-p / q);
  } else {
    const disc = q * q - 4 * r * p;
    if (disc < -MM_EPS) return roots;
    const sq = Math.sqrt(Math.max(disc, 0));
    push((-q - sq) / (2 * r));
    if (sq > MM_EPS) push((-q + sq) / (2 * r));
  }
  return roots.sort((x, y) => x - y);
}

/**
 * Every moment the velocity is zero. Each entry:
 *   { t, kind: 'reversal' | 'momentary-stop' | 'start' | 'end' }
 * plus `rests`: intervals [t0, t1] where the object is at rest.
 */
function velocityZeros(motion) {
  const zeros = [];
  const rests = [];
  motion.segments.forEach((seg, idx) => {
    const { a0, j, vStart, t0, t1, duration } = seg;
    // an idealised instant jump straight from +v to −v reverses without passing smoothly through zero
    if (seg.vJump && idx > 0) {
      const prev = motion.segments[idx - 1];
      const vEnd = stateInSegment(prev, prev.duration).v;
      if (vEnd * vStart < 0) zeros.push(t0);
    }
    if (Math.abs(vStart) < MM_EPS && Math.abs(a0) < MM_EPS && Math.abs(j) < MM_EPS) {
      rests.push([t0, t1]);
      return;
    }
    rootsInInterval(vStart, a0, 0.5 * j, 0, duration).forEach((tau) => zeros.push(t0 + tau));
  });
  // merge rest intervals
  const mergedRests = [];
  rests.forEach((r) => {
    const last = mergedRests[mergedRests.length - 1];
    if (last && Math.abs(last[1] - r[0]) < 1e-6) last[1] = r[1];
    else mergedRests.push([r[0], r[1]]);
  });
  // de-duplicate zeros (a root landing on a segment boundary is found twice)
  const uniq = [];
  zeros
    .sort((x, y) => x - y)
    .forEach((t) => {
      if (!uniq.length || Math.abs(uniq[uniq.length - 1] - t) > 1e-6) uniq.push(t);
    });
  const dt = Math.max(motion.duration * 1e-4, 1e-4);
  const classified = uniq
    .filter((t) => !mergedRests.some((r) => t >= r[0] - 1e-6 && t <= r[1] + 1e-6))
    .map((t) => {
      if (t < 1e-6) return { t: 0, kind: 'start' };
      if (t > motion.duration - 1e-6) return { t: motion.duration, kind: 'end' };
      const before = stateAt(motion, t - dt).v;
      const after = stateAt(motion, t + dt).v;
      const kind = before * after < 0 ? 'reversal' : 'momentary-stop';
      return { t, kind };
    });
  return { zeros: classified, rests: mergedRests };
}

/** Times where the direction of motion reverses. */
function reversalTimes(motion) {
  return velocityZeros(motion)
    .zeros.filter((z) => z.kind === 'reversal')
    .map((z) => z.t);
}

/** Displacement between two times (signed). */
function displacementBetween(motion, ta, tb) {
  return stateAt(motion, tb).s - stateAt(motion, ta).s;
}

/** Distance travelled between two times (always ≥ 0): sum of |Δs| between velocity zeros. */
function distanceBetween(motion, ta, tb) {
  const lo = Math.min(ta, tb);
  const hi = Math.max(ta, tb);
  const cuts = [lo];
  // Cut at every velocity zero AND every segment boundary: an idealised
  // instant velocity change can flip the direction without passing through zero.
  velocityZeros(motion).zeros.forEach((z) => {
    if (z.t > lo + 1e-9 && z.t < hi - 1e-9) cuts.push(z.t);
  });
  motion.segments.forEach((seg) => {
    if (seg.t0 > lo + 1e-9 && seg.t0 < hi - 1e-9) cuts.push(seg.t0);
  });
  cuts.sort((x, y) => x - y);
  cuts.push(hi);
  let d = 0;
  for (let i = 1; i < cuts.length; i++) d += Math.abs(stateAt(motion, cuts[i]).s - stateAt(motion, cuts[i - 1]).s);
  return d;
}

function signOf(x, tol) {
  const e = tol === undefined ? 1e-7 : tol;
  if (x > e) return 1;
  if (x < -e) return -1;
  return 0;
}

/**
 * Split the motion into phases where both the direction of motion and whether
 * the speed is rising or falling stay the same. Each phase:
 *   { t0, t1, direction: +1 | -1 | 0, trend: 'speeding-up' | 'slowing-down' | 'constant' | 'rest' }
 *
 * Speeding up ⇔ velocity and acceleration have the SAME sign; slowing down ⇔
 * OPPOSITE signs. This is the single most important idea the game teaches.
 */
function phases(motion) {
  const cuts = new Set([0, motion.duration]);
  motion.segments.forEach((seg) => {
    cuts.add(seg.t0);
    cuts.add(seg.t1);
    // acceleration zero inside segment (a linear in τ)
    if (Math.abs(seg.j) > MM_EPS) {
      const tau = -seg.a0 / seg.j;
      if (tau > 0 && tau < seg.duration) cuts.add(seg.t0 + tau);
    }
  });
  const vz = velocityZeros(motion);
  vz.zeros.forEach((z) => cuts.add(z.t));
  vz.rests.forEach((r) => {
    cuts.add(r[0]);
    cuts.add(r[1]);
  });
  const sorted = Array.from(cuts)
    .sort((x, y) => x - y)
    .filter((t, i, arr) => i === 0 || t - arr[i - 1] > 1e-6);
  const raw = [];
  for (let i = 1; i < sorted.length; i++) {
    const t0 = sorted[i - 1];
    const t1 = sorted[i];
    const mid = stateAt(motion, (t0 + t1) / 2);
    const direction = signOf(mid.v, 1e-6);
    let trend;
    if (direction === 0) trend = 'rest';
    else {
      const prod = signOf(mid.a, 1e-6) * direction;
      trend = prod > 0 ? 'speeding-up' : prod < 0 ? 'slowing-down' : 'constant';
    }
    raw.push({ t0, t1, direction, trend });
  }
  // merge neighbours with the same classification
  const merged = [];
  raw.forEach((p) => {
    const last = merged[merged.length - 1];
    if (last && last.direction === p.direction && last.trend === p.trend) last.t1 = p.t1;
    else merged.push(Object.assign({}, p));
  });
  return merged;
}

/** Min/max of s, v and a over the whole motion (exact, using turning points). */
function extents(motion) {
  const times = [0, motion.duration];
  motion.segments.forEach((seg) => {
    times.push(seg.t0, seg.t1, seg.t1 - 1e-9);
    rootsInInterval(seg.vStart, seg.a0, 0.5 * seg.j, 0, seg.duration).forEach((tau) => times.push(seg.t0 + tau));
    if (Math.abs(seg.j) > MM_EPS) {
      const tau = -seg.a0 / seg.j;
      if (tau > 0 && tau < seg.duration) times.push(seg.t0 + tau);
    }
  });
  const ext = { s: [Infinity, -Infinity], v: [Infinity, -Infinity], a: [Infinity, -Infinity] };
  times.forEach((t) => {
    const tc = Math.min(Math.max(t, 0), motion.duration);
    const i = segmentIndexAt(motion, tc);
    const seg = motion.segments[i];
    const st = stateInSegment(seg, tc - seg.t0);
    ['s', 'v', 'a'].forEach((k) => {
      ext[k][0] = Math.min(ext[k][0], st[k]);
      ext[k][1] = Math.max(ext[k][1], st[k]);
    });
    // the value just before the boundary too (acceleration jumps there)
    if (i > 0 && Math.abs(tc - seg.t0) < 1e-9) {
      const prev = motion.segments[i - 1];
      const stp = stateInSegment(prev, prev.duration);
      ['s', 'v', 'a'].forEach((k) => {
        ext[k][0] = Math.min(ext[k][0], stp[k]);
        ext[k][1] = Math.max(ext[k][1], stp[k]);
      });
    }
  });
  return ext;
}

/** Plain-English description of one phase, for feedback and the Detective reveal. */
function describePhase(phase, positiveWord, negativeWord) {
  // positiveWord/negativeWord are phrases like "to the right" / "to the left" or "upwards" / "downwards".
  const pos = positiveWord || 'in the positive direction';
  const neg = negativeWord || 'in the negative direction';
  if (phase.trend === 'rest') return 'at rest';
  const dir = phase.direction > 0 ? pos : neg;
  if (phase.trend === 'constant') return 'moving ' + dir + ' at constant speed';
  if (phase.trend === 'speeding-up') return 'moving ' + dir + ' and speeding up';
  return 'moving ' + dir + ' and slowing down';
}

const motionModelApi = {
  createMotion,
  fromVelocityPoints,
  fromDisplacementPoints,
  stateAt,
  sample,
  velocityZeros,
  reversalTimes,
  displacementBetween,
  distanceBetween,
  phases,
  extents,
  describePhase,
  rootsInInterval,
  signOf,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = motionModelApi;
} else if (typeof window !== 'undefined') {
  window.MotionModel = motionModelApi;
}
