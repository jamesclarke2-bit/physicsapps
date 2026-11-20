/* Vectors and Forces Lab model: the SINGLE SOURCE OF TRUTH for this app's physics.
   The page (app.js) and the tests read this file. Never copy these formulas anywhere else.
   UMD: loads in the browser (window.VectorsModel) and in Node (require).

   ASSUMPTIONS (also in README.md, keep both in step):
   Golf in a crosswind
   - Flat, horizontal motion seen from above. No air drag. The wind adds a sideways velocity w (west to east).
   - The ball is aimed at angle theta from the target line (negative = upwind, towards the west).
   - Along the line: f = u cos(theta). Across the line: s = w + u sin(theta). Resultant R = sqrt(f^2 + s^2).
   - Angle off the line: alpha = atan2(s, f). At the flag (D = 150 m) the miss is D tan(alpha) = D s / f.
   - Aiming off to cancel the wind: sin(theta) = -w/u.
   Shopping bag and shoulder
   - Rigid straight arm of length L = 0.65 m pivoting at the shoulder, angle phi from the vertical. Arm weight ignored.
   - Weight W = m g, g = 9.81 N/kg. Perpendicular distance from the shoulder to the line of W: x = L sin(phi).
   - Moment M = W x. A muscle with lever arm d balances it: F d = M, so F = M / d and F / W = x / d. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.VectorsModel = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var RAD = Math.PI / 180;
  var D = 150;          // m, distance to the flag
  var ON_TARGET = 6;    // m, counts as "on target"
  var G = 9.81;         // N kg^-1
  var L_ARM = 0.65;     // m

  function golf(u, w, thDeg) {
    var th = thDeg * RAD;
    var f = u * Math.cos(th), s = w + u * Math.sin(th);
    var R = Math.hypot(f, s), al = Math.atan2(s, f);
    return { u: u, w: w, thDeg: thDeg, f: f, s: s, R: R, alpha: al, alphaDeg: al / RAD, miss: D * s / f, time: D / f };
  }
  /* Aim angle (degrees, negative = upwind) that cancels the wind. */
  function aimAngle(u, w) { return -Math.asin(Math.min(1, w / u)) / RAD; }
  function onTarget(miss) { return Math.abs(miss) <= ON_TARGET; }

  function bag(m, phiDeg, dcm) {
    var W = m * G, x = L_ARM * Math.sin(phiDeg * RAD), M = W * x, d = dcm / 100, F = M / d;
    return { m: m, phiDeg: phiDeg, dcm: dcm, d: d, W: W, x: x, M: M, F: F, ratio: x / d };
  }

  return { RAD: RAD, D: D, ON_TARGET: ON_TARGET, G: G, L_ARM: L_ARM, golf: golf, aimAngle: aimAngle, onTarget: onTarget, bag: bag };
});
