/**
 * Learning journey: the six-stage level map, with a "continue" button.
 * (The home page is the free-play explorers; this page holds the lessons.)
 */
(function () {
  const { h, starsEl, tierTag, clear } = window.UI;
  const LV = window.Levels;

  function render(container) {
    const App = window.App;
    const st = App.store.state;
    const settings = st.settings;
    const next = LV.nextLevel(st.levels, settings);
    const levels = LV.visibleLevels(settings);
    clear(container);

    const started = Object.keys(st.levels).length > 0;
    container.appendChild(h('h1', null, 'Learning journey'));
    container.appendChild(h('p', { class: 'subtitle' }, 'Six stages, from “what does a minus sign mean?” to reconstructing a whole journey from clues. Earn stars to unlock the next stage.'));
    container.appendChild(
      h(
        'div',
        { class: 'btn-row' },
        next ? h('a', { class: 'btn', href: '#/level/' + next.id }, started ? 'Continue: ' + next.title + ' →' : 'Start at Stage 1 →') : h('a', { class: 'btn', href: '#/dashboard' }, 'All levels done — see your dashboard'),
        h('a', { class: 'btn btn-secondary', href: '#/detective' }, '🔍 Graph Detective')
      )
    );

    LV.STAGES.forEach((stage) => {
      const unlocked = LV.stageUnlocked(stage.id, st.levels, settings);
      const lvls = levels.filter((lv) => lv.stage === stage.id);
      if (!lvls.length) return;
      const done = lvls.filter((lv) => st.levels[lv.id] && st.levels[lv.id].completed).length;
      const grid = h('div', { class: 'level-grid' });
      lvls.forEach((lv) => {
        const prog = st.levels[lv.id];
        const tile = h(
          'button',
          { type: 'button', class: 'level-tile tier-' + lv.tier + (prog && prog.completed ? ' done' : ''), disabled: unlocked ? null : true, 'aria-label': lv.title + (unlocked ? '' : ' (locked)') },
          h('div', { class: 'lt-top' }, h('span', null, LV.TYPE_INFO[lv.type].label), lv.tier !== 'gcse' ? tierTag(lv.tier) : null),
          h('div', { class: 'lt-title' }, lv.title),
          h('div', { class: 'lt-top' }, starsEl(prog ? prog.stars : 0), prog && prog.bestAccuracy ? h('span', null, 'best ' + Math.round(prog.bestAccuracy * 100) + '%') : null)
        );
        tile.addEventListener('click', () => (location.hash = '#/level/' + lv.id));
        grid.appendChild(tile);
      });
      const core = lvls.filter((lv) => lv.tier === 'gcse').length;
      container.appendChild(
        h(
          'section',
          { class: 'stage' + (unlocked ? '' : ' locked') },
          h('div', { class: 'stage-head' }, h('span', { class: 'stage-num' }, String(stage.id)), h('h2', null, stage.title), h('span', { class: 'note' }, stage.blurb + ' · ' + done + '/' + lvls.length + ' done' + (unlocked ? '' : ' · 🔒 complete half of Stage ' + (stage.id - 1) + '’s core levels to unlock'))),
          grid,
          core < lvls.length && stage.id === 5 ? h('p', { class: 'note' }, 'Purple and orange levels are A-level and extension content: optional, never needed to progress.') : null
        )
      );
    });
    return null;
  }

  window.Views = window.Views || {};
  window.Views.learn = render;
})();
