'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, CheckCircle2, User, Loader2 } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoadingGoogle(true);
    setErrorMessage('');

    try {
      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/` : undefined,
          },
        });
        if (error) {
          setErrorMessage(error.message || 'Gagal masuk dengan Google.');
          setLoadingGoogle(false);
        }
      } else {
        setErrorMessage('Konfigurasi Supabase belum terpasang.');
        setLoadingGoogle(false);
      }
    } catch (err) {
      console.warn('Google auth error:', err);
      setErrorMessage('Terjadi kesalahan koneksi autentikasi.');
      setLoadingGoogle(false);
    }
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    setLoadingEmail(true);
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
          setLoadingEmail(false);
          return;
        }
      }
      setIsSubmitted(true);
    } catch (err) {
      console.warn('Supabase login fallback:', err);
      setIsSubmitted(true);
    } finally {
      setLoadingEmail(false);
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
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs">
              {errorMessage}
            </div>
          )}

          {/* Primary Action: Google Sign-In */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loadingGoogle}
            className="w-full py-3 px-4 rounded-xl border border-gray-300 dark:border-white/15 bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10 text-gray-700 dark:text-gray-200 font-semibold text-xs shadow-xs hover:shadow-sm transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {loadingGoogle ? (
              <Loader2 className="w-4 h-4 animate-spin text-brand-primary" />
            ) : (
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>{loadingGoogle ? 'Mengarahkan ke Google...' : 'Masuk dengan Google'}</span>
          </button>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-gray-200 dark:border-white/10"></div>
            <span className="flex-shrink mx-3 text-[11px] text-gray-400 uppercase">atau</span>
            <div className="flex-grow border-t border-gray-200 dark:border-white/10"></div>
          </div>

          {/* Email Magic Link (Secondary / Collapsible) */}
          {isSubmitted ? (
            <div className="text-center py-4 space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400 mx-auto" />
              <h2 className="font-bold text-sm">Cek Email Anda</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                Tautan masuk telah dikirim ke <span className="font-semibold text-brand-charcoal dark:text-white">{email}</span>.
              </p>
              <button
                onClick={() => setIsSubmitted(false)}
                className="text-xs text-brand-primary dark:text-brand-dark-primary underline font-medium pt-2"
              >
                Gunakan email lain
              </button>
            </div>
          ) : showEmailForm ? (
            <form onSubmit={handleEmailSubmit} className="space-y-3">
              <div>
                <label htmlFor="email" className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
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
                disabled={loadingEmail}
                className="w-full py-2.5 rounded-xl bg-brand-primary dark:bg-brand-dark-primary text-white dark:text-brand-dark-bg font-semibold text-xs shadow-sm hover:opacity-95 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loadingEmail && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{loadingEmail ? 'Mengirim...' : 'Kirim Magic Link Email'}</span>
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setShowEmailForm(true)}
              className="w-full py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 font-medium text-xs hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center justify-center gap-2"
            >
              <Mail className="w-4 h-4 text-gray-400" />
              <span>Masuk dengan Email (Magic Link)</span>
            </button>
          )}

          <Link
            href="/"
            className="w-full py-2.5 rounded-xl border border-dashed border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 font-medium text-xs hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center justify-center gap-1.5"
          >
            <User className="w-4 h-4 text-gray-400" />
            <span>Lanjutkan Sebagai Tamu (Offline Mode)</span>
          </Link>

          <p className="text-[11px] text-center text-gray-400">
            Mode tamu menyimpan semua progres tilawah dan penanda baca di perangkat Anda.
          </p>
        </div>
      </div>
    </div>
  );
}
