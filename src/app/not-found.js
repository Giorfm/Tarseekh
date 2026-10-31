import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-brand-bg dark:bg-brand-dark-bg text-brand-charcoal dark:text-gray-100 text-center space-y-4">
      <div className="w-14 h-14 rounded-2xl bg-brand-primary/10 dark:bg-brand-dark-primary/10 text-brand-primary dark:text-brand-dark-primary font-bold text-2xl flex items-center justify-center mx-auto shadow-sm">
        404
      </div>
      <h1 className="text-2xl font-bold tracking-tight">Halaman Tidak Ditemukan</h1>
      <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm">
        Halaman atau surah yang Anda cari tidak tersedia. Silakan periksa kembali tautan Anda.
      </p>
      <Link
        href="/"
        className="px-5 py-2.5 rounded-xl bg-brand-primary dark:bg-brand-dark-primary text-white dark:text-brand-dark-bg text-xs font-semibold shadow-xs hover:opacity-95 transition-opacity"
      >
        Kembali ke Beranda
      </Link>
    </div>
  );
}
