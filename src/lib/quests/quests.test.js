import { describe, it, expect } from 'vitest';
import {
  generateDailyQuests,
  applyActivityToQuests,
  claimQuestReward,
} from './index.js';

describe('Daily Quest Engine', () => {
  it('generates 3 daily quests with correct types and targets', () => {
    const quests = generateDailyQuests({
      questDate: '2026-10-23',
      userProfile: { daily_goal_ayah: 5, reading_view: 'ayat' },
    });

    expect(quests).toHaveLength(3);
    const types = quests.map((q) => q.type);
    expect(types).toEqual(['read', 'recite', 'reflect']);

    const readQuest = quests.find((q) => q.type === 'read');
    expect(readQuest.target.count).toBe(5);
    expect(readQuest.target.unit).toBe('ayat');
    expect(readQuest.status).toBe('pending');
  });

  it('adjusts read quest target for page reading view', () => {
    const quests = generateDailyQuests({
      questDate: '2026-10-23',
      userProfile: { reading_view: 'halaman' },
    });

    const readQuest = quests.find((q) => q.type === 'read');
    expect(readQuest.target.count).toBe(1);
    expect(readQuest.target.unit).toBe('halaman');
  });

  it('adaptively increases goal if user has high consecutive days', () => {
    const quests = generateDailyQuests({
      questDate: '2026-10-23',
      userProfile: { daily_goal_ayah: 5, reading_view: 'ayat' },
      consecutiveDaysCompleted: 3,
    });

    const readQuest = quests.find((q) => q.type === 'read');
    expect(readQuest.target.count).toBe(7); // 5 + 2
  });

  it('progresses quests on matching activity event', () => {
    const initialQuests = generateDailyQuests({ questDate: '2026-10-23' });
    const { quests, newlyCompleted } = applyActivityToQuests(initialQuests, {
      type: 'read',
      amount: 3,
    });

    const readQuest = quests.find((q) => q.type === 'read');
    expect(readQuest.progress).toBe(3);
    expect(readQuest.status).toBe('pending');
    expect(newlyCompleted).toHaveLength(0);
  });

  it('marks quest completed when target is reached', () => {
    const initialQuests = generateDailyQuests({ questDate: '2026-10-23' });
    const { quests, newlyCompleted } = applyActivityToQuests(initialQuests, {
      type: 'recite',
      amount: 1,
    });

    const reciteQuest = quests.find((q) => q.type === 'recite');
    expect(reciteQuest.progress).toBe(1);
    expect(reciteQuest.status).toBe('completed');
    expect(reciteQuest.completed_at).toBeDefined();
    expect(newlyCompleted).toHaveLength(1);
    expect(newlyCompleted[0].id).toBe(reciteQuest.id);
  });

  it('prevents double-claiming a completed quest', () => {
    const initialQuests = generateDailyQuests({ questDate: '2026-10-23' });
    const { quests: activeQuests } = applyActivityToQuests(initialQuests, {
      type: 'reflect',
      amount: 1,
    });

    const reflectQuestId = activeQuests.find((q) => q.type === 'reflect').id;

    // First claim succeeds
    const firstClaim = claimQuestReward(activeQuests, reflectQuestId);
    expect(firstClaim.success).toBe(true);
    expect(firstClaim.quests.find((q) => q.id === reflectQuestId).status).toBe('claimed');

    // Second claim fails
    const secondClaim = claimQuestReward(firstClaim.quests, reflectQuestId);
    expect(secondClaim.success).toBe(false);
    expect(secondClaim.error).toContain('sudah diklaim');
  });

  it('rejects claiming an incomplete quest', () => {
    const initialQuests = generateDailyQuests({ questDate: '2026-10-23' });
    const readQuestId = initialQuests.find((q) => q.type === 'read').id;

    const claimResult = claimQuestReward(initialQuests, readQuestId);
    expect(claimResult.success).toBe(false);
    expect(claimResult.error).toContain('belum selesai');
  });
});
