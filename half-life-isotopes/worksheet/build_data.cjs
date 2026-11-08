// Step 1 of the worksheet pipeline: export every number the figures need FROM THE MODEL into data.json.
// The document (worksheet.cjs) reads ../questions.js, which reads the model, so nothing is typed twice.
const fs = require('fs');
const M = require('../model.js'), QB = require('../questions.js');
const I = M.ISO;
const range = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => a + (b - a) * i / n);

// Q3: isotope X (the preset in questions.js defines it)
const q3 = QB.byId('q3').sim.state.sources[0];
const q3d = range(0, 40, 160);
// Q12: total activity of Tc-99m + I-131, 1000 Bq each, in hours
const t12 = range(0, 96, 192);
const A = (iso, a0, t) => a0 * M.fraction(t, M.halfLifeIn(iso, 'h'));
// Q13: same number of nuclei, X (2 h) and Y (3 d). Activities in units of X's starting activity.
const q13s = QB.byId('q13').sim.state.sources;
const hl = q13s.map(s => M.halfLifeIn(M.resolve(s), 'h'));
const t13 = range(0, 36, 180);
const lam = hl.map(h => Math.LN2 / h);
const act = (k, t) => 100 * (lam[k] / lam[0]) * Math.pow(0.5, t / hl[k]);

const data = {
  q3: { T: M.halfLifeIn(M.resolve(q3), 'd'), A0: q3.start, t: q3d, A: q3d.map(t => q3.start * M.fraction(t, M.halfLifeIn(M.resolve(q3), 'd'))) },
  q12: { t: t12, total: t12.map(t => A(I.Tc99m, 1000, t) + A(I.I131, 1000, t)) },
  q13: { t: t13, X: t13.map(t => act(0, t)), Y: t13.map(t => act(1, t)), hl },
  marks: QB.totalMarks()
};
fs.writeFileSync('data.json', JSON.stringify(data));
console.log('data.json written; total marks', data.marks);
