/* Pendulum Timing: UI only. All physics comes from model.js; all generic widgets from ../shared/sim.js. */
(function () {
  'use strict';
  var M = window.PendulumModel, el = Sim.el, fmt = Sim.fmt;
  var $ = function (id) { return document.getElementById(id); };
  var S = { L: 0.5, amp: 10, N: 10, timer: 'video', where: 'centre', swing: false };
  var D = { L: 0.5, amp: 10, N: 10, timer: 'video' };
  var rand = Sim.rng(21), meta = {};
  var results = new Sim.Results({ res: 0.001, dp: 2, rowHead: 'Set-up', empty: 'No readings yet. Press Time 3 runs.' });

  /* ---------- segmented controls ---------- */
  function seg(id, options, get, set) {
    var box = $(id);
    function draw() {
      box.textContent = '';
      options.forEach(function (o) {
        box.appendChild(el('button', { type: 'button', text: o[1], 'aria-pressed': String(get() === o[0]), onclick: function () { set(o[0]); draw(); } }));
      });
    }
    draw();
  }
  var NOPT = [[1, '1'], [5, '5'], [10, '10'], [20, '20']];
  var TOPT = Object.keys(M.TIMERS).map(function (k) { return [k, M.TIMERS[k].short]; });

  /* ---------- rig drawing ---------- */
  var phase = 0, raf = 0, lastT = 0;
  function drawRig() {
    var svg = $('rig'), px = 200, py = 24, Lpx = 40 + S.L / 1.2 * 200;
    var th = (S.swing ? S.amp * Math.cos(phase) : S.amp) * Math.PI / 180;
    var bx = px + Lpx * Math.sin(th), by = py + Lpx * Math.cos(th), R = 14;
    svg.textContent = '';
    var A = Sim.svgel;
    svg.appendChild(A('rect', { x: 130, y: 14, width: 140, height: 8, class: 'pivot', rx: 2 }));
    svg.appendChild(A('line', { class: 'ref', x1: px, y1: py, x2: px, y2: py + Lpx + R + 10 }));
    svg.appendChild(A('line', { class: 'string', x1: px, y1: py, x2: bx, y2: by }));
    svg.appendChild(A('circle', { class: 'bob', cx: bx, cy: by, r: R }));
    // length dimension: to centre or to top of bob (what the student actually measures)
    var endY = S.where === 'top' ? py + Lpx - R : py + Lpx, dx = 70;
    svg.appendChild(A('line', { class: 'dim', x1: px - dx, y1: py, x2: px - dx, y2: endY }));
    svg.appendChild(A('line', { class: 'dim', x1: px - dx - 6, y1: py, x2: px - dx + 6, y2: py }));
    svg.appendChild(A('line', { class: 'dim', x1: px - dx - 6, y1: endY, x2: px - dx + 6, y2: endY }));
    svg.appendChild(A('text', { class: 'dimtext', x: px - dx - 10, y: (py + endY) / 2, 'text-anchor': 'end' }, 'L = ' + fmt(S.L, 2) + ' m'));
    svg.appendChild(A('text', { x: px + 8, y: 290, 'text-anchor': 'start' }, 'amplitude ' + S.amp + '°'));
  }
  function tick(ts) {
    if (!S.swing) return;
    var T = M.period(M.trueLength(S.L, S.where), S.amp) * 3; // slowed 3x so it is watchable
    if (lastT) phase += 2 * Math.PI * (ts - lastT) / 1000 / T;
    lastT = ts; drawRig(); raf = requestAnimationFrame(tick);
  }

  /* ---------- results ---------- */
  function keyOf(s) { return [s.L.toFixed(2), s.amp, s.N, s.timer, s.where].join('|'); }
  function label(m) {
    return 'L = ' + fmt(m.L, 2) + ' m<span class="sm">N = ' + m.N + ' &middot; ' + M.TIMERS[m.timer].name + ' &middot; ' + m.amp + '&deg; &middot; to ' + (m.where === 'top' ? 'top of bob' : 'centre') + '</span>';
  }
  function run(n) {
    var k = keyOf(S); meta[k] = { key: k, L: S.L, amp: S.amp, N: S.N, timer: S.timer, where: S.where, label: label(S) };
    for (var i = 0; i < n; i++) results.add(k, M.measure(S.L, S.amp, S.N, S.timer, S.where, rand));
  }
  function popMean(m, st) {
    var vals = results.live(m.key);
    return [Sim.steps([['Add the readings that are not crossed out', vals.map(function (v) { return fmt(v, 2); }).join(' + ') + ' = ' + fmt(vals.reduce(function (a, b) { return a + b; }, 0), 2) + ' s'],
      ['Divide by how many there are', 'mean t = ' + fmt(vals.reduce(function (a, b) { return a + b; }, 0), 2) + ' ÷ ' + vals.length + ' = ' + fmt(st.mean, 3) + ' s']])];
  }
  function popT(m, st) {
    return [Sim.steps([['The timer ran for N swings, so divide', 'T = t ÷ N = ' + fmt(st.mean, 3) + ' ÷ ' + m.N + ' = ' + fmt(st.mean / m.N, 4) + ' s'],
      ['The uncertainty is divided by N too', 'ΔT = Δt ÷ N = ' + fmt(st.half, 3) + ' ÷ ' + m.N + ' = ' + fmt(st.half / m.N, 4) + ' s']]),
      'Timing more swings spreads a fixed timing error over more of them, so T has a smaller uncertainty.'];
  }
  function popUnc(m, st) {
    var t = m.N * M.period(M.trueLength(m.L, m.where), m.amp), src = M.sources(t, m.timer);
    return [Sim.steps([
      ['Half the range of the readings', 'Δt = ½ (' + fmt(st.max, 3) + ' − ' + fmt(st.min, 3) + ') = ' + fmt(st.half, 3) + ' s' + (st.half > (st.max - st.min) / 2 + 1e-9 ? ' (raised to half the timer’s smallest division)' : '')],
      ['Percentage uncertainty', '% = Δt ÷ t̄ × 100 = ' + fmt(st.half, 3) + ' ÷ ' + fmt(st.mean, 3) + ' × 100 = ' + fmt(st.pct, 1) + '%']]),
      el('p', { text: 'Where could the spread come from?' }),
      Sim.steps([['A  Timer / reaction', '± ' + fmt(src.timer, 3) + ' s'], ['B  Release and judging the end of a swing', '± ' + fmt(src.release, 3) + ' s (the same however long the timing)'], ['C  Timer resolution', '± ' + fmt(src.resolution, 4) + ' s']]),
      el('p', { text: 'As a first approximation, take the biggest source of error. Half the range is how the spread in your own readings shows it. Repeating does not shrink it, and it cannot show up a fault that affects every reading, such as a mistake in how L is measured.' })];
  }
  function renderResults() {
    results.cfg.rows = Object.keys(meta).map(function (k) { return meta[k]; });
    results.cfg.columns = [
      { head: 'Mean t (s)', cell: function (r, st) { return st.n ? Sim.calcButton(fmt(st.mean, 2), 'Mean time', function () { return popMean(r, st); }) : ''; } },
      { head: '± half range (s)', cell: function (r, st) { return st.n ? fmt(st.half, 2) : ''; } },
      { head: 'T = t / N  (s)', cell: function (r, st) { return st.n ? Sim.calcButton(fmt(st.mean / r.N, 3), 'Period', function () { return popT(r, st); }) : ''; } },
      { head: '% uncertainty', cell: function (r, st) { return st.n ? Sim.calcButton(fmt(st.pct, 1) + '%', 'Uncertainty', function () { return popUnc(r, st); }) : ''; } }
    ];
    results.render($('results'));
    renderPlot();
  }
  results.onChange(renderResults);

  /* ---------- analyse: the student chooses the axes (Sim.axes) ---------- */
  var FOURPI2 = 4 * Math.PI * Math.PI;
  var AX = Sim.axes({
    mount: $('axes'), x: { q: 'L' }, y: { q: 'T' }, onChange: function () { renderPlot(); },
    quantities: [{ id: 'L', label: 'L', name: 'Length, L', unit: { m: 1 }, tfs: ['none', 'inv', 'sq', 'sqrt'] }, { id: 'T', label: 'T', name: 'Period, T', unit: { s: 1 }, tfs: ['none', 'inv', 'sq', 'sqrt'] }],
    get: function (m, id) { var st = results.stats(m.key); if (!st.n) return null; return id === 'L' ? { v: m.L, u: 0 } : { v: st.mean / m.N, u: st.half / m.N }; },
    known: [
      { key: 'T:sq|L:none', model: function () { return { slope: FOURPI2 / M.G, intercept: 0 }; }, extras: function (f) { return [['g = 4π² ÷ gradient', fmt(FOURPI2 / f.slope, 2) + ' m s⁻²']]; }, q: 'What should the intercept be? If it is not, what could be wrong with every reading at once?' },
      { key: 'L:none|T:sq', model: function () { return { slope: M.G / FOURPI2, intercept: 0 }; }, extras: function (f) { return [['g = 4π² × gradient', fmt(FOURPI2 * f.slope, 2) + ' m s⁻²']]; }, q: 'What should the intercept be? What does the gradient tell you about g?' },
      { key: 'T:none|L:sqrt', model: function () { return { slope: 2 * Math.PI / Math.sqrt(M.G), intercept: 0 }; }, extras: function (f) { return [['g = (2π ÷ gradient)²', fmt(Math.pow(2 * Math.PI / f.slope, 2), 2) + ' m s⁻²']]; }, q: 'T = 2π√(L/g), so T against √L is a straight line. What does the gradient equal?' }
    ]
  });
  function renderPlot() {
    var rows = Object.keys(meta).filter(function (k) { return results.stats(k).n; }).map(function (k) { return meta[k]; }), out = $('fit-out'); out.textContent = '';
    $('a-title').textContent = AX.title();
    var pts = AX.collect(rows), f = Sim.linfit(pts.map(function (p) { return p.x; }), pts.map(function (p) { return p.y; })), lines = [], kn = AX.known();
    $('model-row').hidden = !kn;
    if (f) {
      var xs = pts.map(function (p) { return p.x; }), x1 = Math.max.apply(null, xs) * 1.05, x0 = Math.min(0, Math.min.apply(null, xs));
      lines.push({ pts: [[x0, f.intercept + f.slope * x0], [x1, f.intercept + f.slope * x1]], colour: '--c1' });
      if (kn && $('chk-model').checked) { var ml = kn.model(); lines.push({ pts: [[x0, ml.intercept + ml.slope * x0], [x1, ml.intercept + ml.slope * x1]], colour: '--c2', dash: '6 4' }); }
      var tbl = AX.fitTable(f); if (kn) kn.extras(f).forEach(function (r) { tbl.appendChild(el('tr', null, el('td', { text: r[0] }), el('td', { text: r[1] }))); });
      out.appendChild(tbl);
      out.appendChild(el('p', { class: 'fine', text: kn ? kn.q : 'Is the line straight? If not, change an axis (1 ÷ it, squared, square root) until it is. What does the gradient have units of, and which quantity could that be?' }));
    } else out.appendChild(el('p', { class: 'empty', text: 'Take readings at two or more lengths to see the line.' }));
    Sim.plot($('plot'), { title: AX.title(), xlabel: AX.xlabel(), ylabel: AX.ylabel(), zero: true, points: pts, lines: lines });
  }

  /* ---------- design ---------- */
  function renderDesign() {
    $('od-L').textContent = fmt(D.L, 2) + ' m'; $('od-amp').textContent = D.amp + '°';
    var u = M.uncPct(D.L, D.amp, D.N, D.timer, 'centre'), sa = M.smallAnglePct(D.amp), long = M.longEnough(D.L, D.amp, D.N, D.timer, 'centre');
    var t = D.N * M.period(D.L, D.amp), src = M.sources(t, D.timer), out = $('d-out'); out.textContent = '';
    function row(ok, text, info) {
      return el('li', null, el('span', { class: ok ? 'ok' : 'no', role: 'img', 'aria-label': ok ? 'passed' : 'not passed', text: ok ? '✓' : '✗' }), el('span', { html: text }),
        info ? el('button', { class: 'info', type: 'button', 'aria-label': 'Explain this check', text: 'i', onclick: function () { Sim.pop.open(info[0], info[1]); } }) : el('span'));
    }
    out.appendChild(el('ul', { class: 'checks' },
      row(u <= M.TARGET_PCT, '% uncertainty in T: <b>' + fmt(u, 1) + '%</b> (target &le; ' + M.TARGET_PCT + '%)', ['Uncertainty in T', [Sim.steps([['Biggest single source of error in the total time', fmt(M.biggest(t, D.timer), 3) + ' s'], ['Divide by the total time', fmt(M.biggest(t, D.timer), 3) + ' ÷ ' + fmt(t, 2) + ' = ' + fmt(u, 1) + '%']])]]),
      row(long, 'Timing lasts at least 10 &times; the timer uncertainty: ' + fmt(t, 1) + ' s vs ' + fmt(10 * M.TIMERS[D.timer].sig, 2) + ' s', ['Long enough?', ['A timing that is not much longer than the timer uncertainty gives a very large % uncertainty. 10 times is a quick rule of thumb.']]),
      row(sa <= M.SMALL_ANGLE_PCT, 'Small-angle formula within ' + fmt(sa, 2) + '% (target &le; ' + M.SMALL_ANGLE_PCT + '%)', ['Small amplitude', ['T = 2π√(L/g) assumes small swings. At larger amplitudes the real period is longer, so the formula under-reads it.']])));
    out.appendChild(el('p', { class: 'live', html: 'Sources for the total time of ' + fmt(t, 1) + ' s: timer ±' + fmt(src.timer, 3) + ' s, release &amp; judging ±' + fmt(src.release, 3) + ' s, resolution ±' + fmt(src.resolution, 4) + ' s. The biggest is used.' }));
  }

  /* ---------- wiring ---------- */
  function syncBench() { $('o-L').textContent = fmt(S.L, 2) + ' m'; $('o-amp').textContent = S.amp + '°'; drawRig(); }
  $('c-L').addEventListener('input', function (e) { S.L = +e.target.value; syncBench(); });
  $('c-amp').addEventListener('input', function (e) { S.amp = +e.target.value; syncBench(); });
  $('d-L').addEventListener('input', function (e) { D.L = +e.target.value; renderDesign(); });
  $('d-amp').addEventListener('input', function (e) { D.amp = +e.target.value; renderDesign(); });
  $('chk-model').addEventListener('change', renderPlot);
  seg('seg-N', NOPT, function () { return S.N; }, function (v) { S.N = v; });
  seg('seg-timer', TOPT, function () { return S.timer; }, function (v) { S.timer = v; });
  seg('seg-where', [['centre', 'centre of bob'], ['top', 'top of bob']], function () { return S.where; }, function (v) { S.where = v; drawRig(); });
  seg('dseg-N', NOPT, function () { return D.N; }, function (v) { D.N = v; renderDesign(); });
  seg('dseg-timer', TOPT, function () { return D.timer; }, function (v) { D.timer = v; renderDesign(); });
  $('b-run3').addEventListener('click', function () { run(3); });
  $('b-run1').addEventListener('click', function () { run(1); });
  $('b-clear').addEventListener('click', function () { results.clear(); meta = {}; $('banner').textContent = ''; renderResults(); });
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) $('b-swing').disabled = true;
  $('b-swing').addEventListener('click', function () {
    S.swing = !S.swing; this.setAttribute('aria-pressed', String(S.swing)); lastT = 0; phase = 0;
    if (S.swing) raf = requestAnimationFrame(tick); else { cancelAnimationFrame(raf); drawRig(); }
  });

  /* example data so the Analyse tab is not empty on first visit */
  [0.2, 0.4, 0.6, 0.8, 1.0].forEach(function (L) { S.L = L; S.N = 10; S.timer = 'video'; S.where = 'centre'; S.amp = 10; run(3); });
  S.L = 0.5; S.amp = 10; S.N = 10; S.timer = 'video';
  $('banner').textContent = 'Example data is loaded so you can explore. Press Clear data to start your own.';
  syncBench(); renderResults(); renderDesign();
  Sim.tabs(document.querySelector('.tabs'));
})();
