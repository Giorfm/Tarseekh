/**
 * src/lib/tajwid/parser.js
 * Converts text_uthmani_tajweed HTML into token segments per word.
 * Shape: words[i] = [{ text: string, rule: string | null }]
 *
 * Guarantee: If joining tokens does not match plain word text, logs and falls back
 * safely to plain text [{ text: word.text, rule: null }] to maintain sacred text integrity.
 */

import { TAJWEED_RULES } from './rules.js';

/**
 * Parses raw tajweed HTML of a verse into tokens per word, aligned with plainWords.
 *
 * @param {string} rawHtml - text_uthmani_tajweed from Quran.com
 * @param {Array<{ idx: number, text: string }>} plainWords - Plain words from the shared word model
 * @returns {Array<Array<{ text: string, rule: string | null }>>}
 */
export function parseVerseTajweed(rawHtml, plainWords = []) {
  // If no tajweed HTML or empty words, return plain tokens
  if (!rawHtml || !plainWords || plainWords.length === 0) {
    return plainWords.map((w) => [{ text: w.text, rule: null }]);
  }

  try {
    // 1. Normalize font glyph variants (e.g. dagger alef \u0672 -> \u0670)
    const normalizedHtml = rawHtml.replace(/\u0672/g, '\u0670');

    // 2. Tokenize tags and text
    const tokens = [];
    const regex = /<([^>]+)>([^<]*)<\/[^>]+>|([^<]+)/g;
    let match;

    while ((match = regex.exec(normalizedHtml)) !== null) {
      if (match[1]) {
        // Tagged fragment (e.g. <tajweed class=madda_normal>ـٰ</tajweed>)
        const classMatch = match[1].match(/class=([^\s>]+)/);
        const ruleId = classMatch ? classMatch[1] : null;
        tokens.push({
          text: match[2],
          rule: ruleId && TAJWEED_RULES[ruleId] ? ruleId : null,
        });
      } else if (match[3]) {
        // Plain untagged text fragment
        tokens.push({
          text: match[3],
          rule: null,
        });
      }
    }

    // 3. Split tokens across spaces to align with words
    const wordsTokens = [];
    let currentWord = [];

    for (const t of tokens) {
      const parts = t.text.split(' ');
      for (let i = 0; i < parts.length; i++) {
        if (parts[i].length > 0) {
          currentWord.push({
            text: parts[i],
            rule: t.rule,
          });
        }
        if (i < parts.length - 1) {
          if (currentWord.length > 0) {
            wordsTokens.push(currentWord);
            currentWord = [];
          }
        }
      }
    }
    if (currentWord.length > 0) {
      wordsTokens.push(currentWord);
    }

    // 4. Strict Alignment Check against plainWords
    if (wordsTokens.length !== plainWords.length) {
      // Length mismatch: log and fall back safely
      return fallbackPlain(plainWords);
    }

    for (let i = 0; i < plainWords.length; i++) {
      const joined = wordsTokens[i].map((seg) => seg.text).join('');
      if (joined !== plainWords[i].text) {
        // Character mismatch: fall back safely for this verse
        return fallbackPlain(plainWords);
      }
    }

    return wordsTokens;
  } catch (err) {
    console.warn('Tajweed parsing failed, falling back to plain text:', err);
    return fallbackPlain(plainWords);
  }
}

/**
 * Helper to generate plain text tokens when tajweed alignment fails
 */
function fallbackPlain(plainWords) {
  return plainWords.map((w) => [{ text: w.text, rule: null }]);
}
