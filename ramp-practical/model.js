/* Ramp Practical model: the SINGLE SOURCE OF TRUTH for this app's physics. It wraps the trolley engine in
   ../force-mass-acceleration/model.js (hanger off, track tilted) and adds only what the ramp practical needs.
   Never copy the engine's formulas here. UMD: window.RampModel (load ForceModel first) or require() in Node.

   ASSUMPTIONS (also in README.md, keep both in step):
   - Trolley 0.800 kg (bare 0.600 kg + 10 slotted masses of 0.020 kg), no hanger, released from rest (u = 0).
   - a = g (sin(theta) - mu cos(theta)), g = 9.81 m s^-2, kinetic friction mu = 0.011. Moves only if tan(theta) > 1.25 mu (about 0.8 degrees).
   - From rest: s = a t^2 / 2, v^2 = 2 a s, v = a t.
   - Every uncertainty source is a FIXED amount (seconds, millimetres, degrees), so a longer run or a bigger angle has a smaller percentage uncertainty.
     Stopwatch +/-0.07 s, video +/-0.01 s (release/judging 0.02 s): each timing has random error with sd equal to the biggest single source.
   - Light gate and card at the end of the ramp: card 0.100 m, speed from the card time, error the bigger of 0.2 ms and 1% of the card time (about 1% in v).
   - Angle: protractor, half of 1 degree (+/-0.5 degrees); or trigonometry, sin(theta) = h / ell with the height h read with a metre rule to +/-0.5 mm.
   - Anomalies about 4% of runs (wheel catches, card misaligned) plus stopwatch fumbles; the student crosses them out.
   - Systematic error: friction gives a negative intercept (about -mu g) on a against sin(theta); it does not stop v^2 or t^2 being proportional to s. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('../force-mass-acceleration/model.js'));
  else root.RampModel = factory(root.ForceModel);
})(typeof self !== 'undefined' ? self : this, function (F) {
  var G = F.G, MU = F.MU_K, PROTRACTOR_SIG = F.TILT_SIG, HEIGHT_SIG = 0.0005, TARGET_PCT = 5, FRICTION_PCT = 5, SPEED_RES = 0.001;
  var TIMERS = {
    stopwatch: F.TIMERS.stopwatch,
    video: F.TIMERS.video,
    gate: { name: 'Light gate and card at the end of the ramp', short: 'Light gate', sig: 0, res: SPEED_RES, rel: 0 }
  };
  var rad = function (d) { return d * Math.PI / 180; }, deg = function (r) { return r * 180 / Math.PI; };

  function setup(th) { return { nh: 0, k: 0, constant: true, tilt: th, hanger: false }; }
  function moves(th) { return F.moves(setup(th)); }
  function accel(th) { return F.accel(setup(th)); }                       // what the trolley really does (with friction)
  function ideal(th) { return G * Math.sin(rad(th)); }                    // a = g sin(theta): the prediction students validate
  function frictionPct(th) { return F.frictionEffectPct(setup(th)); }     // 100 mu / tan(theta)
  function force(th) { return moves(th) ? F.netForce(setup(th)) : 0; }  // net force down the slope, N
  var MASS = F.trolleyMass(setup(0));                                    // 0.800 kg
  function heightFor(th, ell) { return ell * Math.sin(rad(th)); }
  function angleFromHeight(h, ell) { return deg(Math.asin(h / ell)); }

  /* motion from rest */
  function timeFor(th, s) { return F.timeToDistance(accel(th), s); }
  function speedFor(th, s) { return F.speedAt(accel(th), s); }
  function aFromT(s, t) { return 2 * s / (t * t); }
  function aFromV(s, v) { return v * v / (2 * s); }

  /* angle uncertainty: a fixed amount. protractor +/-0.5 deg; trigonometry: delta(sin theta) = dh / ell, so delta(theta) = dh / (ell cos theta). */
  function angleUncDeg(th, method, ell) { return method === 'trig' ? deg(HEIGHT_SIG / (ell * Math.cos(rad(th)))) : PROTRACTOR_SIG; }
  function sinUnc(th, method, ell) { return Math.cos(rad(th)) * rad(angleUncDeg(th, method, ell)); }
  function sinPct(th, method, ell) { return th > 0 ? 100 * sinUnc(th, method, ell) / Math.sin(rad(th)) : NaN; }

  /* simulated readings. rand = Sim.rng(...). Return null if the trolley does not move. */
  function measureTime(th, s, timer, rand) { return moves(th) ? F.measureTime(setup(th), s, timer, rand) : null; }
  function measureSpeed(th, s, rand) {
    var a = accel(th); if (!(a > 0)) return null;
    var v = F.speedAt(a, s), tc = F.CARD / v, sd = Math.max(F.CARD_SIG, F.REL_V * tc);
    var tm = Math.max(0.0001, Math.round((tc + rand.gauss() * sd) / 0.0001) * 0.0001), vm = F.CARD / tm;
    if (rand.next() < 0.04) vm *= 0.80 + 0.12 * rand.next();             // wheel catches / card misaligned
    return Math.round(vm / SPEED_RES) * SPEED_RES;
  }

  /* percentage uncertainty in a from one run set-up (first approximation, biggest sources) */
  function biggest(th, s, timer) { return F.biggest(timeFor(th, s), timer); }
  function sources(th, s, timer) { return F.sources(timeFor(th, s), timer); }   // {timer, release, resolution} in seconds
  function accelUncPct(th, s, timer) {
    if (!moves(th)) return NaN;
    if (timer === 'gate') return 200 * F.speedRelErr(speedFor(th, s));   // a = v^2 / 2s, so twice the % in v
    var t = timeFor(th, s); return 200 * F.biggest(t, timer) / t;        // a = 2s / t^2, so twice the % in t
  }
  function longEnough(th, s, timer) { return timer === 'gate' ? true : moves(th) && timeFor(th, s) >= 10 * TIMERS[timer].sig; }

  /* validation: does the accepted value lie within (result +/- uncertainty)? */
  function agrees(value, unc, accepted) {
    var diff = value - accepted;
    return { diff: diff, within: Math.abs(diff) <= unc, pctDiff: 100 * Math.abs(diff) / Math.abs(accepted), pctUnc: 100 * unc / Math.abs(value) };
  }

  return { G: G, MU: MU, ACCEPTED_G: G, PROTRACTOR_SIG: PROTRACTOR_SIG, HEIGHT_SIG: HEIGHT_SIG, TARGET_PCT: TARGET_PCT, FRICTION_PCT: FRICTION_PCT, CARD: F.CARD, TRACK: F.TRACK, TIMERS: TIMERS,
    MASS: MASS, setup: setup, moves: moves, accel: accel, ideal: ideal, force: force, frictionPct: frictionPct, heightFor: heightFor, angleFromHeight: angleFromHeight,
    timeFor: timeFor, speedFor: speedFor, aFromT: aFromT, aFromV: aFromV, angleUncDeg: angleUncDeg, sinUnc: sinUnc, sinPct: sinPct,
    measureTime: measureTime, measureSpeed: measureSpeed, biggest: biggest, sources: sources, accelUncPct: accelUncPct, longEnough: longEnough, agrees: agrees };
});
