/* Equation Explorer text: symbolic equations and live numerical substitution, built from model.js values.
   No physics here, only presentation: every number comes from ProjectileModel. UMD (browser: window.ProjectileEquations).
   Output is HTML (sub/superscripts). Substituted values use the same rounding as the live readouts (DP), so the text
   on screen and the readouts always agree. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./model.js'));
  else root.ProjectileEquations = factory(root.ProjectileModel);
})(typeof self !== 'undefined' ? self : this, function (M) {
  var DP = 2;
  var U = { s: 's', m: 'm', v: 'm s<sup>−1</sup>', a: 'm s<sup>−2</sup>', deg: '°' };
  var ASSUMPTION = 'No air resistance. Acceleration is g downward; horizontal acceleration is zero. Up is positive.';
  function fmt(x, dp) { if (!isFinite(x)) return '–'; var s = (Math.abs(x) < 0.5 * Math.pow(10, -(dp === undefined ? DP : dp)) ? 0 : x).toFixed(dp === undefined ? DP : dp); return s.replace('-', '−'); }
  function par(x, dp) { var s = fmt(x, dp); return s.charAt(0) === '−' ? '(' + s + ')' : s; }   // brackets round negative numbers
  function q(x, unit, dp) { return '<span class="qty">' + fmt(x, dp) + '&nbsp;' + U[unit] + '</span>'; }
  var S = { ux: 'u<sub>x</sub>', uy: 'u<sub>y</sub>', vx: 'v<sub>x</sub>', vy: 'v<sub>y</sub>', ax: 'a<sub>x</sub>', ay: 'a<sub>y</sub>', h0: 'h<sub>0</sub>', th: 'θ' };

  /* Live equations at clock time t. Each line: {id, name, sym (symbolic), sub (substitution, ends in the result with its unit)}. */
  function live(p, t) {
    var n = M.norm(p), s = M.state(n, t);
    var tt = s.t;
    return {
      assumption: ASSUMPTION,
      horizontal: [
        { id: 'ux', name: 'Horizontal component of launch velocity', sym: S.ux + ' = u cos ' + S.th,
          sub: S.ux + ' = ' + fmt(n.u) + ' × cos ' + fmt(n.thetaDeg, 0) + '° = ' + q(n.ux, 'v') },
        { id: 'x', name: 'Horizontal displacement', sym: 'x = ' + S.ux + 't',
          sub: 'x = ' + fmt(n.ux) + ' × ' + fmt(tt) + ' = ' + q(s.x, 'm') },
        { id: 'vx', name: 'Horizontal velocity (constant)', sym: S.vx + ' = ' + S.ux,
          sub: S.vx + ' = ' + q(s.vx, 'v') },
        { id: 'ax', name: 'Horizontal acceleration', sym: S.ax + ' = 0', sub: S.ax + ' = ' + q(0, 'a') }
      ],
      vertical: [
        { id: 'uy', name: 'Vertical component of launch velocity', sym: S.uy + ' = u sin ' + S.th,
          sub: S.uy + ' = ' + fmt(n.u) + ' × sin ' + fmt(n.thetaDeg, 0) + '° = ' + q(n.uy, 'v') },
        { id: 'y', name: 'Height above the ground', sym: 'y = ' + S.h0 + ' + ' + S.uy + 't − ½gt<sup>2</sup>',
          sub: 'y = ' + par(n.h0) + ' + (' + fmt(n.uy) + ' × ' + fmt(tt) + ') − 0.5 × ' + fmt(n.g) + ' × (' + fmt(tt) + '<sup>2</sup>) = ' + q(s.y, 'm') },
        { id: 'vy', name: 'Vertical velocity', sym: S.vy + ' = ' + S.uy + ' − gt',
          sub: S.vy + ' = ' + fmt(n.uy) + ' − (' + fmt(n.g) + ' × ' + fmt(tt) + ') = ' + q(s.vy, 'v') },
        { id: 'ay', name: 'Vertical acceleration (constant)', sym: S.ay + ' = −g', sub: S.ay + ' = ' + q(s.ay, 'a') }
      ],
      resultant: [
        { id: 'v', name: 'Speed (size of the resultant velocity)', sym: '|v| = √(' + S.vx + '<sup>2</sup> + ' + S.vy + '<sup>2</sup>)',
          sub: '|v| = √(' + par(s.vx) + '<sup>2</sup> + ' + par(s.vy) + '<sup>2</sup>) = ' + q(s.speed, 'v') }
      ]
    };
  }

  /* Whole-flight results, each with symbolic form and substitution (used in pop-ups, Graph view and worked solutions). */
  function results(p) {
    var n = M.norm(p), r = M.summary(n), disc = n.uy * n.uy + 2 * n.g * n.h0;
    var T = r.clearsPit
      ? { sym: 't = (' + S.uy + ' + √(' + S.uy + '<sup>2</sup> + 2g' + S.h0 + ')) ÷ g', sub: 't = (' + fmt(n.uy) + ' + √(' + fmt(n.uy) + '<sup>2</sup> + 2 × ' + fmt(n.g) + ' × ' + par(n.h0) + ')) ÷ ' + fmt(n.g) + ' = ' + q(r.T, 's'),
          note: 'Flight time is the positive root of y = 0 (the later one, as it comes down).' }
      : { sym: 't = 2' + S.uy + ' ÷ g', sub: 't = 2 × ' + fmt(n.uy) + ' ÷ ' + fmt(n.g) + ' = ' + q(r.T, 's'),
          note: 'It never reaches ground level (' + S.uy + '<sup>2</sup> + 2g' + S.h0 + ' = ' + q(disc, 'm', 2).replace(U.m, 'm<sup>2</sup> s<sup>−2</sup>') + ' is negative), so it falls back to the pit floor.' };
    return {
      tMax: { name: 'Time to max height', sym: 't<sub>top</sub> = ' + S.uy + ' ÷ g', sub: 't<sub>top</sub> = ' + fmt(n.uy) + ' ÷ ' + fmt(n.g) + ' = ' + q(r.tMax, 's'), value: r.tMax, unit: 's' },
      H: { name: 'Max height', sym: 'H = ' + S.h0 + ' + ' + S.uy + '<sup>2</sup> ÷ (2g)', sub: 'H = ' + par(n.h0) + ' + ' + fmt(n.uy) + '<sup>2</sup> ÷ (2 × ' + fmt(n.g) + ') = ' + q(r.H, 'm'), value: r.H, unit: 'm' },
      T: { name: 'Flight time', sym: T.sym, sub: T.sub, note: T.note, value: r.T, unit: 's' },
      R: { name: r.clearsPit ? 'Range' : 'Distance when it lands on the pit floor', sym: 'R = ' + S.ux + 'T', sub: 'R = ' + fmt(n.ux) + ' × ' + fmt(r.T) + ' = ' + q(r.R, 'm'), value: r.R, unit: 'm' },
      vLand: { name: 'Landing speed', sym: '|v| = √(' + S.ux + '<sup>2</sup> + ' + S.vy + '<sup>2</sup>), with ' + S.vy + ' = ' + S.uy + ' − gT',
        sub: S.vy + ' = ' + fmt(n.uy) + ' − (' + fmt(n.g) + ' × ' + fmt(r.T) + ') = ' + q(n.uy - n.g * r.T, 'v') + '; |v| = √(' + fmt(n.ux) + '<sup>2</sup> + ' + par(n.uy - n.g * r.T) + '<sup>2</sup>) = ' + q(r.vLand, 'v'), value: r.vLand, unit: 'v' }
    };
  }
  function stripTags(h) { return String(h).replace(/<sup>2<\/sup>/g, '²').replace(/<sup>−1<\/sup>/g, '⁻¹').replace(/<sup>−2<\/sup>/g, '⁻²').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' '); }
  return { DP: DP, U: U, ASSUMPTION: ASSUMPTION, fmt: fmt, q: q, live: live, results: results, stripTags: stripTags };
});
