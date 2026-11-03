/**
 * Teacher mode: course and maths settings, lesson launchers, a printable
 * question-bank generator with worked answers, and session analytics.
 */
(function () {
  const { h, clear, segmented } = window.UI;
  const QG = window.QuantGen;
  const Fmt = window.Fmt;
  const LV = window.Levels;
  const Mis = window.Misconceptions;

  /** Draw a question's graph off-screen and return it as an image (for the printable worksheet). */
  function graphImage(g) {
    const holder = h('div', { style: { position: 'absolute', left: '-9999px', top: '0', width: '480px' } });
    const c = h('canvas', { style: { width: '480px' } });
    holder.appendChild(c);
    document.body.appendChild(holder);
    const gc = window.GraphCanvas.create(c, { quantity: g.quantity, cssHeight: 240, schematic: !!g.schematic });
    gc.setMotion(g.motion);
    gc.resize();
    gc.render({
      highlight: g.highlight || null,
      shade: g.shadeArea ? { t0: g.shadeArea[0], t1: g.shadeArea[1] } : null,
      tangentAt: g.tangentAt !== undefined && !g.tangentHidden ? g.tangentAt : null,
      upTo: g.hideAfter !== undefined ? g.hideAfter : null,
    });
    const url = c.toDataURL('image/png');
    gc.destroy();
    holder.remove();
    return h('img', { src: url, alt: window.GraphCanvas.LABELS[g.quantity].title + ' graph for this question' });
  }

  function settingsCard(store, rerender) {
    const s = store.state.settings;
    const make = (key, options, label, note) => {
      const ctl = segmented(options, (v) => {
        store.setSetting(key, v);
        window.App.refreshHeader();
        rerender();
      }, label);
      requestAnimationFrame(() => {
        const i = options.findIndex((o) => String(o.value) === String(s[key]));
        if (i >= 0) ctl.el.children[i].setAttribute('aria-pressed', 'true');
      });
      return h('div', { class: 'setting' }, h('span', null, label), ctl.el, note ? h('span', { class: 'note' }, note) : null);
    };
    const unlock = h('input', { type: 'checkbox', checked: s.unlockAll ? true : null });
    unlock.addEventListener('change', () => store.setSetting('unlockAll', unlock.checked));
    return h(
      'div',
      { class: 'card' },
      h('h2', { style: { marginTop: 0 } }, 'Course & difficulty'),
      make('course', [{ value: 'gcse', label: 'GCSE mode' }, { value: 'alevel', label: 'A-level mode' }, { value: 'extension', label: 'Extension mode (A/A*, Oxbridge)' }], 'Course', 'GCSE mode hides A-level and extension levels. Extension mode shows everything.'),
      make('mathMode', [{ value: 'standard', label: 'Standard (no calculus)' }, { value: 'advanced', label: 'Advanced (rates of change)' }, { value: 'extension', label: 'Mathematical Extension (calculus on)' }], 'Maths', 'Calculus appears only in Mathematical Extension. It is never needed to progress.'),
      make('difficulty', [{ value: 'adaptive', label: 'Adaptive' }, { value: '1', label: 'Foundation' }, { value: '2', label: 'Intermediate' }, { value: '3', label: 'Advanced' }, { value: '4', label: 'Challenge' }, { value: '5', label: 'A/A*' }], 'Difficulty', 'Adaptive steps up after two right answers in a row and down after a wrong one.'),
      h('label', { class: 'toggle-row' }, unlock, 'Unlock every level (for a lesson that jumps straight to a topic)')
    );
  }

  function launchers() {
    const btn = (href, label, note) => h('a', { href }, h('div', { class: 'explore-card' }, h('strong', null, label), h('p', { class: 'note', style: { margin: '0.3rem 0 0' } }, note)));
    return h(
      'div',
      { class: 'card' },
      h('h2', { style: { marginTop: 0 } }, 'Lesson modes'),
      h(
        'div',
        { class: 'grid-3' },
        btn('#/detective', '🔍 Graph Detective mode', 'Case files from Beginner to Mastery. Great on the board: pupils vote on each prediction before the reveal.'),
        btn('#/fix', '🧩 Misconception mode', 'Every Fix-the-Mistake case, one misconception at a time. Ideal for intervention.'),
        btn('#/level/1-3', '± Signs starter', 'Ten minutes on the sign of acceleration — the idea most pupils get wrong.'),
        btn('#/explore/lab', '🧪 Motion Lab demo', 'Type an equation or build a journey in stages and show all three graphs live.'),
        btn('#/explore/gradient', '📐 Gradient demo', 'Tangents and the next graph growing from them; limits in Extension mode.'),
        btn('#/drag', '🪂 Air Resistance Lab', 'A ball, bullet or shuttlecock fired up and falling back, with a live free-body diagram and with/without comparison graphs.'),
        btn('#/drag/quiz', '🪂 Air resistance: predict first', 'Ten questions on drag direction, a = −g at the top, terminal velocity and the graph shapes.'),
        btn('#/level/6-6', '◭ Reconstruction lab', 'Open-ended, multiple-solution design problems for top Year 12s.')
      )
    );
  }

  function questionBank() {
    const topics = Object.keys(QG.GENERATORS);
    const boxes = {};
    const list = h(
      'div',
      { class: 'grid-3' },
      topics.map((t) => {
        const g = QG.GENERATORS[t];
        const cb = h('input', { type: 'checkbox', checked: g.band <= 3 ? true : null });
        boxes[t] = cb;
        return h('label', { class: 'toggle-row' }, cb, g.label, ' ', window.UI.tierTag(g.tier));
      })
    );
    const count = h('input', { type: 'number', min: '1', max: '30', value: '8', style: { width: '5rem' } });
    const seed = h('input', { type: 'number', value: String(Math.floor(Math.random() * 100000)), style: { width: '8rem' } });
    const answers = h('input', { type: 'checkbox', checked: true });
    const out = h('div', { class: 'worksheet' });
    const gen = h('button', { type: 'button', class: 'btn' }, 'Generate worksheet');
    gen.addEventListener('click', () => {
      const chosen = topics.filter((t) => boxes[t].checked);
      clear(out);
      if (!chosen.length) {
        out.appendChild(h('p', { class: 'note' }, 'Tick at least one topic.'));
        return;
      }
      const R = Fmt.createRng(Number(seed.value) || 1);
      const n = Math.max(1, Math.min(30, Number(count.value) || 8));
      const qs = [];
      for (let i = 0; i < n; i++) qs.push(QG.generate(chosen[i % chosen.length], R));
      out.appendChild(h('h2', null, 'Motion graphs practice (set ' + seed.value + ')'));
      out.appendChild(h('p', { class: 'note' }, 'Positive is to the right (or up) unless stated. Give signed answers where a direction matters.'));
      qs.forEach((q, i) => out.appendChild(h('div', { class: 'ws-q' }, h('p', null, h('b', null, 'Q' + (i + 1) + '. '), q.text, ' ', h('span', { class: 'note' }, '[' + q.unit + ']')), graphImage(q.graph))));
      if (answers.checked) {
        out.appendChild(h('h2', { style: { breakBefore: 'page' } }, 'Answers and worked solutions'));
        qs.forEach((q, i) => out.appendChild(h('div', { class: 'ws-q' }, h('p', null, h('b', null, 'Q' + (i + 1) + ': ' + (q.signed ? Fmt.signedUnit(q.answer, q.unit) : Fmt.unitStr(q.answer, q.unit)))), h('ol', null, q.steps.map((s) => h('li', null, s))))));
      }
      if (window.UI.canPrint) out.appendChild(h('div', { class: 'btn-row no-print' }, h('button', { type: 'button', class: 'btn', onclick: () => window.print() }, '🖨 Print / save as PDF')));
    });
    return h(
      'div',
      { class: 'card' },
      h('h2', { style: { marginTop: 0 } }, 'Question bank generator'),
      h('p', { class: 'note' }, 'Every question is generated fresh with its graph and a full worked answer. The same set number always gives the same questions, so a class can share a set.'),
      list,
      h('div', { class: 'toggle-row', style: { marginTop: '0.8rem' } }, h('label', null, 'Questions ', count), h('label', null, 'Set number ', seed), h('label', null, answers, 'Include answers'), gen),
      out
    );
  }

  function analytics(store) {
    const st = store.state;
    const byType = {};
    st.history.forEach((x) => {
      const k = x.y || 'other';
      byType[k] = byType[k] || { n: 0, c: 0 };
      byType[k].n++;
      byType[k].c += x.c;
    });
    const typeRows = Object.keys(byType).map((k) => {
      const info = LV.TYPE_INFO[k];
      const time = st.activityTime[k] || 0;
      return h('tr', null, h('td', null, info ? info.label : k), h('td', null, String(byType[k].n)), h('td', null, Math.round((100 * byType[k].c) / byType[k].n) + '%'), h('td', null, Math.round(time / 60000) + ' min'));
    });
    const misRows = Object.keys(st.misconceptions)
      .sort((a, b) => st.misconceptions[b] - st.misconceptions[a])
      .map((id) => h('tr', null, h('td', null, (Mis.getMisconception(id) || { title: id }).title), h('td', null, String(st.misconceptions[id]))));
    const log = st.history
      .slice(-25)
      .reverse()
      .map((x) => h('tr', null, h('td', null, new Date(x.t).toLocaleTimeString()), h('td', null, x.l || '—'), h('td', null, x.k ? LV.SKILLS[x.k] || x.k : '—'), h('td', null, x.c ? '✓' : '✗'), h('td', null, x.m ? (Mis.getMisconception(x.m) || { title: x.m }).title : '')));
    return h(
      'div',
      { class: 'card' },
      h('h2', { style: { marginTop: 0 } }, 'Performance analytics (this device, this session)'),
      h('p', { class: 'note' }, 'Nothing ever leaves the device, so these figures cover whoever has used this browser tab. On a shared classroom screen they summarise the lesson; for individuals, ask pupils to print their dashboard.'),
      h('div', { class: 'grid-2' },
        h('div', null, h('h3', null, 'By activity'), typeRows.length ? h('table', { class: 'data-table' }, h('thead', null, h('tr', null, h('th', null, 'Activity'), h('th', null, 'Answers'), h('th', null, 'Accuracy'), h('th', null, 'Time'))), h('tbody', null, typeRows)) : h('p', { class: 'note' }, 'No answers yet.')),
        h('div', null, h('h3', null, 'Misconceptions'), misRows.length ? h('table', { class: 'data-table' }, h('thead', null, h('tr', null, h('th', null, 'Misconception'), h('th', null, 'Times'))), h('tbody', null, misRows)) : h('p', { class: 'note' }, 'None recorded yet.'))
      ),
      h('h3', null, 'Most recent answers'),
      log.length ? h('div', { style: { overflowX: 'auto' } }, h('table', { class: 'data-table' }, h('thead', null, h('tr', null, h('th', null, 'Time'), h('th', null, 'Level'), h('th', null, 'Skill'), h('th', null, 'Result'), h('th', null, 'Misconception'))), h('tbody', null, log))) : h('p', { class: 'note' }, 'No answers yet.'),
      h('div', { class: 'btn-row' }, h('a', { class: 'btn btn-secondary', href: '#/dashboard' }, 'Open the student dashboard'))
    );
  }

  function render(container) {
    const store = window.App.store;
    const rerender = () => render(container);
    clear(container);
    container.appendChild(h('h1', null, '🧑‍🏫 Teacher mode'));
    container.appendChild(h('p', { class: 'subtitle' }, 'Set the course and maths level, launch a lesson mode, generate printable questions, and see how the session went. No accounts and no data collection — settings and results stay in this browser tab.'));
    container.appendChild(settingsCard(store, rerender));
    container.appendChild(launchers());
    container.appendChild(questionBank());
    container.appendChild(analytics(store));
    return null;
  }

  window.Views = window.Views || {};
  window.Views.teacher = render;
})();
