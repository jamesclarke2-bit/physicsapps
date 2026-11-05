/* Force, Mass and Acceleration model: the SINGLE SOURCE OF TRUTH for this app's physics (see README.md for the assumptions).
   Used by app.js, the worksheet pipeline and the tests. UMD: window.ForceModel or require(). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ForceModel = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var G = 9.81, TROLLEY_BARE = 0.600, SLOT = 0.020, N_SLOTS = 10, HANGER = 0.010, EXTRA = 0.100, PULLEY = 0.005;
  var MU_K = 0.011, MU_S = 1.25 * MU_K, TRACK = 2.0, CARD = 0.100, REL_T = 0.02, REL_V = 0.01, CARD_SIG = 0.001;
  var TIMERS = {
    stopwatch: { name: 'Hand stopwatch', short: 'Stopwatch', sig: 0.07, res: 0.01, rel: REL_T },
    video: { name: 'Video, frame by frame', short: 'Video', sig: 0.01, res: 0.001, rel: REL_T },
    gates: { name: 'Two light gates', short: 'Light gates', sig: 0.003, res: 0.001, rel: 0 }
  };
  var TARGET_PCT = 5, FRICTION_PCT = 5, rad = function (d) { return d * Math.PI / 180; };

  /* set = {nh (0-10 slotted masses on hanger), k (0-5 extra blocks), constant (bool), tilt (deg), hanger (bool)} */
  function slotsOnTrolley(s) { return s.constant ? N_SLOTS - s.nh : N_SLOTS; }
  function trolleyMass(s) { return TROLLEY_BARE + SLOT * slotsOnTrolley(s) + EXTRA * s.k; }
  function hangerMass(s) { return s.hanger ? HANGER + SLOT * s.nh : 0; }
  function totalMass(s) { return trolleyMass(s) + hangerMass(s); }              // what a student weighs: trolley + hanger system
  function sysMass(s) { return totalMass(s) + (s.hanger ? PULLEY : 0); }       // what actually accelerates
  function force(s) { return hangerMass(s) * G; }                               // F = mh g
  function netForce(s) { var th = rad(s.tilt), Mt = trolleyMass(s); return hangerMass(s) * G + Mt * G * Math.sin(th) - MU_K * Mt * G * Math.cos(th); }
  function moves(s) { var th = rad(s.tilt), Mt = trolleyMass(s); return hangerMass(s) * G + Mt * G * (Math.sin(th) - MU_S * Math.cos(th)) > 0; }
  function accel(s) { return moves(s) ? netForce(s) / sysMass(s) : 0; }
  function idealAccel(s) { return force(s) / totalMass(s); }                    // F = m a with no friction, ignoring the pulley
  function frictionEffectPct(s) { var a = accel(s), i = idealAccel(s); return i > 0 ? 100 * Math.abs(a - i) / i : 0; }
  function compensationAngle() { return Math.atan(MU_K) * 180 / Math.PI; }

  /* constant acceleration from rest */
  function timeToDistance(a, x) { return Math.sqrt(2 * x / a); }
  function speedAt(a, x) { return Math.sqrt(2 * a * x); }
  /* one run through the gates: u at x1, v at x2, t between, d = x2 - x1 */
  function gateRun(a, x1, x2) { var u = speedAt(a, x1), v = speedAt(a, x2); return { u: u, v: v, t: (v - u) / a, d: x2 - x1 }; }

  /* uncertainty sources for a timing (seconds) */
  function sources(t, timer) { var T = TIMERS[timer]; return { timer: T.sig, release: T.rel * t, resolution: T.res / 2 }; }
  function biggest(t, timer) { var s = sources(t, timer); return Math.max(s.timer, s.release, s.resolution); }
  function speedRelErr(v) { var tc = CARD / v; return Math.max(CARD_SIG, REL_V * tc) / tc; }

  /* simulated readings. rand = Sim.rng(...). Returns null if the trolley does not move. */
  function measureTime(s, x, timer, rand) {
    var a = accel(s); if (!(a > 0)) return null;
    var t = timeToDistance(a, x), T = TIMERS[timer], v = t + rand.gauss() * biggest(t, timer), r = rand.next();
    if (r < 0.04) v *= 1.08 + 0.17 * rand.next();                                 // string snags / trolley sticks
    else if (timer === 'stopwatch' && r < 0.10) v += (rand.next() < 0.5 ? -1 : 1) * (0.2 + 0.15 * rand.next());
    return Math.round(v / T.res) * T.res;
  }
  function measureGates(s, x1, x2, rand) {
    var a = accel(s); if (!(a > 0)) return null;
    var g = gateRun(a, x1, x2), r = rand.next(), T = TIMERS.gates;
    function card(v) { if (v <= 0) return 0; var tc = CARD / v, sd = Math.max(CARD_SIG, REL_V * tc); return CARD / (Math.max(0.001, Math.round((tc + rand.gauss() * sd) / 0.001) * 0.001)); }
    var u = x1 > 0 ? card(g.u) : 0, v = card(g.v), t = g.t + rand.gauss() * biggest(g.t, 'gates');
    if (r < 0.04) t *= 1.05 + 0.1 * rand.next();
    return { t: Math.round(t / T.res) * T.res, u: u, v: v, d: g.d };
  }

  /* percentage uncertainty in a (first approximation, biggest sources) */
  function accelUncPct(s, x1, x2, timer) {
    var a = accel(s); if (!(a > 0)) return NaN;
    if (timer !== 'gates') { var t = timeToDistance(a, x2); return 2 * 100 * biggest(t, timer) / t; }
    var g = gateRun(a, x1, x2), du = g.u * speedRelErr(g.u || 1) * (g.u ? 1 : 0), dv = g.v * speedRelErr(g.v);
    return 100 * (2 * g.v * dv + 2 * g.u * du) / (g.v * g.v - g.u * g.u);
  }
  function longEnough(s, x1, x2, timer) {
    var a = accel(s); if (!(a > 0)) return false;
    var t = timer === 'gates' ? gateRun(a, x1, x2).t : timeToDistance(a, x2);
    return t >= 10 * TIMERS[timer].sig;
  }

  return { G: G, TROLLEY_BARE: TROLLEY_BARE, SLOT: SLOT, N_SLOTS: N_SLOTS, HANGER: HANGER, EXTRA: EXTRA, PULLEY: PULLEY, MU_K: MU_K, MU_S: MU_S, TRACK: TRACK, CARD: CARD,
    REL_T: REL_T, REL_V: REL_V, TIMERS: TIMERS, TARGET_PCT: TARGET_PCT, FRICTION_PCT: FRICTION_PCT,
    slotsOnTrolley: slotsOnTrolley, trolleyMass: trolleyMass, hangerMass: hangerMass, totalMass: totalMass, sysMass: sysMass, force: force, netForce: netForce,
    moves: moves, accel: accel, idealAccel: idealAccel, frictionEffectPct: frictionEffectPct, compensationAngle: compensationAngle,
    timeToDistance: timeToDistance, speedAt: speedAt, gateRun: gateRun, sources: sources, biggest: biggest, speedRelErr: speedRelErr,
    measureTime: measureTime, measureGates: measureGates, accelUncPct: accelUncPct, longEnough: longEnough };
});
