/* Pendulum model: the SINGLE SOURCE OF TRUTH for this app's physics.
   The simulation (app.js), the worksheet figures, the teacher answers and the tests all read this file.
   Never copy these formulas anywhere else. UMD: loads in the browser (window.PendulumModel) and in Node (require).

   ASSUMPTIONS (also listed in README.md, keep both in step):
   - Point-mass pendulum of length L (pivot to centre of bob), small damping ignored.
   - Period T = 2*pi*sqrt(L/g) * (1 + th0^2/16 + 11*th0^4/3072), th0 = amplitude in radians (series to 4th order).
   - A timing of N oscillations has random error with standard deviation equal to the BIGGEST single source:
       timer (reaction/instrument), release and judging the end-points (a fixed REL seconds), or resolution/2.
     So the half-range of a few repeats is, on average, about the biggest source (teaching rule: uncertainty = half the range).
   - Occasional anomalies: miscounting by one oscillation (3%), stopwatch fumble (5%).
   - Systematic error: measuring length to the TOP of the bob instead of its centre makes L too short by BOB_R. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PendulumModel = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var G = 9.81, REL = 0.02, BOB_R = 0.025;
  var TIMERS = {
    stopwatch: { name: 'Hand stopwatch', short: 'Stopwatch', sig: 0.07, res: 0.01 },
    video: { name: 'Video, frame by frame', short: 'Video', sig: 0.01, res: 0.001 },
    gates: { name: 'Light gate', short: 'Light gate', sig: 0.003, res: 0.001 }
  };
  var TARGET_PCT = 5, SMALL_ANGLE_PCT = 1;

  function period(L, thDeg) { var th = thDeg * Math.PI / 180; return 2 * Math.PI * Math.sqrt(L / G) * (1 + th * th / 16 + 11 * Math.pow(th, 4) / 3072); }
  function periodSmall(L) { return 2 * Math.PI * Math.sqrt(L / G); }
  function smallAnglePct(thDeg) { var th = thDeg * Math.PI / 180; return 100 * (th * th / 16 + 11 * Math.pow(th, 4) / 3072); }
  /* the length a student reads off the ruler -> the true pivot-to-centre length */
  function trueLength(Lmeasured, where) { return Lmeasured + (where === 'top' ? BOB_R : 0); }
  function sources(tTrue, timer) { var t = TIMERS[timer]; return { timer: t.sig, release: REL, resolution: t.res / 2 }; }
  function biggest(tTrue, timer) { var s = sources(tTrue, timer); return Math.max(s.timer, s.release, s.resolution); }
  /* % uncertainty in T (= % uncertainty in the timed total, for N oscillations) */
  function uncPct(Lmeasured, thDeg, N, timer, where) {
    var T = period(trueLength(Lmeasured, where), thDeg), t = N * T; return 100 * biggest(t, timer) / t;
  }
  /* One simulated reading of the time for N oscillations. rand = Sim.rng(...) */
  function measure(Lmeasured, thDeg, N, timer, where, rand) {
    var T = period(trueLength(Lmeasured, where), thDeg), t = N * T, tm = TIMERS[timer];
    var x = t + rand.gauss() * biggest(t, timer);
    var r = rand.next();
    if (r < 0.03) x += (rand.next() < 0.5 ? -1 : 1) * T;
    else if (timer === 'stopwatch' && r < 0.08) x += (rand.next() < 0.5 ? -1 : 1) * (0.2 + 0.15 * rand.next());
    return Math.round(x / tm.res) * tm.res;
  }
  /* Teaching check: the timing should last at least 10 x the timer uncertainty */
  function longEnough(Lmeasured, thDeg, N, timer, where) { var t = N * period(trueLength(Lmeasured, where), thDeg); return t >= 10 * TIMERS[timer].sig; }

  return { G: G, REL: REL, BOB_R: BOB_R, TIMERS: TIMERS, TARGET_PCT: TARGET_PCT, SMALL_ANGLE_PCT: SMALL_ANGLE_PCT,
    period: period, periodSmall: periodSmall, smallAnglePct: smallAnglePct, trueLength: trueLength, sources: sources, biggest: biggest,
    uncPct: uncPct, measure: measure, longEnough: longEnough };
});
