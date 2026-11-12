// Step 3: build the Word document. Student pages first, then the extension (teacher led), teacher answers last. All numbers come from data.json.
const K = require('../../tools/worksheet-kit/kit.cjs');
const { P, H1, H2, Q, NOTE, EQ, mr, frac, sub, sup, lines, gap, tbl, blanks, img, CAP, BOX, BUL, STEP, PW, LW, Paragraph, TextRun, FONT, BL, OR, INK, ORL, ExternalHyperlink } = K;
const d = JSON.parse(K.fs.readFileSync('data.json', 'utf8'));
const f = (x, n = 2) => x.toFixed(n);
const SIM = 'https://jamesclarke2-bit.github.io/physicsapps/ramp-practical/';
const fit = (w, total) => { const s = w.reduce((a, b) => a + b, 0); const o = w.map(x => Math.round(x * total / s)); o[o.length - 1] += total - o.reduce((a, b) => a + b, 0); return o; };
let n = 0; const QN = () => ++n;
const s1 = [], s2 = [], s3 = [];
const A = d.stageA, B = d.stageB, X = d.example;
const L = (k) => lines(k, PW, 430, 520);

/* ---------------- page 1: aim, set-up, plan ---------------- */
s1.push(new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: 'PRACTICAL TASK: TROLLEY ON A RAMP', font: FONT, bold: true, size: 40, color: BL })] }));
s1.push(new Paragraph({ spacing: { after: 140 }, children: [new TextRun({ text: 'Design it, measure it, turn the data into straight lines', font: FONT, size: 26, color: INK })] }));
s1.push(P('Name: ______________________    Class: ____________    Date: ____________', { after: 120 }));
s1.push(BOX([P('**Aim** Use a trolley on a ramp to test (1) the equations of motion for constant acceleration from rest, s = ½at² and v² = u² + 2as, and (2) the prediction a = g sin θ. You will do this by changing the data into straight-line graphs and using their gradients and intercepts.', { after: 0 })]));
s1.push(img('fig_rig.png', 390));
s1.push(CAP('Figure 1: A trolley released from rest at the start line. A timer gives t. A light gate with a card on the trolley gives v at the bottom.'));
s1.push(H1('Part 1: Design your experiment'));
s1.push(P('There are two linked stages. Use the simulation (link in the extension) to try your design before you take the real measurements.', { after: 60 }));
s1.push(Q(QN(), 'Complete the variables for each stage.', { before: 40 }));
s1.push(tbl(['Stage A: equations of motion', 'Stage B: a against angle'], [['Change:', 'Change:'], ['Measure:', 'Measure:'], ['Keep the same:', 'Keep the same:']], [4819, 4819], { rowH: 620, firstFill: false, hsize: 19, leftAll: true }));
s1.push(Q(QN(), 'Why must the trolley be released from rest, with no push?', { before: 100 }));
s1.push(L(2));
s1.push(Q(QN(), 'You can find the angle with a protractor, or by trigonometry using sin θ = h ÷ ℓ, where h is the height of the ramp end and ℓ is the length of the ramp. Which will you use and why?'));
s1.push(L(2));

/* ---------------- Part 2 (landscape): results ---------------- */
s2.push(H1('Part 2: Collect results'));
['Stage A: choose one angle (θ = ________ °). Keep it the same. Change the distance s from the start line to the light gate.', 'Release the trolley from rest, with no push. Record t with your timer and v from the light gate.', 'Do 3 runs at each setting. Cross out any obvious anomaly. Do not rub it out. Use the other readings to find the mean.', 'Stage B: keep s = ________ m. Change the angle θ. Record t and work out a.'].forEach(t => s2.push(STEP(t)));
s2.push(P('**Table 1:** Stage A, time. Work out t̄², then a.', { before: 80, after: 40, keepNext: true }));
s2.push(tbl(['s (m)', 't_{1} (s)', 't_{2} (s)', 't_{3} (s)', 't̄ (s)', 't̄^{2} (s^{2})', 'a = 2s ÷ t̄^{2} (m s^{-2})'], blanks(5, 7, ['0.4', '0.6', '0.8', '1.0', '1.2']), fit([1000, 1300, 1300, 1300, 1300, 1700, 2600], LW), { rowH: 340 }));
s2.push(P('**Table 2:** Stage A, speed at the light gate. Work out v̄², then a.', { before: 140, after: 40, keepNext: true }));
s2.push(tbl(['s (m)', 'v_{1} (m s^{-1})', 'v_{2} (m s^{-1})', 'v_{3} (m s^{-1})', 'v̄ (m s^{-1})', 'v̄^{2} (m^{2} s^{-2})', 'a = v̄^{2} ÷ 2s (m s^{-2})'], blanks(5, 7, ['0.4', '0.6', '0.8', '1.0', '1.2']), fit([1000, 1400, 1400, 1400, 1400, 1700, 2400], LW), { rowH: 340 }));
s2.push(P('**Table 3:** Stage B, acceleration at different angles (s = ________ m). Work out sin θ, then a = 2s ÷ t̄².', { before: 140, after: 40, keepNext: true }));
s2.push(tbl(['θ (°) or h (mm)', 'sin θ', 't_{1} (s)', 't_{2} (s)', 't_{3} (s)', 't̄ (s)', 'a (m s^{-2})'], blanks(5, 7), fit([1700, 1300, 1200, 1200, 1200, 1300, 1700], LW), { rowH: 340 }));

/* ---------------- Part 3: Stage A analysis ---------------- */
s3.push(H1('Part 3: Stage A, do t² and v² depend on s the way the equations say?'));
s3.push(Q(QN(), 'Starting from rest, s = ½at² and v² = 2as. Predict the shape of each graph and sketch it.', { before: 60 }));
s3.push(img('pred_A.png', 400)); s3.push(NOTE('Sketch t against s (left) and v against s (right).'));
s3.push(P('**Graph 1:** Plot t against s from Table 1. This is the raw data. Is it a straight line?', { before: 100, after: 40, keepNext: true }));
s3.push(img('grid_t_s.png', 400));
s3.push(Q(QN(), 'What should you plot instead to get a straight line through the origin? Write the equation in the form y = mx + c.', { before: 60 }));
s3.push(EQ([mr('s = '), frac([mr('1')], [mr('2')]), mr('a t'), sup('', '2'), mr('      →      '), sup('t', '2'), mr(' = '), frac([mr('2')], [mr('a')]), mr(' s')]));
s3.push(L(2));
s3.push(P('**Graph 2:** Plot t̄² against s from Table 1. Draw the line of best fit.', { before: 100, after: 40, keepNext: true }));
s3.push(img('grid_t2_s.png', 400));
s3.push(Q(QN(), 'Find the gradient and the intercept. Use the gradient to find a.', { before: 60 }));
s3.push(L(3));
s3.push(P('**Graph 3:** Plot v̄² against s from Table 2. Draw the line of best fit.', { before: 100, after: 40, keepNext: true }));
s3.push(img('grid_v2_s.png', 400));
s3.push(Q(QN(), 'What should the gradient equal? Find a from the gradient. Do the two values of a (from t² and from v²) agree closely?', { before: 60 }));
s3.push(L(3));
s3.push(Q(QN(), 'Calculate g sin θ for your angle and compare it with your value of a. Which is bigger? Suggest why.'));
s3.push(L(3));

/* ---------------- Part 4: Stage B ---------------- */
s3.push(H1('Part 4: Stage B, does a = g sin θ?', { newPage: true }));
s3.push(Q(QN(), 'Predict the shape of a against θ and of a against sin θ. If a = g sin θ, what should the gradient and the intercept of a against sin θ be?', { before: 60 }));
s3.push(img('pred_B.png', 400)); s3.push(NOTE('Sketch a against θ (left) and a against sin θ (right).'));
s3.push(L(2));
s3.push(P('**Graph 4:** Plot a against θ from Table 3. Is it a straight line?', { before: 100, after: 40, keepNext: true }));
s3.push(img('grid_a_th.png', 400));
s3.push(P('**Graph 5:** Plot a against sin θ from Table 3. Draw the line of best fit.', { before: 100, after: 40, keepNext: true }));
s3.push(img('grid_a_sin.png', 400));
s3.push(Q(QN(), 'Find the gradient and the intercept of Graph 5.', { before: 60 }));
s3.push(L(2));
s3.push(Q(QN(), 'The gradient is g. Compare it with 9.81 m s^{-2}. What is the percentage difference?'));
s3.push(L(2));
s3.push(Q(QN(), 'Does your line pass through the origin? If not, what does the intercept tell you?'));
s3.push(L(3));

/* ---------------- Part 5: Conclusion ---------------- */
s3.push(H1('Part 5: Conclusion'));
s3.push(Q(QN(), 'Which of your graphs were straight lines through the origin? What does that tell you about the equations s = ½at², v² = 2as and a = g sin θ?', { before: 60 }));
s3.push(L(3));
s3.push(Q(QN(), 'Describe a systematic error in this experiment. Which results does it affect and which does it leave alone? Would repeating the readings remove it? Explain.'));
s3.push(L(3));

/* ---------------- Extension: uncertainty and validation (teacher led) ---------------- */
const fT = X.fT, fV = X.fV, fB = X.fB, g = (k) => f(k, 2);
const lo = (v, u, dp = 2) => f(v - u, dp), hi = (v, u, dp = 2) => f(v + u, dp);
s3.push(H1('Extension: how sure are we? Uncertainty and validation', { newPage: true }));
s3.push(BOX([P('**Best fit and worst fit.** The line of best fit gives your value. To see how far the gradient could reasonably change, draw the **steepest** and the **shallowest** line that still run through the scatter of points (the worst-fit lines). Then:', { after: 40 }),
  EQ([mr('uncertainty in gradient = '), frac([mr('1')], [mr('2')]), mr('(steepest gradient − shallowest gradient)')]),
  P('**Valid** means the value you are testing against lies inside your result ± its uncertainty. A big uncertainty makes this easy but the test weak.', { after: 0 })]));
s3.push(H2('Worked example 1: Stage A (θ = 8°, stopwatch for t, light gate for v, 3 runs at each distance)'));
s3.push(tbl(['s (m)', ...X.A.map(r => f(r.s, 1))], [['t̄ (s)', ...X.A.map(r => f(r.t, 3))], ['t̄^{2} (s^{2})', ...X.A.map(r => f(r.t2, 3))], ['v̄ (m s^{-1})', ...X.A.map(r => f(r.v, 3))], ['v̄^{2} (m^{2} s^{-2})', ...X.A.map(r => f(r.v2, 3))]], fit([1900, 1100, 1100, 1100, 1100, 1100, 1100, 1100], PW), { rowH: 330, firstLeft: true, hsize: 17 }));
s3.push(gap(60));
s3.push(img('ex_A.png', 470, true));
s3.push(CAP('Figure 2: t̄² against s (left) and v̄² against s (right), each with the best-fit line (solid) and the steepest and shallowest lines (dashed and dotted). The crosses mark the points used to read the gradients.'));
s3.push(P('**Graph of t̄² against s.** t² = (2 ÷ a) s, so a = 2 ÷ gradient.', { after: 40 }));
s3.push(BUL('Steepest line: from (' + f(fT.steep.x0, 1) + ', ' + f(fT.steep.y0, 2) + ') to (' + f(fT.steep.x1, 1) + ', ' + f(fT.steep.y1, 2) + '): gradient = ' + f(fT.steep.slope, 2) + ' s² m^{-1}. Shallowest line: gradient = ' + f(fT.shallow.slope, 2) + ' s² m^{-1}. Best fit: ' + f(fT.best.slope, 2) + ' s² m^{-1}.'));
s3.push(BUL('Uncertainty in gradient = ½ (' + f(fT.steep.slope, 2) + ' − ' + f(fT.shallow.slope, 2) + ') = ' + f(fT.dSlope, 2) + ' s² m^{-1}.'));
s3.push(BUL('a = 2 ÷ ' + f(fT.best.slope, 2) + ' = ' + f(X.aT, 2) + ' m s^{-2}. The percentage uncertainty is the same as in the gradient: ' + f(100 * fT.dSlope / fT.best.slope, 1) + '% of ' + f(X.aT, 2) + ' = ' + f(X.daT, 2) + '. So **a = ' + f(X.aT, 2) + ' ± ' + f(X.daT, 2) + '** m s^{-2}, a range of ' + lo(X.aT, X.daT) + ' to ' + hi(X.aT, X.daT) + '.'));
s3.push(P('**Graph of v̄² against s.** v² = 2as, so a = gradient ÷ 2. Best-fit gradient ' + f(fV.best.slope, 2) + ', steepest ' + f(fV.steep.slope, 2) + ', shallowest ' + f(fV.shallow.slope, 2) + ' m s^{-2}, so the uncertainty is ½ (' + f(fV.steep.slope, 2) + ' − ' + f(fV.shallow.slope, 2) + ') = ' + f(fV.dSlope, 2) + '. Then **a = ' + f(X.aV, 2) + ' ± ' + f(X.daV, 2) + '** m s^{-2}, a range of ' + lo(X.aV, X.daV) + ' to ' + hi(X.aV, X.daV) + '.', { before: 80, after: 60 }));
s3.push(BOX([P('**Is it valid?** The two ranges overlap (' + lo(X.aT, X.daT) + ' to ' + hi(X.aT, X.daT) + ' and ' + lo(X.aV, X.daV) + ' to ' + hi(X.aV, X.daV) + '), so the time method and the speed method agree, and both lines pass close to the origin. **s = ½at² and v² = 2as are validated.**', { after: 40 }),
  P('Compare with g sin θ = ' + f(X.gs, 3) + ' m s^{-2}. This is outside **both** ranges, so a ≠ g sin θ. The equations of motion are still valid; something is reducing a (friction). This is a different test, and it fails.', { after: 0 })], ORL, OR));
s3.push(H2('Worked example 2: Stage B (s = 1.0 m, stopwatch, angle by trigonometry)'));
s3.push(tbl(['θ (°)', ...X.B.map(r => String(r.th))], [['sin θ', ...X.B.map(r => f(r.sin, 3))], ['t̄ (s)', ...X.B.map(r => f(r.t, 3))], ['a (m s^{-2})', ...X.B.map(r => f(r.a, 2))]], fit([1700, 1300, 1300, 1300, 1300, 1300, 1300], PW), { rowH: 330, firstLeft: true, hsize: 17 }));
s3.push(gap(60));
s3.push(img('ex_asin.png', 250, true));
s3.push(CAP('Figure 3: a against sin θ with the best-fit line and the steepest and shallowest lines.'));
s3.push(BUL('Gradient (= g): best fit ' + f(fB.best.slope, 2) + ', steepest ' + f(fB.steep.slope, 2) + ', shallowest ' + f(fB.shallow.slope, 2) + ' m s^{-2}. Uncertainty = ½ (' + f(fB.steep.slope, 2) + ' − ' + f(fB.shallow.slope, 2) + ') = ' + f(fB.dSlope, 2) + '. So **g = ' + f(fB.best.slope, 1) + ' ± ' + f(fB.dSlope, 1) + '** m s^{-2}, a range of ' + lo(fB.best.slope, fB.dSlope, 1) + ' to ' + hi(fB.best.slope, fB.dSlope, 1) + '. The accepted value 9.81 is inside the range, so **g is validated**.'));
s3.push(BUL('Intercept: best fit ' + f(fB.best.intercept, 2) + ', steepest ' + f(fB.steep.intercept, 2) + ', shallowest ' + f(fB.shallow.intercept, 2) + ' m s^{-2}. Uncertainty = ½ |' + f(fB.steep.intercept, 2) + ' − (' + f(fB.shallow.intercept, 2) + ')| = ' + f(fB.dInt, 2) + '. So the intercept is **' + f(fB.best.intercept, 2) + ' ± ' + f(fB.dInt, 2) + '** m s^{-2}, a range of ' + lo(fB.best.intercept, fB.dInt) + ' to ' + hi(fB.best.intercept, fB.dInt) + '. Zero is **not** inside, so a is not exactly proportional to sin θ.'));
s3.push(BUL('The negative intercept means that a is a bit smaller than g sin θ at every angle: friction. Repeating the readings would show the scatter but would not remove it.'));
s3.push(Q('E1', 'Which of the two values of a in example 1 has the bigger percentage uncertainty? Why do you think that is?', { before: 100 }));
s3.push(L(2));
s3.push(Q('E2', 'A student says: "The intercept should be zero, so my data are wrong." Is she right? Use the uncertainty to explain.'));
s3.push(L(3));
s3.push(Q('E3', 'Why does a longer ramp or a bigger angle (a longer or bigger measurement) reduce the percentage uncertainty in a gradient?'));
s3.push(L(2));

/* ---------------- Extension: design ---------------- */
s3.push(H1('Extension: reduce the uncertainty (simulation)', { newPage: true }));
s3.push(P('Use the simulation to test designs before you plan the real measurements:', { after: 20 }));
s3.push(new Paragraph({ spacing: { after: 100 }, children: [new ExternalHyperlink({ link: SIM, children: [new TextRun({ text: SIM, font: FONT, size: 19, style: 'Hyperlink', color: BL, underline: {} })] })] }));
s3.push(BOX([P('**Targets for a good design**', { after: 40 }),
  EQ([mr('Δa'), mr(' ÷ '), mr('a'), mr(' × 100% ≤ 5%'), mr('          Δ(sin θ) ÷ sin θ × 100% ≤ 5%')]),
  P('The timing should last at least 10 × the timer uncertainty. For Stage B, the largest sin θ should be at least 4 × the smallest.', { after: 0 })], ORL, OR));
s3.push(gap(60));
s3.push(H2('Task A: timer and distance (Stage A, ramp 2.0 m)'));
s3.push(tbl(['Timer', 's = 0.4 m', 's = 0.6 m', 's = 1.0 m', 's = 1.4 m', 's = 1.8 m'], [['Hand stopwatch', '', '', '', '', ''], ['Video (frame by frame)', '', '', '', '', ''], ['Light gate (speed)', '', '', '', '', '']], [2600, 1400, 1400, 1400, 1400, 1438], { rowH: 450, firstLeft: true }));
s3.push(NOTE('Record the % uncertainty in a at θ = 8°. Which designs meet the 5% target? Why does a longer distance help?'));
s3.push(L(2));
s3.push(H2('Task B: angle (Stage B)'));
s3.push(NOTE('Protractor: Δ(sin θ) = cos θ × Δθ (Δθ in radians, ±0.5° = ±0.0087 rad). Trigonometry: Δ(sin θ) = Δh ÷ ℓ, with Δh = ±0.5 mm on ℓ = 2.0 m.'));
s3.push(tbl(['θ (°)', '2', '4', '8', '12', '16', '20'], [['% uncertainty in sin θ, protractor', '', '', '', '', '', ''], ['% uncertainty in sin θ, trigonometry', '', '', '', '', '', ''], ['Friction changes a by (%)', '', '', '', '', '', '']], [2900, 1123, 1123, 1123, 1123, 1123, 1123], { rowH: 480, firstLeft: true }));
s3.push(NOTE('A big angle makes the sin θ error small but the run short. Friction changes a by a larger percentage at a small angle. Choose your smallest and largest angles and explain your choice. Is it better to hide the friction or to see it?'));
s3.push(L(3));

/* ---------------- teacher answers ---------------- */
s3.push(new Paragraph({ pageBreakBefore: true, spacing: { after: 100 }, children: [new TextRun({ text: 'Teacher answers (remove before printing)', font: FONT, bold: true, size: 30, color: OR })] }));
s3.push(P('**Model** (also in the simulation): trolley ' + f(d.MASS, 3) + ' kg, a = g(sin θ − μ cos θ) with kinetic friction μ = ' + d.MU + ', released from rest. Stopwatch ±0.07 s, video ±0.01 s (release and judging 0.02 s), light gate with a 0.100 m card about 1% in v. Protractor ±' + d.PROT + '°, height ±' + (d.DH * 1000) + ' mm on ℓ = ' + f(d.ELL, 1) + ' m. Anomalies about 4% of readings.', { after: 60 }));
s3.push(P('**Stage A expected** (θ = ' + d.TH_A + '°). a = ' + f(d.aA, 3) + ' m s^{-2} (g sin θ = ' + f(d.aIdealA, 3) + ' m s^{-2}).', { after: 40, keepNext: true }));
s3.push(tbl(['s (m)', 't (s)', 't^{2} (s^{2})', 'v (m s^{-1})', 'v^{2} (m^{2} s^{-2})', 'a from t (m s^{-2})', 'a from v (m s^{-2})'], A.map(r => [f(r.s, 1), f(r.t, 3), f(r.t2, 3), f(r.v, 3), f(r.v2, 3), f(r.a_t, 3), f(r.a_v, 3)]), fit([800, 1000, 1200, 1200, 1500, 1500, 1500], PW), { rowH: 270, hsize: 15 }));
s3.push(P('Graph 2: t² against s, gradient 2/a = ' + f(d.fitT2.slope, 3) + ' s² per m, intercept 0. Graph 3: v² against s, gradient 2a = ' + f(d.fitV2.slope, 3) + ' m s^{-2}, intercept 0. The product of the two gradients is 4. Both a values are ' + f(d.aA, 2) + ' m s^{-2}, which is **not** g sin θ = ' + f(d.aIdealA, 2) + ' m s^{-2} because of friction, yet both graphs still support s = ½at² and v² = 2as: friction changes a but not the shape of the graph.', { before: 80, after: 60 }));
s3.push(P('**Stage B expected** (s = ' + f(d.S_B, 1) + ' m, ℓ = ' + f(d.ELL, 1) + ' m)', { after: 40, keepNext: true }));
s3.push(tbl(['θ (°)', 'h (mm)', 'sin θ', 't (s)', 'a (m s^{-2})', 'g sin θ (m s^{-2})', 'friction effect (%)'], B.map(r => [String(r.th), f(r.h_mm, 0), f(r.sin, 4), f(r.t, 3), f(r.a, 3), f(r.ideal, 3), f(r.fric, 1)]), fit([800, 1000, 1100, 1000, 1300, 1700, 1700], PW), { rowH: 270, hsize: 15 }));
s3.push(P('Graph 5: gradient ' + f(d.fitB.slope, 2) + ' m s^{-2} (g = 9.81), intercept ' + f(d.fitB.intercept, 3) + ' m s^{-2} (about −μg = ' + f(-d.MU * d.G, 3) + '). The intercept is negative because friction lowers a at every angle.', { before: 80, after: 60 }));
[
  '**Q1 to Q3** Stage A: change s, measure t and v, keep θ, mass, gate position. Stage B: change θ, measure t, keep s, mass, timer. Release from rest so u = 0. Trigonometry is better: ±0.5 mm on 2 m is tiny at any angle.',
  '**Extension: worked examples** a = ' + f(X.aT, 2) + ' ± ' + f(X.daT, 2) + ' (t²), ' + f(X.aV, 2) + ' ± ' + f(X.daV, 2) + ' (v²), g sin θ = ' + f(X.gs, 2) + ': the first two overlap, the third is outside both. g = ' + f(fB.best.slope, 1) + ' ± ' + f(fB.dSlope, 1) + ' contains 9.81; intercept ' + f(fB.best.intercept, 2) + ' ± ' + f(fB.dInt, 2) + ' excludes 0. E1: the t² value has the bigger percentage uncertainty (stopwatch reaction time). E2: no, zero is outside the range; the non-zero intercept is a systematic error (friction). E3: the timer and angle errors are fixed amounts, so a longer measurement makes them a smaller percentage.',
  '**Task A** % uncertainty in a at θ = 8° for s = 0.4/0.6/1.0/1.4/1.8 m: ' + d.design.accel.map(u => u.timer + ' ' + u.byS.map(b => f(b.pct, 1) + '%').join(', ')).join('; ') + '. Longer runs give a smaller percentage; the gate is about 2% throughout.',
  '**Task B** % in sin θ protractor/trig at 2/4/8/12/16/20°: ' + d.design.sinPct.map(r => f(r.prot, 1) + '/' + f(r.trig, 2)).join(', ') + '. Friction effect %: ' + d.design.sinPct.map(r => f(r.fric, 1)).join(', ') + '. Accept a justified range such as 4° to 16° by trigonometry (big angle: short run; small angle: big sin θ error but friction shows).'
].forEach(t => s3.push(BUL(t)));

const sections = [
  { properties: K.pagePort, footers: { default: K.ftr() }, children: s1 },
  { properties: K.pageLand, footers: { default: K.ftr() }, children: s2 },
  { properties: K.pagePort, footers: { default: K.ftr() }, children: s3 }];
const doc = new K.Document({ creator: 'James Clarke', title: 'Ramp Practical', styles: K.styles, numbering: K.numbering, sections });
K.Packer.toBuffer(doc).then(b => { K.fs.mkdirSync('out', { recursive: true }); K.fs.writeFileSync('out/ramp-practical_worksheet.docx', b); console.log('out/ramp-practical_worksheet.docx written'); });
