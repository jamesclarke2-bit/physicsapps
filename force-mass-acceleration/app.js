/* Force, Mass and Acceleration: UI only. All physics comes from model.js; generic widgets from ../shared/sim.js. */
(function () {
  'use strict';
  var M = window.ForceModel, el = Sim.el, fmt = Sim.fmt, A = Sim.svgel;
  var $ = function (id) { return document.getElementById(id); };
  var S = { nh: 5, k: 0, constant: true, tilt: 0, hanger: true, timer: 'video', x2: 1.0, x1: 0.3 };
  var D = { nh: 5, k: 0, constant: true, tilt: 0, hanger: true, timer: 'video', x2: 1.0, x1: 0.3, tgt: 5 };
  var lockedIds = [], rand = Sim.rng(33), meta = {};
  var results = new Sim.Results({ res: 0.001, dp: 2, rowHead: 'Set-up', empty: 'No readings yet. Press Time 3 runs.' });
  var TOPT = Object.keys(M.TIMERS).map(function (k) { return [k, M.TIMERS[k].short]; });

  function seg(id, options, get, set) {
    var box = $(id);
    function draw() { box.textContent = ''; options.forEach(function (o) { box.appendChild(el('button', { type: 'button', text: o[1], 'aria-pressed': String(get() === o[0]), onclick: function () { set(o[0]); draw(); } })); }); }
    draw(); return draw;
  }
  function sum(a) { return a.reduce(function (x, y) { return x + y; }, 0); }
  function setup(o) { return { nh: o.nh, k: o.k, constant: o.constant, tilt: o.tilt, hanger: o.hanger }; }
  function kg(x) { return fmt(x, 3) + ' kg'; }

  /* ---------- rig ---------- */
  var XL = 20, XS = 90, PX = 270, Y0 = 90, XE = XS + M.TRACK * PX;
  var anim = { x: 0, raf: 0, on: false };
  function drawRig() {
    var svg = $('rig'), th = S.tilt, rad = th * Math.PI / 180, s = setup(S);
    svg.textContent = '';
    svg.setAttribute('viewBox', '0 0 760 ' + Math.round(250 + Math.max(0, M.TRACK * PX * Math.sin(rad))));
    var g = A('g', { transform: 'rotate(' + th + ' ' + XL + ' ' + Y0 + ')' });
    g.appendChild(A('rect', { class: 'track', x: XL, y: Y0, width: XE - XL + 22, height: 8, rx: 2 }));
    for (var i = 0; i <= 20; i++) {
      var X = XS + i * 0.1 * PX, big = i % 5 === 0;
      g.appendChild(A('line', { class: 'tick', x1: X, x2: X, y1: Y0 + 8, y2: Y0 + 8 + (big ? 9 : 5) }));
      if (big) g.appendChild(A('text', { class: 'ticklbl', x: X, y: Y0 + 30, 'text-anchor': 'middle' }, fmt(i * 0.1, 1) + (i === 20 ? ' m' : '')));
    }
    g.appendChild(A('line', { class: 'flag', x1: XS, x2: XS, y1: Y0 - 40, y2: Y0 }));
    g.appendChild(A('text', { class: 'lbl', x: XS, y: Y0 - 44, 'text-anchor': 'middle' }, 'start'));
    var fx = XS + S.x2 * PX;
    if (S.timer === 'gates') {
      [[S.x1, 'gate 1'], [S.x2, 'gate 2']].forEach(function (p) {
        var gx = XS + p[0] * PX; g.appendChild(A('line', { class: 'gate', x1: gx, x2: gx, y1: Y0 - 46, y2: Y0 })); g.appendChild(A('text', { class: 'gatelbl', x: gx, y: Y0 - 50, 'text-anchor': 'middle' }, p[1]));
      });
    } else {
      g.appendChild(A('line', { class: 'flag', x1: fx, x2: fx, y1: Y0 - 40, y2: Y0 })); g.appendChild(A('text', { class: 'lbl', x: fx, y: Y0 - 44, 'text-anchor': 'middle' }, 'finish'));
    }
    var tx = XS + anim.x * PX; // front of trolley
    g.appendChild(A('rect', { class: 'trolley', x: tx - 70, y: Y0 - 26, width: 70, height: 20, rx: 3 }));
    [tx - 54, tx - 16].forEach(function (cx) { g.appendChild(A('circle', { class: 'wheel', cx: cx, cy: Y0 - 3, r: 5 })); });
    var slots = M.slotsOnTrolley(s);
    for (var j = 0; j < slots; j++) g.appendChild(A('rect', { class: 'slot', x: tx - 66 + j * 6, y: Y0 - 34, width: 5, height: 8 }));
    for (var b = 0; b < S.k; b++) g.appendChild(A('rect', { class: 'block', x: tx - 66 + b * 13, y: Y0 - 46, width: 12, height: 12 }));
    if (S.hanger) g.appendChild(A('line', { class: 'string', x1: tx, y1: Y0 - 14, x2: XE + 12, y2: Y0 - 14 }));
    g.appendChild(A('circle', { class: 'pulley', cx: XE + 12, cy: Y0 - 6, r: 8 }));
    svg.appendChild(g);
    // pulley position after tilting, then the vertical string and hanger
    var dx = XE + 12 - XL, px, py;
    px = XL + dx * Math.cos(rad) + 6 * Math.sin(rad); py = Y0 + dx * Math.sin(rad) - 6 * Math.cos(rad);
    if (S.hanger) {
      var hx = px + 8, hy = py + 30 + Math.min(anim.x, 1.0) * 70;
      svg.appendChild(A('line', { class: 'string', x1: hx, y1: py, x2: hx, y2: hy }));
      svg.appendChild(A('rect', { class: 'hanger', x: hx - 14, y: hy, width: 28, height: 8, rx: 1 }));
      for (var q = 0; q < S.nh; q++) svg.appendChild(A('rect', { class: 'slot', x: hx - 11, y: hy + 8 + q * 7, width: 22, height: 6 }));
      svg.appendChild(A('text', { class: 'lbl', x: hx - 20, y: hy + 24, 'text-anchor': 'end' }, 'F = ' + fmt(M.force(s), 2) + ' N'));
    }
    if (S.tilt > 0) svg.appendChild(A('text', { class: 'lbl', x: XL + 6, y: Y0 + 56 }, 'tilt ' + fmt(S.tilt, 1) + '°'));
  }
  function watch() {
    var s = setup(S), a = M.accel(s);
    if (!(a > 0)) { $('banner').textContent = 'The trolley does not move: the pull is not enough to overcome friction.'; return; }
    cancelAnimationFrame(anim.raf); anim.x = 0; anim.on = true;
    var slow = $('c-slow').checked ? 4 : 1, t0 = 0, x2 = S.x2;
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) { anim.x = x2; anim.on = false; drawRig(); return; }
    function step(ts) {
      if (!t0) t0 = ts; var t = (ts - t0) / 1000 / slow, x = 0.5 * a * t * t;
      if (x >= x2) { anim.x = x2; anim.on = false; drawRig(); setTimeout(function () { anim.x = 0; drawRig(); }, 900); return; }
      anim.x = x; drawRig(); anim.raf = requestAnimationFrame(step);
    }
    anim.raf = requestAnimationFrame(step);
  }

  /* ---------- readings ---------- */
  function keyOf(o) { return [o.nh, o.k, o.constant ? 1 : 0, o.tilt.toFixed(1), o.hanger ? 1 : 0, o.timer, o.x2.toFixed(1), o.timer === 'gates' ? o.x1.toFixed(1) : '-'].join('|'); }
  function label(o) {
    var s = setup(o), where = o.timer === 'gates' ? 'gates at ' + fmt(o.x1, 1) + ' m and ' + fmt(o.x2, 1) + ' m' : 's = ' + fmt(o.x2, 2) + ' m';
    return (o.hanger ? 'F = ' + fmt(M.force(s), 2) + ' N' : 'no hanger') + '<span class="sm">m = ' + fmt(M.totalMass(s), 3) + ' kg &middot; ' + where + ' &middot; tilt ' + fmt(o.tilt, 1) + '&deg; &middot; ' + M.TIMERS[o.timer].short + '</span>';
  }
  function run(n) {
    var s = setup(S);
    if (!M.moves(s)) { $('banner').textContent = 'The trolley does not move: the pull is not enough to overcome friction. Add mass to the hanger or tilt the track.'; return; }
    $('banner').textContent = '';
    var o = Object.assign({}, S), k = keyOf(o); o.key = k; o.label = label(o); meta[k] = o;
    for (var i = 0; i < n; i++) {
      if (S.timer === 'gates') { var r = M.measureGates(s, S.x1, S.x2, rand); results.add(k, r.t, { u: r.u, v: r.v }); }
      else results.add(k, M.measureTime(s, S.x2, S.timer, rand));
    }
  }
  /* derived quantities for one row (means and half-ranges of what the student recorded) */
  function calc(o) {
    var st = results.stats(o.key); if (!st.n) return null;
    var out = { st: st, gates: o.timer === 'gates', s: setup(o), d: o.timer === 'gates' ? o.x2 - o.x1 : o.x2 };
    if (!out.gates) {
      out.a = 2 * o.x2 / (st.mean * st.mean); out.pct = 2 * st.pct; out.da = out.a * out.pct / 100;
    } else {
      var us = Sim.stats(results.liveField(o.key, function (r) { return r.meta.u; }), { res: 0.001 }), vs = Sim.stats(results.liveField(o.key, function (r) { return r.meta.v; }), { res: 0.001 });
      out.us = us; out.vs = vs; out.a = (vs.mean * vs.mean - us.mean * us.mean) / (2 * out.d);
      out.da = (2 * vs.mean * vs.half + 2 * us.mean * us.half) / (2 * out.d); out.pct = 100 * out.da / out.a;
      out.a2 = (vs.mean - us.mean) / st.mean; out.a3 = 2 * (out.d - us.mean * st.mean) / (st.mean * st.mean);
    }
    return out;
  }

  /* ---------- pop-ups ---------- */
  function popMean(o, st) {
    var vals = results.live(o.key), total = sum(vals);
    return [Sim.steps([['Add the readings that are not crossed out', vals.map(function (v) { return fmt(v, 2); }).join(' + ') + ' = ' + fmt(total, 2) + ' s'], ['Divide by how many there are', 'mean t = ' + fmt(total, 2) + ' ÷ ' + vals.length + ' = ' + fmt(st.mean, 3) + ' s']])];
  }
  function sourcesNode(o, st) {
    var t = st.mean, src = M.sources(t, o.timer);
    return [el('p', { text: 'Where could the spread in the times come from?' }),
      Sim.steps([['A  Timer / reaction', '± ' + fmt(src.timer, 3) + ' s'], ['B  Releasing the trolley and judging the finish', '± ' + fmt(src.release, 3) + ' s (' + fmt(M.TIMERS[o.timer].rel * 100, 0) + '% of t)'], ['C  Timer resolution', '± ' + fmt(src.resolution, 4) + ' s']]),
      el('p', { text: 'As a first approximation, take the biggest source. The half range of your readings shows it. Repeating does not shrink it, and it cannot show up a fault in every reading, such as friction.' })];
  }
  function popAccel(o, c) {
    if (!c.gates) {
      var st = c.st;
      return [Sim.steps([
        ['Starting from rest, s = ½ a t², so', 'a = 2s ÷ t² = 2 × ' + fmt(o.x2, 2) + ' ÷ ' + fmt(st.mean, 3) + '² = ' + fmt(c.a, 3) + ' m s⁻²'],
        ['Uncertainty in t is half the range', 'Δt = ½ (' + fmt(st.max, 3) + ' − ' + fmt(st.min, 3) + ') = ' + fmt(st.half, 3) + ' s' + (st.half > (st.max - st.min) / 2 + 1e-9 ? ' (raised to half the timer’s smallest division)' : '')],
        ['Percentage uncertainty in t', fmt(st.half, 3) + ' ÷ ' + fmt(st.mean, 3) + ' × 100 = ' + fmt(st.pct, 1) + '%'],
        ['a depends on t², so double the percentage', '% in a = 2 × ' + fmt(st.pct, 1) + ' = ' + fmt(c.pct, 1) + '%'],
        ['Absolute uncertainty', 'Δa = ' + fmt(c.pct, 1) + '% of ' + fmt(c.a, 3) + ' = ± ' + fmt(c.da, 3) + ' m s⁻²']])].concat(sourcesNode(o, st));
    }
    var u = c.us.mean, v = c.vs.mean, t = c.st.mean, d = c.d;
    function row(eq, val) { return [eq, val]; }
    return [el('p', { text: 'Test the SUVAT equations with your means: u = ' + fmt(u, 3) + ' m s⁻¹, v = ' + fmt(v, 3) + ' m s⁻¹, t = ' + fmt(t, 3) + ' s, s = ' + fmt(d, 2) + ' m.' }),
      Sim.steps([
        row('v² = u² + 2as  →  a = (v² − u²) ÷ 2s', '(' + fmt(v * v, 3) + ' − ' + fmt(u * u, 3) + ') ÷ ' + fmt(2 * d, 2) + ' = ' + fmt(c.a, 3) + ' m s⁻²'),
        row('v = u + at  →  a = (v − u) ÷ t', '(' + fmt(v, 3) + ' − ' + fmt(u, 3) + ') ÷ ' + fmt(t, 3) + ' = ' + fmt(c.a2, 3) + ' m s⁻²'),
        row('s = ut + ½at²  →  a = 2(s − ut) ÷ t²', '2(' + fmt(d, 2) + ' − ' + fmt(u * t, 3) + ') ÷ ' + fmt(t * t, 3) + ' = ' + fmt(c.a3, 3) + ' m s⁻²'),
        row('s = ½(u + v)t', fmt(d, 3) + ' compared with ' + fmt(0.5 * (u + v) * t, 3) + ' m')]),
      el('p', { text: 'Do the three values of a agree within their uncertainty? If they do, the equations of motion are supported by your data.' }),
      Sim.steps([['Uncertainty in v² − u²: add the absolute uncertainties', '2vΔv + 2uΔu = 2 × ' + fmt(v, 3) + ' × ' + fmt(c.vs.half, 3) + ' + 2 × ' + fmt(u, 3) + ' × ' + fmt(c.us.half, 3) + ' = ' + fmt(2 * v * c.vs.half + 2 * u * c.us.half, 3)], ['Percentage uncertainty in a', fmt(c.pct, 1) + '%']])];
  }

  function renderResults() {
    results.cfg.rows = Object.keys(meta).map(function (k) { return meta[k]; });
    results.cfg.fields = function (r) {
      var f = [{ label: 't (s)', get: function (rd) { return rd.v; }, dp: 2 }];
      if (r.timer === 'gates') f.push({ label: 'u (m s<sup>-1</sup>)', get: function (rd) { return rd.meta.u; }, dp: 3 }, { label: 'v (m s<sup>-1</sup>)', get: function (rd) { return rd.meta.v; }, dp: 3 });
      return f;
    };
    results.cfg.columns = [
      { head: 'Mean t (s)', cell: function (r, st) { return st.n ? Sim.calcButton(fmt(st.mean, 2), 'Mean time', function () { return popMean(r, st); }) : ''; } },
      { head: '± half range (s)', cell: function (r, st) { return st.n ? fmt(st.half, 2) : ''; } },
      { head: 'a (m s<sup>-2</sup>)', cell: function (r) { var c = calc(r); return c ? Sim.calcButton(fmt(c.a, 3), 'Acceleration', function () { return popAccel(r, c); }) : ''; } },
      { head: '% uncertainty in a', cell: function (r) { var c = calc(r); return c ? Sim.calcButton(fmt(c.pct, 1) + '%', 'Uncertainty in a', function () { return popAccel(r, c); }) : ''; } }
    ];
    results.render($('results'));
    renderPlot();
  }
  results.onChange(renderResults);

  /* ---------- motion graphs tab ---------- */
  function renderGraphs() {
    var s = setup(S), a = M.accel(s), n = 60;
    if (!(a > 0)) { ['g-s', 'g-v', 'g-a'].forEach(function (id) { $(id).textContent = ''; }); $('g-note').textContent = 'With these settings the trolley does not move. Change the set-up on the Bench tab.'; return; }
    var T = M.timeToDistance(a, S.x2), sp = [], vp = [], ap = [];
    for (var i = 0; i <= n; i++) { var t = T * i / n; sp.push([t, 0.5 * a * t * t]); vp.push([t, a * t]); ap.push([t, a]); }
    $('g-note').textContent = 'a = ' + fmt(a, 2) + ' m s⁻², finish at ' + fmt(S.x2, 1) + ' m after ' + fmt(T, 2) + ' s. The area under the v–t graph is ' + fmt(0.5 * a * T * T, 2) + ' m.';
    Sim.plot($('g-s'), { title: 'Distance against time', xlabel: 't / s', ylabel: 's / m', zero: true, lines: [{ pts: sp, colour: '--c1' }] });
    Sim.plot($('g-v'), { title: 'Velocity against time', xlabel: 't / s', ylabel: 'v / m s⁻¹', zero: true, lines: [{ pts: vp, colour: '--c2' }] });
    Sim.plot($('g-a'), { title: 'Acceleration against time', xlabel: 't / s', ylabel: 'a / m s⁻²', zero: true, ymin: 0, ymax: Math.max(a * 1.5, 0.5), lines: [{ pts: ap, colour: '--c3' }] });
  }

  /* ---------- analyse ---------- */
  var PLOTS = {
    aF: { name: 'a against F', ok: function (o) { return o.hanger; }, vary: function (o) { return [o.constant, o.k, o.tilt, o.timer, o.x2, o.timer === 'gates' ? o.x1 : 0]; },
      think: 'With the total mass constant, a against F should be a straight line. Does yours pass through the origin? What does the gradient tell you?' },
    aInvM: { name: 'a against 1/m', ok: function (o) { return o.hanger; }, vary: function (o) { return [o.nh, o.constant, o.tilt, o.timer, o.x2, o.timer === 'gates' ? o.x1 : 0]; },
      think: 'With the force constant, a should be proportional to 1/m. What does the gradient represent?' },
    sT2: { name: 's against t²', ok: function (o) { return o.timer !== 'gates'; }, vary: function (o) { return [o.nh, o.k, o.constant, o.tilt, o.hanger, o.timer]; },
      think: 's = ½ a t² for a start from rest. What should a graph of s against t² look like, and what does its gradient give you?' },
    aSin: { name: 'a against sinθ', ok: function (o) { return !o.hanger; }, vary: function (o) { return [o.k, o.timer, o.x2, o.timer === 'gates' ? o.x1 : 0]; },
      think: 'On a slope with no hanger, a = g sinθ if friction is ignored. What should the gradient be? Does the mass change it?' },
    v2: { name: 'v² − u² against s', ok: function (o) { return o.timer === 'gates'; }, vary: function (o) { return [o.nh, o.k, o.constant, o.tilt, o.hanger, o.x1]; },
      think: 'v² = u² + 2as. What should a graph of v² − u² against s look like, and what does its gradient give you?' }
  };
  var plotType = 'aF', seriesSel = '';
  function labelOfSeries(rows, type) {
    var o = rows[0], parts = [];
    if (type !== 'aInvM') parts.push('hanger ' + (o.hanger ? o.nh + ' masses' : 'off'));
    parts.push(o.constant ? 'total mass constant' : 'mass not kept constant');
    if (type !== 'aInvM') parts.push('extra ' + fmt(0.1 * o.k, 1) + ' kg');
    parts.push('tilt ' + fmt(o.tilt, 1) + '°', M.TIMERS[o.timer].short);
    if (type !== 'sT2' && type !== 'v2') parts.push(o.timer === 'gates' ? 'gates ' + fmt(o.x1, 1) + ' to ' + fmt(o.x2, 1) + ' m' : 's = ' + fmt(o.x2, 1) + ' m');
    return parts.join(' · ') + ' (' + rows.length + ' settings)';
  }
  function groupsFor(type) {
    var P = PLOTS[type], g = {};
    Object.keys(meta).forEach(function (k) { var o = meta[k]; if (!P.ok(o) || !results.stats(k).n) return; var key = P.vary(o).join('|'); (g[key] = g[key] || []).push(o); });
    return Object.keys(g).map(function (k) { return { key: k, rows: g[k] }; }).filter(function (x) { return x.rows.length >= 2; }).sort(function (a, b) { return b.rows.length - a.rows.length; });
  }
  function renderPlot() {
    var P = PLOTS[plotType], gs = groupsFor(plotType), sel = $('sel-series'); sel.textContent = '';
    $('a-think').textContent = P.think; $('a-title').textContent = P.name.replace(/^a against/, 'Acceleration against').replace('s against t²', 'Distance against time squared');
    if (!gs.length) { sel.appendChild(el('option', { text: 'No suitable readings yet' })); Sim.plot($('plot'), { title: P.name, xlabel: '', ylabel: '', points: [] }); $('fit-out').textContent = ''; $('fit-out').appendChild(el('p', { class: 'empty', text: 'Take readings at two or more settings for this graph. Change ' + { aF: 'the number of masses on the hanger', aInvM: 'the extra mass on the trolley', sT2: 'the distance to the finish (stopwatch or video)', v2: 'the second gate position (light gates)', aSin: 'the tilt of the track (hanger removed)' }[plotType] + '.' })); return; }
    gs.forEach(function (x) { sel.appendChild(el('option', { value: x.key, text: labelOfSeries(x.rows, plotType), selected: x.key === seriesSel })); });
    if (!gs.some(function (x) { return x.key === seriesSel; })) seriesSel = gs[0].key;
    sel.value = seriesSel;
    var rows = gs.filter(function (x) { return x.key === seriesSel; })[0].rows, pts = [], xs = [], ys = [], xl, yl;
    rows.forEach(function (o) {
      var c = calc(o), s = c.s, x, y, ex = 0, ey = 0;
      if (plotType === 'aF') { x = M.force(s); y = c.a; ey = c.da; xl = 'F / N'; yl = 'a / m s⁻²'; }
      else if (plotType === 'aInvM') { x = 1 / M.totalMass(s); y = c.a; ey = c.da; xl = '1/m / kg⁻¹'; yl = 'a / m s⁻²'; }
      else if (plotType === 'aSin') { x = Math.sin(o.tilt * Math.PI / 180); y = c.a; ey = c.da; xl = 'sinθ'; yl = 'a / m s⁻²'; }
      else if (plotType === 'sT2') { x = c.st.mean * c.st.mean; ex = 2 * c.st.mean * c.st.half; y = o.x2; xl = 't² / s²'; yl = 's / m'; }
      else { x = c.d; y = c.vs.mean * c.vs.mean - c.us.mean * c.us.mean; ey = 2 * c.vs.mean * c.vs.half + 2 * c.us.mean * c.us.half; xl = 's / m'; yl = 'v² − u² / m² s⁻²'; }
      pts.push({ x: x, y: y, ex: ex, ey: ey }); xs.push(x); ys.push(y);
    });
    var f = Sim.linfit(xs, ys), lines = [], out = $('fit-out'); out.textContent = '';
    var xmax = Math.max.apply(null, xs) * 1.05, o0 = rows[0], s0 = setup(o0);
    if (f) {
      lines.push({ pts: [[0, f.intercept], [xmax, f.intercept + f.slope * xmax]], colour: '--c1' });
      var ideal = M.idealAccel(s0), slope = { aF: 1 / M.totalMass(s0), aInvM: M.force(s0), sT2: ideal / 2, v2: 2 * ideal, aSin: M.G }[plotType];
      if ($('chk-model').checked) lines.push({ pts: [[0, 0], [xmax, slope * xmax]], colour: '--c2', dash: '6 4' });
      var gu = { aF: 'kg⁻¹', aInvM: 'N', sT2: 'm s⁻²', v2: 'm s⁻²', aSin: 'm s⁻²' }[plotType], iu = { aF: 'm s⁻²', aInvM: 'm s⁻²', sT2: 'm', v2: 'm² s⁻²', aSin: 'm s⁻²' }[plotType];
      var tbl = el('table', { class: 'kv' }, el('tr', null, el('td', { text: 'Gradient' }), el('td', { text: fmt(f.slope, 3) + ' ' + gu })), el('tr', null, el('td', { text: 'Intercept' }), el('td', { text: fmt(f.intercept, 3) + ' ' + iu })));
      if (plotType === 'aF') tbl.appendChild(el('tr', null, el('td', { text: '1 ÷ gradient' }), el('td', { text: fmt(1 / f.slope, 3) + ' kg' })));
      if (plotType === 'aInvM') tbl.appendChild(el('tr', null, el('td', { text: 'Gradient = force' }), el('td', { text: fmt(f.slope, 2) + ' N' })));
      if (plotType === 'sT2') tbl.appendChild(el('tr', null, el('td', { text: 'a = 2 × gradient' }), el('td', { text: fmt(2 * f.slope, 3) + ' m s⁻²' })));
      if (plotType === 'aSin') tbl.appendChild(el('tr', null, el('td', { text: 'g = gradient' }), el('td', { text: fmt(f.slope, 2) + ' m s⁻²' })));
      if (plotType === 'v2') tbl.appendChild(el('tr', null, el('td', { text: 'a = gradient ÷ 2' }), el('td', { text: fmt(f.slope / 2, 3) + ' m s⁻²' })));
      out.appendChild(tbl);
      var q = { aF: 'What should the gradient equal? What is the mass of the trolley and hanger? If the line does not pass through the origin, what could cause it?', aInvM: 'What should the gradient equal? What does a non-zero intercept tell you about every reading?', sT2: 'Does the line pass through the origin? What does a straight line show about the acceleration?', aSin: 'What should the gradient equal? Does an intercept below zero suggest friction? Repeat with extra mass: does the line change?', v2: 'Compare this value of a with the one from your time readings. Do they agree within the uncertainty?' }[plotType];
      out.appendChild(el('p', { class: 'fine', text: q }));
    }
    Sim.plot($('plot'), { title: P.name, xlabel: xl, ylabel: yl, zero: true, points: pts, lines: lines });
  }

  /* ---------- design ---------- */
  function renderDesign() {
    $('od-nh').textContent = D.nh; $('od-tilt').textContent = fmt(D.tilt, 2) + '°'; $('od-x2').textContent = fmt(D.x2, 1) + ' m'; $('od-tgt').textContent = fmt(D.tgt, 1) + '%';
    var s = setup(D), out = $('d-out'); out.textContent = '';
    if (!M.moves(s)) { out.appendChild(el('p', { class: 'empty', text: 'The trolley does not move with these settings. Add mass to the hanger or tilt the track.' })); return; }
    var a = M.accel(s), x1 = D.timer === 'gates' ? 0.3 : 0, u = M.accelUncPct(s, x1, D.x2, D.timer), fr = M.frictionEffectPct(s);
    var t = D.timer === 'gates' ? M.gateRun(a, x1, D.x2).t : M.timeToDistance(a, D.x2), src = M.sources(t, D.timer);
    function row(ok, text, info) {
      return el('li', null, el('span', { class: ok ? 'ok' : 'no', role: 'img', 'aria-label': ok ? 'passed' : 'not passed', text: ok ? '✓' : '✗' }), el('span', { html: text }),
        info ? el('button', { class: 'info', type: 'button', 'aria-label': 'Explain this check', text: 'i', onclick: function () { Sim.pop.open(info[0], info[1]); } }) : el('span'));
    }
    out.appendChild(el('ul', { class: 'checks' },
      row(u <= D.tgt, '% uncertainty in a: <b>' + fmt(u, 1) + '%</b> (target &le; ' + fmt(D.tgt, 1) + '%)', ['Uncertainty in a', [Sim.steps(D.timer === 'gates' ? [['Gate speeds have an uncertainty of about 1% each', 'so v² − u² has about 2% plus a bit more'], ['Percentage uncertainty in a', fmt(u, 1) + '%']] : [['Biggest single source of error in the time', fmt(M.biggest(t, D.timer), 3) + ' s'], ['As a percentage of t = ' + fmt(t, 2) + ' s', fmt(100 * M.biggest(t, D.timer) / t, 1) + '%'], ['a depends on t², so double it', fmt(u, 1) + '%']])]]),
      row(M.longEnough(s, x1, D.x2, D.timer), 'Timing lasts at least 10 &times; the timer uncertainty: ' + fmt(t, 2) + ' s vs ' + fmt(10 * M.TIMERS[D.timer].sig, 2) + ' s', ['Long enough?', ['A timing that is not much longer than the timer uncertainty gives a large percentage uncertainty. 10 times is a quick rule of thumb. A longer distance or a slower trolley gives a longer time.']]),
      row(fr <= M.FRICTION_PCT, 'Friction changes a by <b>' + fmt(fr, 1) + '%</b> (target &le; ' + M.FRICTION_PCT + '%)', ['Friction', ['Friction is a systematic error: it is the same in every reading, so repeating cannot remove it, and it shows up as an intercept on your graph. Tilting the track slightly lets the trolley’s weight component cancel the friction.']])));
    out.appendChild(el('p', { class: 'live', html: 'Acceleration ' + fmt(a, 2) + ' m s<sup>-2</sup>. Sources for the time of ' + fmt(t, 2) + ' s: timer ±' + fmt(src.timer, 3) + ' s, release &amp; judging ±' + fmt(src.release, 3) + ' s, resolution ±' + fmt(src.resolution, 4) + ' s. The biggest is used.' }));
  }

  /* ---------- wiring ---------- */
  function syncBench() {
    var s = setup(S);
    $('o-nh').textContent = S.nh; $('o-k').textContent = fmt(0.1 * S.k, 1) + ' kg'; $('o-tilt').textContent = fmt(S.tilt, 1) + '°';
    $('l-x2').textContent = S.timer === 'gates' ? 'Second gate position' : 'Distance to finish, s'; $('o-x2').textContent = fmt(S.x2, 1) + ' m';
    $('x1box').hidden = S.timer !== 'gates'; $('o-x1').textContent = fmt(S.x1, 1) + ' m';
    $('c-nh').disabled = !S.hanger || lockedIds.indexOf('nh') >= 0; $('c-const').disabled = !S.hanger || lockedIds.indexOf('const') >= 0;
    var ro = $('readout'); ro.textContent = '';
    [['Hanger weight, F', S.hanger ? fmt(M.force(s), 2) + ' N' : '0 N'], ['Trolley mass', kg(M.trolleyMass(s))], ['Hanger mass', kg(M.hangerMass(s))], ['Total mass, m', kg(M.totalMass(s))]].forEach(function (p) { ro.appendChild(el('dt', { text: p[0] })); ro.appendChild(el('dd', { text: p[1] })); });
    drawRig(); renderGraphs();
  }
  function bind(id, key, num) { $(id).addEventListener('input', function (e) { S[key] = num ? +e.target.value : e.target.checked; if (key === 'x2' && S.timer === 'gates' && S.x2 <= S.x1 + 0.05) S.x2 = Math.round((S.x1 + 0.1) * 10) / 10; if (key === 'x1' && S.x1 >= S.x2) S.x1 = Math.round((S.x2 - 0.1) * 10) / 10; syncBench(); }); }
  bind('c-nh', 'nh', true); bind('c-k', 'k', true); bind('c-tilt', 'tilt', true); bind('c-x2', 'x2', true); bind('c-x1', 'x1', true); bind('c-const', 'constant', false); bind('c-hanger', 'hanger', false);
  function nudge(d) { S.tilt = Math.max(0, Math.min(20, Math.round((S.tilt + d) * 10) / 10)); $('c-tilt').value = S.tilt; syncBench(); }
  $('tilt-').addEventListener('click', function () { nudge(-0.1); }); $('tilt+').addEventListener('click', function () { nudge(0.1); });
  timerDraw = seg('seg-timer', TOPT, function () { return S.timer; }, function (v) { S.timer = v; if (v === 'gates' && S.x2 <= S.x1) S.x2 = Math.min(1.8, S.x1 + 0.7); $('c-x2').value = S.x2; syncBench(); });
  $('b-run3').addEventListener('click', function () { run(3); }); $('b-run1').addEventListener('click', function () { run(1); });
  $('b-watch').addEventListener('click', watch);
  $('b-clear').addEventListener('click', function () { results.clear(); meta = {}; $('banner').textContent = ''; renderResults(); });
  plotDraw = seg('seg-plot', Object.keys(PLOTS).map(function (k) { return [k, PLOTS[k].name]; }), function () { return plotType; }, function (v) { plotType = v; seriesSel = ''; renderPlot(); });
  $('sel-series').addEventListener('change', function (e) { seriesSel = e.target.value; renderPlot(); });
  $('chk-model').addEventListener('change', renderPlot);
  function dbind(id, key) { $(id).addEventListener('input', function (e) { D[key] = +e.target.value; renderDesign(); }); }
  dbind('d-nh', 'nh'); dbind('d-tilt', 'tilt'); dbind('d-x2', 'x2'); dbind('d-tgt', 'tgt');
  seg('dseg-timer', TOPT, function () { return D.timer; }, function (v) { D.timer = v; renderDesign(); });


  /* ---------- Step 1: what are you testing? ---------- */
  var timerDraw, plotDraw;
  var CTL = { nh: ['c-nh'], const: ['c-const'], k: ['c-k'], tilt: ['c-tilt', 'tilt-', 'tilt+'], hanger: ['c-hanger'], timer: ['seg-timer'], x2: ['c-x2'], x1: ['c-x1'] };
  function lock(ids) {
    lockedIds = ids;
    Object.keys(CTL).forEach(function (k) {
      var on = ids.indexOf(k) >= 0;
      CTL[k].forEach(function (id) {
        var e = $(id);
        if (e.classList.contains('seg')) [].forEach.call(e.querySelectorAll('button'), function (b) { b.disabled = on; });
        else e.disabled = on || ((k === 'nh' || k === 'const') && !S.hanger);
      });
      var c = $(CTL[k][0]).closest('.ctl'); if (c) c.classList.toggle('locked', on);
    });
  }
  function setS(o) {
    Object.assign(S, o);
    $('c-nh').value = S.nh; $('c-const').checked = S.constant; $('c-k').value = S.k; $('c-tilt').value = S.tilt; $('c-hanger').checked = S.hanger; $('c-x2').value = S.x2; $('c-x1').value = S.x1;
    timerDraw(); syncBench();
  }
  var BASE = { nh: 5, k: 0, constant: true, tilt: 0, hanger: true, timer: 'video', x2: 1.0, x1: 0.3 };
  var ALL = ['nh', 'const', 'k', 'tilt', 'hanger', 'timer', 'x2', 'x1'];
  function except(list) { return ALL.filter(function (x) { return list.indexOf(x) < 0; }); }
  function opt(label, good, msg, lockIds, set) { return { label: label, good: good, msg: msg, lock: lockIds, apply: set ? function () { setS(set); } : null }; }
  function fresh(o) { return function () { setS(Object.assign({}, BASE, o || {})); }; }
  var EXPS = [
    { id: 'force', title: 'Force and acceleration', sub: 'Does a depend on F?', plot: 'aF', change: 'force F (masses on the hanger)', measure: 'acceleration a, from the time t over a fixed distance s', keep: ['total mass m', 'distance s', 'track tilt', 'timer'],
      think: 'Predict: if you double the pulling force and keep the total mass the same, what happens to the acceleration?', apply: fresh(),
      checks: [{ q: 'Should the total mass stay the same while you change F?', options: [
        opt('Yes', true, 'Yes. Moving masses from the trolley to the hanger changes F but not the total mass.', except(['nh']), { constant: true }),
        opt('No', false, 'Then the mass being accelerated changes as well as F, so you cannot tell which caused the change in a. Try it, then compare the graph with the constant-mass version.', except(['nh', 'const']), { constant: false })] }] },
    { id: 'mass', title: 'Mass and acceleration', sub: 'Does a depend on m?', plot: 'aInvM', change: 'total mass m (extra blocks on the trolley)', measure: 'acceleration a, from the time t over a fixed distance s', keep: ['pulling force F', 'distance s', 'track tilt', 'timer'],
      think: 'Predict: if you double the total mass and keep the force the same, what happens to the acceleration?', apply: fresh(),
      checks: [{ q: 'Should the pulling force stay the same while you change the mass?', options: [
        opt('Yes', true, 'Yes. Keep the hanger the same and add mass to the trolley.', except(['k'])),
        opt('No', false, 'Then F and m both change, so you cannot tell which one changed a.', except(['k', 'nh']))] }] },
    { id: 'distance', title: 'Distance and time', sub: 'Does s = ½at² hold?', plot: 'sT2', change: 'distance s to the finish', measure: 'time t from release', keep: ['force F', 'total mass m', 'track tilt', 'timer'],
      think: 'Predict: what graph of s against t² should you get if the acceleration is constant?', apply: fresh({ timer: 'video' }),
      checks: [
        { q: 'Should the trolley start from rest every time?', options: [
          opt('Yes', true, 'Yes. Then u = 0 and s = ½at² applies.', []),
          opt('No', false, 'Then u is not zero and s = ½at² is not enough. Use two light gates (the equations of motion experiment).', [])] },
        { q: 'Should F and m stay the same while you change s?', options: [
          opt('Yes', true, 'Yes. Then a is constant and only s and t change.', except(['x2', 'timer'])),
          opt('No', false, 'Then a changes between runs, and s against t² will not be a straight line.', except(['x2', 'timer', 'nh', 'k']))] }] },
    { id: 'suvat', title: 'Equations of motion', sub: 'Do the SUVAT equations agree?', plot: 'v2', change: 'position of gate 2 (distance s between the gates)', measure: 'u, v and t from the light gates', keep: ['force F', 'total mass m', 'gate 1 position', 'track tilt'],
      think: 'Predict: will a worked out from v = u + at, s = ut + ½at² and v² = u² + 2as give the same value?', apply: fresh({ timer: 'gates', x1: 0.3, x2: 1.2 }),
      checks: [{ q: 'Should gate 1 stay in the same place while you move gate 2?', options: [
        opt('Yes', true, 'Yes. u stays the same and only the distance between the gates changes.', except(['x2'])),
        opt('No', false, 'Then u and s both change together, which makes the graph harder to interpret.', except(['x2', 'x1']))] }] },
    { id: 'ramp', title: 'Ramp', sub: 'Does mass matter on a slope?', plot: 'aSin', change: 'tilt of the track, then the mass', measure: 'acceleration a, from the time t over a fixed distance s', keep: ['distance s', 'timer', 'no hanger'],
      think: 'Predict: on a slope with no hanger, does a heavier trolley accelerate faster, slower or at the same rate?', apply: fresh({ hanger: false, tilt: 6 }),
      checks: [{ q: 'Should the hanger stay attached?', options: [
        opt('Yes', false, 'Then the hanger’s weight pulls as well, so a does not depend only on the slope. Try it and see.', except(['tilt', 'hanger', 'k', 'nh']), { hanger: true }),
        opt('No', true, 'Yes, remove it. With only the slope pulling, a = g sinθ and the mass cancels. Then try adding mass to the trolley.', except(['tilt', 'k']), { hanger: false })] }] },
    { id: 'free', title: 'Free explore', sub: 'Change anything', plot: 'aF', change: 'anything', measure: 'time t (and u, v with the gates)', keep: ['nothing is locked'],
      think: 'Try changing one thing at a time. What do you notice?', apply: fresh(), checks: [] }
  ];
  Sim.experiment({ mount: $('exp-card'), defs: EXPS, lock: lock,
    gate: function (on) { $('set-card').inert = on; $('set-card').classList.toggle('gated', on); },
    onChoose: function (d) { $('think-bench').textContent = d.think; plotType = d.plot; seriesSel = ''; plotDraw(); renderPlot(); } });

  /* example data: a against F with the total mass constant, flat track (friction not compensated), video timing */
  [2, 4, 6, 8, 10].forEach(function (n) { S.nh = n; S.timer = 'video'; run(3); });
  S.nh = 5; S.timer = 'video';
  $('banner').textContent = 'Example data is loaded (a against F, flat track). Press Clear data to start your own.';
  syncBench(); renderResults(); renderDesign();
  Sim.tabs(document.querySelector('.tabs'), { onChange: function (n) { if (n === 'graphs') renderGraphs(); } });
})();
