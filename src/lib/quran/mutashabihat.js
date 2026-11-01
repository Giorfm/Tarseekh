/**
 * src/lib/quran/mutashabihat.js
 * Mutashabihat ul-Quran (Similar Verses) Finder
 * Inspired by QUL (Quranic Universal Library by Tarteel AI) MatchingAyahService.
 * Finds verses sharing consecutive n-gram phrases (>= 3 words) across the Quran.
 */

import { getSurah, getSurahList } from './loader';

/**
 * Strips harakat, tanwin, tatweel, and normalization marks for matching.
 * @param {string} text
 * @returns {string}
 */
export function normalizeArabicForMatching(text) {
  if (!text) return '';
  return text
    // Remove diacritics & Quranic pause/sajdah marks
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    // Normalize Alefs
    .replace(/[إأآٱ]/g, 'ا')
    // Normalize Yeh/Alef Maqsura
    .replace(/ى/g, 'ي')
    // Remove tatweel (kashida)
    .replace(/ـ/g, '')
    .trim();
}

/**
 * Extracts n-grams (phrases of length n) from a list of tokens.
 * @param {string[]} tokens
 * @param {number} n
 * @returns {string[]}
 */
function extractNgrams(tokens, n) {
  const ngrams = [];
  for (let i = 0; i <= tokens.length - n; i++) {
    ngrams.push(tokens.slice(i, i + n).join(' '));
  }
  return ngrams;
}

/**
 * Finds similar verses (Mutashabihat) for a given verseKey (e.g. '2:6' or '1:5').
 * @param {string} verseKey
 * @param {object} [options]
 * @param {number} [options.minPhraseLength=3] - Minimum words in common
 * @param {number} [options.limit=15] - Maximum matches to return
 * @returns {Promise<{sourceVerse: object, matches: object[]}>}
 */
export async function findMutashabihat(verseKey, options = {}) {
  const minLength = options.minPhraseLength || 3;
  const limit = options.limit || 15;

  const [surahStr, ayahStr] = verseKey.split(':');
  const surahId = parseInt(surahStr, 10);
  const ayahNum = parseInt(ayahStr, 10);

  if (isNaN(surahId) || isNaN(ayahNum)) {
    return { sourceVerse: null, matches: [] };
  }

  const surahData = await getSurah(surahId);
  const targetVerse = surahData?.verses?.find((v) => v.n === ayahNum || v.key === verseKey);

  if (!targetVerse) {
    return { sourceVerse: null, matches: [] };
  }

  const surahList = await getSurahList();
  const surahNameMap = new Map(surahList.map((s) => [s.id, s.name_simple]));

  const targetWords = targetVerse.text.split(/\s+/).filter(Boolean);
  const normTargetWords = targetWords.map(normalizeArabicForMatching);

  // Generate target phrases from longest down to minLength
  const phrasesToSearch = [];
  for (let len = Math.min(targetWords.length, 8); len >= minLength; len--) {
    const ngrams = extractNgrams(normTargetWords, len);
    for (const ng of ngrams) {
      if (!phrasesToSearch.includes(ng)) {
        phrasesToSearch.push(ng);
      }
    }
  }

  if (phrasesToSearch.length === 0) {
    return {
      sourceVerse: {
        key: verseKey,
        text: targetVerse.text,
        surahName: surahData.surah.name_simple,
        ayahNumber: ayahNum,
      },
      matches: [],
    };
  }

  const matchesMap = new Map(); // key -> match details

  // Search across surahs
  for (const sMeta of surahList) {
    let sContent = null;
    try {
      sContent = await getSurah(sMeta.id);
    } catch {
      continue;
    }

    if (!sContent || !sContent.verses) continue;

    for (const v of sContent.verses) {
      if (v.key === verseKey) continue; // Skip self

      const vWords = v.text.split(/\s+/).filter(Boolean);
      const normVWords = vWords.map(normalizeArabicForMatching);
      const vJoined = normVWords.join(' ');

      for (const phrase of phrasesToSearch) {
        if (vJoined.includes(phrase)) {
          const phraseWordCount = phrase.split(' ').length;
          const existing = matchesMap.get(v.key);

          if (!existing || phraseWordCount > existing.matchedWordsCount) {
            matchesMap.set(v.key, {
              key: v.key,
              surahId: sMeta.id,
              surahName: sMeta.name_simple,
              ayahNumber: v.n,
              text: v.text,
              translation: v.translation || '',
              matchedPhrase: phrase,
              matchedWordsCount: phraseWordCount,
              similarityPercent: Math.min(
                100,
                Math.round((phraseWordCount / Math.max(normTargetWords.length, normVWords.length)) * 100)
              ),
            });
          }
        }
      }
    }
  }

  const sortedMatches = Array.from(matchesMap.values())
    .sort((a, b) => b.matchedWordsCount - a.matchedWordsCount || b.similarityPercent - a.similarityPercent)
    .slice(0, limit);

  return {
    sourceVerse: {
      key: verseKey,
      text: targetVerse.text,
      translation: targetVerse.translation || '',
      surahName: surahData.surah.name_simple,
      ayahNumber: ayahNum,
    },
    matches: sortedMatches,
  };
}
