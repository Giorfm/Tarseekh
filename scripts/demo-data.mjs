/**
 * scripts/demo-data.mjs
 * Generates sample demo progress for Tarseekh presentation & evaluation.
 *
 * Usage:
 *   node scripts/demo-data.mjs
 */

const today = new Date().toISOString().split('T')[0];

const demoData = {
  streak: {
    current_streak: 5,
    longest_streak: 12,
    last_active_date: today,
  },
  lastPosition: {
    verseKey: '2:255',
    surah: 2,
    ayah: 255,
    page: 42,
  },
  quests: [
    {
      id: `quest-${today}-read`,
      type: 'read',
      title: 'Tilawah Harian',
      description: 'Baca minimal 5 ayat Al-Qur\'an hari ini',
      target: { count: 5, unit: 'ayat' },
      progress: 4,
      status: 'pending',
      action_href: '/quran/2?verse=2:255',
    },
    {
      id: `quest-${today}-recite`,
      type: 'recite',
      title: 'Latihan Hafalan & Suara',
      description: 'Lafalkan minimal 1 ayat dengan fitur Pelacak Suara atau Mode Hafalan',
      target: { count: 1, unit: 'sesi' },
      progress: 1,
      status: 'completed',
      completed_at: new Date().toISOString(),
      action_href: '/hafalan',
    },
    {
      id: `quest-${today}-reflect`,
      type: 'reflect',
      title: 'Tadabbur Makna',
      description: 'Gunakan fitur Tanya AI untuk merenungkan makna atau tafsir ayat yang dibaca',
      target: { count: 1, unit: 'pertanyaan' },
      progress: 1,
      status: 'claimed',
      completed_at: new Date().toISOString(),
      action_href: '/quran',
    },
  ],
  memorization: [
    {
      surah: 112,
      ayah: 1,
      ease: 2.6,
      interval: 6,
      reps: 2,
      dueDate: today,
      lastResult: 5,
    },
    {
      surah: 112,
      ayah: 2,
      ease: 2.5,
      interval: 1,
      reps: 1,
      dueDate: today,
      lastResult: 3,
    },
    {
      surah: 114,
      ayah: 1,
      ease: 2.7,
      interval: 12,
      reps: 3,
      dueDate: '2026-11-01',
      lastResult: 5,
    },
  ],
  bookmarks: ['2:255', '3:190', '59:22'],
};

console.log('=== Tarseekh Demo Data Generator ===');
console.log('To populate this demo data in your browser console, copy and paste the snippet below:');
console.log('\n----------------- COPY SNIPPET BELOW -----------------');
console.log(`
localStorage.setItem('tarseekh_streak', JSON.stringify(${JSON.stringify(demoData.streak)}));
localStorage.setItem('tarseekh_last_position_v1', JSON.stringify(${JSON.stringify(demoData.lastPosition)}));
localStorage.setItem('tarseekh_quests_${today}', JSON.stringify(${JSON.stringify(demoData.quests)}));
localStorage.setItem('tarseekh_memorization_v1', JSON.stringify(${JSON.stringify(demoData.memorization)}));
localStorage.setItem('tarseekh_bookmarks_v1', JSON.stringify(${JSON.stringify(demoData.bookmarks)}));
console.log("✅ Demo data successfully loaded! Refresh the page to see live dashboard.");
\`);
console.log('----------------- END SNIPPET -----------------\\n');
