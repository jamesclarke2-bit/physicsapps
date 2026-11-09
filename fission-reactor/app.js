/* Nuclear fission reactor: UI only. All physics comes from model.js; generic widgets from ../shared/sim.js. */
(function () {
  'use strict';
  var M = window.ReactorModel, el = Sim.el, fmt = Sim.fmt;
  var $ = function (id) { return document.getElementById(id); };
  var NS = 'http://www.w3.org/2000/svg';
  var S = M.create(), running = true, speed = 1, tab = 'explore', selected = 'control';
  var reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var SUP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' };

  function sci(x, dp) {
    if (!x) return '0';
    var e = Math.floor(Math.log10(Math.abs(x))), m = x / Math.pow(10, e);
    if (+m.toFixed(dp) >= 10) { m /= 10; e++; }
    return m.toFixed(dp) + ' × 10' + String(e).split('').map(function (c) { return SUP[c]; }).join('');
  }
  function mk(tag, attrs, parent) { var n = document.createElementNS(NS, tag), k; for (k in attrs) n.setAttribute(k, attrs[k]); if (parent) parent.appendChild(n); return n; }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }

  /* ---------- the parts: what, does, without, mistake ---------- */
  var PARTS = {
    fuel: { name: 'Fuel rods', what: 'Rods holding pellets of uranium fuel (mostly uranium-238 with some uranium-235).',
      does: 'A uranium-235 nucleus splits when it absorbs a slow neutron. This is fission. Each fission releases energy and two or three more neutrons, which can split more nuclei. This is the chain reaction.',
      without: 'There would be no nuclei to split, so no energy released and no chain reaction.',
      mistake: ['Energy comes from burning the fuel.', 'Nothing is burning. The energy comes from the nuclear store of the uranium nuclei when they split.'] },
    control: { name: 'Control rods', what: 'Rods of a material that absorbs neutrons (such as boron or cadmium). They slide in and out between the fuel rods.',
      does: 'Lowering the rods absorbs more neutrons, so fewer fissions happen. Raising them lets more neutrons cause fission. The rods control the rate of the chain reaction, and so the power.',
      without: 'Nothing could reduce the number of neutrons. Each fission would cause more than one more fission, the power would climb and the reactor could not be shut down.',
      mistake: ['The moderator absorbs neutrons.', 'The control rods absorb neutrons. The moderator slows them down.'], remove: [['rods', 'the control rods']] },
    water: { name: 'Water: moderator and coolant', what: 'Water fills the vessel around the fuel. Here it does two jobs.',
      does: 'As a moderator, it slows neutrons down: fast neutrons collide with water particles and lose energy. Slow neutrons are much more likely to split a uranium-235 nucleus. As a coolant, it carries energy away from the core to the heat exchanger.',
      without: 'No moderator: fast neutrons escape or are wasted, fewer fissions happen and the chain reaction dies out. No coolant: energy cannot be removed, so the core temperature rises dangerously.',
      mistake: ['The moderator is the same as the control rods.', 'The moderator slows neutrons so that fission is more likely. The control rods absorb neutrons to control the rate.'],
      remove: [['moderator', 'the moderator effect'], ['coolant', 'the coolant flow']] },
    exchanger: { name: 'Heat exchanger (steam generator)', what: 'Hot water from the core flows through pipes in a tank of water in a separate loop.',
      does: 'Energy is transferred from the hot water to the water in the second loop, which boils to make steam. The two loops never mix, so the radioactive water stays in the reactor.',
      without: 'No steam would be made, so nothing would turn the turbine.', mistake: null },
    turbine: { name: 'Turbine', what: 'A set of fan blades turned by high-pressure steam.',
      does: 'Kinetic energy of the steam is transferred to kinetic energy of the turbine.',
      without: 'No spinning, so no electricity. The steam energy would be wasted.', mistake: null },
    generator: { name: 'Generator', what: 'A coil and magnet turned by the turbine.',
      does: 'Kinetic energy of the turbine is transferred to electrical energy, which goes to the National Grid.',
      without: 'The turbine would spin but no electrical energy would be produced.', mistake: null },
    shield: { name: 'Shielding', what: 'Thick concrete and steel around the reactor.',
      does: 'It absorbs the radiation from the core (neutrons and gamma rays) to protect the workers and the public.',
      without: 'Radiation would escape from the reactor, so the dose outside would be far too high.', mistake: null, remove: [['shield', 'the shielding']] }
  };
  var ORDER = ['fuel', 'control', 'water', 'exchanger', 'turbine', 'generator', 'shield'];

  /* ---------- drawing the reactor (used twice: explore and run) ---------- */
  var FX = [79, 149, 219, 289, 359], CX = [108, 178, 248, 318];
  function buildReactor(svg, onPick) {
    var V = { svg: svg, neutrons: [], flashes: [], parts: {}, phase: 0, angle: 0 };
    function part(key, label) {
      var g = mk('g', { class: 'part', 'data-part': key, tabindex: 0, role: 'button', 'aria-label': label }, svg);
      g.addEventListener('click', function () { onPick(key); });
      g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(key); } });
      V.parts[key] = g; return g;
    }
    mk('path', { d: 'M360 22 h30', stroke: 'none', fill: 'none' }, svg);
    /* pipes first (behind) */
    V.hotLeg = mk('path', { d: 'M380 150 H470', class: 'pipe', stroke: 'var(--c2)' }, svg);
    V.coldLeg = mk('path', { d: 'M470 262 H380', class: 'pipe', stroke: 'var(--c1)' }, svg);
    V.steamIn = mk('path', { d: 'M520 110 V100 H618', class: 'pipe', stroke: 'var(--muted)' }, svg);
    V.steamOut = mk('path', { d: 'M650 132 V290', class: 'pipe', stroke: 'var(--muted)' }, svg);
    V.ret = mk('path', { d: 'M600 322 H520 V300', class: 'pipe', stroke: 'var(--c1)' }, svg);
    V.flows = ['M380 150 H470', 'M470 262 H380', 'M520 110 V100 H618', 'M650 132 V290', 'M600 322 H520 V300'].map(function (d) { return mk('path', { d: d, class: 'flow' }, svg); });
    /* shielding */
    var sh = part('shield', 'Shielding');
    mk('rect', { x: 10, y: 22, width: 400, height: 380, rx: 14, class: 'shield' }, sh);
    mk('rect', { x: 6, y: 18, width: 408, height: 388, rx: 18, class: 'hl' }, sh);
    /* vessel water */
    var wt = part('water', 'Water: moderator and coolant');
    mk('rect', { x: 40, y: 52, width: 340, height: 320, rx: 4, class: 'water' }, wt);
    V.hot = mk('rect', { x: 40, y: 52, width: 340, height: 320, rx: 4, class: 'hot' }, wt);
    mk('rect', { x: 36, y: 48, width: 348, height: 328, rx: 6, class: 'hl' }, wt);
    V.partsWater = wt;
    /* fuel */
    var fu = part('fuel', 'Fuel rods'); V.fuel = [];
    FX.forEach(function (x) { V.fuel.push(mk('rect', { x: x - 9, y: 62, width: 18, height: 300, class: 'fuel' }, fu)); });
    mk('rect', { x: 62, y: 56, width: 306, height: 312, class: 'hl' }, fu);
    V.puddle = mk('rect', { x: 50, y: 332, width: 320, height: 34, rx: 8, class: 'puddle' }, svg);
    /* neutrons and flashes (between fuel and control rods) */
    V.nlayer = mk('g', { 'aria-hidden': 'true' }, svg);
    for (var i = 0; i < 72; i++) { var c = mk('circle', { r: 3.2, cx: -10, cy: -10, class: 'neutron fast', visibility: 'hidden' }, V.nlayer); V.neutrons.push({ el: c, on: false, x: 0, y: 0, vx: 0, vy: 0, fast: true, age: 0 }); }
    V.flayer = mk('g', { 'aria-hidden': 'true' }, svg);
    /* control rods */
    var cr = part('control', 'Control rods'); V.ctrl = [];
    CX.forEach(function (x) { V.ctrl.push(mk('rect', { x: x, y: 0, width: 12, height: 40, class: 'ctrl' }, cr)); });
    mk('rect', { x: 100, y: 0, width: 238, height: 30, class: 'hl' }, cr);
    /* heat exchanger */
    var hx = part('exchanger', 'Heat exchanger, also called the steam generator');
    mk('rect', { x: 470, y: 110, width: 100, height: 190, rx: 8, class: 'box' }, hx);
    mk('path', { d: 'M470 150 H490 V176 H550 V202 H490 V228 H550 V262 H470', class: 'coil' }, hx);
    mk('rect', { x: 466, y: 106, width: 108, height: 198, rx: 10, class: 'hl' }, hx);
    /* turbine */
    var tb = part('turbine', 'Turbine');
    mk('circle', { cx: 650, cy: 100, r: 32, class: 'box' }, tb);
    V.blades = mk('g', {}, tb);
    [0, 45, 90, 135].forEach(function (a) { mk('line', { x1: 650 - 26, y1: 100, x2: 650 + 26, y2: 100, class: 'blade', transform: 'rotate(' + a + ' 650 100)' }, V.blades); });
    mk('circle', { cx: 650, cy: 100, r: 38, class: 'hl' }, tb);
    /* generator and bulb */
    var ge = part('generator', 'Generator');
    mk('line', { x1: 682, y1: 100, x2: 709, y2: 100, stroke: 'var(--ink)', 'stroke-width': 5 }, ge);
    mk('circle', { cx: 735, cy: 100, r: 26, class: 'box' }, ge);
    mk('circle', { cx: 735, cy: 100, r: 32, class: 'hl' }, ge);
    var gt = mk('text', { x: 735, y: 105, 'text-anchor': 'middle', 'font-weight': 700 }, ge); gt.textContent = 'G';
    mk('line', { x1: 735, y1: 74, x2: 735, y2: 52, stroke: 'var(--ink)', 'stroke-width': 2 }, svg);
    V.rays = mk('g', {}, svg);
    for (var r = 0; r < 8; r++) { var a = r * 45 * Math.PI / 180; mk('line', { x1: 735 + 20 * Math.cos(a), y1: 36 + 20 * Math.sin(a), x2: 735 + 29 * Math.cos(a), y2: 36 + 29 * Math.sin(a), class: 'ray', opacity: 0 }, V.rays); }
    V.bulb = mk('circle', { cx: 735, cy: 36, r: 13, class: 'bulb' }, svg);
    /* condenser and pump */
    mk('rect', { x: 600, y: 290, width: 100, height: 64, rx: 8, class: 'box' }, svg);
    mk('circle', { cx: 430, cy: 262, r: 12, class: 'box' }, svg);
    /* labels */
    function txt(x, y, s, anchor) { var t = mk('text', { x: x, y: y, 'text-anchor': anchor || 'middle' }, svg); t.textContent = s; return t; }
    txt(213, 16, 'Control rods'); txt(113, 346, 'Fuel rods'); txt(213, 388, 'Water: moderator and coolant'); txt(213, 421, 'Concrete shielding');
    txt(520, 128, 'Heat exchanger'); txt(520, 143, '(steam generator)'); txt(650, 150, 'Turbine', 'start').setAttribute('x', 662); txt(735, 142, 'Generator');
    txt(650, 326, 'Condenser'); txt(650, 342, '(cools the steam)'); txt(430, 288, 'Pump'); txt(520, 92, 'steam');
    V.stat = txt(213, 214, ''); V.stat.setAttribute('font-weight', 700); V.stat.setAttribute('font-size', 16);
    V.note = mk('text', { x: 390, y: 436, 'text-anchor': 'middle', 'font-size': 11 }, svg); V.note.textContent = '';
    return V;
  }

  function spawn(V, d) {
    for (var i = 0; i < V.neutrons.length; i++) {
      var p = V.neutrons[i]; if (p.on) continue;
      p.on = true; p.x = FX[Math.floor(Math.random() * 5)] + (Math.random() < 0.5 ? -14 : 14); p.y = 70 + Math.random() * 280;
      var a = Math.random() * 6.283; p.fast = true; p.vx = Math.cos(a) * 140; p.vy = Math.sin(a) * 140; p.age = 0;
      p.el.setAttribute('class', 'neutron fast'); p.el.setAttribute('visibility', 'visible'); return p;
    }
  }
  function kill(p) { p.on = false; p.el.setAttribute('visibility', 'hidden'); }
  function flash(V, x, y, big) {
    if (V.flashes.length > 24) return;
    var c = mk('circle', { cx: x, cy: y, r: 3, class: 'flash' }, V.flayer); V.flashes.push({ el: c, t: 0, big: big });
  }

  function updateReactor(V, s, d, dt) {
    var ins = d.insertion, yb = 40 + ins * 300, nOn = 0, i, p;
    V.ctrl.forEach(function (r) { r.setAttribute('height', yb); });
    V.parts.control.classList.toggle('gone', s.missing.rods);
    V.parts.shield.classList.toggle('gone', s.missing.shield);
    V.partsWater.classList.toggle('gone', false);
    V.hot.style.opacity = clamp((s.T - 20) / 700, 0, 0.85);
    V.fuel.forEach(function (f) { f.style.fill = s.melted ? 'var(--bad)' : (s.damaged ? 'var(--accent)' : ''); });
    V.puddle.style.opacity = s.melted ? 0.9 : 0;
    var hotC = s.T > 100 ? 'var(--c2)' : 'var(--c1)';
    V.hotLeg.setAttribute('stroke', s.missing.coolant ? 'var(--muted)' : 'var(--c2)');
    V.coldLeg.setAttribute('stroke', s.missing.coolant ? 'var(--muted)' : 'var(--c1)');
    V.steamIn.setAttribute('stroke', d.steam > 0.05 ? 'var(--c2)' : 'var(--muted)'); V.steamOut.setAttribute('stroke', d.steam > 0.05 ? 'var(--c2)' : 'var(--muted)');
    V.hot.setAttribute('data-c', hotC);
    /* flows */
    var f = s.missing.coolant ? 0 : s.pump, sf = d.steam * (s.turbine ? 1 : 0.4);
    var spd = [f, f, sf, sf, sf];
    V.phase += dt * 60;
    V.flows.forEach(function (p2, k) { p2.style.opacity = spd[k] > 0.02 ? 0.9 : 0; if (!reduce) p2.setAttribute('stroke-dashoffset', -(V.phase * (0.2 + spd[k]) * (k === 1 || k === 4 ? -1 : 1)).toFixed(1)); });
    /* turbine, bulb */
    var w = d.Pe / 315;
    V.angle = (V.angle + dt * 600 * clamp(w, 0, 3)) % 360; if (!reduce) V.blades.setAttribute('transform', 'rotate(' + V.angle.toFixed(1) + ' 650 100)'); else V.blades.setAttribute('transform', 'rotate(' + (clamp(w, 0, 3) * 20) + ' 650 100)');
    var br = clamp(w, 0, 1.3);
    V.bulb.style.fill = br > 0.02 ? 'var(--accent)' : ''; V.bulb.style.opacity = br > 0.02 ? 0.35 + 0.65 * Math.min(1, br) : 1;
    [].slice.call(V.rays.childNodes).forEach(function (r) { r.setAttribute('opacity', br > 0.05 ? Math.min(1, br) : 0); });
    /* neutrons */
    var target = s.melted ? 0 : (d.P < 0.5 ? 1 : Math.min(70, Math.round(3 + 30 * Math.sqrt(Math.min(s.n, 4)))));
    if (s.n < 0.01) target = Math.max(1, Math.round(1 + 200 * s.n));
    for (i = 0; i < V.neutrons.length; i++) if (V.neutrons[i].on) nOn++;
    var guard = 0;
    while (nOn < target && guard++ < 3) { spawn(V); nOn++; }
    for (i = 0; i < V.neutrons.length && nOn > target + 2; i++) if (V.neutrons[i].on && Math.random() < 0.3) { kill(V.neutrons[i]); nOn--; }
    for (i = 0; i < V.neutrons.length; i++) {
      p = V.neutrons[i]; if (!p.on) continue;
      if (!reduce) {
        p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.fast && !s.missing.moderator && p.age > 0.7) { p.fast = false; p.vx *= 0.3; p.vy *= 0.3; p.el.setAttribute('class', 'neutron slow'); }
        if (p.x < 44 || p.x > 376) { if (s.missing.moderator) { kill(p); continue; } p.vx = -p.vx; p.x = clamp(p.x, 44, 376); }
        if (p.y < 56 || p.y > 368) { if (s.missing.moderator) { kill(p); continue; } p.vy = -p.vy; p.y = clamp(p.y, 56, 368); }
        if (!s.missing.rods && p.y < yb) for (var c = 0; c < 4; c++) if (Math.abs(p.x - (CX[c] + 6)) < 9) { flash(V, p.x, p.y, false); kill(p); break; }
        if (!p.on) continue;
        if (!p.fast && Math.random() < dt * 0.7 * Math.min(1, s.n + 0.2)) { flash(V, p.x, p.y, true); kill(p); }
      }
      p.el.setAttribute('cx', p.x.toFixed(1)); p.el.setAttribute('cy', p.y.toFixed(1));
    }
    for (i = V.flashes.length - 1; i >= 0; i--) {
      var fl = V.flashes[i]; fl.t += dt;
      if (fl.t > 0.45) { V.flayer.removeChild(fl.el); V.flashes.splice(i, 1); continue; }
      fl.el.setAttribute('r', (3 + fl.t * (fl.big ? 40 : 14)).toFixed(1)); fl.el.setAttribute('opacity', (1 - fl.t / 0.45).toFixed(2));
    }
    V.stat.textContent = s.melted ? 'MELTDOWN' : (s.damaged ? 'FUEL DAMAGED' : '');
    V.stat.setAttribute('fill', 'var(--bad)');
  }

  /* ---------- explore tab ---------- */
  var VE, VR;
  function pick(key) {
    selected = key; renderInfo();
    [VE, VR].forEach(function (V) { if (V) Object.keys(V.parts).forEach(function (k) { V.parts[k].classList.toggle('on', k === key); }); });
  }
  function renderInfo() {
    var P = PARTS[selected], box = $('info'); box.textContent = '';
    box.appendChild(el('div', { class: 'cardhead' }, el('h2', { text: P.name })));
    box.appendChild(el('h3', { text: 'What is it?' })); box.appendChild(el('p', { text: P.what }));
    box.appendChild(el('h3', { text: 'What does it do?' })); box.appendChild(el('p', { text: P.does }));
    box.appendChild(el('h3', { text: 'What would happen without it?' })); box.appendChild(el('p', { text: P.without }));
    if (P.remove) P.remove.forEach(function (r) {
      var on = S.missing[r[0]];
      box.appendChild(el('div', { class: 'tg' }, el('button', { class: 'btn' + (on ? '' : ' primary'), type: 'button', 'aria-pressed': String(on), text: on ? 'Put back ' + r[1] : 'Take away ' + r[1],
        onclick: function () { setMissing(r[0], !S.missing[r[0]]); renderInfo(); } })));
    });
    if (P.remove) box.appendChild(el('p', { class: 'fine', text: 'Then open "Run the reactor" to see what happens. Status now: ' + M.derive(S).status + '.' }));
    if (P.mistake) box.appendChild(el('details', null, el('summary', { text: 'A common mistake' }), el('p', null, el('b', { text: 'Wrong: ' }), P.mistake[0]), el('p', null, el('b', { text: 'Right: ' }), P.mistake[1])));
  }
  function setMissing(k, v) {
    S.missing[k] = v; $('m-' + k).checked = v;
    if (k === 'rods' && v) { S.scrammed = false; }
    syncControls();
  }

  /* ---------- run tab: controls and gauges ---------- */
  var G = {};
  function gauge(id, label, max, marks, calc) {
    var box = el('div', { class: 'gauge' }), val = calc ? el('button', { class: 'calc', type: 'button', text: '', onclick: function () { calc.open(); } }) : el('span', { class: 'gv', text: '' });
    var bar = el('div', { class: 'meter' }, el('i'));
    (marks || []).forEach(function (m) { var u = el('u', { class: m[1] || '' }); u.style.left = (100 * m[0] / max) + '%'; bar.appendChild(u); });
    box.appendChild(el('div', { class: 'gl' }, el('span', { text: label }), calc ? el('span', null, val) : val)); box.appendChild(bar);
    $('gauges').appendChild(box); G[id] = { val: val, bar: bar.firstChild, max: max };
  }
  function setG(id, text, v) { var g = G[id]; if (g.val.textContent !== text) g.val.textContent = text; g.bar.style.width = clamp(100 * v / g.max, 0, 100) + '%'; }
  function calcPop(title, build) { return { open: function () { var b = Sim.calcButton('x', title, build); b.click(); } }; }
  function buildGauges() {
    gauge('n', 'Neutron population (1 = full power)', 2, [[1]]);
    gauge('P', 'Thermal power (MW)', 1350, [[900]]);
    gauge('T', 'Core temperature (°C)', 900, [[M.T_ALARM, 'w'], [M.T_DAMAGE]]);
    gauge('f', 'Fission rate (per second)', 4.2e19, [[2.8125e19]], calcPop('Fissions per second', function () {
      var d = M.derive(S); return Sim.steps([['Power in watts', fmt(d.P, 0) + ' MW = ' + sci(d.P * 1e6, 1) + ' W'], ['Fissions per second = power ÷ energy per fission', '= ' + sci(d.P * 1e6, 2) + ' ÷ ' + sci(M.E_FISSION, 1)], ['Answer', '= ' + sci(d.fissions, 2) + ' per second']]);
    }));
    gauge('E', 'Electrical output (MW)', 450, [[315]], calcPop('Electrical output', function () {
      var d = M.derive(S); return Sim.steps([['Heat removed from the core', fmt(d.Q, 0) + ' MW'], ['Electrical output = efficiency × heat', '= ' + M.EFFICIENCY + ' × ' + fmt(d.Q, 0) + ' = ' + fmt(d.Pe, 0) + ' MW'], ['Wasted as heat', fmt(d.Q, 0) + ' − ' + fmt(d.Pe, 0) + ' = ' + fmt(d.waste, 0) + ' MW']]);
    }));
    gauge('D', 'Radiation outside the shielding', 0.2, [[0.05]]);
  }
  function syncControls() {
    var rodOff = S.missing.rods || S.scrammed, pumpOff = S.missing.coolant;
    $('c-rods').disabled = rodOff; $('c-pump').disabled = pumpOff;
    $('c-rods').value = Math.round(M.insertion(S) * 100); $('c-pump').value = Math.round(S.pump * 100);
    $('c-turb').checked = S.turbine; $('c-auto').checked = S.auto;
    ['rods', 'moderator', 'coolant', 'shield'].forEach(function (k) { $('m-' + k).checked = S.missing[k]; });
    $('b-rearm').disabled = !(S.scrammed && !S.damaged && !S.melted);
    $('o-rods').textContent = Math.round(M.insertion(S) * 100) + ' %'; $('o-pump').textContent = Math.round(S.pump * 100) + ' %';
  }
  function verdictText(d) {
    var msg;
    if (S.melted) msg = 'Meltdown. The fuel has melted. Real reactors have many independent safety systems to prevent this: automatic shutdown, back-up cooling, a strong containment building and shielding. Press "Cold restart" to try again.';
    else if (S.damaged) msg = 'The fuel has overheated and is damaged. Cool the core and shut down now.';
    else if (S.scrammed) msg = 'Automatic shutdown: the control rods have dropped in. The chain reaction has stopped, but the fuel still makes decay heat, so the coolant must keep flowing.';
    else if (d.alarm) msg = 'Warning: the core is too hot. Insert the control rods or increase the coolant flow.';
    else if (S.missing.rods) msg = 'No control rods: nothing can absorb extra neutrons, so each fission causes more than one more fission.';
    else if (S.missing.moderator) msg = 'No moderator: the neutrons stay fast, so few fissions happen. The chain reaction dies away.';
    else if (d.status === 'Subcritical') msg = S.n < 0.01 ? 'Subcritical: each fission causes fewer than one more fission, so the chain reaction dies away. Lift the control rods to start it.' : 'Subcritical: each fission causes fewer than one more fission, so the neutron population is falling.';
    else if (d.status === 'Critical') msg = 'Critical: each fission causes exactly one more fission. The neutron population and the power stay steady.';
    else msg = 'Supercritical: each fission causes more than one more fission. The neutron population and the power are rising.';
    if (S.missing.coolant && !S.damaged && !S.melted) msg += ' No coolant: the energy cannot be removed.';
    if (S.missing.shield && d.dose > 0.05) msg += ' No shielding: the radiation outside is dangerous.';
    return msg;
  }
  function renderRun(d) {
    setG('n', fmt(S.n, S.n < 0.1 ? 3 : 2), S.n);
    setG('P', fmt(d.P, 0) + ' MW', d.P);
    setG('T', fmt(S.T, 0) + ' °C', S.T);
    setG('f', d.fissions < 1e9 ? '≈ 0' : sci(d.fissions, 1), d.fissions);
    setG('E', fmt(d.Pe, 0) + ' MW', d.Pe);
    setG('D', d.dose > 0.05 ? 'HIGH' : 'low', d.dose);
    var st = $('status'); st.textContent = d.status;
    st.className = 'chip ' + (S.melted || S.damaged ? 'bad' : (S.scrammed || d.alarm || d.status === 'Supercritical' ? 'warn' : 'good'));
    var k = d.k; $('kline').textContent = 'Each fission causes about ' + fmt(k, 2) + ' more fissions. Neutron population: ' + d.trend + '.';
    var v = $('verdict'); v.textContent = verdictText(d); v.className = 'verdict' + (S.melted || S.damaged ? ' bad' : '');
    $('o-rods').textContent = Math.round(d.insertion * 100) + ' %';
    if (document.activeElement !== $('c-rods') && !$('c-rods').disabled) $('c-rods').value = Math.round(S.rods * 100); else if ($('c-rods').disabled) $('c-rods').value = Math.round(d.insertion * 100);
    $('b-rearm').disabled = !(S.scrammed && !S.damaged && !S.melted);
    $('c-rods').disabled = S.missing.rods || S.scrammed; $('c-pump').disabled = S.missing.coolant;
  }

  /* ---------- energy tab ---------- */
  var FLOW = [
    ['Nuclear store', 'of the uranium nuclei', 'P'], ['fission', 'Kinetic energy', 'of the fission fragments and neutrons', 'P'],
    ['collisions', 'Internal energy', 'of the water (moderator and coolant)', 'Q'], ['heat exchanger', 'Kinetic energy', 'of the steam', 'Q'],
    ['turbine blades', 'Kinetic energy', 'of the turbine', 'Pe'], ['generator', 'Electrical energy', 'to the National Grid (the rest is wasted as heat)', 'Pe']
  ];
  function buildFlow() {
    var row = $('flow'), i = 0;
    row.appendChild(box('Nuclear store', 'of the uranium nuclei', 'P'));
    [['fission', 'Kinetic energy', 'of the fission fragments and neutrons', 'P'], ['collisions', 'Internal energy', 'of the water (moderator and coolant)', 'Q'],
     ['heat exchanger', 'Kinetic energy', 'of the steam', 'Q'], ['steam turns the blades', 'Kinetic energy', 'of the turbine', 'Pe'], ['generator', 'Electrical energy', 'to the National Grid', 'Pe']].forEach(function (f) {
      row.appendChild(el('div', { class: 'farrow go' }, el('span', { text: '→' }), el('small', { text: f[0] }))); row.appendChild(box(f[1], f[2], f[3]));
    });
    function box(a, b, key) { var n = el('div', { class: 'num' }); n.dataset.k = key; return el('div', { class: 'fbox' }, el('b', { text: a }), el('span', { text: b }), n); }
  }
  function renderEnergy(d) {
    var show = $('e-nums').checked;
    [].slice.call($('flow').querySelectorAll('.num')).forEach(function (n) {
      var v = { P: d.P, Q: d.Q, Pe: d.Pe }[n.dataset.k]; n.textContent = show ? fmt(v, 0) + ' MW' : '';
    });
    var sk = $('sankey'); sk.hidden = !show; if (!show) return;
    sk.textContent = '';
    var tot = d.Q || 1, pe = 100 * d.Pe / tot;
    sk.appendChild(el('p', { class: 'fine', text: 'Of the ' + fmt(d.Q, 0) + ' MW of heat taken from the core, the turbine and generator turn ' + fmt(d.Pe, 0) + ' MW into electrical power (' + fmt(pe, 0) + ' %). The rest, ' + fmt(d.waste, 0) + ' MW, is wasted as heat. Efficiency = useful output ÷ total input.' }));
    var bar = el('div', { class: 'sankey' }); var a = el('div', { class: 'k-el', text: d.Pe > 0 ? 'electrical ' + fmt(pe, 0) + ' %' : '' }), b = el('div', { class: 'k-w', text: d.Q > 0 ? 'wasted ' + fmt(100 - pe, 0) + ' %' : '' });
    a.style.width = pe + '%'; b.style.width = (100 - pe) + '%'; bar.appendChild(a); bar.appendChild(b); sk.appendChild(bar);
  }
  var CQ = [
    { q: 'In the collision, what happens to the neutron?', o: ['It speeds up', 'It slows down', 'It is absorbed by the water'], a: 1, ex: 'The neutron transfers energy to the water particle, so it slows down. Slow neutrons are more likely to cause fission.' },
    { q: 'Which part of the reactor absorbs neutrons?', o: ['The moderator', 'The control rods', 'The turbine'], a: 1, ex: 'The control rods absorb neutrons. The moderator only slows them down.' },
    { q: 'What energy store does the steam give energy to in the turbine?', o: ['Kinetic energy of the turbine', 'Nuclear store', 'Chemical store'], a: 0, ex: 'Steam has kinetic energy, and transfers it to the turbine blades.' }
  ];
  function buildQuiz() {
    CQ.forEach(function (q) {
      var out = el('p', { class: 'fine', text: '' }), seg = el('div', { class: 'seg', role: 'group', 'aria-label': q.q });
      q.o.forEach(function (o, i) { seg.appendChild(el('button', { type: 'button', text: o, onclick: function () { out.textContent = (i === q.a ? 'Correct. ' : 'Not quite. ') + q.ex; } })); });
      $('e-q').appendChild(el('div', { class: 'ctl' }, el('span', { class: 'lab', text: q.q }), seg, out));
    });
  }
  var CV;
  function buildColl() {
    var s = $('coll'); mk('rect', { x: 1, y: 1, width: 418, height: 128, rx: 8, fill: 'var(--surface2)' }, s);
    CV = { n: mk('circle', { r: 9, cx: 20, cy: 60, fill: 'var(--c2)' }, s), w: mk('g', {}, s), nl: mk('text', { x: 20, y: 30 }, s), wl: mk('text', { x: 200, y: 112 }, s) };
    mk('circle', { r: 14, cx: 0, cy: 0, fill: 'var(--c1)', opacity: 0.7 }, CV.w); mk('circle', { r: 6, cx: -9, cy: -9, fill: 'var(--c1)' }, CV.w); mk('circle', { r: 6, cx: 9, cy: -9, fill: 'var(--c1)' }, CV.w);
  }
  function renderColl(t) {
    var p = reduce ? 0.8 : (t / 4) % 1, nx, ny, wx, wy, jig = 0;
    if (p < 0.4) { nx = 20 + p / 0.4 * 130; ny = 60; wx = 200; wy = 60; jig = Math.sin(t * 20) * 1.5; CV.nl.textContent = 'fast neutron'; CV.wl.textContent = 'water particle'; }
    else { var q = p - 0.4; nx = 150 + q * 90; ny = 60 - q * 70; wx = 200 + q * 170; wy = 60 + q * 40; jig = Math.sin(t * 40) * 3; CV.nl.textContent = 'slower neutron'; CV.wl.textContent = 'water particle gains kinetic energy'; }
    CV.n.setAttribute('cx', nx); CV.n.setAttribute('cy', ny); CV.n.setAttribute('r', p < 0.4 ? 9 : 6);
    CV.w.setAttribute('transform', 'translate(' + (wx + jig) + ' ' + (wy + jig) + ')'); CV.nl.setAttribute('x', Math.max(10, nx - 30)); CV.nl.setAttribute('y', Math.max(18, ny - 16)); CV.wl.setAttribute('x', Math.min(130, wx - 60)); CV.wl.setAttribute('y', 118);
  }

  /* ---------- calculation tab ---------- */
  var X = { P: 900, E: 3.2, F: 35, shown: 0 };
  function calcSteps() {
    var P = X.P, E = X.E * 1e-11, F = X.F / 100, W = P * 1e6, fis = W / E, pe = F * P;
    return [
      ['The equation', 'fissions per second = power ÷ energy per fission'],
      ['Power in watts (1 W = 1 J per second)', fmt(P, 0) + ' MW = ' + fmt(P, 0) + ' × 10⁶ W = ' + sci(W, 1) + ' J/s'],
      ['Substitute', 'fissions per second = (' + sci(W, 1) + ') ÷ (' + sci(E, 1) + ')'],
      ['Answer', fissionsAnswer(fis)],
      ['How big is that? Compare with the number of people on Earth, about 8 × 10⁹', sci(fis / 8e9, 1) + ' fissions each second for every person alive'],
      ['Electrical power = efficiency × thermal power', fmt(F, 2) + ' × ' + fmt(P, 0) + ' MW = ' + fmt(pe, 0) + ' MW'],
      ['Wasted as heat = thermal power − electrical power', fmt(P, 0) + ' − ' + fmt(pe, 0) + ' = ' + fmt(P - pe, 0) + ' MW']
    ];
  }
  function fissionsAnswer(f) { return '= ' + sci(f, 1) + ' fissions per second'; }
  function renderCalc() {
    $('ox-p').textContent = fmt(X.P, 0) + ' MW'; $('ox-e').textContent = sci(X.E * 1e-11, 1) + ' J'; $('ox-f').textContent = X.F + ' %';
    var ol = $('x-steps'); ol.textContent = ''; calcSteps().slice(0, X.shown).forEach(function (s) { ol.appendChild(el('li', null, el('span', { class: 'sl', text: s[0] }), el('span', { class: 'eq', text: s[1] }))); });
    $('x-next').disabled = X.shown >= 7;
  }

  /* ---------- wiring ---------- */
  function wire() {
    $('c-rods').addEventListener('input', function (e) { if (!S.scrammed && !S.missing.rods) S.rods = e.target.value / 100; $('o-rods').textContent = e.target.value + ' %'; });
    $('c-pump').addEventListener('input', function (e) { S.pump = e.target.value / 100; $('o-pump').textContent = e.target.value + ' %'; });
    $('c-turb').addEventListener('change', function (e) { S.turbine = e.target.checked; });
    $('c-auto').addEventListener('change', function (e) { S.auto = e.target.checked; });
    $('b-scram').addEventListener('click', function () { if (!S.missing.rods) S.scrammed = true; syncControls(); });
    $('b-rearm').addEventListener('click', function () { S.scrammed = false; S.rods = 1; syncControls(); });
    $('b-pause').addEventListener('click', function (e) { running = !running; e.target.textContent = running ? 'Pause' : 'Run'; e.target.setAttribute('aria-pressed', String(!running)); });
    $('b-reset').addEventListener('click', function () { var m = S.missing; M.reset(S); S.missing = m; syncControls(); [VE, VR].forEach(function (V) { V.neutrons.forEach(kill); }); });
    ['rods', 'moderator', 'coolant', 'shield'].forEach(function (k) { $('m-' + k).addEventListener('change', function (e) { setMissing(k, e.target.checked); renderInfo(); }); });
    var seg = $('seg-speed'); function drawSeg() { seg.textContent = ''; [1, 2, 4].forEach(function (v) { seg.appendChild(el('button', { type: 'button', text: '×' + v, 'aria-pressed': String(speed === v), onclick: function () { speed = v; drawSeg(); } })); }); } drawSeg();
    $('e-nums').addEventListener('change', function () { renderEnergy(M.derive(S)); });
    $('x-p').addEventListener('input', function (e) { X.P = +e.target.value; renderCalc(); });
    $('x-e').addEventListener('input', function (e) { X.E = +e.target.value; renderCalc(); });
    $('x-f').addEventListener('input', function (e) { X.F = +e.target.value; renderCalc(); });
    $('x-live').addEventListener('click', function () { var p = Math.max(100, Math.round(M.derive(S).P / 10) * 10); X.P = p; $('x-p').value = clamp(p, 100, 1500); X.P = clamp(p, 100, 1500); renderCalc(); });
    $('x-def').addEventListener('click', function () { X.P = 900; X.E = 3.2; X.F = 35; $('x-p').value = 900; $('x-e').value = 3.2; $('x-f').value = 35; renderCalc(); });
    $('x-next').addEventListener('click', function () { X.shown = Math.min(7, X.shown + 1); renderCalc(); });
    $('x-all').addEventListener('click', function () { X.shown = 7; renderCalc(); });
    $('x-hide').addEventListener('click', function () { X.shown = 0; renderCalc(); });
  }

  /* ---------- main loop ---------- */
  var last = 0, acc = 0, clock = 0;
  function frame(ts) {
    var dt = Math.min(0.1, last ? (ts - last) / 1000 : 0.016); last = ts; clock += dt;
    if (running) { acc += dt * speed; var guard = 0; while (acc >= 0.05 && guard++ < 40) { M.step(S, 0.05); acc -= 0.05; } if (guard >= 40) acc = 0; }
    var d = M.derive(S);
    if (tab === 'explore') updateReactor(VE, S, d, dt);
    else if (tab === 'run') { updateReactor(VR, S, d, dt); renderRun(d); }
    else if (tab === 'energy') { renderEnergy(d); renderColl(clock); }
    requestAnimationFrame(frame);
  }

  function init() {
    VE = buildReactor($('rx-e'), pick); VR = buildReactor($('rx-r'), pick);
    buildGauges(); buildFlow(); buildQuiz(); buildColl(); wire(); syncControls(); renderCalc(); pick('control');
    Sim.tabs(document.querySelector('.tabs'), { onChange: function (n) { tab = n; if (n === 'calc') renderCalc(); if (n === 'explore') renderInfo(); } });
    requestAnimationFrame(frame);
  }
  init();
})();
