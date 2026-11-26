// Step 3: build the Word document. Student pages first, teacher answers last (all numbers come from data.json).
const K = require('../../tools/worksheet-kit/kit.cjs');
const { P, H1, Q, NOTE, EQ, mr, frac, lines, gap, tbl, img, CAP, BOX, BUL, STEP, PW, Paragraph, TextRun, PageBreak, FONT, BL, OR, INK } = K;
const d = JSON.parse(K.fs.readFileSync('data.json', 'utf8'));
const f = (x, n = 2) => x.toFixed(n);
const iStr = I => (I < 0.1 ? f(I, 3) : f(I, 2));
const URL = 'https://jamesclarke2-bit.github.io/physicsapps/domestic-electricity/';
const fuseList = d.fuses.slice(0, -1).map(x => x + ' A').join(', ') + ' and ' + d.fuses[d.fuses.length - 1] + ' A';
const L = (n) => lines(n, PW, 430, 520);
// a numbered question that starts a new page (same look as K.Q)
const QB = (n, t) => new Paragraph({ pageBreakBefore: true, keepNext: true, keepLines: true, spacing: { before: 0, after: 80, line: 276 }, indent: { left: 520, hanging: 520 }, tabStops: [{ type: 'left', position: 520 }],
  children: [new TextRun({ text: String(n), font: FONT, bold: true, size: 24, color: OR }), new TextRun({ text: '\t', font: FONT }), ...K.rich(t, { size: 21, bold: true, color: INK })] });

const s = [];
s.push(new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: 'DOMESTIC ELECTRICITY', font: FONT, bold: true, size: 46, color: BL })] }));
s.push(new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text: 'Mains electricity: fuses, earthing and the three-pin plug', font: FONT, size: 26, color: INK })] }));
s.push(P('Name: ______________________    Class: ____________    Date: ____________', { after: 140 }));
s.push(BOX([P('**Aim**  Explain how fuses, earthing and double insulation keep mains electricity safe, and choose the right fuse for an appliance.', { after: 60 }),
  new Paragraph({ spacing: { after: 0, line: 276 }, children: [...K.rich('**Lesson on screen**  ', { size: 21 }), new K.ExternalHyperlink({ link: URL, children: [new TextRun({ text: URL, font: FONT, size: 20, color: BL, underline: {} })] })] })]));

s.push(H1('Part 1  Power up'));
s.push(EQ([mr('P = I × V')]));
s.push(EQ([mr('E = I × V × t')]));
s.push(P('Answer the six questions on the board. Show your working.', { after: 60, keepNext: true }));
s.push(tbl(['Question', 'Working', 'Answer with unit'], [1, 2, 3, 4, 5, 6].map(n => [String(n), '', '']), [1100, 5938, 2600], { rowH: 600 }));

s.push(H1('Part 2  a.c. and d.c.'));
s.push(Q(1, 'Sketch the voltage against time trace for each supply.', { before: 80 }));
s.push(img('fig_acdc.png', 470));
s.push(Q(2, 'Describe the difference between a.c. and d.c.'));
s.push(L(2));
s.push(Q(3, 'UK mains voltage = __________ V.     Frequency = __________ Hz.'));

s.push(H1('Part 3  Hot wires', { newPage: true }));
s.push(Q(4, 'Explain why a current makes a wire hotter.', { before: 80 }));
s.push(NOTE('Use the words: electrons, collide, ions, temperature.'));
s.push(L(3));
s.push(P('**Wire wool demonstration**', { before: 160, after: 60, keepNext: true }));
s.push(tbl(['', 'What I think or see'], [['Predict: what will happen as the current rises?', ''], ['Observe: what happened to the wire wool?', ''], ['Observe: what happened to the current when it broke?', '']], [3600, 6038], { rowH: 640, firstLeft: true }));
s.push(Q(5, 'Name two appliances that use the heating effect of a current.'));
s.push(L(1));

s.push(H1('Part 4  Fuses'));
s.push(P('Watch the fuse simulation with a ' + d.demo.rating + ' A fuse.', { after: 60, keepNext: true }));
s.push(tbl(['Current (A)', 'What happens to the fuse wire?'], [[String(d.demo.currents[0]), ''], [String(d.demo.currents[1]), ''], ['Short circuit', '']], [2200, 7438], { rowH: 560 }));
s.push(Q(6, 'Explain how a fuse protects an appliance and its cable.'));
s.push(L(3));
s.push(Q(7, 'State which wire the fuse is connected in.'));
s.push(L(1));
s.push(Q(8, 'Give two advantages of a circuit breaker over a fuse.'));
s.push(L(2));

s.push(H1('Part 5  Pick the fuse', { newPage: true }));
s.push(P('Rearrange P = I × V to find the normal working current:', { after: 20, keepNext: true }));
s.push(EQ([mr('I = '), frac([mr('P')], [mr('V')])]));
s.push(P('Mains voltage is ' + d.V + ' V. The fuses available are ' + fuseList + '. Choose the rating just above the working current.', { after: 60, keepNext: true }));
s.push(tbl(['Appliance', 'P (W)', 'I (A)', 'Fuse (A)'], d.table.map(a => [a.name, String(a.P), '', '']), [3200, 1900, 2638, 1900], { rowH: 500, firstLeft: true }));
s.push(Q(9, 'A student fits a ' + d.poor.wrongFuse + ' A fuse to the ' + d.poor.name.toLowerCase() + '. Explain why this is a poor choice.'));
s.push(L(2));

s.push(H1('Part 6  The earth wire'));
s.push(img('fig_earth.png', 470, true));
s.push(CAP('Figure 1  A kettle with a metal case.'));
s.push(Q(10, 'Name the parts labelled A to D.', { before: 80 }));
s.push(P('A ________________   B ________________   C ________________   D ________________', { after: 60 }));
s.push(Q(11, 'The live wire touches the metal case. There is no earth wire. Describe what happens when someone touches the case.'));
s.push(L(2));
s.push(QB(12, 'Complete the five steps that make an earthed kettle safe.'));
['The live wire touches the metal ______________ .', 'The earth wire gives a low-______________ path from the case to earth.', 'A ______________ current flows through the live wire, the case and the earth wire.',
  'This current makes the fuse ______________ .', 'The circuit is ______________ , so the case is no longer ______________ .'].forEach(t => s.push(STEP(t)));
s.push(Q(13, 'The current through a person is about ' + f(d.bodyI, 1) + ' A. Explain why a ' + d.earth.fuse + ' A fuse alone cannot protect them.'));
s.push(L(2));

s.push(H1('Part 7  Double insulation'));
s.push(Q(14, 'A hairdryer has a plastic case and a two-core cable. Explain why it needs no earth wire.', { before: 80 }));
s.push(L(2));
s.push(Q(15, 'Many plugs in France have only two pins. Suggest why this is still safe.'));
s.push(L(3));

s.push(P('**The four safety features.** Complete the table.', { before: 160, after: 60, keepNext: true }));
s.push(tbl(['Safety feature', 'What it is', 'What it protects'], ['Insulation', 'Double insulation', 'Earthing', 'Fuse or circuit breaker'].map(x => [x, '', '']), [2400, 3619, 3619], { rowH: 620, firstLeft: true }));


s.push(H1('Part 8  Wire a plug', { newPage: true }));
s.push(Q(16, 'Draw the three wires on the plug and colour them. Write L, N or E in each box.', { before: 80 }));
s.push(img('fig_plug.png', 235, true));
s.push(CAP('Figure 2  Inside a three-pin plug, seen from the back.'));
s.push(tbl(['Wire', 'Colour', 'What it does'], d.plug.map(w => [w.wire, '', '']), [1700, 2500, 5438], { rowH: 520, firstLeft: true }));
s.push(P('**Practical: wire a real plug.** Then swap with a partner and inspect.', { before: 140, after: 60, keepNext: true }));
s.push(tbl(['Check', 'Pass?'], ['Each colour is on the correct terminal', 'No bare copper showing outside a terminal', 'No stray strands', 'Every screw is tight', 'Cable grip holds the outer sheath, not the inner wires', 'Fuse fitted'].map(c => [c, '']), [7938, 1700], { rowH: 360, firstLeft: true, firstFill: false, leftAll: true }));

s.push(H1('Part 9  Exam-style question'));
s.push(Q(17, 'A washing machine has a metal case. The live wire works loose and touches the case. Explain how the earth wire and the fuse protect the user.  (5 marks)', { before: 80 }));
s.push(L(6));
s.push(new Paragraph({ children: [new PageBreak()] }));
s.push(new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: 'Teacher answers  (remove before printing)', font: FONT, bold: true, size: 30, color: OR })] }));
s.push(P('Lesson: ' + URL + '  Part 1 answers are revealed on screen (the numbers change with "New numbers").', { after: 80 }));
s.push(tbl(['Appliance', 'P (W)', 'I = P ÷ ' + d.V + ' (A)', 'Fuse (A)'], d.table.map(a => [a.name, String(a.P), iStr(a.I), String(a.fuse)]), [3200, 1900, 2638, 1900], { rowH: 340, firstLeft: true }));
s.push(gap(60));
[
  '**Q1** d.c.: a horizontal line above zero. a.c.: a smooth wave that goes above and below zero.',
  '**Q2** d.c.: the current always flows in the same direction. a.c.: the current keeps changing direction. **Q3** ' + d.V + ' V, ' + d.F + ' Hz.',
  '**Q4** Electrons collide with the ions in the metal and transfer energy to them. The ions vibrate more, so the temperature rises.',
  '**Wire wool** It glows, then melts and breaks at its thinnest point. The current falls to zero. **Q5** Any two: kettle, toaster, iron, hairdryer, electric heater, hob.',
  '**Fuse table** ' + d.demo.currents[0] + ' A: warm, does not melt. ' + d.demo.currents[1] + ' A: heats up and melts after a moment. Short circuit: melts at once.',
  '**Q6** If the current rises above the rating, the fuse wire heats up and melts. This breaks the circuit, so the current stops before the cable or appliance overheats. **Q7** Live. **Q8** It acts faster. It can be reset, so it does not need replacing.',
  '**Q9** The ' + d.poor.name.toLowerCase() + ' normally takes ' + iStr(d.poor.I) + ' A, so it needs a ' + d.poor.fuse + ' A fuse. With a ' + d.poor.wrongFuse + ' A fuse, a fault current of up to ' + d.poor.wrongFuse + ' A could flow and overheat the cable without melting the fuse.',
  '**Q10** A fuse, B live wire, C neutral wire, D earth wire. **Q11** The case is live at ' + d.V + ' V. A current flows through the person to earth: an electric shock.',
  '**Q12** case; resistance; large; melt; broken, live. **Q13** ' + f(d.bodyI, 1) + ' A is far below ' + d.earth.fuse + ' A, so the fuse does not melt. The earth wire is needed to make the current large enough.',
  '**Q14** It is double insulated. The plastic case is an insulator, so it cannot become live even if the live wire touches it.',
  '**Q15** A circuit needs only live and neutral. Two-pin appliances are double insulated, so need no earth. French appliances with metal cases are still earthed: the earth pin is on the socket and fits a hole in the plug. There is no fuse in the plug: a circuit breaker in the house protects each circuit.',
  '**Q16** ' + d.plug.map(w => w.wire + ': ' + w.colour + ', ' + w.terminal).join('. ') + '. Jobs: ' + d.plug.map(w => w.wire.toLowerCase() + ' ' + w.job).join('; ') + '. The cable grip clamps the outer sheath so the wires cannot be pulled off their terminals.',
  '**Q17** (1) The case becomes live. (2) The earth wire gives a low-resistance path to earth. (3) A large current flows through the live wire, case and earth wire. (4) The current is above the fuse rating, so the fuse melts. (5) The circuit is broken, so the case is no longer live.',
  '**Table** Insulation: plastic around wires and plugs; protects the user from touching a live conductor. Double insulation: a plastic case as a second layer; the case cannot become live. Earthing: a wire from the metal case to the ground; protects the user by making a fault melt the fuse. Fuse or circuit breaker: a weak link in the live wire; protects the cable and appliance from overheating.'
].forEach(t => s.push(BUL(t)));

const title = 'Domestic Electricity  ·  iGCSE Physics';
const doc = new K.Document({ creator: 'James Clarke', title: 'Domestic Electricity', styles: K.styles, numbering: K.numbering,
  sections: [{ properties: K.pagePort, headers: { default: K.hdr(title) }, footers: { default: K.ftr() }, children: s }] });
K.Packer.toBuffer(doc).then(b => { K.fs.mkdirSync('out', { recursive: true }); K.fs.writeFileSync('out/domestic-electricity_worksheet.docx', b); console.log('out/domestic-electricity_worksheet.docx written'); });
