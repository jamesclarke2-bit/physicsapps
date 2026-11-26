// Step 1 of the worksheet pipeline: export every number the worksheet needs FROM THE MODEL into data.json.
// Figures (figs.py) and the document (worksheet.cjs) read data.json, so they can never disagree with the lesson.
const fs = require('fs');
const M = require('../model.js');

const data = {
  V: M.MAINS_V, F: M.MAINS_F, fuses: M.FUSES.std,
  table: M.WORKSHEET_APPLIANCES.map(n => { const a = M.appliance(n), I = M.current(a.P); return { name: a.name, P: a.P, I, fuse: M.fuseFor(I) }; }),
  demo: M.FUSE_DEMO, earth: M.EARTH, bodyI: M.bodyCurrent(), plug: M.PLUG
};
// the "poor choice" question uses the worksheet appliance with the smallest current and the biggest fuse
data.poor = { ...data.table.reduce((a, b) => (b.I < a.I ? b : a)), wrongFuse: Math.max(...data.fuses) };
fs.writeFileSync('data.json', JSON.stringify(data, null, 1));
console.log('data.json written');
