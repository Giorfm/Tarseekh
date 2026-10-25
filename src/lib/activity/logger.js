import { getLocalTodayString, recordActivityStreak } from '@/lib/streak';
import { getLocalQuests, saveLocalQuests, applyActivityToQuests } from '@/lib/quests';

let dwellTimer = null;
let pendingReadVerses = new Set();

/**
 * Logs user activity to both local storage (immediate UX) and server API / Supabase.
 *
 * @param {Object} options
 * @param {'read'|'recite'|'memorize'|'reflect'} options.type
 * @param {number} [options.surah=1]
 * @param {number} [options.ayah_from=1]
 * @param {number} [options.ayah_to=1]
 * @param {number} [options.amount=1]
 * @param {number} [options.duration_sec=0]
 * @param {Object} [options.recitation]
 * @param {string} [options.timezone='Asia/Jakarta']
 */
export async function logActivity({
  type,
  surah = 1,
  ayah_from = 1,
  ayah_to = 1,
  amount = 1,
  duration_sec = 0,
  recitation,
  timezone = 'Asia/Jakarta',
}) {
  if (typeof window === 'undefined') return;

  const today = getLocalTodayString(new Date(), timezone);

  // 1. Immediately update Local Streak
  try {
    const rawStreak = localStorage.getItem('tarseekh_streak') || localStorage.getItem('tadabbur_streak');
    const currentStreak = rawStreak
      ? JSON.parse(rawStreak)
      : { current_streak: 0, longest_streak: 0, last_active_date: null };

    const updatedStreak = recordActivityStreak(currentStreak, today, timezone);
    localStorage.setItem('tarseekh_streak', JSON.stringify(updatedStreak));
  } catch (err) {
    console.warn('Error updating local streak:', err);
  }

  // 2. Immediately update Local Quests
  try {
    const questType = type === 'memorize' ? 'recite' : type;
    const currentQuests = getLocalQuests(today);
    const { quests: updatedQuests } = applyActivityToQuests(currentQuests, {
      type: questType,
      amount,
    });
    saveLocalQuests(today, updatedQuests);
  } catch (err) {
    console.warn('Error updating local quests:', err);
  }

  // 3. Send to Server API in background
  try {
    fetch('/api/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        surah,
        ayah_from,
        ayah_to,
        duration_sec,
        recitation,
        timezone,
      }),
    }).catch(() => {});
  } catch {
    // Non-blocking
  }
}

/**
 * Records a verse read with a 3-second dwell debounce to avoid spamming activity logs.
 *
 * @param {number} surah
 * @param {number} ayah
 * @param {string} [timezone='Asia/Jakarta']
 */
export function recordVerseDwell(surah, ayah, timezone = 'Asia/Jakarta') {
  pendingReadVerses.add(`${surah}:${ayah}`);

  if (dwellTimer) {
    clearTimeout(dwellTimer);
  }

  dwellTimer = setTimeout(() => {
    if (pendingReadVerses.size > 0) {
      const verseArray = Array.from(pendingReadVerses).map((k) => {
        const [, a] = k.split(':').map(Number);
        return a;
      });
      const minAyah = Math.min(...verseArray);
      const maxAyah = Math.max(...verseArray);
      const count = pendingReadVerses.size;

      logActivity({
        type: 'read',
        surah,
        ayah_from: minAyah,
        ayah_to: maxAyah,
        amount: count,
        timezone,
      });

      pendingReadVerses.clear();
    }
  }, 3000);
}
