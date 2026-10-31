"""Align verified Quran tokens to word positions on a KFGQPC vector mushaf page.

The image is never read as text. It only provides geometry:
  - ayah markers (green circle shapes) -> hard anchors for verse ends
  - letter contours (black sub-paths) -> horizontal gaps between words
The verified token stream (app data, page/{n}.json) decides how many words lie between anchors;
the aligner picks exactly that many word boundaries from the widest gaps.

Usage:
  python -I align_page.py <pages_dir> <app_page_dir> <page> [overlay.png]
"""
import json
import os
import sys

import pymupdf

GREEN = (0.75, 0.89, 0.79)
TEXT_TOP, TEXT_BOTTOM = 60.0, 492.0  # page-space y band that holds the 15 text lines


def close(a, b, tol=0.05):
    return a is not None and len(a) == len(b) and all(abs(x - y) < tol for x, y in zip(a, b))


def item_points(item):
    kind = item[0]
    if kind == 'l':
        return [item[1], item[2]]
    if kind == 'c':
        return [item[1], item[2], item[3], item[4]]
    if kind == 're':
        r = item[1]
        return [pymupdf.Point(r.x0, r.y0), pymupdf.Point(r.x1, r.y1)]
    if kind == 'qu':
        q = item[1]
        return [q.ul, q.ur, q.ll, q.lr]
    return []


def contours_of(drawing):
    """Split a compound path into sub-path bounding boxes (x0, y0, x1, y1)."""
    out = []
    cur = None
    last = None
    for item in drawing['items']:
        pts = item_points(item)
        if not pts:
            continue
        start = pts[0]
        if cur is None or last is None or abs(start.x - last.x) > 0.01 or abs(start.y - last.y) > 0.01:
            if cur:
                out.append(cur)
            cur = [start.x, start.y, start.x, start.y]
        for p in pts:
            cur[0] = min(cur[0], p.x)
            cur[1] = min(cur[1], p.y)
            cur[2] = max(cur[2], p.x)
            cur[3] = max(cur[3], p.y)
        last = pts[-1]
    if cur:
        out.append(cur)
    return out


def extract_geometry(page):
    markers, banners, letter_contours = [], [], []
    drawings = page.get_drawings()
    for d in drawings:
        r = d['rect']
        if close(d.get('fill'), GREEN):
            if 9 < r.width < 16 and 12 < r.height < 20:
                markers.append((r.x0, r.y0, r.x1, r.y1))
            elif r.width > 200 and r.height < 40 and TEXT_TOP < r.y0 < TEXT_BOTTOM:
                banners.append((r.x0, r.y0, r.x1, r.y1))
    for d in drawings:
        fill = d.get('fill')
        if not fill or max(fill) > 0.3:
            continue
        r = d['rect']
        if r.y1 < TEXT_TOP or r.y0 > TEXT_BOTTOM:
            continue  # running header / page number
        if any(m[0] - 1 <= r.x0 and r.x1 <= m[2] + 1 and m[1] - 1 <= r.y0 and r.y1 <= m[3] + 1 for m in markers):
            continue  # ayah number digits inside a marker
        letter_contours.extend(contours_of(d))
    return markers, banners, letter_contours


def line_grid(markers_by_slot_hint=None, pitch=26.85, first_center=87.6):
    return [first_center + pitch * i for i in range(15)]


def slot_of(y, centers):
    best = min(range(15), key=lambda i: abs(centers[i] - y))
    return best + 1


def page_tokens(page_json):
    toks = []
    for line in page_json['lines']:
        if line.get('type') != 'text':
            continue
        for w in line['words']:
            toks.append(w)
    return toks


def fit_grid(markers):
    """Fit line centers from marker y positions (markers sit on line centers)."""
    pitch, first = 26.85, 87.6
    if len(markers) >= 2:
        ys = sorted((m[1] + m[3]) / 2 for m in markers)
        # assign each marker to nearest default slot, then least-squares refine
        slots = [round((y - first) / pitch) for y in ys]
        if len(set(slots)) >= 2:
            n = len(ys)
            sx = sum(slots); sy = sum(ys)
            sxx = sum(s * s for s in slots); sxy = sum(s * y for s, y in zip(slots, ys))
            den = n * sxx - sx * sx
            if den:
                b = (n * sxy - sx * sy) / den
                a = (sy - b * sx) / n
                if 25.5 < b < 28.5:
                    pitch, first = b, a
    return [first + pitch * i for i in range(15)], pitch


def align(page, page_json):
    markers, banners, contours = extract_geometry(page)
    centers, pitch = fit_grid(markers)

    header_slots = set()
    for b in banners:
        header_slots.add(slot_of((b[1] + b[3]) / 2, centers))

    # Assign contours to lines by vertical center; drop banner lines
    lines = {}
    for c in contours:
        s = slot_of((c[1] + c[3]) / 2, centers)
        if s in header_slots:
            continue
        lines.setdefault(s, []).append(c)

    # Bismillah: line right after a banner (data stream has no bismillah tokens except 1:1)
    tokens = page_tokens(page_json)
    first_key = tokens[0]['verse_key'] if tokens else '1:1'
    bismillah_slots = set()
    for hs in header_slots:
        nxt = hs + 1
        if nxt in lines:
            # surah of the banner = surah of first token at or after this line; At-Tawbah (9) has no bismillah
            bismillah_slots.add(nxt)
    for s in bismillah_slots:
        lines.pop(s, None)

    marker_items = [{'kind': 'end', 'box': m, 'slot': slot_of((m[1] + m[3]) / 2, centers)} for m in markers]

    # Build per-line x-blocks (union of contour x-intervals), reading order RTL
    line_blocks = {}
    for s, cs in lines.items():
        iv = sorted((c[0], c[2]) for c in cs)
        merged = []
        for x0, x1 in iv:
            if merged and x0 <= merged[-1][1] + 0.15:
                merged[-1][1] = max(merged[-1][1], x1)
            else:
                merged.append([x0, x1])
        line_blocks[s] = merged

    # Reading-order sequence of elements: blocks and markers per line, right-to-left
    seq = []
    for s in sorted(set(line_blocks) | {m['slot'] for m in marker_items}):
        elems = [{'kind': 'blk', 'x0': b[0], 'x1': b[1], 'slot': s} for b in line_blocks.get(s, [])]
        for m in marker_items:
            if m['slot'] == s:
                mb = m['box']
                elems.append({'kind': 'end', 'x0': mb[0], 'x1': mb[2], 'slot': s})
        # remove blocks hidden under a marker (decoration overlaps)
        elems.sort(key=lambda e: -e['x1'])
        seq.append((s, elems))

    # Spans: split token stream at 'end' tokens; split image sequence at markers
    spans_tok, cur = [], []
    for t in tokens:
        if t['type'] == 'end':
            spans_tok.append((cur, t))
            cur = []
        else:
            cur.append(t)
    tail_tokens = cur  # words after last marker on page (ayah continues next page)

    spans_img, cur = [], []
    for s, elems in seq:
        line_part = []
        for e in elems:
            if e['kind'] == 'end':
                if line_part:
                    cur.append((s, line_part))
                    line_part = []
                spans_img.append((cur, e))
                cur = []
            else:
                line_part.append(e)
        if line_part:
            cur.append((s, line_part))
    tail_img = cur

    report = {'page': page_json['page'], 'markers': len(markers), 'end_tokens': len(spans_tok), 'issues': [], 'min_margin': None}
    if len(spans_img) != len(spans_tok):
        report['issues'].append(f'marker count {len(spans_img)} != end tokens {len(spans_tok)}')
        return None, report

    boxes = []
    margins = []

    def assign(span_tokens, span_lines, label):
        """span_lines: list of (slot, [blocks RTL]). Choose words = len(span_tokens)."""
        n_words = len(span_tokens)
        if n_words == 0:
            return
        if not span_lines:
            report['issues'].append(f'{label}: {n_words} words but no image blocks')
            return
        n_lines = len(span_lines)
        need_internal = n_words - n_lines  # each line piece holds >= 1 word; line breaks are boundaries
        gaps = []  # (width, line_index, block_index_after_gap)
        for li, (s, blocks) in enumerate(span_lines):
            for bi in range(1, len(blocks)):
                gaps.append((blocks[bi - 1]['x0'] - blocks[bi]['x1'], li, bi))
        if need_internal < 0 or need_internal > len(gaps):
            report['issues'].append(f'{label}: need {need_internal} gaps, have {len(gaps)} (words {n_words}, lines {n_lines})')
            return
        gaps.sort(key=lambda g: -g[0])
        chosen = gaps[:need_internal]
        if need_internal < len(gaps):
            smallest_chosen = chosen[-1][0] if chosen else None
            largest_unchosen = gaps[need_internal][0]
            if smallest_chosen is not None:
                margins.append(smallest_chosen - largest_unchosen)
        cut = {(li, bi) for _, li, bi in chosen}
        ti = 0
        for li, (s, blocks) in enumerate(span_lines):
            start = 0
            for bi in range(1, len(blocks) + 1):
                if bi == len(blocks) or (li, bi) in cut:
                    grp = blocks[start:bi]
                    tok = span_tokens[ti]
                    boxes.append({
                        'verse_key': tok['verse_key'], 'idx': tok['idx'], 'line': s,
                        'x0': min(g['x0'] for g in grp), 'x1': max(g['x1'] for g in grp),
                    })
                    ti += 1
                    start = bi

    for i, ((toks, end_tok), (img_lines, marker)) in enumerate(zip(spans_tok, spans_img)):
        assign(toks, img_lines, f'span {end_tok["verse_key"]}')
        boxes.append({'verse_key': end_tok['verse_key'], 'idx': end_tok['idx'], 'line': marker['slot'], 'x0': marker['x0'], 'x1': marker['x1'], 'end': True})
    assign(tail_tokens, tail_img, 'tail')

    report['min_margin'] = round(min(margins), 3) if margins else None
    report['words_expected'] = len(tokens)
    report['words_aligned'] = len(boxes)
    report['pitch'] = round(pitch, 2)
    report['header_slots'] = sorted(header_slots)
    report['bismillah_slots'] = sorted(bismillah_slots)
    return {'boxes': boxes, 'centers': centers, 'pitch': pitch, 'rect': [page.rect.width, page.rect.height]}, report


def draw_overlay(page, result, out_png):
    import cv2
    import numpy as np
    zoom = 2.5
    pix = page.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom))
    img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)[:, :, :3].copy()
    half = result['pitch'] / 2
    for i, b in enumerate(result['boxes']):
        cy = result['centers'][b['line'] - 1]
        p0 = (int(b['x0'] * zoom), int((cy - half) * zoom))
        p1 = (int(b['x1'] * zoom), int((cy + half) * zoom))
        color = (0, 140, 255) if b.get('end') else ((200, 60, 60) if i % 2 else (40, 160, 40))
        cv2.rectangle(img, p0, p1, color, 2)
    cv2.imwrite(out_png, img[:, :, ::-1])


def main():
    pages_dir, data_dir, n = sys.argv[1], sys.argv[2], int(sys.argv[3])
    page = pymupdf.open(os.path.join(pages_dir, f'{n:03d}.ai'))[0]
    with open(os.path.join(data_dir, f'{n}.json'), encoding='utf-8') as f:
        pj = json.load(f)
    result, report = align(page, pj)
    print(json.dumps(report))
    if result and len(sys.argv) > 4:
        draw_overlay(page, result, sys.argv[4])


if __name__ == '__main__':
    main()
