# Tarseekh (ترسيخ) - Seek the Light, Unfold Insight

> **Tarseekh (ترسيخ):** Proses meneguhkan, mengokohkan, atau menancapkan hafalan dan pemahaman Al-Qur'an secara mendalam ke dalam dada dan ingatan.  
> **Musabaqah Desain Aplikasi Al-Qur'an (DAQ)**  
> Aplikasi web Al-Qur'an responsif (Installable PWA) dengan pengokoh hafalan adaptif (SM-2), pendamping tadabbur berbasis AI tergrounding tafsir, pelacak bacaan suara real-time, dan mushaf Madinah 15 baris.

---

## 🌟 Fitur Utama & Keunggulan

1. **Prinsip "One Word Model, Two Views":**
   - **Tampilan Per Ayat (Default HP):** Satu ayat per blok dengan nomor ayat melingkar, teks Arab Utsmani berukuran besar, dan terjemahan resmi Kemenag RI.
   - **Tampilan Per Halaman (Mushaf Madinah):** Tata letak 604 halaman mushaf Madinah klasik 15 baris per halaman, rata kanan-kiri (justified), header surah/juz, nomor halaman, navigasi geser (*swipe gesture*), dan panah keyboard.
   - **Sinkronisasi Posisi Sempurna:** Berpindah antara tampilan per ayat dan per halaman selalu mempertahankan posisi ayat yang sama tanpa kehilangan konteks.
2. **Mode Tajwid Interaktif (WCAG AA):**
   - Pewarnaan 18 hukum tajwid (Ghunnah, Ikhfa, Idgham, Qalqalah, Mad, dll.) dengan kontras tinggi di mode terang maupun gelap.
   - Ketuk kata/hukum tajwid untuk menampilkan lembar penjelasan ringkas dan contoh lafal.
3. **Tarseekh AI (RAG Grounded Tanpa Halusinasi):**
   - Seleksi teks ayat (1-7 ayat) $\rightarrow$ Popover otomatis muncul $\rightarrow$ "Tanya AI", "Tafsir Ringkas", atau "Simpan Bookmark".
   - Grounded RAG Tier 1 (Tafsir Al-Muyassar & Ibnu Katsir) dan Tier 2 (Pencarian Semantik Tematik dengan pgvector).
   - Menampilkan chip rujukan sumber ayat & tafsir secara transparan.
   - Penolakan tegas dan sopan terhadap pertanyaan fatwa fikih atau di luar Al-Qur'an.
4. **Pelacak Bacaan Suara (Web Speech API `ar-SA`):**
   - Pelacakan kata demi kata secara real-time saat dibacakan dengan *fuzzy matching* (toleran harakat) dan algoritma *lookahead 3-kata* agar tidak macet jika ada kata yang terlewat.
   - Otomatis berpindah halaman pada tampilan mushaf ketika kata terakhir halaman terlewati.
   - Mode manual (*tap-to-advance*) tersedia jika browser tidak memiliki izin mikrofon.
   - Pemberitahuan privasi transparan: suara diproses lokal di peramban, tidak pernah direkam di server.
5. **Mode Hafalan Adaptif & SM-2 Spaced Repetition:**
   - Penyamaran kata bertingkat: Sembunyikan Semua, Persentase (30%/50%/70%), atau Huruf Pertama.
   - Kata tersembunyi bergaris bawah (*underlined mask*) tanpa pergeseran tata letak (*zero layout shift*).
   - Kata otomatis terbuka saat dibacakan dengan benar atau diketuk manual. Tombol petunjuk (*hint*) membuka satu kata berurutan.
   - Penilaian diri di akhir sesi (*Lupa / Ragu / Hafal*) yang menjadwalkan murajaah otomatis dengan algoritma SuperMemo SM-2.
6. **Dashboard & Istiqamah Kebiasaan:**
   - Pelacak *streak* harian berdasarkan zona waktu lokal pengguna (`Intl.DateTimeFormat`) dengan indikator 7 hari terakhir.
   - 3 Quest Harian adaptif: **Baca** (target ayat/halaman), **Latih** (pelacak suara/hafalan), dan **Renungkan** (tanya AI).
   - Kartu "Lanjutkan Membaca" dan notifikasi antrean murajaah jatuh tempo.
7. **PWA Standalone & Offline Ready:**
   - Mendukung instalasi di Android, iOS, dan Desktop dengan Service Worker caching data statis, surah, dan halaman mushaf.

---

## 📐 Pemetaan Kebutuhan PRD (FR-1 s/d FR-10)

| ID | Fitur PRD | Status | File Implementasi Kunci |
|---|---|:---:|---|
| **FR-1** | Pembaca Qur'an Bersih | ✅ Selesai | `src/components/reader/VerseListView.jsx`, `WordSpan.jsx` |
| **FR-1b** | Dua Tampilan Baca (Ayat & Halaman) | ✅ Selesai | `src/components/reader/MushafPageView.jsx`, `src/lib/quran/position.js` |
| **FR-2** | Mode Tajwid & Penjelasan | ✅ Selesai | `src/lib/tajwid/parser.js`, `rules.js`, `TajweedLegendSheet.jsx` |
| **FR-3** | Highlight, Popover & AI Chat (RAG) | ✅ Selesai | `src/components/chat/SelectionPopover.jsx`, `ChatPanel.jsx`, `src/lib/rag/` |
| **FR-4** | Pelacak Bacaan Suara | ✅ Selesai | `src/lib/speech/tracker.js`, `matcher.js`, `SpeechConsentModal.jsx` |
| **FR-5** | Mode Hafalan & SM-2 | ✅ Selesai | `src/lib/memorization/engine.js`, `MemorizationAssessmentModal.jsx`, `/hafalan` |
| **FR-6** | Dashboard & Streak Timezone | ✅ Selesai | `src/lib/streak/index.js`, `src/components/dashboard/StreakHeader.jsx`, `page.js` |
| **FR-7** | Quest Harian Adaptif | ✅ Selesai | `src/lib/quests/index.js`, `DailyQuestsCard.jsx`, `/api/quests` |
| **FR-8** | Akun & Sinkronisasi Database | ✅ Selesai | `supabase/migrations/0001_init.sql`, `src/lib/supabase/`, `/api/activity` |
| **FR-9** | PWA & Offline Support | ✅ Selesai | `public/manifest.webmanifest`, `public/sw.js`, `next.config.mjs` |
| **FR-10** | Pencarian Semantik Tafsir | ✅ Selesai | `src/lib/rag/semantic.js`, `scripts/embed-tafsir.mjs`, `/api/search` |

---

## 🛠️ Tech Stack & Standar Kualitas

- **Bahasa:** Pure JavaScript (ESM / Next.js App Router, **NO TypeScript** sesuai batasan PRD).
- **Styling & Tema:** Tailwind CSS v3, Lucide React, mode terang & gelap persist.
- **Warna Desain:**
  - Latar Belakang: `#FAF7F0` (warm off-white), Gelap: `#121816`
  - Warna Utama: `#1F5F4A` (deep green), Aksen Gelap: `#5DB899`
  - Aksen Emas: `#C9A227` (soft gold)
  - Teks: `#1E2421` (charcoal)
- **Tipografi Al-Qur'an:** `Amiri Quran` (Google Font) dengan kelas `.font-quran`, line-height proporsional ~2.2, dan skala responsif via CSS variable `--quran-scale`.
- **Database:** Supabase PostgreSQL dengan ekstensi `pgvector`, Row Level Security (RLS) di semua tabel pengguna.
- **AI Model:** Google Gemini (`@google/genai`) khusus di server Route Handler.
- **Keamanan:** Content Security Policy (CSP), Referrer-Policy, nosniff, izin mikrofon eksklusif.

---

## 🚀 Panduan Menjalankan Aplikasi

### 1. Salin Konfigurasi Environment
```bash
cp .env.example .env.local
```
Konfigurasikan kunci:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.5-flash
GEMINI_EMBEDDING_MODEL=text-embedding-004
CHAT_DAILY_LIMIT=30
```
*(Catatan: Aplikasi dapat dijalankan dalam **Mode Tamu / Offline** penuh tanpa Supabase/Gemini API key).*

### 2. Instal Dependensi
```bash
npm install
```

### 3. Verifikasi Data Al-Qur'an
Seluruh 114 surah dan 604 halaman mushaf Madinah telah di-seed dan diverifikasi:
```bash
npm run verify:data
```

### 4. Menjalankan Server Pengembangan
```bash
npm run dev
```
Buka browser di [http://localhost:3000](http://localhost:3000).

### 5. Menjalankan Unit Tests & Lint
```bash
# Menjalankan 38 unit tests (Vitest)
npm run test

# Menjalankan linter Next.js
npm run lint

# Membangun produksi (Production Build)
npm run build
```

---

## 🧪 Skrip Pengujian & Demo untuk Juri

| Skrip | Perintah | Deskripsi |
|---|---|---|
| **Verifikasi Data** | `npm run verify:data` | Memeriksa integritas 604 halaman mushaf, 114 surah, dan sinkronisasi 83.665 kata. |
| **Evaluasi AI Chat** | `npm run eval:chat` | Menguji 10 pertanyaan in-scope tafsir dan 3 pertanyaan out-of-scope/fatwa/injeksi. |
| **Embeddings Tafsir** | `npm run embed:tafsir` | Menghasilkan vektor embedding untuk tafsir tematik dengan Gemini. |
| **Data Demo Juri** | `npm run demo:data` | Menampilkan snippet instan untuk mengisi streak 5 hari, quest selesai, dan antrean hafalan di konsol browser. |

---

## 📂 Struktur Direktori

```
├── data/
│   ├── semantic-index.json         # Indeks pencarian semantik lokal
│   └── tafsir/                     # Dataset tafsir Al-Muyassar & Ibnu Katsir
├── public/
│   ├── data/
│   │   ├── surah/{1..114}.json     # Data per surah dengan ayat & kata
│   │   ├── page/{1..604}.json      # Data 15 baris mushaf Madinah
│   │   ├── surahs.json             # Metadata 114 surah
│   │   └── index.json              # Pemetaan ayat <-> halaman & juz
│   ├── icons/icon.svg              # Ikon kaligrafi PWA
│   ├── manifest.webmanifest        # PWA Web App Manifest
│   └── sw.js                       # Service Worker offline cache
├── scripts/
│   ├── seed-quran.mjs              # Fetch data dari quran.com API v4
│   ├── verify-data.mjs             # Validasi integritas mushaf
│   ├── seed-tafsir.mjs             # Seed kitab tafsir
│   ├── embed-tafsir.mjs            # Generator embedding Gemini
│   ├── eval-chat.mjs               # Evaluasi grounded RAG
│   └── demo-data.mjs               # Snippet data demo evaluasi
├── src/
│   ├── app/
│   │   ├── (app)/
│   │   │   ├── page.js             # Dashboard: Streak, Quests, Murajaah
│   │   │   ├── quran/page.js       # Indeks Surah, Juz & Tematik AI
│   │   │   ├── quran/[surah]/      # Pembaca tampilan per ayat
│   │   │   ├── quran/halaman/[page]# Pembaca tampilan mushaf 15 baris
│   │   │   ├── hafalan/page.js     # Pusat Hafalan & Antrean SM-2
│   │   │   └── settings/page.js    # Pengaturan tampilan & tema
│   │   ├── api/
│   │   │   ├── activity/route.js   # Batch activity & streak sync
│   │   │   ├── chat/route.js       # Grounded SSE AI streaming RAG
│   │   │   ├── memorization/       # SM-2 review API
│   │   │   ├── quests/route.js     # Daily quests API
│   │   │   └── search/route.js     # Semantic vector search API
│   │   └── login/page.js           # Supabase Auth / Tamu
│   ├── components/
│   │   ├── chat/                   # Popover seleksi & panel chat RAG
│   │   ├── dashboard/              # StreakHeader, Quests, ContinueReading
│   │   ├── memorization/           # Masking setup & assessment modal
│   │   ├── reader/                 # WordSpan, MushafPage, VerseList, Sheets
│   │   └── speech/                 # Modal privasi suara & pelacak
│   └── lib/
│       ├── activity/               # Debounced dwell logger
│       ├── arabic/                 # Normalisasi & tokenisasi teks Arab
│       ├── llm/                    # Gemini streaming client
│       ├── memorization/           # Algoritma SM-2 & adapter
│       ├── pages/                  # Mushaf page layout builder & loader
│       ├── quests/                 # Generator 3 quest harian
│       ├── quran/                  # Loader surah & position sync
│       ├── rag/                    # Grounded retrieval & prompt security
│       ├── speech/                 # Web Speech API & forward matcher
│       ├── streak/                 # Timezone-aware streak calculator
│       ├── supabase/               # Client & server Supabase SSR
│       └── tajwid/                 # Parser & pewarnaan hukum tajwid
└── supabase/
    └── migrations/0001_init.sql    # Skrip inisialisasi basis data & pgvector
```

---

## 📜 Lisensi & Pengakuan

Dikembangkan dengan penuh dedikasi untuk **Musabaqah Desain Aplikasi Al-Qur'an (DAQ)**. Teks Al-Qur'an dan data tajwid bersumber dari Mushaf Madinah Standar via Quran.com API v4; terjemahan oleh Kementerian Agama Republik Indonesia (Kemenag RI); tafsir bersumber dari Tafsir Al-Muyassar dan Tafsir Ibnu Katsir.
