/**
 * src/lib/speech/matcher.js
 * Forward-only Arabic speech-to-text alignment engine for Quran recitation.
 * Uses normalized Levenshtein similarity with a 3-word lookahead window.
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

  // Prepare normalized verse words if not precomputed
  const normalizedVerse = verseWords.map((w) =>
    w.normalized ? w.normalized : normalizeArabic(typeof w === 'string' ? w : w.text)
  );

  for (const spoken of spokenTokens) {
    if (currentPtr >= totalWords) break;

    const normSpoken = normalizeArabic(spoken);
    if (!normSpoken) continue;

    // Lookahead up to 3 words: [currentPtr, currentPtr + 1, currentPtr + 2, currentPtr + 3]
    const lookaheadLimit = Math.min(totalWords, currentPtr + 4);
    let bestMatchIdx = -1;
    let highestSim = 0;

    for (let candidateIdx = currentPtr; candidateIdx < lookaheadLimit; candidateIdx++) {
      const target = normalizedVerse[candidateIdx];
      const sim = similarityRatio(normSpoken, target);

      if (sim >= threshold && sim > highestSim) {
        highestSim = sim;
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
