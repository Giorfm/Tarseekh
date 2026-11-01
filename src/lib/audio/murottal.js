/**
 * src/lib/audio/murottal.js
 * Helpers and metadata for Quran Murattal audio streams from EveryAyah & QuranCDN.
 */

export const RECITERS = [
  {
    id: 'Alafasy_128kbps',
    name: 'Mishari Rashid Alafasy',
    desc: 'Suara Merdu & Populer (Kuartal 1441H)',
    subId: 'alafasy',
  },
  {
    id: 'Husary_128kbps',
    name: 'Mahmoud Khalil Al-Husary',
    desc: 'Standar Emas Tajwid & Makhraj Huruf',
    subId: 'husary',
  },
  {
    id: 'Abdul_Basit_Murattal_192kbps',
    name: 'Abdul Basit Abdul Samad',
    desc: 'Murattal Klasik & Syahdu Legendaris',
    subId: 'abdulbasit',
  },
  {
    id: 'Abu_Bakr_Ash-Shaatree_128kbps',
    name: 'Abu Bakr Ash-Shatri',
    desc: 'Irama Tartil Khusyuk & Mendalam',
    subId: 'shatri',
  },
  {
    id: 'Ghamadi_40kbps',
    name: 'Saad Al-Ghamdi',
    desc: 'Lantunan Khas, Lembut & Tenang',
    subId: 'ghamdi',
  },
];

const DEFAULT_RECITER_ID = 'Alafasy_128kbps';

/**
 * Format verseKey (e.g. "1:1" or "2:255") into 3-digit surah and ayah padded string.
 * @param {string} verseKey 
 * @returns {{ surahPad: string, ayahPad: string } | null}
 */
export function parseVerseKey(verseKey) {
  if (!verseKey || typeof verseKey !== 'string' || !verseKey.includes(':')) {
    return null;
  }
  const [s, a] = verseKey.split(':');
  const sNum = parseInt(s, 10);
  const aNum = parseInt(a, 10);
  if (isNaN(sNum) || isNaN(aNum)) return null;

  return {
    surahPad: String(sNum).padStart(3, '0'),
    ayahPad: String(aNum).padStart(3, '0'),
    surah: sNum,
    ayah: aNum,
  };
}

/**
 * Generates an EveryAyah MP3 URL for a given verse and reciter.
 * @param {string} verseKey - e.g. "1:1"
 * @param {string} reciterId - e.g. "Alafasy_128kbps"
 * @returns {string | null}
 */
export function getVerseAudioUrl(verseKey, reciterId = DEFAULT_RECITER_ID) {
  const parsed = parseVerseKey(verseKey);
  if (!parsed) return null;
  return `https://everyayah.com/data/${reciterId}/${parsed.surahPad}${parsed.ayahPad}.mp3`;
}

/**
 * Generates a Word-by-Word (WBW) audio URL for a specific word in an ayah from QuranCDN.
 * @param {string} verseKey - e.g. "1:1"
 * @param {number} wordIdx - 1-based index of the word in the verse
 * @returns {string | null}
 */
export function getWordAudioUrl(verseKey, wordIdx) {
  const parsed = parseVerseKey(verseKey);
  if (!parsed || !wordIdx) return null;
  const wPad = String(wordIdx).padStart(3, '0');
  return `https://audio.qurancdn.com/wbw/${parsed.surahPad}_${parsed.ayahPad}_${wPad}.mp3`;
}

