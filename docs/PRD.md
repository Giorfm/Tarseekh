# PRD: Tarseekh

**Produk:** Aplikasi web Al-Qur'an berbasis AI (responsif, PWA)
**Kompetisi:** Musabaqah Desain Aplikasi Al-Qur'an (DAQ), tema "The Islamic Renaissance: Inspired by the Past, Building the Future"
**Sub-tema:** Inovasi Pembelajaran Masa Depan (Future Education & AI)
**Tim:** 2 orang
**Versi:** 1.0 (25 Oktober 2026)
**Nama Aplikasi:** 'Tarseekh' (ترسيخ) — bermakna proses meneguhkan atau menancapkan hafalan dan pemahaman Al-Qur'an secara kokoh di dalam hati dan ingatan.

Dokumen ini terdiri dari dua bagian: **(1) Rancangan Aplikasi** dan **(2) PRD**. Simpan sebagai `docs/PRD.md` agar dapat dibaca oleh agent saat vibecoding.

---

## 1. Rancangan Aplikasi

### 1.1 Konsep

Tarseekh adalah pendamping belajar Al-Qur'an di browser (responsif, bisa di-install sebagai PWA). Halaman Quran dibuat bersih seperti mushaf digital. Kemampuan AI muncul hanya saat dibutuhkan: ketika teks di-highlight, ketika pengguna membaca dengan suara, dan ketika menghafal.

Tiga pilar:

- **Pahami:** highlight ayat, lalu chatbot menjawab berdasarkan tafsir terverifikasi (RAG), bukan jawaban bebas.
- **Latih:** pelacak bacaan suara (speech-to-text), mode hafalan, dan mode tajwid berwarna.
- **Konsisten:** dashboard dengan streak dan quest harian yang disarankan sistem.

### 1.2 Narasi tema

- **Inspired by the Past:** sumber jawaban AI adalah tafsir klasik (mis. Ibnu Katsir, Al-Muyassar) dan teks mushaf Utsmani, dan setiap jawaban menampilkan rujukannya. Metode hafalan memakai pengulangan berjarak (murajaah) yang sejalan dengan tradisi menghafal.
- **Building the Future:** RAG, speech recognition, gamifikasi, dan PWA agar belajar Al-Qur'an bisa dilakukan di mana saja.

### 1.3 Peta halaman

| Rute | Halaman | Isi utama |
|---|---|---|
| / | Dashboard | Streak di bagian atas, kartu lanjutkan membaca, quest harian, jadwal murajaah |
| /quran | Daftar surah | Cari surah/juz, posisi terakhir dibaca |
| /quran/[surah] | Pembaca, tampilan per ayat | Setiap ayat sebagai blok sendiri, pilihan mode (Baca / Tajwid / Hafalan), tombol mic, popup highlight, panel chat |
| /quran/halaman/[page] | Pembaca, tampilan per halaman | Tata letak mushaf (604 halaman, 15 baris), navigasi geser antar halaman, lompat ke halaman/surah/juz; mode dan fitur sama dengan tampilan per ayat |
| /login | Masuk | Magic link email |
| /settings | Pengaturan | Terjemahan on/off, ukuran font, tema, target harian, zona waktu |

### 1.4 Wireframe teks

**Dashboard (mobile)**

- Header: ikon api + 12 hari + 7 titik minggu ini
- Kartu: Lanjutkan, Al-Baqarah ayat 25
- Quest hari ini: 3 kartu dengan progres
- Murajaah: 5 ayat jatuh tempo, tombol Mulai
- Navigasi bawah: Beranda, Quran, Hafalan, Pengaturan

**Halaman Quran**

- Top bar tipis: tombol kembali, nama surah, pilihan mode (Baca / Tajwid / Hafalan), ikon pengaturan baca (berisi pilihan Tampilan: Per ayat | Per halaman)
- Tampilan per ayat: ayat Arab besar, nomor ayat bulat kecil, terjemahan abu-abu kecil (opsional, default mati), setiap ayat sebagai blok sendiri
- Tampilan per halaman: halaman mushaf 15 baris dengan header (surah, juz) dan nomor halaman, geser kiri-kanan untuk berpindah halaman, bilah progres 'Halaman X dari 604'
- Tombol mic mengambang di kanan bawah (mode Baca dan Hafalan)
- Saat teks di-highlight: popover melayang berisi Tanya AI, Tafsir singkat, Simpan
- Chat: bottom sheet di HP, panel samping di desktop

Prinsip clean: tidak ada tombol permanen selain top bar dan tombol mic. Semua aksi lain bersifat kontekstual.

### 1.5 Arsitektur

- **Frontend dan backend:** Next.js (App Router, JavaScript) di Vercel.
- **Konten Quran:** file JSON statis per surah dan per halaman mushaf hasil skrip seed dari quran.com API v4 (teks Utsmani, teks bertag tajwid, terjemahan Indonesia, tafsir, serta nomor halaman dan nomor baris tiap kata). Saat berjalan, aplikasi tidak bergantung pada API eksternal.
- **Database dan auth:** Supabase (Postgres, Auth, pgvector).
- **AI:** Gemini API (LLM dan embedding), hanya dipanggil dari Route Handler di server.
- **Speech:** Web Speech API di browser (bahasa ar-SA).

Alur komponen:

- Browser (PWA) memanggil Route Handler Next.js
- Route Handler memanggil Gemini API dan Supabase (Postgres + pgvector)
- Web Speech API berjalan langsung di browser

### 1.6 Alur fitur utama

**A. Highlight ke chat.** Pengguna menyeleksi teks, sistem membaca atribut `data-verse-key` dari elemen terseleksi, popover muncul, pengguna menekan Tanya AI. Klien mengirim POST ke `/api/chat` dengan `verseKeys` dan pertanyaan. Server mengambil teks, terjemahan, dan tafsir ayat tersebut (retrieval langsung), menyusun prompt, lalu menstream jawaban Gemini. UI menampilkan jawaban beserta chip sumber.

**B. Pelacak bacaan suara.** Mic aktif, SpeechRecognition mengirim hasil interim, teks dinormalisasi lalu disejajarkan (alignment) dengan kata-kata ayat, dan kata yang sudah terbaca di-highlight. Di akhir sesi, hasil disimpan ke `recitation_attempts` dan `reading_logs`, lalu progres quest diperbarui.

**C. Hafalan.** Pengguna memilih rentang ayat dan tingkat kesulitan, kata disembunyikan lalu muncul saat terbaca, di akhir sesi pengguna menilai diri (Lupa / Ragu / Hafal), dan jadwal murajaah dihitung dengan algoritma SM-2 sederhana.

**D. Quest dan streak.** Saat dashboard dibuka dan belum ada quest untuk hari ini (menurut zona waktu pengguna), QuestEngine membuat 3 quest. Aktivitas membaca atau latihan menaikkan progres. Quest selesai atau target baca harian tercapai berarti hari itu dihitung untuk streak.

**E. Dua tampilan baca.** Semua kata dirender dari satu model kata yang sama (atribut `data-verse-key`, `data-word-index`; tampilan halaman menambah `data-page` dan `data-line`). Tampilan per ayat dan per halaman hanya berbeda pada tata letak, sehingga tajwid, highlight, pelacak suara, dan hafalan bekerja identik di keduanya. Posisi terakhir disimpan sebagai `verse_key` dan dikonversi ke nomor halaman melalui indeks ayat-ke-halaman saat pengguna berpindah tampilan.

### 1.7 Rancangan basis data (bahan ERD)

| Tabel | Kolom utama | Relasi |
|---|---|---|
| profiles | id (PK, = auth.users.id), display_name, timezone, daily_goal_ayah, show_translation, show_tajwid, font_scale, reading_view (ayat/halaman), created_at | 1 ke 1 dengan auth.users |
| streaks | user_id (PK), current_streak, longest_streak, last_active_date | 1 ke 1 dengan profiles |
| reading_logs | id, user_id, surah, ayah_from, ayah_to, mode (read/tajwid/memorize), duration_sec, created_at | N ke 1 dengan profiles |
| recitation_attempts | id, user_id, surah, ayah_from, ayah_to, accuracy, words_total, words_matched, created_at | N ke 1 dengan profiles |
| quests | id, user_id, quest_date, type, title, target (jsonb), progress, status, completed_at | N ke 1 dengan profiles |
| memorization_items | id, user_id, surah, ayah, ease, interval_days, reps, due_date, last_result; unik (user_id, surah, ayah) | N ke 1 dengan profiles |
| bookmarks | id, user_id, verse_key, note, created_at | N ke 1 dengan profiles |
| chat_sessions | id, user_id, verse_from, verse_to, created_at | N ke 1 dengan profiles |
| chat_messages | id, session_id, role, content, sources (jsonb), created_at | N ke 1 dengan chat_sessions |
| tafsir_chunks | id, verse_key, surah, ayah, source_slug, source_name, language, content, embedding vector(768) | Berdiri sendiri (data referensi, baca-saja) |

Semua tabel milik pengguna memakai Row Level Security: pengguna hanya dapat membaca dan menulis barisnya sendiri.

### 1.8 Use case

Aktor: **Pengguna**, **Gemini API** (sistem eksternal).

| ID | Use case | Catatan relasi |
|---|---|---|
| UC-01 | Masuk / daftar | |
| UC-02 | Membaca surah | |
| UC-03 | Mengaktifkan mode tajwid | extend UC-02 |
| UC-04 | Highlight dan bertanya ke AI | extend UC-02; include Ambil konteks tafsir; berinteraksi dengan Gemini API |
| UC-05 | Membaca dengan pelacakan suara | extend UC-02 |
| UC-06 | Menghafal ayat | include UC-05 |
| UC-07 | Murajaah terjadwal | include UC-06 |
| UC-08 | Melihat dashboard dan streak | |
| UC-09 | Menyelesaikan quest harian | include UC-08 |
| UC-10 | Menyimpan bookmark | extend UC-02 |
| UC-11 | Mengatur preferensi | |

### 1.9 Dasar class diagram

Aplikasi memakai JavaScript, jadi 'class' di sini berarti kelas atau modul utama.

| Kelas / modul | Tanggung jawab | Atribut dan metode kunci |
|---|---|---|
| QuranRepository | Memuat data surah dari JSON statis | getSurah(n), getVerse(key), getTafsir(key, source) |
| PageLayoutBuilder | Menyusun halaman mushaf (baris dan kata) dari data halaman | getPage(n), pageOfVerse(key), lines(page) |
| TajwidParser | Mengubah teks bertag tajwid menjadi token per kata | parse(html), legend |
| ArabicNormalizer | Normalisasi teks Arab | normalize(text), tokenize(text) |
| SpeechTracker | Membungkus Web Speech API | start(), stop(), onResult, lang |
| ArabicMatcher | Menyejajarkan hasil ucapan dengan kata ayat | align(spokenTokens, verseTokens, pointer) |
| MemorizationEngine | Level hafalan dan penjadwalan SM-2 | hideMask(level), review(item, grade) |
| RagService | Retrieval, penyusunan prompt, pemanggilan LLM | retrieve(verseKeys, q), buildPrompt(), ask() |
| LLMClient | Adaptor Gemini | generateStream(prompt), embed(text) |
| QuestEngine | Membuat dan mengevaluasi quest | generateDaily(user), applyEvent(evt) |
| StreakService | Menghitung streak sesuai zona waktu | recordActivity(user, date), current() |

---

## 2. PRD (Product Requirements Document)

### 2.1 Latar belakang dan masalah

- Belajar membaca dan menghafal Al-Qur'an idealnya didampingi guru, tetapi tidak semua orang punya akses ke guru setiap hari.
- Aplikasi Al-Qur'an populer kuat dalam membaca, tetapi umpan balik interaktif dan pemahaman makna biasanya terpisah dari halaman bacaan.
- Motivasi konsisten (istiqamah) sulit dijaga tanpa target kecil dan pengingat yang jelas.
- Jawaban AI umum berisiko keliru dalam urusan tafsir, sehingga dibutuhkan pembatasan sumber.

### 2.2 Tujuan dan non-tujuan

**Tujuan**

1. Memberi pengalaman membaca yang bersih dengan bantuan AI kontekstual.
2. Memberi umpan balik bacaan secara real-time lewat suara.
3. Membantu hafalan dan murajaah yang terjadwal.
4. Membangun kebiasaan lewat streak dan quest harian.
5. Menjamin jawaban AI berbasis sumber tafsir dan menampilkan rujukannya.

**Non-tujuan (batasan)**

- Tidak menilai kebenaran tajwid dari suara (hanya melacak posisi bacaan).
- Tidak memberikan fatwa atau hukum fikih.
- Tidak melatih model AI sendiri.
- Tidak ada fitur sosial, leaderboard, atau pembayaran.
- Tidak menyediakan audio murottal pada versi lomba (opsional di masa depan).

### 2.3 Persona

- **Rani, 19, mahasiswa:** ingin memahami makna ayat yang dibaca, malas membuka banyak aplikasi. Butuh tanya-jawab cepat dari halaman bacaan.
- **Fajar, 24, pekerja:** sedang menghafal juz 30, tidak punya guru harian. Butuh mode hafalan dan pengingat murajaah.
- **Bu Siti, 45:** pembaca pemula tajwid. Butuh penanda warna hukum tajwid dan tampilan yang tidak ramai.

### 2.4 Kebutuhan fungsional

Prioritas: P0 wajib untuk demo lomba, P1 sangat diinginkan, P2 jika waktu cukup.

**FR-1 Pembaca Qur'an yang bersih (P0)**

- Menampilkan 114 surah dengan teks Utsmani dan nomor ayat. Terjemahan Indonesia opsional, default mati.
- Tidak ada elemen UI permanen selain top bar tipis dan tombol mic.
- Kriteria penerimaan: Al-Baqarah dapat di-scroll lancar di HP kelas menengah; ukuran font dapat diubah; posisi terakhir tersimpan; teks RTL benar.

**FR-1b Dua tampilan baca: per ayat dan per halaman (P0)**

- Tampilan **per ayat:** setiap ayat sebagai blok sendiri (teks Arab, nomor ayat, terjemahan opsional di bawahnya). Cocok untuk belajar, tanya AI, dan hafalan.
- Tampilan **per halaman:** tata letak mushaf Madinah (604 halaman, 15 baris per halaman) dengan header surah dan juz serta nomor halaman. Pindah halaman dengan geser atau tombol tepi, serta lompat ke halaman, surah, atau juz.
- Pilihan tampilan berada di pengaturan baca (ikon kecil di top bar) agar halaman tetap bersih. Preferensi tersimpan (default: per ayat) dan posisi terakhir tetap sama saat berpindah tampilan.
- Seluruh fitur (tajwid, highlight dan chat, pelacak suara, hafalan) wajib berfungsi di kedua tampilan.
- Kriteria penerimaan: 604 halaman termuat dan konsisten dengan data per surah (jumlah kata sama); berpindah tampilan mempertahankan ayat yang sedang dibaca; seleksi teks di tampilan halaman tetap memunculkan popover; pelacak suara dan hafalan otomatis berpindah ke halaman berikutnya saat kata terakhir halaman terlewati; halaman terbuka kurang dari 500 ms setelah prefetch.
- Batasan: tata letak halaman dibuat dengan baris rata kanan-kiri (justify) dan font yang disesuaikan lebar layar, sehingga mirip tetapi tidak identik dengan mushaf cetak.

**FR-2 Mode Tajwid (P0)**

- Mewarnai teks per hukum tajwid berdasarkan data tajwid, dengan legenda warna.
- Mengetuk bagian berwarna menampilkan nama hukum dan penjelasan singkat.
- Kriteria penerimaan: minimal 10 kategori hukum berwarna berbeda; kontras memenuhi WCAG AA di mode terang dan gelap; teks Arab tidak berubah.

**FR-3 Highlight, popup, dan chatbot (P0)**

- Menyeleksi teks pada 1 sampai 7 ayat memunculkan popover maksimal 300 ms setelah seleksi selesai.
- Aksi popover: Tanya AI, Tafsir singkat, Simpan bookmark.
- Panel chat terbuka dengan 4 sampai 5 saran pertanyaan pemantik (mis. Jelaskan makna ayat ini, Apa pelajaran dari ayat ini, Jelaskan kosakata penting) lalu pengguna dapat mengetik bebas.
- Jawaban hanya berdasarkan konteks tafsir yang diambil, ditulis dalam bahasa Indonesia, distream, dan menampilkan sumber. Pertanyaan fatwa ditolak dengan sopan. Jika konteks tidak cukup, AI berkata tidak tahu.
- Kriteria penerimaan: popover tampil di desktop (mouse) dan HP (long-press); 10 pertanyaan uji menghasilkan jawaban dengan sumber; 3 pertanyaan di luar konteks ditolak atau dijawab tidak tahu.

**FR-4 Pelacak bacaan suara (P0)**

- Mic mengaktifkan speech recognition bahasa Arab. Kata yang terbaca di-highlight berurutan.
- Toleran terhadap perbedaan harakat dan kesalahan pengenalan kecil (fuzzy matching).
- Jika browser tidak mendukung, tampilkan pesan dan mode manual (ketuk untuk maju).
- Kriteria penerimaan: pada 20 ayat uji di Chrome, minimal 85% kata terlacak dengan benar; kata yang terlewat tidak membuat pelacak macet (lookahead 3 kata).

**FR-5 Mode Hafalan (P0)**

- Pengguna memilih rentang ayat dan level: sembunyikan semua, sembunyikan sebagian (30/50/70 persen), atau tampilkan huruf pertama.
- Kata tersembunyi muncul saat dibaca dengan benar. Tombol Petunjuk membuka satu kata.
- Di akhir sesi: penilaian diri (Lupa / Ragu / Hafal) yang menjadwalkan murajaah (SM-2 sederhana).
- Kriteria penerimaan: layout tidak bergeser saat kata muncul; jadwal murajaah tersimpan dan muncul di dashboard.

**FR-6 Dashboard (P0)**

- Bagian atas menampilkan streak saat ini, rekor terpanjang, dan 7 hari terakhir.
- Kartu Lanjutkan Membaca, daftar quest harian, dan jumlah ayat murajaah yang jatuh tempo.
- Kriteria penerimaan: streak dihitung menurut zona waktu pengguna; tidak bertambah dua kali dalam sehari.

**FR-7 Quest harian yang disarankan (P0)**

- Setiap hari dibuat 3 quest: Baca (mis. 5 ayat lanjutan, atau 1 halaman jika tampilan halaman dipilih), Latih (bacakan satu ayat atau murajaah), Renungkan (tanya AI satu pertanyaan tentang ayat tertentu atau kuis tajwid mini).
- Penyesuaian target berdasarkan riwayat (naik jika selesai 3 hari berturut-turut, turun jika gagal). Opsional (P2): Gemini memilih dan menyusun ulang teks quest dari daftar kandidat dengan keluaran JSON.
- Kriteria penerimaan: progres terisi otomatis dari aktivitas; quest selesai tidak bisa diklaim dua kali.

**FR-8 Akun dan penyimpanan (P1)**

- Login email (magic link) lewat Supabase. Data progres tersimpan di database dengan RLS.

**FR-9 PWA dan pengaturan (P1)**

- Manifest, ikon, layar penuh, dan cache aset dasar. Pengaturan: terjemahan, ukuran font, tema gelap/terang, target harian, zona waktu.

**FR-10 Pencarian semantik tafsir (P2)**

- Pertanyaan bebas (mis. ayat tentang sabar) mengambil potongan tafsir terdekat lewat embedding dan pgvector.

### 2.5 Kebutuhan non-fungsional

- **Performa:** First Contentful Paint di bawah 2 detik di 4G; data surah dimuat lazy per surah.
- **Aksesibilitas:** dukungan RTL, ukuran font adjustable, label ARIA pada kontrol, navigasi keyboard.
- **Privasi:** audio tidak dikirim ke server aplikasi. Web Speech API di Chrome dapat mengirim audio ke layanan Google, sehingga tampilkan pemberitahuan sebelum mic pertama kali dipakai.
- **Keamanan:** API key hanya di server, validasi input, batas penggunaan chat per pengguna per hari, RLS aktif.
- **Kompatibilitas:** Chrome (Android dan desktop) sebagai target utama. Safari/Firefox tetap bisa membaca, dengan fallback tanpa speech.
- **Bahasa:** antarmuka Indonesia.

### 2.6 Metrik keberhasilan (untuk proposal dan demo)

- Waktu dari highlight sampai jawaban pertama muncul kurang dari 4 detik.
- Akurasi pelacakan kata minimal 85 persen pada 20 ayat uji.
- Uji kegunaan dengan 10 pengguna, skor SUS minimal 70.
- Minimal 80 persen jawaban AI pada set uji menampilkan sumber yang sesuai.

### 2.7 Risiko dan mitigasi

| Risiko | Mitigasi |
|---|---|
| Akurasi speech recognition Arab bervariasi | Fuzzy matching, lookahead, mode manual, jujur di bagian Batasan |
| AI salah menafsirkan | RAG dengan sumber tafsir, aturan prompt ketat, tampilan sumber, disclaimer |
| Batas gratis API berubah atau habis | Model dan host dapat dikonfigurasi lewat env, cache jawaban, rate limit, cadangan penyedia lain |
| Dependensi API data Quran | Data di-seed ke JSON statis, tidak memanggil API eksternal saat berjalan |
| Waktu pengembangan singkat | Kerjakan per fase P0 lebih dulu, P2 hanya jika sisa waktu |

### 2.8 Pemetaan ke kriteria penilaian juri

| Kriteria | Jawaban aplikasi |
|---|---|
| Inovasi | RAG tafsir kontekstual dari highlight, pelacak bacaan suara, hafalan adaptif |
| Dampak | Pendampingan belajar tanpa guru harian, pemahaman makna di tempat |
| Keberlanjutan | Streak, quest harian adaptif, murajaah terjadwal |
| Antarmuka dan kemudahan | Halaman bersih, aksi kontekstual, responsif, PWA |
| Proses pengembangan | Pendekatan iteratif per fase, PRD, pengujian dengan pengguna |
| Kesesuaian tema Al-Qur'an | Sumber tafsir klasik, mushaf Utsmani, tajwid, hafalan |
