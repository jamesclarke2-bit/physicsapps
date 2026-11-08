/* Half-life and Choosing Isotopes: simulator, measuring tool and isotope chooser. UI only.
   All physics comes from model.js; generic widgets from ../shared/sim.js; questions and marking are in questions.js and quiz.js. */
(function () {
  'use strict';
  var M = window.HalfLifeModel, QB = window.HalfLifeQuestions, el = Sim.el, fmt = Sim.fmt, sig = M.sig;
  var $ = function (id) { return document.getElementById(id); };
  var HL = window.HL = window.HL || {};
  var COLS = ['--c1', '--c2', '--c3'];
  var THINK = {
    decay: 'Predict first: after three half-lives, how much of the sample is left? Then press Play and check.',
    measure: 'Predict first: will the three halving times be exactly the same? What could make them differ?',
    choose: 'Predict first: which type of radiation does the job need, and should the half-life be short or long? Then choose an isotope.',
    bench: 'Predict first: with the source put away, will the counter read zero? Will every count be the same?'
  };
  var DEFAULT = { unit: 'h', tmax: 36, quantity: 'activity', bg: 0, subtract: false, equalN: false, nGrid: 200, showTheory: false, showSim: true, showMix: false,
    marks: [], sources: [{ iso: 'Tc99m', start: 800 }] };
  var S, clk = 0, seed = 11, playing = false, speed = 1, reveal = false, times = [], perm = [], Ts = [], cvs = [], layout = [];
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- helpers ---------- */
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function isoOf(src) { return M.resolve(src); }
  function label(src) { return src.name || isoOf(src).name; }
  function showT(src) { return !src.mystery || reveal; }
  function UL() { return M.UNITS[S.unit].label; }
  function cnt() { return S.quantity === 'count'; }
  function off() { return cnt() && !S.subtract ? S.bg : 0; }
  function v0(i) { var s = S.sources[i]; return (S.equalN && S.quantity === 'activity') ? M.activityFromNuclei(s.start, isoOf(s)) : s.start; }
  function theory(i, t) { return v0(i) * M.fraction(t, Ts[i]) + off(); }
  function simv(i, t) { return v0(i) * M.remainingAt(times[i], t) / S.nGrid + off(); }
  function mixTheory(t) { var s = off(); for (var i = 0; i < S.sources.length; i++) s += v0(i) * M.fraction(t, Ts[i]); return s; }
  function mixSim(t) { var s = off(); for (var i = 0; i < S.sources.length; i++) s += v0(i) * M.remainingAt(times[i], t) / S.nGrid; return s; }
  function css(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
  function fmtAct(x) { var a = Math.abs(x); if (a >= 1e9) return sig(x / 1e9, 3) + ' GBq'; if (a >= 1e6) return sig(x / 1e6, 3) + ' MBq'; if (a >= 1e3) return sig(x / 1e3, 3) + ' kBq'; return sig(x, 3) + ' Bq'; }
  function fmtVal(x) { return S.quantity === 'activity' ? fmtAct(x) : S.quantity === 'count' ? sig(x, 3) + ' counts/min' : sig(x, 3) + ' nuclei'; }
  function fmtTime(t) { return sig(t, 3) + ' ' + UL(); }
  function yInfo() {
    var mx = 0, i, v;
    for (i = 0; i < S.sources.length; i++) { v = v0(i); if (v > mx) mx = v; }
    if (S.showMix && S.sources.length > 1) { v = 0; for (i = 0; i < S.sources.length; i++) v += v0(i); if (v > mx) mx = v; }
    mx += off();
    if (S.quantity === 'activity') {
      var d = mx >= 1e9 ? [1e9, 'GBq'] : mx >= 1e6 ? [1e6, 'MBq'] : mx >= 1e3 ? [1e3, 'kBq'] : [1, 'Bq'];
      return { div: d[0], max: mx / d[0], label: 'activity, A / ' + d[1] };
    }
    if (cnt()) return { div: 1, max: mx, label: 'count rate, R / counts per min' };
    var e = Math.floor(Math.log10(mx || 1));
    if (e >= 4) return { div: Math.pow(10, e), max: mx / Math.pow(10, e), label: 'nuclei left, N (× 10' + M.supStr(e) + ')' };
    return { div: 1, max: mx, label: 'nuclei left, N' };
  }

  /* ---------- state ---------- */
  function regen() {
    times = []; perm = []; Ts = S.sources.map(function (s) { return M.halfLifeIn(isoOf(s), S.unit); });
    S.sources.forEach(function (s, i) {
      times.push(M.decayTimes(S.nGrid, Ts[i], Sim.rng(seed * 31 + i * 7919)));
      var r = Sim.rng(seed * 17 + i), p = [], k, j, tmp;
      for (k = 0; k < S.nGrid; k++) p.push(k);
      for (k = S.nGrid - 1; k > 0; k--) { j = Math.floor(r.next() * (k + 1)); tmp = p[k]; p[k] = p[j]; p[j] = tmp; }
      perm.push(p);
    });
  }
  function syncEqual() { if (S.equalN) S.sources.forEach(function (s) { s.start = S.sources[0].start; }); }
  function structural() { syncEqual(); regen(); buildControls(); buildGrids(); rebuildMeasure(); renderAll(); }

  /* ---------- controls ---------- */
  function seg(box, options, get, set) {
    box.textContent = '';
    options.forEach(function (o) { box.appendChild(el('button', { type: 'button', text: o[1], 'aria-pressed': String(get() === o[0]), onclick: function () { set(o[0]); seg(box, options, get, set); } })); });
  }
  function startLabel() {
    if (S.equalN && S.quantity === 'activity') return 'Starting number of nuclei (the same for each)';
    return S.quantity === 'activity' ? 'Starting activity (Bq)' : cnt() ? 'Starting net count rate (counts/min)' : 'Starting number of nuclei';
  }
  function changeQuantity(q) {
    if (q === S.quantity) return;
    S.sources.forEach(function (s, i) {
      var iso = isoOf(s), a = v0(i);                       // current value in the old quantity
      if (S.quantity === 'nuclei' && q === 'activity') s.start = M.activityFromNuclei(s.start, iso);
      else if (S.quantity !== 'nuclei' && q === 'nuclei') s.start = M.nucleiFromActivity(a, iso);
      else if (S.quantity === 'activity' && q === 'count') s.start = a;
    });
    if (q === 'count' && S.equalN) S.equalN = false;
    if (q === 'count' && !S.bg) S.bg = 20;
    S.quantity = q; structural();
  }
  function changeUnit(u) {
    var k = M.UNITS[S.unit].f / M.UNITS[u].f; S.tmax = +(S.tmax * k).toPrecision(2); clk = clk * k; S.unit = u; S.marks = S.marks.map(function (m) { return { t: m.t * k, label: m.label }; }); clampClock(); structural();
  }
  function clampClock() { clk = Math.max(0, Math.min(S.tmax, clk)); }
  function buildControls() {
    var box = $('c-set'); box.textContent = '';
    box.appendChild(el('div', { class: 'cardhead' }, el('h2', { text: 'Set up' })));
    S.sources.forEach(function (s, i) {
      var iso = isoOf(s), row = el('div', { class: 'srcrow s' + i }, el('span', { class: 'sw', 'aria-hidden': 'true' }));
      if (s.iso === 'custom' || s.mystery) {
        row.appendChild(el('div', null, el('strong', { text: label(s) }), el('span', { class: 'sm', text: showT(s) ? 'half-life ' + M.halfLifeText(iso) + (iso.emits.length ? ' · ' + M.radiationText(iso) : '') : 'half-life hidden' })));
      } else {
        row.appendChild(el('select', { 'aria-label': 'Isotope ' + (i + 1), onchange: function (e) { s.iso = e.target.value; structural(); } },
          M.ISOTOPES.map(function (o) { return el('option', { value: o.id, selected: o.id === s.iso, text: o.sym + ' (' + M.halfLifeText(o) + ')' }); })));
      }
      row.appendChild(S.sources.length > 1 && !HL.lockSources ? el('button', { class: 'btn', type: 'button', text: 'Remove', 'aria-label': 'Remove source ' + (i + 1), onclick: function () { S.sources.splice(i, 1); if (S.sources.length < 2) { S.showMix = false; S.equalN = false; } structural(); } }) : el('span'));
      if (!(S.equalN && i > 0)) {
        var inp = el('input', { type: 'text', 'aria-label': startLabel() + (S.sources.length > 1 ? ', source ' + (i + 1) : ''), value: sig(s.start, 4).replace('−', '-').replace(/ × 10(.+)$/, function (_, e) { return 'e' + e.split('').map(function (c) { return '⁰¹²³⁴⁵⁶⁷⁸⁹⁻'.indexOf(c) < 0 ? c : (c === '⁻' ? '-' : '⁰¹²³⁴⁵⁶⁷⁸⁹'.indexOf(c)); }).join(''); }),
          onchange: function (e) { var v = QB.parseNum(e.target.value).v; if (isFinite(v) && v > 0) { s.start = v; if (S.equalN) syncEqual(); regen(); buildGrids(); rebuildMeasure(); renderAll(); } else e.target.value = String(s.start); } });
        row.appendChild(el('div', { class: 'startrow' }, el('label', { text: startLabel() }), inp));
      }
      box.appendChild(row);
    });
    if (S.sources.length < 3 && !HL.lockSources) box.appendChild(el('div', { class: 'btns', style: 'margin:0 0 12px' }, el('button', { class: 'btn', type: 'button', text: 'Add another isotope', onclick: function () {
      var used = S.sources.map(function (s) { return s.iso; }), nx = M.ISOTOPES.filter(function (o) { return used.indexOf(o.id) < 0; })[0];
      S.sources.push({ iso: nx.id, start: S.sources[0].start }); structural(); } })));
    var q = el('div', { class: 'ctl' }, el('span', { class: 'lab', text: 'What the graph shows' }), el('div', { class: 'seg', role: 'group', 'aria-label': 'Quantity' }));
    seg(q.lastChild, [['activity', 'Activity'], ['count', 'Count rate'], ['nuclei', 'Nuclei left']], function () { return S.quantity; }, changeQuantity);
    box.appendChild(q);
    if (cnt()) {
      box.appendChild(el('div', { class: 'ctl' }, el('label', { for: 'c-bg', html: 'Background, <b id="o-bg">' + S.bg + ' counts/min</b>' }),
        el('input', { id: 'c-bg', type: 'range', min: 0, max: 60, step: 5, value: S.bg, oninput: function (e) { S.bg = +e.target.value; $('o-bg').textContent = S.bg + ' counts/min'; rebuildMeasure(); renderAll(); } }),
        el('label', { class: 'chk' }, el('input', { type: 'checkbox', checked: S.subtract, onchange: function (e) { S.subtract = e.target.checked; rebuildMeasure(); renderAll(); buildMeasureSide(); } }), 'Subtract background from the readings')));
    }
    if (S.sources.length > 1 && S.quantity !== 'count') {
      box.appendChild(el('label', { class: 'chk' }, el('input', { type: 'checkbox', checked: S.equalN, onchange: function (e) { S.equalN = e.target.checked; structural(); } }), 'Start every source with the same number of nuclei'));
    }
    var nb = el('div', { class: 'ctl' }, el('span', { class: 'lab', text: 'Nuclei drawn (a small sample)' }), el('div', { class: 'seg', role: 'group', 'aria-label': 'Nuclei drawn' }));
    seg(nb.lastChild, [[100, '100'], [200, '200'], [500, '500']], function () { return S.nGrid; }, function (v) { S.nGrid = v; regen(); buildGrids(); rebuildMeasure(); renderAll(); buildMeasureSide(); });
    box.appendChild(nb);
    box.appendChild(el('div', { class: 'ctl' }, el('label', { for: 'c-unit', text: 'Time axis' }),
      el('div', { class: 'axrow' }, el('select', { id: 'c-unit', 'aria-label': 'Time unit', onchange: function (e) { changeUnit(e.target.value); } },
        M.TIME_UNITS.map(function (u) { return el('option', { value: u, selected: u === S.unit, text: M.UNITS[u].many }); })),
        el('input', { class: 'numin', type: 'text', 'aria-label': 'Longest time shown', value: String(S.tmax), onchange: function (e) { var v = QB.parseNum(e.target.value).v; if (isFinite(v) && v > 0) { S.tmax = v; clampClock(); structural(); } else e.target.value = String(S.tmax); } }))));
    var sp = el('div', { class: 'ctl' }, el('span', { class: 'lab', text: 'Speed' }), el('div', { class: 'seg', role: 'group', 'aria-label': 'Speed' }));
    seg(sp.lastChild, [[0.5, '0.5×'], [1, '1×'], [2, '2×']], function () { return speed; }, function (v) { speed = v; });
    box.appendChild(sp);
    if (S.sources.some(function (s) { return s.mystery; })) {
      box.appendChild(el('label', { class: 'chk' }, el('input', { type: 'checkbox', checked: reveal, onchange: function (e) { reveal = e.target.checked; structural(); } }), 'Reveal the half-life of the unknown isotope'));
    }
    box.appendChild(el('div', { class: 'btns', style: 'margin-top:12px' }, el('button', { class: 'btn', type: 'button', text: 'Back to the example', onclick: function () { HL.lockSources = false; loadExample(); } })));
    box.appendChild(el('p', { class: 'fine', id: 'exlabel', text: HL.exampleOn ? 'Example loaded: technetium-99m. Change anything, or press Back to the example.' : '' }));
  }

  /* ---------- the nuclei ---------- */
  function buildGrids() {
    var box = $('grids'); box.textContent = ''; cvs = [];
    S.sources.forEach(function (s, i) {
      var cv = el('canvas', { role: 'img', 'aria-label': 'Nuclei' }), gl = el('div', { class: 'gl' }, el('b', { text: label(s) }), el('span', { id: 'gc-' + i }));
      box.appendChild(el('div', { class: 'gridbox' }, gl, cv)); cvs.push(cv);
    });
    drawGrids();
  }
  function drawGrids() {
    var dpr = window.devicePixelRatio || 1, i;
    for (i = 0; i < cvs.length; i++) {
      var cv = cvs[i], N = S.nGrid, w = cv.clientWidth || 300, cell = Math.max(6, Math.min(16, Math.sqrt(w * 170 / N))), cols = Math.max(1, Math.floor(w / cell)), rows = Math.ceil(N / cols), h = rows * cell;
      cv.style.height = h + 'px'; cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      var g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
      var col = css(COLS[i]), mu = css('--muted'), ac = css('--accent'), recent = S.tmax / 30, left = 0, k, pos, cx, cy, r = cell * 0.36;
      var shape = i;
      for (k = 0; k < N; k++) {
        pos = perm[i][k]; cx = (pos % cols + 0.5) * cell; cy = (Math.floor(pos / cols) + 0.5) * cell;
        var d = times[i][k] <= clk;
        if (!d) {
          left++; g.fillStyle = col; g.beginPath();
          if (shape === 0) g.arc(cx, cy, r, 0, 6.2832); else if (shape === 1) g.rect(cx - r * 0.85, cy - r * 0.85, r * 1.7, r * 1.7); else { g.moveTo(cx, cy - r * 1.1); g.lineTo(cx + r * 1.1, cy); g.lineTo(cx, cy + r * 1.1); g.lineTo(cx - r * 1.1, cy); g.closePath(); }
          g.fill();
        } else {
          g.lineWidth = clk - times[i][k] < recent && clk > 0 ? 2 : 1.2; g.strokeStyle = clk - times[i][k] < recent && clk > 0 ? ac : mu; g.beginPath(); g.arc(cx, cy, r * 0.62, 0, 6.2832); g.stroke();
        }
      }
      cv.setAttribute('aria-label', label(S.sources[i]) + ': ' + left + ' of ' + N + ' nuclei not yet decayed at t = ' + fmtTime(clk));
      var gc = $('gc-' + i); if (gc) gc.textContent = left + ' of ' + N + ' left';
    }
  }

  /* ---------- graph and readout ---------- */
  function renderPlot() {
    var Y = yInfo(), lines = [], pts = [], n = 120, ymax = Y.max * 1.05, j, t, i;
    function traceSim(fn, col) {
      var pp = [], m = 200, end = clk;
      for (j = 0; j <= m; j++) { t = end * j / m; pp.push([t, fn(t) / Y.div]); }
      lines.push({ pts: pp, colour: col });
    }
    S.sources.forEach(function (s, idx) {
      var col = COLS[idx];
      if (S.showTheory) { var pp = []; for (j = 0; j <= n; j++) { t = S.tmax * j / n; pp.push([t, theory(idx, t) / Y.div]); } lines.push({ pts: pp, colour: col, dash: '6 4' }); }
      if (S.showSim && clk > 0) traceSim(function (tt) { return simv(idx, tt); }, col);
      if (S.showSim) pts.push({ x: clk, y: simv(idx, clk) / Y.div, colour: col });
    });
    if (S.showMix && S.sources.length > 1) {
      if (S.showTheory) { var mp = []; for (j = 0; j <= n; j++) { t = S.tmax * j / n; mp.push([t, mixTheory(t) / Y.div]); } lines.push({ pts: mp, colour: '--c4', dash: '6 4' }); }
      if (S.showSim && clk > 0) traceSim(mixSim, '--c4');
    }
    if (off()) lines.push({ pts: [[0, off() / Y.div], [S.tmax, off() / Y.div]], colour: '--muted', dash: '2 3' });
    S.marks.forEach(function (m) { lines.push({ pts: [[m.t, 0], [m.t, ymax]], colour: '--muted', dash: '1 5' }); });
    lines.push({ pts: [[clk, 0], [clk, ymax]], colour: '--muted', dash: '3 3' });
    var title = (cnt() ? 'Count rate' : S.quantity === 'activity' ? 'Activity' : 'Nuclei left') + ' against time';
    $('plot-title').textContent = title;
    Sim.plot($('plot'), { title: title, desc: 'Dashed curves are the prediction. Solid lines are the simulated sample up to the clock time.', xlabel: 'time, t / ' + UL(), ylabel: Y.label, zero: true, xmin: 0, xmax: S.tmax, ymin: 0, ymax: ymax, points: pts, lines: lines });
    var lg = $('legend'); lg.textContent = '';
    S.sources.forEach(function (s, idx) { lg.appendChild(el('li', { style: 'color:var(' + COLS[idx] + ')' }, el('span', { class: 'sol' }), el('span', { style: 'color:var(--ink)', text: label(s) }))); });
    if (S.showMix && S.sources.length > 1) lg.appendChild(el('li', { style: 'color:var(--c4)' }, el('span', { class: 'sol' }), el('span', { style: 'color:var(--ink)', text: 'Total' })));
    lg.appendChild(el('li', { style: 'color:var(--muted)' }, el('span', { class: 'dsh' }), el('span', { style: 'color:var(--ink)', text: 'dashed = prediction, solid = simulated sample' })));
    if (S.marks.length) lg.appendChild(el('li', { style: 'color:var(--muted)', text: 'dotted vertical lines = targets for the job' }));
  }
  function plotOpts() {
    var box = $('plot-opts'); box.textContent = '';
    function chk(text, key) { return el('label', { class: 'chk' }, el('input', { type: 'checkbox', checked: S[key], onchange: function (e) { S[key] = e.target.checked; renderPlot(); } }), text); }
    box.appendChild(chk('Show the prediction (smooth dashed curve)', 'showTheory'));
    box.appendChild(chk('Show the simulated sample', 'showSim'));
    if (S.sources.length > 1 && S.quantity !== 'nuclei') box.appendChild(chk('Show the total of all the sources', 'showMix'));
  }
  function steps(list) { return Sim.steps(list); }
  function renderReadout() {
    var mount = $('readout'), vh = S.quantity === 'activity' ? 'Activity, A (Bq)' : cnt() ? 'Count rate, R (counts/min)' : 'Nuclei left, N';
    var rows = S.sources.map(function (s, i) {
      var n = clk / Ts[i], f = M.fraction(clk, Ts[i]), known = showT(s), V0 = v0(i), pv = theory(i, clk), sv = simv(i, clk);
      var nTxt = known ? sig(n, 3) : '?';
      var nCell = known ? Sim.calcButton(nTxt, 'Number of half-lives', function () { return [steps([['Divide the time by the half-life', 'n = t ÷ T½ = ' + sig(clk, 3) + ' ' + UL() + ' ÷ ' + sig(Ts[i], 3) + ' ' + UL() + ' = ' + sig(n, 3)]])]; }) : '?';
      var fCell = known ? Sim.calcButton(sig(f, 3), 'Fraction left', function () { return [steps([['Each half-life halves it', 'fraction = (½)^n = (½)^' + sig(n, 3) + ' = ' + sig(f, 4)], ['As a percentage', sig(100 * f, 3) + '%']])]; }) : '?';
      var vCell = known ? Sim.calcButton(fmtVal(pv), 'Value now', function () {
        var st = [['Start value', sig(V0, 4) + (S.quantity === 'activity' ? ' Bq' : cnt() ? ' counts/min' : ' nuclei')], ['Multiply by the fraction left', sig(V0, 4) + ' × ' + sig(f, 4) + ' = ' + sig(V0 * f, 4)]];
        if (off()) st.push(['Add the background', sig(V0 * f, 4) + ' + ' + sig(off(), 3) + ' = ' + sig(pv, 4) + ' counts/min']);
        return [steps(st)]; }) : fmtVal(pv);
      return el('tr', null, el('td', null, el('strong', { text: label(s) })), el('td', { class: 'num' }, nCell), el('td', { class: 'num' }, fCell), el('td', { class: 'num' }, vCell), el('td', { class: 'num', text: fmtVal(sv) }));
    });
    if (S.showMix && S.sources.length > 1) rows.push(el('tr', null, el('td', null, el('strong', { text: 'Total' })), el('td'), el('td'), el('td', { class: 'num', text: fmtVal(mixTheory(clk)) }), el('td', { class: 'num', text: fmtVal(mixSim(clk)) })));
    mount.textContent = '';
    mount.appendChild(el('table', { class: 'data' }, el('thead', null, el('tr', null, ['Source', 'n = t ÷ T½', 'Fraction left', vh + ', prediction', vh + ', simulated'].map(function (h) { return el('th', { scope: 'col', text: h }); }))), el('tbody', null, rows)));
    if (off()) mount.appendChild(el('p', { class: 'fine', text: 'Background ' + S.bg + ' counts/min ' + (S.subtract ? 'has been subtracted.' : 'is included in the readings.') }));
    if (S.equalN) mount.appendChild(el('p', { class: 'fine', text: 'Every source started with the same number of nuclei.' }));
  }
  function renderClock() {
    $('clock').value = String(Math.round(1000 * clk / S.tmax)); $('o-t').textContent = fmtTime(clk); $('clock-read').innerHTML = '<b>t = ' + sig(clk, 3) + '</b> ' + UL();
  }
  function renderAll() { renderClock(); drawGrids(); renderPlot(); plotOpts(); renderReadout(); renderMeasure(); }
  function setClock(t, light) { clk = t; clampClock(); renderClock(); drawGrids(); if (!light) { renderPlot(); renderReadout(); } }

  /* ---------- play ---------- */
  var raf = 0, last = 0, frame = 0;
  function setPlay() { $('b-play').textContent = playing ? 'Pause' : 'Play'; }
  function tick(ts) {
    if (!playing) return;
    if (last) clk += (ts - last) / 1000 * (S.tmax / 12) * speed;
    last = ts; frame++;
    if (clk >= S.tmax) { clk = S.tmax; playing = false; setPlay(); setClock(clk); return; }
    setClock(clk, frame % 2 !== 0); raf = requestAnimationFrame(tick);
  }
  function play() { if (playing) { playing = false; setPlay(); setClock(clk); return; } if (clk >= S.tmax) clk = 0; playing = true; last = 0; setPlay(); raf = requestAnimationFrame(tick); }

  /* ---------- measure: three successive halving times ---------- */
  var runs = [], mres = new Sim.Results({ res: 0, dp: 2, rowHead: 'Run', empty: 'No runs yet. Press New random run.' });
  function mDp() { var t = Ts[0] || 1; return t >= 100 ? 0 : t >= 10 ? 1 : 2; }
  function mCompute(sd) {
    var t = M.decayTimes(S.nGrid, Ts[0], Sim.rng(sd * 31)), c = cnt();
    return M.halvingReadings(t, v0(0), c ? S.bg : 0, c ? S.subtract : true, 3);
  }
  function rebuildMeasure() {
    mres.data = {}; var rows = [];
    runs.forEach(function (sd, k) {
      var key = 'run' + sd, r = mCompute(sd); rows.push({ key: key, label: 'Run ' + (k + 1) + '<span class="sm">' + S.nGrid + ' nuclei</span>', ok: !!r });
      if (r) mres.data[key] = r.readings.map(function (v) { return { v: v, off: false }; });
    });
    mres.cfg.rows = rows; mres.cfg.dp = mDp(); buildMeasureSide(); renderMeasure();
  }
  function popMean(r, st) {
    var vals = mres.live(r.key), sum = vals.reduce(function (a, b) { return a + b; }, 0), d = mDp() + 1;
    return [steps([['Add the readings that are not crossed out', vals.map(function (v) { return fmt(v, d); }).join(' + ') + ' = ' + fmt(sum, d) + ' ' + UL()], ['Divide by how many there are', 'mean = ' + fmt(sum, d) + ' ÷ ' + vals.length + ' = ' + fmt(st.mean, d + 1) + ' ' + UL()]])];
  }
  function popUnc(r, st) {
    var d = mDp() + 1;
    return [steps([['Half the range of the readings', 'Δt = ½ (' + fmt(st.max, d) + ' − ' + fmt(st.min, d) + ') = ' + fmt(st.half, d + 1) + ' ' + UL()], ['Percentage uncertainty', '% = Δt ÷ mean × 100 = ' + fmt(st.half, d + 1) + ' ÷ ' + fmt(st.mean, d + 1) + ' × 100 = ' + fmt(st.pct, 1) + '%']]),
      el('p', { text: 'Why do the times differ? The nuclei decay at random, and a small sample is uneven. This scatter is the biggest source of error here. Repeating shows the spread but does not make it smaller, and it cannot show up a fault that affects every reading, such as background that has not been subtracted.' })];
  }
  function renderMeasure() {
    var d = mDp(), u = UL();
    mres.cfg.columns = [
      { head: 'Mean (' + u + ')', cell: function (r, st) { return st.n ? Sim.calcButton(fmt(st.mean, d + 1), 'Mean time', function () { return popMean(r, st); }) : ''; } },
      { head: '± half range (' + u + ')', cell: function (r, st) { return st.n ? Sim.calcButton(fmt(st.half, d + 1), 'Uncertainty', function () { return popUnc(r, st); }) : ''; } },
      { head: '% uncertainty', cell: function (r, st) { return st.n ? fmt(st.pct, 1) + '%' : ''; } }];
    mres.render($('m-results'));
    var ths = $('m-results').querySelectorAll('th'); if (ths[1]) ths[1].textContent = 'Halving times, t (' + u + ')';
    var pts = [], lg = $('m-legend'); lg.textContent = '';
    (mres.cfg.rows || []).forEach(function (r, k) {
      (mres.data[r.key] || []).forEach(function (rd, j) { if (!rd.off) pts.push({ x: j + 1, y: rd.v, colour: COLS[k % 3] }); });
      lg.appendChild(el('li', { style: 'color:var(' + COLS[k % 3] + ')' }, el('span', { class: 'sol' }), el('span', { style: 'color:var(--ink)', text: 'Run ' + (k + 1) })));
    });
    Sim.plot($('m-plot'), { title: 'Halving times', desc: 'Time for the value to halve, first, second and third time, for each run.', xlabel: 'halving number (1 = start to 1/2, 2 = 1/2 to 1/4, 3 = 1/4 to 1/8)', ylabel: 'halving time / ' + u, zero: true, xmin: 0, xmax: 4, ymin: 0, points: pts, lines: [] });
  }
  function buildMeasureSide() {
    var s0 = S.sources[0];
    $('m-info').innerHTML = 'Measuring: <strong>' + label(s0) + '</strong>' + (showT(s0) ? ' (half-life ' + M.halfLifeText(isoOf(s0)) + ')' : ' (half-life hidden)') + '. The tool takes the time for the ' + (cnt() ? 'detector reading' : S.quantity === 'activity' ? 'activity' : 'number of nuclei') + ' to halve, then halve again, then halve again. Time axis: ' + UL() + '.' + (S.sources.length > 1 ? ' (Uses the first isotope in the Decay tab.)' : '');
    seg($('seg-nm'), [[100, '100'], [200, '200'], [500, '500']], function () { return S.nGrid; }, function (v) { S.nGrid = v; regen(); buildGrids(); rebuildMeasure(); renderAll(); buildControls(); });
    var mb = $('m-bg'); mb.textContent = '';
    if (cnt()) mb.appendChild(el('div', { class: 'ctl' }, el('span', { class: 'lab', text: 'Background: ' + S.bg + ' counts/min' }), el('label', { class: 'chk' }, el('input', { type: 'checkbox', checked: S.subtract, onchange: function (e) { S.subtract = e.target.checked; buildControls(); rebuildMeasure(); renderAll(); } }), 'Subtract background from the readings')));
  }
  function newRun() { seed += 1; runs.push(seed); if (runs.length > 4) runs.shift(); regen(); buildGrids(); rebuildMeasure(); renderAll(); $('m-banner').textContent = ''; $('m-compare').textContent = ''; }
  function compare() {
    var rows = mres.cfg.rows || [], box = $('m-compare'); box.textContent = '';
    var last = rows.filter(function (r) { return mres.live(r.key).length; }).pop();
    if (!last) { box.appendChild(el('p', { text: 'Take some readings first.' })); return; }
    var st = mres.stats(last.key), Tt = Ts[0], inside = Tt >= st.mean - st.half && Tt <= st.mean + st.half, d = mDp() + 1;
    box.appendChild(el('p', { html: 'Data book half-life: <b>' + fmt(Tt, d) + ' ' + UL() + '</b>. Your latest run: <b>' + fmt(st.mean, d) + ' ± ' + fmt(st.half, d) + ' ' + UL() + '</b>.' }));
    box.appendChild(el('p', { html: inside ? '<span class="ok">✓</span> The data book value is inside your range.' : '<span class="no">✗</span> The data book value is outside your range. If every run is out in the same direction, look for a fault that affects every reading (for example, background not subtracted).' }));
  }

  /* ---------- choose the isotope ---------- */
  var CH = { scn: 'tracer', iso: null, tg: {} };
  function chScn() { return M.SCN[CH.scn]; }
  function chTargets() { var d = M.defaultTargets(chScn()), o = {}, k; for (k in d) o[k] = CH.tg[k] !== undefined ? CH.tg[k] : d[k]; return o; }
  function setScenario(id) { CH.scn = id; CH.iso = null; CH.tg = {}; renderChoose(); }
  function slider(id, text, unit, rng, key, dp) {
    var v = chTargets()[key];
    return el('div', { class: 'ctl' }, el('label', { for: id, html: text + ' <b id="o-' + id + '">' + sig(v, 3) + ' ' + unit + '</b>' }),
      el('input', { id: id, type: 'range', min: rng[0], max: rng[1], step: rng[2], value: v, oninput: function (e) { CH.tg[key] = +e.target.value; $('o-' + id).textContent = sig(+e.target.value, 3) + ' ' + unit; renderChecks(); } }));
  }
  function renderChoose() {
    var sc = chScn(), tg = $('ch-targets'), U = function (u) { return M.UNITS[u].label; };
    $('ch-scn').value = sc.id; $('ch-text').textContent = sc.text;
    var need = [];
    if (sc.must.length) need.push('must give out ' + sc.must.join(' or '));
    if (sc.mustNot.length) need.push('must not give out ' + sc.mustNot.join(' or '));
    if (sc.element) need.push('must be an isotope of ' + sc.element.name);
    $('ch-need').textContent = need.length ? 'The source ' + need.join(', ') + '. (Think about why.)' : 'Any type of radiation will do. (Think about what matters instead.)';
    tg.textContent = '';
    tg.appendChild(slider('t-keept', 'Still strong after', U(sc.keep.unit), sc.keep.range, 'keepT'));
    tg.appendChild(slider('t-keepm', 'At least this percentage left', '%', sc.keep.minRange, 'keepMin'));
    if (sc.fade) { tg.appendChild(slider('t-fadet', 'Almost gone after', U(sc.fade.unit), sc.fade.range, 'fadeT')); tg.appendChild(slider('t-fadem', 'At most this percentage left', '%', sc.fade.maxRange, 'fadeMax')); }
    if (sc.strong) tg.appendChild(slider('t-strong', 'Half-life no longer than', U(sc.strong.unit), sc.strong.range, 'strongT'));
    var g = $('ch-iso'); g.textContent = '';
    M.ISOTOPES.forEach(function (i) {
      g.appendChild(el('button', { class: 'expopt', type: 'button', role: 'radio', 'aria-checked': String(CH.iso === i.id), onclick: function () { CH.iso = i.id; renderChoose(); } }, el('strong', { text: i.sym }), el('span', { text: M.radiationText(i) + ' · ' + M.halfLifeText(i) })));
    });
    renderChecks();
  }
  function renderChecks() {
    var out = $('ch-out'), sc = chScn(), tg = chTargets(); out.textContent = '';
    $('b-chsim').disabled = !CH.iso;
    if (!CH.iso) { out.appendChild(el('p', { class: 'empty', text: 'Choose an isotope to see the checks.' })); fillAll(); return; }
    var i = M.ISO[CH.iso], ck = M.evaluate(sc, CH.iso, tg), bad = ck.filter(function (c) { return !c.ok; }).length;
    out.appendChild(el('p', { class: 'verdict' }, el('b', { text: i.name + ': ' }), bad ? el('span', { class: 'no', text: 'not suitable (' + bad + ' of ' + ck.length + ' checks failed)' }) : el('span', { class: 'ok', text: 'suitable (all ' + ck.length + ' checks passed)' })));
    out.appendChild(el('ul', { class: 'checks' }, ck.map(function (c) {
      return el('li', null, el('span', { class: c.ok ? 'ok' : 'no', role: 'img', 'aria-label': c.ok ? 'passed' : 'not passed', text: c.ok ? '✓' : '✗' }), el('span', { text: c.title }),
        el('button', { class: 'info', type: 'button', 'aria-label': 'Explain this check', text: 'i', onclick: function () {
          var body = []; if (c.why) body.push(c.why); if (c.steps) body.unshift(Sim.steps(c.steps)); Sim.pop.open('Check', body); } }));
    })));
    fillAll();
  }
  function fillAll() {
    var sc = chScn(), tg = chTargets(), box = $('ch-all'); box.textContent = '';
    var heads = ['Isotope', 'Radiation', 'Half-life', 'Checks passed', 'Result'];
    box.appendChild(el('table', { class: 'data score' }, el('thead', null, el('tr', null, heads.map(function (h) { return el('th', { scope: 'col', text: h }); }))), el('tbody', null, M.ISOTOPES.map(function (i) {
      var ck = M.evaluate(sc, i.id, tg), ok = ck.every(function (c) { return c.ok; });
      return el('tr', null, el('td', { text: i.sym }), el('td', { text: M.radiationText(i) }), el('td', { text: M.halfLifeText(i) }), el('td', { text: ck.filter(function (c) { return c.ok; }).length + ' of ' + ck.length }), el('td', { class: ok ? 'p-ok' : 'p-no', text: ok ? '✓ suitable' : '✗ no' }));
    }))));
  }
  function showInSim() {
    var sc = chScn(), tg = chTargets(), secs = [tg.keepT * M.UNITS[sc.keep.unit].f];
    if (sc.fade) secs.push(tg.fadeT * M.UNITS[sc.fade.unit].f);
    var longest = Math.max.apply(null, secs) * 1.25, i = M.ISO[CH.iso], u = M.bestUnit(Math.max(longest, M.halfLifeSeconds(i) * 0.5));
    var marks = [{ t: tg.keepT * M.UNITS[sc.keep.unit].f / M.UNITS[u].f, label: 'keep' }];
    if (sc.fade) marks.push({ t: tg.fadeT * M.UNITS[sc.fade.unit].f / M.UNITS[u].f, label: 'fade' });
    var tmax = +(Math.max(longest, Math.min(M.halfLifeSeconds(i) * 4, longest * 4)) / M.UNITS[u].f).toPrecision(2);
    apply({ tab: 'decay', task: 'The dotted lines mark the times in the job. Is enough left at the first, and little enough at the second?', think: 'Predict first: where will the curve be at each dotted line?',
      state: { unit: u, tmax: tmax, quantity: 'activity', nGrid: 200, showTheory: true, marks: marks, sources: [{ iso: CH.iso, start: 1000 }] } }, HL.lastInfo);
  }

  /* ---------- presets (from the questions) ---------- */
  function setBanner(info) {
    ['decay', 'measure', 'choose', 'bench'].forEach(function (t) {
      var b = $('qb-' + t); b.textContent = '';
      if (!info) { b.hidden = true; return; }
      b.hidden = false;
      b.appendChild(el('p', { html: '<strong>Question ' + info.n + '.</strong> ' + info.task }));
      b.appendChild(el('button', { class: 'btn', type: 'button', text: 'Back to question ' + info.n, onclick: function () { if (HL.backToQuestion) HL.backToQuestion(info.id); } }));
    });
  }
  function apply(spec, info) {
    HL.lastInfo = info || null; HL.exampleOn = false;
    var st = spec.state || {};
    if (Object.keys(st).length) {
      S = Object.assign(clone(DEFAULT), clone(st)); seed = 11; clk = 0; playing = false; reveal = false; HL.lockSources = !!info;
      runs = (spec.tab === 'measure') ? [] : []; mres.data = {};
      if (S.sources.length < 2) { S.equalN = false; }
      structural(); setPlay(); $('m-banner').textContent = ''; $('m-compare').textContent = '';
    }
    if (spec.scenario) setScenario(spec.scenario);
    if (spec.bench && HL.bench) HL.bench.apply(spec.bench);
    Object.keys(THINK).forEach(function (k) { $('think-' + k).textContent = (spec.tab === k && spec.think) ? spec.think : THINK[k]; });
    setBanner(info);
    if (HL.tabs) HL.tabs.show(spec.tab, true);
    window.scrollTo(0, 0);
  }
  function loadExample() {
    HL.exampleOn = true; S = clone(DEFAULT); seed = 11; clk = 0; playing = false; reveal = false; runs = [11]; mres.data = {}; HL.lockSources = false;
    Object.keys(THINK).forEach(function (k) { $('think-' + k).textContent = THINK[k]; });
    setBanner(null); structural(); setPlay();
    $('m-banner').textContent = 'An example run is loaded. Press Clear runs to start your own.';
  }

  /* ---------- wiring ---------- */
  $('ch-scn').appendChild(document.createDocumentFragment());
  M.SCENARIOS.forEach(function (s) { $('ch-scn').appendChild(el('option', { value: s.id, text: s.title })); });
  $('ch-scn').addEventListener('change', function (e) { setScenario(e.target.value); });
  $('b-chsim').addEventListener('click', showInSim);
  $('clock').addEventListener('input', function (e) { if (playing) { playing = false; setPlay(); } setClock(S.tmax * (+e.target.value) / 1000); });
  $('b-play').addEventListener('click', play);
  $('b-reset').addEventListener('click', function () { playing = false; setPlay(); setClock(0); });
  $('b-new').addEventListener('click', function () { seed += 1; regen(); buildGrids(); renderAll(); });
  $('b-mrun').addEventListener('click', newRun);
  $('b-mclear').addEventListener('click', function () { runs = []; rebuildMeasure(); $('m-banner').textContent = ''; $('m-compare').textContent = ''; });
  $('b-mcompare').addEventListener('click', compare);
  mres.onChange(renderMeasure);
  window.addEventListener('resize', function () { drawGrids(); });
  if (window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { drawGrids(); renderPlot(); });
  if (reduce) { $('b-play').disabled = true; }

  HL.sim = { apply: apply, state: function () { return S; }, setClock: setClock, reveal: function (v) { reveal = v; structural(); }, chooser: function () { return CH; }, runs: function () { return runs; } };
  HL.tabs = Sim.tabs(document.querySelector('.tabs'), { onChange: function (name) { if (name === 'decay') { drawGrids(); } if (name === 'measure') renderMeasure(); if (name === 'bench' && HL.bench) HL.bench.render(); } });
  loadExample(); renderChoose();
})();
