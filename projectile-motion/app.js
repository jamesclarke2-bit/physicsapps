/* Projectile Motion Explorer: UI only. Physics from model.js, equation text from equations.js, questions and marking from
   questions.js, generic widgets (tabs, pop-ups, formatting) from ../shared/sim.js.
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
  var narrowMQ = window.matchMedia ? matchMedia('(max-width: 700px)') : { matches: false };

  /* ---------- saved settings and progress (this device only) ---------- */
  var store = { params: null, vectors: { v: true, vx: true, vy: true, a: true }, strobe: true, colour: '#3a4550', speed: 1, working: true, theme: null, present: false, indMode: 'full', progress: {}, scenario: 1 };
  try { var saved = JSON.parse(localStorage.getItem(KEY) || 'null'); if (saved) for (var k in saved) store[k] = saved[k]; } catch (e) { /* private mode: settings last until the page closes */ }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) { /* ignore */ } }

  var P = M.norm(store.params || M.DEFAULT);          // the projectile (Phase 1: one)
  var PROJ = [P];
  var S = M.summary(P);
  var clock = { t: 0, playing: false, speed: store.speed || 1, stopAt: null, onStop: null, last: 0 };
  var locked = false;                                  // true while a prediction question waits for an answer
  var activeTab = 'setup';
  var hl = null;                                       // vector highlighted by tapping its readout
  var focus = null;                                    // {vec:[...], ro:[...]} while an animated solution step is showing

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
      if (i % 2) { t.appendChild(A('tspan', { dy: 3, 'font-size': '78%' }, p)); t.appendChild(A('tspan', { dy: -3 }, '​')); }
      else t.appendChild(A('tspan', {}, p));
    });
    return t;
  }
  function q(v, unit, dp) { return f(v, dp) + ' ' + UNIT[unit]; }
  function qh(v, unit, dp) { return f(v, dp) + '&nbsp;' + UNITH[unit]; }

  /* ---------- vectors: colour + line pattern + one text label (never colour alone) ---------- */
  var VEC = {
    v: { id: 'v', cls: 'v-r', dash: '', label: 'v', name: 'Velocity (resultant)', q: 'qr' },
    vx: { id: 'vx', cls: 'v-h', dash: '6 4', label: 'v_x', name: 'Horizontal component', q: 'qh' },
    vy: { id: 'vy', cls: 'v-v', dash: '1.5 3.5', label: 'v_y', name: 'Vertical component', q: 'qv' },
    a: { id: 'a', cls: 'v-a', dash: '7 3 1.5 3', label: 'a', name: 'Acceleration (g downward)', q: 'qa' }
  };
  function lineSample(st) {
    var s = A('svg', { class: 'lsample ' + st.cls, viewBox: '0 0 26 8', 'aria-hidden': 'true' });
    s.appendChild(A('line', { x1: 1, y1: 4, x2: 25, y2: 4, 'stroke-dasharray': st.dash })); return s;
  }
  function dot(q) { return el('span', { class: 'dot ' + q, 'aria-hidden': 'true' }); }

  /* Draw velocity components head to tail (v_x from the ball, v_y from the tip of v_x, v as the diagonal) and the
     acceleration to one side on its own scale. Nonzero arrows have a minimum visible length; zero ones are not drawn.
     Labels sit beside each shaft, avoiding the ball, the other shafts and each other; a label that will not fit is left out. */
  function drawVectors(g, bx, by, s, o) {
    var sc = o.sc || 1, MIN = 9 * sc, LABELMIN = 22 * sc, show = o.show, kv = o.kv, chain = o.chain !== false, list = [];
    function comp(v) { if (Math.abs(v) < 1e-3) return 0; var p = v * kv; return (p < 0 ? -1 : 1) * Math.max(Math.abs(p), MIN); }
    var cx = comp(s.vx), cy = -comp(s.vy);
    if (show.v && (cx || cy) && chain) list.push({ st: VEC.v, x1: bx, y1: by, x2: bx + cx, y2: by + cy });
    if (show.vx && cx) list.push({ st: VEC.vx, x1: bx, y1: by, x2: bx + cx, y2: by });
    if (show.vy && cy) { var ox = chain ? bx + cx : bx; list.push({ st: VEC.vy, x1: ox, y1: by, x2: ox, y2: by + cy }); }
    if (show.a) { var ax = bx - (o.aside || 20) * sc, al = Math.max(MIN, o.aLen); list.push({ st: VEC.a, x1: ax, y1: by + 4 * sc, x2: ax, y2: by + 4 * sc + al }); }
    var groups = list.map(function (a) {
      var dx = a.x2 - a.x1, dy = a.y2 - a.y1, len = Math.sqrt(dx * dx + dy * dy), ux = dx / len, uy = dy / len, hl2 = 7 * sc, hw = 3.4 * sc;
      var bxh = a.x2 - ux * hl2, byh = a.y2 - uy * hl2, cls = 'vec ' + a.st.cls;
      if (o.focus) cls += o.focus.indexOf(a.st.id) >= 0 ? ' hl' : ' dim';
      else if (o.hl) cls += o.hl === a.st.id ? ' hl' : ' dim';
      var grp = A('g', { class: cls, 'data-vec': a.st.id });
      grp.appendChild(A('line', { x1: a.x1, y1: a.y1, x2: bxh, y2: byh, 'stroke-dasharray': a.st.dash }));
      grp.appendChild(A('polygon', { points: [a.x2, a.y2, bxh - uy * hw, byh + ux * hw, bxh + uy * hw, byh - ux * hw].map(function (v) { return v.toFixed(1); }).join(' ') }));
      g.appendChild(grp); a.len = len; a.ux = ux; a.uy = uy; a.g = grp; return a;
    });
    // label placement with collision avoidance
    var boxes = [], R = (o.ballR || 7) + 3;
    function hitsShaft(b) {
      return groups.some(function (a) { for (var i = 0; i <= 10; i++) { var px = a.x1 + (a.x2 - a.x1) * i / 10, py = a.y1 + (a.y2 - a.y1) * i / 10; if (px > b.x - 2 && px < b.x + b.w + 2 && py > b.y - 2 && py < b.y + b.h + 2) return true; } return false; });
    }
    function free(b) {
      if (o.bounds && (b.x < o.bounds[0] || b.y < o.bounds[1] || b.x + b.w > o.bounds[2] || b.y + b.h > o.bounds[3])) return false;
      var nx = Math.max(b.x, Math.min(bx, b.x + b.w)), ny = Math.max(b.y, Math.min(by, b.y + b.h));
      if ((nx - bx) * (nx - bx) + (ny - by) * (ny - by) < R * R) return false;
      if (boxes.some(function (c) { return b.x < c.x + c.w && c.x < b.x + b.w && b.y < c.y + c.h && c.y < b.y + b.h; })) return false;
      return !hitsShaft(b);
    }
    ['vx', 'vy', 'v', 'a'].forEach(function (id) {
      var a = groups.filter(function (z) { return z.st.id === id; })[0]; if (!a || a.len < LABELMIN) return;
      var chars = a.st.label.replace('_', '').length, w = (chars * 7 + 2) * sc, h = 13 * sc, nx = -a.uy, ny = a.ux;
      var off = 5 * sc + (Math.abs(nx) * w + Math.abs(ny) * h) / 2, cands = [];
      [0.5, 0.3, 0.7].forEach(function (fr) { [1, -1].forEach(function (sd) { cands.push([a.x1 + (a.x2 - a.x1) * fr + nx * off * sd, a.y1 + (a.y2 - a.y1) * fr + ny * off * sd]); }); });
      var offT = 5 * sc + (Math.abs(a.ux) * w + Math.abs(a.uy) * h) / 2; cands.push([a.x2 + a.ux * offT, a.y2 + a.uy * offT]);
      for (var i = 0; i < cands.length; i++) {
        var b = { x: cands[i][0] - w / 2, y: cands[i][1] - h / 2, w: w, h: h };
        if (free(b)) { boxes.push(b); a.g.appendChild(stxt({ x: cands[i][0], y: cands[i][1] + 4.3 * sc, 'text-anchor': 'middle', 'font-size': (12 * sc).toFixed(1) + 'px' }, a.st.label)); return; }
      }
    });
  }

  /* ---------- scene geometry: equal scales on both axes ---------- */
  function makeView(W, H, m, fit, extra) {
    extra = extra || 0;                                   // px of ground band under y = 0, so downward arrows clear the axis labels
    var xmax = Math.max(S.R, 0), ymin = Math.min(0, P.h0), ymax = Math.max(S.H, P.h0, 0);
    var xs = Math.max(xmax, 4), ys = Math.max(ymax - ymin, 4), iw = W - m.l - m.r;
    if (fit) H = Math.round(Math.min(fit[1], Math.max(fit[0], m.t + m.b + extra + ys * 1.08 * iw / (xs * 1.06))));   // trim empty sky for flat paths
    var ih = H - m.t - m.b;
    var k = Math.min(iw / (xs * 1.06), (ih - extra) / (ys * 1.08)), x0 = -Math.max(xs * 0.03, 26 / k), y0 = ymin - ys * 0.04 - extra / k;   // keep the launch point off the y-axis
    return { W: W, H: H, m: m, k: k, x0: x0, y0: y0, x1: x0 + iw / k, y1: y0 + ih / k,
      X: function (x) { return m.l + (x - x0) * k; }, Y: function (y) { return H - m.b - (y - y0) * k; } };
  }
  function strobeDt() { return M.STEP_DT * Math.max(1, Math.ceil(S.T / (40 * M.STEP_DT))); }
  /* Grid, ground, axes (labels in brackets, as in the tables) and the full path. Returns the group for moving parts. */
  function drawScene(c, v, small) {
    var span = Math.max(v.x1 - v.x0, v.y1 - v.y0), tk = nice(0, span, small ? 5 : 8), st = tk.step, g = A('g'), gy = v.Y(0);
    c.appendChild(A('rect', { class: 'earth', x: v.m.l, y: gy, width: v.W - v.m.l - v.m.r, height: Math.max(0, v.H - v.m.b - gy) }));
    for (var x = Math.ceil(v.x0 / st) * st; x <= v.x1 + 1e-9; x += st) g.appendChild(A('line', { class: 'grid', x1: v.X(x), x2: v.X(x), y1: v.m.t, y2: v.H - v.m.b }));
    var ylo = Math.min(0, P.h0) - 1e-9;                  // no gridlines or numbers in the ground band below the lowest real height
    for (var y = Math.ceil(v.y0 / st) * st; y <= v.y1 + 1e-9; y += st) { if (y < ylo) continue; g.appendChild(A('line', { class: 'grid', x1: v.m.l, x2: v.W - v.m.r, y1: v.Y(y), y2: v.Y(y) })); g.appendChild(A('text', { x: v.m.l - 7, y: v.Y(y) + 4, 'text-anchor': 'end' }, f(y, tk.dp))); }
    c.appendChild(g);
    if (P.h0 < 0) c.appendChild(A('rect', { class: 'pit', x: v.X(0) - 8, y: gy, width: 16, height: Math.max(0, v.Y(P.h0) - gy + 4) }));
    c.appendChild(A('line', { class: 'ground', x1: v.m.l, x2: v.W - v.m.r, y1: gy, y2: gy }));
    c.appendChild(A('line', { class: 'ax', x1: v.m.l, x2: v.m.l, y1: v.m.t, y2: v.H - v.m.b }));
    c.appendChild(A('line', { class: 'ax', x1: v.m.l, x2: v.W - v.m.r, y1: v.H - v.m.b, y2: v.H - v.m.b }));
    for (var xt = Math.ceil(v.x0 / st) * st; xt <= v.x1 + 1e-9; xt += st) c.appendChild(A('text', { x: v.X(xt), y: v.H - v.m.b + 16, 'text-anchor': 'middle' }, f(xt, tk.dp)));
    c.appendChild(A('text', { class: 'axl', x: v.W - v.m.r, y: v.H - v.m.b + 33, 'text-anchor': 'end' }, small ? 'x (m)' : 'horizontal distance, x (m)'));
    c.appendChild(A('text', { class: 'axl', x: v.m.l, y: v.m.t - 10, 'text-anchor': 'start' }, 'height, y (m)'));
    var d = '', N = 160;
    for (var i = 0; i <= N; i++) { var s = M.state(P, S.T * i / N); d += (i ? 'L' : 'M') + v.X(s.x).toFixed(1) + ' ' + v.Y(s.y).toFixed(1); }
    c.appendChild(A('path', { class: 'path-full', d: d }));
    c.appendChild(A('circle', { class: 'launch', cx: v.X(0), cy: v.Y(P.h0), r: 3 }));
    var dyn = A('g'); c.appendChild(dyn); return dyn;
  }
  function drawDyn(g, v, t, sc, extra) {
    g.textContent = ''; sc = sc || 1;
    var d = '', N = 120, s;
    for (var i = 0; i <= N; i++) { s = M.state(P, t * i / N); d += (i ? 'L' : 'M') + v.X(s.x).toFixed(1) + ' ' + v.Y(s.y).toFixed(1); }
    g.appendChild(A('path', { class: 'path-done', d: d }));
    if (store.strobe) { var ds = strobeDt(); for (var tt = 0; tt <= t + 1e-9; tt += ds) { s = M.state(P, tt); g.appendChild(A('circle', { class: 'strobe', cx: v.X(s.x), cy: v.Y(s.y), r: 2 * sc })); } }
    s = M.state(P, t);
    var bx = v.X(s.x), by = v.Y(s.y);
    drawVectors(g, bx, by, s, Object.assign({ sc: sc, kv: 90 * sc / Math.max(P.u, S.vLand, 1), aLen: (14 + 2.6 * P.g) * sc, show: store.vectors, ballR: 7 * sc, bounds: [v.m.l + 2, 0, v.W, v.H - v.m.b] }, extra || {}));
    g.appendChild(A('circle', { class: 'ballc', cx: bx, cy: by, r: 7 * sc, fill: 'var(--ball)' }));
    return { bx: bx, by: by, s: s };
  }
  function sceneDesc() {
    return 'Launch at ' + q(P.u, 'v') + ', ' + f(P.thetaDeg, 0) + '° above the horizontal, from height ' + q(P.h0, 'm') + ', g = ' + q(P.g, 'a') +
      '. Flight time ' + q(S.T, 's') + ', range ' + q(S.R, 'm') + ', max height ' + q(S.H, 'm') + '. Velocity arrows are drawn head to tail.';
  }

  /* ---------- independent motion explorer: one clock, shared scales, one SVG so guide lines can join the views ---------- */
  var IND = null;
  function drawIndep() {
    var svg = $('indep'), narrow = narrowMQ.matches, mode = narrow ? store.indMode : 'all';
    var V = makeView(460, 300, { l: 44, r: 14, t: 26, b: 36 });
    var g = { V: V, mode: mode, main: mode === 'all' || mode === 'full', h: mode === 'all' || mode === 'h', v: mode === 'all' || mode === 'v' };
    var W = mode === 'all' ? 560 : mode === 'v' ? 170 : 460, H = mode === 'all' ? 384 : mode === 'h' ? 120 : 300;
    g.sx = mode === 'all' ? 516 : 100; g.sy = mode === 'all' ? 342 : 56;           // centres of the vertical and horizontal strips
    svg.textContent = ''; svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    if (mode === 'v') svg.style.maxWidth = '260px'; else svg.style.maxWidth = '';
    if (g.main) g.dMain = drawScene(svg, V, true);
    if (g.v) {
      svg.appendChild(A('rect', { class: 'stripbg', x: g.sx - 40, y: V.m.t, width: 80, height: V.H - V.m.t - V.m.b, rx: 4 }));
      svg.appendChild(A('line', { class: 'ax', x1: g.sx, x2: g.sx, y1: V.m.t, y2: V.H - V.m.b }));
      svg.appendChild(A('line', { class: 'ground', x1: g.sx - 34, x2: g.sx + 34, y1: V.Y(0), y2: V.Y(0) }));
      svg.appendChild(A('text', { x: g.sx, y: V.m.t - 10, 'text-anchor': 'middle' }, 'vertical only'));
      if (mode === 'v') {
        var tk = nice(0, Math.max(V.x1 - V.x0, V.y1 - V.y0), 5);
        for (var y = Math.ceil(V.y0 / tk.step) * tk.step; y <= V.y1 + 1e-9; y += tk.step) svg.appendChild(A('text', { x: g.sx - 46, y: V.Y(y) + 4, 'text-anchor': 'end' }, f(y, tk.dp)));
        svg.appendChild(A('text', { class: 'axl', x: 4, y: V.H - 8 }, 'height, y (m)'));
      }
    }
    if (g.h) {
      var top = mode === 'all' ? 314 : 26, ht = mode === 'all' ? 56 : 60;
      svg.appendChild(A('rect', { class: 'stripbg', x: V.m.l, y: top, width: V.W - V.m.l - V.m.r, height: ht, rx: 4 }));
      svg.appendChild(A('line', { class: 'ax', x1: V.m.l, x2: V.W - V.m.r, y1: g.sy, y2: g.sy }));
      svg.appendChild(A('text', { x: V.m.l + 6, y: top + 13 }, 'horizontal only'));
      if (mode === 'h') {
        var tk2 = nice(0, Math.max(V.x1 - V.x0, V.y1 - V.y0), 5);
        for (var x = Math.ceil(V.x0 / tk2.step) * tk2.step; x <= V.x1 + 1e-9; x += tk2.step) svg.appendChild(A('text', { x: V.X(x), y: top + ht + 16, 'text-anchor': 'middle' }, f(x, tk2.dp)));
        svg.appendChild(A('text', { class: 'axl', x: V.W - V.m.r, y: H - 4, 'text-anchor': 'end' }, 'horizontal distance, x (m)'));
      }
    }
    g.dyn = A('g'); svg.appendChild(g.dyn);
    $('cap-h').hidden = !(g.h || mode === 'full'); $('cap-v').hidden = !(g.v || mode === 'full');
    var seg = $('ind-seg'); seg.textContent = '';
    [['full', 'Full motion'], ['h', 'Horizontal'], ['v', 'Vertical']].forEach(function (o) {
      seg.appendChild(el('button', { type: 'button', role: 'radio', 'aria-checked': String(store.indMode === o[0]), text: o[1], onclick: function () { store.indMode = o[0]; save(); drawIndep(); updateIndep(clock.t); } }));
    });
    IND = g;
  }
  function updateIndep(t) {
    var g = IND, V = g.V, s = M.state(P, t), ds = strobeDt(), kv = 60 / Math.max(P.u, S.vLand, 1), tt, z, X = V.X(s.x), Y = V.Y(s.y);
    g.dyn.textContent = '';
    if (g.main) drawDyn(g.dMain, V, t, 0.8);
    if (g.mode === 'all') {
      g.dyn.appendChild(A('line', { class: 'guide', x1: X + 7, y1: Y, x2: g.sx - 8, y2: Y }));
      g.dyn.appendChild(A('line', { class: 'guide', x1: X, y1: Y + 7, x2: X, y2: g.sy - 8 }));
    }
    if (g.h) {
      if (store.strobe) for (tt = 0; tt <= t + 1e-9; tt += ds) { z = M.state(P, tt); g.dyn.appendChild(A('circle', { class: 'strobe', cx: V.X(z.x), cy: g.sy, r: 2 })); }
      drawVectors(g.dyn, X, g.sy, s, { sc: 0.8, kv: kv, show: { vx: true }, chain: false, ballR: 6 });
      g.dyn.appendChild(A('circle', { class: 'ballc', cx: X, cy: g.sy, r: 6, fill: 'var(--ball)' }));
    }
    if (g.v) {
      if (store.strobe) for (tt = 0; tt <= t + 1e-9; tt += ds) { z = M.state(P, tt); g.dyn.appendChild(A('circle', { class: 'strobe', cx: g.sx, cy: V.Y(z.y), r: 2 })); }
      drawVectors(g.dyn, g.sx, Y, s, { sc: 0.8, kv: kv, show: { vy: true, a: true }, chain: false, aLen: 12 + 2 * P.g, aside: 22, ballR: 6 });
      g.dyn.appendChild(A('circle', { class: 'ballc', cx: g.sx, cy: Y, r: 6, fill: 'var(--ball)' }));
    }
    $('cap-h').innerHTML = '<strong><span class="dot qh"></span>Horizontal only</strong><span>constant velocity, no acceleration</span><span class="vals"><span>x = <b data-q="x2">' + qh(s.x, 'm') + '</b></span> · <span>v<sub>x</sub> = <b data-q="vx2">' + qh(s.vx, 'v') + '</b></span> · <span>a<sub>x</sub> = <b data-q="ax2">' + qh(s.ax, 'a') + '</b></span></span>';
    $('cap-v').innerHTML = '<strong><span class="dot qv"></span>Vertical only</strong><span>changing velocity, constant acceleration</span><span class="vals"><span>y = <b data-q="y3">' + qh(s.y, 'm') + '</b></span> · <span>v<sub>y</sub> = <b data-q="vy3">' + qh(s.vy, 'v') + '</b></span> · <span>a<sub>y</sub> = <b data-q="ay3">' + qh(s.ay, 'a') + '</b></span></span>';
  }

  /* ---------- readouts: one slim strip; tapping a velocity or acceleration highlights its arrow ---------- */
  var RO = [
    { id: 't', sym: 't', name: 'Time', q: 'qt', get: function (s) { return s.t; }, u: 's' },
    { id: 'x', sym: 'x', name: 'Horizontal displacement', q: 'qh', get: function (s) { return s.x; }, u: 'm' },
    { id: 'y', sym: 'y', name: 'Height', q: 'qv', get: function (s) { return s.y; }, u: 'm' },
    { id: 'ux', sym: 'u<sub>x</sub>', name: 'Horizontal velocity', q: 'qh', vec: 'vx', get: function (s) { return s.vx; }, u: 'v' },
    { id: 'vy', sym: 'v<sub>y</sub>', name: 'Vertical velocity', q: 'qv', vec: 'vy', get: function (s) { return s.vy; }, u: 'v' },
    { id: 'v', sym: '|v|', name: 'Speed', q: 'qr', vec: 'v', get: function (s) { return s.speed; }, u: 'v' },
    { id: 'a', sym: 'a<sub>y</sub>', name: 'Acceleration', q: 'qa', vec: 'a', get: function (s) { return s.ay; }, u: 'a' }
  ];
  function buildReadouts() {
    var box = $('readouts'); box.textContent = '';
    RO.forEach(function (r) {
      var kids = [el('span', { class: 'sym' }, dot(r.q), el('span', { html: r.sym }), el('span', { class: 'vh', text: ' ' + r.name.toLowerCase(), style: 'position:absolute;left:-9999px' })), el('span', { class: 'val', id: 'rv-' + r.id })];
      var node = r.vec
        ? el('button', { type: 'button', class: 'ro ' + r.q, id: 'ro-' + r.id, 'aria-pressed': 'false', title: r.name + ': tap to highlight its arrow', onclick: function () { hl = hl === r.vec ? null : r.vec; syncHl(); frame(); } }, kids)
        : el('div', { class: 'ro ' + r.q, id: 'ro-' + r.id, title: r.name }, kids);
      box.appendChild(node);
    });
  }
  function syncHl() { RO.forEach(function (r) { if (r.vec) $('ro-' + r.id).setAttribute('aria-pressed', String(hl === r.vec)); }); }
  function updateReadouts(s) {
    RO.forEach(function (r) { $('rv-' + r.id).innerHTML = qh(r.get(s), r.u); $('ro-' + r.id).classList.toggle('off', !!focus && focus.ro.indexOf(r.id) < 0); });
  }

  /* ---------- graphs ---------- */
  var GR = [
    { id: 'x', col: 'h', title: 'x against t', yl: 'x (m)', fn: function (s) { return s.x; } },
    { id: 'vx', col: 'h', title: 'v_x against t', yl: 'v_x (m s⁻¹)', fn: function (s) { return s.vx; } },
    { id: 'ax', col: 'h', title: 'a_x against t', yl: 'a_x (m s⁻²)', fn: function (s) { return s.ax; }, acc: true },
    { id: 'y', col: 'v', title: 'y against t', yl: 'y (m)', fn: function (s) { return s.y; } },
    { id: 'vy', col: 'v', title: 'v_y against t', yl: 'v_y (m s⁻¹)', fn: function (s) { return s.vy; } },
    { id: 'ay', col: 'v', title: 'a_y against t', yl: 'a_y (m s⁻²)', fn: function (s) { return s.ay; }, acc: true },
    { id: 'v', col: 'r', title: '|v| against t', yl: '|v| (m s⁻¹)', fn: function (s) { return s.speed; } }
  ];
  function makeGraph(svg, g) {
    var W = 300, H = 180, m = { l: 48, r: 10, t: 10, b: 36 }, T = S.T > 0 ? S.T : 1, N = 160, vs = [], i;
    for (i = 0; i <= N; i++) vs.push(g.fn(M.state(P, T * i / N)));
    var lo, hi;
    if (g.acc) { lo = -1.25 * P.g; hi = 0.35 * P.g; }
    else { lo = Math.min(0, Math.min.apply(null, vs)); hi = Math.max(0, Math.max.apply(null, vs)); if (hi - lo < 1e-9) { hi += 1; lo -= 1; } var pad = (hi - lo) * 0.08; hi += pad; if (lo < 0) lo -= pad; }
    function X(t) { return m.l + t / T * (W - m.l - m.r); }
    function Y(v) { return H - m.b - (v - lo) / (hi - lo) * (H - m.t - m.b); }
    svg.textContent = ''; svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.setAttribute('class', 'gsvg'); svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', g.title.replace('_', '') + ' graph'); svg.appendChild(A('title', {}, g.title.replace('_', '')));
    var tx = nice(0, T, 5), ty = nice(lo, hi, 5);
    tx.ticks.forEach(function (v) { if (v > T + 1e-9) return; svg.appendChild(A('line', { class: 'grid', x1: X(v), x2: X(v), y1: m.t, y2: H - m.b })); svg.appendChild(A('text', { x: X(v), y: H - m.b + 13, 'text-anchor': 'middle' }, f(v, tx.dp))); });
    ty.ticks.forEach(function (v) { svg.appendChild(A('line', { class: 'grid', x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v) })); svg.appendChild(A('text', { x: m.l - 5, y: Y(v) + 3.5, 'text-anchor': 'end' }, f(v, ty.dp))); });
    svg.appendChild(A('line', { class: 'ax', x1: m.l, x2: m.l, y1: m.t, y2: H - m.b }));
    if (lo <= 0 && hi >= 0) svg.appendChild(A('line', { class: 'ax', x1: m.l, x2: W - m.r, y1: Y(0), y2: Y(0) }));
    svg.appendChild(A('text', { class: 'axl', x: (m.l + W - m.r) / 2, y: H - 4, 'text-anchor': 'middle' }, 't (s)'));
    svg.appendChild(stxt({ class: 'axl', x: 11, y: (m.t + H - m.b) / 2, 'text-anchor': 'middle', transform: 'rotate(-90 11 ' + (m.t + H - m.b) / 2 + ')' }, g.yl));
    var colour = 'var(--q-' + g.col + ')';
    var path = A('path', { class: 'gline', stroke: colour }), pt = A('circle', { r: 4, fill: colour, stroke: 'var(--surface)', 'stroke-width': 1.5 });
    svg.appendChild(path); svg.appendChild(pt);
    return { svg: svg, update: function (t) {
      var d = '', n = Math.max(1, Math.round(N * t / T));
      for (var j = 0; j <= n; j++) { var tt = t * j / n; d += (j ? 'L' : 'M') + X(tt).toFixed(1) + ' ' + Y(g.fn(M.state(P, tt))).toFixed(1); }
      path.setAttribute('d', d); var s = M.state(P, t); pt.setAttribute('cx', X(s.t)); pt.setAttribute('cy', Y(g.fn(s)));
    } };
  }
  var graphs = [];
  function buildGraphs() {
    var box = $('graphs'); box.textContent = ''; graphs = [];
    [['h', 'Horizontal motion', 'qh'], ['v', 'Vertical motion', 'qv']].forEach(function (c) {
      var col = el('div', { class: 'gcol' }, el('h3', null, dot(c[2]), c[1]));
      GR.filter(function (g) { return g.col === c[0]; }).forEach(function (g) { var svg = A('svg'); col.appendChild(svg); graphs.push(makeGraph(svg, g)); });
      box.appendChild(col);
    });
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
    [['horizontal', 'Horizontal motion', 'qh'], ['vertical', 'Vertical motion', 'qv'], ['resultant', 'Resultant velocity', 'qr']].forEach(function (sec) {
      var d = el('details', { class: 'eqsec ' + sec[2], open: true }, el('summary', null, dot(sec[2]), sec[1]));
      L[sec[0]].forEach(function (l) { d.appendChild(el('div', { class: 'eqline' }, el('span', { class: 'en', text: l.name }), el('span', { class: 'es', html: l.sym }), el('span', { class: 'esub', id: 'eq-' + l.id, html: l.sub }))); });
      box.appendChild(d);
    });
    var R = E.results(P), d = el('details', { class: 'eqsec qt', open: true }, el('summary', null, dot('qt'), 'Whole flight'));
    ['tMax', 'H', 'T', 'R'].forEach(function (k) { var r = R[k]; d.appendChild(el('div', { class: 'eqline' }, el('span', { class: 'en', text: r.name }), el('span', { class: 'es', html: r.sym }), el('span', { class: 'esub', id: 'eq-res-' + k, html: r.sub }), r.note ? el('span', { class: 'fine', html: r.note }) : null)); });
    box.appendChild(d);
    box.classList.toggle('noworking', !store.working);
  }
  function updateEquations(t) {
    var L = E.live(P, t);
    ['horizontal', 'vertical', 'resultant'].forEach(function (k) { L[k].forEach(function (l) { var n = $('eq-' + l.id); if (n) n.innerHTML = l.sub; }); });
  }

  /* ---------- clock ---------- */
  var Vmain, dynMain;
  function frame() {
    var s = M.state(P, clock.t);
    drawDyn(dynMain, Vmain, clock.t, 1, { hl: hl, focus: focus ? focus.vec : null });
    updateReadouts(s);
    if (activeTab === 'independent') updateIndep(clock.t);
    if (activeTab === 'graphs') graphs.forEach(function (g) { g.update(clock.t); });
    if (activeTab === 'equations') updateEquations(clock.t);
    if (activeTab === 'questions' && anim.update) anim.update(clock.t);
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
      box.appendChild(el('div', { class: 'ctl2' }, el('label', { for: id, html: c.label }), rng, num));
    });
    var tg = $('toggles'); tg.textContent = '';
    ['v', 'vx', 'vy', 'a'].forEach(function (k) {
      var cb = el('input', { type: 'checkbox', checked: store.vectors[k] ? true : null });
      cb.addEventListener('change', function () { store.vectors[k] = cb.checked; save(); frame(); });
      tg.appendChild(el('label', null, cb, lineSample(VEC[k]), el('span', { text: VEC[k].name })));
    });
    var sb = el('input', { type: 'checkbox', checked: store.strobe ? true : null });
    sb.addEventListener('change', function () { store.strobe = sb.checked; save(); frame(); });
    tg.appendChild(el('label', null, sb, el('span', { text: 'Positions at equal time intervals' })));
  }
  function syncInputs() {
    IN.forEach(function (c) { $('c-' + c.k).value = P[c.k]; $('c-' + c.k + '-n').value = +P[c.k].toFixed(2); $('c-' + c.k).disabled = locked; $('c-' + c.k + '-n').disabled = locked; });
    $('locknote').hidden = !locked;
  }
  function setParams(p) { P = M.norm(p); PROJ[0] = P; store.params = { u: P.u, thetaDeg: P.thetaDeg, h0: P.h0, g: P.g }; save(); recompute(); }
  function setParam(k, v) { if (locked) return; var p = { u: P.u, thetaDeg: P.thetaDeg, h0: P.h0, g: P.g }; p[k] = v; setParams(p); }
  function recompute() {
    S = M.summary(P); clock.playing = false; clock.t = 0; clock.stopAt = null; clock.onStop = null;
    var kv = 90 / Math.max(P.u, S.vLand, 1), down = Math.max(Math.abs(M.state(P, S.T).vy) * kv, 18 + 2.6 * P.g);
    Vmain = makeView(640, 440, { l: 46, r: 40, t: 44, b: 46 }, [300, 440], Math.min(100, down * 0.8));
    var svg = $('stage'); svg.textContent = ''; svg.setAttribute('viewBox', '0 0 ' + Vmain.W + ' ' + Vmain.H);
    svg.appendChild(A('title', { id: 'stage-t' }, 'Projectile trajectory')); svg.appendChild(A('desc', { id: 'stage-d' }, sceneDesc()));
    dynMain = drawScene(svg, Vmain, false);
    var pn = $('pitnote');
    if (S.pit) { pn.hidden = false; pn.textContent = 'Launch from a pit: the launch point is ' + q(-P.h0, 'm') + ' below the ground (pit walls ignored). ' + (S.clearsPit ? 'It gets out of the pit and lands on the ground, y = 0.' : 'It does not get out of the pit: the flight ends back on the pit floor.'); }
    else pn.hidden = true;
    drawIndep(); buildGraphs(); buildEquations(); syncInputs(); frame();
  }

  /* ---------- questions ---------- */
  var cur = null, qs = null, anim = {};
  function prog(id) { return store.progress[id] || (store.progress[id] = { status: 'new', attempts: 0, support: 0 }); }
  function statusWord(id) { var p = store.progress[id]; return !p || p.status === 'new' ? 'New' : p.status === 'correct' ? 'Correct' : 'Tried'; }
  var TYPE = { numerical: 'Numerical answer', mcq: 'Multiple choice', prediction: 'Prediction' };
  function scenarioQs(id) { return Q.QUESTIONS.filter(function (x) { return x.scenario === id; }); }
  function renderScenarios() {
    var box = $('scen'); box.textContent = '';
    Q.SCENARIOS.forEach(function (sc) {
      box.appendChild(el('button', { type: 'button', role: 'radio', 'aria-checked': String(store.scenario === sc.id), text: 'Scenario ' + sc.id + ' · ' + sc.name,
        onclick: function () { store.scenario = sc.id; save(); renderScenarios(); loadQuestion(scenarioQs(sc.id)[0]); } }));
    });
    $('scen-intro').textContent = Q.SCENARIOS.filter(function (s) { return s.id === store.scenario; })[0].intro;
    renderList();
  }
  /* numbered stepper: one button per question, status as a mark and in its name */
  function renderList() {
    var ol = $('qsteps'); ol.textContent = '';
    scenarioQs(store.scenario).forEach(function (x, i) {
      var st = statusWord(x.id), on = !!cur && cur.id === x.id;
      ol.appendChild(el('li', null, el('button', { type: 'button', 'data-qid': x.id, 'aria-current': on ? 'step' : null, title: x.difficulty + ' · ' + TYPE[x.type],
        'aria-label': 'Question ' + x.scenario + '.' + (i + 1) + ', ' + x.difficulty + ', ' + TYPE[x.type] + ', ' + st, onclick: function () { loadQuestion(x); } },
        String(i + 1), st === 'New' ? null : el('span', { class: 'mk', 'aria-hidden': 'true', text: st === 'Correct' ? '✓' : '·' }))));
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
    if (!x) return;
    var n = scenarioQs(x.scenario).indexOf(x) + 1;
    box.appendChild(el('p', { class: 'qmeta', text: 'Question ' + x.scenario + '.' + n + ' of ' + scenarioQs(x.scenario).length + ' · ' + x.difficulty + ' · ' + TYPE[x.type] }));
    if (x.type === 'prediction') box.appendChild(el('div', { class: 'think' }, el('b', { text: 'THINK' }), ' ', el('span', { text: qs.predicted ? 'Now run it and compare with your prediction.' : 'Predict first. The simulation stays paused until you lock in your answer.' })));
    box.appendChild(el('p', { class: 'qprompt', id: 'q-prompt', html: x.prompt }));
    box.appendChild(el('p', { class: 'setupline' }, el('span', { id: 'q-setup', text: 'Set-up loaded: ' + setupText(x.setup) }),
      el('button', { class: 'btn link', type: 'button', text: 'Reload set-up', disabled: locked ? true : null, onclick: function () { stopAnim(); setParams(Q.params(x.setup)); } })));
    var form = el('form', { id: 'q-form', novalidate: true });
    if (x.type === 'numerical') {
      form.appendChild(el('div', { class: 'ansrow' }, el('label', { for: 'q-ans', class: 'fine', text: 'Your answer' }),
        el('input', { id: 'q-ans', type: 'text', inputmode: 'decimal', autocomplete: 'off', 'aria-describedby': 'q-unit' }), el('span', { id: 'q-unit', text: x.unit }),
        el('button', { class: 'btn go', type: 'submit', text: 'Check' })));
    } else {
      var fs = el('fieldset', { class: 'opts' }, el('legend', { class: 'fine', text: x.type === 'prediction' ? 'Your prediction' : 'Choose one' }));
      x.options.forEach(function (o, i) { fs.appendChild(el('label', null, el('input', { type: 'radio', name: 'q-opt', value: i, disabled: qs.predicted ? true : null }), el('span', { html: o.text }))); });
      form.appendChild(fs);
      form.appendChild(el('div', { class: 'ansrow' }, el('button', { class: 'btn go', type: 'submit', text: x.type === 'prediction' ? 'Lock in prediction' : 'Check', disabled: qs.predicted ? true : null })));
    }
    form.addEventListener('submit', function (e) { e.preventDefault(); check(); });
    box.appendChild(form);
    box.appendChild(el('div', { id: 'q-fb', 'aria-live': 'polite' }));
    box.appendChild(el('div', { id: 'q-predict' }));
    box.appendChild(el('p', { class: 'suphead', text: 'Stuck? Four levels of support' }));
    var sup = el('div', { class: 'support', role: 'group', 'aria-label': 'Support' });
    [['Hint', 1], ['Guidance', 2], ['Worked solution', 3], ['Animated', 4]].forEach(function (b) {
      sup.appendChild(el('button', { type: 'button', 'data-level': b[1], 'aria-expanded': 'false', 'aria-controls': 'q-support', disabled: locked ? true : null, onclick: function () { support(b[1]); } }, el('b', { text: String(b[1]) }), el('span', { text: b[0] })));
    });
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
    var run = el('button', { class: 'btn go', type: 'button', text: x.predict.label, onclick: function () {
      setParams(Q.params(s1)); play(undefined, function () {
        box.appendChild(el('p', { class: 'fb', id: 'q-compare', text: names[k] + ': ' + f(R0[k]) + ' ' + U + ' with u = ' + f(x.setup.u) + ' m s⁻¹, ' + f(R1[k]) + ' ' + U + ' with u = ' + f(s1.u) + ' m s⁻¹ (× ' + f(R1[k] / R0[k]) + ').' }));
        showMarkScheme();
      });
    } });
    box.appendChild(el('div', { class: 'ansrow' }, run, el('span', { class: 'fine', text: 'Compare the result with your prediction.' })));
  }
  function showMarkScheme() {
    var ms = $('q-ms'); if (!ms || ms.childNodes.length) return;
    ms.appendChild(el('details', { class: 'ms' }, el('summary', { text: 'Mark scheme' }), el('ul', null, cur.markScheme.map(function (m) { return el('li', { html: fill(m) }); }))));
  }
  /* support levels open in place under the row; pressing the open one again closes it */
  function support(level) {
    var x = cur, p = prog(x.id), box = $('q-support'), btn = document.querySelector('[data-level="' + level + '"]'), wasOpen = btn.getAttribute('aria-expanded') === 'true';
    stopAnim(); box.textContent = '';
    [].forEach.call(document.querySelectorAll('#qcard .support button'), function (b) { b.setAttribute('aria-expanded', 'false'); });
    if (wasOpen) return;
    btn.setAttribute('aria-expanded', 'true');
    p.support = Math.max(p.support || 0, level); save();
    var b = el('div', { class: 'supbox', id: 'q-sup-' + level });
    if (level === 1) b.appendChild(el('p', { html: fill(x.hints[0]) }));
    if (level === 2) b.appendChild(el('ol', null, x.hints[1].map(function (h) { return el('li', { html: fill(h) }); })));
    if (level === 3) { b.appendChild(el('ol', null, x.hints[2].map(function (h) { return el('li', { html: fill(h) }); }))); showMarkScheme(); }
    box.appendChild(b);
    if (level === 4) animated(b, x.hints[3]);
  }

  /* ---------- animated solution: one step at a time; the equation in use is highlighted, everything else dimmed ---------- */
  function setFocus(st) { focus = st ? { vec: st.vec, ro: st.ro } : null; document.body.classList.toggle('focusing', !!st); }
  function stopAnim() { if (anim.active) { anim.active = false; clearTimeout(anim.timer); anim.update = null; setFocus(null); pause(); } }
  function animated(box, spec) {
    var x = cur; setParams(Q.params(x.setup));
    var R = E.results(P), has = function (e) { return spec.events.indexOf(e) >= 0; };
    var SHOW = { x: ['x', 'x', null], y: ['y', 'y', null], vx: ['vx', 'ux', 'vx'], vy: ['vy', 'vy', 'vy'], ay: ['ay', 'a', 'a'], v: ['v', 'v', 'v'] }[spec.show] || ['y', 'y', null];
    var steps = [{ t: 0, cap: 'Launch, t = 0 s. Split the launch velocity into its components.', eqs: ['ux', 'uy'], vec: ['vx', 'vy', 'v'], ro: ['t', 'ux', 'vy'] }];
    if (has('top') && S.tMax > 0) steps.push({ t: S.tMax, cap: 'Top of the flight, t = ' + q(S.tMax, 's') + '. The vertical velocity is zero here, but the acceleration is still g = ' + q(P.g, 'a') + ' downward.', eqs: ['vy', 'ay'], vec: ['a'], ro: ['t', 'vy', 'a'] });
    if (has('land')) steps.push({ t: S.T, cap: (S.clearsPit ? 'Landing, y = 0' : 'Back on the pit floor') + ', t = ' + q(S.T, 's') + '. The horizontal velocity is still ' + q(S.ux, 'v') + '.', eqs: ['y', 'x'], vec: ['vx', 'vy', 'v'], ro: ['t', 'x', 'y'] });
    var last = steps[steps.length - 1];
    if (last.eqs.indexOf(SHOW[0]) < 0) last.eqs.push(SHOW[0]);
    if (last.ro.indexOf(SHOW[1]) < 0) last.ro.push(SHOW[1]);
    last.graph = true;
    steps.push(spec.answer
      ? { t: last.t, cap: '<strong>Answer.</strong> ' + R[spec.answer].name + ': ' + R[spec.answer].sym, eqs: ['res-' + spec.answer], vec: SHOW[2] ? [SHOW[2]] : [], ro: ['t', SHOW[1]], graph: true }
      : { t: last.t, cap: '<strong>Answer.</strong> ' + fill(x.hints[2][x.hints[2].length - 1]), eqs: [SHOW[0]], vec: SHOW[2] ? [SHOW[2]] : [], ro: ['t', SHOW[1]], graph: true });
    var N = steps.length, idx = 0, busy = false, auto = false;
    // the equations this solution uses, in a fixed order
    var order = ['ux', 'uy', 'x', 'y', 'vx', 'vy', 'ay', 'v'], used = order.filter(function (id) { return steps.some(function (s) { return s.eqs.indexOf(id) >= 0; }); });
    if (spec.answer) used.push('res-' + spec.answer);
    function liveLine(id, t) { var L = E.live(P, t); return L.horizontal.concat(L.vertical, L.resultant).filter(function (z) { return z.id === id; })[0]; }
    var rows = used.map(function (id) {
      var l = id.indexOf('res-') === 0 ? R[id.slice(4)] : liveLine(id, 0), sub = el('span', { class: 'esub', html: l.sub });
      return { id: id, sub: sub, node: el('div', { class: 'eqline', 'data-eq': id }, el('span', { class: 'en', text: l.name }), el('span', { class: 'es', html: l.sym }), sub) };
    });
    var count = el('span', { class: 'acount', id: 'anim-count' }), cap = el('p', { class: 'acap', id: 'anim-cap', 'aria-live': 'polite' });
    var back = el('button', { class: 'btn', type: 'button', id: 'anim-back', text: 'Back' }), next = el('button', { class: 'btn go', type: 'button', id: 'anim-next', text: 'Next' });
    var autoB = el('button', { class: 'btn', type: 'button', id: 'anim-auto', 'aria-pressed': 'false', text: 'Autoplay' });
    var gsvg = A('svg'), wrap = el('div', { class: 'anim' }, el('div', { class: 'astephead' }, count, el('div', { class: 'actl' }, back, next, autoB)), cap, el('div', { class: 'aeqs' }, rows.map(function (r) { return r.node; })), gsvg);
    box.appendChild(wrap);
    var graph = makeGraph(gsvg, GR.filter(function (g) { return g.id === spec.show; })[0] || GR[3]);
    anim = { active: true, timer: 0, update: function (t) { rows.forEach(function (r) { if (r.id.indexOf('res-') !== 0) r.sub.innerHTML = liveLine(r.id, t).sub; }); graph.update(t); } };
    function show(i) {
      idx = i; var st = steps[i];
      count.textContent = 'Step ' + (i + 1) + ' of ' + N; cap.innerHTML = st.cap;
      rows.forEach(function (r) { r.node.classList.toggle('on', st.eqs.indexOf(r.id) >= 0); });
      gsvg.classList.toggle('off', !st.graph);
      setFocus(st); frame();
      back.disabled = i === 0; next.disabled = i === N - 1;
      if (i === N - 1) { showMarkScheme(); setAuto(false); }
      else if (auto) anim.timer = setTimeout(goNext, 2400);
    }
    function goNext() {
      if (!anim.active || busy || idx >= N - 1) return;
      var j = idx + 1, target = steps[j].t;
      if (reduce || target <= clock.t + 1e-9) { clock.playing = false; clock.t = target; show(j); return; }
      busy = true; next.dataset.busy = '1'; next.disabled = true; cap.textContent = 'Watch the motion…';
      play(target, function () { busy = false; next.dataset.busy = ''; show(j); });
    }
    function goBack() { if (busy || idx === 0) return; clearTimeout(anim.timer); clock.playing = false; clock.t = steps[idx - 1].t; show(idx - 1); }
    function setAuto(on) { auto = on; autoB.setAttribute('aria-pressed', String(on)); autoB.textContent = on ? 'Stop autoplay' : 'Autoplay'; if (!on) clearTimeout(anim.timer); }
    next.addEventListener('click', function () { clearTimeout(anim.timer); goNext(); });
    back.addEventListener('click', goBack);
    autoB.addEventListener('click', function () { setAuto(!auto); if (auto) { if (idx === N - 1) { clock.t = 0; show(0); } else goNext(); } });
    clock.t = 0; show(0);
  }

  /* ---------- theme and presentation mode ---------- */
  function isDark() { var t = document.documentElement.getAttribute('data-theme'); return t ? t === 'dark' : !!(window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches); }
  function applyTheme() { if (store.theme) document.documentElement.setAttribute('data-theme', store.theme); $('b-theme').setAttribute('aria-pressed', String(isDark())); }
  function applyPresent() { document.documentElement.classList.toggle('present', !!store.present); $('b-present').setAttribute('aria-pressed', String(!!store.present)); }

  /* ---------- wiring ---------- */
  $('b-play').addEventListener('click', function () { play(); });
  $('b-pause').addEventListener('click', pause);
  $('b-reset').addEventListener('click', function () { stopAnim(); reset(); });
  $('b-step').addEventListener('click', stepFwd);
  $('b-replay').addEventListener('click', function () { if (locked) return; clock.t = 0; play(); });
  $('stepdt').textContent = f(M.STEP_DT) + ' s';
  (function speedSeg() {
    var box = $('seg-speed');
    function draw() { box.textContent = ''; [[0.25, 'Slow motion', 'slow'], [1, 'Normal', 'normal'], [3, 'Fast forward', 'fast']].forEach(function (o) { box.appendChild(el('button', { type: 'button', id: 'speed-' + o[2], text: o[1], title: o[0] + '× speed', 'aria-pressed': String(clock.speed === o[0]), onclick: function () { clock.speed = o[0]; store.speed = o[0]; save(); draw(); } })); }); }
    draw();
  })();
  function syncWorking() { $('b-working').textContent = store.working ? 'Hide working' : 'Show working'; $('eqs').classList.toggle('noworking', !store.working); }
  $('b-working').addEventListener('click', function () { store.working = !store.working; save(); syncWorking(); });
  $('c-colour').value = store.colour; document.documentElement.style.setProperty('--ball', store.colour);
  $('c-colour').addEventListener('input', function (e) { store.colour = e.target.value; document.documentElement.style.setProperty('--ball', store.colour); save(); });
  $('b-theme').addEventListener('click', function () { store.theme = isDark() ? 'light' : 'dark'; save(); applyTheme(); });
  $('b-present').addEventListener('click', function () { store.present = !store.present; save(); applyPresent(); });
  $('b-progress-reset').addEventListener('click', function () { store.progress = {}; save(); renderList(); });
  document.addEventListener('keydown', function (e) {
    var t = e.target, tag = (t.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === ' ' && tag !== 'button' && tag !== 'summary') { e.preventDefault(); if (clock.playing) pause(); else play(); }
    else if (e.key === 's' || e.key === 'S') stepFwd();
    else if (e.key === 'r' || e.key === 'R') { stopAnim(); reset(); }
  });
  if (narrowMQ.addEventListener) narrowMQ.addEventListener('change', function () { drawIndep(); frame(); });

  applyTheme(); applyPresent(); buildReadouts(); buildInputs(); recompute(); syncWorking();
  renderScenarios(); renderQ();
  Sim.tabs(document.querySelector('.tabs'), { onChange: function (name) {
    activeTab = name; document.body.classList.toggle('qmode', name === 'questions');
    if (name !== 'questions') stopAnim();
    if (name === 'questions' && !cur && dynMain) loadQuestion(scenarioQs(store.scenario)[0]);
    if (dynMain) frame();
  } });
  window.PM = { clock: clock, state: function () { return { P: P, S: S, locked: locked }; }, setT: function (t) { clock.playing = false; clock.t = Math.min(S.T, t); frame(); } };   // for the acceptance tests
})();
