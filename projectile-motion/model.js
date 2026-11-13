/* Projectile model: the SINGLE SOURCE OF TRUTH for this app's physics.
   The simulation (app.js), the equation text (equations.js), the question answers (questions.js) and the tests all read this file.
   Never copy these formulas anywhere else. UMD: loads in the browser (window.ProjectileModel) and in Node (require).

   CONVENTIONS AND ASSUMPTIONS (also listed in README.md, keep both in step):
   - Ground is y = 0, up is positive. Launch point (0, h0). Point particle.
   - No air resistance (Phase 1). Acceleration is g downward: ax = 0, ay = -g.
   - x = ux t;  y = h0 + uy t - 1/2 g t^2;  vx = ux (constant);  vy = uy - g t.
   - Flight time = the positive root of y = 0 (the later root if there are two, i.e. landing on the way down).
   - h0 < 0 is a launch from a pit (a narrow shaft: its walls are ignored). If uy^2 + 2 g h0 < 0 the projectile never reaches
     ground level; the flight then ends when it falls back to the pit floor (y = h0), at t = 2 uy / g.
   - Max height = h0 + uy^2 / (2g) at t = uy / g (for a horizontal launch, uy = 0: max height = h0 at t = 0).
   - Two projectiles collide when they are at the same (x, y) at the same time, within COLLISION_TOL = 0.01 m (Phase 2 hook).

   Each projectile is a plain object {u, thetaDeg, h0, g, t0?, colour?}. t0 (launch time, default 0) and drag (must be false)
   are there so Phase 2 (several projectiles, air resistance) can extend the model without changing its callers. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ProjectileModel = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var G = 9.81, COLLISION_TOL = 0.01, STEP_DT = 0.1, RAD = Math.PI / 180;
  var LIMITS = { u: [0, 100], thetaDeg: [0, 90], h0: [-20, 100], g: [1, 20] };
  var DEFAULT = { u: 20, thetaDeg: 45, h0: 0, g: G };

  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
  /* Normalise a projectile: clamp to the input ranges and add its velocity components. */
  function norm(p) {
    var q = {
      u: clamp(+p.u, LIMITS.u[0], LIMITS.u[1]), thetaDeg: clamp(+p.thetaDeg, LIMITS.thetaDeg[0], LIMITS.thetaDeg[1]),
      h0: clamp(+p.h0, LIMITS.h0[0], LIMITS.h0[1]), g: clamp(+p.g, LIMITS.g[0], LIMITS.g[1]), t0: +p.t0 || 0
    };
    if (p.drag) throw new Error('Air resistance is not in the Phase 1 model');
    q.ux = q.u * Math.cos(q.thetaDeg * RAD); q.uy = q.u * Math.sin(q.thetaDeg * RAD);
    if (Math.abs(q.ux) < 1e-12) q.ux = 0;            // cos 90° is not exactly zero in floating point
    if (Math.abs(q.uy) < 1e-12) q.uy = 0;
    return q;
  }
  function components(p) { var q = norm(p); return { ux: q.ux, uy: q.uy }; }

  /* Where the flight ends: ground level, or back on the pit floor if it never gets out. */
  function landing(p) {
    var q = norm(p), disc = q.uy * q.uy + 2 * q.g * q.h0;
    if (q.h0 >= 0 || disc >= 0) {
      var t = (q.uy + Math.sqrt(Math.max(0, disc))) / q.g;
      return { t: t, level: 0, pit: q.h0 < 0, clearsPit: true };
    }
    return { t: 2 * q.uy / q.g, level: q.h0, pit: true, clearsPit: false };
  }
  function flightTime(p) { return landing(p).t; }
  function timeToMax(p) { var q = norm(p); return q.uy / q.g; }
  function maxHeight(p) { var q = norm(p); return q.h0 + q.uy * q.uy / (2 * q.g); }
  function range(p) { var q = norm(p); return q.ux * flightTime(q); }

  /* State at time t after the clock starts (clamped to the flight). */
  function state(p, t) {
    var q = norm(p), T = flightTime(q), tt = clamp(t - q.t0, 0, T);
    var vx = q.ux, vy = q.uy - q.g * tt;
    return { t: tt, x: q.ux * tt, y: q.h0 + q.uy * tt - 0.5 * q.g * tt * tt, vx: vx, vy: vy,
      speed: Math.sqrt(vx * vx + vy * vy), ax: 0, ay: -q.g, dirDeg: Math.atan2(vy, vx) / RAD };
  }
  function landingSpeed(p) { return state(p, flightTime(p) + (+p.t0 || 0)).speed; }
  function summary(p) {
    var q = norm(p), L = landing(q);
    return { ux: q.ux, uy: q.uy, T: L.t, tMax: timeToMax(q), H: maxHeight(q), R: range(q), vLand: landingSpeed(q),
      pit: L.pit, clearsPit: L.clearsPit, level: L.level };
  }

  /* Independent numerical simulation (used to check the closed-form results).
     Steps the motion with a fixed time step, detects the apex (vy changes sign) and the landing (crossing the landing level
     on the way down) and refines each event by bisection inside its step. It never calls flightTime(), maxHeight() or range(). */
  function step(s, dt, g) { return { t: s.t + dt, x: s.x + s.vx * dt, y: s.y + s.vy * dt - 0.5 * g * dt * dt, vx: s.vx, vy: s.vy - g * dt }; }
  function simulate(p, dt) {
    var q = norm(p); dt = dt || 0.001;
    var s = { t: 0, x: 0, y: q.h0, vx: q.ux, vy: q.uy }, apex = { t: 0, y: q.h0 }, level = 0, n = 0;
    function refine(a, f) { var lo = 0, hi = dt; for (var i = 0; i < 60; i++) { var mid = (lo + hi) / 2; if (f(step(a, mid, q.g))) hi = mid; else lo = mid; } return step(a, hi, q.g); }
    // which level ends the flight is found by simulation too: does the apex reach ground level?
    if (q.uy <= 0 && q.h0 <= 0) return { flightTime: 0, maxHeight: q.h0, timeToMax: 0, range: 0 };
    while (n++ < 5e7) {
      var nx = step(s, dt, q.g);
      if (s.vy > 0 && nx.vy <= 0) { var a = refine(s, function (z) { return z.vy <= 0; }); apex = { t: a.t, y: a.y }; level = apex.y >= 0 ? 0 : q.h0; }
      if (nx.vy < 0 && nx.y <= level) {
        var L = refine(s, function (z) { return z.y <= level; });
        return { flightTime: L.t, maxHeight: apex.y, timeToMax: apex.t, range: L.x };
      }
      s = nx;
    }
    throw new Error('simulation did not land');
  }

  /* Phase 2 hook: two point particles collide if they are within COLLISION_TOL at the same time. */
  function collide(a, b, t) {
    var A = state(a, t), B = state(b, t);
    return Math.hypot(A.x - B.x, A.y - B.y) <= COLLISION_TOL;
  }

  return { G: G, COLLISION_TOL: COLLISION_TOL, STEP_DT: STEP_DT, LIMITS: LIMITS, DEFAULT: DEFAULT,
    norm: norm, components: components, landing: landing, flightTime: flightTime, timeToMax: timeToMax, maxHeight: maxHeight,
    range: range, state: state, landingSpeed: landingSpeed, summary: summary, simulate: simulate, collide: collide };
});
