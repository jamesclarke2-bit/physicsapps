// Step 1 of the worksheet pipeline: export every number the worksheet needs FROM THE MODEL into data.json.
const fs = require('fs');
const M = require('../model.js');
global.window = {}; require('../../shared/sim.js'); const Sim = global.window.Sim;
const rad = d => d * Math.PI / 180, ELL = 2.0, S_B = 1.0, TH_A = 8;

/* Stage A: one angle, change s. Video timer (biggest source in t) and light gate (about 1% in v). */
const aA = M.accel(TH_A);
const stageA = [0.4, 0.6, 0.8, 1.0, 1.2, 1.4, 1.6].map(s => {
  const t = M.timeFor(TH_A, s), v = M.speedFor(TH_A, s), dt = M.biggest(TH_A, s, 'video'), dv = 0.01 * v;
  return { s, t, dt, t2: t * t, dt2: 2 * t * dt, v, dv, v2: v * v, dv2: 2 * v * dv, pctA_t: M.accelUncPct(TH_A, s, 'video'), pctA_v: M.accelUncPct(TH_A, s, 'gate'), a_t: M.aFromT(s, t), a_v: M.aFromV(s, v) };
});
const fitT2 = Sim.linfit(stageA.map(r => r.s), stageA.map(r => r.t2)), fitV2 = Sim.linfit(stageA.map(r => r.s), stageA.map(r => r.v2));

/* Stage B: s fixed at 1.0 m, change the angle. Video timer, trigonometry or protractor for the angle. */
const stageB = [3, 6, 9, 12, 15, 18].map(th => {
  const t = M.timeFor(th, S_B), a = M.accel(th), sin = Math.sin(rad(th));
  return { th, h_mm: 1000 * M.heightFor(th, ELL), sin, dsin_trig: M.sinUnc(th, 'trig', ELL), dsin_prot: M.sinUnc(th, 'protractor', ELL), pct_trig: M.sinPct(th, 'trig', ELL), pct_prot: M.sinPct(th, 'protractor', ELL),
    t, dt: M.biggest(th, S_B, 'video'), a, da: a * M.accelUncPct(th, S_B, 'video') / 100, pctA: M.accelUncPct(th, S_B, 'video'), ideal: M.ideal(th), fric: M.frictionPct(th) };
});
const fitB = Sim.linfit(stageB.map(r => r.sin), stageB.map(r => r.a));

/* design tables */
const design = {
  sinPct: [2, 4, 6, 8, 12, 16, 20].map(th => ({ th, prot: M.sinPct(th, 'protractor', ELL), trig: M.sinPct(th, 'trig', ELL), fric: M.frictionPct(th) })),
  accel: ['stopwatch', 'video', 'gate'].map(timer => ({ timer, byS: [0.4, 0.6, 1.0, 1.4, 1.8].map(s => ({ s, pct: M.accelUncPct(TH_A, s, timer), long: M.longEnough(TH_A, s, timer) })) })),
  moves: { th: 0.8, yes: M.moves(0.9), no: M.moves(0.7) }
};
function curve(th, T) { const a = M.accel(th), n = 80, o = { a, T, t: [], s: [], v: [] }; for (let i = 0; i <= n; i++) { const t = T * i / n; o.t.push(t); o.s.push(0.5 * a * t * t); o.v.push(a * t); } return o; }
const data = { G: M.G, MU: M.MU, TH_A, ELL, S_B, MASS: M.MASS, PROT: M.PROTRACTOR_SIG, DH: M.HEIGHT_SIG, aA, aIdealA: M.ideal(TH_A), stageA, fitT2, fitV2, stageB, fitB, design, timers: M.TIMERS, curve: curve(TH_A, M.timeFor(TH_A, 1.6)) };
fs.writeFileSync('data.json', JSON.stringify(data, null, 1));
console.log('data.json written');
