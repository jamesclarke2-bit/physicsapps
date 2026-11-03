/**
 * Stage 4 — Link the representations.
 *
 * words → graph   : read a description, pick the matching graph
 * graph → words   : read a graph, pick the matching description
 * equations       : equation → graph and graph → equation (s = s₀ + ut + ½at², v = u + at)
 */
(function () {
  const { h, choiceList, feedback, misconceptionCallout, shuffle, clear } = window.UI;
  const MM = window.MotionModel;
  const Fmt = window.Fmt;
  const Scn = window.Scenarios;
  const K = window.ActivityKit;

  function thumb(fn, T, q, breaks) {
    const c = h('canvas');
    const g = window.GraphCanvas.create(c, { quantity: q, cssHeight: 130, schematic: false });
    const tab = [];
    for (let k = 0; k <= 100; k++) tab.push(fn((T * k) / 100));
    let lo = Math.min(0, ...tab);
    let hi = Math.max(0, ...tab);
    if (hi - lo < 1e-6) {
      lo = -1;
      hi = 1;
    }
    const pad = (hi - lo) * 0.12;
    g.setFunction(fn, T, [lo - (lo < 0 ? pad : pad * 0.3), hi + (hi > 0 ? pad : pad * 0.3)], breaks || []);
    requestAnimationFrame(() => g.render({}));
    return { c, g };
  }

  function narrate(phases, sc, mutate) {
    const words = ['First', 'Then', 'Next', 'After that', 'Finally'];
    const ps = phases.slice(0, 5).map((p) => Object.assign({}, p, mutate ? mutate(p) : {}));
    return ps
      .map((p, i) => (i === ps.length - 1 && i > 0 ? 'Finally' : words[i]) + ' it is ' + MM.describePhase(p, sc.pos, sc.neg))
      .join('. ') + '.';
  }

  function wordsToGraph(ctx, R, parts) {
    const pool = Scn.listScenarios(R.pick([1, 2, 2, 3, 3]));
    const sc = R.pick(pool);
    const q = R.next() < 0.5 ? 'v' : 's';
    const cands = window.Activities.match.distinct(window.Activities.match.candidates(sc, q), sc.motion.duration);
    const options = shuffle([cands[0]].concat(shuffle(cands.slice(1)).slice(0, 3)));
    const fb = h('div');
    const grid = h('div', { class: 'choice-grid' });
    let locked = false;
    options.forEach((opt, i) => {
      const t = thumb(opt.fn, sc.motion.duration, q, opt.breaks);
      parts.push(t.g);
      const b = h('button', { type: 'button', class: 'choice' }, h('div', { class: 'choice-label' }, 'Graph ' + 'ABCD'[i]), t.c);
      b.addEventListener('click', () => {
        if (locked) return;
        locked = true;
        Array.from(grid.children).forEach((bb, k) => {
          bb.disabled = true;
          if (options[k].correct) bb.classList.add('correct');
        });
        if (!opt.correct) b.classList.add('wrong');
        fb.appendChild(feedback(opt.correct ? 'ok' : 'no', opt.correct ? 'Correct!' : 'Not that graph.', [!opt.correct ? h('p', null, opt.why) : null, !opt.correct && opt.misconception ? misconceptionCallout(opt.misconception) : null]));
        ctx.answered({ correct: !!opt.correct, misconception: opt.correct ? null : opt.misconception, questionType: 'words-graph-' + q });
      });
      grid.appendChild(b);
    });
    return h('div', null, h('p', { class: 'scenario-story' }, h('b', null, sc.title + '. '), sc.story, ' Positive is ', h('b', null, sc.pos), '.'), h('p', { class: 'prompt' }, 'Which ' + (q === 'v' ? 'velocity' : 'displacement') + '–time graph matches this description?'), grid, fb);
  }

  function graphToWords(ctx, R, parts) {
    const sc = K.pickScenario([2, 3, 4], ctx.difficulty, R);
    const q = R.pick(['v', 'v', 's']);
    const phases = K.longPhases(sc.motion, 0.06);
    const flipTrend = (p) => (p.trend === 'speeding-up' ? { trend: 'slowing-down' } : p.trend === 'slowing-down' ? { trend: 'speeding-up' } : {});
    const correct = narrate(phases, sc);
    const cands = [
      { label: correct, correct: true },
      { label: narrate(phases, sc, (p) => ({ direction: -p.direction })), why: 'Every direction is reversed. On a v–t graph the direction comes from which SIDE of the axis the graph is on; on an s–t graph, from the sign of the gradient.', misconception: q === 'v' ? 'neg-velocity-slowing' : 'gradient-vs-value' },
      { label: narrate(phases, sc, flipTrend), why: 'Speeding up and slowing down are swapped. Speeding up means the SIZE of the velocity grows — the v–t graph moves away from the axis.', misconception: 'neg-accel-deceleration' },
      { label: narrate(phases, sc, (p) => (p.direction < 0 ? Object.assign({ direction: 1 }, flipTrend(p)) : {})), why: 'This treats the negative-velocity parts as "slowing down in the positive direction". Negative velocity means moving the other way.', misconception: 'neg-velocity-slowing' },
    ];
    const seen = new Set();
    const options = shuffle(cands.filter((c) => (seen.has(c.label) ? false : seen.add(c.label))));
    const panel = K.graphPanel(sc.motion, q, { height: 230 });
    parts.push(panel.graph);
    const fb = h('div');
    return h(
      'div',
      null,
      h('p', { class: 'scenario-story' }, 'An object moves along a straight line. Positive is ', h('b', null, sc.pos), '.'),
      panel.el,
      h('p', { class: 'prompt' }, 'Which description matches the graph?'),
      choiceList(options, (opt) => {
        fb.appendChild(feedback(opt.correct ? 'ok' : 'no', opt.correct ? 'Correct!' : 'Not quite.', [!opt.correct ? h('p', null, opt.why) : null, h('p', null, h('b', null, 'Correct story: '), correct), !opt.correct && opt.misconception ? misconceptionCallout(opt.misconception) : null]));
        const viewer = window.Viewer.MotionViewer(sc, { autoplay: true, graphHeight: 150 });
        parts.push(viewer);
        fb.appendChild(viewer.el);
        ctx.answered({ correct: !!opt.correct, misconception: opt.correct ? null : opt.misconception, questionType: 'graph-words' });
      }),
      fb
    );
  }

  function eqText(form, s0, u, a) {
    const term = (coef, sym, first) => {
      if (Math.abs(coef) < 1e-9) return '';
      const mag = Fmt.trimNumber(Math.abs(coef));
      const body = (mag === '1' && sym ? '' : mag) + sym;
      if (first) return (coef < 0 ? '−' : '') + body;
      return (coef < 0 ? ' − ' : ' + ') + body;
    };
    if (form === 'v') {
      const t1 = term(u, '', true);
      const t2 = term(a, 't', !t1);
      return 'v = ' + (t1 + t2 || '0');
    }
    const t1 = term(s0, '', true);
    const t2 = term(u, 't', !t1);
    const t3 = term(a / 2, 't²', !t1 && !t2);
    return 's = ' + (t1 + t2 + t3 || '0');
  }

  function equations(ctx, R, parts) {
    const u = R.pick([-6, -4, -2, 0, 2, 4, 6]);
    let a = R.pick([-2, -1, 1, 2]);
    if (u === 0 && a === 0) a = 2;
    const s0 = R.pick([0, 0, 5, -5]);
    const T = 6;
    const motion = MM.createMotion({ s0, v0: u, segments: [{ duration: T, a }] });
    const form = R.next() < 0.5 ? 's' : 'v';
    const direction = R.next() < 0.5 ? 'eq-to-graph' : 'graph-to-eq';
    const variants = [
      { s0, u, a, correct: true },
      { s0, u: -u, a, why: 'The starting velocity has the wrong sign. The gradient of the s–t graph (or the height of the v–t graph) at t = 0 is u.', misconception: 'neg-velocity-slowing' },
      { s0, u, a: -a, why: 'The acceleration has the wrong sign. ' + (form === 's' ? 'The s–t curve bends ' + (a > 0 ? 'upwards (a > 0)' : 'downwards (a < 0)') + '.' : 'The v–t gradient is ' + (a > 0 ? 'positive' : 'negative') + '.'), misconception: u * a < 0 ? 'neg-accel-deceleration' : 'neg-accel-slowing' },
      form === 's' ? { s0, u, a: 2 * a, why: 'This forgets the ½ in ½at² — the coefficient of t² is HALF the acceleration.', misconception: null } : { s0, u: a, a: u === 0 ? -a : u, why: 'u and a are swapped. In v = u + at the constant is the starting velocity; the coefficient of t is the acceleration (the gradient).', misconception: 'velocity-acceleration-same' },
    ];
    const seen = new Set();
    const uniq = variants.filter((v) => {
      const key = eqText(form, v.s0, v.u, v.a);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const fb = h('div');
    const finish = (opt) => {
      fb.appendChild(
        feedback(opt.correct ? 'ok' : 'no', opt.correct ? 'Correct!' : 'Not quite.', [
          !opt.correct ? h('p', null, opt.why) : null,
          h('p', null, 'Here u = ' + Fmt.signed(u) + ' m/s and a = ' + Fmt.signed(a) + ' m/s²' + (form === 's' ? ', starting at s₀ = ' + Fmt.signed(s0) + ' m' : '') + ': ', h('b', null, eqText(form, s0, u, a)), '.'),
          ctx.mathMode === 'extension' ? h('p', { class: 'mode-note' }, 'Calculus check: differentiate s = s₀ + ut + ½at² to get v = ds/dt = u + at, and again to get a = dv/dt = a (constant).') : ctx.mathMode === 'advanced' ? h('p', { class: 'mode-note' }, 'Rate-of-change check: in v = u + at, velocity changes by a every second, so a is the gradient of the v–t graph.') : null,
          !opt.correct && opt.misconception ? misconceptionCallout(opt.misconception) : null,
        ])
      );
      ctx.answered({ correct: !!opt.correct, misconception: opt.correct ? null : opt.misconception, questionType: 'equation-' + form });
    };
    if (direction === 'eq-to-graph') {
      const grid = h('div', { class: 'choice-grid' });
      const options = shuffle(uniq);
      let locked = false;
      options.forEach((v, i) => {
        const mo = MM.createMotion({ s0: v.s0, v0: v.u, segments: [{ duration: T, a: v.a }] });
        const t = thumb((tt) => MM.stateAt(mo, tt)[form], T, form);
        parts.push(t.g);
        const b = h('button', { type: 'button', class: 'choice' }, h('div', { class: 'choice-label' }, 'Graph ' + 'ABCD'[i]), t.c);
        b.addEventListener('click', () => {
          if (locked) return;
          locked = true;
          Array.from(grid.children).forEach((bb, k) => {
            bb.disabled = true;
            if (options[k].correct) bb.classList.add('correct');
          });
          if (!v.correct) b.classList.add('wrong');
          finish(v);
        });
        grid.appendChild(b);
      });
      return h('div', null, h('p', { class: 'prompt' }, 'Positive is to the right. An object moves so that ', h('span', { class: 'maths-line' }, eqText(form, s0, u, a)), ' (t from 0 to ' + T + ' s). Which graph shows this?'), grid, fb);
    }
    const panel = K.graphPanel(motion, form, { height: 230 });
    parts.push(panel.graph);
    const options = shuffle(uniq).map((v) => Object.assign({ label: h('span', { class: 'maths-line' }, eqText(form, v.s0, v.u, v.a)) }, v));
    return h('div', null, h('p', { class: 'scenario-story' }, 'Uniform acceleration along a straight line; positive is to the right.'), panel.el, h('p', { class: 'prompt' }, 'Which equation describes this graph?'), choiceList(options, finish, { grid: true }), fb);
  }

  function makeRound(ctx) {
    const R = ctx.rng;
    const parts = [];
    const mode = ctx.level.config.mode;
    const body = mode === 'words-to-graph' ? wordsToGraph(ctx, R, parts) : mode === 'graph-to-words' ? graphToWords(ctx, R, parts) : equations(ctx, R, parts);
    const el = h('div', { class: 'card' }, body);
    void clear;
    return { el, destroy: () => parts.forEach((p) => p.destroy()) };
  }

  window.Activities.link = { makeRound, eqText };
})();
