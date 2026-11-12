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

/* ---- worked examples for the extension: no error bars. Best-fit line plus two "worst-fit" lines (steepest and shallowest) that still run through the scatter. ---- */
function worstFit(xs, ys) {
  const f = Sim.linfit(xs, ys), res = ys.map((y, i) => y - (f.intercept + f.slope * xs[i])), delta = Math.max(...res.map(Math.abs));
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = f.intercept + f.slope * x0, y1 = f.intercept + f.slope * x1;
  const mk = (ya, yb) => { const m = (yb - ya) / (x1 - x0); return { slope: m, intercept: ya - m * x0, x0, x1, y0: ya, y1: yb }; };
  const steep = mk(y0 - delta, y1 + delta), shallow = mk(y0 + delta, y1 - delta);
  return { best: { slope: f.slope, intercept: f.intercept, x0, x1, y0, y1 }, steep, shallow, delta, dSlope: (steep.slope - shallow.slope) / 2, dInt: Math.abs(steep.intercept - shallow.intercept) / 2 };
}
const r3 = x => Math.round(x * 1000) / 1000;
const EXT = 'stopwatch';
function example(seed) {
  const r = Sim.rng(seed), SSA = [0.4, 0.6, 0.8, 1.0, 1.2, 1.4, 1.6], A = SSA.map(s => {
    const t = r3(Sim.stats([0, 1, 2].map(() => M.measureTime(TH_A, s, EXT, r))).mean), v = r3(Sim.stats([0, 1, 2].map(() => M.measureSpeed(TH_A, s, r))).mean);
    return { s, t, t2: r3(t * t), v, v2: r3(v * v) }; });
  const B = [3, 6, 9, 12, 15, 18].map(th => { const t = r3(Sim.stats([0, 1, 2].map(() => M.measureTime(th, S_B, EXT, r))).mean); return { th, sin: r3(Math.sin(rad(th))), t, a: r3(2 * S_B / (t * t)) }; });
  const fT = worstFit(A.map(x => x.s), A.map(x => x.t2)), fV = worstFit(A.map(x => x.s), A.map(x => x.v2)), fB = worstFit(B.map(x => x.sin), B.map(x => x.a));
  const aT = 2 / fT.best.slope, daT = 2 * fT.dSlope / fT.best.slope ** 2, aV = fV.best.slope / 2, daV = fV.dSlope / 2, gs = M.ideal(TH_A);
  const ok = Math.abs(aT - aV) <= daT + daV && Math.abs(aT - gs) > daT && Math.abs(aV - gs) > daV && Math.abs(fB.best.slope - 9.81) <= fB.dSlope && Math.abs(fB.best.intercept) > fB.dInt && daT / aT < 0.12 && daV / aV < 0.08 && fB.dSlope / fB.best.slope < 0.12 && daT / aT > 0.07 && daV / aV > 0.04 && fB.dSlope / fB.best.slope > 0.05;
  return { seed, ok, A, B, fT, fV, fB, aT, daT, aV, daV, gs };
}
let ex = null; for (let seed = 1; seed < 200000 && !ex; seed++) { const e = example(seed); if (e.ok) ex = e; }
if (!ex) throw new Error('no worked example seed found');
function curve(th, T) { const a = M.accel(th), n = 80, o = { a, T, t: [], s: [], v: [] }; for (let i = 0; i <= n; i++) { const t = T * i / n; o.t.push(t); o.s.push(0.5 * a * t * t); o.v.push(a * t); } return o; }
const data = { G: M.G, MU: M.MU, TH_A, ELL, S_B, MASS: M.MASS, PROT: M.PROTRACTOR_SIG, DH: M.HEIGHT_SIG, aA, aIdealA: M.ideal(TH_A), stageA, fitT2, fitV2, stageB, fitB, design, example: ex, timers: M.TIMERS, curve: curve(TH_A, M.timeFor(TH_A, 1.6)) };
fs.writeFileSync('data.json', JSON.stringify(data, null, 1));
console.log('data.json written');
