/**
 * Player and MotionViewer.
 *
 * Player: a shared clock with play/pause, rewind, step back/forward, slow
 * motion, variable speed and a scrubber. Frame-rate independent and capped,
 * so a backgrounded tab doesn't jump.
 *
 * MotionViewer: the standard "everything at once" layout — animated stage
 * plus displacement, velocity and acceleration graphs, all driven by one
 * Player, with show/hide toggles and live signed readouts.
 */
(function () {
  const { h } = window.UI;
  const Fmt = window.Fmt;

  function Player(duration, onTick, options) {
    const opts = Object.assign({ autoplay: false, speed: 1 }, options || {});
    let t = 0;
    let playing = false;
    let speed = opts.speed;
    let last = null;
    let raf = null;
    const listeners = [onTick];

    const playBtn = h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Play' }, '▶');
    const rewindBtn = h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Rewind to start', title: 'Rewind' }, '⏮');
    const backBtn = h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Step back', title: 'Step back' }, '◀');
    const fwdBtn = h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Step forward', title: 'Step forward' }, '▶|');
    const slowBtn = h('button', { type: 'button', class: 'icon-btn', 'aria-pressed': 'false', 'aria-label': 'Slow motion', title: 'Slow motion' }, '🐢');
    const scrub = h('input', { type: 'range', min: '0', max: String(duration), step: 'any', value: '0', 'aria-label': 'Time' });
    const timeLbl = h('span', { class: 'time', 'aria-live': 'off' }, '0.0 s');
    const speeds = opts.speeds || [0.25, 0.5, 1, 2, 4];
    const speedSel = h('select', { 'aria-label': 'Playback speed' }, speeds.map((x) => h('option', { value: String(x), selected: x === speed ? true : null }, x + '×')));
    const el = h('div', { class: 'player' }, rewindBtn, backBtn, playBtn, fwdBtn, scrub, timeLbl, speedSel, slowBtn);
    const stepSize = Math.max(duration / 60, 0.05);

    function emit() {
      scrub.value = String(t);
      timeLbl.textContent = t.toFixed(1) + ' s';
      listeners.forEach((fn) => fn && fn(t));
    }
    function frame(now) {
      if (!playing) return;
      const dt = last === null ? 0 : Math.min(Math.max(now - last, 0), 100) / 1000;
      last = now;
      t += dt * speed;
      if (t >= duration) {
        t = duration;
        emit();
        pause();
        return;
      }
      emit();
      raf = requestAnimationFrame(frame);
    }
    function play() {
      if (t >= duration - 1e-6) t = 0;
      playing = true;
      last = null;
      playBtn.textContent = '⏸';
      playBtn.setAttribute('aria-label', 'Pause');
      raf = requestAnimationFrame(frame);
    }
    function pause() {
      playing = false;
      if (raf) cancelAnimationFrame(raf);
      playBtn.textContent = '▶';
      playBtn.setAttribute('aria-label', 'Play');
    }
    function seek(x) {
      t = Math.max(0, Math.min(duration, x));
      emit();
    }
    playBtn.addEventListener('click', () => (playing ? pause() : play()));
    rewindBtn.addEventListener('click', () => {
      pause();
      seek(0);
    });
    backBtn.addEventListener('click', () => {
      pause();
      seek(t - stepSize);
    });
    fwdBtn.addEventListener('click', () => {
      pause();
      seek(t + stepSize);
    });
    scrub.addEventListener('input', () => {
      pause();
      seek(Number(scrub.value));
    });
    speedSel.addEventListener('change', () => {
      speed = Number(speedSel.value);
      slowBtn.setAttribute('aria-pressed', speed < opts.speed ? 'true' : 'false');
    });
    slowBtn.addEventListener('click', () => {
      const slow = slowBtn.getAttribute('aria-pressed') !== 'true';
      speed = slow ? speeds[0] : opts.speed;
      speedSel.value = String(speed);
      slowBtn.setAttribute('aria-pressed', slow ? 'true' : 'false');
    });

    if (opts.autoplay && !window.UI.prefersReducedMotion()) setTimeout(play, 300);

    return {
      el,
      play,
      pause,
      seek,
      get t() {
        return t;
      },
      get playing() {
        return playing;
      },
      onTick: (fn) => listeners.push(fn),
      destroy: pause,
    };
  }

  /**
   * MotionViewer(scenario, options) → { el, player, graphs, stage, destroy }
   * options:
   *   graphs: ['s','v','a']            which graphs to build
   *   visible: { s, v, a, stage }       initially shown
   *   reveal: 'progressive' | 'full'    draw graphs up to the current time, or whole
   *   toggles: true                     show/hide checkboxes
   *   readouts: true                    live signed values
   *   autoplay: false
   *   decorate(q, t) → extra render state for graph q
   */
  function MotionViewer(scenario, options) {
    const opts = Object.assign({ graphs: ['s', 'v', 'a'], visible: { s: true, v: true, a: true, stage: true }, reveal: 'progressive', toggles: true, readouts: true, autoplay: false, stage: true }, options || {});
    const motion = scenario.motion;
    const MM = window.MotionModel;
    const visible = Object.assign({ s: true, v: true, a: true, stage: true }, opts.visible);

    const stageCanvas = h('canvas');
    const stagePanel = h('div', { class: 'stage-panel' }, h('h3', null, h('span', null, scenario.title), h('span', { class: 'note' }, 'positive = ' + scenario.pos)), stageCanvas);
    const stage = opts.stage ? window.MotionStage.create(stageCanvas, scenario, opts.stageOptions) : null;

    const graphs = {};
    const graphPanels = {};
    const graphWrap = h('div', { class: 'viewer-graphs' });
    opts.graphs.forEach((q) => {
      const c = h('canvas');
      const L = window.GraphCanvas.LABELS[q];
      const panel = h('div', { class: 'graph-panel ' + q }, h('h3', null, L.title + ' graph'), c);
      graphs[q] = window.GraphCanvas.create(c, { quantity: q, cssHeight: opts.graphHeight || 190, schematic: opts.schematic });
      graphs[q].setMotion(motion);
      graphPanels[q] = panel;
      graphWrap.appendChild(panel);
      if (motion.idealised && q === 'a') panel.appendChild(h('p', { class: 'note', style: { margin: '0.2rem 0 0' } }, 'Idealised: the velocity changes instantly at each corner, which would need an enormous acceleration for an instant. The graph shows zero in between.'));
    });

    const readout = h('div', { class: 'readouts', 'aria-live': 'off' });
    const toggleRow = h('div', { class: 'toggle-row' });
    const el = h('div', { class: 'viewer' }, opts.stage ? stagePanel : null);
    const player = Player(motion.duration, update, { autoplay: opts.autoplay });
    el.appendChild(player.el);
    if (opts.readouts) el.appendChild(readout);
    if (opts.toggles) el.appendChild(toggleRow);
    el.appendChild(graphWrap);

    function applyVisibility() {
      if (opts.stage) stagePanel.hidden = !visible.stage;
      opts.graphs.forEach((q) => (graphPanels[q].hidden = !visible[q]));
    }
    if (opts.toggles) {
      const items = [['stage', 'Animation', '#1a1a1a']].concat(opts.graphs.map((q) => [q, window.GraphCanvas.LABELS[q].title, window.GraphCanvas.COLORS[q]]));
      if (!opts.stage) items.shift();
      items.forEach(([key, lbl, col]) => {
        const cb = h('input', { type: 'checkbox', checked: visible[key] ? true : null });
        cb.addEventListener('change', () => {
          visible[key] = cb.checked;
          applyVisibility();
          update(player.t);
        });
        toggleRow.appendChild(h('label', null, cb, h('span', { class: 'legend-chip', style: { background: col } }), lbl));
      });
    }
    applyVisibility();

    function update(t) {
      const st = MM.stateAt(motion, t);
      if (stage && visible.stage) stage.render(t, opts.stageExtra ? opts.stageExtra(t) : {});
      opts.graphs.forEach((q) => {
        if (!visible[q]) return;
        const base = { cursor: t, upTo: opts.reveal === 'progressive' ? t : null };
        graphs[q].render(Object.assign(base, opts.decorate ? opts.decorate(q, t) : {}));
      });
      if (opts.readouts) {
        readout.innerHTML = '';
        readout.appendChild(h('span', { class: 'r-s' }, 's = ', h('b', null, Fmt.signedUnit(st.s, 'm', 1))));
        readout.appendChild(h('span', { class: 'r-v' }, 'v = ', h('b', null, Fmt.signedUnit(st.v, 'm/s', 1))));
        readout.appendChild(h('span', { class: 'r-a' }, 'a = ', h('b', null, Fmt.signedUnit(st.a, 'm/s²', 1))));
        readout.appendChild(h('span', null, 'speed = ', h('b', null, Fmt.unitStr(Math.abs(st.v), 'm/s', 1))));
        const ph = MM.phases(motion).find((p) => t >= p.t0 - 1e-9 && t <= p.t1 + 1e-9);
        if (ph) readout.appendChild(h('span', { class: 'note' }, '→ ' + MM.describePhase(ph, scenario.pos, scenario.neg)));
      }
      if (opts.onTick) opts.onTick(t, st);
    }
    requestAnimationFrame(() => update(0));

    return {
      el,
      player,
      graphs,
      stage,
      update: () => update(player.t),
      setVisible(key, on) {
        visible[key] = on;
        applyVisibility();
        update(player.t);
      },
      destroy() {
        player.destroy();
        Object.keys(graphs).forEach((k) => graphs[k].destroy());
        if (stage) stage.destroy();
      },
    };
  }

  window.Viewer = { Player, MotionViewer };
})();
