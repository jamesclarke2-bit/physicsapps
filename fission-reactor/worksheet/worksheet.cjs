// Step 3: build the Word document. Student pages first, teacher answers last (all numbers come from data.json).
const K = require('../../tools/worksheet-kit/kit.cjs');
const { P, H1, H2, Q, SUB, NOTE, EQ, mr, frac, sub, sup, vbar, tbar, lines, gap, tbl, blanks, img, CAP, BOX, BUL, STEP, PW, LW, MathRadical, Paragraph, TextRun, PageBreak, FONT, BL, OR, INK, ORL } = K;
const d = JSON.parse(K.fs.readFileSync('data.json', 'utf8'));
const f = (x, n = 2) => x.toFixed(n);

const s1 = [], s2 = [], s3 = [];
s1.push(new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: 'NUCLEAR FISSION REACTOR', font: FONT, bold: true, size: 46, color: BL })] }));
s1.push(new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text: 'Period, uncertainty and the T²–L graph', font: FONT, size: 26, color: INK })] }));
s1.push(P('Name: ______________________    Class: ____________    Date: ____________', { after: 140 }));
s1.push(BOX([P('**Aim**  Find how the period of a pendulum depends on its length, and use the results to find g.', { after: 60 }),
  P('**Variables**  Change: length L.  Measure: time for N swings.  Keep the same: bob, amplitude, N, timer.', { after: 0 })]));
s1.push(img('fig_rig.png', 420));
s1.push(CAP('Figure 1  The experimental set-up.'));
s1.push(H1('Part 1  Plan'));
s1.push(Q(1, 'Why time N swings instead of one?', { before: 80 }));
s1.push(lines(2, PW, 430, 520));
s1.push(Q(2, 'Choose an amplitude. Give a reason for your choice.'));
s1.push(lines(2, PW, 430, 520));
s1.push(Q(3, 'Predict how T changes as L increases.'));
s1.push(img('pred_axes.png', 280, true)); s1.push(CAP('Sketch your prediction.'));
s1.push(lines(2, PW, 430, 520));
s1.push(Q(4, 'Why do we repeat each timing?'));
s1.push(NOTE('Give two things repeating helps you to do.'));
s1.push(lines(2, PW, 430, 520));
s1.push(P('The uncertainty in a mean of random readings is half the range:', { before: 100, after: 40 }));
s1.push(EQ([mr('Δt = '), frac([mr('1')], [mr('2')]), mr('('), sub('t', 'max'), mr(' − '), sub('t', 'min'), mr(')')]));
s1.push(NOTE('Would 50 repeats make your result more accurate? Explain.'));
s1.push(lines(3, PW, 430, 520));

s2.push(H1('Part 2  Collect results'));
['Measure L from the pivot to the centre of the bob. Record N: ______', 'Pull the bob aside to the chosen amplitude and release without pushing.', 'Time N swings. Do 3 timings for each L.', 'Cross out any obvious anomaly and repeat it.', 'Do 5 lengths from about 0.2 m to 1.0 m.'].forEach(t => s2.push(STEP(t)));
s2.push(P('**Table 1**  Timings for N = ______ swings', { before: 100, after: 60, keepNext: true }));
s2.push(tbl(['L (m)', 't_{1} (s)', 't_{2} (s)', 't_{3} (s)', 't̄ (s)', 'half range Δt (s)', 'T = t̄ / N (s)', '% unc. = Δt / t̄ × 100', 'T^{2} (s^{2})'], blanks(6, 9), [1300, 1400, 1400, 1400, 1500, 1900, 1900, 2000, 1770], { rowH: 520 }));

s3.push(H1('Part 3  Analyse'));
s3.push(P('Plot T² against L. Choose your scales and draw a line of best fit.', { after: 60, keepNext: true }));
s3.push(img('grid_T2_L.png', 500));
s3.push(Q(5, 'Is your graph a straight line through the origin? Describe it.', { before: 80 }));
s3.push(lines(2, PW, 430, 520));
s3.push(P('Theory gives:', { before: 80, after: 20, keepNext: true }));
s3.push(EQ([mr('T = 2π'), new MathRadical({ children: [frac([mr('L')], [mr('g')])] }), mr('      →      '), sup('T', '2'), mr(' = '), frac([mr('4'), sup('π', '2')], [mr('g')]), mr('L')]));
s3.push(Q(6, 'Find the gradient of your line and use it to find g.'));
s3.push(lines(3, PW, 430, 520));
s3.push(Q(7, 'Did your line pass through the origin? If not, suggest what could be wrong with every reading.'));
s3.push(lines(3, PW, 430, 520));

s3.push(H1('Part 4  Design and tweak', { newPage: true }));
s3.push(P('Use the simulation (Improve the design tab) at L = 0.50 m and 10°.', { after: 60 }));
s3.push(tbl(['Timer', 'N = 1', 'N = 5', 'N = 10', 'N = 20'], [['Hand stopwatch', '', '', '', ''], ['Video (frame by frame)', '', '', '', ''], ['Light gate', '', '', '', '']], [2700, 1700, 1700, 1700, 1838], { rowH: 480, firstLeft: true }));
s3.push(NOTE('Record the % uncertainty in T. Which designs meet the 5% target?'));
s3.push(lines(2, PW, 430, 520));
s3.push(H1('Part 5  Conclusion and evaluation'));
s3.push(Q(8, 'State how T depends on L. Support your answer with data.', { before: 80 }));
s3.push(lines(3, PW, 430, 520));
s3.push(Q(9, 'Which source of uncertainty was biggest? Suggest one improvement.'));
s3.push(lines(3, PW, 430, 520));

s3.push(new Paragraph({ children: [new PageBreak()] }));
s3.push(new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: 'Teacher answers  (remove before printing)', font: FONT, bold: true, size: 30, color: OR })] }));
s3.push(P('Model: T = 2π√(L/g)×(small amplitude correction), g = ' + d.G + ' m s^{-2}. Gradient of T²–L is 4π²/g = **' + f(d.gradient, 3) + ' s² m^{-1}**.', { after: 80 }));
s3.push(tbl(['L (m)', 'T (s), 10°', 'T² (s²)'], d.lengths.map((L, i) => [f(L, 1), f(d.periods[i], 3), f(d.periods[i] ** 2, 3)]), [2000, 2400, 2400], { rowH: 380 }));
s3.push(gap(60));
[
  '**Q1** Reaction time at start and stop is a fixed error, so a longer total time makes it a smaller percentage.',
  '**Q2** Small, about 10° or less, so the small-angle formula holds (' + f(d.amp[1].pct, 2) + '% error at 10°, ' + f(d.amp[3].pct, 1) + '% at 30°). Not so small the swing dies out or is hard to see.',
  '**Q3** T increases with L, curve getting less steep (T ∝ √L).',
  '**Q4** Repeats show the spread, reveal anomalies and give a mean. Uncertainty is half the range and is not reduced by more repeats; a faulty method stays wrong.',
  '**Q6** gradient ≈ ' + f(d.gradient, 2) + ' s² m^{-1}, so g = 4π² ÷ gradient ≈ ' + d.G + ' m s^{-2}.',
  '**Q7** Measuring L to the top of the bob (not the centre) makes L too short by the bob radius (' + f(d.BOB_R * 100, 1) + ' cm): the line has a positive intercept of about ' + f(d.topFit.intercept, 3) + ' s². This is a systematic error: repeating does not remove it.',
  '**Part 4** % uncertainty in T at L = 0.5 m, 10°: ' + d.unc.map(u => u.timer + ' ' + u.byN.map(b => 'N=' + b.N + ': ' + f(b.pct, 1) + '%').join(', ')).join('.  ') + '.'
].forEach(t => s3.push(BUL(t)));

const title = 'Nuclear fission reactor  ·  Physics practical';
const sections = [
  { properties: K.pagePort, headers: { default: K.hdr(title) }, footers: { default: K.ftr() }, children: s1 },
  { properties: K.pageLand, headers: { default: K.hdr(title) }, footers: { default: K.ftr() }, children: s2 },
  { properties: K.pagePort, headers: { default: K.hdr(title) }, footers: { default: K.ftr() }, children: s3 }];
const doc = new K.Document({ creator: 'James Clarke', title: 'Nuclear fission reactor', styles: K.styles, numbering: K.numbering, sections });
K.Packer.toBuffer(doc).then(b => { K.fs.mkdirSync('out', { recursive: true }); K.fs.writeFileSync('out/fission-reactor_worksheet.docx', b); console.log('out/fission-reactor_worksheet.docx written'); });
