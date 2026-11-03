/**
 * Number formatting, answer parsing and a seeded random-number generator.
 *
 * Signed quantities always show their sign explicitly — a true minus sign
 * (U+2212) for negatives and a "+" for positives where the sign matters —
 * because the whole game is about taking signs seriously.
 */

const MINUS = '−';

/** Round to dp decimal places, dropping trailing zeros ("2.50" → "2.5", "3.00" → "3"). */
function trimNumber(x, dp) {
  const places = dp === undefined ? 2 : dp;
  let str = Number(x).toFixed(places);
  if (str.indexOf('.') >= 0) str = str.replace(/0+$/, '').replace(/\.$/, '');
  if (str === '-0') str = '0';
  return str;
}

/** Plain number with a real minus sign. */
function num(x, dp) {
  const str = trimNumber(x, dp);
  return str.charAt(0) === '-' ? MINUS + str.slice(1) : str;
}

/** Signed number: "+3.2", "−1.5", "0". */
function signed(x, dp) {
  const str = trimNumber(x, dp);
  if (str === '0') return '0';
  return str.charAt(0) === '-' ? MINUS + str.slice(1) : '+' + str;
}

/** Signed number with unit: "+3.2 m/s". */
function signedUnit(x, unit, dp) {
  return signed(x, dp) + (unit ? ' ' + unit : '');
}

function unitStr(x, unit, dp) {
  return num(x, dp) + (unit ? ' ' + unit : '');
}

/**
 * Parse a student's typed number. Accepts "−3", "-3", "–3" (en dash), "+3",
 * "3.0", "1/2", " 4 m/s " (trailing unit ignored). Returns NaN if unreadable.
 */
function parseAnswer(text) {
  if (text === null || text === undefined) return NaN;
  let t = String(text).trim().replace(/[−–—]/g, '-').replace(/,/g, '');
  const m = t.match(/^([+-]?\s*\d*\.?\d+(?:e[+-]?\d+)?)(?:\s*\/\s*(\d*\.?\d+))?/i);
  if (!m) return NaN;
  const a = parseFloat(m[1].replace(/\s+/g, ''));
  if (m[2] !== undefined) return a / parseFloat(m[2]);
  return a;
}

/** Is `given` within relative tolerance `rel` (default 2%) of `target`? Small absolute floor for answers near 0. */
function withinTolerance(given, target, rel, absFloor) {
  if (!isFinite(given)) return false;
  const r = rel === undefined ? 0.02 : rel;
  const floor = absFloor === undefined ? 0.01 : absFloor;
  return Math.abs(given - target) <= Math.max(Math.abs(target) * r, floor);
}

/** Mulberry32: tiny, fast, seeded PRNG so a teacher can regenerate the same question set. */
function createRng(seed) {
  let a = (seed >>> 0) || 0x9e3779b9;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int(lo, hi) {
      return lo + Math.floor(next() * (hi - lo + 1));
    },
    pick(arr) {
      return arr[Math.floor(next() * arr.length)];
    },
    sign() {
      return next() < 0.5 ? -1 : 1;
    },
    shuffle(arr) {
      const copy = arr.slice();
      for (let i = copy.length - 1; i > 0; i--) {
        const k = Math.floor(next() * (i + 1));
        const tmp = copy[i];
        copy[i] = copy[k];
        copy[k] = tmp;
      }
      return copy;
    },
  };
}

function randomSeed() {
  return Math.floor(Math.random() * 1e9);
}

const formatApi = { MINUS, num, signed, signedUnit, unitStr, trimNumber, parseAnswer, withinTolerance, createRng, randomSeed };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = formatApi;
} else if (typeof window !== 'undefined') {
  window.Fmt = formatApi;
}
