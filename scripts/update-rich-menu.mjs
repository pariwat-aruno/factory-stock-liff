#!/usr/bin/env node
/**
 * Update LINE Rich Menu — 1x4 compact (2500x843)
 *
 * Steps:
 *   1. ลบ rich menu เก่าทั้งหมด (clean slate)
 *   2. CREATE rich menu ใหม่ (size + areas + actions)
 *   3. UPLOAD รูป docs/rich-menu/rich-menu.png
 *   4. SET เป็น default ของทุก user
 *
 * Auth:
 *   อ่าน Channel access token จาก env LINE_TOKEN
 *   หรือไฟล์ scripts/.line-token (gitignored)
 *
 * Usage:
 *   LINE_TOKEN=xxx node scripts/update-rich-menu.mjs
 *   หรือ
 *   echo "xxx" > scripts/.line-token && node scripts/update-rich-menu.mjs
 */

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOKEN_FILE = join(__dirname, '.line-token');
const IMAGE_PATH = join(__dirname, '..', 'docs', 'rich-menu', 'rich-menu.png');

const LIFF_BASE = 'https://liff.line.me/2010026617-i9TGbuOF';

function getToken() {
  if (process.env.LINE_TOKEN) return process.env.LINE_TOKEN.trim();
  if (existsSync(TOKEN_FILE)) return readFileSync(TOKEN_FILE, 'utf8').trim();
  console.error('❌ ต้องตั้ง LINE_TOKEN env หรือสร้าง scripts/.line-token');
  console.error('   หา token: LINE Developers → Messaging API channel → Channel access token (long-lived)');
  process.exit(1);
}

const TOKEN = getToken();
const AUTH = { Authorization: `Bearer ${TOKEN}` };

async function api(method, url, body, isData = false) {
  const opts = { method, headers: { ...AUTH } };
  if (body) {
    if (isData) {
      opts.headers['Content-Type'] = 'image/png';
      opts.body = body;
    } else {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
  }
  const res = await fetch(url, opts);
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${method} ${url} → ${res.status}: ${text}`);
  }
  try { return JSON.parse(text); } catch { return text; }
}

const RICH_MENU_DEF = {
  size: { width: 2500, height: 843 },
  selected: true,
  name: 'VORDA stock 1x4',
  chatBarText: 'เมนู',
  areas: [
    {
      bounds: { x: 0,    y: 0, width: 625, height: 843 },
      action: { type: 'uri', uri: `${LIFF_BASE}?tab=stockIn` },
    },
    {
      bounds: { x: 625,  y: 0, width: 625, height: 843 },
      action: { type: 'uri', uri: `${LIFF_BASE}?tab=stockOut` },
    },
    {
      bounds: { x: 1250, y: 0, width: 625, height: 843 },
      action: { type: 'uri', uri: `${LIFF_BASE}?tab=production` },
    },
    {
      bounds: { x: 1875, y: 0, width: 625, height: 843 },
      action: { type: 'uri', uri: `${LIFF_BASE}?tab=balance` },
    },
  ],
};

async function main() {
  if (!existsSync(IMAGE_PATH)) {
    console.error(`❌ ไม่พบไฟล์รูป: ${IMAGE_PATH}`);
    console.error('   รัน: python3 scripts/make-rich-menu.py docs/rich-menu/rich-menu.png ก่อน');
    process.exit(1);
  }

  // 1) list + delete old rich menus
  console.log('1/4 อ่าน rich menu เก่า...');
  const listRes = await api('GET', 'https://api.line.me/v2/bot/richmenu/list');
  const oldMenus = listRes.richmenus || [];
  console.log(`   พบ ${oldMenus.length} rich menu เก่า`);
  for (const m of oldMenus) {
    await api('DELETE', `https://api.line.me/v2/bot/richmenu/${m.richMenuId}`);
    console.log(`   ✓ ลบ ${m.richMenuId}`);
  }

  // 2) create new
  console.log('2/4 สร้าง rich menu ใหม่...');
  const createRes = await api('POST', 'https://api.line.me/v2/bot/richmenu', RICH_MENU_DEF);
  const newId = createRes.richMenuId;
  console.log(`   ✓ richMenuId = ${newId}`);

  // 3) upload image
  console.log('3/4 อัปโหลดรูป...');
  const imageBuf = readFileSync(IMAGE_PATH);
  await api('POST', `https://api-data.line.me/v2/bot/richmenu/${newId}/content`, imageBuf, true);
  console.log(`   ✓ uploaded ${imageBuf.length} bytes`);

  // 4) set as default
  console.log('4/4 ตั้งเป็น default...');
  await api('POST', `https://api.line.me/v2/bot/user/all/richmenu/${newId}`);
  console.log('   ✓ default set');

  console.log('\n🎉 เสร็จ — rich menu ใหม่ live ทันที (อาจต้องปิด/เปิด LINE ครั้งเดียว)');
  console.log(`   ID: ${newId}`);
}

main().catch(e => { console.error('❌ Error:', e.message); process.exit(1); });
