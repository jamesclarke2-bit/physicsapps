/* Projectile Motion Explorer: UI only. Physics from model.js, equation text from equations.js, questions from questions.js,
   generic widgets (tabs, pop-ups, formatting) from ../shared/sim.js.
   Phase 2 room: the scene draws from a list of projectiles (PROJ); Phase 1 keeps one. */
(function () {
  'use strict';
  var M = window.ProjectileModel, E = window.ProjectileEquations, Q = window.ProjectileQuestions;
  var el = Sim.el, A = Sim.svgel, f = E.fmt;
  var $ = function (id) { return document.getElementById(id); };
  var KEY = 'projectile-motion-v1';
  var UNIT = { s: 's', m: 'm', v: 'm s⁻¹', a: 'm s⁻²' };
  var UNITH = { s: 's', m: 'm', v: 'm s<sup>−1</sup>', a: 'm s<sup>−2</sup>' };
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- saved settings and progress (this device only) ---------- */
  var store = { params: null, vectors: { v: true, vx: true, vy: true, a: true }, strobe: true, colour: '#e6a100', speed: 1, working: true, theme: null, progress: {}, scenario: 1 };
  try { var saved = JSON.parse(localStorage.getItem(KEY) || 'null'); if (saved) for (var k in saved) store[k] = saved[k]; } catch (e) { /* private mode: settings last until the page closes */ }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) { /* ignore */ } }

  var P = M.norm(store.params || M.DEFAULT);          // the projectile (Phase 1: one)
  var PROJ = [P];
  var S = M.summary(P);
  var clock = { t: 0, playing: false, speed: store.speed || 1, stopAt: null, onStop: null, last: 0 };
  var locked = false;                                  // true while a prediction question waits for an answer
  var activeTab = 'setup';

  /* ---------- small helpers ---------- */
  function nice(lo, hi, n) {
    var span = hi - lo || 1, raw = span / (n || 6), mag = Math.pow(10, Math.floor(Math.log10(raw))), r = raw / mag;
    var step = (r < 1.5 ? 1 : r < 3.5 ? 2 : r < 7.5 ? 5 : 10) * mag, out = [];
    for (var v = Math.ceil(lo / step - 1e-9) * step; v <= hi + step * 1e-9; v += step) out.push(+v.toPrecision(12));
    return { ticks: out, step: step, dp: Math.max(0, -Math.floor(Math.log10(step) + 1e-9)) };
  }
  /* SVG text where "_x" makes a subscript x */
  function stxt(attrs, s) {
    var t = A('text', attrs), parts = String(s).split(/_(\w)/);
    parts.forEach(function (p, i) {
      if (!p) return;
      if (i % 2) { t.appendChild(A('tspan', { dy: 4, 'font-size': '75%' }, p)); t.appendChild(A('tspan', { dy: -4 }, '​')); }
      else t.appendChild(A('tspan', {}, p));
    });
    return t;
  }
  function q(v, unit, dp) { return f(v, dp) + ' ' + UNIT[unit]; }
  function qh(v, unit, dp) { return f(v, dp) + '&nbsp;' + UNITH[unit]; }

  /* ---------- vectors: colour + dash pattern + text label (never colour alone) ---------- */
  var VEC = {
    v: { id: 'v', cls: 'v-r', dash: '', label: 'v', name: 'Velocity (resultant)', tag: 'R', q: 'qr' },
    vx: { id: 'vx', cls: 'v-h', dash: '10 6', label: 'v_x', name: 'Horizontal component', tag: 'H', q: 'qh' },
    vy: { id: 'vy', cls: 'v-v', dash: '3 4', label: 'v_y', name: 'Vertical component', tag: 'V', q: 'qv', zero: 'v_y = 0' },
    a: { id: 'a', cls: 'v-a', dash: '12 4 3 4', label: 'a = g', name: 'Acceleration (g downward)', tag: 'A', q: 'qa', open: true }
  };
  function chip(q, tag, dash) {
    var svg = A('svg', { viewBox: '0 0 22 8', 'aria-hidden': 'true' }); svg.appendChild(A('line', { x1: 0, y1: 4, x2: 22, y2: 4, 'stroke-dasharray': dash || '' }));
    var s = el('span', { class: 'chipq ' + q, 'aria-hidden': 'true' }); s.appendChild(svg); s.appendChild(document.createTextNode(tag)); return s;
  }
  function arrow(g, x, y, dx, dy, st, sc, rising) {
    sc = sc || 1;
    var len = Math.sqrt(dx * dx + dy * dy), grp = A('g', { class: st.cls, 'data-vec': st.id });
    g.appendChild(grp);
    if (len < 3 * sc) { if (st.zero) grp.appendChild(stxt({ class: 'vl ' + st.cls, x: x - 14 * sc, y: y - 12 * sc, 'text-anchor': 'end' }, st.zero)); return; }
    var ux = dx / len, uy = dy / len, hl = Math.min(13 * sc, len * 0.6), hw = 6.5 * sc, ex = x + dx, ey = y + dy, bx = ex - ux * hl, by = ey - uy * hl;
    grp.appendChild(A('line', { class: 'vline', x1: x, y1: y, x2: bx, y2: by, 'stroke-dasharray': st.dash, 'stroke-width': 3.5 * sc }));
    grp.appendChild(A('polygon', { class: st.open ? 'vhead-open' : '', points: [ex, ey, bx - uy * hw, by + ux * hw, bx + uy * hw, by - ux * hw].map(function (v) { return v.toFixed(1); }).join(' ') }));
    var side = st.id === 'vy' || st.id === 'a', lx = ex + ux * 14 * sc + (side ? 12 * sc : 0), ly = ey + uy * 14 * sc + 5;
    // v_x and v labels go on opposite sides: rising (v above v_x) puts v_x's label below; falling puts it above
    if (st.id === 'vx') { lx = ex - 4 * sc; ly = ey + (rising ? 24 : -12) * sc; }
    if (st.id === 'v') { lx = ex + 12 * sc; ly = ey + (rising ? -10 : 22) * sc; }
    grp.appendChild(stxt({ class: 'vl ' + st.cls, x: lx, y: ly, 'text-anchor': st.id === 'vy' || st.id === 'a' ? 'start' : 'middle', 'font-size': sc < 1 ? '12px' : '' }, st.label));
  }

  /* ---------- scene geometry: equal scales on both axes ---------- */
  function makeView(W, H, m, fit) {
    var xmax = Math.max(S.R, 0), ymin = Math.min(0, P.h0), ymax = Math.max(S.H, P.h0, 0);
    var xs = Math.max(xmax, 4), ys = Math.max(ymax - ymin, 4), iw = W - m.l - m.r;
    if (fit) H = Math.round(Math.min(fit[1], Math.max(fit[0], m.t + m.b + ys * 1.08 * iw / (xs * 1.06))));   // trim empty sky for flat paths
    var ih = H - m.t - m.b;
    var k = Math.min(iw / (xs * 1.06), ih / (ys * 1.08)), x0 = -Math.max(xs * 0.03, 26 / k), y0 = ymin - ys * 0.04;   // keep the launch point off the y-axis
    return { W: W, H: H, m: m, k: k, x0: x0, y0: y0, x1: x0 + iw / k, y1: y0 + ih / k,
      X: function (x) { return m.l + (x - x0) * k; }, Y: function (y) { return H - m.b - (y - y0) * k; } };
  }
  function strobeDt() { return M.STEP_DT * Math.max(1, Math.ceil(S.T / (40 * M.STEP_DT))); }
  function drawStatic(svg, v, small) {
    svg.textContent = ''; svg.setAttribute('viewBox', '0 0 ' + v.W + ' ' + v.H);
    if (svg.id === 'stage') { svg.appendChild(A('title', { id: 'stage-t' }, 'Projectile trajectory')); svg.appendChild(A('desc', { id: 'stage-d' }, sceneDesc())); }
    var span = Math.max(v.x1 - v.x0, v.y1 - v.y0), tk = nice(0, span, small ? 5 : 8), st = tk.step, g = A('g');
    for (var x = Math.ceil(v.x0 / st) * st; x <= v.x1 + 1e-9; x += st) { g.appendChild(A('line', { class: 'grid', x1: v.X(x), x2: v.X(x), y1: v.m.t, y2: v.H - v.m.b })); }
    for (var y = Math.ceil(v.y0 / st) * st; y <= v.y1 + 1e-9; y += st) { g.appendChild(A('line', { class: 'grid', x1: v.m.l, x2: v.W - v.m.r, y1: v.Y(y), y2: v.Y(y) })); g.appendChild(A('text', { x: v.m.l - 6, y: v.Y(y) + 4, 'text-anchor': 'end' }, f(y, tk.dp))); }
    svg.appendChild(g);
    var gy = v.Y(0);
    svg.insertBefore(A('rect', { class: 'earth', x: 0, y: gy, width: v.W, height: Math.max(0, v.H - gy) }), g);   // the ground fills the strip under y = 0, so arrows can point into it
    if (P.h0 < 0) svg.appendChild(A('rect', { class: 'pit', x: v.X(0) - 9, y: gy, width: 18, height: Math.max(0, v.Y(P.h0) - gy + 4) }));
    svg.appendChild(A('line', { class: 'ground', x1: v.m.l, x2: v.W - v.m.r, y1: gy, y2: gy }));
    svg.appendChild(A('line', { class: 'ax', x1: v.m.l, x2: v.m.l, y1: v.m.t, y2: v.H - v.m.b }));
    svg.appendChild(A('line', { class: 'ax', x1: v.m.l, x2: v.W - v.m.r, y1: v.H - v.m.b, y2: v.H - v.m.b }));
    for (var xt = Math.ceil(v.x0 / st) * st; xt <= v.x1 + 1e-9; xt += st) svg.appendChild(A('text', { x: v.X(xt), y: v.H - v.m.b + 16, 'text-anchor': 'middle' }, f(xt, tk.dp)));
    svg.appendChild(A('text', { class: 'axl', x: v.W - v.m.r, y: v.H - v.m.b + 34, 'text-anchor': 'end' }, 'horizontal distance, x / m'));
    svg.appendChild(A('text', { class: 'axl', x: v.m.l, y: v.m.t - 8, 'text-anchor': 'start' }, 'height, y / m'));
    if (!small && v.H - v.m.b - gy > 20) svg.appendChild(A('text', { x: v.m.l + 30, y: gy + 16, 'text-anchor': 'start' }, 'ground, y = 0'));
    var d = '', N = 160;
    for (var i = 0; i <= N; i++) { var s = M.state(P, S.T * i / N); d += (i ? 'L' : 'M') + v.X(s.x).toFixed(1) + ' ' + v.Y(s.y).toFixed(1); }
    svg.appendChild(A('path', { class: 'path-full', d: d }));
    svg.appendChild(A('circle', { class: 'launch', cx: v.X(0), cy: v.Y(P.h0), r: 4 }));
    var dyn = A('g'); svg.appendChild(dyn); return dyn;
  }
  function drawDyn(g, v, t, sc) {
    g.textContent = ''; sc = sc || 1;
    var d = '', N = 120, s;
    for (var i = 0; i <= N; i++) { s = M.state(P, t * i / N); d += (i ? 'L' : 'M') + v.X(s.x).toFixed(1) + ' ' + v.Y(s.y).toFixed(1); }
    g.appendChild(A('path', { class: 'path-done', d: d }));
    if (store.strobe) { var ds = strobeDt(); for (var tt = 0; tt <= t + 1e-9; tt += ds) { s = M.state(P, tt); g.appendChild(A('circle', { class: 'strobe', cx: v.X(s.x), cy: v.Y(s.y), r: 3 * sc })); } }
    s = M.state(P, t);
    var bx = v.X(s.x), by = v.Y(s.y), kv = 66 * sc / Math.max(P.u, S.vLand, 1);
    var vecs = A('g');
    if (store.vectors.v) arrow(vecs, bx, by, s.vx * kv, -s.vy * kv, VEC.v, sc, s.vy >= 0);          // resultant first, so the dashed components stay visible on top
    if (store.vectors.vx) arrow(vecs, bx, by, s.vx * kv, 0, VEC.vx, sc, s.vy >= 0);
    if (store.vectors.vy) arrow(vecs, bx, by, 0, -s.vy * kv, VEC.vy, sc);
    if (store.vectors.a) arrow(vecs, bx - 22 * sc, by, 0, (26 + 2.4 * P.g) * sc, VEC.a, sc);
    g.appendChild(A('circle', { class: 'ballc', cx: bx, cy: by, r: 9 * sc, fill: 'var(--ball)' }));
    g.appendChild(vecs);
  }
  function sceneDesc() {
    return 'Launch at ' + q(P.u, 'v') + ', ' + f(P.thetaDeg, 0) + '° above the horizontal, from height ' + q(P.h0, 'm') + ', g = ' + q(P.g, 'a') +
      '. Flight time ' + q(S.T, 's') + ', range ' + q(S.R, 'm') + ', max height ' + q(S.H, 'm') + '.';
  }

  /* ---------- independent motion panels: one clock, one scale ---------- */
  var V1, dyn1, dyn2, dyn3, Vmain, dynMain;
  function drawPanes() {
    V1 = makeView(400, 270, { l: 40, r: 30, t: 28, b: 36 });
    dyn1 = drawStatic($('pane1'), V1, true);
    var p3 = $('pane3'); p3.textContent = ''; p3.setAttribute('viewBox', '0 0 96 270');
    p3.appendChild(A('line', { class: 'ax', x1: 30, x2: 30, y1: V1.m.t, y2: V1.H - V1.m.b }));
    p3.appendChild(A('rect', { class: 'earth', x: 0, y: V1.Y(0), width: 96, height: Math.max(0, V1.H - V1.m.b - V1.Y(0)) }));
    p3.appendChild(A('line', { class: 'ground', x1: 0, x2: 96, y1: V1.Y(0), y2: V1.Y(0) }));
    p3.appendChild(A('text', { class: 'axl', x: 4, y: 16 }, 'y only'));
    dyn3 = A('g'); p3.appendChild(dyn3);
    var p2 = $('pane2'); p2.textContent = ''; p2.setAttribute('viewBox', '0 0 400 84');
    p2.appendChild(A('line', { class: 'ax', x1: V1.m.l, x2: 400 - V1.m.r, y1: 46, y2: 46 }));
    var tk = nice(0, Math.max(V1.x1 - V1.x0, V1.y1 - V1.y0), 5);
    for (var x = Math.ceil(V1.x0 / tk.step) * tk.step; x <= V1.x1 + 1e-9; x += tk.step) { p2.appendChild(A('line', { class: 'grid', x1: V1.X(x), x2: V1.X(x), y1: 40, y2: 52 })); p2.appendChild(A('text', { x: V1.X(x), y: 68, 'text-anchor': 'middle' }, f(x, tk.dp))); }
    p2.appendChild(A('text', { class: 'axl', x: 400 - V1.m.r, y: 82, 'text-anchor': 'end' }, 'x / m'));
    dyn2 = A('g'); p2.appendChild(dyn2);
  }
  function updatePanes(t) {
    drawDyn(dyn1, V1, t, 0.62);
    var s = M.state(P, t), ds = strobeDt(), kv = 60 / Math.max(P.u, S.vLand, 1), tt, z;
    dyn2.textContent = ''; dyn3.textContent = '';
    if (store.strobe) for (tt = 0; tt <= t + 1e-9; tt += ds) { z = M.state(P, tt); dyn2.appendChild(A('circle', { class: 'strobe', cx: V1.X(z.x), cy: 46, r: 3 })); dyn3.appendChild(A('circle', { class: 'strobe', cx: 30, cy: V1.Y(z.y), r: 3 })); }
    arrow(dyn2, V1.X(s.x), 46, s.vx * kv, 0, VEC.vx, 0.7, true);
    dyn2.appendChild(A('circle', { class: 'ballc', cx: V1.X(s.x), cy: 46, r: 6, fill: 'var(--ball)' }));
    dyn2.appendChild(stxt({ class: 'vl v-a', x: 400 - V1.m.r, y: 18, 'text-anchor': 'end', 'font-size': '12px' }, 'a_x = 0 (no arrow)'));
    arrow(dyn3, 30, V1.Y(s.y), 0, -s.vy * kv, VEC.vy, 0.7);
    arrow(dyn3, 22, V1.Y(s.y), 0, (20 + 1.6 * P.g), VEC.a, 0.62);
    dyn3.appendChild(A('circle', { class: 'ballc', cx: 30, cy: V1.Y(s.y), r: 6, fill: 'var(--ball)' }));
    $('read2').innerHTML = '<span>x = <b data-q="x2">' + qh(s.x, 'm') + '</b></span><span>v<sub>x</sub> = <b data-q="vx2">' + qh(s.vx, 'v') + '</b></span><span>a<sub>x</sub> = <b data-q="ax2">' + qh(s.ax, 'a') + '</b></span>';
    $('read3').innerHTML = '<span>y = <b data-q="y3">' + qh(s.y, 'm') + '</b></span><span>v<sub>y</sub> = <b data-q="vy3">' + qh(s.vy, 'v') + '</b></span><span>a<sub>y</sub> = <b data-q="ay3">' + qh(s.ay, 'a') + '</b></span>';
  }

  /* ---------- readouts ---------- */
  var RO = [
    { id: 't', label: 'Time, t', q: 'qt', tag: 't', dash: '', get: function (s) { return s.t; }, u: 's' },
    { id: 'x', label: 'Horizontal displacement, x', q: 'qh', tag: 'H', dash: VEC.vx.dash, get: function (s) { return s.x; }, u: 'm' },
    { id: 'y', label: 'Height, y', q: 'qv', tag: 'V', dash: VEC.vy.dash, get: function (s) { return s.y; }, u: 'm' },
    { id: 'ux', label: 'Horizontal velocity, u<sub>x</sub>', q: 'qh', tag: 'H', dash: VEC.vx.dash, get: function (s) { return s.vx; }, u: 'v' },
    { id: 'vy', label: 'Vertical velocity, v<sub>y</sub>', q: 'qv', tag: 'V', dash: VEC.vy.dash, get: function (s) { return s.vy; }, u: 'v' },
    { id: 'v', label: 'Speed, |v|', q: 'qr', tag: 'R', dash: '', get: function (s) { return s.speed; }, u: 'v' },
    { id: 'a', label: 'Acceleration, a<sub>y</sub>', q: 'qa', tag: 'A', dash: VEC.a.dash, get: function (s) { return s.ay; }, u: 'a' }
  ];
  function buildReadouts() {
    var box = $('readouts'); box.textContent = '';
    RO.forEach(function (r) {
      var h = el('span', { class: 'rh' }, chip(r.q, r.tag, r.dash), el('span', { html: r.label }));
      box.appendChild(el('div', { class: 'ro ' + r.q, id: 'ro-' + r.id }, h, el('span', { class: 'val', id: 'rv-' + r.id, 'data-unit': UNIT[r.u] })));
    });
  }
  function updateReadouts(s) { RO.forEach(function (r) { $('rv-' + r.id).innerHTML = qh(r.get(s), r.u); }); }

  /* ---------- graphs ---------- */
  var GR = [
    { id: 'x', col: 'h', title: 'x against t', yl: 'x / m', fn: function (s) { return s.x; } },
    { id: 'vx', col: 'h', title: 'v_x against t', yl: 'v_x / m s⁻¹', fn: function (s) { return s.vx; } },
    { id: 'ax', col: 'h', title: 'a_x against t', yl: 'a_x / m s⁻²', fn: function (s) { return s.ax; }, acc: true },
    { id: 'y', col: 'v', title: 'y against t', yl: 'y / m', fn: function (s) { return s.y; } },
    { id: 'vy', col: 'v', title: 'v_y against t', yl: 'v_y / m s⁻¹', fn: function (s) { return s.vy; } },
    { id: 'ay', col: 'v', title: 'a_y against t', yl: 'a_y / m s⁻²', fn: function (s) { return s.ay; }, acc: true },
    { id: 'v', col: 'r', title: '|v| against t', yl: '|v| / m s⁻¹', fn: function (s) { return s.speed; } }
  ];
  function makeGraph(svg, g) {
    var W = 300, H = 190, m = { l: 50, r: 12, t: 12, b: 38 }, T = S.T > 0 ? S.T : 1, N = 160, vs = [], i;
    for (i = 0; i <= N; i++) vs.push(g.fn(M.state(P, T * i / N)));
    var lo, hi;
    if (g.acc) { lo = -1.25 * P.g; hi = 0.35 * P.g; }
    else { lo = Math.min(0, Math.min.apply(null, vs)); hi = Math.max(0, Math.max.apply(null, vs)); if (hi - lo < 1e-9) { hi += 1; lo -= 1; } var pad = (hi - lo) * 0.08; hi += pad; if (lo < 0) lo -= pad; }
    function X(t) { return m.l + t / T * (W - m.l - m.r); }
    function Y(v) { return H - m.b - (v - lo) / (hi - lo) * (H - m.t - m.b); }
    svg.textContent = ''; svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.setAttribute('class', 'gsvg'); svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', g.title.replace('_', '') + ' graph'); svg.appendChild(A('title', {}, g.title.replace('_', '')));
    var tx = nice(0, T, 5), ty = nice(lo, hi, 5);
    tx.ticks.forEach(function (v) { if (v > T + 1e-9) return; svg.appendChild(A('line', { class: 'grid', x1: X(v), x2: X(v), y1: m.t, y2: H - m.b })); svg.appendChild(A('text', { x: X(v), y: H - m.b + 14, 'text-anchor': 'middle' }, f(v, tx.dp))); });
    ty.ticks.forEach(function (v) { svg.appendChild(A('line', { class: 'grid', x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v) })); svg.appendChild(A('text', { x: m.l - 5, y: Y(v) + 4, 'text-anchor': 'end' }, f(v, ty.dp))); });
    svg.appendChild(A('line', { class: 'ax', x1: m.l, x2: m.l, y1: m.t, y2: H - m.b }));
    if (lo <= 0 && hi >= 0) svg.appendChild(A('line', { class: 'ax', x1: m.l, x2: W - m.r, y1: Y(0), y2: Y(0) }));
    svg.appendChild(A('text', { class: 'axl', x: (m.l + W - m.r) / 2, y: H - 4, 'text-anchor': 'middle' }, 't / s'));
    var yl = stxt({ class: 'axl', x: 12, y: (m.t + H - m.b) / 2, 'text-anchor': 'middle', transform: 'rotate(-90 12 ' + (m.t + H - m.b) / 2 + ')' }, g.yl); svg.appendChild(yl);
    var colour = 'var(--q-' + g.col + ')';
    var path = A('path', { class: 'gline', stroke: colour }), dot = A('circle', { r: 5, fill: colour, stroke: 'var(--surface)', 'stroke-width': 1.5 });
    svg.appendChild(path); svg.appendChild(dot);
    return { update: function (t) {
      var d = '', n = Math.max(1, Math.round(N * t / T));
      for (var j = 0; j <= n; j++) { var tt = t * j / n; d += (j ? 'L' : 'M') + X(tt).toFixed(1) + ' ' + Y(g.fn(M.state(P, tt))).toFixed(1); }
      path.setAttribute('d', d); var s = M.state(P, t); dot.setAttribute('cx', X(s.t)); dot.setAttribute('cy', Y(g.fn(s)));
    } };
  }
  var graphs = [];
  function buildGraphs() {
    var box = $('graphs'); box.textContent = ''; graphs = [];
    [['h', 'Horizontal motion', 'qh', 'H', VEC.vx.dash], ['v', 'Vertical motion', 'qv', 'V', VEC.vy.dash]].forEach(function (c) {
      var col = el('div', { class: 'gcol' }, el('h3', null, chip(c[2], c[3], c[4]), c[1]));
      GR.filter(function (g) { return g.col === c[0]; }).forEach(function (g) { var svg = A('svg'); col.appendChild(svg); graphs.push(makeGraph(svg, g)); });
      box.appendChild(col);
    });
    // computed values with pop-up working
    var R = E.results(P), kv = $('kvals'); kv.textContent = '';
    ['H', 'tMax', 'T', 'R'].forEach(function (k) {
      var r = R[k];
      kv.appendChild(el('div', { class: 'kv1' }, el('span', { text: r.name }),
        Sim.calcButton(q(r.value, r.unit), r.name, function () { return [el('p', { html: r.sym }), el('p', { class: 'eqline' }, el('span', { class: 'esub', html: r.sub })), r.note ? el('p', { class: 'fine', html: r.note }) : null, el('p', { class: 'fine', text: E.ASSUMPTION })].filter(Boolean); })));
    });
    var rows = [['Launch', 0]]; if (S.tMax > 0 && S.tMax < S.T) rows.push(['Max height', S.tMax]); rows.push([S.clearsPit ? 'Landing' : 'Back on the pit floor', S.T]);
    var tb = $('keytable'); tb.textContent = '';
    tb.appendChild(el('thead', null, el('tr', null, ['Point', 't (s)', 'x (m)', 'y (m)', 'v<sub>x</sub> (m s<sup>−1</sup>)', 'v<sub>y</sub> (m s<sup>−1</sup>)', '|v| (m s<sup>−1</sup>)'].map(function (h) { return el('th', { scope: 'col', html: h }); }))));
    tb.appendChild(el('tbody', null, rows.map(function (r) { var s = M.state(P, r[1]); return el('tr', null, el('td', { text: r[0] }), [s.t, s.x, s.y, s.vx, s.vy, s.speed].map(function (v) { return el('td', { class: 'num', text: f(v) }); })); })));
  }

  /* ---------- equations ---------- */
  function buildEquations() {
    var L = E.live(P, clock.t), box = $('eqs'); box.textContent = '';
    $('eq-assume').textContent = E.ASSUMPTION;
    [['horizontal', 'Horizontal motion', 'qh', 'H', VEC.vx.dash], ['vertical', 'Vertical motion', 'qv', 'V', VEC.vy.dash], ['resultant', 'Resultant velocity', 'qr', 'R', '']].forEach(function (sec) {
      var d = el('details', { class: 'eqsec ' + sec[2], open: true }, el('summary', null, chip(sec[2], sec[3], sec[4]), sec[1]));
      L[sec[0]].forEach(function (l) { d.appendChild(el('div', { class: 'eqline' }, el('span', { class: 'en', text: l.name }), el('span', { class: 'es', html: l.sym }), el('span', { class: 'esub', id: 'eq-' + l.id, html: l.sub }))); });
      box.appendChild(d);
    });
    var R = E.results(P), d = el('details', { class: 'eqsec qt', open: true }, el('summary', null, chip('qt', 't', ''), 'Whole flight'));
    ['tMax', 'H', 'T', 'R'].forEach(function (k) { var r = R[k]; d.appendChild(el('div', { class: 'eqline' }, el('span', { class: 'en', text: r.name }), el('span', { class: 'es', html: r.sym }), el('span', { class: 'esub', id: 'eq-res-' + k, html: r.sub }), r.note ? el('span', { class: 'fine', html: r.note }) : null)); });
    box.appendChild(d);
    box.classList.toggle('noworking', !store.working);
  }
  function updateEquations(t) {
    var L = E.live(P, t);
    ['horizontal', 'vertical', 'resultant'].forEach(function (k) { L[k].forEach(function (l) { var n = $('eq-' + l.id); if (n) n.innerHTML = l.sub; }); });
  }

  /* ---------- clock ---------- */
  function frame() {
    var s = M.state(P, clock.t);
    drawDyn(dynMain, Vmain, clock.t, 1);
    updateReadouts(s);
    if (activeTab === 'independent') updatePanes(clock.t);
    if (activeTab === 'graphs') graphs.forEach(function (g) { g.update(clock.t); });
    if (activeTab === 'equations') updateEquations(clock.t);
    if (activeTab === 'questions' && anim.graph) anim.graph.update(clock.t);
    // never disable a button the user may be focused on (focus would drop to the page); Play and Step lock only for a prediction
    $('b-play').disabled = locked; $('b-step').disabled = locked;
    $('b-play').setAttribute('aria-pressed', String(clock.playing)); $('b-pause').setAttribute('aria-pressed', String(!clock.playing && clock.t > 0 && clock.t < S.T));
  }
  function loop(ts) {
    if (!clock.playing) return;
    if (clock.last) clock.t += (ts - clock.last) / 1000 * clock.speed;
    clock.last = ts;
    var end = clock.stopAt !== null ? Math.min(clock.stopAt, S.T) : S.T;
    if (clock.t >= end) { clock.t = end; clock.playing = false; var cb = clock.onStop; clock.onStop = null; clock.stopAt = null; frame(); if (cb) cb(); return; }
    frame(); requestAnimationFrame(loop);
  }
  function play(stopAt, onStop) {
    if (locked && !onStop) return;
    if (clock.t >= S.T - 1e-9 && stopAt === undefined) clock.t = 0;
    clock.stopAt = stopAt === undefined ? null : stopAt; clock.onStop = onStop || null;
    if (clock.playing) return;
    clock.playing = true; clock.last = 0; requestAnimationFrame(loop); frame();
  }
  function pause() { clock.playing = false; clock.stopAt = null; clock.onStop = null; frame(); }
  function reset() { clock.playing = false; clock.stopAt = null; clock.onStop = null; clock.t = 0; frame(); }
  function stepFwd() { if (locked) return; clock.playing = false; clock.t = Math.min(S.T, clock.t + M.STEP_DT); frame(); }

  /* ---------- inputs ---------- */
  var IN = [
    { k: 'u', label: 'Launch speed, u (m s<sup>−1</sup>)', step: 0.5 },
    { k: 'thetaDeg', label: 'Launch angle, θ (°)', step: 1 },
    { k: 'h0', label: 'Launch height, h<sub>0</sub> (m)', step: 0.5 },
    { k: 'g', label: 'Gravitational field strength, g (m s<sup>−2</sup>)', step: 0.01 }
  ];
  function buildInputs() {
    var box = $('inputs'); box.textContent = '';
    IN.forEach(function (c) {
      var lim = M.LIMITS[c.k], id = 'c-' + c.k;
      var rng = el('input', { type: 'range', id: id, min: lim[0], max: lim[1], step: c.step, value: P[c.k], 'aria-describedby': id + '-n' });
      var num = el('input', { type: 'number', id: id + '-n', min: lim[0], max: lim[1], step: c.step, value: P[c.k], 'aria-label': c.label.replace(/<[^>]+>/g, '') + ', exact value' });
      rng.addEventListener('input', function () { setParam(c.k, +rng.value); });
      num.addEventListener('change', function () { var v = +num.value; if (!isFinite(v)) v = P[c.k]; setParam(c.k, Math.min(lim[1], Math.max(lim[0], v))); });
      box.appendChild(el('div', { class: 'ctl ctl2' }, el('label', { for: id, html: c.label }), rng, num));
    });
    var tg = $('toggles'); tg.textContent = '';
    ['v', 'vx', 'vy', 'a'].forEach(function (k) {
      var cb = el('input', { type: 'checkbox', checked: store.vectors[k] ? true : null });
      cb.addEventListener('change', function () { store.vectors[k] = cb.checked; save(); frame(); });
      tg.appendChild(el('label', null, cb, chip(VEC[k].q, VEC[k].tag, VEC[k].dash), el('span', { text: VEC[k].name + ' vector' })));
    });
    var sb = el('input', { type: 'checkbox', checked: store.strobe ? true : null });
    sb.addEventListener('change', function () { store.strobe = sb.checked; save(); frame(); });
    tg.appendChild(el('label', null, sb, el('span', { text: 'Positions at equal time intervals (dots)' })));
  }
  function syncInputs() {
    IN.forEach(function (c) { $('c-' + c.k).value = P[c.k]; $('c-' + c.k + '-n').value = +P[c.k].toFixed(2); $('c-' + c.k).disabled = locked; $('c-' + c.k + '-n').disabled = locked; });
    $('locknote').hidden = !locked;
  }
  function setParams(p) { P = M.norm(p); PROJ[0] = P; store.params = { u: P.u, thetaDeg: P.thetaDeg, h0: P.h0, g: P.g }; save(); recompute(); }
  function setParam(k, v) { if (locked) return; var p = { u: P.u, thetaDeg: P.thetaDeg, h0: P.h0, g: P.g }; p[k] = v; setParams(p); }
  function recompute() {
    S = M.summary(P); clock.playing = false; clock.t = 0; clock.stopAt = null; clock.onStop = null;
    Vmain = makeView(640, 420, { l: 50, r: 56, t: 62, b: 68 }, [320, 440]); dynMain = drawStatic($('stage'), Vmain, false);
    var pn = $('pitnote');
    if (S.pit) { pn.hidden = false; pn.textContent = 'Launch from a pit: the launch point is ' + q(-P.h0, 'm') + ' below the ground (pit walls ignored). ' + (S.clearsPit ? 'It gets out of the pit and lands on the ground, y = 0.' : 'It does not get out of the pit: the flight ends back on the pit floor.'); }
    else pn.hidden = true;
    drawPanes(); buildGraphs(); buildEquations(); syncInputs(); frame();
  }

  /* ---------- questions ---------- */
  var cur = null, qs = null, anim = {};
  function prog(id) { return store.progress[id] || (store.progress[id] = { status: 'new', attempts: 0, support: 0 }); }
  function statusText(id) { var p = store.progress[id]; return !p || p.status === 'new' ? '○ New' : p.status === 'correct' ? '✓ Correct' : '◐ Tried'; }
  var TYPE = { numerical: 'Numerical answer', mcq: 'Multiple choice', prediction: 'Prediction' };
  function renderScenarios() {
    var box = $('scen'); box.textContent = '';
    Q.SCENARIOS.forEach(function (sc) {
      box.appendChild(el('button', { class: 'expopt', type: 'button', role: 'radio', 'aria-checked': String(store.scenario === sc.id), onclick: function () { store.scenario = sc.id; save(); renderScenarios(); var first = Q.QUESTIONS.filter(function (x) { return x.scenario === sc.id; })[0]; loadQuestion(first); } },
        el('strong', { text: 'Scenario ' + sc.id + ': ' + sc.name }), el('span', { text: sc.intro })));
    });
    renderList();
  }
  function renderList() {
    var ul = $('qlist'); ul.textContent = '';
    Q.QUESTIONS.filter(function (x) { return x.scenario === store.scenario; }).forEach(function (x, i) {
      ul.appendChild(el('li', null, el('button', { type: 'button', 'aria-current': String(!!cur && cur.id === x.id), 'data-qid': x.id, onclick: function () { loadQuestion(x); } },
        el('span', null, el('strong', { text: 'Q' + x.scenario + '.' + (i + 1) + ' ' }), el('span', { html: x.prompt.length > 90 ? x.prompt.slice(0, 88) + '…' : x.prompt })),
        el('span', { class: 'qstat', text: statusText(x.id) }),
        el('span', { class: 'qm', text: x.difficulty + ' · ' + TYPE[x.type] }))));
    });
  }
  function setupText(s) { return 'u = ' + f(s.u) + ' m s⁻¹, θ = ' + f(s.theta_deg, 0) + '°, h₀ = ' + f(s.h0) + ' m, g = ' + f(s.g) + ' m s⁻²'; }
  function loadQuestion(x) {
    stopAnim();
    cur = x; qs = { attempts: 0, scaffold: 0, level: 0, predicted: false, done: false };
    locked = x.type === 'prediction';
    setParams(Q.params(x.setup));
    renderList(); renderQ();
  }
  function fill(t) { return Q.fill(t, cur.setup); }
  function renderQ() {
    var x = cur, box = $('qcard'); box.textContent = '';
    if (!x) { box.appendChild(el('p', { class: 'empty', text: 'Choose a question above.' })); return; }
    var n = Q.QUESTIONS.filter(function (z) { return z.scenario === x.scenario; }).indexOf(x) + 1;
    var sc = Q.SCENARIOS.filter(function (s) { return s.id === x.scenario; })[0];
    box.appendChild(el('h3', { text: 'Question ' + x.scenario + '.' + n }));
    box.appendChild(el('p', { class: 'qmeta', text: 'Scenario ' + sc.id + ': ' + sc.name + ' · ' + x.difficulty + ' · ' + TYPE[x.type] }));
    box.appendChild(el('p', { class: 'setupline' }, el('span', { id: 'q-setup', text: 'Set-up loaded: ' + setupText(x.setup) }),
      el('button', { class: 'btn', type: 'button', text: 'Reload set-up', disabled: locked ? true : null, onclick: function () { stopAnim(); setParams(Q.params(x.setup)); } })));
    if (x.type === 'prediction') box.appendChild(el('div', { class: 'think' }, el('b', { text: 'Think' }), el('span', { text: qs.predicted ? 'Now run it and compare with your prediction.' : 'Predict first. The simulation stays paused until you lock in your answer.' })));
    box.appendChild(el('p', { class: 'qprompt', id: 'q-prompt', html: x.prompt }));
    var form = el('form', { id: 'q-form', novalidate: true });
    if (x.type === 'numerical') {
      form.appendChild(el('div', { class: 'ansrow' }, el('label', { for: 'q-ans', text: 'Your answer' }),
        el('input', { id: 'q-ans', type: 'text', inputmode: 'decimal', autocomplete: 'off', 'aria-describedby': 'q-unit' }), el('span', { id: 'q-unit', text: x.unit }),
        el('button', { class: 'btn primary', type: 'submit', text: 'Check' })));
    } else {
      var fs = el('fieldset', { class: 'opts' }, el('legend', { class: 'fine', text: x.type === 'prediction' ? 'Your prediction' : 'Choose one' }));
      x.options.forEach(function (o, i) { fs.appendChild(el('label', null, el('input', { type: 'radio', name: 'q-opt', value: i, disabled: qs.predicted ? true : null }), el('span', { html: o.text }))); });
      form.appendChild(fs);
      form.appendChild(el('div', { class: 'ansrow' }, el('button', { class: 'btn primary', type: 'submit', text: x.type === 'prediction' ? 'Lock in prediction' : 'Check', disabled: qs.predicted ? true : null })));
    }
    form.addEventListener('submit', function (e) { e.preventDefault(); check(); });
    box.appendChild(form);
    box.appendChild(el('div', { id: 'q-fb', 'aria-live': 'polite' }));
    box.appendChild(el('div', { id: 'q-predict' }));
    var sup = el('div', { class: 'support', role: 'group', 'aria-label': 'Support' });
    [['Hint', 1], ['Structured guidance', 2], ['Worked solution', 3], ['Animated solution', 4]].forEach(function (b) {
      sup.appendChild(el('button', { class: 'btn', type: 'button', text: b[1] + '. ' + b[0], 'data-level': b[1], disabled: locked ? true : null, onclick: function () { support(b[1]); } }));
    });
    box.appendChild(el('h4', { class: 'stephead', text: 'Need help? Four levels of support' }));
    box.appendChild(sup);
    box.appendChild(el('div', { id: 'q-support' }));
    box.appendChild(el('div', { id: 'q-ms' }));
  }
  function check() {
    var x = cur, p = prog(x.id), fb = $('q-fb'), resp;
    if (x.type === 'numerical') resp = $('q-ans').value;
    else { var r = document.querySelector('input[name=q-opt]:checked'); if (!r) { fb.innerHTML = '<p class="fb">Choose an option first.</p>'; return; } resp = r.value; }
    var res = Q.mark(x, resp);
    if (res.empty) { fb.innerHTML = '<div class="fb"><p>Type a number (in ' + x.unit + ').</p></div>'; return; }
    qs.attempts++; p.attempts++;
    if (res.correct) p.status = 'correct'; else if (p.status !== 'correct') p.status = 'tried';
    save(); renderList();
    var out = el('div', { class: 'fb' });
    if (res.correct) {
      out.appendChild(el('p', null, el('span', { class: 'ok', role: 'img', 'aria-label': 'correct', text: '✓ ' }), el('strong', { text: 'Correct. ' }),
        x.type === 'numerical' ? el('span', { text: 'The model answer is ' + f(res.answer) + ' ' + x.unit + '; yours is within ' + Math.round(x.tolerance * 100) + '%.' }) : null));
      showMarkScheme();
    } else {
      out.appendChild(el('p', null, el('span', { class: 'no', role: 'img', 'aria-label': 'not correct', text: '✗ ' }), el('strong', { text: x.type === 'prediction' ? 'Not what the physics predicts. ' : 'Not yet. ' }),
        res.option && res.option.why ? el('span', { html: res.option.why }) : null, x.type === 'numerical' ? el('span', { text: ruleHint(res) }) : null));
      if (x.type !== 'prediction') {
        qs.scaffold = Math.min(qs.scaffold + 1, x.scaffold.length);
        out.appendChild(el('p', { text: 'Try this, one step at a time:' }));
        out.appendChild(el('ol', { class: 'scaf' }, x.scaffold.slice(0, qs.scaffold).map(function (s) { return el('li', { html: fill(s) }); })));
        if (qs.attempts > x.scaffold.length) out.appendChild(el('p', { class: 'fine', text: 'That is all the prompts. Use the support levels below if you are still stuck.' }));
      }
    }
    fb.textContent = ''; fb.appendChild(out);
    if (x.type === 'prediction') afterPrediction();
  }
  /* rule-based extra feedback for numbers (does not reveal the answer) */
  function ruleHint(res) {
    var r = res.value / res.answer;
    if (Math.abs(r + 1) < 0.02) return ' Check the sign.';
    if ([10, 100, 0.1, 0.01].some(function (k) { return Math.abs(r / k - 1) < 0.02; })) return ' You are out by a power of ten. Check your units.';
    var g10 = Q.values(Object.assign({}, cur.setup, { g: 10 }))[{ flightTime: 'T', maxHeight: 'H', timeToMax: 'tMax', range: 'R', landingSpeed: 'vLand' }[cur.answer]];
    if (Math.abs(res.value / g10 - 1) < 0.005) return ' Close: did you use g = 10? This question uses g = ' + f(cur.setup.g) + ' m s⁻².';
    return '';
  }
  function afterPrediction() {
    var x = cur; qs.predicted = true; locked = false; syncInputs(); frame();
    [].forEach.call(document.querySelectorAll('#q-form input, #q-form button, #qcard .support button, #qcard .setupline button'), function (b) { if (b.closest('.support') || b.closest('.setupline')) b.disabled = false; else b.disabled = true; });
    var box = $('q-predict'); box.textContent = '';
    var R0 = Q.values(x.setup), s1 = Object.assign({}, x.setup, x.predict.change), R1 = Q.values(s1), k = x.predict.compare, U = k === 'H' ? 'm' : 's';
    var names = { H: 'Max height', T: 'Flight time' };
    var run = el('button', { class: 'btn primary', type: 'button', text: x.predict.label, onclick: function () {
      setParams(Q.params(s1)); play(undefined, function () {
        box.appendChild(el('p', { class: 'fb', id: 'q-compare', text: names[k] + ': ' + f(R0[k]) + ' ' + U + ' with u = ' + f(x.setup.u) + ' m s⁻¹, ' + f(R1[k]) + ' ' + U + ' with u = ' + f(s1.u) + ' m s⁻¹ (× ' + f(R1[k] / R0[k]) + ').' }));
        showMarkScheme();
      });
    } });
    box.appendChild(el('div', { class: 'ansrow' }, run, el('span', { class: 'fine', text: 'Compare the result with your prediction.' })));
  }
  function showMarkScheme() {
    var ms = $('q-ms'); if (!ms || ms.childNodes.length) return;
    ms.appendChild(el('details', { class: 'supbox' }, el('summary', { text: 'Mark scheme' }), el('ul', null, cur.markScheme.map(function (m) { return el('li', { html: fill(m) }); }))));
  }
  function support(level) {
    var x = cur, p = prog(x.id), box = $('q-support'); stopAnim();
    p.support = Math.max(p.support || 0, level); save();
    box.textContent = '';
    var names = ['', 'Hint', 'Structured guidance', 'Worked solution', 'Animated solution'], b = el('div', { class: 'supbox', id: 'q-sup-' + level }, el('h4', { text: level + '. ' + names[level] }));
    if (level === 1) b.appendChild(el('p', { html: fill(x.hints[0]) }));
    if (level === 2) b.appendChild(el('ol', null, x.hints[1].map(function (h) { return el('li', { html: fill(h) }); })));
    if (level === 3) { b.appendChild(el('ol', null, x.hints[2].map(function (h) { return el('li', { html: fill(h) }); }))); showMarkScheme(); }
    if (level === 4) animated(b, x.hints[3]);
    box.appendChild(b);
  }

  /* ---------- animated solution: motion, equation, graph and answer, linked by one clock ---------- */
  function stopAnim() { if (anim.active) { anim.active = false; anim.graph = null; pause(); } }
  function animated(box, spec) {
    var x = cur; setParams(Q.params(x.setup));
    var times = { launch: 0, top: S.tMax, land: S.T }, evs = spec.events.slice(), i = 0;
    var showG = GR.filter(function (g) { return g.id === spec.show; })[0] || GR[3];
    var a = el('div', { class: 'anim' }), stepP = el('p', { class: 'astep', 'aria-live': 'polite' }), eq = el('span', { class: 'esub' }), svg = A('svg'), next = el('button', { class: 'btn primary', type: 'button', text: 'Start' });
    a.appendChild(stepP); a.appendChild(eq); a.appendChild(svg); a.appendChild(el('div', { class: 'ansrow' }, next)); box.appendChild(a);
    anim = { active: true, graph: makeGraph(svg, showG) };
    var R = E.results(P);
    function lineFor(t) {
      var L = E.live(P, t), all = L.horizontal.concat(L.vertical, L.resultant), id = spec.show === 'v' ? 'v' : spec.show;
      var l = all.filter(function (z) { return z.id === id; })[0]; return l ? l.sub : '';
    }
    var TXT = {
      launch: function () { var L = E.live(P, 0); return 'Launch (t = 0 s). Split the launch velocity into components: ' + L.horizontal[0].sub + ' and ' + L.vertical[0].sub + '.'; },
      top: function () { return 'Top of the flight (t = ' + q(S.tMax, 's') + '). The vertical velocity is zero here, but the acceleration is still g = ' + q(P.g, 'a') + ' downward.'; },
      land: function () { return (S.clearsPit ? 'Landing, y = 0' : 'Back on the pit floor') + ' (t = ' + q(S.T, 's') + '). The horizontal velocity is still ' + q(S.ux, 'v') + '.'; }
    };
    function show(ev) { stepP.innerHTML = TXT[ev](); eq.innerHTML = lineFor(times[ev]); anim.graph.update(clock.t); }
    function finish() {
      if (spec.answer) { var r = R[spec.answer]; stepP.innerHTML = '<strong>Answer.</strong> ' + r.name + ': ' + r.sym; eq.innerHTML = r.sub; }
      else { stepP.innerHTML = '<strong>Answer.</strong> ' + fill(x.hints[2][x.hints[2].length - 1]); }
      next.textContent = 'Replay'; next.onclick = function () { i = 0; clock.t = 0; frame(); next.textContent = 'Start'; next.onclick = go; stepP.textContent = 'Press Start.'; eq.textContent = ''; };
      showMarkScheme();
    }
    function go() {
      if (!anim.active) return;
      if (i >= evs.length) { finish(); return; }
      var ev = evs[i++], target = times[ev];
      next.textContent = i >= evs.length ? 'Show the answer' : 'Continue';
      if (reduce || target <= clock.t + 1e-9) { clock.playing = false; clock.t = target; frame(); show(ev); return; }
      next.disabled = true; stepP.textContent = 'Watch the motion…';
      play(target, function () { next.disabled = false; show(ev); });
    }
    next.onclick = go; stepP.textContent = 'The solution plays the motion and stops at each key moment. Press Start.';
    frame();
  }

  /* ---------- theme ---------- */
  function isDark() { var t = document.documentElement.getAttribute('data-theme'); return t ? t === 'dark' : !!(window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches); }
  function applyTheme() { if (store.theme) document.documentElement.setAttribute('data-theme', store.theme); var d = isDark(); $('b-theme').setAttribute('aria-pressed', String(d)); }

  /* ---------- wiring ---------- */
  $('b-play').addEventListener('click', function () { play(); });
  $('b-pause').addEventListener('click', pause);
  $('b-reset').addEventListener('click', function () { stopAnim(); reset(); });
  $('b-step').addEventListener('click', stepFwd);
  $('b-replay').addEventListener('click', function () { if (locked) return; clock.t = 0; play(); });
  $('stepdt').textContent = f(M.STEP_DT) + ' s';
  (function speedSeg() {
    var box = $('seg-speed');
    function draw() { box.textContent = ''; [[0.25, 'Slow motion (0.25×)'], [1, 'Normal (1×)'], [3, 'Fast forward (3×)']].forEach(function (o) { box.appendChild(el('button', { type: 'button', text: o[1], 'aria-pressed': String(clock.speed === o[0]), onclick: function () { clock.speed = o[0]; store.speed = o[0]; save(); draw(); } })); }); }
    draw();
  })();
  $('b-working').removeAttribute('aria-pressed');
  function syncWorking() { $('b-working').textContent = store.working ? 'Hide working' : 'Show working'; $('eqs').classList.toggle('noworking', !store.working); }
  $('b-working').addEventListener('click', function () { store.working = !store.working; save(); syncWorking(); });
  $('c-colour').value = store.colour; document.documentElement.style.setProperty('--ball', store.colour);
  $('c-colour').addEventListener('input', function (e) { store.colour = e.target.value; document.documentElement.style.setProperty('--ball', store.colour); save(); });
  $('b-theme').addEventListener('click', function () { store.theme = isDark() ? 'light' : 'dark'; save(); applyTheme(); });
  $('b-progress-reset').addEventListener('click', function () { store.progress = {}; save(); renderList(); });
  document.addEventListener('keydown', function (e) {
    var t = e.target, tag = (t.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === ' ' && tag !== 'button' && tag !== 'summary') { e.preventDefault(); if (clock.playing) pause(); else play(); }
    else if (e.key === 's' || e.key === 'S') stepFwd();
    else if (e.key === 'r' || e.key === 'R') { stopAnim(); reset(); }
  });

  $('pt2').insertBefore(chip('qh', 'H', VEC.vx.dash), $('pt2').firstChild); $('pt3').insertBefore(chip('qv', 'V', VEC.vy.dash), $('pt3').firstChild);
  applyTheme(); buildReadouts(); buildInputs(); recompute(); syncWorking();
  renderScenarios(); renderQ();
  Sim.tabs(document.querySelector('.tabs'), { onChange: function (name) { activeTab = name; document.body.classList.toggle('qmode', name === 'questions'); if (name !== 'questions') stopAnim(); if (dynMain) frame(); } });
  window.PM = { clock: clock, state: function () { return { P: P, S: S, locked: locked }; }, setT: function (t) { clock.playing = false; clock.t = Math.min(S.T, t); frame(); } };   // for the acceptance tests
})();
