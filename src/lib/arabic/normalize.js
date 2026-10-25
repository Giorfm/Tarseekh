/**
 * src/lib/arabic/normalize.js
 * Normalizes Arabic text for robust phonetic and speech recognition matching.
 * Handles:
 *  - Stripping Tashkeel (harakat: fathah, kasrah, dammah, sukun, shaddah, tanwin, dagger alef)
 *  - Stripping Quranic annotation marks (waqaf, sajdah, rub' al-hizb)
 *  - Tatweel (kashida) removal
 *  - Unifying Alef forms (أ, إ, آ, ٱ, ٲ, ٳ -> ا)
 *  - Unifying Alef Maqsura (ى -> ي)
 *  - Unifying Ta Marbuta (ة -> ه)
 *  - Unifying Hamza carriers (ؤ -> و, ئ -> ي)
 *  - Stripping zero-width joiners and formatting characters
 */

// Tashkeel / Harakat range: U+064B - U+065F, U+0670 (dagger alef)
const TASHKEEL_REGEX = /[\u064B-\u065F\u0670]/g;

// Quranic annotation signs: U+06D6 - U+06ED, U+0610 - U+061A
const QURANIC_MARKS_REGEX = /[\u06D6-\u06ED\u0610-\u061A]/g;

// Tatweel / Kashida
const TATWEEL_REGEX = /\u0640/g;

// Zero-width characters & invisible separators
const ZERO_WIDTH_REGEX = /[\u200B-\u200F\u202A-\u202E\uFEFF]/g;

/**
 * Normalizes an Arabic string for speech and text matching.
 *
 * @param {string} text - Raw Arabic text
 * @returns {string} Clean, normalized Arabic string
 */
export function normalizeArabic(text) {
  if (!text || typeof text !== 'string') return '';

  return text
    // 1. Remove Tashkeel (harakat)
    .replace(TASHKEEL_REGEX, '')
    // 2. Remove Quranic annotations
    .replace(QURANIC_MARKS_REGEX, '')
    // 3. Remove Tatweel
    .replace(TATWEEL_REGEX, '')
    // 4. Remove zero-width formatting marks
    .replace(ZERO_WIDTH_REGEX, '')
    // 5. Unify all Alef variants to bare Alef (ا)
    .replace(/[أإآٱٲٳ]/g, 'ا')
    // 6. Unify Alef Maqsura to Ya (ي)
    .replace(/ى/g, 'ي')
    // 7. Unify Ta Marbuta to Ha (ه)
    .replace(/ة/g, 'ه')
    // 8. Unify Waw with Hamza to Waw (و)
    .replace(/ؤ/g, 'و')
    // 9. Unify Ya with Hamza to Ya (ي)
    .replace(/ئ/g, 'ي')
    // 10. Trim redundant spaces
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tokenizes Arabic text into an array of clean normalized words.
 *
 * @param {string} text
 * @returns {string[]}
 */
export function tokenizeArabic(text) {
  const normalized = normalizeArabic(text);
  if (!normalized) return [];
  return normalized
    .split(' ')
    .map((w) => w.trim())
    .filter((w) => w.length > 0 && !/^[0-9\u0660-\u0669]+$/.test(w)); // filter numbers
}
