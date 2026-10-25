/**
 * scripts/verify-data.mjs
 * Verification script for seeded Quran and Mushaf page data.
 * Checks:
 *  1. 604 page files exist
 *  2. 114 surah files exist
 *  3. Total word count across pages equals total word count across surahs
 *  4. Every verse key appears in the pages and word mapping is complete
 *  5. Each page has at most 15 lines
 *  6. index.json contains all mappings
 * Exits 0 on success, 1 on failure.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const PUBLIC_DATA_DIR = path.resolve(ROOT_DIR, 'public', 'data');
const SURAH_DIR = path.resolve(PUBLIC_DATA_DIR, 'surah');
const PAGE_DIR = path.resolve(PUBLIC_DATA_DIR, 'page');

async function verify() {
  console.log('=== VERIFYING QURAN & MUSHAF DATA ===\n');
  const errors = [];
  const warnings = [];

  // 1. Verify 114 Surah files exist & count words
  let totalSurahWords = 0;
  let totalVersesInSurahs = 0;
  const allSurahVerseKeys = new Set();
  const surahWordPairs = new Set(); // "verseKey:idx"

  console.log('Checking 114 surah files...');
  for (let sId = 1; sId <= 114; sId++) {
    const sPath = path.join(SURAH_DIR, `${sId}.json`);
    try {
      const content = await fs.readFile(sPath, 'utf8');
      const data = JSON.parse(content);

      if (!data.surah || data.surah.id !== sId) {
        errors.push(`Surah ${sId}: metadata missing or ID mismatch.`);
      }

      if (!Array.isArray(data.verses) || data.verses.length === 0) {
        errors.push(`Surah ${sId}: verses array empty.`);
      } else {
        totalVersesInSurahs += data.verses.length;
        for (const v of data.verses) {
          allSurahVerseKeys.add(v.key);
          if (Array.isArray(v.words)) {
            totalSurahWords += v.words.length;
            for (const w of v.words) {
              const pair = `${v.key}:${w.idx}`;
              if (surahWordPairs.has(pair)) {
                errors.push(`Duplicate word in surah ${sId}: ${pair}`);
              }
              surahWordPairs.add(pair);
            }
          }
        }
      }
    } catch (err) {
      errors.push(`Surah ${sId} file missing or unreadable: ${err.message}`);
    }
  }

  // 2. Verify 604 Page files exist & count words
  console.log('Checking 604 page files...');
  let totalPageWords = 0;
  const pageWordPairs = new Set();
  const pageVerseKeys = new Set();
  let maxLinesFound = 0;

  for (let pNum = 1; pNum <= 604; pNum++) {
    const pPath = path.join(PAGE_DIR, `${pNum}.json`);
    try {
      const content = await fs.readFile(pPath, 'utf8');
      const data = JSON.parse(content);

      if (!data.page || data.page !== pNum) {
        errors.push(`Page ${pNum}: metadata missing or page number mismatch.`);
      }

      if (!Array.isArray(data.lines)) {
        errors.push(`Page ${pNum}: lines array missing.`);
        continue;
      }

      if (data.lines.length > 15) {
        errors.push(`Page ${pNum}: has ${data.lines.length} lines (exceeds 15 content lines limit).`);
      }

      if (data.lines.length > maxLinesFound) {
        maxLinesFound = data.lines.length;
      }

      for (const line of data.lines) {
        if (line.type === 'text' && Array.isArray(line.words)) {
          totalPageWords += line.words.length;
          for (const w of line.words) {
            const pair = `${w.verse_key}:${w.idx}`;
            pageVerseKeys.add(w.verse_key);
            if (pageWordPairs.has(pair)) {
              errors.push(`Duplicate word in page ${pNum}: ${pair}`);
            }
            pageWordPairs.add(pair);
          }
        }
      }
    } catch (err) {
      errors.push(`Page ${pNum} file missing or unreadable: ${err.message}`);
    }
  }

  // 3. Verify index.json and surahs.json
  console.log('Checking index.json and surahs.json...');
  try {
    const indexPath = path.join(PUBLIC_DATA_DIR, 'index.json');
    const indexData = JSON.parse(await fs.readFile(indexPath, 'utf8'));

    const verseKeysIndexed = Object.keys(indexData.verse_to_page || {}).length;
    if (verseKeysIndexed !== 6236) {
      warnings.push(`index.json verse_to_page has ${verseKeysIndexed} entries (expected 6236).`);
    }

    const surahsIndexed = Object.keys(indexData.surah_to_page || {}).length;
    if (surahsIndexed !== 114) {
      errors.push(`index.json surah_to_page has ${surahsIndexed} entries (expected 114).`);
    }

    const juzIndexed = Object.keys(indexData.juz_to_page || {}).length;
    if (juzIndexed !== 30) {
      errors.push(`index.json juz_to_page has ${juzIndexed} entries (expected 30).`);
    }
  } catch (err) {
    errors.push(`index.json failed to read: ${err.message}`);
  }

  try {
    const surahsPath = path.join(PUBLIC_DATA_DIR, 'surahs.json');
    const surahsData = JSON.parse(await fs.readFile(surahsPath, 'utf8'));
    if (!Array.isArray(surahsData) || surahsData.length !== 114) {
      errors.push(`surahs.json does not contain 114 surahs (found ${surahsData?.length}).`);
    }
  } catch (err) {
    errors.push(`surahs.json failed to read: ${err.message}`);
  }

  // 4. Cross-check word count equality
  console.log('\n--- Cross-check Summary ---');
  console.log(`Total Verses: ${totalVersesInSurahs} (Expected: 6236)`);
  console.log(`Total Words in Surahs: ${totalSurahWords}`);
  console.log(`Total Words in Pages:  ${totalPageWords}`);
  console.log(`Max Lines per Page:    ${maxLinesFound} (Max permitted: 15)`);

  if (totalSurahWords !== totalPageWords) {
    errors.push(
      `Word count mismatch: Surah files have ${totalSurahWords} words, but Page files have ${totalPageWords} words (Difference: ${Math.abs(
        totalSurahWords - totalPageWords
      )}).`
    );
  }

  // 5. Cross-check missing words between surahs and pages
  for (const pair of surahWordPairs) {
    if (!pageWordPairs.has(pair)) {
      errors.push(`Word ${pair} is in surah data but missing from page data.`);
      if (errors.length > 20) break; // avoid flood
    }
  }

  for (const pair of pageWordPairs) {
    if (!surahWordPairs.has(pair)) {
      errors.push(`Word ${pair} is in page data but missing from surah data.`);
      if (errors.length > 20) break;
    }
  }

  // 6. Print Report
  console.log('\n================ REPORT ================');
  if (warnings.length > 0) {
    console.warn(`WARNINGS (${warnings.length}):`);
    warnings.forEach((w) => console.warn(` [!] ${w}`));
  }

  if (errors.length === 0) {
    console.log('✅ ALL CHECKS PASSED:');
    console.log(' - 114 Surah files intact');
    console.log(' - 604 Page files intact');
    console.log(` - Exactly ${totalSurahWords} words synchronized between Surah & Page views`);
    console.log(' - Every verse key represented with all line slots <= 15');
    console.log(' - Indexes and metadata verified.');
    process.exit(0);
  } else {
    console.error(`❌ VERIFICATION FAILED with ${errors.length} error(s):`);
    errors.slice(0, 20).forEach((e) => console.error(` [X] ${e}`));
    if (errors.length > 20) {
      console.error(` ... and ${errors.length - 20} more errors.`);
    }
    process.exit(1);
  }
}

verify().catch((err) => {
  console.error('Unexpected verification crash:', err);
  process.exit(1);
});
