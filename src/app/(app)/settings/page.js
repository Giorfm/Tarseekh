'use client';

import React from 'react';
import { useSettings } from '@/context/SettingsContext';
import { Sun, Moon, Type, Globe, Check } from 'lucide-react';

export default function SettingsPage() {
  const { settings, updateSettings, toggleTheme } = useSettings();

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 md:py-8 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-brand-charcoal dark:text-white">Pengaturan</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Sesuaikan preferensi tampilan dan pembacaan mushaf Anda.
        </p>
      </div>

      <div className="space-y-4">
        {/* 1. Tampilan Mode Baca Default */}
        <section className="bg-white dark:bg-brand-dark-surface p-5 rounded-2xl border border-emerald-950/10 dark:border-white/10 space-y-3">
          <h2 className="text-sm font-bold text-brand-charcoal dark:text-white">
            Tampilan Pembaca Default
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => updateSettings({ reading_view: 'ayat' })}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                settings.reading_view === 'ayat'
                  ? 'border-brand-primary bg-brand-primary/5 dark:bg-brand-dark-primary/10 text-brand-primary dark:text-brand-dark-primary font-semibold'
                  : 'border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm">Per Ayat</span>
                {settings.reading_view === 'ayat' && <Check className="w-4 h-4" />}
              </div>
              <p className="text-[11px] text-gray-400 font-normal mt-1">
                Satu ayat per blok. Ideal untuk tadabbur dan tanya AI.
              </p>
            </button>

            <button
              onClick={() => updateSettings({ reading_view: 'halaman' })}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                settings.reading_view === 'halaman'
                  ? 'border-brand-primary bg-brand-primary/5 dark:bg-brand-dark-primary/10 text-brand-primary dark:text-brand-dark-primary font-semibold'
                  : 'border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm">Per Halaman</span>
                {settings.reading_view === 'halaman' && <Check className="w-4 h-4" />}
              </div>
              <p className="text-[11px] text-gray-400 font-normal mt-1">
                Format 15 baris mushaf Madinah klasik (604 halaman).
              </p>
            </button>
          </div>
        </section>

        {/* 2. Ukuran Font & Pratinjau */}
        <section className="bg-white dark:bg-brand-dark-surface p-5 rounded-2xl border border-emerald-950/10 dark:border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-brand-charcoal dark:text-white">
                Ukuran Huruf Al-Qur&apos;an
              </h2>
              <p className="text-xs text-gray-400">Sesuaikan kenyamanan membaca teks Arab</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-black/5 dark:bg-white/5">
              {Math.round(settings.font_scale * 16)}px
            </span>
          </div>

          <input
            type="range"
            min="1.25"
            max="2.5"
            step="0.125"
            value={settings.font_scale}
            onChange={(e) => updateSettings({ font_scale: parseFloat(e.target.value) })}
            className="w-full accent-brand-primary cursor-pointer"
            aria-label="Penggeser ukuran font"
          />

          {/* Pratinjau Teks Arab */}
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-white/5 text-center">
            <span className="text-xs text-gray-400 block mb-2 font-sans">Pratinjau:</span>
            <p className="font-quran" dir="rtl">
              بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
            </p>
          </div>
        </section>

        {/* 3. Preferensi Konten (Terjemahan & Tajwid) */}
        <section className="bg-white dark:bg-brand-dark-surface p-5 rounded-2xl border border-emerald-950/10 dark:border-white/10 divide-y divide-gray-100 dark:divide-white/5">
          <div className="flex items-center justify-between py-3">
            <div>
              <h3 className="text-sm font-medium text-brand-charcoal dark:text-white">
                Tampilkan Terjemahan
              </h3>
              <p className="text-xs text-gray-400">Terjemahan resmi Kemenag RI di bawah ayat</p>
            </div>
            <button
              onClick={() => updateSettings({ show_translation: !settings.show_translation })}
              role="switch"
              aria-checked={settings.show_translation}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                settings.show_translation ? 'bg-brand-primary' : 'bg-gray-300 dark:bg-gray-700'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  settings.show_translation ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <h3 className="text-sm font-medium text-brand-charcoal dark:text-white">
                Pewarnaan Tajwid
              </h3>
              <p className="text-xs text-gray-400">Beri warna pada hukum tajwid saat membaca</p>
            </div>
            <button
              onClick={() => updateSettings({ show_tajwid: !settings.show_tajwid })}
              role="switch"
              aria-checked={settings.show_tajwid}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                settings.show_tajwid ? 'bg-brand-primary' : 'bg-gray-300 dark:bg-gray-700'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  settings.show_tajwid ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <h3 className="text-sm font-medium text-brand-charcoal dark:text-white">
                Tema Gelap
              </h3>
              <p className="text-xs text-gray-400">Mode malam hemat daya dan ramah mata</p>
            </div>
            <button
              onClick={toggleTheme}
              role="switch"
              aria-checked={settings.theme === 'dark'}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                settings.theme === 'dark' ? 'bg-brand-primary dark:bg-brand-dark-primary' : 'bg-gray-300'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  settings.theme === 'dark' ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </section>

        {/* 4. Target Harian & Zona Waktu */}
        <section className="bg-white dark:bg-brand-dark-surface p-5 rounded-2xl border border-emerald-950/10 dark:border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-brand-charcoal dark:text-white">
                Target Harian Tilawah
              </h2>
              <p className="text-xs text-gray-400">Jumlah ayat minimum untuk quest harian</p>
            </div>
            <select
              value={settings.daily_goal_ayah}
              onChange={(e) => updateSettings({ daily_goal_ayah: parseInt(e.target.value, 10) })}
              className="p-2 rounded-xl bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 text-xs font-semibold"
            >
              <option value="3">3 Ayat</option>
              <option value="5">5 Ayat</option>
              <option value="10">10 Ayat</option>
              <option value="20">20 Ayat</option>
            </select>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-white/5">
            <div>
              <h2 className="text-sm font-medium text-brand-charcoal dark:text-white">
                Zona Waktu
              </h2>
              <p className="text-xs text-gray-400">Digunakan untuk reset harian streak & quest</p>
            </div>
            <span className="text-xs text-gray-500 font-mono bg-black/5 dark:bg-white/5 px-2.5 py-1 rounded-lg">
              {settings.timezone}
            </span>
          </div>
        </section>

        {/* 5. Akun & Sinkronisasi Cloud (PRD FR-8) */}
        <section className="bg-white dark:bg-brand-dark-surface p-5 rounded-2xl border border-emerald-950/10 dark:border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-brand-charcoal dark:text-white">
                Akun & Sinkronisasi Cloud
              </h2>
              <p className="text-xs text-gray-400">
                Masuk untuk mencadangkan streak, quest, dan riwayat hafalan ke server
              </p>
            </div>
            <a
              href="/login"
              className="px-4 py-2 rounded-xl bg-brand-primary dark:bg-brand-dark-primary text-white dark:text-brand-dark-bg font-semibold text-xs shadow-xs hover:opacity-95 transition-opacity inline-flex items-center gap-1.5"
            >
              <span>Masuk / Sinkron</span>
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
