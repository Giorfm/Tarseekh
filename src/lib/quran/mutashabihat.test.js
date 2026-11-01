import { describe, it, expect } from 'vitest';
import { normalizeArabicForMatching, findMutashabihat } from './mutashabihat';

describe('Mutashabihat ul-Quran (QUL-inspired)', () => {
  it('normalizes Arabic text removing harakat and normalizing alef', () => {
    const raw = 'إِنَّ ٱلَّذِينَ كَفَرُوا۟ سَوَآءٌ';
    const norm = normalizeArabicForMatching(raw);
    expect(norm).toBe('ان الذين كفروا سواء');
  });

  it('finds identical matching phrases for verse 2:6 (matching Yasin 36:10)', async () => {
    const result = await findMutashabihat('2:6', { minPhraseLength: 3 });
    expect(result.sourceVerse).toBeDefined();
    expect(result.sourceVerse.key).toBe('2:6');
    expect(result.matches.length).toBeGreaterThan(0);

    // Verify Yasin 36:10 is among the top matches
    const yasinMatch = result.matches.find((m) => m.key === '36:10');
    expect(yasinMatch).toBeDefined();
    expect(yasinMatch.surahName).toBe('Ya-Sin');
    expect(yasinMatch.matchedWordsCount).toBeGreaterThanOrEqual(6);
  });
});

