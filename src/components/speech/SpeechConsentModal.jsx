'use client';

import React from 'react';
import { Mic, ShieldCheck, X } from 'lucide-react';
import { grantSpeechConsent } from '@/lib/speech/tracker';

export function SpeechConsentModal({ isOpen, onAccept, onClose }) {
  if (!isOpen) return null;

  const handleAccept = () => {
    grantSpeechConsent();
    onAccept();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-sm bg-white dark:bg-brand-dark-surface rounded-3xl p-5 border border-emerald-950/10 dark:border-white/10 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-brand-primary/10 text-brand-primary dark:text-brand-dark-primary flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-brand-charcoal dark:text-white">
              Pemberitahuan Privasi Suara
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-gray-400"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="text-xs text-gray-600 dark:text-gray-300 space-y-2.5 leading-relaxed">
          <p>
            Fitur <strong>Pelacak Bacaan Suara</strong> menggunakan Web Speech API bawaan peramban Anda untuk mengenali lafal ayat secara otomatis.
          </p>
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 text-[11px] text-emerald-900 dark:text-emerald-200">
            🔒 <strong>Privasi Aman:</strong> Rekaman suara Anda <strong>tidak pernah dikirim atau disimpan</strong> di server Tarseekh.
          </div>
          <p className="text-[11px] text-gray-400">
            Peramban tertentu (seperti Google Chrome) dapat memproses suara melalui layanan pengenalan suara pihak penyedia peramban untuk menghasilkan transkrip teks.
          </p>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-black/5 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleAccept}
            className="flex-1 py-2.5 rounded-xl bg-brand-primary dark:bg-brand-dark-primary text-white dark:text-brand-dark-bg text-xs font-bold shadow-xs hover:opacity-95 transition-opacity flex items-center justify-center gap-1.5"
          >
            <Mic className="w-4 h-4" />
            <span>Izinkan & Lanjut</span>
          </button>
        </div>
      </div>
    </div>
  );
}
