/**
 * Level type A — Match the Motion.
 *
 * The student watches only the animation, then picks the correct
 * displacement–time, velocity–time and acceleration–time graphs from four
 * options each. Every wrong option is built from a specific misconception
 * (sign flipped, speed drawn instead of velocity, "slowing down = negative",
 * acceleration drawn like velocity...) so a wrong pick earns feedback about
 * the exact faulty idea, not just "incorrect".
 */
(function () {
  const { h, feedback, misconceptionCallout, shuffle, clear } = window.UI;
  const MM = window.MotionModel;
  const K = window.ActivityKit;

  const Q_NAMES = { s: 'displacement–time', v: 'velocity–time', a: 'acceleration–time' };

  function tabulate(fn, T, n) {
    const out = [];
    for (let k = 0; k <= n; k++) out.push(fn((T * k) / n));
    return out;
  }

  /** Cumulative integral of |v| (distance travelled so far), as an interpolating function. */
  function distanceFn(motion) {
    const n = 400;
    const T = motion.duration;
    const cum = [0];
    let prev = Math.abs(MM.stateAt(motion, 0).v);
    for (let k = 1; k <= n; k++) {
      const v = Math.abs(MM.stateAt(motion, (T * k) / n).v);
      cum.push(cum[k - 1] + 0.5 * (v + prev) * (T / n));
      prev = v;
    }
    const s0 = motion.s0;
    return (t) => {
      const x = Math.max(0, Math.min(n, (t / T) * n));
      const i = Math.min(n - 1, Math.floor(x));
      const f = x - i;
      return s0 + cum[i] + f * (cum[i + 1] - cum[i]);
    };
  }

  function candidates(sc, q) {
    const m = sc.motion;
    const T = m.duration;
    const st = (t) => MM.stateAt(m, t);
    const F = (t) => st(t)[q];
    const brk = window.GraphCanvas.motionBreaks(m, q);
    const trendSign = (t) => {
      const x = st(t);
      return MM.signOf(x.v * x.a, 1e-9);
    };
    const list = [{ key: 'correct', fn: F, breaks: brk, correct: true }];
    list.push({
      key: 'negate',
      fn: (t) => -F(t),
      breaks: brk,
      why: 'This graph has every sign flipped. Check the direction: positive is ' + sc.pos + '.',
      misconception: q === 's' ? 'gradient-vs-value' : q === 'v' ? 'neg-velocity-slowing' : 'backwards-neg-accel',
    });
    if (q === 's') {
      list.push({ key: 'swap', fn: (t) => st(t).v, breaks: window.GraphCanvas.motionBreaks(m, 'v'), why: 'This is the shape of the VELOCITY graph. The displacement graph’s GRADIENT is the velocity, not its height.', misconception: 'gradient-vs-value' });
      if (MM.reversalTimes(m).length || MM.extents(m).v[0] < -1e-6) list.push({ key: 'distance', fn: distanceFn(m), breaks: [], why: 'This graph never comes back down: it shows DISTANCE travelled. Displacement decreases when the object moves in the negative direction.', misconception: 'displacement-distance' });
    }
    if (q === 'v') {
      if (MM.extents(m).v[0] < -1e-6) list.push({ key: 'speed', fn: (t) => Math.abs(st(t).v), breaks: brk, why: 'This shows SPEED (always positive). Velocity is negative while the object moves ' + sc.neg + '.', misconception: 'speed-velocity' });
      list.push({ key: 'slowneg', fn: (t) => (trendSign(t) < 0 ? -Math.abs(st(t).v) : Math.abs(st(t).v)), breaks: brk, why: 'This graph goes negative whenever the object SLOWS DOWN. But slowing down only means the speed is falling; the sign of velocity is set by the direction of motion.', misconception: 'neg-velocity-slowing' });
      list.push({ key: 'swap', fn: (t) => st(t).s, breaks: [], why: 'This is the shape of the DISPLACEMENT graph.', misconception: 'gradient-vs-value' });
    }
    if (q === 'a') {
      list.push({ key: 'swap', fn: (t) => st(t).v, breaks: window.GraphCanvas.motionBreaks(m, 'v'), why: 'This has the shape of the VELOCITY graph. Acceleration is how fast the velocity changes — the GRADIENT of the v–t graph.', misconception: 'velocity-acceleration-same' });
      list.push({ key: 'trend', fn: (t) => trendSign(t) * Math.abs(st(t).a), breaks: brk, why: 'This graph is positive when the object speeds up and negative when it slows down. But negative acceleration only means "acceleration in the negative direction"; for an object moving ' + sc.neg + ', speeding up needs NEGATIVE acceleration.', misconception: 'neg-accel-deceleration' });
    }
    list.push({ key: 'reverse', fn: (t) => F(T - t), breaks: brk.map((b) => T - b), why: 'This is the right shape played backwards in time. Check what happens at the START of the motion.', misconception: null });
    if (q === 'a') {
      // extra distractors for motions whose acceleration is mostly zero
      list.push({ key: 'const', fn: () => (MM.extents(m).v[1] > 0 ? 1 : -1), breaks: [], why: 'A constant non-zero acceleration would make the velocity keep changing. Check whether the speed actually changes.', misconception: 'velocity-acceleration-same' });
      list.push({ key: 'sshape', fn: (t) => st(t).s, breaks: [], why: 'This is the shape of the DISPLACEMENT graph.', misconception: 'velocity-acceleration-same' });
    }
    return list;
  }

  /** Remove options that look the same as one already kept (so there is only one right answer). */
  function distinct(list, T) {
    const kept = [];
    const tabs = [];
    list.forEach((c) => {
      const tab = tabulate(c.fn, T, 60);
      const span = Math.max(...tab.map(Math.abs), 1e-6);
      const same = tabs.some((other) => {
        const ospan = Math.max(...other.map(Math.abs), 1e-6);
        let err = 0;
        for (let i = 0; i < tab.length; i++) err += Math.abs(tab[i] / span - other[i] / ospan);
        return err / tab.length < 0.08;
      });
      if (!same) {
        kept.push(c);
        tabs.push(tab);
      }
    });
    return kept;
  }

  function rangeOf(fn, T) {
    const tab = tabulate(fn, T, 120);
    let lo = Math.min(0, ...tab);
    let hi = Math.max(0, ...tab);
    if (hi - lo < 1e-6) {
      lo = -1;
      hi = 1;
    }
    const pad = (hi - lo) * 0.12;
    return [lo < 0 ? lo - pad : lo - pad * 0.3, hi > 0 ? hi + pad : hi + pad * 0.3];
  }

  function matchStep(sc, q, R, onDone) {
    const T = sc.motion.duration;
    const all = distinct(candidates(sc, q), T);
    const correct = all[0];
    const wrongs = shuffle(all.slice(1)).slice(0, 3);
    const options = shuffle([correct].concat(wrongs));
    const wrap = h('div');
    const grid = h('div', { class: 'choice-grid', role: 'group', 'aria-label': 'Choose the ' + Q_NAMES[q] + ' graph' });
    const fb = h('div');
    const graphs = [];
    let locked = false;
    options.forEach((opt, i) => {
      const c = h('canvas', { 'aria-label': 'Option ' + 'ABCD'[i] });
      const b = h('button', { type: 'button', class: 'choice' }, h('div', { class: 'choice-label' }, 'Option ' + 'ABCD'[i]), c);
      grid.appendChild(b);
      const g = window.GraphCanvas.create(c, { quantity: q, cssHeight: 140, schematic: true });
      g.setFunction(opt.fn, T, rangeOf(opt.fn, T), opt.breaks);
      requestAnimationFrame(() => g.render({}));
      graphs.push(g);
      b.addEventListener('click', () => {
        if (locked) return;
        locked = true;
        Array.from(grid.children).forEach((bb, k) => {
          bb.disabled = true;
          if (options[k].correct) bb.classList.add('correct');
        });
        if (!opt.correct) b.classList.add('wrong');
        fb.appendChild(
          feedback(opt.correct ? 'ok' : 'no', opt.correct ? 'Correct ' + Q_NAMES[q] + ' graph!' : 'Not that one.', [
            !opt.correct ? h('p', null, opt.why) : null,
            !opt.correct && opt.misconception ? misconceptionCallout(opt.misconception) : null,
          ])
        );
        onDone(!!opt.correct, opt.misconception);
      });
    });
    wrap.appendChild(h('p', { class: 'prompt' }, 'Which is the ' + Q_NAMES[q] + ' graph for this motion?'));
    wrap.appendChild(grid);
    wrap.appendChild(fb);
    return { el: wrap, destroy: () => graphs.forEach((g) => g.destroy()) };
  }

  function makeRound(ctx) {
    const R = ctx.rng;
    const sc = K.pickScenario(ctx.level.config.tiers, ctx.difficulty, R);
    const viewer = window.Viewer.MotionViewer(sc, { graphs: [], toggles: false, readouts: false, autoplay: true, stageOptions: { showArrows: false } });
    const steps = ['s', 'v', 'a'];
    let step = 0;
    let got = 0;
    const misses = [];
    const stepSlot = h('div');
    const doneSlot = h('div');
    let current = null;
    const parts = [];

    function next() {
      if (step >= steps.length) {
        const score = got / steps.length;
        const review = window.Viewer.MotionViewer(sc, { autoplay: true, graphHeight: 160 });
        parts.push(review);
        doneSlot.appendChild(h('h3', null, 'Now watch the motion WITH its graphs'));
        doneSlot.appendChild(review.el);
        ctx.answered({ correct: score === 1, score, misconception: misses[0] || null, extraMisconceptions: misses.slice(1), questionType: 'match', skills: ctx.level.skills });
        return;
      }
      const q = steps[step];
      current = matchStep(sc, q, R, (ok, mis) => {
        if (ok) got++;
        else if (mis) misses.push(mis);
        step++;
        const cont = h('button', { type: 'button', class: 'btn btn-secondary btn-small', style: { marginTop: '0.6rem' } }, step < steps.length ? 'Next graph →' : 'See the answer →');
        cont.addEventListener('click', () => {
          cont.remove();
          clear(stepSlot);
          next();
        });
        current.el.appendChild(cont);
      });
      parts.push(current);
      stepSlot.appendChild(h('p', { class: 'note' }, 'Graph ' + (step + 1) + ' of 3'));
      stepSlot.appendChild(current.el);
    }

    const el = h(
      'div',
      { class: 'card' },
      h('p', { class: 'scenario-story' }, h('b', null, sc.generated ? 'Mystery motion. ' : sc.title + '. '), sc.generated ? 'Watch carefully.' : sc.story, ' Positive is ', h('b', null, sc.pos), '.'),
      viewer.el,
      h('p', { class: 'note' }, 'Replay, pause and slow it down as often as you like. The dots mark equal time intervals.'),
      stepSlot,
      doneSlot
    );
    next();
    return {
      el,
      destroy() {
        viewer.destroy();
        parts.forEach((p) => p.destroy());
      },
    };
  }

  window.Activities.match = { makeRound, candidates, distinct };
})();
