/**
 * Level type E — Create the Motion.
 *
 * A puzzle: reproduce a target graph by controlling a car with FORWARD
 * thrust (+2 m/s²), REVERSE thrust (−2 m/s²), BRAKE (3 m/s² against the
 * motion, until it stops) and COAST (no acceleration).
 *
 * Two ways to play:
 *   Plan it  – build a program of timed control blocks, then run it (exact).
 *   Drive it – hold the controls in real time and try to trace the target.
 */
(function () {
  const { h, feedback, misconceptionCallout, segmented, clear } = window.UI;
  const MM = window.MotionModel;
  const Fmt = window.Fmt;
  const GC = window.GraphCompare;
  const Scn = window.Scenarios;

  const THRUST = 2;
  const BRAKE = 3;
  const ACTIONS = {
    forward: { label: 'Forward thrust', short: '→ Forward', key: 'ArrowRight' },
    reverse: { label: 'Reverse thrust', short: '← Reverse', key: 'ArrowLeft' },
    brake: { label: 'Brake', short: '■ Brake', key: ' ' },
    coast: { label: 'Coast', short: '○ Coast', key: null },
  };

  /** Turn a program [{ action, duration }] into an exact motion. */
  function programToMotion(program, v0) {
    const segments = [];
    let v = v0 || 0;
    program.forEach((b) => {
      if (b.action === 'brake') {
        if (Math.abs(v) < 1e-9) {
          segments.push({ duration: b.duration, a: 0 });
          return;
        }
        const ts = Math.abs(v) / BRAKE;
        const a = -Math.sign(v) * BRAKE;
        if (ts >= b.duration - 1e-9) {
          segments.push({ duration: b.duration, a });
          v += a * b.duration;
        } else {
          segments.push({ duration: ts, a });
          segments.push({ duration: b.duration - ts, a: 0 });
          v = 0;
        }
        return;
      }
      const a = b.action === 'forward' ? THRUST : b.action === 'reverse' ? -THRUST : 0;
      segments.push({ duration: b.duration, a });
      v += a * b.duration;
    });
    if (!segments.length) segments.push({ duration: 0.001, a: 0 });
    return MM.createMotion({ s0: 0, v0: v0 || 0, segments });
  }

  function targetProgram(difficulty, R) {
    const allowReverse = difficulty >= 2;
    const blocks = [];
    const n = difficulty <= 1 ? 2 : difficulty <= 3 ? 3 : 4;
    let v = 0;
    for (let i = 0; i < n; i++) {
      let choices = ['forward', 'coast', 'brake'];
      if (allowReverse) choices.push('reverse');
      if (i === 0) choices = allowReverse ? ['forward', 'reverse'] : ['forward'];
      if (Math.abs(v) < 1e-9) choices = choices.filter((c) => c !== 'brake' && c !== 'coast');
      const action = R.pick(choices);
      const duration = action === 'brake' ? Math.max(1, Math.round(Math.abs(v) / BRAKE)) : R.int(1, 3);
      blocks.push({ action, duration });
      const mo = programToMotion(blocks, 0);
      v = MM.stateAt(mo, mo.duration).v;
    }
    return blocks;
  }

  function makeRound(ctx) {
    const R = ctx.rng;
    const prog = targetProgram(Math.min(ctx.difficulty + ctx.roundIndex, 5), R);
    const target = programToMotion(prog, 0);
    const T = target.duration;
    const q = ctx.difficulty >= 4 && ctx.roundIndex === ctx.rounds - 1 ? 's' : 'v';
    const ext = MM.extents(target);
    const padRange = (lo, hi) => {
      const span = Math.max(hi - lo, 4);
      return [Math.min(lo, 0) - span * 0.25, Math.max(hi, 0) + span * 0.25];
    };
    const range = q === 'v' ? padRange(Math.min(ext.v[0], -2), Math.max(ext.v[1], 2)) : padRange(ext.s[0], ext.s[1]);
    const tFn = (t) => MM.stateAt(target, t)[q];
    const brk = window.GraphCanvas.motionBreaks(target, q);

    const gC = h('canvas');
    const graph = window.GraphCanvas.create(gC, { quantity: q, cssHeight: 240 });
    graph.setFunction(tFn, T, range, brk);
    const graphPanel = h('div', { class: 'graph-panel ' + q }, h('h3', null, 'Target ' + (q === 'v' ? 'velocity' : 'displacement') + '–time graph (dashed) and yours (black)'), gC);

    const stageSlot = h('div');
    const work = h('div');
    const fbSlot = h('div');
    let stage = null;
    let finished = false;
    let liveTimer = null;
    const parts = [graph];

    function drawGraph(studentFn, upTo) {
      graph.render({
        faint: true,
        overlays: studentFn ? [{ fn: studentFn, upTo, color: '#111', width: 3 }] : [],
      });
    }
    requestAnimationFrame(() => drawGraph(null));

    function showStage(motion) {
      if (stage) stage.destroy();
      clear(stageSlot);
      const sc = Object.assign({}, Scn.HORIZONTAL, { id: 'create', title: 'Your car', object: 'car', motion, story: '' });
      const viewer = window.Viewer.MotionViewer(sc, { graphs: [], toggles: false, readouts: true, autoplay: true, onTick: (t) => drawGraph((tt) => MM.stateAt(motion, tt)[q], t) });
      stage = viewer;
      parts.push(viewer);
      stageSlot.appendChild(viewer.el);
    }

    function judge(values, label) {
      if (finished) return;
      const res = GC.compareSketch(target, q, values);
      // a program that reproduces the target exactly is always a pass
      const maxErr = Math.max(...values.map((y, k) => (y === null ? Infinity : Math.abs(y - tFn((T * k) / (values.length - 1))))));
      const exact = maxErr < 0.25;
      const pass = exact || res.pass;
      finished = true;
      clear(fbSlot);
      fbSlot.appendChild(
        feedback(pass ? 'ok' : 'no', pass ? (exact ? 'Perfect match! 🎯' : 'Close enough — great driving!') : 'Not quite — ' + Math.round(res.score * 100) + '% match', [
          h('p', null, label),
          !pass && res.feedback.length ? h('ul', null, res.feedback.map((f) => h('li', null, f.message))) : null,
          h('p', null, 'The target was: ', h('b', null, prog.map((b) => ACTIONS[b.action].label + ' for ' + b.duration + ' s').join(', then ')), '.'),
          !pass && res.misconceptions.length ? misconceptionCallout(res.misconceptions[0]) : null,
        ])
      );
      ctx.answered({ correct: pass, score: pass ? 1 : Math.min(0.6, res.score), misconception: res.misconceptions[0] || null, questionType: 'create', skills: ctx.level.skills });
    }

    // ---------- Plan it -------------------------------------------------------------
    function planMode() {
      clear(work);
      const program = [];
      const list = h('div', { class: 'program-list', 'aria-label': 'Your program' });
      const timeUsed = h('span', { class: 'note' });
      const durSel = h('select', { 'aria-label': 'Block duration' }, [1, 2, 3, 4, 5].map((d) => h('option', { value: String(d) }, d + ' s')));
      function refresh() {
        clear(list);
        if (!program.length) list.appendChild(h('span', { class: 'note' }, 'Add blocks below to build your program.'));
        program.forEach((b, i) => {
          const rm = h('button', { type: 'button', 'aria-label': 'Remove block' }, '×');
          rm.addEventListener('click', () => {
            program.splice(i, 1);
            refresh();
          });
          list.appendChild(h('span', { class: 'block block-' + b.action }, ACTIONS[b.action].short + ' ' + b.duration + 's', rm));
        });
        const used = program.reduce((s, b) => s + b.duration, 0);
        timeUsed.textContent = 'Time used: ' + used + ' s of ' + Fmt.num(T, 2) + ' s';
        if (program.length) drawGraph((t) => MM.stateAt(programToMotion(program, 0), Math.min(t, programToMotion(program, 0).duration))[q], Math.min(used, T));
        else drawGraph(null);
      }
      const pad = h(
        'div',
        { class: 'control-pad' },
        Object.keys(ACTIONS).map((k) => {
          const b = h('button', { type: 'button', class: k === 'forward' ? 'fwd' : k === 'reverse' ? 'rev' : '' }, ACTIONS[k].short);
          b.addEventListener('click', () => {
            if (finished) return;
            program.push({ action: k, duration: Number(durSel.value) });
            refresh();
          });
          return b;
        })
      );
      const run = h('button', { type: 'button', class: 'btn' }, '▶ Run my program');
      run.addEventListener('click', () => {
        if (!program.length) return;
        const mo = programToMotion(program, 0);
        showStage(mo);
        if (Math.abs(mo.duration - T) > 1e-6) {
          clear(fbSlot);
          fbSlot.appendChild(feedback('', 'Check the timing', h('p', null, 'Your program lasts ' + Fmt.num(mo.duration, 2) + ' s but the target lasts ' + Fmt.num(T, 2) + ' s. Adjust it and run again — this doesn’t count as an attempt.')));
          return;
        }
        const vals = [];
        for (let k = 0; k < 120; k++) vals.push(MM.stateAt(mo, (T * k) / 119)[q]);
        judge(vals, 'You ran: ' + program.map((b) => ACTIONS[b.action].label.toLowerCase() + ' ' + b.duration + ' s').join(' → ') + '.');
      });
      work.appendChild(h('div', { class: 'toggle-row' }, h('label', null, 'Each new block lasts ', durSel), timeUsed));
      work.appendChild(pad);
      work.appendChild(h('p', { class: 'note' }, 'Thrust changes velocity by 2 m/s every second. Braking removes 3 m/s every second until the car stops — then it stays stopped.'));
      work.appendChild(list);
      work.appendChild(h('div', { class: 'btn-row' }, run));
      refresh();
    }

    // ---------- Drive it --------------------------------------------------------------
    function driveMode() {
      clear(work);
      let action = 'coast';
      const buttons = {};
      const pad = h(
        'div',
        { class: 'control-pad' },
        ['reverse', 'brake', 'coast', 'forward'].map((k) => {
          const b = h('button', { type: 'button', class: k === 'forward' ? 'fwd' : k === 'reverse' ? 'rev' : '' }, ACTIONS[k].short);
          const on = (e) => {
            e.preventDefault();
            action = k;
            Object.keys(buttons).forEach((kk) => buttons[kk].classList.toggle('active', kk === k));
          };
          const off = () => {
            if (action === k && k !== 'coast') {
              action = 'coast';
              Object.keys(buttons).forEach((kk) => buttons[kk].classList.toggle('active', kk === 'coast'));
            }
          };
          b.addEventListener('pointerdown', on);
          b.addEventListener('pointerup', off);
          b.addEventListener('pointerleave', off);
          buttons[k] = b;
          return b;
        })
      );
      const keyDown = (e) => {
        const k = Object.keys(ACTIONS).find((x) => ACTIONS[x].key === e.key);
        if (k && liveTimer) {
          e.preventDefault();
          action = k;
          Object.keys(buttons).forEach((kk) => buttons[kk].classList.toggle('active', kk === k));
        }
      };
      const keyUp = (e) => {
        const k = Object.keys(ACTIONS).find((x) => ACTIONS[x].key === e.key);
        if (k && action === k) {
          action = 'coast';
          Object.keys(buttons).forEach((kk) => buttons[kk].classList.toggle('active', kk === 'coast'));
        }
      };
      document.addEventListener('keydown', keyDown);
      document.addEventListener('keyup', keyUp);
      parts.push({ destroy: () => (document.removeEventListener('keydown', keyDown), document.removeEventListener('keyup', keyUp)) });

      const speedSel = h('select', { 'aria-label': 'Game speed' }, [h('option', { value: '0.5' }, 'Half speed'), h('option', { value: '1' }, 'Real time')]);
      const go = h('button', { type: 'button', class: 'btn' }, '▶ Start driving');
      const live = h('div', { class: 'readouts' });
      go.addEventListener('click', () => {
        if (finished || liveTimer) return;
        go.disabled = true;
        const rate = Number(speedSel.value);
        let t = 0;
        let s = 0;
        let v = 0;
        const samples = [[0, 0, 0]];
        let last = null;
        const sc = Object.assign({}, Scn.HORIZONTAL, { id: 'drive', title: 'Your car', object: 'car', story: '', motion: MM.createMotion({ v0: 0, segments: [{ duration: 1 }] }) });
        void sc;
        const step = (now) => {
          const dt = last === null ? 0 : Math.min(now - last, 100) / 1000 * rate;
          last = now;
          const sub = 10;
          for (let i = 0; i < sub; i++) {
            const h2 = dt / sub;
            let a = action === 'forward' ? THRUST : action === 'reverse' ? -THRUST : 0;
            if (action === 'brake') a = Math.abs(v) < 1e-6 ? 0 : -Math.sign(v) * BRAKE;
            const vNew = v + a * h2;
            if (action === 'brake' && v * vNew < 0) {
              s += (v * v) / (2 * BRAKE) * Math.sign(v);
              v = 0;
            } else {
              s += 0.5 * (v + vNew) * h2;
              v = vNew;
            }
            t += h2;
          }
          samples.push([Math.min(t, T), s, v]);
          const interp = (tt) => {
            let i = 1;
            while (i < samples.length && samples[i][0] < tt) i++;
            if (i >= samples.length) return samples[samples.length - 1][q === 's' ? 1 : 2];
            const p0 = samples[i - 1];
            const p1 = samples[i];
            const f = p1[0] === p0[0] ? 0 : (tt - p0[0]) / (p1[0] - p0[0]);
            const idx = q === 's' ? 1 : 2;
            return p0[idx] + f * (p1[idx] - p0[idx]);
          };
          drawGraph(interp, Math.min(t, T));
          live.textContent = 't = ' + Math.min(t, T).toFixed(1) + ' s   v = ' + Fmt.signedUnit(v, 'm/s', 1) + '   s = ' + Fmt.signedUnit(s, 'm', 1);
          if (t >= T) {
            liveTimer = null;
            const vals = [];
            for (let k = 0; k < 120; k++) vals.push(interp((T * k) / 119));
            judge(vals, 'You drove it live.');
            return;
          }
          liveTimer = requestAnimationFrame(step);
        };
        liveTimer = requestAnimationFrame(step);
      });
      parts.push({ destroy: () => liveTimer && cancelAnimationFrame(liveTimer) });
      work.appendChild(h('div', { class: 'toggle-row' }, go, speedSel, h('span', { class: 'note' }, 'Hold a control (or use the ← → arrow keys and space bar). Let go to coast.')));
      work.appendChild(pad);
      work.appendChild(live);
    }

    const modeCtl = segmented(
      [
        { value: 'plan', label: '🧩 Plan it' },
        { value: 'drive', label: '🏎 Drive it live' },
      ],
      (v) => {
        if (finished || liveTimer) return;
        if (v === 'plan') planMode();
        else driveMode();
      },
      'How to play'
    );
    requestAnimationFrame(() => modeCtl.el.children[0].setAttribute('aria-pressed', 'true'));
    planMode();

    const el = h(
      'div',
      { class: 'card' },
      h('p', { class: 'prompt' }, 'Make the car’s ' + (q === 'v' ? 'velocity' : 'displacement') + '–time graph match the target. It starts at rest at s = 0; right is positive.'),
      graphPanel,
      h('div', { class: 'btn-row' }, modeCtl.el),
      work,
      stageSlot,
      fbSlot
    );
    return { el, destroy: () => parts.forEach((p) => p && p.destroy && p.destroy()) };
  }

  window.Activities.create = { makeRound, programToMotion, targetProgram };
})();
