/* Question bank AND marking for Half-life and Choosing Isotopes. One source for the website (quiz.js), the Word worksheet
   (worksheet/build_data.cjs) and the teacher answers. Every number comes from model.js (never typed twice).
   UMD: window.HalfLifeQuestions or require('./questions.js').

   Text mini-markup (web and Word): **bold**, ^{sup}, _{sub}.

   Part types:
     num     inputs[{id,label,ans,ansUnit,units,tol|abs,marks,ecf(S)}]  numeric, any equivalent unit, follow-through (ecf)
     table   table{rowHead,cols[{head,kind:'given'|'input'}],rows[{label,cells[]}]} cellsPerMark   cells to complete
     written points[{text, alts:[[regex,...],...]}]  a point is made if, for some alt, every regex in that alt matches
     choice  options[{id,label}] correct
   Marking is for practice: written answers are matched against key ideas, so the student can claim a point made in other words. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./model.js'));
  else root.HalfLifeQuestions = factory(root.HalfLifeModel);
})(typeof self !== 'undefined' ? self : this, function (M) {
  var I = M.ISO, sig = M.sig;

  /* ---------- reading what the student typed ---------- */
  var SUPCH = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  function parseNum(str) {
    var s = String(str === null || str === undefined ? '' : str).toLowerCase().replace(/[−–]/g, '-').replace(/\s+/g, ' ').trim();
    if (!s) return { v: NaN };
    s = s.replace(/10([⁻⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g, function (_, p) { return '10^' + p.replace(/⁻/g, '-').replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, function (c) { return SUPCH.indexOf(c); }); });
    s = s.replace(/,(?=\d{3}(\D|$))/g, '');
    var pct = /%/.test(s); s = s.replace(/%/g, '').trim();
    var m = s.match(/^(-?\d*\.?\d+)\s*\/\s*(\d*\.?\d+)/);
    if (m) return { v: parseFloat(m[1]) / parseFloat(m[2]), pct: pct };
    m = s.match(/^(-?\d*\.?\d+)\s*(?:[x×*]|times)\s*10\s*\^?\s*\(?(-?\d+)/);
    if (m) return { v: parseFloat(m[1]) * Math.pow(10, parseInt(m[2], 10)), pct: pct };
    m = s.match(/^10\s*\^\s*(-?\d+)/);
    if (m) return { v: Math.pow(10, parseInt(m[1], 10)), pct: pct };
    m = s.match(/^(-?\d*\.?\d+(?:e[+-]?\d+)?)/);
    if (m) return { v: parseFloat(m[1]), pct: pct };
    return { v: NaN };
  }
  function norm(t) { return String(t || '').toLowerCase().replace(/[‘’]/g, "'").replace(/half[\s-]*(?:life|lives)/g, 'hl').replace(/\s+/g, ' '); }
  /* the student's value of one numeric input, converted into the unit of the model answer */
  function stuValue(inp, a) {
    a = a || {}; var raw = String(a.v === undefined || a.v === null ? '' : a.v).trim();
    if (!raw) return { blank: true, v: NaN };
    var p = parseNum(raw); if (!isFinite(p.v)) return { v: NaN, bad: true };
    var u = a.u || inp.ansUnit || '', v = p.v;
    if (inp.units && p.pct && inp.units.indexOf('%') >= 0) u = '%';
    if (inp.units && inp.ansUnit !== undefined && inp.ansUnit !== null) {
      if (!M.sameDim(u, inp.ansUnit)) return { v: NaN, badUnit: true };
      v = M.convert(v, u, inp.ansUnit);
    } else if (!inp.units && p.pct && inp.ansUnit === '') v = v / 100;
    return { v: v };
  }
  function within(s, e, inp) {
    if (!isFinite(s) || !isFinite(e)) return false;
    if (inp.abs !== undefined && inp.abs !== null) return Math.abs(s - e) <= inp.abs + 1e-9;
    var tol = inp.tol === undefined ? 0.02 : inp.tol; return Math.abs(s - e) <= tol * Math.abs(e) + 1e-12;
  }
  function close(s, e) { return isFinite(s) && e !== 0 && Math.abs(s - e) <= 0.12 * Math.abs(e); }

  /* ---------- builders ---------- */
  function N(id, label, ans, ansUnit, o) { o = o || {}; return { id: id, label: label, ans: ans, ansUnit: ansUnit, units: o.units || null, tol: o.tol, abs: o.abs, marks: o.marks === undefined ? 1 : o.marks, ecf: o.ecf || null, dp: o.dp, note: o.note, free: !!o.free, grp: o.grp || 'main' }; }
  function W(id, text, marks, points, o) { o = o || {}; return { id: id, type: 'written', text: text, marks: marks, points: points, model: o.model, misc: o.misc || [], lines: o.lines }; }
  function P(text, alts) { return { text: text, alts: alts }; }
  var LETTERS = 'ABCDEFGH';
  function candTable(ids) {
    return { head: ['', 'Isotope', 'Radiation', 'Half-life'], rows: ids.map(function (id, k) { var i = I[id]; return [LETTERS[k], i.name, M.radiationText(i), M.halfLifeText(i)]; }) };
  }
  function candOptions(ids) { return ids.map(function (id, k) { return { id: id, label: LETTERS[k] + '  ' + I[id].name }; }); }
  function pct(x) { return sig(x, 3) + '%'; }

  /* ---------- numbers used in the questions (all from the model) ---------- */
  var TC = I.Tc99m, T6 = M.halfLifeIn(TC, 'h');
  var X_T = 8, X_unit = 'd', X_A0 = 640;                       // isotope X in Q3 (iodine-131 data, name hidden)
  var SR = I.Sr90, NA = I.Na24, CO = I.Co60, C14 = I.C14, K40 = I.K40, I131 = I.I131;
  var BG = 20, NET0 = 400, TBG = 1;                              // Q6 and Q16: isotope with half-life 1 day, background 20 counts/min
  var rawAt = function (t) { return Math.round(BG + NET0 * M.fraction(t, TBG)); };
  var Q14T = I.P32;                                              // isotope Y in Q14 (phosphorus-32 data, name hidden)
  var xT = 2, yT = 72;                                           // Q13 half-lives in hours
  function crossXY() { var lo = 0, hi = 60, m, k; for (k = 0; k < 80; k++) { m = (lo + hi) / 2; if (M.fraction(m, xT) * (yT / xT) - M.fraction(m, yT) > 0) lo = m; else hi = m; } return lo; }
  var CROSS = crossXY();

  /* ---------- the questions ---------- */
  var PARTS = { A: { name: 'Part A  Understanding the idea', level: 'Easy' }, B: { name: 'Part B  Calculations', level: 'Medium' },
    C: { name: 'Part C  Choosing and applying', level: 'Hard' }, D: { name: 'Part D  Very challenging', level: 'Very hard' },
    E: { name: 'Part E  Experiment and calculation together (Geiger counter bench)', level: 'Hardest' } };

  var Q = [];

  Q.push({ id: 'q1', part: 'A', title: 'What is half-life?',
    intro: 'Open the simulator and watch the nuclei of technetium-99m (Tc-99m) decay. Each dot is a nucleus.',
    sim: { tab: 'decay', task: 'Press Play and watch the dots. Look at the clock and the graph.', think: 'Predict first: after one half-life, how many dots will be left? Then press Play.',
      state: { unit: 'h', tmax: 36, quantity: 'activity', nGrid: 200, showTheory: false, sources: [{ iso: 'Tc99m', start: 800 }] } },
    hint: 'For (b), think of the single dot that has just decayed. Could you have predicted it? What can you predict?',
    parts: [
      W('a', 'Define the term half-life.', 2, [
        P('the time taken', [[/\btime\b|how long|duration|period/]]),
        P('for the activity or the number of nuclei in a sample to fall to half', [[/half|halv|50 ?%|1\/2|0\.5/, /nucle|atom|activit|count|radioactiv|sample|decay|isotope|material|source|mass|particle/]])],
        { model: 'The time taken for the activity (or the number of undecayed nuclei) of a sample to fall to half of its original value.',
          misc: [{ re: /completely|entire|whole|fully|totally|disappear|all (of )?(the )?(nuclei|atoms|sample)/, msg: 'Half-life is not the time for everything to decay. After one half-life, half of the nuclei are still there.' }] }),
      W('b', 'Explain what is meant by saying that radioactive decay is random.', 2, [
        P('you cannot predict which nucleus will decay, or when', [[/can ?not|can't|impossible|unpredict|not possible|unable|not be able|no way|not know|unknown|uncertain|cannot tell/, /which|when|individual|particular|single|specific|each|one nucle|one atom|a nucle|an atom/], [/by chance|unpredictab|no pattern|no way of (knowing|telling)|impossible to (predict|know|tell)/]]),
        P('but you can predict the proportion of a large number that decay (the half-life)', [[/large number|big number|many|lots|whole sample|overall|on average|average|proportion|fraction|probab|\bhl\b|half|pattern/]])],
        { model: 'You cannot predict which nucleus will decay, or when it will. But for a large number of nuclei you can predict the fraction that decay in a given time (the half-life).' })
    ] });

  Q.push({ id: 'q2', part: 'A', title: 'Halving the activity',
    intro: 'A sample of Tc-99m has a half-life of ' + M.halfLifeText(TC) + '. Its activity at time 0 is 800 Bq.',
    sim: { tab: 'decay', task: 'Drag the clock to 6 h, 12 h, 18 h and 24 h. Read the activity each time.', think: 'Predict first: what will the activity be after 18 hours? Then check with the clock.',
      state: { unit: 'h', tmax: 30, quantity: 'activity', nGrid: 200, showTheory: true, sources: [{ iso: 'Tc99m', start: 800 }] } },
    hint: 'Each half-life the activity halves. n = t ÷ T½.',
    parts: [{ id: 'a', type: 'table', text: 'Complete the table.', marks: 4, cellsPerMark: 2,
      table: { rowHead: 't (h)', cols: [{ head: 'Number of half-lives, n', kind: 'input', dp: 0 }, { head: 'Activity, A (Bq)', kind: 'input', ecfCol: true }],
        rows: [6, 12, 18, 24].map(function (t) { var n = t / T6; return { label: String(t), cells: [n, 800 * M.fraction(t, T6)] }; }) },
      ecf: function (S, row, col) { var n = S.cell(row, 0); return isFinite(n) ? 800 * Math.pow(0.5, n) : NaN; } }] });

  Q.push({ id: 'q3', part: 'A', title: 'Reading a half-life from a graph',
    intro: 'The graph shows how the activity of a sample of isotope X changes with time. At time 0 the activity is ' + X_A0 + ' Bq.',
    figure: 'fig_q3', figureCaption: 'Activity of isotope X.',
    sim: { tab: 'decay', task: 'The half-life of X is hidden. Drag the clock to find when the activity has fallen to half.', think: 'Predict first: when the activity has halved, what will it read? Then find the time.',
      state: { unit: 'd', tmax: 40, quantity: 'activity', nGrid: 500, showTheory: true, sources: [{ iso: 'custom', T: X_T, unit: X_unit, name: 'Isotope X', start: X_A0, mystery: true }] } },
    hint: 'The half-life is the time for 640 Bq to fall to 320 Bq.',
    parts: [{ id: 'a', type: 'num', text: 'Use the graph to find the half-life of X.', marks: 3, inputs: [
      N('a1', 'Half-life of X', X_T, 'd', { units: ['h', 'd', 'y'], abs: 0.5 }),
      N('a2', 'Number of half-lives for the activity to fall from ' + X_A0 + ' Bq to 80 Bq', Math.log2(X_A0 / 80), null, { abs: 0.05 }),
      N('a3', 'Time for the activity to fall to 80 Bq', 3 * X_T, 'd', { units: ['h', 'd', 'y'], tol: 0.03, ecf: function (S) { return S.get('a2') * S.get('a1', 'd'); } })] }] });

  Q.push({ id: 'q4', part: 'B', title: 'Fraction left',
    intro: 'Strontium-90 has a half-life of ' + M.halfLifeText(SR) + '.',
    sim: { tab: 'decay', task: 'Drag the clock to 87 years. The readout shows the fraction left.', think: 'Predict first: after 87 years, will more or less than a quarter be left?',
      state: { unit: 'y', tmax: 120, quantity: 'activity', nGrid: 200, showTheory: true, sources: [{ iso: 'Sr90', start: 800 }] } },
    hint: 'Work out how many half-lives fit into 87 years first.',
    parts: [{ id: 'a', type: 'num', text: 'A sample of strontium-90 is kept for 87 years.', marks: 3, inputs: [
      N('a1', 'Number of half-lives in 87 years', 87 / 29, null, { abs: 0.01 }),
      N('a2', 'Fraction of the strontium-90 left', M.fraction(87, 29), '', { units: ['', '%'], tol: 0.01, ecf: function (S) { return Math.pow(0.5, S.get('a1')); } }),
      N('a3', 'Percentage left', 100 * M.fraction(87, 29), '%', { tol: 0.01, ecf: function (S) { return 100 * Math.pow(0.5, S.get('a1')); } })] }] });

  Q.push({ id: 'q5', part: 'B', title: 'Changing units',
    intro: 'Sodium-24 has a half-life of ' + M.halfLifeText(NA) + '. A sample has an activity of 960 Bq.',
    sim: { tab: 'decay', task: 'Switch the time axis to hours. Find the activity after 2.5 days.', think: 'Predict first: should you work in hours or in days? Why?',
      state: { unit: 'h', tmax: 96, quantity: 'activity', nGrid: 200, showTheory: true, sources: [{ iso: 'Na24', start: 960 }] } },
    hint: 'Use the same unit for the time and for the half-life.',
    parts: [{ id: 'a', type: 'num', text: 'Calculate the activity after 2.5 days.', marks: 3, inputs: [
      N('a1', '2.5 days in hours', 60, 'h', { units: ['h', 'min', 'd'] }),
      N('a2', 'Number of half-lives', 4, null, { abs: 0.01, ecf: function (S) { return S.get('a1', 'h') / 15; } }),
      N('a3', 'Activity after 2.5 days', 960 * M.fraction(60, 15), 'Bq', { units: ['Bq', 'kBq'], tol: 0.01, ecf: function (S) { return 960 * Math.pow(0.5, S.get('a2')); } })] }] });

  Q.push({ id: 'q6', part: 'B', title: 'Background count',
    intro: 'A Geiger counter measures a source. The background count rate is ' + BG + ' counts/min. At the start the reading is ' + rawAt(0) + ' counts/min. After 3 days it is ' + rawAt(3) + ' counts/min.',
    sim: { tab: 'decay', task: 'The detector reading is shown with background. Tick "Subtract background" and see what changes.', think: 'Predict first: should you use the readings as they are, or correct them first?',
      state: { unit: 'd', tmax: 5, quantity: 'count', bg: BG, subtract: false, nGrid: 500, showTheory: true, sources: [{ iso: 'custom', T: TBG, unit: 'd', name: 'Isotope X', start: NET0, mystery: true }] } },
    hint: 'Only the count rate from the source halves. Background does not.',
    parts: [{ id: 'a', type: 'num', text: 'Find the corrected half-life of the source (remove the background first).', marks: 4, inputs: [
      N('a1', 'Net count rate at the start', NET0, 'counts/min', { units: ['counts/min'], tol: 0.01 }),
      N('a2', 'Net count rate after 3 days', rawAt(3) - BG, 'counts/min', { units: ['counts/min'], tol: 0.01 }),
      N('a3', 'Number of half-lives in 3 days', 3, null, { abs: 0.05, ecf: function (S) { return Math.log(S.get('a1') / S.get('a2')) / Math.LN2; } }),
      N('a4', 'Corrected half-life of the source', 1, 'd', { units: ['h', 'd'], tol: 0.03, ecf: function (S) { return 3 / S.get('a3'); } })] }] });

  var SMOKE_C = ['Tc99m', 'Sr90', 'Am241', 'Co60', 'Po210'];
  Q.push({ id: 'q7', part: 'B', title: 'Choosing the smoke-alarm isotope',
    intro: 'A smoke alarm contains a small radioactive source. Its radiation ionises the air inside the alarm. The table shows five isotopes.',
    candidates: candTable(SMOKE_C),
    sim: { tab: 'choose', scenario: 'smoke', task: 'Choose an isotope and read the checks. Change the targets to see what happens.', think: 'Predict first: what type of radiation is needed, and should the half-life be short or long?', state: {} },
    hint: 'Think about what stops each type of radiation, and how long the alarm must work.',
    parts: [
      { id: 'a', type: 'choice', text: 'Which isotope is best for a smoke alarm?', marks: 1, options: candOptions(SMOKE_C), correct: 'Am241' },
      W('b', 'Explain why the radiation from your isotope is suitable.', 2, [
        P('it ionises the air', [[/ioni[sz]/]]),
        P('it is stopped by a few cm of air or by paper, so it is safe in a home', [[/(absorb|stopp|block)/, /air|paper|skin|cm|centimet|case|metal|body|clothes/], [/safe|harmless|not (harm|dangerous)|(can ?not|can't|doesn't|does not|won't) (escape|pass|get out|go through|get through|penetrate)|short range|(low|poor|weak|weakly|not very|least) penetrat/]])],
        { model: 'Alpha radiation ionises the air strongly, so a small current flows. It is stopped by a few centimetres of air or a sheet of paper, so it cannot escape the alarm and is safe in a home.' }),
      W('c', 'Explain why the half-life of your isotope is suitable.', 1, [
        P('it is long (hundreds of years), so the activity hardly changes and the source lasts for years', [[/long (hl|half)|(hl|half).{0,25}(long|large|high|432|years|centuries|hundreds)|(last|lasts|work|working|stay|stays|used).{0,25}(years|long time|decades|centuries)|(not|n't) (need|have) to be (replaced|changed)|constant|hardly (decay|change|fade)|decays? (very )?slowly/]])],
        { model: 'The half-life is very long (432 years), so the activity hardly changes and the alarm works for many years without the source being replaced.' })
    ] });

  var TRACER_C = ['Am241', 'Tc99m', 'I131', 'Co60'];
  Q.push({ id: 'q8', part: 'C', title: 'A medical tracer',
    intro: 'A hospital needs a tracer to show the inside of a patient. It is injected and a gamma camera outside the body makes the image. The table shows four isotopes.',
    candidates: candTable(TRACER_C),
    sim: { tab: 'choose', scenario: 'tracer', task: 'Choose each isotope in turn. Read why it passes or fails.', think: 'Predict first: which type of radiation can be detected outside the body? How long should the half-life be?', state: {} },
    hint: 'Think about which radiation passes out of the body, and how long the patient stays radioactive.',
    parts: [
      { id: 'a', type: 'choice', text: 'Which isotope is best for this tracer?', marks: 1, options: candOptions(TRACER_C), correct: 'Tc99m' },
      W('b', 'Explain why the radiation from your isotope is suitable.', 2, [
        P('gamma passes out of the body so it can be detected by the camera', [[/(pass|go|get|travel|escape|leave|come)(es|s)? ?(out|through)|escapes?|leaves?|penetrat|detect(ed|or)?.{0,30}(outside|camera|scanner)|outside (of )?(the )?body|gamma camera/]]),
        P('alpha and beta would be absorbed in the body (and damage cells)', [[/alpha|beta|particle/, /absorb|stopp|block|trapped|damage|harm|(not|n't) (pass|escape|get)|(can ?not|can't) (pass|escape|get|leave)|short range|few (cm|centimet|mm|milli)/]])],
        { model: 'Gamma rays pass out of the body, so the camera can detect them. Alpha and beta would be absorbed inside the body, so they could not be detected and they would damage cells.' }),
      W('c', 'Explain why the half-life of your isotope is suitable.', 2, [
        P('long enough to carry out the scan', [[/long enough|enough time|time to|scan|examin|imag|carry out|reach|(few|several) hours/]]),
        P('short enough that little is left soon after, so the patient is not radioactive for long', [[/short|quick|soon|rapid|decays? (away|quickly|fast)|(little|less|not much|none|nothing) (is |will be )?(left|remain|remains)|not (stay|remain|be) (radioactive|in)|harm|dose|damage|safe|(patient|person|body).{0,30}(radioactive|exposed)/]])],
        { model: 'The half-life is a few hours (6 hours): long enough to carry out the scan, but short enough that very little is left after a day, so the patient is not radioactive for long.' }),
      { id: 'd', type: 'num', text: 'A patient is given a dose of technetium-99m.', marks: 2, inputs: [
        N('d1', 'Number of half-lives in 24 hours', 24 / T6, null, { abs: 0.01 }),
        N('d2', 'Percentage of the dose left after 24 hours', 100 * M.fraction(24, T6), '%', { tol: 0.02, ecf: function (S) { return 100 * Math.pow(0.5, S.get('d1')); } })] }
    ] });

  Q.push({ id: 'q9', part: 'C', title: 'A radiotherapy source',
    intro: 'A hospital uses a cobalt-60 source (half-life ' + M.halfLifeText(CO) + ') for radiotherapy. The source is replaced when its activity has fallen to 12.5% of its original value.',
    sim: { tab: 'decay', task: 'Find when the activity has fallen to 12.5%. Then find the percentage left after 10 years.', think: 'Predict first: after 10 years (nearly 2 half-lives), will the activity be a little more or a little less than 25%?',
      state: { unit: 'y', tmax: 25, quantity: 'activity', nGrid: 200, showTheory: true, sources: [{ iso: 'Co60', start: 800 }] } },
    hint: '12.5% is one eighth. 1 ÷ 2 ÷ 2 ÷ 2.',
    parts: [{ id: 'a', type: 'num', text: 'Answer both parts.', marks: 4, inputs: [
      N('a1', 'Number of half-lives until 12.5% is left', 3, null, { abs: 0.01, grp: 'g1' }),
      N('a2', 'Time until the source is replaced', 3 * 5.3, 'y', { units: ['y'], tol: 0.02, grp: 'g1', ecf: function (S) { return S.get('a1') * 5.3; } }),
      N('a3', 'Number of half-lives in 10 years', 10 / 5.3, null, { tol: 0.015, grp: 'g2' }),
      N('a4', 'Percentage of the original activity left after 10 years', 100 * M.fraction(10, 5.3), '%', { tol: 0.025, grp: 'g2', ecf: function (S) { return 100 * Math.pow(0.5, S.get('a3')); } })] }] });

  Q.push({ id: 'q10', part: 'C', title: 'Storing waste',
    intro: 'Hospital waste can be thrown away when its activity has fallen to less than 1/1000 of its original value.',
    sim: { tab: 'decay', task: 'Two sources start with the same activity. Drag the clock and watch the percentage left for each.', think: 'Predict first: is 9 half-lives enough for the activity to fall below 1/1000?',
      state: { unit: 'd', tmax: 90, quantity: 'activity', nGrid: 100, showTheory: true, sources: [{ iso: 'Tc99m', start: 1000 }, { iso: 'I131', start: 1000 }] } },
    hint: 'Try (½)^n on a calculator for n = 9 and n = 10. Is it below 0.001?',
    parts: [{ id: 'a', type: 'num', text: 'Find the shortest whole number of half-lives, then the storage times.', marks: 3, inputs: [
      N('a1', 'Whole number of half-lives needed', 10, null, { abs: 0.1, grp: 'g1' }),
      N('a2', 'Storage time for technetium-99m waste (half-life 6 hours)', 60, 'h', { units: ['h', 'd'], tol: 0.02, grp: 'g1', ecf: function (S) { return S.get('a1') * 6; } }),
      N('a3', 'Storage time for iodine-131 waste (half-life 8 days)', 80, 'd', { units: ['h', 'd', 'y'], tol: 0.02, grp: 'g3', ecf: function (S) { return S.get('a1') * 8; } })] },
      W('b', 'Explain why 9 half-lives is not enough.', 1, [
        P('after 9 half-lives 1/512 is left, which is more than 1/1000', [[/512|0\.2 ?%|0\.19|(not|n't) (small|low|enough)|still (above|more|too|higher|greater|over)|too (much|high|big|large)|(more|greater|higher|bigger|larger) than (1\/)?(1000|0\.1)/]])],
        { model: 'After 9 half-lives the fraction left is 1/512, which is more than 1/1000. After 10 half-lives it is 1/1024, which is less than 1/1000.' })] });

  Q.push({ id: 'q11', part: 'C', title: 'Radioactive dating',
    intro: 'A wooden boat is about 3000 years old. Carbon-14 has a half-life of ' + M.halfLifeText(C14) + '. Potassium-40 has a half-life of ' + M.halfLifeText(K40) + '.',
    sim: { tab: 'decay', task: 'Compare carbon-14 and potassium-40 over 12 000 years. Drag the clock to 3000 years.', think: 'Predict first: which isotope will have changed more after 3000 years?',
      state: { unit: 'y', tmax: 12000, quantity: 'activity', nGrid: 100, showTheory: true, sources: [{ iso: 'C14', start: 1000 }, { iso: 'K40', start: 1000 }] } },
    hint: '3000 years is less than one half-life of carbon-14.',
    parts: [{ id: 'a', type: 'num', text: 'Carbon-14 in the boat.', marks: 2, inputs: [
      N('a1', 'Number of half-lives of carbon-14 in 3000 years', 3000 / 5730, null, { tol: 0.03 }),
      N('a2', 'Percentage of the carbon-14 left', 100 * M.fraction(3000, 5730), '%', { tol: 0.015, ecf: function (S) { return 100 * Math.pow(0.5, S.get('a1')); } })] },
      W('b', 'Explain why potassium-40 cannot be used to date the boat.', 2, [
        P('its half-life is far too long', [[/(hl|half).{0,25}(long|large|big|billion|too)|(long|billion).{0,20}(hl|half)|so long|very long|too long/]]),
        P('almost none of it will have decayed in 3000 years, so the change is too small to measure', [[/(not|n't|hardly|barely|very little|little|none|almost no|nothing).{0,30}(decay|decayed|change|changed|left|measur|noticeable)|too (little|small|slow)|won't (decay|change)|too slowly/]])],
        { model: 'Its half-life (1.25 billion years) is far too long. Almost none of the potassium-40 would have decayed in 3000 years, so the change is too small to measure.' }),
      W('c', 'Explain why carbon-14 cannot be used to date a rock that is 2 billion years old.', 1, [
        P('so many half-lives have passed that almost none is left to measure', [[/too (little|small|few)|almost (none|no|nothing)|(none|nothing|very little|little|no).{0,25}(left|remain|carbon|measur|detect)|too many (hl|half)|many (many )?(hl|half)|not enough|(can't|cannot|unable to|impossible to) (be )?(measure|detect)|no carbon|(hl|half).{0,15}too (short|small)/]])],
        { model: 'Millions of half-lives would have passed, so almost no carbon-14 would be left to measure. (Rocks also do not contain carbon taken in by living things.)' })] });

  Q.push({ id: 'q12', part: 'D', title: 'Two isotopes mixed together',
    intro: 'A sample contains two isotopes. At time 0 each has an activity of 1000 Bq: technetium-99m (half-life 6 hours) and iodine-131 (half-life 8 days).',
    figure: 'fig_q12', figureCaption: 'Total activity of the mixture.',
    sim: { tab: 'decay', task: 'Tick "Show the total" to see the mixture. Drag the clock to 24 h.', think: 'Predict first: what will the graph of the total look like? Will it be a smooth single curve with one half-life?',
      state: { unit: 'h', tmax: 96, quantity: 'activity', nGrid: 100, showTheory: true, showMix: true, sources: [{ iso: 'Tc99m', start: 1000 }, { iso: 'I131', start: 1000 }] } },
    hint: 'Work out each isotope separately, then add.',
    parts: [{ id: 'a', type: 'num', text: 'Find the total activity 24 hours later.', marks: 4, inputs: [
      N('a1', 'Number of half-lives of technetium-99m in 24 hours', 4, null, { abs: 0.01 }),
      N('a2', 'Activity of the technetium-99m after 24 hours', 1000 * M.fraction(24, 6), 'Bq', { units: ['Bq'], tol: 0.02, ecf: function (S) { return 1000 * Math.pow(0.5, S.get('a1')); } }),
      N('a3', 'Activity of the iodine-131 after 24 hours', 1000 * M.fraction(24, 8 * 24), 'Bq', { units: ['Bq'], tol: 0.02 }),
      N('a4', 'Total activity after 24 hours', 1000 * M.fraction(24, 6) + 1000 * M.fraction(1, 8), 'Bq', { units: ['Bq'], tol: 0.01, ecf: function (S) { return S.get('a2') + S.get('a3'); } })] },
      W('b', 'Describe and explain the shape of the graph of total activity against time.', 2, [
        P('it falls quickly at first, then more slowly', [[/(quick|fast|rapid|steep|sharp|drop|big fall|decrease|decline|fall).{0,40}(first|start|begin|initial|early)|(first|start|begin|initial|early).{0,40}(quick|fast|rapid|steep|sharp|drop|fall|decrease)|(then|later|after).{0,40}(slow|shallow|gentle|level|flatten|less steep)/]]),
        P('the isotope with the short half-life decays away quickly, leaving the long-lived isotope', [[/(tc|technetium|short|6 ?h|shorter).{0,50}(decay|gone|disappear|decayed|away|decays|finish|quickly)|(i-?131|iodine|long|8 ?d|longer).{0,50}(slow|remain|left|longer|still|decay)|(one|first|short).{0,30}isotope.{0,30}(decay|gone)|two (different )?(isotopes|hl)/]])],
        { model: 'It falls quickly at first, then more slowly. The technetium-99m (short half-life) decays away quickly. After that the activity is almost all from the iodine-131, which decays slowly. So the graph is not a single smooth halving curve.' })] });

  Q.push({ id: 'q13', part: 'D', title: 'Same number of nuclei, different half-lives',
    intro: 'Sample X has a half-life of 2 hours. Sample Y has a half-life of 3 days. At time 0 both samples contain the same number of radioactive nuclei.',
    figure: 'fig_q13', figureCaption: 'Activity of X and Y.',
    sim: { tab: 'decay', task: 'Both samples start with the same number of nuclei. Find when the two activities are equal.', think: 'Predict first: which sample has the greater activity at time 0? Will that stay true?',
      state: { unit: 'h', tmax: 36, quantity: 'activity', equalN: true, nGrid: 100, showTheory: true, sources: [
        { iso: 'custom', T: xT, unit: 'h', name: 'Sample X', start: 1e12 }, { iso: 'custom', T: 3, unit: 'd', name: 'Sample Y', start: 1e12 }] } },
    hint: 'The nuclei of the sample with the shorter half-life decay more quickly. What does that do to the number of decays each second?',
    parts: [
      { id: 'a', type: 'choice', text: 'Which sample has the greater activity at time 0?', marks: 1, options: [{ id: 'X', label: 'Sample X' }, { id: 'Y', label: 'Sample Y' }], correct: 'X' },
      W('b', 'Explain your answer.', 2, [
        P('X has the shorter half-life, so its nuclei decay more quickly', [[/(x|sample x|its).{0,40}(shorter|smaller|less|quicker|faster|short).{0,30}(hl|half)|(shorter|smaller|short|lower).{0,15}(hl|half)|decays? (more )?(quickly|faster|fast)|nuclei decay (more )?(quickly|faster)/]]),
        P('so more nuclei decay each second', [[/more (nuclei|atoms|decays?|particles|radiation|counts).{0,35}(per|each|every|a) (second|sec|time|unit)|higher (rate|decay rate)|greater (rate|proportion)|bigger (proportion|fraction)|(larger|greater|bigger|higher) (proportion|fraction|number of)|(per|each) second|more decays|more nuclei decay|more (often|quickly)/]])],
        { model: 'X has the shorter half-life, so its nuclei decay more quickly. A bigger proportion of its nuclei decay each second, so more decays per second: a greater activity.' }),
      { id: 'c', type: 'num', text: 'Use the simulator graph.', marks: 1, inputs: [
        N('c1', 'Time when the two activities are equal', CROSS, 'h', { units: ['h'], abs: 0.8 })] },
      { id: 'd', type: 'choice', text: 'Which sample has the greater activity after 24 hours?', marks: 1, options: [{ id: 'X', label: 'Sample X' }, { id: 'Y', label: 'Sample Y' }], correct: 'Y' }
    ] });

  Q.push({ id: 'q14', part: 'D', title: 'Measure a half-life',
    intro: 'Isotope Y is unknown. In the Measure tab of the simulator, a random sample of 200 nuclei decays. The tool gives the time for the activity to halve three times in a row. Use the days setting.',
    sim: { tab: 'measure', task: 'Press "New random run" and write down the three halving times. Cross out any anomaly.', think: 'Predict first: will the three halving times be exactly the same? Why not?',
      state: { unit: 'd', tmax: 80, quantity: 'activity', nGrid: 200, showTheory: false, sources: [{ iso: 'custom', T: Q14T.T, unit: Q14T.unit, name: 'Isotope Y', start: 1000, mystery: true }] } },
    hint: 'Uncertainty = half the range = ½ (largest − smallest). Percentage uncertainty = uncertainty ÷ mean × 100.',
    parts: [{ id: 'a', type: 'num', text: 'Enter your three halving times, then work out the result.', marks: 4, inputs: [
      N('a1', 'Halving time 1', Q14T.T, 'd', { units: ['d', 'h'], marks: 0, free: true, grp: 'f' }),
      N('a2', 'Halving time 2', Q14T.T, 'd', { units: ['d', 'h'], marks: 0, free: true, grp: 'f' }),
      N('a3', 'Halving time 3', Q14T.T, 'd', { units: ['d', 'h'], marks: 0, free: true, grp: 'f' }),
      N('a4', 'Mean half-life', null, 'd', { units: ['d', 'h'], tol: 0.01, grp: 'm', ecf: function (S) { return M.mean([S.get('a1'), S.get('a2'), S.get('a3')]); } }),
      N('a5', 'Uncertainty (half the range)', null, 'd', { units: ['d', 'h'], tol: 0.03, grp: 'u', ecf: function (S) { return M.halfRange([S.get('a1'), S.get('a2'), S.get('a3')]); } }),
      N('a6', 'Percentage uncertainty', null, '%', { tol: 0.03, grp: 'p', ecf: function (S) { return 100 * M.halfRange([S.get('a1'), S.get('a2'), S.get('a3')]) / M.mean([S.get('a1'), S.get('a2'), S.get('a3')]); } })],
      extra: function (S) {
        var ok = ['a1', 'a2', 'a3'].every(function (id) { var v = S.get(id); return isFinite(v) && v > 0.4 * Q14T.T && v < 1.6 * Q14T.T; });
        return [{ ok: ok, marks: 1, text: ok ? 'Your three halving times are sensible values.' : 'Each halving time should be close to the half-life. Check the readings you took from the Measure tab.' }];
      } }] });

  Q.push({ id: 'q15', part: 'D', title: 'Reading times from a graph',
    intro: 'Two students use the simulator graph to find the half-life of isotope Z. Each time they read from the graph has an uncertainty of ±1 hour. Student A reads the time for the activity to fall from 800 Bq to 400 Bq: 15 hours. Student B reads the time for it to fall from 800 Bq to 100 Bq: 45 hours.',
    sim: { tab: 'decay', task: 'Find these two times yourself. Which reading is longer?', think: 'Predict first: both students read with the same uncertainty. Whose half-life will have the smaller percentage uncertainty?',
      state: { unit: 'h', tmax: 60, quantity: 'activity', nGrid: 500, showTheory: true, sources: [{ iso: 'Na24', start: 800, mystery: true, name: 'Isotope Z' }] } },
    hint: 'Student B read the time for 3 half-lives. Divide the time and the uncertainty by 3.',
    parts: [{ id: 'a', type: 'num', text: 'Compare the two students.', marks: 4, inputs: [
      N('a1', 'Percentage uncertainty in Student A\'s half-life', 100 * 1 / 15, '%', { tol: 0.04, grp: 'A' }),
      N('a2', 'Student B\'s half-life', 45 / 3, 'h', { units: ['h'], tol: 0.01 }),
      N('a3', 'Uncertainty in Student B\'s half-life', 1 / 3, 'h', { units: ['h'], abs: 0.04, ecf: null }),
      N('a4', 'Percentage uncertainty in Student B\'s half-life', 100 * (1 / 3) / 15, '%', { tol: 0.05, ecf: function (S) { return 100 * S.get('a3') / S.get('a2'); } })] },
      W('b', 'Explain why Student B\'s result has the smaller percentage uncertainty.', 1, [
        P('the reading uncertainty is the same (±1 h) but it is spread over a longer time, so it is a smaller percentage', [[/(same|fixed|constant).{0,40}(uncertainty|error|1 ?h|hour|±)|(longer|bigger|larger|greater).{0,40}(time|interval|measurement|reading|period)|3 (hl|half)|three (hl|half)|divid(e|ed|ing) by 3|(smaller|less|lower).{0,30}(percentage|%|fraction)/]])],
        { model: 'Both readings have the same uncertainty of ±1 hour, but Student B measured a longer time (3 half-lives). The same ±1 hour is a smaller percentage of 45 hours, and dividing by 3 shrinks the uncertainty in the half-life as well.' })] });

  Q.push({ id: 'q16', part: 'D', title: 'Background as a systematic error',
    intro: 'A student measures a source with a Geiger counter. She forgets to subtract the background count rate of ' + BG + ' counts/min. Her readings are in the table.',
    sim: { tab: 'measure', task: 'The tool shows halving times of the detector reading. Compare them with and without "Subtract background".', think: 'Predict first: without subtracting background, will the three halving times be equal? What pattern might you see?',
      state: { unit: 'd', tmax: 5, quantity: 'count', bg: BG, subtract: false, nGrid: 500, showTheory: false, sources: [{ iso: 'custom', T: TBG, unit: 'd', name: 'Isotope X', start: NET0, mystery: true }] } },
    hint: 'Raw reading = net count rate + background.',
    parts: [{ id: 'a', type: 'table', text: 'Complete the table.', marks: 2, cellsPerMark: 2,
      table: { rowHead: 't (days)', cols: [{ head: 'Reading, R (counts/min)', kind: 'given' }, { head: 'Net count rate (counts/min)', kind: 'input' }],
        rows: [0, 1, 2, 3].map(function (t) { return { label: String(t), cells: [rawAt(t), rawAt(t) - BG] }; }) } },
      { id: 'b', type: 'num', text: 'Use your net count rates to find the corrected half-life of the source.', marks: 1, inputs: [N('b1', 'Corrected half-life of the source', 1, 'd', { units: ['h', 'd'], tol: 0.03 })] },
      W('c', 'Explain why the readings, as they are, give a half-life that is too long.', 2, [
        P('background is always there and does not decay', [[/background.{0,60}(constant|always|stays|same|does not|doesn't|never|not (decay|change))|(constant|always|never).{0,30}background|doesn't decay|does not decay|not part of the (source|decay)/]]),
        P('so the reading never falls below background and takes longer to halve', [[/(never|not|can't|cannot).{0,30}(fall|drop|go) (below|under|to zero)|(longer|slower|more slowly|bigger).{0,40}(halve|half)|(halve|half).{0,40}(longer|slower|more slowly)|takes? longer|doesn't halve|not halve|too (high|big|large)/]])],
        { model: 'Background radiation is always present and does not decay. The readings include it, so the reading never falls below the background and takes longer than the true half-life to halve. This is a systematic error: repeating does not remove it. Subtract the background from every reading first.' })] });


  /* ---------- Part E: Geiger counter bench (experiment and calculation together) ---------- */
  var B17 = { bg: 30, unit: 'd', sources: ['Z'], days: [0], distances: [5], absorbers: ['none'], seconds: 60, secondsOptions: [30, 60, 120, 300], view: 'reading' };
  var B19 = { bg: 50, unit: 'd', sources: ['Z'], days: [0, 2, 4, 6, 8], distances: [5], absorbers: ['none'], seconds: 60, secondsOptions: [30, 60, 120, 300], view: 'decay' };
  function readingsOf(S, ids) { var v = ids.map(function (id) { return S.get(id); }).filter(function (x) { return isFinite(x); }); return v.length >= 3 ? v : []; }
  function meanOf(S, ids) { var v = readingsOf(S, ids); return v.length ? M.mean(v) : NaN; }
  function hrOf(S, ids) { var v = readingsOf(S, ids); return v.length ? M.halfRange(v) : NaN; }
  var RID = ['a1', 'a2', 'a3', 'a4', 'a5'];

  Q.push({ id: 'q17', part: 'E', title: 'Measuring the background count rate',
    intro: 'Background radiation comes from rocks, the air, cosmic rays and buildings. It is in every reading from a Geiger counter, so it must be measured before you use a source. In the simulator the source starts next to the Geiger-Müller tube. Set up the bench so that you measure the background only, then count for 1 minute and repeat to take at least three readings (five is better).',
    figure: 'fig_bench', figureCaption: 'The bench: Geiger-Müller tube and counter, with the source in its lead-lined box.',
    sim: { tab: 'bench', task: 'Move the source into its lead-lined box, then press Start count. Repeat for at least three counts. Cross out any anomaly. Write each reading in counts per minute.', think: 'Predict first: with the source put away, will the counter read zero? Will every count be the same?',
      bench: Object.assign({}, B17, { sourceIn: true, secondsOptions: [60], seconds: 60, hideSource: false, note: 'Counts are taken for 1 minute.' }) },
    hint: 'Uncertainty = half the range = ½ (largest − smallest). Percentage uncertainty = uncertainty ÷ mean × 100. If your readings are in the hundreds, is the source still counting?',
    parts: [
      { id: 'a', type: 'num', text: 'Take your background readings (counts per minute) and work out the background count rate.', marks: 4, inputs: [
        N('a1', 'Reading 1 (counts/min)', null, null, { marks: 0, free: true, grp: 'f' }), N('a2', 'Reading 2 (counts/min)', null, null, { marks: 0, free: true, grp: 'f' }),
        N('a3', 'Reading 3 (counts/min)', null, null, { marks: 0, free: true, grp: 'f' }), N('a4', 'Reading 4 (counts/min), if you took one', null, null, { marks: 0, free: true, grp: 'f' }),
        N('a5', 'Reading 5 (counts/min), if you took one', null, null, { marks: 0, free: true, grp: 'f' }),
        N('a6', 'Mean background count rate (counts/min)', null, null, { tol: 0.01, grp: 'm', note: 'about ' + B17.bg + ' counts/min', ecf: function (S) { return meanOf(S, RID); } }),
        N('a7', 'Uncertainty (half the range) (counts/min)', null, null, { tol: 0.03, grp: 'u', note: 'about 5 counts/min', ecf: function (S) { return hrOf(S, RID); } }),
        N('a8', 'Percentage uncertainty', null, '%', { tol: 0.03, grp: 'p', note: 'about 15%', ecf: function (S) { return 100 * hrOf(S, RID) / meanOf(S, RID); } })],
        extra: function (S) {
          var v = readingsOf(S, RID), ok = v.length >= 3 && v.every(function (x) { return x >= 10 && x <= 55; });
          return [{ ok: ok, marks: 1, text: ok ? 'Your readings look like background: a few tens of counts per minute.' : (v.length < 3 ? 'Take at least three readings.' : 'These readings are not background. Is the source still next to the tube? Put it in its lead-lined box and count again.') }];
        } },
      W('b', 'Why must the source be removed (and kept in its lead-lined box, away from the tube) when you measure the background?', 2, [
        P('so that only the background radiation is detected', [[/(only|just|alone).{0,40}(background|natural|surrounding)|background.{0,30}(only|alone)|not.{0,30}(detect|count|measure|pick up|record).{0,30}(source)/]]),
        P('radiation from the source would add to the count and make the background too high', [[/(source|it|radiation).{0,60}(add|extra|increase|more|higher|too high|too big|contribut|affect|interfer)|(add|extra|increase|higher|too high|too big|too many).{0,40}(source|count)/]])],
        { model: 'Only the background radiation should be counted. Radiation from the source would add to the count and make the background rate too high.' }),
      W('c', 'Explain why you repeat the background count.', 3, [
        P('the counts are random so they are not the same each time (repeating shows the spread)', [[/random|differ|vary|varies|not the same|spread|fluctuat|scatter|change/]]),
        P('to spot an anomaly (an odd result) and ignore it', [[/anomal|outlier|odd |unusual|rogue|mistake|stand(s)? out|doesn.t fit/]]),
        P('so you can calculate a mean, which is a better value for the background', [[/mean|average/]])],
        { model: 'Radioactive decay is random, so each count is slightly different. Repeating shows how much the counts vary, lets you spot and ignore an anomaly, and lets you calculate a mean. Repeating does not remove a faulty method, such as leaving the source in place.',
          misc: [{ re: /(reduc|smaller|less|lower).{0,25}(uncertaint|error)|more accurate|accuracy|more precise/, msg: 'Repeating shows the spread, finds anomalies and gives a mean. It does not make the uncertainty in each reading smaller, and it cannot fix a faulty method (such as the source still being near the tube). A longer count reduces the percentage uncertainty.' }] })] });

  Q.push({ id: 'q18', part: 'E', title: 'Short counts or long counts?',
    intro: 'Two students measure the background count rate with the same Geiger counter and no source. Student A counts for 1 minute, three times, and gets 21, 28 and 25 counts. Student B counts for 5 minutes, three times, and gets 118, 131 and 126 counts.',
    sim: { tab: 'bench', task: 'Put the source away. Take three 1-minute counts, then three 5-minute counts. Compare the percentage uncertainties.', think: 'Predict first: which students will have the smaller percentage uncertainty, the 1-minute counts or the 5-minute counts?',
      bench: Object.assign({}, B17, { sourceIn: false, secondsOptions: [60, 300], seconds: 60 }) },
    hint: 'Change Student B\'s counts into counts per minute first (divide by 5).',
    parts: [
      { id: 'a', type: 'num', text: 'Work out each student\'s result in counts per minute.', marks: 6, inputs: [
        N('a1', 'Student A: mean (counts/min)', (21 + 28 + 25) / 3, null, { tol: 0.01, grp: 'A1' }),
        N('a2', 'Student A: uncertainty (half the range) (counts/min)', 3.5, null, { abs: 0.1, grp: 'A2' }),
        N('a3', 'Student A: percentage uncertainty', 100 * 3.5 / ((21 + 28 + 25) / 3), '%', { tol: 0.03, grp: 'A3', ecf: function (S) { return 100 * S.get('a2') / S.get('a1'); } }),
        N('a4', 'Student B: mean (counts/min)', (118 + 131 + 126) / 15, null, { tol: 0.01, grp: 'B1' }),
        N('a5', 'Student B: uncertainty (half the range) (counts/min)', (131 - 118) / 10, null, { abs: 0.05, grp: 'B2' }),
        N('a6', 'Student B: percentage uncertainty', 100 * 1.3 / 25, '%', { tol: 0.03, grp: 'B3', ecf: function (S) { return 100 * S.get('a5') / S.get('a4'); } })] },
      { id: 'b', type: 'choice', text: 'A student says: "Repeating the count makes the background more accurate." Which statement is best?', marks: 1, correct: 'b', options: [
        { id: 'a', label: 'Repeating removes any fault in the method, so the result becomes accurate.' },
        { id: 'b', label: 'Repeating shows how much the counts vary, helps spot anomalies and gives a mean. It cannot remove a faulty method.' },
        { id: 'c', label: 'Repeating makes the uncertainty in each reading smaller.' },
        { id: 'd', label: 'Repeating is not needed because background is the same every minute.' }] },
      W('c', 'Explain why Student B\'s percentage uncertainty is smaller.', 2, [
        P('Student B counted for longer, so recorded a bigger count', [[/longer|5 ?min|five minute|more counts|bigger count|larger count|more time|greater count/]]),
        P('so the random scatter is a smaller percentage of the total', [[/(smaller|less|lower|reduc).{0,40}(percentage|%|fraction|proportion|relative|uncertaint)|(percentage|fraction|proportion).{0,40}(smaller|less|lower)|(scatter|spread|range|difference|variation).{0,60}(small|less)/]])],
        { model: 'Student B counted for longer, so recorded many more counts. The random scatter is then a smaller percentage of the total, so the percentage uncertainty is smaller. A longer measurement reduces the percentage uncertainty.' })] });

  Q.push({ id: 'q19', part: 'E', title: 'Half-life of source Z, with background',
    intro: 'Source Z is a sealed beta source. You will find its half-life with a Geiger counter. Measure the background first (source in its box), then count the source on days 0 and 8 (use the day selector in the simulator). Count for 1 minute, or longer if you want a smaller percentage uncertainty. Give every reading in counts per minute.',
    sim: { tab: 'bench', task: 'First measure the background (source put away, three counts). Then bring the source back and take a count on day 0 and on day 8. Do not use the "show net count rate" box until you have finished.', think: 'Predict first: should you subtract the background from the readings? What would happen to your half-life if you did not?',
      bench: Object.assign({}, B19, { sourceIn: true, hideSource: true }) },
    hint: 'Net count rate = reading − mean background. Number of half-lives n = log₂(net at day 0 ÷ net at day 8). Half-life = 8 days ÷ n.',
    parts: [
      { id: 'a', type: 'num', text: 'Background.', marks: 1, inputs: [
        N('a1', 'Background reading 1 (counts/min)', null, null, { marks: 0, free: true, grp: 'f' }), N('a2', 'Background reading 2 (counts/min)', null, null, { marks: 0, free: true, grp: 'f' }),
        N('a3', 'Background reading 3 (counts/min)', null, null, { marks: 0, free: true, grp: 'f' }),
        N('a4', 'Mean background count rate (counts/min)', null, null, { tol: 0.01, note: 'about ' + B19.bg + ' counts/min', ecf: function (S) { return meanOf(S, ['a1', 'a2', 'a3']); } })] },
      { id: 'b', type: 'num', text: 'Find the corrected half-life of the source.', marks: 6, inputs: [
        N('b1', 'Reading with the source, day 0 (counts/min)', null, null, { marks: 0, free: true, grp: 'f', note: 'about ' + (B19.bg + 1600) + ' counts/min' }),
        N('b2', 'Reading with the source, day 8 (counts/min)', null, null, { marks: 0, free: true, grp: 'f', note: 'about ' + Math.round(B19.bg + 1600 * M.fraction(8, 2)) + ' counts/min' }),
        N('b3', 'Net count rate, day 0 (counts/min)', null, null, { tol: 0.015, grp: 'T', note: 'about 1600 counts/min', ecf: function (S) { return S.get('b1') - S.get('a4'); } }),
        N('b4', 'Net count rate, day 8 (counts/min)', null, null, { tol: 0.015, grp: 'T', note: 'about ' + Math.round(1600 * M.fraction(8, 2)) + ' counts/min', ecf: function (S) { return S.get('b2') - S.get('a4'); } }),
        N('b5', 'Number of half-lives in 8 days', null, null, { tol: 0.04, grp: 'T', note: 'about 4', ecf: function (S) { return Math.log(S.get('b3') / S.get('b4')) / Math.LN2; } }),
        N('b6', 'Corrected half-life of source Z (background subtracted)', null, 'd', { units: ['h', 'd'], tol: 0.03, grp: 'T', note: 'about 2 days', ecf: function (S) { return 8 / S.get('b5'); } }),
        N('b7', 'Half-life you would get if you forgot to subtract the background', null, 'd', { units: ['h', 'd'], tol: 0.03, grp: 'R', note: 'about 2.3 days (too long)', ecf: function (S) { return 8 / (Math.log(S.get('b1') / S.get('b2')) / Math.LN2); } })],
        extra: function (S) {
          var T = S.get('b6', 'd'), ok = isFinite(T) && T > 1.7 && T < 2.25;
          return [{ ok: ok, marks: 1, text: ok ? 'Your half-life is a sensible value.' : 'Your half-life looks wrong. Check that the background was measured with the source away and that you subtracted it from both readings.' }];
        } },
      { id: 'c', type: 'num', text: 'The source is safe to throw away when its net count rate is no more than the background.', marks: 2, inputs: [
        N('c1', 'Number of half-lives until the net count rate falls to the background', null, null, { tol: 0.04, grp: 'S', note: 'about 5', ecf: function (S) { return Math.log(S.get('b3') / S.get('a4')) / Math.LN2; } }),
        N('c2', 'Time until it is safe to throw away', null, 'd', { units: ['h', 'd'], tol: 0.04, grp: 'S', note: 'about 10 days', ecf: function (S) { return S.get('c1') * S.get('b6', 'd'); } })] },
      W('d', 'Explain why the background must be subtracted, and why repeating the readings does not fix the problem if you forget.', 3, [
        P('background is always present, so it is included in every reading', [[/background.{0,60}(always|every|each|all|included|part of|there|present|adds|add)|(always|every|each|all).{0,40}background/]]),
        P('the same error is in every reading, so repeating does not remove it (systematic error)', [[/(repeat|again|more readings|more counts).{0,60}(not|n.t|never|cannot).{0,40}(remove|fix|solve|correct|reduce|get rid|help|cure)|systematic|same (error|mistake|amount)|every (reading|count)/]]),
        P('subtract the mean background from each reading to get the net count rate', [[/subtract|take away|take off|minus|remove the background|net/]])],
        { model: 'Background radiation is always present, so every reading includes it. Forgetting it is a systematic error: the same amount is wrong in every reading, so repeating the readings does not remove it. Subtract the mean background from each reading to get the net count rate from the source.' })] });

  var Z0 = 1600;
  function net(t, T) { return Z0 * M.fraction(t, T); }
  var B20 = { bg: 40, unit: 'd', sources: ['Z'], days: [0, 2, 4, 6, 8, 10], distances: [5], absorbers: ['none'], seconds: 60, secondsOptions: [60, 120, 300], view: 'decay' };
  var D20 = [0, 2, 4, 6, 8, 10];
  Q.push({ id: 'q20', part: 'E', title: 'A whole decay curve, with and without background',
    intro: 'Source Z is a sealed beta source. In the simulator, measure the background first (source in its box). Then bring the source back and use "Reading every day" to take a 1-minute count each second day for 10 days. The graph shows the raw readings. The background does not decay, so the raw readings never fall below it. Tick "Show the net count rate" once you have measured the background to see the curve you should use.',
    sim: { tab: 'bench', task: 'Take at least three background counts with the source in its box. Then press "Reading every day" with the source next to the tube. Compare the raw readings with the net count rate. Write the readings in counts per minute.', think: 'Predict first: will the raw readings ever reach zero? What will the net count rate do?',
      bench: Object.assign({}, B20, { sourceIn: false }) },
    hint: 'Net count rate = reading − mean background. Between day 0 and day 6, n = log₂(net at day 0 ÷ net at day 6). Half-life = 6 days ÷ n.',
    parts: [
      { id: 'a', type: 'num', text: 'Background.', marks: 1, inputs: [
        N('a1', 'Background reading 1 (counts/min)', null, null, { marks: 0, free: true, grp: 'f' }), N('a2', 'Background reading 2 (counts/min)', null, null, { marks: 0, free: true, grp: 'f' }),
        N('a3', 'Background reading 3 (counts/min)', null, null, { marks: 0, free: true, grp: 'f' }),
        N('a4', 'Mean background count rate (counts/min)', null, null, { tol: 0.01, note: 'about ' + B20.bg + ' counts/min', ecf: function (S) { return meanOf(S, ['a1', 'a2', 'a3']); } })] },
      { id: 'b', type: 'table', text: 'Enter each reading from the simulator, then work out the net count rate.', marks: 3, cellsPerMark: 2,
        table: { rowHead: 'Day', cols: [{ head: 'Reading, R (counts/min)', kind: 'input', free: true }, { head: 'Net count rate (counts/min)', kind: 'input', ecfCol: true }],
          rows: D20.map(function (t) { return { label: String(t), cells: [null, net(t, 2)] }; }) },
        ecf: function (CS, row) { return CS.cell(row, 0) - CS.get('a4'); } },
      { id: 'c', type: 'num', text: 'Find the corrected half-life of source Z from day 0 and day 6.', marks: 4, inputs: [
        N('c1', 'Number of half-lives between day 0 and day 6', 3, null, { abs: 0.2, grp: 'T', ecf: function (S) { return Math.log(S.cell('b', 0, 1) / S.cell('b', 3, 1)) / Math.LN2; } }),
        N('c2', 'Corrected half-life of source Z (background subtracted) (days)', null, 'd', { units: ['h', 'd'], tol: 0.04, grp: 'T', note: 'about 2 days', ecf: function (S) { return 6 / S.get('c1'); } }),
        N('c3', 'Half-life if you use the readings without subtracting the background (days)', null, 'd', { units: ['h', 'd'], tol: 0.04, grp: 'R', note: 'about 2.2 days (too long)', ecf: function (S) { return 6 / (Math.log(S.cell('b', 0, 0) / S.cell('b', 3, 0)) / Math.LN2); } }),
        N('c4', 'Percentage by which this half-life is too long', null, '%', { tol: 0.1, grp: 'P', note: 'about 8%', ecf: function (S) { return 100 * (S.get('c3') - S.get('c2')) / S.get('c2'); } })] },
      W('d', 'Describe the shape of the raw readings and of the net count rate, and explain the difference.', 2, [
        P('the raw readings fall, then level off at the background level and never reach zero', [[/(level|flatten|plateau|flat|constant|stop|never|not (fall|drop|go)|can.t|cannot|won.t).{0,70}(background|zero|0\b|below)|(background|zero).{0,60}(level|flat|never|constant|stop)/]]),
        P('the net count rate keeps halving towards zero because the background has been subtracted', [[/net|subtract|correct|take away|minus|taking off/, /zero|halv|half|exponential|keeps falling|continu|decay/]])],
        { model: 'The raw readings fall, then level off at the background count rate because background does not decay, so they never reach zero. After subtracting the background, the net count rate keeps halving every half-life and falls towards zero.' })] });

  var BD = 30, DIST = [5, 10, 20, 40];
  Q.push({ id: 'q21', part: 'E', title: 'Distance from the source',
    intro: 'A student moves a gamma source (source C in the simulator) away from the Geiger tube. The background count rate is ' + BD + ' counts/min. The readings are in the table.',
    sim: { tab: 'bench', task: 'Choose Source C, put it next to the tube, and press "Reading at every distance". Compare with the table. Show the net count rate and look at the Distance graph.', think: 'Predict first: if you double the distance, will the count rate halve?',
      bench: { bg: BD, unit: 'd', sources: ['C'], days: [0], distances: [2, 5, 10, 20, 40], absorbers: ['none'], seconds: 60, secondsOptions: [60, 120, 300], view: 'dist', sourceIn: false } },
    hint: 'Net count rate = reading − background. Then multiply by the distance squared.',
    parts: [
      { id: 'a', type: 'table', text: 'Complete the table.', marks: 4, cellsPerMark: 2,
        table: { rowHead: 'Distance, d (cm)', cols: [{ head: 'Reading, R (counts/min)', kind: 'given' }, { head: 'Net count rate (counts/min)', kind: 'input' }, { head: 'Net × d² (counts/min × cm²)', kind: 'input', ecfCol: true }],
          rows: DIST.map(function (d) { var n = Z0 * Math.pow(5 / d, 2); return { label: String(d), cells: [n + BD, n, n * d * d] }; }) },
        ecf: function (CS, row) { return CS.cell(row, 1) * DIST[row] * DIST[row]; } },
      { id: 'b', type: 'num', text: 'Use your net count rates.', marks: 2, inputs: [
        N('b1', 'Factor by which the net count rate falls when the distance doubles', 4, null, { abs: 0.2, ecf: function (S) { return S.cell('a', 0, 1) / S.cell('a', 1, 1); } }),
        N('b2', 'Predicted net count rate at 80 cm (counts/min)', Z0 / 256, null, { tol: 0.05, ecf: function (S) { return S.cell('a', 3, 1) / 4; } })] },
      W('c', 'Explain why you must subtract the background before you look for the pattern.', 2, [
        P('the background is the same at every distance, so it is in every reading', [[/background.{0,60}(same|constant|always|every|each|all|doesn.t change|does not change|not affected|independent)|(same|always|every|each).{0,40}background/]]),
        P('so the raw readings do not fall by a factor of 4 when the distance doubles; the net count rate does', [[/(not|n.t|wrong|doesn.t|does not).{0,60}(factor|fall|quarter|4|inverse|pattern|ratio|proportion)|(net|subtract|corrected|after subtract).{0,80}(quarter|factor of 4|4|inverse)/]])],
        { model: 'The background is the same at every distance, so it is in every reading. If it is not subtracted, the raw readings do not fall by a factor of 4 when the distance doubles. The net count rate does: it follows an inverse square law.' })] });

  Q.push({ id: 'q22', part: 'E', title: 'Which radiation? Absorbers',
    intro: 'Sources A, B and C each give out one type of radiation (alpha, beta or gamma). Source D gives out two types. A student puts paper, 3 mm of aluminium and 10 mm of lead between source D and the tube, 5 cm away. The background count rate is ' + BD + ' counts/min.',
    sim: { tab: 'bench', task: 'Press "Reading with each absorber" for sources A, B and C to see what each type of radiation does. Then do the same for source D and compare with the table.', think: 'Predict first: which type of radiation does paper stop? Which needs lead?',
      bench: { bg: BD, unit: 'd', sources: ['A', 'B', 'C', 'D'], days: [0], distances: [5], absorbers: ['none', 'paper', 'aluminium', 'lead'], seconds: 120, secondsOptions: [60, 120, 300], view: 'abs', sourceIn: false } },
    hint: 'Alpha is stopped by paper. Beta is stopped by a few mm of aluminium. Gamma is only reduced by lead.',
    parts: [
      { id: 'a', type: 'table', text: 'Work out the net count rates.', marks: 2, cellsPerMark: 2,
        table: { rowHead: 'Absorber', cols: [{ head: 'Reading, R (counts/min)', kind: 'given' }, { head: 'Net count rate (counts/min)', kind: 'input' }],
          rows: ['none', 'paper', 'aluminium', 'lead'].map(function (a) { var n = M.benchNet({ unit: 'd', src: M.BENCH_SOURCES.D }, 0, 5, a); return { label: M.ABSORBERS[a].short, cells: [n + BD, n] }; }) } },
      { id: 'b', type: 'choice', text: 'Which radiation does source D give out?', marks: 1, correct: 'bg', options: [
        { id: 'a', label: 'Alpha only' }, { id: 'b', label: 'Beta only' }, { id: 'bg', label: 'Beta and gamma' }, { id: 'ag', label: 'Alpha and gamma' }] },
      W('c', 'Use the net count rates to explain your answer.', 3, [
        P('paper hardly changes the count rate, so there is no alpha', [[/paper/, /(little|slight|small|hardly|barely|not much|no change|almost|only|doesn.t|does not|not stop|no (drop|effect|difference)|same)/]]),
        P('aluminium reduces the count rate a lot, so there is beta', [[/alumin/, /(lot|big|large|most|great|much|drop|reduc|stop|fall|halv|absorb|block)/]]),
        P('some radiation still gets through the aluminium but the lead stops it, so there is gamma', [[/lead/, /(stop|block|absorb|reduc|almost|nearly|all)/], [/(still|some|gets? through|passes?|remain|left)/, /alumin/]])],
        { model: 'Paper hardly changes the count rate, so there is no alpha (alpha is stopped by paper). Aluminium reduces the count rate a lot, so there is beta. A lot of radiation still gets through the aluminium but lead stops almost all of it, so there is gamma. The source gives out beta and gamma.' })] });

  /* ---------- marking ---------- */
  function inputsOf(q) {
    var out = [];
    q.parts.forEach(function (p) {
      if (p.type === 'num') p.inputs.forEach(function (i) { out.push({ part: p, inp: i }); });
      if (p.type === 'table') p.table.rows.forEach(function (r, ri) { p.table.cols.forEach(function (c, ci) { if (c.kind === 'input') out.push({ part: p, cell: { row: ri, col: ci }, key: p.id + '.r' + ri + 'c' + ci }); }); });
    });
    return out;
  }
  function cellKey(p, r, c) { return p.id + '.r' + r + 'c' + c; }
  /* S: access to the student's numbers while marking */
  function makeS(q, ans) {
    var byId = {}; q.parts.forEach(function (p) { if (p.type === 'num') p.inputs.forEach(function (i) { byId[i.id] = i; }); });
    return {
      get: function (id, unit) { var inp = byId[id]; if (!inp) return NaN; var r = stuValue(inp, ans[id]); if (!isFinite(r.v)) return NaN; return unit && inp.ansUnit && M.sameDim(unit, inp.ansUnit) ? M.convert(r.v, inp.ansUnit, unit) : r.v; },
      cell: function (partId, row, col) { var p = q.parts.filter(function (x) { return x.id === partId; })[0]; var r = parseNum((ans[cellKey(p, row, col)] || {}).v); return r.v; }
    };
  }
  function makeCellS(q, p, ans, S) { return { get: S.get, cell: function (row, col) { return parseNum((ans[cellKey(p, row, col)] || {}).v).v; } }; }

  function markPart(q, p, ans, S, self) {
    var res = { id: p.id, marks: 0, max: p.marks, items: [], cells: {}, inputs: {} };
    if (p.type === 'choice') {
      var ok = ans[p.id] === p.correct, blank = !ans[p.id];
      res.items.push({ ok: ok ? 'yes' : (blank ? 'blank' : 'no'), marks: ok ? p.marks : 0, text: ok ? 'Correct.' : (blank ? 'No answer.' : 'Not this one.') });
      res.marks = ok ? p.marks : 0; return res;
    }
    if (p.type === 'written') {
      var text = norm(ans[p.id]); var per = p.marks / p.points.length;
      p.points.forEach(function (pt, k) {
        var hit = !!text && pt.alts.some(function (alt) { return alt.every(function (re) { return re.test(text); }); });
        var claimed = !hit && !!self[q.id + '.' + p.id + '.' + k];
        res.items.push({ ok: hit ? 'yes' : (claimed ? 'self' : 'no'), marks: (hit || claimed) ? per : 0, text: pt.text, key: q.id + '.' + p.id + '.' + k });
        if (hit || claimed) res.marks += per;
      });
      (p.misc || []).forEach(function (m) { if (text && m.re.test(text)) res.items.push({ ok: 'note', marks: 0, text: m.msg }); });
      if (!text) res.blank = true;
      return res;
    }
    if (p.type === 'table') {
      var tab = p.table, correct = 0, total = 0, CS = makeCellS(q, p, ans, S);
      tab.rows.forEach(function (row, ri) { tab.cols.forEach(function (col, ci) {
        if (col.kind !== 'input') return;
        if (col.free) { res.cells[cellKey(p, ri, ci)] = 'free'; return; }
        total++;
        var key = cellKey(p, ri, ci), st = parseNum((ans[key] || {}).v), e = row.cells[ci], status = 'no';
        if (!String((ans[key] || {}).v || '').trim()) status = 'blank';
        else if (within(st.v, e, { tol: 0.02 })) { status = 'yes'; correct++; }
        else if (col.ecfCol && p.ecf) { var ex = p.ecf(CS, ri, ci); if (within(st.v, ex, { tol: 0.02 })) { status = 'ecf'; correct++; } }
        res.cells[key] = status;
      }); });
      res.marks = Math.min(p.marks, Math.floor(correct / p.cellsPerMark));
      res.items.push({ ok: res.marks === p.marks ? 'yes' : (res.marks ? 'part' : 'no'), marks: res.marks, text: correct + ' of ' + total + ' cells correct' + (p.cellsPerMark > 1 ? ' (1 mark for every ' + p.cellsPerMark + ' correct cells)' : '') });
      return res;
    }
    /* num */
    var statuses = [];
    p.inputs.forEach(function (inp) {
      var st = stuValue(inp, ans[inp.id]), e = inp.ans, status, detail = '';
      if (st.blank) status = 'blank';
      else if (inp.free) status = 'free';
      else if (st.badUnit) { status = 'no'; detail = 'Check the unit: the answer should be in ' + (inp.ansUnit ? M.UNITS[inp.ansUnit].label : 'no unit') + ' or an equivalent.'; }
      else if (st.bad) { status = 'no'; detail = 'Enter a number.'; }
      else if (e !== null && within(st.v, e, inp)) status = 'yes';
      else {
        var ex = inp.ecf ? inp.ecf(S) : NaN;
        if (inp.ecf && isFinite(ex) && within(st.v, ex, inp)) { status = 'ecf'; detail = 'This is right for your earlier answer (follow-through).'; }
        else { status = 'no'; if (e !== null && close(st.v, e)) detail = 'Close, but check your rounding or your working.'; }
      }
      statuses.push({ inp: inp, status: status, detail: detail });
    });
    var groups = {}; statuses.forEach(function (s) { (groups[s.inp.grp] = groups[s.inp.grp] || []).push(s); });
    statuses.forEach(function (s) {
      var g = groups[s.inp.grp], fin = g[g.length - 1];
      var via = p.finalAll !== false && g.length > 1 && fin.status === 'yes' && fin.inp.marks > 0 && s.status !== 'yes' && s.status !== 'ecf' && s.status !== 'free';
      var status = via ? 'via' : s.status;
      var m = (status === 'yes' || status === 'ecf' || status === 'via') ? s.inp.marks : 0;
      res.inputs[s.inp.id] = { status: status, detail: status === 'via' ? 'Full marks for a correct final answer.' : s.detail };
      res.marks += m; res.items.push({ ok: status, marks: m, text: s.inp.label, detail: res.inputs[s.inp.id].detail });
    });
    if (p.extra) p.extra(S).forEach(function (x) { res.items.push({ ok: x.ok ? 'yes' : 'no', marks: x.ok ? x.marks : 0, text: x.text }); if (x.ok) res.marks += x.marks; });
    return res;
  }
  /* ans: {inputId: {v, u}, 'part.r0c1': {v}, partId: 'text' or option id}.  self: {'q.part.pointIndex': true} */
  function markQuestion(q, ans, self) {
    ans = ans || {}; self = self || {};
    var S = makeS(q, ans), out = { total: 0, max: 0, parts: {} };
    q.parts.forEach(function (p) { var r = markPart(q, p, ans, S, self); out.parts[p.id] = r; out.total += r.marks; });
    out.max = questionMax(q);
    return out;
  }
  function questionMax(q) { return q.parts.reduce(function (s, p) { return s + p.marks; }, 0); }
  function totalMarks() { return Q.reduce(function (s, q) { return s + questionMax(q); }, 0); }

  /* ---------- the model answers (web feedback and the teacher page) ---------- */
  function fmtAns(inp) {
    if (inp.ans === null || inp.ans === undefined) return 'from your own readings' + (inp.note ? ' (' + inp.note + ')' : '');
    var u = inp.ansUnit; var v = (u === '%') ? sig(inp.ans, 3) : sig(inp.ans, 3);
    return v + (u === '%' ? '%' : (u ? ' ' + M.UNITS[u].label : ''));
  }
  function modelAnswers(q) {
    var out = [];
    q.parts.forEach(function (p) {
      var lines = [];
      if (p.type === 'num') p.inputs.forEach(function (i) { if (!i.free || i.note) lines.push(i.label + ': ' + fmtAns(i)); });
      if (p.type === 'table') p.table.rows.forEach(function (r) { lines.push(p.table.rowHead.replace(/\s*\(.*\)/, '') + ' ' + r.label + ': ' + r.cells.map(function (c, ci) { return c === null ? null : p.table.cols[ci].head.replace(/\s*\(.*\)/, '') + ' = ' + sig(c, 3); }).filter(Boolean).join(', ')); });
      if (p.type === 'choice') lines.push(p.options.filter(function (o) { return o.id === p.correct; })[0].label.replace(/\s+/g, ' '));
      if (p.type === 'written') { lines.push(p.model); p.points.forEach(function (pt) { lines.push('Mark: ' + pt.text); }); }
      out.push({ id: p.id, text: p.text, marks: p.marks, lines: lines });
    });
    return out;
  }

  return { questions: Q, PARTS: PARTS, parseNum: parseNum, norm: norm, stuValue: stuValue, markQuestion: markQuestion, questionMax: questionMax,
    totalMarks: totalMarks, modelAnswers: modelAnswers, fmtAns: fmtAns, inputsOf: inputsOf, cellKey: cellKey, CROSS: CROSS, rawAt: rawAt, BG: BG, NET0: NET0,
    byId: function (id) { return Q.filter(function (q) { return q.id === id; })[0]; } };
});
