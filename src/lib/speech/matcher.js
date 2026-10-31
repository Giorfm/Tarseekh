/**
 * src/lib/speech/matcher.js
 * Forward-only Arabic speech-to-text alignment and real-time recitation verification engine.
 * Inspired by Tarteel AI & Real-Time Quran Recitation Trackers:
 * - Detects correct vs wrong recitation word-by-word.
 * - When correct: reveals and advances continuously.
 * - When wrong: stops immediately, highlights the error, and waits for the correct recitation.
 */

import { normalizeArabic } from '../arabic/normalize.js';

/**
 * Computes Levenshtein edit distance between two strings.
 */
export function levenshteinDistance(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const row = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 1; i <= a.length; i++) {
    let prev = i;
    for (let j = 1; j <= b.length; j++) {
      let val;
      if (a[i - 1] === b[j - 1]) {
        val = row[j - 1];
      } else {
        val = Math.min(row[j - 1] + 1, prev + 1, row[j] + 1);
      }
      row[j - 1] = prev;
      prev = val;
    }
    row[b.length] = prev;
  }

  return row[b.length];
}

/**
 * Computes similarity ratio between 0 and 1.
 */
export function similarityRatio(a, b) {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  const dist = levenshteinDistance(a, b);
  return 1 - dist / maxLen;
}

/**
 * Verifies if a spoken word matches the target Quranic word.
 * Robust against:
 * - Tashkeel (harakat)
 * - Dagger alef spelling variations (e.g. مَـٰلِكِ vs مالك, ٱلرَّحْمَـٰنِ vs الرحمن / الرحمان)
 * - Definite article (ال) prefix differences
 * - Waw conjunction (و) prefix differences
 * - Alef and Hamza variants
 *
 * @param {string} spoken - Spoken token from speech recognition
 * @param {string} target - Expected Quran word
 * @param {number} [threshold=0.68] - Minimum similarity threshold
 * @returns {{ isMatch: boolean, similarity: number }}
 */
export function verifyRecitationWord(spoken, target, threshold = 0.68) {
  if (!spoken || !target) return { isMatch: false, similarity: 0 };

  const normSpoken = normalizeArabic(spoken);
  const normTarget = normalizeArabic(target);

  if (!normSpoken || !normTarget) return { isMatch: false, similarity: 0 };

  if (normSpoken === normTarget) {
    return { isMatch: true, similarity: 1.0 };
  }

  // 1. Direct Levenshtein similarity
  let maxSim = similarityRatio(normSpoken, normTarget);
  if (maxSim >= threshold) {
    return { isMatch: true, similarity: maxSim };
  }

  // 2. Dagger alef & medial alef variations (e.g. مالك vs ملك)
  const noASpoken = normSpoken.replace(/ا/g, '');
  const noATarget = normTarget.replace(/ا/g, '');
  if (noASpoken && noATarget) {
    const simNoA = similarityRatio(noASpoken, noATarget);
    if (simNoA > maxSim) maxSim = simNoA;
    if (maxSim >= threshold) {
      return { isMatch: true, similarity: maxSim };
    }
  }

  // 3. Definite article 'al-' (ال) prefix differences
  const stripAl = (s) => (s.startsWith('ال') ? s.slice(2) : s);
  const sNoAl = stripAl(normSpoken);
  const tNoAl = stripAl(normTarget);
  if (sNoAl && tNoAl && (normSpoken !== sNoAl || normTarget !== tNoAl)) {
    const simAl = similarityRatio(sNoAl, tNoAl);
    if (simAl > maxSim) maxSim = simAl;
    if (maxSim >= threshold) {
      return { isMatch: true, similarity: maxSim };
    }
  }

  // 4. Conjunction 'wa-' (و) prefix differences
  const stripWa = (s) => (s.startsWith('و') ? s.slice(1) : s);
  const sNoWa = stripWa(normSpoken);
  const tNoWa = stripWa(normTarget);
  if (sNoWa && tNoWa && (normSpoken !== sNoWa || normTarget !== tNoWa)) {
    const simWa = similarityRatio(sNoWa, tNoWa);
    if (simWa > maxSim) maxSim = simWa;
    if (maxSim >= threshold) {
      return { isMatch: true, similarity: maxSim };
    }
  }

  return { isMatch: maxSim >= threshold, similarity: maxSim };
}

/**
 * Real-time recitation verification step (Tarteel-AI model).
 * Evaluates spoken tokens against target words sequentially:
 * - If correct: advances word-by-word.
 * - If wrong: stops immediately, marks error on the target word, and waits for correct pronunciation.
 *
 * @param {object} params
 * @param {string[]} params.spokenTokens - Array of new spoken tokens from speech recognition
 * @param {Array<{ text: string, verseKey?: string, verse_key?: string, idx?: number }>} params.words - Expected words list
 * @param {number} params.pointer - Current expected word index
 * @param {number} [params.threshold=0.68] - Matching threshold
 * @returns {{
 *   pointer: number,
 *   matchedIndices: number[],
 *   errorIndex: number | null,
 *   hasError: boolean,
 *   isFinished: boolean
 * }}
 */
export function matchRecitationStep({ spokenTokens, words, pointer = 0, threshold = 0.68 }) {
  const matchedIndices = [];
  let currentPtr = pointer;
  let errorIndex = null;
  const totalWords = words.length;

  for (const spoken of spokenTokens) {
    if (currentPtr >= totalWords) break;

    const targetWord = words[currentPtr];
    const targetText = typeof targetWord === 'string' ? targetWord : targetWord.text;
    const { isMatch } = verifyRecitationWord(spoken, targetText, threshold);

    if (isMatch) {
      matchedIndices.push(currentPtr);
      currentPtr += 1;
      errorIndex = null;
    } else {
      // Recitation is incorrect!
      // STOP advancing and flag current word as error (Tarteel-style)
      errorIndex = currentPtr;
      break;
    }
  }

  return {
    pointer: currentPtr,
    matchedIndices,
    errorIndex,
    hasError: errorIndex !== null,
    isFinished: currentPtr >= totalWords,
  };
}

/**
 * Forward-only alignment between spoken tokens and target verse tokens.
 *
 * @param {string[]} spokenTokens - Array of normalized spoken words
 * @param {Array<{ text: string, normalized?: string }>} verseWords - Target words
 * @param {number} pointer - Current target word pointer (0-based)
 * @param {number} [threshold=0.7] - Minimum similarity threshold
 * @returns {{
 *   pointer: number,
 *   matchedIndices: number[],
 *   missedIndices: number[],
 *   isFinished: boolean
 * }}
 */
export function align(spokenTokens, verseWords, pointer = 0, threshold = 0.7) {
  const matchedIndices = [];
  const missedIndices = [];

  let currentPtr = pointer;
  const totalWords = verseWords.length;

  for (const spoken of spokenTokens) {
    if (currentPtr >= totalWords) break;

    const normSpoken = normalizeArabic(spoken);
    if (!normSpoken) continue;

    // Lookahead up to 3 words: [currentPtr, currentPtr + 1, currentPtr + 2, currentPtr + 3]
    const lookaheadLimit = Math.min(totalWords, currentPtr + 4);
    let bestMatchIdx = -1;
    let highestSim = 0;

    for (let candidateIdx = currentPtr; candidateIdx < lookaheadLimit; candidateIdx++) {
      const target = verseWords[candidateIdx];
      const targetText = typeof target === 'string' ? target : target.text;
      const { isMatch, similarity } = verifyRecitationWord(normSpoken, targetText, threshold);

      if (isMatch && similarity > highestSim) {
        highestSim = similarity;
        bestMatchIdx = candidateIdx;
      }
    }

    if (bestMatchIdx !== -1) {
      // Mark any words between currentPtr and bestMatchIdx as skipped/missed
      for (let skipped = currentPtr; skipped < bestMatchIdx; skipped++) {
        missedIndices.push(skipped);
      }

      // Mark best match as matched
      matchedIndices.push(bestMatchIdx);
      currentPtr = bestMatchIdx + 1; // Advance pointer forward
    }
  }

  return {
    pointer: currentPtr,
    matchedIndices,
    missedIndices,
    isFinished: currentPtr >= totalWords,
  };
}
