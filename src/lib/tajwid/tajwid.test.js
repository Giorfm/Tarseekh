import { describe, it, expect } from 'vitest';
import { parseVerseTajweed } from './parser.js';
import { TAJWEED_RULES, getTajweedRule } from './rules.js';
import { getSurah } from '../quran/loader.js';

describe('Tajweed Parser & Rules Suite', () => {
  it('contains metadata and valid colors for all required tajweed rule classes', () => {
    const requiredRules = [
      'ham_wasl',
      'laam_shamsiyah',
      'madda_normal',
      'madda_permissible',
      'madda_necessary',
      'madda_obligatory',
      'qalaqah',
      'ikhafa',
      'ikhafa_shafawi',
      'idgham_ghunnah',
      'idgham_wo_ghunnah',
      'idgham_mutajanisayn',
      'idgham_mutaqaribayn',
      'idgham_shafawi',
      'iqlab',
      'ghunnah',
    ];

    for (const ruleId of requiredRules) {
      const rule = getTajweedRule(ruleId);
      expect(rule).toBeDefined();
      expect(rule.labelId).toBeTruthy();
      expect(rule.explanationId).toBeTruthy();
      expect(rule.colorLight).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(rule.colorDark).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('correctly tokenizes Al-Fatihah verses into words where joined tokens equal plain words', async () => {
    const fatihah = await getSurah(1);

    for (const verse of fatihah.verses) {
      const parsedWords = parseVerseTajweed(verse.tajweed, verse.words);
      expect(parsedWords).toHaveLength(verse.words.length);

      for (let i = 0; i < verse.words.length; i++) {
        const plainExpected = verse.words[i].text;
        const joinedActual = parsedWords[i].map((token) => token.text).join('');
        expect(joinedActual).toBe(plainExpected);
      }
    }
  });

  it('keeps verified plain text for every word of the Quran and colours at least 95% of verses', async () => {
    let total = 0;
    let coloured = 0;
    for (let s = 1; s <= 114; s++) {
      const surah = await getSurah(s);
      for (const verse of surah.verses) {
        const parsedWords = parseVerseTajweed(verse.tajweed, verse.words);
        expect(parsedWords).toHaveLength(verse.words.length);
        for (let i = 0; i < verse.words.length; i++) {
          expect(parsedWords[i].map((token) => token.text).join(''), verse.key).toBe(verse.words[i].text);
        }
        total++;
        if (parsedWords.some((w) => w.some((token) => token.rule))) coloured++;
      }
    }
    expect(total).toBe(6236);
    expect(coloured / total).toBeGreaterThan(0.95);
  });

  it('maps tajweed rules across encoding differences (ZWNJ waqf signs, small low meem)', async () => {
    const baqarah = await getSurah(2);
    const verse = baqarah.verses[1]; // 2:2 ذَٰلِكَ ٱلْكِتَـٰبُ لَا رَيْبَ ۛ فِيهِ ۛ هُدًۭى
    const parsedWords = parseVerseTajweed(verse.tajweed, verse.words);
    expect(parsedWords[1].some((t) => t.rule === 'ham_wasl')).toBe(true);
    expect(parsedWords[5].some((t) => t.rule === 'idgham_wo_ghunnah')).toBe(true);
  });

  it('safely falls back to plain text when tajweed markup does not align', () => {
    const fakePlainWords = [
      { idx: 1, text: 'بِسْمِ' },
      { idx: 2, text: 'ٱللَّهِ' },
    ];
    // Malformed HTML that cannot match
    const brokenTajweedHtml = '<tajweed class=unknown>بِسْمِ</tajweed>';

    const result = parseVerseTajweed(brokenTajweedHtml, fakePlainWords);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual([{ text: 'بِسْمِ', rule: null }]);
    expect(result[1]).toEqual([{ text: 'ٱللَّهِ', rule: null }]);
  });
});
