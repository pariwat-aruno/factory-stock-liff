#!/usr/bin/env python3
"""สร้างรูป Rich Menu PNG สำหรับ LINE OA — ธีม VORDA cherry+gold

Usage:
  python3 make-rich-menu.py <out.png>

Layout: Compact 2500x843 — 4 cells เรียงในแถวเดียว (1x4)
  [📥 รับเข้า] [📤 เบิก] [🏭 ผลิต] [📊 ยอด]
"""

from PIL import Image, ImageDraw
import os, sys

# Compact 2500x843 — 4 cells เรียงข้างกัน
W, H = 2500, 843
N = 4
CELL_W, CELL_H = W // N, H
CELLS = [
    ('📥', 'รับเข้า'),
    ('📤', 'เบิก'),
    ('🏭', 'ผลิต'),
    ('📊', 'ยอด'),
]

# สี VORDA brand
CHERRY = '#a80020'
GOLD = '#d4af37'
WHITE = '#ffffff'

def find_thai_font():
    for p in [
        '/System/Library/Fonts/Supplemental/Ayuthaya.ttf',
        '/System/Library/Fonts/ThonburiUI.ttc',
        '/System/Library/Fonts/Thonburi.ttc',
        '/System/Library/Fonts/Supplemental/Sathu.ttf',
        '/Library/Fonts/Arial Unicode.ttf',
    ]:
        if os.path.exists(p): return p
    return None

def find_emoji_font():
    p = '/System/Library/Fonts/Apple Color Emoji.ttc'
    return p if os.path.exists(p) else None

def main():
    from PIL import ImageFont
    img = Image.new('RGB', (W, H), CHERRY)
    draw = ImageDraw.Draw(img)

    thai_path = find_thai_font()
    emoji_path = find_emoji_font()
    if not thai_path:
        print('No Thai font found', file=sys.stderr); sys.exit(1)

    # cell แคบลง (625 wide) → ลดขนาด font
    label_font = ImageFont.truetype(thai_path, 110)
    # Apple Color Emoji รองรับเฉพาะ pixel size set (… 96, 128, 160)
    emoji_font = ImageFont.truetype(emoji_path, 160) if emoji_path else label_font

    # gold separator ระหว่างทุก cell
    sep_w = 6
    for i in range(1, N):
        x = i * CELL_W
        draw.rectangle([x - sep_w//2, 0, x + sep_w//2, H], fill=GOLD)

    # gold border
    draw.rectangle([0, 0, W - 1, H - 1], outline=GOLD, width=10)

    for i, (icon, label) in enumerate(CELLS):
        x0 = i * CELL_W
        cx = x0 + CELL_W // 2
        cy = H // 2

        # icon + label วางใกล้กัน — center stacked: icon บน, label ล่าง
        bbox = draw.textbbox((0, 0), icon, font=emoji_font, embedded_color=True)
        iw = bbox[2] - bbox[0]; ih = bbox[3] - bbox[1]
        lbox = draw.textbbox((0, 0), label, font=label_font)
        lw = lbox[2] - lbox[0]; lh = lbox[3] - lbox[1]

        gap = 30                  # ระยะระหว่าง icon กับ label
        total_h = ih + gap + lh
        iy = cy - total_h // 2    # icon top
        ly = iy + ih + gap        # label top

        try:
            draw.text((cx - iw // 2, iy), icon, font=emoji_font, embedded_color=True)
        except Exception:
            draw.text((cx - iw // 2, iy), icon, font=emoji_font, fill=GOLD)

        # shadow + label
        lx = cx - lw // 2
        draw.text((lx + 3, ly + 3), label, font=label_font, fill=(0, 0, 0, 80))
        draw.text((lx, ly), label, font=label_font, fill=GOLD)

    out = sys.argv[1] if len(sys.argv) > 1 else 'rich-menu.png'
    img.save(out, 'PNG', optimize=True)
    print(f'Saved {out}  ({W}x{H}, {os.path.getsize(out)//1024} KB)')

if __name__ == '__main__':
    main()
