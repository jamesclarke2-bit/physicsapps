/**
 * Reconstruction lab (university preparation).
 *
 * Build a velocity–time graph that satisfies a set of constraints by
 * dragging its corners. Constraint checks update live. Once the design is
 * valid, the student sees other valid designs (most challenges have many
 * answers), answers a reflection question and reads the key insight.
 */
(function () {
  const { h, feedback, clear } = window.UI;
  const RC = window.Reconstruction;
  const Fmt = window.Fmt;

  function pwl(vertices) {
    return (t) => {
      const pts = vertices;
      if (t <= pts[0][0]) return pts[0][1];
      for (let i = 1; i < pts.length; i++) {
        if (t <= pts[i][0]) {
          const [t0, v0] = pts[i - 1];
          const [t1, v1] = pts[i];
          return t1 === t0 ? v1 : v0 + ((t - t0) * (v1 - v0)) / (t1 - t0);
        }
      }
      return pts[pts.length - 1][1];
    };
  }

  function miniGraph(ch, vertices) {
    const c = h('canvas');
    const g = window.GraphCanvas.create(c, { quantity: 'v', cssHeight: 130 });
    g.setFunction(pwl(vertices), ch.T, [ch.vRange[0] - 1, ch.vRange[1] + 1]);
    requestAnimationFrame(() => g.render({ shade: { t0: 0, t1: ch.T } }));
    return { c, g };
  }

  function makeRound(ctx) {
    const ch = RC.CHALLENGES[ctx.roundIndex % RC.CHALLENGES.length];
    let verts = RC.startingVertices(ch);
    const c = h('canvas', { 'aria-label': 'Velocity–time graph you can reshape by dragging its corner points' });
    const graph = window.GraphCanvas.create(c, { quantity: 'v', cssHeight: 300 });
    const range = [ch.vRange[0] - 1, ch.vRange[1] + 1];
    const parts = [graph];
    let dragging = -1;
    let locked = false;
    const checksEl = h('ul', { class: 'bar-list', style: { listStyle: 'none', padding: 0 } });
    const fb = h('div');
    const after = h('div');

    function draw() {
      graph.setFunction(pwl(verts), ch.T, range);
      graph.render({ shade: { t0: 0, t1: ch.T }, points: verts.map((p, i) => ({ t: p[0], y: p[1], color: i === dragging ? '#173d75' : '#2a6bd6', r: 7 })) });
      const res = RC.checkDesign(ch, verts);
      clear(checksEl);
      res.checks.forEach((x) => checksEl.appendChild(h('li', null, h('span', { class: 'verdict ' + (x.ok ? 'ok' : 'no') }, x.ok ? '✓ ' : '✗ '), h('b', null, x.label), ' — ', h('span', { class: 'note' }, x.detail))));
      submit.disabled = !res.valid || locked;
      return res;
    }

    graph.onPointer((kind, t, y) => {
      if (locked) return;
      if (kind === 'down') {
        let best = -1;
        let bestD = 1e9;
        verts.forEach((p, i) => {
          const [px, py] = graph.toPx(p[0], p[1]);
          const [qx, qy] = graph.toPx(t, y);
          const d = Math.hypot(px - qx, py - qy);
          if (d < bestD) {
            bestD = d;
            best = i;
          }
        });
        dragging = bestD < 36 ? best : -1;
      }
      if ((kind === 'down' || kind === 'move') && dragging >= 0) {
        const i = dragging;
        const snapT = Math.round(t * 2) / 2;
        const snapV = Math.round(y * 2) / 2;
        const lo = i === 0 ? 0 : verts[i - 1][0];
        const hi = i === verts.length - 1 ? ch.T : verts[i + 1][0];
        const newT = i === 0 ? 0 : i === verts.length - 1 ? ch.T : Math.max(lo, Math.min(hi, snapT));
        verts[i] = [newT, Math.max(ch.vRange[0], Math.min(ch.vRange[1], snapV))];
        draw();
      }
      if (kind === 'up') {
        dragging = -1;
        draw();
      }
    });

    const submit = h('button', { type: 'button', class: 'btn' }, 'Submit my design');
    const giveUp = h('button', { type: 'button', class: 'btn btn-secondary' }, 'Show me one valid design');
    const reset = h('button', { type: 'button', class: 'btn btn-secondary btn-small' }, '↺ Reset');
    reset.addEventListener('click', () => {
      if (locked) return;
      verts = RC.startingVertices(ch);
      draw();
    });

    function conclude(valid, gaveUp) {
      locked = true;
      submit.disabled = true;
      giveUp.disabled = true;
      reset.disabled = true;
      if (gaveUp) {
        verts = RC.gallery(ch)[0].vertices.map((p) => p.slice());
        draw();
      }
      const gal = h('div', { class: 'grid-3' });
      RC.gallery(ch).forEach((g) => {
        const mg = miniGraph(ch, g.vertices);
        parts.push(mg.g);
        gal.appendChild(h('div', { class: 'graph-panel v' }, h('h3', null, g.label), mg.c));
      });
      const reflect = h('textarea', { class: 'story-box', placeholder: 'Your reasoning (for you and your teacher — not marked)', 'aria-label': ch.question });
      const scoreAndReport = (extraOk) => {
        const ok = valid && !gaveUp && extraOk;
        fb.appendChild(feedback(ok ? 'ok' : 'no', ok ? 'Valid design!' : gaveUp ? 'Here is one valid design.' : 'Design accepted.', [h('p', null, h('b', null, 'Key insight: '), ch.insight)]));
        ctx.answered({ correct: ok, score: ok ? 1 : gaveUp ? 0 : 0.5, questionType: 'reconstruct-' + ch.id, skills: ['reconstruction', 'area', 'alevel'] });
      };
      after.appendChild(h('h3', null, 'Other valid designs'));
      after.appendChild(gal);
      after.appendChild(h('p', { class: 'prompt' }, ch.question));
      after.appendChild(reflect);
      if (ch.ask && !gaveUp) {
        const inp = h('input', { type: 'text', inputmode: 'decimal', 'aria-label': ch.ask.label });
        const go = h('button', { type: 'button', class: 'btn btn-small' }, 'Check');
        go.addEventListener('click', () => {
          const v = Fmt.parseAnswer(inp.value);
          if (!isFinite(v)) return;
          go.disabled = true;
          inp.disabled = true;
          scoreAndReport(Fmt.withinTolerance(v, ch.ask.answer, 0.02));
        });
        after.appendChild(h('div', { class: 'answer-row', style: { marginTop: '0.6rem' } }, h('b', null, ch.ask.label + ' = '), inp, h('span', { class: 'unit' }, ch.ask.unit), go));
      } else scoreAndReport(true);
    }
    submit.addEventListener('click', () => conclude(draw().valid, false));
    giveUp.addEventListener('click', () => conclude(false, true));

    const el = h(
      'div',
      { class: 'card' },
      h('div', { class: 'note' }, 'Challenge ', window.UI.tierTag(ch.tier)),
      h('h2', { style: { marginTop: '0.2rem' } }, ch.title),
      h('p', { class: 'prompt' }, ch.brief),
      h('div', { class: 'graph-panel v' }, h('h3', null, 'Your velocity–time graph — drag the blue corners', reset), c, h('p', { class: 'note' }, 'Teal area counts as positive displacement, red as negative. Corners snap to every 0.5 s and 0.5 m/s.')),
      checksEl,
      h('div', { class: 'btn-row' }, submit, giveUp),
      fb,
      after
    );
    requestAnimationFrame(draw);
    return { el, destroy: () => parts.forEach((p) => p.destroy()) };
  }

  window.Activities.reconstruct = { makeRound };
})();
