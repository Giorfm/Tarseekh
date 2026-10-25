/**
 * src/lib/tajwid/page-tajweed.js
 * Resolves tajweed tokens for an entire page by aligning page words with their source verses.
 */

import { getSurah } from '../quran/loader.js';
import { parseVerseTajweed } from './parser.js';

const pageTajweedCache = new Map();

/**
 * Returns a Map of "verseKey:wordIdx" -> Array<{ text, rule }>
 */
export async function getPageTajweedMap(pageData) {
  if (!pageData) return new Map();

  const pageNum = pageData.page;
  if (pageTajweedCache.has(pageNum)) {
    return pageTajweedCache.get(pageNum);
  }

  const tokenMap = new Map();

  try {
    // 1. Fetch surahs present on this page
    const surahIds = [...new Set(pageData.surahs.map((s) => s.id))];
    const surahDataList = await Promise.all(surahIds.map((id) => getSurah(id)));

    // 2. Index verses by key
    const verseMap = new Map();
    for (const sData of surahDataList) {
      for (const v of sData.verses) {
        verseMap.set(v.key, v);
      }
    }

    // 3. Parse tajweed tokens for each verse and map by word position
    for (const line of pageData.lines) {
      if (line.type !== 'text' || !Array.isArray(line.words)) continue;

      for (const w of line.words) {
        const key = `${w.verse_key}:${w.idx}`;
        if (tokenMap.has(key)) continue;

        const v = verseMap.get(w.verse_key);
        if (v && v.tajweed) {
          const parsedWords = parseVerseTajweed(v.tajweed, v.words);
          const wIdx = w.idx - 1; // 0-based index
          if (parsedWords && parsedWords[wIdx]) {
            tokenMap.set(key, parsedWords[wIdx]);
          } else {
            tokenMap.set(key, [{ text: w.text, rule: null }]);
          }
        } else {
          tokenMap.set(key, [{ text: w.text, rule: null }]);
        }
      }
    }
  } catch (err) {
    console.warn(`Failed to resolve page tajweed for page ${pageNum}:`, err);
  }

  pageTajweedCache.set(pageNum, tokenMap);
  return tokenMap;
}
