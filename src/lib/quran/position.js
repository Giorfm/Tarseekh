/**
 * src/lib/quran/position.js
 * Synchronizes last read position across views (ayat and halaman).
 * Stores position as { verseKey, page, surah, ayah, updatedAt }.
 */

const LAST_POS_KEY = 'tarseekh_last_position_v1';
const LEGACY_LAST_POS_KEY = 'tadabbur_last_position_v1';
let memoryPosition = { verseKey: '1:1', surah: 1, ayah: 1, page: 1, updatedAt: Date.now() };

export function saveLastPosition(verseKey, pageNumber = null) {
  try {
    const parts = (verseKey || '1:1').split(':');
    const surah = parseInt(parts[0], 10) || 1;
    const ayah = parseInt(parts[1], 10) || 1;

    const payload = {
      verseKey: `${surah}:${ayah}`,
      surah,
      ayah,
      page: pageNumber,
      updatedAt: Date.now(),
    };

    memoryPosition = payload;

    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(LAST_POS_KEY, JSON.stringify(payload));
    }
  } catch (err) {
    console.warn('Failed to save last position', err);
  }
}

export function getLastPosition() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(LAST_POS_KEY) || window.localStorage.getItem(LEGACY_LAST_POS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          verseKey: parsed.verseKey || '1:1',
          surah: parsed.surah || 1,
          ayah: parsed.ayah || 1,
          page: parsed.page || 1,
          updatedAt: parsed.updatedAt || Date.now(),
        };
      }
    }
    return memoryPosition;
  } catch {
    return memoryPosition;
  }
}
