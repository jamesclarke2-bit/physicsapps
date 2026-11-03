/**
 * App shell: header (XP, rank, streak, maths mode), hash router, and the
 * small views that don't need their own file (Graph Detective case board,
 * Misconception gym, privacy notice).
 */
(function () {
  const { h, clear, tierTag } = window.UI;
  const LV = window.Levels;
  const Mis = window.Misconceptions;

  let storage = null;
  try {
    storage = window.sessionStorage;
  } catch (e) {
    storage = null; // blocked: the game still works, progress just won't survive a reload
  }
  const store = window.Progress.createStore(storage);

  const App = { store, refreshHeader: () => {} };
  window.App = App;

  // ---------------------------------------------------------------- header
  const LOGO = '<svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="#2a6bd6"/><path d="M6 25 H27 M6 25 V6" stroke="#fff" stroke-width="2"/><path d="M7 24 Q16 23 26 8" stroke="#ffd43b" stroke-width="3" fill="none" stroke-linecap="round"/></svg>';
  const NAV = [
    ['#/', 'Explore', 'home'],
    ['#/learn', 'Learn', 'learn'],
    ['#/detective', 'Detective', 'detective'],
    ['#/insights', 'Insights', 'insights'],
    ['#/dashboard', 'Dashboard', 'dashboard'],
    ['#/teacher', 'Teacher', 'teacher'],
  ];

  function buildHeader() {
    const header = document.querySelector('.app-header');
    clear(header);
    const st = store.state;
    const rank = store.rank();
    const pct = rank.next ? Math.round((100 * (st.xp - rank.floor)) / (rank.next - rank.floor)) : 100;
    const maths = h('select', { 'aria-label': 'Maths mode' }, [['standard', 'Standard'], ['advanced', 'Advanced'], ['extension', 'Extension (calculus)']].map(([v, l]) => h('option', { value: v, selected: st.settings.mathMode === v ? true : null }, l)));
    maths.addEventListener('change', () => {
      store.setSetting('mathMode', maths.value);
      route();
    });
    const nav = h('nav', { class: 'main-nav', 'aria-label': 'Main' }, NAV.map(([href, label, key]) => h('a', { href, 'data-key': key }, label)));
    header.appendChild(
      h(
        'div',
        { class: 'header-inner' },
        h('a', { class: 'brand', href: '#/', html: LOGO + '<span>Motion Graphs Mastery</span>' }),
        nav,
        h(
          'div',
          { class: 'status-strip' },
          h('span', { class: 'xp-pill', title: rank.next ? rank.next - st.xp + ' XP to ' + rank.nextTitle : 'Top rank' }, h('span', { class: 'rank-badge' }, rank.title), st.xp + ' XP', h('span', { class: 'xp-bar', 'aria-hidden': 'true' }, h('span', { style: { width: pct + '%' } }))),
          st.streak >= 2 ? h('span', { class: 'streak-pill', title: 'Correct answers in a row' }, '🔥 ' + st.streak) : null,
          h('label', { class: 'maths-mode' }, 'Maths:', maths)
        )
      )
    );
    markNav();
  }
  App.refreshHeader = buildHeader;
  store.onChange(() => {
    // keep the header live without rebuilding mid-interaction more than needed
    clearTimeout(App._hdrTimer);
    App._hdrTimer = setTimeout(buildHeader, 50);
  });

  function markNav() {
    const key = (location.hash.replace(/^#\/?/, '').split('/')[0] || 'home').replace('level', 'learn').replace('drag', 'home').replace('explore', 'home');
    document.querySelectorAll('.main-nav a').forEach((a) => {
      if (a.dataset.key === key || (key === 'fix' && a.dataset.key === 'home')) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  }

  // ---------------------------------------------------------------- small views
  const DETECTIVE_TIERS = [
    { tier: 1, name: 'Beginner', blurb: 'Constant-velocity stages: flat, rising and falling straight lines.', level: 'gcse' },
    { tier: 2, name: 'Intermediate', blurb: 'Speeding up and slowing down: curves and slopes.', level: 'gcse' },
    { tier: 3, name: 'Advanced', blurb: 'Multi-stage journeys with a change of direction.', level: 'gcse' },
    { tier: 4, name: 'Expert', blurb: 'Complex piecewise graphs: several reversals and rests.', level: 'gcse' },
    { tier: 5, name: 'Mastery', blurb: 'Variable acceleration and sign surprises.', level: 'alevel' },
  ];

  function detectiveView(container, params) {
    if (params[0]) {
      const d = DETECTIVE_TIERS.find((x) => String(x.tier) === params[0]);
      if (d) {
        const level = { id: 'detective-' + d.tier, stage: 0, tier: d.level, type: 'detective', title: 'Graph Detective: ' + d.name, skills: ['multistage', 'gradient'], rounds: 3, config: { tiers: [d.tier] } };
        return window.LevelRunner.run(container, level, { kicker: 'Graph Detective · ' + d.name + ' files' }).destroy;
      }
    }
    clear(container);
    container.appendChild(h('h1', null, '🔍 Graph Detective'));
    container.appendChild(h('p', { class: 'subtitle' }, 'You get a case file with ONLY a graph. Work out what the object did — which way it moved, when it sped up, slowed down, stopped or turned round — and commit to your predictions. Then watch the real motion and see how good a detective you are.'));
    container.appendChild(
      h(
        'div',
        { class: 'level-grid' },
        DETECTIVE_TIERS.map((d) => {
          const prog = store.state.levels['detective-' + d.tier];
          return h('a', { href: '#/detective/' + d.tier, style: { textDecoration: 'none', color: 'inherit' } }, h('div', { class: 'level-tile tier-' + d.level }, h('div', { class: 'lt-top' }, h('span', null, 'Case files'), d.level !== 'gcse' ? tierTag(d.level) : null), h('div', { class: 'lt-title' }, d.name), h('div', { class: 'note' }, d.blurb), h('div', { class: 'lt-top' }, window.UI.starsEl(prog ? prog.stars : 0))));
        })
      )
    );
    return null;
  }

  function fixView(container, params) {
    const id = params[0];
    if (id === 'all' || (id && Mis.MISCONCEPTIONS[id])) {
      const cases = id === 'all' ? Mis.FIX_CASES : Mis.casesFor(id);
      const m = Mis.MISCONCEPTIONS[id];
      const level = { id: 'fix-' + id, stage: 0, tier: 'gcse', type: 'fix', title: id === 'all' ? 'Misconception mode: every case' : 'Fix it: “' + m.title + '”', skills: ['signs', 'gradient'], rounds: id === 'all' ? 6 : Math.max(1, Math.min(4, cases.length)), config: id === 'all' ? {} : { misconception: id } };
      return window.LevelRunner.run(container, level, { kicker: 'Misconception gym' }).destroy;
    }
    clear(container);
    const counts = store.state.misconceptions;
    container.appendChild(h('h1', null, '🧩 Misconception gym'));
    container.appendChild(h('p', { class: 'subtitle' }, 'Each of these ideas sounds reasonable — and each is wrong. Pick one to work on. The number shows how many times it has tripped you up this session.'));
    container.appendChild(h('div', { class: 'btn-row' }, h('a', { class: 'btn', href: '#/fix/all' }, 'Mixed practice: all misconceptions →')));
    const ids = Object.keys(Mis.MISCONCEPTIONS).sort((a, b) => (counts[b] || 0) - (counts[a] || 0));
    container.appendChild(
      h(
        'div',
        { class: 'grid-2', style: { marginTop: '1rem' } },
        ids.map((k) => {
          const m = Mis.MISCONCEPTIONS[k];
          const n = Mis.casesFor(k).length;
          return h('div', { class: 'card' }, h('div', { class: 'lt-top', style: { display: 'flex', justifyContent: 'space-between' } }, h('b', null, '“' + m.title + '”'), counts[k] ? h('span', { class: 'tag', style: { background: '#fff5f5', color: '#c92a2a' } }, counts[k] + '× this session') : null), h('details', null, h('summary', { class: 'note' }, 'What’s the truth?'), h('p', null, m.truth)), n ? h('a', { class: 'btn btn-small', href: '#/fix/' + k }, 'Practise (' + n + ' case' + (n > 1 ? 's' : '') + ') →') : h('p', { class: 'note' }, 'Covered inside the Signs lab and Detective cases.'));
        })
      )
    );
    return null;
  }

  function privacyView(container) {
    clear(container);
    container.appendChild(h('h1', null, 'Privacy'));
    container.appendChild(
      h(
        'div',
        { class: 'card' },
        h('p', null, 'This game collects and sends nothing. There are no accounts, no sign-ins, no analytics, no adverts and no server for your data to go to — everything runs inside your own browser.'),
        h('p', null, 'Your progress (XP, stars, mastery, which misconceptions came up) is kept in your browser’s ', h('b', null, 'session storage'), ' for this tab only. The browser deletes it automatically when you close the tab or app. You can also clear it at any time from the dashboard.'),
        h('p', null, 'Anything you type — answers, predictions, your own story of a motion — is checked right here in your browser and never sent anywhere.'),
        h('p', { class: 'note' }, 'Like any website, the host that serves these files (for example GitHub Pages) can see standard web-server information such as IP addresses; that is outside the game’s control.')
      )
    );
    return null;
  }

  // ---------------------------------------------------------------- router
  const main = document.getElementById('main');
  let destroyCurrent = null;

  function route() {
    if (destroyCurrent) {
      try {
        destroyCurrent();
      } catch (e) {
        /* ignore teardown errors */
      }
    }
    destroyCurrent = null;
    const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    const name = parts[0] || 'home';
    const params = parts.slice(1);
    const started = Date.now();
    let result = null;
    if (name === 'level') {
      const lv = LV.getLevel(params[0]);
      const st = store.state;
      if (!lv) result = window.Views.learn(main);
      else if (!LV.stageUnlocked(lv.stage, st.levels, st.settings)) {
        clear(main);
        main.appendChild(h('div', { class: 'card' }, h('h1', null, '🔒 ' + lv.title), h('p', null, 'This level is in Stage ' + lv.stage + '. Complete at least half of the core levels in Stage ' + (lv.stage - 1) + ' to unlock it (or ask your teacher to unlock all levels).'), h('a', { class: 'btn', href: '#/learn' }, 'Back to the learning journey')));
      } else result = window.LevelRunner.run(main, lv).destroy;
    } else if (name === 'detective') result = detectiveView(main, params);
    else if (name === 'fix') result = fixView(main, params);
    else if (name === 'privacy') result = privacyView(main);
    else if (window.Views[name]) result = window.Views[name](main, params);
    else result = window.Views.home(main, params);
    destroyCurrent = () => {
      if (typeof result === 'function') result();
      if (['explore', 'insights'].indexOf(name) >= 0) store.addTime(name, Date.now() - started);
    };
    markNav();
    main.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }

  // The skip link must not change the hash (that would re-route to the home page).
  const skip = document.querySelector('.skip-link');
  if (skip)
    skip.addEventListener('click', (e) => {
      e.preventDefault();
      main.focus();
    });

  window.addEventListener('hashchange', route);
  buildHeader();
  route();
})();
