"""Madinah-mushaf forced alignment (KFGQPC 1441H vector pages -> verified word tokens).

Image is used only for geometry. Text comes from the verified app data.
  1. Ayah markers (green circles) = hard verse-end anchors.
  2. Connected ink components crossing each line's baseline = connected letter groups (PAWs).
  3. Expected PAWs per word come from the verified Uthmani text (non-joining letters).
  4. Dynamic programming splits each ayah span's PAW sequence into exactly N words,
     respecting line breaks, preferring expected PAW counts and wider gaps at boundaries.

Usage:
  python -I align_v2.py <pages_dir> <app_data_dir> <out_dir> [pages e.g. 3,7 or all] [--overlay dir]
Writes <out_dir>/{n}.json and <out_dir>/_report.json
"""
import json
import os
import sys

import cv2
import numpy as np
import pymupdf

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from align_page import extract_geometry, fit_grid, slot_of  # noqa: E402
from paw_probe import expected_paws  # noqa: E402

ZOOM = 6.0
TEXT_TOP, TEXT_BOTTOM = 60.0, 492.0
TEXT_X0, TEXT_X1 = 38.0, 300.0  # text column; excludes margin hizb/juz decorations
GAMMA = 1.0     # cost weight for |ln(actual width / predicted width)|
FONT_PATH = os.environ.get('MUSHAF_FONT', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'work', 'UthmanicHafs.ttf'))
_hb_font = None


def font_width(text):
    global _hb_font
    import uharfbuzz as hb
    if _hb_font is None:
        face = hb.Face(hb.Blob.from_file_path(FONT_PATH))
        _hb_font = (hb.Font(face), face.upem)
    font, upem = _hb_font
    buf = hb.Buffer()
    buf.add_str(text)
    buf.guess_segment_properties()
    hb.shape(font, buf)
    return max(0.05, sum(p.x_advance for p in buf.glyph_positions) / upem)
ALPHA = 1.0     # cost per PAW of count mismatch
BETA = 0.6      # cost scale for small gaps at a word boundary
INF = 1e18

_surah_cache = {}


def word_text(data_dir, vk, idx):
    s = int(vk.split(':')[0])
    if s not in _surah_cache:
        with open(os.path.join(data_dir, 'surah', f'{s}.json'), encoding='utf-8') as f:
            _surah_cache[s] = {v['key']: v for v in json.load(f)['verses']}
    v = _surah_cache[s][vk]
    return next(w['text'] for w in v['words'] if w['idx'] == idx)


def render_dark(page, markers):
    pix = page.get_pixmap(matrix=pymupdf.Matrix(ZOOM, ZOOM))
    img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)[:, :, :3]
    dark = (img.max(axis=2) < 110).astype(np.uint8)
    for m in markers:
        x0, y0, x1, y1 = [int(v * ZOOM) for v in m]
        dark[max(0, y0 - 2):y1 + 2, max(0, x0 - 2):x1 + 2] = 0
    dark[:int(TEXT_TOP * ZOOM)] = 0
    dark[int(TEXT_BOTTOM * ZOOM):] = 0
    return img, dark


def detect_lines(dark, centers, pitch, skip_slots, col=(TEXT_X0, TEXT_X1)):
    nlab, labels, stats, _ = cv2.connectedComponentsWithStats(dark, connectivity=8)
    lines = {}
    half = pitch / 2 * ZOOM
    for s in range(1, 16):
        if s in skip_slots:
            continue
        cy = centers[s - 1] * ZOOM
        y0, y1 = int(cy - half), int(cy + half)
        band = dark[max(0, y0):y1]
        if band.sum() < 50:
            continue
        base = max(0, y0) + int(np.argmax(band.sum(axis=1)))
        paws = []
        for i in range(1, nlab):
            x, y, w, h, a = stats[i]
            cx = (x + w / 2) / ZOOM
            if y <= base <= y + h and a > 20 and col[0] <= cx <= col[1]:
                paws.append([x / ZOOM, (x + w) / ZOOM])
        paws.sort(key=lambda p: -p[1])  # right-to-left
        lines[s] = {'base': base / ZOOM, 'paws': paws}
    return lines


def dp_split(paw_lines, expected, label, issues, pred_widths=None, piece_scales=None):
    """paw_lines: list of lists of [x0,x1] (RTL) for consecutive line pieces of one span.
    expected: list of expected PAW counts per word (reading order).
    Returns list of (piece_index, i_start, i_end) per word, or None."""
    n = len(expected)
    pieces = [p for p in paw_lines if p]
    if n == 0:
        return []
    if not pieces:
        issues.append(f'{label}: {n} words, no ink')
        return None
    flat = []  # (piece, idx)
    for pi, p in enumerate(pieces):
        for i in range(len(p)):
            flat.append((pi, i))
    P = len(flat)
    if P < n:
        issues.append(f'{label}: {P} ink groups < {n} words')
        return None
    # gap after flat position k (between k and k+1) if same piece
    gaps = []
    for k in range(P - 1):
        pa, ia = flat[k]
        pb, ib = flat[k + 1]
        if pa == pb:
            g = pieces[pa][ia][0] - pieces[pb][ib][1]
            gaps.append(g)
        else:
            gaps.append(None)  # line break: free boundary, mandatory if words end there
    pos = [g for g in gaps if g is not None]
    scale = max(float(np.median(pos)) if pos else 1.0, 0.5)

    def boundary_cost(k):  # boundary between flat k and k+1
        g = gaps[k]
        if g is None:
            return 0.0
        return BETA * max(0.0, 1.5 - g / scale)

    # dp[w][k] = min cost assigning first w words to first k groups
    dp = np.full((n + 1, P + 1), INF)
    back = np.full((n + 1, P + 1), -1, dtype=np.int64)
    dp[0][0] = 0.0
    for w in range(1, n + 1):
        e = expected[w - 1]
        for k in range(w, P - (n - w) + 1):
            best, arg = INF, -1
            # word w covers groups j..k-1
            j = k - 1
            while j >= w - 1:
                # cannot span a line break inside a word
                if j < k - 1 and gaps[j] is None:
                    break
                prev = dp[w - 1][j]
                if prev < INF:
                    c = prev + ALPHA * abs((k - j) - e)
                    if pred_widths is not None:
                        pc = pieces[flat[j][0]]
                        aw = max(pc[flat[j][1]][1], *(pc[flat[q][1]][1] for q in range(j, k))) - min(pc[flat[q][1]][0] for q in range(j, k))
                        sc = piece_scales[flat[j][0]] if piece_scales else 1.0
                        c += GAMMA * abs(np.log(max(aw, 0.3) / (pred_widths[w - 1] * sc)))
                    if j > 0:
                        c += boundary_cost(j - 1)
                    if c < best:
                        best, arg = c, j
                j -= 1
            dp[w][k] = best
            back[w][k] = arg
    # last word must end at P; also a line break between words is required when crossing lines
    if dp[n][P] >= INF:
        issues.append(f'{label}: no valid split')
        return None
    out = []
    k = P
    for w in range(n, 0, -1):
        j = back[w][k]
        out.append((flat[j][0], flat[j][1], flat[k - 1][1]))
        k = j
    out.reverse()
    # every line piece must be used by at least one word
    used = {o[0] for o in out}
    if len(used) != len(pieces):
        issues.append(f'{label}: a line piece got no word')
        return None
    cost = float(dp[n][P])
    return out, pieces, cost


def fallback_split(paw_lines, fws, scales):
    """Width-only split for spans whose ink groups are merged.
    Assign consecutive words to line pieces (each piece >= 1 word) minimising width error,
    then divide each piece's ink extent right-to-left in proportion to font widths."""
    pieces = [p for p in paw_lines if p]
    n, L = len(fws), len(pieces)
    if n < L or L == 0:
        return None
    ext = [(p[-1][0], p[0][1]) for p in pieces]  # (left, right)
    widths = [r - l for l, r in ext]
    pref = [0.0]
    for f in fws:
        pref.append(pref[-1] + f)
    # dp[i][w]: first i pieces hold first w words
    best = {(0, 0): (0.0, None)}
    for i in range(1, L + 1):
        for w in range(i, n - (L - i) + 1):
            cands = []
            for v in range(i - 1, w):
                if (i - 1, v) in best:
                    pred = (pref[w] - pref[v]) * scales[i - 1]
                    cands.append((best[(i - 1, v)][0] + abs(np.log(max(widths[i - 1], 0.3) / max(pred, 0.3))), v))
            if cands:
                best[(i, w)] = min(cands)
    if (L, n) not in best:
        return None
    bounds, w = [], n
    for i in range(L, 0, -1):
        v = best[(i, w)][1]
        bounds.append((i - 1, v, w))
        w = v
    out = []
    for pi, v, w in reversed(bounds):
        left, right = ext[pi]
        total = pref[w] - pref[v]
        x = right
        for k in range(v, w):
            span = (right - left) * fws[k] / total
            out.append((pi, x - span, x))
            x -= span
    return out


def align_page(pages_dir, data_dir, n):
    page = pymupdf.open(os.path.join(pages_dir, f'{n:03d}.ai'))[0]
    with open(os.path.join(data_dir, 'page', f'{n}.json'), encoding='utf-8') as f:
        pj = json.load(f)
    markers, banners, _ = extract_geometry(page)
    centers, pitch = fit_grid(markers)
    if n in (1, 2):
        # Decorated opening pages: fewer, tighter lines inside the medallion; grid from marker rows
        rows = sorted({round((m[1] + m[3]) / 2, 0) for m in markers})
        diffs = [b - a for a, b in zip(rows, rows[1:]) if b - a > 10]
        pitch = min(diffs)
        first = rows[0] if n == 1 else rows[0] - pitch * round((rows[0] - rows[0]) / pitch)
        centers = [first + pitch * i for i in range(15)]
    header_slots = {slot_of((b[1] + b[3]) / 2, centers) for b in banners}

    tokens = [w for l in pj['lines'] if l.get('type') == 'text' for w in l['words']]
    # Canonical reading order; the app data's line order is wrong on some pages (e.g. 593)
    tokens.sort(key=lambda t: (*map(int, t['verse_key'].split(':')), t['idx']))
    issues = []

    # Bismillah lines: after a banner, unless the surah starting there is At-Tawbah (9) or Al-Fatihah (1)
    surah_starts = [int(t['verse_key'].split(':')[0]) for t in tokens if t['verse_key'].endswith(':1') and t['idx'] == 1]
    bismillah_slots = set()
    for i, hs in enumerate(sorted(header_slots)):
        s_id = surah_starts[i] if i < len(surah_starts) else None
        if s_id not in (1, 9):
            bismillah_slots.add(hs + 1)

    frame = max((d['rect'] for d in page.get_drawings() if d.get('fill') and abs(d['fill'][1] - 0.89) < 0.05 and d['rect'].width > 250),
                key=lambda r: r.width * r.height, default=None)
    col = (frame.x0 + 12, frame.x1 - 12) if frame else (TEXT_X0, TEXT_X1)
    report_col = [round(col[0], 1), round(col[1], 1)]
    img, dark = render_dark(page, markers)
    lines = detect_lines(dark, centers, pitch, header_slots | bismillah_slots, col)

    # reading-order elements per line (RTL): paws and markers
    marker_by_slot = {}
    for m in markers:
        marker_by_slot.setdefault(slot_of((m[1] + m[3]) / 2, centers), []).append(m)

    span_img, cur = [], []
    for s in sorted(set(lines) | set(marker_by_slot)):
        elems = [('paw', p) for p in lines.get(s, {}).get('paws', [])]
        elems += [('end', m) for m in marker_by_slot.get(s, [])]
        elems.sort(key=lambda e: -(e[1][2] if e[0] == 'end' else e[1][1]))
        piece = []
        for kind, g in elems:
            if kind == 'end':
                cur.append((s, piece))
                span_img.append((cur, s, g))
                cur, piece = [], []
            else:
                piece.append(g)
        cur.append((s, piece))
    tail_img = cur

    span_tok, cur = [], []
    for t in tokens:
        if t['type'] == 'end':
            span_tok.append((cur, t))
            cur = []
        else:
            cur.append(t)
    tail_tok = cur

    report = {'page': n, 'markers': len(markers), 'end_tokens': len(span_tok), 'issues': issues,
              'pitch': round(pitch, 2), 'col': report_col, 'header_slots': sorted(header_slots), 'bismillah_slots': sorted(bismillah_slots)}
    if len(span_img) != len(span_tok):
        issues.append(f'marker count {len(span_img)} != end tokens {len(span_tok)}')
        return None, report, page

    words_out = []
    total_cost = 0.0
    mismatch_paws = 0
    # page scale: total ink extent of text lines vs total font width of words + marker widths
    ink = sum(l['paws'][0][1] - l['paws'][-1][0] for l in lines.values() if l['paws'])
    ink -= sum(m[2] - m[0] for m in markers)
    fw = sum(font_width(word_text(data_dir, t['verse_key'], t['idx'])) for t in tokens if t['type'] != 'end')
    page_scale = ink / fw if fw else 1.0
    report['scale'] = round(page_scale, 3)
    line_scale = {}

    def do_span(toks, img_lines, label):
        nonlocal total_cost, mismatch_paws
        if not toks:
            return True
        exp = [max(1, expected_paws(word_text(data_dir, t['verse_key'], t['idx']))) for t in toks]
        piece_lines = [s for s, p in img_lines if p]
        fws = [font_width(word_text(data_dir, t['verse_key'], t['idx'])) for t in toks]
        res = dp_split([p for _, p in img_lines], exp, label, issues, fws,
                       [line_scale.get(s_, page_scale) for s_, p in img_lines if p])
        if res is None:
            fb = fallback_split([p for _, p in img_lines], fws,
                                [line_scale.get(s_, page_scale) for s_, p in img_lines if p])
            if fb is None:
                return False
            del issues[-1]
            report.setdefault('approx_spans', []).append(label)
            pieces_lines = [s_ for s_, p in img_lines if p]
            for t, (pi, x0, x1) in zip(toks, fb):
                words_out.append({'verse_key': t['verse_key'], 'idx': t['idx'], 'line': pieces_lines[pi],
                                  'x0': x0, 'x1': x1, 'approx': True})
            return True
        split, pieces, cost = res
        total_cost += cost
        for t, (pi, i0, i1), e in zip(toks, split, exp):
            grp = pieces[pi][i0:i1 + 1]
            mismatch_paws += abs(len(grp) - e)
            words_out.append({'verse_key': t['verse_key'], 'idx': t['idx'], 'line': piece_lines[pi],
                              'x0': min(g[0] for g in grp), 'x1': max(g[1] for g in grp)})
        return True

    def run_all():
        nonlocal words_out, total_cost, mismatch_paws
        words_out, total_cost, mismatch_paws = [], 0.0, 0
        del issues[:]
        ok = True
        for (toks, end_tok), (img_lines, slot, m) in zip(span_tok, span_img):
            ok &= do_span(toks, img_lines, f'span {end_tok["verse_key"]}')
            words_out.append({'verse_key': end_tok['verse_key'], 'idx': end_tok['idx'], 'line': slot,
                              'x0': m[0], 'x1': m[2], 'end': True})
        ok &= do_span(tail_tok, tail_img, 'tail')
        return ok

    line_scale.clear()
    ok = run_all()
    if ok:
        # per-line stretch factor from pass-1 line membership, then realign
        fw_by_line, ink_by_line = {}, {}
        for w in words_out:
            if w.get('end'):
                continue
            fw_by_line[w['line']] = fw_by_line.get(w['line'], 0) + font_width(word_text(data_dir, w['verse_key'], w['idx']))
        for s_, l in lines.items():
            if l['paws']:
                ink_by_line[s_] = l['paws'][0][1] - l['paws'][-1][0] - sum(m[2] - m[0] for m in marker_by_slot.get(s_, []))
        for s_ in fw_by_line:
            if s_ in ink_by_line and fw_by_line[s_] > 0:
                line_scale[s_] = min(max(ink_by_line[s_] / fw_by_line[s_], 0.6 * page_scale), 1.6 * page_scale)
        ok = run_all()

    report['words_expected'] = len(tokens)
    report['words_aligned'] = len(words_out)
    report['dp_cost'] = round(total_cost, 2)
    report['paw_mismatch'] = mismatch_paws
    if not ok or len(words_out) != len(tokens):
        return None, report, page

    # Build line geometry; extend word boxes to gap midpoints so the whole line is tappable
    by_line = {}
    for w in words_out:
        by_line.setdefault(w['line'], []).append(w)
    out_lines = []
    for s in sorted(by_line):
        ws = sorted(by_line[s], key=lambda w: -w['x1'])
        for a, b in zip(ws, ws[1:]):
            mid = (a['x0'] + b['x1']) / 2
            a['hx0'] = mid
            b['hx1'] = mid
        cy = centers[s - 1]
        out_lines.append({
            'line': s, 'y0': cy - pitch / 2, 'y1': cy + pitch / 2,
            'words': [{'k': f"{w['verse_key']}:{w['idx']}", 'x0': w['x0'], 'x1': w['x1'],
                       'hx0': w.get('hx0', w['x0']), 'hx1': w.get('hx1', w['x1']), **({'end': True} if w.get('end') else {})}
                      for w in ws],
        })
    return {'page': n, 'width': page.rect.width, 'height': page.rect.height, 'lines': out_lines}, report, page


def overlay(page, layout, out_png):
    zoom = 2.5
    pix = page.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom))
    img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)[:, :, :3].copy()
    i = 0
    for l in layout['lines']:
        for w in l['words']:
            color = (0, 140, 255) if w.get('end') else ((200, 60, 60) if i % 2 else (40, 160, 40))
            cv2.rectangle(img, (int(w['x0'] * zoom), int(l['y0'] * zoom) + 3), (int(w['x1'] * zoom), int(l['y1'] * zoom) - 3), color, 2)
            i += 1
    cv2.imwrite(out_png, img[:, :, ::-1])


def main():
    pages_dir, data_dir, out_dir = sys.argv[1], sys.argv[2], sys.argv[3]
    sel = sys.argv[4] if len(sys.argv) > 4 else 'all'
    ov_dir = sys.argv[sys.argv.index('--overlay') + 1] if '--overlay' in sys.argv else None
    pages = range(1, 605) if sel == 'all' else [int(x) for x in sel.split(',')]
    os.makedirs(out_dir, exist_ok=True)
    reports = []
    for n in pages:
        layout, report, page = align_page(pages_dir, data_dir, n)
        reports.append(report)
        if layout:
            with open(os.path.join(out_dir, f'{n}.json'), 'w', encoding='utf-8') as f:
                json.dump(layout, f, separators=(',', ':'))
            if ov_dir:
                os.makedirs(ov_dir, exist_ok=True)
                overlay(page, layout, os.path.join(ov_dir, f'{n}.png'))
        if len(pages) <= 10:
            print(json.dumps(report))
    with open(os.path.join(out_dir, '_report.json'), 'w') as f:
        json.dump(reports, f)
    ok = [r for r in reports if not r['issues']]
    print(f'aligned {len(ok)}/{len(reports)} pages')


if __name__ == '__main__':
    main()
