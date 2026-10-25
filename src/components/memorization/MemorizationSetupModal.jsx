'use client';

import React, { useState } from 'react';
import { X, Sparkles, EyeOff, Check } from 'lucide-react';

const LEVELS = [
  { id: 'all', title: 'Sembunyikan Semua (100%)', desc: 'Seluruh kata disembunyikan. Uji hafalan penuh.' },
  { id: 'percent_70', title: 'Sembunyikan 70%', desc: '70% kata disamarkan secara acak.' },
  { id: 'percent_50', title: 'Sembunyikan 50%', desc: 'Setengah kata disamarkan secara bergantian.' },
  { id: 'percent_30', title: 'Sembunyikan 30%', desc: 'Sebagian kecil kata disamarkan untuk latihan awal.' },
  { id: 'first_letter', title: 'Bantuan Huruf Pertama', desc: 'Huruf pertama tiap kata tetap terlihat sebagai pemandu.' },
];

export function MemorizationSetupModal({ isOpen, onClose, onStart, versesCount = 7, currentAyah = 1 }) {
  const [level, setLevel] = useState('all');
  const [startAyah, setStartAyah] = useState(currentAyah || 1);
  const [endAyah, setEndAyah] = useState(Math.min(versesCount, (currentAyah || 1) + 4));

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onStart({
      level,
      startAyah: parseInt(startAyah, 10),
      endAyah: parseInt(endAyah, 10),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-md bg-white dark:bg-brand-dark-surface rounded-3xl p-5 border border-emerald-950/10 dark:border-white/10 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-brand-charcoal dark:text-white">
                Pengaturan Mode Hafalan
              </h3>
              <p className="text-[11px] text-gray-400">Pilih tingkat penyamaran kata & rentang ayat</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-gray-400"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Rentang Ayat */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Rentang Ayat
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[11px] text-gray-400 block mb-1">Dari Ayat</span>
                <input
                  type="number"
                  min="1"
                  max={versesCount}
                  value={startAyah}
                  onChange={(e) => setStartAyah(Math.min(versesCount, Math.max(1, parseInt(e.target.value, 10) || 1)))}
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 text-xs font-semibold"
                />
              </div>
              <div>
                <span className="text-[11px] text-gray-400 block mb-1">Sampai Ayat</span>
                <input
                  type="number"
                  min={startAyah}
                  max={versesCount}
                  value={endAyah}
                  onChange={(e) => setEndAyah(Math.min(versesCount, Math.max(startAyah, parseInt(e.target.value, 10) || startAyah)))}
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 text-xs font-semibold"
                />
              </div>
            </div>
          </div>

          {/* Level Pilihan */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Tingkat Penyamaran
            </label>
            <div className="space-y-2">
              {LEVELS.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setLevel(item.id)}
                  className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                    level === item.id
                      ? 'border-brand-primary bg-brand-primary/5 dark:bg-brand-dark-primary/10 text-brand-primary dark:text-brand-dark-primary'
                      : 'border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">{item.title}</span>
                    {level === item.id && <Check className="w-4 h-4 text-brand-primary dark:text-brand-dark-primary" />}
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-brand-primary dark:bg-brand-dark-primary text-white dark:text-brand-dark-bg text-xs font-bold shadow-xs hover:opacity-95 transition-opacity"
          >
            Mulai Latihan Hafalan
          </button>
        </form>
      </div>
    </div>
  );
}
