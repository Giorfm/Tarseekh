import { describe, it, expect } from 'vitest';
import { similarityRatio, align, verifyRecitationWord, matchRecitationStep } from './matcher.js';
import { calculateSM2, generateWordMasks } from '../memorization/engine.js';

describe('Speech Matcher & SM-2 Memorization Suite', () => {
  it('computes accurate similarity ratio between normalized tokens', () => {
    expect(similarityRatio('الله', 'الله')).toBe(1.0);
    // 1 char edit out of 6 -> ~0.83 > 0.7
    expect(similarityRatio('الرحمن', 'الرحيم')).toBeGreaterThanOrEqual(0.65);
    expect(similarityRatio('بسم', 'الله')).toBeLessThan(0.4);
  });

  describe('verifyRecitationWord (Tarteel AI Matching)', () => {
    it('matches exact and tashkeel-stripped words', () => {
      expect(verifyRecitationWord('بسم', 'بِسْمِ').isMatch).toBe(true);
      expect(verifyRecitationWord('الله', 'ٱللَّهِ').isMatch).toBe(true);
    });

    it('handles dagger alef and script spelling differences (e.g. malik, ar-rahman)', () => {
      // Dagger alef in Uthmani Quran vs spoken standard
      expect(verifyRecitationWord('مالك', 'مَـٰلِكِ').isMatch).toBe(true);
      expect(verifyRecitationWord('ملك', 'مَـٰلِكِ').isMatch).toBe(true);
      expect(verifyRecitationWord('الرحمن', 'ٱلرَّحْمَـٰنِ').isMatch).toBe(true);
      expect(verifyRecitationWord('الرحمان', 'ٱلرَّحْمَـٰنِ').isMatch).toBe(true);
    });

    it('handles definite article prefix (ال) and conjunction (و) flexibilities', () => {
      expect(verifyRecitationWord('رحمن', 'ٱلرَّحْمَـٰنِ').isMatch).toBe(true);
      expect(verifyRecitationWord('التين', 'وَٱلتِّينِ').isMatch).toBe(true);
    });

    it('rejects incorrect words with low similarity', () => {
      expect(verifyRecitationWord('قل', 'ٱلْحَمْدُ').isMatch).toBe(false);
      expect(verifyRecitationWord('كتب', 'بِسْمِ').isMatch).toBe(false);
      expect(verifyRecitationWord('الناس', 'الفلق').isMatch).toBe(false);
    });
  });

  describe('matchRecitationStep (Sequential Real-Time Recitation Tracker)', () => {
    const targetWords = [
      { text: 'بِسْمِ', idx: 1 },
      { text: 'ٱللَّهِ', idx: 2 },
      { text: 'ٱلرَّحْمَـٰنِ', idx: 3 },
      { text: 'ٱلرَّحِيمِ', idx: 4 },
    ];

    it('advances continuously when words are recited correctly', () => {
      const step1 = matchRecitationStep({
        spokenTokens: ['بسم', 'الله'],
        words: targetWords,
        pointer: 0,
      });

      expect(step1.pointer).toBe(2);
      expect(step1.matchedIndices).toEqual([0, 1]);
      expect(step1.hasError).toBe(false);
      expect(step1.errorIndex).toBeNull();
      expect(step1.isFinished).toBe(false);

      // Next step continues from pointer 2
      const step2 = matchRecitationStep({
        spokenTokens: ['الرحمن', 'الرحيم'],
        words: targetWords,
        pointer: step1.pointer,
      });

      expect(step2.pointer).toBe(4);
      expect(step2.matchedIndices).toEqual([2, 3]);
      expect(step2.hasError).toBe(false);
      expect(step2.isFinished).toBe(true);
    });

    it('stops immediately on wrong recitation, flags error, and does NOT advance past error word', () => {
      // User says "بسم" correctly, then says "الناس" instead of "الله"
      const step = matchRecitationStep({
        spokenTokens: ['بسم', 'الناس'],
        words: targetWords,
        pointer: 0,
      });

      expect(step.pointer).toBe(1); // Stopped at index 1 ('الله')
      expect(step.matchedIndices).toEqual([0]);
      expect(step.hasError).toBe(true);
      expect(step.errorIndex).toBe(1); // Error is on index 1
      expect(step.isFinished).toBe(false);
    });

    it('resumes tracking when user repeats with the correct word', () => {
      // Initially stopped at pointer 1 with error
      const pointer = 1;

      // User corrects by reciting 'الله'
      const correctionStep = matchRecitationStep({
        spokenTokens: ['الله'],
        words: targetWords,
        pointer: pointer,
      });

      expect(correctionStep.pointer).toBe(2);
      expect(correctionStep.matchedIndices).toEqual([1]);
      expect(correctionStep.hasError).toBe(false);
      expect(correctionStep.errorIndex).toBeNull();
    });
  });

  it('aligns spoken tokens sequentially with lookahead and detects skipped words', () => {
    const verseWords = [
      { text: 'بسم' },
      { text: 'الله' },
      { text: 'الرحمن' },
      { text: 'الرحيم' },
    ];

    // Perfect recitation
    const result1 = align(['بسم', 'الله', 'الرحمن', 'الرحيم'], verseWords, 0);
    expect(result1.pointer).toBe(4);
    expect(result1.matchedIndices).toEqual([0, 1, 2, 3]);
    expect(result1.missedIndices).toEqual([]);
    expect(result1.isFinished).toBe(true);

    // Recitation with skipped word ('الرحمن' is skipped)
    const result2 = align(['بسم', 'الله', 'الرحيم'], verseWords, 0);
    expect(result2.pointer).toBe(4);
    expect(result2.matchedIndices).toEqual([0, 1, 3]);
    expect(result2.missedIndices).toEqual([2]); // Index 2 was missed
  });

  it('calculates SM-2 interval expansion and ease factors correctly', () => {
    // Initial recall with perfect score (grade 5: Hafal)
    const review1 = calculateSM2({ ease: 2.5, interval: 0, reps: 0 }, 5);
    expect(review1.interval).toBe(1);
    expect(review1.reps).toBe(1);
    expect(review1.ease).toBeGreaterThanOrEqual(2.5);

    // Second recall (grade 5) -> interval 6 days
    const review2 = calculateSM2(review1, 5);
    expect(review2.interval).toBe(6);
    expect(review2.reps).toBe(2);

    // Third recall (grade 5) -> interval ~ 6 * 2.6 = 16 days
    const review3 = calculateSM2(review2, 5);
    expect(review3.interval).toBeGreaterThanOrEqual(15);
    expect(review3.reps).toBe(3);

    // Failed recall (grade 1: Lupa) -> resets interval to 1 day and reps to 0
    const failedReview = calculateSM2(review3, 1);
    expect(failedReview.interval).toBe(1);
    expect(failedReview.reps).toBe(0);
    expect(failedReview.ease).toBeLessThan(review3.ease);
  });

  it('generates deterministic masks across different difficulty levels', () => {
    const sampleWords = [
      { idx: 1, text: 'الحمد' },
      { idx: 2, text: 'لله' },
      { idx: 3, text: 'رب' },
      { idx: 4, text: 'العالمين' },
      { idx: 5, text: '١', type: 'end' },
    ];

    // Level: All
    const allMasks = generateWordMasks(sampleWords, 'all', '1:2');
    expect(allMasks.get(1).isMasked).toBe(true);
    expect(allMasks.get(4).isMasked).toBe(true);
    expect(allMasks.get(5).isMasked).toBe(false); // End marker never masked

    // Level: First letter
    const firstLetterMasks = generateWordMasks(sampleWords, 'first_letter', '1:2');
    expect(firstLetterMasks.get(1).isMasked).toBe(true);
    expect(firstLetterMasks.get(1).hint).toBe('ا');
  });
});
