"""Sinh các biến thể logo UMLab từ docs/assets/brand/umlab-logo-source.svg (hình vẽ chép tay vào hàm mark()).

  pip install fonttools
  python3 scripts/brand-logo.py node_modules/@fontsource/be-vietnam-pro/files docs/assets/brand

Chữ "UMLab" / "SYSTEMS & FLOWS" chuyển thành path từ Be Vietnam Pro nên ảnh giống nhau trên mọi máy.
Sau đó chép umlab-{logo,icon,logo-tagline}[-dark].svg vào apps/desktop/src/renderer/public/brand/,
umlab-app-icon.svg → favicon.svg; icon ứng dụng (build/icon.png) render từ umlab-app-icon.svg.
"""
import sys
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen

FD = sys.argv[1]
OUT = sys.argv[2]
def font(w): return TTFont(f'{FD}/be-vietnam-pro-latin-{w}-normal.woff')

def text_path(f, s, size, x, y, spacing=0.0):
    """Path SVG cho chuỗi s, baseline y, bắt đầu x. Trả về (d, width)."""
    upm = f['head'].unitsPerEm; k = size / upm
    gs = f.getGlyphSet(); cmap = f.getBestCmap(); hmtx = f['hmtx']
    pen = SVGPathPen(gs)
    cx = 0.0
    names = [cmap[ord(c)] for c in s]
    for i, g in enumerate(names):
        tp = TransformPen(pen, (k, 0, 0, -k, x + cx, y))
        gs[g].draw(tp)
        cx += hmtx[g][0] * k + (spacing if i < len(names) - 1 else 0)
    return pen.getCommands(), cx

def ink_width(f, s, size, spacing=0.0):
    _, w = text_path(f, s, size, 0, 0, spacing)
    return w

F900, F400, F800 = font(900), font(400), font(800)

def palette(dark):
    return dict(
        navy='#DCE7F2' if dark else '#0A3656',
        ring='#1D2027' if dark else '#FFFFFF',
        deep='#1597B8' if dark else '#095D7E',
        t1='#EEF3F9' if dark else '#0A3656', t2='#D3DEEA' if dark else '#072B46',
    )

def defs(p, uid):
    return f'''<defs>
<linearGradient id="{uid}uL" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#0B5C8A"/><stop offset="100%" stop-color="#129CB3"/></linearGradient>
<linearGradient id="{uid}mG" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#10B1B1"/><stop offset="100%" stop-color="#0A7C99"/></linearGradient>
<linearGradient id="{uid}lq" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#14B8A6"/><stop offset="100%" stop-color="#0284C7"/></linearGradient>
<linearGradient id="{uid}tD" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="{p['t1']}"/><stop offset="100%" stop-color="{p['t2']}"/></linearGradient>
<linearGradient id="{uid}tT" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#0D94B2"/><stop offset="100%" stop-color="#11A8B9"/></linearGradient>
<clipPath id="{uid}fc"><path d="M370 85L410 85L410 110L435 170L458 225A16 16 0 0 1 444 248L336 248A16 16 0 0 1 322 225L345 170L370 110Z"/></clipPath>
</defs>'''

def mark(p, uid, liquid_extra=''):
    # toạ độ gốc của logo (trước translate(10,10)); bbox ≈ x 143..462, y 76..255
    return f'''<g class="mark">
<g clip-path="url(#{uid}fc)"><path class="liquid" d="M310 170Q355 155 390 175T470 170L470 260L310 260Z" fill="url(#{uid}lq)" opacity=".85"{liquid_extra}/></g>
<path d="M362 82H418" stroke="{p['navy']}" stroke-width="10" stroke-linecap="round" fill="none"/>
<path d="M372 85V112L347 172L325 225A16 16 0 0 0 339 248H441A16 16 0 0 0 455 225L433 172L408 112V85" fill="none" stroke="{p['navy']}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M400 125H415M405 145H422" stroke="{p['navy']}" stroke-width="6" stroke-linecap="round"/>
<path d="M148 128V195A45 45 0 0 0 238 195V128H208V195A15 15 0 0 1 178 195V128Z" fill="url(#{uid}uL)"/>
<path d="M148 195A45 45 0 0 0 238 195L238 210A45 45 0 0 1 148 210Z" fill="#094A72" opacity=".4"/>
<path d="M238 195V128L280 198L322 128V248H294V175L280 198L266 175V248H238Z" fill="url(#{uid}mG)"/>
<path d="M280 148V106H222A16 16 0 0 0 206 122V132" fill="none" stroke="#0D94B2" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
<circle class="n1" cx="206" cy="138" r="11" fill="#0D94B2" stroke="{p['ring']}" stroke-width="4"/>
<path d="M312 178H392" stroke="#0D94B2" stroke-width="10" stroke-linecap="round"/>
<circle class="n2" cx="394" cy="178" r="11" fill="#0D94B2" stroke="{p['ring']}" stroke-width="4"/>
<path d="M312 218H398" stroke="{p['deep']}" stroke-width="10" stroke-linecap="round"/>
<circle class="n3" cx="400" cy="218" r="11" fill="{p['deep']}" stroke="{p['ring']}" stroke-width="4"/>
</g>'''

MX0, MY0, MX1, MY1 = 142, 75, 463, 256  # bbox mark
MCX = (MX0 + MX1) / 2

def word(cx, baseline, size, uid):
    wum = ink_width(F900, 'UM', size, -1.5 * size / 88)
    wlab = ink_width(F400, 'Lab', size, -1 * size / 88)
    gap = 0.02 * size
    x = cx - (wum + gap + wlab) / 2
    d1, _ = text_path(F900, 'UM', size, x, baseline, -1.5 * size / 88)
    d2, _ = text_path(F400, 'Lab', size, x + wum + gap, baseline, -1 * size / 88)
    return f'<path d="{d1}" fill="url(#{uid}tD)"/><path d="{d2}" fill="url(#{uid}tT)"/>', x, x + wum + gap + wlab

def svg(vb, body, w=None, h=None, title='UMLab'):
    x, y, W, H = vb
    size = f' width="{w}" height="{h}"' if w else ''
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x:g} {y:g} {W:g} {H:g}"{size} role="img" aria-label="{title}"><title>{title}</title>{body}</svg>\n'

def r(v): return round(v, 1)

for dark in (False, True):
    p = palette(dark); sfx = '-dark' if dark else ''; uid = 'ud' if dark else 'ul'
    # 1) dọc + khẩu hiệu
    wb, wx0, wx1 = word(MCX, 345, 88, uid)
    tw = ink_width(F800, 'SYSTEMS & FLOWS', 22, 5)
    td, _ = text_path(F800, 'SYSTEMS & FLOWS', 22, MCX - tw / 2, 388, 5)
    body = defs(p, uid) + mark(p, uid) + wb + f'<path d="{td}" fill="{p["navy"]}"/>'
    x0 = min(MX0, wx0) - 12; x1 = max(MX1, wx1) + 12
    open(f'{OUT}/umlab-logo-tagline{sfx}.svg', 'w').write(svg((r(x0), 63, r(x1 - x0), 340), body, title='UMLab — Systems &amp; Flows'))
    # 2) ngang: mark + chữ (thanh trên, đăng nhập)
    size = 150
    wum = ink_width(F900, 'UM', size, -1.5 * size / 88)
    wlab = ink_width(F400, 'Lab', size, -1 * size / 88)
    tx = MX1 + 26
    base = (MY0 + MY1) / 2 + 0.36 * size  # cân giữa chữ hoa theo chiều cao mark
    d1, _ = text_path(F900, 'UM', size, tx, base, -1.5 * size / 88)
    d2, _ = text_path(F400, 'Lab', size, tx + wum + 3, base, -1 * size / 88)
    body = defs(p, uid) + mark(p, uid) + f'<path d="{d1}" fill="url(#{uid}tD)"/><path d="{d2}" fill="url(#{uid}tT)"/>'
    x1 = tx + wum + 3 + wlab + 6
    open(f'{OUT}/umlab-logo{sfx}.svg', 'w').write(svg((MX0, MY0, r(x1 - MX0), MY1 - MY0), body))
    # 3) chỉ icon (vuông)
    side = MX1 - MX0 + 8
    cy = (MY0 + MY1) / 2
    open(f'{OUT}/umlab-icon{sfx}.svg', 'w').write(svg((MX0 - 4, r(cy - side / 2), side, side), defs(p, uid) + mark(p, uid)))

# 4) icon ứng dụng / favicon: ô bo góc nền trắng, mark ở giữa
p = palette(False)
S = 512; pad = 46
k = (S - 2 * pad) / (MX1 - MX0)
h = (MY1 - MY0) * k
tile = (f'<rect x="8" y="8" width="496" height="496" rx="112" fill="#FFFFFF"/>'
        f'<rect x="9" y="9" width="494" height="494" rx="111" fill="none" stroke="#0A3656" stroke-opacity=".12" stroke-width="2"/>'
        f'<g transform="translate({pad - MX0 * k:.2f} {(S - h) / 2 - MY0 * k:.2f}) scale({k:.4f})">{mark(p, "ut")}</g>')
open(f'{OUT}/umlab-app-icon.svg', 'w').write(svg((0, 0, S, S), defs(p, 'ut') + tile, 512, 512))
print('ok')
