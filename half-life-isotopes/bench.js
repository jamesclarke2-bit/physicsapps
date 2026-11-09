/* Geiger counter bench: background, decay curve, distance and absorbers.
   Physics (random counts, background, decay, 1/d^2, absorbers) comes from model.js (benchCount, benchNet). UI only. */
(function () {
  'use strict';
  var M = window.HalfLifeModel, el = Sim.el, sv = Sim.svgel, fmt = Sim.fmt, HL = window.HL = window.HL || {};
  var $ = function (id) { return document.getElementById(id); };
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ABS_ORDER = ['none', 'paper', 'aluminium', 'lead'], COL = ['--c1', '--c2', '--c3'];
  var DEF = { bg: 80, unit: 'd', sources: ['Z'], days: [0], distances: [5], absorbers: ['none'], seconds: 60, secondsOptions: [30, 60, 120, 300], sourceIn: true, view: 'reading', note: '' };
  var EXAMPLE = { bg: 80, unit: 'd', sources: ['Z', 'A', 'B', 'C', 'D'], days: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], distances: [2, 5, 10, 20, 40], absorbers: ABS_ORDER, seconds: 60, secondsOptions: [30, 60, 120, 300], sourceIn: true, view: 'decay', note: '' };
  var C = EXAMPLE, st = {}, log = [], idx = 0, base = 4242, busy = false, showNet = false, showTheory = false, exampleOn = false, nodes = {};

  function src(id) { return M.BENCH_SOURCES[id || st.srcId]; }
  function cfgFor(id) { return { bg: C.bg, unit: C.unit, src: src(id) }; }
  function dayWord() { return M.UNITS[C.unit].label; }
  function rate(r) { return M.toCpm(r.counts, r.sec); }
  function bgRows() { return log.filter(function (r) { return !r.src && !r.off; }); }
  function stats(rows) {
    var v = rows.map(rate), n = v.length, mean = n ? M.mean(v) : NaN, half = n ? M.halfRange(v) : NaN;
    return { n: n, mean: mean, half: half, pct: n ? 100 * half / mean : NaN, min: Math.min.apply(null, v), max: Math.max.apply(null, v), v: v };
  }
  function bgMean() { var b = bgRows(); return b.length ? stats(b).mean : NaN; }
  function netOK() { return bgRows().length >= 3; }
  function d1(x) { return fmt(x, 1); }
  function absName(a) { return M.ABSORBERS[a].name; }
  function secLabel(x) { return x < 60 ? x + ' s' : (x / 60) + ' min'; }

  /* ---------- the bench picture ---------- */
  function drawBench(countText, timeText) {
    var svg = $('bench-svg'); svg.textContent = '';
    svg.setAttribute('viewBox', '0 0 480 250'); svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Bench: Geiger-Müller tube joined to a counter. ' + (st.sourceIn ? src().name + ' is ' + st.dist + ' cm from the tube window. Absorber: ' + absName(st.abs) + '.' : 'The source is away in its lead-lined box on the shelf, 1 m from the tube.'));
    var A = function (t, a, tx) { var n = sv(t, a, tx); svg.appendChild(n); return n; };
    A('rect', { x: 8, y: 205, width: 464, height: 14, class: 'bn-fill' }); A('rect', { x: 24, y: 219, width: 10, height: 26, class: 'bn-fill' }); A('rect', { x: 446, y: 219, width: 10, height: 26, class: 'bn-fill' });
    A('line', { x1: 30, y1: 84, x2: 96, y2: 84, class: 'bn-line' });
    A('rect', { x: 190, y: 195, width: 80, height: 10, class: 'bn-fill' }); A('rect', { x: 226, y: 134, width: 6, height: 62, class: 'bn-fill' });
    A('rect', { x: 110, y: 118, width: 138, height: 28, rx: 14, class: 'bn-fill' }); A('rect', { x: 216, y: 129, width: 18, height: 12, class: 'bn-fill' });
    A('line', { x1: 112, y1: 124, x2: 112, y2: 140, class: 'bn-win' });
    A('text', { x: 150, y: 168, class: 'bn-t' }, 'Geiger-Müller tube');
    A('path', { d: 'M248 132 C290 132 290 150 330 150', class: 'bn-line' });
    A('rect', { x: 330, y: 70, width: 140, height: 135, rx: 8, class: 'bn-fill' }); A('rect', { x: 344, y: 84, width: 112, height: 46, rx: 4, class: 'bn-lcd' });
    nodes.cnt = A('text', { x: 400, y: 117, class: 'bn-num', 'text-anchor': 'middle' }, countText);
    A('text', { x: 400, y: 150, class: 'bn-t', 'text-anchor': 'middle' }, 'counts');
    nodes.tm = A('text', { x: 400, y: 170, class: 'bn-t', 'text-anchor': 'middle' }, timeText); A('text', { x: 400, y: 193, class: 'bn-t bn-s', 'text-anchor': 'middle' }, 'Geiger counter');
    [160, 195, 230].forEach(function (x, k) { A('line', { x1: x + 30 - k * 6, y1: 40, x2: x, y2: 112, class: 'bn-bgray' }); });
    A('text', { x: 200, y: 30, class: 'bn-t bn-m', 'text-anchor': 'middle' }, 'background radiation (always there)');
    if (st.sourceIn) {
      var dpx = 10 + 70 * Math.log(st.dist / 2) / Math.log(30), cx = 104 - dpx;
      A('rect', { x: cx - 13, y: 150, width: 26, height: 55, class: 'bn-fill' }); A('circle', { cx: cx, cy: 132, r: 8, class: 'bn-src' });
      A('line', { x1: cx + 10, y1: 132, x2: 106, y2: 132, class: 'bn-ray' });
      A('text', { x: Math.max(cx, 34), y: 112, class: 'bn-t', 'text-anchor': 'middle' }, src().name.replace('Source ', 'source '));
      A('line', { x1: cx, y1: 182, x2: 110, y2: 182, class: 'bn-dim' }); A('text', { x: (cx + 110) / 2, y: 196, class: 'bn-t bn-s', 'text-anchor': 'middle' }, st.dist + ' cm');
      if (st.abs !== 'none') {
        var w = { paper: 2, aluminium: 6, lead: 12 }[st.abs], mx = (cx + 110) / 2;
        A('rect', { x: mx - w / 2, y: 106, width: w, height: 99, class: 'bn-abs bn-abs-' + st.abs });
        A('text', { x: mx, y: 238, class: 'bn-t bn-s', 'text-anchor': 'middle' }, absName(st.abs));
      }
      A('rect', { x: 40, y: 52, width: 46, height: 32, class: 'bn-leadopen' }); A('text', { x: 63, y: 46, class: 'bn-t bn-s', 'text-anchor': 'middle' }, 'empty lead box');
    } else {
      A('rect', { x: 40, y: 52, width: 46, height: 32, class: 'bn-lead' }); A('rect', { x: 38, y: 48, width: 50, height: 6, class: 'bn-lead' });
      A('text', { x: 63, y: 40, class: 'bn-t bn-s', 'text-anchor': 'middle' }, 'lead-lined box');
      A('text', { x: 63, y: 98, class: 'bn-t bn-s', 'text-anchor': 'middle' }, 'source inside,');
      A('text', { x: 63, y: 110, class: 'bn-t bn-s', 'text-anchor': 'middle' }, '1 m away');
    }
  }

  /* ---------- controls ---------- */
  function segBtns(label, options, get, set) {
    var box = el('div', { class: 'ctl' }), g = el('div', { class: 'seg', role: 'group', 'aria-label': label });
    box.appendChild(el('span', { class: 'lab', text: label }));
    options.forEach(function (o) { g.appendChild(el('button', { type: 'button', disabled: busy, text: o[1], 'aria-pressed': String(get() === o[0]), onclick: function () { set(o[0]); render(); } })); });
    box.appendChild(g); return box;
  }
  function buildControls() {
    var box = $('bn-ctl'); box.textContent = '';
    box.appendChild(segBtns('Source position', [[true, 'Next to the tube'], [false, 'In its lead-lined box']], function () { return st.sourceIn; }, function (v) { st.sourceIn = v; }));
    if (st.sourceIn) {
      if (C.sources.length > 1) box.appendChild(segBtns('Source', C.sources.map(function (id) { return [id, src(id).name.replace('Source ', '')]; }), function () { return st.srcId; }, function (v) { st.srcId = v; }));
      if (C.days.length > 1) box.appendChild(segBtns('Day of the experiment (' + dayWord() + ')', C.days.map(function (x) { return [x, String(x)]; }), function () { return st.day; }, function (v) { st.day = v; }));
      if (C.distances.length > 1) box.appendChild(segBtns('Distance from the tube window (cm)', C.distances.map(function (x) { return [x, String(x)]; }), function () { return st.dist; }, function (v) { st.dist = v; }));
      if (C.absorbers.length > 1) box.appendChild(segBtns('Absorber between source and tube', C.absorbers.map(function (a) { return [a, a === 'none' ? 'None' : M.ABSORBERS[a].short.charAt(0).toUpperCase() + M.ABSORBERS[a].short.slice(1)]; }), function () { return st.abs; }, function (v) { st.abs = v; }));
    }
    if (C.secondsOptions.length > 1) box.appendChild(segBtns('Counting time', C.secondsOptions.map(function (x) { return [x, secLabel(x)]; }), function () { return st.seconds; }, function (v) { st.seconds = v; }));
    var b = el('div', { class: 'btns' }, el('button', { class: 'btn primary', id: 'b-count', type: 'button', disabled: busy, text: busy ? 'Counting…' : 'Start count (' + secLabel(st.seconds) + ')', onclick: startCount }));
    if (st.sourceIn) {
      if (C.days.length > 1) b.appendChild(el('button', { class: 'btn', type: 'button', disabled: busy, text: 'Reading every day', onclick: function () { series('day'); } }));
      if (C.distances.length > 1) b.appendChild(el('button', { class: 'btn', type: 'button', disabled: busy, text: 'Reading at every distance', onclick: function () { series('dist'); } }));
      if (C.absorbers.length > 1) b.appendChild(el('button', { class: 'btn', type: 'button', disabled: busy, text: 'Reading with each absorber', onclick: function () { series('abs'); } }));
    }
    box.appendChild(b);
    box.appendChild(el('p', { class: 'fine', role: 'status', 'aria-live': 'polite', id: 'bn-status', text: '' }));
  }

  /* ---------- counting ---------- */
  function counts(sourceIn, sid, day, d, abs, sec) { var c = M.benchCount({ bg: C.bg, unit: C.unit, src: src(sid) }, sourceIn, day, sec, Sim.rng(base + idx * 7919), d, abs); idx++; return c; }
  function addRow(sourceIn, day, d, abs, sec, n) { log.push({ src: sourceIn, sid: st.srcId, day: day, d: d, abs: abs, sec: sec, counts: n, off: false }); }
  function startCount() {
    if (busy) return;
    var sec = st.seconds, day = st.sourceIn ? st.day : 0, d = st.dist, abs = st.abs, sin = st.sourceIn, n = counts(sin, st.srcId, day, d, abs, sec);
    busy = true; exampleOn = false; buildControls();
    var t0 = null, dur = reduce ? 0 : 1600;
    function finish() { busy = false; addRow(sin, day, d, abs, sec, n); render(); var s = $('bn-status'); if (s) s.textContent = 'Counted ' + n + ' counts in ' + sec + ' s.'; }
    function frame(ts) {
      if (t0 === null) t0 = ts; var p = Math.min(1, (ts - t0) / dur);
      if (nodes.cnt) nodes.cnt.textContent = String(Math.round(n * p)); if (nodes.tm) nodes.tm.textContent = 'time ' + Math.round(sec * p) + ' s';
      if (p < 1) requestAnimationFrame(frame); else finish();
    }
    if (!dur) { if (nodes.cnt) nodes.cnt.textContent = String(n); finish(); } else requestAnimationFrame(frame);
  }
  function series(kind) {
    if (busy || !st.sourceIn) return; exampleOn = false;
    var list = kind === 'day' ? C.days : kind === 'dist' ? C.distances : C.absorbers;
    list.forEach(function (v) {
      var day = kind === 'day' ? v : st.day, d = kind === 'dist' ? v : st.dist, abs = kind === 'abs' ? v : st.abs;
      addRow(true, day, d, abs, st.seconds, counts(true, st.srcId, day, d, abs, st.seconds));
    });
    render(); var s = $('bn-status'); if (s) s.textContent = 'Added ' + list.length + ' readings, each counted for ' + secLabel(st.seconds) + '.';
  }

  /* ---------- tables ---------- */
  function renderLog() {
    var box = $('bn-log'); box.textContent = '';
    if (!log.length) { box.appendChild(el('p', { class: 'empty', text: 'No readings yet. Set up the bench and press Start count.' })); return; }
    var bm = bgMean(), net = showNet && netOK(), heads = ['Reading', 'Source'];
    if (C.sources.length > 1) heads.push('Which'); if (C.days.length > 1) heads.push('Day (' + dayWord() + ')'); if (C.distances.length > 1) heads.push('Distance (cm)'); if (C.absorbers.length > 1) heads.push('Absorber');
    heads.push('Time (s)', 'Counts', 'Count rate (counts/min)'); if (net) heads.push('Net count rate (counts/min)');
    var rows = log.map(function (r, i) {
      var cr = rate(r), tds = [el('td', null, el('button', { type: 'button', class: 'xo', 'aria-pressed': String(r.off), 'aria-label': (r.off ? 'Restore' : 'Cross out') + ' reading ' + (i + 1), onclick: function () { r.off = !r.off; render(); }, text: String(i + 1) })),
        el('td', { text: r.src ? 'next to tube' : 'away' })];
      if (C.sources.length > 1) tds.push(el('td', { text: r.src ? r.sid : '–' }));
      if (C.days.length > 1) tds.push(el('td', { class: 'num', text: r.src ? String(r.day) : '–' }));
      if (C.distances.length > 1) tds.push(el('td', { class: 'num', text: r.src ? String(r.d) : '–' }));
      if (C.absorbers.length > 1) tds.push(el('td', { text: r.src ? M.ABSORBERS[r.abs].short : '–' }));
      tds.push(el('td', { class: 'num', text: String(r.sec) }), el('td', { class: 'num', text: String(r.counts) }),
        el('td', { class: 'num' }, Sim.calcButton(d1(cr), 'Count rate', function () { return [Sim.steps([['Counts per minute = counts × 60 ÷ counting time', r.counts + ' × 60 ÷ ' + r.sec + ' = ' + fmt(cr, 2) + ' counts/min']])]; })));
      if (net) tds.push(el('td', { class: 'num' }, r.src ? Sim.calcButton(d1(cr - bm), 'Net count rate', function () { return [Sim.steps([['Net = reading − mean background', fmt(cr, 2) + ' − ' + fmt(bm, 2) + ' = ' + fmt(cr - bm, 2) + ' counts/min']])]; }) : '–'));
      return el('tr', { class: r.off ? 'off' : '' }, tds);
    });
    box.appendChild(el('div', { class: 'tablewrap' }, el('table', { class: 'data' }, el('thead', null, el('tr', null, heads.map(function (h) { return el('th', { scope: 'col', text: h }); }))), el('tbody', null, rows))));
  }
  function popMean(s) { var sum = s.v.reduce(function (a, b) { return a + b; }, 0); return [Sim.steps([['Add the count rates that are not crossed out', s.v.map(d1).join(' + ') + ' = ' + d1(sum) + ' counts/min'], ['Divide by how many there are', 'mean = ' + d1(sum) + ' ÷ ' + s.n + ' = ' + fmt(s.mean, 2) + ' counts/min']])]; }
  function popUnc(s) { return [Sim.steps([['Half the range', 'uncertainty = ½ (' + d1(s.max) + ' − ' + d1(s.min) + ') = ' + fmt(s.half, 2) + ' counts/min'], ['Percentage uncertainty', fmt(s.half, 2) + ' ÷ ' + fmt(s.mean, 2) + ' × 100 = ' + d1(s.pct) + '%']]), el('p', { text: 'Repeating shows the spread and gives a mean. A longer counting time gives a bigger count, so the same random scatter is a smaller percentage.' })]; }
  function renderSummary() {
    var box = $('bn-sum'); box.textContent = '';
    var secs = []; bgRows().forEach(function (r) { if (secs.indexOf(r.sec) < 0) secs.push(r.sec); }); secs.sort(function (a, b) { return a - b; });
    if (!secs.length) box.appendChild(el('p', { class: 'empty', text: 'No background readings yet. Put the source in its lead-lined box and count.' }));
    else {
      var rows = secs.map(function (sc) {
        var s = stats(bgRows().filter(function (r) { return r.sec === sc; }));
        return el('tr', null, el('td', { class: 'num', text: String(sc) }), el('td', { class: 'num', text: String(s.n) }),
          el('td', { class: 'num' }, Sim.calcButton(d1(s.mean), 'Mean', function () { return popMean(s); })),
          el('td', { class: 'num' }, s.n > 1 ? Sim.calcButton(d1(s.half), 'Uncertainty', function () { return popUnc(s); }) : '–'),
          el('td', { class: 'num', text: s.n > 1 ? d1(s.pct) + '%' : '–' }));
      });
      box.appendChild(el('div', { class: 'tablewrap' }, el('table', { class: 'data' }, el('thead', null, el('tr', null, ['Time (s)', 'Readings', 'Mean (counts/min)', 'Uncertainty (counts/min)', 'Uncertainty (%)'].map(function (h) { return el('th', { scope: 'col', text: h }); }))), el('tbody', null, rows))));
      if (bgRows().some(function (r) { return rate(r) > 100; })) box.appendChild(el('p', { class: 'warn', text: 'A background reading above 100 counts per minute is far too big. Is the source still next to the tube?' }));
    }
    box.appendChild(el('p', { class: 'fine', text: 'Only readings taken with the source away are used here. Click a reading number in the table to cross out an anomaly.' }));
  }

  /* ---------- graph ---------- */
  function seriesLabel(r, view) {
    var parts = [];
    if (view !== 'decay' && C.days.length > 1) parts.push('day ' + r.day);
    if (view !== 'dist' && C.distances.length > 1) parts.push(r.d + ' cm');
    if (view !== 'abs' && C.absorbers.length > 1) parts.push(r.abs === 'none' ? 'no absorber' : M.ABSORBERS[r.abs].short);
    return (C.sources.length > 1 ? 'Source ' + r.sid : 'Source') + (parts.length ? ', ' + parts.join(', ') : '');
  }
  function renderPlot() {
    var view = st.view, bm = bgMean(), net = showNet && netOK(), pts = [], lines = [], legend = [], ymax = 50, ymin = 0, xmax, xlabel;
    function bump(y) { if (y > ymax) ymax = y * 1.1; if (y < ymin) ymin = y * 1.15; }
    if (view === 'reading') {
      log.forEach(function (r, i) { if (r.off) return; pts.push({ x: i + 1, y: rate(r), colour: r.src ? '--c1' : '--c2' }); bump(rate(r) * 1.1); });
      xmax = Math.max(5, log.length + 1); xlabel = 'reading number';
      legend.push(['--c1', 'source next to the tube']); legend.push(['--c2', 'source away (background)']);
    } else {
      var xs = view === 'decay' ? C.days : view === 'dist' ? C.distances : ABS_ORDER.slice(0, C.absorbers.length);
      xmax = view === 'abs' ? C.absorbers.length - 1 || 1 : Math.max.apply(null, xs);
      xlabel = view === 'decay' ? 'day, t / ' + dayWord() : view === 'dist' ? 'distance from the tube, d / cm' : 'absorber (0 none, 1 paper, 2 aluminium, 3 lead)';
      var groups = {}, order = [];
      log.forEach(function (r) {
        if (r.off || !r.src) return;
        var key = r.sid + '|' + (view === 'decay' ? r.d + '|' + r.abs : view === 'dist' ? r.day + '|' + r.abs : r.day + '|' + r.d), x = view === 'decay' ? r.day : view === 'dist' ? r.d : ABS_ORDER.indexOf(r.abs);
        if (!groups[key]) { groups[key] = { rows: [], r: r }; order.push(key); } groups[key].rows.push({ x: x, y: rate(r) });
      });
      var curves = order.filter(function (k) { return groups[k].rows.length > 1; }); if (curves.length) order = curves;
      order.forEach(function (key, k) {
        var g = groups[key], col = COL[k % 3], rowsS = g.rows.slice().sort(function (a, b) { return a.x - b.x; }), r = g.r;
        legend.push([col, seriesLabel(r, view)]);
        g.rows.forEach(function (p) { pts.push({ x: p.x, y: p.y, colour: col }); bump(p.y * 1.1); });
        if (net) {
          var sx = rowsS.map(function (p) { return p.x; }), sf = view === 'decay' && rowsS.length > 2 ? fitExp(sx, rowsS.map(function (p) { return p.y - bm; }), 0) : null;
          lines.push({ pts: sf ? smooth(sf, sx[0], sx[sx.length - 1]) : rowsS.map(function (p) { return [p.x, p.y - bm]; }), colour: col }); rowsS.forEach(function (p) { bump(p.y - bm); });
        }
        if (showTheory && view !== 'abs') {
          var cf = { bg: C.bg, unit: C.unit, src: src(r.sid) }, raw = [], nt = [], n = 80, i, x, v;
          for (i = 0; i <= n; i++) {
            x = xmax * i / n; if (view === 'dist') x = Math.max(2, x);
            v = view === 'decay' ? M.benchNet(cf, x, r.d, r.abs) : M.benchNet(cf, r.day, x, r.abs); raw.push([x, C.bg + v]); nt.push([x, v]);
          }
          lines.push({ pts: raw, colour: col, dash: '6 4' }); if (net) lines.push({ pts: nt, colour: col, dash: '2 4' });
          bump(raw[0][1] * 1.05);
        }
      });
    }
    if (isFinite(bm)) { lines.push({ pts: [[0, bm], [xmax, bm]], colour: '--muted', dash: '5 4' }); bump(bm * 1.1); }
    Sim.plot($('bn-plot'), { title: 'Count rates', desc: 'Each point is one reading in counts per minute. The dashed horizontal line is the mean background that you measured.', xlabel: xlabel, ylabel: 'count rate, R / counts per min', zero: true, xmin: 0, xmax: xmax, ymin: ymin, ymax: ymax, points: pts, lines: lines });
    var lg = $('bn-legend'); lg.textContent = '';
    legend.slice(0, 6).forEach(function (l) { lg.appendChild(el('li', { style: 'color:var(' + l[0] + ')' }, el('span', { class: 'sol' }), el('span', { style: 'color:var(--ink)', text: l[1] }))); });
    lg.appendChild(el('li', { style: 'color:var(--muted)', text: 'dashed horizontal line = your mean background' + (net ? '. Solid lines = net count rate.' : '') + (showTheory ? ' Long dashes = true curve.' : '') }));
    var vb = $('bn-view'); vb.textContent = '';
    var opts = [['reading', 'Reading order'], ['decay', 'Decay with time']]; if (C.distances.length > 1) opts.push(['dist', 'Distance']); if (C.absorbers.length > 1) opts.push(['abs', 'Absorber']);
    if (opts.length > 1) { var g = el('div', { class: 'seg', role: 'group', 'aria-label': 'Graph shows' }); opts.forEach(function (o) { g.appendChild(el('button', { type: 'button', text: o[1], 'aria-pressed': String(st.view === o[0]), onclick: function () { st.view = o[0]; renderPlot(); } })); }); vb.appendChild(el('span', { class: 'lab', text: 'Graph shows' })); vb.appendChild(g); }
  }

  /* ---------- smooth best-fit curve: offset + A*(1/2)^(t/T), fitted by least squares on ln(y - offset) ---------- */
  function fitExp(xs, ys, fixedC) {
    function lin(c) {
      var P = [], i, w, sw = 0, sx = 0, sy = 0, sxx = 0, sxy = 0;
      for (i = 0; i < xs.length; i++) if (ys[i] - c > 0.5) P.push([xs[i], Math.log(ys[i] - c), (ys[i] - c) * (ys[i] - c)]);
      if (P.length < 2) return null;
      P.forEach(function (p) { w = p[2]; sw += w; sx += w * p[0]; sy += w * p[1]; sxx += w * p[0] * p[0]; sxy += w * p[0] * p[1]; });
      var d = sw * sxx - sx * sx; if (!d) return null;
      var k = (sw * sxy - sx * sy) / d, a = (sy - k * sx) / sw, sse = 0;
      for (i = 0; i < xs.length; i++) sse += Math.pow(ys[i] - c - Math.exp(a + k * xs[i]), 2);
      return { c: c, a: a, k: k, sse: sse };
    }
    var best = null, c, f, mn = Math.min.apply(null, ys);
    if (fixedC !== undefined) best = lin(fixedC);
    else for (c = 0; c < mn * 0.995; c += Math.max(mn / 200, 0.05)) { f = lin(c); if (f && (!best || f.sse < best.sse)) best = f; }
    if (!best) return null;
    return function (x) { return best.c + Math.exp(best.a + best.k * x); };
  }
  function smooth(f, x0, x1) { var o = [], i; for (i = 0; i <= 60; i++) o.push([x0 + (x1 - x0) * i / 60, f(x0 + (x1 - x0) * i / 60)]); return o; }

  /* ---------- the two obvious curves: with and without background ---------- */
  function renderTwo() {
    var bm = bgMean(), ok = netOK(), groups = {}, order = [], msg = $('bn-two-msg'), lg = $('bn-two-legend'); lg.textContent = '';
    log.forEach(function (r) { if (r.off || !r.src) return; var k = r.sid + '|' + r.d + '|' + r.abs; if (!groups[k]) { groups[k] = []; order.push(k); } groups[k].push(r); });
    var best = null; order.forEach(function (k) { var days = {}; groups[k].forEach(function (r) { days[r.day] = 1; }); if (Object.keys(days).length > 1) best = k; });
    var pts = [], lines = [], xmax = Math.max.apply(null, C.days.concat([1])), ymax = 50, ymin = 0, rows = [];
    if (!best) msg.textContent = 'Put the source next to the tube and press "Reading every day" to see the decay curve.';
    else {
      rows = groups[best].slice().sort(function (a, b) { return a.day - b.day; }); var r0 = rows[0];
      msg.textContent = 'Orange: what the counter shows (with background). Blue: the source alone, after subtracting your mean background. Smooth lines are best-fit curves through the points. ' + seriesLabel(r0, 'decay')+ '.';
      var xs = rows.map(function (r) { return r.day; }), fN = ok ? fitExp(xs, rows.map(function (r) { return rate(r) - bm; }), 0) : null,
        fR = fN ? function (x) { return bm + fN(x); } : fitExp(xs, rows.map(rate));
      var x1 = xs[xs.length - 1];
      if (fR) lines.push({ pts: smooth(fR, xs[0], x1), colour: '--c2' });
      rows.forEach(function (r) { pts.push({ x: r.day, y: rate(r), colour: '--c2' }); if (rate(r) * 1.1 > ymax) ymax = rate(r) * 1.1; });
      if (ok) {
        if (fN) lines.push({ pts: smooth(fN, xs[0], x1), colour: '--c1' });
        rows.forEach(function (r) { pts.push({ x: r.day, y: rate(r) - bm, colour: '--c1' }); if (rate(r) - bm < ymin) ymin = (rate(r) - bm) * 1.2; });
      } else msg.textContent += ' The blue curve appears once you have measured the background: take at least three counts with the source in its box.';
      if (showTheory) {
        var cf = { bg: C.bg, unit: C.unit, src: src(r0.sid) }, raw = [], nt = [], i, x, v;
        for (i = 0; i <= 80; i++) { x = xmax * i / 80; v = M.benchNet(cf, x, r0.d, r0.abs); raw.push([x, C.bg + v]); nt.push([x, v]); }
        lines.push({ pts: raw, colour: '--c2', dash: '6 4' }); if (ok) lines.push({ pts: nt, colour: '--c1', dash: '6 4' });
      }
    }
    if (isFinite(bm)) lines.push({ pts: [[0, bm], [xmax, bm]], colour: '--muted', dash: '5 4' });
    Sim.plot($('bn-two'), { title: 'Decay curve with and without background', desc: 'Orange curve: count rate including background, which levels off at the background. Blue curve: net count rate after subtracting your mean background, which keeps falling.', xlabel: 'day, t / ' + dayWord(), ylabel: 'count rate, R / counts per min', zero: true, xmin: 0, xmax: xmax, ymin: ymin, ymax: ymax, points: pts, lines: lines });
    var two = $('bn-two'), NS = 'http://www.w3.org/2000/svg', n = rows.length;
    if (best && n > 1) {
      var cs = [].slice.call(two.querySelectorAll('circle')), raw = cs.slice(0, n), net = ok ? cs.slice(n, 2 * n) : [];
      function pt(c) { return [+c.getAttribute('cx'), +c.getAttribute('cy')]; }
      if (net.length === n) {
        var poly = document.createElementNS(NS, 'polygon');
        function pathPts(col) { var p = [].slice.call(two.querySelectorAll('path')).filter(function (e) { return e.getAttribute('stroke') === 'var(' + col + ')' && !e.getAttribute('stroke-dasharray'); })[0]; return p ? (p.getAttribute('d').match(/-?[\d.]+[ ,]-?[\d.]+/g) || []).map(function (s) { return s.split(/[ ,]/).map(Number); }) : []; }
        var a = pathPts('--c2'), z = pathPts('--c1').reverse(); if (!a.length || !z.length) { a = raw.map(pt); z = net.map(pt).reverse(); }
        poly.setAttribute('points', a.concat(z).map(function (p) { return p.join(','); }).join(' '));
        poly.setAttribute('fill', 'var(--c2)'); poly.setAttribute('opacity', '0.3');
        two.insertBefore(poly, two.firstChild);
      }
      function tag(c, txt, col, dx, dy) {
        var p = pt(c), t = document.createElementNS(NS, 'text');
        t.setAttribute('x', p[0] + dx); t.setAttribute('y', p[1] + dy); t.setAttribute('style', 'fill:var(' + col + ');font:700 13px var(--f-body)'); t.textContent = txt; two.appendChild(t);
      }
      var k = Math.min(2, n - 1);
      tag(raw[k], 'WITH background', '--c2', 14, -14);
      if (net.length === n) tag(net[k], 'WITHOUT background', '--c1', 22, 32);
    }
    lg.appendChild(el('li', { style: 'color:var(--c2)' }, el('span', { class: 'sol' }), el('span', { style: 'color:var(--ink)', text: 'WITH background (raw readings)' })));
    lg.appendChild(el('li', { style: 'color:var(--c1)' }, el('span', { class: 'sol' }), el('span', { style: 'color:var(--ink)', text: ok ? 'WITHOUT background (net = reading − mean background)' : 'WITHOUT background (measure the background first)' })));
    if (isFinite(bm)) lg.appendChild(el('li', { style: 'color:var(--muted);font-weight:400', text: 'dashed line = your mean background, ' + d1(bm) + ' counts/min' }));
  }

  /* ---------- render and apply ---------- */
  function render() {
    drawBench(String(0), 'time 0 s'); buildControls(); renderLog(); renderSummary(); renderTwo(); renderPlot();
    $('bn-info').textContent = 'The Geiger-Müller tube counts the particles that reach it. Choose the settings, then press Start count. Always measure the background first, with the source in its box. ' + (C.note || '');
    $('bn-banner').textContent = exampleOn ? 'Example data loaded: three background counts and a decay curve for Source Z. Press Clear readings to start your own.' : '';
    var nb = $('bn-net'), ok = netOK(); nb.disabled = !ok; nb.checked = showNet && ok; if (!ok) showNet = false;
    $('bn-gate').textContent = ok ? '' : 'The net count rate needs your background: take at least three counts with the source in its box first.';
    $('bn-theory').checked = showTheory;
  }
  function apply(cfg) {
    C = Object.assign({}, DEF, cfg); st = { sourceIn: !!C.sourceIn, srcId: C.sources[0], day: C.days[0], dist: C.distances.indexOf(5) >= 0 ? 5 : C.distances[0], abs: 'none', seconds: C.seconds, view: C.view };
    log = []; idx = 0; busy = false; showNet = false; showTheory = false; exampleOn = false; base = Math.floor(Math.random() * 1e9);
    render();
  }
  function loadExample() {
    C = EXAMPLE; st = { sourceIn: true, srcId: 'Z', day: 0, dist: 5, abs: 'none', seconds: 60, view: 'decay' }; log = []; idx = 0; base = 4242; showNet = false; showTheory = false; exampleOn = true;
    [0, 1, 2].forEach(function () { addRow(false, 0, 5, 'none', 60, counts(false, 'Z', 0, 5, 'none', 60)); });
    C.days.forEach(function (d) { addRow(true, d, 5, 'none', 60, counts(true, 'Z', d, 5, 'none', 60)); });
    render();
  }

  $('b-bclear').addEventListener('click', function () { if (busy) return; log = []; exampleOn = false; render(); });
  $('bn-net').addEventListener('change', function (e) { showNet = e.target.checked; render(); });
  $('bn-theory').addEventListener('change', function (e) { showTheory = e.target.checked; renderTwo(); renderPlot(); });
  window.addEventListener('resize', function () { if (!busy) { renderTwo(); renderPlot(); } });
  HL.bench = { apply: apply, render: render, state: function () { return { C: C, st: st, log: log }; } };
  loadExample();
})();
