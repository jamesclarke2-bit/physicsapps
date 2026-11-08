/* Geiger counter bench: measure the background count rate (source away), then count a source.
   Physics (random counts, background, decay of the source) comes from model.js (benchCount). UI only. */
(function () {
  'use strict';
  var M = window.HalfLifeModel, el = Sim.el, sv = Sim.svgel, fmt = Sim.fmt, HL = window.HL = window.HL || {};
  var $ = function (id) { return document.getElementById(id); };
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var EXAMPLE = { bg: 30, net0: 800, unit: 'd', src: { iso: 'custom', T: 2, unit: 'd', name: 'Source Z' }, days: [0, 2, 4, 6], seconds: 60, secondsOptions: [30, 60, 120, 300], sourceIn: true };
  var C = EXAMPLE, st = { sourceIn: true, day: 0, seconds: 60 }, log = [], idx = 0, base = 4242, busy = false, showNet = false, note = '', exampleOn = false, nodes = {};

  function dayWord() { return M.UNITS[C.unit].label; }
  function rate(r) { return M.toCpm(r.counts, r.sec); }
  function bgRows() { return log.filter(function (r) { return !r.src && !r.off; }); }
  function stats(rows) {
    var v = rows.map(rate), n = v.length, mean = n ? M.mean(v) : NaN, half = n ? M.halfRange(v) : NaN;
    return { n: n, mean: mean, half: half, pct: n ? 100 * half / mean : NaN, min: Math.min.apply(null, v), max: Math.max.apply(null, v), v: v };
  }
  function bgMean() { var b = bgRows(); return b.length ? stats(b).mean : NaN; }
  function d1(x) { return fmt(x, 1); }

  /* ---------- the bench picture ---------- */
  function drawBench(countText, timeText) {
    var svg = $('bench-svg'); svg.textContent = '';
    svg.setAttribute('viewBox', '0 0 480 250'); svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Bench: Geiger-Müller tube joined to a counter. ' + (st.sourceIn ? 'The source is on a stand 5 cm from the tube window.' : 'The source is away in its lead-lined box on the shelf, 1 m from the tube.'));
    var A = function (t, a, tx) { var n = sv(t, a, tx); svg.appendChild(n); return n; };
    // table and shelf
    A('rect', { x: 8, y: 205, width: 464, height: 14, class: 'bn-fill' }); A('rect', { x: 24, y: 219, width: 10, height: 26, class: 'bn-fill' }); A('rect', { x: 446, y: 219, width: 10, height: 26, class: 'bn-fill' });
    A('line', { x1: 30, y1: 84, x2: 96, y2: 84, class: 'bn-line' });
    // stand and tube
    A('rect', { x: 190, y: 195, width: 80, height: 10, class: 'bn-fill' }); A('rect', { x: 226, y: 134, width: 6, height: 62, class: 'bn-fill' });
    A('rect', { x: 110, y: 118, width: 138, height: 28, rx: 14, class: 'bn-fill' }); A('rect', { x: 216, y: 129, width: 18, height: 12, class: 'bn-fill' });
    A('line', { x1: 112, y1: 124, x2: 112, y2: 140, class: 'bn-win' });
    A('text', { x: 160, y: 168, class: 'bn-t' }, 'Geiger-Müller tube');
    A('path', { d: 'M248 132 C290 132 290 150 330 150', class: 'bn-line' });
    // counter
    A('rect', { x: 330, y: 70, width: 140, height: 135, rx: 8, class: 'bn-fill' }); A('rect', { x: 344, y: 84, width: 112, height: 46, rx: 4, class: 'bn-lcd' });
    nodes.cnt = A('text', { x: 400, y: 117, class: 'bn-num', 'text-anchor': 'middle' }, countText);
    A('text', { x: 400, y: 150, class: 'bn-t', 'text-anchor': 'middle' }, 'counts');
    nodes.tm = A('text', { x: 400, y: 170, class: 'bn-t', 'text-anchor': 'middle' }, timeText); A('text', { x: 400, y: 193, class: 'bn-t bn-s', 'text-anchor': 'middle' }, 'Geiger counter');
    // background radiation
    [160, 195, 230].forEach(function (x, k) { A('line', { x1: x + 30 - k * 6, y1: 40, x2: x, y2: 112, class: 'bn-bgray' }); });
    A('text', { x: 200, y: 30, class: 'bn-t bn-m', 'text-anchor': 'middle' }, 'background radiation (always there)');
    // the source
    if (st.sourceIn) {
      A('rect', { x: 20, y: 150, width: 26, height: 55, class: 'bn-fill' }); A('circle', { cx: 33, cy: 132, r: 8, class: 'bn-src' });
      A('line', { x1: 43, y1: 132, x2: 106, y2: 132, class: 'bn-ray' });
      A('text', { x: 33, y: 112, class: 'bn-t', 'text-anchor': 'middle' }, 'source');
      A('line', { x1: 33, y1: 182, x2: 110, y2: 182, class: 'bn-dim' }); A('text', { x: 72, y: 196, class: 'bn-t bn-s', 'text-anchor': 'middle' }, '5 cm');
      A('rect', { x: 40, y: 52, width: 46, height: 32, class: 'bn-leadopen' }); A('text', { x: 63, y: 46, class: 'bn-t bn-s', 'text-anchor': 'middle' }, 'empty lead box');
    } else {
      A('rect', { x: 40, y: 52, width: 46, height: 32, class: 'bn-lead' }); A('rect', { x: 38, y: 48, width: 50, height: 6, class: 'bn-lead' });
      A('text', { x: 63, y: 40, class: 'bn-t bn-s', 'text-anchor': 'middle' }, 'lead-lined box');
      A('text', { x: 63, y: 98, class: 'bn-t bn-s', 'text-anchor': 'middle' }, 'source inside,');
      A('text', { x: 63, y: 110, class: 'bn-t bn-s', 'text-anchor': 'middle' }, '1 m away');
    }
  }

  /* ---------- controls ---------- */
  function segBtns(box, label, options, get, set) {
    box.textContent = '';
    box.appendChild(el('span', { class: 'lab', text: label }));
    var g = el('div', { class: 'seg', role: 'group', 'aria-label': label });
    options.forEach(function (o) { g.appendChild(el('button', { type: 'button', disabled: busy, text: o[1], 'aria-pressed': String(get() === o[0]), onclick: function () { set(o[0]); render(); } })); });
    box.appendChild(g);
  }
  function buildControls() {
    var box = $('bn-ctl'); box.textContent = '';
    var a = el('div', { class: 'ctl' }); segBtns(a, 'Source', [[true, 'Next to the tube'], [false, 'In its lead-lined box']], function () { return st.sourceIn; }, function (v) { st.sourceIn = v; });
    box.appendChild(a);
    if (C.days.length > 1 && st.sourceIn) {
      var d = el('div', { class: 'ctl' }); segBtns(d, 'Day of the experiment (' + dayWord() + ')', C.days.map(function (x) { return [x, String(x)]; }), function () { return st.day; }, function (v) { st.day = v; });
      box.appendChild(d);
    }
    if (C.secondsOptions.length > 1) {
      var t = el('div', { class: 'ctl' }); segBtns(t, 'Counting time', C.secondsOptions.map(function (x) { return [x, x < 60 ? x + ' s' : (x / 60) + ' min']; }), function () { return st.seconds; }, function (v) { st.seconds = v; });
      box.appendChild(t);
    }
    box.appendChild(el('div', { class: 'btns' }, el('button', { class: 'btn primary', id: 'b-count', type: 'button', disabled: busy, text: busy ? 'Counting…' : 'Start count (' + (st.seconds < 60 ? st.seconds + ' s' : (st.seconds / 60) + ' min') + ')', onclick: startCount })));
    box.appendChild(el('p', { class: 'fine', role: 'status', 'aria-live': 'polite', id: 'bn-status', text: '' }));
  }

  /* ---------- counting ---------- */
  function startCount() {
    if (busy) return;
    var sec = st.seconds, day = st.sourceIn ? st.day : 0, counts = M.benchCount(C, st.sourceIn, day, sec, Sim.rng(base + idx * 7919));
    idx++; busy = true; exampleOn = false; buildControls();
    var t0 = null, dur = reduce ? 0 : 1600;
    function finish() { busy = false; log.push({ src: st.sourceIn, day: day, sec: sec, counts: counts, off: false }); render(); var s = $('bn-status'); if (s) s.textContent = 'Counted ' + counts + ' counts in ' + sec + ' s.'; }
    function frame(ts) {
      if (t0 === null) t0 = ts; var p = dur ? Math.min(1, (ts - t0) / dur) : 1;
      if (nodes.cnt) nodes.cnt.textContent = String(Math.round(counts * p)); if (nodes.tm) nodes.tm.textContent = 'time ' + Math.round(sec * p) + ' s';
      if (p < 1) requestAnimationFrame(frame); else finish();
    }
    if (!dur) { if (nodes.cnt) nodes.cnt.textContent = String(counts); finish(); } else requestAnimationFrame(frame);
  }
  function addReading(src, day, sec) { var counts = M.benchCount(C, src, day, sec, Sim.rng(base + idx * 7919)); idx++; log.push({ src: src, day: day, sec: sec, counts: counts, off: false }); }

  /* ---------- tables ---------- */
  function renderLog() {
    var box = $('bn-log'); box.textContent = '';
    if (!log.length) { box.appendChild(el('p', { class: 'empty', text: 'No readings yet. Set up the bench and press Start count.' })); return; }
    var bm = bgMean(), heads = ['Reading', 'Source', 'Day (' + dayWord() + ')', 'Counting time (s)', 'Counts', 'Count rate (counts/min)'];
    if (showNet) heads.push('Net count rate (counts/min)');
    var rows = log.map(function (r, i) {
      var cr = rate(r), tds = [
        el('td', null, el('button', { type: 'button', class: 'xo', 'aria-pressed': String(r.off), 'aria-label': (r.off ? 'Restore' : 'Cross out') + ' reading ' + (i + 1), onclick: function () { r.off = !r.off; render(); }, text: String(i + 1) })),
        el('td', { text: r.src ? 'next to tube' : 'away' }), el('td', { class: 'num', text: r.src && C.days.length > 1 ? String(r.day) : '–' }), el('td', { class: 'num', text: String(r.sec) }), el('td', { class: 'num', text: String(r.counts) }),
        el('td', { class: 'num' }, Sim.calcButton(d1(cr), 'Count rate', function () { return [Sim.steps([['Counts per minute = counts × 60 ÷ counting time', r.counts + ' × 60 ÷ ' + r.sec + ' = ' + fmt(cr, 2) + ' counts/min']])]; }))];
      if (showNet) tds.push(el('td', { class: 'num', text: r.src && isFinite(bm) ? d1(cr - bm) : '–' }));
      return el('tr', { class: r.off ? 'off' : '' }, tds);
    });
    box.appendChild(el('div', { class: 'tablewrap' }, el('table', { class: 'data' }, el('thead', null, el('tr', null, heads.map(function (h) { return el('th', { scope: 'col', text: h }); }))), el('tbody', null, rows))));
  }
  function popMean(s) { return [Sim.steps([['Add the count rates that are not crossed out', s.v.map(d1).join(' + ') + ' = ' + d1(s.v.reduce(function (a, b) { return a + b; }, 0)) + ' counts/min'], ['Divide by how many there are', 'mean = ' + d1(s.v.reduce(function (a, b) { return a + b; }, 0)) + ' ÷ ' + s.n + ' = ' + fmt(s.mean, 2) + ' counts/min']])]; }
  function popUnc(s) { return [Sim.steps([['Half the range', 'uncertainty = ½ (' + d1(s.max) + ' − ' + d1(s.min) + ') = ' + fmt(s.half, 2) + ' counts/min'], ['Percentage uncertainty', fmt(s.half, 2) + ' ÷ ' + fmt(s.mean, 2) + ' × 100 = ' + d1(s.pct) + '%']]), el('p', { text: 'Repeating shows the spread and gives a mean. A longer counting time gives a bigger count, so the same random scatter is a smaller percentage.' })]; }
  function renderSummary() {
    var box = $('bn-sum'); box.textContent = '';
    var secs = []; bgRows().forEach(function (r) { if (secs.indexOf(r.sec) < 0) secs.push(r.sec); }); secs.sort(function (a, b) { return a - b; });
    if (!secs.length) { box.appendChild(el('p', { class: 'empty', text: 'No background readings yet. Put the source in its lead-lined box and count.' })); }
    else {
      var rows = secs.map(function (sc) {
        var s = stats(bgRows().filter(function (r) { return r.sec === sc; }));
        return el('tr', null, el('td', { class: 'num', text: String(sc) }), el('td', { class: 'num', text: String(s.n) }),
          el('td', { class: 'num' }, Sim.calcButton(d1(s.mean), 'Mean', function () { return popMean(s); })),
          el('td', { class: 'num' }, s.n > 1 ? Sim.calcButton(d1(s.half), 'Uncertainty', function () { return popUnc(s); }) : '–'),
          el('td', { class: 'num', text: s.n > 1 ? d1(s.pct) + '%' : '–' }));
      });
      box.appendChild(el('div', { class: 'tablewrap' }, el('table', { class: 'data' }, el('thead', null, el('tr', null, ['Time (s)', 'Readings', 'Mean (counts/min)', 'Uncertainty (counts/min)', 'Uncertainty (%)'].map(function (h) { return el('th', { scope: 'col', text: h }); }))), el('tbody', null, rows))));
      var big = bgRows().some(function (r) { return rate(r) > 100; });
      if (big) box.appendChild(el('p', { class: 'warn', text: 'A background reading above 100 counts per minute is far too big. Is the source still next to the tube?' }));
    }
    box.appendChild(el('p', { class: 'fine', text: 'Only readings taken with the source away are used here. Click a reading number in the table to cross out an anomaly.' }));
  }

  /* ---------- graph ---------- */
  function renderPlot() {
    var byDay = C.days.length > 1, pts = [], lines = [], bm = bgMean(), xs = [];
    log.forEach(function (r, i) {
      if (r.off) return; var x = byDay ? (r.src ? r.day : null) : i + 1; if (x === null) return;
      pts.push({ x: x, y: rate(r), colour: r.src ? '--c1' : '--c2' }); xs.push(x);
    });
    var ymax = Math.max(50, Math.max.apply(null, pts.map(function (p) { return p.y; }).concat([isFinite(bm) ? bm : 0])) * 1.12), xmax = byDay ? Math.max.apply(null, C.days) || 1 : Math.max(5, log.length + 1);
    if (isFinite(bm)) lines.push({ pts: [[0, bm], [xmax, bm]], colour: '--muted', dash: '5 4' });
    Sim.plot($('bn-plot'), { title: 'Count rates', desc: 'Each point is one reading in counts per minute. The dashed line is the mean background.', xlabel: byDay ? 'day, t / ' + dayWord() : 'reading number', ylabel: 'count rate, R / counts per min', zero: true, xmin: 0, xmax: xmax, ymin: 0, ymax: ymax, points: pts, lines: lines });
    var lg = $('bn-legend'); lg.textContent = '';
    lg.appendChild(el('li', { style: 'color:var(--c1)' }, el('span', { class: 'sol' }), el('span', { style: 'color:var(--ink)', text: 'source next to the tube' })));
    if (!byDay) lg.appendChild(el('li', { style: 'color:var(--c2)' }, el('span', { class: 'sol' }), el('span', { style: 'color:var(--ink)', text: 'source away (background)' })));
    lg.appendChild(el('li', { style: 'color:var(--muted)', text: 'dashed line = mean background' }));
  }

  /* ---------- render and apply ---------- */
  function render() {
    drawBench(String(0), 'time 0 s'); buildControls(); renderLog(); renderSummary(); renderPlot();
    var info = $('bn-info');
    info.textContent = 'The Geiger-Müller tube counts the particles that reach it. ' + (C.days.length > 1 ? 'Choose the day and the counting time, then press Start count. ' : 'Choose the counting time, then press Start count. ') + (note || '');
    var lbl = $('bn-banner'); lbl.textContent = exampleOn ? 'Example data loaded (three background counts and one source count). Press Clear readings to start your own.' : '';
    var nb = $('bn-net'); if (nb) nb.checked = showNet;
  }
  function apply(cfg) {
    C = Object.assign({}, EXAMPLE, cfg); st = { sourceIn: !!cfg.sourceIn, day: C.days[0], seconds: cfg.seconds || 60 };
    log = []; idx = 0; busy = false; showNet = false; note = cfg.note || ''; exampleOn = false; base = Math.floor(Math.random() * 1e9);
    render();
  }
  function loadExample() {
    C = EXAMPLE; st = { sourceIn: true, day: 0, seconds: 60 }; log = []; idx = 0; base = 4242; showNet = false; note = ''; exampleOn = true;
    addReading(false, 0, 60); addReading(false, 0, 60); addReading(false, 0, 60); addReading(true, 0, 60); render();
  }

  $('b-bclear').addEventListener('click', function () { if (busy) return; log = []; exampleOn = false; render(); });
  $('bn-net').addEventListener('change', function (e) { showNet = e.target.checked; renderLog(); });
  window.addEventListener('resize', function () { if (!busy) renderPlot(); });
  HL.bench = { apply: apply, render: render, state: function () { return { C: C, st: st, log: log }; } };
  loadExample();
})();
