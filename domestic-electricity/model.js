/* Domestic electricity model: the SINGLE SOURCE OF TRUTH for this lesson's numbers.
   The lesson (index.html), the worksheet, the teacher answers and the tests all read this file.
   UMD: loads in the browser (window.DomesticModel) and in Node (require).

   ASSUMPTIONS (also listed in README.md, keep both in step):
   - UK mains: 230 V, 50 Hz, a.c.
   - P = I x V and E = I x V x t, with t in seconds.
   - Fuse choice: the lowest rating ABOVE the normal working current, I = P / V.
   - Fuses on offer: 3 A, 5 A, 13 A (standard); 1 A, 3 A, 5 A, 10 A, 13 A (challenge).
   - Every appliance current is at least 5% away from every fuse rating, so no answer is a judgement call.
   - The standard quiz and the worksheet use only appliances that take more than 1 A, so no current sits oddly
     far below its fuse. Low-power appliances appear in the challenge quiz, where there is a 1 A fuse.
   - Earth wire simulation: a kettle taking 9 A through a 13 A fuse. A person touching a live case has a
     resistance of 2300 ohms to earth, so the current through them is 230 / 2300 = 0.1 A. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.DomesticModel = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var MAINS_V = 230, MAINS_F = 50, MARGIN = 0.05;
  var FUSES = { std: [3, 5, 13], hard: [1, 3, 5, 10, 13] };
  /* real plug fuse colours: 3 A red, 13 A brown, the rest black */
  var FUSE_BAND = { 1: '#222222', 3: '#c8102e', 5: '#222222', 10: '#222222', 13: '#7a4a21' };
  var APPLIANCES = [
    { name: 'LED lamp', P: 10 }, { name: 'Hair straighteners', P: 45 }, { name: 'Laptop charger', P: 65 },
    { name: 'Television', P: 120 }, { name: 'Games console', P: 160 }, { name: 'Slow cooker', P: 280 }, { name: 'Fridge-freezer', P: 350 },
    { name: 'Desktop computer', P: 400 }, { name: 'Blender', P: 500 }, { name: 'Coffee maker', P: 600 }, { name: 'Electric drill', P: 750 }, { name: 'Vacuum cleaner', P: 900 },
    { name: 'Toaster', P: 950 }, { name: 'Microwave', P: 1000 }, { name: 'Hairdryer', P: 1800 },
    { name: 'Iron', P: 2000 }, { name: 'Dishwasher', P: 2100 }, { name: 'Kettle', P: 2500 }, { name: 'Fan heater', P: 2800 }
  ];
  /* the six appliances printed in the worksheet table, in this order (all above 1 A, so no current looks oddly far below its fuse) */
  var WORKSHEET_APPLIANCES = ['Blender', 'Vacuum cleaner', 'Kettle', 'Electric drill', 'Fridge-freezer', 'Iron'];
  /* the fuse simulation prompt in the worksheet: one current below and one above this rating */
  /* quiz: smallest working current used at each level, and how many appliances of each fuse rating make a round of 8 */
  var MIN_I = { std: 1, hard: 0 };
  var ROUND = { std: { 3: 3, 5: 2, 13: 3 }, hard: { 1: 2, 3: 2, 5: 2, 10: 1, 13: 1 } };
  var FUSE_DEMO = { rating: 3, currents: [2.5, 3.5] };
  var EARTH = { normalI: 9, fuse: 13, bodyR: 2300 };
  var PLUG = [
    { wire: 'Live', colour: 'brown', terminal: 'right, through the fuse', job: 'carries the 230 V supply to the appliance' },
    { wire: 'Neutral', colour: 'blue', terminal: 'left', job: 'completes the circuit' },
    { wire: 'Earth', colour: 'green and yellow', terminal: 'top', job: 'safety wire: carries a current only if there is a fault' }
  ];

  function power(I, V) { return I * V; }
  function current(P, V) { return P / (V === undefined ? MAINS_V : V); }
  function energy(I, V, t) { return I * V * t; }
  /* the lowest rating above the working current; null if none is big enough */
  function fuseFor(I, set) { var list = FUSES[set || 'std']; for (var i = 0; i < list.length; i++) if (list[i] > I) return list[i]; return null; }
  /* 'right', 'low' (melts at switch-on) or 'high' (a fault current can flow without melting it) */
  function verdict(rating, I, set) { var r = fuseFor(I, set); return rating === r ? 'right' : rating < I ? 'low' : 'high'; }
  function appliance(name) { for (var i = 0; i < APPLIANCES.length; i++) if (APPLIANCES[i].name === name) return APPLIANCES[i]; return null; }
  /* the appliances a quiz level can draw from */
  function pool(set) { set = set || 'std'; return APPLIANCES.filter(function (a) { return current(a.P) > MIN_I[set]; }); }
  function bodyCurrent() { return MAINS_V / EARTH.bodyR; }

  return { MAINS_V: MAINS_V, MAINS_F: MAINS_F, MARGIN: MARGIN, FUSES: FUSES, FUSE_BAND: FUSE_BAND, APPLIANCES: APPLIANCES,
    WORKSHEET_APPLIANCES: WORKSHEET_APPLIANCES, MIN_I: MIN_I, ROUND: ROUND, pool: pool, FUSE_DEMO: FUSE_DEMO, EARTH: EARTH, PLUG: PLUG,
    power: power, current: current, energy: energy, fuseFor: fuseFor, verdict: verdict, appliance: appliance, bodyCurrent: bodyCurrent };
});
