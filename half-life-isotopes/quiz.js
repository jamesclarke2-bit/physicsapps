/* Questions tab: renders the question bank, marks answers with questions.js, and saves progress on this device (localStorage).
   No physics here. The simulator side is in app.js (HL.sim). */
(function () {
  'use strict';
  var M = window.HalfLifeModel, QB = window.HalfLifeQuestions, el = Sim.el, HL = window.HL = window.HL || {};
  var KEY = 'half-life-isotopes-v1';
  var $ = function (id) { return document.getElementById(id); };
  var store = { ans: {}, self: {}, score: {}, checked: {} };
  var cards = {};

  function load() { try { var s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && s.ans) store = Object.assign(store, s); } catch (e) { /* private mode: progress lasts until the page closes */ } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(store)); return true; } catch (e) { return false; } }

  /* **bold**, ^{sup}, _{sub} */
  function rich(text) {
    var f = document.createDocumentFragment(), re = /\*\*(.+?)\*\*|\^\{(.+?)\}|_\{(.+?)\}/g, last = 0, m;
    text = String(text);
    while ((m = re.exec(text))) {
      if (m.index > last) f.appendChild(document.createTextNode(text.slice(last, m.index)));
      if (m[1] !== undefined) f.appendChild(el('strong', null, rich(m[1])));
      else if (m[2] !== undefined) f.appendChild(el('sup', { text: m[2] }));
      else f.appendChild(el('sub', { text: m[3] }));
      last = re.lastIndex;
    }
    if (last < text.length) f.appendChild(document.createTextNode(text.slice(last)));
    return f;
  }
  function R(tag, attrs, text) { var n = el(tag, attrs); n.appendChild(rich(text)); return n; }
  function unitLabel(u) { return u === '%' ? '%' : (M.UNITS[u] ? M.UNITS[u].label : u); }
  function qnum(q) { return parseInt(q.id.slice(1), 10); }

  /* ---------- reading the page ---------- */
  function collect(q) {
    var a = {};
    q.parts.forEach(function (p) {
      var box = cards[q.id].querySelector('[data-part="' + p.id + '"]');
      if (p.type === 'choice') { var c = box.querySelector('input:checked'); if (c) a[p.id] = c.value; }
      else if (p.type === 'written') a[p.id] = box.querySelector('textarea').value;
      else if (p.type === 'num') p.inputs.forEach(function (i) {
        var t = box.querySelector('input[data-id="' + i.id + '"]'), s = box.querySelector('select[data-id="' + i.id + '"]');
        a[i.id] = { v: t.value, u: s ? s.value : undefined };
      });
      else if (p.type === 'table') box.querySelectorAll('input[data-key]').forEach(function (t) { a[t.dataset.key] = { v: t.value }; });
    });
    return a;
  }

  /* ---------- building a question ---------- */
  var SYM = { yes: '✓', ecf: '✓', via: '✓', self: '✓', no: '✗', blank: '–', note: 'i', part: '◐', free: '•' };
  var TXT = { yes: 'correct', ecf: 'correct (follow-through)', via: 'correct', self: 'claimed by you', no: 'not correct', blank: 'blank', note: 'note', part: 'partly correct', free: 'not marked' };
  function feedbackItem(it) {
    var cls = it.ok === 'yes' || it.ok === 'ecf' || it.ok === 'via' || it.ok === 'self' ? 'ok' : it.ok === 'no' ? 'no' : 'neutral';
    var li = el('li', { class: 'fb ' + cls }, el('span', { class: 'mk', role: 'img', 'aria-label': TXT[it.ok] || it.ok, text: SYM[it.ok] || '' }));
    var body = el('span', { class: 'fbt' });
    body.appendChild(rich(it.text));
    if (it.detail) body.appendChild(el('em', { class: 'fbd', text: ' ' + it.detail }));
    if (it.ok === 'ecf') body.appendChild(el('em', { class: 'fbd', text: ' (follow-through)' }));
    if (it.ok === 'self') body.appendChild(el('em', { class: 'fbd', text: ' (you said this in other words)' }));
    li.appendChild(body);
    if (it.marks) li.appendChild(el('span', { class: 'fbm', text: '+' + (Math.round(it.marks * 100) / 100) }));
    return li;
  }

  function buildPart(q, p) {
    var box = el('fieldset', { class: 'qpart', 'data-part': p.id });
    box.appendChild(el('legend', null, el('b', { text: '(' + p.id + ') ' }), rich(p.text), el('span', { class: 'pm', text: ' [' + p.marks + ' mark' + (p.marks > 1 ? 's' : '') + ']' })));
    if (p.type === 'choice') {
      var g = el('div', { class: 'opts', role: 'radiogroup' });
      p.options.forEach(function (o) {
        var inp = el('input', { type: 'radio', name: q.id + p.id, value: o.id });
        g.appendChild(el('label', { class: 'opt' }, inp, rich(o.label.replace(/\s{2,}/g, '  '))));
      });
      box.appendChild(g);
    } else if (p.type === 'written') {
      box.appendChild(el('textarea', { rows: Math.max(3, p.marks * 2 + 1), 'aria-label': 'Answer to part ' + p.id, placeholder: 'Write your answer here' }));
    } else if (p.type === 'num') {
      p.inputs.forEach(function (i) {
        var row = el('div', { class: 'nrow' }, el('label', { for: 'in-' + q.id + i.id }, rich(i.label)));
        var wrap = el('span', { class: 'nin' }, el('input', { id: 'in-' + q.id + i.id, type: 'text', inputmode: 'decimal', autocomplete: 'off', 'data-id': i.id, 'aria-label': i.label }));
        if (i.units) {
          var sel = el('select', { 'data-id': i.id, 'aria-label': 'Unit for ' + i.label });
          i.units.forEach(function (u) { sel.appendChild(el('option', { value: u, text: unitLabel(u) })); });
          wrap.appendChild(sel);
        } else if (i.ansUnit === '%') wrap.appendChild(el('span', { class: 'ulab', text: '%' }));
        row.appendChild(wrap); row.appendChild(el('span', { class: 'istat', 'data-stat': i.id }));
        box.appendChild(row);
      });
    } else if (p.type === 'table') {
      var tb = p.table, head = el('tr', null, el('th', { scope: 'col', text: tb.rowHead }));
      tb.cols.forEach(function (c) { head.appendChild(el('th', { scope: 'col', text: c.head })); });
      var body = el('tbody');
      tb.rows.forEach(function (r, ri) {
        var tr = el('tr', null, el('th', { scope: 'row', text: r.label }));
        tb.cols.forEach(function (c, ci) {
          if (c.kind === 'input') {
            var key = QB.cellKey(p, ri, ci);
            tr.appendChild(el('td', null, el('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', class: 'cell', 'data-key': key, 'aria-label': c.head + ', ' + tb.rowHead + ' ' + r.label })));
          } else tr.appendChild(el('td', { class: 'num', text: M.sig(r.cells[ci], 3) }));
        });
        body.appendChild(tr);
      });
      box.appendChild(el('div', { class: 'tablewrap' }, el('table', { class: 'data qtable' }, el('thead', null, head), body)));
    }
    box.appendChild(el('ul', { class: 'fbl', 'data-fb': p.id }));
    return box;
  }

  function buildCard(q) {
    var n = qnum(q), max = QB.questionMax(q), lvl = QB.PARTS[q.part].level;
    var card = el('article', { class: 'card qcard', id: 'q-' + q.id, 'aria-labelledby': 'qh-' + q.id });
    card.appendChild(el('div', { class: 'qhead' }, el('span', { class: 'qn', text: String(n) }), el('h3', { id: 'qh-' + q.id, text: q.title }), el('span', { class: 'qlevel', text: lvl + ' · ' + max + ' marks' }), el('span', { class: 'qscore', 'data-score': q.id })));
    card.appendChild(R('p', { class: 'qintro' }, q.intro));
    if (q.figure) card.appendChild(el('figure', { class: 'qfig' }, el('img', { src: 'img/' + q.figure + '.png', alt: q.figureCaption || 'Figure for question ' + n, loading: 'lazy' }), el('figcaption', { text: q.figureCaption || '' })));
    if (q.candidates) {
      var c = q.candidates;
      card.appendChild(el('div', { class: 'tablewrap' }, el('table', { class: 'data cand' }, el('thead', null, el('tr', null, c.head.map(function (h) { return el('th', { scope: 'col', text: h }); }))),
        el('tbody', null, c.rows.map(function (r) { return el('tr', null, r.map(function (x, k) { return el(k === 0 ? 'th' : 'td', k === 0 ? { scope: 'row', text: x } : { text: x }); })); })))));
    }
    q.parts.forEach(function (p) { card.appendChild(buildPart(q, p)); });
    var model = el('details', { class: 'model', hidden: true }, el('summary', { text: 'Show the model answer' }), el('div', { 'data-model': q.id }));
    var hint = el('details', { class: 'hint' }, el('summary', { text: 'Hint' }), R('p', null, q.hint || ''));
    card.appendChild(el('div', { class: 'btns qbtns' },
      el('button', { class: 'btn', type: 'button', text: 'Open the simulator for this question', onclick: function () { openSim(q); } }),
      el('button', { class: 'btn primary', type: 'button', text: 'Check answers', onclick: function () { check(q); } }),
      el('button', { class: 'btn', type: 'button', text: 'Try again', 'data-again': q.id, hidden: true, onclick: function () { again(q); } })));
    card.appendChild(hint); card.appendChild(model);
    return card;
  }

  /* ---------- actions ---------- */
  function openSim(q) {
    store.sim = q.id; save();
    if (HL.sim) HL.sim.apply(q.sim, { n: qnum(q), id: q.id, task: q.sim.task });
  }
  function show(q, res) {
    var card = cards[q.id];
    q.parts.forEach(function (p) {
      var r = res.parts[p.id], ul = card.querySelector('[data-fb="' + p.id + '"]'), box = card.querySelector('[data-part="' + p.id + '"]');
      ul.textContent = '';
      r.items.forEach(function (it) {
        var li = feedbackItem(it);
        if (p.type === 'written' && it.key && it.ok === 'no') {
          var cb = el('input', { type: 'checkbox', onchange: function (e) { store.self[it.key] = e.target.checked; check(q, true); } });
          li.appendChild(el('label', { class: 'claim' }, cb, 'I said this in other words'));
        } else if (p.type === 'written' && it.key && it.ok === 'self') {
          li.appendChild(el('label', { class: 'claim' }, el('input', { type: 'checkbox', checked: true, onchange: function (e) { store.self[it.key] = e.target.checked; check(q, true); } }), 'I said this in other words'));
        }
        ul.appendChild(li);
      });
      if (p.type === 'num') p.inputs.forEach(function (i) {
        var st = r.inputs[i.id], t = box.querySelector('input[data-id="' + i.id + '"]'), s = box.querySelector('[data-stat="' + i.id + '"]');
        var k = st ? st.status : 'blank', good = k === 'yes' || k === 'ecf' || k === 'via';
        t.classList.toggle('good', good); t.classList.toggle('bad', k === 'no'); s.textContent = good ? '✓' : k === 'no' ? '✗' : '';
        s.className = 'istat ' + (good ? 'ok' : k === 'no' ? 'no' : '');
      });
      if (p.type === 'table') box.querySelectorAll('input[data-key]').forEach(function (t) {
        var k = r.cells[t.dataset.key]; t.classList.toggle('good', k === 'yes' || k === 'ecf'); t.classList.toggle('bad', k === 'no');
      });
      if (p.type === 'choice') box.querySelectorAll('label.opt').forEach(function (l) {
        var v = l.querySelector('input'); l.classList.toggle('good', v.checked && r.marks > 0); l.classList.toggle('bad', v.checked && r.marks === 0);
      });
    });
    var sc = card.querySelector('[data-score="' + q.id + '"]'); sc.textContent = res.total % 1 ? res.total.toFixed(1) + ' / ' + res.max : res.total + ' / ' + res.max;
    sc.className = 'qscore ' + (res.total === res.max ? 'full' : res.total ? 'some' : 'none');
    var md = card.querySelector('[data-model="' + q.id + '"]'); md.textContent = '';
    QB.modelAnswers(q).forEach(function (m) {
      md.appendChild(el('p', { class: 'mpart' }, el('b', { text: '(' + m.id + ') ' }), rich(m.text)));
      md.appendChild(el('ul', null, m.lines.map(function (ln) { return R('li', null, ln); })));
    });
    card.querySelector('details.model').hidden = false;
    card.querySelector('[data-again="' + q.id + '"]').hidden = false;
  }
  function check(q, keepFocus) {
    var a = collect(q), res = QB.markQuestion(q, a, store.self);
    store.ans[q.id] = a; store.score[q.id] = { m: res.total, max: res.max }; store.checked[q.id] = true;
    save(); show(q, res); renderProgress();
    var sc = cards[q.id].querySelector('[data-score="' + q.id + '"]');
    $('live') && ($('live').textContent = 'Question ' + qnum(q) + ': ' + sc.textContent + ' marks');
  }
  function again(q) {
    var card = cards[q.id];
    card.querySelectorAll('.fbl').forEach(function (u) { u.textContent = ''; });
    card.querySelectorAll('.good,.bad').forEach(function (n) { n.classList.remove('good', 'bad'); });
    card.querySelectorAll('.istat').forEach(function (n) { n.textContent = ''; });
    card.querySelector('details.model').hidden = true; card.querySelector('details.model').open = false;
    card.querySelector('[data-again="' + q.id + '"]').hidden = true;
    var sc = card.querySelector('[data-score="' + q.id + '"]'); sc.textContent = ''; sc.className = 'qscore';
    var first = card.querySelector('input[type=text],textarea,input[type=radio]'); if (first) first.focus();
  }
  function fill(q) {
    var a = store.ans[q.id]; if (!a) return;
    var card = cards[q.id];
    q.parts.forEach(function (p) {
      var box = card.querySelector('[data-part="' + p.id + '"]');
      if (p.type === 'choice' && a[p.id]) { var r = box.querySelector('input[value="' + a[p.id] + '"]'); if (r) r.checked = true; }
      else if (p.type === 'written' && a[p.id]) box.querySelector('textarea').value = a[p.id];
      else if (p.type === 'num') p.inputs.forEach(function (i) {
        var v = a[i.id]; if (!v) return;
        box.querySelector('input[data-id="' + i.id + '"]').value = v.v || '';
        var s = box.querySelector('select[data-id="' + i.id + '"]'); if (s && v.u) s.value = v.u;
      });
      else if (p.type === 'table') box.querySelectorAll('input[data-key]').forEach(function (t) { if (a[t.dataset.key]) t.value = a[t.dataset.key].v || ''; });
    });
    if (store.checked[q.id]) show(q, QB.markQuestion(q, a, store.self));
  }

  /* ---------- progress ---------- */
  function renderProgress() {
    var got = 0, n = 0, tot = QB.totalMarks();
    QB.questions.forEach(function (q) { var s = store.score[q.id]; if (s) { got += s.m; n++; } });
    var pct = Math.round(100 * got / tot), box = $('progress'); box.textContent = '';
    var shown = got % 1 ? got.toFixed(1) : String(got);
    box.appendChild(el('div', { class: 'card prog' },
      el('div', { class: 'proghead' }, el('h2', { text: 'Your progress' }), el('span', { class: 'progn', text: shown + ' / ' + tot + ' marks' })),
      el('div', { class: 'bar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(tot), 'aria-valuenow': shown, 'aria-label': 'Marks so far' }, el('span', { style: 'width:' + pct + '%' })),
      el('p', { class: 'fine', text: n + ' of ' + QB.questions.length + ' questions checked. Saved on this device only.' }),
      el('div', { class: 'btns' },
        el('button', { class: 'btn', type: 'button', text: 'Copy my results', onclick: copyResults }),
        el('button', { class: 'btn', type: 'button', id: 'b-resetall', text: 'Reset all progress', onclick: resetAll })),
      el('p', { class: 'fine', id: 'live', role: 'status', 'aria-live': 'polite' })));
  }
  function copyResults() {
    var lines = ['Half-life and Choosing Isotopes'], got = 0;
    QB.questions.forEach(function (q) { var s = store.score[q.id]; if (s) got += s.m; lines.push('Q' + qnum(q) + ' ' + q.title + ': ' + (s ? (s.m % 1 ? s.m.toFixed(1) : s.m) + '/' + s.max : 'not checked')); });
    lines.push('Total: ' + (got % 1 ? got.toFixed(1) : got) + '/' + QB.totalMarks());
    var txt = lines.join('\n'), msg = $('live');
    function fallback() { var ta = el('textarea', { readonly: 'readonly', rows: 8, style: 'width:100%' }); ta.value = txt; msg.textContent = ''; msg.appendChild(ta); ta.select(); }
    try { navigator.clipboard.writeText(txt).then(function () { msg.textContent = 'Results copied.'; }, fallback); } catch (e) { fallback(); }
  }
  var armed = false;
  function resetAll() {
    var b = $('b-resetall');
    if (!armed) { armed = true; b.textContent = 'Click again to wipe your answers'; setTimeout(function () { armed = false; if ($('b-resetall')) $('b-resetall').textContent = 'Reset all progress'; }, 4000); return; }
    armed = false; store = { ans: {}, self: {}, score: {}, checked: {} };
    try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    render();
  }

  function render() {
    var list = $('qlist'); list.textContent = ''; cards = {};
    var lastPart = '';
    QB.questions.forEach(function (q) {
      if (q.part !== lastPart) { lastPart = q.part; list.appendChild(el('h2', { class: 'parthead', text: QB.PARTS[q.part].name + '  (' + QB.PARTS[q.part].level + ')' })); }
      var c = buildCard(q); cards[q.id] = c; list.appendChild(c);
    });
    QB.questions.forEach(fill); renderProgress();
  }

  HL.backToQuestion = function (id) {
    if (HL.tabs) HL.tabs.show('questions', true);
    var c = cards[id]; if (c) { c.scrollIntoView({ block: 'start' }); var f = c.querySelector('input,textarea,button'); if (f) f.focus({ preventScroll: true }); }
  };

  load(); render();
})();
