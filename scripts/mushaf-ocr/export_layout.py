"""Export aligned layouts into the app (public/data/mushaf-layout/{n}.json) and verify coverage.

Usage: python -I export_layout.py <layout_dir> <report.json> <repo_root>
Fails (exit 1) unless every verified token of every page appears exactly once.
"""
import json
import sys

layout_dir, report_path, repo = sys.argv[1], sys.argv[2], sys.argv[3]
reports = {r['page']: r for r in json.load(open(report_path))}


def r1(v):
    return round(v, 1)


total, problems = 0, []
for n in range(1, 605):
    lay = json.load(open(f'{layout_dir}/{n}.json'))
    approx_keys = {a.split(' ')[1] for a in reports[n].get('approx_spans', [])}
    out = {'page': n, 'width': r1(lay['width']), 'height': r1(lay['height']), 'lines': []}
    seen = []
    for line in lay['lines']:
        words = []
        for w in line['words']:
            vk = w['k'].rsplit(':', 1)[0]
            o = {'k': w['k'], 'x0': r1(w['x0']), 'x1': r1(w['x1']), 'hx0': r1(w['hx0']), 'hx1': r1(w['hx1'])}
            if w.get('end'):
                o['end'] = 1
            elif vk in approx_keys:
                o['approx'] = 1
            words.append(o)
            seen.append(w['k'])
        out['lines'].append({'line': line['line'], 'y0': r1(line['y0']), 'y1': r1(line['y1']), 'words': words})
    pj = json.load(open(f'{repo}/public/data/page/{n}.json'))
    expected = [f"{w['verse_key']}:{w['idx']}" for li in pj['lines'] if li.get('type') == 'text' for w in li['words']]
    if sorted(seen) != sorted(expected) or len(set(seen)) != len(seen):
        problems.append(n)
    total += len(seen)
    with open(f'{repo}/public/data/mushaf-layout/{n}.json', 'w') as f:
        json.dump(out, f, separators=(',', ':'), ensure_ascii=False)

print('tokens', total, 'pages with token mismatch', problems)
sys.exit(1 if problems else 0)
