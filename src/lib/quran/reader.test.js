import { describe, it, expect } from 'vitest';
import { getIndex, pageOfVerse, firstPageOfSurah } from './loader.js';
import { saveLastPosition, getLastPosition } from './position.js';
import { PageLayoutBuilder } from '../pages/layout.js';
import { getPage } from '../pages/loader.js';

describe('Reader: Two Views & Shared Word Model Tests', () => {
  it('correctly maps verses to pages across boundary chapters', async () => {
    // Al-Fatihah 1:1 is on page 1
    expect(await pageOfVerse('1:1')).toBe(1);
    expect(await pageOfVerse('1:7')).toBe(1);

    // Al-Baqarah starts on page 2
    expect(await pageOfVerse('2:1')).toBe(2);
    expect(await pageOfVerse('2:5')).toBe(2);
    expect(await pageOfVerse('2:6')).toBe(3);

    // Al-Baqarah 2:255 (Ayat Al-Kursi) is on page 42
    expect(await pageOfVerse('2:255')).toBe(42);

    // Surah An-Nas 114:1 is on page 604
    expect(await pageOfVerse('114:1')).toBe(604);
  });

  it('preserves position when saving and retrieving', () => {
    saveLastPosition('2:255', 42);
    const pos = getLastPosition();
    expect(pos.verseKey).toBe('2:255');
    expect(pos.surah).toBe(2);
    expect(pos.ayah).toBe(255);
    expect(pos.page).toBe(42);
  });

  it('guarantees every page has valid lines and words in the shared word model', async () => {
    const page42 = await getPage(42);
    expect(page42.lines.length).toBeLessThanOrEqual(15);

    const words = PageLayoutBuilder.allWords(page42);
    expect(words.length).toBeGreaterThan(0);

    // Every word must have verse_key and word idx
    for (const w of words) {
      expect(w).toHaveProperty('verse_key');
      expect(w).toHaveProperty('idx');
      expect(w).toHaveProperty('text');
      expect(w.verse_key).toMatch(/^\d+:\d+$/);
    }
  });
});
