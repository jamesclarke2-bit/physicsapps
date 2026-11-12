/* Ramp Practical: UI only. All physics comes from model.js (which wraps the F = ma trolley engine); generic widgets from ../shared/sim.js. */
(function () {
  'use strict';
  var M = window.RampModel, el = Sim.el, fmt = Sim.fmt, sig = Sim.sig, A = Sim.svgel;
  var $ = function (id) { return document.getElementById(id); };
  var BASE_A = { stage: 'A', th: 8, s: 1.0, timer: 'video', method: 'trig', ell: 2.0 };
  var BASE_B = { stage: 'B', th: 8, s: 1.0, timer: 'video', method: 'protractor', ell: 2.0 };
  var S = Object.assign({}, BASE_A);
  var D = { stage: 'A', th: 8, thMax: 16, s: 1.0, timer: 'video', method: 'trig', ell: 2.0, tgt: 5 }, DES = null;
  var lockedIds = [], rand = Sim.rng(20), meta = {}, prefDim = 's', seriesSel = '', valShown = false;
  var results = new Sim.Results({ res: 0.001, dp: 2, rowHead: 'Set-up', empty: 'No readings yet. Press Time 3 runs.' });
  var raw = new Sim.Results({ res: 0.001, dp: 2, rowHead: 'Set-up', empty: 'No readings yet. Take some readings on the Bench tab.' });
  var rad = function (d) { return d * Math.PI / 180; };
  var r1 = function (x) { return Math.round(x * 10) / 10; };
  var isNum = function (x) { return x !== null && x !== undefined && isFinite(x); };
  var sum = function (a) { return a.reduce(function (x, y) { return x + y; }, 0); };
  var TIMERS_ALL = [['stopwatch', 'Stopwatch'], ['video', 'Video'], ['gate', 'Light gate']];
  function timerOpts(stage) { return stage === 'A' ? TIMERS_ALL.slice(0, 2) : TIMERS_ALL; }
  var ELLS = [[1, '1.0 m'], [1.5, '1.5 m'], [2, '2.0 m'], [2.5, '2.5 m'], [3, '3.0 m']];
  var METHODS = [['protractor', 'Protractor'], ['trig', 'Trigonometry (h ÷ ℓ)']];
  var hasT = function (o) { return o.timer !== 'gate'; };
  var hasV = function (o) { return o.timer === 'gate' || o.stage === 'A'; };

  function seg(id, options, get, set, lockKey) {
    var box = $(id);
    function draw() {
      var list = typeof options === 'function' ? options() : options; box.textContent = '';
      list.forEach(function (o) { box.appendChild(el('button', { type: 'button', text: o[1], 'aria-pressed': String(get() === o[0]), disabled: !!lockKey && lockedIds.indexOf(lockKey) >= 0, onclick: function () { set(o[0]); draw(); } })); });
    }
    draw(); return draw;
  }
  function setup(o) { return { th: o.th }; }
  function sinOf(th) { return Math.sin(rad(th)); }
  function head(lbl) { var i = lbl.indexOf(' / '); return i < 0 ? lbl : lbl.slice(0, i) + ' (' + lbl.slice(i + 3) + ')'; }
  function valUnc(v, u, unit) {
    if (!isNum(v)) return '–';
    if (!(u > 0)) return sig(v, 3) + (unit ? ' ' + unit : '');
    var dp = Math.max(0, 1 - Math.floor(Math.log10(u)));
    return fmt(v, dp) + ' ± ' + fmt(u, dp) + (unit ? ' ' + unit : '');
  }

  /* ---------- rig ---------- */
  var LPX = 560, XB = 690, YB = 270;
  var anim = { x: 0, v: 0, t: 0, raf: 0, on: false, ghosts: [] }, vec = { F: false, a: false, v: false, strobe: true }, speed = 2;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function rigGeom() { var r = rad(S.th); return { r: r, tx: XB - LPX * Math.cos(r), ty: YB - LPX * Math.sin(r), px: LPX / S.ell }; }
  var VSCALE = { F: 60, a: 36, v: 46 };
  function vectors(g, xf) {
    var th = S.th, mv = M.moves(th), F = mv ? M.force(th) : 0, a = mv ? M.accel(th) : 0;
    var items = [['F', F, 'net force ' + fmt(F, 2) + ' N'], ['a', a, 'acceleration ' + fmt(a, 2) + ' m s⁻²'], ['v', anim.v, 'velocity ' + fmt(anim.v, 2) + ' m s⁻¹']].filter(function (it) { return vec[it[0]]; });
    items.forEach(function (it, i) {
      var y = -92 - 22 * i, L = Math.min(170, VSCALE[it[0]] * it[1]), x0 = xf - 35;
      if (L > 2) {
        g.appendChild(A('line', { class: 'vec vec-' + it[0], x1: x0, y1: y, x2: x0 + L - 6, y2: y }));
        g.appendChild(A('polygon', { class: 'vech-' + it[0], points: (x0 + L) + ',' + y + ' ' + (x0 + L - 10) + ',' + (y - 5) + ' ' + (x0 + L - 10) + ',' + (y + 5) }));
      }
      g.appendChild(A('text', { class: 'vlbl vlbl-' + it[0], x: x0, y: y - 6 }, it[2]));
    });
  }
  function drawRig() {
    var svg = $('rig'), g0 = rigGeom(), P = g0.px, th = S.th;
    svg.textContent = '';
    svg.setAttribute('viewBox', '0 -70 760 ' + 400);
    svg.appendChild(A('polygon', { class: 'wedge', points: g0.tx + ',' + g0.ty + ' ' + XB + ',' + YB + ' ' + g0.tx + ',' + YB }));
    svg.appendChild(A('line', { class: 'ground', x1: 30, x2: 740, y1: YB, y2: YB }));
    var rr = 78, ex = XB - rr * Math.cos(g0.r), ey = YB - rr * Math.sin(g0.r);
    svg.appendChild(A('path', { class: 'dim', d: 'M ' + (XB - rr) + ' ' + YB + ' A ' + rr + ' ' + rr + ' 0 0 1 ' + ex + ' ' + ey }));
    svg.appendChild(A('text', { class: 'dimtext', x: 756, y: YB + 22, 'text-anchor': 'end' }, S.method === 'trig' ? 'θ = sin⁻¹(h ÷ ℓ)' : 'θ = ' + fmt(th, 1) + '° ± ' + M.PROTRACTOR_SIG + '°'));
    if (S.method === 'trig') {
      var hx = g0.tx - 26;
      svg.appendChild(A('line', { class: 'dim', x1: hx, x2: hx, y1: YB, y2: g0.ty }));
      svg.appendChild(A('line', { class: 'dim', x1: hx - 5, x2: hx + 5, y1: YB, y2: YB })); svg.appendChild(A('line', { class: 'dim', x1: hx - 5, x2: hx + 5, y1: g0.ty, y2: g0.ty }));
      svg.appendChild(A('text', { class: 'dimtext', x: hx - 8, y: (YB + g0.ty) / 2, 'text-anchor': 'end' }, 'h = ' + Math.round(1000 * M.heightFor(th, S.ell)) + ' mm'));
    }
    var g = A('g', { transform: 'translate(' + g0.tx + ' ' + g0.ty + ') rotate(' + th + ')' });
    g.appendChild(A('rect', { class: 'surface', x: 0, y: 0, width: LPX, height: 8, rx: 2 }));
    var nt = Math.round(S.ell * 10);
    for (var i = 0; i <= nt; i++) {
      var X = LPX - i * 0.1 * P, big = i % 5 === 0;
      g.appendChild(A('line', { class: 'tick', x1: X, x2: X, y1: 8, y2: 8 + (big ? 9 : 5) }));
      if (big) g.appendChild(A('text', { class: 'ticklbl', x: X, y: 30, 'text-anchor': 'middle' }, fmt(i * 0.1, 1) + (i === 0 ? ' m' : '')));
    }
    g.appendChild(A('line', { class: 'dim', x1: 0, x2: LPX, y1: 46, y2: 46 })); g.appendChild(A('line', { class: 'dim', x1: 0, x2: 0, y1: 41, y2: 51 })); g.appendChild(A('line', { class: 'dim', x1: LPX, x2: LPX, y1: 41, y2: 51 }));
    g.appendChild(A('text', { class: 'dimtext', x: LPX / 2, y: 62, 'text-anchor': 'middle' }, 'ramp length ℓ = ' + fmt(S.ell, 1) + ' m'));
    var xs = LPX - S.s * P, gateOn = hasV(S);
    g.appendChild(A('line', { class: 'flag', x1: xs, x2: xs, y1: -40, y2: 0 })); g.appendChild(A('text', { class: 'lbl', x: xs, y: -44, 'text-anchor': 'middle' }, 'start'));
    g.appendChild(A('line', { class: gateOn ? 'gate' : 'flag', x1: LPX, x2: LPX, y1: -46, y2: 0 })); g.appendChild(A('text', { class: gateOn ? 'gatelbl' : 'lbl', x: LPX, y: -50, 'text-anchor': 'middle' }, gateOn ? 'light gate' : 'finish'));
    g.appendChild(A('rect', { class: 'stopper', x: LPX + 4, y: -24, width: 22, height: 24, rx: 2 }));
    g.appendChild(A('line', { class: 'dim', x1: xs, x2: LPX, y1: -62, y2: -62 })); g.appendChild(A('line', { class: 'dim', x1: xs, x2: xs, y1: -67, y2: -57 })); g.appendChild(A('line', { class: 'dim', x1: LPX, x2: LPX, y1: -67, y2: -57 }));
    g.appendChild(A('text', { class: 'dimtext', x: (xs + LPX) / 2, y: -66, 'text-anchor': 'middle' }, 's = ' + fmt(S.s, 2) + ' m'));
    var xf = xs + anim.x * P;
    if (vec.strobe) anim.ghosts.forEach(function (gx) { if (Math.abs(gx - anim.x) > 0.015) g.appendChild(A('rect', { class: 'ghost', x: xs + gx * P - 70, y: -26, width: 70, height: 20, rx: 3 })); });
    g.appendChild(A('rect', { class: 'trolley', x: xf - 70, y: -26, width: 70, height: 20, rx: 3 }));
    [xf - 54, xf - 16].forEach(function (cx) { g.appendChild(A('circle', { class: 'wheel', cx: cx, cy: -3, r: 5 })); });
    g.appendChild(A('rect', { class: 'card', x: xf - 14, y: -36, width: 10, height: 12 }));
    vectors(g, xf);
    svg.appendChild(g);
  }
  function resetRig() { cancelAnimationFrame(anim.raf); anim.x = 0; anim.v = 0; anim.t = 0; anim.on = false; anim.ghosts = []; drawRig(); }
  function watch(quiet) {
    var a = M.accel(S.th);
    if (!(a > 0)) { if (quiet !== true) $('banner').textContent = 'The trolley does not move: the slope is too gentle to overcome friction.'; return; }
    resetRig(); anim.on = true;
    var t0 = 0, tEnd = Math.sqrt(2 * S.s / a), dts = [0.1, 0.2, 0.25, 0.5, 1], dt = dts.filter(function (d) { return tEnd / d <= 8; })[0] || 1, nextS = 0;
    if (reduce) { while (nextS < tEnd) { anim.ghosts.push(0.5 * a * nextS * nextS); nextS += dt; } anim.x = S.s; anim.v = a * tEnd; anim.on = false; drawRig(); return; }
    function step(ts) {
      if (!t0) t0 = ts;
      var t = Math.min(tEnd, (ts - t0) / 1000 / speed);
      while (nextS <= t + 1e-9 && nextS < tEnd) { anim.ghosts.push(0.5 * a * nextS * nextS); nextS += dt; }
      anim.t = t; anim.x = 0.5 * a * t * t; anim.v = a * t; drawRig();
      if (t >= tEnd) { anim.on = false; return; }
      anim.raf = requestAnimationFrame(step);
    }
    anim.raf = requestAnimationFrame(step);
  }

  /* ---------- readings ---------- */
  function keyOf(o) { return [o.stage, o.th.toFixed(1), o.s.toFixed(1), o.timer, o.method, o.ell.toFixed(1)].join('|'); }
  function label(o) {
    var how = o.method === 'trig' ? 'trigonometry' : 'protractor', tm = hasT(o) ? M.TIMERS[o.timer].short + (hasV(o) ? ' + light gate' : '') : 'Light gate';
    return 'θ = ' + fmt(o.th, 1) + '°, s = ' + fmt(o.s, 2) + ' m<span class="sm">' + tm + ' &middot; angle by ' + how + ' &middot; ramp ' + fmt(o.ell, 1) + ' m</span>';
  }
  function run(n) {
    var th = S.th;
    if (!M.moves(th)) { $('banner').textContent = 'The trolley does not move: the slope is too gentle to overcome friction. Raise the ramp.'; return; }
    $('banner').textContent = '';
    var o = Object.assign({}, S); o.key = keyOf(o); o.label = label(o); meta[o.key] = o;
    for (var i = 0; i < n; i++) {
      var t = hasT(o) ? M.measureTime(th, o.s, o.timer, rand) : null, v = hasV(o) ? M.measureSpeed(th, o.s, rand) : null;
      results.add(o.key, isNum(t) ? t : v, { t: t, v: v });
    }
  }
  function vals(o, f) { return results.liveField(o.key, function (r) { return r.meta[f]; }).filter(isNum); }
  /* means and half-ranges of what the student recorded, then a (from the time if there is one, otherwise from the speed) */
  function calc(o) {
    var T = hasT(o) ? Sim.stats(vals(o, 't'), { res: M.TIMERS[o.timer].res }) : null, V = hasV(o) ? Sim.stats(vals(o, 'v'), { res: 0.001 }) : null;
    if (!(T && T.n) && !(V && V.n)) return null;
    var c = { o: o, T: T, V: V };
    if (T && T.n) { c.aT = M.aFromT(o.s, T.mean); c.daT = c.aT * 2 * T.half / T.mean; }
    if (V && V.n) { c.aV = M.aFromV(o.s, V.mean); c.daV = V.mean * V.half / o.s; }
    if (T && T.n) { c.a = c.aT; c.da = c.daT; c.src = 't'; } else { c.a = c.aV; c.da = c.daV; c.src = 'v'; }
    c.pct = 100 * c.da / c.a;
    return c;
  }

  /* ---------- pop-ups ---------- */
  function popField(o, which) {
    var v = vals(o, which), st = Sim.stats(v, { res: which === 't' ? M.TIMERS[o.timer].res : 0.001 }), u = which === 't' ? 's' : 'm s⁻¹', dp = which === 't' && o.timer === 'stopwatch' ? 2 : 3, tot = sum(v);
    return [Sim.steps([
      ['Add the readings that are not crossed out', v.map(function (x) { return fmt(x, dp); }).join(' + ') + ' = ' + fmt(tot, dp) + ' ' + u],
      ['Divide by how many there are', 'mean ' + which + ' = ' + fmt(tot, dp) + ' ÷ ' + v.length + ' = ' + fmt(st.mean, 3) + ' ' + u],
      ['The uncertainty is half the range', 'Δ' + which + ' = ½ (' + fmt(st.max, 3) + ' − ' + fmt(st.min, 3) + ') = ' + fmt(st.half, 3) + ' ' + u + (st.half > (st.max - st.min) / 2 + 1e-9 ? ' (raised to half the smallest division)' : '')]])];
  }
  function popAccel(o, c) {
    if (c.src === 't') {
      var src = M.sources(o.th, o.s, o.timer);
      return [Sim.steps([
        ['Starting from rest, s = ½ a t², so', 'a = 2s ÷ t² = 2 × ' + fmt(o.s, 2) + ' ÷ ' + fmt(c.T.mean, 3) + '² = ' + fmt(c.a, 3) + ' m s⁻²'],
        ['Percentage uncertainty in t', 'Δt ÷ t × 100 = ' + fmt(c.T.half, 3) + ' ÷ ' + fmt(c.T.mean, 3) + ' × 100 = ' + fmt(c.T.pct, 1) + '%'],
        ['a depends on t², so double the percentage', '% in a = 2 × ' + fmt(c.T.pct, 1) + ' = ' + fmt(c.pct, 1) + '%'],
        ['Absolute uncertainty', 'Δa = ' + fmt(c.pct, 1) + '% of ' + fmt(c.a, 3) + ' = ± ' + fmt(c.da, 3) + ' m s⁻²']]),
        el('p', { text: 'Where could the spread in t come from? Timer / reaction ± ' + fmt(src.timer, 3) + ' s. Releasing and judging the finish ± ' + fmt(src.release, 3) + ' s. Resolution ± ' + fmt(src.resolution, 4) + ' s. Take the biggest. Repeating shows the spread but does not shrink it.' })];
    }
    return [Sim.steps([
      ['v² = u² + 2as with u = 0, so', 'a = v² ÷ 2s = ' + fmt(c.V.mean, 3) + '² ÷ (2 × ' + fmt(o.s, 2) + ') = ' + fmt(c.a, 3) + ' m s⁻²'],
      ['Percentage uncertainty in v', 'Δv ÷ v × 100 = ' + fmt(c.V.half, 3) + ' ÷ ' + fmt(c.V.mean, 3) + ' × 100 = ' + fmt(c.V.pct, 1) + '%'],
      ['a depends on v², so double the percentage', '% in a = 2 × ' + fmt(c.V.pct, 1) + ' = ' + fmt(c.pct, 1) + '%'],
      ['Absolute uncertainty', 'Δa = ' + fmt(c.pct, 1) + '% of ' + fmt(c.a, 3) + ' = ± ' + fmt(c.da, 3) + ' m s⁻²']]),
      el('p', { text: 'The light gate times a card of width 0.100 m, so v = 0.100 ÷ card time. The card width and its timing have a fixed error, about 1% in v.' })];
  }
  function renderBench() {
    var rows = Object.keys(meta).map(function (k) { return meta[k]; });
    [results, raw].forEach(function (r) {
      r.cfg.rows = rows;
      r.cfg.fields = function (o) {
        var f = []; if (hasT(o)) f.push({ label: 't (s)', get: function (rd) { return rd.meta.t; }, dp: o.timer === 'stopwatch' ? 2 : 3 });
        if (hasV(o)) f.push({ label: 'v (m s<sup>-1</sup>)', get: function (rd) { return rd.meta.v; }, dp: 3 }); return f;
      };
    });
    raw.data = results.data; raw.cfg.columns = [];
    results.cfg.columns = [
      { head: 'Mean t (s)', cell: function (r) { var c = calc(r); return c && c.T && c.T.n ? Sim.calcButton(fmt(c.T.mean, 2), 'Mean time', function () { return popField(r, 't'); }) : ''; } },
      { head: 'Mean v (m s<sup>-1</sup>)', cell: function (r) { var c = calc(r); return c && c.V && c.V.n ? Sim.calcButton(fmt(c.V.mean, 3), 'Mean speed', function () { return popField(r, 'v'); }) : ''; } },
      { head: 'a (m s<sup>-2</sup>)', cell: function (r) { var c = calc(r); return c ? Sim.calcButton(fmt(c.a, 3), 'Acceleration', function () { return popAccel(r, c); }) : ''; } },
      { head: '% uncertainty in a', cell: function (r) { var c = calc(r); return c ? Sim.calcButton(fmt(c.pct, 1) + '%', 'Uncertainty in a', function () { return popAccel(r, c); }) : ''; } }
    ];
    results.render($('results'));
  }
  function renderAll() { renderBench(); raw.render($('raw')); renderAnalyse(); }
  results.onChange(renderAll); raw.onChange(renderAll);

  /* ---------- analyse: raw graph, straight-line graph, manipulated data, uncertainty, validation ---------- */
  var QS = [
    { id: 's', label: 's', name: 'Distance, s', unit: { m: 1 }, tfs: ['none', 'inv', 'sq', 'sqrt'] },
    { id: 'th', label: 'θ', name: 'Angle, θ', unit: { deg: 1 }, tfs: ['none', 'sin'] },
    { id: 't', label: 't', name: 'Time, t', unit: { s: 1 }, tfs: ['none', 'inv', 'sq', 'sqrt'] },
    { id: 'v', label: 'v', name: 'Speed at the end, v', unit: { m: 1, s: -1 }, tfs: ['none', 'inv', 'sq', 'sqrt'] },
    { id: 'a', label: 'a', name: 'Acceleration, a', unit: { m: 1, s: -2 }, tfs: ['none', 'inv', 'sq', 'sqrt'] }
  ];
  var QRAW = QS.map(function (q) { return Object.assign({}, q, { tfs: ['none'] }); });
  var QDEF = {}; QS.forEach(function (q) { QDEF[q.id] = q; });
  function qget(o, id) {
    var c = calc(o); if (!c) return null;
    switch (id) {
      case 's': return { v: o.s, u: 0 };
      case 'th': return { v: o.th, u: M.angleUncDeg(o.th, o.method, o.ell) };
      case 't': return c.T && c.T.n ? { v: c.T.mean, u: c.T.half } : null;
      case 'v': return c.V && c.V.n ? { v: c.V.mean, u: c.V.half } : null;
      case 'a': return { v: c.a, u: c.da };
    }
    return null;
  }
  var AX = Sim.axes({ mount: $('axes'), quantities: QS, get: qget, x: { q: 's' }, y: { q: 't' }, known: [], onChange: function () { valShown = false; renderAnalyse(); } });
  var AXR = Sim.axes({ mount: $('axes-raw'), quantities: QRAW, get: qget, x: { q: 's' }, y: { q: 't' }, known: [], onChange: function () { renderAnalyse(); } });

  /* what each straight-line graph should show. kind 'a': a is worked out; kind 'g': g is worked out and compared with 9.81 m s⁻² */
  var KNOWN = {
    't:sq|s:none': { kind: 'a', how: 'a = 2 ÷ gradient', derive: function (f) { return { v: 2 / f.slope, u: 2 * f.dSlope / (f.slope * f.slope) }; }, think: 'Starting from rest, s = ½at², so t² = (2 ÷ a) × s. What should the intercept be? What does the gradient give you?',
      model: function (o) { return { slope: 2 / M.ideal(o.th), intercept: 0 }; }, modelText: 'Show the line if a = g sin θ exactly (no friction)' },
    's:none|t:sq': { kind: 'a', how: 'a = 2 × gradient', derive: function (f) { return { v: 2 * f.slope, u: 2 * f.dSlope }; }, think: 'Starting from rest, s = ½at². What should the intercept be? What does the gradient give you?',
      model: function (o) { return { slope: M.ideal(o.th) / 2, intercept: 0 }; }, modelText: 'Show the line if a = g sin θ exactly (no friction)' },
    'v:sq|s:none': { kind: 'a', how: 'a = gradient ÷ 2', derive: function (f) { return { v: f.slope / 2, u: f.dSlope / 2 }; }, think: 'v² = u² + 2as with u = 0. What should the intercept be? What does the gradient give you?',
      model: function (o) { return { slope: 2 * M.ideal(o.th), intercept: 0 }; }, modelText: 'Show the line if a = g sin θ exactly (no friction)' },
    'a:none|th:sin': { kind: 'g', how: 'g = gradient', derive: function (f) { return { v: f.slope, u: f.dSlope }; }, think: 'If a = g sin θ, what should the gradient be and what should the intercept be? What would a non-zero intercept tell you?',
      model: function () { return { slope: M.G, intercept: 0 }; }, modelText: 'Show the line a = g sin θ with g = 9.81 m s⁻² (no friction)' },
    'th:sin|a:none': { kind: 'g', how: 'g = 1 ÷ gradient', derive: function (f) { return { v: 1 / f.slope, u: f.dSlope / (f.slope * f.slope) }; }, think: 'sin θ = a ÷ g. What should the gradient be and what should the intercept be?',
      model: function () { return { slope: 1 / M.G, intercept: 0 }; }, modelText: 'Show the line a = g sin θ with g = 9.81 m s⁻² (no friction)' },
    'v:sq|th:sin': { kind: 'g', how: 'g = gradient ÷ 2s', derive: function (f, o) { return { v: f.slope / (2 * o.s), u: f.dSlope / (2 * o.s) }; }, think: 'v² = 2as and a = g sin θ, so v² = (2gs) sin θ. What should the gradient be and what should the intercept be?',
      model: function (o) { return { slope: 2 * M.G * o.s, intercept: 0 }; }, modelText: 'Show the line a = g sin θ with g = 9.81 m s⁻² (no friction)' }
  };
  function knownKey() { var g = AX.get(); return g.y.q + ':' + g.y.tf + '|' + g.x.q + ':' + g.x.tf; }

  var DIMS = [['s', 'distance, s'], ['th', 'angle, θ']], KEYS = ['stage', 'th', 's', 'timer', 'method', 'ell'];
  function vstr(o, k) { return k === 'th' || k === 's' || k === 'ell' ? o[k].toFixed(1) : String(o[k]); }
  function seriesLabel(rows, dim) {
    var o = rows[0], parts = [];
    if (dim !== 'th') parts.push('angle ' + fmt(o.th, 1) + '°');
    if (dim !== 's') parts.push('s = ' + fmt(o.s, 1) + ' m');
    parts.push(hasT(o) ? M.TIMERS[o.timer].short + (hasV(o) ? ' + gate' : '') : 'Light gate', o.method === 'trig' ? 'trigonometry' : 'protractor', 'ramp ' + fmt(o.ell, 1) + ' m');
    return 'Changing the ' + DIMS.filter(function (d) { return d[0] === dim; })[0][1] + ' (' + rows.length + ' settings) · ' + parts.join(' · ');
  }
  function groups() {
    var res = [];
    DIMS.forEach(function (d) {
      var g = {};
      Object.keys(meta).forEach(function (k) {
        var o = meta[k]; if (!calc(o)) return;
        var key = d[0] + '#' + KEYS.filter(function (x) { return x !== d[0]; }).map(function (x) { return vstr(o, x); }).join('|');
        (g[key] = g[key] || []).push(o);
      });
      Object.keys(g).forEach(function (key) { var v = {}; g[key].forEach(function (r) { v[vstr(r, d[0])] = 1; }); if (Object.keys(v).length >= 2) res.push({ key: key, dim: d[0], rows: g[key].sort(function (p, q) { return p[d[0]] - q[d[0]]; }) }); });
    });
    return res.sort(function (p, q) { return (q.dim === prefDim) - (p.dim === prefDim) || q.rows.length - p.rows.length; });
  }
  function popGradient(f) {
    var half = (f.steep.slope - f.shallow.slope) / 2, st = [['Steepest line through the error bars', 'gradient = ' + sig(f.steep.slope, 3)], ['Shallowest line through the error bars', 'gradient = ' + sig(f.shallow.slope, 3)],
      ['The uncertainty is half the difference', 'Δgradient = ½ (' + sig(f.steep.slope, 3) + ' − ' + sig(f.shallow.slope, 3) + ') = ' + sig(half, 2)]];
    var out = [Sim.steps(st)];
    if (Math.abs(f.dSlope - half) > 1e-9) out.push(el('p', { class: 'fine', text: 'It is raised to ' + sig(f.dSlope, 2) + ' so that the best-fit line lies inside the range.' }));
    if (!f.all) out.push(el('p', { class: 'fine', text: 'No straight line passes through every error bar. These lines pass through ' + f.hit + ' of the ' + f.n + '.' }));
    return out;
  }
  function popTf(sel, o, pt) {
    var q = QDEF[sel.q], b = qget(o, sel.q), s = q.label, st = [];
    st.push(['Mean ' + s + ' from your readings, with its uncertainty', s + ' = ' + sig(b.v, 4) + ' ± ' + sig(b.u, 2)]);
    if (sel.tf === 'sq') st.push(['Square it', s + '² = ' + sig(b.v, 4) + '² = ' + sig(pt.x === undefined ? 0 : pt.val, 4)], ['Uncertainty: Δ(' + s + '²) = 2 × ' + s + ' × Δ' + s, '2 × ' + sig(b.v, 4) + ' × ' + sig(b.u, 2) + ' = ' + sig(pt.unc, 2)]);
    else if (sel.tf === 'inv') st.push(['Take 1 ÷ it', '1 ÷ ' + sig(b.v, 4) + ' = ' + sig(pt.val, 4)], ['Uncertainty: Δ(1/' + s + ') = Δ' + s + ' ÷ ' + s + '²', sig(b.u, 2) + ' ÷ ' + sig(b.v, 4) + '² = ' + sig(pt.unc, 2)]);
    else if (sel.tf === 'sqrt') st.push(['Take the square root', '√' + sig(b.v, 4) + ' = ' + sig(pt.val, 4)], ['Uncertainty: Δ(√' + s + ') = Δ' + s + ' ÷ (2√' + s + ')', sig(b.u, 2) + ' ÷ (2 × ' + sig(pt.val, 4) + ') = ' + sig(pt.unc, 2)]);
    else if (sel.tf === 'sin') st.push(['Take the sine', 'sin ' + sig(b.v, 4) + '° = ' + sig(pt.val, 4)], ['Uncertainty: Δ(sin θ) = cos θ × Δθ (Δθ in radians)', 'cos ' + sig(b.v, 4) + '° × ' + sig(rad(b.u), 3) + ' = ' + sig(pt.unc, 2)]);
    var out = [Sim.steps(st)];
    if (sel.q === 'th' && o.method === 'trig') out.push(el('p', { class: 'fine', text: 'Angle by trigonometry: sin θ = h ÷ ℓ with h read to ± ' + (M.HEIGHT_SIG * 1000) + ' mm on a ' + fmt(o.ell, 1) + ' m ramp, so Δ(sin θ) = ' + (M.HEIGHT_SIG * 1000) + ' mm ÷ ' + fmt(o.ell * 1000, 0) + ' mm = ' + sig(M.HEIGHT_SIG / o.ell, 2) + '. This is the same size at every angle.' }));
    if (sel.q === 'th' && o.method === 'protractor') out.push(el('p', { class: 'fine', text: 'Angle by protractor: half of the 1° division, ± ' + M.PROTRACTOR_SIG + '°. The same size at every angle, so it is a bigger percentage of a small angle.' }));
    if (sel.q === 'a') out.push(el('p', { class: 'fine', text: 'a is worked out from ' + (calc(o).src === 't' ? 'a = 2s ÷ t²' : 'a = v² ÷ 2s') + ' (click a in the Results table on the Bench tab to see it in full).' }));
    return out;
  }
  function none(msg) {
    var lab = [AX.title(), AX.xlabel(), AX.ylabel()];
    Sim.plot($('plot'), { title: lab[0], xlabel: lab[1], ylabel: lab[2], points: [] }); Sim.plot($('plot-raw'), { title: AXR.title(), xlabel: AXR.xlabel(), ylabel: AXR.ylabel(), points: [] });
    $('manip').textContent = ''; $('manip').appendChild(el('p', { class: 'empty', text: msg })); $('fit-out').textContent = ''; $('fit-out').appendChild(el('p', { class: 'empty', text: msg }));
    $('model-row').hidden = true; $('val-out').textContent = ''; $('b-validate').disabled = true; $('raw-note').textContent = '';
  }
  var lastCtx = null;
  function renderAnalyse() {
    var gs = groups(), sel = $('sel-series'); sel.textContent = '';
    if (!gs.length) { sel.appendChild(el('option', { text: 'No suitable readings yet' })); lastCtx = null; none('Take readings at two or more settings where you change only one thing (the distance s for Stage A, the angle θ for Stage B).'); return; }
    gs.forEach(function (x) { sel.appendChild(el('option', { value: x.key, text: seriesLabel(x.rows, x.dim), selected: x.key === seriesSel })); });
    if (!gs.some(function (x) { return x.key === seriesSel; })) seriesSel = gs[0].key;
    sel.value = seriesSel;
    var rows = gs.filter(function (x) { return x.key === seriesSel; })[0].rows, o0 = rows[0];
    /* raw graph */
    var pr = AXR.collect(rows);
    Sim.plot($('plot-raw'), { title: AXR.title(), xlabel: AXR.xlabel(), ylabel: AXR.ylabel(), zero: true, points: pr });
    $('raw-note').textContent = pr.length < 2 ? 'These two quantities are not both available for these readings. Choose different axes.' : 'Plotted as measured, with error bars. Is it a straight line?';
    /* straight-line graph */
    var pts = AX.collect(rows).sort(function (p, q) { return p.x - q.x; }), kn = KNOWN[knownKey()], f = pts.length >= 2 ? Sim.lineUnc(pts) : null;
    lastCtx = { rows: rows, o0: o0, pts: pts, f: f, kn: kn };
    $('model-row').hidden = !kn; if (kn) $('model-label').textContent = kn.modelText;
    $('b-validate').disabled = !f;
    $('val-think').textContent = kn ? kn.think : 'Choose axes that give a straight line first. Then work out what the gradient and the intercept should be if the equation is true.';
    var lines = [];
    if (f) {
      var xs = pts.map(function (p) { return p.x; }), xmax = Math.max.apply(null, xs) * 1.05, xmin = Math.min(0, Math.min.apply(null, xs));
      function ln(m, c, colour, dash) { return { pts: [[xmin, c + m * xmin], [xmax, c + m * xmax]], colour: colour, dash: dash }; }
      lines.push(ln(f.slope, f.intercept, '--c1'));
      if ($('chk-lines').checked) { lines.push(ln(f.steep.slope, f.steep.intercept, '--c3', '5 4')); lines.push(ln(f.shallow.slope, f.shallow.intercept, '--c3', '5 4')); }
      if (kn && $('chk-model').checked) { var ml = kn.model(o0); lines.push(ln(ml.slope, ml.intercept, '--c2', '6 4')); }
    }
    Sim.plot($('plot'), { title: AX.title(), xlabel: AX.xlabel(), ylabel: AX.ylabel(), zero: true, points: pts, lines: lines });
    /* manipulated data */
    var g = AX.get(), man = $('manip'); man.textContent = '';
    if (!pts.length) man.appendChild(el('p', { class: 'empty', text: 'These two quantities are not both available for these readings. Choose different axes.' }));
    else {
      var dimQ = rows[0] && gs.filter(function (x) { return x.key === seriesSel; })[0].dim, dimHead = dimQ === 's' ? 's (m)' : 'θ (°)';
      var xh = head(AX.xlabel()), yh = head(AX.ylabel()), xu = AX.xlabel().indexOf(' / ') < 0 ? '' : AX.xlabel().slice(AX.xlabel().indexOf(' / ') + 3), yu = AX.ylabel().indexOf(' / ') < 0 ? '' : AX.ylabel().slice(AX.ylabel().indexOf(' / ') + 3);
      function cell(sel, o, val, unc, which) {
        var b = sel.tf === 'none' ? null : { val: val, unc: unc };
        var txt = which === 'v' ? sig(val, 4) : sig(unc, 2);
        return el('td', { class: 'num' }, Sim.calcButton(txt, which === 'v' ? 'Value used on the graph' : 'Uncertainty used on the graph', function () { return sel.tf === 'none' ? popBase(o, sel.q) : popTf(sel, o, b); }));
      }
      var body = pts.map(function (p) { var o = p.row; return el('tr', null, el('td', { class: 'num', text: dimQ === 's' ? fmt(o.s, 1) : fmt(o.th, 1) }), cell(g.x, o, p.x, p.ex, 'v'), cell(g.x, o, p.x, p.ex, 'u'), cell(g.y, o, p.y, p.ey, 'v'), cell(g.y, o, p.y, p.ey, 'u')); });
      man.appendChild(el('div', { class: 'tablewrap' }, el('table', { class: 'data' }, el('thead', null, el('tr', null, [dimHead, xh, '± ' + (xu ? '(' + xu + ')' : ''), yh, '± ' + (yu ? '(' + yu + ')' : '')].map(function (h) { return el('th', { scope: 'col', text: h }); }))), el('tbody', null, body))));
      man.appendChild(el('p', { class: 'fine', text: 'These are the points on the straight-line graph. Click a value to see how it was worked out from the raw data.' }));
    }
    /* fit and uncertainty */
    var out = $('fit-out'); out.textContent = '';
    if (!f) { out.appendChild(el('p', { class: 'empty', text: 'Choose two quantities that are both measured to see the line.' })); $('val-out').textContent = ''; return; }
    var gu = AX.gradUnit(), iu = AX.interceptUnit();
    out.appendChild(el('table', { class: 'kv fitkv' },
      el('tr', null, el('td', { text: 'Gradient' }), el('td', null, Sim.calcButton(valUnc(f.slope, f.dSlope, gu), 'Uncertainty in the gradient', function () { return popGradient(f); }))),
      el('tr', null, el('td', { text: 'Intercept' }), el('td', { text: valUnc(f.intercept, f.dIntercept, iu) })),
      el('tr', null, el('td', { text: '% uncertainty in the gradient' }), el('td', { text: fmt(100 * f.dSlope / Math.abs(f.slope), 1) + '%' })),
      el('tr', null, el('td', { text: 'Error bars the line passes through' }), el('td', { text: f.hit + ' of ' + f.n })),
      el('tr', null, el('td', { text: 'How straight (r²)' }), el('td', { text: fmt(f.r2, 3) }))));
    out.appendChild(el('p', { class: 'fine', text: 'The uncertainty in the gradient is half the difference between the steepest and shallowest lines through the error bars. Tick the box under the graph to see them.' }));
    if (valShown) renderValidate(); else $('val-out').textContent = '';
  }
  function popBase(o, id) {
    var c = calc(o);
    if (id === 's') return [el('p', { text: 'Set by you: s = ' + fmt(o.s, 2) + ' m. Its reading uncertainty is tiny compared with the others, so it is taken as zero.' })];
    if (id === 'th') return popTf({ q: 'th', tf: 'none' }, o, {});
    if (id === 't') return popField(o, 't');
    if (id === 'v') return popField(o, 'v');
    return popAccel(o, c);
  }

  /* ---------- validation ---------- */
  function row(ok, html) { return el('li', null, el('span', { class: ok === null ? '' : ok ? 'ok' : 'no', role: 'img', 'aria-label': ok === null ? 'note' : ok ? 'passed' : 'not passed', text: ok === null ? '•' : ok ? '✓' : '✗' }), el('span', { html: html })); }
  function crossCheck(rows) {
    var pt = [], pv = [];
    for (var i = 0; i < rows.length; i++) {
      var c = calc(rows[i]); if (!c || !c.T || !c.T.n || !c.V || !c.V.n) return null;
      pt.push({ x: rows[i].s, y: c.T.mean * c.T.mean, ey: 2 * c.T.mean * c.T.half }); pv.push({ x: rows[i].s, y: c.V.mean * c.V.mean, ey: 2 * c.V.mean * c.V.half });
    }
    var ft = Sim.lineUnc(pt), fv = Sim.lineUnc(pv); if (!ft || !fv) return null;
    return { aT: 2 / ft.slope, daT: 2 * ft.dSlope / (ft.slope * ft.slope), aV: fv.slope / 2, daV: fv.dSlope / 2 };
  }
  function renderValidate() {
    var out = $('val-out'); out.textContent = '';
    if (!lastCtx || !lastCtx.f) return;
    var f = lastCtx.f, kn = lastCtx.kn, o = lastCtx.o0, gu = AX.gradUnit(), iu = AX.interceptUnit(), ul = el('ul', { class: 'valrows' });
    var ic = M.agrees(f.intercept, f.dIntercept, 0), pctG = 100 * f.dSlope / Math.abs(f.slope);
    ul.appendChild(row(f.all, f.all ? 'One straight line passes through <b>all ' + f.n + '</b> error bars.' : '<b>No</b> straight line passes through all ' + f.n + ' error bars. The best lines pass through ' + f.hit + '.'));
    if (!kn) {
      ul.appendChild(row(null, 'Intercept: <b>' + valUnc(f.intercept, f.dIntercept, iu) + '</b>. Gradient: <b>' + valUnc(f.slope, f.dSlope, gu) + '</b>. These axes are not one of the relationships this practical tests. Work out what the gradient and intercept should be, then compare.'));
      out.appendChild(ul); return;
    }
    ul.appendChild(row(ic.within, 'Intercept expected: <b>0</b>. You found <b>' + valUnc(f.intercept, f.dIntercept, iu) + '</b>. Zero is ' + (ic.within ? '' : '<b>not</b> ') + 'inside your range.'));
    var d = kn.derive(f, o), verdict = '';
    if (kn.kind === 'g') {
      var ag = M.agrees(d.v, d.u, M.ACCEPTED_G);
      ul.appendChild(row(ag.within, 'Accepted value: g = <b>' + fmt(M.ACCEPTED_G, 2) + ' m s⁻²</b>. From your line (' + kn.how + '): <b>' + valUnc(d.v, d.u, 'm s⁻²') + '</b>. The accepted value is ' + (ag.within ? '' : '<b>not</b> ') + 'inside your range. The difference is ' + fmt(ag.pctDiff, 1) + '% and your uncertainty is ' + fmt(ag.pctUnc, 1) + '%.'));
      if (ag.within && ic.within) verdict = 'Your data agree with a = g sin θ within your uncertainty, for this range of angles. This is a validation, not a proof: a different range or a smaller uncertainty could still show a difference.';
      else if (ag.within && !ic.within) verdict = 'The gradient agrees with g, but the line does not pass through the origin, so a is not exactly proportional to sin θ. Something changes a by about the same amount at every angle. Repeating readings cannot remove it. What is it, and why does it matter more at small angles?';
      else if (!ag.within && ic.within) verdict = 'g from your gradient does not agree with the accepted value, yet the line passes through the origin. Look for something that changes every reading by the same percentage, or an uncertainty that you have under-estimated.';
      else verdict = 'Neither the gradient nor the intercept agrees with the prediction. Check the method (for example how the angle or the distance was measured) before blaming random error: repeating will not fix a faulty method.';
    } else {
      var cc = lastCtx.rows.length ? crossCheck(lastCtx.rows) : null;
      ul.appendChild(row(null, 'From your line (' + kn.how + '): <b>a = ' + valUnc(d.v, d.u, 'm s⁻²') + '</b>.'));
      var ok2 = null;
      if (cc) {
        var diff = Math.abs(cc.aT - cc.aV), comb = cc.daT + cc.daV; ok2 = diff <= comb;
        ul.appendChild(row(ok2, 'Cross-check: <b>a = ' + valUnc(cc.aT, cc.daT, 'm s⁻²') + '</b> from t² against s, and <b>a = ' + valUnc(cc.aV, cc.daV, 'm s⁻²') + '</b> from v² against s. They differ by ' + sig(diff, 2) + ' and the uncertainties add to ' + sig(comb, 2) + ', so they ' + (ok2 ? '' : '<b>do not</b> ') + 'agree.'));
      }
      var ig = M.ideal(o.th), agi = M.agrees(d.v, d.u, ig);
      ul.appendChild(row(agi.within, 'Link to Stage B: if a = g sin θ exactly, a would be <b>' + fmt(ig, 3) + ' m s⁻²</b> at ' + fmt(o.th, 1) + '°. Yours is ' + fmt(agi.pctDiff, 1) + '% different and your uncertainty is ' + fmt(agi.pctUnc, 1) + '%. What could make a different, and does it stop the equations of motion from being valid?'));
      if (ic.within && f.all && (ok2 === null || ok2)) verdict = 'The line is straight through the origin' + (cc ? ' and the two methods give the same a' : '') + ', within your uncertainty. This supports the equation for constant acceleration from rest.';
      else if (!ic.within) verdict = 'The line does not pass through the origin within your uncertainty. Is the trolley really released from rest at the start line? Does the start line move?';
      else verdict = 'Some part of the check failed. Look at which row and ask whether it is random scatter that your error bars should have covered, or something that affects every reading.';
    }
    ul.appendChild(row(null, 'How strong is this test? The gradient has a <b>' + fmt(pctG, 1) + '%</b> uncertainty. ' + (pctG > 10 ? 'That is large, so many different values would agree with it. A big uncertainty makes validation easy but weak. Improve the design to make the test sharper.' : 'That is small enough that a real difference would show up.')));
    out.appendChild(ul); out.appendChild(el('p', { class: 'verdict', text: verdict }));
  }
  $('b-validate').addEventListener('click', function () { valShown = true; renderValidate(); });
  $('chk-lines').addEventListener('change', renderAnalyse); $('chk-model').addEventListener('change', renderAnalyse);
  $('sel-series').addEventListener('change', function (e) { seriesSel = e.target.value; valShown = false; renderAnalyse(); });

  /* ---------- design ---------- */
  var DESIGNS = {
    A: { show: ['th', 's'], thLabel: 'Ramp angle', sLabel: 'Shortest distance you will use', timers: 2, set: { th: 8, s: 0.4, timer: 'video', method: 'trig', ell: 2 },
      think: 'The timer errors are fixed amounts of time. What does that do to the percentage uncertainty as the distance gets longer? Which distance is the hardest to do well?',
      note: 'You will use several distances. The shortest gives the shortest time, so the biggest percentage uncertainty from the timer. The light gate gives v as well.' },
    B: { show: ['method', 'th', 'thmax', 's'], thLabel: 'Smallest angle you will use', sLabel: 'Distance, s (kept the same)', timers: 3, set: { th: 4, thMax: 16, s: 1.0, timer: 'video', method: 'protractor', ell: 2 },
      think: 'At which angle is each quantity hardest to measure well, the smallest or the largest? Check both ends before you decide your range.',
      note: 'A small angle makes the percentage uncertainty in sin θ big. A large angle makes the run short, so the timer error is a bigger percentage. Friction is a systematic error: it does not shrink when you repeat.' }
  };
  var dEllDraw, dMethodDraw, dTimerDraw;
  function setDesign(stage) {
    DES = DESIGNS[stage]; D.stage = stage; Object.assign(D, DES.set);
    ['th', 'thMax', 's'].forEach(function (k) { var id = 'd-' + (k === 'thMax' ? 'thmax' : k); $(id).value = D[k]; });
    $('l-dth').textContent = DES.thLabel; $('l-ds').textContent = DES.sLabel;
    [].forEach.call(document.querySelectorAll('[data-d]'), function (c) { c.hidden = DES.show.indexOf(c.getAttribute('data-d')) < 0; });
    $('think-design').textContent = DES.think; $('d-note').textContent = DES.note; $('d-none').hidden = true; $('d-body').hidden = false;
    applyEll(D, 'd-'); dEllDraw(); dMethodDraw(); dTimerDraw(); renderDesign();
  }
  function info(title, body) { return el('button', { class: 'info', type: 'button', 'aria-label': 'Explain this check', text: 'i', onclick: function () { Sim.pop.open(title, body); } }); }
  function drow(ok, text, inf) { return el('li', null, el('span', { class: ok === null ? '' : ok ? 'ok' : 'no', role: 'img', 'aria-label': ok === null ? 'note' : ok ? 'passed' : 'not passed', text: ok === null ? '•' : ok ? '✓' : '✗' }), el('span', { html: text }), inf ? info(inf[0], inf[1]) : el('span')); }
  function renderDesign() {
    if (!DES) return;
    var st = D.stage;
    $('od-th').textContent = fmt(D.th, 1) + '°'; $('od-thmax').textContent = fmt(D.thMax, 1) + '°'; $('od-s').textContent = fmt(D.s, 1) + ' m'; $('od-tgt').textContent = fmt(D.tgt, 1) + '%';
    if (st === 'B' && D.thMax < D.th + 1) { D.thMax = Math.min(20, D.th + 1); $('d-thmax').value = D.thMax; $('od-thmax').textContent = fmt(D.thMax, 1) + '°'; }
    var out = $('d-out'); out.textContent = '';
    if (!M.moves(D.th)) { out.appendChild(el('p', { class: 'empty', text: 'The trolley does not move at this angle. Raise the ramp.' })); return; }
    var ul = el('ul', { class: 'checks' }), thw = st === 'B' ? D.thMax : D.th;      // worst case for the timer: the shortest run
    var tm = M.timeFor(thw, D.s), src = M.sources(thw, D.s, D.timer === 'gate' ? 'video' : D.timer);
    var uA = M.accelUncPct(thw, D.s, D.timer), tgt = D.tgt;
    function stepsFor(timer) {
      if (timer === 'gate') return [Sim.steps([['The gate times a card of width 0.100 m, which gives v with about 1% uncertainty', '≈ 1% in v'], ['a depends on v², so double it', fmt(uA, 1) + '% in a']]), el('p', { class: 'fine', text: 'The gate does not get better or worse with a longer run, because the card error is a fixed fraction of the card time.' })];
      return [Sim.steps([['Biggest single source of error in the time', fmt(M.biggest(thw, D.s, timer), 3) + ' s'], ['As a percentage of t = ' + fmt(tm, 2) + ' s', fmt(100 * M.biggest(thw, D.s, timer) / tm, 1) + '%'], ['a depends on t², so double it', fmt(uA, 1) + '%']]), el('p', { class: 'fine', text: 'The error is a fixed number of seconds, so a longer time (a longer distance or a gentler slope) makes it a smaller percentage.' })];
    }
    if (st === 'A') {
      var uV = M.accelUncPct(D.th, D.s, 'gate'), ratio = (D.ell - 0.2) / D.s;
      ul.appendChild(drow(r1(M.accelUncPct(D.th, D.s, D.timer)) <= tgt, '% uncertainty in a from the time at s = ' + fmt(D.s, 1) + ' m: <b>' + fmt(M.accelUncPct(D.th, D.s, D.timer), 1) + '%</b> (target &le; ' + fmt(tgt, 1) + '%)', ['Uncertainty in a from the time', stepsFor(D.timer === 'gate' ? 'video' : D.timer)]));
      ul.appendChild(drow(r1(uV) <= tgt, '% uncertainty in a from the light-gate speed: <b>' + fmt(uV, 1) + '%</b> (target &le; ' + fmt(tgt, 1) + '%)', ['Uncertainty in a from the speed', stepsFor('gate')]));
      ul.appendChild(drow(M.longEnough(D.th, D.s, D.timer), 'The shortest timing lasts at least 10 &times; the timer uncertainty: ' + fmt(M.timeFor(D.th, D.s), 2) + ' s vs ' + fmt(10 * M.TIMERS[D.timer].sig, 2) + ' s', ['Long enough?', ['A timing that is not much longer than the timer uncertainty gives a large percentage uncertainty. 10 times is a quick rule of thumb.']]));
      ul.appendChild(drow(r1(ratio) >= 3, 'Your longest distance (' + fmt(D.ell - 0.2, 1) + ' m) is <b>' + fmt(ratio, 1) + ' &times;</b> your shortest (target &ge; 3 &times;)', ['Spread of distances', ['A wide range of distances makes the gradient of the line more certain, because the steepest and shallowest lines through the error bars are closer together.']]));
      out.appendChild(ul);
      out.appendChild(el('p', { class: 'live', html: 'Acceleration ' + fmt(M.accel(D.th), 2) + ' m s<sup>-2</sup>, so the shortest run takes ' + fmt(M.timeFor(D.th, D.s), 2) + ' s. Time sources: timer ±' + fmt(src.timer, 3) + ' s, release &amp; judging ±' + fmt(src.release, 3) + ' s, resolution ±' + fmt(src.resolution, 4) + ' s. The biggest is used.' }));
    } else {
      var sp = M.sinPct(D.th, D.method, D.ell), sr = sinOf(D.thMax) / sinOf(D.th), fr = M.frictionPct(D.th);
      ul.appendChild(drow(r1(uA) <= tgt, '% uncertainty in a at your largest angle (' + fmt(D.thMax, 1) + '°): <b>' + fmt(uA, 1) + '%</b> (target &le; ' + fmt(tgt, 1) + '%)', ['Uncertainty in a', stepsFor(D.timer)]));
      ul.appendChild(drow(r1(sp) <= tgt, '% uncertainty in sin θ at your smallest angle (' + fmt(D.th, 1) + '°): <b>' + fmt(sp, 1) + '%</b> (target &le; ' + fmt(tgt, 1) + '%)', ['Uncertainty in sin θ', [Sim.steps(D.method === 'trig' ? [['Height read with a metre rule: half of 1 mm', '± ' + (M.HEIGHT_SIG * 1000) + ' mm'], ['Δ(sin θ) = Δh ÷ ℓ', (M.HEIGHT_SIG * 1000) + ' mm ÷ ' + fmt(D.ell * 1000, 0) + ' mm = ' + sig(M.sinUnc(D.th, 'trig', D.ell), 2)], ['As a percentage of sin θ = ' + fmt(sinOf(D.th), 3), fmt(sp, 2) + '%']] : [['Protractor, 1° divisions: half the smallest division', '± ' + M.PROTRACTOR_SIG + '°'], ['Δ(sin θ) = cos θ × Δθ (in radians)', '± ' + sig(M.sinUnc(D.th, 'protractor', D.ell), 2)], ['As a percentage of sin θ = ' + fmt(sinOf(D.th), 3), fmt(sp, 1) + '%']]), el('p', { class: 'fine', text: 'The reading error is the same size at every angle, so a bigger angle makes it a smaller percentage. A height measured with a metre rule over a long ramp gives a much smaller error than an angle read from a protractor.' })]]));
      ul.appendChild(drow(M.longEnough(thw, D.s, D.timer), 'The shortest run (at ' + fmt(D.thMax, 1) + '°) lasts at least 10 &times; the timer uncertainty: ' + fmt(tm, 2) + ' s vs ' + fmt(10 * M.TIMERS[D.timer].sig, 2) + ' s', ['Long enough?', ['A timing that is not much longer than the timer uncertainty gives a large percentage uncertainty. 10 times is a quick rule of thumb. The light gate has no timing to check.']]));
      ul.appendChild(drow(r1(sr) >= 4, 'Your largest sin θ is <b>' + fmt(sr, 1) + ' &times;</b> your smallest (target &ge; 4 &times;)', ['Spread of angles', ['A wide range of sin θ makes the gradient and the intercept more certain, because the steepest and shallowest lines through the error bars are closer together.']]));
      ul.appendChild(drow(null, 'Friction changes a by <b>' + fmt(fr, 1) + '%</b> at your smallest angle', ['Friction', ['Friction is a systematic error. It is the same size in every run, so repeating cannot remove it. It is a bigger fraction of the slope force at a small angle, where it shows up as a negative intercept on the graph of a against sin θ. A large angle hides it. Is it better to hide it or to see it?']]));
      out.appendChild(ul);
      out.appendChild(el('p', { class: 'live', html: 'The ramp is ' + fmt(D.ell, 1) + ' m long; the longest distance you could use is ' + fmt(D.ell - 0.2, 1) + ' m.' + (D.s < D.ell - 0.2 - 1e-9 ? ' Using it would give ' + fmt(M.accelUncPct(thw, D.ell - 0.2, D.timer), 1) + '% uncertainty in a at ' + fmt(D.thMax, 1) + '°.' : ' You are using the whole ramp.') }));
    }
  }
  function dbind(id, key) { $(id).addEventListener('input', function (e) { D[key] = +e.target.value; renderDesign(); }); }
  dbind('d-th', 'th'); dbind('d-thmax', 'thMax'); dbind('d-s', 's'); dbind('d-tgt', 'tgt');

  /* ---------- wiring ---------- */
  function applyEll(o, p) {
    var mx = Math.round((o.ell - 0.2) * 10) / 10; $(p + 's').max = mx; if (o.s > mx) o.s = mx; $(p + 's').value = o.s;
  }
  function syncBench() {
    var th = S.th, ro = $('readout'); ro.textContent = '';
    $('o-th').textContent = fmt(th, 1) + '° ± ' + fmt(M.angleUncDeg(th, S.method, S.ell), S.method === 'trig' ? 3 : 1) + '°'; $('o-s').textContent = fmt(S.s, 1) + ' m';
    $('l-th').textContent = S.method === 'trig' ? 'Ramp angle (set by the block height)' : 'Ramp angle, θ';
    $('l-s').textContent = S.stage === 'A' ? 'Distance from start line to finish, s' : 'Distance from start line to finish, s (kept the same)';
    $('l-timer').textContent = S.stage === 'A' ? 'Timer for t (a light gate at the end of the ramp records v)' : 'How you find a';
    var rows = S.method === 'trig' ? [['Height of block, h', Math.round(1000 * M.heightFor(th, S.ell)) + ' mm ± ' + M.HEIGHT_SIG * 1000 + ' mm'], ['Ramp length, ℓ', fmt(S.ell, 1) + ' m'], ['sin θ = h ÷ ℓ', fmt(sinOf(th), 4)], ['θ = sin⁻¹(h ÷ ℓ)', fmt(th, 2) + '°']] : [['Protractor reading, θ', fmt(th, 1) + '° ± ' + M.PROTRACTOR_SIG + '°'], ['sin θ (calculated)', fmt(sinOf(th), 3)]];
    rows.forEach(function (p) { ro.appendChild(el('dt', { text: p[0] })); ro.appendChild(el('dd', { text: p[1] })); });
    resetRig();
  }
  $('c-th').addEventListener('input', function (e) { S.th = +e.target.value; syncBench(); });
  $('c-s').addEventListener('input', function (e) { S.s = +e.target.value; syncBench(); });
  function nudge(d) { S.th = Math.max(1, Math.min(20, Math.round((S.th + d) * 2) / 2)); $('c-th').value = S.th; syncBench(); }
  $('th-').addEventListener('click', function () { nudge(-0.5); }); $('th+').addEventListener('click', function () { nudge(0.5); });
  var ellDraw = seg('seg-ell', ELLS, function () { return S.ell; }, function (v) { S.ell = v; applyEll(S, 'c-'); syncBench(); }, 'ell');
  var methodDraw = seg('seg-method', METHODS, function () { return S.method; }, function (v) { S.method = v; syncBench(); }, 'method');
  var timerDraw = seg('seg-timer', function () { return timerOpts(S.stage); }, function () { return S.timer; }, function (v) { S.timer = v; syncBench(); }, 'timer');
  dEllDraw = seg('dseg-ell', ELLS, function () { return D.ell; }, function (v) { D.ell = v; applyEll(D, 'd-'); renderDesign(); });
  dMethodDraw = seg('dseg-method', METHODS, function () { return D.method; }, function (v) { D.method = v; renderDesign(); });
  dTimerDraw = seg('dseg-timer', function () { return timerOpts(D.stage); }, function () { return D.timer; }, function (v) { D.timer = v; renderDesign(); });
  $('b-run3').addEventListener('click', function () { run(3); watch(true); }); $('b-run1').addEventListener('click', function () { run(1); watch(true); });
  $('b-watch').addEventListener('click', function () { watch(); }); $('b-reset').addEventListener('click', resetRig);
  seg('seg-speed', [[1, 'Real time'], [2, 'Half speed'], [4, 'Quarter speed']], function () { return speed; }, function (v) { speed = v; });
  ['F', 'a', 'v'].forEach(function (k) { $('v-' + k).addEventListener('change', function (e) { vec[k] = e.target.checked; drawRig(); }); });
  $('v-strobe').addEventListener('change', function (e) { vec.strobe = e.target.checked; drawRig(); });
  $('b-clear').addEventListener('click', function () { results.clear(); meta = {}; $('banner').textContent = ''; valShown = false; renderAll(); });

  /* ---------- Step 1: what are you testing? ---------- */
  var CTL = { ell: ['seg-ell'], method: ['seg-method'], th: ['c-th', 'th-', 'th+'], s: ['c-s'], timer: ['seg-timer'] };
  function lock(ids) {
    lockedIds = ids;
    Object.keys(CTL).forEach(function (k) {
      var on = ids.indexOf(k) >= 0;
      CTL[k].forEach(function (id) { var e = $(id); if (e.classList.contains('seg')) [].forEach.call(e.querySelectorAll('button'), function (b) { b.disabled = on; }); else e.disabled = on; });
      var c = $(CTL[k][0]).closest('.ctl'); if (c) c.classList.toggle('locked', on);
    });
  }
  function setS(o) {
    Object.assign(S, o); if (S.stage === 'A' && S.timer === 'gate') S.timer = 'video';
    $('c-th').value = S.th; applyEll(S, 'c-'); ellDraw(); methodDraw(); timerDraw(); syncBench();
  }
  function opt(label, good, msg, lockIds, set) { return { label: label, good: good, msg: msg, lock: lockIds, apply: set ? function () { setS(set); } : null }; }
  function fresh(base) { return function () { setS(Object.assign({}, base)); }; }
  function rampCheck(longS) {
    return { q: 'Should you use the longest ramp you can?', options: [
      opt('Yes', true, 'Yes. A longer ramp allows a longer run, so the timer errors, which are fixed amounts of time, become a smaller percentage. The limit is the space you have in the lab.', [], longS ? { ell: 3, s: longS } : { ell: 3 }),
      opt('No', false, 'A short ramp gives a short run, so the same timer error is a bigger percentage and the readings are less reliable. Try it and look at the % uncertainty in a.', [], { ell: 1, s: 0.8 })] };
  }
  var EXPS = [
    { id: 'A', title: 'Equations of motion', sub: 'Do t² ∝ s and v² ∝ s hold?', ax: [{ q: 's' }, { q: 't' }], dim: 's', stage: 'A',
      ana: 'Plot t against s, then v against s. Both are curves. Change an axis until each is a straight line through the origin. What do the gradients give you? Do the two values of a agree?',
      change: 'distance s from the start line to the finish', measure: 'time t from release, and speed v at the end of the ramp (light gate)', keep: ['angle θ', 'trolley mass', 'released from rest', 'gate position'],
      think: 'Predict: if you double the distance from rest, what happens to the time? To the speed at the end? Sketch t against s and v against s.', apply: fresh(BASE_A),
      checks: [
        { q: 'Should the trolley start from rest every time?', options: [opt('Yes', true, 'Yes. Then u = 0, so s = ½at² and v² = 2as. Release it without a push.', []), opt('No', false, 'Then u is not zero and these simple equations do not apply.', [])] },
        { q: 'Should the angle stay the same while you change the distance?', options: [
          opt('Yes', true, 'Yes. Then a is the same for every run and only s, t and v change.', ['th', 'method']),
          opt('No', false, 'Then a changes between runs, so t² and v² will not be proportional to s.', [])] },
        rampCheck(null)] },
    { id: 'B', title: 'Acceleration and angle', sub: 'Is a = g sin θ? Find g.', ax: [{ q: 'th' }, { q: 'a' }], dim: 'th', stage: 'B',
      ana: 'Plot a against θ. Is it a straight line? Change the x axis until it is, then use the gradient and the intercept to test a = g sin θ. Is the accepted value of g inside your range?',
      change: 'angle θ of the ramp', measure: 'time t or speed v over the same distance s, then work out a', keep: ['distance s', 'trolley mass', 'released from rest', 'timer'],
      think: 'Predict: if you double sin θ, what happens to a? Sketch a against θ. Is it a straight line?', apply: fresh(BASE_B),
      checks: [
        { q: 'Should the distance stay the same while you change the angle?', options: [
          opt('Yes', true, 'Yes. Then only θ changes, and a can be found from the same equation each time.', ['s']),
          opt('No', false, 'Then two things change at once and you cannot tell which one changed a.', [])] },
        { q: 'How should you find the angle?', options: [
          opt('Protractor', false, 'A protractor reading has an uncertainty of ±0.5°, a big percentage of a small angle. Try it and look at the error bars on sin θ.', [], { method: 'protractor' }),
          opt('Trigonometry (height ÷ length)', true, 'Yes. A height read to ±0.5 mm on a long ramp gives a much smaller uncertainty in sin θ, and sin θ is what the graph needs.', [], { method: 'trig' })] },
        rampCheck(null)] }
  ];
  Sim.experiment({ mount: $('exp-card'), defs: EXPS, lock: lock,
    gate: function (on) { $('set-card').inert = on; $('set-card').classList.toggle('gated', on); },
    onChoose: function (d) {
      setDesign(d.stage); $('think-bench').textContent = d.think; AX.set(d.ax[0], d.ax[1]); AXR.set(d.ax[0], d.ax[1]); prefDim = d.dim; seriesSel = ''; valShown = false; $('a-think').textContent = d.ana; renderAll();
    } });

  /* example data: Stage A (t and v against s at 8°) and Stage B (a against angle, video, trigonometry) so the Analyse tab is not empty */
  [0.4, 0.6, 0.8, 1.0, 1.2, 1.4, 1.6].forEach(function (s) { Object.assign(S, BASE_A, { s: s }); run(3); });
  [3, 6, 9, 12, 15, 18].forEach(function (th) { Object.assign(S, BASE_B, { th: th, method: 'trig' }); run(3); });
  Object.assign(S, BASE_A);
  $('c-th').value = S.th; $('c-s').value = S.s;
  $('a-think').textContent = 'Choose an investigation on the Bench tab. Then choose the axes that let you analyse your readings.';
  $('banner').textContent = 'Example data is loaded (Stage A at 8° and Stage B over six angles, both with a video timer). Press Clear data to start your own.';
  syncBench(); renderAll();
  Sim.tabs(document.querySelector('.tabs'));
})();
