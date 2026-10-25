import { describe, it, expect } from 'vitest';
import { normalizeArabic, tokenizeArabic } from './normalize.js';

describe('Arabic Normalization Suite', () => {
  it('strips all tashkeel (harakat) and dagger alefs', () => {
    const raw = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ';
    const normalized = normalizeArabic(raw);
    expect(normalized).toBe('بسم الله الرحمن الرحيم');
  });

  it('unifies alef variants, alef maqsura, and ta marbuta', () => {
    // Alef variants
    expect(normalizeArabic('أحمد إبراهيم آدم')).toBe('احمد ابراهيم ادم');
    // Alef maqsura to ya
    expect(normalizeArabic('هدى')).toBe('هدي');
    // Ta marbuta to ha
    expect(normalizeArabic('رحمة')).toBe(' رحمه'.trim());
  });

  it('tokenizes Arabic sentences into clean word tokens', () => {
    const raw = 'قُلْ هُوَ ٱللَّهُ أَحَدٌ ١';
    const tokens = tokenizeArabic(raw);
    expect(tokens).toEqual(['قل', 'هو', 'الله', 'احد']);
  });
});
