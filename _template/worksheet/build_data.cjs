// Step 1 of the worksheet pipeline: export every number the worksheet needs FROM THE MODEL into data.json.
// Figures (figs.py) and the document (worksheet.cjs) read data.json, so they can never disagree with the simulation.
const fs = require('fs');
const M = require('../model.js');
global.window = {}; require('../../shared/sim.js'); const Sim = global.window.Sim;

const Ls = [0.2, 0.4, 0.6, 0.8, 1.0];
const data = {
  G: M.G, REL: M.REL, BOB_R: M.BOB_R, timers: M.TIMERS, targetPct: M.TARGET_PCT, smallAnglePct: M.SMALL_ANGLE_PCT,
  lengths: Ls,
  periods: Ls.map(L => M.period(L, 10)),
  gradient: 4 * Math.PI ** 2 / M.G,
  // systematic error: length measured to the top of the bob
  topFit: Sim.linfit(Ls, Ls.map(L => M.period(M.trueLength(L, 'top'), 10) ** 2)),
  // % uncertainty in T at L = 0.5 m, 10 degrees, for each N and timer
  unc: ['stopwatch', 'video', 'gates'].map(t => ({ timer: t, byN: [1, 5, 10, 20].map(N => ({ N, pct: M.uncPct(0.5, 10, N, t, 'centre'), long: M.longEnough(0.5, 10, N, t, 'centre') })) })),
  amp: [5, 10, 20, 30, 40].map(a => ({ amp: a, pct: M.smallAnglePct(a) }))
};
fs.writeFileSync('data.json', JSON.stringify(data, null, 1));
console.log('data.json written');
