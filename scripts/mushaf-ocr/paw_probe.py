"""Probe: compare expected connected letter groups (PAWs) per ayah span with
baseline-crossing ink components detected on the rendered page.

Usage: python -I paw_probe.py <pages_dir> <app_page_dir> <surah_dir> <page> [debug.png]
"""
import json
import os
import sys

import cv2
import numpy as np
import pymupdf

sys.path.insert(0, os.path.dirname(__file__))
from align_page import extract_geometry, fit_grid, slot_of  # noqa: E402

ZOOM = 6.0
# Letters that never connect to the following letter (end a connected group)
NON_JOINING = set('اأإآٱدذرزوؤةءى')
ARABIC_LETTERS = set(chr(c) for c in range(0x0621, 0x064B)) | {'ٱ', 'ى', 'ۥ', 'ۦ'}
SMALL_LETTERS = {'ۥ', 'ۦ'}  # small waw / small yeh, drawn as marks


def expected_paws(word):
    letters = [ch for ch in word if ch in ARABIC_LETTERS and ch not in SMALL_LETTERS]
    if not letters:
        return 0
    count = 1
    for i, ch in enumerate(letters[:-1]):
        if ch in NON_JOINING or ch == 'ء':
            count += 1
        elif letters[i + 1] == 'ء':
            count += 1  # standalone hamza never joins from the right
    return count


def load_word_texts(surah_dir, keys):
    cache = {}
    out = {}
    for vk, idx in keys:
        s = int(vk.split(':')[0])
        if s not in cache:
            with open(os.path.join(surah_dir, f'{s}.json'), encoding='utf-8') as f:
                cache[s] = {v['key']: v for v in json.load(f)['verses']}
        verse = cache[s][vk]
        w = next(w for w in verse['words'] if w['idx'] == idx)
        out[(vk, idx)] = w['text']
    return out


def main():
    pages_dir, data_dir, surah_dir, n = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4])
    page = pymupdf.open(os.path.join(pages_dir, f'{n:03d}.ai'))[0]
    with open(os.path.join(data_dir, f'{n}.json'), encoding='utf-8') as f:
        pj = json.load(f)
    markers, banners, _ = extract_geometry(page)
    centers, pitch = fit_grid(markers)

    pix = page.get_pixmap(matrix=pymupdf.Matrix(ZOOM, ZOOM))
    img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)[:, :, :3]
    # dark ink only (text is ~#231F21); green frame/markers excluded
    dark = (img.max(axis=2) < 110).astype(np.uint8)
    for m in markers:  # mask ayah numbers
        x0, y0, x1, y1 = [int(v * ZOOM) for v in m]
        dark[y0 - 2:y1 + 2, x0 - 2:x1 + 2] = 0
    top = int(60 * ZOOM)
    bot = int(492 * ZOOM)
    dark[:top] = 0
    dark[bot:] = 0

    nlab, labels, stats, _ = cv2.connectedComponentsWithStats(dark, connectivity=8)

    header_slots = {slot_of((b[1] + b[3]) / 2, centers) for b in banners}
    per_line = {}
    for s in range(1, 16):
        if s in header_slots:
            continue
        cy = centers[s - 1] * ZOOM
        half = pitch / 2 * ZOOM
        band = dark[int(cy - half):int(cy + half)]
        if band.sum() == 0:
            continue
        prof = band.sum(axis=1)
        base = int(cy - half) + int(np.argmax(prof))
        comps = []
        for i in range(1, nlab):
            x, y, w, h, a = stats[i]
            if y <= base <= y + h:
                comps.append((x, w, h, a))
        per_line[s] = {'base': base, 'paws': sorted(comps, key=lambda c: -(c[0] + c[1]))}

    # expected per span
    tokens = [w for l in pj['lines'] if l.get('type') == 'text' for w in l['words']]
    texts = load_word_texts(surah_dir, [(t['verse_key'], t['idx']) for t in tokens if t['type'] == 'word'])
    exp_total = sum(expected_paws(texts[(t['verse_key'], t['idx'])]) for t in tokens if t['type'] == 'word')
    det_total = sum(len(v['paws']) for v in per_line.values())
    print(json.dumps({'page': n, 'expected_paws': exp_total, 'detected_paws': det_total,
                      'lines': {s: len(v['paws']) for s, v in per_line.items()}}))
    if len(sys.argv) > 5:
        dbg = img.copy()
        for s, v in per_line.items():
            cv2.line(dbg, (0, v['base']), (dbg.shape[1], v['base']), (255, 0, 0), 1)
            for x, w, h, a in v['paws']:
                cv2.rectangle(dbg, (x, v['base'] - int(h)), (x + w, v['base'] + 4), (0, 160, 0), 2)
        cv2.imwrite(sys.argv[5], cv2.resize(dbg, None, fx=0.45, fy=0.45)[:, :, ::-1])


if __name__ == '__main__':
    main()
