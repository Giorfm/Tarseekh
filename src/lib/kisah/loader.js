/**
 * src/lib/kisah/loader.js
 * Loader for Kisah (Quranic story) data.
 * Supports server-side (fs) and client-side (fetch) with memory cache.
 */

let kisahListCache = null;
const kisahCache = new Map();

async function readJson(relativePath) {
  if (typeof window === 'undefined') {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const filePath = path.resolve(process.cwd(), 'public', 'data', ...relativePath.split('/'));
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  }

  const res = await fetch(`/data/${relativePath}`);
  if (!res.ok) throw new Error(`Gagal memuat ${relativePath} (${res.status})`);
  return res.json();
}

/**
 * Get list of all stories, including "coming_soon" placeholders.
 */
export async function getKisahList() {
  if (kisahListCache) return kisahListCache;
  kisahListCache = await readJson('kisah/index.json');
  return kisahListCache;
}

/**
 * Get full story data (nodes) by slug. Only stories with status "available" have data.
 */
export async function getKisah(slug) {
  if (kisahCache.has(slug)) return kisahCache.get(slug);

  const list = await getKisahList();
  const meta = list.find((k) => k.slug === slug);
  if (!meta || meta.status !== 'available') {
    throw new Error(`Kisah tidak tersedia: ${slug}`);
  }

  const data = await readJson(`kisah/${slug}.json`);
  data.nodes = [...data.nodes].sort((a, b) => a.order - b.order);
  kisahCache.set(slug, data);
  return data;
}

/**
 * Format an ayat reference, e.g. { surah: 18, from: 9, to: 10 } -> "QS 18:9–10".
 */
export function formatAyatRef(ref) {
  return ref.from === ref.to ? `QS ${ref.surah}:${ref.from}` : `QS ${ref.surah}:${ref.from}–${ref.to}`;
}
