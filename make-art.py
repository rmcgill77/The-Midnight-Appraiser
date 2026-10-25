#!/usr/bin/env python3
"""Builds the Android icon set and splash screen from the game's own icons.

Run from the mobile/ folder (needs Pillow):  python3 scripts/make-art.py
Writes res/ (copied into the Android project by patch-android.mjs) and store/icon-512.png.
"""
import os, shutil
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ICONS = os.path.join(HERE, '..', 'icons')
RES = os.path.join(HERE, 'res')

full = Image.open(os.path.join(ICONS, 'icon-512.png')).convert('RGBA')
mask = Image.open(os.path.join(ICONS, 'icon-maskable-512.png')).convert('RGBA')
bg = mask.getpixel((4, 4))[:3]
bg_hex = '#%02X%02X%02X' % bg

shutil.rmtree(RES, ignore_errors=True)
DENS = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}
for name, k in DENS.items():
    d = os.path.join(RES, f'mipmap-{name}'); os.makedirs(d, exist_ok=True)
    s = round(48 * k)
    sq = full.resize((s, s), Image.LANCZOS)
    sq.save(os.path.join(d, 'ic_launcher.png'))
    circle = Image.new('L', (s * 4, s * 4), 0); ImageDraw.Draw(circle).ellipse((0, 0, s * 4 - 1, s * 4 - 1), fill=255)
    circle = circle.resize((s, s), Image.LANCZOS)
    rd = Image.new('RGBA', (s, s), (0, 0, 0, 0)); rd.paste(sq, (0, 0), circle); rd.save(os.path.join(d, 'ic_launcher_round.png'))
    f = round(108 * k)
    mask.resize((f, f), Image.LANCZOS).save(os.path.join(d, 'ic_launcher_foreground.png'))

adaptive = os.path.join(RES, 'mipmap-anydpi-v26'); os.makedirs(adaptive, exist_ok=True)
xml = '''<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
'''
for n in ('ic_launcher.xml', 'ic_launcher_round.xml'):
    open(os.path.join(adaptive, n), 'w').write(xml)
os.makedirs(os.path.join(RES, 'values'), exist_ok=True)
open(os.path.join(RES, 'values', 'ic_launcher_background.xml'), 'w').write(
    f'<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">{bg_hex}</color>\n</resources>\n')

# Splash: the game's dark ground, the little appraiser in the middle (center-cropped on any screen).
S = 2732
sp = Image.new('RGB', (S, S), bg)
logo = mask.resize((960, 960), Image.NEAREST)
sp.paste(logo, ((S - 960) // 2, (S - 960) // 2), logo)
sp.save(os.path.join(RES, 'splash.png'), optimize=True)

os.makedirs(os.path.join(HERE, 'store'), exist_ok=True)
full.save(os.path.join(HERE, 'store', 'icon-512.png'))
print('background', bg_hex, '· res/ and store/icon-512.png written')
