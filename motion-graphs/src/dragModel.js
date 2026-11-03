/**
 * Vertical motion with air resistance (quadratic drag).
 *
 * Up is positive. Two forces act:
 *   weight  W = −m g                (always downwards)
 *   drag    D = −k v |v|            (always opposite to the velocity, size k v²)
 * so  a = (W + D) / m = −g − (k/m) v|v|.
 *
 * Terminal speed vT = √(m g / k): where drag balances weight.
 *
 * The motion is integrated with fourth-order Runge–Kutta, then handed to
 * MotionModel as a chain of short segments whose acceleration changes
 * linearly across each one. That way every part of the game (graphs,
 * phases, areas, Detective, Match...) works on a drag motion unchanged.
 *
 * The run ends when the object reaches the ground (s = 0) moving down, or
 * after tMax seconds.
 */

const DmMM = typeof module !== 'undefined' && module.exports ? require('./motionModel.js') : window.MotionModel;

function accel(v, g, kOverM) {
  return -g - kOverM * v * Math.abs(v);
}

function rk4Step(s, v, dt, g, km) {
  const a1 = accel(v, g, km);
  const v1 = v;
  const a2 = accel(v + 0.5 * dt * a1, g, km);
  const v2 = v + 0.5 * dt * a1;
  const a3 = accel(v + 0.5 * dt * a2, g, km);
  const v3 = v + 0.5 * dt * a2;
  const a4 = accel(v + dt * a3, g, km);
  const v4 = v + dt * a3;
  return {
    s: s + (dt / 6) * (v1 + 2 * v2 + 2 * v3 + v4),
    v: v + (dt / 6) * (a1 + 2 * a2 + 2 * a3 + a4),
  };
}

/** Time to reach the ground (s = 0) moving down, found by integrating then refining. */
function flightTime(s0, v0, g, km, tMax) {
  if (km === 0) {
    // s0 + v0 t − ½ g t² = 0, positive root
    const disc = v0 * v0 + 2 * g * s0;
    const t = (v0 + Math.sqrt(Math.max(disc, 0))) / g;
    return Math.min(t, tMax);
  }
  // step size from the natural time scales of the motion
  const vT = Math.sqrt(g / km);
  const scale = Math.min(vT / g, Math.max(Math.abs(v0), 1) / g, 1);
  const dt = Math.max(scale / 400, 1e-4);
  let t = 0;
  let s = s0;
  let v = v0;
  while (t < tMax) {
    const next = rk4Step(s, v, dt, g, km);
    if (t > 0 && next.s <= 0 && next.v < 0) {
      // refine inside the step by bisection
      let lo = 0;
      let hi = dt;
      for (let i = 0; i < 40; i++) {
        const mid = (lo + hi) / 2;
        const st = rk4Step(s, v, mid, g, km);
        if (st.s > 0) lo = mid;
        else hi = mid;
      }
      return t + (lo + hi) / 2;
    }
    s = next.s;
    v = next.v;
    t += dt;
    if (s0 === 0 && t === dt && s <= 0 && v <= 0) return 0; // launched downwards from the ground
  }
  return tMax;
}

/**
 * simulate({ s0 = 0, v0, g = 9.81, mass = 1, k = 0, n = 500, tMax = 300 }) → {
 *   motion, T, g, mass, k, vT, drag, apex: { t, s } | null, landing: { t, v },
 *   forcesAt(t) → { W, D, R, v, a }
 * }
 */
function simulate(opts) {
  const o = Object.assign({ s0: 0, v0: 0, g: 9.81, mass: 1, k: 0, n: 500, tMax: 300 }, opts || {});
  const g = o.g;
  const km = o.k > 0 ? o.k / o.mass : 0;
  const T = Math.max(flightTime(o.s0, o.v0, g, km, o.tMax), 1e-3);
  let motion;
  if (km === 0) {
    motion = DmMM.createMotion({ s0: o.s0, v0: o.v0, segments: [{ duration: T, a: -g }] });
  } else {
    const n = o.n;
    const dt = T / n;
    const sub = 8;
    const states = [{ s: o.s0, v: o.v0 }];
    let s = o.s0;
    let v = o.v0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < sub; j++) {
        const st = rk4Step(s, v, dt / sub, g, km);
        s = st.s;
        v = st.v;
      }
      states.push({ s, v });
    }
    // Segments with linearly varying acceleration. Each segment's change in
    // velocity is set to match the integrated change exactly (its mean
    // acceleration is Δv/Δt), so velocity stays continuous and never drifts.
    const segments = [];
    let aStart = accel(states[0].v, g, km);
    for (let i = 0; i < n; i++) {
      const meanA = (states[i + 1].v - states[i].v) / dt;
      const aEnd = 2 * meanA - aStart;
      segments.push({ duration: dt, a: aStart, jerk: (aEnd - aStart) / dt });
      // next segment starts from the true acceleration at that velocity, keeping a(t) close to the physics
      aStart = 0.5 * (aEnd + accel(states[i + 1].v, g, km));
    }
    motion = DmMM.createMotion({ s0: o.s0, v0: o.v0, segments });
  }
  const vT = km > 0 ? Math.sqrt(g / km) : Infinity;
  const rev = DmMM.reversalTimes(motion);
  const apex = o.v0 > 0 ? { t: rev.length ? rev[0] : 0, s: DmMM.extents(motion).s[1] } : null;
  const end = DmMM.stateAt(motion, T);
  return {
    motion,
    T,
    g,
    mass: o.mass,
    k: o.k,
    km,
    vT,
    drag: km > 0,
    s0: o.s0,
    v0: o.v0,
    apex,
    landing: { t: T, v: end.v },
    forcesAt(t) {
      const st = DmMM.stateAt(motion, t);
      const W = -o.mass * g;
      const D = -o.k * st.v * Math.abs(st.v);
      return { W, D, R: W + D, v: st.v, a: (W + D) / o.mass, s: st.s };
    },
  };
}

/** Drag constant k that gives terminal speed vT for a given mass: k = m g / vT². */
function kForTerminal(mass, g, vT) {
  return (mass * g) / (vT * vT);
}

/** Analytic results for quadratic drag, used to check the integrator. */
const analytic = {
  timeToApex: (v0, g, vT) => (vT / g) * Math.atan(v0 / vT),
  apexHeight: (v0, g, vT) => ((vT * vT) / (2 * g)) * Math.log(1 + (v0 * v0) / (vT * vT)),
  landingSpeed: (v0, vT) => (v0 * vT) / Math.sqrt(v0 * v0 + vT * vT),
  fallTime: (H, g, vT) => (vT / g) * Math.acosh(Math.exp((g * H) / (vT * vT))),
};

/**
 * Presets. Values are rounded, realistic orders of magnitude — a first
 * draft, to be checked by the teacher.
 */
const PRESETS = [
  { id: 'ball', label: 'Ball thrown up', object: 'ball', s0: 0, v0: 20, mass: 0.06, vT: 15, note: 'A tennis-sized ball thrown straight up at 20 m/s. Its terminal speed is about 15 m/s.' },
  { id: 'bullet', label: 'Bullet fired up', object: 'bullet', s0: 0, v0: 400, mass: 0.01, vT: 90, note: 'A 10 g bullet fired straight up at 400 m/s. Falling, it can only reach about 90 m/s before drag balances its weight.' },
  { id: 'shuttle', label: 'Shuttlecock hit up', object: 'shuttlecock', s0: 0, v0: 30, mass: 0.005, vT: 6.8, note: 'A badminton shuttlecock: very light with lots of drag, so its terminal speed is only about 7 m/s.' },
  { id: 'skydiver', label: 'Skydiver jumps', object: 'skydiver', s0: 1500, v0: 0, mass: 80, vT: 55, note: 'An 80 kg skydiver stepping out at 1500 m (parachute closed). Terminal speed is about 55 m/s.' },
  { id: 'drop', label: 'Ball dropped from a tower', object: 'ball', s0: 80, v0: 0, mass: 0.06, vT: 15, note: 'The same ball dropped from an 80 m tower.' },
];

const dragApi = { simulate, kForTerminal, analytic, PRESETS, accel };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = dragApi;
} else if (typeof window !== 'undefined') {
  window.DragModel = dragApi;
}
