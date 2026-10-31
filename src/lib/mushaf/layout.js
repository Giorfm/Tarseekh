/**
 * src/lib/mushaf/layout.js
 * Loader for word geometry on the KFGQPC mushaf page images (public/data/mushaf-layout/{n}.json).
 *
 * Geometry was produced offline by scripts/mushaf-ocr (forced alignment of the verified word
 * stream to the vector pages). It contains only positions and word keys ("surah:ayah:word"),
 * never Quran text; the text always comes from public/data/surah and public/data/page.
 *
 * Shape: { page, width, height, lines: [{ line, y0, y1, words: [{ k, x0, x1, hx0, hx1, end?, approx? }] }] }
 *   x0/x1   ink extent of the word (page units, origin top-left)
 *   hx0/hx1 tap target extended to the midpoint of neighbouring gaps
 */

const layoutCache = new Map();

export async function getMushafLayout(pageNumber) {
  const p = parseInt(pageNumber, 10);
  if (isNaN(p) || p < 1 || p > 604) {
    throw new Error(`Nomor halaman tidak valid: ${pageNumber} (harus 1..604)`);
  }
  if (layoutCache.has(p)) return layoutCache.get(p);

  let data;
  if (typeof window === 'undefined') {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const filePath = path.resolve(process.cwd(), 'public', 'data', 'mushaf-layout', `${p}.json`);
    data = JSON.parse(await fs.readFile(filePath, 'utf8'));
  } else {
    const res = await fetch(`/data/mushaf-layout/${p}.json`);
    if (!res.ok) throw new Error(`Gagal memuat tata letak halaman ${p} (${res.status})`);
    data = await res.json();
  }

  layoutCache.set(p, data);
  return data;
}

/**
 * Split a layout word key "2:255:3" into { verseKey: "2:255", idx: 3 }.
 */
export function parseWordKey(key) {
  const i = key.lastIndexOf(':');
  return { verseKey: key.slice(0, i), idx: parseInt(key.slice(i + 1), 10) };
}
