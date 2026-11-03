/**
 * Session progress: XP, stars, streaks, badges, skill mastery, misconception
 * counts, time spent and an answer log for the dashboard.
 *
 * Privacy: everything lives in the browser's sessionStorage — this device,
 * this tab only. Nothing is ever sent anywhere, there are no accounts, and
 * the browser deletes it automatically when the tab or app is closed.
 *
 * The store takes its storage object as a parameter so the same logic runs
 * in tests with a plain in-memory stand-in.
 */

const PG_KEY = 'motion-graphs-mastery.session.v1';

const TIER_XP = { gcse: 1, alevel: 1.5, extension: 2 };

const RANKS = [
  { xp: 0, title: 'Trainee' },
  { xp: 150, title: 'Graph Reader' },
  { xp: 400, title: 'Gradient Spotter' },
  { xp: 800, title: 'Area Analyst' },
  { xp: 1400, title: 'Motion Detective' },
  { xp: 2200, title: 'Kinematics Specialist' },
  { xp: 3200, title: 'Graph Master' },
];

const BADGES = {
  'first-steps': { title: 'First steps', desc: 'Complete your first level.' },
  'streak-5': { title: 'On a roll', desc: '5 correct answers in a row.' },
  'streak-10': { title: 'Unstoppable', desc: '10 correct answers in a row.' },
  'streak-20': { title: 'Flawless', desc: '20 correct answers in a row.' },
  'sign-sense': { title: 'Sign sense', desc: 'Reach 80% mastery of sign conventions.' },
  detective: { title: 'Detective', desc: 'Solve 3 Graph Detective cases without a mistake.' },
  'myth-buster': { title: 'Myth buster', desc: 'Fix 5 flawed arguments.' },
  artist: { title: 'Graph artist', desc: 'Pass 5 sketched graphs.' },
  pilot: { title: 'Pilot', desc: 'Earn 3 stars in Create the Motion.' },
  cruncher: { title: 'Number cruncher', desc: '20 correct numerical answers.' },
  'three-stars': { title: 'Star collector', desc: 'Earn 3 stars on 5 levels.' },
  'all-rounder': { title: 'All-rounder', desc: 'Reach 50% mastery in all eight core skills.' },
  'a-star': { title: 'A* thinker', desc: 'Complete an extension (A/A*) level.' },
  calculus: { title: 'Calculus connection', desc: 'Complete the calculus level.' },
  comeback: { title: 'Comeback', desc: 'Answer correctly a question type that tripped you up earlier.' },
};

const CORE_SKILLS = ['signs', 'displacement', 'velocity', 'acceleration', 'gradient', 'area', 'reconstruction', 'multistage'];

function freshState(now) {
  return {
    version: 1,
    startedAt: now,
    xp: 0,
    streak: 0,
    bestStreak: 0,
    levels: {},
    skills: {},
    misconceptions: {},
    activityTime: {},
    counters: { detectivePerfect: 0, fixesSolved: 0, sketchesPassed: 0, quantCorrect: 0, threeStars: 0 },
    badges: {},
    history: [],
    missedTypes: {},
    settings: { course: 'alevel', mathMode: 'standard', unlockAll: false, difficulty: 'adaptive', focus: 'none' },
  };
}

/** Wrap a Storage so a blocked or unavailable one (private mode, sandboxed preview) never throws. */
function safeStorage(storage) {
  return {
    get(key) {
      try {
        return storage ? storage.getItem(key) : null;
      } catch (e) {
        return null;
      }
    },
    set(key, value) {
      try {
        if (storage) storage.setItem(key, value);
      } catch (e) {
        /* storage full or blocked: progress just won't persist across reloads */
      }
    },
    remove(key) {
      try {
        if (storage) storage.removeItem(key);
      } catch (e) {
        /* ignore */
      }
    },
  };
}

function createStore(storage, clock) {
  const store = safeStorage(storage);
  const now = clock || (() => Date.now());
  let state;
  try {
    const raw = store.get(PG_KEY);
    state = raw ? JSON.parse(raw) : null;
  } catch (e) {
    state = null;
  }
  if (!state || state.version !== 1) state = freshState(now());
  // make sure newer fields exist on an older saved shape
  state = Object.assign(freshState(state.startedAt || now()), state);
  const listeners = [];

  function save() {
    store.set(PG_KEY, JSON.stringify(state));
    listeners.forEach((fn) => fn(state));
  }

  function award(id, events) {
    if (state.badges[id] || !BADGES[id]) return;
    state.badges[id] = now();
    events.push({ kind: 'badge', id, title: BADGES[id].title, desc: BADGES[id].desc });
  }

  function mastery(skill) {
    const s = state.skills[skill];
    if (!s) return 0;
    // Evidence-weighted score: needs several recent correct answers to reach a high value.
    return Math.max(0, Math.min(1, s.score / (s.weight + 3)));
  }

  function checkBadges(events) {
    if (state.bestStreak >= 5) award('streak-5', events);
    if (state.bestStreak >= 10) award('streak-10', events);
    if (state.bestStreak >= 20) award('streak-20', events);
    if (mastery('signs') >= 0.8) award('sign-sense', events);
    if (state.counters.detectivePerfect >= 3) award('detective', events);
    if (state.counters.fixesSolved >= 5) award('myth-buster', events);
    if (state.counters.sketchesPassed >= 5) award('artist', events);
    if (state.counters.quantCorrect >= 20) award('cruncher', events);
    if (state.counters.threeStars >= 5) award('three-stars', events);
    if (CORE_SKILLS.every((k) => mastery(k) >= 0.5)) award('all-rounder', events);
  }

  /**
   * Record one answer.
   * result: { correct, skills: [], tier, type, levelId, misconception, band, questionType, counter }
   * Returns { xpGained, events: [badge / rank-up events] }.
   */
  function recordAnswer(result) {
    const events = [];
    const rankBefore = rankFor(state.xp).title;
    const tierMult = TIER_XP[result.tier] || 1;
    const band = result.band || 1;
    const w = 1 + 0.25 * (band - 1);
    (result.skills || []).forEach((skill) => {
      const s = state.skills[skill] || { score: 0, weight: 0, correct: 0, attempts: 0 };
      // decay older evidence so recent performance counts most
      s.score = s.score * 0.92 + (result.correct ? w : 0);
      s.weight = s.weight * 0.92 + w;
      s.attempts += 1;
      if (result.correct) s.correct += 1;
      state.skills[skill] = s;
    });
    let xpGained = 0;
    if (result.correct) {
      state.streak += 1;
      state.bestStreak = Math.max(state.bestStreak, state.streak);
      xpGained = Math.round(10 * tierMult + Math.min(state.streak - 1, 5) * 2);
      if (result.questionType && state.missedTypes[result.questionType]) {
        award('comeback', events);
        delete state.missedTypes[result.questionType];
      }
      if (result.counter) state.counters[result.counter] = (state.counters[result.counter] || 0) + 1;
    } else {
      state.streak = 0;
      if (result.misconception) state.misconceptions[result.misconception] = (state.misconceptions[result.misconception] || 0) + 1;
      if (result.questionType) state.missedTypes[result.questionType] = true;
    }
    state.xp += xpGained;
    state.history.push({ t: now(), c: result.correct ? 1 : 0, k: (result.skills || [])[0] || null, y: result.type || null, l: result.levelId || null, m: result.misconception || null });
    if (state.history.length > 600) state.history.splice(0, state.history.length - 600);
    checkBadges(events);
    const rankAfter = rankFor(state.xp).title;
    if (rankAfter !== rankBefore) events.push({ kind: 'rank', title: rankAfter });
    save();
    return { xpGained, events, streak: state.streak };
  }

  /** Finish a level: stars from accuracy, personal bests, completion bonus. */
  function completeLevel(level, correct, total, elapsedMs) {
    const events = [];
    const accuracy = total ? correct / total : 0;
    const stars = accuracy >= 0.9 ? 3 : accuracy >= 0.7 ? 2 : 1;
    const prev = state.levels[level.id] || { stars: 0, bestAccuracy: 0, attempts: 0, completed: false, bestTimeMs: null };
    const newBest = accuracy > prev.bestAccuracy;
    const fasterBest = prev.bestTimeMs === null || elapsedMs < prev.bestTimeMs;
    const entry = {
      stars: Math.max(prev.stars, stars),
      bestAccuracy: Math.max(prev.bestAccuracy, accuracy),
      attempts: prev.attempts + 1,
      completed: true,
      bestTimeMs: fasterBest ? elapsedMs : prev.bestTimeMs,
    };
    state.levels[level.id] = entry;
    const bonus = 20 * stars * (TIER_XP[level.tier] || 1);
    state.xp += bonus;
    if (stars === 3 && prev.stars < 3) state.counters.threeStars += 1;
    award('first-steps', events);
    if (level.tier === 'extension') award('a-star', events);
    if (level.calculus) award('calculus', events);
    if (level.type === 'create' && stars === 3) award('pilot', events);
    checkBadges(events);
    save();
    return { stars, accuracy, bonus, newBest: newBest && prev.attempts > 0, fasterBest: fasterBest && prev.attempts > 0, events };
  }

  function addTime(activity, ms) {
    if (!(ms > 0) || ms > 30 * 60 * 1000) return;
    state.activityTime[activity] = (state.activityTime[activity] || 0) + ms;
    save();
  }

  function setSetting(key, value) {
    state.settings[key] = value;
    save();
  }

  function reset() {
    const settings = state.settings;
    state = freshState(now());
    state.settings = settings;
    store.remove(PG_KEY);
    save();
  }

  /** Rolling accuracy over the last `windowSize` answers, for the improvement chart. */
  function rollingAccuracy(windowSize) {
    const wsz = windowSize || 10;
    const out = [];
    for (let i = 0; i < state.history.length; i++) {
      const lo = Math.max(0, i - wsz + 1);
      let c = 0;
      for (let k = lo; k <= i; k++) c += state.history[k].c;
      out.push(c / (i - lo + 1));
    }
    return out;
  }

  /** Skills with the lowest mastery that have been tried, weakest first. */
  function weakestSkills(count) {
    return Object.keys(state.skills)
      .filter((k) => state.skills[k].attempts >= 2)
      .sort((a, b) => mastery(a) - mastery(b))
      .slice(0, count || 3);
  }

  return {
    get state() {
      return state;
    },
    recordAnswer,
    completeLevel,
    addTime,
    setSetting,
    reset,
    mastery,
    rollingAccuracy,
    weakestSkills,
    rank: () => rankFor(state.xp),
    onChange: (fn) => listeners.push(fn),
  };
}

function rankFor(xp) {
  let r = RANKS[0];
  let next = null;
  for (let i = 0; i < RANKS.length; i++) {
    if (xp >= RANKS[i].xp) {
      r = RANKS[i];
      next = RANKS[i + 1] || null;
    }
  }
  return { title: r.title, floor: r.xp, next: next ? next.xp : null, nextTitle: next ? next.title : null };
}

const progressApi = { createStore, rankFor, BADGES, RANKS, CORE_SKILLS, KEY: PG_KEY };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = progressApi;
} else if (typeof window !== 'undefined') {
  window.Progress = progressApi;
}
