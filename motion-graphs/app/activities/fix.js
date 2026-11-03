/**
 * Level type D — Fix the Mistake.
 *
 * A (fictional) student makes a confident but flawed claim about a graph.
 * The player works through three steps: WHAT is wrong, WHY it is wrong,
 * and the CORRECT interpretation — each with its own feedback — and can
 * "test the claim" by playing the real motion.
 */
(function () {
  const { h, choiceList, feedback, misconceptionCallout, shuffle } = window.UI;
  const Mis = window.Misconceptions;
  const Scn = window.Scenarios;
  const K = window.ActivityKit;
  const orderCache = new WeakMap();
  const STEP_TITLES = { what: '1. What is wrong with the claim?', why: '2. Why is it wrong?', correct: '3. What is the correct interpretation?' };

  function casesFor(level) {
    const cfg = level.config;
    let list = Mis.FIX_CASES;
    if (cfg.misconception) list = list.filter((c) => c.misconception === cfg.misconception);
    else if (cfg.tier) list = list.filter((c) => c.tier === cfg.tier);
    return list.length ? list : Mis.FIX_CASES;
  }

  function makeRound(ctx) {
    if (ctx.roundIndex === 0 || !orderCache.has(ctx.level)) orderCache.set(ctx.level, shuffle(casesFor(ctx.level)));
    const order = orderCache.get(ctx.level);
    const fc = order[ctx.roundIndex % order.length];
    const sc = Scn.getScenario(fc.scenario);
    const panel = K.graphPanel(sc.motion, fc.graph, { height: 230, state: { highlight: fc.window } });
    const parts = [panel.graph];
    const stepsSlot = h('div');
    const testSlot = h('div', { style: { marginTop: '0.6rem' } });
    const steps = ['what', 'why', 'correct'];
    let got = 0;

    function runStep(i) {
      if (i >= steps.length) {
        const m = Mis.getMisconception(fc.misconception);
        stepsSlot.appendChild(feedback(got === 3 ? 'ok' : '', got === 3 ? 'Mistake fixed!' : 'Case closed — ' + got + ' of 3 steps right', [h('p', null, h('b', null, 'The faulty idea: '), '“' + m.title + '.”'), h('p', null, m.truth)]));
        ctx.answered({ correct: got === 3, score: got / 3, misconception: got < 3 ? fc.misconception : null, questionType: 'fix-' + fc.misconception, counter: 'fixesSolved', skills: ctx.level.skills.concat([m.skill]) });
        return;
      }
      const key = steps[i];
      const list = fc[key];
      const options = shuffle(list.map((label, k) => ({ label, correct: k === 0 })));
      const fbSlot = h('div');
      const block = h(
        'div',
        { style: { marginTop: '0.9rem' } },
        h('h3', null, STEP_TITLES[key]),
        choiceList(options, (opt) => {
          if (opt.correct) got++;
          fbSlot.appendChild(feedback(opt.correct ? 'ok' : 'no', opt.correct ? 'Yes.' : 'Not quite — the best answer is highlighted.', key === 'why' && !opt.correct ? h('p', null, list[0] + '.') : null));
          const nxt = h('button', { type: 'button', class: 'btn btn-secondary btn-small', style: { marginTop: '0.5rem' } }, i < 2 ? 'Next step →' : 'Close the case →');
          nxt.addEventListener('click', () => {
            nxt.remove();
            runStep(i + 1);
          });
          fbSlot.appendChild(nxt);
        }),
        fbSlot
      );
      stepsSlot.appendChild(block);
    }

    const testBtn = h('button', { type: 'button', class: 'btn btn-secondary btn-small' }, '▶ Test the claim: play the real motion');
    testBtn.addEventListener('click', () => {
      testBtn.remove();
      const viewer = window.Viewer.MotionViewer(sc, { autoplay: true, graphHeight: 160, decorate: () => ({ highlight: fc.window }) });
      parts.push(viewer);
      testSlot.appendChild(viewer.el);
    });
    testSlot.appendChild(testBtn);

    const el = h(
      'div',
      { class: 'card' },
      h('p', { class: 'scenario-story' }, h('b', null, sc.title + '. '), sc.story, ' Positive is ', h('b', null, sc.pos), '.'),
      panel.el,
      h('div', { class: 'feedback', style: { background: '#fff', borderLeftColor: '#f5a623' } }, h('div', { class: 'fb-title' }, '💬 A student says:'), h('p', { style: { margin: 0, fontSize: '1.05rem' } }, '“' + fc.claim + '”'), h('p', { class: 'note', style: { margin: '0.3rem 0 0' } }, 'The shaded part of the graph is the part they are talking about.')),
      testSlot,
      stepsSlot
    );
    runStep(0);
    return { el, destroy: () => parts.forEach((p) => p.destroy()) };
  }

  window.Activities.fix = { makeRound };
})();
