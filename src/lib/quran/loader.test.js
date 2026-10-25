import { describe, it, expect } from 'vitest';
import { getSurahList, getSurah, getIndex, pageOfVerse, firstPageOfSurah, firstPageOfJuz } from './loader.js';
import { getPage } from '../pages/loader.js';
import { PageLayoutBuilder } from '../pages/layout.js';

describe('Quran & Page Loaders', () => {
  it('loads all 114 surahs from metadata', async () => {
    const surahs = await getSurahList();
    expect(surahs).toHaveLength(114);
    expect(surahs[0].name_simple).toBe('Al-Fatihah');
    expect(surahs[113].name_simple).toBe('An-Nas');
  });

  it('loads individual surah data accurately', async () => {
    const fatihah = await getSurah(1);
    expect(fatihah.surah.id).toBe(1);
    expect(fatihah.surah.verses_count).toBe(7);
    expect(fatihah.verses).toHaveLength(7);
    expect(fatihah.verses[0].key).toBe('1:1');
    expect(fatihah.verses[0].words.length).toBeGreaterThan(0);
  });

  it('verifies index mapping for verse, surah, and juz', async () => {
    const index = await getIndex();
    expect(Object.keys(index.verse_to_page)).toHaveLength(6236);

    const fatihahPage = await firstPageOfSurah(1);
    expect(fatihahPage).toBe(1);

    const baqarahPage = await firstPageOfSurah(2);
    expect(baqarahPage).toBe(2);

    const verse255Page = await pageOfVerse('2:255'); // Ayat Kursi is on page 42
    expect(verse255Page).toBe(42);

    const juz1Page = await firstPageOfJuz(1);
    expect(juz1Page).toBe(1);

    const juz30Page = await firstPageOfJuz(30);
    expect(juz30Page).toBe(582);
  });

  it('loads mushaf pages and verifies line slots and word counts', async () => {
    const page1 = await getPage(1);
    expect(page1.page).toBe(1);
    expect(page1.juz).toBe(1);
    expect(page1.lines.length).toBeLessThanOrEqual(15);

    const page2 = await getPage(2);
    expect(page2.page).toBe(2);
    // Page 2 starts with Surah Header Al-Baqarah and Bismillah
    expect(page2.lines[0].type).toBe('surah_header');
    expect(page2.lines[1].type).toBe('bismillah');

    const words = PageLayoutBuilder.allWords(page1);
    expect(words.length).toBeGreaterThan(0);
    expect(words[0]).toHaveProperty('verse_key');
    expect(words[0]).toHaveProperty('idx');
  });
});
