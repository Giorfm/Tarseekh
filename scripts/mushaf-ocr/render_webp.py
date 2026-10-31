"""Render KFGQPC vector pages to WebP. Usage: render_webp.py <pages_dir> <out_dir> <width> <quality> <pages csv>"""
import sys, pymupdf
from PIL import Image
src, out, width, q, sel = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), sys.argv[5]
for n in (int(x) for x in sel.split(',')):
    page = pymupdf.open(f'{src}/{n:03d}.ai')[0]
    z = width / page.rect.width
    pix = page.get_pixmap(matrix=pymupdf.Matrix(z, z), alpha=False)
    Image.frombytes('RGB', (pix.width, pix.height), pix.samples).save(f'{out}/{n:03d}.webp', 'WEBP', quality=q, method=6)
