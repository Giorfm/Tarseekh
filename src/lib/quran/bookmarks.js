/**
 * src/lib/quran/bookmarks.js
 * Unified bookmark manager for Tarseekh.
 * Manages saved verses with full metadata (surah, ayah, page, juz, text, translation)
 * and dispatches events for real-time reactivity across all components.
 */

export const BOOKMARKS_STORAGE_KEY = 'tarseekh_bookmarks_v1';
export const LEGACY_BOOKMARKS_KEY = 'tadabbur_bookmarks_v1';
export const BOOKMARKS_CHANGED_EVENT = 'tarseekh:bookmarks-changed';

/**
 * Normalizes any raw bookmark entry (legacy string "2:255" or object)
 * into a consistent, robust Bookmark object.
 *
 * @param {string|Object} item
 * @param {Object} [metadataFallback]
 * @returns {Object}
 */
export function normalizeBookmark(item, metadataFallback = {}) {
  if (!item) return null;

  if (typeof item === 'string') {
    const [surahStr, ayahStr] = item.split(':');
    const surah = parseInt(surahStr, 10) || 1;
    const ayah = parseInt(ayahStr, 10) || 1;
    return {
      id: `${surah}:${ayah}`,
      verseKey: `${surah}:${ayah}`,
      surah,
      ayah,
      page: metadataFallback.page || null,
      juz: metadataFallback.juz || null,
      surahName: metadataFallback.surahName || `Surah ${surah}`,
      surahArabic: metadataFallback.surahArabic || '',
      text: metadataFallback.text || '',
      translation: metadataFallback.translation || '',
      createdAt: metadataFallback.createdAt || Date.now(),
    };
  }

  const verseKey = item.verseKey || `${item.surah || 1}:${item.ayah || 1}`;
  const [surahStr, ayahStr] = verseKey.split(':');
  const surah = parseInt(item.surah || surahStr, 10) || 1;
  const ayah = parseInt(item.ayah || ayahStr, 10) || 1;

  return {
    id: item.id || verseKey,
    verseKey,
    surah,
    ayah,
    page: item.page || metadataFallback.page || null,
    juz: item.juz || metadataFallback.juz || null,
    surahName: item.surahName || metadataFallback.surahName || `Surah ${surah}`,
    surahArabic: item.surahArabic || metadataFallback.surahArabic || '',
    text: item.text || metadataFallback.text || '',
    translation: item.translation || metadataFallback.translation || '',
    createdAt: item.createdAt || metadataFallback.createdAt || Date.now(),
  };
}

/**
 * Retrieve all bookmarks from localStorage (newest first).
 *
 * @returns {Array<Object>}
 */
export function getBookmarks() {
  if (typeof window === 'undefined') return [];

  try {
    const raw =
      window.localStorage.getItem(BOOKMARKS_STORAGE_KEY) ||
      window.localStorage.getItem(LEGACY_BOOKMARKS_KEY) ||
      '[]';

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => normalizeBookmark(item))
      .filter(Boolean)
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  } catch (err) {
    console.warn('Failed to load bookmarks from storage:', err);
    return [];
  }
}

/**
 * Dispatch custom event so components can update reactively without reloading.
 *
 * @param {Array<Object>} bookmarks
 */
function emitBookmarksChanged(bookmarks) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(BOOKMARKS_CHANGED_EVENT, {
        detail: { bookmarks },
      })
    );
  }
}

/**
 * Check whether a verse is currently bookmarked.
 *
 * @param {string} verseKey e.g. "2:255"
 * @returns {boolean}
 */
export function isVerseBookmarked(verseKey) {
  if (!verseKey || typeof window === 'undefined') return false;
  const bookmarks = getBookmarks();
  return bookmarks.some((b) => b.verseKey === verseKey);
}

/**
 * Save one or multiple bookmarks.
 *
 * @param {string|Object|Array<string|Object>} itemOrItems
 * @param {Object} [metadata]
 * @returns {Array<Object>} Updated bookmarks list
 */
export function saveBookmarks(itemOrItems, metadata = {}) {
  if (typeof window === 'undefined') return [];

  try {
    const currentList = getBookmarks();
    const itemsToAdd = Array.isArray(itemOrItems) ? itemOrItems : [itemOrItems];

    const updatedList = [...currentList];

    for (const rawItem of itemsToAdd) {
      const normalized = normalizeBookmark(rawItem, metadata);
      if (!normalized) continue;

      // Remove existing entry for same verseKey to update timestamp and prevent duplicates
      const existingIdx = updatedList.findIndex((b) => b.verseKey === normalized.verseKey);
      if (existingIdx !== -1) {
        updatedList.splice(existingIdx, 1);
      }
      // Insert at beginning (newest first)
      updatedList.unshift({
        ...normalized,
        createdAt: Date.now(),
      });
    }

    window.localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(updatedList));
    emitBookmarksChanged(updatedList);
    return updatedList;
  } catch (err) {
    console.warn('Failed to save bookmark:', err);
    return getBookmarks();
  }
}

/**
 * Remove a bookmark by verseKey.
 *
 * @param {string} verseKey e.g. "2:255"
 * @returns {Array<Object>} Updated bookmarks list
 */
export function removeBookmark(verseKey) {
  if (!verseKey || typeof window === 'undefined') return [];

  try {
    const currentList = getBookmarks();
    const updatedList = currentList.filter((b) => b.verseKey !== verseKey);

    window.localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(updatedList));
    emitBookmarksChanged(updatedList);
    return updatedList;
  } catch (err) {
    console.warn('Failed to remove bookmark:', err);
    return getBookmarks();
  }
}

/**
 * Toggle a bookmark: if exists, removes it; if not, saves it.
 *
 * @param {string|Object} item
 * @param {Object} [metadata]
 * @returns {{ isBookmarked: boolean, bookmarks: Array<Object> }}
 */
export function toggleBookmark(item, metadata = {}) {
  const normalized = normalizeBookmark(item, metadata);
  if (!normalized) return { isBookmarked: false, bookmarks: getBookmarks() };

  const exists = isVerseBookmarked(normalized.verseKey);
  if (exists) {
    const updated = removeBookmark(normalized.verseKey);
    return { isBookmarked: false, bookmarks: updated };
  } else {
    const updated = saveBookmarks(normalized, metadata);
    return { isBookmarked: true, bookmarks: updated };
  }
}
