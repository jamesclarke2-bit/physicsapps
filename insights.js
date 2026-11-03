/**
 * Mathematical insight panels: short, visual answers to the "why?"
 * questions behind every motion-graph rule. Each panel has its own small
 * interactive graph, and the wording changes with the maths mode.
 */
(function () {
  const { h, clear } = window.UI;
  const MM = window.MotionModel;
  const Fmt = window.Fmt;
  const Scn = window.Scenarios;

  function M(mode, std, adv, ext) {
    return mode === 'extension' ? ext : mode === 'advanced' ? adv : std;
  }

  function chordPanel(sc, q, mode, parts) {
    const c = h('canvas');
    const g = window.GraphCanvas.create(c, { quantity: q, cssHeight: 220 });
    g.setMotion(sc.motion);
    parts.push(g);
    const T = sc.motion.duration;
    let t0 = T * 0.3;
    let w = T * 0.4;
    const out = h('p');
    const a = h('input', { type: 'range', min: '0', max: String(T), step: 'any', value: String(t0), 'aria-label': 'Start of the time window' });
    const b = h('input', { type: 'range', min: String(T / 200), max: String(T * 0.6), step: 'any', value: String(w), 'aria-label': 'Width of the time window' });
    const lower = q === 's' ? 'velocity' : 'acceleration';
    const unit = q === 's' ? 'm/s' : 'm/s²';
    function draw() {
      const t1 = Math.min(T, t0 + w);
      const y0 = MM.stateAt(sc.motion, t0)[q];
      const y1 = MM.stateAt(sc.motion, t1)[q];
      g.render({ chord: { t0, t1 }, cursor: t0 });
      const avg = (y1 - y0) / Math.max(t1 - t0, 1e-9);
      const inst = MM.stateAt(sc.motion, t0)[q === 's' ? 'v' : 'a'];
      out.textContent =
        'Over this window: Δ' + q + ' = ' + Fmt.signed(y1 - y0, 2) + ', Δt = ' + Fmt.num(t1 - t0, 2) + ' s, so Δ' + q + '/Δt = ' + Fmt.signed(avg, 2) + ' ' + unit + ' — the AVERAGE ' + lower + '. Narrow the window and it approaches the ' + lower + ' at t = ' + Fmt.num(t0, 2) + ' s: ' + Fmt.signed(inst, 2) + ' ' + unit + '.';
    }
    a.addEventListener('input', () => ((t0 = Number(a.value)), draw()));
    b.addEventListener('input', () => ((w = Number(b.value)), draw()));
    requestAnimationFrame(draw);
    return h('div', { class: 'graph-panel ' + q }, c, h('label', { class: 'setting' }, h('span', null, 'Window start'), a), h('label', { class: 'setting' }, h('span', null, 'Window width — shrink it'), b), out);
  }

  function stripsPanel(mode, parts) {
    const sc = Scn.getScenario('car-trip');
    const c = h('canvas');
    const g = window.GraphCanvas.create(c, { quantity: 'v', cssHeight: 220 });
    g.setMotion(sc.motion);
    parts.push(g);
    const T = sc.motion.duration;
    let n = 4;
    const out = h('p');
    const sl = h('input', { type: 'range', min: '1', max: '80', step: '1', value: '4', 'aria-label': 'Number of strips' });
    function draw() {
      const w = T / n;
      const f = (t) => MM.stateAt(sc.motion, Math.min(T, Math.floor(t / w) * w)).v;
      const breaks = [];
      let sum = 0;
      for (let k = 0; k < n; k++) {
        breaks.push(k * w);
        sum += MM.stateAt(sc.motion, k * w).v * w;
      }
      g.render({ shade: { t0: 0, t1: T }, overlays: [{ fn: f, breaks, color: '#173d75', width: 1.5 }] });
      out.textContent = n + ' strip' + (n > 1 ? 's' : '') + ': each is (velocity × time) = a little displacement. Total ≈ ' + Fmt.num(sum, 1) + ' m. Exact area = ' + Fmt.num(MM.displacementBetween(sc.motion, 0, T), 1) + ' m.';
    }
    sl.addEventListener('input', () => ((n = Number(sl.value)), draw()));
    requestAnimationFrame(draw);
    return h('div', { class: 'graph-panel v' }, c, h('label', { class: 'setting' }, h('span', null, 'Number of strips'), sl), out);
  }

  function signsGrid(parts) {
    const slot = h('div');
    let viewer = null;
    const cases = [
      { v: '+', a: '+', label: 'v +, a + → speeding up', id: 'car-trip' },
      { v: '+', a: '−', label: 'v +, a − → slowing down', id: 'cyclist-brakes' },
      { v: '−', a: '−', label: 'v −, a − → speeding up!', id: 'reverse-speeding-up' },
      { v: '−', a: '+', label: 'v −, a + → slowing down!', id: 'reverse-braking' },
    ];
    const grid = h('div', { class: 'choice-grid' });
    cases.forEach((cs) => {
      const b = h('button', { type: 'button', class: 'choice' }, h('b', null, cs.label), h('div', { class: 'note' }, Scn.getScenario(cs.id).title));
      b.addEventListener('click', () => {
        if (viewer) viewer.destroy();
        clear(slot);
        viewer = window.Viewer.MotionViewer(Scn.getScenario(cs.id), { graphs: ['v', 'a'], autoplay: true, graphHeight: 150 });
        parts.push(viewer);
        slot.appendChild(viewer.el);
      });
      grid.appendChild(b);
    });
    return h('div', null, grid, slot);
  }

  function chainDiagram(mode) {
    const down = M(mode, 'gradient', 'rate of change', 'd/dt');
    const up = M(mode, 'area under', 'accumulate', '∫ dt');
    return h('div', {
      html: `<svg viewBox="0 0 520 170" role="img" aria-label="Displacement, velocity and acceleration in a row. Taking the ${down} moves right; taking the ${up} moves left." style="width:100%;max-width:560px;height:auto">
      <g font-family="system-ui, sans-serif" font-weight="800" font-size="20" text-anchor="middle">
        <rect x="10" y="50" width="120" height="60" rx="14" fill="#e7f0ff" stroke="#2a6bd6" stroke-width="2"/><text x="70" y="88" fill="#2a6bd6">s</text>
        <rect x="200" y="50" width="120" height="60" rx="14" fill="#fff0e6" stroke="#d9480f" stroke-width="2"/><text x="260" y="88" fill="#d9480f">v</text>
        <rect x="390" y="50" width="120" height="60" rx="14" fill="#f5ebfa" stroke="#8e44ad" stroke-width="2"/><text x="450" y="88" fill="#8e44ad">a</text>
      </g>
      <g stroke="#333" stroke-width="2.5" fill="#333">
        <line x1="135" y1="62" x2="190" y2="62"/><path d="M 190 56 L 198 62 L 190 68 Z"/>
        <line x1="325" y1="62" x2="380" y2="62"/><path d="M 380 56 L 388 62 L 380 68 Z"/>
        <line x1="195" y1="100" x2="140" y2="100"/><path d="M 140 94 L 132 100 L 140 106 Z"/>
        <line x1="385" y1="100" x2="330" y2="100"/><path d="M 330 94 L 322 100 L 330 106 Z"/>
      </g>
      <g font-family="system-ui, sans-serif" font-size="13" text-anchor="middle" fill="#333">
        <text x="165" y="44">${down}</text><text x="355" y="44">${down}</text>
        <text x="165" y="128">${up}</text><text x="355" y="128">${up}</text>
      </g></svg>`,
    });
  }

  function render(container) {
    const mode = window.App.store.state.settings.mathMode;
    const parts = [];
    clear(container);
    container.appendChild(h('h1', null, '💡 Insight panels'));
    container.appendChild(h('p', { class: 'subtitle' }, 'Open any panel. Each one shows WHY a rule is true, not just what it says. Current maths mode: ', h('b', null, { standard: 'Standard Physics', advanced: 'Advanced Physics', extension: 'Mathematical Extension' }[mode]), ' (change it at the top of the page).'));

    const panels = [
      {
        title: 'Why is velocity the gradient of a displacement–time graph?',
        build: () => [
          h('p', null, M(mode, 'Velocity means metres gained per second. On an s–t graph, the rise is metres gained and the run is seconds taken — so rise ÷ run is metres per second: the velocity.', 'Velocity is the RATE at which displacement changes. The gradient of a graph measures exactly that: how fast the vertical quantity changes as time passes.', 'Δs/Δt over a short window is the average velocity. As Δt → 0, the chord becomes the tangent and the ratio becomes the derivative: v = ds/dt.')),
          mode === 'extension' ? h('p', null, h('span', { class: 'maths-line' }, 'v = lim', h('sub', null, 'Δt→0'), ' Δs/Δt = ds/dt')) : null,
          chordPanel(Scn.getScenario('ball-thrown-up'), 's', mode, parts),
        ],
      },
      {
        title: 'Why is displacement the area under a velocity–time graph?',
        build: () => [
          h('p', null, M(mode, 'At constant velocity, displacement = velocity × time — exactly the area of a rectangle on the v–t graph. When velocity changes, chop the time into thin strips: each strip is nearly a rectangle, so the total area is still the displacement.', 'Each thin strip is (rate of change) × (short time) = a small change in displacement. The area ACCUMULATES all those small changes.', 'Adding v·Δt over thinner and thinner strips is the definition of the integral: s = ∫ v dt. Area below the axis has v < 0, so it subtracts.')),
          mode === 'extension' ? h('p', null, h('span', { class: 'maths-line' }, 'Δs = Σ v Δt → ∫ v dt')) : null,
          stripsPanel(mode, parts),
        ],
      },
      {
        title: 'Why is acceleration the gradient of a velocity–time graph?',
        build: () => [
          h('p', null, M(mode, 'Acceleration means m/s gained per second. On a v–t graph the rise is m/s gained and the run is seconds — rise ÷ run is the acceleration. It is the SAME idea as the s–t graph, one step down.', 'Acceleration is the rate at which VELOCITY changes, so it is the gradient of the v–t graph.', 'a = dv/dt = d²s/dt²: the gradient of the gradient. On an s–t graph, acceleration shows up as curvature.')),
          chordPanel(Scn.getScenario('sprinter'), 'v', mode, parts),
        ],
      },
      {
        title: 'Why can acceleration be negative while the speed increases?',
        build: () => [
          h('p', null, 'A minus sign on acceleration only says which WAY the acceleration points. Speeding up or slowing down depends on how the acceleration lines up with the velocity: same direction → speeding up; opposite → slowing down. Tap each case to watch it.'),
          signsGrid(parts),
        ],
      },
      {
        title: 'How are differentiation and integration related to motion graphs?',
        tier: 'extension',
        build: () => [
          h('p', null, M(mode, 'Moving right along the chain, each graph’s gradient gives the next graph. Moving left, the area under each graph gives the change in the one before it. That two-way relationship is the whole of this topic in one picture.', 'Rates of change go one way along the chain; accumulation goes back the other way.', 'Differentiation (d/dt) goes s → v → a; integration (∫ dt) undoes it, a → v → s, up to a starting value — which is why every reconstruction needs an initial velocity or position.')),
          chainDiagram(mode),
          h('p', { class: 'note' }, 'See it live in the Gradient Explorer and Area Explorer.'),
        ],
      },
    ];
    panels.forEach((p) => {
      const d = h('details', { class: 'insight' }, h('summary', null, p.title, ' ', p.tier ? window.UI.tierTag(p.tier) : null));
      let built = false;
      d.addEventListener('toggle', () => {
        if (d.open && !built) {
          built = true;
          d.appendChild(h('div', { style: { paddingBottom: '0.8rem' } }, p.build()));
        }
      });
      container.appendChild(d);
    });
    return () => parts.forEach((p) => p.destroy());
  }

  window.Views = window.Views || {};
  window.Views.insights = render;
})();
