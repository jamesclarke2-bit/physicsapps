/**
 * Mastery dashboard: everything the session has recorded, shown so a
 * student can see their improvement and what to practise next.
 */
(function () {
  const { h, clear } = window.UI;
  const LV = window.Levels;
  const PG = window.Progress;
  const Mis = window.Misconceptions;

  const BADGE_ICONS = {
    'first-steps': '👣',
    'streak-5': '🔥',
    'streak-10': '⚡',
    'streak-20': '💎',
    'sign-sense': '±',
    detective: '🔍',
    'myth-buster': '🧩',
    artist: '✏️',
    pilot: '🏎',
    cruncher: '🔢',
    'three-stars': '⭐',
    'all-rounder': '🎯',
    'a-star': '🎓',
    calculus: '∫',
    comeback: '↩️',
  };

  function ring(pct, colour) {
    const r = 34;
    const C = 2 * Math.PI * r;
    return h('div', {
      html: `<svg viewBox="0 0 84 84" aria-hidden="true"><circle cx="42" cy="42" r="${r}" fill="none" stroke="#eef0f3" stroke-width="9"/><circle cx="42" cy="42" r="${r}" fill="none" stroke="${colour}" stroke-width="9" stroke-linecap="round" stroke-dasharray="${(C * pct) / 100} ${C}" transform="rotate(-90 42 42)"/><text x="42" y="47" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="800" font-size="17" fill="#1a1a1a">${pct}%</text></svg>`,
    });
  }

  function fmtTime(ms) {
    const m = Math.round(ms / 60000);
    return m < 1 ? '< 1 min' : m + ' min';
  }

  function sparkline(values) {
    if (values.length < 2) return h('p', { class: 'note' }, 'Answer a few questions and your accuracy trend will appear here.');
    const W = 600;
    const H = 120;
    const pts = values.map((v, i) => [10 + (i / (values.length - 1)) * (W - 20), H - 10 - v * (H - 20)]);
    const path = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    return h('div', {
      html: `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto" role="img" aria-label="Rolling accuracy over your last ${values.length} answers, from ${Math.round(values[0] * 100)}% to ${Math.round(values[values.length - 1] * 100)}%."><line x1="10" y1="${H - 10}" x2="${W - 10}" y2="${H - 10}" stroke="#ccc"/><line x1="10" y1="${10 + (H - 20) * 0.3}" x2="${W - 10}" y2="${10 + (H - 20) * 0.3}" stroke="#e9edf2" stroke-dasharray="4 4"/><text x="${W - 12}" y="${10 + (H - 20) * 0.3 - 4}" text-anchor="end" font-size="11" fill="#888" font-family="system-ui">70%</text><path d="${path}" fill="none" stroke="#2a6bd6" stroke-width="3" stroke-linejoin="round"/></svg>`,
    });
  }

  function suggestFor(skill, st) {
    const vis = LV.visibleLevels(st.settings);
    return vis.find((lv) => lv.skills.indexOf(skill) >= 0 && LV.stageUnlocked(lv.stage, st.levels, st.settings) && !(st.levels[lv.id] && st.levels[lv.id].stars === 3)) || null;
  }

  function render(container) {
    const store = window.App.store;
    const st = store.state;
    const rank = store.rank();
    const vis = LV.visibleLevels(st.settings);
    const completed = vis.filter((lv) => st.levels[lv.id] && st.levels[lv.id].completed).length;
    const stars = Object.keys(st.levels).reduce((s, k) => s + st.levels[k].stars, 0);
    const answers = st.history.length;
    const correct = st.history.reduce((s, x) => s + x.c, 0);
    const timeMs = Object.keys(st.activityTime).reduce((s, k) => s + st.activityTime[k], 0);
    clear(container);

    container.appendChild(h('h1', null, '📊 Your mastery dashboard'));
    container.appendChild(h('p', { class: 'subtitle' }, 'This session only, on this device. Nothing here is sent anywhere, and it is cleared automatically when you close the tab.'));

    container.appendChild(
      h(
        'div',
        { class: 'stat-row' },
        stat('XP', st.xp, rank.title + (rank.next ? ' · ' + (rank.next - st.xp) + ' to ' + rank.nextTitle : '')),
        stat('Levels completed', completed + ' / ' + vis.length, stars + ' ★ earned'),
        stat('Accuracy', answers ? Math.round((100 * correct) / answers) + '%' : '—', answers + ' answers'),
        stat('Best streak', st.bestStreak, 'current: ' + st.streak),
        stat('Time practising', fmtTime(timeMs), 'since ' + new Date(st.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
      )
    );

    // improvement over the session
    const roll = store.rollingAccuracy(10);
    const first = st.history.slice(0, 10);
    const last = st.history.slice(-10);
    const pct = (arr) => (arr.length ? Math.round((100 * arr.reduce((s, x) => s + x.c, 0)) / arr.length) : 0);
    container.appendChild(h('h2', null, 'Your improvement this session'));
    container.appendChild(h('div', { class: 'card' }, sparkline(roll), answers >= 20 ? h('p', null, 'First 10 answers: ', h('b', null, pct(first) + '%'), ' → last 10 answers: ', h('b', null, pct(last) + '%'), pct(last) > pct(first) ? ' — you are improving! 📈' : '.') : h('p', { class: 'note' }, 'Rolling accuracy over your last 10 answers.')));

    // mastery rings
    container.appendChild(h('h2', null, 'Topic mastery'));
    const grid = h('div', { class: 'mastery-grid' });
    Object.keys(LV.SKILLS).forEach((k) => {
      const p = Math.round(store.mastery(k) * 100);
      const s = st.skills[k];
      const colour = p >= 75 ? '#2b8a3e' : p >= 40 ? '#2a6bd6' : '#e67700';
      grid.appendChild(h('div', { class: 'mastery-item' }, ring(p, colour), h('div', { class: 'm-name' }, LV.SKILLS[k]), h('div', { class: 'm-sub' }, s ? s.correct + ' / ' + s.attempts + ' correct' : 'not tried yet', k === 'alevel' || k === 'maths' ? ' · optional' : '')));
    });
    container.appendChild(grid);

    // graph types
    const types = [
      ['displacement', 'Displacement–time', '#2a6bd6'],
      ['velocity', 'Velocity–time', '#d9480f'],
      ['acceleration', 'Acceleration–time', '#8e44ad'],
    ];
    container.appendChild(h('h2', null, 'Graph types'));
    container.appendChild(h('div', { class: 'grid-3' }, types.map(([k, label, col]) => {
      const m = store.mastery(k);
      const status = m >= 0.75 ? '✅ Mastered' : m >= 0.4 ? '🟦 Getting there' : st.skills[k] ? '🟧 Needs practice' : '⬜ Not started';
      return h('div', { class: 'stat' }, h('div', { class: 'label', style: { color: col } }, label + ' graphs'), h('div', { class: 'value', style: { fontSize: '1.15rem' } }, status));
    })));

    // what next
    const weak = store.weakestSkills(3);
    container.appendChild(h('h2', null, 'Areas needing improvement'));
    if (!weak.length) container.appendChild(h('p', { class: 'note' }, 'Play a few levels and your weakest areas will show up here, each with a level to practise.'));
    else
      container.appendChild(
        h(
          'div',
          { class: 'grid-3' },
          weak.map((k) => {
            const lv = suggestFor(k, st);
            return h('div', { class: 'card' }, h('b', null, LV.SKILLS[k]), h('p', { class: 'note' }, Math.round(store.mastery(k) * 100) + '% mastery'), lv ? h('a', { class: 'btn btn-small', href: '#/level/' + lv.id }, 'Practise: ' + lv.title) : null);
          })
        )
      );

    // misconceptions
    const mis = Object.keys(st.misconceptions).sort((a, b) => st.misconceptions[b] - st.misconceptions[a]);
    container.appendChild(h('h2', null, 'Misconceptions that tripped you up'));
    if (!mis.length) container.appendChild(h('p', { class: 'note' }, 'None recorded yet. When a wrong answer comes from a common misconception, it is logged here so you can target it.'));
    else {
      const maxC = st.misconceptions[mis[0]];
      container.appendChild(
        h(
          'div',
          { class: 'card bar-list' },
          mis.map((id) => {
            const m = Mis.getMisconception(id);
            return h('div', { class: 'bar-item' }, h('span', null, '“' + (m ? m.title : id) + '”'), h('div', { class: 'bar-track bad' }, h('span', { style: { width: (100 * st.misconceptions[id]) / maxC + '%' } })), h('span', null, st.misconceptions[id] + '× ', h('a', { href: '#/fix/' + id }, 'fix it →')));
          })
        )
      );
    }

    // badges
    container.appendChild(h('h2', null, 'Achievement badges'));
    container.appendChild(
      h(
        'div',
        { class: 'badge-grid' },
        Object.keys(PG.BADGES).map((id) => h('div', { class: 'badge' + (st.badges[id] ? '' : ' locked') }, h('div', { class: 'b-icon', 'aria-hidden': 'true' }, BADGE_ICONS[id] || '🏅'), h('b', null, PG.BADGES[id].title), h('div', { class: 'note' }, PG.BADGES[id].desc)))
      )
    );

    // personal bests
    const played = vis.filter((lv) => st.levels[lv.id]);
    container.appendChild(h('h2', null, 'Personal bests'));
    if (!played.length) container.appendChild(h('p', { class: 'note' }, 'Complete a level to set your first personal best.'));
    else
      container.appendChild(
        h(
          'div',
          { class: 'card', style: { overflowX: 'auto' } },
          h('table', { class: 'data-table' }, h('thead', null, h('tr', null, h('th', null, 'Level'), h('th', null, 'Stars'), h('th', null, 'Best accuracy'), h('th', null, 'Best time'), h('th', null, 'Plays'))), h('tbody', null, played.map((lv) => {
            const p = st.levels[lv.id];
            return h('tr', null, h('td', null, lv.id + ' ' + lv.title), h('td', null, window.UI.starsEl(p.stars)), h('td', null, Math.round(p.bestAccuracy * 100) + '%'), h('td', null, p.bestTimeMs ? Math.round(p.bestTimeMs / 1000) + ' s' : '—'), h('td', null, String(p.attempts)));
          })))
        )
      );

    const clearBtn = h('button', { type: 'button', class: 'btn btn-secondary' }, 'Clear my progress now');
    const confirmRow = h('div', { class: 'btn-row', hidden: true }, h('span', null, 'Clear all progress for this session? This can\u2019t be undone.'), h('button', { type: 'button', class: 'btn btn-small', onclick: () => (store.reset(), render(container)) }, 'Yes, clear it'), h('button', { type: 'button', class: 'btn btn-secondary btn-small', onclick: () => ((confirmRow.hidden = true), (clearBtn.hidden = false)) }, 'Cancel'));
    clearBtn.addEventListener('click', () => {
      clearBtn.hidden = true;
      confirmRow.hidden = false;
    });
    container.appendChild(h('div', { class: 'btn-row no-print' }, window.UI.canPrint ? h('button', { type: 'button', class: 'btn', onclick: () => window.print() }, '🖨 Print / save as PDF for my teacher') : null, clearBtn, confirmRow));
    return null;
  }

  function stat(label, value, sub) {
    return h('div', { class: 'stat' }, h('div', { class: 'label' }, label), h('div', { class: 'value' }, String(value)), h('div', { class: 'note' }, sub));
  }

  window.Views = window.Views || {};
  window.Views.dashboard = render;
})();
