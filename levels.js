/**
 * The level map: six stages from "what is a sign?" to reconstruction and
 * calculus, plus the free-play explorers.
 *
 * Tiers:
 *   gcse       – core path, counts towards unlocking the next stage
 *   alevel     – A-level content; never required to progress
 *   extension  – A/A*, Oxbridge-style and mathematical enrichment; never required
 *
 * A level marked `calculus: true` only appears in Mathematical Extension mode.
 */

const SKILLS = {
  signs: 'Sign conventions',
  displacement: 'Displacement graphs',
  velocity: 'Velocity graphs',
  acceleration: 'Acceleration graphs',
  gradient: 'Gradient interpretation',
  area: 'Area interpretation',
  reconstruction: 'Motion reconstruction',
  multistage: 'Multi-stage journeys',
  alevel: 'A-level extension tasks',
  maths: 'Mathematical enrichment',
};

const STAGES = [
  { id: 1, title: 'Understanding Motion', blurb: 'Position, direction, and what a minus sign really means.' },
  { id: 2, title: 'Reading Graphs', blurb: 'Read values off s–t, v–t and a–t graphs.' },
  { id: 3, title: 'Interpreting Graphs', blurb: 'Gradients, areas, and the story a graph tells.' },
  { id: 4, title: 'Linking Representations', blurb: 'Motion ⇄ words ⇄ graphs ⇄ equations.' },
  { id: 5, title: 'Quantitative Problem Solving', blurb: 'Numbers from gradients and areas, GCSE to A-level.' },
  { id: 6, title: 'Mastery', blurb: 'Reconstruction, non-intuitive motion, optimisation and calculus.' },
];

const TYPE_INFO = {
  signs: { label: 'Signs lab', icon: '±' },
  predict: { label: 'Predict the motion', icon: 'B' },
  match: { label: 'Match the motion', icon: 'A' },
  draw: { label: 'Draw the graph', icon: 'C' },
  fix: { label: 'Fix the mistake', icon: 'D' },
  create: { label: 'Create the motion', icon: 'E' },
  detective: { label: 'Graph Detective', icon: '?' },
  quant: { label: 'Quantitative challenge', icon: '#' },
  link: { label: 'Link the representations', icon: '⇄' },
  area: { label: 'Area challenge', icon: '▧' },
  reconstruct: { label: 'Reconstruction lab', icon: '◭' },
  drag: { label: 'Air resistance', icon: '🪂' },
};

const LEVELS = [
  // Stage 1
  { id: '1-1', stage: 1, tier: 'gcse', type: 'signs', title: 'Which way is positive?', skills: ['signs', 'displacement'], rounds: 6, config: { topics: ['position', 'displacement', 'distance'] } },
  { id: '1-2', stage: 1, tier: 'gcse', type: 'signs', title: 'Velocity has a direction', skills: ['signs', 'velocity'], rounds: 6, config: { topics: ['velocity', 'speed'] } },
  { id: '1-3', stage: 1, tier: 'gcse', type: 'signs', title: 'Acceleration and its sign', skills: ['signs', 'acceleration'], rounds: 8, config: { topics: ['acceleration'] } },
  // Stage 2
  { id: '2-1', stage: 2, tier: 'gcse', type: 'predict', title: 'Reading s–t graphs', skills: ['displacement'], rounds: 6, config: { graphs: ['s'], tiers: [1] } },
  { id: '2-2', stage: 2, tier: 'gcse', type: 'predict', title: 'Reading v–t graphs', skills: ['velocity'], rounds: 6, config: { graphs: ['v'], tiers: [2] } },
  { id: '2-3', stage: 2, tier: 'gcse', type: 'predict', title: 'Reading a–t graphs', skills: ['acceleration'], rounds: 6, config: { graphs: ['a'], tiers: [2, 3] } },
  { id: '2-4', stage: 2, tier: 'gcse', type: 'match', title: 'Match the motion: steady stages', skills: ['displacement', 'velocity'], rounds: 4, config: { tiers: [1] } },
  // Stage 3
  { id: '3-1', stage: 3, tier: 'gcse', type: 'predict', title: 'Gradients tell the story', skills: ['gradient', 'velocity'], rounds: 6, config: { graphs: ['s', 'v'], tiers: [2, 3], focus: 'gradient' } },
  { id: '3-2', stage: 3, tier: 'gcse', type: 'area', title: 'Area means displacement', skills: ['area', 'displacement'], rounds: 5, config: { tiers: [2, 3] } },
  { id: '3-3', stage: 3, tier: 'gcse', type: 'match', title: 'Match the motion: accelerating', skills: ['velocity', 'acceleration'], rounds: 4, config: { tiers: [2, 3] } },
  { id: '3-4', stage: 3, tier: 'gcse', type: 'draw', title: 'Draw the graph', skills: ['displacement', 'velocity'], rounds: 4, config: { tiers: [1, 2], source: 'motion' } },
  { id: '3-5', stage: 3, tier: 'gcse', type: 'fix', title: 'Fix the mistake', skills: ['signs', 'gradient'], rounds: 5, config: { tier: 'gcse' } },
  // Stage 4
  { id: '4-1', stage: 4, tier: 'gcse', type: 'link', title: 'Words → graphs', skills: ['velocity', 'multistage'], rounds: 5, config: { mode: 'words-to-graph' } },
  { id: '4-2', stage: 4, tier: 'gcse', type: 'link', title: 'Graphs → words', skills: ['gradient', 'multistage'], rounds: 5, config: { mode: 'graph-to-words' } },
  { id: '4-3', stage: 4, tier: 'gcse', type: 'link', title: 'Equations ⇄ graphs', skills: ['velocity', 'acceleration'], rounds: 5, config: { mode: 'equations' } },
  { id: '4-4', stage: 4, tier: 'gcse', type: 'draw', title: 'Reverse engineering', skills: ['gradient', 'area'], rounds: 4, config: { tiers: [2, 3], source: 'graph' } },
  { id: '4-5', stage: 4, tier: 'gcse', type: 'create', title: 'Create the motion', skills: ['velocity', 'acceleration', 'signs'], rounds: 3, config: {} },
  { id: '4-6', stage: 4, tier: 'gcse', type: 'detective', title: 'Graph Detective: first cases', skills: ['multistage', 'gradient'], rounds: 3, config: { tiers: [1, 2, 3] } },
  // Stage 5
  { id: '5-1', stage: 5, tier: 'gcse', type: 'quant', title: 'Gradients by numbers', skills: ['gradient'], rounds: 5, config: { topics: ['vel-gradient', 'acc-gradient'] } },
  { id: '5-2', stage: 5, tier: 'gcse', type: 'quant', title: 'Areas by numbers', skills: ['area'], rounds: 5, config: { topics: ['disp-area', 'dv-area'] } },
  { id: '5-3', stage: 5, tier: 'gcse', type: 'quant', title: 'Distance or displacement?', skills: ['displacement', 'multistage'], rounds: 5, config: { topics: ['distance', 'displacement-net', 'avg-velocity', 'avg-speed'] } },
  { id: '5-4', stage: 5, tier: 'gcse', type: 'quant', title: 'When does it turn round?', skills: ['signs', 'velocity'], rounds: 4, config: { topics: ['reverse-time', 'reverse-time', 'reverse-from-a'] } },
  { id: '5-5', stage: 5, tier: 'alevel', type: 'quant', title: 'A-level journeys', skills: ['reconstruction', 'alevel'], rounds: 4, config: { topics: ['trapezium-vmax', 'unknown-decel', 'missing-section'] } },
  { id: '5-6', stage: 5, tier: 'alevel', type: 'quant', title: 'Non-uniform motion', skills: ['alevel', 'gradient'], rounds: 4, config: { topics: ['variable-accel', 'tangent'] } },
  // Stage 6
  { id: '6-1', stage: 6, tier: 'gcse', type: 'detective', title: 'Detective: expert files', skills: ['multistage'], rounds: 3, config: { tiers: [4] } },
  { id: '6-2', stage: 6, tier: 'gcse', type: 'draw', title: 'Draw it: multi-stage', skills: ['multistage', 'gradient'], rounds: 3, config: { tiers: [3, 4], source: 'motion' } },
  { id: '6-3', stage: 6, tier: 'alevel', type: 'detective', title: 'Detective: mastery files', skills: ['alevel', 'signs'], rounds: 3, config: { tiers: [5] } },
  { id: '6-4', stage: 6, tier: 'alevel', type: 'match', title: 'Match: variable acceleration', skills: ['alevel', 'acceleration'], rounds: 4, config: { tiers: [5] } },
  { id: '6-5', stage: 6, tier: 'alevel', type: 'fix', title: 'Fix the mistake: A-level', skills: ['alevel', 'signs'], rounds: 4, config: { tier: 'alevel' } },
  { id: '6-6', stage: 6, tier: 'extension', type: 'reconstruct', title: 'Reconstruction lab', skills: ['reconstruction'], rounds: 4, config: {} },
  { id: '6-7', stage: 6, tier: 'extension', type: 'quant', title: 'Optimisation (A/A*)', skills: ['reconstruction', 'alevel'], rounds: 3, config: { topics: ['optimise'] } },
  { id: '6-9', stage: 6, tier: 'gcse', type: 'drag', title: 'Air resistance: up and back down', skills: ['acceleration', 'signs', 'multistage'], rounds: 10, config: {} },
  { id: '6-8', stage: 6, tier: 'extension', type: 'quant', title: 'Calculus: rates and areas', skills: ['maths'], rounds: 4, config: { topics: ['calc-derivative', 'calc-integral'] }, calculus: true },
];

/** Which levels are visible for a course setting and maths mode. */
function visibleLevels(settings) {
  const course = (settings && settings.course) || 'alevel';
  const maths = (settings && settings.mathMode) || 'standard';
  return LEVELS.filter((lv) => {
    if (lv.calculus && maths !== 'extension') return false;
    if (course === 'gcse') return lv.tier === 'gcse';
    if (course === 'alevel') return lv.tier !== 'extension' || maths === 'extension' || lv.type === 'reconstruct';
    return true;
  });
}

/**
 * Is a stage unlocked? Stage 1 always is. A later stage opens once at least
 * half of the previous stage's CORE (gcse-tier) levels have been completed.
 * A-level and extension levels never block progress.
 */
function stageUnlocked(stageId, levelProgress, settings) {
  if (settings && settings.unlockAll) return true;
  if (stageId <= 1) return true;
  if (!stageUnlocked(stageId - 1, levelProgress, settings)) return false;
  const core = LEVELS.filter((lv) => lv.stage === stageId - 1 && lv.tier === 'gcse');
  const done = core.filter((lv) => levelProgress[lv.id] && levelProgress[lv.id].completed).length;
  return done >= Math.ceil(core.length / 2);
}

function getLevel(id) {
  return LEVELS.find((lv) => lv.id === id) || null;
}

/** The first visible, unlocked level the student has not yet completed (their "next step"). */
function nextLevel(levelProgress, settings) {
  const vis = visibleLevels(settings);
  return vis.find((lv) => stageUnlocked(lv.stage, levelProgress, settings) && !(levelProgress[lv.id] && levelProgress[lv.id].completed)) || null;
}

const levelsApi = { SKILLS, STAGES, TYPE_INFO, LEVELS, visibleLevels, stageUnlocked, getLevel, nextLevel };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = levelsApi;
} else if (typeof window !== 'undefined') {
  window.Levels = levelsApi;
}
