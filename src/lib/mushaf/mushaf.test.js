import { describe, it, expect } from 'vitest';
import { getMushafLayout, parseWordKey } from './layout.js';
import { getPage } from '../pages/loader.js';

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

  it('parses word keys', () => {
    expect(parseWordKey('2:255:3')).toEqual({ verseKey: '2:255', idx: 3 });
  });
});
