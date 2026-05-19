# Factory Stock LIFF

ระบบสต็อกโรงงานผลิตสกินแคร์ ผ่าน LINE LIFF — บันทึกของเข้า–เบิก, วางแผน + ติดตามผลผลิตรายวัน, ดูยอด real-time, audit log ครบทุก action, owner override ยอด, alert + daily report

## 🏗️ Stack

- **Frontend:** LINE LIFF (HTML + JS) deploy บน GitHub Pages (auto via Actions)
- **Backend:** Google Apps Script (Web App, deployment ID คงที่)
- **Database:** Google Sheets (7 sheets)
- **File storage:** Google Drive
- **Automation:** n8n cloud (alert + scheduled report 18:00)
- **Notification:** LINE Messaging API

## 📁 โครงสร้าง

```
factory-stock-liff/
├── README.md            ← ไฟล์นี้
├── CONTEXT.md           ← ศัพท์ + roles + sheet structure (อ่านก่อนเสมอ)
├── docs/
│   ├── architecture.md  ← Mermaid diagram + API + setup plan
│   ├── TASKS.md         ← TODO ตัดย่อยให้ Claude Code
│   └── rich-menu/       ← rich menu image (1x4)
├── liff/                ← deploy เป็น GitHub Pages
└── apps-script/         ← copy ไปวาง Apps Script editor
```

## 🚀 สถานะปัจจุบัน (อัปเดต 2026-05-19)

**🎉 MVP + Phase 2 เสร็จสิ้น — ใช้งานบน production ได้**

### Tabs ใน LIFF (6 tabs)
| Tab | สิทธิ์ | ฟีเจอร์ |
|---|---|---|
| 📥 รับเข้า | ทุกคน | ลงบันทึกของเข้า + แนบรูปใบส่งของ ≥4 รูป (บังคับเปิดกล้องใหม่) |
| 📤 เบิก | ทุกคน | เบิกวัตถุดิบ + batch + preview **yield คาดการณ์** live (สำหรับ bulk material) |
| 🏭 ผลิต | ทุกคน (เจ้าของตั้งเป้า) | เช้าตั้งเป้า + เย็นกรอกผลจริง + ของเสีย → คำนวณ % บรรลุ |
| 📊 ยอด | ทุกคน + override (เจ้าของ) | ดูยอด real-time + filter category + เจ้าของ "ปรับยอด" ตรงๆ |
| 📋 บันทึก | เจ้าของเท่านั้น | Audit log timeline — ทุก action ภาษาไทย + filter วันนี้/7วัน/ทั้งหมด |
| ⚙️ Admin | เจ้าของเท่านั้น | จัดการสินค้า (เพิ่ม/แก้/archive) — full edit ทุก field |

### Sheets ใน Google Sheet (7 sheets)
| Sheet | จำนวน column | หน้าที่ |
|---|---|---|
| `Master_Items` | 9 | ทะเบียนสินค้า (รวม "สินค้าสำเร็จรูป" + "ขนาดบรรจุ/หน่วยผลผลิต" สำหรับ yield) |
| `Stock_In` | 6 | ประวัติรับเข้า + รูปใบส่งของ |
| `Stock_Out` | 6 | ประวัติเบิก + batch |
| `Production` | 14 | แผน + ผลผลิตรายวัน (batch auto B-YYMM-NNN) |
| `Adjustments` | 8 | ปรับยอดโดยเจ้าของ (delta-based) |
| `Audit` | 8 | บันทึกทุก action ภาษาไทย |
| `Users` | 4 | ทะเบียนผู้ใช้ + role |
| `Logs` | 5 | error logs |

### ITEM_CATEGORIES (6 ประเภท)
- วัตถุดิบ / สารสกัด / แพคเกจจิ้ง / วัสดุสิ้นเปลือง / อะไหล่ / **สินค้าสำเร็จรูป**

### Backend (Apps Script v13) — endpoints หลัก

**Items:**
- `GET items`, `POST createItem`, `POST updateItem` (partial), `POST updateItemPrice`, `POST updateItemYield`, `POST archiveItem`

**Stock:**
- `GET balance`, `POST stockIn`, `POST stockOut`, `POST cancelTransaction`, `POST overrideBalance`

**Production:**
- `GET productionToday`, `POST createPlan`, `POST updatePlanResult`, `POST cancelPlan`

**Audit + Report:**
- `GET auditLogs?days=1|7|all`, `GET dailyReport` (n8n shared secret)

### Automation
- **n8n cron 18:00** → fetch `dailyReport` → ส่ง LINE OA สรุปวัน (รวม `today_stockout` + `today_production`)
- **Stock alert** → เมื่อ balance ≤ ขั้นต่ำ → ยิง n8n webhook → LINE message หาเจ้าของ

### Rich Menu
- Layout: **1x4 compact (2500×843)** — รับเข้า / เบิก / ผลิต / ยอด
- ทุกปุ่มชี้ LIFF เดียว `?tab=...` (เจ้าของกด audit/admin จาก tabbar ใน LIFF)

## 👥 ผู้ใช้ (2 roles)

| Role | สิทธิ์ |
|---|---|
| พนักงาน (1 คน) | รับเข้า, เบิก, ดูยอด, ดูแผนผลิต, กรอกผลผลิต, ยกเลิกรายการตัวเองภายใน 5 นาที |
| เจ้าของ (1 คน) | ทุกอย่าง + จัดการสินค้า + ตั้งเป้าผลิต + ยกเลิกแผน + ปรับยอด + ดู audit log + ยกเลิกได้ทุก row |

## 🛠️ AI Agents Notes

ทุก AI / Claude Code ต้อง:
1. อ่าน `CONTEXT.md` ก่อน
2. ใช้ศัพท์ตาม Glossary ใน CONTEXT (เช่น "เบิก" ไม่ใช่ "issue", "สินค้าสำเร็จรูป" ไม่ใช่ "finished good")
3. ทุก mutation ต้องเรียก `audit_(user, action, รายละเอียด, meta?, item_id?)` ใน backend
4. ห้าม hardcode column index — ใช้ helper `itemColIndex_()`, `planColIndex_()`

## 📝 License

Private project
