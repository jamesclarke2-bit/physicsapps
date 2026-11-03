/**
 * Level type C — Draw the Graph (and the Stage 4 "Reverse engineering"
 * levels, where the source is another graph rather than an animation).
 *
 * The student sketches freehand or by placing points. The sketch is
 * marked phase by phase for the physics (sign, gradient direction,
 * curvature) as well as closeness, and the feedback names the time window
 * and the reason when something is wrong.
 */
(function () {
  const { h, feedback, misconceptionCallout, segmented } = window.UI;
  const MM = window.MotionModel;
  const Fmt = window.Fmt;
  const GC = window.GraphCompare;
  const K = window.ActivityKit;
  const N = 120;
  const NAMES = { s: 'displacement–time', v: 'velocity–time', a: 'acceleration–time' };

  /**
   * SketchPad: a GraphCanvas the student can draw on. Returns
   * { el, values(), clear(), reveal(motion, result), destroy }.
   */
  function SketchPad(motion, q, opts) {
    const o = opts || {};
    const c = h('canvas', { 'aria-label': 'Drawing area for your ' + NAMES[q] + ' graph' });
    const graph = window.GraphCanvas.create(c, { quantity: q, cssHeight: o.height || 260 });
    graph.setMotion(motion);
    const T = motion.duration;
    let values = new Array(N).fill(null);
    let vertices = [];
    let mode = q === 's' ? 'free' : 'points';
    let lastIdx = null;
    let locked = false;
    let revealState = {};

    const idx = (t) => Math.max(0, Math.min(N - 1, Math.round((t / T) * (N - 1))));
    function redraw() {
      graph.render(Object.assign({ hideCurve: true, sketch: values, sketchVertices: mode === 'points' ? vertices : null }, revealState));
    }
    graph.onPointer((kind, t, y) => {
      if (locked) return;
      if (mode === 'free') {
        if (kind === 'down') lastIdx = null;
        if (kind === 'down' || kind === 'move') {
          const i = idx(t);
          if (lastIdx !== null && Math.abs(i - lastIdx) > 1) {
            const y0 = values[lastIdx];
            const step = i > lastIdx ? 1 : -1;
            for (let k = lastIdx + step; k !== i; k += step) values[k] = y0 + ((y - y0) * (k - lastIdx)) / (i - lastIdx);
          }
          values[i] = y;
          lastIdx = i;
          redraw();
        }
      } else if (kind === 'down') {
        // snap time to a tidy grid so lines join cleanly
        const snapT = Math.round(t / (T / 40)) * (T / 40);
        vertices = vertices.filter((p) => Math.abs(p[0] - snapT) > T / 80);
        vertices.push([snapT, y]);
        vertices.sort((a, b) => a[0] - b[0]);
        values = GC.sketchFromVertices(vertices, T, N);
        redraw();
      }
    });

    const modeCtl = segmented(
      [
        { value: 'free', label: '✏️ Freehand' },
        { value: 'points', label: '• Points & lines' },
      ],
      (v) => {
        mode = v;
        values = new Array(N).fill(null);
        vertices = [];
        redraw();
      },
      'Drawing mode'
    );
    // reflect the default mode
    requestAnimationFrame(() => {
      const btn = modeCtl.el.children[mode === 'free' ? 0 : 1];
      if (btn) btn.setAttribute('aria-pressed', 'true');
      redraw();
    });
    const undo = h('button', { type: 'button', class: 'btn btn-secondary btn-small' }, '↶ Undo point');
    undo.addEventListener('click', () => {
      if (locked || mode !== 'points') return;
      vertices.pop();
      values = vertices.length ? GC.sketchFromVertices(vertices, T, N) : new Array(N).fill(null);
      redraw();
    });
    const clr = h('button', { type: 'button', class: 'btn btn-secondary btn-small' }, '✕ Clear');
    clr.addEventListener('click', () => {
      if (locked) return;
      values = new Array(N).fill(null);
      vertices = [];
      redraw();
    });
    const tools = h('div', { class: 'draw-tools' }, modeCtl.el, undo, clr);
    const hint = h('p', { class: 'draw-hint' }, 'Freehand: drag across the grid from left to right. Points & lines: tap the corners in order; straight lines join them. Draw over a section to redo it.');
    const el = h('div', { class: 'graph-panel ' + q }, h('h3', null, 'Your ' + NAMES[q] + ' graph'), tools, c, hint);

    return {
      el,
      values: () => values,
      lock() {
        locked = true;
        tools.hidden = true;
        hint.hidden = true;
      },
      reveal(result) {
        const first = result.feedback.find((f) => f.t1 - f.t0 < T * 0.999);
        revealState = { overlays: [{ fn: (t) => MM.stateAt(motion, t)[q], breaks: window.GraphCanvas.motionBreaks(motion, q), color: window.GraphCanvas.COLORS[q], width: 3 }], highlight: first ? [first.t0, first.t1] : null, sketchColor: '#111' };
        redraw();
      },
      destroy: () => graph.destroy(),
    };
  }

  function makeRound(ctx) {
    const R = ctx.rng;
    const cfg = ctx.level.config;
    const sc = K.pickScenario(cfg.tiers, ctx.difficulty, R);
    const m = sc.motion;
    let target;
    let source = null;
    let prompt;
    const parts = [];
    if (cfg.source === 'graph') {
      const pairs = [['v', 's'], ['s', 'v'], ['a', 'v'], ['v', 'a']];
      const pair = pairs[ctx.roundIndex % pairs.length];
      source = pair[0];
      target = pair[1];
      const start = target === 's' ? ' It starts at s = ' + Fmt.signed(m.s0) + ' m.' : target === 'v' && source === 'a' ? ' At t = 0 its velocity is ' + Fmt.signed(m.v0) + ' m/s.' : '';
      prompt = 'Here is the ' + NAMES[source] + ' graph. Sketch the ' + NAMES[target] + ' graph for the same motion.' + start;
    } else {
      const order = ctx.difficulty >= 3 ? ['s', 'v', 'a'] : ['s', 'v'];
      target = order[ctx.roundIndex % order.length];
      prompt = 'Watch the motion, then sketch its ' + NAMES[target] + ' graph.' + (target === 's' ? ' It starts at s = ' + Fmt.signed(m.s0) + ' m.' : '');
    }
    const pad = SketchPad(m, target);
    parts.push(pad);
    const top = h('div');
    if (source) {
      const panel = K.graphPanel(m, source, { height: 220, title: 'Given: ' + NAMES[source] + ' graph' });
      parts.push(panel.graph);
      top.appendChild(panel.el);
    } else {
      const viewer = window.Viewer.MotionViewer(sc, { graphs: [], toggles: false, readouts: false, autoplay: true });
      parts.push(viewer);
      top.appendChild(viewer.el);
    }
    const fbSlot = h('div');
    const checkBtn = h('button', { type: 'button', class: 'btn' }, 'Check my graph');
    checkBtn.addEventListener('click', () => {
      const result = GC.compareSketch(m, target, pad.values());
      if (result.coverage < 0.5) {
        fbSlot.innerHTML = '';
        fbSlot.appendChild(feedback('', 'Keep going', h('p', null, 'Sketch across the whole time axis first — from 0 to ' + Fmt.num(m.duration, 1) + ' s.')));
        return;
      }
      checkBtn.remove();
      pad.lock();
      pad.reveal(result);
      fbSlot.innerHTML = '';
      const pct = Math.round(result.score * 100);
      fbSlot.appendChild(
        feedback(result.pass ? 'ok' : 'no', result.pass ? 'Good sketch! (' + pct + '% match)' : 'Not quite (' + pct + '% match)', [
          h('p', { class: 'note' }, 'The correct graph is now drawn in colour behind your sketch' + (result.feedback.length ? '; the first section to look at is highlighted.' : '.')),
          result.feedback.length ? h('ul', null, result.feedback.map((f) => h('li', null, f.message))) : h('p', null, 'Every phase has the right sign, slope and shape.'),
          result.misconceptions.length ? misconceptionCallout(result.misconceptions[0]) : null,
        ])
      );
      ctx.answered({ correct: result.pass, score: result.pass ? 1 : Math.min(0.6, result.score), misconception: result.misconceptions[0] || null, extraMisconceptions: result.misconceptions.slice(1), questionType: 'draw-' + target, counter: 'sketchesPassed', skills: ctx.level.skills.concat(target === 's' ? ['displacement'] : target === 'v' ? ['velocity'] : ['acceleration']) });
    });
    const el = h(
      'div',
      { class: 'card' },
      h('p', { class: 'scenario-story' }, h('b', null, sc.generated ? 'Mystery motion. ' : sc.title + '. '), sc.generated ? '' : sc.story + ' ', 'Positive is ', h('b', null, sc.pos), '.'),
      h('p', { class: 'prompt' }, prompt),
      h('div', { class: 'grid-2' }, top, pad.el),
      h('div', { class: 'btn-row' }, checkBtn),
      fbSlot
    );
    return { el, destroy: () => parts.forEach((p) => p.destroy()) };
  }

  window.Activities.draw = { makeRound, SketchPad };
})();
