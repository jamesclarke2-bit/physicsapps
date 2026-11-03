/**
 * LevelRunner: plays one level as a sequence of rounds from an activity.
 *
 * Every activity module registers `window.Activities[type] = { makeRound }`.
 * makeRound(ctx) builds one round into a fresh element and calls
 * ctx.answered({ correct, score?, misconception?, questionType?, counter? })
 * once the student has committed. The runner then records progress, adapts
 * the difficulty, and offers "Next". After the last round it shows stars,
 * XP, personal bests and how mastery moved.
 */
(function () {
  const { h, clear } = window.UI;
  window.Activities = window.Activities || {};

  function run(container, level, options) {
    const App = window.App;
    const store = App.store;
    const settings = store.state.settings;
    const activity = window.Activities[level.type];
    const opts = options || {};
    const rounds = opts.rounds || level.rounds;
    const fixedDifficulty = settings.difficulty !== 'adaptive' ? Number(settings.difficulty) : null;
    let difficulty = fixedDifficulty || 1;
    let correctRun = 0;
    let index = 0;
    let scoreSum = 0;
    const results = [];
    const started = Date.now();
    let roundStart = Date.now();
    let current = null;
    const rng = window.Fmt.createRng(opts.seed || window.Fmt.randomSeed());
    const masteryBefore = {};
    level.skills.forEach((k) => (masteryBefore[k] = store.mastery(k)));

    const dots = h('div', { class: 'round-dots', 'aria-label': 'Progress through this level' });
    const head = h(
      'div',
      { class: 'runner-head' },
      h('div', null, h('div', { class: 'note' }, (opts.kicker || 'Stage ' + level.stage + ' · ' + window.Levels.TYPE_INFO[level.type].label) + ' '), h('h1', null, level.title, ' ', window.UI.tierTag(level.tier))),
      dots
    );
    const body = h('div');
    const nextRow = h('div', { class: 'btn-row' });
    clear(container);
    container.appendChild(head);
    container.appendChild(body);
    container.appendChild(nextRow);

    function drawDots() {
      clear(dots);
      for (let i = 0; i < rounds; i++) {
        const r = results[i];
        dots.appendChild(h('span', { class: r ? (r.correct ? 'ok' : 'no') : i === index ? 'cur' : '' }));
      }
    }

    function startRound() {
      clear(body);
      clear(nextRow);
      drawDots();
      roundStart = Date.now();
      if (current && current.destroy) current.destroy();
      let done = false;
      const ctx = {
        level,
        roundIndex: index,
        rounds,
        difficulty,
        rng,
        settings,
        mathMode: settings.mathMode,
        answered(result) {
          if (done) return;
          done = true;
          record(result);
        },
      };
      current = activity.makeRound(ctx);
      body.appendChild(current.el);
      const focusable = body.querySelector('button, input, select');
      if (focusable && index > 0) focusable.focus({ preventScroll: true });
    }

    function record(result) {
      const score = result.score !== undefined ? result.score : result.correct ? 1 : 0;
      const correct = result.correct !== undefined ? result.correct : score >= 0.75;
      results[index] = { correct, score };
      scoreSum += score;
      const res = store.recordAnswer({
        correct,
        skills: result.skills || level.skills,
        tier: level.tier,
        type: level.type,
        levelId: level.id,
        misconception: result.misconception || null,
        questionType: result.questionType || null,
        counter: correct ? result.counter : null,
        band: difficulty,
      });
      (result.extraMisconceptions || []).forEach((m) => {
        store.state.misconceptions[m] = (store.state.misconceptions[m] || 0) + 1;
      });
      window.UI.announce(res.events);
      if (res.xpGained) window.UI.toast('+' + res.xpGained + ' XP' + (res.streak >= 3 ? '  🔥 ' + res.streak + ' in a row' : ''));
      // adaptive difficulty
      if (!fixedDifficulty) {
        if (correct) {
          correctRun++;
          if (correctRun >= 2) {
            difficulty = Math.min(difficulty + 1, 5);
            correctRun = 0;
          }
        } else {
          correctRun = 0;
          difficulty = Math.max(difficulty - 1, 1);
        }
      }
      store.addTime(level.type, Date.now() - roundStart);
      drawDots();
      const last = index >= rounds - 1;
      const btn = h('button', { type: 'button', class: 'btn' }, last ? 'Finish level ✓' : 'Next →');
      btn.addEventListener('click', () => {
        index++;
        if (last) finish();
        else startRound();
        window.scrollTo({ top: 0, behavior: window.UI.prefersReducedMotion() ? 'auto' : 'smooth' });
      });
      nextRow.appendChild(btn);
      btn.focus({ preventScroll: true });
    }

    function finish() {
      if (current && current.destroy) current.destroy();
      current = null;
      const correctCount = results.filter((r) => r.correct).length;
      const done = store.completeLevel(level, scoreSum, rounds, Date.now() - started);
      window.UI.announce(done.events);
      clear(body);
      clear(nextRow);
      drawDots();
      const masteryRows = level.skills.map((k) => {
        const before = Math.round(masteryBefore[k] * 100);
        const after = Math.round(store.mastery(k) * 100);
        return h('div', { class: 'bar-item' }, h('span', null, window.Levels.SKILLS[k]), h('div', { class: 'bar-track' }, h('span', { style: { width: after + '%' } })), h('span', null, before + '% → ', h('b', null, after + '%')));
      });
      const nextLv = window.Levels.nextLevel(store.state.levels, store.state.settings);
      body.appendChild(
        h(
          'div',
          { class: 'card level-complete' },
          h('div', { class: 'big-stars', 'aria-label': done.stars + ' stars' }, [0, 1, 2].map((i) => h('span', { class: i < done.stars ? '' : 'off' }, '★'))),
          h('h2', null, done.stars === 3 ? 'Superb!' : done.stars === 2 ? 'Well done!' : 'Level complete'),
          h('p', null, correctCount + ' of ' + rounds + ' fully correct · accuracy ' + Math.round(done.accuracy * 100) + '% · +' + Math.round(done.bonus) + ' XP bonus'),
          done.newBest ? h('p', null, '🏆 New personal best accuracy for this level!') : null,
          done.fasterBest ? h('p', null, '⏱ New personal best time!') : null,
          h('div', { class: 'bar-list', style: { maxWidth: '520px', margin: '1rem auto', textAlign: 'left' } }, masteryRows),
          h(
            'div',
            { class: 'btn-row', style: { justifyContent: 'center' } },
            h('button', { type: 'button', class: 'btn btn-secondary', onclick: () => run(container, level, options) }, '↻ Play again'),
            nextLv && nextLv.id !== level.id ? h('a', { class: 'btn', href: '#/level/' + nextLv.id }, 'Next: ' + nextLv.title + ' →') : null,
            h('a', { class: 'btn btn-secondary', href: '#/learn' }, 'Learning journey')
          )
        )
      );
      if (opts.onFinish) opts.onFinish(done);
    }

    startRound();
    return {
      destroy() {
        if (current && current.destroy) current.destroy();
      },
    };
  }

  window.LevelRunner = { run };
})();
