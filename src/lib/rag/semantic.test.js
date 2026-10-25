import { describe, it, expect } from 'vitest';
import { cosineSimilarity } from './semantic.js';

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
