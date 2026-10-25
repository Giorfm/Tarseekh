/**
 * src/lib/pages/layout.js
 * PageLayoutBuilder helpers: inspect, format, and layout mushaf lines.
 */

import { getPage } from './loader.js';
import { pageOfVerse, getIndex } from '../quran/loader.js';

export const PageLayoutBuilder = {
  /**
   * Get page data
   */
  async getPage(pageNum) {
    return getPage(pageNum);
  },

  /**
   * Resolve page number for a given verse key
   */
  async pageOfVerse(verseKey) {
    return pageOfVerse(verseKey);
  },

  /**
   * Return formatted lines of a page
   */
  lines(pageData) {
    if (!pageData || !Array.isArray(pageData.lines)) return [];
    return pageData.lines;
  },

  /**
   * Extract all words from a page in sequential order
   */
  allWords(pageData) {
    const lines = this.lines(pageData);
    const words = [];
    for (const line of lines) {
      if (line.type === 'text' && Array.isArray(line.words)) {
        for (const w of line.words) {
          words.push({ ...w, line: line.line, page: pageData.page });
        }
      }
    }
    return words;
  },
};
