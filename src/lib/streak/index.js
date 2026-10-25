/**
 * Streak Calculation Service
 * Calculates user streak based on local timezone and activity dates.
 * Compliant with PRD FR-6:
 * - Timezone-aware date boundaries (Intl.DateTimeFormat)
 * - Idempotent: Does not increment twice on the same calendar day
 * - Consecutive day checking (yesterday vs earlier)
 */

/**
 * Gets a YYYY-MM-DD formatted date string for a given date in a specific timezone.
 * Defaults to 'Asia/Jakarta' if timezone is invalid or unspecified.
 *
 * @param {Date|string|number} [date=new Date()]
 * @param {string} [timezone='Asia/Jakarta']
 * @returns {string} YYYY-MM-DD
 */
export function getLocalTodayString(date = new Date(), timezone = 'Asia/Jakarta') {
  const d = date instanceof Date ? date : new Date(date);
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(d);
  } catch {
    // Fallback if timezone string is invalid
    return d.toISOString().split('T')[0];
  }
}

/**
 * Gets the previous day's YYYY-MM-DD string relative to a given YYYY-MM-DD.
 *
 * @param {string} dateString YYYY-MM-DD
 * @returns {string} YYYY-MM-DD
 */
export function getYesterdayString(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().split('T')[0];
}

/**
 * Calculates updated streak state when activity occurs.
 *
 * @param {Object} currentStreakState
 * @param {number} currentStreakState.current_streak
 * @param {number} currentStreakState.longest_streak
 * @param {string|null} currentStreakState.last_active_date YYYY-MM-DD
 * @param {string} [todayString] Optional override for testing
 * @param {string} [timezone='Asia/Jakarta']
 * @returns {{ current_streak: number, longest_streak: number, last_active_date: string, incremented: boolean }}
 */
export function recordActivityStreak(currentStreakState, todayString, timezone = 'Asia/Jakarta') {
  const today = todayString || getLocalTodayString(new Date(), timezone);
  const { current_streak = 0, longest_streak = 0, last_active_date = null } = currentStreakState || {};

  // Case 1: Already active today -> No change, idempotent
  if (last_active_date === today) {
    return {
      current_streak,
      longest_streak,
      last_active_date: today,
      incremented: false,
    };
  }

  const yesterday = getYesterdayString(today);

  // Case 2: Last active was yesterday -> Consecutive day streak!
  if (last_active_date === yesterday) {
    const newStreak = current_streak + 1;
    return {
      current_streak: newStreak,
      longest_streak: Math.max(longest_streak, newStreak),
      last_active_date: today,
      incremented: true,
    };
  }

  // Case 3: First time or streak broken (last active was before yesterday)
  return {
    current_streak: 1,
    longest_streak: Math.max(longest_streak, 1),
    last_active_date: today,
    incremented: true,
  };
}

/**
 * Generates an array of the past 7 days for the dashboard indicator.
 *
 * @param {Object} streakState
 * @param {string} [timezone='Asia/Jakarta']
 * @param {Date} [referenceDate=new Date()]
 * @returns {Array<{ date: string, dayLabel: string, isToday: boolean, isActive: boolean }>}
 */
export function getPast7DaysIndicators(streakState, timezone = 'Asia/Jakarta', referenceDate = new Date()) {
  const today = getLocalTodayString(referenceDate, timezone);
  const days = [];

  const dayNamesIndo = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  const [todayYear, todayMonth, todayDay] = today.split('-').map(Number);
  const baseUtc = new Date(Date.UTC(todayYear, todayMonth - 1, todayDay));

  const currentStreak = streakState?.current_streak || 0;
  const lastActiveDate = streakState?.last_active_date;

  for (let i = 6; i >= 0; i--) {
    const targetUtc = new Date(baseUtc);
    targetUtc.setUTCDate(targetUtc.getUTCDate() - i);
    const dateStr = targetUtc.toISOString().split('T')[0];
    const isToday = dateStr === today;

    // Check if this date was active based on current streak and last_active_date
    let isActive = false;
    if (lastActiveDate && currentStreak > 0) {
      const lastActiveUtc = new Date(lastActiveDate + 'T00:00:00Z');
      const diffDays = Math.round((lastActiveUtc - targetUtc) / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays < currentStreak) {
        isActive = true;
      }
    }

    const dayOfWeek = targetUtc.getUTCDay();
    days.push({
      date: dateStr,
      dayLabel: dayNamesIndo[dayOfWeek],
      isToday,
      isActive,
    });
  }

  return days;
}
