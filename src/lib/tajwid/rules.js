/**
 * src/lib/tajwid/rules.js
 * Comprehensive mapping of Tajweed rule classes from Quran.com data to Indonesian metadata,
 * color tokens meeting WCAG AA contrast on light (#FAF7F0/white) and dark (#121816/#1B2420) themes.
 *
 * NOTE: Penjelasan hukum tajwid dalam modul ini wajib ditinjau ulang (tashih) oleh guru tahsin/tahfidz bersertifikasi
 * sebelum digunakan dalam rujukan fatwa atau kurikulum resmi.
 */

export const TAJWEED_RULES = {
  ham_wasl: {
    id: 'ham_wasl',
    labelId: 'Hamzah Wasl',
    family: 'hamzah',
    explanationId: 'Hamzah yang hanya dibaca bila berada di awal bacaan (ibtida), dan gugur (tidak dibaca) jika disambung dari kata sebelumnya.',
    colorLight: '#475569', // Slate-600 (contrast ~7:1)
    colorDark: '#94A3B8',  // Slate-400
  },
  laam_shamsiyah: {
    id: 'laam_shamsiyah',
    labelId: 'Idgham Syamsiyyah (Alif Lam Syamsiyyah)',
    family: 'idgham',
    explanationId: 'Alif lam bertemu salah satu dari 14 huruf syamsiyyah. Huruf lam tidak dibaca dan dileburkan ke huruf sesudahnya dengan tasydid.',
    colorLight: '#0369A1', // Sky-700
    colorDark: '#38BDF8',  // Sky-400
  },
  madda_normal: {
    id: 'madda_normal',
    labelId: "Mad Thabi'i (Mad Asli)",
    family: 'madd',
    explanationId: 'Pemanjangan suara huruf hijaiyah selama 2 harakat (1 alif) karena bertemu huruf mad (alif, wawu, ya sukun) tanpa sebab hamzah atau sukun.',
    colorLight: '#B45309', // Amber-700
    colorDark: '#FBBF24',  // Amber-400
  },
  madda_permissible: {
    id: 'madda_permissible',
    labelId: "Mad Ja'iz Munfashil / Mad 'Aridh Lissukun",
    family: 'madd',
    explanationId: "Mad thabi'i bertemu hamzah di kata yang terpisah, atau berhenti sebelum huruf berharakat. Dibaca panjang 2, 4, atau 6 harakat.",
    colorLight: '#7E22CE', // Purple-700
    colorDark: '#C084FC',  // Purple-400
  },
  madda_necessary: {
    id: 'madda_necessary',
    labelId: 'Mad Lazim',
    family: 'madd',
    explanationId: 'Mad yang wajib dipanjangkan 6 harakat secara konsisten karena setelah huruf mad terdapat sukun asli atau tasydid.',
    colorLight: '#BE123C', // Rose-700
    colorDark: '#FB7185',  // Rose-400
  },
  madda_obligatory: {
    id: 'madda_obligatory',
    labelId: 'Mad Wajib Muttashil',
    family: 'madd',
    explanationId: 'Huruf mad bertemu hamzah dalam satu kata yang sama. Wajib dipanjangkan 4 sampai 5 harakat.',
    colorLight: '#B91C1C', // Red-700
    colorDark: '#F87171',  // Red-400
  },
  qalaqah: {
    id: 'qalaqah',
    labelId: 'Qalqalah',
    family: 'qalqalah',
    explanationId: 'Memantulkan bunyi huruf qalqalah (ق, ط, ب, ج, د) yang berharakat sukun (asli atau karena waqaf).',
    colorLight: '#0284C7', // Light Blue / Sky
    colorDark: '#60A5FA',  // Blue-400
  },
  ikhafa: {
    id: 'ikhafa',
    labelId: 'Ikhfa Haqiqi',
    family: 'ikhfa',
    explanationId: 'Nun sukun atau tanwin bertemu salah satu dari 15 huruf ikhfa. Dibaca samar antara idzhar dan idgham disertai dengung (ghunnah).',
    colorLight: '#0D9488', // Teal-600
    colorDark: '#2DD4BF',  // Teal-400
  },
  ikhafa_shafawi: {
    id: 'ikhafa_shafawi',
    labelId: 'Ikhfa Syafawi',
    family: 'ikhfa',
    explanationId: 'Mim sukun bertemu huruf Ba (ب). Bunyi mim dibaca samar di bibir disertai ghunnah (dengung).',
    colorLight: '#0F766E', // Teal-700
    colorDark: '#5EEAD4',  // Teal-300
  },
  idgham_ghunnah: {
    id: 'idgham_ghunnah',
    labelId: 'Idgham Bighunnah',
    family: 'idgham',
    explanationId: 'Nun sukun atau tanwin bertemu salah satu huruf Yanmu (ي, ن, م, و). Dileburkan secara penuh disertai dengung.',
    colorLight: '#15803D', // Green-700
    colorDark: '#4ADE80',  // Green-400
  },
  idgham_wo_ghunnah: {
    id: 'idgham_wo_ghunnah',
    labelId: 'Idgham Bilaghunnah',
    family: 'idgham',
    explanationId: 'Nun sukun atau tanwin bertemu huruf Lam (ل) atau Ra (ر). Dileburkan secara penuh tanpa dengung.',
    colorLight: '#4D7C0F', // Lime-700
    colorDark: '#A3E635',  // Lime-400
  },
  idgham_mutajanisayn: {
    id: 'idgham_mutajanisayn',
    labelId: 'Idgham Mutajanisain',
    family: 'idgham',
    explanationId: 'Dua huruf yang sama makhraj tetapi beda sifat bertemu (huruf pertama sukun), melebur ke huruf kedua.',
    colorLight: '#166534', // Emerald-800
    colorDark: '#86EFAC',  // Emerald-300
  },
  idgham_mutaqaribayn: {
    id: 'idgham_mutaqaribayn',
    labelId: 'Idgham Mutaqaribain',
    family: 'idgham',
    explanationId: 'Dua huruf yang berdekatan makhraj dan sifatnya bertemu (mis. Qaf sukun bertemu Kaf), melebur ke huruf kedua.',
    colorLight: '#14532D', // Green-900
    colorDark: '#BBF7D0',  // Green-200
  },
  idgham_shafawi: {
    id: 'idgham_shafawi',
    labelId: 'Idgham Syafawi / Mimi',
    family: 'idgham',
    explanationId: 'Mim sukun bertemu huruf Mim berharakat. Dileburkan menjadi satu mim bertasydid disertai dengung.',
    colorLight: '#047857', // Emerald-700
    colorDark: '#6EE7B7',  // Emerald-300
  },
  iqlab: {
    id: 'iqlab',
    labelId: 'Iqlab',
    family: 'iqlab',
    explanationId: 'Nun sukun atau tanwin bertemu huruf Ba (ب). Bunyi nun/tanwin berubah menjadi bunyi mim samar disertai dengung.',
    colorLight: '#1D4ED8', // Blue-700
    colorDark: '#93C5FD',  // Blue-300
  },
  ghunnah: {
    id: 'ghunnah',
    labelId: 'Ghunnah Musyaddadah',
    family: 'ghunnah',
    explanationId: 'Huruf Nun atau Mim yang memiliki harakat tasydid asli (نّ, مّ). Wajib dibaca dengung 2 sampai 3 harakat.',
    colorLight: '#A16207', // Yellow-700
    colorDark: '#FDE047',  // Yellow-300
  },
  slnt: {
    id: 'slnt',
    labelId: 'Huruf Tidak Berbunyi (Silent)',
    family: 'waqaf',
    explanationId: 'Huruf yang tertulis dalam rasm mushaf tetapi tidak dilafalkan saat membaca.',
    colorLight: '#64748B', // Slate-500
    colorDark: '#94A3B8',  // Slate-400
  },
  end: {
    id: 'end',
    labelId: 'Tanda Akhir Ayat',
    family: 'waqaf',
    explanationId: 'Nomor penutup ayat pada mushaf.',
    colorLight: '#1F5F4A',
    colorDark: '#5DB899',
  },
};

/**
 * Returns rule object by rule id, or null if unstyled.
 */
export function getTajweedRule(ruleId) {
  if (!ruleId) return null;
  return TAJWEED_RULES[ruleId] || null;
}
