/* Half-life model: the SINGLE SOURCE OF TRUTH for this app's physics.
   The simulator (app.js), the questions and their marking (questions.js), the worksheet figures, the teacher answers
   and the tests all read this file. Never copy these formulas anywhere else. UMD: window.HalfLifeModel or require().

   ASSUMPTIONS (also in README.md, keep both in step):
   - N = N0 (1/2)^(t/T), activity A = A0 (1/2)^(t/T), A = lambda N with lambda = ln2 / T.
   - Half-lives are rounded GCSE values. Radiation listed is the main type only. 1 year = 365.25 days.
   - A small sample of N nuclei is simulated: each nucleus gets a random decay time -ln(u) T / ln2 (exponential),
     so the whole sample follows the (1/2)^(t/T) curve on average but with scatter (random decay).
   - Count rate = net count rate + background. Background is constant (no random scatter of its own).
   - Reading a time off a graph has a FIXED uncertainty (an amount, not a percentage): a longer interval has a smaller
     percentage uncertainty. Uncertainty of a few readings = half the range; repeating does not shrink it. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.HalfLifeModel = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var LN2 = Math.LN2, YEAR = 365.25 * 86400;

  /* ---------- units ---------- */
  var UNITS = {
    s:   { dim: 'time', f: 1, label: 's', one: 'second', many: 'seconds' },
    min: { dim: 'time', f: 60, label: 'min', one: 'minute', many: 'minutes' },
    h:   { dim: 'time', f: 3600, label: 'h', one: 'hour', many: 'hours' },
    d:   { dim: 'time', f: 86400, label: 'days', one: 'day', many: 'days' },
    y:   { dim: 'time', f: YEAR, label: 'years', one: 'year', many: 'years' },
    My:  { dim: 'time', f: YEAR * 1e6, label: 'million years', one: 'million years', many: 'million years' },
    Gy:  { dim: 'time', f: YEAR * 1e9, label: 'billion years', one: 'billion years', many: 'billion years' },
    Bq:  { dim: 'activity', f: 1, label: 'Bq' }, kBq: { dim: 'activity', f: 1e3, label: 'kBq' },
    MBq: { dim: 'activity', f: 1e6, label: 'MBq' }, GBq: { dim: 'activity', f: 1e9, label: 'GBq' },
    'counts/min': { dim: 'rate', f: 1, label: 'counts/min' }, 'counts/s': { dim: 'rate', f: 60, label: 'counts/s' },
    '': { dim: 'ratio', f: 1, label: '(no unit)' }, '%': { dim: 'ratio', f: 0.01, label: '%' }
  };
  var TIME_UNITS = ['min', 'h', 'd', 'y', 'My', 'Gy'];
  function convert(v, from, to) { return v * UNITS[from].f / UNITS[to].f; }
  function sameDim(a, b) { return UNITS[a] && UNITS[b] && UNITS[a].dim === UNITS[b].dim; }
  function bestUnit(seconds) {
    for (var i = 0; i < TIME_UNITS.length; i++) { var v = seconds / UNITS[TIME_UNITS[i]].f; if (v < 1000) return TIME_UNITS[i]; }
    return 'Gy';
  }

  /* ---------- number formatting (UK style, proper minus, standard form for very big or small) ---------- */
  var SUP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' };
  function supStr(n) { return String(n).split('').map(function (c) { return SUP[c] || c; }).join(''); }
  function sig(x, n) {
    if (x === null || x === undefined || !isFinite(x)) return '–';
    if (x === 0) return '0';
    n = n || 3; var s = Number(x.toPrecision(n)), a = Math.abs(s);
    if (a >= 1e5 || a < 1e-3) {
      var e = Math.floor(Math.log10(a)), m = Number((s / Math.pow(10, e)).toPrecision(n));
      if (Math.abs(m) >= 10) { m /= 10; e += 1; }
      return String(m).replace('-', '−') + ' × 10' + supStr(e);
    }
    return String(s).replace('-', '−');
  }

  /* ---------- isotopes ---------- */
  var ISOTOPES = [
    { id: 'Tc99m', name: 'Technetium-99m', sym: 'Tc-99m', T: 6, unit: 'h', emits: ['gamma'], element: 'technetium' },
    { id: 'I123', name: 'Iodine-123', sym: 'I-123', T: 13, unit: 'h', emits: ['gamma'], element: 'iodine' },
    { id: 'I131', name: 'Iodine-131', sym: 'I-131', T: 8, unit: 'd', emits: ['beta', 'gamma'], element: 'iodine' },
    { id: 'Na24', name: 'Sodium-24', sym: 'Na-24', T: 15, unit: 'h', emits: ['beta', 'gamma'], element: 'sodium' },
    { id: 'P32', name: 'Phosphorus-32', sym: 'P-32', T: 14, unit: 'd', emits: ['beta'], element: 'phosphorus' },
    { id: 'Co60', name: 'Cobalt-60', sym: 'Co-60', T: 5.3, unit: 'y', emits: ['beta', 'gamma'], element: 'cobalt' },
    { id: 'Sr90', name: 'Strontium-90', sym: 'Sr-90', T: 29, unit: 'y', emits: ['beta'], element: 'strontium' },
    { id: 'Cs137', name: 'Caesium-137', sym: 'Cs-137', T: 30, unit: 'y', emits: ['beta', 'gamma'], element: 'caesium' },
    { id: 'Pu238', name: 'Plutonium-238', sym: 'Pu-238', T: 88, unit: 'y', emits: ['alpha'], element: 'plutonium' },
    { id: 'Am241', name: 'Americium-241', sym: 'Am-241', T: 432, unit: 'y', emits: ['alpha'], element: 'americium' },
    { id: 'Ra226', name: 'Radium-226', sym: 'Ra-226', T: 1600, unit: 'y', emits: ['alpha'], element: 'radium' },
    { id: 'C14', name: 'Carbon-14', sym: 'C-14', T: 5730, unit: 'y', emits: ['beta'], element: 'carbon' },
    { id: 'K40', name: 'Potassium-40', sym: 'K-40', T: 1.25, unit: 'Gy', emits: ['beta', 'gamma'], element: 'potassium' },
    { id: 'U238', name: 'Uranium-238', sym: 'U-238', T: 4.5, unit: 'Gy', emits: ['alpha'], element: 'uranium' },
    { id: 'Rn222', name: 'Radon-222', sym: 'Rn-222', T: 3.8, unit: 'd', emits: ['alpha'], element: 'radon' },
    { id: 'Po210', name: 'Polonium-210', sym: 'Po-210', T: 138, unit: 'd', emits: ['alpha'], element: 'polonium' }
  ];
  var ISO = {}; ISOTOPES.forEach(function (i) { ISO[i.id] = i; });
  /* a made-up isotope for questions ("isotope X"): {iso:'custom', T, unit, name} */
  function make(id, T, unit, name) { return { id: id || 'custom', name: name || 'Isotope X', sym: name || 'X', T: T, unit: unit, emits: [], element: '' }; }
  function resolve(src) { return src.iso === 'custom' ? make('custom', src.T, src.unit, src.name) : ISO[src.iso]; }
  function halfLifeSeconds(i) { return i.T * UNITS[i.unit].f; }
  function halfLifeIn(i, unit) { return i.T * UNITS[i.unit].f / UNITS[unit].f; }
  function unitWord(unit, v) { var u = UNITS[unit]; return v === 1 ? u.one : u.many; }
  function halfLifeText(i) { return sig(i.T, 3) + ' ' + unitWord(i.unit, i.T); }
  function radiationText(i) { return i.emits.join(' and '); }
  function lambdaPerSecond(i) { return LN2 / halfLifeSeconds(i); }

  /* ---------- decay maths ---------- */
  function halfLives(t, T) { return t / T; }
  function fraction(t, T) { return Math.pow(0.5, t / T); }
  function after(v0, t, T) { return v0 * fraction(t, T); }
  function nucleiFromActivity(A, i) { return A / lambdaPerSecond(i); }
  function activityFromNuclei(N, i) { return N * lambdaPerSecond(i); }
  /* in the same time unit: true value of the displayed quantity at t, for a source with net start v0 and background bg */
  function displayed(v0, bg, t, T, subtract) { return v0 * fraction(t, T) + (subtract ? 0 : bg); }

  /* ---------- random decay of a small sample (rand = Sim.rng(seed)) ---------- */
  function decayTimes(N, T, rand) {
    var a = new Array(N), i, u;
    for (i = 0; i < N; i++) { u = rand.next(); if (u < 1e-12) u = 1e-12; a[i] = -Math.log(u) * T / LN2; }
    a.sort(function (x, y) { return x - y; });
    return a;
  }
  function decayedBy(times, t) { var lo = 0, hi = times.length, mid; while (lo < hi) { mid = (lo + hi) >> 1; if (times[mid] <= t) lo = mid + 1; else hi = mid; } return lo; }
  function remainingAt(times, t) { return times.length - decayedBy(times, t); }
  /* the time at which the sample first falls to a fraction r of its starting number */
  function crossTime(times, r) {
    var N = times.length, j = N - Math.round(r * N);
    if (j <= 0) return 0; if (j > N) return Infinity; return times[j - 1];
  }
  /* Successive halving times read from the (random) displayed value: 100% to 50%, 50% to 25%, 25% to 12.5%.
     net0 = starting net value, bg = background, subtract = whether the student has subtracted background.
     Without subtraction the displayed value is net + bg, so it halves from net0+bg and never goes below bg:
     the successive "half-lives" get longer: a systematic error. Returns null if a level is below the background. */
  function halvingReadings(times, net0, bg, subtract, k) {
    k = k || 3; var off = subtract ? 0 : bg, D0 = net0 + off, out = [], cross = [], prev = 0, i, level, r, tc;
    for (i = 1; i <= k; i++) {
      level = D0 / Math.pow(2, i); r = (level - off) / net0;
      if (r <= 0) return null;
      tc = crossTime(times, r); cross.push(tc); out.push(tc - prev); prev = tc;
    }
    return { readings: out, crossings: cross };
  }
  /* the exact (no scatter) halving times for the same displayed value: used by tests and the teacher answers */
  function exactHalvingTimes(T, net0, bg, subtract, k) {
    k = k || 3; var off = subtract ? 0 : bg, D0 = net0 + off, out = [], prev = 0, i, r, t;
    for (i = 1; i <= k; i++) { r = (D0 / Math.pow(2, i) - off) / net0; t = T * Math.log(1 / r) / LN2; out.push(t - prev); prev = t; }
    return out;
  }
  /* half-range uncertainty (teaching rule): half the range of the readings */
  function halfRange(vals) { var a = Math.min.apply(null, vals), b = Math.max.apply(null, vals); return (b - a) / 2; }
  function mean(vals) { return vals.reduce(function (s, v) { return s + v; }, 0) / vals.length; }

  /* ---------- isotope-choice jobs ----------
     must: radiation the source must emit; mustNot: radiation it must not emit; element: the chemistry matters.
     keep: at time t at least `min` % must remain. fade: at time t at most `max` % may remain. */
  var SCENARIOS = [
    { id: 'tracer', title: 'Medical tracer for a gamma-camera scan', unit: 'h',
      text: 'A radioactive tracer is injected into a patient. A gamma camera outside the body detects where it goes.',
      must: ['gamma'], mustNot: ['alpha', 'beta'],
      typeWhy: 'Gamma passes out of the body to the camera. Alpha and beta are absorbed inside the body, so they cannot be detected outside and they damage cells.',
      keep: { t: 3, unit: 'h', min: 60, why: 'The scan happens hours after the injection, so enough must still be radioactive.', range: [1, 12, 1], minRange: [10, 95, 5] },
      fade: { t: 48, unit: 'h', max: 5, why: 'The patient should not stay radioactive: very little should be left after two days.', range: [12, 120, 6], maxRange: [1, 30, 1] } },
    { id: 'therapy', title: 'Treating thyroid cancer from inside the body', unit: 'd',
      text: 'A radioactive drink is swallowed. The thyroid gland takes it up and the radiation kills nearby cancer cells.',
      must: ['beta'], mustNot: [],
      typeWhy: 'Beta travels only a few millimetres in tissue, so it damages the cancer cells next to it but little else.',
      element: { name: 'iodine', why: 'The thyroid gland takes up iodine, so the isotope must be an isotope of iodine.' },
      keep: { t: 2, unit: 'd', min: 70, why: 'It takes a day or two for the thyroid to take it up, so most must still be radioactive then.', range: [1, 7, 1], minRange: [10, 95, 5] },
      fade: { t: 60, unit: 'd', max: 2, why: 'It should be almost gone after a couple of months.', range: [20, 120, 10], maxRange: [1, 20, 1] } },
    { id: 'smoke', title: 'Smoke alarm', unit: 'y',
      text: 'A small source inside the alarm ionises the air so a tiny current flows. Smoke lowers the current and sets off the alarm.',
      must: ['alpha'], mustNot: ['beta', 'gamma'],
      typeWhy: 'Alpha ionises the air strongly. It is stopped by a few centimetres of air or a sheet of paper, so it is safe in a home.',
      keep: { t: 10, unit: 'y', min: 95, why: 'The alarm must work for years, so the source must hardly fade.', range: [1, 30, 1], minRange: [50, 99, 1] },
      strong: { max: 1000, unit: 'y', why: 'A source with a very long half-life gives out few particles each second, so it would be too weak for this job.', range: [100, 5000, 100] } },
    { id: 'thickness', title: 'Checking the thickness of paper in a factory', unit: 'y',
      text: 'A source is on one side of the moving paper and a detector on the other. Thicker paper means a lower count rate.',
      must: ['beta'], mustNot: ['alpha', 'gamma'],
      typeWhy: 'Beta is partly absorbed by paper, so the count rate changes with thickness. Alpha is all stopped by paper and gamma passes straight through.',
      keep: { t: 5, unit: 'y', min: 85, why: 'The source must stay at nearly the same activity so the readings stay reliable for years.', range: [1, 20, 1], minRange: [50, 99, 1] },
      strong: { max: 100, unit: 'y', why: 'A source with a very long half-life gives out few particles each second, so it would be too weak for this job.', range: [10, 1000, 10] } },
    { id: 'radiotherapy', title: 'Radiotherapy source outside the body', unit: 'y',
      text: 'A source is shone at a tumour deep in the body from outside. The hospital wants to keep the same source for several years.',
      must: ['gamma'], mustNot: [],
      typeWhy: 'Gamma is very penetrating, so it reaches a tumour deep inside the body from outside.',
      keep: { t: 5, unit: 'y', min: 50, why: 'If it fades too quickly the hospital must replace it often.', range: [1, 15, 1], minRange: [20, 95, 5] },
      strong: { max: 50, unit: 'y', why: 'A source with a very long half-life gives out few particles each second, so it would be too weak for this job.', range: [10, 500, 10] } },
    { id: 'leak', title: 'Finding a leak in an underground pipe', unit: 'h',
      text: 'A tracer is added to the water. Workers walk along the ground above the pipe with a detector to find where it leaks out.',
      must: ['gamma'], mustNot: [],
      typeWhy: 'Gamma passes through soil and the pipe, so it can be detected from the surface.',
      keep: { t: 6, unit: 'h', min: 70, why: 'It must still be strongly radioactive while the workers search.', range: [2, 24, 1], minRange: [20, 95, 5] },
      fade: { t: 7, unit: 'd', max: 1, why: 'After a week it should be almost gone so the water supply is not left radioactive.', range: [2, 30, 1], maxRange: [1, 20, 1] } },
    { id: 'rtg', title: 'Power source for a space probe', unit: 'y',
      text: 'A source heats itself as its radiation is absorbed inside it. The heat is turned into electricity for a probe that travels for many years.',
      must: ['alpha'], mustNot: [],
      typeWhy: 'Alpha is all absorbed inside the source, so all its energy becomes heat, and it needs almost no heavy shielding.',
      keep: { t: 20, unit: 'y', min: 80, why: 'The probe travels for many years, so the source must keep giving out heat.', range: [5, 60, 5], minRange: [40, 95, 5] },
      strong: { max: 200, unit: 'y', why: 'A source with a very long half-life gives out few particles each second, so it would be too weak for this job.', range: [50, 2000, 50] } },
    { id: 'dating_organic', title: 'Dating a wooden boat about 3000 years old', unit: 'y',
      text: 'Living things take in carbon from the air. When the tree died it stopped taking it in and the radioactive carbon began to decay.',
      must: [], mustNot: [],
      typeWhy: '',
      element: { name: 'carbon', why: 'Wood is made from carbon taken in while the tree was alive, so the isotope must be an isotope of carbon.' },
      keep: { t: 3000, unit: 'y', min: 10, why: 'Enough must be left to measure.', range: [500, 20000, 500], minRange: [1, 50, 1] },
      fade: { t: 3000, unit: 'y', max: 90, why: 'Enough must have decayed for the change to be noticed.', range: [500, 20000, 500], maxRange: [50, 99, 1] } },
    { id: 'dating_rock', title: 'Dating a rock about 2 billion years old', unit: 'Gy',
      text: 'Some rocks contain radioactive isotopes that have been decaying since the rock formed.',
      must: [], mustNot: [],
      typeWhy: '',
      keep: { t: 2, unit: 'Gy', min: 10, why: 'Enough must be left to measure.', range: [0.5, 4.5, 0.5], minRange: [1, 50, 1] },
      fade: { t: 2, unit: 'Gy', max: 90, why: 'Enough must have decayed for the change to be noticed.', range: [0.5, 4.5, 0.5], maxRange: [50, 99, 1] } }
  ];
  var SCN = {}; SCENARIOS.forEach(function (s) { SCN[s.id] = s; });
  function defaultTargets(s) {
    return { keepT: s.keep.t, keepMin: s.keep.min, fadeT: s.fade ? s.fade.t : null, fadeMax: s.fade ? s.fade.max : null, strongT: s.strong ? s.strong.max : null };
  }
  function pctLeft(t, tUnit, i) { return 100 * fraction(t * UNITS[tUnit].f, halfLifeSeconds(i)); }
  function stepsLeft(t, tUnit, i) {
    var n = t * UNITS[tUnit].f / halfLifeSeconds(i), f = Math.pow(0.5, n);
    return [['Number of half-lives', 'n = t ÷ T½ = ' + sig(t, 3) + ' ' + UNITS[tUnit].label + ' ÷ ' + halfLifeText(i) + ' = ' + sig(n, 3)],
      ['Fraction left', '(½)^n = (½)^' + sig(n, 3) + ' = ' + sig(f, 3)], ['As a percentage', sig(100 * f, 3) + '%']];
  }
  /* The checks for one isotope in one job. Each check: {key, ok, title, why, steps}. */
  function evaluate(scn, isoId, targets) {
    var i = ISO[isoId], tg = {}, k, checks = [], d = defaultTargets(scn);
    for (k in d) tg[k] = (targets && targets[k] !== undefined && targets[k] !== null) ? targets[k] : d[k];
    if (scn.must.length || scn.mustNot.length) {
      var miss = scn.must.filter(function (r) { return i.emits.indexOf(r) < 0; }), bad = scn.mustNot.filter(function (r) { return i.emits.indexOf(r) >= 0; });
      var okType = !miss.length && !bad.length;
      checks.push({ key: 'type', ok: okType,
        title: okType ? i.sym + ' emits ' + radiationText(i) + ': suitable.' : i.sym + ' emits ' + radiationText(i) + (miss.length ? ' and does not emit ' + miss.join(' or ') : '') + (bad.length ? ', but this job cannot use ' + bad.join(' or ') : '') + ': not suitable.',
        why: scn.typeWhy, steps: null });
    }
    if (scn.element) {
      var okEl = i.element === scn.element.name;
      checks.push({ key: 'element', ok: okEl, title: okEl ? i.sym + ' is an isotope of ' + scn.element.name + ': suitable.' : i.sym + ' is an isotope of ' + i.element + ', not ' + scn.element.name + ': not suitable.', why: scn.element.why, steps: null });
    }
    var p = pctLeft(tg.keepT, scn.keep.unit, i), okK = p >= tg.keepMin;
    checks.push({ key: 'keep', ok: okK, title: 'After ' + sig(tg.keepT, 3) + ' ' + UNITS[scn.keep.unit].label + ', ' + sig(p, 3) + '% is left (target: at least ' + sig(tg.keepMin, 3) + '%).', why: scn.keep.why, steps: stepsLeft(tg.keepT, scn.keep.unit, i) });
    if (scn.fade) {
      var q = pctLeft(tg.fadeT, scn.fade.unit, i), okF = q <= tg.fadeMax;
      checks.push({ key: 'fade', ok: okF, title: 'After ' + sig(tg.fadeT, 3) + ' ' + UNITS[scn.fade.unit].label + ', ' + sig(q, 3) + '% is left (target: at most ' + sig(tg.fadeMax, 3) + '%).', why: scn.fade.why, steps: stepsLeft(tg.fadeT, scn.fade.unit, i) });
    }
    if (scn.strong) {
      var okS = halfLifeSeconds(i) <= tg.strongT * UNITS[scn.strong.unit].f;
      checks.push({ key: 'strong', ok: okS, title: 'Half-life is ' + halfLifeText(i) + ' (target: at most ' + sig(tg.strongT, 3) + ' ' + UNITS[scn.strong.unit].label + ').', why: scn.strong.why, steps: null });
    }
    return checks;
  }
  function passes(scn, isoId, targets) { return evaluate(scn, isoId, targets).every(function (c) { return c.ok; }); }
  function passing(scn, targets) { return ISOTOPES.filter(function (i) { return passes(scn, i.id, targets); }).map(function (i) { return i.id; }); }


  /* ---------- Geiger counter bench: background and counting ---------- */
  /* cfg = {bg: true background (counts/min), src: {iso:'custom',T,unit,name}, net0: source net count rate at t = 0 (counts/min), unit: time unit of the days} */
  function poisson(mean, rand) {
    var L, k, p, u1, u2;
    if (!(mean > 0)) return 0;
    if (mean < 40) { L = Math.exp(-mean); k = 0; p = 1; do { k++; p *= rand.next(); } while (p > L); return k - 1; }
    u1 = Math.max(rand.next(), 1e-12); u2 = rand.next();
    return Math.max(0, Math.round(mean + Math.sqrt(mean) * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)));
  }
  function benchRate(cfg, sourceIn, t) { return cfg.bg + (sourceIn ? cfg.net0 * fraction(t, halfLifeIn(resolve(cfg.src), cfg.unit)) : 0); }
  function benchCount(cfg, sourceIn, t, seconds, rand) { return poisson(benchRate(cfg, sourceIn, t) * seconds / 60, rand); }
  function toCpm(counts, seconds) { return counts * 60 / seconds; }
  return { poisson: poisson, benchRate: benchRate, benchCount: benchCount, toCpm: toCpm, LN2: LN2, YEAR: YEAR, UNITS: UNITS, TIME_UNITS: TIME_UNITS, ISOTOPES: ISOTOPES, ISO: ISO, SCENARIOS: SCENARIOS, SCN: SCN,
    convert: convert, sameDim: sameDim, bestUnit: bestUnit, sig: sig, supStr: supStr, make: make, resolve: resolve,
    halfLifeSeconds: halfLifeSeconds, halfLifeIn: halfLifeIn, halfLifeText: halfLifeText, radiationText: radiationText, unitWord: unitWord, lambdaPerSecond: lambdaPerSecond,
    halfLives: halfLives, fraction: fraction, after: after, nucleiFromActivity: nucleiFromActivity, activityFromNuclei: activityFromNuclei, displayed: displayed,
    decayTimes: decayTimes, decayedBy: decayedBy, remainingAt: remainingAt, crossTime: crossTime, halvingReadings: halvingReadings, exactHalvingTimes: exactHalvingTimes,
    halfRange: halfRange, mean: mean, defaultTargets: defaultTargets, pctLeft: pctLeft, stepsLeft: stepsLeft, evaluate: evaluate, passes: passes, passing: passing };
});
