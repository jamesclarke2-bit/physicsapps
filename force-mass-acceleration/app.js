/* Force, Mass and Acceleration: UI only. All physics comes from model.js; generic widgets from ../shared/sim.js. */
(function () {
  'use strict';
  var M = window.ForceModel, el = Sim.el, fmt = Sim.fmt, A = Sim.svgel;
  var $ = function (id) { return document.getElementById(id); };
  var S = { nh: 5, k: 0, constant: true, tilt: 0, hanger: true, timer: 'video', x2: 1.0, x1: 0.3 };
  var D = { nh: 5, k: 0, constant: true, tilt: 0, hanger: true, timer: 'video', x2: 1.0, x1: 0.3, tgt: 5 }, DES = null;
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
  var anim = { x: 0, v: 0, t: 0, raf: 0, on: false, ghosts: [] }, vec = { F: false, a: false, v: false, strobe: true }, speed = 2;
  function drawRig() {
    var svg = $('rig'), th = S.tilt, rad = th * Math.PI / 180, s = setup(S);
    svg.textContent = '';
    svg.setAttribute('viewBox', '0 -48 760 ' + Math.round(298 + Math.max(0, M.TRACK * PX * Math.sin(rad))));
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
    if (vec.strobe) anim.ghosts.forEach(function (gx) { if (Math.abs(gx - anim.x) > 0.015) g.appendChild(A('rect', { class: 'ghost', x: XS + gx * PX - 70, y: Y0 - 26, width: 70, height: 20, rx: 3 })); });
    g.appendChild(A('rect', { class: 'trolley', x: tx - 70, y: Y0 - 26, width: 70, height: 20, rx: 3 }));
    [tx - 54, tx - 16].forEach(function (cx) { g.appendChild(A('circle', { class: 'wheel', cx: cx, cy: Y0 - 3, r: 5 })); });
    var slots = M.slotsOnTrolley(s);
    for (var j = 0; j < slots; j++) g.appendChild(A('rect', { class: 'slot', x: tx - 66 + j * 6, y: Y0 - 34, width: 5, height: 8 }));
    for (var b = 0; b < S.k; b++) g.appendChild(A('rect', { class: 'block', x: tx - 66 + b * 13, y: Y0 - 46, width: 12, height: 12 }));
    if (S.hanger) g.appendChild(A('line', { class: 'string', x1: tx, y1: Y0 - 14, x2: XE + 12, y2: Y0 - 14 }));
    g.appendChild(A('circle', { class: 'pulley', cx: XE + 12, cy: Y0 - 6, r: 8 }));
    vectors(g, tx);
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
  var VSCALE = { F: 80, a: 36, v: 46 };
  function vectors(g, tx) {
    var s = setup(S), mv = M.moves(s), F = mv ? M.netForce(s) : 0, a = mv ? M.accel(s) : 0;
    var items = [['F', F, 'net force ' + fmt(F, 2) + ' N'], ['a', a, 'acceleration ' + fmt(a, 2) + ' m s⁻²'], ['v', anim.v, 'velocity ' + fmt(anim.v, 2) + ' m s⁻¹']].filter(function (it) { return vec[it[0]]; });
    items.forEach(function (it, i) {
      var y = Y0 - 70 - 22 * i, L = Math.min(170, VSCALE[it[0]] * it[1]), x0 = tx - 35;
      if (L > 2) {
        g.appendChild(A('line', { class: 'vec vec-' + it[0], x1: x0, y1: y, x2: x0 + L - 6, y2: y }));
        g.appendChild(A('polygon', { class: 'vech-' + it[0], points: (x0 + L) + ',' + y + ' ' + (x0 + L - 10) + ',' + (y - 5) + ' ' + (x0 + L - 10) + ',' + (y + 5) }));
      }
      g.appendChild(A('text', { class: 'vlbl vlbl-' + it[0], x: x0, y: y - 6 }, it[2]));
    });
  }
  function resetRig() { cancelAnimationFrame(anim.raf); anim.x = 0; anim.v = 0; anim.t = 0; anim.on = false; anim.ghosts = []; drawRig(); }
  function watch(quiet) {
    var s = setup(S), a = M.accel(s);
    if (!(a > 0)) { if (quiet !== true) $('banner').textContent = 'The trolley does not move: the pull is not enough to overcome friction.'; return; }
    resetRig(); anim.on = true;
    var t0 = 0, x2 = S.x2, tEnd = Math.sqrt(2 * x2 / a), dts = [0.1, 0.2, 0.25, 0.5, 1], dt = dts.filter(function (d) { return tEnd / d <= 8; })[0] || 1, nextS = 0;
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
      Sim.steps([['A  Timer / reaction', '± ' + fmt(src.timer, 3) + ' s'], ['B  Releasing the trolley and judging the finish', '± ' + fmt(src.release, 3) + ' s (the same for any distance)'], ['C  Timer resolution', '± ' + fmt(src.resolution, 4) + ' s']]),
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
  /* ---------- analyse: the student chooses the axes ---------- */
  var QS = [
    { id: 'F', label: 'F', name: 'Force from the hanger, F', unit: { N: 1 }, tfs: ['none', 'inv', 'sq', 'sqrt'] },
    { id: 'm', label: 'm', name: 'Total mass, m', unit: { kg: 1 }, tfs: ['none', 'inv', 'sq', 'sqrt'] },
    { id: 'a', label: 'a', name: 'Acceleration, a', unit: { m: 1, s: -2 }, tfs: ['none', 'inv', 'sq', 'sqrt'] },
    { id: 't', label: 't', name: 'Time, t', unit: { s: 1 }, tfs: ['none', 'inv', 'sq', 'sqrt'] },
    { id: 's', label: 's', name: 'Distance, s', unit: { m: 1 }, tfs: ['none', 'inv', 'sq', 'sqrt'] },
    { id: 'th', label: 'θ', name: 'Tilt angle, θ', unit: { deg: 1 }, tfs: ['none', 'sin'] },
    { id: 'u', label: 'u', name: 'Speed at gate 1, u', unit: { m: 1, s: -1 }, tfs: ['none', 'inv', 'sq', 'sqrt'] },
    { id: 'v', label: 'v', name: 'Speed at gate 2, v', unit: { m: 1, s: -1 }, tfs: ['none', 'inv', 'sq', 'sqrt'] }
  ];
  function qget(o, id) {
    var c = calc(o); if (!c) return null; var s = c.s;
    switch (id) {
      case 'F': return o.hanger ? { v: M.force(s), u: 0 } : null;
      case 'm': return { v: M.totalMass(s), u: 0 };
      case 'a': return { v: c.a, u: c.da };
      case 't': return { v: c.st.mean, u: c.st.half };
      case 's': return { v: c.d, u: 0 };
      case 'th': return { v: o.tilt, u: M.TILT_SIG };
      case 'u': return c.gates ? { v: c.us.mean, u: c.us.half } : null;
      case 'v': return c.gates ? { v: c.vs.mean, u: c.vs.half } : null;
    }
    return null;
  }
  var KNOWN = [
    { key: 'a:none|F:none', model: function (s) { return { slope: 1 / M.totalMass(s), intercept: 0 }; }, extras: function (f) { return [['1 ÷ gradient', fmt(1 / f.slope, 3) + ' kg']]; },
      q: 'What should the gradient equal? What is the mass of the trolley and hanger? If the line does not pass through the origin, what could cause it?' },
    { key: 'a:none|m:inv', model: function (s) { return { slope: M.force(s), intercept: 0 }; }, extras: function (f) { return [['Gradient = force', fmt(f.slope, 2) + ' N']]; },
      q: 'What should the gradient equal? What does a non-zero intercept tell you about every reading?' },
    { key: 'a:inv|m:none', model: function (s) { return { slope: 1 / M.force(s), intercept: 0 }; }, extras: function (f) { return [['1 ÷ gradient = force', fmt(1 / f.slope, 2) + ' N']]; },
      q: 'Why is 1/a proportional to m? What does 1 ÷ gradient give you?' },
    { key: 'F:none|a:none', model: function (s) { return { slope: M.totalMass(s), intercept: 0 }; }, extras: function (f) { return [['Gradient = mass', fmt(f.slope, 3) + ' kg']]; },
      q: 'F against a: what does the gradient represent? Does it match the total mass?' },
    { key: 's:none|t:sq', model: function (s) { return { slope: M.idealAccel(s) / 2, intercept: 0 }; }, extras: function (f) { return [['a = 2 × gradient', fmt(2 * f.slope, 3) + ' m s⁻²']]; },
      q: 'Does the line pass through the origin? What does a straight line show about the acceleration?' },
    { key: 't:sq|s:none', model: function (s) { return { slope: 2 / M.idealAccel(s), intercept: 0 }; }, extras: function (f) { return [['a = 2 ÷ gradient', fmt(2 / f.slope, 3) + ' m s⁻²']]; },
      q: 'What does the gradient of t² against s give you? How is it related to a?' },
    { key: 'v:sq|s:none', model: function (s, o) { return { slope: 2 * M.idealAccel(s), intercept: 2 * M.idealAccel(s) * (o.timer === 'gates' ? o.x1 : 0) }; },
      extras: function (f) { var r = [['a = gradient ÷ 2', fmt(f.slope / 2, 3) + ' m s⁻²']]; if (f.intercept > 0) r.push(['u = √intercept', fmt(Math.sqrt(f.intercept), 3) + ' m s⁻¹']); return r; },
      q: 'v² = u² + 2as. What does the gradient give you? What does the intercept represent?' },
    { key: 'a:none|th:sin', model: function () { return { slope: M.G, intercept: 0 }; }, extras: function (f) { return [['g = gradient', fmt(f.slope, 2) + ' m s⁻²'], ['% uncertainty in sinθ at the smallest tilt', 'see the design tab']]; },
      q: 'What should the gradient equal? Does an intercept below zero suggest friction? Repeat with extra mass: does the line change?' }
  ];
  var AX = Sim.axes({ mount: $('axes'), quantities: QS, get: qget, x: { q: 'F' }, y: { q: 'a' }, known: KNOWN, onChange: function () { renderPlot(); } });
  var seriesSel = '', prefDim = 'nh';
  var DIMS = [['nh', 'masses on the hanger'], ['k', 'extra mass on the trolley'], ['x2', 'distance (or second gate)'], ['tilt', 'tilt of the track'], ['x1', 'first gate position']];
  var KEYS = ['nh', 'k', 'constant', 'tilt', 'hanger', 'timer', 'x2', 'x1'];
  function vstr(o, k) { return k === 'tilt' || k === 'x2' || k === 'x1' ? o[k].toFixed(1) : String(o[k]); }
  function seriesLabel(rows, dim) {
    var o = rows[0], parts = [];
    if (dim !== 'nh') parts.push('hanger ' + (o.hanger ? o.nh + ' masses' : 'off'));
    parts.push(o.constant ? 'total mass constant' : 'mass not kept constant');
    if (dim !== 'k') parts.push('extra ' + fmt(0.1 * o.k, 1) + ' kg');
    if (dim !== 'tilt') parts.push('tilt ' + fmt(o.tilt, 1) + '°');
    parts.push(M.TIMERS[o.timer].short);
    if (dim !== 'x2') parts.push(o.timer === 'gates' ? 'second gate ' + fmt(o.x2, 1) + ' m' : 's = ' + fmt(o.x2, 1) + ' m');
    if (o.timer === 'gates' && dim !== 'x1') parts.push('first gate ' + fmt(o.x1, 1) + ' m');
    var dn = DIMS.filter(function (d) { return d[0] === dim; })[0][1];
    return 'Changing ' + dn + ' (' + rows.length + ' settings) · ' + parts.join(' · ');
  }
  function groups() {
    var res = [];
    DIMS.forEach(function (d) {
      var g = {};
      Object.keys(meta).forEach(function (k) {
        var o = meta[k]; if (!results.stats(k).n) return;
        var key = d[0] + '#' + KEYS.filter(function (x) { return x !== d[0] && !(x === 'x1' && o.timer !== 'gates'); }).map(function (x) { return vstr(o, x); }).join('|');
        (g[key] = g[key] || []).push(o);
      });
      Object.keys(g).forEach(function (key) { var vals = {}; g[key].forEach(function (r) { vals[vstr(r, d[0])] = 1; }); if (Object.keys(vals).length >= 2) res.push({ key: key, dim: d[0], rows: g[key] }); });
    });
    return res.sort(function (p, q) { return (q.dim === prefDim) - (p.dim === prefDim) || q.rows.length - p.rows.length; });
  }
  function renderPlot() {
    var gs = groups(), sel = $('sel-series'), out = $('fit-out'); sel.textContent = ''; out.textContent = '';
    $('a-title').textContent = AX.title();
    function none(msg) { Sim.plot($('plot'), { title: AX.title(), xlabel: AX.xlabel(), ylabel: AX.ylabel(), points: [] }); out.appendChild(el('p', { class: 'empty', text: msg })); $('model-row').hidden = true; }
    if (!gs.length) { sel.appendChild(el('option', { text: 'No suitable readings yet' })); none('Take readings at two or more settings where you change only one thing (for example the number of masses on the hanger).'); return; }
    gs.forEach(function (x) { sel.appendChild(el('option', { value: x.key, text: seriesLabel(x.rows, x.dim), selected: x.key === seriesSel })); });
    if (!gs.some(function (x) { return x.key === seriesSel; })) seriesSel = gs[0].key;
    sel.value = seriesSel;
    var rows = gs.filter(function (x) { return x.key === seriesSel; })[0].rows, pts = AX.collect(rows);
    if (pts.length < 2) { none('These two quantities are not both available for these readings (u and v need the light gates; F needs the hanger). Choose different axes.'); return; }
    var xs = pts.map(function (p) { return p.x; }), ys = pts.map(function (p) { return p.y; }), f = Sim.linfit(xs, ys), lines = [], kn = AX.known(), o0 = rows[0], s0 = setup(o0);
    $('model-row').hidden = !kn;
    if (f) {
      var xmax = Math.max.apply(null, xs) * 1.05, xmin = Math.min(0, Math.min.apply(null, xs));
      lines.push({ pts: [[xmin, f.intercept + f.slope * xmin], [xmax, f.intercept + f.slope * xmax]], colour: '--c1' });
      if (kn && $('chk-model').checked) { var ml = kn.model(s0, o0); lines.push({ pts: [[xmin, ml.intercept + ml.slope * xmin], [xmax, ml.intercept + ml.slope * xmax]], colour: '--c2', dash: '6 4' }); }
      var tbl = AX.fitTable(f);
      if (kn) kn.extras(f).forEach(function (r) { tbl.appendChild(el('tr', null, el('td', { text: r[0] }), el('td', { text: r[1] }))); });
      out.appendChild(tbl);
      out.appendChild(el('p', { class: 'fine', text: kn ? kn.q : 'Is the line straight? If not, change an axis (1 ÷ it, squared, square root) until it is. What does the gradient have units of, and which quantity could that be?' }));
    }
    Sim.plot($('plot'), { title: AX.title(), xlabel: AX.xlabel(), ylabel: AX.ylabel(), zero: true, points: pts, lines: lines });
  }

  /* ---------- design (depends on the experiment chosen) ---------- */
  var DESIGNS = {
    force: { show: ['nh', 'tilt', 'timer', 'x2', 'tgt'], labels: { nh: 'Force: slotted masses on the hanger' }, set: {},
      think: 'Which force is hardest to measure well: the smallest or the largest? Check both.',
      note: 'You will use several forces. The biggest force gives the shortest time, so the biggest % uncertainty. The smallest force gives the biggest friction effect. Slide the force and watch both.' },
    mass: { show: ['nh', 'k', 'tilt', 'timer', 'x2', 'tgt'], labels: { nh: 'Force kept the same: masses on the hanger', k: 'Extra mass on the trolley' }, set: { nh: 4 },
      think: 'The force stays the same. Which trolley is hardest to measure well: the lightest or the heaviest?',
      note: 'The heaviest trolley accelerates least, so friction is a bigger fraction of the force. The lightest accelerates most, so its time is shortest. Check both ends.' },
    distance: { show: ['nh', 'tilt', 'timer', 'x2', 'tgt'], labels: { nh: 'Force kept the same: masses on the hanger', x2: 'Shortest distance you will use' }, set: { x2: 0.4 },
      think: 'Each timer error is a fixed number of seconds. What does that do to the percentage uncertainty as the distance gets longer?',
      note: 'The timer errors are fixed amounts of time, so a longer time (a longer distance) makes them a smaller percentage. The shortest distance is the hardest one to do well.' },
    suvat: { show: ['nh', 'tilt', 'x1', 'x2', 'tgt'], labels: { nh: 'Force kept the same: masses on the hanger', x2: 'Gate 2 position' }, set: { timer: 'gates', x1: 0.3, x2: 0.6 },
      think: 'The gates measure u and v from the card. What happens to v² − u² compared with its uncertainty as the gates move further apart?',
      note: 'The card width is known to about 1%, so each speed has about 1% uncertainty. A bigger gap between the gates makes v² − u² bigger compared with that.' },
    ramp: { show: ['k', 'tilt', 'timer', 'x2', 'tgt'], labels: { k: 'Extra mass on the trolley', tilt: 'Smallest tilt you will use' }, set: { hanger: false, tilt: 3 }, tilt: { min: 1, max: 15, step: 0.5 },
      think: 'The protractor reads to ±0.5°. What does that do to the percentage uncertainty in sinθ at a small tilt and at a large tilt?',
      note: 'A fixed ±0.5° is a bigger percentage of a small angle. Friction is also a bigger fraction of a small slope force. Check the smallest tilt you plan to use.' },
    free: { show: ['nh', 'k', 'tilt', 'timer', 'x1', 'x2', 'tgt'], labels: {}, set: {}, think: 'Find a design that meets all the checks. What limits each choice?', note: 'Every control is available.' }
  };
  var DBASE = { nh: 5, k: 0, constant: true, tilt: 0, hanger: true, timer: 'video', x2: 1.0, x1: 0.3 };
  function setDesign(id) {
    DES = DESIGNS[id]; if (!DES) return;
    Object.assign(D, DBASE, DES.set);
    var tl = DES.tilt || { min: 0, max: 3, step: 0.05 };
    $('d-tilt').min = tl.min; $('d-tilt').max = tl.max; $('d-tilt').step = tl.step;
    ['nh', 'k', 'tilt', 'x1', 'x2'].forEach(function (k) { $('d-' + k).value = D[k]; });
    $('l-dnh').textContent = DES.labels.nh || 'Slotted masses on the hanger'; $('l-dk').textContent = DES.labels.k || 'Extra mass on the trolley';
    $('l-dtilt').textContent = DES.labels.tilt || 'Tilt of the track'; $('l-dx2').textContent = DES.labels.x2 || 'Distance to finish';
    [].forEach.call(document.querySelectorAll('[data-d]'), function (c) { c.hidden = DES.show.indexOf(c.getAttribute('data-d')) < 0; });
    $('think-design').textContent = DES.think; $('d-note').textContent = DES.note;
    $('d-none').hidden = true; $('d-body').hidden = false;
    dTimerDraw(); renderDesign();
  }
  function renderDesign() {
    if (!DES) return;
    $('od-nh').textContent = D.nh; $('od-k').textContent = fmt(0.1 * D.k, 1) + ' kg'; $('od-tilt').textContent = fmt(D.tilt, D.tilt % 1 ? 2 : 1) + '°'; $('od-x1').textContent = fmt(D.x1, 1) + ' m'; $('od-x2').textContent = fmt(D.x2, 1) + ' m'; $('od-tgt').textContent = fmt(D.tgt, 1) + '%';
    if (D.timer === 'gates' && D.x2 <= D.x1 + 0.05) { D.x2 = Math.round((D.x1 + 0.1) * 10) / 10; $('d-x2').value = D.x2; $('od-x2').textContent = fmt(D.x2, 1) + ' m'; }
    var s = setup(D), out = $('d-out'); out.textContent = '';
    if (!M.moves(s)) { out.appendChild(el('p', { class: 'empty', text: 'The trolley does not move with these settings. ' + (D.hanger ? 'Add mass to the hanger or tilt the track.' : 'Tilt the track more.') })); return; }
    var a = M.accel(s), x1 = D.timer === 'gates' ? D.x1 : 0, u = M.accelUncPct(s, x1, D.x2, D.timer), fr = M.frictionEffectPct(s);
    var t = D.timer === 'gates' ? M.gateRun(a, x1, D.x2).t : M.timeToDistance(a, D.x2), src = M.sources(t, D.timer);
    function row(ok, text, info) {
      return el('li', null, el('span', { class: ok ? 'ok' : 'no', role: 'img', 'aria-label': ok ? 'passed' : 'not passed', text: ok ? '✓' : '✗' }), el('span', { html: text }),
        info ? el('button', { class: 'info', type: 'button', 'aria-label': 'Explain this check', text: 'i', onclick: function () { Sim.pop.open(info[0], info[1]); } }) : el('span'));
    }
    var ul = el('ul', { class: 'checks' });
    ul.appendChild(row(u <= D.tgt, '% uncertainty in a: <b>' + fmt(u, 1) + '%</b> (target &le; ' + fmt(D.tgt, 1) + '%)', ['Uncertainty in a', [Sim.steps(D.timer === 'gates' ? [['Each gate speed has about 1% uncertainty (card width)', 'so v² − u² has about 2% plus a bit more'], ['Percentage uncertainty in a', fmt(u, 1) + '%']] : [['Biggest single source of error in the time', fmt(M.biggest(t, D.timer), 3) + ' s'], ['As a percentage of t = ' + fmt(t, 2) + ' s', fmt(100 * M.biggest(t, D.timer) / t, 1) + '%'], ['a depends on t², so double it', fmt(u, 1) + '%']]), el('p', { class: 'fine', text: 'The error is a fixed number of seconds, so a longer time makes it a smaller percentage.' })]]));
    if (DES === DESIGNS.ramp || DES === DESIGNS.free && !D.hanger) {
      var sp = M.sinTiltPct(D.tilt);
      ul.appendChild(row(sp <= D.tgt, '% uncertainty in sinθ: <b>' + fmt(sp, 1) + '%</b> (target &le; ' + fmt(D.tgt, 1) + '%)', ['Uncertainty in sinθ', [Sim.steps([['Protractor, 1° divisions: half the smallest division', '± ' + M.TILT_SIG + '°'], ['Uncertainty in sinθ is about cosθ × Δθ (in radians)', '± ' + fmt(M.sinTiltUnc(D.tilt), 4)], ['As a percentage of sinθ = ' + fmt(M.sinTilt(D.tilt), 3), fmt(sp, 1) + '%']]), el('p', { class: 'fine', text: 'The reading error is the same size at every angle, so a bigger angle makes it a smaller percentage.' })]]));
    }
    ul.appendChild(row(M.longEnough(s, x1, D.x2, D.timer), 'Timing lasts at least 10 &times; the timer uncertainty: ' + fmt(t, 2) + ' s vs ' + fmt(10 * M.TIMERS[D.timer].sig, 2) + ' s', ['Long enough?', ['A timing that is not much longer than the timer uncertainty gives a large percentage uncertainty. 10 times is a quick rule of thumb. A longer distance or a slower trolley gives a longer time.']]));
    ul.appendChild(row(fr <= M.FRICTION_PCT, 'Friction changes a by <b>' + fmt(fr, 1) + '%</b> (target &le; ' + M.FRICTION_PCT + '%)', ['Friction', ['Friction is a systematic error: it is the same in every reading, so repeating cannot remove it, and it shows up as an intercept on your graph. ' + (D.hanger ? 'Tilting the track slightly lets the trolley’s weight component cancel the friction.' : 'On a slope it takes a bigger share of the slope force when the angle is small.')]]));
    out.appendChild(ul);
    out.appendChild(el('p', { class: 'live', html: 'Acceleration ' + fmt(a, 2) + ' m s<sup>-2</sup>. Sources for the time of ' + fmt(t, 2) + ' s: timer ±' + fmt(src.timer, 3) + ' s, release &amp; judging ±' + fmt(src.release, 3) + ' s, resolution ±' + fmt(src.resolution, 4) + ' s. The biggest is used.' }));
  }

  /* ---------- wiring ---------- */
  function syncBench() {
    var s = setup(S);
    $('o-nh').textContent = S.nh; $('o-k').textContent = fmt(0.1 * S.k, 1) + ' kg'; $('o-tilt').textContent = fmt(S.tilt, 1) + '° ± ' + M.TILT_SIG + '°';
    $('l-x2').textContent = S.timer === 'gates' ? 'Second gate position' : 'Distance to finish, s'; $('o-x2').textContent = fmt(S.x2, 1) + ' m';
    $('x1box').hidden = S.timer !== 'gates'; $('o-x1').textContent = fmt(S.x1, 1) + ' m';
    $('c-nh').disabled = !S.hanger || lockedIds.indexOf('nh') >= 0; $('c-const').disabled = !S.hanger || lockedIds.indexOf('const') >= 0;
    var ro = $('readout'); ro.textContent = '';
    [['Hanger weight, F', S.hanger ? fmt(M.force(s), 2) + ' N' : '0 N'], ['Trolley mass', kg(M.trolleyMass(s))], ['Hanger mass', kg(M.hangerMass(s))], ['Total mass, m', kg(M.totalMass(s))]].forEach(function (p) { ro.appendChild(el('dt', { text: p[0] })); ro.appendChild(el('dd', { text: p[1] })); });
    resetRig(); renderGraphs();
  }
  function bind(id, key, num) { $(id).addEventListener('input', function (e) { S[key] = num ? +e.target.value : e.target.checked; if (key === 'x2' && S.timer === 'gates' && S.x2 <= S.x1 + 0.05) S.x2 = Math.round((S.x1 + 0.1) * 10) / 10; if (key === 'x1' && S.x1 >= S.x2) S.x1 = Math.round((S.x2 - 0.1) * 10) / 10; syncBench(); }); }
  bind('c-nh', 'nh', true); bind('c-k', 'k', true); bind('c-tilt', 'tilt', true); bind('c-x2', 'x2', true); bind('c-x1', 'x1', true); bind('c-const', 'constant', false); bind('c-hanger', 'hanger', false);
  function nudge(d) { S.tilt = Math.max(0, Math.min(20, Math.round((S.tilt + d) * 10) / 10)); $('c-tilt').value = S.tilt; syncBench(); }
  $('tilt-').addEventListener('click', function () { nudge(-0.1); }); $('tilt+').addEventListener('click', function () { nudge(0.1); });
  timerDraw = seg('seg-timer', TOPT, function () { return S.timer; }, function (v) { S.timer = v; if (v === 'gates' && S.x2 <= S.x1) S.x2 = Math.min(1.8, S.x1 + 0.7); $('c-x2').value = S.x2; syncBench(); });
  $('b-run3').addEventListener('click', function () { run(3); watch(true); }); $('b-run1').addEventListener('click', function () { run(1); watch(true); });
  $('b-watch').addEventListener('click', function () { watch(); });
  $('b-reset').addEventListener('click', resetRig);
  seg('seg-speed', [[1, 'Real time'], [2, 'Half speed'], [4, 'Quarter speed']], function () { return speed; }, function (v) { speed = v; });
  ['F', 'a', 'v'].forEach(function (k) { $('v-' + k).addEventListener('change', function (e) { vec[k] = e.target.checked; drawRig(); }); });
  $('v-strobe').addEventListener('change', function (e) { vec.strobe = e.target.checked; drawRig(); });
  $('b-clear').addEventListener('click', function () { results.clear(); meta = {}; $('banner').textContent = ''; renderResults(); });
  $('sel-series').addEventListener('change', function (e) { seriesSel = e.target.value; renderPlot(); });
  $('chk-model').addEventListener('change', renderPlot);
  function dbind(id, key) { $(id).addEventListener('input', function (e) { D[key] = +e.target.value; renderDesign(); }); }
  dbind('d-nh', 'nh'); dbind('d-k', 'k'); dbind('d-tilt', 'tilt'); dbind('d-x1', 'x1'); dbind('d-x2', 'x2'); dbind('d-tgt', 'tgt');
  var dTimerDraw = seg('dseg-timer', TOPT, function () { return D.timer; }, function (v) { D.timer = v; renderDesign(); });


  /* ---------- Step 1: what are you testing? ---------- */
  var timerDraw;
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
    { id: 'force', title: 'Force and acceleration', sub: 'Does a depend on F?', ax: [{ q: 'F' }, { q: 'a' }], dim: 'nh', ana: 'Plot a against F. Is it a straight line through the origin? What does the gradient tell you?', change: 'force F (masses on the hanger)', measure: 'acceleration a, from the time t over a fixed distance s', keep: ['total mass m', 'distance s', 'track tilt', 'timer'],
      think: 'Predict: if you double the pulling force and keep the total mass the same, what happens to the acceleration?', apply: fresh(),
      checks: [{ q: 'Should the total mass stay the same while you change F?', options: [
        opt('Yes', true, 'Yes. Moving masses from the trolley to the hanger changes F but not the total mass.', except(['nh']), { constant: true }),
        opt('No', false, 'Then the mass being accelerated changes as well as F, so you cannot tell which caused the change in a. Try it, then compare the graph with the constant-mass version.', except(['nh', 'const']), { constant: false })] }] },
    { id: 'mass', title: 'Mass and acceleration', sub: 'Does a depend on m?', ax: [{ q: 'm' }, { q: 'a' }], dim: 'k', ana: 'Plot a against m. Is it a straight line? Change the x axis until it is, then work out the force from the gradient.', change: 'total mass m (extra blocks on the trolley)', measure: 'acceleration a, from the time t over a fixed distance s', keep: ['pulling force F', 'distance s', 'track tilt', 'timer'],
      think: 'Predict: if you double the total mass and keep the force the same, what happens to the acceleration?', apply: fresh(),
      checks: [{ q: 'Should the pulling force stay the same while you change the mass?', options: [
        opt('Yes', true, 'Yes. Keep the hanger the same and add mass to the trolley.', except(['k'])),
        opt('No', false, 'Then F and m both change, so you cannot tell which one changed a.', except(['k', 'nh']))] }] },
    { id: 'distance', title: 'Distance and time', sub: 'Does s = ½at² hold?', ax: [{ q: 't' }, { q: 's' }], dim: 'x2', ana: 'Plot s against t. Is it a straight line? Change the x axis until it is, then use the gradient to find a.', change: 'distance s to the finish', measure: 'time t from release', keep: ['force F', 'total mass m', 'track tilt', 'timer'],
      think: 'Predict: what graph of s against t² should you get if the acceleration is constant?', apply: fresh({ timer: 'video' }),
      checks: [
        { q: 'Should the trolley start from rest every time?', options: [
          opt('Yes', true, 'Yes. Then u = 0 and s = ½at² applies.', []),
          opt('No', false, 'Then u is not zero and s = ½at² is not enough. Use two light gates (the equations of motion experiment).', [])] },
        { q: 'Should F and m stay the same while you change s?', options: [
          opt('Yes', true, 'Yes. Then a is constant and only s and t change.', except(['x2', 'timer'])),
          opt('No', false, 'Then a changes between runs, and s against t² will not be a straight line.', except(['x2', 'timer', 'nh', 'k']))] }] },
    { id: 'suvat', title: 'Equations of motion', sub: 'Do the SUVAT equations agree?', ax: [{ q: 's' }, { q: 'v' }], dim: 'x2', ana: 'Plot v against s. Is it a straight line? Change the y axis until it is. What do the gradient and intercept give you?', change: 'position of gate 2 (distance s between the gates)', measure: 'u, v and t from the light gates', keep: ['force F', 'total mass m', 'gate 1 position', 'track tilt'],
      think: 'Predict: will a worked out from v = u + at, s = ut + ½at² and v² = u² + 2as give the same value?', apply: fresh({ timer: 'gates', x1: 0.3, x2: 1.2 }),
      checks: [{ q: 'Should gate 1 stay in the same place while you move gate 2?', options: [
        opt('Yes', true, 'Yes. u stays the same and only the distance between the gates changes.', except(['x2'])),
        opt('No', false, 'Then u and s both change together, which makes the graph harder to interpret.', except(['x2', 'x1']))] }] },
    { id: 'ramp', title: 'Ramp', sub: 'Does mass matter on a slope?', ax: [{ q: 'th' }, { q: 'a' }], dim: 'tilt', ana: 'Plot a against θ. Is it a straight line? Change the x axis until it is, then use the gradient to find g.', change: 'tilt of the track, then the mass', measure: 'acceleration a, from the time t over a fixed distance s', keep: ['distance s', 'timer', 'no hanger'],
      think: 'Predict: on a slope with no hanger, does a heavier trolley accelerate faster, slower or at the same rate?', apply: fresh({ hanger: false, tilt: 6 }),
      checks: [{ q: 'Should the hanger stay attached?', options: [
        opt('Yes', false, 'Then the hanger’s weight pulls as well, so a does not depend only on the slope. Try it and see.', except(['tilt', 'hanger', 'k', 'nh']), { hanger: true }),
        opt('No', true, 'Yes, remove it. With only the slope pulling, a = g sinθ and the mass cancels. Then try adding mass to the trolley.', except(['tilt', 'k']), { hanger: false })] }] },
    { id: 'free', title: 'Free explore', sub: 'Change anything', ax: [{ q: 'F' }, { q: 'a' }], dim: 'nh', ana: 'Choose any two quantities. Try changing an axis (1 ÷ it, squared, square root) to straighten a curve.', change: 'anything', measure: 'time t (and u, v with the gates)', keep: ['nothing is locked'],
      think: 'Try changing one thing at a time. What do you notice?', apply: fresh(), checks: [] }
  ];
  Sim.experiment({ mount: $('exp-card'), defs: EXPS, lock: lock,
    gate: function (on) { $('set-card').inert = on; $('set-card').classList.toggle('gated', on); },
    onChoose: function (d) { setDesign(d.id); $('think-bench').textContent = d.think; AX.set(d.ax[0], d.ax[1]); prefDim = d.dim; seriesSel = ''; $('a-think').textContent = d.ana; renderPlot(); } });

  /* example data: a against F with the total mass constant, flat track (friction not compensated), video timing */
  [2, 4, 6, 8, 10].forEach(function (n) { S.nh = n; S.timer = 'video'; run(3); });
  S.nh = 5; S.timer = 'video';
  $('a-think').textContent = 'Choose an experiment on the Bench tab. Then choose the axes that let you analyse your readings.';
  $('banner').textContent = 'Example data is loaded (a against F, flat track). Press Clear data to start your own.';
  syncBench(); renderResults();
  Sim.tabs(document.querySelector('.tabs'), { onChange: function (n) { if (n === 'graphs') renderGraphs(); } });
})();
