/**
 * src/lib/speech/tracker.js
 * SpeechTracker wrapping Web Speech API (SpeechRecognition / webkitSpeechRecognition).
 * Target language: ar-SA (Arabic Saudi Arabia).
 * Features:
 * - Continuous recognition with interim results
 * - Automatic restart on silent dropouts while active
 * - Error categorization (not-allowed, no-speech, network, unsupported)
 * - User privacy consent management
 */

const CONSENT_KEY = 'tarseekh_speech_consent_v1';
const LEGACY_CONSENT_KEY = 'tadabbur_speech_consent_v1';

export function isSpeechSupported() {
  if (typeof window === 'undefined') return false;
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function hasSpeechConsent() {
  if (typeof window === 'undefined') return false;
  try {
    return (
      localStorage.getItem(CONSENT_KEY) === 'granted' ||
      localStorage.getItem(LEGACY_CONSENT_KEY) === 'granted'
    );
  } catch {
    return false;
  }
}

export function grantSpeechConsent() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CONSENT_KEY, 'granted');
  } catch {}
}

export class SpeechTracker {
  constructor({ onResult, onError, onStatusChange }) {
    this.onResult = onResult || (() => {});
    this.onError = onError || (() => {});
    this.onStatusChange = onStatusChange || (() => {});

    this.recognition = null;
    this.isActive = false;
    this.restartTimeout = null;
  }

  start() {
    if (!isSpeechSupported()) {
      this.onError('unsupported', 'Peramban ini tidak mendukung pengenalan suara (Web Speech API). Gunakan Google Chrome.');
      return false;
    }

    if (this.isActive) return true;

    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.recognition.lang = 'ar-SA';
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 1;

      this.recognition.onstart = () => {
        this.isActive = true;
        this.onStatusChange(true);
      };

      this.recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const item = event.results[i];
          const text = item[0].transcript;
          if (item.isFinal) {
            finalTranscript += text + ' ';
          } else {
            interimTranscript += text;
          }
        }

        const combined = (finalTranscript + interimTranscript).trim();
        if (combined) {
          this.onResult(combined, Boolean(finalTranscript));
        }
      };

      this.recognition.onerror = (event) => {
        const err = event.error;
        if (err === 'no-speech') {
          // Expected when silent, do not stop
          return;
        }

        if (err === 'not-allowed' || err === 'service-not-allowed') {
          this.isActive = false;
          this.onError('not-allowed', 'Izin mikrofon ditolak. Berikan izin mikrofon di pengaturan browser untuk melacak bacaan.');
          this.onStatusChange(false);
          return;
        }

        if (err === 'network') {
          this.onError('network', 'Terjadi gangguan jaringan pada layanan suara browser.');
          return;
        }

        this.onError(err, `Gagal mengenali suara: ${err}`);
      };

      this.recognition.onend = () => {
        // Auto-restart if still active
        if (this.isActive) {
          clearTimeout(this.restartTimeout);
          this.restartTimeout = setTimeout(() => {
            if (this.isActive) {
              try {
                this.recognition.start();
              } catch {}
            }
          }, 300);
        } else {
          this.onStatusChange(false);
        }
      };

      this.recognition.start();
      return true;
    } catch (e) {
      this.isActive = false;
      this.onError('start-failed', e.message);
      this.onStatusChange(false);
      return false;
    }
  }

  stop() {
    this.isActive = false;
    clearTimeout(this.restartTimeout);
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {}
    }
    this.onStatusChange(false);
  }
}
