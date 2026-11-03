/**
 * Stage 3 — Area challenge ("Area means displacement").
 *
 * A time window is marked on a v–t (or a–t) graph. The student predicts
 * the displacement (or distance, or change in velocity) BEFORE anything is
 * shaded. The reveal shades positive area and negative area in different
 * colours and shows the running total building up on the next graph up.
 */
(function () {
  const { h, feedback, misconceptionCallout } = window.UI;
  const MM = window.MotionModel;
  const Fmt = window.Fmt;
  const K = window.ActivityKit;

  function niceTime(x, T) {
    const step = T > 20 ? 1 : 0.5;
    return Math.max(0, Math.min(T, Math.round(x / step) * step));
  }

  function makeRound(ctx) {
    const R = ctx.rng;
    const tiers = ctx.difficulty >= 3 ? [3, 4] : ctx.level.config.tiers;
    let sc = K.pickScenario(tiers, ctx.difficulty, R);
    // prefer motions without idealised velocity jumps (their area is fine, but the a–t view isn't)
    if (sc.motion.idealised) sc = window.Scenarios.getScenario('car-trip');
    const m = sc.motion;
    const T = m.duration;
    const useA = ctx.difficulty >= 4 && R.next() < 0.4;
    const q = useA ? 'a' : 'v';
    const crosses = MM.reversalTimes(m).length > 0;
    const kind = !useA && crosses && R.next() < 0.5 ? 'distance' : useA ? 'dv' : 'displacement';
    let t0 = 0;
    let t1 = T;
    if (R.next() < 0.5) {
      t0 = niceTime(R.next() * T * 0.4, T);
      t1 = niceTime(T * (0.6 + R.next() * 0.4), T);
    }
    const answer = kind === 'displacement' ? MM.displacementBetween(m, t0, t1) : kind === 'distance' ? MM.distanceBetween(m, t0, t1) : MM.stateAt(m, t1).v - MM.stateAt(m, t0).v;
    const unit = kind === 'dv' ? 'm/s' : 'm';
    const label = kind === 'displacement' ? 'displacement' : kind === 'distance' ? 'distance travelled' : 'change in velocity';
    const panel = K.graphPanel(m, q, { height: 250, state: { highlight: [t0, t1] } });
    const upC = h('canvas');
    const up = window.GraphCanvas.create(upC, { quantity: q === 'v' ? 's' : 'v', cssHeight: 190 });
    up.setMotion(m);
    const upPanel = h('div', { class: 'graph-panel ' + (q === 'v' ? 's' : 'v') }, h('h3', null, (q === 'v' ? 'Displacement' : 'Velocity') + '–time graph: the running total of the area'), upC);
    upPanel.hidden = true;
    const input = h('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', 'aria-label': 'Your prediction' });
    const btn = h('button', { type: 'button', class: 'btn' }, 'Reveal the area');
    const fb = h('div');
    let done = false;
    let animRaf = null;

    function submit() {
      if (done) return;
      const val = Fmt.parseAnswer(input.value);
      if (!isFinite(val)) {
        fb.innerHTML = '';
        fb.appendChild(feedback('', 'Type a number first', h('p', null, 'Make your prediction, then reveal. Use − for a negative value.')));
        return;
      }
      done = true;
      input.disabled = true;
      btn.disabled = true;
      const ok = Fmt.withinTolerance(val, answer, 0.05, 0.3);
      let mis = null;
      let why = null;
      if (!ok) {
        const disp = MM.displacementBetween(m, t0, t1);
        const dist = MM.distanceBetween(m, t0, t1);
        if (kind === 'displacement' && Fmt.withinTolerance(val, dist, 0.05, 0.3) && Math.abs(dist - disp) > 0.3) {
          mis = 'area-always-distance';
          why = 'You added all the area as positive. Area BELOW the time axis is displacement in the negative direction — subtract it.';
        } else if (kind === 'distance' && Fmt.withinTolerance(val, disp, 0.05, 0.3)) {
          mis = 'displacement-distance';
          why = 'That is the displacement. For distance, count the area below the axis as positive too.';
        } else if (Fmt.withinTolerance(-val, answer, 0.05, 0.3)) {
          mis = 'neg-velocity-slowing';
          why = 'Right size, wrong sign: is most of the area above or below the axis?';
        } else why = 'Split the region into rectangles and triangles and add their areas, remembering the sign of each.';
      }
      // animate the shading sweeping across, and the running total building up on the graph above
      upPanel.hidden = false;
      const start = performance.now();
      const dur = window.UI.prefersReducedMotion() ? 0 : 1600;
      const step = (now) => {
        const f = dur ? Math.min(1, (now - start) / dur) : 1;
        const tt = t0 + (t1 - t0) * f;
        panel.graph.render({ highlight: [t0, t1], shade: { t0, t1: Math.max(tt, t0 + 1e-6) }, cursor: tt });
        up.render({ upTo: tt, cursor: tt, highlight: [t0, t1] });
        if (f < 1) animRaf = requestAnimationFrame(step);
      };
      animRaf = requestAnimationFrame(step);
      const pos = kind !== 'dv' ? (MM.distanceBetween(m, t0, t1) + MM.displacementBetween(m, t0, t1)) / 2 : null;
      const neg = kind !== 'dv' ? (MM.distanceBetween(m, t0, t1) - MM.displacementBetween(m, t0, t1)) / 2 : null;
      fb.innerHTML = '';
      fb.appendChild(
        feedback(ok ? 'ok' : 'no', ok ? 'Spot on!' : 'The ' + label + ' is ' + (kind === 'distance' ? Fmt.unitStr(answer, unit, 1) : Fmt.signedUnit(answer, unit, 1)), [
          why ? h('p', null, why) : null,
          kind !== 'dv'
            ? h('p', null, 'Area above the axis (teal) = ', h('b', null, Fmt.num(pos, 1) + ' m'), '; area below (red) = ', h('b', null, Fmt.num(neg, 1) + ' m'), '. Displacement = ' + Fmt.num(pos, 1) + ' − ' + Fmt.num(neg, 1) + ' = ' + Fmt.signedUnit(pos - neg, 'm', 1) + '; distance = ' + Fmt.num(pos, 1) + ' + ' + Fmt.num(neg, 1) + ' = ' + Fmt.unitStr(pos + neg, 'm', 1) + '.')
            : h('p', null, 'Area under the a–t graph = change in velocity: ' + Fmt.signed(MM.stateAt(m, t0).v, 1) + ' → ' + Fmt.signed(MM.stateAt(m, t1).v, 1) + ' m/s.'),
          h('p', { class: 'note' }, 'Watch the graph underneath: its height climbs while the shaded area is above the axis and falls while it is below.'),
          ctx.mathMode === 'extension' ? h('p', { class: 'mode-note' }, kind === 'dv' ? 'Δv = ∫ a dt from ' + t0 + ' to ' + t1 + ' s.' : 'Displacement = ∫ v dt; distance = ∫ |v| dt.') : null,
          mis ? misconceptionCallout(mis) : null,
        ])
      );
      ctx.answered({ correct: ok, misconception: mis, questionType: 'area-' + kind, skills: ['area', kind === 'dv' ? 'acceleration' : 'displacement'] });
    }
    btn.addEventListener('click', submit);
    input.addEventListener('keydown', (e) => e.key === 'Enter' && submit());

    const el = h(
      'div',
      { class: 'card' },
      h('p', { class: 'scenario-story' }, h('b', null, sc.generated ? 'A mystery object. ' : sc.title + '. '), 'Positive is ', h('b', null, sc.pos), '.', useA ? ' At t = 0 its velocity is ' + Fmt.signed(m.v0) + ' m/s.' : ''),
      h('p', { class: 'prompt' }, 'Predict the ' + label + ' between t = ' + Fmt.num(t0, 1) + ' s and t = ' + Fmt.num(t1, 1) + ' s (the highlighted window), using the area under the graph.'),
      panel.el,
      h('div', { class: 'answer-row', style: { marginTop: '0.7rem' } }, input, h('span', { class: 'unit' }, unit), btn),
      fb,
      h('div', { style: { marginTop: '0.75rem' } }, upPanel)
    );
    return {
      el,
      destroy() {
        if (animRaf) cancelAnimationFrame(animRaf);
        panel.graph.destroy();
        up.destroy();
      },
    };
  }

  window.Activities.area = { makeRound };
})();
