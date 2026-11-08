// Step 3: build the Word worksheet. Every question is rendered from ../questions.js (which reads the model), so the worksheet,
// the website and the teacher answers cannot disagree. Student pages first, teacher answers on a labelled last page.
const K = require('../../tools/worksheet-kit/kit.cjs');
const { P, H1, Q, NOTE, EQ, mr, frac, sub, tbl, lines, gap, img, CAP, BOX, BUL, PW, Paragraph, TextRun, PageBreak, FONT, BL, OR, INK, PageBreak: PB } = K;
const QB = require('../questions.js'), M = require('../model.js');
const URL = 'https://jamesclarke2-bit.github.io/physicsapps/half-life-isotopes/';
const TABS = { decay: 'Decay', measure: 'Measure a half-life', choose: 'Choose the isotope', bench: 'Geiger counter bench' };
const sup = (b, s) => new K.D.MathSuperScript({ children: b, superScript: [mr(s)] });
const rich = (s, o) => K.rich(s, o);
const ind = (s, o = {}) => new Paragraph({ spacing: { after: o.after ?? 100, line: 276 }, indent: { left: 520 }, keepNext: o.keepNext, keepLines: true, children: rich(s, { size: 21 }) });

const body = [];
body.push(new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: 'HALF-LIFE AND CHOOSING ISOTOPES', font: FONT, bold: true, size: 46, color: BL })] }));
body.push(new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text: 'Half-life calculations and picking the right isotope for the job', font: FONT, size: 26, color: INK })] }));
body.push(P('Name: ______________________    Class: ____________    Date: ____________', { after: 140 }));
const link = new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: 'Simulation and automatic marking: ', font: FONT, size: 21 }),
  new K.ExternalHyperlink({ link: URL, children: [new TextRun({ text: URL, font: FONT, size: 21, color: BL, underline: {} })] })] });
body.push(BOX([link,
  P('The questions are in four parts, from easy to very challenging. Each question says which tab of the simulation to use. **Predict first**, then check with the simulation. Total: **' + QB.totalMarks() + ' marks**.', { after: 80 }),
  P('Use the same unit for t and T_{½}. For a count rate, subtract the background first.', { after: 0 })]));
body.push(P('**Key ideas**', { before: 120, after: 0 }));
body.push(EQ([mr('n = '), frac([mr('t')], [sub('T', '½')]), mr('        fraction left = '), sup([mr('('), frac([mr('1')], [mr('2')]), mr(')')], 'n')]));

let lastPart = '';
QB.questions.forEach(q => {
  const n = parseInt(q.id.slice(1), 10), max = QB.questionMax(q);
  if (q.part !== lastPart) {
    lastPart = q.part; const pm = QB.questions.filter(x => x.part === q.part).reduce((s, x) => s + QB.questionMax(x), 0);
    body.push(H1(QB.PARTS[q.part].name + '  (' + QB.PARTS[q.part].level + ', ' + pm + ' marks)', { newPage: q.part !== 'A' }));
  }
  body.push(Q(n, q.title + '   [' + max + ' marks]', { before: 220 }));
  body.push(ind(q.intro, { keepNext: true }));
  if (q.figure) { body.push(img(q.figure + '.png', 430, true)); body.push(CAP('Figure  ' + (q.figureCaption || ''))); }
  if (q.candidates) {
    const c = q.candidates, w = c.head.length === 4 ? [900, 3200, 2900, 2638] : null;
    body.push(tbl(c.head, c.rows, w || c.head.map(() => Math.floor(PW / c.head.length)), { rowH: 400, firstLeft: true, keep: true }));
    body.push(gap(60));
  }
  body.push(NOTE('Simulation: ' + TABS[q.sim.tab] + ' tab. ' + q.sim.task));
  q.parts.forEach(p => {
    const tag = '(' + p.id + ')  ' + p.text + '  **[' + p.marks + ']**';
    body.push(new Paragraph({ keepNext: true, keepLines: true, spacing: { before: 80, after: 70, line: 276 }, indent: { left: 960, hanging: 440 }, tabStops: [{ type: 'left', position: 960 }],
      children: [new TextRun({ text: '(' + p.id + ')', font: FONT, bold: true, size: 21, color: OR }), new TextRun({ text: '\t', font: FONT }), ...rich(p.text + '  **[' + p.marks + ']**', { size: 21 })] }));
    if (p.type === 'num') {
      body.push(tbl(['Step', 'Your answer (with unit)'], p.inputs.map(i => [i.label + (i.free ? ' (from your own readings)' : ''), '']), [6200, 3438], { rowH: 460, firstLeft: true, keep: true }));
    } else if (p.type === 'table') {
      const tb = p.table;
      body.push(tbl([tb.rowHead].concat(tb.cols.map(c => c.head)), tb.rows.map(r => [r.label].concat(tb.cols.map((c, ci) => c.kind === 'input' ? '' : M.sig(r.cells[ci], 3)))),
        [1500].concat(tb.cols.map(() => Math.floor((PW - 1500) / tb.cols.length))), { rowH: 480, keep: true }));
    } else if (p.type === 'choice') {
      if (p.options.some(o => o.label.length > 36)) p.options.forEach(o => body.push(ind('☐  ' + o.label.replace(/\s{2,}/g, '  '), { after: 50 })));
      else body.push(ind(p.options.map(o => '☐  ' + o.label.replace(/\s{2,}/g, '  ')).join('        '), { after: 60 }));
    } else if (p.type === 'written') {
      body.push(lines(Math.max(2, p.marks * 2), PW, 430, 960));
    }
    body.push(gap(40));
  });
});

/* ---------- teacher page ---------- */
body.push(new Paragraph({ children: [new PB()] }));
body.push(new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: 'Teacher answers  (remove before printing)', font: FONT, bold: true, size: 30, color: OR })] }));
body.push(P('All values come from the model. Numbers: accept within 1 to 3% (see the website for the exact tolerance), any equivalent unit, and follow-through from earlier errors. A correct final answer earns the marks for its working. Written answers: one mark per key idea; the website checks key words, and students can claim a point made in other words.', { size: 19, after: 100 }));
QB.questions.forEach(q => {
  const n = parseInt(q.id.slice(1), 10);
  body.push(P('**Q' + n + '  ' + q.title + '**  [' + QB.questionMax(q) + ']', { before: 100, after: 30, keepNext: true, size: 20 }));
  QB.modelAnswers(q).forEach(m => m.lines.forEach((ln, k) => body.push(BUL('(' + m.id + ') ' + ln.replace(/\s+/g, ' ')))));
});
const title = 'Half-life and Choosing Isotopes';
const doc = new K.Document({ creator: 'James Clarke', title, styles: K.styles, numbering: K.numbering,
  sections: [{ properties: K.pagePort, headers: { default: K.hdr(title + '  ·  Physics') }, footers: { default: K.ftr() }, children: body }] });
K.Packer.toBuffer(doc).then(b => { K.fs.mkdirSync('out', { recursive: true }); K.fs.writeFileSync('out/half-life-isotopes_worksheet.docx', b); console.log('out/half-life-isotopes_worksheet.docx written'); });
