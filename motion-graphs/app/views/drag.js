/**
 * Air Resistance Lab.
 *
 * Vertical motion with quadratic drag: a ball, a bullet, a shuttlecock or a
 * skydiver. Shows, all driven by one clock:
 *   - the animation, with an optional faded "no air resistance" twin
 *   - a live free-body diagram: weight, drag and resultant to scale
 *   - s–t, v–t and a–t graphs, with the no-drag motion dashed for comparison,
 *     the terminal velocity on the v–t graph and −g on the a–t graph
 *   - live commentary explaining what the forces are doing right now
 *   - a with/without summary table (time up, height, time down, landing speed)
 *
 * Also exports the free-body diagram so the quiz can use it.
 */
(function () {
  const { h, clear, segmented, feedback } = window.UI;
  const MM = window.MotionModel;
  const DM = window.DragModel;
  const Fmt = window.Fmt;
  const Scn = window.Scenarios;

  const COL = { W: '#2b8a3e', D: '#e8590c', R: '#7048e8', v: '#d9480f', ink: '#1a1a1a' };

  // ---------------------------------------------------------------- free-body diagram
  /**
   * FreeBody(canvas) → { render(forces, info) }
   * forces: { W, D, R, v } in newtons and m/s, up positive.
   * Arrow lengths are to scale (weight = fixed length). Very large forces are
   * capped and drawn with a break, with the true size written beside them.
   */
  function FreeBody(canvas, options) {
    const o = Object.assign({ cssHeight: 300 }, options || {});
    const ctx = canvas.getContext('2d');
    let cssW = 260;
    const cssH = o.cssHeight;
    let last = null;
    canvas.setAttribute('role', 'img');

    function resize() {
      const rect = canvas.getBoundingClientRect();
      cssW = Math.max(200, rect.width || 260);
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      canvas.style.height = cssH + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (last) render(last.f, last.info);
    }

    function arrow(x, y0, len, colour, label, sub, broken, side, sub2) {
      // len in px, positive = up
      if (Math.abs(len) < 1.5) {
        ctx.fillStyle = colour;
        ctx.font = 'bold 12px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(label + ' = 0', x, y0 - 10);
        return;
      }
      const y1 = y0 - len;
      const dir = len > 0 ? -1 : 1;
      ctx.save();
      ctx.strokeStyle = colour;
      ctx.fillStyle = colour;
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x, y0);
      ctx.lineTo(x, y1 - dir * 10);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y1);
      ctx.lineTo(x - 9, y1 - dir * 14);
      ctx.lineTo(x + 9, y1 - dir * 14);
      ctx.closePath();
      ctx.fill();
      if (broken) {
        // two slashes show the arrow is longer than drawn
        const ym = (y0 + y1) / 2;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x - 9, ym + 2);
        ctx.lineTo(x + 9, ym - 4);
        ctx.moveTo(x - 9, ym + 9);
        ctx.lineTo(x + 9, ym + 3);
        ctx.stroke();
      }
      // labels go on the given side, so two arrows pointing the same way never share text space
      const left = side === 'left';
      const lx = left ? x - 13 : x + 13;
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.textAlign = left ? 'right' : 'left';
      ctx.textBaseline = 'middle';
      const ly = (y0 + y1) / 2;
      ctx.fillText(label, lx, ly - 7);
      ctx.font = '11px system-ui, sans-serif';
      ctx.fillText(sub, lx, ly + 8);
      if (sub2) ctx.fillText(sub2, lx, ly + 22);
      ctx.restore();
    }

    function render(f, info) {
      last = { f, info };
      const inf = info || {};
      ctx.clearRect(0, 0, cssW, cssH);
      ctx.fillStyle = '#fbfcfe';
      ctx.fillRect(0, 0, cssW, cssH);
      const W = Math.abs(f.W);
      const unit = 62; // px for the weight
      const cap = Math.min(3.2 * unit, cssH / 2 - 34);
      const scaled = (F) => {
        const L = (Math.abs(F) / W) * unit;
        return { len: Math.min(L, cap) * Math.sign(F), broken: L > cap };
      };
      const cx = Math.max(Math.min(cssW * 0.38, 130), 100);
      const cy = cssH / 2;
      // object
      ctx.fillStyle = '#dee2e6';
      ctx.strokeStyle = '#495057';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // velocity hint on the left
      ctx.save();
      ctx.fillStyle = COL.v;
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(Math.abs(f.v) > 1e-3 ? (f.v > 0 ? '↑ moving up' : '↓ moving down') + ' at ' + Fmt.num(Math.abs(f.v), 1) + ' m/s' : 'momentarily still', 8, 8);
      ctx.restore();
      const w = scaled(f.W);
      arrow(cx - 9, cy, w.len, COL.W, 'Weight', Fmt.num(W, W < 1 ? 3 : 1) + ' N down', w.broken, 'left');
      if (inf.drag !== false) {
        const d = scaled(f.D);
        if (Math.abs(f.D) / W < 0.005) {
          ctx.fillStyle = COL.D;
          ctx.font = 'bold 12px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('Drag = 0', cx + 9, cy - 24);
        } else arrow(cx + 9, cy, d.len, COL.D, 'Drag', Fmt.num(Math.abs(f.D), Math.abs(f.D) < 1 ? 3 : 1) + ' N ' + (f.D > 0 ? 'up' : 'down'), d.broken, 'right', d.broken ? '= ' + Fmt.num(Math.abs(f.D) / W, 1) + ' × weight' : null);
      }
      // resultant, to the right
      const rx = Math.min(cssW - 76, cx + 118);
      ctx.save();
      ctx.strokeStyle = '#dee2e6';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(rx - 28, 14);
      ctx.lineTo(rx - 28, cssH - 14);
      ctx.stroke();
      ctx.restore();
      const r = scaled(f.R);
      if (Math.abs(f.R) / W < 0.01) {
        ctx.fillStyle = COL.R;
        ctx.font = 'bold 12px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Resultant', rx, cy - 8);
        ctx.fillText('≈ 0', rx, cy + 8);
      } else arrow(rx - 6, cy, r.len, COL.R, 'Resultant', Fmt.num(Math.abs(f.R), Math.abs(f.R) < 1 ? 3 : 1) + ' N ' + (f.R > 0 ? 'up' : 'down'), r.broken, 'right', r.broken ? '= ' + Fmt.num(Math.abs(f.R) / W, 1) + ' × weight' : null);
      ctx.fillStyle = '#5b6370';
      ctx.font = '11px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Arrows to scale. // = longer than drawn.', 6, cssH - 8);
      canvas.setAttribute('aria-label', 'Free-body diagram: weight ' + Fmt.num(W, 2) + ' newtons down' + (inf.drag !== false ? ', drag ' + Fmt.num(Math.abs(f.D), 2) + ' newtons ' + (f.D >= 0 ? 'up' : 'down') : '') + ', resultant ' + Fmt.num(Math.abs(f.R), 2) + ' newtons ' + (f.R >= 0 ? 'up' : 'down') + '.');
    }

    let ro = null;
    if (window.ResizeObserver) {
      ro = new ResizeObserver(resize);
      ro.observe(canvas);
    }
    requestAnimationFrame(resize);
    return { render, resize, destroy: () => ro && ro.disconnect() };
  }

  /** Plain-English account of what the forces are doing at this instant. */
  function commentary(sim, t) {
    const f = sim.forcesAt(t);
    const g = sim.g;
    const speed = Math.abs(f.v);
    const aMag = Math.abs(f.a);
    if (!sim.drag) {
      if (speed < 0.02 * Math.max(Math.abs(sim.v0), 1) && sim.v0 > 0) return { title: 'At the top', text: 'v = 0 for an instant, but the weight still acts, so a = −g. That is why it starts to come back down.' };
      return { title: 'No air resistance', text: 'Only the weight acts, the whole time. So a = −g = ' + Fmt.signed(-g, 2) + ' m/s² throughout, and the v–t graph is a straight line with gradient −g. The trip up and the trip down take the same time, and it lands at its launch speed.' };
    }
    if (sim.v0 > 0 && Math.abs(t - sim.apex.t) < Math.max(0.012 * sim.T, 0.03)) {
      return { title: 'At the top: v = 0, so drag = 0', text: 'For an instant only the weight acts, so the acceleration is exactly −g (' + Fmt.signed(-g, 2) + ' m/s²). It is NOT zero, and the v–t graph’s gradient here is exactly −g.' };
    }
    if (f.v > 0) {
      return { title: 'Going up: drag acts DOWN, with the weight', text: 'Both forces point down, so the resultant is bigger than the weight. It slows down faster than gravity alone would: |a| = ' + Fmt.num(aMag, 1) + ' m/s², more than g. The faster it goes, the bigger the drag, so the v–t graph is steepest at the start.' };
    }
    if (speed >= 0.97 * sim.vT) {
      return { title: 'Terminal velocity', text: 'Drag has grown to match the weight. The resultant is about zero, so a ≈ 0: it keeps falling, but at a steady ' + Fmt.num(speed, 1) + ' m/s. The v–t graph has levelled off at −vT.' };
    }
    if (f.v < 0) {
      return { title: 'Coming down: drag acts UP, against the weight', text: 'The resultant is the weight minus the drag, smaller than the weight, so it speeds up more slowly than g: |a| = ' + Fmt.num(aMag, 1) + ' m/s², less than g. As it speeds up the drag grows, the resultant shrinks, and the acceleration falls towards zero.' };
    }
    return { title: 'Released from rest', text: 'At the instant of release v = 0, so there is no drag yet: a = −g. As it speeds up, drag grows and the acceleration shrinks.' };
  }

  function nearestSpeed(T) {
    const target = T / 8;
    const opts = [0.25, 0.5, 1, 2, 4, 8, 16];
    return opts.reduce((best, x) => (Math.abs(Math.log(x / target)) < Math.abs(Math.log(best / target)) ? x : best), 1);
  }

  // log slider helpers (0–1000 on the slider ↔ lo–hi on a log scale)
  const toLog = (x, lo, hi) => Math.round((1000 * Math.log(x / lo)) / Math.log(hi / lo));
  const fromLog = (p, lo, hi) => lo * Math.pow(hi / lo, p / 1000);
  const MASS = [0.001, 100];
  const KR = [1e-6, 5];

  function render(container) {
    const parts = [];
    const p = { preset: 'ball', s0: 0, v0: 20, mass: 0.06, k: DM.kForTerminal(0.06, 9.81, 15), g: 9.81, drag: true, compare: true, object: 'ball' };
    let sim = null;
    let ref = null;
    let player = null;
    let stage = null;
    let fbd = null;
    let graphs = {};
    const sceneSlot = h('div');
    const summarySlot = h('div');
    const noteSlot = h('p', { class: 'note' });

    // ---------------- controls
    const presetCtl = segmented(
      DM.PRESETS.map((pr) => ({ value: pr.id, label: pr.label })),
      (id) => applyPreset(id),
      'Choose an example'
    );
    const out = {};
    function slider(id, label, attrs, fmt, onInput) {
      const val = h('b');
      const inp = h('input', Object.assign({ type: 'range', id }, attrs));
      out[id] = { inp, val, fmt };
      inp.addEventListener('input', () => {
        onInput(Number(inp.value));
        val.textContent = fmt();
        later();
      });
      return h('label', { class: 'setting', for: id }, h('span', null, label, ': ', val), inp);
    }
    const v0Row = slider('drag-v0', 'Launch velocity u (up is +)', { min: '0', max: '50', step: 'any', value: '20' }, () => Fmt.signedUnit(p.v0, 'm/s', 1), (v) => (p.v0 = v));
    const s0Row = slider('drag-s0', 'Starting height', { min: '0', max: '100', step: 'any', value: '0' }, () => Fmt.unitStr(p.s0, 'm', 0), (v) => (p.s0 = v));
    const mRow = slider('drag-m', 'Mass m', { min: '0', max: '1000', step: '1', value: String(toLog(p.mass, MASS[0], MASS[1])) }, () => Fmt.unitStr(p.mass, 'kg', p.mass < 0.1 ? 3 : 2), (v) => (p.mass = fromLog(v, MASS[0], MASS[1])));
    const kRow = slider('drag-k', 'Drag constant k (drag = k v²)', { min: '0', max: '1000', step: '1', value: String(toLog(p.k, KR[0], KR[1])) }, () => (p.k < 0.001 ? p.k.toExponential(2) : Fmt.num(p.k, 4)) + ' kg/m', (v) => (p.k = fromLog(v, KR[0], KR[1])));
    const vTOut = h('div', { class: 'stat' });
    const dragCb = h('input', { type: 'checkbox', id: 'drag-on', checked: true });
    const compCb = h('input', { type: 'checkbox', id: 'drag-compare', checked: true });
    const gSel = h('select', { id: 'drag-g', 'aria-label': 'Gravitational field strength' }, [h('option', { value: '9.81', selected: true }, '9.81 N/kg'), h('option', { value: '9.8' }, '9.8 N/kg'), h('option', { value: '10' }, '10 N/kg')]);
    dragCb.addEventListener('change', () => ((p.drag = dragCb.checked), build()));
    compCb.addEventListener('change', () => ((p.compare = compCb.checked), build()));
    gSel.addEventListener('change', () => ((p.g = Number(gSel.value)), build()));

    function syncSliders() {
      out['drag-v0'].inp.max = String(Math.max(50, Math.ceil(p.v0 * 1.5)));
      out['drag-v0'].inp.value = String(p.v0);
      out['drag-s0'].inp.max = String(Math.max(100, Math.ceil(p.s0 * 1.5)));
      out['drag-s0'].inp.value = String(p.s0);
      out['drag-m'].inp.value = String(toLog(p.mass, MASS[0], MASS[1]));
      out['drag-k'].inp.value = String(toLog(p.k, KR[0], KR[1]));
      Object.keys(out).forEach((k) => (out[k].val.textContent = out[k].fmt()));
    }

    function applyPreset(id) {
      const pr = DM.PRESETS.find((x) => x.id === id);
      p.preset = id;
      p.s0 = pr.s0;
      p.v0 = pr.v0;
      p.mass = pr.mass;
      p.k = DM.kForTerminal(pr.mass, p.g, pr.vT);
      p.object = pr.object;
      noteSlot.textContent = pr.note + ' (Example values: a first draft, to be checked by the teacher.)';
      syncSliders();
      build();
    }

    let timer = null;
    function later() {
      clearTimeout(timer);
      timer = setTimeout(build, 140);
    }

    // ---------------- scene
    function teardown() {
      if (player) player.destroy();
      if (stage) stage.destroy();
      if (fbd) fbd.destroy();
      Object.keys(graphs).forEach((k) => graphs[k].destroy());
      graphs = {};
    }

    function build() {
      teardown();
      clear(sceneSlot);
      if (p.v0 <= 0 && p.s0 <= 0) p.s0 = 20; // something has to happen
      sim = DM.simulate({ s0: p.s0, v0: p.v0, g: p.g, mass: p.mass, k: p.drag ? p.k : 0 });
      ref = p.drag && p.compare ? DM.simulate({ s0: p.s0, v0: p.v0, g: p.g, mass: p.mass, k: 0 }) : null;
      const vT = Math.sqrt((p.mass * p.g) / p.k);
      clear(vTOut);
      vTOut.appendChild(h('div', { class: 'label' }, 'Terminal speed vT = √(mg/k)'));
      vTOut.appendChild(h('div', { class: 'value', style: { fontSize: '1.3rem' } }, p.drag ? Fmt.unitStr(vT, 'm/s', 1) : 'no drag'));
      vTOut.appendChild(h('div', { class: 'note' }, 'where drag would balance the weight'));

      const T = Math.max(sim.T, ref ? ref.T : 0);
      const sc = Object.assign({}, Scn.VERTICAL, { id: 'drag-lab', title: p.drag ? 'With air resistance' : 'No air resistance', object: p.object, motion: sim.motion, story: '' });
      const ext = MM.extents(sim.motion);
      const rext = ref ? MM.extents(ref.motion) : ext;
      const stageCanvas = h('canvas');
      stage = window.MotionStage.create(stageCanvas, sc, { sRange: [Math.min(ext.s[0], rext.s[0]), Math.max(ext.s[1], rext.s[1])], cssHeight: 320 });
      const fbdCanvas = h('canvas');
      fbd = FreeBody(fbdCanvas);
      const comm = h('div', { class: 'feedback', 'aria-live': 'off' });
      const readout = h('div', { class: 'readouts' });

      // graphs
      const graphWrap = h('div', { class: 'viewer-graphs' });
      const ranges = {};
      ['s', 'v', 'a'].forEach((q) => {
        let lo = Math.min(0, ext[q][0], rext[q][0]);
        let hi = Math.max(0, ext[q][1], rext[q][1]);
        if (q === 'v' && p.drag && vT < 3 * Math.max(Math.abs(lo), hi)) lo = Math.min(lo, -vT);
        if (q === 'a') lo = Math.min(lo, -p.g);
        const pad = (hi - lo || 1) * 0.1;
        ranges[q] = [lo - pad, hi + pad];
        const c = h('canvas');
        const L = window.GraphCanvas.LABELS[q];
        const g = window.GraphCanvas.create(c, { quantity: q, cssHeight: 200 });
        g.setFunction((t) => MM.stateAt(sim.motion, Math.min(t, sim.T))[q], T, ranges[q], window.GraphCanvas.motionBreaks(sim.motion, q));
        graphs[q] = g;
        graphWrap.appendChild(h('div', { class: 'graph-panel ' + q }, h('h3', null, L.title + ' graph'), c));
      });
      const legend = h(
        'div',
        { class: 'toggle-row note' },
        h('span', null, h('span', { class: 'legend-chip', style: { background: '#2a6bd6' } }), ' ', p.drag ? 'with air resistance' : 'no air resistance'),
        ref ? h('span', null, '- - - dashed grey: without air resistance') : null,
        p.drag ? h('span', null, 'v–t: dashed line at −vT (terminal velocity)') : null,
        h('span', null, 'a–t: dashed line at −g')
      );

      const markers = sim.apex && sim.v0 > 0 ? [{ t: sim.apex.t, label: 'top', color: '#173d75' }] : [];
      if (ref && ref.apex && ref.v0 > 0) markers.push({ t: ref.apex.t, label: 'top (no drag)', color: '#adb5bd' });

      function update(t) {
        const tc = Math.min(t, sim.T);
        const st = MM.stateAt(sim.motion, tc);
        const extra = ref ? { ghostS: MM.stateAt(ref.motion, Math.min(t, ref.T)).s, ghostState: MM.stateAt(ref.motion, Math.min(t, ref.T)), ghostLabel: 'no drag' } : {};
        stage.render(tc, extra);
        const f = sim.forcesAt(tc);
        fbd.render(f, { drag: p.drag });
        ['s', 'v', 'a'].forEach((q) => {
          const overlays = ref ? [{ fn: (x) => MM.stateAt(ref.motion, Math.min(x, ref.T))[q], upTo: Math.min(t, ref.T), color: '#9aa4b1', width: 2, dash: [6, 5] }] : [];
          const hl = [];
          if (q === 'v' && p.drag) hl.push({ y: -vT, label: '−vT = ' + Fmt.signed(-vT, 1) + ' m/s', color: '#5b6370' });
          if (q === 'a') hl.push({ y: -p.g, label: '−g', color: '#2b8a3e' });
          graphs[q].render({ upTo: tc, cursor: tc, overlays, hlines: hl, markers });
        });
        const c = commentary(sim, tc);
        clear(comm);
        comm.appendChild(h('div', { class: 'fb-title' }, c.title));
        comm.appendChild(h('p', { style: { margin: 0 } }, c.text));
        clear(readout);
        readout.appendChild(h('span', null, 't = ', h('b', null, Fmt.unitStr(tc, 's', 2))));
        readout.appendChild(h('span', { class: 'r-s' }, 's = ', h('b', null, Fmt.signedUnit(st.s, 'm', 1))));
        readout.appendChild(h('span', { class: 'r-v' }, 'v = ', h('b', null, Fmt.signedUnit(st.v, 'm/s', 1))));
        readout.appendChild(h('span', { class: 'r-a' }, 'a = ', h('b', null, Fmt.signedUnit(st.a, 'm/s²', 2))));
        readout.appendChild(h('span', null, 'a ÷ g = ', h('b', null, Fmt.num(st.a / p.g, 2))));
      }
      player = window.Viewer.Player(T, update, { speed: nearestSpeed(T), speeds: [0.25, 0.5, 1, 2, 4, 8, 16] });

      // key moments
      const jumps = h('div', { class: 'btn-row' }, h('span', { class: 'note' }, 'Jump to:'));
      const moment = (label, t) => {
        const b = h('button', { type: 'button', class: 'btn btn-secondary btn-small' }, label);
        b.addEventListener('click', () => {
          player.pause();
          player.seek(t);
        });
        jumps.appendChild(b);
      };
      if (sim.v0 > 0) {
        moment('Launch', 0);
        moment('Going up', sim.apex.t * 0.4);
        moment('Top', sim.apex.t);
        moment('Coming down', sim.apex.t + (sim.T - sim.apex.t) * 0.5);
      } else {
        moment('Release', 0);
        moment('Falling', sim.T * 0.15);
        moment('Halfway', sim.T * 0.5);
      }
      moment('Landing', sim.T);

      sceneSlot.appendChild(
        h(
          'div',
          { class: 'grid-2' },
          h('div', { class: 'stage-panel' }, h('h3', null, h('span', null, sc.title), h('span', { class: 'note' }, 'up is positive')), stageCanvas),
          h('div', { class: 'stage-panel' }, h('h3', null, h('span', null, 'Free-body diagram'), h('span', { class: 'note' }, 'live')), fbdCanvas)
        )
      );
      sceneSlot.appendChild(player.el);
      sceneSlot.appendChild(jumps);
      sceneSlot.appendChild(readout);
      sceneSlot.appendChild(comm);
      sceneSlot.appendChild(legend);
      sceneSlot.appendChild(graphWrap);
      requestAnimationFrame(() => update(0));
      buildSummary();
    }

    function buildSummary() {
      clear(summarySlot);
      const rows = [];
      const both = (label, a, b) => rows.push(h('tr', null, h('th', { scope: 'row' }, label), h('td', null, a), ref ? h('td', null, b) : null));
      if (sim.v0 > 0) {
        both('Time to reach the top', Fmt.unitStr(sim.apex.t, 's', 2), ref ? Fmt.unitStr(ref.apex.t, 's', 2) : '');
        both('Greatest height', Fmt.unitStr(sim.apex.s, 'm', 1), ref ? Fmt.unitStr(ref.apex.s, 'm', 1) : '');
        both('Time to come back down', Fmt.unitStr(sim.T - sim.apex.t, 's', 2), ref ? Fmt.unitStr(ref.T - ref.apex.t, 's', 2) : '');
      } else both('Time to fall', Fmt.unitStr(sim.T, 's', 2), ref ? Fmt.unitStr(ref.T, 's', 2) : '');
      both('Speed when it lands', Fmt.unitStr(Math.abs(sim.landing.v), 'm/s', 1), ref ? Fmt.unitStr(Math.abs(ref.landing.v), 'm/s', 1) : '');
      both('Acceleration at the start', Fmt.signedUnit(MM.stateAt(sim.motion, 0).a, 'm/s²', 2), ref ? Fmt.signedUnit(-p.g, 'm/s²', 2) : '');
      both('Acceleration when it lands', Fmt.signedUnit(MM.stateAt(sim.motion, sim.T).a, 'm/s²', 2), ref ? Fmt.signedUnit(-p.g, 'm/s²', 2) : '');
      const insight =
        p.drag && sim.v0 > 0
          ? 'With air resistance the trip down takes LONGER than the trip up (' + Fmt.num(sim.T - sim.apex.t, 2) + ' s vs ' + Fmt.num(sim.apex.t, 2) + ' s), and it lands slower than it was launched (' + Fmt.num(Math.abs(sim.landing.v), 1) + ' m/s vs ' + Fmt.num(sim.v0, 1) + ' m/s). Drag takes energy away on the way up AND on the way down, and it slows the rise more than it slows the fall.'
          : p.drag
          ? 'Falling from rest, drag grows with speed until it balances the weight; the object then falls at terminal speed.'
          : 'Without air resistance the motion is perfectly symmetric: same time up as down, and it lands at its launch speed.';
      summarySlot.appendChild(
        h(
          'div',
          { class: 'card' },
          h('h2', { style: { marginTop: 0 } }, 'With and without air resistance'),
          h('div', { style: { overflowX: 'auto' } }, h('table', { class: 'data-table' }, h('thead', null, h('tr', null, h('th', null, ''), h('th', null, p.drag ? 'With air resistance' : 'No air resistance'), ref ? h('th', null, 'Without') : null)), h('tbody', null, rows))),
          h('p', null, insight)
        )
      );
    }

    // ---------------- page
    clear(container);
    container.appendChild(h('h1', null, '🪂 Air Resistance Lab'));
    container.appendChild(h('p', { class: 'subtitle' }, 'Fire something straight up and watch how drag changes the trip up, the top and the trip down. The free-body diagram shows the weight and the drag to scale as it moves.'));
    container.appendChild(h('div', { class: 'card' }, h('div', { class: 'setting' }, h('span', null, 'Example'), presetCtl.el), noteSlot));
    container.appendChild(sceneSlot);
    container.appendChild(
      h(
        'div',
        { class: 'card', style: { marginTop: '1rem' } },
        h('h2', { style: { marginTop: 0 } }, 'Change the set-up'),
        h('div', { class: 'grid-2' }, v0Row, s0Row, mRow, kRow),
        h('div', { class: 'grid-2' }, vTOut, h('div', { class: 'setting' }, h('label', { class: 'toggle-row' }, dragCb, 'Air resistance on'), h('label', { class: 'toggle-row' }, compCb, 'Compare with no air resistance (faded twin + dashed graphs)'), h('label', { class: 'toggle-row' }, 'g = ', gSel))),
        h('p', { class: 'note' }, 'Drag here is modelled as k v², which suits fast-moving objects in air. A heavier object with the same k has a bigger terminal speed, so drag affects it less.')
      )
    );
    container.appendChild(summarySlot);
    container.appendChild(
      h(
        'div',
        { class: 'card', style: { marginTop: '1rem' } },
        h('h2', { style: { marginTop: 0 } }, 'What to look for on the graphs'),
        h(
          'ul',
          null,
          h('li', null, h('b', null, 'v–t: '), 'no longer a straight line. Steeper than −g on the way up, exactly −g where it crosses the axis (the top), then flattening towards −vT on the way down.'),
          h('li', null, h('b', null, 'a–t: '), 'starts more negative than −g, rises to exactly −g at the top, and keeps rising towards zero as drag approaches the weight. The acceleration is never zero at the top.'),
          h('li', null, h('b', null, 's–t: '), 'no longer symmetric. The peak is lower and earlier, and the falling half is longer and straighter (nearly constant speed).'),
          h('li', null, h('b', null, 'Areas: '), 'launched from the ground and landing there again, the area above the axis (going up) still equals the area below it (coming down), so the displacement is zero, even though the two shapes look nothing alike.')
        ),
        h('div', { class: 'btn-row' }, h('a', { class: 'btn', href: '#/drag/quiz' }, 'Test yourself: predict-first questions →'), h('a', { class: 'btn btn-secondary', href: '#/fix/drag-direction' }, 'Fix the mistake: air resistance'))
      )
    );
    requestAnimationFrame(() => {
      presetCtl.el.children[0].setAttribute('aria-pressed', 'true');
      applyPreset('ball');
    });
    return () => {
      clearTimeout(timer);
      teardown();
      parts.forEach((x) => x.destroy());
    };
  }

  window.Views = window.Views || {};
  window.Views.drag = function (container, params) {
    if (params[0] === 'quiz') {
      const lv = window.Levels.getLevel('6-9');
      return window.LevelRunner.run(container, lv, { kicker: 'Air Resistance Lab · predict first' }).destroy;
    }
    return render(container);
  };
  /**
   * A compact lab for quiz feedback: animation, free-body diagram, player and
   * chosen graphs, with the no-drag twin dashed. Opens paused at time `at`.
   */
  function miniLab(sim, ref, options) {
    const o = Object.assign({ graphs: ['v', 'a'], at: 0 }, options || {});
    const T = Math.max(sim.T, ref ? ref.T : 0);
    const sc = Object.assign({}, Scn.VERTICAL, { id: 'drag-mini', title: 'With air resistance', object: o.object || 'ball', motion: sim.motion, story: '' });
    const ext = MM.extents(sim.motion);
    const rext = ref ? MM.extents(ref.motion) : ext;
    const sC = h('canvas');
    const stage = window.MotionStage.create(sC, sc, { sRange: [Math.min(ext.s[0], rext.s[0]), Math.max(ext.s[1], rext.s[1])], cssHeight: 260 });
    const fC = h('canvas');
    const fbd = FreeBody(fC, { cssHeight: 260 });
    const graphs = {};
    const wrap = h('div', { class: 'viewer-graphs' });
    o.graphs.forEach((q) => {
      let lo = Math.min(0, ext[q][0], rext[q][0]);
      let hi = Math.max(0, ext[q][1], rext[q][1]);
      if (q === 'v') lo = Math.min(lo, -sim.vT * 1.02);
      if (q === 'a') lo = Math.min(lo, -sim.g);
      const pad = (hi - lo || 1) * 0.1;
      const c = h('canvas');
      const g = window.GraphCanvas.create(c, { quantity: q, cssHeight: 170 });
      g.setFunction((t) => MM.stateAt(sim.motion, Math.min(t, sim.T))[q], T, [lo - pad, hi + pad], window.GraphCanvas.motionBreaks(sim.motion, q));
      graphs[q] = g;
      wrap.appendChild(h('div', { class: 'graph-panel ' + q }, h('h3', null, window.GraphCanvas.LABELS[q].title + ' graph'), c));
    });
    const comm = h('div', { class: 'note' });
    function update(t) {
      const tc = Math.min(t, sim.T);
      stage.render(tc, ref ? { ghostS: MM.stateAt(ref.motion, Math.min(t, ref.T)).s, ghostState: MM.stateAt(ref.motion, Math.min(t, ref.T)), ghostLabel: 'no drag' } : {});
      fbd.render(sim.forcesAt(tc), { drag: true });
      o.graphs.forEach((q) => {
        const hl = q === 'v' ? [{ y: -sim.vT, label: '−vT', color: '#5b6370' }] : q === 'a' ? [{ y: -sim.g, label: '−g', color: '#2b8a3e' }] : [];
        const overlays = ref ? [{ fn: (x) => MM.stateAt(ref.motion, Math.min(x, ref.T))[q], color: '#9aa4b1', width: 2, dash: [6, 5] }] : [];
        graphs[q].render({ cursor: tc, overlays, hlines: hl, markers: sim.apex ? [{ t: sim.apex.t, label: 'top', color: '#173d75' }] : [] });
      });
      const c = commentary(sim, tc);
      comm.textContent = c.title + '. ' + c.text;
    }
    const player = window.Viewer.Player(T, update, { speed: nearestSpeed(T), speeds: [0.25, 0.5, 1, 2, 4, 8, 16] });
    const el = h(
      'div',
      { class: 'viewer' },
      h('div', { class: 'grid-2' }, h('div', { class: 'stage-panel' }, h('h3', null, 'The motion', h('span', { class: 'note' }, 'faded twin: no air resistance')), sC), h('div', { class: 'stage-panel' }, h('h3', null, 'Free-body diagram'), fC)),
      player.el,
      comm,
      wrap
    );
    requestAnimationFrame(() => player.seek(o.at));
    return {
      el,
      player,
      destroy() {
        player.destroy();
        stage.destroy();
        fbd.destroy();
        Object.keys(graphs).forEach((k) => graphs[k].destroy());
      },
    };
  }

  window.DragLab = { FreeBody, commentary, miniLab };
})();
