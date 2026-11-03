/**
 * Level type B — Predict the Motion (also the Stage 2/3 graph-reading levels).
 *
 * The student sees ONE graph with a marked moment and predicts what the
 * object is physically doing: a value, the direction, speeding up or
 * slowing down, when it stops or turns round, the acceleration from a
 * gradient. Afterwards the real motion plays, with all three graphs, so the
 * prediction is checked against what actually happens.
 */
(function () {
  const { h, choiceList, feedback, misconceptionCallout, shuffle } = window.UI;
  const MM = window.MotionModel;
  const Fmt = window.Fmt;
  const K = window.ActivityKit;

  const TREND_OPTIONS = [
    { value: 'speeding-up', label: 'Speeding up' },
    { value: 'slowing-down', label: 'Slowing down' },
    { value: 'constant', label: 'Constant speed' },
    { value: 'rest', label: 'At rest' },
  ];

  function buildQuestion(sc, q, R, focus) {
    const m = sc.motion;
    const T = m.duration;
    const phases = K.longPhases(m, 0.12);
    const ph = R.pick(phases.length ? phases : MM.phases(m));
    const t = K.momentIn(ph, T);
    const st = MM.stateAt(m, t);
    const reversals = MM.reversalTimes(m);
    const pool = [];

    // value read straight off the graph
    pool.push('value');
    pool.push('direction');
    pool.push('trend');
    if (q === 'v') pool.push('reverse');
    if (q === 'v' && Math.abs(m.segments.find((sg) => t >= sg.t0 && t <= sg.t1).j) < 1e-9) pool.push('gradient');
    if (q === 's' && m.idealised) pool.push('gradient');
    if (focus === 'gradient') pool.push('gradient', 'gradient', 'trend');

    let kind = R.pick(pool);
    if (q === 'a' && kind === 'direction' && Math.abs(m.v0) < 1e-9 && R.next() < 0.5) kind = 'trend';
    const where = 'at t = ' + Fmt.num(t, 1) + ' s';
    const markers = [{ t, label: 't = ' + Fmt.num(t, 1) + ' s', color: '#e8590c' }];
    const startInfo = q === 'a' ? ' At t = 0 its velocity is ' + Fmt.signed(m.v0) + ' m/s.' : '';

    if (kind === 'value') {
      const val = st[q];
      const unit = window.GraphCanvas.LABELS[q].unit;
      const name = { s: 'displacement', v: 'velocity', a: 'acceleration' }[q];
      const ds = [{ value: -val, why: 'Check the sign: the graph is ' + (val < 0 ? 'below' : 'above') + ' the time axis here.', misconception: q === 'v' ? 'neg-velocity-slowing' : null }];
      if (q === 's') ds.push({ value: st.v, why: 'That is the gradient (the velocity). The displacement is the HEIGHT of the graph.', misconception: 'gradient-vs-value' });
      if (q === 'v') ds.push({ value: st.a, why: 'That is the gradient (the acceleration). The velocity is the HEIGHT of the v–t graph.', misconception: 'velocity-acceleration-same' });
      if (q === 'a') ds.push({ value: st.v, why: 'That is the velocity. Read the HEIGHT of the a–t graph.', misconception: 'velocity-acceleration-same' });
      ds.push({ value: val + (R.sign() * Math.max(1, Math.abs(val) * 0.5)), why: 'Read the scale carefully.', misconception: null });
      return {
        markers,
        prompt: 'What is the object’s ' + name + ' ' + where + '?' + startInfo,
        options: K.numberChoices(val, unit, ds, 1),
        explain: 'Read the height of the graph ' + where + ': ' + name + ' = ' + Fmt.signedUnit(val, unit, 1) + '.',
        qt: 'value-' + q,
        skills: q === 's' ? ['displacement'] : q === 'v' ? ['velocity'] : ['acceleration'],
      };
    }
    if (kind === 'direction') {
      const d = MM.signOf(st.v, 1e-6);
      const how = q === 's' ? 'The GRADIENT of the s–t graph is the velocity: it is ' + (d > 0 ? 'positive (sloping up)' : d < 0 ? 'negative (sloping down)' : 'zero (flat)') + ' here.' : q === 'v' ? 'The v–t graph is ' + (d > 0 ? 'ABOVE' : d < 0 ? 'BELOW' : 'ON') + ' the time axis, so the velocity is ' + (d > 0 ? 'positive.' : d < 0 ? 'negative.' : 'zero.') : 'From the starting velocity plus the area under the a–t graph, v ' + where + ' = ' + Fmt.signed(st.v, 1) + ' m/s.';
      return {
        markers,
        prompt: 'Which way is the object moving ' + where + '?' + startInfo,
        options: [1, -1, 0].map((x) => ({
          label: K.DIR_LABEL(sc, x),
          correct: x === d,
          why: how,
          misconception: q === 's' ? 'gradient-vs-value' : q === 'v' ? 'neg-velocity-slowing' : 'velocity-acceleration-same',
        })),
        explain: how,
        qt: 'direction-' + q,
        skills: ['signs', q === 's' ? 'gradient' : q === 'v' ? 'velocity' : 'acceleration'],
      };
    }
    if (kind === 'trend') {
      const trend = ph.trend;
      let how;
      if (q === 's') how = trend === 'rest' ? 'Flat s–t graph: zero gradient, at rest.' : trend === 'constant' ? 'Straight line: constant gradient, so constant velocity.' : 'The s–t graph is getting ' + (trend === 'speeding-up' ? 'STEEPER' : 'LESS steep') + ', so the speed is ' + (trend === 'speeding-up' ? 'increasing.' : 'decreasing.');
      else if (q === 'v') how = trend === 'rest' ? 'v = 0: at rest.' : 'The speed is the DISTANCE of the v–t graph from the time axis. Here it is moving ' + (trend === 'speeding-up' ? 'AWAY from' : trend === 'slowing-down' ? 'TOWARDS' : 'neither towards nor away from') + ' the axis.';
      else how = 'Velocity here is ' + Fmt.signed(st.v, 1) + ' m/s and acceleration ' + Fmt.signed(st.a, 1) + ' m/s². ' + (trend === 'speeding-up' ? 'Same signs → speeding up.' : trend === 'slowing-down' ? 'Opposite signs → slowing down.' : 'Zero acceleration → constant speed.');
      const mis = q === 'v' && st.v < 0 ? (trend === 'speeding-up' ? 'neg-accel-slowing' : 'backwards-neg-accel') : q === 's' ? 'pos-gradient-speeding' : 'neg-accel-deceleration';
      return {
        markers,
        prompt: 'Is the object speeding up, slowing down, moving at constant speed, or at rest ' + where + '?' + startInfo,
        options: TREND_OPTIONS.map((o) => ({ label: o.label, correct: o.value === trend, why: how, misconception: mis })),
        explain: how,
        qt: 'trend-' + q,
        skills: [q === 's' ? 'displacement' : q === 'v' ? 'velocity' : 'acceleration', 'gradient'],
      };
    }
    if (kind === 'reverse') {
      const tr = reversals[0];
      const vz = MM.velocityZeros(m);
      const cands = new Set();
      const opts = [];
      const add = (label, correct, why, mis) => {
        if (cands.has(label)) return;
        cands.add(label);
        opts.push({ label, correct, why, misconception: mis });
      };
      if (tr !== undefined) add('At t = ' + Fmt.num(tr, 1) + ' s', true, null, null);
      else add('It never changes direction', true, null, null);
      if (tr !== undefined) add('It never changes direction', false, 'The graph crosses the time axis, so the velocity changes sign.', 'zero-crossing-stops');
      // tempting wrong times: the peak of the v–t graph, the moment acceleration changes
      const ext = MM.extents(m).v;
      m.segments.forEach((sg) => {
        if (sg.t0 > 0) add('At t = ' + Fmt.num(sg.t0, 1) + ' s', false, 'At that moment the GRADIENT changes (the acceleration changes) — but the velocity keeps its sign.', 'velocity-acceleration-same');
      });
      vz.rests.forEach((r) => add('At t = ' + Fmt.num(r[0], 1) + ' s', tr !== undefined && Math.abs(tr - r[0]) < 1e-6, 'It stops here, but a stop is not a change of direction unless the velocity then has the opposite sign.', 'zero-crossing-stops'));
      void ext;
      const options = shuffle(opts.slice(0, 1).concat(shuffle(opts.slice(1)).slice(0, 3)));
      const how = tr !== undefined ? 'It changes direction where the v–t graph CROSSES the time axis (velocity changes sign): t = ' + Fmt.num(tr, 1) + ' s.' : 'The v–t graph never crosses the time axis, so the velocity never changes sign.';
      return {
        markers: [],
        prompt: 'When does the object change direction?',
        options,
        explain: how,
        qt: 'reverse',
        skills: ['velocity', 'signs'],
      };
    }
    // gradient → next quantity down
    const grad = q === 's' ? st.v : st.a;
    const unit = q === 's' ? 'm/s' : 'm/s²';
    const name = q === 's' ? 'velocity' : 'acceleration';
    const ds = [
      { value: -grad, why: 'Check the sign of the gradient: the graph slopes ' + (grad > 0 ? 'UP' : grad < 0 ? 'DOWN' : 'neither way') + ' here.', misconception: q === 's' ? 'pos-gradient-speeding' : st.v < 0 ? 'backwards-neg-accel' : 'neg-accel-slowing' },
      { value: st[q], why: 'That is the height of the graph. The ' + name + ' is its GRADIENT.', misconception: q === 's' ? 'gradient-vs-value' : 'velocity-acceleration-same' },
      { value: grad * 2 + (grad === 0 ? 1 : 0), why: 'Use rise ÷ run over a whole straight section.', misconception: null },
    ];
    const seg = m.segments.find((sg) => t >= sg.t0 && t <= sg.t1);
    const a0 = MM.stateAt(m, seg.t0 + 1e-9)[q];
    const a1 = MM.stateAt(m, seg.t1 - 1e-9)[q];
    return {
      markers,
      highlight: [seg.t0, seg.t1],
      prompt: 'Use the gradient of the graph to find the object’s ' + name + ' ' + where + '.',
      options: K.numberChoices(grad, unit, ds, 2),
      explain: 'Gradient over the highlighted straight section = (' + Fmt.signed(a1, 1) + ' − (' + Fmt.signed(a0, 1) + ')) ÷ (' + Fmt.num(seg.t1, 1) + ' − ' + Fmt.num(seg.t0, 1) + ') = ' + Fmt.signedUnit(grad, unit, 2) + '.',
      qt: 'gradient-' + q,
      skills: ['gradient', q === 's' ? 'velocity' : 'acceleration'],
    };
  }

  function makeRound(ctx) {
    const R = ctx.rng;
    const cfg = ctx.level.config;
    const q = cfg.graphs[ctx.roundIndex % cfg.graphs.length];
    ctx.used = ctx.used || new Set();
    const sc = K.pickScenario(cfg.tiers, ctx.difficulty, R);
    const Q = buildQuestion(sc, q, R, cfg.focus);
    const panel = K.graphPanel(sc.motion, q, { state: { markers: Q.markers, highlight: Q.highlight }, height: 250 });
    const fbSlot = h('div');
    const revealSlot = h('div', { style: { marginTop: '0.8rem' } });
    let viewer = null;
    const el = h(
      'div',
      { class: 'card' },
      h('p', { class: 'scenario-story' }, h('b', null, sc.generated ? 'A mystery object' : sc.title), ' moves along a straight line. Positive is ', h('b', null, sc.pos), '.'),
      panel.el,
      h('p', { class: 'prompt' }, Q.prompt),
      choiceList(Q.options, (opt) => {
        fbSlot.appendChild(
          feedback(opt.correct ? 'ok' : 'no', opt.correct ? 'Correct!' : 'Not quite.', [
            !opt.correct && opt.why && opt.why !== Q.explain ? h('p', null, opt.why) : null,
            h('p', null, Q.explain),
            !opt.correct && opt.misconception ? misconceptionCallout(opt.misconception) : null,
          ])
        );
        const btn = h('button', { type: 'button', class: 'btn btn-secondary btn-small' }, '▶ Watch the real motion');
        btn.addEventListener('click', () => {
          btn.remove();
          viewer = window.Viewer.MotionViewer(sc, { autoplay: true, reveal: 'progressive', graphHeight: 170 });
          revealSlot.appendChild(viewer.el);
        });
        revealSlot.appendChild(btn);
        ctx.answered({ correct: !!opt.correct, skills: Q.skills, misconception: opt.correct ? null : opt.misconception, questionType: Q.qt });
      }),
      fbSlot,
      revealSlot
    );
    return {
      el,
      destroy() {
        panel.graph.destroy();
        if (viewer) viewer.destroy();
      },
    };
  }

  window.Activities.predict = { makeRound, buildQuestion };
})();
