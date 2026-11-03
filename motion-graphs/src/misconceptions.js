/**
 * Misconception catalogue and the "Fix the Mistake" casebook.
 *
 * Every wrong answer anywhere in the game can be tagged with one of these
 * ids, so feedback can name the exact faulty idea, the dashboard can count
 * how often each one trips a student up, and the student can be sent to a
 * Fix the Mistake case that targets it.
 *
 * Wording is a first draft, to be checked by the teacher.
 */

const MISCONCEPTIONS = {
  'neg-velocity-slowing': {
    title: 'Negative velocity means slowing down',
    truth: 'The sign of velocity tells you the DIRECTION of motion, nothing else. Speed is the size of the velocity, so −8 m/s is faster than −2 m/s.',
    skill: 'signs',
  },
  'neg-accel-slowing': {
    title: 'Negative acceleration always means slowing down',
    truth: 'An object slows down only when velocity and acceleration have OPPOSITE signs. If both are negative, the object speeds up in the negative direction.',
    skill: 'signs',
  },
  'neg-accel-deceleration': {
    title: 'Negative acceleration always represents deceleration',
    truth: '"Deceleration" means the speed is falling. Negative acceleration means the acceleration points in the negative direction. They match only when the object is moving in the positive direction.',
    skill: 'acceleration',
  },
  'zero-crossing-stops': {
    title: 'A graph crossing zero means the object stops',
    truth: 'It depends which graph. s = 0 means "back at the start point"; a = 0 means "velocity is not changing" (often the moment of greatest speed). Only v = 0 means stopped — and if the v–t graph crosses zero, only for an instant as it reverses.',
    skill: 'gradient',
  },
  'displacement-distance': {
    title: 'Displacement and distance are the same thing',
    truth: 'Displacement is how far, and which way, you end up from the start (signed). Distance is the total length of path travelled (never negative). Go out 8 m and back 8 m: distance 16 m, displacement 0.',
    skill: 'displacement',
  },
  'velocity-acceleration-same': {
    title: 'Velocity and acceleration are essentially the same',
    truth: 'Velocity is how fast position changes; acceleration is how fast VELOCITY changes. At the top of a throw the velocity is zero but the acceleration is still −10 m/s² — that is why the ball comes back down.',
    skill: 'acceleration',
  },
  'steeper-greater-accel': {
    title: 'A steeper graph always means greater acceleration',
    truth: 'Steepness means different things on different graphs. Steep s–t = high velocity. Steep v–t = large acceleration. A straight s–t line, however steep, means zero acceleration.',
    skill: 'gradient',
  },
  'backwards-neg-accel': {
    title: 'An object moving backwards must have negative acceleration',
    truth: 'Moving backwards means negative VELOCITY. The acceleration can have either sign: positive while the backwards motion is slowing, negative while it is speeding up.',
    skill: 'signs',
  },
  'area-always-distance': {
    title: 'Area under any graph is distance travelled',
    truth: 'Area under a v–t graph is DISPLACEMENT (area below the axis counts as negative). Distance is the total area, all counted as positive. Area under an a–t graph is the CHANGE IN VELOCITY.',
    skill: 'area',
  },
  'pos-gradient-speeding': {
    title: 'A positive gradient always means speeding up',
    truth: 'A positive gradient on an s–t graph means moving in the positive direction (maybe at constant speed). A positive gradient on a v–t graph means positive acceleration — speeding up only if the velocity is also positive.',
    skill: 'gradient',
  },
  'speed-velocity': {
    title: 'Speed can be negative',
    truth: 'Speed is the size (magnitude) of velocity, so it is never negative. A velocity of −2 m/s is a speed of 2 m/s in the negative direction.',
    skill: 'signs',
  },
  'drag-direction': {
    title: 'Air resistance always acts upwards',
    truth: 'Air resistance always acts against the VELOCITY. On the way up it acts downwards, with the weight, so the object slows faster than g. Only on the way down does it act upwards, against the weight.',
    skill: 'acceleration',
  },
  'drag-symmetric': {
    title: 'With air resistance, the trip down mirrors the trip up',
    truth: 'Drag breaks the symmetry. The rise is quick (drag adds to the weight) and the fall is slow (drag opposes the weight). It takes longer to come down and lands slower than it was launched.',
    skill: 'multistage',
  },
  'top-no-forces': {
    title: 'At the top of its flight nothing acts on it, so a = 0',
    truth: 'At the top the velocity is zero, so the drag is zero, but the weight still acts. The acceleration is exactly −g. That is why it comes back down.',
    skill: 'acceleration',
  },
  'terminal-no-forces': {
    title: 'At terminal velocity there are no forces acting',
    truth: 'At terminal velocity the drag is as big as the weight. Both forces act; they are balanced, so the RESULTANT is zero and the velocity stays constant.',
    skill: 'acceleration',
  },
  'gradient-vs-value': {
    title: 'Reading the value instead of the gradient',
    truth: 'On an s–t graph the HEIGHT is the position and the GRADIENT is the velocity. A high point on the graph means far from the start, not fast.',
    skill: 'gradient',
  },
};

/**
 * Fix the Mistake cases. Each has three steps the student works through:
 * what is wrong, why it is wrong, and the correct interpretation. The first
 * option in every list is the correct one; the game shuffles them.
 */
const FIX_CASES = [
  {
    id: 'fix-neg-velocity',
    misconception: 'neg-velocity-slowing',
    scenario: 'reverse-speeding-up',
    graph: 'v',
    window: [0, 4],
    tier: 'gcse',
    claim: 'The velocity is negative the whole time, so the car is slowing down.',
    what: [
      'It treats the sign of the velocity as if it said whether the speed is rising or falling',
      'It misreads the graph — the velocity values are actually positive',
      'It mixes up the time and velocity axes',
      'Nothing is wrong: negative velocity does mean slowing down',
    ],
    why: [
      'The sign only gives the direction of motion. The size of the velocity grows from 0 to 6 m/s, so the speed is increasing',
      'Negative numbers are smaller, so a negative velocity must be a smaller speed',
      'Velocity can never be negative, so the graph must be wrong',
      'The graph slopes downwards, and downward slopes always mean slowing down',
    ],
    correct: [
      'The car moves to the left (negative direction) and speeds up: velocity and acceleration are both negative',
      'The car moves to the right and slows down',
      'The car moves to the left and slows down',
      'The car is stationary because its velocity is negative',
    ],
  },
  {
    id: 'fix-skydiver',
    misconception: 'neg-accel-slowing',
    scenario: 'skydiver',
    graph: 'a',
    window: [0, 10],
    tier: 'alevel',
    claim: 'The acceleration is negative for the first 10 s, so the skydiver is slowing down.',
    what: [
      'It ignores the direction the skydiver is moving',
      'It misreads the acceleration — it is actually positive',
      'It forgets that the skydiver is stationary at the start',
      'Nothing is wrong',
    ],
    why: [
      'She is falling, so her velocity is also negative. Velocity and acceleration have the same sign, so her speed increases',
      'Acceleration shrinking towards zero means she is slowing down',
      'Gravity always slows things down',
      'Negative acceleration always means deceleration',
    ],
    correct: [
      'She speeds up downwards, but by less and less each second, until she reaches a steady terminal velocity at 10 s',
      'She slows down until she stops at 10 s',
      'She moves upwards and slows down',
      'She falls at constant speed the whole time',
    ],
  },
  {
    id: 'fix-runner-back',
    misconception: 'backwards-neg-accel',
    scenario: 'shuttle-run',
    graph: 'v',
    window: [9, 10],
    tier: 'gcse',
    claim: 'Between 9 s and 10 s the runner is moving back towards the start, so her acceleration must be negative.',
    what: [
      'It assumes the direction of motion decides the sign of the acceleration',
      'It misreads the direction — she is actually moving away from the start',
      'It reads the acceleration from the height of the graph instead of its value',
      'Nothing is wrong',
    ],
    why: [
      'Her velocity goes from −6 m/s to 0, an increase of +6 m/s in 1 s, so the gradient (acceleration) is +6 m/s²',
      'Anything moving backwards has negative everything',
      'The graph is below the axis, so its gradient must be negative',
      'She is slowing down, and slowing down always means negative acceleration',
    ],
    correct: [
      'She is moving in the negative direction and slowing down, so her acceleration is POSITIVE (+6 m/s²)',
      'She is moving in the negative direction and speeding up, acceleration −6 m/s²',
      'She is stationary, acceleration zero',
      'She is moving in the positive direction, acceleration +6 m/s²',
    ],
  },
  {
    id: 'fix-cart-a-zero',
    misconception: 'zero-crossing-stops',
    scenario: 'pendulum-cart',
    graph: 'a',
    window: [1.5, 2.5],
    tier: 'alevel',
    claim: 'The acceleration graph crosses zero at t = 2 s, so the cart stops there.',
    what: [
      'It treats zero ACCELERATION as if it were zero VELOCITY',
      'It misreads the time — the graph crosses at 4 s',
      'It forgets that acceleration can be negative',
      'Nothing is wrong',
    ],
    why: [
      'a = 0 only means the velocity has stopped changing for an instant. Before 2 s the cart was speeding up; after it, slowing — so 2 s is its moment of MAXIMUM speed',
      'Zero on any graph means stopped',
      'The cart cannot move without acceleration',
      'The area under the graph is zero at 2 s',
    ],
    correct: [
      'At 2 s the cart is moving at its greatest speed to the right (+2 m/s); it stops for an instant at 4 s',
      'The cart is stationary from 2 s onwards',
      'The cart reverses direction at 2 s',
      'The cart is back at its starting point at 2 s',
    ],
  },
  {
    id: 'fix-drone-s-zero',
    misconception: 'zero-crossing-stops',
    scenario: 'drone',
    graph: 's',
    window: [12, 14],
    tier: 'gcse',
    claim: 'The displacement graph crosses zero here, so the drone stops at that moment.',
    what: [
      'It treats zero DISPLACEMENT as if it meant zero VELOCITY',
      'It misreads the graph — the displacement never reaches zero',
      'It confuses the drone with the parcel',
      'Nothing is wrong',
    ],
    why: [
      's = 0 means the drone is level with where it took off. The graph is still sloping there, so the drone is still moving',
      'Zero on any graph means stopped',
      'Drones cannot go below their launch height',
      'The gradient is zero where the graph crosses the axis',
    ],
    correct: [
      'The drone passes its launch height while still moving downwards, then continues below it',
      'The drone lands at that moment',
      'The drone hovers at its launch height',
      'The drone reverses direction at its launch height',
    ],
  },
  {
    id: 'fix-walk-distance',
    misconception: 'displacement-distance',
    scenario: 'walk-to-shop',
    graph: 's',
    window: [0, 10],
    tier: 'gcse',
    claim: 'Maya walked 8 m there and 8 m back, so her displacement after 10 s is 16 m.',
    what: [
      'It gives the distance travelled when the question asks for displacement',
      'It adds the times instead of the distances',
      'It misreads the graph — she walked 10 m each way',
      'Nothing is wrong',
    ],
    why: [
      'Displacement is the change in position from start to finish. She ends where she started, so it is 0 m. The 16 m is the distance',
      'Displacement is always half the distance',
      'You can only find displacement from a velocity–time graph',
      'Displacement is the largest value on the graph',
    ],
    correct: ['Displacement after 10 s = 0 m; distance travelled = 16 m', 'Displacement = 8 m; distance = 16 m', 'Displacement = 16 m; distance = 0 m', 'Displacement = −8 m; distance = 8 m'],
  },
  {
    id: 'fix-ball-top',
    misconception: 'velocity-acceleration-same',
    scenario: 'ball-thrown-up',
    graph: 'v',
    window: [1.2, 1.8],
    tier: 'gcse',
    claim: 'At the top of its flight the ball’s velocity is zero, so its acceleration is zero too.',
    what: [
      'It assumes that zero velocity means zero acceleration',
      'It misreads the time of the top of the flight',
      'It forgets that velocity can be negative',
      'Nothing is wrong',
    ],
    why: [
      'Acceleration is the GRADIENT of the v–t graph. The line keeps the same slope through v = 0, so a = −10 m/s² even at the top',
      'The ball is not moving, so nothing is happening',
      'Gravity switches off at the top of the flight',
      'Acceleration is the value read from the v–t graph',
    ],
    correct: [
      'At the top v = 0 but a = −10 m/s²; that is why the ball’s velocity becomes negative and it falls back',
      'At the top both v and a are zero, and the ball hovers for a moment',
      'At the top a = 0 but v = −10 m/s',
      'At the top a = +10 m/s²',
    ],
  },
  {
    id: 'fix-steep-st',
    misconception: 'steeper-greater-accel',
    scenario: 'car-trip',
    graph: 's',
    window: [5, 10],
    tier: 'gcse',
    claim: 'The displacement graph is steepest between 5 s and 10 s, so that is when the car’s acceleration is greatest.',
    what: [
      'It reads the gradient of an s–t graph as acceleration instead of velocity',
      'It misreads the time interval — the steepest part is at the start',
      'It forgets that displacement can be negative',
      'Nothing is wrong',
    ],
    why: [
      'The gradient of an s–t graph is the velocity. Here it is a steep STRAIGHT line, so the velocity is high and constant — acceleration is zero',
      'Steep graphs always mean large acceleration',
      'Acceleration is the area under the s–t graph',
      'The car is stationary because the graph is a straight line',
    ],
    correct: [
      'Between 5 s and 10 s the car travels at its highest, constant velocity (10 m/s) with zero acceleration',
      'Between 5 s and 10 s the car has its largest acceleration',
      'Between 5 s and 10 s the car is slowing down',
      'Between 5 s and 10 s the car is stationary',
    ],
  },
  {
    id: 'fix-sprinter-area',
    misconception: 'area-always-distance',
    scenario: 'sprinter',
    graph: 'a',
    window: [0, 5],
    tier: 'alevel',
    claim: 'The area under the acceleration–time graph for the first 5 s is the distance the sprinter runs.',
    what: [
      'It applies the "area = distance" rule to the wrong graph',
      'It uses the wrong time interval',
      'It forgets that acceleration is negative',
      'Nothing is wrong',
    ],
    why: [
      'Area under an a–t graph = acceleration × time = CHANGE IN VELOCITY (units m/s² × s = m/s), not a distance',
      'Area under every motion graph is distance',
      'The area is zero because the line slopes down',
      'You can only find areas under straight lines',
    ],
    correct: [
      'The area (½ × 5 s × 4 m/s² = 10 m/s) is her change in velocity: from rest to 10 m/s',
      'The area is 10 m — the distance she runs',
      'The area is 20 m',
      'The area has no meaning',
    ],
  },
  {
    id: 'fix-shuttle-area',
    misconception: 'area-always-distance',
    scenario: 'shuttle-run',
    graph: 'v',
    window: [0, 10],
    tier: 'gcse',
    claim: 'The total area between the graph and the time axis is 39 m, so after 10 s the runner is 39 m from the start.',
    what: [
      'It treats the area below the axis as positive when finding displacement',
      'It miscalculates the area — the total is 24 m',
      'It reads the axes the wrong way round',
      'Nothing is wrong',
    ],
    why: [
      'Area below the time axis means displacement in the NEGATIVE direction, so it must be subtracted: 24 m − 15 m = 9 m',
      'Area is always positive, so it always adds',
      'Displacement is found from the gradient, not the area',
      'You can only use the part of the graph above the axis',
    ],
    correct: [
      'Displacement = +9 m (9 m from the start, on the positive side); distance travelled = 39 m',
      'Displacement = 39 m; distance = 9 m',
      'Displacement = 24 m; distance = 39 m',
      'Displacement = 0 m because she came back',
    ],
  },
  {
    id: 'fix-st-positive',
    misconception: 'pos-gradient-speeding',
    scenario: 'steady-car',
    graph: 's',
    window: [0, 8],
    tier: 'gcse',
    claim: 'The displacement graph has a positive gradient, so the car is speeding up.',
    what: [
      'It reads a positive s–t gradient as speeding up instead of as moving in the positive direction',
      'It misreads the gradient — it is actually negative',
      'It ignores the units on the axes',
      'Nothing is wrong',
    ],
    why: [
      'The gradient is the velocity: +5 m/s throughout. A constant gradient means constant velocity, so the speed is not changing',
      'Anything going up on a graph is speeding up',
      'Positive gradients always mean positive acceleration',
      'The car is accelerating because it is moving',
    ],
    correct: ['The car moves to the right at a constant 5 m/s (zero acceleration)', 'The car speeds up at 5 m/s²', 'The car slows down', 'The car moves left at 5 m/s'],
  },
  {
    id: 'fix-vt-positive',
    misconception: 'pos-gradient-speeding',
    scenario: 'reverse-braking',
    graph: 'v',
    window: [0, 3],
    tier: 'gcse',
    claim: 'The velocity–time graph has a positive gradient, so the car is speeding up.',
    what: [
      'It ignores that the velocity is negative while the gradient is positive',
      'It misreads the gradient — it is actually negative',
      'It confuses this with a displacement–time graph',
      'Nothing is wrong',
    ],
    why: [
      'Velocity goes from −6 m/s to 0: its SIZE (the speed) is falling. Acceleration is positive but velocity is negative — opposite signs mean slowing down',
      'A positive gradient on any graph means speeding up',
      'The car must be speeding up because its acceleration is positive',
      'The graph is below the axis so it doesn’t count',
    ],
    correct: [
      'The car is moving to the left and slowing down, with a positive acceleration of +2 m/s²',
      'The car is moving to the right and speeding up',
      'The car is moving to the left and speeding up',
      'The car is stationary',
    ],
  },
  {
    id: 'fix-overshoot-decel',
    misconception: 'neg-accel-deceleration',
    scenario: 'overshoot',
    graph: 'v',
    window: [3, 6],
    tier: 'alevel',
    claim: 'The acceleration is −2 m/s², so between 3 s and 6 s the car is decelerating.',
    what: [
      'It assumes negative acceleration means slowing down, whatever the direction of motion',
      'It misreads the acceleration — it is +2 m/s² after 3 s',
      'It uses the wrong time interval',
      'Nothing is wrong',
    ],
    why: [
      'After 3 s the velocity is negative too, and growing in size from 0 to −6 m/s — so the speed is INCREASING',
      'The acceleration hasn’t changed, so the car must still be decelerating',
      'Deceleration is just another word for negative acceleration',
      'The graph is sloping down, so the car is slowing down',
    ],
    correct: [
      'From 3 s the car moves to the left and speeds up; it was decelerating only before 3 s',
      'The car decelerates for the whole 6 s',
      'The car stops at 3 s and stays stopped',
      'The car moves to the right faster and faster',
    ],
  },
  {
    id: 'fix-trolley-speed',
    misconception: 'speed-velocity',
    scenario: 'trolley-ramp',
    graph: 'v',
    window: [4.6, 5.4],
    tier: 'gcse',
    claim: 'At t = 5 s the trolley’s speed is −2 m/s.',
    what: [
      'It gives a velocity where a speed was asked for',
      'It misreads the graph — the velocity is +2 m/s',
      'It reads the time wrongly',
      'Nothing is wrong',
    ],
    why: [
      'Speed is the size of the velocity and can’t be negative. The velocity is −2 m/s, so the speed is 2 m/s (in the negative direction)',
      'Speed and velocity are the same quantity',
      'Speed is always half the velocity',
      'Speed is read from the gradient of the v–t graph',
    ],
    correct: [
      'Velocity = −2 m/s; speed = 2 m/s (rolling back down the ramp)',
      'Velocity = +2 m/s; speed = −2 m/s',
      'Velocity = −2 m/s; speed = −2 m/s',
      'Velocity = 0; speed = 2 m/s',
    ],
  },
  {
    id: 'fix-drag-up',
    misconception: 'drag-direction',
    scenario: 'ball-drag',
    graph: 'a',
    window: [0, 1.4],
    tier: 'gcse',
    claim: 'Air resistance acts upwards, against gravity, so on the way up the ball slows down more gently than it would without air resistance.',
    what: [
      'It assumes air resistance always acts upwards, whatever way the ball moves',
      'It gets the direction of the weight wrong',
      'It forgets that the ball has mass',
      'Nothing is wrong',
    ],
    why: [
      'Air resistance opposes the velocity. Going up, it acts DOWN, adding to the weight, so the resultant is bigger than the weight and |a| > g',
      'Air resistance always pushes upwards because air is underneath the ball',
      'Air resistance only acts on falling objects',
      'Gravity is weaker higher up',
    ],
    correct: [
      'On the way up the acceleration is more negative than −g: the a–t graph starts BELOW the −g line',
      'On the way up the acceleration is smaller than g',
      'On the way up the acceleration is exactly −g',
      'On the way up the acceleration is positive',
    ],
  },
  {
    id: 'fix-drag-top',
    misconception: 'top-no-forces',
    scenario: 'ball-drag',
    graph: 'a',
    window: [1.2, 1.6],
    tier: 'gcse',
    claim: 'At the top the ball isn\u2019t moving, so there are no forces on it and its acceleration is zero.',
    what: [
      'It forgets that the weight still acts when the ball is momentarily still',
      'It misreads the time of the top of the flight',
      'It forgets that drag acts upwards at the top',
      'Nothing is wrong',
    ],
    why: [
      'At the top v = 0, so the DRAG is zero — but the weight is not. The only force is the weight, so a = −g',
      'Objects that aren\u2019t moving have no forces on them',
      'Drag and weight cancel at the top',
      'Gravity switches off at the top',
    ],
    correct: [
      'At the top a = −g exactly; the a–t graph touches the −g line there, then keeps rising towards zero',
      'At the top a = 0 and the ball hovers for an instant',
      'At the top a is smaller than g because drag acts upwards',
      'At the top a is positive',
    ],
  },
  {
    id: 'fix-drag-symmetric',
    misconception: 'drag-symmetric',
    scenario: 'ball-drag',
    graph: 's',
    window: [0, 3.09],
    tier: 'gcse',
    claim: 'The ball takes the same time to come down as to go up, so it lands at the same speed it was thrown at: 20 m/s.',
    what: [
      'It uses the no-air-resistance answer for a motion with air resistance',
      'It adds the two times together',
      'It forgets that the ball lands below its launch point',
      'Nothing is wrong',
    ],
    why: [
      'Going up, drag adds to the weight, so the ball stops quickly. Coming down, drag opposes the weight, so it speeds up slowly. Drag also takes energy away the whole time',
      'Air resistance only acts on the way down',
      'Heavier objects fall faster',
      'The s–t graph is a symmetric curve',
    ],
    correct: [
      'It rises in about 1.4 s, takes about 1.7 s to fall, and lands at about 12 m/s',
      'It rises and falls in 1.5 s each and lands at 20 m/s',
      'It rises in 1.7 s, falls in 1.4 s and lands at 25 m/s',
      'It lands at 20 m/s but takes longer to fall',
    ],
  },
  {
    id: 'fix-terminal',
    misconception: 'terminal-no-forces',
    scenario: 'skydiver',
    graph: 'v',
    window: [10, 14],
    tier: 'gcse',
    claim: 'Between 10 s and 14 s the velocity–time graph is flat, so there are no forces acting on the skydiver.',
    what: [
      'It confuses balanced forces with no forces',
      'It misreads the graph — the velocity is still changing',
      'It forgets that velocity is negative',
      'Nothing is wrong',
    ],
    why: [
      'A flat v–t graph means zero acceleration, so zero RESULTANT force. The weight and the drag both still act; here they are equal and opposite',
      'Forces only act while an object is speeding up',
      'The skydiver has stopped falling',
      'Air resistance switches off at terminal velocity',
    ],
    correct: [
      'Drag = weight, so the resultant is zero and she falls at a steady 50 m/s (terminal velocity)',
      'There are no forces, so she floats',
      'Her weight has fallen to zero',
      'Drag is bigger than her weight, so she is slowing down',
    ],
  },
];

function getMisconception(id) {
  return MISCONCEPTIONS[id] || null;
}

function casesFor(misconceptionId) {
  return FIX_CASES.filter((c) => c.misconception === misconceptionId);
}

const misconceptionsApi = { MISCONCEPTIONS, FIX_CASES, getMisconception, casesFor };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = misconceptionsApi;
} else if (typeof window !== 'undefined') {
  window.Misconceptions = misconceptionsApi;
}
