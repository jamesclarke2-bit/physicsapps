/* physicsapps shared helpers. Plain script, no build step: <script src="../shared/sim.js"></script>
   Exposes window.Sim. Keep this file free of topic physics: the physics lives in each app's model.js.

   Sim.rng(seed)                 seeded random numbers: .next(), .gauss()
   Sim.stats(values, {res})      mean, min, max, half-range uncertainty (floored at res/2), % uncertainty
   Sim.linfit(xs, ys)            least-squares line {slope, intercept}
   Sim.fmt(x, dp) / Sim.sig(x,n) number formatting with a proper minus sign
   Sim.el(tag, attrs, ...kids)   tiny DOM builder
   Sim.tabs(root, opts)          accessible tabs with #hash routing
   Sim.pop.open(title, node)     modal pop-up for worked calculations (Esc, backdrop and close button)
   Sim.steps([[label, eq], ...]) numbered calculation steps for pop-ups
   Sim.Results                   readings table with click-to-cross-out chips and calculation buttons
   Sim.plot(svg, spec)           SVG scatter/line plot with error bars, labelled axes, accessible title
*/
(function () {
  'use strict';
  var SVGNS = 'http://www.w3.org/2000/svg';

  /* ---------- numbers ---------- */
  function rng(seed) {
    var a = seed >>> 0;
    function next() { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
    function gauss() { var u = 0, v = 0; while (u === 0) u = next(); v = next(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
    return { next: next, gauss: gauss };
  }
  /* Teaching rule: uncertainty in a mean of random readings = half the range. It does not shrink with more
     repeats. The floor is half the smallest division of the instrument. */
  function stats(values, opts) {
    opts = opts || {};
    var v = values.filter(function (x) { return isFinite(x); });
    if (!v.length) return { n: 0, mean: NaN, min: NaN, max: NaN, half: NaN, pct: NaN };
    var sum = v.reduce(function (a, b) { return a + b; }, 0), mean = sum / v.length;
    var mn = Math.min.apply(null, v), mx = Math.max.apply(null, v);
    var half = Math.max((mx - mn) / 2, (opts.res || 0) / 2);
    return { n: v.length, mean: mean, min: mn, max: mx, half: half, pct: mean ? 100 * half / Math.abs(mean) : NaN };
  }
  /* Least-squares straight line y = slope*x + intercept. */
  function linfit(xs, ys) {
    var n = xs.length; if (n < 2) return null;
    var sx = 0, sy = 0, sxx = 0, sxy = 0, i;
    for (i = 0; i < n; i++) { sx += xs[i]; sy += ys[i]; sxx += xs[i] * xs[i]; sxy += xs[i] * ys[i]; }
    var d = n * sxx - sx * sx; if (!d) return null;
    var slope = (n * sxy - sx * sy) / d; return { slope: slope, intercept: (sy - slope * sx) / n };
  }
  function fmt(x, dp) { if (x === null || x === undefined || !isFinite(x)) return '–'; var s = x.toFixed(dp === undefined ? 2 : dp); return s.replace('-', '−'); }
  function sig(x, n) { if (!isFinite(x)) return '–'; if (x === 0) return '0'; return fmt(+x.toPrecision(n || 3), Math.max(0, (n || 3) - 1 - Math.floor(Math.log10(Math.abs(x))))); }

  /* ---------- DOM ---------- */
  function el(tag, attrs) {
    var n = (attrs && attrs.ns) ? document.createElementNS(attrs.ns, tag) : document.createElement(tag);
    for (var k in (attrs || {})) {
      if (k === 'ns') continue;
      var val = attrs[k];
      if (val === null || val === undefined || val === false) continue;
      if (k === 'class') n.setAttribute('class', val);
      else if (k === 'text') n.textContent = val;
      else if (k === 'html') n.innerHTML = val;
      else if (k.slice(0, 2) === 'on' && typeof val === 'function') n.addEventListener(k.slice(2), val);
      else n.setAttribute(k, val === true ? '' : val);
    }
    (function add(list) {
      for (var i = 0; i < list.length; i++) {
        var c = list[i];
        if (c === null || c === undefined || c === false) continue;
        if (Array.isArray(c)) add(c);
        else n.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
      }
    })([].slice.call(arguments, 2));
    return n;
  }
  function svgel(tag, attrs, text) {
    var n = document.createElementNS(SVGNS, tag);
    for (var k in (attrs || {})) n.setAttribute(k, attrs[k]);
    if (text !== undefined) n.textContent = text;
    return n;
  }

  /* ---------- tabs with hash routing (hash is only the plain tab name) ---------- */
  function tabs(root, opts) {
    opts = opts || {};
    var btns = [].slice.call(root.querySelectorAll('[role=tab]'));
    var names = btns.map(function (b) { return b.dataset.tab; });
    function panel(name) { return document.getElementById('p-' + name); }
    function show(name, push) {
      if (names.indexOf(name) < 0) name = names[0];
      btns.forEach(function (b) { var on = b.dataset.tab === name; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; panel(b.dataset.tab).hidden = !on; });
      if (push && location.hash !== '#' + name) { try { history.replaceState(null, '', '#' + name); } catch (e) { location.hash = name; } }
      if (opts.onChange) opts.onChange(name);
    }
    btns.forEach(function (b, i) {
      b.addEventListener('click', function () { show(b.dataset.tab, true); });
      b.addEventListener('keydown', function (e) {
        var j = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : -1;
        if (j < 0) return; j = (j + btns.length) % btns.length; btns[j].focus(); show(btns[j].dataset.tab, true); e.preventDefault();
      });
    });
    window.addEventListener('hashchange', function () { show(location.hash.slice(1), false); });
    show(location.hash.slice(1), false);
    return { show: show };
  }

  /* ---------- pop-up ---------- */
  var pop = (function () {
    var root, box, title, body, closeBtn, lastFocus;
    function build() {
      if (root) return;
      title = el('h2', { id: 'pop-title' });
      body = el('div');
      closeBtn = el('button', { class: 'popx', type: 'button', 'aria-label': 'Close', text: '×' });
      box = el('div', { class: 'popbox', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'pop-title', tabindex: '-1' }, closeBtn, title, body);
      root = el('div', { class: 'pop', hidden: true, id: 'pop' }, box);
      document.body.appendChild(root);
      closeBtn.addEventListener('click', close);
      root.addEventListener('click', function (e) { if (e.target === root) close(); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !root.hidden) close(); });
    }
    function open(t, node) {
      build(); lastFocus = document.activeElement;
      title.textContent = t; body.textContent = '';
      [].concat(node).forEach(function (n) { body.appendChild(typeof n === 'string' ? el('p', { text: n }) : n); });
      root.hidden = false; box.focus();
    }
    function close() { if (!root || root.hidden) return; root.hidden = true; if (lastFocus && lastFocus.focus) lastFocus.focus(); }
    return { open: open, close: close };
  })();
  function steps(list) {
    return el.apply(null, ['ol', { class: 'steps' }].concat(list.map(function (s) {
      return el('li', null, el('span', { class: 'sl', text: s[0] }), s[1] ? el('span', { class: 'eq', text: s[1] }) : null);
    })));
  }

  /* ---------- results table ----------
     rows: [{key, label}]. Each reading can be crossed out by clicking its chip (it is then ignored by stats).
     cfg.fields(row) -> [{label, get(reading), dp}] optional: show several quantities per reading.
     cfg.columns: extra columns [{head, cell(row, st) -> Node|string}] where st = Sim.stats of the live readings.
     cfg.res: instrument resolution (for the half-range floor). cfg.dp: decimals for readings. */
  function Results(cfg) {
    this.cfg = cfg; this.data = {}; this.listeners = [];
  }
  Results.prototype.add = function (key, value, meta) { (this.data[key] = this.data[key] || []).push({ v: value, off: false, meta: meta }); this.changed(); };
  Results.prototype.clear = function () { this.data = {}; this.changed(); };
  Results.prototype.live = function (key) { return (this.data[key] || []).filter(function (r) { return !r.off; }).map(function (r) { return r.v; }); };
  Results.prototype.liveField = function (key, get) { return (this.data[key] || []).filter(function (r) { return !r.off; }).map(get); };
  Results.prototype.stats = function (key) { return stats(this.live(key), { res: this.cfg.res }); };
  Results.prototype.onChange = function (f) { this.listeners.push(f); };
  Results.prototype.changed = function () { var me = this; this.listeners.forEach(function (f) { f(me); }); };
  Results.prototype.render = function (mount) {
    var me = this, cfg = this.cfg, dp = cfg.dp === undefined ? 2 : cfg.dp;
    var heads = [cfg.rowHead || 'Setting', 'Readings'].concat((cfg.columns || []).map(function (c) { return c.head; }));
    var thead = el('tr', null, heads.map(function (h) { return el('th', { scope: 'col', html: h }); }));
    var rows = cfg.rows.filter(function (r) { return (me.data[r.key] || []).length; }).map(function (r) {
      var st = me.stats(r.key);
      function chip(rd, text) {
        return el('button', { class: 'chip', type: 'button', 'aria-pressed': rd.off, title: rd.off ? 'Click to include this reading' : 'Click to cross out an anomaly',
          text: text, onclick: function () { rd.off = !rd.off; me.changed(); } });
      }
      var chips;
      if (cfg.fields) {   // several quantities per reading (e.g. t, u, v): one chip row per field, clicking any chip crosses out the whole reading
        chips = el('div', { class: 'chiprows' }, cfg.fields(r).map(function (f) {
          return el('div', { class: 'chips' }, el('span', { class: 'chiplabel', html: f.label }), (me.data[r.key]).map(function (rd) { return chip(rd, fmt(f.get(rd), f.dp === undefined ? dp : f.dp)); }));
        }));
      } else chips = el('div', { class: 'chips' }, (me.data[r.key]).map(function (rd) { return chip(rd, fmt(rd.v, dp)); }));
      return el('tr', null, el('td', { html: r.label }), el('td', null, chips),
        (cfg.columns || []).map(function (c) { var out = c.cell(r, st); return el('td', { class: 'num' }, out === null ? '' : out); }));
    });
    mount.textContent = '';
    if (!rows.length) { mount.appendChild(el('p', { class: 'empty', text: cfg.empty || 'No readings yet.' })); return; }
    mount.appendChild(el('div', { class: 'tablewrap' }, el('table', { class: 'data' }, el('thead', null, thead), el('tbody', null, rows))));
  };
  /* A value that opens a worked calculation when clicked. */
  function calcButton(text, title, build) {
    return el('button', { class: 'calc', type: 'button', text: text, 'aria-haspopup': 'dialog', onclick: function () { pop.open(title, build()); } });
  }

  /* ---------- plot ---------- */
  function niceTicks(lo, hi, n) {
    var span = hi - lo || 1, raw = span / (n || 5), mag = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / mag;
    var step = (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * mag, out = [];
    for (var v = Math.ceil(lo / step - 1e-9) * step; v <= hi + step * 1e-9; v += step) out.push(+v.toPrecision(12));
    return { ticks: out, step: step };
  }
  /* spec: {title, desc, xlabel, ylabel, xmin,xmax,ymin,ymax (optional), zero:true to include origin,
            points:[{x,y,ex,ey,colour,label}], lines:[{pts:[[x,y]...], colour, dash, label}]}  Colours are CSS vars. */
  function plot(svg, spec) {
    var W = 560, H = 340, m = { l: 58, r: 16, t: 14, b: 48 };
    var pts = spec.points || [], lines = spec.lines || [];
    var xs = [], ys = [];
    pts.forEach(function (p) { xs.push(p.x - (p.ex || 0), p.x + (p.ex || 0)); ys.push(p.y - (p.ey || 0), p.y + (p.ey || 0)); });
    lines.forEach(function (l) { l.pts.forEach(function (q) { xs.push(q[0]); ys.push(q[1]); }); });
    if (!xs.length) { xs = [0, 1]; ys = [0, 1]; }
    function range(a, zero, lo, hi) {
      var mn = lo !== undefined ? lo : Math.min.apply(null, a), mx = hi !== undefined ? hi : Math.max.apply(null, a);
      if (zero && lo === undefined) mn = Math.min(0, mn);
      if (mx === mn) mx = mn + 1;
      var pad = (mx - mn) * 0.05; if (hi === undefined) mx += pad; if (lo === undefined && !(zero && mn === 0)) mn -= pad;
      return [mn, mx];
    }
    var xr = range(xs, spec.zero, spec.xmin, spec.xmax), yr = range(ys, spec.zero, spec.ymin, spec.ymax);
    var tx = niceTicks(xr[0], xr[1], 6), ty = niceTicks(yr[0], yr[1], 5);
    function dpOf(step) { return Math.max(0, -Math.floor(Math.log10(step) + 1e-9)); }
    var dpx = dpOf(tx.step), dpy = dpOf(ty.step);
    function X(v) { return m.l + (v - xr[0]) / (xr[1] - xr[0]) * (W - m.l - m.r); }
    function Y(v) { return H - m.b - (v - yr[0]) / (yr[1] - yr[0]) * (H - m.t - m.b); }
    svg.textContent = ''; svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.setAttribute('class', 'chart'); svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', spec.title || 'graph');
    svg.appendChild(svgel('title', {}, spec.title || 'graph'));
    if (spec.desc) svg.appendChild(svgel('desc', {}, spec.desc));
    tx.ticks.forEach(function (v) {
      svg.appendChild(svgel('line', { class: 'grid', x1: X(v), x2: X(v), y1: m.t, y2: H - m.b }));
      svg.appendChild(svgel('text', { x: X(v), y: H - m.b + 16, 'text-anchor': 'middle' }, fmt(v, dpx)));
    });
    ty.ticks.forEach(function (v) {
      svg.appendChild(svgel('line', { class: 'grid', x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v) }));
      svg.appendChild(svgel('text', { x: m.l - 6, y: Y(v) + 4, 'text-anchor': 'end' }, fmt(v, dpy)));
    });
    svg.appendChild(svgel('line', { class: 'ax', x1: m.l, x2: W - m.r, y1: H - m.b, y2: H - m.b }));
    svg.appendChild(svgel('line', { class: 'ax', x1: m.l, x2: m.l, y1: m.t, y2: H - m.b }));
    svg.appendChild(svgel('text', { class: 'lbl', x: (m.l + W - m.r) / 2, y: H - 8, 'text-anchor': 'middle' }, spec.xlabel || ''));
    var yl = svgel('text', { class: 'lbl', x: 14, y: (m.t + H - m.b) / 2, 'text-anchor': 'middle', transform: 'rotate(-90 14 ' + (m.t + H - m.b) / 2 + ')' }, spec.ylabel || '');
    svg.appendChild(yl);
    lines.forEach(function (l) {
      var d = l.pts.map(function (q, i) { return (i ? 'L' : 'M') + X(q[0]).toFixed(1) + ' ' + Y(q[1]).toFixed(1); }).join('');
      svg.appendChild(svgel('path', { d: d, fill: 'none', stroke: 'var(' + (l.colour || '--c2') + ')', 'stroke-width': 2, 'stroke-dasharray': l.dash || '' }));
    });
    pts.forEach(function (p) {
      var c = 'var(' + (p.colour || '--c1') + ')';
      if (p.ey) svg.appendChild(svgel('line', { x1: X(p.x), x2: X(p.x), y1: Y(p.y - p.ey), y2: Y(p.y + p.ey), stroke: c, 'stroke-width': 1.5 }));
      if (p.ex) svg.appendChild(svgel('line', { y1: Y(p.y), y2: Y(p.y), x1: X(p.x - p.ex), x2: X(p.x + p.ex), stroke: c, 'stroke-width': 1.5 }));
      svg.appendChild(svgel('circle', { cx: X(p.x), cy: Y(p.y), r: 4, fill: c, stroke: 'var(--surface)', 'stroke-width': 1 }));
    });
  }

  window.Sim = { rng: rng, stats: stats, linfit: linfit, fmt: fmt, sig: sig, el: el, svgel: svgel, tabs: tabs, pop: pop, steps: steps, Results: Results, calcButton: calcButton, plot: plot };
})();
