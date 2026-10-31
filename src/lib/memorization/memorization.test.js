import { describe, it, expect, beforeEach } from 'vitest';
import { calculateSM2, generateWordMasks, MemorizationAdapter } from './engine.js';

describe('MemorizationAdapter & SM-2 Queue Engine', () => {
  beforeEach(() => {
    let store = {};
    globalThis.localStorage = {
      getItem: (key) => store[key] || null,
      setItem: (key, val) => {
        store[key] = String(val);
      },
      removeItem: (key) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
    };
    MemorizationAdapter.clearAll();
  });

  it('calculates SM-2 interval expansion and resets on failure', () => {
    // Grade 5 (Hafal) initial -> interval 1
    const r1 = calculateSM2({ ease: 2.5, interval: 0, reps: 0 }, 5);
    expect(r1.interval).toBe(1);
    expect(r1.reps).toBe(1);

    // Grade 5 second recall -> interval 6
    const r2 = calculateSM2(r1, 5);
    expect(r2.interval).toBe(6);
    expect(r2.reps).toBe(2);

    // Grade 1 (Lupa) -> resets interval to 1 and reps to 0
    const r3 = calculateSM2(r2, 1);
    expect(r3.interval).toBe(1);
    expect(r3.reps).toBe(0);
  });

  it('adds and retrieves items in murajaah queue', () => {
    expect(MemorizationAdapter.getAll()).toHaveLength(0);

    // Add single ayah
    MemorizationAdapter.addItem({
      surah: 1,
      ayah: 1,
      surahName: 'Al-Fatihah',
    });

    const all = MemorizationAdapter.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe('1:1');
    expect(all[0].surah).toBe(1);
    expect(all[0].ayah).toBe(1);

    // Due today check
    const due = MemorizationAdapter.getDueToday();
    expect(due).toHaveLength(1);
  });

  it('adds ayah ranges correctly and ignores duplicates', () => {
    const added = MemorizationAdapter.addRange({
      surah: 1,
      fromAyah: 1,
      toAyah: 7,
      surahName: 'Al-Fatihah',
    });

    expect(added).toHaveLength(7);
    expect(MemorizationAdapter.getAll()).toHaveLength(7);

    // Adding again should not duplicate
    const addedAgain = MemorizationAdapter.addRange({
      surah: 1,
      fromAyah: 1,
      toAyah: 3,
      surahName: 'Al-Fatihah',
    });
    expect(addedAgain).toHaveLength(0);
    expect(MemorizationAdapter.getAll()).toHaveLength(7);
  });

  it('records review and advances SM-2 schedule', () => {
    MemorizationAdapter.addItem({ surah: 114, ayah: 1, surahName: 'An-Nas' });

    // Review with grade 5 (Mutqin)
    const updated = MemorizationAdapter.recordReview({
      surah: 114,
      ayah: 1,
      grade: 5,
    });

    expect(updated.interval).toBe(1);
    expect(updated.reps).toBe(1);
    expect(updated.lastGrade).toBe(5);

    // Stats reflect updated state
    const stats = MemorizationAdapter.getStats();
    expect(stats.total).toBe(1);
  });

  it('removes item by ID', () => {
    MemorizationAdapter.addItem({ surah: 112, ayah: 1, surahName: 'Al-Ikhlas' });
    expect(MemorizationAdapter.getAll()).toHaveLength(1);

    MemorizationAdapter.removeById('112:1');
    expect(MemorizationAdapter.getAll()).toHaveLength(0);
  });
});
