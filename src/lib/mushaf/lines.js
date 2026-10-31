/**
 * src/lib/mushaf/lines.js
 * Builds the 15 text-view lines of a mushaf page from the KFGQPC layout, so the text
 * fallback shows the same line breaks as the page image.
 *
 * Words always come from the verified page data (pageData.lines); the layout only decides
 * which line each word sits on. Lines without words become the surah header and bismillah
 * of the surah that starts right below them. If the result does not account for every line
 * slot, the original pageData.lines are returned unchanged.
 */

const DECORATED_PAGES = new Set([1, 2]);

/**
 * @param {Object} pageData verified page data ({ page, surahs, lines })
 * @param {Object} layout   lib/mushaf/layout geometry for the same page
 * @param {Array} [surahList] optional surahs.json list, used for a header whose surah starts on the next page
 * @returns {Array} lines in the same shape as pageData.lines
 */
export function buildLinesFromLayout(pageData, layout, surahList = []) {
  if (!pageData || !layout || DECORATED_PAGES.has(pageData.page)) return pageData?.lines || [];

  const wordByKey = new Map();
  for (const l of pageData.lines) {
    if (l.type === 'text' && Array.isArray(l.words)) {
      for (const w of l.words) wordByKey.set(`${w.verse_key}:${w.idx}`, w);
    }
  }

  const textLines = [];
  for (const l of layout.lines) {
    const words = l.words.map((w) => wordByKey.get(w.k));
    if (words.some((w) => !w)) return pageData.lines;
    textLines.push({ line: l.line, type: 'text', words });
  }
  if (textLines.reduce((n, l) => n + l.words.length, 0) !== wordByKey.size) return pageData.lines;

  const bismillahText =
    pageData.lines.find((l) => l.type === 'bismillah')?.text || 'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ';
  const surahInfo = (id) => {
    const fromHeader = pageData.lines.find((l) => l.type === 'surah_header' && l.surah?.id === id)?.surah;
    const meta = fromHeader || pageData.surahs?.find((s) => s.id === id) || surahList.find((s) => s.id === id);
    return meta ? { id, name_arabic: meta.name_arabic, name_simple: meta.name_simple } : { id };
  };

  const used = new Set(textLines.map((l) => l.line));
  const decorations = [];
  const addDecoration = (line, entry) => {
    if (line < 1 || line > 15 || used.has(line)) return false;
    used.add(line);
    decorations.push({ line, ...entry });
    return true;
  };
  const addSurahOpening = (surahId, firstTextLine) => {
    // header directly above the bismillah (At-Tawbah has no bismillah)
    if (surahId === 9) return addDecoration(firstTextLine - 1, { type: 'surah_header', surah: surahInfo(9) });
    return (
      addDecoration(firstTextLine - 1, { type: 'bismillah', text: bismillahText }) &&
      addDecoration(firstTextLine - 2, { type: 'surah_header', surah: surahInfo(surahId) })
    );
  };

  // Surahs that start on this page
  for (const l of textLines) {
    const first = l.words.find((w) => w.type !== 'end' && w.idx === 1 && w.verse_key.endsWith(':1'));
    if (first && l.words[0] === first) {
      if (!addSurahOpening(parseInt(first.verse_key, 10), l.line)) return pageData.lines;
    }
  }

  // Empty slots at the bottom: opening of the surah that starts on the next page
  const missing = [];
  for (let n = 1; n <= 15; n++) if (!used.has(n)) missing.push(n);
  if (missing.length > 0) {
    const lastText = Math.max(...textLines.map((l) => l.line));
    if (!missing.every((n) => n > lastText)) return pageData.lines;
    const lastWord = textLines[textLines.length - 1].words.at(-1);
    const nextSurah = parseInt(lastWord.verse_key, 10) + 1;
    if (!addSurahOpening(nextSurah, 16)) return pageData.lines;
    for (let n = 1; n <= 15; n++) if (!used.has(n)) return pageData.lines;
  }

  return [...textLines, ...decorations].sort((a, b) => a.line - b.line);
}
