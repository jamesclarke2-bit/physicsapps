/* Fission reactor model: the SINGLE SOURCE OF TRUTH for this app's physics.
   The simulator (app.js) and the tests read this file. UMD: window.ReactorModel or require().

   A deliberately simple, qualitative model (GCSE level). Time is SLOWED so cause and effect can be seen.
   ASSUMPTIONS (also in README.md, keep both in step):
   - Water is both moderator and coolant (as in a pressurised water reactor). Other designs exist.
   - Control rods inserted fraction i (0 out, 1 fully in). Each fission causes k further fissions on average:
       k = 0.88 + 0.16 (1 - i), so k = 1 (critical) with the rods 25 % in. Without the moderator k is multiplied by 0.6.
   - Relative neutron population n (1 = full power):  dn/dt = (k - 1) n / TAU + a small source. TAU = 0.2 s (real: far shorter).
   - Thermal power P = 900 MW x n. Energy per fission 3.2e-11 J, so fissions per second = P / 3.2e-11.
   - Decay heat: 6 % of the power, dying away with a time constant of 60 s here (about 10 minutes in a real reactor).
   - Heat: C dT/dt = 0.94 P + decay heat - Q (6 % of the energy of each fission is released later as decay heat, so at steady power the heat made equals P), Q = H x pump x (T - 20 C). H is chosen so full power with the pump at full flow sits at 300 C.
   - Electrical power = 0.35 x Q when the turbine is connected (thermal efficiency 35 %). The rest is wasted as heat.
   - Limits: alarm 340 C, automatic shutdown (SCRAM) 350 C, fuel damage above 600 C, meltdown above 900 C.
   - No temperature feedback and no delayed neutrons: not needed here. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ReactorModel = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var P_FULL = 900, E_FISSION = 3.2e-11, EFFICIENCY = 0.35;
  var K_MIN = 0.88, K_SPAN = 0.16, NO_MODERATOR = 0.6, TAU = 0.2, N_MIN = 0.001, N_MAX = 5;
  var SOURCE = N_MIN * (1 - K_MIN) / TAU, N_SRC_OFF = 0.01;
  var T_AMB = 20, C = 60, H = P_FULL / (300 - T_AMB);
  var DECAY_FRAC = 0.06, DECAY_TAU = 60;
  var T_ALARM = 340, T_SCRAM = 350, T_DAMAGE = 600, T_MELT = 900;
  var CRITICAL_BAND = 0.005;

  function create() {
    return { t: 0, n: N_MIN, T: T_AMB, pd: 0, rods: 1, pump: 0.6, turbine: true, auto: true,
      missing: { moderator: false, rods: false, coolant: false, shield: false },
      scrammed: false, damaged: false, melted: false };
  }
  function insertion(s) { return s.missing.rods ? 0 : (s.scrammed ? 1 : s.rods); }
  function kEff(s) {
    var k = K_MIN + K_SPAN * (1 - insertion(s));
    return s.missing.moderator ? k * NO_MODERATOR : k;
  }
  function flow(s) { return s.missing.coolant ? 0 : s.pump; }
  function heatRemoved(s) { return H * flow(s) * Math.max(0, s.T - T_AMB); }
  function statusOf(s) {
    var k = kEff(s);
    if (s.melted) return 'Meltdown';
    if (s.damaged) return 'Fuel damage';
    if (s.scrammed) return 'Emergency shutdown (SCRAM)';
    if (k < 1 - CRITICAL_BAND) return 'Subcritical';
    if (k <= 1 + CRITICAL_BAND) return 'Critical';
    return 'Supercritical';
  }
  function trend(s) {
    var k = kEff(s);
    return k < 1 - CRITICAL_BAND ? 'falling' : k <= 1 + CRITICAL_BAND ? 'steady' : 'rising';
  }
  function derive(s) {
    var P = P_FULL * s.n, Q = heatRemoved(s), Pe = s.turbine && s.T > 100 ? EFFICIENCY * Q : 0;
    return { k: kEff(s), status: statusOf(s), trend: trend(s), P: P, fissions: P * 1e6 / E_FISSION,
      Q: Q, Pe: Pe, waste: Q - Pe, pd: s.pd, steam: Math.min(1, Math.max(0, (s.T - 100) / 200)),
      dose: s.n * (s.missing.shield ? 1 : 0.001), alarm: s.T >= T_ALARM, insertion: insertion(s) };
  }
  function step(s, dt) {
    if (s.melted) return s;
    var k = kEff(s), r = (k - 1) / TAU;
    s.n = Math.min(N_MAX, Math.max(N_MIN, s.n * Math.exp(r * dt) + SOURCE * Math.max(0, 1 - s.n / N_SRC_OFF) * dt));
    var P = P_FULL * s.n;
    s.pd += (DECAY_FRAC * P - s.pd) / DECAY_TAU * dt;
    s.T += (P * (1 - DECAY_FRAC) + s.pd - heatRemoved(s)) / C * dt;
    if (s.T < T_AMB) s.T = T_AMB;
    if (s.auto && !s.scrammed && s.T >= T_SCRAM) s.scrammed = true;
    if (s.T > T_DAMAGE) s.damaged = true;
    if (s.T > T_MELT) s.melted = true;
    s.t += dt;
    return s;
  }
  function run(s, seconds, dt) { dt = dt || 0.05; var n = Math.round(seconds / dt), i; for (i = 0; i < n; i++) step(s, dt); return s; }
  function reset(s) { var f = create(); Object.keys(f).forEach(function (k) { s[k] = f[k]; }); return s; }

  /* fissions per second from a power in MW and an energy per fission in J (used by the calculation tab) */
  function fissionsPerSecond(powerMW, energyJ) { return powerMW * 1e6 / (energyJ || E_FISSION); }

  return { P_FULL: P_FULL, E_FISSION: E_FISSION, EFFICIENCY: EFFICIENCY, K_MIN: K_MIN, K_SPAN: K_SPAN, TAU: TAU, N_MIN: N_MIN, N_MAX: N_MAX,
    T_AMB: T_AMB, T_ALARM: T_ALARM, T_SCRAM: T_SCRAM, T_DAMAGE: T_DAMAGE, T_MELT: T_MELT, DECAY_FRAC: DECAY_FRAC, DECAY_TAU: DECAY_TAU,
    CRITICAL_INSERTION: 1 - (1 - K_MIN) / K_SPAN, create: create, step: step, run: run, reset: reset, derive: derive, kEff: kEff, insertion: insertion,
    heatRemoved: heatRemoved, fissionsPerSecond: fissionsPerSecond, statusOf: statusOf };
});
