/**
 * Stage 1 — Signs lab.
 *
 * Short animated scenes on a number line. The student decides positions,
 * displacements, distances, velocities, speeds and — the big one — the sign
 * of the acceleration, from the direction of motion and whether the object
 * is speeding up or slowing down. The velocity and acceleration arrows are
 * hidden until the student commits, then revealed as the explanation.
 */
(function () {
  const { h, choiceList, feedback, misconceptionCallout, shuffle } = window.UI;
  const MM = window.MotionModel;
  const Fmt = window.Fmt;
  const Scn = window.Scenarios;

  function scene(frame, object, title, motion) {
    return Object.assign({}, frame, { id: 'signs-' + Math.random(), title, object, motion, tier: 1, story: '' });
  }

  function stageOnly(sc, revealArrows) {
    const viewer = window.Viewer.MotionViewer(sc, { graphs: [], toggles: false, readouts: false, autoplay: true, stageOptions: { showArrows: !!revealArrows } });
    return viewer;
  }

  function numberOptions(correct, distractors, unit) {
    const seen = new Set([Fmt.trimNumber(correct)]);
    const opts = [{ label: Fmt.signedUnit(correct, unit), correct: true }];
    distractors.forEach((d) => {
      const key = Fmt.trimNumber(d.value);
      if (seen.has(key)) return;
      seen.add(key);
      opts.push({ label: d.signless ? Fmt.unitStr(d.value, unit) : Fmt.signedUnit(d.value, unit), correct: false, why: d.why, misconception: d.misconception });
    });
    return shuffle(opts);
  }

  // ---------------------------------------------------------------- question makers
  function positionQ(R) {
    const s0 = R.pick([-6, -4, -2, 0, 2, 4]);
    const v = R.pick([-3, -2, 2, 3]);
    const T = R.pick([2, 3, 4]);
    const s1 = s0 + v * T;
    const sc = scene(Scn.HORIZONTAL, R.pick(['person', 'robot', 'trolley']), 'On the number line', MM.createMotion({ s0, v0: v, segments: [{ duration: T }] }));
    const variant = R.int(0, 2);
    if (variant === 0) {
      return {
        sc,
        prompt: 'Positive is to the right. Where does the object finish? (Its position, measured from s = 0.)',
        options: numberOptions(s1, [{ value: -s1, why: 'Positions to the left of s = 0 are negative; to the right, positive.', misconception: null }, { value: s1 - s0, why: 'That is how far it moved (its displacement), not where it is.', misconception: 'displacement-distance' }, { value: Math.abs(s1 - s0), signless: true, why: 'That is the distance moved.', misconception: 'displacement-distance' }], 'm'),
        explain: 'It finishes at s = ' + Fmt.signed(s1) + ' m: ' + Math.abs(s1) + ' m ' + (s1 < 0 ? 'to the LEFT of' : s1 > 0 ? 'to the right of' : 'exactly at') + ' the zero mark' + (s1 === 0 ? '.' : ', so its position is ' + (s1 < 0 ? 'negative.' : 'positive.')),
        skills: ['signs', 'displacement'],
        qt: 'position',
      };
    }
    if (variant === 1) {
      return {
        sc,
        prompt: 'Positive is to the right. What is the object’s DISPLACEMENT from where it started?',
        options: numberOptions(s1 - s0, [{ value: s1, why: 'That is its final position (measured from s = 0), not its change in position from where it STARTED.', misconception: 'gradient-vs-value' }, { value: s0 - s1, why: 'Displacement = final − initial position. It moved ' + (v < 0 ? 'left, so it is negative.' : 'right, so it is positive.'), misconception: 'neg-velocity-slowing' }], 'm'),
        explain: 'Displacement = final position − starting position = ' + Fmt.signed(s1) + ' − (' + Fmt.signed(s0) + ') = ' + Fmt.signed(s1 - s0) + ' m. The sign shows it moved ' + (v < 0 ? 'left.' : 'right.'),
        skills: ['signs', 'displacement'],
        qt: 'displacement',
      };
    }
    // flip the positive direction
    return {
      sc,
      prompt: 'Its displacement is ' + Fmt.signed(s1 - s0) + ' m with RIGHT as positive. If we had chosen LEFT as positive instead, what would its displacement be?',
      options: numberOptions(s0 - s1, [{ value: s1 - s0, why: 'Changing which direction we call positive flips the sign of every displacement, velocity and acceleration.', misconception: null }, { value: 0, why: 'The object still moved; only the label changes.', misconception: null }], 'm'),
      explain: 'The motion is the same; only our choice of positive direction changed, so every signed quantity flips sign: ' + Fmt.signed(s0 - s1) + ' m. Signs are a choice you must state — then stick to it.',
      skills: ['signs'],
      qt: 'flip',
    };
  }

  function distanceQ(R) {
    const out = R.pick([4, 6, 8, 10]);
    const back = R.pick([2, 4, 6, 12, 14]);
    const sc = scene(Scn.HORIZONTAL, 'dog', 'Out and back', MM.fromDisplacementPoints([[0, 0], [2, out], [3, out], [3 + back / 3, out - back]]));
    const disp = out - back;
    return {
      sc,
      prompt: 'The dog runs ' + out + ' m right, then ' + back + ' m left. What DISTANCE does it travel?',
      options: shuffle([
        { label: Fmt.unitStr(out + back, 'm'), correct: true },
        { label: Fmt.signedUnit(disp, 'm'), correct: false, why: 'That is its displacement (how far from the start it ends up). Distance adds up every metre travelled.', misconception: 'displacement-distance' },
        { label: Fmt.signedUnit(-(out + back), 'm'), correct: false, why: 'Distance is never negative — it has no direction.', misconception: 'speed-velocity' },
      ]),
      explain: 'Distance = ' + out + ' + ' + back + ' = ' + (out + back) + ' m (no sign: distance has no direction). Displacement = ' + Fmt.signed(disp) + ' m.',
      skills: ['displacement', 'signs'],
      qt: 'distance',
    };
  }

  function velocityQ(R) {
    const vertical = R.next() < 0.35;
    const frame = vertical ? Scn.VERTICAL : Scn.HORIZONTAL;
    const speed = R.pick([2, 3, 4, 5]);
    const dir = R.sign();
    const v = dir * speed;
    const sc = scene(frame, vertical ? R.pick(['lift', 'drone']) : R.pick(['car', 'cyclist', 'runner']), 'Steady motion', MM.createMotion({ s0: dir < 0 ? speed * 4 : 0, v0: v, segments: [{ duration: 4 }] }));
    if (R.next() < 0.65) {
      return {
        sc,
        prompt: 'Positive is ' + frame.pos + '. It moves ' + (dir > 0 ? frame.pos : frame.neg) + ' at ' + speed + ' m/s. What is its VELOCITY?',
        options: numberOptions(v, [{ value: -v, why: 'The velocity’s sign is the direction of motion: it moves ' + (dir > 0 ? frame.pos + ', which is positive.' : frame.neg + ', which is negative.'), misconception: 'neg-velocity-slowing' }, { value: 0, why: 'It is moving, so its velocity isn’t zero.', misconception: null }], 'm/s'),
        explain: 'Velocity = speed with a direction: ' + Fmt.signed(v) + ' m/s. The ' + (v < 0 ? 'minus' : 'plus') + ' sign just means "' + (dir > 0 ? frame.pos : frame.neg) + '". It says nothing about speeding up or slowing down.',
        skills: ['signs', 'velocity'],
        qt: 'velocity-sign',
        reveal: true,
      };
    }
    return {
      sc,
      prompt: 'Positive is ' + frame.pos + '. Its velocity is ' + Fmt.signed(v) + ' m/s. What is its SPEED?',
      options: shuffle([
        { label: Fmt.unitStr(speed, 'm/s'), correct: true },
        { label: Fmt.signedUnit(-speed, 'm/s'), correct: false, why: 'Speed is the size of the velocity, so it is never negative.', misconception: 'speed-velocity' },
        { label: Fmt.unitStr(0, 'm/s'), correct: false, why: 'It is moving.', misconception: null },
      ]),
      explain: 'Speed is the magnitude (size) of velocity: ' + speed + ' m/s. Velocity ' + Fmt.signed(v) + ' m/s says the same speed AND the direction.',
      skills: ['signs', 'velocity'],
      qt: 'speed',
      reveal: true,
    };
  }

  /** The heart of Stage 1: the sign of acceleration from direction × (speeding up / slowing down). */
  function accelerationQ(R) {
    const vertical = R.next() < 0.3;
    const frame = vertical ? Scn.VERTICAL : Scn.HORIZONTAL;
    const dir = R.sign();
    const speedingUp = R.next() < 0.5;
    const constant = R.next() < 0.12;
    const aMag = R.pick([1, 2]);
    const u = speedingUp && !constant ? dir * 1 : dir * 6;
    const a = constant ? 0 : speedingUp ? dir * aMag : -dir * aMag;
    const T = constant ? 4 : speedingUp ? 4 : Math.min(4, 5.5 / aMag);
    const s0 = dir < 0 ? 20 : 0;
    const sc = scene(frame, vertical ? 'lift' : R.pick(['car', 'cyclist', 'trolley']), 'Watch the arrows', MM.createMotion({ s0, v0: u, segments: [{ duration: T, a }] }));
    const story = 'Positive is ' + frame.pos + '. It moves ' + (dir > 0 ? frame.pos : frame.neg) + ' and ' + (constant ? 'keeps a constant speed' : speedingUp ? 'speeds up' : 'slows down') + '.';
    const sign = a > 0 ? 'positive' : a < 0 ? 'negative' : 'zero';
    const variant = R.next() < 0.6 ? 'sign' : 'trend';
    if (variant === 'sign') {
      const wrongMis = dir < 0 && a > 0 ? 'backwards-neg-accel' : dir < 0 && a < 0 ? 'neg-accel-slowing' : 'velocity-acceleration-same';
      return {
        sc,
        prompt: story + ' What is the sign of its ACCELERATION?',
        options: ['positive', 'negative', 'zero'].map((x) => ({
          label: x === 'positive' ? 'Positive (+)' : x === 'negative' ? 'Negative (−)' : 'Zero',
          correct: x === sign,
          why: x === 'zero' ? 'Its velocity is changing, so the acceleration is not zero.' : sign === 'zero' ? 'The velocity isn’t changing, so there is no acceleration, whatever direction it moves.' : 'Velocity goes from ' + Fmt.signed(u) + ' towards ' + Fmt.signed(u + a * T) + ' m/s: it ' + (a > 0 ? 'increases' : 'decreases') + ', so a is ' + sign + '.',
          misconception: x === 'zero' ? 'velocity-acceleration-same' : wrongMis,
        })),
        explain: constant
          ? 'Constant speed in a straight line means constant velocity, so a = 0.'
          : 'Rule: SAME signs for v and a → speeding up; OPPOSITE signs → slowing down. Here v is ' + (dir > 0 ? 'positive' : 'negative') + ' and it is ' + (speedingUp ? 'speeding up, so a has the SAME sign: ' : 'slowing down, so a has the OPPOSITE sign: ') + sign + '.',
        skills: ['signs', 'acceleration'],
        qt: 'accel-sign-' + (dir > 0 ? 'p' : 'n') + (speedingUp ? 'u' : 'd'),
        reveal: true,
      };
    }
    const trend = constant ? 'constant' : speedingUp ? 'up' : 'down';
    return {
      sc,
      hideStory: true,
      prompt: 'Positive is ' + frame.pos + '. At the start, v = ' + Fmt.signed(u) + ' m/s and a = ' + Fmt.signed(a) + ' m/s². Is it speeding up, slowing down, or moving at constant speed? (Predict, then watch.)',
      options: [
        { value: 'up', label: 'Speeding up' },
        { value: 'down', label: 'Slowing down' },
        { value: 'constant', label: 'Constant speed' },
      ].map((o) => ({
        label: o.label,
        correct: o.value === trend,
        why: constant ? 'a = 0, so the velocity doesn’t change.' : 'v and a have ' + (u * a > 0 ? 'the SAME sign, so it speeds up.' : 'OPPOSITE signs, so it slows down.'),
        misconception: u < 0 ? (a < 0 ? 'neg-accel-slowing' : 'backwards-neg-accel') : 'neg-accel-deceleration',
      })),
      explain: constant ? 'Zero acceleration: constant velocity.' : 'Compare signs, not sizes: v ' + (u > 0 ? '+' : '−') + ', a ' + (a > 0 ? '+' : '−') + ' → ' + (u * a > 0 ? 'same signs → speeding up.' : 'opposite signs → slowing down.'),
      skills: ['signs', 'acceleration'],
      qt: 'trend-' + (dir > 0 ? 'p' : 'n') + trend,
      reveal: true,
      noAutoplay: true,
    };
  }

  function makeRound(ctx) {
    const R = ctx.rng;
    const topics = ctx.level.config.topics;
    const topic = topics[ctx.roundIndex % topics.length];
    let q;
    if (topic === 'position' || topic === 'displacement') q = positionQ(R);
    else if (topic === 'distance') q = distanceQ(R);
    else if (topic === 'velocity' || topic === 'speed') q = velocityQ(R);
    else q = accelerationQ(R);

    const viewer = window.Viewer.MotionViewer(q.sc, { graphs: [], toggles: false, readouts: false, autoplay: !q.noAutoplay, stageOptions: { showArrows: false } });
    const fbSlot = h('div');
    const el = h(
      'div',
      { class: 'card' },
      h('p', { class: 'prompt' }, q.prompt),
      viewer.el,
      h('p', { class: 'note' }, 'Blue dots mark the object’s position at equal time intervals — wider spacing means faster.'),
      choiceList(q.options, (opt) => {
        if (viewer.stage) viewer.stage.set('showArrows', true);
        if (q.noAutoplay) viewer.player.play();
        fbSlot.appendChild(
          feedback(opt.correct ? 'ok' : 'no', opt.correct ? 'Correct!' : 'Not quite.', [
            !opt.correct && opt.why ? h('p', null, opt.why) : null,
            h('p', null, q.explain),
            q.reveal ? h('p', { class: 'note' }, 'The arrows now show velocity (orange, v) and acceleration (purple, a). Replay to watch them.') : null,
            !opt.correct && opt.misconception ? misconceptionCallout(opt.misconception) : null,
          ])
        );
        ctx.answered({ correct: !!opt.correct, skills: q.skills, misconception: opt.correct ? null : opt.misconception, questionType: q.qt });
      }),
      fbSlot
    );
    return { el, destroy: viewer.destroy };
  }

  window.Activities.signs = { makeRound };
})();
