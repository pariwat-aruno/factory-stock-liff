# Factory Stock LIFF

ระบบสต็อกโรงงานผลิตสกินแคร์ ผ่าน LINE LIFF — บันทึกของเข้า–เบิก ดูยอดคงเหลือ real-time พร้อม alert + daily report

## 🏗️ Stack

- **Frontend:** LINE LIFF (HTML + JS) deploy บน GitHub Pages
- **Backend:** Google Apps Script (Web App)
- **Database:** Google Sheets (5 sheets)
- **File storage:** Google Drive
- **Automation:** n8n cloud (alert + scheduled report)
- **Notification:** LINE Messaging API

## 📁 โครงสร้าง

```
factory-stock-liff/
├── README.md            ← ไฟล์นี้
├── CONTEXT.md           ← ศัพท์ + roles + sheet structure (อ่านก่อนเสมอ)
├── docs/
│   └── architecture.md  ← Mermaid diagram + API + setup plan
│   └── TASKS.md         ← TODO ตัดย่อยให้ Claude Code (รออัปเดต)
├── liff/                ← deploy เป็น GitHub Pages
└── apps-script/         ← copy ไปวาง Apps Script editor
```

## 🚀 เริ่มใช้

1. อ่าน `CONTEXT.md` ก่อนเสมอ — เก็บคำเฉพาะของ project
2. อ่าน `docs/architecture.md` — เข้าใจ design + API
3. อ่าน `docs/TASKS.md` — ลำดับ build (ทำทีละ task)

## 👥 ผู้ใช้

| Role | สิทธิ์ |
|---|---|
| พนักงาน (1 คน) | รับเข้า, เบิก, ดูยอด, ยกเลิกรายการตัวเองภายใน 5 นาที |
| เจ้าของ (1 คน) | ทุกอย่าง + เพิ่ม/ลบสินค้า, กรอกราคา, ตั้ง min stock, ยกเลิกได้ทุก row |

## 🛠️ AI Agents Notes

ทุก AI / Claude Code ต้อง:
1. อ่าน `CONTEXT.md` ก่อน
2. ใช้ศัพท์ตาม Glossary ใน CONTEXT (เช่น "ลูกค้า" ไม่ใช่ "user", "เบิก" ไม่ใช่ "issue")
3. ทำ TASK ทีละชิ้นตาม `docs/TASKS.md`

## 📝 License

Private project
