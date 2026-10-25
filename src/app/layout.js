import { Amiri_Quran, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { SettingsProvider } from '@/context/SettingsContext';
import { ServiceWorkerRegister } from '@/components/layout/ServiceWorkerRegister';

const amiriQuran = Amiri_Quran({
  weight: '400',
  subsets: ['arabic'],
  variable: '--font-amiri-quran',
  display: 'swap',
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta',
  display: 'swap',
});

export const metadata = {
  title: "Tarseekh - Meneguhkan & Menancapkan Al-Qur'an",
  description: "Aplikasi Al-Qur'an responsif dengan peneguh hafalan (Tarseekh), pemahaman makna berbasis AI grounded tafsir, pelacak suara, dan mushaf Madinah 15 baris.",
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/icons/icon.svg',
    apple: '/icons/icon.svg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Tarseekh',
  },
};

export const viewport = {
  themeColor: '#1F5F4A',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" className={`${amiriQuran.variable} ${plusJakarta.variable}`}>
      <body className="bg-brand-bg text-brand-charcoal dark:bg-brand-dark-bg dark:text-gray-100 transition-colors duration-200">
        <SettingsProvider>
          <ServiceWorkerRegister />
          {children}
        </SettingsProvider>
      </body>
    </html>
  );
}
