/* Scenarios and questions (Phase 1: Scenarios 1 and 2). Data only, plus rule-based marking.
   Each question follows the brief's data model:
     {id, scenario, setup:{u, theta_deg, h0, g}, type:'numerical'|'mcq'|'prediction', prompt, answer, tolerance, unit,
      markScheme:[...], hints:[L1 hint, L2 structured guidance [...], L3 worked solution [...], L4 animated solution {events}],
      scaffold:[...], difficulty, options?, predict?}
   Numerical answers name a model quantity ('flightTime', 'maxHeight', ...): the value is ALWAYS computed by model.js from the setup,
   never typed here. Text can include {T}, {H}, {tMax}, {R}, {ux}, {uy}, {vLand}, {u}, {theta}, {h0}, {g}: filled from the model
   with units ({T#} gives the number without its unit).
   Later phases: Scenarios 3 to 10 add entries to SCENARIOS and QUESTIONS; Teacher Mode can randomise setup within ranges.
   UMD: browser window.ProjectileQuestions, Node require. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./model.js'));
  else root.ProjectileQuestions = factory(root.ProjectileModel);
})(typeof self !== 'undefined' ? self : this, function (M) {
  var DIFFICULTY = ['GCSE Foundation', 'GCSE Higher', 'Year 12 Introductory', 'Year 12 Standard', 'Year 12 Extension', 'Oxbridge/Engineering'];
  var QUANTITY = { flightTime: 'T', maxHeight: 'H', timeToMax: 'tMax', range: 'R', landingSpeed: 'vLand' };

  var SCENARIOS = [
    { id: 1, name: 'Vertical launch', setup: { u: 20, theta_deg: 90, h0: 0, g: 9.81 },
      intro: 'A ball is thrown straight up at 20 m/s from ground level. It goes up, stops for an instant, and falls back down.' },
    { id: 2, name: 'Cliff launch', setup: { u: 15, theta_deg: 0, h0: 45, g: 9.81 },
      intro: 'A stone is launched from the top of a 45 m cliff, first horizontally, then at an angle above the horizontal.' }
  ];

  var V = { u: 20, theta_deg: 90, h0: 0, g: 9.81 }, CH = { u: 15, theta_deg: 0, h0: 45, g: 9.81 }, CA = { u: 20, theta_deg: 30, h0: 45, g: 9.81 };
  var QUESTIONS = [
    { id: 's1-velocity-top', scenario: 1, setup: V, type: 'mcq', difficulty: 'GCSE Foundation',
      prompt: 'The ball is thrown straight up. What is its velocity at the very top of its flight?',
      options: [
        { text: 'Zero', why: '' },
        { text: '9.81 m s⁻¹ downward', why: '9.81 is the size of g, an acceleration (m s⁻²), not a velocity. Watch the v<sub>y</sub> readout at the top.' },
        { text: '20 m s⁻¹ upward', why: 'That is the launch velocity. Gravity slows the ball on the way up, so it cannot still be 20 m s⁻¹.' },
        { text: 'It depends on the mass of the ball', why: 'With no air resistance, mass does not appear in any of the equations of motion.' }],
      answer: 0, markScheme: ['At the top the ball stops rising and has not yet started falling, so v = 0.'],
      hints: ['Watch the v<sub>y</sub> readout as the ball reaches the top.',
        ['Before the top, is the ball moving up or down?', 'After the top, is it moving up or down?', 'What must v<sub>y</sub> be at the instant it changes from one to the other?'],
        ['On the way up v<sub>y</sub> is positive (up). On the way down it is negative.', 'It changes sign at the top, so it passes through zero.', 'Velocity at the top = 0 (it is a vertical launch, so there is no horizontal velocity either).'],
        { events: ['launch', 'top'], show: 'vy' }],
      scaffold: ['Press Step forward a few times near the top. What happens to the v<sub>y</sub> readout?', 'Is the ball moving at the instant it turns round?'] },

    { id: 's1-accel-top', scenario: 1, setup: V, type: 'mcq', difficulty: 'GCSE Higher',
      prompt: 'At maximum height, what is the acceleration of the ball?',
      options: [
        { text: 'Zero, because the ball has stopped', why: 'A common misconception. The velocity is zero at the top, but it is still changing: one instant it moves up, the next it moves down. Changing velocity means there is an acceleration.' },
        { text: '9.81 m s⁻² downward', why: '' },
        { text: '9.81 m s⁻² upward', why: 'The only force is the weight, which acts downward, so the acceleration is downward.' },
        { text: 'It changes direction at the top', why: 'The velocity changes direction at the top. The acceleration is g downward the whole time.' }],
      answer: 1, markScheme: ['Acceleration = g = 9.81 m s⁻² downward at every point in the flight, including the top.', 'Velocity is zero at the top, but acceleration is not.'],
      hints: ['Look at the green acceleration arrow and the a<sub>y</sub> readout at the top.',
        ['What force acts on the ball at the top?', 'Is that force zero?', 'Use F = ma: what does that tell you about a?'],
        ['The only force is the weight, mg, downward (no air resistance).', 'a = F ÷ m = mg ÷ m = g.', 'So a = {g} downward at the top, and everywhere else in the flight.'],
        { events: ['launch', 'top', 'land'], show: 'ay' }],
      scaffold: ['Is the velocity at the top changing? Compare one Step before and one Step after the top.', 'If the velocity is changing, can the acceleration be zero?'] },

    { id: 's1-time-top', scenario: 1, setup: V, type: 'numerical', difficulty: 'GCSE Higher',
      prompt: 'Calculate the time taken for the ball to reach maximum height.', answer: 'timeToMax', tolerance: 0.02, unit: 's',
      markScheme: ['Use v<sub>y</sub> = u<sub>y</sub> − gt with v<sub>y</sub> = 0 at the top.', 't = u<sub>y</sub> ÷ g', 'Answer {tMax} (within 2%).'],
      hints: ['At the top, the vertical velocity is zero.',
        ['Write down v<sub>y</sub> = u<sub>y</sub> − gt.', 'Put v<sub>y</sub> = 0 (the top).', 'Rearrange for t, then put in u<sub>y</sub> = {uy} and g = {g}.'],
        ['v<sub>y</sub> = u<sub>y</sub> − gt, and v<sub>y</sub> = 0 at the top.', '0 = u<sub>y</sub> − gt, so t = u<sub>y</sub> ÷ g.', 't = {uy#} ÷ {g#} = {tMax}'],
        { events: ['launch', 'top'], show: 'vy', answer: 'tMax' }],
      scaffold: ['What is the vertical velocity at the top?', 'Which equation links v<sub>y</sub>, u<sub>y</sub>, g and t?', 'Check your units: dividing m s⁻¹ by m s⁻² gives seconds.'] },

    { id: 's1-max-height', scenario: 1, setup: V, type: 'numerical', difficulty: 'GCSE Higher',
      prompt: 'Calculate the maximum height reached by the ball.', answer: 'maxHeight', tolerance: 0.02, unit: 'm',
      markScheme: ['Use v<sup>2</sup> = u<sup>2</sup> + 2as with v = 0 at the top, or y = u<sub>y</sub>t − ½gt<sup>2</sup> at t = {tMax}.', 'H = u<sub>y</sub><sup>2</sup> ÷ (2g)', 'Answer {H} (within 2%).'],
      hints: ['At the top, the vertical velocity is zero. Which equation has no t in it?',
        ['Use v<sup>2</sup> = u<sup>2</sup> + 2as vertically, with a = −g.', 'Put v = 0 at the top.', 'Rearrange for s, then add the launch height h<sub>0</sub> = {h0}.'],
        ['0 = u<sub>y</sub><sup>2</sup> − 2gs, so s = u<sub>y</sub><sup>2</sup> ÷ (2g).', 's = {uy#}<sup>2</sup> ÷ (2 × {g#})', 'H = h<sub>0</sub> + s = {H}'],
        { events: ['launch', 'top'], show: 'y', answer: 'H' }],
      scaffold: ['What is the velocity at the top?', 'Which SUVAT equation does not need the time?', 'Is your answer a height above the ground? Did you add the launch height?'] },

    { id: 's1-predict-double', scenario: 1, setup: V, type: 'prediction', difficulty: 'Year 12 Introductory',
      prompt: 'Predict first: if the launch speed doubles (20 m/s to 40 m/s), what happens to the maximum height?',
      predict: { change: { u: 40 }, label: 'Run it with u = 40 m/s', compare: 'H' },
      options: [
        { text: 'It doubles', why: 'H = u<sup>2</sup> ÷ (2g). The height depends on u squared, not u.' },
        { text: 'It becomes four times as big', why: '' },
        { text: 'It stays the same', why: 'A faster ball takes longer to stop, so it rises higher.' },
        { text: 'It halves', why: 'A faster ball rises higher, not lower.' }],
      answer: 1, markScheme: ['H = u<sup>2</sup> ÷ (2g), so H is proportional to u<sup>2</sup>.', 'Doubling u multiplies H by 2<sup>2</sup> = 4.'],
      hints: ['Look at the equation for max height. How does H depend on u?',
        ['Write H = u<sup>2</sup> ÷ (2g).', 'Replace u by 2u.', 'How many times bigger is (2u)<sup>2</sup> than u<sup>2</sup>?'],
        ['H = u<sup>2</sup> ÷ (2g).', 'With 2u: H\' = (2u)<sup>2</sup> ÷ (2g) = 4u<sup>2</sup> ÷ (2g) = 4H.', 'Check with the simulation: H goes from {H} to four times as much.'],
        { events: ['launch', 'top'], show: 'y', answer: 'H' }],
      scaffold: ['Twice the speed: is the ball rising for the same time, or twice as long?', 'If it rises for twice as long at twice the average speed, how much further does it go?'] },

    { id: 's1-flight-time', scenario: 1, setup: V, type: 'numerical', difficulty: 'Year 12 Introductory',
      prompt: 'Calculate the total time the ball is in the air.', answer: 'flightTime', tolerance: 0.02, unit: 's',
      markScheme: ['Use y = u<sub>y</sub>t − ½gt<sup>2</sup> = 0 (lands at the launch height), or double the time to the top.', 'T = 2u<sub>y</sub> ÷ g', 'Answer {T} (within 2%).'],
      hints: ['The flight up and the flight down take the same time when it lands at the height it started.',
        ['Find the time to the top: v<sub>y</sub> = 0.', 'The journey down is the mirror image of the journey up.', 'Add the two times.'],
        ['Time to the top: t = u<sub>y</sub> ÷ g = {tMax}.', 'Time down from the top to the ground is the same.', 'T = 2 × {tMax#} = {T}'],
        { events: ['launch', 'top', 'land'], show: 'y', answer: 'T' }],
      scaffold: ['What is y when the ball lands?', 'Is the time to come down shorter, the same, or longer than the time to go up?'] },

    { id: 's2-horiz-time', scenario: 2, setup: CH, type: 'numerical', difficulty: 'Year 12 Introductory',
      prompt: 'The stone is launched horizontally at 15 m/s from a 45 m cliff. Calculate the time it takes to reach the ground.', answer: 'flightTime', tolerance: 0.02, unit: 's',
      markScheme: ['Vertically, u<sub>y</sub> = 0 because the launch is horizontal.', 'h<sub>0</sub> = ½gt<sup>2</sup>, so t = √(2h<sub>0</sub> ÷ g)', 'Answer {T} (within 2%).'],
      hints: ['Treat the vertical motion on its own. What is the vertical launch velocity?',
        ['Vertically: u<sub>y</sub> = 0, a = −g, and it falls h<sub>0</sub> = {h0}.', 'Use s = ut + ½at<sup>2</sup> with u = 0.', 'Rearrange for t. The horizontal speed is not needed.'],
        ['Vertically, u<sub>y</sub> = 0, so the drop is h<sub>0</sub> = ½gt<sup>2</sup>.', 't = √(2h<sub>0</sub> ÷ g) = √(2 × {h0#} ÷ {g#})', 't = {T}'],
        { events: ['launch', 'land'], show: 'y', answer: 'T' }],
      scaffold: ['Open the Independent motion tab. Which panel decides when the stone lands?', 'Does the horizontal speed change how fast the stone falls?', 'With u<sub>y</sub> = 0, which terms are left in s = ut + ½at<sup>2</sup>?'] },

    { id: 's2-horiz-range', scenario: 2, setup: CH, type: 'numerical', difficulty: 'Year 12 Standard',
      prompt: 'For the same horizontal launch, how far from the foot of the cliff does the stone land?', answer: 'range', tolerance: 0.02, unit: 'm',
      markScheme: ['Find the flight time from the vertical motion: T = {T}.', 'Horizontally the velocity is constant: R = u<sub>x</sub>T.', 'Answer {R} (within 2%).'],
      hints: ['Horizontal velocity is constant. You need the flight time first.',
        ['Find the flight time from the vertical motion (as in the last question).', 'Horizontally, a = 0, so distance = speed × time.', 'R = u<sub>x</sub> × T'],
        ['Flight time from the vertical motion: T = {T}.', 'Horizontal velocity stays at u<sub>x</sub> = {ux}.', 'R = {ux#} × {T#} = {R}'],
        { events: ['launch', 'land'], show: 'x', answer: 'R' }],
      scaffold: ['Is there any horizontal force on the stone?', 'So what happens to the horizontal velocity during the flight?', 'Which part of the motion tells you how long the stone is in the air?'] },

    { id: 's2-horiz-velocity', scenario: 2, setup: CH, type: 'mcq', difficulty: 'GCSE Higher',
      prompt: 'What happens to the stone\'s horizontal velocity during its flight?',
      options: [
        { text: 'It stays constant', why: '' },
        { text: 'It decreases, because the stone slows down', why: 'With no air resistance there is no horizontal force, so nothing slows it horizontally. Watch the blue v<sub>x</sub> readout.' },
        { text: 'It increases, because gravity speeds the stone up', why: 'Gravity acts vertically. It changes v<sub>y</sub>, not v<sub>x</sub>.' },
        { text: 'It drops to zero at the end of the flight', why: 'It lands still moving sideways at u<sub>x</sub>. The flight ends because it hits the ground, not because it stops.' }],
      answer: 0, markScheme: ['No horizontal force (no air resistance), so a<sub>x</sub> = 0 and v<sub>x</sub> stays at u<sub>x</sub>.'],
      hints: ['Look at Panel 2 in the Independent motion tab.',
        ['Which forces act on the stone in flight?', 'In which direction does each act?', 'Is there any horizontal force?'],
        ['The only force is the weight, vertically downward.', 'No horizontal force means a<sub>x</sub> = 0.', 'So v<sub>x</sub> stays at {ux} for the whole flight.'],
        { events: ['launch', 'land'], show: 'vx' }],
      scaffold: ['Step through the flight and watch the blue v<sub>x</sub> readout. Does it change?', 'What would be needed to change the horizontal velocity?'] },

    { id: 's2-predict-faster', scenario: 2, setup: CH, type: 'prediction', difficulty: 'Year 12 Standard',
      prompt: 'Predict first: if the horizontal launch speed doubles (15 m/s to 30 m/s), what happens to the time to reach the ground?',
      predict: { change: { u: 30 }, label: 'Run it with u = 30 m/s', compare: 'T' },
      options: [
        { text: 'It halves', why: 'A faster stone covers more ground, but it does not fall any faster.' },
        { text: 'It doubles', why: 'The extra speed is horizontal. It does not hold the stone up.' },
        { text: 'It stays the same', why: '' },
        { text: 'It becomes four times as long', why: 'The time depends only on the vertical motion, which has not changed.' }],
      answer: 2, markScheme: ['Horizontal and vertical motions are independent.', 'The fall time depends only on h<sub>0</sub> and g (u<sub>y</sub> = 0), so it is unchanged. Only the range doubles.'],
      hints: ['Which motion, horizontal or vertical, decides when the stone lands?',
        ['Write the vertical equation: h<sub>0</sub> = ½gt<sup>2</sup>.', 'Does u<sub>x</sub> appear in it?', 'So does changing u<sub>x</sub> change t?'],
        ['Vertically: u<sub>y</sub> = 0 whatever the horizontal speed.', 't = √(2h<sub>0</sub> ÷ g) has no u<sub>x</sub> in it.', 'The time stays at {T}; only the range changes.'],
        { events: ['launch', 'land'], show: 'y', answer: 'T' }],
      scaffold: ['Compare Panel 2 and Panel 3: which one changes when you change the horizontal speed?', 'Does a faster sideways speed change the vertical acceleration?'] },

    { id: 's2-angled-time', scenario: 2, setup: CA, type: 'numerical', difficulty: 'Year 12 Extension',
      prompt: 'Now the stone is launched at 20 m/s at 30° above the horizontal from the 45 m cliff. Calculate the time it takes to reach the ground.', answer: 'flightTime', tolerance: 0.02, unit: 's',
      markScheme: ['u<sub>y</sub> = u sin θ = {uy}', 'Ground: 0 = h<sub>0</sub> + u<sub>y</sub>t − ½gt<sup>2</sup>, a quadratic in t.', 'Take the positive root: t = (u<sub>y</sub> + √(u<sub>y</sub><sup>2</sup> + 2gh<sub>0</sub>)) ÷ g', 'Answer {T} (within 2%).'],
      hints: ['The ground is 45 m below the launch point. Set y = 0 in y = h<sub>0</sub> + u<sub>y</sub>t − ½gt<sup>2</sup>.',
        ['Find u<sub>y</sub> = u sin θ.', 'Write ½gt<sup>2</sup> − u<sub>y</sub>t − h<sub>0</sub> = 0.', 'Solve with the quadratic formula and keep the positive root.'],
        ['u<sub>y</sub> = 20 sin 30° = {uy}.', '0 = {h0#} + {uy#}t − ½ × {g#} × t<sup>2</sup>', 't = ({uy#} + √({uy#}<sup>2</sup> + 2 × {g#} × {h0#})) ÷ {g#} = {T}'],
        { events: ['launch', 'top', 'land'], show: 'y', answer: 'T' }],
      scaffold: ['Is u<sub>y</sub> zero this time?', 'What is y when the stone hits the ground?', 'Your equation is a quadratic. A negative time is before the launch, so which root do you keep?'] },

    { id: 's2-angled-speed', scenario: 2, setup: CA, type: 'numerical', difficulty: 'Oxbridge/Engineering',
      prompt: 'For the same angled launch, calculate the speed of the stone just before it hits the ground.', answer: 'landingSpeed', tolerance: 0.02, unit: 'm s⁻¹',
      markScheme: ['v<sub>x</sub> = u<sub>x</sub> = {ux} (constant).', 'v<sub>y</sub> = u<sub>y</sub> − gT, or v<sub>y</sub><sup>2</sup> = u<sub>y</sub><sup>2</sup> + 2gh<sub>0</sub>.', '|v| = √(v<sub>x</sub><sup>2</sup> + v<sub>y</sub><sup>2</sup>) = {vLand} (within 2%).', 'Check: energy gives |v| = √(u<sup>2</sup> + 2gh<sub>0</sub>), independent of the angle.'],
      hints: ['Find the two components of the velocity at landing, then combine them.',
        ['Horizontal: v<sub>x</sub> = u<sub>x</sub> (no horizontal acceleration).', 'Vertical: v<sub>y</sub> = u<sub>y</sub> − gT, using T from the last question.', 'Combine with Pythagoras.'],
        ['v<sub>x</sub> = 20 cos 30° = {ux}.', 'v<sub>y</sub> = {uy#} − {g#} × {T#}', '|v| = √(v<sub>x</sub><sup>2</sup> + v<sub>y</sub><sup>2</sup>) = {vLand}'],
        { events: ['launch', 'land'], show: 'v', answer: 'vLand' }],
      scaffold: ['Velocity is a vector. Which two components does it have at landing?', 'Has the horizontal component changed since launch?', 'How do you combine two perpendicular components?'] }
  ];

  /* setup (brief's names) -> model params */
  function params(setup) { return { u: setup.u, thetaDeg: setup.theta_deg, h0: setup.h0, g: setup.g }; }
  function values(setup) { return M.summary(params(setup)); }
  /* The model answer for a numerical question. */
  function answerValue(q) { var r = values(q.setup); return r[QUANTITY[q.answer]]; }
  /* Rule-based marking. Numerical: within tolerance (fraction of the answer). MCQ and prediction: the right option. */
  function mark(q, response) {
    if (q.type === 'numerical') {
      var x = parseFloat(String(response).replace('−', '-')), a = answerValue(q);
      if (!isFinite(x)) return { correct: false, empty: true };
      return { correct: Math.abs(x - a) <= q.tolerance * Math.abs(a), value: x, answer: a, pctOff: 100 * (x - a) / a };
    }
    return { correct: +response === q.answer, option: q.options[+response] };
  }
  /* Fill {T}, {H} ... from the model. dp = 2. */
  var UNITS = { T: 's', tMax: 's', H: 'm', R: 'm', ux: 'm s⁻¹', uy: 'm s⁻¹', vLand: 'm s⁻¹', u: 'm s⁻¹', theta: '°', h0: 'm', g: 'm s⁻²' };
  function fill(text, setup) {
    var r = values(setup), v = { T: r.T, tMax: r.tMax, H: r.H, R: r.R, ux: r.ux, uy: r.uy, vLand: r.vLand, u: setup.u, theta: setup.theta_deg, h0: setup.h0, g: setup.g };
    return String(text).replace(/\{(\w+)(#?)\}/g, function (m, k, bare) {
      if (!(k in v)) return m;
      var dp = k === 'theta' ? 0 : 2, s = (Math.abs(v[k]) < 0.005 ? 0 : v[k]).toFixed(dp).replace('-', '−');
      return bare ? s : s + (k === 'theta' ? '°' : ' ' + UNITS[k]);
    });
  }
  return { DIFFICULTY: DIFFICULTY, QUANTITY: QUANTITY, SCENARIOS: SCENARIOS, QUESTIONS: QUESTIONS, params: params, values: values, answerValue: answerValue, mark: mark, fill: fill };
});
