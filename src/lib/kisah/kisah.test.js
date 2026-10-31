import { describe, it, expect } from 'vitest';
import { getKisahList, getKisah, formatAyatRef } from './loader.js';
import { getNodeStates } from './progress.js';
import { getSurah } from '../quran/loader.js';

const VALID_TAGS = ['quran', 'hadith', 'tafsir', 'sejarah', 'diperselisihkan'];

describe('Kisah data', () => {
  it('lists Ashabul Kahfi as the only available story', async () => {
    const list = await getKisahList();
    const available = list.filter((k) => k.status === 'available');
    expect(available.map((k) => k.slug)).toEqual(['ashabul-kahfi']);
    expect(list.filter((k) => k.status === 'coming_soon').length).toBeGreaterThan(0);
  });

  it('rejects coming-soon stories', async () => {
    await expect(getKisah('nabi-musa')).rejects.toThrow();
  });

  it('covers QS 18:9–26 exactly once across story nodes', async () => {
    const kisah = await getKisah('ashabul-kahfi');
    const covered = [];
    for (const node of kisah.nodes) {
      for (const ref of node.ayat) {
        expect(ref.surah).toBe(18);
        expect(ref.from).toBeLessThanOrEqual(ref.to);
        for (let a = ref.from; a <= ref.to; a++) covered.push(a);
      }
    }
    covered.sort((a, b) => a - b);
    expect(covered).toEqual(Array.from({ length: 18 }, (_, i) => i + 9));
  });

  it('references verses that exist in the surah data', async () => {
    const kisah = await getKisah('ashabul-kahfi');
    const surah = await getSurah(18);
    for (const node of kisah.nodes) {
      for (const ref of node.ayat) {
        expect(ref.to).toBeLessThanOrEqual(surah.surah.verses_count);
      }
    }
  });

  it('uses unique ids, sequential order, and valid classification tags', async () => {
    const kisah = await getKisah('ashabul-kahfi');
    const ids = kisah.nodes.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(kisah.nodes.map((n) => n.order)).toEqual(ids.map((_, i) => i + 1));

    for (const node of kisah.nodes) {
      expect(VALID_TAGS).toContain(node.summary.tag);
      for (const h of node.hadith) {
        expect(h.tag).toBe('hadith');
        expect(h.source).toBeTruthy();
      }
      for (const c of node.context) {
        expect(VALID_TAGS).toContain(c.tag);
        expect(c.tag).not.toBe('quran');
        expect(c.source).toBeTruthy();
      }
    }
  });

  it('formats ayat references', () => {
    expect(formatAyatRef({ surah: 18, from: 9, to: 9 })).toBe('QS 18:9');
    expect(formatAyatRef({ surah: 18, from: 13, to: 14 })).toBe('QS 18:13–14');
  });
});

describe('Kisah node states', () => {
  const nodes = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

  it('makes the first node current when nothing is completed', () => {
    expect(getNodeStates(nodes, [])).toEqual({ a: 'current', b: 'locked', c: 'locked' });
  });

  it('advances current to the first incomplete node', () => {
    expect(getNodeStates(nodes, ['a'])).toEqual({ a: 'completed', b: 'current', c: 'locked' });
  });

  it('marks all completed when every node is done', () => {
    expect(getNodeStates(nodes, ['a', 'b', 'c'])).toEqual({ a: 'completed', b: 'completed', c: 'completed' });
  });
});
