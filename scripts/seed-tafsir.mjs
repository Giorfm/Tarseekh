/**
 * scripts/seed-tafsir.mjs
 * Downloads Tafsir Al-Muyassar (Arabic, id 16) and Tafsir Ibn Kathir (English, id 169)
 * from Quran.com API v4 for all 114 chapters.
 * Strips HTML, normalizes text, and stores in:
 *   data/tafsir/{slug}/{surah}.json as { [verse_key]: text }
 *
 * Usage:
 *   node scripts/seed-tafsir.mjs [--force]
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.resolve(ROOT_DIR, 'data', 'tafsir');

const PRIMARY_HOST = 'https://api.quran.com/api/v4';
const FALLBACK_HOST = 'https://api.islamic.app/v1';

const TAFSIRS_TO_SEED = [
  { id: 16, slug: 'ar-tafsir-muyassar', name: 'Tafsir Al-Muyassar' },
  { id: 169, slug: 'en-tafisr-ibn-kathir', name: 'Tafsir Ibn Kathir' },
];

const isForce = process.argv.includes('--force');

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function fetchWithRetry(endpoint, retries = 3) {
  const hosts = [PRIMARY_HOST, FALLBACK_HOST];

  for (const host of hosts) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const url = `${host}${endpoint}`;
        const res = await fetch(url, {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'Tarseekh-TafsirSeeder/1.0',
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
          break;
        }
        await sleep(attempt * 600);
      }
    }
  }

  throw new Error(`Failed to fetch ${endpoint} after all retries.`);
}

async function seedTafsirForSurah(tafsir, surahId) {
  const targetDir = path.join(DATA_DIR, tafsir.slug);
  await fs.mkdir(targetDir, { recursive: true });
  const filePath = path.join(targetDir, `${surahId}.json`);

  if (!isForce) {
    try {
      await fs.access(filePath);
      return; // Already exists
    } catch {}
  }

  let allItems = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const endpoint = `/tafsirs/${tafsir.id}/by_chapter/${surahId}?per_page=300&page=${page}`;
    const data = await fetchWithRetry(endpoint);

    if (data.tafsirs && data.tafsirs.length > 0) {
      allItems.push(...data.tafsirs);
    }

    if (data.pagination && data.pagination.next_page) {
      page = data.pagination.next_page;
    } else {
      hasMore = false;
    }
    await sleep(80);
  }

  // Format as { [verse_key]: text }
  const payload = {};
  for (const item of allItems) {
    const text = stripHtml(item.text);
    if (!text) continue;

    if (item.verse_key) {
      payload[item.verse_key] = text;
    }

    // If item groups several verses under one entry
    if (item.verses && typeof item.verses === 'object') {
      for (const vk of Object.keys(item.verses)) {
        if (!payload[vk]) {
          payload[vk] = text;
        }
      }
    }
  }

  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf8');
}

async function main() {
  console.log('=== SEEDING TAFSIR DATA FOR TARSEEKH ===');

  for (const tafsir of TAFSIRS_TO_SEED) {
    console.log(`\nSeeding ${tafsir.name} (${tafsir.slug})...`);
    for (let sId = 1; sId <= 114; sId++) {
      process.stdout.write(`  Surah ${sId}/114... \r`);
      await seedTafsirForSurah(tafsir, sId);
      await sleep(50);
    }
    console.log(`\nCompleted seeding ${tafsir.name}.`);
  }

  console.log('\n=== TAFSIR SEEDING COMPLETED SUCCESSFULLY ===');
}

main().catch((err) => {
  console.error('Fatal error during tafsir seeding:', err);
  process.exit(1);
});
