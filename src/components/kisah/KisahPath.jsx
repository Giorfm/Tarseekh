'use client';

import React from 'react';
import Link from 'next/link';
import { Check, Lock, Star } from 'lucide-react';
import { formatAyatRef } from '@/lib/kisah/loader';
import { getKisahIcon } from './kisahUi';

const PATH_WIDTH = 300;
const ROW_HEIGHT = 150;
const NODE_CENTER_Y = 48;
// Horizontal offsets (px from center) that make the path wind left and right
const WIND_OFFSETS = [0, -64, -96, -64, 0, 64, 96, 64];

function nodeX(i) {
  return PATH_WIDTH / 2 + WIND_OFFSETS[i % WIND_OFFSETS.length];
}

function nodeY(i) {
  return i * ROW_HEIGHT + NODE_CENTER_Y;
}

/**
 * KisahPath renders story milestones along a vertically winding path.
 *
 * @param {Object} props
 * @param {string} props.slug
 * @param {Array} props.nodes sorted by order
 * @param {Object<string, 'completed'|'current'|'locked'>} props.states
 */
export function KisahPath({ slug, nodes, states }) {
  const height = nodes.length * ROW_HEIGHT;

  return (
    <div className="relative mx-auto" style={{ width: PATH_WIDTH, height }}>
      {/* Connecting path */}
      <svg
        className="absolute inset-0 pointer-events-none"
        width={PATH_WIDTH}
        height={height}
        viewBox={`0 0 ${PATH_WIDTH} ${height}`}
        aria-hidden="true"
      >
        {nodes.slice(1).map((node, idx) => {
          const x1 = nodeX(idx);
          const y1 = nodeY(idx);
          const x2 = nodeX(idx + 1);
          const y2 = nodeY(idx + 1);
          const midY = (y1 + y2) / 2;
          const reached = states[node.id] !== 'locked';
          return (
            <path
              key={node.id}
              d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
              fill="none"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={reached ? undefined : '2 12'}
              className={
                reached
                  ? 'stroke-brand-primary/40 dark:stroke-brand-dark-primary/40'
                  : 'stroke-gray-300 dark:stroke-white/15'
              }
            />
          );
        })}
      </svg>

      {/* Milestone nodes */}
      {nodes.map((node, i) => (
        <PathNode
          key={node.id}
          slug={slug}
          node={node}
          state={states[node.id] || 'locked'}
          x={nodeX(i)}
          y={nodeY(i)}
        />
      ))}
    </div>
  );
}

function PathNode({ slug, node, state, x, y }) {
  const Icon = getKisahIcon(node.icon);
  const isSpecial = node.type === 'reflection';
  const size = isSpecial ? 72 : 64;
  const refLabel = node.ayat.length > 0 ? node.ayat.map(formatAyatRef).join(', ') : 'Penutup';

  const circleClass =
    state === 'locked'
      ? 'bg-gray-100 dark:bg-brand-dark-surface border-2 border-gray-200 dark:border-white/10 text-gray-400 dark:text-gray-500'
      : state === 'completed'
        ? isSpecial
          ? 'bg-amber-400 text-brand-charcoal shadow-md'
          : 'bg-brand-primary dark:bg-brand-dark-primary text-white dark:text-brand-dark-bg shadow-md'
        : isSpecial
          ? 'bg-amber-400 text-brand-charcoal ring-8 ring-amber-400/20 shadow-lg group-hover:scale-105'
          : 'bg-white dark:bg-brand-dark-surface border-4 border-brand-primary dark:border-brand-dark-primary text-brand-primary dark:text-brand-dark-primary ring-8 ring-brand-primary/10 dark:ring-brand-dark-primary/10 shadow-lg group-hover:scale-105';

  const content = (
    <>
      {/* Contextual bubble on the current milestone */}
      {state === 'current' && (
        <span className="absolute left-1/2 -translate-x-1/2 -top-9 whitespace-nowrap px-2.5 py-1 rounded-lg bg-brand-primary dark:bg-brand-dark-primary text-white dark:text-brand-dark-bg text-[10px] font-bold uppercase tracking-wider shadow-sm">
          {node.order === 1 ? 'Mulai' : 'Lanjut'}
          <span className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 rotate-45 bg-brand-primary dark:bg-brand-dark-primary" />
        </span>
      )}

      <span
        className={`relative mx-auto rounded-full flex items-center justify-center transition-all duration-200 ${circleClass}`}
        style={{ width: size, height: size }}
      >
        {state === 'locked' ? (
          <Lock className="w-5 h-5" />
        ) : state === 'completed' && !isSpecial ? (
          <Check className="w-7 h-7 stroke-[3]" />
        ) : (
          <Icon className={isSpecial ? 'w-8 h-8' : 'w-7 h-7'} />
        )}

        {state === 'completed' && (
          <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-white dark:bg-brand-dark-surface flex items-center justify-center shadow-sm">
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
          </span>
        )}
      </span>

      <span className="block mt-2 text-center w-28">
        <span className="inline-block px-1.5 py-0.5 rounded-lg bg-white dark:bg-brand-dark-surface">
        <span
          className={`block font-bold text-xs leading-tight ${
            state === 'locked' ? 'text-gray-400 dark:text-gray-500' : 'text-brand-charcoal dark:text-white'
          }`}
        >
          {node.label}
        </span>
        <span className="block text-[10px] text-gray-400 mt-0.5">{refLabel}</span>
        </span>
      </span>
    </>
  );

  const positionStyle = { left: x, top: y - size / 2, transform: 'translateX(-50%)' };

  if (state === 'locked') {
    return (
      <div
        className="absolute flex flex-col items-center cursor-not-allowed"
        style={positionStyle}
        aria-disabled="true"
        title="Selesaikan bagian sebelumnya untuk membuka"
      >
        {content}
      </div>
    );
  }

  return (
    <Link
      href={`/kisah/${slug}/${node.id}`}
      className="group absolute flex flex-col items-center rounded-2xl"
      style={positionStyle}
      aria-label={`Bagian ${node.order}: ${node.title}${state === 'completed' ? ' (selesai)' : ''}`}
    >
      {content}
    </Link>
  );
}
