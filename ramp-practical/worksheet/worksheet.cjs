// Step 3: build the Word document. Student pages first, teacher answers last (all numbers come from data.json).
const K = require('../../tools/worksheet-kit/kit.cjs');
const { P, H1, H2, Q, SUB, NOTE, EQ, mr, frac, sub, sup, lines, gap, tbl, blanks, img, CAP, BOX, BUL, STEP, PW, LW, Paragraph, TextRun, FONT, BL, OR, INK, ORL, ExternalHyperlink } = K;
const d = JSON.parse(K.fs.readFileSync('data.json', 'utf8'));
const f = (x, n = 2) => x.toFixed(n);
const SIM = 'https://jamesclarke2-bit.github.io/physicsapps/ramp-practical/';
const fit = (w, total) => { const s = w.reduce((a, b) => a + b, 0); const o = w.map(x => Math.round(x * total / s)); o[o.length - 1] += total - o.reduce((a, b) => a + b, 0); return o; };
let n = 0; const QN = () => ++n;
const s1 = [], s2 = [], s3 = [];
const A = d.stageA, B = d.stageB;

/* ---------------- page 1: aim, set-up, plan ---------------- */
s1.push(new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: 'PRACTICAL TASK: TROLLEY ON A RAMP', font: FONT, bold: true, size: 40, color: BL })] }));
s1.push(new Paragraph({ spacing: { after: 140 }, children: [new TextRun({ text: 'Design it, measure it, validate it', font: FONT, size: 26, color: INK })] }));
s1.push(P('Name: ______________________    Class: ____________    Date: ____________', { after: 120 }));
s1.push(BOX([P('**Aim**  Decide whether your results validate (1) the equations of motion for constant acceleration from rest, s = ½at² and v² = u² + 2as, and (2) a = g sin θ for a trolley on a ramp.', { after: 60 }),
  P('**Validate** means: the accepted value, or the value predicted by the equation, lies inside your result ± its uncertainty. A big uncertainty makes this easy but the test weak. You must decide which uncertainty is the biggest and how to shrink it.', { after: 0 })]));
s1.push(img('fig_rig.png', 370));
s1.push(CAP('Figure 1  A trolley released from rest at the start line. A timer gives t. A light gate with a card on the trolley gives v at the bottom.'));

s1.push(H1('Part 1  Design your experiment'));
s1.push(P('There are two linked stages. Use the simulation (link in Part 6) to try your design before you plan the real measurements.', { after: 60 }));
s1.push(Q(QN(), 'Complete the variables for each stage.', { before: 40 }));
s1.push(tbl(['Stage A: equations of motion', 'Stage B: a against angle'], [['Change:', 'Change:'], ['Measure:', 'Measure:'], ['Keep the same:', 'Keep the same:']], [4819, 4819], { rowH: 520, firstFill: false, hsize: 19 }));
s1.push(Q(QN(), 'Why must the trolley be released from rest, with no push?'));
s1.push(lines(1, PW, 430, 520));
s1.push(Q(QN(), 'You can find the angle with a protractor (reading uncertainty ±0.5°) or by trigonometry, sin θ = h ÷ ℓ, with the height h read from a metre rule (± 0.5 mm) on a ramp of length ℓ = 2.0 m.'));
s1.push(NOTE('Δ(sin θ) = cos θ × Δθ (Δθ in radians) for the protractor. Δ(sin θ) = Δh ÷ ℓ for trigonometry.'));
s1.push(tbl(['θ (°)', 'sin θ', 'Δ(sin θ) protractor', '% protractor', 'Δ(sin θ) trig', '% trig'], [['4', '', '', '', '', ''], ['16', '', '', '', '', '']], fit([1000, 1400, 2200, 1700, 1900, 1400], PW), { rowH: 480 }));
s1.push(NOTE('Which method would you choose and why?'));
s1.push(lines(1, PW, 400, 520));

/* ---------------- Part 2 (landscape): results ---------------- */
s2.push(H1('Part 2  Collect results'));
['Stage A: choose one angle (θ = ________ °). Keep it the same. Change the distance s from the start line to the light gate.', 'Release the trolley from rest, with no push. Record t with your timer and v from the light gate.', 'Do 3 runs at each setting. Cross out any obvious anomaly. Do not rub it out.', 'Stage B: keep s = ________ m. Change the angle θ. Record t or v and work out a.'].forEach(t => s2.push(STEP(t)));
s2.push(P('**Table 1**  Stage A: time. Δt is half the range of your three readings. Δ(t̄²) = 2 t̄ Δt.', { before: 60, after: 40, keepNext: true }));
s2.push(tbl(['s (m)', 't_{1} (s)', 't_{2} (s)', 't_{3} (s)', 't̄ (s)', 'Δt (s)', 't̄^{2} (s^{2})', 'Δ(t̄^{2}) (s^{2})', 'a = 2s / t̄^{2} (m s^{-2})', '% uncertainty in a'], blanks(5, 10, ['0.4', '0.6', '0.8', '1.0', '1.2']), fit([900, 1100, 1100, 1100, 1100, 1100, 1500, 1700, 2300, 1700], LW), { rowH: 310 }));
s2.push(P('**Table 2**  Stage A: speed at the light gate. Δ(v̄²) = 2 v̄ Δv.', { before: 110, after: 40, keepNext: true }));
s2.push(tbl(['s (m)', 'v_{1} (m s^{-1})', 'v_{2} (m s^{-1})', 'v_{3} (m s^{-1})', 'v̄ (m s^{-1})', 'Δv (m s^{-1})', 'v̄^{2} (m^{2} s^{-2})', 'Δ(v̄^{2}) (m^{2} s^{-2})', 'a = v̄^{2} / 2s (m s^{-2})', '% uncertainty in a'], blanks(5, 10, ['0.4', '0.6', '0.8', '1.0', '1.2']), fit([900, 1300, 1300, 1300, 1300, 1300, 1500, 1800, 2000, 1600], LW), { rowH: 310 }));
s2.push(P('**Table 3**  Stage B: acceleration at different angles (s = ________ m). a = 2s / t̄², so the % uncertainty in a is 2 × the % uncertainty in t̄.', { before: 110, after: 40, keepNext: true }));
s2.push(tbl(['θ (°) or h (mm)', 'sin θ', 'Δ(sin θ)', 't_{1} (s)', 't_{2} (s)', 't_{3} (s)', 't̄ (s)', 'Δt (s)', 'a (m s^{-2})', 'Δa (m s^{-2})'], blanks(5, 10), fit([1500, 1100, 1200, 1000, 1000, 1000, 1000, 1000, 1500, 1500], LW), { rowH: 310 }));

/* ---------------- Part 3: Stage A analysis ---------------- */
s3.push(H1('Part 3  Stage A: do t² and v² depend on s the way the equations say?'));
s3.push(Q(QN(), 'Starting from rest, s = ½at² and v² = 2as. Predict the shape of each graph and sketch it.', { before: 60 }));
s3.push(img('pred_A.png', 400)); s3.push(NOTE('Sketch t against s (left) and v against s (right).'));
s3.push(P('**Graph 1**  Plot t against s from Table 1 with error bars. This is the raw data. Is it a straight line?', { before: 100, after: 40, keepNext: true }));
s3.push(img('grid_t_s.png', 400));
s3.push(Q(QN(), 'What should you plot instead to get a straight line through the origin? Write the equation in the form y = mx + c.', { before: 60 }));
s3.push(EQ([mr('s = '), frac([mr('1')], [mr('2')]), mr('a t'), sup('', '2'), mr('      →      '), sup('t', '2'), mr(' = '), frac([mr('2')], [mr('a')]), mr(' s')]));
s3.push(lines(2, PW, 430, 520));
s3.push(P('**Graph 2**  Plot t̄² against s with error bars (from Table 1). Draw the best line, the steepest line and the shallowest line that pass through all the error bars.', { before: 100, after: 40, keepNext: true }));
s3.push(img('grid_t2_s.png', 400));
s3.push(Q(QN(), 'Find the gradient with its uncertainty and the intercept. The uncertainty in the gradient is half the difference between the steepest and shallowest lines.', { before: 60 }));
s3.push(EQ([mr('Δ(gradient) = '), frac([mr('1')], [mr('2')]), mr('('), sub('gradient', 'steepest'), mr(' − '), sub('gradient', 'shallowest'), mr(')')]));
s3.push(lines(3, PW, 430, 520));
s3.push(Q(QN(), 'Use the gradient to find a from t² against s, with its uncertainty. Does the line go through the origin within its uncertainty?'));
s3.push(lines(3, PW, 430, 520));
s3.push(P('**Graph 3**  Plot v̄² against s with error bars (from Table 2). Draw the best, steepest and shallowest lines.', { before: 100, after: 40, keepNext: true }));
s3.push(img('grid_v2_s.png', 400));
s3.push(Q(QN(), 'What should the gradient equal? Find a from the gradient, with its uncertainty. Do the two values of a (from t² and from v²) agree within their uncertainties?', { before: 60 }));
s3.push(lines(3, PW, 430, 520));
s3.push(Q(QN(), 'Is the acceleration you found equal to g sin θ? Calculate g sin θ for your angle and compare. Does the difference stop the equations of motion from being validated?'));
s3.push(lines(3, PW, 430, 520));

/* ---------------- Part 4: Stage B ---------------- */
s3.push(H1('Part 4  Stage B: does a = g sin θ?', { newPage: true }));
s3.push(Q(QN(), 'Predict the shape of a against θ and of a against sin θ. If a = g sin θ, what should the gradient and the intercept of a against sin θ be?', { before: 60 }));
s3.push(img('pred_B.png', 400)); s3.push(NOTE('Sketch a against θ (left) and a against sin θ (right).'));
s3.push(lines(2, PW, 430, 520));
s3.push(P('**Graph 4**  Plot a against θ from Table 3 with error bars. Is it a straight line?', { before: 100, after: 40, keepNext: true }));
s3.push(img('grid_a_th.png', 400));
s3.push(P('**Graph 5**  Plot a against sin θ with error bars in both directions. Draw the best, steepest and shallowest lines.', { before: 100, after: 40, keepNext: true }));
s3.push(img('grid_a_sin.png', 400));
s3.push(Q(QN(), 'Find the gradient and the intercept, each with its uncertainty.', { before: 60 }));
s3.push(lines(3, PW, 430, 520));
s3.push(Q(QN(), 'The gradient is g. Does the accepted value, 9.81 m s^{-2}, lie within your value ± its uncertainty? What is your % uncertainty in g?'));
s3.push(lines(2, PW, 430, 520));
s3.push(Q(QN(), 'Does your line pass through the origin? If not, what does the intercept tell you? Would repeating the readings remove it? Explain.'));
s3.push(lines(3, PW, 430, 520));

/* ---------------- Part 5: Validation ---------------- */
s3.push(H1('Part 5  Validation and evaluation'));
s3.push(Q(QN(), 'Complete the validation table.', { before: 60 }));
s3.push(tbl(['Test', 'Prediction', 'Your result ± uncertainty', 'Prediction inside your range? (yes / no)'], [['Graph 2: t² against s, intercept', '0', '', ''], ['Graph 2: a from the gradient', 'a from Graph 3', '', ''], ['Graph 3: v² against s, intercept', '0', '', ''], ['Graph 5: a against sin θ, intercept', '0', '', ''], ['Graph 5: g from the gradient', '9.81 m s^{-2}', '', '']], [3400, 1800, 2400, 2038], { rowH: 520, firstLeft: true }));
s3.push(Q(QN(), 'Write a conclusion. State what you have validated, and what you have not. Give your evidence.', { before: 100 }));
s3.push(lines(4, PW, 430, 520));
s3.push(Q(QN(), 'A validation can still be weak. Which uncertainty limited your test most? How strong is your validation (look at the % uncertainty in each gradient)? What would you change?'));
s3.push(lines(3, PW, 430, 520));
s3.push(Q(QN(), 'Describe a systematic error in this experiment. Which results does it affect and which does it leave alone? How could you reduce it?'));
s3.push(lines(3, PW, 430, 520));

/* ---------------- Part 6: Design in the simulation ---------------- */
s3.push(H1('Part 6  Improve the design', { newPage: true }));
s3.push(P('Use the simulation to test designs before you plan the real measurements:', { after: 20 }));
s3.push(new Paragraph({ spacing: { after: 100 }, children: [new ExternalHyperlink({ link: SIM, children: [new TextRun({ text: SIM, font: FONT, size: 19, style: 'Hyperlink', color: BL, underline: {} })] })] }));
s3.push(BOX([P('**Targets for a good design**', { after: 40 }),
  EQ([mr('Δa'), mr(' / '), mr('a'), mr(' × 100% ≤ 5%'), mr('          Δ(sin θ) / sin θ × 100% ≤ 5%')]),
  P('The timing should last at least 10 × the timer uncertainty. For Stage B, the largest sin θ should be at least 4 × the smallest.', { after: 0 })], ORL, OR));
s3.push(gap(60));
s3.push(H2('Task A  Timer and distance (Stage A, ramp 2.0 m)'));
s3.push(tbl(['Timer', 's = 0.4 m', 's = 0.6 m', 's = 1.0 m', 's = 1.4 m', 's = 1.8 m'], [['Hand stopwatch', '', '', '', '', ''], ['Video (frame by frame)', '', '', '', '', ''], ['Light gate (speed)', '', '', '', '', '']], [2600, 1400, 1400, 1400, 1400, 1438], { rowH: 450, firstLeft: true }));
s3.push(NOTE('Record the % uncertainty in a at θ = 8°. Which designs meet the 5% target? Why does a longer distance help?'));
s3.push(lines(2, PW, 430, 520));
s3.push(H2('Task B  Angle (Stage B)'));
s3.push(tbl(['θ (°)', '2', '4', '8', '12', '16', '20'], [['% uncertainty in sin θ, protractor', '', '', '', '', '', ''], ['% uncertainty in sin θ, trigonometry', '', '', '', '', '', ''], ['Friction changes a by (%)', '', '', '', '', '', '']], [2900, 1123, 1123, 1123, 1123, 1123, 1123], { rowH: 480, firstLeft: true }));
s3.push(NOTE('A big angle makes the sin θ error small but the run short. Friction changes a by a larger percentage at a small angle. Choose your smallest and largest angles and explain your choice. Is it better to hide the friction or to see it?'));
s3.push(lines(3, PW, 430, 520));

/* ---------------- teacher answers ---------------- */
s3.push(new Paragraph({ pageBreakBefore: true, spacing: { after: 100 }, children: [new TextRun({ text: 'Teacher answers  (remove before printing)', font: FONT, bold: true, size: 30, color: OR })] }));
s3.push(P('**Model** (also in the simulation): trolley ' + f(d.MASS, 3) + ' kg, a = g(sin θ − μ cos θ) with kinetic friction μ = ' + d.MU + ', released from rest. Stopwatch ±0.07 s, video ±0.01 s (release and judging 0.02 s), light gate with a 0.100 m card about 1% in v. Protractor ±' + d.PROT + '°, height ±' + (d.DH * 1000) + ' mm on ℓ = ' + f(d.ELL, 1) + ' m. Anomalies about 4% of readings.', { after: 60 }));
s3.push(P('**Stage A expected** (θ = ' + d.TH_A + '°, video timer, light gate). a = ' + f(d.aA, 3) + ' m s^{-2} (g sin θ = ' + f(d.aIdealA, 3) + ' m s^{-2}).', { after: 40, keepNext: true }));
s3.push(tbl(['s (m)', 't (s)', 'Δt (s)', 't^{2} (s^{2})', 'Δ(t^{2})', 'v (m s^{-1})', 'Δv', 'v^{2} (m^{2} s^{-2})', 'Δ(v^{2})', '% unc. a (t)', '% unc. a (v)'], A.map(r => [f(r.s, 1), f(r.t, 3), f(r.dt, 3), f(r.t2, 3), f(r.dt2, 3), f(r.v, 3), f(r.dv, 3), f(r.v2, 3), f(r.dv2, 3), f(r.pctA_t, 1), f(r.pctA_v, 1)]), fit([700, 800, 800, 1000, 900, 1000, 800, 1100, 900, 900, 900], PW), { rowH: 270, hsize: 15 }));
s3.push(P('Graph 2: t² against s, gradient 2/a = **' + f(d.fitT2.slope, 3) + ' s² per m**, intercept 0. Graph 3: v² against s, gradient 2a = **' + f(d.fitV2.slope, 3) + '** m s^{-2}, intercept 0. The product of the two gradients is 4. a from either graph is ' + f(d.aA, 2) + ' m s^{-2}, which is **not** g sin θ = ' + f(d.aIdealA, 2) + ' m s^{-2} because of friction, yet both graphs still validate s = ½at² and v² = 2as: friction changes a but not the shape of the graph. Expect the two a values to agree and the intercepts to be zero within uncertainty.', { before: 80, after: 60 }));
s3.push(P('**Stage B expected** (s = ' + f(d.S_B, 1) + ' m, video timer, ℓ = ' + f(d.ELL, 1) + ' m)', { after: 40, keepNext: true }));
s3.push(tbl(['θ (°)', 'h (mm)', 'sin θ', 'Δ(sin θ) trig', '% protractor', 't (s)', 'a (m s^{-2})', '% unc. a', 'g sin θ', 'friction %'], B.map(r => [String(r.th), f(r.h_mm, 0), f(r.sin, 4), f(r.dsin_trig, 5), f(r.pct_prot, 1), f(r.t, 3), f(r.a, 3), f(r.pctA, 1), f(r.ideal, 3), f(r.fric, 1)]), fit([700, 800, 900, 1100, 1100, 800, 1000, 900, 900, 900], PW), { rowH: 270, hsize: 15 }));
s3.push(P('Graph 5: gradient **' + f(d.fitB.slope, 2) + '** m s^{-2} (g = 9.81), intercept **' + f(d.fitB.intercept, 3) + '** m s^{-2} (about −μg = ' + f(-d.MU * d.G, 3) + '). With trigonometry and a good timer the intercept is usually clearly non-zero, so a is **not exactly proportional** to sin θ: friction, a systematic error. With a protractor the horizontal error bars are so big that the same data seem to validate a = g sin θ: a weak test, not a better result.', { before: 80, after: 60 }));
[
  '**Q1** Stage A: change s / measure t and v / keep θ, mass, release from rest, gate position. Stage B: change θ / measure t (or v), then work out a / keep s, mass, release from rest, timer.',
  '**Q2** u = 0 is needed for s = ½at² and v² = 2as; a push gives u ≠ 0.',
  '**Q3** Protractor: Δ(sin θ) = cos θ × 0.0087 rad: 4° gives ' + f(d.design.sinPct[1].prot, 1) + '%, 16° gives ' + f(d.design.sinPct[5].prot, 1) + '%. Trigonometry: Δ(sin θ) = 0.5 mm ÷ 2000 mm = 0.00025: 4° gives ' + f(d.design.sinPct[1].trig, 2) + '%, 16° gives ' + f(d.design.sinPct[5].trig, 2) + '%. Trigonometry wins, especially at small angles.',
  '**Graphs 1 to 3** t against s is curved (t ∝ √s); t² = (2/a)s is straight through the origin. Gradient(t²) × gradient(v²) = 4 is a check on both.',
  '**Part 5 table** Intercepts for Graphs 2 and 3: 0 inside the range. The two a values agree. Graph 5 intercept is negative (friction) and g inside its range.',
  '**Part 5 conclusion** Validated: s = ½at² and v² = u² + 2as for constant acceleration; and a ∝ sin θ with gradient g, apart from a small negative intercept. Not validated: that a is exactly g sin θ, because friction makes a smaller. Repeating does not remove friction.',
  '**Task A** % uncertainty in a at θ = 8° for s = 0.4/0.6/1.0/1.4/1.8 m: ' + d.design.accel.map(u => u.timer + ' ' + u.byS.map(b => f(b.pct, 1) + '%').join(', ')).join('; ') + '. Timer errors are fixed amounts of time, so longer runs give a smaller percentage; the gate is about 2% throughout.',
  '**Task B** % in sin θ protractor/trig at 2/4/8/12/16/20°: ' + d.design.sinPct.map(r => f(r.prot, 1) + '/' + f(r.trig, 2)).join(', ') + '. Friction effect %: ' + d.design.sinPct.map(r => f(r.fric, 1)).join(', ') + '. Trade-off: a large angle shortens the run, a small angle exposes friction but gives a big sin θ error. Accept a justified range such as 4° to 16° by trigonometry.'
].forEach(t => s3.push(BUL(t)));

const title = 'Ramp Practical  ·  Physics practical';
const sections = [
  { properties: K.pagePort, headers: { default: K.hdr(title) }, footers: { default: K.ftr() }, children: s1 },
  { properties: K.pageLand, headers: { default: K.hdr(title) }, footers: { default: K.ftr() }, children: s2 },
  { properties: K.pagePort, headers: { default: K.hdr(title) }, footers: { default: K.ftr() }, children: s3 }];
const doc = new K.Document({ creator: 'James Clarke', title: 'Ramp Practical', styles: K.styles, numbering: K.numbering, sections });
K.Packer.toBuffer(doc).then(b => { K.fs.mkdirSync('out', { recursive: true }); K.fs.writeFileSync('out/ramp-practical_worksheet.docx', b); console.log('out/ramp-practical_worksheet.docx written'); });
