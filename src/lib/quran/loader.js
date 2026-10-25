/**
 * src/lib/quran/loader.js
 * Unified loader for Quran surah metadata, verses, and indexes.
 * Supports server-side (fs) and client-side (fetch) with memory cache.
 */

let surahsCache = null;
let indexCache = null;
const surahCache = new Map();

/**
 * Get list of all 114 surahs with metadata.
 */
export async function getSurahList() {
  if (surahsCache) return surahsCache;

  if (typeof window === 'undefined') {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const filePath = path.resolve(process.cwd(), 'public', 'data', 'surahs.json');
    const raw = await fs.readFile(filePath, 'utf8');
    surahsCache = JSON.parse(raw);
  } else {
    const res = await fetch('/data/surahs.json');
    if (!res.ok) throw new Error(`Gagal memuat daftar surah (${res.status})`);
    surahsCache = await res.json();
  }

  return surahsCache;
}

/**
 * Get full surah data (verses, words, translation) by surah id (1..114).
 */
export async function getSurah(id) {
  const surahId = parseInt(id, 10);
  if (isNaN(surahId) || surahId < 1 || surahId > 114) {
    throw new Error(`ID surah tidak valid: ${id}`);
  }

  if (surahCache.has(surahId)) {
    return surahCache.get(surahId);
  }

  let data;
  if (typeof window === 'undefined') {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const filePath = path.resolve(process.cwd(), 'public', 'data', 'surah', `${surahId}.json`);
    const raw = await fs.readFile(filePath, 'utf8');
    data = JSON.parse(raw);
  } else {
    const res = await fetch(`/data/surah/${surahId}.json`);
    if (!res.ok) throw new Error(`Gagal memuat surah ${surahId} (${res.status})`);
    data = await res.json();
  }

  surahCache.set(surahId, data);
  return data;
}

/**
 * Get verse-to-page, surah-to-page, and juz-to-page indexes.
 */
export async function getIndex() {
  if (indexCache) return indexCache;

  if (typeof window === 'undefined') {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const filePath = path.resolve(process.cwd(), 'public', 'data', 'index.json');
    const raw = await fs.readFile(filePath, 'utf8');
    indexCache = JSON.parse(raw);
  } else {
    const res = await fetch('/data/index.json');
    if (!res.ok) throw new Error(`Gagal memuat indeks (${res.status})`);
    indexCache = await res.json();
  }

  return indexCache;
}

/**
 * Find page number for a given verse key (e.g. "2:255").
 */
export async function pageOfVerse(verseKey) {
  const index = await getIndex();
  return index.verse_to_page[verseKey] || 1;
}

/**
 * Find first page for a given surah id (1..114).
 */
export async function firstPageOfSurah(surahId) {
  const index = await getIndex();
  return index.surah_to_page[String(surahId)] || 1;
}

/**
 * Find first page for a given juz (1..30).
 */
export async function firstPageOfJuz(juzNum) {
  const index = await getIndex();
  return index.juz_to_page[String(juzNum)] || 1;
}
