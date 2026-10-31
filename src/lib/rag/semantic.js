/**
 * Semantic Tafsir Search Service (Tier 2 RAG)
 * Compliant with PRD FR-10:
 * Enables semantic & topical search based on MEANING (makna / tafsir tematik / tadabbur)
 * rather than literal keyword translation matches.
 */

import fs from 'node:fs';
import path from 'node:path';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { GoogleGenAI } from '@google/genai';
import { getSurah } from '@/lib/quran/loader';

/**
 * Calculates cosine similarity between two numerical vectors of equal length.
 *
 * @param {number[]} vecA
 * @param {number[]} vecB
 * @returns {number} Value between -1.0 and 1.0
 */
export function cosineSimilarity(vecA, vecB) {
  if (!Array.isArray(vecA) || !Array.isArray(vecB) || vecA.length !== vecB.length || vecA.length === 0) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Thematic Meaning Knowledge Bank (Tafsir Maudhu'i)
 * Maps conceptual themes, emotional states, ethics, science, and life questions
 * directly to authoritative Quranic verses with thematic relevance insights.
 */
const THEMATIC_KNOWLEDGE_BANK = [
  {
    id: 'anxiety-peace',
    theme: 'Ketenangan Hati & Mengatasi Kegelisahan',
    explanation: 'Al-Qur\'an menegaskan bahwa ketenangan batin hakiki diraih melalui zikir, tawakkal, dan keyakinan akan pertolongan Allah.',
    keywords: [
      'cemas', 'gelisah', 'khawatir', 'takut', 'overthinking', 'stres',
      'depresi', 'panik', 'waswas', 'was-was', 'mental health', 'pikiran',
      'jiwa', 'tenang', 'ketenangan', 'gundah', 'resah', 'ketakutan'
    ],
    verses: [
      {
        verse_key: '13:28',
        theme: 'Ketenangan Batin Melalui Zikir',
        relevance: 'Menegaskan bahwa ketenangan jiwa yang hakiki (*thuma\'ninatul qalb*) hanya dapat diraih dengan mengingat Allah (zikir), menjadi penawar utama atas kegelisahan dan overthinking.',
      },
      {
        verse_key: '94:5',
        theme: 'Kemudahan Menyertai Setiap Kesulitan',
        relevance: 'Memberikan peneguhan mental dan harapan bahwa di balik setiap kesulitan dan ujian yang dirasakan, niscaya Allah menyertakan jalan kemudahan.',
      },
      {
        verse_key: '2:286',
        theme: 'Batas Kemampuan Manusia',
        relevance: 'Menguatkan jiwa yang sedang lelah dengan pengingat bahwa Allah tidak pernah membebani seseorang melampaui batas kesanggupannya.',
      },
      {
        verse_key: '65:3',
        theme: 'Kecukupan Melalui Tawakkal',
        relevance: 'Jaminan bahwa siapa saja yang memasrahkan urusannya kepada Allah dengan bertawakkal, maka Allah sendiri yang akan mencukupkan keperluannya.',
      },
      {
        verse_key: '3:139',
        theme: 'Larangan Bersedih dan Merasa Lemah',
        relevance: 'Menumbuhkan ketegaran mental agar orang beriman tidak merasa hina, lemah, atau putus asa dalam menghadapi dinamika kehidupan.',
      },
    ],
  },
  {
    id: 'patience-trials',
    theme: 'Kesabaran & Menghadapi Ujian Hidup',
    explanation: 'Ujian hidup merupakan sunnatullah untuk mengangkat derajat manusia melalui sabar dan shalat.',
    keywords: [
      'sabar', 'cobaan', 'musibah', 'ujian', 'penderitaan', 'bencana',
      'kesulitan', 'berat', 'sakit', 'kegagalan', 'tabah', 'ketabahan'
    ],
    verses: [
      {
        verse_key: '2:155',
        theme: 'Keniscayaan Ujian dalam Kehidupan',
        relevance: 'Menjelaskan bahwa ujian berupa ketakutan, kelaparan, dan kekurangan harta adalah bagian dari dinamika hidup untuk menguji siapa yang bersabar.',
      },
      {
        verse_key: '2:153',
        theme: 'Sabar dan Shalat Sebagai Penolong',
        relevance: 'Mengajarkan formula praktis menghadapi beban berat, yaitu dengan memadukan ketabahan mental (sabar) dan sambungan spiritual (shalat).',
      },
      {
        verse_key: '39:10',
        theme: 'Pahala Sabar Tanpa Batas',
        relevance: 'Memberikan motivasi bahwa balasan bagi mereka yang bersabar tidak dihitung dengan batasan normal, melainkan dilimpahkan tanpa batas (*bighairi hisab*).',
      },
      {
        verse_key: '94:6',
        theme: 'Kepastian Datangnya Kelapangan',
        relevance: 'Menegaskan kembali dengan pengulangan yang pasti bahwa sesungguhnya bersama setiap kesulitan ada kemudahan.',
      },
    ],
  },
  {
    id: 'grief-loss',
    theme: 'Menghadapi Kesedihan & Kehilangan',
    explanation: 'Al-Qur\'an membimbing hamba untuk mengelola rasa duka, meyakini takdir, dan menaruh harapan kepada rahmat Allah.',
    keywords: [
      'sedih', 'duka', 'patah hati', 'kecewa', 'kehilangan', 'kesepian',
      'tangis', 'menangis', 'hampa', 'putus asa', 'ditinggal'
    ],
    verses: [
      {
        verse_key: '12:86',
        theme: 'Mengadukan Duka Hanya Kepada Allah',
        relevance: 'Teladan Nabi Ya\'qub saat mengalami kehilangan mendalam, bahwa kesedihan dan kepedihan hendaknya diadu dan diadukan kepada Allah semata.',
      },
      {
        verse_key: '9:40',
        theme: 'Keteguhan di Saat Terhimpit',
        relevance: 'Pesan ketenangan agung Rasulullah kepada sahabatnya di Gua Tsur: "Jangan bersedih, sesungguhnya Allah bersama kita" (*la tahzan innallaha ma\'ana*).',
      },
      {
        verse_key: '57:23',
        theme: 'Keseimbangan Jiwa Menyikapi Takdir',
        relevance: 'Pendidikan mental agar manusia tidak terpuruk dalam duka atas apa yang luput, dan tidak sombong atas apa yang diperoleh.',
      },
      {
        verse_key: '2:156',
        theme: 'Kalimat Istirja\' Sebagai Pelepas Beban',
        relevance: 'Makna bahwa segala sesuatu hakikatnya milik Allah dan akan kembali kepada-Nya, membebaskan manusia dari beban kepemilikan yang menyakitkan.',
      },
    ],
  },
  {
    id: 'parents-family',
    theme: 'Berbakti Kepada Orang Tua & Adab Keluarga',
    explanation: 'Penghormatan kepada orang tua ditempatkan sejajar setelah kewajiban bertauhid kepada Allah.',
    keywords: [
      'orang tua', 'ibu', 'ayah', 'bapak', 'berbakti', 'birrul walidain',
      'anak', 'keluarga', 'lansia', 'mertua', 'kandung'
    ],
    verses: [
      {
        verse_key: '17:23',
        theme: 'Adab Mulia Kepada Orang Tua Lanjut Usia',
        relevance: 'Kewajiban memperlakukan orang tua dengan kasih sayang, larangan membentak atau berkata kasar "ah/cih", dan perintah bertutur kata mulia.',
      },
      {
        verse_key: '31:14',
        theme: 'Pengorbanan Ibu yang Mengandung',
        relevance: 'Pengingat akan jasa besar seorang ibu yang mengandung dalam kelemahan yang bertambah-tambah (*wahnan \'ala wahn*) serta menyapih dalam dua tahun.',
      },
      {
        verse_key: '46:15',
        theme: 'Doa Kebajikan Lintas Generasi',
        relevance: 'Doa komprehensif ketika mencapai kedewasaan (usia 40 tahun) untuk mensyukuri nikmat dan mendoakan kebaikan bagi orang tua serta anak cucu.',
      },
      {
        verse_key: '17:24',
        theme: 'Merendahkan Sayap Kasih Sayang',
        relevance: 'Perintah merendahkan diri di hadapan kedua orang tua dengan penuh kasih sayang dan senantiasa mendoakan ampunan bagi keduanya.',
      },
    ],
  },
  {
    id: 'worship-prayer',
    theme: 'Kekuatan Ibadah, Doa & Shalat Malam',
    explanation: 'Shalat malam dan munajat merupakan sarana utama penyucian jiwa dan peningkatan derajat spiritual.',
    keywords: [
      'shalat', 'tahajjud', 'shalat malam', 'qiyamul lail', 'subuh',
      'ibadah', 'sujud', 'doa', 'meminta', 'munajat', 'khusyuk'
    ],
    verses: [
      {
        verse_key: '17:79',
        theme: 'Keutamaan Shalat Tahajjud',
        relevance: 'Anjuran bangun di malam hari untuk bertahajjud sebagai ibadah tambahan agar Allah mengangkat martabat ke tempat yang terpuji (*maqaman mahmuda*).',
      },
      {
        verse_key: '32:16',
        theme: 'Lambung yang Jauh dari Pembaringan',
        relevance: 'Pujian bagi hamba beriman yang rela meninggalkan kenyamanan tidur malam demi memohon kepada Tuhannya dengan rasa harap dan cemas.',
      },
      {
        verse_key: '2:186',
        theme: 'Kedekatan Allah Kepada yang Berdoa',
        relevance: 'Penegasan bahwa Allah amat dekat dengan hamba-Nya dan senantiasa mengabulkan permohonan orang yang berdoa kepada-Nya.',
      },
      {
        verse_key: '73:2',
        theme: 'Membangun Jiwa di Sepertiga Malam',
        relevance: 'Perintah bangun di sebagian malam untuk membaca Al-Qur\'an secara tartil guna mempersiapkan kekuatan memikul amanah berat.',
      },
    ],
  },
  {
    id: 'sustenance-blessing',
    theme: 'Rezeki, Keberkahan & Sikap Terhadap Harta',
    explanation: 'Rezeki tidak semata diukur dengan nominal materi, melainkan kepastian jaminan Allah dan keberkahan takwa.',
    keywords: [
      'rezeki', 'uang', 'harta', 'kemiskinan', 'nafkah', 'usaha',
      'pekerjaan', 'kaya', 'berkah', 'sedekah', 'infak', 'finansial'
    ],
    verses: [
      {
        verse_key: '65:2',
        theme: 'Jalan Keluar dari Takwa',
        relevance: 'Prinsip spiritual bahwa ketakwaan membuka jalan keluar dari setiap kebuntuan hidup serta mengalirkan rezeki dari arah yang tak terduga.',
      },
      {
        verse_key: '11:6',
        theme: 'Jaminan Rezeki Setiap Mahluk Melata',
        relevance: 'Menghilangkan kecemasan masa depan dengan penegasan bahwa tiada satu pun mahluk di muka bumi kecuali rezekinya telah ditanggung oleh Allah.',
      },
      {
        verse_key: '67:15',
        theme: 'Ikhtiar Menjemput Rezeki di Muka Bumi',
        relevance: 'Perintah aktif untuk berikhtiar dan menjelajahi penjuru bumi mencari rezeki halal tanpa bermalas-malasan.',
      },
      {
        verse_key: '2:261',
        theme: 'Kelipatan Berkah dalam Berbagi',
        relevance: 'Hukum kelimpahan: orang yang menginfakkan hartanya di jalan Allah diibaratkan sebutir benih yang menumbuhkan tujuh tangkai berlipat ganda.',
      },
    ],
  },
  {
    id: 'repentance-forgiveness',
    theme: 'Taubat, Pengampunan & Harapan Baru',
    explanation: 'Pintu ampunan dan rahmat Allah senantiasa terbuka luas bagi setiap manusia yang ingin memperbaiki diri.',
    keywords: [
      'taubat', 'dosa', 'ampunan', 'penyesalan', 'maksiat', 'hijrah',
      'bersalah', 'khilaf', 'masa lalu', 'istighfar', 'ampun'
    ],
    verses: [
      {
        verse_key: '39:53',
        theme: 'Jangan Berputus Asa dari Rahmat Allah',
        relevance: 'Seruan kasih sayang paling mengharukan dalam Al-Qur\'an kepada orang-orang yang melampaui batas agar tidak berputus asa dari luasnya ampunan Allah.',
      },
      {
        verse_key: '4:110',
        theme: 'Janji Ampunan Bagi yang Memohon',
        relevance: 'Kepastian bahwa siapa pun yang berbuat keburukan lalu beristighfar memohon ampun dengan tulus, akan mendapati Allah Maha Pengampun lagi Maha Penyayang.',
      },
      {
        verse_key: '3:135',
        theme: 'Karakter Orang Bertakwa Saat Khilaf',
        relevance: 'Mengajarkan bahwa orang saleh bukanlah yang tanpa dosa, melainkan yang segera sadar mengingat Allah dan bertaubat ketika berbuat kekhilafan.',
      },
      {
        verse_key: '66:8',
        theme: 'Taubatan Nasuha (Taubat Murni)',
        relevance: 'Seruan untuk bertaubat dengan ketulusan penuh demi menghapus lembaran masa lalu dan memulai jalan hidup yang diridhai.',
      },
    ],
  },
  {
    id: 'science-nature',
    theme: 'Sains, Embriologi & Tanda Alam Semesta',
    explanation: 'Ayat-ayat kauniyah Al-Qur\'an mengajak akal meneliti tahapan penciptaan biologis dan keteraturan kosmologi.',
    keywords: [
      'sains', 'embrio', 'janin', 'penciptaan', 'biologi', 'kedokteran',
      'alam semesta', 'langit', 'bumi', 'bintang', 'hujan', 'ilmu pengetahuan'
    ],
    verses: [
      {
        verse_key: '23:12',
        theme: 'Asal Usul Biologis Manusia',
        relevance: 'Penciptaan manusia pertama yang bermula dari saripati tanah yang terpilih.',
      },
      {
        verse_key: '23:13',
        theme: 'Tempat Kokoh dalam Rahim',
        relevance: 'Deskripsi benih nutfah yang diletakkan dalam tempat perlindungan yang sangat aman dan kokoh (rahim).',
      },
      {
        verse_key: '23:14',
        theme: 'Tahapan Morfologi Embriologi Modern',
        relevance: 'Penjelasan akurat tahapan zigot (*nutfah*), segumpal darah (*\'alaqah*), segumpal daging (*mudghah*), pembentukan tulang, hingga dibalut daging yang diakui sains modern.',
      },
      {
        verse_key: '21:30',
        theme: 'Teori Awal Alam Semesta & Air Sumber Kehidupan',
        relevance: 'Isyarat fenomena kosmologi bahwa langit dan bumi dahulunya adalah satu kesatuan sebelum dipisahkan, serta air sebagai unsur esensial kehidupan.',
      },
      {
        verse_key: '51:47',
        theme: 'Ekspansi Alam Semesta (Expanding Universe)',
        relevance: 'Penciptaan langit dengan kekuasaan agung dan penegasan bahwa Allah senantiasa meluaskannya (*musi\'un*).',
      },
    ],
  },
  {
    id: 'justice-integrity',
    theme: 'Keadilan, Integritas Bisnis & Anti-Korupsi',
    explanation: 'Keadilan hukum dan kejujuran timbangan adalah pondasi utama tatanan peradaban dan moral masyarakat.',
    keywords: [
      'keadilan', 'jujur', 'timbangan', 'bisnis', 'dagang', 'hukum',
      'hakim', 'korupsi', 'amanah', 'adil', 'kejujuran', 'transaksi'
    ],
    verses: [
      {
        verse_key: '4:135',
        theme: 'Menegakkan Keadilan Tanpa Pandang Bulu',
        relevance: 'Perintah mutlak bersaksi dengan adil karena Allah sekalipun merugikan diri sendiri, orang tua, atau kerabat terdekat.',
      },
      {
        verse_key: '5:8',
        theme: 'Objektivitas Moral di Tengah Kebencian',
        relevance: 'Larangan bersikap tidak adil hanya karena rasa benci atau antipati kepada suatu golongan atau individu.',
      },
      {
        verse_key: '83:1',
        theme: 'Kecurangan Timbangan & Transaksi',
        relevance: 'Kecaman keras (*wayl*) terhadap para pelaku manipulasi takaran dan timbangan yang merugikan hak-hak orang lain dalam muamalah.',
      },
      {
        verse_key: '4:58',
        theme: 'Amanah Profesional & Keadilan Menghukumi',
        relevance: 'Kewajiban menyampaikan amanah kepada orang yang berhak dan menetapkan keputusan perkara di antara manusia dengan adil.',
      },
    ],
  },
  {
    id: 'brotherhood-tolerance',
    theme: 'Persaudaraan, Keragaman & Toleransi',
    explanation: 'Keragaman suku dan bangsa adalah rancangan Ilahi agar manusia saling mengenal, bukan saling menindas.',
    keywords: [
      'persaudaraan', 'toleransi', 'keberagaman', 'suku', 'bangsa',
      'keragaman', 'perbedaan', 'diskriminasi', 'damai', 'umat', 'ukhuwah'
    ],
    verses: [
      {
        verse_key: '49:13',
        theme: 'Keragaman Manusia untuk Saling Mengenal',
        relevance: 'Menegaskan hakikat penciptaan manusia berbangsa-bangsa dan bersuku-suku agar saling berinteraksi dan memahami (*lita\'arafu*), dengan takwa sebagai standar kemuliaan.',
      },
      {
        verse_key: '49:10',
        theme: 'Ikatan Persaudaraan Universal',
        relevance: 'Prinsip bahwa orang-orang beriman itu bersaudara utuh, dan kewajiban moral untuk selalu mendamaikan pihak yang berselisih.',
      },
      {
        verse_key: '60:8',
        theme: 'Berbuat Baik dan Adil Lintas Keyakinan',
        relevance: 'Pedoman toleransi dan kebaikan terhadap kaum yang tidak memerangi atau mengusir dari tanah air.',
      },
    ],
  },
  {
    id: 'ethics-speech',
    theme: 'Menjaga Lisan, Anti-Ghibah & Etika Bertutur',
    explanation: 'Kata-kata mencerminkan kematangan iman; menjauhi ghibah, fitnah, dan prasangka buruk menjaga kehormatan sesama.',
    keywords: [
      'fitnah', 'ghibah', 'gosip', 'lisan', 'bicara', 'prasangka',
      'mencela', 'hoaks', 'kata-kata', 'ngomong', 'berdebat'
    ],
    verses: [
      {
        verse_key: '49:12',
        theme: 'Menjauhi Prasangka dan Ghibah',
        relevance: 'Larangan keras berprasangka buruk, memata-matai cela orang lain, dan menggunjing yang diibaratkan seperti memakan bangkai saudaranya sendiri.',
      },
      {
        verse_key: '17:53',
        theme: 'Memilih Perkataan yang Terbaik',
        relevance: 'Perintah bertutur kata dengan ungkapan yang paling santun dan bernilai agar setan tidak memiliki celah memicu permusuhan.',
      },
      {
        verse_key: '104:1',
        theme: 'Ancaman Bagi Pencela dan Pengumpat',
        relevance: 'Peringatan keras bagi orang-orang yang gemar mencela di depan dan mengumpat di belakang orang lain (*humazah lumazah*).',
      },
    ],
  },
  {
    id: 'forgiveness-anger',
    theme: 'Menahan Amarah & Keutamaan Memaafkan',
    explanation: 'Kemenangan sejati adalah mengendalikan ego amarah dan membalas keburukan dengan kebajikan.',
    keywords: [
      'marah', 'memaafkan', 'dendam', 'sakit hati', 'emosi', 'maaf',
      'benci', 'jengkel', 'amarah', 'balas dendam'
    ],
    verses: [
      {
        verse_key: '3:134',
        theme: 'Menahan Amarah Ciri Orang Bertakwa',
        relevance: 'Karakter mulia orang bertakwa yang sanggup menahan ledakan amarah (*al-kazhiminal ghaizh*) dan berlapang dada memaafkan manusia.',
      },
      {
        verse_key: '41:34',
        theme: 'Membalas Keburukan dengan Kebaikan',
        relevance: 'Strategi akhlak luhur: membalas perlakuan buruk dengan cara yang jauh lebih baik sehingga permusuhan dapat berbalik menjadi persahabatan akrab.',
      },
      {
        verse_key: '42:40',
        theme: 'Pahala Besar Bagi yang Memaafkan',
        relevance: 'Memberikan kepastian bahwa siapa yang memaafkan kesalahan orang lain dan mengadakan perdamaian, pahalanya dijamin langsung oleh Allah.',
      },
    ],
  },
];

/**
 * Searches curated thematic knowledge bank by conceptual matching.
 *
 * @param {string} query
 * @param {number} limit
 * @returns {Promise<{ theme: string, explanation: string, results: Array<any> } | null>}
 */
async function searchCuratedThematicBank(query, limit = 5) {
  const cleanTokens = query.toLowerCase().split(/\s+/).filter((t) => t.length > 1);
  if (cleanTokens.length === 0) return null;

  let bestTopic = null;
  let highestScore = 0;

  for (const topic of THEMATIC_KNOWLEDGE_BANK) {
    let score = 0;

    for (const kw of topic.keywords) {
      // Exact substring or token match
      if (query.toLowerCase().includes(kw)) {
        score += 3;
      }
      for (const token of cleanTokens) {
        if (kw.includes(token) || token.includes(kw)) {
          score += 1;
        }
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestTopic = topic;
    }
  }

  if (!bestTopic || highestScore < 1) {
    return null;
  }

  const results = [];
  const selectedVerses = bestTopic.verses.slice(0, limit);

  for (const v of selectedVerses) {
    const [sId, aId] = v.verse_key.split(':').map(Number);
    try {
      const surahData = await getSurah(sId);
      const verseObj = surahData.verses.find((item) => item.n === aId);

      if (verseObj) {
        results.push({
          verse_key: v.verse_key,
          surah: sId,
          ayah: aId,
          surah_name: surahData.surah.name_simple,
          arabic: verseObj.text,
          translation: verseObj.translation,
          snippet: verseObj.translation,
          theme: v.theme,
          relevance: v.relevance,
          score: 0.95 - (results.length * 0.05),
        });
      }
    } catch (err) {
      console.warn(`Failed to hydrate verse ${v.verse_key}:`, err.message);
    }
  }

  return {
    theme: bestTopic.theme,
    explanation: bestTopic.explanation,
    results,
  };
}

/**
 * Performs semantic & thematic search over tafsir and verse content based on MEANING.
 *
 * @param {string} query
 * @param {number} [limit=5]
 * @returns {Promise<Array<{ verse_key: string, surah: number, ayah: number, surah_name?: string, arabic?: string, translation?: string, snippet: string, theme?: string, relevance?: string, score: number }>>}
 */
export async function searchSemanticTafsir(query, limit = 5) {
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return [];
  }

  const cleanQuery = query.trim();

  // 1. Try Gemini AI Thematic Tafsir Reasoning (True Deep Semantic Meaning)
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

      const prompt = `Anda adalah pakar Tafsir Tematik Al-Qur'an (Tafsir Maudhu'i) dan Tadabbur Al-Qur'an.
Pengguna mencari ayat-ayat Al-Qur'an berdasarkan MAKNA, KONSEP KEHIDUPAN, PERASAAN, ATAU PERTANYAAN REFLEKSI berikut:
"${cleanQuery}"

Tugas Anda:
1. Temukan dan pilih ${limit} ayat Al-Qur'an yang PALING RELEVAN secara makna, konteks, tafsir, hikmah, atau asbabun nuzul terhadap konsep yang dicari pengguna.
2. JANGAN mencari berdasarkan kesamaan kata harfiah (string matching), melainkan cari berdasarkan ESENSI MAKNA dan KANDUNGAN TAFSIR (misalnya: jika pengguna mencari "cemas/overthinking", ayat yang relevan adalah tentang ketenangan hati berzikir QS 13:28, kelapangan dada QS 94:5-6, ujian hidup QS 2:155, pertolongan Allah QS 2:286).
3. Tentukan tema konseptual utama yang menjawab pertanyaan pengguna.
4. Jelaskan secara ringkas dan mendalam (1-2 kalimat) mengapa ayat tersebut relevan dengan makna yang dicari pengguna (keterkaitan tafsir & tadabbur).

KEMBALIKAN OUTPUT HANYA DALAM FORMAT JSON DENGAN STRUKTUR:
{
  "theme": "Topik atau tema makna Al-Qur'an",
  "explanation": "Ringkasan konsep Al-Qur'an terkait topik ini (1-2 kalimat)",
  "verses": [
    {
      "verse_key": "surah:ayah",
      "theme": "Sub-tema spesifik ayat ini",
      "relevance": "Penjelasan mengapa ayat ini relevan secara makna dan tafsir dengan kebutuhan pengguna"
    }
  ]
}
Pastikan nomor surah (1-114) dan nomor ayat valid.`;

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const rawText = (response.text || '').trim();
      const cleanJson = rawText.replace(/^```json/i, '').replace(/```$/i, '').trim();
      const parsed = JSON.parse(cleanJson);

      if (parsed && Array.isArray(parsed.verses) && parsed.verses.length > 0) {
        const enrichedResults = [];

        for (const v of parsed.verses.slice(0, limit)) {
          const rawKey = String(v.verse_key || '').split('-')[0].trim();
          const [sId, aId] = rawKey.split(':').map(Number);

          if (!isNaN(sId) && !isNaN(aId) && sId >= 1 && sId <= 114 && aId >= 1) {
            try {
              const surahData = await getSurah(sId);
              const verseObj = surahData.verses.find((item) => item.n === aId);

              if (verseObj) {
                enrichedResults.push({
                  verse_key: `${sId}:${aId}`,
                  surah: sId,
                  ayah: aId,
                  surah_name: surahData.surah.name_simple,
                  arabic: verseObj.text,
                  translation: verseObj.translation,
                  snippet: verseObj.translation,
                  theme: v.theme || parsed.theme,
                  relevance: v.relevance,
                  score: 0.98 - (enrichedResults.length * 0.05),
                });
              }
            } catch (err) {
              console.warn(`Error loading surah ${sId} for verse ${rawKey}:`, err.message);
            }
          }
        }

        if (enrichedResults.length > 0) {
          // Attach thematic metadata to the returned array
          enrichedResults.theme = parsed.theme;
          enrichedResults.explanation = parsed.explanation;
          return enrichedResults;
        }
      }
    } catch (aiErr) {
      console.warn('Gemini Thematic AI Search failed, falling back to curated bank:', aiErr.message);
    }
  }

  // 2. High-Precision Curated Thematic Knowledge Bank Fallback
  const curatedMatch = await searchCuratedThematicBank(cleanQuery, limit);
  if (curatedMatch && curatedMatch.results.length > 0) {
    const results = curatedMatch.results;
    results.theme = curatedMatch.theme;
    results.explanation = curatedMatch.explanation;
    return results;
  }

  // 3. Supabase pgvector Embedding Fallback
  try {
    const supabase = await getSupabaseServerClient();
    if (supabase && apiKey) {
      const ai = new GoogleGenAI({ apiKey });
      const embeddingModel = process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004';

      const embedRes = await ai.models.embedContent({
        model: embeddingModel,
        contents: cleanQuery,
      });

      const queryVector = embedRes.embedding?.values;
      if (queryVector) {
        const { data, error } = await supabase.rpc('match_tafsir', {
          query_embedding: queryVector,
          match_threshold: 0.5,
          match_count: limit,
        });

        if (!error && Array.isArray(data) && data.length > 0) {
          const results = [];
          for (const row of data) {
            const [sId, aId] = row.verse_key.split(':').map(Number);
            const surahData = await getSurah(sId).catch(() => null);
            const verseObj = surahData?.verses?.find((item) => item.n === aId);

            results.push({
              verse_key: row.verse_key,
              surah: row.surah,
              ayah: row.ayah,
              surah_name: surahData?.surah?.name_simple,
              arabic: verseObj?.text,
              translation: verseObj?.translation || row.content,
              snippet: verseObj?.translation || row.content,
              theme: 'Rujukan Tematik Terdekat',
              relevance: row.content,
              score: row.similarity,
            });
          }
          return results;
        }
      }
    }
  } catch (err) {
    console.warn('Supabase semantic search fallback:', err.message);
  }

  // 4. Local Static Index Fallback
  try {
    const indexPath = path.join(process.cwd(), 'data', 'semantic-index.json');
    if (fs.existsSync(indexPath)) {
      const raw = fs.readFileSync(indexPath, 'utf8');
      const items = JSON.parse(raw);
      const queryTokens = cleanQuery.toLowerCase().split(/\s+/).filter(Boolean);

      const scored = items
        .map((item) => {
          const text = (item.content || '').toLowerCase();
          let matchCount = 0;
          for (const token of queryTokens) {
            if (text.includes(token)) {
              matchCount += 1;
            }
          }
          const score = queryTokens.length > 0 ? matchCount / queryTokens.length : 0;
          return {
            verse_key: item.verse_key,
            surah: item.surah,
            ayah: item.ayah,
            surah_name: item.surah_name,
            arabic: item.arabic,
            translation: item.translation,
            snippet: item.translation || item.content,
            theme: 'Pencarian Indeks Tematik',
            relevance: 'Ayat ini memuat rujukan kata dan konteks yang terkait dengan topik yang dicari.',
            score,
          };
        })
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      if (scored.length > 0) return scored;
    }
  } catch (localErr) {
    console.warn('Local index search failed:', localErr);
  }

  return [];
}
