/* Vectors and Forces Lab: UI only. All physics comes from model.js; generic widgets from ../shared/sim.js. */
(function () {
  'use strict';
  var M = window.VectorsModel, el = Sim.el, A = Sim.svgel, RAD = M.RAD;
  var $ = function (id) { return document.getElementById(id); };
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function n(x, d) { return (Math.abs(x) < Math.pow(10, -d) / 2 ? 0 : x).toFixed(d).replace('-', '−'); }
  function setA(e, o) { for (var k in o) e.setAttribute(k, o[k]); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function clear(e) { while (e.firstChild) e.removeChild(e.firstChild); }

  /* a tile value that opens its worked calculation */
  function tile(id, text, unit, title, steps) {
    var box = $(id); clear(box);
    box.appendChild(Sim.calcButton(text, title, function () { return [Sim.steps(steps)]; }));
    if (unit) box.appendChild(el('small', { text: ' ' + unit }));
  }

  /* ---------- GOLF ---------- */
  var SC = 2.4, OX = 180, OY = 410, K = 3, TO = { x: 150, y: 262 };
  var gu = $('u'), gw = $('w'), gth = $('th'), raf = null, G;

  [50, 100, 150].forEach(function (m) {
    var y = OY - m * SC, g = $('fw-grid');
    g.appendChild(A('line', { x1: 0, x2: 360, y1: y, y2: y, class: 'thin', style: 'stroke:var(--line);stroke-width:1' }));
    g.appendChild(A('text', { x: 8, y: y - 5, class: 'muted halo mono' }, m + ' m'));
  });

  function arc(o, r, beta) {
    if (Math.abs(beta) < 0.4 * RAD) return '';
    return 'M' + o.x + ' ' + (o.y - r) + ' A' + r + ' ' + r + ' 0 0 ' + (beta > 0 ? 1 : 0) + ' ' + (o.x + r * Math.sin(beta)).toFixed(1) + ' ' + (o.y - r * Math.cos(beta)).toFixed(1);
  }
  function endPoint() { return { x: OX + clamp(G.miss * SC, -170, 170), y: OY - M.D * SC }; }
  function placeBall(p) {
    var e = endPoint(), x = OX + (e.x - OX) * p, y = OY + (e.y - OY) * p;
    setA($('ballDot'), { cx: x, cy: y }); setA($('trail'), { x2: x, y2: y });
  }

  function renderGolf() {
    var u = +gu.value, w = +gw.value, thd = +gth.value, S = G = M.golf(u, w, thd), th = thd * RAD;
    $('uo').textContent = n(u, 0) + ' m/s'; $('wo').textContent = n(w, 1) + ' m/s'; $('tho').textContent = n(thd, 1) + '°';
    var abs = Math.abs(S.alphaDeg);

    tile('gF', n(S.f, 1), 'm/s', 'Forward speed', [['Component of the ball’s velocity along the target line', 'v∥ = u cos θ = ' + n(u, 0) + ' × cos ' + n(thd, 1) + '° = ' + n(S.f, 1) + ' m/s']]);
    tile('gS', n(S.s, 1), 'm/s', 'Sideways speed', [['Wind plus the sideways part of the ball’s velocity (east is positive)', 'v⊥ = w + u sin θ = ' + n(w, 1) + ' + ' + n(u, 0) + ' × sin ' + n(thd, 1) + '° = ' + n(S.s, 1) + ' m/s']]);
    tile('gR', n(S.R, 1), 'm/s', 'Resultant speed', [['Pythagoras on the two components', 'R = √(' + n(S.f, 1) + '² + ' + n(S.s, 1) + '²) = ' + n(S.R, 1) + ' m/s']]);
    tile('gA', n(abs, 1), '°', 'Angle off the target line', [['Tangent of the angle = sideways ÷ forward', 'tan α = ' + n(S.s, 1) + ' ÷ ' + n(S.f, 1) + ' = ' + n(S.s / S.f, 3)], ['Inverse tangent', 'α = ' + n(S.alphaDeg, 1) + '° (' + (S.s >= 0 ? 'east' : 'west') + ' of the line)']]);

    var v = $('verdict'), m = Math.abs(S.miss);
    if (M.onTarget(S.miss)) { v.className = 'pill good'; v.textContent = '✓ On target (' + n(m, 1) + ' m from the flag)'; }
    else { v.className = 'pill warn'; v.textContent = 'Misses by ' + n(m, 0) + ' m to the ' + (S.miss > 0 ? 'east' : 'west'); }

    var e = endPoint();
    setA($('pred'), { x2: e.x, y2: e.y }); setA($('landc'), { cx: e.x, cy: e.y });
    if (raf) { cancelAnimationFrame(raf); raf = null; }
    placeBall(0);
    var wg = $('fw-wind-g'); clear(wg);
    if (w > 0) {
      [150, 230, 310].forEach(function (y) { wg.appendChild(A('line', { x1: 14, y1: y, x2: 14 + w * 4, y2: y, class: 'vec', style: 'stroke:var(--v-wind);stroke-width:2.5', 'marker-end': 'url(#fw-wind)' })); });
      wg.appendChild(A('text', { x: 14, y: 134, class: 'halo mono', style: 'fill:var(--v-wind)' }, 'wind ' + n(w, 1) + ' m/s'));
    }

    var B = { x: TO.x + K * u * Math.sin(th), y: TO.y - K * u * Math.cos(th) }, E = { x: B.x + K * w, y: B.y };
    setA($('vBall'), { x1: TO.x, y1: TO.y, x2: B.x, y2: B.y });
    setA($('vWind'), { x1: B.x, y1: B.y, x2: E.x, y2: E.y, visibility: w > 0 ? 'visible' : 'hidden' });
    setA($('vRes'), { x1: TO.x, y1: TO.y, x2: E.x, y2: E.y });
    $('arcTh').setAttribute('d', arc(TO, 52, th)); $('arcAl').setAttribute('d', arc(TO, 74, S.alpha));
    var lb = $('lBall'); lb.textContent = 'ball ' + n(u, 0); setA(lb, { x: (TO.x + B.x) / 2 - 10, y: (TO.y + B.y) / 2, 'text-anchor': 'end' });
    var lw = $('lWind'); lw.textContent = w > 0 ? 'wind ' + n(w, 1) : ''; setA(lw, { x: (B.x + E.x) / 2, y: B.y - 10 });
    var lr = $('lRes'); lr.textContent = 'R ' + n(S.R, 1); setA(lr, { x: (TO.x + E.x) / 2 + 12, y: (TO.y + E.y) / 2 + 24, 'text-anchor': 'start' });
    var lt = $('lTh'); lt.textContent = Math.abs(thd) > 0.4 ? 'θ ' + n(Math.abs(thd), 1) + '°' : ''; setA(lt, { x: TO.x + (th >= 0 ? 8 : -8), y: TO.y - 30, 'text-anchor': th >= 0 ? 'start' : 'end' });
    var la = $('lAl'); la.textContent = abs > 0.4 ? 'α ' + n(abs, 1) + '°' : ''; setA(la, { x: TO.x + (S.alpha >= 0 ? 10 : -10), y: TO.y - 92, 'text-anchor': S.alpha >= 0 ? 'start' : 'end' });

    $('wk1').textContent = 'v∥ = u cos θ = ' + n(u, 0) + ' × cos ' + n(thd, 1) + '° = ' + n(S.f, 1) + ' m/s';
    $('wk2').textContent = 'v⊥ = w + u sin θ = ' + n(w, 1) + ' + ' + n(u, 0) + ' × sin ' + n(thd, 1) + '° = ' + n(S.s, 1) + ' m/s';
    $('wk3').textContent = 'R = √(' + n(S.f, 1) + '² + ' + n(S.s, 1) + '²) = ' + n(S.R, 1) + ' m/s';
    $('wk4').textContent = 'tan α = ' + n(S.s, 1) + ' ÷ ' + n(S.f, 1) + ' = ' + n(S.s / S.f, 3) + '  →  α = ' + n(S.alphaDeg, 1) + '°';
    $('wk5').textContent = M.D + ' × tan α = ' + n(S.miss, 1) + ' m (' + (m < 0.05 ? 'on the line' : S.miss > 0 ? 'east of the flag' : 'west of the flag') + '), time ≈ ' + n(S.time, 1) + ' s';
  }

  function hitBall() {
    if (raf) cancelAnimationFrame(raf);
    if (reduce) { placeBall(1); return; }
    var t0 = null;
    function step(ts) { if (t0 == null) t0 = ts; var p = clamp((ts - t0) / 2200, 0, 1); placeBall(p); raf = p < 1 ? requestAnimationFrame(step) : null; }
    placeBall(0); raf = requestAnimationFrame(step);
  }
  [gu, gw, gth].forEach(function (i) { i.addEventListener('input', renderGolf); });
  $('hit').addEventListener('click', hitBall);
  $('auto').addEventListener('click', function () { gth.value = clamp(Math.round(M.aimAngle(+gu.value, +gw.value) * 10) / 10, -40, 40); renderGolf(); });
  $('greset').addEventListener('click', function () { gu.value = 40; gw.value = 8; gth.value = 0; renderGolf(); });

  /* ---------- BAG ---------- */
  var gm = $('m'), gph = $('ph'), gd = $('d'), PXCM = 3.3, SH = { x: 160, y: 80 };

  function renderBag() {
    var m = +gm.value, phd = +gph.value, dcm = +gd.value, ph = phd * RAD, b = M.bag(m, phd, dcm);
    $('mo').textContent = n(m, 1) + ' kg'; $('pho').textContent = n(phd, 0) + '°'; $('do').textContent = n(dcm, 1) + ' cm';

    tile('bW', n(b.W, 1), 'N', 'Weight of the bag', [['Weight = mass × gravitational field strength', 'W = m g = ' + n(m, 1) + ' × 9.81 = ' + n(b.W, 1) + ' N']]);
    tile('bX', n(b.x * 100, 0), 'cm', 'Perpendicular distance', [['Distance from the shoulder to the line of the weight', 'x = L sin φ = 0.65 × sin ' + n(phd, 0) + '° = ' + n(b.x, 3) + ' m = ' + n(b.x * 100, 0) + ' cm']]);
    tile('bM', n(b.M, 1), 'N m', 'Moment of the weight', [['Moment = force × perpendicular distance', 'M = W x = ' + n(b.W, 1) + ' × ' + n(b.x, 3) + ' = ' + n(b.M, 1) + ' N m']]);
    tile('bF', n(b.F, 0), 'N', 'Muscle force', [['In equilibrium the muscle’s moment equals the bag’s moment', 'F × d = M'], ['Rearrange', 'F = M ÷ d = ' + n(b.M, 1) + ' ÷ ' + n(b.d, 3) + ' = ' + n(b.F, 0) + ' N']]);
    tile('bR', n(b.ratio, 1), '× the bag’s weight', 'Muscle force compared with the weight', [['Divide F by W. The W cancels, leaving a ratio of distances', 'F ÷ W = x ÷ d = ' + n(b.x * 100, 0) + ' ÷ ' + n(dcm, 1) + ' = ' + n(b.ratio, 1)]]);

    var Lpx = M.L_ARM * 100 * PXCM, H = { x: SH.x + Lpx * Math.sin(ph), y: SH.y + Lpx * Math.cos(ph) };
    setA($('arm'), { x2: H.x, y2: H.y }); setA($('wline'), { x1: H.x, x2: H.x });
    setA($('dimline'), { x1: SH.x, x2: Math.max(H.x, SH.x + 0.01), y1: 32, y2: 32, visibility: b.x > 0.02 ? 'visible' : 'hidden' });
    var dt = $('dimtxt'), far = H.x - SH.x > 90; dt.textContent = b.x > 0.02 ? 'x = ' + n(b.x * 100, 0) + ' cm' : 'x = 0';
    setA(dt, { x: far ? (SH.x + H.x) / 2 : SH.x + 6, y: 24, 'text-anchor': far ? 'middle' : 'start', style: 'fill:var(--ink)' });
    setA($('strap'), { x1: H.x, y1: H.y, x2: H.x, y2: H.y + 12 }); setA($('bagrect'), { x: H.x - 17, y: H.y + 12 });
    var cy = H.y + 31, len = clamp(b.W, 20, 78); setA($('warrow'), { x1: H.x, y1: cy, x2: H.x, y2: cy + len });
    var wt = $('wtxt'), right = H.x < 300; wt.textContent = 'W ' + n(b.W, 0) + ' N';
    setA(wt, { x: right ? H.x + 12 : H.x - 12, y: cy + len - 4, 'text-anchor': right ? 'start' : 'end' }); setA($('grab'), { cx: H.x, cy: H.y + 20 });
    var P = { x: SH.x + dcm * PXCM * Math.sin(ph), y: SH.y + dcm * PXCM * Math.cos(ph) };
    setA($('muscle'), { x1: P.x, y1: P.y, x2: SH.x - 4, y2: SH.y - 26 });
    var mt = $('mtxt'); mt.textContent = 'muscle ' + n(b.F, 0) + ' N'; setA(mt, { x: SH.x + 14, y: SH.y - 30 });

    var top = b.W * M.L_ARM, ymax = Math.max(4, Math.ceil(top / 4) * 4), X0 = 46, X1 = 406, Y0 = 244, Y1 = 14;
    var xs = function (a) { return X0 + (a / 90) * (X1 - X0); }, ys = function (v) { return Y0 - (v / ymax) * (Y0 - Y1); };
    var grid = $('ch-grid'); clear(grid);
    for (var i = 0; i <= 4; i++) { var v = ymax * i / 4; grid.appendChild(A('line', { x1: X0, x2: X1, y1: ys(v), y2: ys(v), style: 'stroke:var(--line);stroke-width:1' })); grid.appendChild(A('text', { x: X0 - 8, y: ys(v) + 4, 'text-anchor': 'end', class: 'muted mono' }, n(v, v % 1 ? 1 : 0))); }
    [0, 30, 60, 90].forEach(function (a) { grid.appendChild(A('line', { x1: xs(a), x2: xs(a), y1: Y0, y2: Y0 + 5, style: 'stroke:var(--muted);stroke-width:1' })); grid.appendChild(A('text', { x: xs(a), y: Y0 + 20, 'text-anchor': 'middle', class: 'muted mono' }, a + '°')); });
    var pts = []; for (var a = 0; a <= 90; a += 2) pts.push((a === 0 ? 'M' : 'L') + xs(a).toFixed(1) + ' ' + ys(top * Math.sin(a * RAD)).toFixed(1));
    $('ch-curve').setAttribute('d', pts.join(' '));
    setA($('ch-drop'), { x1: xs(phd), x2: xs(phd), y1: ys(b.M), y2: Y0 }); setA($('ch-dot'), { cx: xs(phd), cy: ys(b.M) });
    var cl = $('ch-lab'); cl.textContent = n(b.M, 1) + ' N m'; setA(cl, { x: xs(phd) + (phd > 60 ? -12 : 12), y: ys(b.M) - 12, 'text-anchor': phd > 60 ? 'end' : 'start' });

    $('bk1').textContent = 'W = m g = ' + n(m, 1) + ' × 9.81 = ' + n(b.W, 1) + ' N';
    $('bk2').textContent = 'x = L sin φ = 0.65 × sin ' + n(phd, 0) + '° = ' + n(b.x, 3) + ' m';
    $('bk3').textContent = 'moment = W x = ' + n(b.W, 1) + ' × ' + n(b.x, 3) + ' = ' + n(b.M, 1) + ' N m';
    $('bk4').textContent = 'F × ' + n(b.d, 3) + ' = ' + n(b.M, 1) + '  →  F = ' + n(b.F, 0) + ' N';
    $('bk5').textContent = 'F ÷ W = x ÷ d = ' + n(b.x * 100, 0) + ' ÷ ' + n(dcm, 1) + ' = ' + n(b.ratio, 1);
  }
  [gm, gph, gd].forEach(function (i) { i.addEventListener('input', renderBag); });
  Array.prototype.forEach.call(document.querySelectorAll('[data-ph]'), function (b) { b.addEventListener('click', function () { gph.value = b.getAttribute('data-ph'); renderBag(); }); });

  var svg = $('bagsvg'), dragging = false, grab = $('grab');
  function dragMove(ev) {
    if (!dragging) return;
    var pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY;
    var ctm = svg.getScreenCTM(); if (!ctm) return;
    var p = pt.matrixTransform(ctm.inverse());
    gph.value = clamp(Math.round(Math.atan2(p.x - SH.x, p.y - SH.y) / RAD), 0, 90); renderBag();
  }
  grab.addEventListener('pointerdown', function (ev) { dragging = true; try { grab.setPointerCapture(ev.pointerId); } catch (e) { /* ignore */ } ev.preventDefault(); });
  grab.addEventListener('pointermove', dragMove);
  grab.addEventListener('pointerup', function () { dragging = false; });
  grab.addEventListener('pointercancel', function () { dragging = false; });

  renderGolf(); renderBag();
  Sim.tabs(document.querySelector('.tabs'));
})();
