# Mushaf OCR: Gambar Halaman Mushaf Madinah + Lapisan Kata Interaktif

Pipeline offline yang mengubah **mushaf Madinah resmi KFGQPC (cetakan 1441H, riwayat Hafs)** menjadi
gambar halaman untuk tampilan per halaman, beserta posisi setiap kata agar kata pada gambar dapat
disentuh (Tanya AI / Tafsir / Simpan, tajwid, hafalan, pelacak suara).

**Prinsip utama:** gambar hanya untuk tampilan dan geometri. Teks Al-Qur'an selalu berasal dari data
terverifikasi (`public/data/surah`, `public/data/page`). Keluaran pipeline hanya berisi kunci kata
(`surah:ayat:kata`) dan koordinat, tidak pernah teks hasil pengenalan.

## Sumber

| Bahan | Sumber | Catatan |
|---|---|---|
| Mushaf vektor 604 halaman (`.ai`, PDF-compatible) | https://dm.qurancomplex.gov.sa → `1441-AI-hafs.zip` | SHA-256 `280c5d71ca16aaeeb3a343be1b92c76fa6df71d0671e202c026fde12402d9eef`. Syarat penggunaan: https://dm.qurancomplex.gov.sa/rights/ (penggunaan gratis termasuk untuk situs web dan perangkat lunak) |
| Font KFGQPC Uthmanic Script HAFS | `UthmanicHafs1 Ver09.woff2` (repo `mustafa0x/qpc-fonts`) | Hanya dipakai saat build untuk mengukur lebar kata; tidak didistribusikan |

## Mengapa bukan OCR huruf biasa

OCR huruf Arab umum (mis. Tesseract `ara`) lemah pada teks Utsmani berharakat penuh. Karena urutan kata
sudah diketahui dari data terverifikasi, masalahnya adalah **forced alignment**, bukan pengenalan teks:

1. **Penanda ayat** (lingkaran hijau pada file vektor) menjadi jangkar akhir ayat yang pasti.
2. **Kelompok huruf bersambung (PAW)**: komponen tinta yang memotong garis dasar (baseline) setiap baris.
   Harakat, titik, dan tanda waqaf tidak memotong baseline sehingga tidak terhitung.
3. **Jumlah PAW yang diharapkan** per kata dihitung dari teks terverifikasi (huruf yang tidak
   menyambung ke kiri: ا د ذ ر ز و ة ء ...).
4. **Lebar kata yang diharapkan** diukur dengan HarfBuzz memakai font KFGQPC Hafs, diskalakan per baris.
5. **Dynamic programming** membagi deretan PAW di antara dua penanda ayat menjadi tepat N kata,
   menghormati pergantian baris, dengan biaya: selisih jumlah PAW + selisih lebar (log) + celah sempit
   di batas kata.

Cetakan 1441H memiliki pemenggalan baris sendiri (berbeda dari `line_number` maupun `line_v2`
Quran.com), sehingga posisi baris diambil dari gambar, bukan dari data.

## Hasil (31 Oktober 2026)

| Metrik | Nilai |
|---|---|
| Halaman ter-align penuh | **604 / 604** |
| Token (kata + penanda ayat) | **83.665 / 83.665**, masing-masing tepat sekali |
| Selisih PAW per kata | 0,072 |
| Biaya DP per kata | median 0,381, terburuk 0,618 |
| Ayat dengan pembagian perkiraan (`approx`) | 2: QS 17:107 (hal. 293) dan QS 53:62 (hal. 528), ayat sajdah yang tandanya menempel pada teks |
| Gambar | 604 × WebP 1200×1716, total ±81 MB, ±130 KB/halaman |

`src/lib/mushaf/mushaf.test.js` memeriksa cakupan seluruh token di setiap build.

## Menjalankan ulang

```bash
cd scripts/mushaf-ocr
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
mkdir -p work/pages work/layout work/webp
# 1. Unduh & ekstrak (cek SHA-256 di atas)
curl -L -o work/1441-AI-hafs.zip https://dm.qurancomplex.gov.sa/Download/1441-AI-hafs.zip
.venv/bin/python -I extract.py work/1441-AI-hafs.zip work/pages
# 2. Font untuk model lebar kata (konversi woff2 -> ttf)
curl -L -o work/UthmanicHafs.woff2 "https://raw.githubusercontent.com/mustafa0x/qpc-fonts/f93bf5f3/various-woff2/UthmanicHafs1%20Ver09.woff2"
.venv/bin/python -I -c "from fontTools.ttLib import TTFont; f=TTFont('work/UthmanicHafs.woff2'); f.flavor=None; f.save('work/UthmanicHafs.ttf')"
# 3. Alignment semua halaman (±1 menit dengan 6 proses paralel; contoh di bawah satu proses)
.venv/bin/python -I align_v2.py work/pages ../../public/data work/layout all
# 4. Ekspor ke aplikasi + verifikasi cakupan token
.venv/bin/python -I export_layout.py work/layout work/layout/_report.json ../..
# 5. Render gambar & unggah ke Supabase Storage (bucket publik "mushaf", folder kfgqpc-1441)
.venv/bin/python -I render_webp.py work/pages work/webp 1200 80 $(seq -s, 1 604)
set -a; . ../../.env.local; set +a
ls work/webp/*.webp | xargs -P 8 -n 1 ./upload_page.sh
```

Opsi debug: `align_v2.py ... 3,7,50 --overlay work/overlay` menggambar kotak kata di atas halaman.
`edition_check.py` membandingkan posisi penanda ayat gambar dengan data (pemeriksaan edisi).

## Batasan yang diketahui

- Dua ayat sajdah memakai pembagian perkiraan (ditandai `approx` di data tata letak).
- Kotak kata mengikuti jangkauan tinta; huruf berekor panjang (mis. kaf memanjang) dapat tumpang tindih
  sedikit dengan kata tetangga. Area sentuh (`hx0`/`hx1`) dibagi di tengah celah.
- Belum ada ground truth manual untuk setiap kata; validasi saat ini: cakupan token 100%, metrik biaya,
  dan pemeriksaan visual overlay pada halaman sampel (1, 2, 3, 7, 50, 120, 300, 593).
