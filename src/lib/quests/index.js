/**
 * Daily Quest Engine
 * Generates and updates the 3 daily recommended quests:
 * 1. Baca (Reading: N verses or 1 page)
 * 2. Latih (Recite / Memorize: audio tracking test or murajaah)
 * 3. Renungkan (Reflect / Tadabbur: ask AI contextual tafsir)
 *
 * Compliant with PRD FR-7:
 * - Adaptive targets based on user settings and streak
 * - Auto-advances progress when reading/recitation/chat events occur
 * - Completed quests cannot be claimed twice
 */

/**
 * @typedef {'read' | 'recite' | 'reflect'} QuestType
 * @typedef {'pending' | 'completed' | 'claimed'} QuestStatus
 *
 * @typedef {Object} QuestItem
 * @property {string} id
 * @property {QuestType} type
 * @property {string} title
 * @property {string} description
 * @property {{ count: number, unit: string, targetKey?: string }} target
 * @property {number} progress
 * @property {QuestStatus} status
 * @property {string} [completed_at]
 * @property {string} [action_href]
 */

/**
 * Generates the 3 daily quests for a given date and user profile.
 *
 * @param {Object} options
 * @param {string} options.questDate YYYY-MM-DD
 * @param {Object} [options.userProfile]
 * @param {number} [options.userProfile.daily_goal_ayah=5]
 * @param {string} [options.userProfile.reading_view='ayat']
 * @param {number} [options.consecutiveDaysCompleted=0]
 * @returns {QuestItem[]}
 */
export function generateDailyQuests({
  questDate,
  userProfile = {},
  consecutiveDaysCompleted = 0,
}) {
  const isPageMode = userProfile.reading_view === 'halaman';
  let baseAyahGoal = userProfile.daily_goal_ayah || 5;

  // Adaptive scaling: If user completed quests for 3+ consecutive days, gently bump goal (+2 verses)
  if (consecutiveDaysCompleted >= 3 && !isPageMode) {
    baseAyahGoal += 2;
  }

  const readTargetCount = isPageMode ? 1 : Math.max(3, baseAyahGoal);
  const readUnit = isPageMode ? 'halaman' : 'ayat';

  return [
    {
      id: `quest-${questDate}-read`,
      type: 'read',
      title: 'Tilawah Harian',
      description: isPageMode
        ? 'Baca minimal 1 halaman mushaf dengan tartil'
        : `Baca minimal ${readTargetCount} ayat Al-Qur'an hari ini`,
      target: {
        count: readTargetCount,
        unit: readUnit,
      },
      progress: 0,
      status: 'pending',
      action_href: '/quran',
    },
    {
      id: `quest-${questDate}-recite`,
      type: 'recite',
      title: 'Latihan Hafalan & Suara',
      description: 'Lafalkan minimal 1 ayat dengan fitur Pelacak Suara atau Mode Hafalan',
      target: {
        count: 1,
        unit: 'sesi',
      },
      progress: 0,
      status: 'pending',
      action_href: '/hafalan',
    },
    {
      id: `quest-${questDate}-reflect`,
      type: 'reflect',
      title: 'Tadabbur Makna',
      description: 'Gunakan fitur Tanya AI untuk merenungkan makna atau tafsir ayat yang dibaca',
      target: {
        count: 1,
        unit: 'pertanyaan',
      },
      progress: 0,
      status: 'pending',
      action_href: '/quran',
    },
  ];
}

/**
 * Applies an activity event to an array of quests, updating their progress and completion status.
 *
 * @param {QuestItem[]} quests
 * @param {Object} event
 * @param {QuestType} event.type 'read' | 'recite' | 'reflect'
 * @param {number} [event.amount=1]
 * @returns {{ quests: QuestItem[], newlyCompleted: QuestItem[] }}
 */
export function applyActivityToQuests(quests, event) {
  if (!Array.isArray(quests) || !event?.type) {
    return { quests: quests || [], newlyCompleted: [] };
  }

  const newlyCompleted = [];
  const updatedQuests = quests.map((quest) => {
    // Only update matching type
    if (quest.type !== event.type) return quest;

    const increment = Number.isInteger(event.amount) ? event.amount : 1;
    const newProgress = Math.min(quest.target.count, quest.progress + increment);
    const isNowFinished = newProgress >= quest.target.count;

    if (isNowFinished && quest.status === 'pending') {
      const completedQuest = {
        ...quest,
        progress: newProgress,
        status: /** @type {QuestStatus} */ ('completed'),
        completed_at: new Date().toISOString(),
      };
      newlyCompleted.push(completedQuest);
      return completedQuest;
    }

    return {
      ...quest,
      progress: newProgress,
    };
  });

  return { quests: updatedQuests, newlyCompleted };
}

/**
 * Marks a completed quest as claimed. Idempotent: returns error if not completed or already claimed.
 *
 * @param {QuestItem[]} quests
 * @param {string} questId
 * @returns {{ success: boolean, quests: QuestItem[], error?: string }}
 */
export function claimQuestReward(quests, questId) {
  if (!Array.isArray(quests)) {
    return { success: false, quests: [], error: 'Daftar quest kosong' };
  }

  const target = quests.find((q) => q.id === questId);
  if (!target) {
    return { success: false, quests, error: 'Quest tidak ditemukan' };
  }

  if (target.status === 'claimed') {
    return { success: false, quests, error: 'Hadiah quest sudah diklaim' };
  }

  if (target.status !== 'completed') {
    return { success: false, quests, error: 'Quest belum selesai' };
  }

  const updatedQuests = quests.map((q) =>
    q.id === questId ? { ...q, status: /** @type {QuestStatus} */ ('claimed') } : q
  );

  return { success: true, quests: updatedQuests };
}

// ----------------------------------------------------------------------------
// Local Storage Persistence (for Guest / Offline Mode)
// ----------------------------------------------------------------------------
const QUEST_STORAGE_KEY_PREFIX = 'tarseekh_quests_';
const LEGACY_QUEST_STORAGE_KEY_PREFIX = 'tadabbur_quests_';

export function getLocalQuests(questDate, userProfile = {}) {
  if (typeof window === 'undefined') {
    return generateDailyQuests({ questDate, userProfile });
  }

  try {
    const raw =
      localStorage.getItem(`${QUEST_STORAGE_KEY_PREFIX}${questDate}`) ||
      localStorage.getItem(`${LEGACY_QUEST_STORAGE_KEY_PREFIX}${questDate}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Gagal membaca quest dari localStorage:', err);
  }

  const fresh = generateDailyQuests({ questDate, userProfile });
  saveLocalQuests(questDate, fresh);
  return fresh;
}

export function saveLocalQuests(questDate, quests) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${QUEST_STORAGE_KEY_PREFIX}${questDate}`, JSON.stringify(quests));
  } catch (err) {
    console.warn('Gagal menyimpan quest ke localStorage:', err);
  }
}
