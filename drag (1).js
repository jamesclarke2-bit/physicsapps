/**
 * Air resistance — predict first.
 *
 * Ten questions on the ideas students find hardest about something fired up
 * and falling back with air resistance: which way drag acts, why the
 * acceleration is bigger than g on the way up, exactly −g at the top and
 * smaller than g on the way down, why the fall takes longer and ends slower,
 * terminal velocity, and the shapes of the v–t and a–t graphs.
 *
 * The student commits to an answer with nothing moving on screen, then the
 * motion, the live free-body diagram and the graphs are revealed, paused at
 * the moment the question was about.
 */
(function () {
  const { h, choiceList, feedback, misconceptionCallout, shuffle } = window.UI;
  const MM = window.MotionModel;
  const DM = window.DragModel;
  const Fmt = window.Fmt;

  const UPWARD = ['ball', 'bullet', 'shuttle'];
  const ORDER = ['dir-up', 'accel-up', 'top', 'gradient-top', 'down-drag', 'terminal', 'time', 'landing', 'vt-graph', 'at-graph'];

  function thumb(fn, T, q, parts) {
    const c = h('canvas');
    const g = window.GraphCanvas.create(c, { quantity: q, cssHeight: 130, schematic: true });
    const tab = [];
    for (let k = 0; k <= 120; k++) tab.push(fn((T * k) / 120));
    const lo = Math.min(0, ...tab);
    const hi = Math.max(0, ...tab);
    const pad = (hi - lo || 1) * 0.12;
    g.setFunction(fn, T, [lo - pad, hi + pad]);
    requestAnimationFrame(() => g.render({}));
    parts.push(g);
    return c;
  }

  function question(kind, sim, ref, pr, parts) {
    const vT = sim.vT;
    const g = sim.g;
    const top = sim.apex.t;
    const T = sim.T;
    const name = pr.label.split(' ')[0].toLowerCase();
    const it = 'the ' + name;
    switch (kind) {
      case 'dir-up':
        return {
          prompt: 'On its way UP, which way does air resistance act on ' + it + '?',
          options: [
            { label: 'Downwards, the same way as the weight', correct: true },
            { label: 'Upwards, against the weight', why: 'Drag always acts against the motion. Going up, the motion is up, so drag acts DOWN.', misconception: 'drag-direction' },
            { label: 'Neither: there is only drag once it falls', why: 'Drag acts whenever it moves through the air, in either direction.', misconception: 'drag-direction' },
          ],
          explain: 'Air resistance always opposes the velocity. On the way up both the weight and the drag point down.',
          at: top * 0.35,
          skills: ['signs', 'acceleration'],
        };
      case 'accel-up': {
        const a0 = MM.stateAt(sim.motion, 0).a;
        return {
          prompt: 'Just after launch, how big is ' + it + '’s acceleration compared with g (' + Fmt.num(g, 2) + ' m/s²)?',
          options: [
            { label: 'Bigger than g', correct: true },
            { label: 'Exactly g: gravity sets the acceleration', why: 'That is only true with no air resistance. Here drag adds to the weight.', misconception: 'drag-symmetric' },
            { label: 'Smaller than g: drag reduces it', why: 'Drag only reduces the acceleration when it acts against the weight — on the way down.', misconception: 'drag-direction' },
          ],
          explain: 'Resultant = weight + drag (both down), so |a| = resultant ÷ mass is bigger than g. Here a = ' + Fmt.signedUnit(a0, 'm/s²', 1) + ' at launch: ' + Fmt.num(Math.abs(a0) / g, 1) + ' times g.',
          at: 0,
          skills: ['acceleration'],
        };
      }
      case 'top':
        return {
          prompt: 'At the very top, ' + it + ' is momentarily still. What is its acceleration there?',
          options: [
            { label: 'Exactly −g (' + Fmt.signed(-g, 2) + ' m/s²)', correct: true },
            { label: 'Zero, because it is not moving', why: 'Zero velocity is not zero acceleration. The weight still acts, so the velocity is still changing.', misconception: 'top-no-forces' },
            { label: 'Smaller than g, because drag acts upwards there', why: 'Drag depends on speed. At the top the speed is zero, so the drag is zero.', misconception: 'drag-direction' },
          ],
          explain: 'At the top v = 0, so drag (k v²) is zero. The only force is the weight, so a = −g exactly — the one moment the drag motion matches free fall.',
          at: top,
          skills: ['acceleration', 'signs'],
        };
      case 'gradient-top':
        return {
          prompt: 'The v–t graph crosses the time axis at the top. What is its gradient there?',
          options: [
            { label: '−g', correct: true },
            { label: 'Zero: the graph is flat at the top', why: 'Velocity passes straight through zero there; it doesn’t level off. A flat v–t graph would mean zero acceleration.', misconception: 'velocity-acceleration-same' },
            { label: 'Steeper than −g', why: 'It is steeper than −g on the way up, but at the top the drag has gone, leaving just the weight.', misconception: 'drag-direction' },
          ],
          explain: 'Gradient of the v–t graph = acceleration = −g at the top. Before the top the graph is steeper than −g; after it, shallower.',
          at: top,
          skills: ['gradient', 'acceleration'],
        };
      case 'down-drag':
        return {
          prompt: 'On the way down, ' + it + ' speeds up. What happens to the drag force as it does?',
          options: [
            { label: 'It grows, getting closer and closer to the weight', correct: true },
            { label: 'It stays the same', why: 'Drag depends on speed (here k v²), so it grows as the speed grows.', misconception: null },
            { label: 'It gets smaller', why: 'Faster through the air means MORE air resistance.', misconception: null },
          ],
          explain: 'Drag grows with speed. The resultant (weight − drag) shrinks, so the acceleration shrinks too. That is why the v–t graph curves and flattens.',
          at: top + (T - top) * 0.6,
          skills: ['acceleration', 'velocity'],
        };
      case 'terminal':
        return {
          prompt: 'If it fell for long enough to reach terminal velocity, what would the resultant force on it be?',
          options: [
            { label: 'Zero: drag equals the weight', correct: true },
            { label: 'Zero: no forces act any more', why: 'Both forces still act, and they are big. They are equal and opposite, so they cancel.', misconception: 'terminal-no-forces' },
            { label: 'Equal to the weight, downwards', why: 'Then it would still be accelerating at g.', misconception: null },
          ],
          explain: 'At terminal velocity drag = weight, so the resultant is zero and a = 0: constant velocity −vT = ' + Fmt.signed(-vT, 1) + ' m/s. The forces are balanced, not absent.',
          at: T,
          skills: ['acceleration'],
          skydive: true,
        };
      case 'time':
        return {
          prompt: 'Which takes longer: the trip up to the top, or the trip back down?',
          options: [
            { label: 'The trip down', correct: true },
            { label: 'The trip up', why: 'Going up, drag and weight together slow it quickly, so the rise is short.', misconception: 'drag-symmetric' },
            { label: 'They take the same time', why: 'Only without air resistance. Drag breaks the symmetry.', misconception: 'drag-symmetric' },
          ],
          explain: 'Up: ' + Fmt.num(top, 2) + ' s. Down: ' + Fmt.num(T - top, 2) + ' s. Going up, the resultant is MORE than the weight; coming down it is LESS, so it gathers speed more slowly and covers the same height more slowly.',
          at: T,
          skills: ['multistage'],
        };
      case 'landing':
        return {
          prompt: it.charAt(0).toUpperCase() + it.slice(1) + ' is launched at ' + Fmt.num(sim.v0, 0) + ' m/s. How fast is it moving when it gets back down?',
          options: [
            { label: 'Slower than ' + Fmt.num(sim.v0, 0) + ' m/s', correct: true },
            { label: 'Exactly ' + Fmt.num(sim.v0, 0) + ' m/s', why: 'That is the no-drag answer. Drag does work against it the whole way, so it loses kinetic energy.', misconception: 'drag-symmetric' },
            { label: 'Faster than ' + Fmt.num(sim.v0, 0) + ' m/s', why: 'It can’t gain energy: drag only ever takes energy away.', misconception: 'drag-symmetric' },
          ],
          explain: 'It lands at ' + Fmt.unitStr(Math.abs(sim.landing.v), 'm/s', 1) + '. It can never fall faster than its terminal speed, ' + Fmt.unitStr(vT, 'm/s', 1) + '.',
          at: T,
          skills: ['velocity', 'signs'],
        };
      case 'vt-graph': {
        const v = (t) => MM.stateAt(sim.motion, Math.min(t, T)).v;
        const cands = [
          { key: 'correct', fn: v, correct: true },
          { key: 'nodrag', fn: (t) => sim.v0 - ((2 * sim.v0) / T) * t, why: 'A straight line means constant acceleration: that is motion with NO air resistance.', misconception: 'drag-symmetric' },
          { key: 'reverse', fn: (t) => -v(T - t), why: 'This one gets steeper on the way down, as if drag helped it fall. On the way down drag opposes the weight, so the graph gets LESS steep.', misconception: 'drag-direction' },
          { key: 'speed', fn: (t) => Math.abs(v(t)), why: 'This shows SPEED. Velocity is negative on the way down (up is positive).', misconception: 'speed-velocity' },
        ];
        return {
          prompt: 'Which is the velocity–time graph for ' + it + ' (up is positive)?',
          graphOptions: shuffle(cands).map((c) => ({ label: thumb(c.fn, T, 'v', parts), correct: !!c.correct, why: c.why, misconception: c.misconception })),
          explain: 'Steep at first (|a| > g), gradient exactly −g where it crosses zero at the top, then levelling off towards −vT as drag grows.',
          at: top,
          skills: ['velocity', 'gradient'],
        };
      }
      case 'at-graph': {
        const a = (t) => MM.stateAt(sim.motion, Math.min(t, T)).a;
        const v = (t) => MM.stateAt(sim.motion, Math.min(t, T)).v;
        const cands = [
          { key: 'correct', fn: a, correct: true },
          { key: 'const', fn: () => -g, why: 'Constant −g is free fall with no air resistance.', misconception: 'drag-symmetric' },
          { key: 'up', fn: (t) => -g + sim.km * v(t) * v(t), why: 'This treats drag as always acting upwards. Going up, drag acts DOWN, adding to the weight.', misconception: 'drag-direction' },
          { key: 'likev', fn: (t) => (v(t) / sim.v0) * Math.abs(MM.stateAt(sim.motion, 0).a), why: 'This is zero at the top, like the velocity. But at the top the acceleration is −g.', misconception: 'top-no-forces' },
        ];
        return {
          prompt: 'Which is the acceleration–time graph for ' + it + ' (up is positive)?',
          graphOptions: shuffle(cands).map((c) => ({ label: thumb(c.fn, T, 'a', parts), correct: !!c.correct, why: c.why, misconception: c.misconception })),
          explain: 'Always negative (the resultant always points down until terminal velocity), most negative at launch, exactly −g at the top, then rising towards zero.',
          at: top,
          skills: ['acceleration', 'gradient'],
        };
      }
      default:
        return null;
    }
  }

  function makeRound(ctx) {
    const R = ctx.rng;
    const kind = ORDER[ctx.roundIndex % ORDER.length];
    const parts = [];
    const pickId = R.pick(UPWARD);
    let pr = DM.PRESETS.find((p) => p.id === pickId);
    const Q0 = kind === 'terminal';
    if (Q0) pr = DM.PRESETS.find((p) => p.id === 'skydiver');
    const g = 9.81;
    const sim = DM.simulate({ s0: pr.s0, v0: pr.v0, mass: pr.mass, k: DM.kForTerminal(pr.mass, g, pr.vT), g });
    const ref = DM.simulate({ s0: pr.s0, v0: pr.v0, mass: pr.mass, k: 0, g });
    if (!sim.apex) sim.apex = { t: 0, s: pr.s0 };
    const Q = question(kind, sim, ref, pr, parts);
    const fb = h('div');
    const reveal = h('div', { style: { marginTop: '0.8rem' } });
    const onAnswer = (opt) => {
      fb.appendChild(
        feedback(opt.correct ? 'ok' : 'no', opt.correct ? 'Correct!' : 'Not quite.', [
          !opt.correct && opt.why ? h('p', null, opt.why) : null,
          h('p', null, Q.explain),
          !opt.correct && opt.misconception ? misconceptionCallout(opt.misconception) : null,
        ])
      );
      const lab = window.DragLab.miniLab(sim, ref, { at: Q.at, object: pr.object });
      parts.push(lab);
      reveal.appendChild(h('h3', null, 'Now see it — paused at the moment in question. Press play to watch the whole flight.'));
      reveal.appendChild(lab.el);
      ctx.answered({ correct: !!opt.correct, misconception: opt.correct ? null : opt.misconception, questionType: 'drag-' + kind, skills: Q.skills });
    };
    const list = Q.graphOptions ? choiceList(Q.graphOptions, onAnswer, { grid: true }) : choiceList(shuffle(Q.options), onAnswer);
    const el = h(
      'div',
      { class: 'card' },
      h('p', { class: 'scenario-story' }, h('b', null, pr.label + '. '), pr.note, ' Up is positive; g = 9.81 N/kg.'),
      h('p', { class: 'note' }, 'Predict first: nothing moves until you answer.'),
      h('p', { class: 'prompt' }, Q.prompt),
      list,
      fb,
      reveal
    );
    return { el, destroy: () => parts.forEach((p) => p.destroy()) };
  }

  window.Activities.drag = { makeRound, ORDER };
})();
