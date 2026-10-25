/**
 * src/lib/pages/loader.js
 * Unified loader for Madinah Mushaf pages (1..604).
 * Supports server-side (fs) and client-side (fetch) with memory cache.
 */

const pageCache = new Map();

/**
 * Get page data by page number (1..604).
 */
export async function getPage(pageNumber) {
  const p = parseInt(pageNumber, 10);
  if (isNaN(p) || p < 1 || p > 604) {
    throw new Error(`Nomor halaman tidak valid: ${pageNumber} (harus 1..604)`);
  }

  if (pageCache.has(p)) {
    return pageCache.get(p);
  }

  let data;
  if (typeof window === 'undefined') {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const filePath = path.resolve(process.cwd(), 'public', 'data', 'page', `${p}.json`);
    const raw = await fs.readFile(filePath, 'utf8');
    data = JSON.parse(raw);
  } else {
    const res = await fetch(`/data/page/${p}.json`);
    if (!res.ok) throw new Error(`Gagal memuat halaman ${p} (${res.status})`);
    data = await res.json();
  }

  pageCache.set(p, data);
  return data;
}

/**
 * Prefetch adjacent pages into memory cache (useful for client navigation).
 */
export async function prefetchAdjacentPages(currentPage) {
  if (typeof window === 'undefined') return;
  const p = parseInt(currentPage, 10);
  const targets = [];
  if (p > 1) targets.push(p - 1);
  if (p < 604) targets.push(p + 1);

  await Promise.allSettled(targets.map((num) => getPage(num)));
}
