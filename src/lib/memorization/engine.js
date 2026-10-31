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
  _getStorage() {
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) return globalThis.localStorage;
    return null;
  },

  getAll() {
    const storage = this._getStorage();
    if (!storage) return [];
    try {
      const raw = storage.getItem(MEM_STORAGE_KEY) || storage.getItem(LEGACY_MEM_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  getDueItems(todayStr = new Date().toISOString().split('T')[0]) {
    const items = this.getAll();
    return items.filter((item) => !item.dueDate || item.dueDate <= todayStr);
  },

  getDueToday(todayStr = new Date().toISOString().split('T')[0]) {
    return this.getDueItems(todayStr);
  },

  getItem(surah, ayah) {
    const items = this.getAll();
    const s = parseInt(surah, 10);
    const a = parseInt(ayah, 10);
    return items.find((i) => i.surah === s && i.ayah === a) || null;
  },

  addItem({ surah, ayah, surahName = '', dueDate = null }) {
    const storage = this._getStorage();
    if (!storage) return;
    const items = this.getAll();
    const s = parseInt(surah, 10);
    const a = parseInt(ayah, 10);
    const existingIdx = items.findIndex((i) => i.surah === s && i.ayah === a);

    const todayStr = new Date().toISOString().split('T')[0];
    const itemData = {
      id: `${s}:${a}`,
      surah: s,
      ayah: a,
      surahName: surahName || `Surah ${s}`,
      ease: 2.5,
      interval: 0,
      reps: 0,
      dueDate: dueDate || todayStr,
      addedAt: Date.now(),
    };

    if (existingIdx >= 0) {
      items[existingIdx] = {
        ...items[existingIdx],
        surahName: surahName || items[existingIdx].surahName,
      };
    } else {
      items.push(itemData);
    }

    try {
      storage.setItem(MEM_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('Failed to save memorization item', e);
    }

    return itemData;
  },

  addRange({ surah, fromAyah, toAyah, surahName = '' }) {
    const storage = this._getStorage();
    if (!storage) return [];
    const items = this.getAll();
    const s = parseInt(surah, 10);
    const start = parseInt(fromAyah, 10);
    const end = parseInt(toAyah, 10);
    const todayStr = new Date().toISOString().split('T')[0];
    const addedList = [];

    for (let a = start; a <= end; a++) {
      const existingIdx = items.findIndex((i) => i.surah === s && i.ayah === a);
      if (existingIdx >= 0) {
        if (surahName && !items[existingIdx].surahName) {
          items[existingIdx].surahName = surahName;
        }
      } else {
        const newItem = {
          id: `${s}:${a}`,
          surah: s,
          ayah: a,
          surahName: surahName || `Surah ${s}`,
          ease: 2.5,
          interval: 0,
          reps: 0,
          dueDate: todayStr,
          addedAt: Date.now(),
        };
        items.push(newItem);
        addedList.push(newItem);
      }
    }

    try {
      storage.setItem(MEM_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('Failed to save memorization range', e);
    }

    return addedList;
  },

  removeById(id) {
    const storage = this._getStorage();
    if (!storage) return;
    const items = this.getAll().filter((i) => i.id !== id);
    try {
      storage.setItem(MEM_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('Failed to remove memorization item', e);
    }
  },

  removeItem({ surah, ayah }) {
    const s = parseInt(surah, 10);
    const a = parseInt(ayah, 10);
    this.removeById(`${s}:${a}`);
  },

  recordReview({ surah, ayah, grade, surahName = '' }) {
    const storage = this._getStorage();
    if (!storage) return;
    const items = this.getAll();
    const s = parseInt(surah, 10);
    const a = parseInt(ayah, 10);
    const existingIdx = items.findIndex((i) => i.surah === s && i.ayah === a);

    const prev = existingIdx >= 0 ? items[existingIdx] : { ease: 2.5, interval: 0, reps: 0 };
    const sm2 = calculateSM2(prev, grade);

    const updatedItem = {
      ...(existingIdx >= 0 ? items[existingIdx] : {}),
      id: `${s}:${a}`,
      surah: s,
      ayah: a,
      surahName: surahName || items[existingIdx]?.surahName || `Surah ${s}`,
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
      storage.setItem(MEM_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('Failed to save memorization item', e);
    }

    return updatedItem;
  },

  getStats(todayStr = new Date().toISOString().split('T')[0]) {
    const items = this.getAll();
    const due = items.filter((item) => !item.dueDate || item.dueDate <= todayStr);
    const mutqin = items.filter((item) => (item.reps >= 3 || item.interval >= 7) && item.lastGrade === 5);
    const learning = items.filter((item) => !mutqin.includes(item));

    return {
      total: items.length,
      due: due.length,
      mutqin: mutqin.length,
      learning: learning.length,
      maxInterval: items.length > 0 ? Math.max(...items.map((i) => i.interval || 0), 0) : 0,
    };
  },

  clearAll() {
    const storage = this._getStorage();
    if (!storage) return;
    try {
      storage.removeItem(MEM_STORAGE_KEY);
      storage.removeItem(LEGACY_MEM_STORAGE_KEY);
    } catch (e) {
      console.warn('Failed to clear memorization items', e);
    }
  },
};
