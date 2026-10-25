'use client';

import React from 'react';
import Link from 'next/link';
import { Target, CheckCircle2, Gift, BookOpen, Mic, Sparkles, ArrowRight } from 'lucide-react';

/**
 * DailyQuestsCard displays the 3 daily recommended quests with dynamic progress.
 *
 * @param {Object} props
 * @param {Array} props.quests
 * @param {Function} [props.onClaim]
 */
export function DailyQuestsCard({ quests = [], onClaim }) {
  const getIcon = (type) => {
    switch (type) {
      case 'read':
        return <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case 'recite':
        return <Mic className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      case 'reflect':
        return <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
      default:
        return <Target className="w-4 h-4 text-brand-primary" />;
    }
  };

  const completedCount = quests.filter((q) => q.status === 'completed' || q.status === 'claimed').length;

  return (
    <div className="bg-white dark:bg-brand-dark-surface rounded-3xl p-5 border border-emerald-950/10 dark:border-white/10 shadow-sm space-y-4">
      {/* Title & summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-brand-primary/10 text-brand-primary dark:text-brand-dark-primary">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-brand-charcoal dark:text-white">
              Quest Harian
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Selesaikan target harian untuk menjaga istiqamah
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-brand-primary dark:text-brand-dark-primary border border-emerald-200 dark:border-emerald-800/50">
          <span>{completedCount}/3 Selesai</span>
        </div>
      </div>

      {/* Quests List */}
      <div className="space-y-3">
        {quests.map((quest) => {
          const targetCount = quest.target?.count || 1;
          const currentProgress = quest.progress || 0;
          const percent = Math.min(100, Math.round((currentProgress / targetCount) * 100));
          const isDone = quest.status === 'completed' || quest.status === 'claimed';
          const isClaimable = quest.status === 'completed';
          const isClaimed = quest.status === 'claimed';

          return (
            <div
              key={quest.id}
              className={`p-3.5 rounded-2xl border transition-all ${
                isDone
                  ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-800/30'
                  : 'bg-brand-bg/50 dark:bg-white/5 border-black/5 dark:border-white/5'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5 flex-1 min-w-0">
                  <div className="mt-0.5 p-1.5 rounded-lg bg-white dark:bg-brand-dark-surface shadow-xs border border-black/5 dark:border-white/5">
                    {getIcon(quest.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-brand-charcoal dark:text-white truncate">
                        {quest.title}
                      </h4>
                      {isClaimed && (
                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3" /> Klaim
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">
                      {quest.description}
                    </p>
                  </div>
                </div>

                {/* Action button */}
                <div className="shrink-0">
                  {isClaimable ? (
                    <button
                      onClick={() => onClaim && onClaim(quest.id)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs animate-bounce"
                    >
                      <Gift className="w-3.5 h-3.5" />
                      <span>Klaim</span>
                    </button>
                  ) : isClaimed ? (
                    <div className="px-2.5 py-1 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                      Selesai
                    </div>
                  ) : (
                    <Link
                      href={quest.action_href || '/quran'}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white dark:bg-white/10 hover:bg-black/5 text-gray-600 dark:text-gray-300 font-medium text-xs border border-black/5 dark:border-white/10 transition-colors"
                    >
                      <span>Mulai</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-3 flex items-center gap-3">
                <div className="flex-1 h-2 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isDone
                        ? 'bg-emerald-500 dark:bg-emerald-400'
                        : 'bg-brand-primary dark:bg-brand-dark-primary'
                    }`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 shrink-0">
                  {currentProgress}/{targetCount} {quest.target?.unit || ''}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
