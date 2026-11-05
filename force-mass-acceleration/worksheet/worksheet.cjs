// Step 3: build the Word document. Student pages first, teacher answers last (all numbers come from data.json).
const K = require('../../tools/worksheet-kit/kit.cjs');
const { P, H1, H2, Q, SUB, NOTE, EQ, mr, frac, sub, sup, vbar, tbar, lines, gap, tbl, blanks, img, CAP, BOX, BUL, STEP, PW, LW, MathRadical, Paragraph, TextRun, PageBreak, FONT, BL, OR, INK, ORL, ExternalHyperlink } = K;
const d = JSON.parse(K.fs.readFileSync('data.json', 'utf8'));
const f = (x, n = 2) => x.toFixed(n);
const SIM = 'https://jamesclarke2-bit.github.io/physicsapps/force-mass-acceleration/';
const fit = (w, total) => { const s = w.reduce((a, b) => a + b, 0); const o = w.map(x => Math.round(x * total / s)); o[o.length - 1] += total - o.reduce((a, b) => a + b, 0); return o; };
let n = 0; const QN = () => ++n;
const s1 = [], s2 = [], s3 = [];

/* ---------------- page 1: aim, set-up, plan ---------------- */
s1.push(new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: 'FORCE, MASS AND ACCELERATION', font: FONT, bold: true, size: 44, color: BL })] }));
s1.push(new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text: 'Testing F = ma and the equations of motion', font: FONT, size: 26, color: INK })] }));
s1.push(P('Name: ______________________    Class: ____________    Date: ____________', { after: 140 }));
s1.push(BOX([P('**Aim**  Show how the acceleration of a trolley depends on the force on it and its mass, and test the equations of motion for constant acceleration.', { after: 60 }),
  P('**Layers**  Parts 1 to 4 and 6 are the core practical. Part 5 (marked A-level) tests the SUVAT equations and deals with friction.', { after: 0 })]));
s1.push(img('fig_rig.png', 500));
s1.push(CAP('Figure 1  A trolley pulled along the track by a hanging mass. Two light gates (or a stopwatch or video) time the motion.'));

s1.push(H1('Part 1  Plan'));
s1.push(Q(QN(), 'Complete the variables.', { before: 60 }));
s1.push(tbl(['Investigation 1: a against F', 'Investigation 2: a against 1/m'], [['Change:', 'Change:'], ['Measure:', 'Measure:'], ['Keep the same:', 'Keep the same:']], [4819, 4819], { rowH: 520, firstFill: false, hsize: 19 }));
s1.push(Q(QN(), 'In Investigation 1 you move slotted masses from the trolley to the hanger. Why?'));
s1.push(lines(2, PW, 430, 520));
s1.push(Q(QN(), 'Predict how a changes with F when the total mass is constant.'));
s1.push(img('pred_axes.png', 260, true)); s1.push(CAP('Sketch your prediction.'));
s1.push(lines(2, PW, 430, 520));
s1.push(Q(QN(), 'Why do we repeat each timing?'));
s1.push(NOTE('Give two things repeating helps you to do.'));
s1.push(lines(2, PW, 430, 520));
s1.push(P('The uncertainty in a mean of random readings is half the range:', { before: 100, after: 40 }));
s1.push(EQ([mr('Δt = '), frac([mr('1')], [mr('2')]), mr('('), sub('t', 'max'), mr(' − '), sub('t', 'min'), mr(')')]));
s1.push(NOTE('Would 50 repeats make your result more accurate? Explain.'));
s1.push(lines(3, PW, 430, 520));

/* ---------------- Part 2 (landscape): results ---------------- */
s2.push(H1('Part 2  Collect results'));
['Set the distance s from the start to the finish: s = ________ m. Keep it the same for Tables 1 and 2.', 'Release the trolley from rest without pushing. Time it from release to the finish.', 'Do 3 timings for each setting. Cross out any obvious anomaly and repeat it.', 'Table 1: move one slotted mass at a time from the trolley to the hanger. Total mass m = ________ kg.', 'Table 2: keep the hanger the same (F = ________ N) and add 0.1 kg blocks to the trolley.'].forEach(t => s2.push(STEP(t)));
s2.push(P('**Table 1**  Investigation 1: a against F (total mass constant)', { before: 80, after: 50, keepNext: true }));
s2.push(tbl(['Masses on hanger', 'm_{h} (kg)', 'F = m_{h}g (N)', 't_{1} (s)', 't_{2} (s)', 't_{3} (s)', 't̄ (s)', 'half range Δt (s)', 'a = 2s / t̄^{2} (m s^{-2})', '% unc. in a'], blanks(6, 10), fit([1100, 1100, 1400, 1000, 1000, 1000, 1000, 1500, 2100, 1300], LW), { rowH: 400 }));
s2.push(P('**Table 2**  Investigation 2: a against 1/m (force constant)', { before: 160, after: 50, keepNext: true }));
s2.push(tbl(['Extra mass (kg)', 'm (kg)', '1/m (kg^{-1})', 't_{1} (s)', 't_{2} (s)', 't_{3} (s)', 't̄ (s)', 'half range Δt (s)', 'a = 2s / t̄^{2} (m s^{-2})', '% unc. in a'], blanks(6, 10, ['0', '0.1', '0.2', '0.3', '0.4', '0.5']), fit([1100, 1100, 1400, 1000, 1000, 1000, 1000, 1500, 2100, 1300], LW), { rowH: 400 }));
s2.push(NOTE('a depends on t², so the percentage uncertainty in a is twice the percentage uncertainty in t.'));

/* ---------------- Parts 3-4: analyse ---------------- */
s3.push(H1('Part 3  Analyse F = ma'));
s3.push(P('**Graph 1**  Plot a against F from Table 1. Choose your scales and draw a line of best fit.', { after: 40, keepNext: true }));
s3.push(img('grid_a_F.png', 470));
s3.push(Q(QN(), 'Describe your graph. Does the line go through the origin?', { before: 60 }));
s3.push(lines(2, PW, 430, 520));
s3.push(Q(QN(), 'Find the gradient. Show what it should equal.'));
s3.push(EQ([mr('F = m a'), mr('      →      '), mr('a = '), frac([mr('F')], [mr('m')])]));
s3.push(lines(3, PW, 430, 520));
s3.push(P('**Graph 2**  Plot a against 1/m from Table 2.', { before: 100, after: 40, keepNext: true }));
s3.push(img('grid_a_invm.png', 470));
s3.push(Q(QN(), 'What does the gradient of Graph 2 represent? Check it against the force you used.', { before: 60 }));
s3.push(lines(2, PW, 430, 520));

s3.push(H2('Forces on the trolley and the hanger'));
s3.push(img('fig_fbd.png', 470));
s3.push(CAP('Figure 2  Free body diagrams. T is the tension in the string and f is friction.'));
s3.push(P('Newton’s second law for each part (friction ignored, so f = 0):', { after: 20, keepNext: true }));
s3.push(EQ([sub('m', 'h'), mr('g − T = '), sub('m', 'h'), mr('a'), mr('          '), mr('T = M a')]));
s3.push(Q(QN(), 'Add the two equations to show that the acceleration of the whole system is:'));
s3.push(EQ([mr('a = '), frac([sub('m', 'h'), mr('g')], [mr('M + '), sub('m', 'h')])]));
s3.push(lines(2, PW, 430, 520));
s3.push(Q(QN(), 'The force pulling the system is only the hanger’s weight, not T. Explain why the total mass m = M + m_{h} is used in a = F / m.'));
s3.push(lines(2, PW, 430, 520));

s3.push(H1('Motion graphs'));
s3.push(P('Figure 3 shows one run of the trolley from rest (F = ' + f(d.setup.F, 2) + ' N, m = ' + f(d.setup.m, 2) + ' kg).', { after: 30, keepNext: true }));
s3.push(img('fig_motion_given.png', 600));
s3.push(CAP('Figure 3  (a) distance–time, (b) velocity–time and (c) acceleration–time graphs.'));
s3.push(Q(QN(), 'Use the graphs.', { before: 60 }));
s3.push(SUB('(a)', 'Use graph (b) to find the acceleration:  a = ______________ m s^{-2}'));
s3.push(SUB('(b)', 'Compare it with graph (c). What does a horizontal line on (c) show?'));
s3.push(lines(1, PW, 430, 960));
s3.push(SUB('(c)', 'Find the area under graph (b) up to 1.0 s. What does it equal?'));
s3.push(lines(1, PW, 430, 960));
s3.push(SUB('(d)', 'Explain the shape of graph (a) using the gradient of (b).'));
s3.push(lines(2, PW, 430, 960));
s3.push(Q(QN(), 'Now 0.5 kg is added to the trolley with the same hanger. Sketch the new graphs.'));
s3.push(NOTE('The grey line is the run in Figure 3. Draw the new run in pen on each graph.'));
s3.push(img('fig_motion_sketch.png', 600));
s3.push(CAP('Figure 4  Sketch the new run.'));
s3.push(lines(2, PW, 430, 520));

/* ---------------- Part 5: A-level extension ---------------- */
s3.push(H1('Part 4  Design and tweak', { newPage: true }));
s3.push(P('Use the simulation to test designs: ', { after: 20 }));
s3.push(new Paragraph({ spacing: { after: 100 }, children: [new ExternalHyperlink({ link: SIM, children: [new TextRun({ text: SIM, font: FONT, size: 19, style: 'Hyperlink', color: BL, underline: {} })] })] }));
s3.push(BOX([P('**Targets for a good design**  (hanger with 5 slotted masses, total mass constant)', { after: 40 }),
  EQ([mr('Δa'), mr(' / '), mr('a'), mr(' × 100% ≤ 5%'), mr('          timing ≥ 10 × timer uncertainty')])], ORL, OR));
s3.push(gap(60));
s3.push(H2('Task A  Timer and distance'));
s3.push(tbl(['Timer', 's = 0.4 m', 's = 0.6 m', 's = 1.0 m', 's = 1.4 m', 's = 1.8 m'], [['Hand stopwatch', '', '', '', '', ''], ['Video (frame by frame)', '', '', '', '', ''], ['Light gates', '', '', '', '', '']], [2600, 1400, 1400, 1400, 1400, 1438], { rowH: 450, firstLeft: true }));
s3.push(NOTE('Record the % uncertainty in a. Which designs meet the 5% target? Why does a longer distance help?'));
s3.push(lines(2, PW, 430, 520));
s3.push(H2('Task B  Friction'));
s3.push(P('Tilt the track a little (pulley end lower) and record a. Compare with F / m = ________ m s^{-2}.', { after: 60, keepNext: true }));
s3.push(tbl(['tilt θ (°)', '0', '0.2', '0.4', '0.6', '0.8', '1.0'], [['a (m s^{-2})', '', '', '', '', '', ''], ['a − F / m (m s^{-2})', '', '', '', '', '', '']], [2000, 1273, 1273, 1273, 1273, 1273, 1273], { rowH: 480, firstLeft: true }));
s3.push(NOTE('At what tilt does a equal F / m? Friction is the same in every reading. Can repeating remove its effect? Explain.'));
s3.push(lines(3, PW, 430, 520));

s3.push(H1('Part 5  Equations of motion   (A-level)', { newPage: true }));
s3.push(BOX([P('**Constant acceleration**', { after: 40 }),
  EQ([mr('v = u + a t'), mr('          '), mr('s = u t + '), frac([mr('1')], [mr('2')]), mr('a '), sup('t', '2')]),
  EQ([sup('v', '2'), mr(' = '), sup('u', '2'), mr(' + 2 a s'), mr('          '), mr('s = '), frac([mr('(u + v)')], [mr('2')]), mr(' t')])]));
s3.push(gap(60));
s3.push(H2('Test 1  From rest:  s = ½at²'));
s3.push(P('Use stopwatch or video. Keep F and m the same and change s.', { after: 40 }));
s3.push(tbl(['s (m)', 't_{1} (s)', 't_{2} (s)', 't_{3} (s)', 't̄ (s)', 't̄^{2} (s^{2})', 'Δ(t^{2}) = 2t̄Δt (s^{2})'], blanks(6, 7, ['0.4', '0.6', '0.8', '1.0', '1.2', '1.4']), fit([900, 1100, 1100, 1100, 1100, 1500, 2500], PW), { rowH: 420 }));
s3.push(P('**Graph 3**  Plot s against t².', { before: 100, after: 40, keepNext: true }));
s3.push(img('grid_s_t2.png', 380));
s3.push(Q(QN(), 'What shape should it be? Use the gradient to find a.', { before: 60 }));
s3.push(lines(2, PW, 430, 520));
s3.push(H2('Test 2  Two light gates:  v² = u² + 2as', { newPage: true }));
s3.push(P('Put gate 1 at 0.3 m. Move gate 2 to different positions. The trolley is already moving at gate 1.', { after: 40 }));
s3.push(tbl(['gate 2 (m)', 's (m)', 'u (m s^{-1})', 'v (m s^{-1})', 'v^{2} − u^{2} (m^{2} s^{-2})'], blanks(6, 5, ['0.6', '0.8', '1.0', '1.2', '1.4', '1.6']), fit([1500, 1300, 1700, 1700, 2600], PW), { rowH: 420 }));
s3.push(P('**Graph 4**  Plot v² − u² against s.', { before: 100, after: 40, keepNext: true }));
s3.push(img('grid_v2_d.png', 380));
s3.push(Q(QN(), 'What should the gradient equal? Find a and compare with Test 1.', { before: 60 }));
s3.push(lines(2, PW, 430, 520));
s3.push(H2('Test 3  Do all the equations agree?'));
s3.push(P('Take one run with gate 1 at 0.3 m and gate 2 at 1.2 m. Use your means of u, v and t, with s = 0.90 m.', { after: 40 }));
s3.push(tbl(['u (m s^{-1})', 'v (m s^{-1})', 't (s)', 's (m)'], [['', '', '', '0.90']], [2400, 2400, 2400, 2438], { rowH: 450, firstFill: false }));
s3.push(gap(60));
s3.push(tbl(['Equation', 'rearranged for a', 'a (m s^{-2})'], [['v = u + at', 'a = (v − u) / t', ''], ['s = ut + ½at²', 'a = 2(s − ut) / t²', ''], ['v² = u² + 2as', 'a = (v² − u²) / 2s', ''], ['s = ½(u + v)t', 'check: ½(u + v)t = ____ m', 'compare with s']], [3000, 3600, 3038], { rowH: 450, firstLeft: true }));
s3.push(Q(QN(), 'Do the values of a agree within their uncertainties? What does this show about the equations?', { before: 100 }));
s3.push(lines(2, PW, 430, 520));
s3.push(H2('Challenge  Ramp'));
s3.push(P('Remove the hanger and tilt the track. Time the trolley down the slope with the gates. Do the same with 0.5 kg added to the trolley.', { after: 40 }));
s3.push(tbl(['tilt θ (°)', 'sin θ', 'a (m s^{-2})', 'a with 0.5 kg added (m s^{-2})'], blanks(5, 4, ['2', '4', '6', '8', '10']), [1800, 1800, 2400, 3638], { rowH: 420 }));
s3.push(Q(QN(), 'Plot a against sinθ (Graph 5). Show why the gradient should be g, and why the mass does not matter.', { before: 100 }));
s3.push(EQ([mr('m a = m g sinθ'), mr('      →      '), mr('a = g sinθ')]));
s3.push(img('grid_a_sin.png', 420));
s3.push(lines(2, PW, 430, 520));

s3.push(H1('Part 6  Conclusion and evaluation'));
s3.push(Q(QN(), 'State what your results show about a, F and m. Support it with data.', { before: 80 }));
s3.push(lines(3, PW, 430, 520));
s3.push(Q(QN(), 'Which source of uncertainty was biggest? Suggest one improvement.'));
s3.push(lines(2, PW, 430, 520));
s3.push(Q(QN(), 'Describe one systematic error in this experiment and how you could reduce it.'));
s3.push(lines(2, PW, 430, 520));

/* ---------------- teacher answers ---------------- */
s3.push(new Paragraph({ pageBreakBefore: true, spacing: { after: 100 }, children: [new TextRun({ text: 'Teacher answers  (remove before printing)', font: FONT, bold: true, size: 30, color: OR })] }));
s3.push(P('**Model** (also in the simulation): trolley 0.600 kg + ten 20 g slotted masses; hanger 10 g + 20 g per mass; kinetic friction μ = ' + d.MU + '; pulley adds 5 g effective mass. Total mass in Investigation 1: m = **' + f(d.setup.m, 3) + ' kg**.', { after: 60 }));
s3.push(P('**Table 1 expected** (s = 1.0 m, flat track, total mass constant)', { after: 40, keepNext: true }));
s3.push(tbl(['masses', 'F (N)', 'a (m s^{-2})', 't (s)', 'F/m (m s^{-2})'], d.aF.filter(r => r.nh % 2 === 0).map(r => [String(r.nh), f(r.F, 2), f(r.a, 2), f(r.t1, 2), f(r.ideal, 2)]), [1400, 1800, 2000, 1800, 2400], { rowH: 340 }));
s3.push(P('Gradient of a–F: **' + f(d.fitF.slope, 3) + ' kg^{-1}** (1/m = ' + f(1 / d.setup.m, 3) + '; about 1% higher because friction falls as mass moves to the hanger). Intercept **' + f(d.fitF.intercept, 3) + ' m s^{-2}**, the effect of friction ≈ −μg = ' + f(-d.MU * d.G, 3) + '.', { before: 80, after: 60 }));
s3.push(P('**Table 2 expected** (5 masses on hanger, F = ' + f(d.setup.F, 2) + ' N)', { after: 40, keepNext: true }));
s3.push(tbl(['extra (kg)', 'm (kg)', '1/m (kg^{-1})', 'a (m s^{-2})', 't (s)'], d.aM.map(r => [f(r.extra, 1), f(r.m, 3), f(r.invm, 3), f(r.a, 2), f(r.t1, 2)]), [1800, 1800, 2000, 2000, 2038], { rowH: 330 }));
[
  '**Q1** Change F (masses on hanger) / measure a (from t) / keep m, s, track, timer the same. Investigation 2: change m / measure a / keep F, s the same.',
  '**Q2** Moving masses keeps the total mass the same, so only F changes. If masses were added to the hanger, the mass accelerated would increase and a against F would curve.',
  '**Q3** A straight line through the origin (a ∝ F). Allow a small negative intercept on the real result: friction.',
  '**Q4** Repeats show the spread, reveal anomalies and give a mean. Uncertainty is half the range and is not reduced by more repeats; a faulty method stays wrong.',
  '**Graph 1 and 2** Gradient of a–F = 1/m. Gradient of a against 1/m = F (' + f(d.setup.F, 2) + ' N). A negative intercept on both is friction.',
  '**Forces** Adding m_{h}g − T = m_{h}a and T = Ma gives m_{h}g = (M + m_{h})a. The hanger’s weight is the external force on the whole system; T is internal to it, so the whole mass accelerates.',
  '**Motion graphs** a = ' + f(d.setup.a, 2) + ' m s^{-2} from the gradient of (b); the area under (b) to 1.27 s is 1.0 m (the distance). (c) horizontal: constant acceleration. (a) curves upwards because the gradient (the velocity) keeps increasing. With 0.5 kg added, a falls to ' + f(d.motion_k5.a, 2) + ' m s^{-2}: gentler curve and a longer time (' + f(d.m2.T, 2) + ' s for 1.0 m).',
  '**Task A** % uncertainty in a at s = 0.4/0.6/1.0/1.4/1.8 m: ' + d.unc.timers.map(u => u.timer + ' ' + u.byS.map(b => f(b.pct, 1) + '%').join(', ')).join('; ') + '. Stopwatch passes the 10× rule only above about 0.7 s. Longer distance means a longer time, so a smaller percentage.',
  '**Task B** a at tilt 0 to 1.0°: ' + d.tilt.map(t => f(t.a, 2)).join(', ') + ' m s^{-2}; F/m = ' + f(d.setup.ideal, 2) + '. Compensation at tanθ = μ, θ ≈ ' + f(d.comp, 2) + '°. Friction is the same in every reading, so repeating cannot remove it.',
  '**Part 5, Test 1** s against t² is a straight line through the origin, gradient a/2. With F = ' + f(d.setup.F, 2) + ' N, m = ' + f(d.setup.m, 2) + ' kg: a ≈ ' + f(d.setup.a, 2) + ' m s^{-2}, gradient ≈ ' + f(d.setup.a / 2, 2) + ' m s^{-2}.',
  '**Test 2** v² − u² against s is a straight line through the origin, gradient 2a ≈ ' + f(2 * d.setup.a, 2) + ' m s^{-2}. Expected u at 0.3 m = ' + f(d.suvat.u, 2) + ', v at 1.2 m = ' + f(d.suvat.v, 2) + ' m s^{-1}.',
  '**Test 3** u = ' + f(d.suvat.u, 2) + ', v = ' + f(d.suvat.v, 2) + ', t = ' + f(d.suvat.t, 2) + ' s, s = 0.90 m give a = ' + f(d.suvat.a_t, 2) + ' (v = u + at), ' + f(d.suvat.a_s, 2) + ' (s = ut + ½at²), ' + f(d.suvat.a_v2, 2) + ' (v² = u² + 2as); ½(u + v)t = ' + f(d.suvat.s_mid, 2) + ' m. Agreement within uncertainty supports the equations.',
  '**Ramp** a = g(sinθ − μ cosθ), gradient ≈ ' + f(d.fitR.slope, 2) + ' m s^{-2} (g = 9.81, small negative intercept from friction). The same with 0.5 kg added: mass cancels.'
].forEach(t => s3.push(BUL(t)));

const title = 'Force, Mass and Acceleration  ·  Physics practical';
const sections = [
  { properties: K.pagePort, headers: { default: K.hdr(title) }, footers: { default: K.ftr() }, children: s1 },
  { properties: K.pageLand, headers: { default: K.hdr(title) }, footers: { default: K.ftr() }, children: s2 },
  { properties: K.pagePort, headers: { default: K.hdr(title) }, footers: { default: K.ftr() }, children: s3 }];
const doc = new K.Document({ creator: 'James Clarke', title: 'Force, Mass and Acceleration', styles: K.styles, numbering: K.numbering, sections });
K.Packer.toBuffer(doc).then(b => { K.fs.mkdirSync('out', { recursive: true }); K.fs.writeFileSync('out/force-mass-acceleration_worksheet.docx', b); console.log('out/force-mass-acceleration_worksheet.docx written'); });
