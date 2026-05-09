# Tasks — Factory Stock LIFF

> ตัดมาจาก [architecture.md § 6](./architecture.md#6-setup-plan-checklist-ทำตามลำดับ)
> 🧑 = ทำมือใน UI / 🤖 = Claude เขียน code ได้
> ทำตามลำดับ phase — ภายใน phase ทำขนานได้ตามที่ระบุ

---

## Phase A — Foundation 🧑

| # | Task | Output | Depends |
|---|---|---|---|
| A1 | สร้าง Google Sheet 5 sheets ตาม CONTEXT § 4 (`Master_Items`, `Stock_In`, `Stock_Out`, `Users`, `Logs`) + header แต่ละ sheet | Sheet ID | — |
| A2 | สร้าง Drive folder `factory-stock-photos` | Folder ID | — |
| A3 | เพิ่ม row `Users` — พี่ปุ้ย (เจ้าของ) + พนักงาน 1 คน พร้อม `line_user_id` | 2 rows | A1 |
| A4 | Seed `Master_Items` 5–10 รายการครอบคลุม 5 ประเภท | rows | A1 |

**Output ของ Phase A → ใส่ `.env` หรือบันทึกไว้ใช้ใน B2:**
- `SHEET_ID`, `DRIVE_FOLDER_ID`, `OWNER_LINE_USER_ID`

---

## Phase B — Apps Script Backend 🤖

> ทำใน folder `apps-script/` ใน repo นี้ก่อน แล้วค่อย copy เข้า Apps Script editor (หรือใช้ `clasp`)

| # | Task | File | Depends |
|---|---|---|---|
| B1 | 🧑 Extensions → Apps Script จาก Sheet — จด Script ID | — | A1 |
| B2 | 🧑 ตั้ง Script Properties: `DRIVE_FOLDER_ID`, `N8N_WEBHOOK_URL`, `N8N_SECRET` | — | B1, A2 |
| B3 | Router `doGet`/`doPost` + dispatch ตาม path | `Code.gs` | B1 |
| B4 | ตรวจ `line_user_id` + คืน role จาก `Users` sheet | `auth.gs` | B3, A3 |
| B5 | CRUD `Master_Items` — GET list, POST create, PATCH price, PATCH archive | `items.gs` | B4 |
| B6a | คำนวณ balance — SUM(Stock_In active) − SUM(Stock_Out active) per item | `stock.gs` | B4 |
| B6b | `POST /stockIn` — validate + upload base64 → Drive + insert row | `stock.gs` + `utils.gs` | B6a |
| B6c | `POST /stockOut` — LockService + check balance + insert row + return `balance_after` | `stock.gs` | B6a |
| B6d | `PATCH /transactions/:id/cancel` — เจ้าของ row ≤5นาที / เจ้าของ system ตลอดเวลา | `transactions.gs` | B6b, B6c |
| B7 | `GET /dailyReport` — ตรวจ `N8N_SECRET` + คืนสรุป 5 ประเภท + cache ใน Sheet | `report.gs` | B6a |
| B8 | เรียก n8n webhook เมื่อ `balance_after ≤ min_stock` (เรียกจาก B6c) | `notify.gs` | B6c |
| B9 | 🧑 Deploy as Web App → "Anyone" → จด URL | — | B3–B8 |

**Acceptance Phase B:** เรียก endpoint ผ่าน `curl` ได้ครบ (test ก่อน LIFF)

---

## Phase C — LIFF Frontend 🤖 (ขนานกับ B ได้หลัง A)

| # | Task | File | Depends |
|---|---|---|---|
| C1 | ✅ สร้าง GitHub repo (เสร็จแล้ว) | — | — |
| C2 | 🧑 สร้าง LINE Login Channel + LIFF app — จด LIFF ID | — | — |
| C3a | `index.html` + layout/router + nav 4 tab | `liff/index.html` | C1 |
| C3b | หน้า "รับเข้า" — เลือก item, qty, ถ่าย/อัปรูป (resize 1920px q=0.8) | `liff/js/pages/stockIn.js` | C3a |
| C3c | หน้า "เบิก" — เลือก item, qty, batch + แสดง balance หลังเบิก | `liff/js/pages/stockOut.js` | C3a |
| C3d | หน้า "ยอดคงเหลือ" — filter ตามประเภท + highlight แดงเมื่อ ≤ min | `liff/js/pages/balance.js` | C3a |
| C3e | หน้า admin — เพิ่ม/แก้สินค้า, กรอกราคา, ยกเลิก row (เฉพาะ role เจ้าของ) | `liff/js/pages/admin.js` | C3a |
| C4a | LIFF init + `liff.getProfile()` → `lineUserId` | `liff/js/auth.js` | C2, C3a |
| C4b | API client เรียก Apps Script (ใส่ `lineUserId` ทุก request) | `liff/js/api.js` | B9, C4a |
| C5 | 🧑 Deploy GitHub Pages (Settings → Pages → main /liff) | URL | C3a |
| C6 | 🧑 ใส่ GitHub Pages URL ใน LIFF Endpoint URL | — | C5 |
| C7 | 🧑 ผูก LIFF กับ LINE OA Rich Menu | — | C6 |

---

## Phase D — n8n Automation 🧑

| # | Task | Output | Depends |
|---|---|---|---|
| D1 | Workflow #1 Alert: Webhook → IF → LINE push | Webhook URL → ใส่กลับ B2 | B8 |
| D2 | Workflow #2 Daily Report: Cron 18:00 Asia/Bangkok → HTTP GET `/dailyReport` (พร้อม secret) → format → LINE push | active workflow | B7 |
| D3 | ใส่ LINE Channel Access Token ใน n8n credentials | credential id | — |

---

## Phase E — Test 🧑

| # | Task | Pass criteria |
|---|---|---|
| E1 | Flow 1 รับเข้า + รูป | row ใหม่ใน `Stock_In` + รูปใน Drive folder |
| E2 | Flow 2 เบิก + alert | row ใน `Stock_Out` + LINE alert ถึงเจ้าของเมื่อ ≤ min |
| E3a | ดูยอดใน LIFF | ค่าตรงกับ Sheet, highlight แดงทำงาน |
| E3b | Report 18:00 | LINE message ถึงตามเวลา + ค่าถูก |
| E4 | Admin เพิ่ม/แก้/ยกเลิก | sheet update ตามที่กด |
| E5 | Edge cases § 7 (12 ข้อ) | ครบทุกข้อ |

---

## Suggested order สำหรับ build

1. **A ทั้งหมด** (manual ~30 นาที) → ได้ `SHEET_ID`, `DRIVE_FOLDER_ID`
2. **B1–B4 + B6a** ก่อน — เป็น foundation ของ backend
3. **B5, B6b, B6c, B6d, B7, B8** — feature ละ commit, test ด้วย `curl`
4. **B9 deploy** → ได้ Web App URL
5. **C2 + C4a + C4b** ขนานกับ B ได้ — แต่ทดสอบจริงต้องรอ B9
6. **C3a → C3b/c/d/e** ทีละหน้า + commit + push (auto-deploy GH Pages)
7. **D1, D2** หลัง B8/B7 deploy
8. **E** เก็บงาน

## Out of scope (ตาม CONTEXT)
- Multi-tenant
- Offline cache ใน LIFF
- Native app
- Barcode/QR scan (อาจเพิ่มทีหลัง)
