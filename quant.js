/**
 * Quantitative challenges (Stage 5 and the A-level / extension levels).
 *
 * Each round is a generated question with its graph, a numeric answer box
 * that accepts any minus sign, marking that recognises the predictable
 * wrong answers (and names the misconception behind them), and the full
 * worked answer. The maths mode adds a rate-of-change or calculus reading
 * of the same working.
 */
(function () {
  const { h, feedback, misconceptionCallout } = window.UI;
  const QG = window.QuantGen;
  const Fmt = window.Fmt;
  const MM = window.MotionModel;

  const MODE_NOTES = {
    'vel-gradient': { advanced: 'Rate-of-change view: velocity is the rate at which displacement changes — metres gained per second.', extension: 'Calculus view: v = ds/dt. On a straight section ds/dt is just the constant gradient Δs/Δt.' },
    'acc-gradient': { advanced: 'Rate-of-change view: acceleration is how many m/s the velocity gains each second.', extension: 'Calculus view: a = dv/dt, the gradient of the v–t graph.' },
    'disp-area': { advanced: 'Accumulation view: each thin strip v × Δt is a small displacement; the area adds them all up.', extension: 'Calculus view: s = ∫ v dt — the integral is exactly the signed area.' },
    'dv-area': { advanced: 'Accumulation view: each strip a × Δt is a small change in velocity; the area is the total change.', extension: 'Calculus view: Δv = ∫ a dt.' },
    distance: { extension: 'Calculus view: distance = ∫ |v| dt, while displacement = ∫ v dt.' },
    'displacement-net': { extension: 'Calculus view: displacement = ∫ v dt, which counts area below the axis as negative.' },
    tangent: { advanced: 'The tangent’s gradient is the rate of change at that one instant.', extension: 'Calculus view: the tangent gradient is the derivative ds/dt at that time.' },
    'variable-accel': { extension: 'Calculus view: v = u + ∫ a dt; with a = a₀(1 − t/T), that integral is a₀T/2.' },
  };

  function makeRound(ctx) {
    const R = ctx.rng;
    const topics = ctx.level.config.topics;
    // adaptive: later topics in the list are harder, so higher difficulty leans towards them
    const span = topics.length;
    const base = Math.min(span - 1, Math.floor(((ctx.difficulty - 1) / 5) * span));
    const pick = (ctx.roundIndex + base) % span;
    const Q = QG.generate(topics[pick], R);
    const g = Q.graph;
    const c = h('canvas');
    const L = window.GraphCanvas.LABELS[g.quantity];
    const graph = window.GraphCanvas.create(c, { quantity: g.quantity, cssHeight: 260, schematic: !!g.schematic });
    graph.setMotion(g.motion);
    const baseState = {
      highlight: g.highlight || null,
      shade: g.shadeArea ? { t0: g.shadeArea[0], t1: g.shadeArea[1] } : null,
      tangentAt: g.tangentAt !== undefined && !g.tangentHidden ? g.tangentAt : null,
      upTo: g.hideAfter !== undefined ? g.hideAfter : null,
      markers: g.tangentAt !== undefined ? [{ t: g.tangentAt, label: 't = ' + g.tangentAt + ' s', color: '#2b8a3e' }] : g.hideAfter !== undefined ? [{ t: g.hideAfter, label: '?  missing section', color: '#e8590c' }] : null,
    };
    if (g.schematic) {
      // label the key heights instead of numbering the axis
      const vmax = MM.extents(g.motion).v[1];
      baseState.points = [{ t: g.motion.segments[0].t1, y: vmax, label: 'V', color: '#d9480f', r: 4 }];
    }
    requestAnimationFrame(() => graph.render(baseState));

    const input = h('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', 'aria-label': 'Your answer in ' + Q.unit, placeholder: Q.signed ? 'e.g. −2.5' : 'e.g. 12' });
    const check = h('button', { type: 'button', class: 'btn' }, 'Check');
    const hintBtn = g.tangentHidden ? h('button', { type: 'button', class: 'btn btn-secondary btn-small' }, 'Show a tangent') : null;
    if (hintBtn) {
      hintBtn.addEventListener('click', () => {
        hintBtn.remove();
        graph.render(Object.assign({}, baseState, { tangentAt: g.tangentAt, tangentTriangle: true }));
      });
    }
    const fbSlot = h('div');
    let attempts = 0;
    let done = false;

    function submit() {
      if (done) return;
      const res = QG.mark(Q, input.value);
      if (res.unreadable) {
        fbSlot.innerHTML = '';
        fbSlot.appendChild(feedback('', 'Type a number', h('p', null, res.message)));
        return;
      }
      attempts++;
      // one retry for a predictable slip (wrong sign, distance vs displacement…), then reveal
      if (!res.correct && attempts === 1 && res.misconception) {
        fbSlot.innerHTML = '';
        fbSlot.appendChild(feedback('no', 'Think again — one more try', [h('p', null, res.message), misconceptionCallout(res.misconception)]));
        input.select();
        firstMis = res.misconception;
        return;
      }
      done = true;
      input.disabled = true;
      check.disabled = true;
      graph.render(Object.assign({}, baseState, { upTo: null, markers: baseState.markers, tangentAt: g.tangentAt !== undefined ? g.tangentAt : null, tangentTriangle: g.tangentAt !== undefined, shade: g.shadeArea ? baseState.shade : null }));
      const note = MODE_NOTES[Q.topic] && MODE_NOTES[Q.topic][ctx.mathMode];
      fbSlot.innerHTML = '';
      fbSlot.appendChild(
        feedback(res.correct ? 'ok' : 'no', res.correct ? (attempts > 1 ? 'Correct on the second try.' : 'Correct!') : 'The answer is ' + (Q.signed ? Fmt.signedUnit(Q.answer, Q.unit) : Fmt.unitStr(Q.answer, Q.unit)), [
          !res.correct ? h('p', null, res.message) : null,
          h('div', null, h('b', null, 'Worked answer'), h('ol', null, Q.steps.map((s) => h('li', null, s)))),
          note ? h('p', { class: 'mode-note' }, note) : null,
          !res.correct && res.misconception ? misconceptionCallout(res.misconception) : null,
        ])
      );
      ctx.answered({ correct: res.correct, score: res.correct ? (attempts > 1 ? 0.75 : 1) : 0, misconception: res.correct ? firstMis : res.misconception || firstMis, questionType: 'quant-' + Q.topic, counter: 'quantCorrect', skills: Q.skills });
    }
    let firstMis = null;
    check.addEventListener('click', submit);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submit();
    });

    const el = h(
      'div',
      { class: 'card' },
      h('div', { class: 'note' }, Q.topicLabel, ' ', window.UI.tierTag(Q.tier)),
      h('p', { class: 'prompt' }, Q.text),
      h('div', { class: 'graph-panel ' + g.quantity }, h('h3', null, L.title + ' graph' + (g.schematic ? ' (sketch — not to scale)' : '')), c),
      h('div', { class: 'answer-row', style: { marginTop: '0.8rem' } }, input, h('span', { class: 'unit' }, Q.unit), check, hintBtn),
      h('p', { class: 'note' }, Q.signed ? 'Include a minus sign if the answer is negative. Right is positive.' : 'This quantity has no direction, so give its size.'),
      fbSlot
    );
    return { el, destroy: () => graph.destroy() };
  }

  window.Activities.quant = { makeRound };
})();
