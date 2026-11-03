/**
 * Graph Detective (flagship).
 *
 * The student gets a case file containing ONLY a graph, split into lettered
 * phases. Before seeing anything move they commit to what the object is
 * doing in every phase (direction, speeding up / slowing down), whether and
 * when it turns round, and where it ends up. Then the motion is revealed —
 * animation plus all three graphs — and each prediction is marked with the
 * evidence from the graph that settles it.
 */
(function () {
  const { h, feedback, misconceptionCallout, segmented, clear } = window.UI;
  const MM = window.MotionModel;
  const Fmt = window.Fmt;
  const K = window.ActivityKit;
  const LETTERS = 'ABCDEFGH';
  const TREND_LABEL = { 'speeding-up': 'Speeding up', 'slowing-down': 'Slowing down', constant: 'Constant speed', rest: 'At rest' };
  const RANKS = ['Rookie', 'Constable', 'Sergeant', 'Inspector', 'Chief Inspector'];

  function casePhases(motion) {
    const T = motion.duration;
    const ph = MM.phases(motion).filter((p) => p.t1 - p.t0 >= T * 0.06);
    return ph.slice(0, 8).map((p, i) => Object.assign({ letter: LETTERS[i] }, p));
  }

  function evidence(q, sc, p) {
    const m = sc.motion;
    const mid = MM.stateAt(m, (p.t0 + p.t1) / 2);
    const dir = p.direction > 0 ? sc.pos : p.direction < 0 ? sc.neg : 'nowhere';
    if (q === 's') {
      if (p.trend === 'rest') return 'Flat line: the displacement isn’t changing, so it is at rest.';
      return 'Gradient is ' + (p.direction > 0 ? 'positive' : 'negative') + ' → moving ' + dir + '. ' + (p.trend === 'constant' ? 'Straight line → constant velocity.' : 'The curve gets ' + (p.trend === 'speeding-up' ? 'steeper → speeding up.' : 'flatter → slowing down.'));
    }
    if (q === 'v') {
      if (p.trend === 'rest') return 'v = 0 throughout: at rest.';
      return 'Graph ' + (p.direction > 0 ? 'above' : 'below') + ' the axis → velocity ' + (p.direction > 0 ? 'positive' : 'negative') + ' → moving ' + dir + '. ' + (p.trend === 'constant' ? 'Horizontal → constant speed.' : 'Moving ' + (p.trend === 'speeding-up' ? 'AWAY from' : 'TOWARDS') + ' the axis → ' + (p.trend === 'speeding-up' ? 'speeding up.' : 'slowing down.'));
    }
    if (p.trend === 'rest') return 'Velocity has reached zero and the acceleration is zero: at rest.';
    return 'Starting velocity + area under the a–t graph gives v ≈ ' + Fmt.signed(mid.v, 1) + ' m/s here (moving ' + dir + '); a is ' + (Math.abs(mid.a) < 1e-6 ? 'zero → constant speed.' : (mid.a > 0 ? 'positive' : 'negative') + ' → ' + (mid.a * mid.v > 0 ? 'same sign as v → speeding up.' : 'opposite sign to v → slowing down.'));
  }

  function makeRound(ctx) {
    const R = ctx.rng;
    const cfg = ctx.level.config;
    const sc = K.pickScenario(cfg.tiers, ctx.difficulty, R);
    const m = sc.motion;
    const tierNow = Math.max(...cfg.tiers);
    const qs = tierNow >= 3 ? ['v', 's', 'a'] : ['s', 'v'];
    const q = qs[(ctx.roundIndex + R.int(0, 2)) % qs.length];
    const phases = casePhases(m);
    const reversals = MM.reversalTimes(m);
    const net = MM.displacementBetween(m, 0, m.duration);
    const netSign = MM.signOf(net, Math.max(0.02 * MM.distanceBetween(m, 0, m.duration), 1e-6));
    const parts = [];

    const panel = K.graphPanel(m, q, { height: 260, title: 'Evidence: ' + window.GraphCanvas.LABELS[q].title + ' graph', state: { phases: phases.map((p) => ({ t0: p.t0, t1: p.t1, label: p.letter })) } });
    parts.push(panel.graph);

    // ---------- prediction form ----------
    const rows = phases.map((p) => {
      const dirCtl = segmented(
        [
          { value: 1, label: '+ ' + sc.posShort },
          { value: -1, label: '− ' + (sc.posShort === 'up' ? 'down' : 'left') },
          { value: 0, label: 'Not moving' },
        ],
        null,
        'Direction in phase ' + p.letter
      );
      const trendCtl = segmented(
        Object.keys(TREND_LABEL).map((k) => ({ value: k, label: TREND_LABEL[k] })),
        null,
        'Speed in phase ' + p.letter
      );
      const verdict = h('td');
      const tr = h('tr', null, h('th', { scope: 'row' }, h('span', { class: 'phase-letter' }, p.letter), h('div', { class: 'note' }, Fmt.num(p.t0, 1) + '–' + Fmt.num(p.t1, 1) + ' s')), h('td', null, dirCtl.el), h('td', null, trendCtl.el), verdict);
      return { p, dirCtl, trendCtl, verdict, tr };
    });
    const table = h('table', { class: 'phase-table' }, h('thead', null, h('tr', null, h('th', null, 'Phase'), h('th', null, 'Which way is it moving?'), h('th', null, 'Is its speed…'), h('th', null, ''))), h('tbody', null, rows.map((r) => r.tr)));

    const revOptions = [{ value: 'never', label: 'Never' }].concat(
      phases.slice(1).map((p, i) => ({ value: String(i + 1), label: 'Between ' + phases[i].letter + ' and ' + p.letter + ' (t = ' + Fmt.num(p.t0, 1) + ' s)' }))
    );
    const revCtl = segmented(revOptions, null, 'When does it first change direction?');
    const firstRev = reversals.length ? reversals[0] : null;
    let revAnswer = 'never';
    if (firstRev !== null) {
      const k = phases.findIndex((p, i) => i > 0 && Math.abs(p.t0 - firstRev) < 1e-6);
      revAnswer = k > 0 ? String(k) : 'never';
      if (k <= 0) {
        // reversal not on a listed boundary (inside a merged/short phase): pick the nearest boundary
        let best = 1;
        phases.forEach((p, i) => {
          if (i > 0 && Math.abs(p.t0 - firstRev) < Math.abs(phases[best].t0 - firstRev)) best = i;
        });
        revAnswer = String(best);
      }
    }
    const endCtl = segmented(
      [
        { value: 1, label: 'On the positive side (' + sc.pos + ')' },
        { value: -1, label: 'On the negative side (' + sc.neg + ')' },
        { value: 0, label: 'Back where it started' },
      ],
      null,
      'Where does it finish?'
    );
    const story = h('textarea', { class: 'story-box', placeholder: 'Optional: describe the whole journey in words, as if telling a friend. You’ll compare it with the real story.', 'aria-label': 'Your story of the motion' });
    const resultSlot = h('div');
    const revealSlot = h('div');
    const revealBtn = h('button', { type: 'button', class: 'btn' }, '🔍 Lock in predictions & reveal the motion');

    revealBtn.addEventListener('click', () => {
      const unanswered = rows.some((r) => r.dirCtl.value() === null || r.trendCtl.value() === null) || revCtl.value() === null || endCtl.value() === null;
      if (unanswered && !revealBtn.dataset.warned) {
        revealBtn.dataset.warned = '1';
        clear(resultSlot);
        resultSlot.appendChild(feedback('', 'A detective commits to every answer', h('p', null, 'Some predictions are still blank. Fill them in (or press reveal again to accept blanks as wrong).')));
        return;
      }
      revealBtn.remove();
      let right = 0;
      let total = 0;
      const misses = [];
      rows.forEach((r) => {
        const okDir = r.dirCtl.value() === r.p.direction;
        const okTrend = r.trendCtl.value() === r.p.trend;
        r.dirCtl.lock(r.p.direction);
        r.trendCtl.lock(r.p.trend);
        total += 2;
        right += (okDir ? 1 : 0) + (okTrend ? 1 : 0);
        if (!okDir) misses.push(q === 'v' ? 'neg-velocity-slowing' : q === 's' ? 'gradient-vs-value' : 'velocity-acceleration-same');
        if (!okTrend) misses.push(r.p.direction < 0 ? (r.p.trend === 'slowing-down' ? 'backwards-neg-accel' : 'neg-accel-slowing') : q === 's' ? 'pos-gradient-speeding' : 'neg-accel-deceleration');
        r.verdict.appendChild(h('div', { class: 'verdict ' + (okDir && okTrend ? 'ok' : 'no') }, okDir && okTrend ? '✓' : '✗'));
        r.verdict.appendChild(h('div', { class: 'note' }, evidence(q, sc, r.p)));
      });
      total += 2;
      const okRev = revCtl.value() === revAnswer;
      const okEnd = endCtl.value() === netSign;
      right += (okRev ? 1 : 0) + (okEnd ? 1 : 0);
      if (!okRev) misses.push('zero-crossing-stops');
      if (!okEnd) misses.push(q === 'v' ? 'area-always-distance' : 'displacement-distance');
      revCtl.lock(revAnswer);
      endCtl.lock(netSign);
      const score = right / total;
      const perfect = right === total;
      const rank = RANKS[Math.min(RANKS.length - 1, Math.floor(score * (RANKS.length - 0.01)))];
      resultSlot.appendChild(
        feedback(score >= 0.8 ? 'ok' : 'no', (perfect ? 'Case solved perfectly! ' : 'Case closed: ') + right + ' / ' + total + ' clues correct — detective rank: ' + rank, [
          h('p', null, h('b', null, 'Turning round: '), firstRev === null ? 'it never changes direction.' : 'it first changes direction at t = ' + Fmt.num(firstRev, 1) + ' s, where the velocity changes sign.'),
          h('p', null, h('b', null, 'Finishing point: '), 'its displacement at the end is ' + Fmt.signedUnit(net, 'm', 1) + (q === 'v' ? ' — the net (signed) area under the v–t graph.' : '.')),
          sc.story && !sc.generated ? h('p', null, h('b', null, 'The real story: '), sc.story) : h('p', null, h('b', null, 'The real story: '), phases.map((p) => p.letter + ': ' + MM.describePhase(p, sc.pos, sc.neg)).join('; ') + '.'),
          story.value.trim() ? h('p', { class: 'note' }, 'Compare with your story above: did you mention every change of direction and every change of speed?') : null,
          misses.length ? misconceptionCallout(misses[0]) : null,
        ])
      );
      const viewer = window.Viewer.MotionViewer(sc, { autoplay: true, graphHeight: 170, decorate: () => ({ phases: phases.map((p) => ({ t0: p.t0, t1: p.t1, label: p.letter })) }) });
      parts.push(viewer);
      revealSlot.appendChild(h('h3', null, 'The motion, revealed'));
      revealSlot.appendChild(viewer.el);
      ctx.answered({ correct: score >= 0.8, score, misconception: misses[0] || null, extraMisconceptions: misses.slice(1, 3), questionType: 'detective-' + q, counter: perfect ? 'detectivePerfect' : null, skills: ctx.level.skills.concat(['multistage']) });
    });

    const caseNo = 100 + Math.floor(R.next() * 900);
    const el = h(
      'div',
      { class: 'case-file' },
      h('h2', { style: { marginTop: '0.3rem' } }, 'Case #' + caseNo + ': ' + (sc.generated ? 'The Mystery Motion' : 'The ' + sc.title)),
      h('p', null, 'One object, one straight line. ', h('b', null, 'Positive is ' + sc.pos + '. '), q === 'a' ? 'At t = 0 its velocity is ' + Fmt.signed(m.v0) + ' m/s. ' : '', 'All you have is the graph below. What happened?'),
      panel.el,
      h('h3', { style: { marginTop: '1rem' } }, 'Your predictions'),
      h('div', { style: { overflowX: 'auto' } }, table),
      h('div', { style: { marginTop: '0.8rem' } }, h('p', { class: 'prompt', style: { fontSize: '0.98rem' } }, 'When does it first change direction?'), revCtl.el),
      h('div', { style: { marginTop: '0.8rem' } }, h('p', { class: 'prompt', style: { fontSize: '0.98rem' } }, 'Where does it finish, compared with where it started?'), endCtl.el),
      h('div', { style: { marginTop: '0.8rem' } }, story),
      h('div', { class: 'btn-row' }, revealBtn),
      resultSlot,
      revealSlot
    );
    return { el, destroy: () => parts.forEach((p) => p.destroy()) };
  }

  window.Activities.detective = { makeRound, casePhases };
})();
