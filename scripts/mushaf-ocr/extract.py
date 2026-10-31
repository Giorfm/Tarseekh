import sys, zipfile, re, os
src, out = sys.argv[1], sys.argv[2]
n = 0
with zipfile.ZipFile(src) as z:
    for info in z.infolist():
        m = re.search(r'(\d{3})___Hafs39__DM\.ai$', info.filename)
        if not m:
            continue
        with z.open(info) as f, open(os.path.join(out, f'{m.group(1)}.ai'), 'wb') as o:
            o.write(f.read())
        n += 1
print('extracted', n)
