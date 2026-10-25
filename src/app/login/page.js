'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, CheckCircle2, User, Loader2 } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setErrorMessage('');

    try {
      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/` : undefined,
          },
        });
        if (error) {
          setErrorMessage(error.message || 'Gagal mengirim magic link. Silakan coba lagi.');
          setLoading(false);
          return;
        }
      }
      setIsSubmitted(true);
    } catch (err) {
      console.warn('Supabase login fallback:', err);
      setIsSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 bg-brand-bg dark:bg-brand-dark-bg text-brand-charcoal dark:text-gray-100">
      <div className="w-full max-w-sm space-y-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-brand-primary dark:hover:text-brand-dark-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Beranda</span>
        </Link>

        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-brand-primary dark:bg-brand-dark-primary text-white font-bold text-2xl flex items-center justify-center mx-auto shadow-sm">
            ت
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Masuk ke Tarseekh</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Simpan kemajuan tilawah, sinkronisasi hafalan, dan lanjutkan belajar dari perangkat mana saja.
          </p>
        </div>

        <div className="bg-white dark:bg-brand-dark-surface p-6 rounded-3xl border border-emerald-950/10 dark:border-white/10 shadow-sm space-y-4">
          {isSubmitted ? (
            <div className="text-center py-4 space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400 mx-auto" />
              <h2 className="font-bold text-sm">Cek Email Anda</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                Tautan masuk (magic link) telah dikirim ke <span className="font-semibold text-brand-charcoal dark:text-white">{email}</span>. Klik tautan tersebut untuk masuk otomatis.
              </p>
              <button
                onClick={() => setIsSubmitted(false)}
                className="text-xs text-brand-primary dark:text-brand-dark-primary underline font-medium pt-2"
              >
                Gunakan email lain
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMessage && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs">
                  {errorMessage}
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-xs font-semibold mb-1.5 text-gray-700 dark:text-gray-300">
                  Alamat Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@email.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-brand-primary dark:bg-brand-dark-primary text-white dark:text-brand-dark-bg font-semibold text-sm shadow-sm hover:opacity-95 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{loading ? 'Mengirim...' : 'Kirim Magic Link'}</span>
              </button>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-gray-200 dark:border-white/10"></div>
                <span className="flex-shrink mx-3 text-[11px] text-gray-400 uppercase">atau</span>
                <div className="flex-grow border-t border-gray-200 dark:border-white/10"></div>
              </div>

              <Link
                href="/"
                className="w-full py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 font-medium text-xs hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center justify-center gap-1.5"
              >
                <User className="w-4 h-4 text-gray-400" />
                <span>Lanjutkan Sebagai Tamu (Offline Mode)</span>
              </Link>

              <p className="text-[11px] text-center text-gray-400">
                Mode tamu menyimpan semua progres tilawah dan hafalan di peramban Anda.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
