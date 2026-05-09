#!/usr/bin/env python3
"""สร้างรูป Rich Menu 2x2 (2500x1686) PNG สำหรับ LINE OA"""

from PIL import Image, ImageDraw, ImageFont
import os, sys

# Layout 2x2 ตาม spec LINE Large = 2500x1686 (cell 1250x843)
W, H = 2500, 1686
CELL_W, CELL_H = W // 2, H // 2

CELLS = [
    # (col, row, color, icon, label)
    (0, 0, '#06c755', '📥', 'รับเข้า'),
    (1, 0, '#fb923c', '📤', 'เบิก'),
    (0, 1, '#3b82f6', '📊', 'ยอดคงเหลือ'),
    (1, 1, '#a855f7', '⚙️', 'Admin'),
]

def find_thai_font():
    candidates = [
        '/System/Library/Fonts/Supplemental/Ayuthaya.ttf',
        '/System/Library/Fonts/ThonburiUI.ttc',
        '/System/Library/Fonts/Thonburi.ttc',
        '/System/Library/Fonts/Supplemental/Sathu.ttf',
        '/Library/Fonts/Arial Unicode.ttf',
    ]
    for p in candidates:
        if os.path.exists(p):
            return p
    return None

def find_emoji_font():
    candidates = [
        '/System/Library/Fonts/Apple Color Emoji.ttc',
    ]
    for p in candidates:
        if os.path.exists(p):
            return p
    return None

def main():
    img = Image.new('RGB', (W, H), '#ffffff')
    draw = ImageDraw.Draw(img)

    thai_path = find_thai_font()
    emoji_path = find_emoji_font()
    if not thai_path:
        print('No Thai font found', file=sys.stderr); sys.exit(1)

    label_font = ImageFont.truetype(thai_path, 150)
    # Apple Color Emoji เป็น bitmap font — รองรับเฉพาะ 160px
    emoji_font = ImageFont.truetype(emoji_path, 160) if emoji_path else label_font

    for col, row, color, icon, label in CELLS:
        x0 = col * CELL_W
        y0 = row * CELL_H
        x1 = x0 + CELL_W
        y1 = y0 + CELL_H
        # background
        draw.rectangle([x0, y0, x1, y1], fill=color)
        # white separator
        draw.rectangle([x0, y0, x1, y1], outline='#ffffff', width=10)

        # icon (centered, upper area)
        icon_y = y0 + CELL_H // 2 - 200
        bbox = draw.textbbox((0, 0), icon, font=emoji_font, embedded_color=True)
        iw = bbox[2] - bbox[0]
        try:
            draw.text(((x0 + x1) // 2 - iw // 2, icon_y), icon, font=emoji_font, embedded_color=True)
        except Exception:
            draw.text(((x0 + x1) // 2 - iw // 2, icon_y), icon, font=emoji_font, fill='white')

        # label (white, below icon)
        lbox = draw.textbbox((0, 0), label, font=label_font)
        lw = lbox[2] - lbox[0]
        draw.text(((x0 + x1) // 2 - lw // 2, y0 + CELL_H // 2 + 80), label, font=label_font, fill='white')

    out = sys.argv[1] if len(sys.argv) > 1 else 'rich-menu.png'
    img.save(out, 'PNG', optimize=True)
    print(f'Saved {out}  ({W}x{H}, {os.path.getsize(out)//1024} KB)')

if __name__ == '__main__':
    main()
