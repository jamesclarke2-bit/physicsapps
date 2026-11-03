/**
 * Home: the free-play explorers come first. The six-stage lessons live on
 * their own page (#/learn); home only points to them with one slim banner.
 */
(function () {
  const { h, starsEl, tierTag, clear } = window.UI;
  const LV = window.Levels;

  // Original illustration: a car on a road leaving motion-map dots, with the three graphs it draws.
  const HERO_SVG = `
<svg viewBox="0 0 520 300" role="img" aria-label="A cartoon car speeding along a road, leaving evenly timed dots that spread out as it speeds up, above three small graphs: displacement curving upwards, velocity rising in a straight line, and acceleration flat and positive.">
  <defs>
    <linearGradient id="hsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eaf2fb"/><stop offset="1" stop-color="#ffffff"/></linearGradient>
  </defs>
  <rect x="0" y="0" width="520" height="150" rx="16" fill="url(#hsky)"/>
  <circle cx="455" cy="38" r="20" fill="#ffd43b"/>
  <rect x="0" y="112" width="520" height="16" fill="#cfd8e3"/>
  <g fill="#2a6bd6" opacity="0.6">
    <circle cx="30" cy="120" r="4"/><circle cx="38" cy="120" r="4"/><circle cx="54" cy="120" r="4"/><circle cx="80" cy="120" r="4"/>
    <circle cx="116" cy="120" r="4"/><circle cx="162" cy="120" r="4"/><circle cx="218" cy="120" r="4"/><circle cx="284" cy="120" r="4"/>
  </g>
  <g class="hero-car" transform="translate(330 112)">
    <rect x="-34" y="-28" width="68" height="18" rx="8" fill="#e03131"/>
    <rect x="-18" y="-43" width="34" height="17" rx="8" fill="#c92a2a"/>
    <rect x="-13" y="-39" width="12" height="10" rx="2" fill="#d0ebff"/>
    <rect x="2" y="-39" width="12" height="10" rx="2" fill="#d0ebff"/>
    <circle cx="-20" cy="-8" r="8" fill="#2b2b2b"/><circle cx="20" cy="-8" r="8" fill="#2b2b2b"/>
    <path d="M -52 -22 h -26 M -50 -14 h -18 M -54 -30 h -14" stroke="#9aa4b1" stroke-width="3" stroke-linecap="round"/>
  </g>
  <g transform="translate(398 72)" font-family="system-ui, sans-serif" font-weight="700" font-size="13">
    <line x1="0" y1="0" x2="58" y2="0" stroke="#d9480f" stroke-width="4" stroke-linecap="round"/><path d="M 58 -6 L 68 0 L 58 6 Z" fill="#d9480f"/><text x="72" y="5" fill="#d9480f">v</text>
    <line x1="0" y1="18" x2="30" y2="18" stroke="#8e44ad" stroke-width="4" stroke-linecap="round"/><path d="M 30 12 L 40 18 L 30 24 Z" fill="#8e44ad"/><text x="44" y="23" fill="#8e44ad">a</text>
  </g>
  <g font-family="system-ui, sans-serif" font-size="12" font-weight="700">
    <g transform="translate(10 170)">
      <rect width="160" height="120" rx="12" fill="#fff" stroke="#e0e0e0"/>
      <path d="M 20 100 H 148 M 20 100 V 16" stroke="#333" stroke-width="1.5"/>
      <path d="M 20 100 Q 90 98 145 22" fill="none" stroke="#2a6bd6" stroke-width="4" stroke-linecap="round"/>
      <text x="26" y="24" fill="#2a6bd6">s</text><text x="130" y="114" fill="#555">t</text>
    </g>
    <g transform="translate(180 170)">
      <rect width="160" height="120" rx="12" fill="#fff" stroke="#e0e0e0"/>
      <path d="M 20 100 H 148 M 20 100 V 16" stroke="#333" stroke-width="1.5"/>
      <path d="M 20 100 L 145 26" fill="none" stroke="#d9480f" stroke-width="4" stroke-linecap="round"/>
      <text x="26" y="24" fill="#d9480f">v</text><text x="130" y="114" fill="#555">t</text>
    </g>
    <g transform="translate(350 170)">
      <rect width="160" height="120" rx="12" fill="#fff" stroke="#e0e0e0"/>
      <path d="M 20 100 H 148 M 20 100 V 16" stroke="#333" stroke-width="1.5"/>
      <path d="M 20 56 H 145" fill="none" stroke="#8e44ad" stroke-width="4" stroke-linecap="round"/>
      <text x="26" y="24" fill="#8e44ad">a</text><text x="130" y="114" fill="#555">t</text>
    </g>
  </g>
</svg>`;

  function exploreCard(href, title, text, big) {
    return h('a', { href, class: big ? 'explore-big' : null }, h('div', { class: 'explore-card' }, h('strong', null, title), h('p', { class: 'note', style: { margin: '0.3rem 0 0' } }, text)));
  }

  function render(container) {
    const st = window.App.store.state;
    const next = LV.nextLevel(st.levels, st.settings);
    const started = Object.keys(st.levels).length > 0;
    clear(container);

    const hero = h('section', { class: 'hero' });
    hero.appendChild(
      h(
        'div',
        null,
        h('h1', null, 'Explore freely'),
        h('p', { class: 'subtitle' }, 'Pick any motion and watch its displacement, velocity and acceleration graphs draw themselves.'),
        h('div', { class: 'btn-row' }, h('a', { class: 'btn', href: '#/explore/lab' }, '🧪 Open the Motion Lab →'), h('a', { class: 'btn btn-secondary', href: '#/drag' }, '🪂 Air Resistance Lab'))
      )
    );
    hero.appendChild(h('div', { html: HERO_SVG }));
    container.appendChild(hero);

    container.appendChild(
      h(
        'div',
        { class: 'grid-3 explore-grid' },
        exploreCard('#/explore/gradient', '📐 Gradient Explorer', 'Slide a point along a curve and watch the tangent build the next graph.'),
        exploreCard('#/explore/area', '▧ Area Explorer', 'Shade a region under a graph and see area become displacement.'),
        exploreCard('#/insights', '💡 Insight panels', 'Why is velocity the gradient? Visual answers.'),
        exploreCard('#/fix', '🧩 Misconception gym', 'Practise the ideas that trip people up most.')
      )
    );

    container.appendChild(
      h(
        'section',
        { class: 'mode-row' },
        h('h2', null, 'Game modes'),
        h(
          'div',
          { class: 'btn-row' },
          h('a', { class: 'btn btn-secondary', href: '#/detective' }, '🔍 Graph Detective'),
          h('a', { class: 'btn btn-secondary', href: '#/fix/all' }, '🧩 Misconception mode'),
          h('a', { class: 'btn btn-secondary', href: '#/level/1-3' }, '± Signs starter'),
          h('a', { class: 'btn btn-secondary', href: '#/drag/quiz' }, '🪂 Air resistance: predict first'),
          h('a', { class: 'btn btn-secondary', href: '#/level/6-6' }, '◭ Reconstruction lab')
        )
      )
    );

    container.appendChild(
      h(
        'section',
        { class: 'journey-banner' },
        h('div', null, h('strong', null, 'Want to be taken through it step by step?'), h('p', { class: 'note', style: { margin: '0.2rem 0 0' } }, 'The learning journey has six stages, from signs to full journeys, with stars to earn.')),
        h('div', { class: 'btn-row' }, h('a', { class: 'btn', href: next && started ? '#/level/' + next.id : '#/learn' }, next && started ? 'Continue: ' + next.title + ' →' : 'Learning journey →'), h('a', { class: 'btn btn-secondary', href: '#/learn' }, 'All stages'))
      )
    );
    container.appendChild(h('p', { class: 'note' }, 'No sign-in. Progress stays on this device and is wiped when you close this tab. ', h('a', { href: '#/privacy' }, 'Privacy')));
    return null;
  }

  window.Views = window.Views || {};
  window.Views.home = render;
})();
