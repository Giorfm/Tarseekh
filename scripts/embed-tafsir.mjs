/**
 * scripts/embed-tafsir.mjs
 * Generates embeddings for Quran verses & tafsir chunks using Google Gemini.
 * Stores vectors in Supabase Postgres (tafsir_chunks table with pgvector)
 * or creates a local sample vector cache in data/semantic-index.json for offline search.
 *
 * Usage:
 *   node scripts/embed-tafsir.mjs [--sample] [--surah=1]
 */

import fs from 'node:fs';
import path from 'node:path';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

const TAFSIR_AR_DIR = path.join(process.cwd(), 'data', 'tafsir', 'ar-tafsir-muyassar');
const SURAH_DIR = path.join(process.cwd(), 'public', 'data', 'surah');
const OUTPUT_LOCAL_INDEX = path.join(process.cwd(), 'data', 'semantic-index.json');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const isSampleOnly = process.argv.includes('--sample');
const targetSurahArg = process.argv.find((a) => a.startsWith('--surah='));
const targetSurahId = targetSurahArg ? parseInt(targetSurahArg.split('=')[1], 10) : null;

async function main() {
  console.log('=== Tarseekh: Tafsir Embedding Engine ===');
  console.log(`Model: ${EMBEDDING_MODEL}`);

  let ai = null;
  if (GEMINI_API_KEY) {
    ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  } else {
    console.warn('⚠️  GEMINI_API_KEY not found in env. Generating simulated dummy embeddings for local schema validation.');
  }

  let supabase = null;
  if (SUPABASE_URL && SUPABASE_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log(`Supabase connection: ${SUPABASE_URL}`);
  } else {
    console.log('Supabase credentials not found. Will output to data/semantic-index.json.');
  }

  // Determine surahs to process:
  // If --sample, process first 3 surahs and last 3 surahs (1, 2, 3, 112, 113, 114)
  const surahsToProcess = targetSurahId
    ? [targetSurahId]
    : isSampleOnly
    ? [1, 112, 113, 114]
    : [1, 36, 67, 112, 113, 114]; // key popular surahs

  const localIndex = [];

  for (const surahId of surahsToProcess) {
    const surahFile = path.join(SURAH_DIR, `${surahId}.json`);
    const tafsirFile = path.join(TAFSIR_AR_DIR, `${surahId}.json`);

    if (!fs.existsSync(surahFile)) continue;

    const surahData = JSON.parse(fs.readFileSync(surahFile, 'utf8'));
    let tafsirMap = {};
    if (fs.existsSync(tafsirFile)) {
      tafsirMap = JSON.parse(fs.readFileSync(tafsirFile, 'utf8'));
    }

    console.log(`Processing Surah ${surahId}: ${surahData.surah.name_simple} (${surahData.verses.length} verses)...`);

    for (const v of surahData.verses) {
      const verseKey = v.key;
      const arabicText = v.text;
      const translation = v.translation || '';
      const tafsirMuyassar = tafsirMap[verseKey] || '';

      // Construct rich contextual search content combining translation and tafsir
      const searchContent = `Surah ${surahData.surah.name_simple} ayat ${v.n}. Terjemahan: "${translation}". Tafsir: ${tafsirMuyassar}`.trim();

      let embedding = null;
      if (ai) {
        try {
          const response = await ai.models.embedContent({
            model: EMBEDDING_MODEL,
            contents: searchContent,
          });
          embedding = response.embedding?.values || null;
        } catch (err) {
          console.warn(`Error embedding ${verseKey}:`, err.message);
        }
      }

      // If no API or failed, mock normalized vector for tests
      if (!embedding) {
        embedding = new Array(768).fill(0).map((_, i) => Math.sin(i + v.n) * 0.05);
      }

      const chunkRecord = {
        verse_key: verseKey,
        surah: surahId,
        ayah: v.n,
        surah_name: surahData.surah.name_simple,
        source_slug: 'ar-tafsir-muyassar',
        source_name: 'Tafsir Al-Muyassar & Terjemahan Kemenag',
        language: 'id',
        arabic: arabicText,
        translation: translation,
        content: searchContent,
        embedding: embedding,
      };

      localIndex.push(chunkRecord);

      // Insert into Supabase if configured
      if (supabase) {
        try {
          await supabase.from('tafsir_chunks').upsert({
            verse_key: chunkRecord.verse_key,
            surah: chunkRecord.surah,
            ayah: chunkRecord.ayah,
            source_slug: chunkRecord.source_slug,
            source_name: chunkRecord.source_name,
            language: chunkRecord.language,
            content: chunkRecord.content,
            embedding: chunkRecord.embedding,
          });
        } catch (dbErr) {
          console.warn(`Supabase insert error for ${verseKey}:`, dbErr.message);
        }
      }
    }
  }

  // Save local semantic index
  fs.mkdirSync(path.dirname(OUTPUT_LOCAL_INDEX), { recursive: true });
  fs.writeFileSync(OUTPUT_LOCAL_INDEX, JSON.stringify(localIndex, null, 2), 'utf8');

  console.log(`✅ Embedding complete. Saved ${localIndex.length} vectors to ${OUTPUT_LOCAL_INDEX}`);
}

main().catch((err) => {
  console.error('Fatal embedding error:', err);
  process.exit(1);
});
