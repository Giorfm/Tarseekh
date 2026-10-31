import {
  Sparkles,
  Users,
  Footprints,
  Mountain,
  Moon,
  Sun,
  Coins,
  Eye,
  Hash,
  Sunrise,
  Hourglass,
  Award,
  ScrollText,
} from 'lucide-react';

// Maps the `icon` string in kisah JSON to a Lucide component (keeps data free of UI imports)
export const KISAH_ICONS = {
  sparkles: Sparkles,
  users: Users,
  footprints: Footprints,
  mountain: Mountain,
  moon: Moon,
  sun: Sun,
  coins: Coins,
  eye: Eye,
  hash: Hash,
  sunrise: Sunrise,
  hourglass: Hourglass,
  award: Award,
};

export function getKisahIcon(name) {
  return KISAH_ICONS[name] || ScrollText;
}

// Content classification tags shown on every content block
export const KISAH_TAGS = {
  quran: {
    label: "Al-Qur'an",
    description: "Pernyataan eksplisit Al-Qur'an",
    className: 'bg-brand-primary/10 text-brand-primary dark:bg-brand-dark-primary/15 dark:text-brand-dark-primary',
  },
  hadith: {
    label: 'Hadis Shahih',
    description: 'Hadis dengan sanad shahih',
    className: 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300',
  },
  tafsir: {
    label: 'Penafsiran Ulama',
    description: 'Penjelasan para mufasir, bukan teks ayat',
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
  },
  sejarah: {
    label: 'Riwayat Sejarah',
    description: 'Keterangan ahli sejarah, bukan dari Al-Qur\'an atau hadis shahih',
    className: 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300',
  },
  diperselisihkan: {
    label: 'Diperselisihkan',
    description: 'Riwayat atau pendapat yang belum pasti',
    className: 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300',
  },
};
