#!/usr/bin/env python3
"""สร้างรูป Rich Menu 2x2 (2500x1686) PNG สำหรับ LINE OA — ธีม VORDA cherry+gold"""

from PIL import Image, ImageDraw, ImageFont
import os, sys

# Layout 2x2 ตาม spec LINE Large = 2500x1686 (cell 1250x843)
W, H = 2500, 1686
CELL_W, CELL_H = W // 2, H // 2

# สี ตาม brand VORDA
CHERRY = '#a80020'   # cherry red เข้ม (เหมือน bg ของ logo)
GOLD = '#d4af37'     # gold metallic
GOLD_DARK = '#a07a1f'
WHITE = '#ffffff'

CELLS = [
    # (col, row, icon, label)
    (0, 0, '📥', 'รับเข้า'),
    (1, 0, '📤', 'เบิก'),
    (0, 1, '📊', 'ยอดคงเหลือ'),
    (1, 1, '⚙️', 'Admin'),
]

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
    img = Image.new('RGB', (W, H), CHERRY)
    draw = ImageDraw.Draw(img)

    thai_path = find_thai_font()
    emoji_path = find_emoji_font()
    if not thai_path:
        print('No Thai font found', file=sys.stderr); sys.exit(1)

    label_font = ImageFont.truetype(thai_path, 140)
    emoji_font = ImageFont.truetype(emoji_path, 160) if emoji_path else label_font

    # gold separator ระหว่าง cell (กลางแนวตั้ง + แนวนอน)
    sep_w = 8
    draw.rectangle([CELL_W - sep_w//2, 0, CELL_W + sep_w//2, H], fill=GOLD)
    draw.rectangle([0, CELL_H - sep_w//2, W, CELL_H + sep_w//2], fill=GOLD)

    # gold border ทั้งภาพ
    border_w = 12
    draw.rectangle([0, 0, W - 1, H - 1], outline=GOLD, width=border_w)

    for col, row, icon, label in CELLS:
        x0, y0 = col * CELL_W, row * CELL_H
        cx, cy = x0 + CELL_W // 2, y0 + CELL_H // 2

        # gold ring รอบ icon (แบบ logo VORDA — วงกลมทอง)
        ring_cy = cy - 130          # ขยับลงจาก -280 → -130 ไม่ตัดขอบบน
        ring_r = 180
        # outer ring
        draw.ellipse([cx - ring_r, ring_cy - ring_r, cx + ring_r, ring_cy + ring_r],
                     outline=GOLD, width=10)

        # icon ใส่กลางวงแหวน
        bbox = draw.textbbox((0, 0), icon, font=emoji_font, embedded_color=True)
        iw = bbox[2] - bbox[0]; ih = bbox[3] - bbox[1]
        try:
            draw.text((cx - iw // 2, ring_cy - ih // 2 - 20), icon,
                      font=emoji_font, embedded_color=True)
        except Exception:
            draw.text((cx - iw // 2, ring_cy - ih // 2 - 20), icon,
                      font=emoji_font, fill=GOLD)

        # label (ทอง — มี shadow ขาวบางๆ ให้อ่านง่าย)
        lbox = draw.textbbox((0, 0), label, font=label_font)
        lw = lbox[2] - lbox[0]
        lx = cx - lw // 2
        ly = cy + 130
        # shadow
        draw.text((lx + 3, ly + 3), label, font=label_font, fill=(0, 0, 0, 80))
        draw.text((lx, ly), label, font=label_font, fill=GOLD)

    out = sys.argv[1] if len(sys.argv) > 1 else 'rich-menu.png'
    img.save(out, 'PNG', optimize=True)
    print(f'Saved {out}  ({W}x{H}, {os.path.getsize(out)//1024} KB)')

if __name__ == '__main__':
    main()
