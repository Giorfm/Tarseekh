/**
 * src/lib/rag/retrieve.js
 * Tier 1 RAG direct lookup: retrieves verse text, Indonesian translation,
 * and tafsir chunks (Ibn Kathir and Al-Muyassar) for the requested verse keys.
 * Server-side only (reads from static JSON files).
 */

import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT_DIR = process.cwd();
const SURAH_DIR = path.resolve(ROOT_DIR, 'public', 'data', 'surah');
const TAFSIR_DIR = path.resolve(ROOT_DIR, 'data', 'tafsir');

const TAFSIR_SOURCES = [
  { slug: 'en-tafisr-ibn-kathir', name: 'Tafsir Ibnu Katsir', language: 'en' },
  { slug: 'ar-tafsir-muyassar', name: 'Tafsir Al-Muyassar', language: 'ar' },
];

// Memory cache for surahs and tafsirs
const surahCache = new Map();
const tafsirCache = new Map();

async function loadSurah(surahId) {
  if (surahCache.has(surahId)) return surahCache.get(surahId);
  try {
    const raw = await fs.readFile(path.join(SURAH_DIR, `${surahId}.json`), 'utf8');
    const data = JSON.parse(raw);
    surahCache.set(surahId, data);
    return data;
  } catch {
    return null;
  }
}

async function loadTafsir(slug, surahId) {
  const cacheKey = `${slug}:${surahId}`;
  if (tafsirCache.has(cacheKey)) return tafsirCache.get(cacheKey);
  try {
    const raw = await fs.readFile(path.join(TAFSIR_DIR, slug, `${surahId}.json`), 'utf8');
    const data = JSON.parse(raw);
    tafsirCache.set(cacheKey, data);
    return data;
  } catch {
    return null;
  }
}

/**
 * Retrieve grounding context for an array of verse keys (max 7).
 *
 * @param {string[]} verseKeys - e.g. ["2:255"]
 * @returns {Promise<{
 *   verses: Array<{ key: string, surahName: string, text: string, translation: string }>,
 *   tafsirChunks: Array<{ source: string, verseKey: string, text: string, language: string }>
 * }>}
 */
export async function retrieve(verseKeys = []) {
  const validKeys = (verseKeys || []).slice(0, 7);
  const verses = [];
  const tafsirChunks = [];

  for (const vk of validKeys) {
    const parts = vk.split(':');
    const surahId = parseInt(parts[0], 10);
    const ayahNum = parseInt(parts[1], 10);
    if (!surahId || !ayahNum) continue;

    const surahData = await loadSurah(surahId);
    if (!surahData) continue;

    const verseObj = surahData.verses.find((v) => v.key === vk);
    if (verseObj) {
      verses.push({
        key: vk,
        surahName: surahData.surah.name_simple,
        surahArabic: surahData.surah.name_arabic,
        text: verseObj.text,
        translation: verseObj.translation,
      });
    }

    // Load Tafsir for this verse
    for (const source of TAFSIR_SOURCES) {
      const tafsirData = await loadTafsir(source.slug, surahId);
      if (tafsirData && tafsirData[vk]) {
        tafsirChunks.push({
          source: source.name,
          slug: source.slug,
          verseKey: vk,
          language: source.language,
          text: tafsirData[vk],
        });
      }
    }
  }

  return {
    verses,
    tafsirChunks,
  };
}
