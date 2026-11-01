/**
 * src/lib/audio/speechSynthesizer.js
 * Arabic Speech Synthesis utility for vocalizing individual letters,
 * words, or highlighted verse snippets using the browser Web Speech API.
 */

// Isolated letter names for single-character selection without diacritics
const ISOLATED_LETTERS_MAP = {
  'ا': 'أَلِفْ',
  'أ': 'أَلِفْ',
  'إ': 'أَلِفْ',
  'آ': 'أَلِفْ مَدَّة',
  'ب': 'بَاءْ',
  'ت': 'تَاءْ',
  'ث': 'ثَاءْ',
  'ج': 'جِيمْ',
  'ح': 'حَاءْ',
  'خ': 'خَاءْ',
  'د': 'دَالْ',
  'ذ': 'ذَالْ',
  'ر': 'رَاءْ',
  'ز': 'زَايْ',
  'س': 'سِينْ',
  'ش': 'شِينْ',
  'ص': 'صَادْ',
  'ض': 'ضَادْ',
  'ط': 'طَاءْ',
  'ظ': 'ظَاءْ',
  'ع': 'عَيْنْ',
  'غ': 'غَيْنْ',
  'ف': 'فَاءْ',
  'ق': 'قَافْ',
  'ك': 'كَافْ',
  'ل': 'لَامْ',
  'م': 'مِيمْ',
  'ن': 'نُونْ',
  'ه': 'هَاءْ',
  'هـ': 'هَاءْ',
  'و': 'وَاوْ',
  'ي': 'يَاءْ',
  'ى': 'أَلِفْ مَقْصُورَة',
  'ة': 'تَاءْ مَرْبُوطَة',
  'ء': 'هَمْزَة',
};

// Huruf Muqatta'at phonetic pronunciations
const MUQATTAAT_MAP = {
  'الم': 'أَلِفْ لَامْ مِيمْ',
  'الـم': 'أَلِفْ لَامْ مِيمْ',
  'المص': 'أَلِفْ لَامْ مِيمْ صَادْ',
  'الـمص': 'أَلِفْ لَامْ مِيمْ صَادْ',
  'الر': 'أَلِفْ لَامْ رَا',
  'الـر': 'أَلِفْ لَامْ رَا',
  'المر': 'أَلِفْ لَامْ مِيمْ رَا',
  'الـمر': 'أَلِفْ لَامْ مِيمْ رَا',
  'كهيعص': 'كَافْ هَا يَا عَيْنْ صَادْ',
  'كـهيعص': 'كَافْ هَا يَا عَيْنْ صَادْ',
  'طه': 'طَا هَا',
  'طـه': 'طَا هَا',
  'طسم': 'طَا سِينْ مِيمْ',
  'طـسم': 'طَا سِينْ مِيمْ',
  'طس': 'طَا سِينْ',
  'طـس': 'طَا سِينْ',
  'يس': 'يَا سِينْ',
  'يـس': 'يَا سِينْ',
  'حم': 'حَا مِيمْ',
  'حـم': 'حَا مِيمْ',
  'عسق': 'عَيْنْ سِينْ قَافْ',
  'عـسق': 'عَيْنْ سِينْ قَافْ',
  'ص': 'صَادْ',
  'ق': 'قَافْ',
  'ن': 'نُونْ',
};

// Clean non-speech marks: Ayah end (۝), stop signs (ۖ ۗ ۚ ۛ ۜ ۞), Arabic/Western numbers
const NON_SPEECH_MARKS = /[\u06DD\u06D6-\u06ED\u0600-\u06050-9\u0660-\u0669]/g;
const ZERO_WIDTH_CHARS = /[\u200B-\u200F\u202A-\u202E\uFEFF]/g;

/**
 * Prepares Arabic text for speech synthesis:
 * - Checks isolated single letters & Muqatta'at
 * - Strips aya numbers, stop signs, and invisible characters
 * - Preserves essential diacritics (harakat/tajwid) for accurate pronunciation
 *
 * @param {string} text
 * @returns {string} Clean phonetic Arabic string
 */
export function cleanForArabicTTS(text) {
  if (!text || typeof text !== 'string') return '';

  const trimmed = text.trim();

  // Strip tatweel first for mapping check
  const withoutTatweel = trimmed.replace(/\u0640/g, '');

  // 1. Check if it's a known Muqatta'ah
  if (MUQATTAAT_MAP[trimmed]) return MUQATTAAT_MAP[trimmed];
  if (MUQATTAAT_MAP[withoutTatweel]) return MUQATTAAT_MAP[withoutTatweel];

  // 2. Check if it's an isolated single letter without harakat
  if (ISOLATED_LETTERS_MAP[withoutTatweel]) {
    return ISOLATED_LETTERS_MAP[withoutTatweel];
  }

  // 3. Clean up non-speech symbols while keeping harakat
  return trimmed
    .replace(NON_SPEECH_MARKS, '')
    .replace(ZERO_WIDTH_CHARS, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Finds the best available Arabic voice in the browser.
 * @returns {SpeechSynthesisVoice | null}
 */
export function getArabicVoice() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;

  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  // Prefer Arabic voices (ar-SA, ar-EG, ar-AE, etc.)
  const arabicVoices = voices.filter(
    (v) => v.lang && v.lang.toLowerCase().startsWith('ar')
  );

  if (arabicVoices.length === 0) {
    // Some browsers name it "Arabic" or similar
    return voices.find((v) => /arabic/i.test(v.name)) || null;
  }

  // Prefer Saudi Arabic (ar-SA) or standard Arabic
  const saudiVoice = arabicVoices.find((v) => /ar-sa/i.test(v.lang));
  if (saudiVoice) return saudiVoice;

  return arabicVoices[0];
}

/**
 * Checks whether the browser supports SpeechSynthesis.
 * @returns {boolean}
 */
export function isSpeechSynthesisSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}

/**
 * Plays Arabic speech synthesis for the specified text.
 *
 * @param {string} text - Arabic text or letter snippet
 * @param {object} options
 * @param {number} [options.rate=1.0] - Speed: 0.5 to 1.5
 * @param {number} [options.pitch=1.0] - Pitch: 0.8 to 1.2
 * @param {function} [options.onStart] - Callback when speech starts
 * @param {function} [options.onEnd] - Callback when speech finishes
 * @param {function} [options.onError] - Callback on error
 * @returns {function} Function to cancel speech
 */
export function speakArabic(text, options = {}) {
  const { rate = 1.0, pitch = 1.0, onStart, onEnd, onError } = options;

  if (!isSpeechSynthesisSupported()) {
    console.warn('SpeechSynthesis is not supported in this browser.');
    onError?.(new Error('SpeechSynthesis not supported'));
    return () => {};
  }

  const cleanedText = cleanForArabicTTS(text);
  if (!cleanedText) {
    onEnd?.();
    return () => {};
  }

  // Stop any active utterance first
  stopArabicSpeech();

  const UtteranceClass = (typeof window !== 'undefined' && window.SpeechSynthesisUtterance) || (typeof SpeechSynthesisUtterance !== 'undefined' ? SpeechSynthesisUtterance : null);
  if (!UtteranceClass) {
    onError?.(new Error('SpeechSynthesisUtterance not available'));
    return () => {};
  }

  const utterance = new UtteranceClass(cleanedText);
  utterance.rate = Math.max(0.5, Math.min(1.8, rate));
  utterance.pitch = Math.max(0.5, Math.min(1.5, pitch));
  utterance.lang = 'ar-SA';

  const voice = getArabicVoice();
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  }

  utterance.onstart = () => {
    onStart?.();
  };

  utterance.onend = () => {
    onEnd?.();
  };

  utterance.onerror = (e) => {
    console.warn('SpeechSynthesis error:', e);
    onError?.(e);
  };

  window.speechSynthesis.speak(utterance);

  return stopArabicSpeech;
}

/**
 * Immediately cancels any ongoing speech synthesis.
 */
export function stopArabicSpeech() {
  if (isSpeechSynthesisSupported()) {
    window.speechSynthesis.cancel();
  }
}
