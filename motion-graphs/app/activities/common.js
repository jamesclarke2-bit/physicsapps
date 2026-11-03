/**
 * Helpers shared by the activity modules: choosing a scenario for the
 * current difficulty, choosing a good moment to ask about, building
 * number options with misconception-tagged distractors, and the graph
 * panel used in questions.
 */
(function () {
  const { h, shuffle } = window.UI;
  const MM = window.MotionModel;
  const Fmt = window.Fmt;
  const Scn = window.Scenarios;

  /** Pick a scenario from the level's tiers; harder tier as difficulty rises. Mixes the story library with generated motions. */
  function pickScenario(tiers, difficulty, R, avoid) {
    const idx = Math.min(tiers.length - 1, Math.floor(((difficulty - 1) / 5) * tiers.length));
    const tier = tiers[Math.max(0, idx)];
    const lib = Scn.listScenarios(tier).filter((s) => !(avoid && avoid.has(s.id)));
    if (lib.length && R.next() < 0.7) {
      const sc = R.pick(lib);
      if (avoid) avoid.add(sc.id);
      return sc;
    }
    return Scn.randomScenario(tier, R);
  }

  /** A time well inside a phase (not near any boundary), rounded to a readable value. */
  function momentIn(phase, T) {
    const mid = (phase.t0 + phase.t1) / 2;
    const step = T > 20 ? 1 : 0.5;
    let t = Math.round(mid / step) * step;
    if (t <= phase.t0 + 0.15 * (phase.t1 - phase.t0) || t >= phase.t1 - 0.15 * (phase.t1 - phase.t0)) t = Math.round(mid * 10) / 10;
    return t;
  }

  function longPhases(motion, minFrac) {
    const T = motion.duration;
    return MM.phases(motion).filter((p) => p.t1 - p.t0 >= T * (minFrac || 0.12));
  }

  /** Signed number options: the correct value plus distinct distractors [{ value, why, misconception }]. */
  function numberChoices(correct, unit, distractors, dp) {
    const d = dp === undefined ? 1 : dp;
    const seen = new Set([Fmt.trimNumber(correct, d)]);
    const out = [{ label: Fmt.signedUnit(correct, unit, d), correct: true }];
    distractors.forEach((x) => {
      if (!isFinite(x.value)) return;
      const key = Fmt.trimNumber(x.value, d);
      if (seen.has(key)) return;
      seen.add(key);
      out.push({ label: x.unsigned ? Fmt.unitStr(x.value, unit, d) : Fmt.signedUnit(x.value, unit, d), correct: false, why: x.why, misconception: x.misconception || null });
    });
    return shuffle(out);
  }

  /** A titled graph panel for one quantity of a motion. Returns { el, graph }. */
  function graphPanel(motion, quantity, options) {
    const o = options || {};
    const c = h('canvas');
    const L = window.GraphCanvas.LABELS[quantity];
    const el = h('div', { class: 'graph-panel ' + quantity }, h('h3', null, o.title || L.title + ' graph'), c);
    const graph = window.GraphCanvas.create(c, { quantity, cssHeight: o.height || 230, schematic: !!o.schematic });
    graph.setMotion(motion);
    requestAnimationFrame(() => graph.render(o.state || {}));
    return { el, graph };
  }

  const DIR_LABEL = (sc, d) => (d > 0 ? 'Moving ' + sc.pos + ' (positive direction)' : d < 0 ? 'Moving ' + sc.neg + ' (negative direction)' : 'Not moving');

  window.ActivityKit = { pickScenario, momentIn, longPhases, numberChoices, graphPanel, DIR_LABEL };
})();
