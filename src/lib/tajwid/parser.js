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

    // 3. Project rules onto the verified plain words.
    //    The tajweed markup and the plain text encode the same letters differently
    //    (precomposed vs. combining hamza, U+0652 vs. U+06E1 sukun, ZWNJ before waqf signs,
    //    small low meem, ...). Alignment therefore runs on base letters only (after Unicode
    //    decomposition); harakat and marks take the rule of the same mark in the markup when
    //    present, otherwise the rule of their letter. Every base letter must match exactly,
    //    otherwise the verse falls back to plain text. Output text is always the plain word text.
    const clusters = []; // [{ base, rule, marks: Map<mark, rule> }]
    for (const t of tokens) {
      if (t.rule === 'end') continue;
      for (const ch of t.text.normalize('NFD')) {
        if (isBaseLetter(ch)) {
          clusters.push({ base: ch, rule: t.rule, marks: new Map() });
        } else if (clusters.length && !isSeparator(ch)) {
          const c = clusters[clusters.length - 1];
          if (!c.marks.has(ch) || t.rule) c.marks.set(ch, t.rule);
        }
      }
    }

    const wordsTokens = [];
    let ci = -1;
    for (const word of plainWords) {
      const segs = [];
      for (const ch of word.text) {
        let rule = null;
        if (word.type === 'end') {
          rule = null; // ayah number is not part of the tajweed markup
        } else {
          const first = ch.normalize('NFD')[0];
          if (isBaseLetter(first)) {
            ci++;
            // Alef maqsura written in the markup but carried by a dagger alef in the plain text
            if (clusters[ci]?.base === ALEF_MAQSURA && first !== ALEF_MAQSURA && sameLetter(clusters[ci + 1]?.base, first)) {
              ci++;
            }
            if (ci >= clusters.length || !sameLetter(clusters[ci].base, first)) {
              if (OPTIONAL_LETTERS.has(first) && ci > 0) {
                ci--;
                rule = clusters[ci].rule;
              } else {
                return fallbackPlain(plainWords);
              }
            } else {
              rule = clusters[ci].rule;
            }
          } else if (isSeparator(ch)) {
            rule = segs.length ? segs[segs.length - 1].rule : null;
          } else if (ci >= 0) {
            const c = clusters[ci];
            rule = c.marks.has(ch) ? c.marks.get(ch) : c.rule;
          }
        }
        const last = segs[segs.length - 1];
        if (last && last.rule === rule) last.text += ch;
        else segs.push({ text: ch, rule });
      }
      wordsTokens.push(segs.length ? segs : [{ text: word.text, rule: null }]);
    }

    // 4. Every letter of the markup must have been matched
    if (ci !== clusters.length - 1) {
      return fallbackPlain(plainWords);
    }

    return wordsTokens;
  } catch (err) {
    console.warn('Tajweed parsing failed, falling back to plain text:', err);
    return fallbackPlain(plainWords);
  }
}

const ALEF_MAQSURA = '\u0649';
// Letters one source writes in full where the other only carries a dagger alef / mark
const OPTIONAL_LETTERS = new Set([ALEF_MAQSURA, '\u0627']);

/**
 * Arabic base letters (everything else is a haraka, Quranic mark, digit or separator).
 */
function isBaseLetter(ch) {
  return /[\u0621-\u063A\u0641-\u064A\u0671-\u06D3\u06EE\u06EF\u06FA-\u06FF]/.test(ch);
}

/**
 * Letters written with interchangeable code points in the two sources
 * (ya / alef maqsura / Farsi ya, alef / alef wasla).
 */
const LETTER_EQUIVALENTS = { '\u0649': '\u064A', '\u06CC': '\u064A', '\u0671': '\u0627' };
function sameLetter(a, b) {
  if (!a || !b) return false;
  return (LETTER_EQUIVALENTS[a] || a) === (LETTER_EQUIVALENTS[b] || b);
}

/**
 * Spaces and joiners that carry no letter: space, ZWNJ/ZWJ, tatweel.
 */
function isSeparator(ch) {
  return ch === ' ' || ch === '\u200C' || ch === '\u200D' || ch === '\u0640';
}

/**
 * Helper to generate plain text tokens when tajweed alignment fails
 */
function fallbackPlain(plainWords) {
  return plainWords.map((w) => [{ text: w.text, rule: null }]);
}
