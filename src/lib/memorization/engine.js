/**
 * src/lib/memorization/engine.js
 * Core engine for Quran memorization masking, reveal tracking,
 * and SuperMemo-2 (SM-2) spaced repetition interval scheduling.
 */

/**
 * Deterministic pseudo-random generator based on a string seed.
 */
function seededRandom(seedStr) {
  let h = 0xdeadbeef;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 2654435761);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h >>> 0) / 4294967296);
  };
}

/**
 * Generates masking state for an array of verse words.
 *
 * @param {Array<{ idx: number, text: string, type?: string }>} words
 * @param {'all' | 'percent_30' | 'percent_50' | 'percent_70' | 'first_letter'} level
 * @param {string} [seed] - Optional seed for deterministic masking
 * @returns {Map<number, { isMasked: boolean, hint: string | null }>} Map of wordIndex -> mask config
 */
export function generateWordMasks(words, level = 'all', seed = 'default') {
  const maskMap = new Map();
  const rng = seededRandom(seed);

  // Filter actual content words (skip ayah end markers)
  const contentWords = words.filter((w) => w.type !== 'end');

  let threshold = 1.0;
  if (level === 'percent_30') threshold = 0.3;
  if (level === 'percent_50') threshold = 0.5;
  if (level === 'percent_70') threshold = 0.7;

  for (const w of words) {
    if (w.type === 'end') {
      maskMap.set(w.idx, { isMasked: false, hint: null });
      continue;
    }

    if (level === 'all') {
      maskMap.set(w.idx, { isMasked: true, hint: null });
    } else if (level === 'first_letter') {
      // First letter visible as hint
      const firstChar = w.text.trim().charAt(0);
      maskMap.set(w.idx, { isMasked: true, hint: firstChar });
    } else {
      // Percentage masking
      const shouldMask = rng() < threshold;
      maskMap.set(w.idx, { isMasked: shouldMask, hint: null });
    }
  }

  return maskMap;
}

/**
 * SuperMemo SM-2 algorithm calculation.
 *
 * @param {object} item
 * @param {number} item.ease - Ease factor (default 2.5)
 * @param {number} item.interval - Current interval in days (default 0)
 * @param {number} item.reps - Repetition count (default 0)
 * @param {1 | 3 | 5} grade - Self-assessment: 1 (Lupa), 3 (Ragu), 5 (Hafal)
 * @returns {{ ease: number, interval: number, reps: number, dueDate: string }}
 */
export function calculateSM2({ ease = 2.5, interval = 0, reps = 0 }, grade) {
  let newEase = ease;
  let newInterval = interval;
  let newReps = reps;

  // Grade must be 1, 3, or 5
  const q = Math.max(1, Math.min(5, grade));

  // Update ease factor: EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  newEase = newEase + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (newEase < 1.3) newEase = 1.3;

  if (q < 3) {
    // Failed recall: reset reps and set interval to 1 day
    newReps = 0;
    newInterval = 1;
  } else {
    // Successful recall
    if (newReps === 0) {
      newInterval = 1;
    } else if (newReps === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(newInterval * newEase);
    }
    newReps += 1;
  }

  const dueDate = new Date(Date.now() + newInterval * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  return {
    ease: Math.round(newEase * 100) / 100,
    interval: newInterval,
    reps: newReps,
    dueDate,
  };
}

/**
 * LocalStorage adapter for memorization items (Phase 5).
 * Ready to be swapped with Supabase client in Phase 6.
 */
const MEM_STORAGE_KEY = 'tarseekh_memorization_v1';
const LEGACY_MEM_STORAGE_KEY = 'tadabbur_memorization_v1';

export const MemorizationAdapter = {
  getAll() {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(MEM_STORAGE_KEY) || localStorage.getItem(LEGACY_MEM_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  getDueItems(todayStr = new Date().toISOString().split('T')[0]) {
    const items = this.getAll();
    return items.filter((item) => !item.dueDate || item.dueDate <= todayStr);
  },

  recordReview({ surah, ayah, grade }) {
    if (typeof window === 'undefined') return;
    const items = this.getAll();
    const existingIdx = items.findIndex((i) => i.surah === surah && i.ayah === ayah);

    const prev = existingIdx >= 0 ? items[existingIdx] : { ease: 2.5, interval: 0, reps: 0 };
    const sm2 = calculateSM2(prev, grade);

    const updatedItem = {
      id: `${surah}:${ayah}`,
      surah,
      ayah,
      ...sm2,
      lastGrade: grade,
      lastReviewedAt: Date.now(),
    };

    if (existingIdx >= 0) {
      items[existingIdx] = updatedItem;
    } else {
      items.push(updatedItem);
    }

    try {
      localStorage.setItem(MEM_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('Failed to save memorization item', e);
    }

    return updatedItem;
  },
};
