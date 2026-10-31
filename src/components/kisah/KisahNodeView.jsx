'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, BookOpen, Lock, Lightbulb, Landmark, MessageSquareQuote, CheckCircle2 } from 'lucide-react';
import { formatAyatRef } from '@/lib/kisah/loader';
import { getCompletedNodes, getNodeStates, markNodeCompleted } from '@/lib/kisah/progress';
import { getKisahIcon, KISAH_TAGS } from './kisahUi';

function TagChip({ tag }) {
  const config = KISAH_TAGS[tag];
  if (!config) return null;
  return (
    <span
      title={config.description}
      className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${config.className}`}
    >
      {config.label}
    </span>
  );
}

/**
 * KisahNodeView renders one story milestone: narrative, ayat, hadith, context and reflection.
 *
 * @param {Object} props
 * @param {{slug: string, title: string, total: number}} props.kisah
 * @param {string[]} props.nodeIds all node ids in order (to derive lock state)
 * @param {Object} props.node
 * @param {Array} props.ayatGroups [{ ref, surahName, verses: [{ key, n, text, translation }] }]
 * @param {string|null} props.nextNodeId
 */
export function KisahNodeView({ kisah, nodeIds, node, ayatGroups, nextNodeId }) {
  const router = useRouter();
  const [state, setState] = useState(null); // 'completed' | 'current' | 'locked'

  useEffect(() => {
    const states = getNodeStates(nodeIds.map((id) => ({ id })), getCompletedNodes(kisah.slug));
    setState(states[node.id] || 'locked');
  }, [kisah.slug, nodeIds, node.id]);

  const Icon = getKisahIcon(node.icon);
  const isSpecial = node.type === 'reflection';

  const handleComplete = () => {
    markNodeCompleted(kisah.slug, node.id);
    router.push(nextNodeId ? `/kisah/${kisah.slug}/${nextNodeId}` : '/kisah');
  };

  return (
    <div className="min-h-full">
      {/* Top Bar */}
      <header className="sticky top-0 z-20 bg-white/90 dark:bg-brand-dark-surface/90 backdrop-blur-md border-b border-emerald-950/10 dark:border-white/10 px-3 py-2.5 flex items-center justify-between gap-2 shadow-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <Link
            href="/kisah"
            className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-gray-700 dark:text-gray-200 transition-colors"
            aria-label="Kembali ke perjalanan kisah"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="truncate">
            <h1 className="font-bold text-sm md:text-base text-brand-charcoal dark:text-white leading-tight truncate">
              {node.title}
            </h1>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
              Kisah {kisah.title} &bull; Bagian {node.order} dari {kisah.total}
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-5 md:py-8 space-y-5">
        {state === null ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-36 bg-gray-200 dark:bg-white/5 rounded-3xl" />
            <div className="h-64 bg-gray-200 dark:bg-white/5 rounded-3xl" />
          </div>
        ) : state === 'locked' ? (
          /* Locked State */
          <div className="p-8 text-center rounded-3xl bg-white dark:bg-brand-dark-surface border border-emerald-950/10 dark:border-white/10 shadow-sm space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-gray-100 dark:bg-white/5 text-gray-400 flex items-center justify-center">
              <Lock className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="font-bold text-sm text-brand-charcoal dark:text-white">Bagian ini masih terkunci</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                Selesaikan bagian sebelumnya terlebih dahulu agar alur kisah dapat diikuti secara berurutan.
              </p>
            </div>
            <Link
              href="/kisah"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-primary dark:bg-brand-dark-primary text-white dark:text-brand-dark-bg text-xs font-bold shadow-xs hover:opacity-95 transition-opacity"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali ke Perjalanan</span>
            </Link>
          </div>
        ) : (
          <>
            {/* 1. Narrative Summary */}
            <section className="bg-white dark:bg-brand-dark-surface rounded-3xl p-5 sm:p-6 border border-emerald-950/10 dark:border-white/10 shadow-sm space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                      isSpecial
                        ? 'bg-amber-400 text-brand-charcoal'
                        : 'bg-brand-primary/10 dark:bg-brand-dark-primary/15 text-brand-primary dark:text-brand-dark-primary'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
                      {node.label}
                    </span>
                    <h2 className="font-bold text-base sm:text-lg text-brand-charcoal dark:text-white leading-tight">
                      {node.title}
                    </h2>
                  </div>
                </div>
                {state === 'completed' && (
                  <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 shrink-0">
                    <CheckCircle2 className="w-3 h-3" /> Selesai
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <TagChip tag={node.summary.tag} />
                {node.ayat.map((ref) => (
                  <span
                    key={formatAyatRef(ref)}
                    className="px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-[10px] font-bold text-gray-600 dark:text-gray-300"
                  >
                    {formatAyatRef(ref)}
                  </span>
                ))}
              </div>

              <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">{node.summary.text}</p>

              {node.lessons?.length > 0 && (
                <ul className="space-y-2 pt-1">
                  {node.lessons.map((lesson) => (
                    <li
                      key={lesson}
                      className="flex items-start gap-2.5 p-3 rounded-2xl bg-brand-bg/50 dark:bg-white/5 border border-black/5 dark:border-white/5 text-xs text-gray-700 dark:text-gray-200 leading-relaxed"
                    >
                      <CheckCircle2 className="w-4 h-4 text-brand-primary dark:text-brand-dark-primary shrink-0 mt-px" />
                      <span>{lesson}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* 2. Quranic Verses */}
            {ayatGroups.map(({ ref, surahName, verses }) => (
              <section key={formatAyatRef(ref)} className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-brand-primary dark:text-brand-dark-primary" />
                    <h3 className="font-bold text-sm text-brand-charcoal dark:text-white uppercase tracking-wider">
                      {surahName} &bull; {formatAyatRef(ref)}
                    </h3>
                  </div>
                  <Link
                    href={`/quran/${ref.surah}?ayah=${ref.from}`}
                    className="text-xs font-semibold text-brand-primary dark:text-brand-dark-primary hover:underline shrink-0"
                  >
                    Buka di Mushaf &rarr;
                  </Link>
                </div>

                {verses.map((v) => (
                  <div
                    key={v.key}
                    className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-brand-dark-surface border border-emerald-950/10 dark:border-white/10 shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-1 rounded-xl bg-brand-primary/10 text-brand-primary dark:text-brand-dark-primary font-bold text-xs">
                        QS {v.key}
                      </span>
                      <TagChip tag="quran" />
                    </div>
                    <p className="font-quran text-xl text-brand-charcoal dark:text-gray-100 text-right leading-loose" dir="rtl">
                      {v.text}
                    </p>
                    <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed italic border-l-2 border-emerald-900/20 dark:border-emerald-400/20 pl-3">
                      &quot;{v.translation}&quot;
                      <span className="not-italic text-[10px] text-gray-400 ml-1">(Terjemahan Kemenag RI)</span>
                    </p>
                  </div>
                ))}
              </section>
            ))}

            {/* 3. Hadith References */}
            {node.hadith.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <MessageSquareQuote className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <h3 className="font-bold text-sm text-brand-charcoal dark:text-white uppercase tracking-wider">
                    Hadis Terkait
                  </h3>
                </div>
                {node.hadith.map((h) => (
                  <div
                    key={h.source}
                    className="p-4 rounded-3xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200/70 dark:border-purple-800/40 space-y-2"
                  >
                    <div className="flex flex-wrap items-center gap-1.5">
                      <TagChip tag={h.tag} />
                      {h.grade && (
                        <span className="text-[10px] font-semibold text-purple-700 dark:text-purple-300">Derajat: {h.grade}</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-700 dark:text-gray-200 leading-relaxed">&quot;{h.text}&quot;</p>
                    <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">{h.source}</p>
                  </div>
                ))}
              </section>
            )}

            {/* 4. Historical & Scholarly Context (separated from Quranic text) */}
            {node.context.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Landmark className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <h3 className="font-bold text-sm text-brand-charcoal dark:text-white uppercase tracking-wider">
                      Konteks & Penjelasan
                    </h3>
                  </div>
                  <span className="text-[10px] text-gray-400 italic">Bukan bagian dari teks Al-Qur&apos;an</span>
                </div>
                {node.context.map((c) => (
                  <div
                    key={c.text}
                    className="p-4 rounded-3xl bg-white dark:bg-brand-dark-surface border border-emerald-950/10 dark:border-white/10 shadow-xs space-y-2"
                  >
                    <TagChip tag={c.tag} />
                    <p className="text-xs text-gray-700 dark:text-gray-200 leading-relaxed">{c.text}</p>
                    <p className="text-[11px] text-gray-400">Sumber: {c.source}</p>
                  </div>
                ))}
              </section>
            )}

            {/* 5. Reflection */}
            <section className="p-4 rounded-3xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-900/10 dark:border-emerald-400/10 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center shrink-0">
                <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="min-w-0">
                <span className="font-bold block text-[10px] uppercase tracking-wider text-emerald-900 dark:text-emerald-300 mb-0.5">
                  Refleksi & Pelajaran
                </span>
                <p className="text-emerald-950 dark:text-emerald-100 text-xs leading-relaxed">{node.reflection}</p>
              </div>
            </section>

            {/* 6. Completion Action */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
              <Link
                href="/kisah"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 font-semibold text-xs transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Perjalanan Kisah</span>
              </Link>
              <button
                type="button"
                onClick={handleComplete}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand-primary dark:bg-brand-dark-primary text-white dark:text-brand-dark-bg font-bold text-xs shadow-md hover:opacity-95 transition-all hover:gap-3"
              >
                <span>
                  {state === 'completed'
                    ? nextNodeId
                      ? 'Bagian Berikutnya'
                      : 'Kembali ke Perjalanan'
                    : nextNodeId
                      ? 'Tandai Selesai & Lanjut'
                      : 'Selesaikan Kisah'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Disclaimer Note */}
            <p className="text-[10px] text-gray-400 leading-relaxed italic text-center pt-2">
              *Catatan: Ringkasan, rujukan hadis, dan penjelasan dalam modul kisah ini wajib ditinjau ulang oleh ustadz/ahli tafsir untuk kepastian isi.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
