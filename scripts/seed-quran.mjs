/**
 * scripts/seed-quran.mjs
 * Fetches all 114 Surahs and 604 Mushaf pages from Quran.com API v4 (or fallback).
 * Generates:
 *  - public/data/surah/{1..114}.json
 *  - public/data/surahs.json
 *  - public/data/page/{1..604}.json
 *  - public/data/index.json
 *
 * Usage:
 *  node scripts/seed-quran.mjs [--force]
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

const PRIMARY_HOST = 'https://api.quran.com/api/v4';
const FALLBACK_HOST = 'https://api.islamic.app/v1';

// Indonesian Kemenag Translation ID
const TRANSLATION_ID = 33;

const isForce = process.argv.includes('--force');

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch helper with retry, exponential backoff, and host fallback.
 */
async function fetchWithRetry(endpoint, retries = 3) {
  let hosts = [PRIMARY_HOST, FALLBACK_HOST];

  for (const host of hosts) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const url = `${host}${endpoint}`;
        const res = await fetch(url, {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'Tarseekh-Seeder/1.0',
          },
        });

        if (res.status === 429) {
          const delay = Math.pow(2, attempt) * 1000;
          console.warn(`[429 Rate Limit] Retrying ${url} in ${delay}ms...`);
          await sleep(delay);
          continue;
        }

        if (!res.ok) {
          throw new Error(`HTTP error ${res.status}: ${res.statusText}`);
        }

        return await res.json();
      } catch (err) {
        if (attempt === retries) {
          console.warn(`Host ${host} failed for ${endpoint}: ${err.message}`);
          break; // Try fallback host
        }
        await sleep(attempt * 800);
      }
    }
  }

  throw new Error(`Failed to fetch ${endpoint} after all retries and fallback hosts.`);
}

/**
 * Fetch all chapters metadata with Indonesian translations.
 */
async function fetchChapters() {
  console.log('Fetching chapters metadata...');
  const data = await fetchWithRetry('/chapters?language=id');
  return data.chapters;
}

/**
 * Fetch all verses for a given chapter, handling pagination.
 */
async function fetchChapterVerses(chapterId) {
  let allVerses = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const endpoint = `/verses/by_chapter/${chapterId}?per_page=300&page=${page}&words=true&fields=text_uthmani,text_uthmani_tajweed,page_number,juz_number,hizb_number&translations=${TRANSLATION_ID}&word_fields=position,text_uthmani,page_number,line_number,char_type_name`;
    const data = await fetchWithRetry(endpoint);

    if (data.verses && data.verses.length > 0) {
      allVerses.push(...data.verses);
    }

    if (data.pagination && data.pagination.next_page) {
      page = data.pagination.next_page;
    } else {
      hasMore = false;
    }

    // Small throttle between pagination calls
    await sleep(150);
  }

  return allVerses;
}

/**
 * Main seed execution.
 */
async function main() {
  console.log('=== SEEDING QURAN DATA FOR TARSEEKH ===');
  await fs.mkdir(SURAH_DIR, { recursive: true });
  await fs.mkdir(PAGE_DIR, { recursive: true });

  const chapters = await fetchChapters();
  console.log(`Retrieved ${chapters.length} chapters.`);

  const surahsMeta = [];
  const allVersesByPage = Array.from({ length: 605 }, () => []);
  const verseToPageMap = {};
  const surahToPageMap = {};
  const juzToPageMap = {};

  // 1. Process and save each Surah
  for (const ch of chapters) {
    const surahFilePath = path.join(SURAH_DIR, `${ch.id}.json`);
    let chapterVerses;

    let exists = false;
    if (!isForce) {
      try {
        await fs.access(surahFilePath);
        exists = true;
      } catch {}
    }

    if (exists) {
      console.log(`[Cache Hit] Surah ${ch.id} (${ch.name_simple}) already seeded.`);
      const raw = await fs.readFile(surahFilePath, 'utf8');
      const parsed = JSON.parse(raw);
      chapterVerses = parsed.verses.map((v) => ({
        verse_key: v.key,
        verse_number: v.n,
        page_number: v.page,
        juz_number: v.juz,
        text_uthmani: v.text,
        text_uthmani_tajweed: v.tajweed,
        translations: [{ text: v.translation }],
        words: v.words.map((w) => ({
          position: w.idx,
          text_uthmani: w.text,
          page_number: w.page,
          line_number: w.line,
          char_type_name: w.type || (w.is_end ? 'end' : 'word'),
        })),
      }));
    } else {
      console.log(`Fetching Surah ${ch.id}: ${ch.name_simple} (${ch.verses_count} ayat)...`);
      chapterVerses = await fetchChapterVerses(ch.id);

      // Clean & format verses for storage
      const formattedVerses = chapterVerses.map((v) => {
        const translationText = v.translations?.[0]?.text?.replace(/<[^>]*>?/gm, '').trim() || '';
        return {
          key: v.verse_key,
          n: v.verse_number,
          page: v.page_number,
          juz: v.juz_number,
          text: v.text_uthmani,
          tajweed: v.text_uthmani_tajweed,
          translation: translationText,
          words: v.words.map((w) => ({
            idx: w.position,
            text: w.text_uthmani,
            page: w.page_number,
            line: w.line_number,
            type: w.char_type_name,
          })),
        };
      });

      const surahPayload = {
        surah: {
          id: ch.id,
          name_arabic: ch.name_arabic,
          name_simple: ch.name_simple,
          translated_name: ch.translated_name?.name || ch.name_simple,
          verses_count: ch.verses_count,
          revelation_place: ch.revelation_place,
        },
        verses: formattedVerses,
      };

      await fs.writeFile(surahFilePath, JSON.stringify(surahPayload, null, 2), 'utf8');
      await sleep(100); // Polite rate throttle
    }

    // Index mappings
    const firstVerse = chapterVerses[0];
    if (firstVerse) {
      surahToPageMap[ch.id] = firstVerse.page_number;
    }

    for (const v of chapterVerses) {
      verseToPageMap[v.verse_key] = v.page_number;
      if (!juzToPageMap[v.juz_number]) {
        juzToPageMap[v.juz_number] = v.page_number;
      }
      // Group words into pages
      allVersesByPage[v.page_number].push(v);
    }

    surahsMeta.push({
      id: ch.id,
      name_arabic: ch.name_arabic,
      name_simple: ch.name_simple,
      translated_name: ch.translated_name?.name || ch.name_simple,
      verses_count: ch.verses_count,
      revelation_place: ch.revelation_place,
      first_page: firstVerse ? firstVerse.page_number : 1,
    });
  }

  // Write public/data/surahs.json
  await fs.writeFile(
    path.join(PUBLIC_DATA_DIR, 'surahs.json'),
    JSON.stringify(surahsMeta, null, 2),
    'utf8'
  );
  console.log('Saved public/data/surahs.json');

  // Write public/data/index.json
  const indexPayload = {
    verse_to_page: verseToPageMap,
    surah_to_page: surahToPageMap,
    juz_to_page: juzToPageMap,
  };
  await fs.writeFile(
    path.join(PUBLIC_DATA_DIR, 'index.json'),
    JSON.stringify(indexPayload, null, 2),
    'utf8'
  );
  console.log('Saved public/data/index.json');

  // 2. Generate public/data/page/{1..604}.json
  console.log('Generating 604 Madinah Mushaf page layouts...');

  // Map of surah lookup by id
  const surahMap = new Map(chapters.map((c) => [c.id, c]));

  for (let pageNum = 1; pageNum <= 604; pageNum++) {
    const versesOnPage = allVersesByPage[pageNum] || [];
    const juzNum = versesOnPage[0]?.juz_number || 1;

    // Collect distinct surahs on this page
    const surahIds = [...new Set(versesOnPage.map((v) => parseInt(v.verse_key.split(':')[0], 10)))];
    const surahsOnPage = surahIds.map((id) => {
      const s = surahMap.get(id);
      return {
        id,
        name_arabic: s?.name_arabic || '',
        name_simple: s?.name_simple || '',
      };
    });

    // Group words by line_number
    const wordsByLine = new Map();
    for (const v of versesOnPage) {
      for (const w of v.words) {
        const line = w.line_number;
        if (!wordsByLine.has(line)) {
          wordsByLine.set(line, []);
        }
        wordsByLine.get(line).push({
          verse_key: v.verse_key,
          idx: w.position,
          text: w.text_uthmani,
          type: w.char_type_name,
        });
      }
    }

    // Determine lines array for this page (up to 15 lines)
    // Find surah starters on this page (verses with number 1)
    const surahStarts = versesOnPage.filter((v) => v.verse_number === 1);
    const surahStartLines = new Map();
    for (const s of surahStarts) {
      const sId = parseInt(s.verse_key.split(':')[0], 10);
      const firstLine = s.words[0]?.line_number;
      if (firstLine) {
        surahStartLines.set(firstLine, sId);
      }
    }

    // Identify reserved header and bismillah lines
    // If surah starts at line L:
    // - If sId === 9 (At-Taubah, no bismillah): line L-1 is surah_header
    // - If sId === 1 (Al-Fatihah, verse 1 is bismillah): line 1 is surah_header
    // - Other surahs: line L-2 is surah_header, line L-1 is bismillah
    const headerLines = new Map(); // line -> surahId
    const bismillahLines = new Set(); // set of line numbers

    for (const [startLine, sId] of surahStartLines.entries()) {
      if (sId === 1) {
        headerLines.set(1, 1);
      } else if (sId === 9) {
        headerLines.set(startLine - 1, 9);
      } else {
        if (startLine >= 3) {
          headerLines.set(startLine - 2, sId);
          bismillahLines.add(startLine - 1);
        } else if (startLine === 2) {
          // Special case: surah header on line 1, text starts line 2
          headerLines.set(1, sId);
        }
      }
    }

    const lines = [];
    // Standard Madinah Mushaf pages have line numbers up to 15 (or 8 on pages 1-2)
    const maxLine = Math.max(1, ...Array.from(wordsByLine.keys()), ...Array.from(headerLines.keys()), ...Array.from(bismillahLines));

    for (let l = 1; l <= Math.min(15, maxLine); l++) {
      if (headerLines.has(l)) {
        const sId = headerLines.get(l);
        const s = surahMap.get(sId);
        lines.push({
          line: l,
          type: 'surah_header',
          surah: {
            id: sId,
            name_arabic: s?.name_arabic || '',
            name_simple: s?.name_simple || '',
          },
        });
      } else if (bismillahLines.has(l)) {
        lines.push({
          line: l,
          type: 'bismillah',
          text: 'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ',
        });
      } else if (wordsByLine.has(l)) {
        lines.push({
          line: l,
          type: 'text',
          words: wordsByLine.get(l),
        });
      }
    }

    const pagePayload = {
      page: pageNum,
      juz: juzNum,
      surahs: surahsOnPage,
      lines,
    };

    const pageFilePath = path.join(PAGE_DIR, `${pageNum}.json`);
    await fs.writeFile(pageFilePath, JSON.stringify(pagePayload, null, 2), 'utf8');
  }

  console.log('All 604 page files generated successfully.');
  console.log('=== SEED COMPLETED SUCCESSFULLY ===');
}

main().catch((err) => {
  console.error('Fatal error during seeding:', err);
  process.exit(1);
});
