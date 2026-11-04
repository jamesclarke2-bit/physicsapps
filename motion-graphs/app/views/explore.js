/**
 * Free-play explorers:
 *   Motion Lab        – any library journey, or build your own (equation or stages)
 *   Gradient Explorer – tangent and gradient at a moving point; the next graph grows from it
 *   Area Explorer     – shade a window, predict, reveal; running total on the next graph
 *
 * All three respond to the maths mode: Standard (gradients and areas),
 * Advanced (rates of change and accumulation) and Mathematical Extension
 * (limits, d/dt and ∫).
 */
(function () {
  const { h, clear, feedback } = window.UI;
  const MM = window.MotionModel;
  const Fmt = window.Fmt;
  const Scn = window.Scenarios;

  const TIER_NAMES = ['', 'Beginner', 'Intermediate', 'Advanced', 'Expert', 'Mastery'];

  function scenarioSelect(selectedId, filter) {
    const sel = h('select', { 'aria-label': 'Choose a journey' });
    for (let tier = 1; tier <= 5; tier++) {
      const group = h('optgroup', { label: TIER_NAMES[tier] });
      Scn.listScenarios(tier)
        .filter(filter || (() => true))
        .forEach((sc) => group.appendChild(h('option', { value: sc.id, selected: sc.id === selectedId ? true : null }, sc.title)));
      if (group.children.length) sel.appendChild(group);
    }
    return sel;
  }

  /**
   * A small "what is actually happening" panel for the explorers: the journey's
   * story in one or two sentences, and the animated object, driven by whatever
   * time the explorer is currently looking at.
   */
  function journeyPanel() {
    const story = h('p', { class: 'scenario-story', style: { margin: '0 0 0.5rem' } });
    const slot = h('div', { class: 'stage-panel' });
    let stage = null;
    return {
      el: h('div', { class: 'card journey-panel' }, story, slot),
      set(sc) {
        if (stage) stage.destroy();
        clear(slot);
        const c = h('canvas');
        slot.appendChild(c);
        stage = window.MotionStage.create(c, sc, { cssHeight: sc.orientation === 'vertical' ? 210 : 150 });
        story.textContent = '';
        story.appendChild(h('b', null, sc.title + '. '));
        const text = sc.story || '';
        story.appendChild(document.createTextNode(text + (/positive/i.test(text) ? '' : ' Positive is ' + sc.pos + '.')));
      },
      render(t, extra) {
        if (stage) stage.render(t, extra);
      },
      destroy() {
        if (stage) stage.destroy();
      },
    };
  }

  // ------------------------------------------------------------------ Motion Lab
  function lab(container) {
    const parts = [];
    let viewer = null;
    const viewSlot = h('div');
    const storySlot = h('p', { class: 'scenario-story' });
    const modeSel = h('div', { class: 'segmented', role: 'group', 'aria-label': 'Source of the motion' });
    const controls = h('div');
    let mode = 'library';

    function show(sc) {
      if (viewer) viewer.destroy();
      clear(viewSlot);
      viewer = window.Viewer.MotionViewer(sc, { autoplay: true, graphHeight: 200 });
      parts.length = 0;
      parts.push(viewer);
      viewSlot.appendChild(viewer.el);
      storySlot.textContent = '';
      storySlot.appendChild(h('b', null, sc.title + '. '));
      storySlot.appendChild(document.createTextNode((sc.story || '') + ' Positive is ' + sc.pos + '.'));
    }

    function libraryControls() {
      clear(controls);
      const sel = scenarioSelect('car-trip');
      sel.addEventListener('change', () => show(Scn.getScenario(sel.value)));
      controls.appendChild(h('label', { class: 'setting' }, h('span', null, 'Journey'), sel));
      show(Scn.getScenario(sel.value));
    }

    function slider(label, min, max, step, value, unit, onInput) {
      const out = h('b');
      const inp = h('input', { type: 'range', min: String(min), max: String(max), step: String(step), value: String(value) });
      const upd = () => {
        out.textContent = Fmt.signedUnit(Number(inp.value), unit, 2);
        onInput(Number(inp.value));
      };
      inp.addEventListener('input', upd);
      out.textContent = Fmt.signedUnit(value, unit, 2);
      return h('label', { class: 'setting' }, h('span', null, label, ' = ', out), inp);
    }

    function equationControls() {
      clear(controls);
      const p = { s0: 0, u: 4, a: -1, T: 8, vertical: false };
      const eqLine = h('div', { class: 'maths-line' });
      const build = () => {
        const frame = p.vertical ? Scn.VERTICAL : Scn.HORIZONTAL;
        const motion = MM.createMotion({ s0: p.s0, v0: p.u, segments: [{ duration: p.T, a: p.a }] });
        eqLine.textContent = window.Activities.link.eqText('s', p.s0, p.u, p.a) + '      v = u + at = ' + window.Activities.link.eqText('v', 0, p.u, p.a).slice(4);
        show(Object.assign({}, frame, { id: 'lab-eq', title: 'Your equation', object: p.vertical ? 'ball' : 'trolley', story: 'Uniform acceleration from your equation.', motion }));
      };
      let timer = null;
      const later = () => {
        clearTimeout(timer);
        timer = setTimeout(build, 120);
      };
      const vert = h('input', { type: 'checkbox' });
      vert.addEventListener('change', () => {
        p.vertical = vert.checked;
        build();
      });
      controls.appendChild(
        h(
          'div',
          { class: 'grid-2' },
          slider('Starting displacement s₀', -20, 20, 1, p.s0, 'm', (v) => ((p.s0 = v), later())),
          slider('Initial velocity u', -10, 10, 0.5, p.u, 'm/s', (v) => ((p.u = v), later())),
          slider('Acceleration a', -4, 4, 0.25, p.a, 'm/s²', (v) => ((p.a = v), later())),
          slider('Duration', 2, 20, 1, p.T, 's', (v) => ((p.T = v), later()))
        )
      );
      controls.appendChild(h('label', { class: 'toggle-row' }, vert, 'Vertical motion (up is positive)'));
      controls.appendChild(eqLine);
      build();
    }

    function stagesControls() {
      clear(controls);
      const rows = [
        { duration: 3, a: 2, jerk: 0 },
        { duration: 3, a: 0, jerk: 0 },
        { duration: 4, a: -3, jerk: 0 },
      ];
      const v0In = h('input', { type: 'number', step: '0.5', value: '0', style: { width: '6rem' } });
      const table = h('div');
      const err = h('p', { class: 'note' });
      const showJerk = window.App.store.state.settings.course !== 'gcse';
      function rebuild() {
        clear(table);
        rows.forEach((r, i) => {
          const d = h('input', { type: 'number', min: '0.5', step: '0.5', value: String(r.duration), style: { width: '5rem' }, 'aria-label': 'Stage ' + (i + 1) + ' duration' });
          const a = h('input', { type: 'number', step: '0.25', value: String(r.a), style: { width: '5rem' }, 'aria-label': 'Stage ' + (i + 1) + ' acceleration' });
          const j = h('input', { type: 'number', step: '0.1', value: String(r.jerk), style: { width: '5rem' }, 'aria-label': 'Stage ' + (i + 1) + ' rate of change of acceleration' });
          const rm = h('button', { type: 'button', class: 'btn btn-secondary btn-small', 'aria-label': 'Remove stage ' + (i + 1) }, '×');
          d.addEventListener('change', () => ((r.duration = Math.max(0.5, Number(d.value) || 0.5)), go()));
          a.addEventListener('change', () => ((r.a = Number(a.value) || 0), go()));
          j.addEventListener('change', () => ((r.jerk = Number(j.value) || 0), go()));
          rm.addEventListener('click', () => {
            if (rows.length > 1) rows.splice(i, 1);
            rebuild();
            go();
          });
          table.appendChild(h('div', { class: 'toggle-row', style: { marginBottom: '0.4rem' } }, h('b', null, 'Stage ' + (i + 1)), h('label', null, 'lasts ', d, ' s'), h('label', null, 'a = ', a, ' m/s²'), showJerk ? h('label', null, 'changing by ', j, ' m/s² each second ', window.UI.tierTag('alevel')) : null, rm));
        });
      }
      function go() {
        try {
          const motion = MM.createMotion({ s0: 0, v0: Number(v0In.value) || 0, segments: rows.map((r) => ({ duration: r.duration, a: r.a, jerk: r.jerk })) });
          err.textContent = '';
          show(Object.assign({}, Scn.HORIZONTAL, { id: 'lab-stages', title: 'Your journey', object: 'car', story: 'Built from your stages.', motion }));
        } catch (e) {
          err.textContent = 'Each stage needs a positive duration.';
        }
      }
      const add = h('button', { type: 'button', class: 'btn btn-secondary btn-small' }, '+ Add a stage');
      add.addEventListener('click', () => {
        rows.push({ duration: 2, a: 0, jerk: 0 });
        rebuild();
        go();
      });
      v0In.addEventListener('change', go);
      controls.appendChild(h('label', { class: 'toggle-row' }, 'Starting velocity ', v0In, ' m/s'));
      controls.appendChild(table);
      controls.appendChild(add);
      controls.appendChild(err);
      rebuild();
      go();
    }

    [['library', 'Journey library'], ['equation', 'From an equation'], ['stages', 'Build in stages']].forEach(([v, label]) => {
      const b = h('button', { type: 'button', 'aria-pressed': v === mode ? 'true' : 'false' }, label);
      b.addEventListener('click', () => {
        mode = v;
        Array.from(modeSel.children).forEach((x) => x.setAttribute('aria-pressed', 'false'));
        b.setAttribute('aria-pressed', 'true');
        if (v === 'library') libraryControls();
        else if (v === 'equation') equationControls();
        else stagesControls();
      });
      modeSel.appendChild(b);
    });

    clear(container);
    container.appendChild(h('h1', null, '🧪 Motion Lab'));
    container.appendChild(h('div', { class: 'card' }, modeSel, h('div', { style: { marginTop: '0.75rem' } }, controls)));
    container.appendChild(storySlot);
    container.appendChild(viewSlot);
    container.appendChild(h('p', { class: 'note' }, 'Use the buttons to play, pause, step and slow the motion down; tick and untick graphs to focus on one at a time.'));
    libraryControls();
    return () => viewer && viewer.destroy();
  }

  // ------------------------------------------------------------------ Gradient Explorer
  function gradient(container) {
    const mathMode = window.App.store.state.settings.mathMode;
    const curved = (sc) => !sc.motion.idealised;
    let sc = Scn.getScenario('ball-thrown-up');
    let pair = 's';
    let t = 0.5;
    let dt = 1;
    const topC = h('canvas');
    const botC = h('canvas');
    const top = window.GraphCanvas.create(topC, { quantity: 's', cssHeight: 240 });
    const bot = window.GraphCanvas.create(botC, { quantity: 'v', cssHeight: 200 });
    const topTitle = h('h3');
    const botTitle = h('h3');
    const readout = h('div', { class: 'feedback' });
    const tSlider = h('input', { type: 'range', min: '0', max: '1', step: 'any', value: '0', 'aria-label': 'Time of the point' });
    const dtSlider = h('input', { type: 'range', min: '0.02', max: '1', step: 'any', value: '1', 'aria-label': 'Width of the chord (Δt) as a fraction of the motion' });
    const chordRow = h('label', { class: 'setting' }, h('span', null, 'Chord width Δt — shrink it towards zero'), dtSlider);
    chordRow.hidden = mathMode !== 'extension';
    const playBtn = h('button', { type: 'button', class: 'btn btn-secondary btn-small' }, '▶ Sweep');
    const journey = journeyPanel();
    journey.set(sc);
    let raf = null;

    let topG = top;
    let botG = bot;
    let topCanvasRef = topC;
    let botCanvasRef = botC;
    function rebuildGraphs() {
      topG.destroy();
      botG.destroy();
      const nt = h('canvas');
      const nb = h('canvas');
      topCanvasRef.replaceWith(nt);
      botCanvasRef.replaceWith(nb);
      topG = window.GraphCanvas.create(nt, { quantity: pair, cssHeight: 240 });
      botG = window.GraphCanvas.create(nb, { quantity: pair === 's' ? 'v' : 'a', cssHeight: 200 });
      topG.setMotion(sc.motion);
      botG.setMotion(sc.motion);
      topCanvasRef = nt;
      botCanvasRef = nb;
      const lower = pair === 's' ? 'v' : 'a';
      topTitle.textContent = (pair === 's' ? 'Displacement' : 'Velocity') + '–time: the tangent at the point';
      botTitle.textContent = (lower === 'v' ? 'Velocity' : 'Acceleration') + '–time: built from the gradients so far';
      draw();
    }

    function draw() {
      const T = sc.motion.duration;
      const st = MM.stateAt(sc.motion, t);
      const grad = pair === 's' ? st.v : st.a;
      const val = st[pair];
      const lower = pair === 's' ? 'v' : 'a';
      const unitTop = pair === 's' ? 'm' : 'm/s';
      const unitLow = lower === 'v' ? 'm/s' : 'm/s²';
      const state = { cursor: t, tangentAt: t, tangentTriangle: true };
      let chordGrad = null;
      if (mathMode === 'extension') {
        const w = Math.max(0.01, dt * T * 0.5);
        const t2 = Math.min(T, t + w);
        if (t2 - t > 1e-6) {
          state.chord = { t0: t, t1: t2 };
          chordGrad = (MM.stateAt(sc.motion, t2)[pair] - val) / (t2 - t);
        }
      }
      topG.render(state);
      botG.render({ upTo: t, cursor: t });
      journey.render(t);
      const words = pair === 's' ? 'velocity' : 'acceleration';
      clear(readout);
      readout.appendChild(h('div', { class: 'fb-title' }, 'At t = ' + t.toFixed(2) + ' s: ' + (pair === 's' ? 's' : 'v') + ' = ' + Fmt.signedUnit(val, unitTop, 2)));
      if (mathMode === 'standard') readout.appendChild(h('p', null, 'Gradient of the tangent = rise ÷ run = ', h('b', null, Fmt.signedUnit(grad, unitLow, 2)), ' = the ' + words + '.'));
      else if (mathMode === 'advanced') readout.appendChild(h('p', null, 'Rate of change of ' + (pair === 's' ? 'displacement' : 'velocity') + ' right now = ', h('b', null, Fmt.signedUnit(grad, unitLow, 2)), '. That rate IS the ' + words + '.'));
      else {
        readout.appendChild(h('p', null, h('span', { class: 'maths-line' }, (pair === 's' ? 'v = ds/dt' : 'a = dv/dt') + ' = ' + Fmt.signed(grad, 2) + ' ' + unitLow)));
        if (chordGrad !== null) readout.appendChild(h('p', null, 'Chord gradient Δ' + pair + '/Δt = ' + Fmt.signed(chordGrad, 3) + ' ' + unitLow + ' — shrink Δt and watch it approach the tangent’s gradient. That limit is the derivative.'));
      }
      readout.appendChild(h('p', { class: 'note' }, grad > 1e-6 ? 'Positive gradient → the ' + words + ' is positive here.' : grad < -1e-6 ? 'Negative gradient → the ' + words + ' is negative here.' : 'Zero gradient (flat tangent) → the ' + words + ' is zero at this instant.'));
      tSlider.max = String(T);
    }

    const sel = scenarioSelect(sc.id, curved);
    sel.addEventListener('change', () => {
      sc = Scn.getScenario(sel.value);
      t = Math.min(t, sc.motion.duration);
      tSlider.value = String(t);
      journey.set(sc);
      rebuildGraphs();
    });
    const pairCtl = window.UI.segmented(
      [
        { value: 's', label: 's–t → v–t' },
        { value: 'v', label: 'v–t → a–t' },
      ],
      (v) => {
        pair = v;
        rebuildGraphs();
      },
      'Which pair of graphs'
    );
    tSlider.addEventListener('input', () => {
      t = Number(tSlider.value);
      draw();
    });
    dtSlider.addEventListener('input', () => {
      dt = Number(dtSlider.value);
      draw();
    });
    playBtn.addEventListener('click', () => {
      if (raf) {
        cancelAnimationFrame(raf);
        raf = null;
        playBtn.textContent = '▶ Sweep';
        return;
      }
      playBtn.textContent = '⏸ Pause';
      let last = null;
      const step = (now) => {
        const d = last === null ? 0 : Math.min(now - last, 100) / 1000;
        last = now;
        t += d * (sc.motion.duration / 6);
        if (t >= sc.motion.duration) t = 0;
        tSlider.value = String(t);
        draw();
        raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    });

    clear(container);
    container.appendChild(h('h1', null, '📐 Gradient Explorer'));
    container.appendChild(h('p', { class: 'subtitle' }, 'The gradient of one graph is the height of the next. Move the point and watch the lower graph being built, one gradient at a time.'));
    container.appendChild(h('div', { class: 'card' }, h('div', { class: 'toggle-row' }, h('label', null, 'Journey ', sel), pairCtl.el, playBtn), h('label', { class: 'setting', style: { marginTop: '0.6rem' } }, h('span', null, 'Move the point in time'), tSlider), chordRow));
    container.appendChild(h('div', { style: { marginTop: '1rem' } }, journey.el));
    container.appendChild(h('div', { class: 'grid-2', style: { marginTop: '1rem' } }, h('div', { class: 'graph-panel' }, topTitle, topC), h('div', { class: 'graph-panel' }, botTitle, botC)));
    container.appendChild(readout);
    container.appendChild(h('p', { class: 'mode-note' }, 'Maths mode: ' + { standard: 'Standard — gradients.', advanced: 'Advanced — rates of change.', extension: 'Mathematical Extension — limits and derivatives (switch modes at the top of the page).' }[mathMode]));
    requestAnimationFrame(() => {
      pairCtl.el.children[0].setAttribute('aria-pressed', 'true');
      rebuildGraphs();
    });
    return () => {
      if (raf) cancelAnimationFrame(raf);
      topG.destroy();
      botG.destroy();
      journey.destroy();
    };
  }

  // ------------------------------------------------------------------ Area Explorer
  function area(container) {
    const mathMode = window.App.store.state.settings.mathMode;
    let sc = Scn.getScenario('shuttle-run');
    let q = 'v';
    let t1 = 0;
    let t2 = sc.motion.duration;
    let strips = 8;
    let revealed = false;
    const mainC = h('canvas', { 'aria-label': 'Graph with a shaded region you can resize by dragging its edges' });
    const accC = h('canvas');
    let main = window.GraphCanvas.create(mainC, { quantity: 'v', cssHeight: 250 });
    let acc = window.GraphCanvas.create(accC, { quantity: 's', cssHeight: 200 });
    const out = h('div');
    const predIn = h('input', { type: 'text', inputmode: 'decimal', 'aria-label': 'Your prediction' });
    const predUnit = h('span', { class: 'unit' });
    const predBtn = h('button', { type: 'button', class: 'btn' }, 'Reveal');
    const stripsIn = h('input', { type: 'range', min: '2', max: '60', step: '1', value: '8', 'aria-label': 'Number of strips' });
    const stripsRow = h('label', { class: 'setting' }, h('span', null, 'Split the area into thin strips (each strip ≈ ' + (q === 'v' ? 'v' : 'a') + ' × Δt)'), stripsIn);
    stripsRow.hidden = mathMode === 'standard';
    const journey = journeyPanel();
    journey.set(sc);
    const playBtn = h('button', { type: 'button', class: 'btn btn-secondary btn-small' }, '▶ Play this part of the journey');
    let playRaf = null;
    let tPlay = null; // null = not playing
    let dragging = null;

    function snap(x) {
      return Math.max(0, Math.min(sc.motion.duration, Math.round(x * 4) / 4));
    }
    function bindPointer(g) {
      g.onPointer((kind, t) => {
        if (kind === 'down') {
          stopPlay();
          dragging = Math.abs(t - t1) < Math.abs(t - t2) ? 't1' : 't2';
        }
        if ((kind === 'down' || kind === 'move') && dragging) {
          if (dragging === 't1') t1 = Math.min(snap(t), t2);
          else t2 = Math.max(snap(t), t1);
          revealed = false;
          draw();
        }
        if (kind === 'up') dragging = null;
      });
    }
    bindPointer(main);

    function stripOverlay() {
      // left-endpoint rectangles drawn as a stepped overlay curve
      const n = strips;
      const w = (t2 - t1) / n;
      const f = (t) => {
        if (t < t1 || t > t2) return 0;
        const k = Math.min(n - 1, Math.floor((t - t1) / w));
        return MM.stateAt(sc.motion, t1 + k * w)[q];
      };
      const breaks = [];
      for (let k = 1; k < n; k++) breaks.push(t1 + k * w);
      let sum = 0;
      for (let k = 0; k < n; k++) sum += MM.stateAt(sc.motion, t1 + k * w)[q] * w;
      return { overlay: { fn: f, breaks: breaks.concat([t1, t2]), color: '#495057', width: 1.5 }, sum };
    }

    function draw() {
      const exact = q === 'v' ? MM.displacementBetween(sc.motion, t1, t2) : MM.stateAt(sc.motion, t2).v - MM.stateAt(sc.motion, t1).v;
      const st = { highlight: [t1, t2], markers: [{ t: t1, label: 't₁', color: '#173d75' }, { t: t2, label: 't₂', color: '#173d75' }] };
      let stripSum = null;
      if (revealed) st.shade = { t0: t1, t1: t2 };
      if (mathMode !== 'standard' && revealed) {
        const so = stripOverlay();
        st.overlays = [so.overlay];
        stripSum = so.sum;
      }
      main.render(st);
      acc.render({ upTo: revealed ? t2 : t1, cursor: revealed ? t2 : t1, markers: [{ t: t1, label: 't₁' }, { t: t2, label: 't₂' }] });
      journey.render(revealed ? t2 : t1, revealed && t2 - t1 > 1e-6 ? { ghostS: MM.stateAt(sc.motion, t1).s, ghostState: MM.stateAt(sc.motion, t1), ghostLabel: '' } : undefined);
      predUnit.textContent = q === 'v' ? 'm' : 'm/s';
      clear(out);
      out.appendChild(h('p', { class: 'prompt' }, 'Predict the ' + (q === 'v' ? 'displacement' : 'change in velocity') + ' between t₁ = ' + t1.toFixed(2) + ' s and t₂ = ' + t2.toFixed(2) + ' s, then reveal. Drag the dashed edges to change the region.'));
      if (revealed) {
        const dist = q === 'v' ? MM.distanceBetween(sc.motion, t1, t2) : null;
        out.appendChild(
          feedback('ok', (q === 'v' ? 'Displacement = signed area = ' + Fmt.signedUnit(exact, 'm', 2) : 'Change in velocity = signed area = ' + Fmt.signedUnit(exact, 'm/s', 2)), [
            q === 'v' ? h('p', null, 'Distance travelled (all area counted positive) = ' + Fmt.unitStr(dist, 'm', 2) + '.') : null,
            stripSum !== null ? h('p', null, strips + ' strips give ≈ ' + Fmt.signed(stripSum, 2) + '. More, thinner strips → closer to the exact area.') : null,
            mathMode === 'extension' ? h('p', null, h('span', { class: 'maths-line' }, (q === 'v' ? 'Δs = ∫ v dt' : 'Δv = ∫ a dt') + ' from ' + t1.toFixed(2) + ' to ' + t2.toFixed(2) + ' = ' + Fmt.signed(exact, 2))) : null,
            mathMode === 'advanced' ? h('p', { class: 'mode-note' }, 'Each strip is (rate) × (time) = a small change. Adding them accumulates the total change.') : null,
            h('p', { class: 'note' }, 'The lower graph is the running total: it rises while the area is above the axis and falls while it is below.'),
          ])
        );
      }
    }

    function stopPlay() {
      if (playRaf) cancelAnimationFrame(playRaf);
      playRaf = null;
      tPlay = null;
      playBtn.textContent = '▶ Play this part of the journey';
    }
    playBtn.addEventListener('click', () => {
      if (playRaf) {
        stopPlay();
        draw();
        return;
      }
      if (t2 - t1 < 1e-6) return;
      const secs = Math.min(8, Math.max(2.5, t2 - t1));
      const rate = (t2 - t1) / secs;
      tPlay = t1;
      playBtn.textContent = '⏸ Stop';
      let last = null;
      const step = (now) => {
        const d = last === null ? 0 : Math.min(now - last, 100) / 1000;
        last = now;
        tPlay = Math.min(t2, tPlay + d * rate);
        main.render({ highlight: [t1, t2], markers: [{ t: t1, label: 't₁', color: '#173d75' }, { t: t2, label: 't₂', color: '#173d75' }], cursor: tPlay });
        acc.render({ upTo: tPlay, cursor: tPlay, markers: [{ t: t1, label: 't₁' }, { t: t2, label: 't₂' }] });
        journey.render(tPlay, { ghostS: MM.stateAt(sc.motion, t1).s, ghostState: MM.stateAt(sc.motion, t1), ghostLabel: '' });
        if (tPlay >= t2) {
          stopPlay();
          draw();
          return;
        }
        playRaf = requestAnimationFrame(step);
      };
      playRaf = requestAnimationFrame(step);
    });
    predBtn.addEventListener('click', () => {
      stopPlay();
      const guess = Fmt.parseAnswer(predIn.value);
      revealed = true;
      draw();
      if (isFinite(guess)) {
        const exact = q === 'v' ? MM.displacementBetween(sc.motion, t1, t2) : MM.stateAt(sc.motion, t2).v - MM.stateAt(sc.motion, t1).v;
        const ok = Fmt.withinTolerance(guess, exact, 0.05, 0.3);
        out.insertBefore(h('p', null, ok ? '✅ Your prediction was right!' : '❌ You predicted ' + Fmt.signed(guess, 2) + '.'), out.firstChild);
        window.App.store.recordAnswer({ correct: ok, skills: ['area'], tier: 'gcse', type: 'area-explorer', misconception: !ok && q === 'v' && Fmt.withinTolerance(guess, MM.distanceBetween(sc.motion, t1, t2), 0.05, 0.3) ? 'area-always-distance' : null });
      }
    });
    stripsIn.addEventListener('input', () => {
      strips = Number(stripsIn.value);
      draw();
    });

    function rebuild() {
      main.destroy();
      acc.destroy();
      const m2 = h('canvas');
      const a2 = h('canvas');
      mainSlot.replaceChildren(mainTitle, m2);
      accSlot.replaceChildren(accTitle, a2);
      main = window.GraphCanvas.create(m2, { quantity: q, cssHeight: 250 });
      acc = window.GraphCanvas.create(a2, { quantity: q === 'v' ? 's' : 'v', cssHeight: 200 });
      main.setMotion(sc.motion);
      acc.setMotion(sc.motion);
      bindPointer(main);
      mainTitle.textContent = (q === 'v' ? 'Velocity' : 'Acceleration') + '–time graph — the region';
      accTitle.textContent = (q === 'v' ? 'Displacement' : 'Velocity') + '–time graph — the running total';
      revealed = false;
      draw();
    }
    const sel = scenarioSelect(sc.id, (s) => !s.motion.idealised);
    sel.addEventListener('change', () => {
      stopPlay();
      sc = Scn.getScenario(sel.value);
      t1 = 0;
      t2 = sc.motion.duration;
      journey.set(sc);
      rebuild();
    });
    const qCtl = window.UI.segmented(
      [
        { value: 'v', label: 'Area under v–t' },
        { value: 'a', label: 'Area under a–t' },
      ],
      (v) => {
        q = v;
        rebuild();
      },
      'Which graph'
    );
    const mainTitle = h('h3');
    const accTitle = h('h3');
    const mainSlot = h('div', { class: 'graph-panel' }, mainTitle, mainC);
    const accSlot = h('div', { class: 'graph-panel' }, accTitle, accC);

    clear(container);
    container.appendChild(h('h1', null, '▧ Area Explorer'));
    container.appendChild(h('p', { class: 'subtitle' }, 'Area under a v–t graph is displacement; area under an a–t graph is change in velocity. Area below the axis counts as negative.'));
    container.appendChild(h('div', { class: 'card' }, h('div', { class: 'toggle-row' }, h('label', null, 'Journey ', sel), qCtl.el), stripsRow));
    container.appendChild(h('div', { style: { marginTop: '1rem' } }, journey.el, h('div', { class: 'btn-row', style: { marginTop: '0.5rem', alignItems: 'center' } }, playBtn, h('span', { class: 'note' }, 'The faded figure shows where it started (t₁).'))));
    container.appendChild(h('div', { class: 'grid-2', style: { marginTop: '1rem' } }, mainSlot, accSlot));
    container.appendChild(h('div', { class: 'card', style: { marginTop: '1rem' } }, out, h('div', { class: 'answer-row' }, predIn, predUnit, predBtn)));
    requestAnimationFrame(() => {
      qCtl.el.children[0].setAttribute('aria-pressed', 'true');
      rebuild();
    });
    return () => {
      stopPlay();
      main.destroy();
      acc.destroy();
      journey.destroy();
    };
  }

  window.Views = window.Views || {};
  window.Views.explore = function (container, params) {
    if (params[0] === 'gradient') return gradient(container);
    if (params[0] === 'area') return area(container);
    return lab(container);
  };
})();
