import { describe, it, expect } from 'vitest';
import {
  getLocalTodayString,
  getYesterdayString,
  recordActivityStreak,
  getPast7DaysIndicators,
} from './index.js';

describe('Streak Calculation Service', () => {
  it('correctly calculates local date string across timezones', () => {
    // 2026-10-23 01:00:00 UTC is 2026-10-23 08:00:00 in Asia/Jakarta
    const utcDate = new Date('2026-10-23T01:00:00Z');
    expect(getLocalTodayString(utcDate, 'Asia/Jakarta')).toBe('2026-10-23');

    // 2026-10-23 23:00:00 UTC is 2026-10-24 in Asia/Tokyo (+9)
    const lateUtc = new Date('2026-10-23T23:00:00Z');
    expect(getLocalTodayString(lateUtc, 'Asia/Tokyo')).toBe('2026-10-24');
  });

  it('determines yesterday correctly', () => {
    expect(getYesterdayString('2026-10-23')).toBe('2026-10-22');
    expect(getYesterdayString('2026-03-01')).toBe('2026-02-28');
    expect(getYesterdayString('2026-01-01')).toBe('2025-12-31');
  });

  it('initializes streak on first activity', () => {
    const initial = { current_streak: 0, longest_streak: 0, last_active_date: null };
    const result = recordActivityStreak(initial, '2026-10-23');

    expect(result.current_streak).toBe(1);
    expect(result.longest_streak).toBe(1);
    expect(result.last_active_date).toBe('2026-10-23');
    expect(result.incremented).toBe(true);
  });

  it('is idempotent when activity occurs multiple times on the same day', () => {
    const todayState = { current_streak: 5, longest_streak: 10, last_active_date: '2026-10-23' };
    const result = recordActivityStreak(todayState, '2026-10-23');

    expect(result.current_streak).toBe(5);
    expect(result.longest_streak).toBe(10);
    expect(result.last_active_date).toBe('2026-10-23');
    expect(result.incremented).toBe(false);
  });

  it('increments streak when active on consecutive day', () => {
    const state = { current_streak: 3, longest_streak: 5, last_active_date: '2026-10-22' };
    const result = recordActivityStreak(state, '2026-10-23');

    expect(result.current_streak).toBe(4);
    expect(result.longest_streak).toBe(5);
    expect(result.last_active_date).toBe('2026-10-23');
    expect(result.incremented).toBe(true);
  });

  it('updates longest_streak if current exceeds previous record', () => {
    const state = { current_streak: 5, longest_streak: 5, last_active_date: '2026-10-22' };
    const result = recordActivityStreak(state, '2026-10-23');

    expect(result.current_streak).toBe(6);
    expect(result.longest_streak).toBe(6);
    expect(result.incremented).toBe(true);
  });

  it('resets streak to 1 if user skipped a day or more', () => {
    const state = { current_streak: 12, longest_streak: 20, last_active_date: '2026-10-20' };
    const result = recordActivityStreak(state, '2026-10-23');

    expect(result.current_streak).toBe(1);
    expect(result.longest_streak).toBe(20); // preserves longest
    expect(result.last_active_date).toBe('2026-10-23');
    expect(result.incremented).toBe(true);
  });

  it('generates 7-day indicators with correct day labels and active status', () => {
    const streakState = { current_streak: 3, last_active_date: '2026-10-23' };
    const refDate = new Date('2026-10-23T12:00:00Z');
    const days = getPast7DaysIndicators(streakState, 'Asia/Jakarta', refDate);

    expect(days).toHaveLength(7);
    expect(days[6].isToday).toBe(true);
    expect(days[6].date).toBe('2026-10-23');
    expect(days[6].isActive).toBe(true); // Today is active
    expect(days[5].date).toBe('2026-10-22');
    expect(days[5].isActive).toBe(true); // Yesterday is active
    expect(days[4].date).toBe('2026-10-21');
    expect(days[4].isActive).toBe(true); // 2 days ago is active
    expect(days[3].date).toBe('2026-10-20');
    expect(days[3].isActive).toBe(false); // 3 days ago is inactive (streak=3)
  });
});
