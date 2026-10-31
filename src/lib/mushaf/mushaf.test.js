import { describe, it, expect } from 'vitest';
import { getMushafLayout, parseWordKey } from './layout.js';
import { getPage } from '../pages/loader.js';
import { buildLinesFromLayout } from './lines.js';

const SAMPLE_PAGES = [1, 2, 3, 50, 293, 528, 593, 604];

describe('Mushaf image layout (KFGQPC alignment)', () => {
  it('covers every verified token of every page exactly once', async () => {
    let total = 0;
    for (let n = 1; n <= 604; n++) {
      const [layout, page] = await Promise.all([getMushafLayout(n), getPage(n)]);
      const keys = layout.lines.flatMap((l) => l.words.map((w) => w.k));
      const expected = page.lines
        .filter((l) => l.type === 'text')
        .flatMap((l) => l.words.map((w) => `${w.verse_key}:${w.idx}`));
      expect(new Set(keys).size, `duplicate keys on page ${n}`).toBe(keys.length);
      expect([...keys].sort(), `token set on page ${n}`).toEqual([...expected].sort());
      total += keys.length;
    }
    expect(total).toBe(83665);
  });

  it('keeps word boxes inside the page with sane geometry', async () => {
    for (const n of SAMPLE_PAGES) {
      const layout = await getMushafLayout(n);
      expect(layout.page).toBe(n);
      for (const line of layout.lines) {
        expect(line.y0).toBeGreaterThanOrEqual(0);
        expect(line.y1).toBeLessThanOrEqual(layout.height);
        expect(line.y0).toBeLessThan(line.y1);
        for (const w of line.words) {
          expect(w.x0).toBeLessThanOrEqual(w.x1);
          expect(w.hx0).toBeLessThanOrEqual(w.hx1);
          expect(w.hx0).toBeGreaterThanOrEqual(0);
          expect(w.hx1).toBeLessThanOrEqual(layout.width);
        }
      }
    }
  });

  it('places page 3 (QS 2:6) words right-to-left on line 1', async () => {
    const layout = await getMushafLayout(3);
    const first = layout.lines[0];
    expect(first.words[0].k).toBe('2:6:1');
    for (let i = 1; i < first.words.length; i++) {
      expect(first.words[i].x1).toBeLessThanOrEqual(first.words[i - 1].x1);
    }
  });

  it('rebuilds text-view lines in reading order with 15 slots and the same surah headers', async () => {
    const order = (w) => {
      const [s, a] = w.verse_key.split(':').map(Number);
      return s * 1e6 + a * 1e3 + w.idx;
    };
    for (let n = 3; n <= 604; n++) {
      const [layout, page] = await Promise.all([getMushafLayout(n), getPage(n)]);
      const lines = buildLinesFromLayout(page, layout);
      expect(lines, `page ${n} fell back to data lines`).not.toBe(page.lines);
      expect(lines.map((l) => l.line)).toEqual(Array.from({ length: 15 }, (_, i) => i + 1));
      const words = lines.filter((l) => l.type === 'text').flatMap((l) => l.words);
      for (let i = 1; i < words.length; i++) expect(order(words[i]), `page ${n}`).toBeGreaterThan(order(words[i - 1]));
      const headers = (ls) => ls.filter((l) => l.type === 'surah_header').map((l) => l.surah.id);
      expect(headers(lines), `page ${n}`).toEqual(headers(page.lines));
    }
  });

  it('keeps At-Tawbah without bismillah and the decorated opening pages unchanged', async () => {
    const [layout187, page187] = await Promise.all([getMushafLayout(187), getPage(187)]);
    const lines = buildLinesFromLayout(page187, layout187);
    expect(lines[0]).toMatchObject({ type: 'surah_header', surah: { id: 9 } });
    expect(lines.some((l) => l.type === 'bismillah')).toBe(false);

    const [layout1, page1] = await Promise.all([getMushafLayout(1), getPage(1)]);
    expect(buildLinesFromLayout(page1, layout1)).toBe(page1.lines);
  });

  it('parses word keys', () => {
    expect(parseWordKey('2:255:3')).toEqual({ verseKey: '2:255', idx: 3 });
  });
});
