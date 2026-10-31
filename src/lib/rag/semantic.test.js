import { describe, it, expect } from 'vitest';
import { cosineSimilarity, searchSemanticTafsir } from './semantic.js';

describe('Semantic Search Vector Utilities', () => {
  it('calculates identical vectors as similarity 1.0', () => {
    const v1 = [1, 2, 3];
    const v2 = [1, 2, 3];
    expect(cosineSimilarity(v1, v2)).toBeCloseTo(1.0, 5);
  });

  it('calculates orthogonal vectors as similarity 0.0', () => {
    const v1 = [1, 0, 0];
    const v2 = [0, 1, 0];
    expect(cosineSimilarity(v1, v2)).toBeCloseTo(0.0, 5);
  });

  it('calculates opposite vectors as similarity -1.0', () => {
    const v1 = [1, 0];
    const v2 = [-1, 0];
    expect(cosineSimilarity(v1, v2)).toBeCloseTo(-1.0, 5);
  });

  it('returns 0 for empty or mismatched vectors safely without NaN', () => {
    expect(cosineSimilarity([], [])).toBe(0);
    expect(cosineSimilarity([1, 2], [1])).toBe(0);
    expect(cosineSimilarity([0, 0], [0, 0])).toBe(0);
  });
});

describe('Thematic Meaning Search (Tafsir Maudhu\'i)', () => {
  it('returns empty array for invalid or empty query', async () => {
    const res = await searchSemanticTafsir('');
    expect(res).toEqual([]);
  });

  it('finds verses based on emotional concept (anxiety / overthinking) rather than literal translation match', async () => {
    const res = await searchSemanticTafsir('saya sedang cemas dan overthinking', 3);
    expect(res.length).toBeGreaterThan(0);
    expect(res.theme).toBeDefined();
    const verseKeys = res.map((r) => r.verse_key);
    // Should include Ar-Ra'd: 28 (13:28) which discusses peace of heart via zikir
    expect(verseKeys).toContain('13:28');
    expect(res[0].arabic).toBeDefined();
    expect(res[0].translation).toBeDefined();
    expect(res[0].relevance).toBeDefined();
  });

  it('finds verses based on scientific / embryology meaning', async () => {
    const res = await searchSemanticTafsir('sains tentang penciptaan embrio manusia', 3);
    expect(res.length).toBeGreaterThan(0);
    const verseKeys = res.map((r) => r.verse_key);
    // Should match Surah Al-Mu'minun embryology verses (23:12 or 23:14)
    expect(verseKeys.some((k) => k.startsWith('23:'))).toBe(true);
  });
});
