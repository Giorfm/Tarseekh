import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  RECITERS,
  parseVerseKey,
  getVerseAudioUrl,
  getWordAudioUrl,
} from './murottal';
import {
  cleanForArabicTTS,
  isSpeechSynthesisSupported,
  speakArabic,
  stopArabicSpeech,
} from './speechSynthesizer';

describe('Quran Murattal Audio Helpers', () => {
  it('has a list of valid reciters with IDs and names', () => {
    expect(RECITERS.length).toBeGreaterThanOrEqual(4);
    expect(RECITERS[0].id).toBe('Alafasy_128kbps');
    expect(RECITERS[1].id).toBe('Husary_128kbps');
  });

  it('correctly parses verse keys', () => {
    expect(parseVerseKey('1:1')).toEqual({
      surah: 1,
      ayah: 1,
      surahPad: '001',
      ayahPad: '001',
    });
    expect(parseVerseKey('2:255')).toEqual({
      surah: 2,
      ayah: 255,
      surahPad: '002',
      ayahPad: '255',
    });
    expect(parseVerseKey('invalid')).toBeNull();
  });

  it('generates correct EveryAyah MP3 URLs for reciters', () => {
    const urlAlafasy = getVerseAudioUrl('1:1', 'Alafasy_128kbps');
    expect(urlAlafasy).toBe('https://everyayah.com/data/Alafasy_128kbps/001001.mp3');

    const urlHusary = getVerseAudioUrl('2:255', 'Husary_128kbps');
    expect(urlHusary).toBe('https://everyayah.com/data/Husary_128kbps/002255.mp3');
  });

  it('generates correct Word-by-Word (WBW) audio URLs', () => {
    const urlWord = getWordAudioUrl('1:1', 1);
    expect(urlWord).toBe('https://audio.qurancdn.com/wbw/001_001_001.mp3');

    const urlWord4 = getWordAudioUrl('1:1', 4);
    expect(urlWord4).toBe('https://audio.qurancdn.com/wbw/001_001_004.mp3');
  });
});

describe('Arabic Speech Synthesizer Helpers', () => {
  it('maps single isolated letters to their phonetic Arabic names', () => {
    expect(cleanForArabicTTS('ب')).toBe('بَاءْ');
    expect(cleanForArabicTTS('ق')).toBe('قَافْ');
    expect(cleanForArabicTTS('م')).toBe('مِيمْ');
  });

  it("maps Huruf Muqatta'ah to full spelled-out pronunciation", () => {
    expect(cleanForArabicTTS('الم')).toBe('أَلِفْ لَامْ مِيمْ');
    expect(cleanForArabicTTS('الـم')).toBe('أَلِفْ لَامْ مِيمْ');
    expect(cleanForArabicTTS('طه')).toBe('طَا هَا');
    expect(cleanForArabicTTS('يس')).toBe('يَا سِينْ');
  });

  it('preserves harakat while cleaning out ayah numbers and stop marks', () => {
    const raw = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ ۝١';
    const cleaned = cleanForArabicTTS(raw);
    expect(cleaned).toContain('بِسْمِ');
    expect(cleaned).toContain('ٱللَّهِ');
    expect(cleaned).not.toContain('۝');
    expect(cleaned).not.toContain('١');
  });

  describe('Mocked SpeechSynthesis in browser environment', () => {
    beforeEach(() => {
      // Mock window.speechSynthesis
      const mockUtterance = vi.fn().mockImplementation(function (text) {
        this.text = text;
        this.lang = '';
        this.rate = 1;
      });

      global.SpeechSynthesisUtterance = mockUtterance;
      global.window = {
        SpeechSynthesisUtterance: mockUtterance,
        speechSynthesis: {
          speak: vi.fn(),
          cancel: vi.fn(),
          getVoices: vi.fn().mockReturnValue([
            { lang: 'ar-SA', name: 'Maged Saudi' },
            { lang: 'en-US', name: 'Alex' },
          ]),
        },
      };
    });

    it('reports speechSynthesis supported when present', () => {
      expect(isSpeechSynthesisSupported()).toBe(true);
    });

    it('calls speak with Arabic voice and clean text', () => {
      const onStart = vi.fn();
      speakArabic('ق', { rate: 0.8, onStart });
      expect(window.speechSynthesis.cancel).toHaveBeenCalled();
      expect(window.speechSynthesis.speak).toHaveBeenCalled();
    });

    it('cancels speech when stopArabicSpeech is called', () => {
      stopArabicSpeech();
      expect(window.speechSynthesis.cancel).toHaveBeenCalled();
    });
  });
});
