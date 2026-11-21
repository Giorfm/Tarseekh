import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getBookmarks,
  saveBookmarks,
  removeBookmark,
  toggleBookmark,
  isVerseBookmarked,
  normalizeBookmark,
  BOOKMARKS_STORAGE_KEY,
} from './bookmarks';

class LocalStorageMock {
  constructor() {
    this.store = {};
  }
  clear() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] !== undefined ? this.store[key] : null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
}

const mockStorage = new LocalStorageMock();

if (typeof global.window === 'undefined') {
  global.window = {
    localStorage: mockStorage,
    dispatchEvent: () => {},
  };
} else {
  global.window.localStorage = mockStorage;
}

if (typeof global.CustomEvent === 'undefined') {
  global.CustomEvent = class CustomEvent {
    constructor(type, eventInitDict) {
      this.type = type;
      this.detail = eventInitDict?.detail;
    }
  };
}

describe('Quran Bookmarks Module', () => {
  beforeEach(() => {
    mockStorage.clear();
    vi.restoreAllMocks();
  });

  it('normalizes string verse keys correctly', () => {
    const item = normalizeBookmark('2:255', { surahName: 'Al-Baqarah', page: 42 });
    expect(item.verseKey).toBe('2:255');
    expect(item.surah).toBe(2);
    expect(item.ayah).toBe(255);
    expect(item.surahName).toBe('Al-Baqarah');
    expect(item.page).toBe(42);
  });

  it('normalizes object bookmark correctly', () => {
    const item = normalizeBookmark({
      verseKey: '36:1',
      surah: 36,
      ayah: 1,
      surahName: 'Yasin',
      text: 'يس',
    });
    expect(item.verseKey).toBe('36:1');
    expect(item.surah).toBe(36);
    expect(item.surahName).toBe('Yasin');
    expect(item.text).toBe('يس');
  });

  it('saves and retrieves bookmarks', () => {
    expect(getBookmarks()).toEqual([]);

    saveBookmarks({
      verseKey: '1:1',
      surah: 1,
      ayah: 1,
      surahName: 'Al-Fatihah',
      text: 'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ',
    });

    const list = getBookmarks();
    expect(list.length).toBe(1);
    expect(list[0].verseKey).toBe('1:1');
    expect(isVerseBookmarked('1:1')).toBe(true);
    expect(isVerseBookmarked('1:2')).toBe(false);
  });

  it('handles multiple bookmarks and deduplication', () => {
    saveBookmarks(['1:1', '1:2', '2:255']);
    let list = getBookmarks();
    expect(list.length).toBe(3);

    // Save 1:2 again with richer metadata
    saveBookmarks({
      verseKey: '1:2',
      surahName: 'Al-Fatihah',
      translation: 'Segala puji bagi Allah...',
    });

    list = getBookmarks();
    expect(list.length).toBe(3);
    // 1:2 should now be at the top because it was updated
    expect(list[0].verseKey).toBe('1:2');
    expect(list[0].translation).toBe('Segala puji bagi Allah...');
  });

  it('removes a bookmark', () => {
    saveBookmarks(['1:1', '2:255']);
    expect(isVerseBookmarked('1:1')).toBe(true);

    removeBookmark('1:1');
    expect(isVerseBookmarked('1:1')).toBe(false);
    expect(getBookmarks().length).toBe(1);
    expect(getBookmarks()[0].verseKey).toBe('2:255');
  });

  it('toggles bookmarks reliably', () => {
    const res1 = toggleBookmark('2:255', { surahName: 'Al-Baqarah' });
    expect(res1.isBookmarked).toBe(true);
    expect(isVerseBookmarked('2:255')).toBe(true);

    const res2 = toggleBookmark('2:255');
    expect(res2.isBookmarked).toBe(false);
    expect(isVerseBookmarked('2:255')).toBe(false);
  });

  it('reads legacy bookmarks array of strings', () => {
    mockStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(['18:10', '67:1']));
    const list = getBookmarks();
    expect(list.length).toBe(2);
    expect(list.map((b) => b.verseKey)).toContain('18:10');
    expect(list.map((b) => b.verseKey)).toContain('67:1');
  });
});
