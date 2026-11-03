/**
 * Motion reconstruction challenges (university preparation).
 *
 * The student builds a velocity–time graph from straight-line pieces by
 * dragging its corners. The graph is checked against the challenge's
 * constraints (total time, total displacement, peak speed, maximum
 * acceleration...). Most challenges have MANY valid answers, so after a
 * valid design the student compares it with other valid designs.
 */

const RcFmt = typeof module !== 'undefined' && module.exports ? require('./format.js') : window.Fmt;

const CHALLENGES = [
  {
    id: 'rebuild-trapezium',
    title: 'Rebuild the journey',
    tier: 'alevel',
    brief: 'A car starts and ends at rest. It travels 120 m in 16 s and its greatest speed is exactly 10 m/s. Build a velocity–time graph that fits.',
    T: 16,
    vertices: 4,
    vRange: [0, 14],
    constraints: { displacement: 120, peakSpeed: 10, startRest: true, endRest: true },
    question: 'What do ALL valid graphs have in common?',
    insight: 'Every valid graph has area 120 m and height 10 m/s, so the time spent below top speed is fixed: the accelerating and braking phases always add up to 8 s. How you split those 8 s is up to you — that’s why there are infinitely many answers.',
  },
  {
    id: 'triangle-peak',
    title: 'Peak of a triangle',
    tier: 'alevel',
    brief: 'A cyclist starts from rest, accelerates uniformly, then immediately brakes uniformly to rest. She covers 60 m in 12 s. Build the graph — then find her top speed.',
    T: 12,
    vertices: 3,
    vRange: [0, 16],
    constraints: { displacement: 60, startRest: true, endRest: true },
    ask: { label: 'Top speed', unit: 'm/s', answer: 10 },
    question: 'Move the peak left and right. What happens to the top speed?',
    insight: 'Area of a triangle = ½ × 12 × V = 60, so V = 10 m/s wherever the peak sits. The split between speeding up and braking changes the accelerations, but never the top speed: V = 2D/T.',
  },
  {
    id: 'design-limits',
    title: 'Design within limits',
    tier: 'extension',
    brief: 'Design a tram journey: start and end at rest, 60 m in 12 s, never faster than 8 m/s, and never accelerating or braking harder than 2 m/s².',
    T: 12,
    vertices: 5,
    vRange: [0, 10],
    constraints: { displacement: 60, maxSpeed: 8, maxAccel: 2, startRest: true, endRest: true },
    question: 'Compare your design with the others. Which is the most comfortable for passengers, and why?',
    insight: 'Gentler accelerations are more comfortable but need a higher top speed to cover the same distance in the same time. The lowest possible top speed uses the full 2 m/s² for the shortest possible time — here about 7.1 m/s.',
  },
  {
    id: 'there-and-back',
    title: 'There and back',
    tier: 'extension',
    brief: 'A robot starts and ends at rest, goes out and comes back, finishing 4 m BEHIND its start after 14 s, having travelled 28 m in total. Build its v–t graph.',
    T: 14,
    vertices: 6,
    vRange: [-6, 6],
    constraints: { displacement: -4, distance: 28, startRest: true, endRest: true },
    question: 'How much of the area must lie above the axis, and how much below?',
    insight: 'Area above + area below (as sizes) = 28 m, and area above − area below = −4 m. So 12 m of area must lie above the axis and 16 m below — whatever shapes you use.',
  },
];

function sortVertices(vertices) {
  return vertices.slice().sort((p, q) => p[0] - q[0]);
}

/** Signed area under a piecewise-linear v–t graph (= displacement) and total |area| (= distance). */
function areas(vertices) {
  const pts = sortVertices(vertices);
  let disp = 0;
  let dist = 0;
  for (let i = 1; i < pts.length; i++) {
    const [t0, v0] = pts[i - 1];
    const [t1, v1] = pts[i];
    const dt = t1 - t0;
    disp += 0.5 * (v0 + v1) * dt;
    if (v0 * v1 >= 0) dist += 0.5 * Math.abs(v0 + v1) * dt;
    else {
      // split at the zero crossing
      const tz = (Math.abs(v0) / (Math.abs(v0) + Math.abs(v1))) * dt;
      dist += 0.5 * Math.abs(v0) * tz + 0.5 * Math.abs(v1) * (dt - tz);
    }
  }
  return { displacement: disp, distance: dist };
}

function peakSpeed(vertices) {
  return vertices.reduce((m, p) => Math.max(m, Math.abs(p[1])), 0);
}

function maxAcceleration(vertices) {
  const pts = sortVertices(vertices);
  let m = 0;
  for (let i = 1; i < pts.length; i++) {
    const dt = pts[i][0] - pts[i - 1][0];
    if (dt <= 1e-9) return Infinity;
    m = Math.max(m, Math.abs((pts[i][1] - pts[i - 1][1]) / dt));
  }
  return m;
}

/** Check a design. Returns { valid, checks: [{ label, ok, detail }] }. */
function checkDesign(challenge, vertices) {
  const c = challenge.constraints;
  const pts = sortVertices(vertices);
  const checks = [];
  const tolAbs = (target) => Math.max(Math.abs(target) * 0.03, 0.3);
  const { displacement, distance } = areas(pts);
  const add = (label, ok, detail) => checks.push({ label, ok, detail });

  if (c.startRest) add('Starts at rest', Math.abs(pts[0][1]) < 0.15, 'v(0) = ' + RcFmt.signed(pts[0][1], 1) + ' m/s');
  if (c.endRest) add('Ends at rest', Math.abs(pts[pts.length - 1][1]) < 0.15, 'v(' + challenge.T + ') = ' + RcFmt.signed(pts[pts.length - 1][1], 1) + ' m/s');
  if (c.displacement !== undefined)
    add('Displacement ' + RcFmt.signed(c.displacement, 1) + ' m', Math.abs(displacement - c.displacement) <= tolAbs(c.displacement), 'your area: ' + RcFmt.signed(displacement, 1) + ' m');
  if (c.distance !== undefined) add('Distance ' + RcFmt.num(c.distance, 1) + ' m', Math.abs(distance - c.distance) <= tolAbs(c.distance), 'your total area: ' + RcFmt.num(distance, 1) + ' m');
  if (c.peakSpeed !== undefined)
    add('Greatest speed ' + RcFmt.num(c.peakSpeed, 1) + ' m/s', Math.abs(peakSpeed(pts) - c.peakSpeed) <= tolAbs(c.peakSpeed), 'yours: ' + RcFmt.num(peakSpeed(pts), 1) + ' m/s');
  if (c.maxSpeed !== undefined) add('Never faster than ' + RcFmt.num(c.maxSpeed, 1) + ' m/s', peakSpeed(pts) <= c.maxSpeed + 0.15, 'yours peaks at ' + RcFmt.num(peakSpeed(pts), 1) + ' m/s');
  if (c.maxAccel !== undefined) {
    const ma = maxAcceleration(pts);
    add('Acceleration within ±' + RcFmt.num(c.maxAccel, 1) + ' m/s²', ma <= c.maxAccel + 0.08, 'steepest gradient: ' + (isFinite(ma) ? RcFmt.num(ma, 2) : 'vertical') + ' m/s²');
  }
  return { valid: checks.every((x) => x.ok), checks, displacement, distance };
}

/** A starting design: evenly spaced corners at rest-ish heights inside the allowed range. */
function startingVertices(challenge) {
  const k = challenge.vertices;
  const out = [];
  for (let i = 0; i < k; i++) {
    const t = (challenge.T * i) / (k - 1);
    const v = i === 0 || i === k - 1 ? 0 : (challenge.vRange[1] * 0.4);
    out.push([t, v]);
  }
  return out;
}

/** Other valid designs to compare with, so the student sees that many answers work. */
function gallery(challenge) {
  const T = challenge.T;
  if (challenge.id === 'rebuild-trapezium') {
    // ta + td = 2(T − D/V) = 8 s
    return [
      { label: 'Symmetric', vertices: [[0, 0], [4, 10], [12, 10], [16, 0]] },
      { label: 'Quick start, gentle stop', vertices: [[0, 0], [2, 10], [10, 10], [16, 0]] },
      { label: 'Gentle start, quick stop', vertices: [[0, 0], [6, 10], [14, 10], [16, 0]] },
    ];
  }
  if (challenge.id === 'triangle-peak') {
    return [
      { label: 'Peak in the middle', vertices: [[0, 0], [6, 10], [12, 0]] },
      { label: 'Early peak', vertices: [[0, 0], [3, 10], [12, 0]] },
      { label: 'Late peak', vertices: [[0, 0], [9, 10], [12, 0]] },
    ];
  }
  if (challenge.id === 'design-limits') {
    // minimum top speed with a = 2: V(12 − V/2) = 60 → V = 12 − sqrt(24) ≈ 7.10? solve V² − 24V + 120 = 0
    const V = 12 - Math.sqrt(144 - 120);
    const ta = V / 2;
    return [
      { label: 'Lowest top speed (max acceleration)', vertices: [[0, 0], [ta, V], [T - ta, V], [T, 0]] },
      { label: 'Top speed 8 m/s, gentle', vertices: [[0, 0], [4.5, 8], [7.5, 8], [12, 0]] },
      { label: 'Two-step speed-up', vertices: [[0, 0], [2, 4], [4, 7.5], [8, 7.5], [12, 0]] },
    ];
  }
  if (challenge.id === 'there-and-back') {
    return [
      { label: 'Out 12 m, back 16 m, then wait', vertices: [[0, 0], [2, 4], [3, 4], [5, 0], [7, -4], [9, -4], [11, 0], [14, 0]] },
      { label: 'Triangles', vertices: [[0, 0], [3, 4], [6, 0], [10, -4], [14, 0]] },
    ];
  }
  return [];
}

const reconstructionApi = { CHALLENGES, areas, peakSpeed, maxAcceleration, checkDesign, startingVertices, gallery };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = reconstructionApi;
} else if (typeof window !== 'undefined') {
  window.Reconstruction = reconstructionApi;
}
