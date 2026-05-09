# n8n workflows — factory-stock

2 workflow ที่ต้อง import เข้า n8n cloud:
- `01-low-stock-alert.json` — รับ webhook จาก Apps Script เมื่อ balance ≤ ขั้นต่ำ → push LINE
- `02-daily-report.json` — cron 18:00 → fetch `/dailyReport` → push LINE

---

## 1) ตั้ง LINE credential ก่อน (ทำครั้งเดียว)

ใน n8n cloud → **Credentials** → **Add credential** → **Header Auth**
- Name: `LINE Messaging API`
- Header Name: `Authorization`
- Header Value: `Bearer YOUR_CHANNEL_ACCESS_TOKEN`

> Token หาได้จาก LINE Developers → Messaging API channel → Channel access token (long-lived)

---

## 2) Import workflow #1 — Low stock alert

1. n8n → **Workflows** → **+** → **Import from File** → เลือก `01-low-stock-alert.json`
2. คลิก node **LINE push** → แก้ JSON body:
   - `REPLACE_WITH_OWNER_USERID` → user ID ของพี่ปุ้ย (Messaging API context)
3. คลิก credential field → เลือก credential `LINE Messaging API` ที่ตั้งไว้ใน step 1
4. **Save** → toggle **Active** บนซ้าย
5. Copy **Webhook URL** จาก node `Webhook (low stock)` (Production URL)
6. ส่ง URL นี้มาให้ผม → จะอัปเดต Script Property `N8N_WEBHOOK_URL` ใน Apps Script

---

## 3) Import workflow #2 — Daily report

1. Import `02-daily-report.json`
2. คลิก node **Fetch dailyReport** → แก้ query parameter:
   - `secret` value: `REPLACE_WITH_N8N_SECRET` → ค่าจริง (ใน Apps Script Script Properties = `N8N_SECRET`)
3. คลิก node **LINE push** → แก้:
   - `REPLACE_WITH_OWNER_USERID` → user ID พี่ปุ้ย
   - credential → เลือก `LINE Messaging API`
4. **Save** → toggle **Active**
5. ทดสอบ: คลิก **Execute workflow** → เช็ค LINE มี message มา

---

## 4) เปลี่ยน N8N_SECRET (แนะนำ)

ตอนนี้ Apps Script Script Property `N8N_SECRET = change-me` (placeholder)

แก้:
1. Apps Script editor → ⚙ Project Settings → Script Properties
2. แก้ `N8N_SECRET` เป็น random string เช่น `openssl rand -hex 24`
3. ใน n8n workflow #2 → query `secret` ใส่ค่าใหม่ให้ตรงกัน

---

## ทดสอบ end-to-end

หลัง import + active ทั้ง 2 workflow:
- เปิด LIFF → เบิกของจน balance ≤ ขั้นต่ำ → LINE alert ควรมา (ภายใน 2-3 วิ)
- ทดสอบ daily report manual: n8n workflow #2 → **Execute workflow**
