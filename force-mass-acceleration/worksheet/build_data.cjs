// Step 1 of the worksheet pipeline: export every number the worksheet needs FROM THE MODEL into data.json.
const fs = require('fs');
const M = require('../model.js');
global.window = {}; require('../../shared/sim.js'); const Sim = global.window.Sim;
const base = { nh: 5, k: 0, constant: true, tilt: 0, hanger: true };
const S = o => Object.assign({}, base, o), r2 = (x, n = 4) => +x.toFixed(n);

const aF = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(nh => { const s = S({ nh }); return { nh, mh: M.hangerMass(s), F: M.force(s), a: M.accel(s), ideal: M.idealAccel(s), t1: M.timeToDistance(M.accel(s), 1.0) }; });
const fitF = Sim.linfit(aF.map(r => r.F), aF.map(r => r.a));
const aM = [0, 1, 2, 3, 4, 5].map(k => { const s = S({ k }); return { k, extra: 0.1 * k, m: M.totalMass(s), invm: 1 / M.totalMass(s), a: M.accel(s), t1: M.timeToDistance(M.accel(s), 1.0) }; });
const fitM = Sim.linfit(aM.map(r => r.invm), aM.map(r => r.a));
const a5 = M.accel(S({}));
const sT2 = [0.4, 0.6, 0.8, 1.0, 1.2, 1.4, 1.6].map(s => { const t = M.timeToDistance(a5, s); return { s, t, t2: t * t }; });
const gates = [0.6, 0.8, 1.0, 1.2, 1.4, 1.6].map(x2 => { const g = M.gateRun(a5, 0.3, x2); return { x2, d: g.d, u: g.u, v: g.v, t: g.t, v2u2: g.v * g.v - g.u * g.u }; });
const sv = M.gateRun(a5, 0.3, 1.2);
const suvat = { u: sv.u, v: sv.v, t: sv.t, d: sv.d, a: a5, a_v2: (sv.v ** 2 - sv.u ** 2) / (2 * sv.d), a_t: (sv.v - sv.u) / sv.t, a_s: 2 * (sv.d - sv.u * sv.t) / sv.t ** 2, s_mid: 0.5 * (sv.u + sv.v) * sv.t };
const tilt = [0, 0.2, 0.4, 0.6, 0.8, 1.0].map(th => { const s = S({ tilt: th }); return { tilt: th, a: M.accel(s), moves: M.moves(s), ideal: M.idealAccel(s), effect: M.frictionEffectPct(s) }; });
const ramp = [2, 4, 6, 8, 10, 12].map(th => { const s = S({ hanger: false, tilt: th }); return { tilt: th, sin: Math.sin(th * Math.PI / 180), a: M.accel(s), a_k5: M.accel(S({ hanger: false, tilt: th, k: 5 })) }; });
const fitR = Sim.linfit(ramp.map(r => r.sin), ramp.map(r => r.a));
const unc = { timers: ['stopwatch', 'video', 'gates'].map(t => ({ timer: t, byS: [0.4, 0.6, 1.0, 1.4, 1.8].map(s => ({ s, pct: M.accelUncPct(S({}), 0.3, s, t), long: M.longEnough(S({}), 0.3, s, t) })) })) };
function curve(s, T) { const a = M.accel(s), n = 80, out = { a, T, t: [], s: [], v: [] }; for (let i = 0; i <= n; i++) { const t = T * i / n; out.t.push(t); out.s.push(0.5 * a * t * t); out.v.push(a * t); } return out; }
const m1 = curve(S({}), M.timeToDistance(a5, 1.0)), m2 = (() => { const s2 = S({ k: 5 }); return curve(s2, M.timeToDistance(M.accel(s2), 1.0)); })();
const data = { G: M.G, MU: M.MU_K, comp: M.compensationAngle(), target: M.TARGET_PCT, timers: M.TIMERS, setup: { Mt: M.trolleyMass(S({})), mh: M.hangerMass(S({})), m: M.totalMass(S({})), F: M.force(S({})), a: a5, ideal: M.idealAccel(S({})), msys: M.sysMass(S({})) },
  aF, fitF, aM, fitM, sT2, gates, suvat, tilt, ramp, fitR, unc, m1, m2,
  motion_k5: { m: M.totalMass(S({ k: 5 })), a: M.accel(S({ k: 5 })) } };
fs.writeFileSync('data.json', JSON.stringify(data, null, 1));
console.log('data.json written');
