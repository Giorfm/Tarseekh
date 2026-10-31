"""Edition check: compare ayah-marker positions in KFGQPC vector pages with the app's verified page data.

Usage: python -I edition_check.py <pages_dir> <app_page_json_dir> [out.json]
For each page: markers in the image (green circle shapes, sorted top-to-bottom then right-to-left)
must equal the data's 'end' tokens (in reading order), and their y-centers must fit a straight
line y = a + b * line_slot (constant line pitch) with small residuals.
"""
import json
import os
import sys

import numpy as np
import pymupdf

GREEN = (0.75, 0.89, 0.79)


def is_green(fill):
    return fill is not None and all(abs(a - b) < 0.05 for a, b in zip(fill, GREEN))


def find_markers(page):
    out = []
    for d in page.get_drawings():
        r = d['rect']
        if is_green(d.get('fill')) and 10 < r.width < 16 and 14 < r.height < 20:
            out.append(((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2))
    return out


def data_end_slots(page_json):
    slots = []
    for line in page_json['lines']:
        if line.get('type') != 'text':
            continue
        for w in line['words']:
            if w['type'] == 'end':
                slots.append(line['line'])
    return slots


def main():
    pages_dir, data_dir = sys.argv[1], sys.argv[2]
    out_path = sys.argv[3] if len(sys.argv) > 3 else None
    results = {}
    pitches = []
    for n in range(1, 605):
        doc = pymupdf.open(os.path.join(pages_dir, f'{n:03d}.ai'))
        markers = find_markers(doc[0])
        with open(os.path.join(data_dir, f'{n}.json'), encoding='utf-8') as f:
            pj = json.load(f)
        slots = data_end_slots(pj)
        rec = {'markers_image': len(markers), 'markers_data': len(slots)}
        if len(markers) != len(slots):
            rec['status'] = 'count_mismatch'
        elif len(set(slots)) < 2:
            rec['status'] = 'too_few_lines_to_fit'
        else:
            ys = np.array(sorted(y for _, y in markers))
            sl = np.array(sorted(slots), dtype=float)
            b, a = np.polyfit(sl, ys, 1)
            resid = float(np.max(np.abs(ys - (a + b * sl))))
            rec.update({'pitch': round(float(b), 2), 'offset': round(float(a), 2), 'max_residual': round(resid, 2)})
            rec['status'] = 'ok' if resid < 4 else 'position_mismatch'
            if rec['status'] == 'ok':
                pitches.append(b)
        results[n] = rec
    summary = {}
    for r in results.values():
        summary[r['status']] = summary.get(r['status'], 0) + 1
    print('summary', summary)
    if pitches:
        print('line pitch: median %.2f min %.2f max %.2f' % (np.median(pitches), min(pitches), max(pitches)))
    bad = {k: v for k, v in results.items() if v['status'] != 'ok'}
    print('non-ok pages:', json.dumps(bad)[:1500])
    if out_path:
        with open(out_path, 'w') as f:
            json.dump(results, f)


if __name__ == '__main__':
    main()
