# 🚀 SETUP — วิธี push project ขึ้น GitHub

> ไฟล์นี้สำหรับครั้งแรกอย่างเดียว push ขึ้นเสร็จแล้วลบไฟล์นี้ทิ้งได้

---

## ขั้นตอน (ทำตามลำดับ)

### 1. แตก zip ไปไว้ที่ที่อยากเก็บ project

```bash
cd ~/Documents          # หรือ path ที่ใช้เก็บ project
unzip factory-stock-liff.zip
cd factory-stock-liff
```

### 2. เช็คว่าไฟล์ครบ

```bash
ls -la
# ต้องเจอ:
# - README.md
# - CONTEXT.md
# - .gitignore
# - docs/architecture.md
```

### 3. สร้าง GitHub repo ใหม่

ไปที่ https://github.com/new

- **Repository name:** `factory-stock-liff`
- **Visibility:** Private (แนะนำ — เพราะมี business logic)
- ⚠️ **อย่าติ๊ก** "Add a README", "Add .gitignore", "Add license"
   (เพราะมีอยู่แล้วใน zip)
- กด **Create repository**

### 4. Init git แล้ว push

GitHub จะแสดงคำสั่งให้ — ใช้ชุด **"…or push an existing repository"**

```bash
git init
git add .
git commit -m "Initial commit: CONTEXT + architecture"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/factory-stock-liff.git
git push -u origin main
```

> 🔑 ถ้าถาม login: ใช้ Personal Access Token แทน password
> สร้างได้ที่ https://github.com/settings/tokens (ติ๊ก scope `repo`)

### 5. ตรวจว่าขึ้นถูก

เปิด `https://github.com/YOUR_USERNAME/factory-stock-liff` แล้ว:
- ✅ เห็น README.md ขึ้นหน้าแรก
- ✅ เปิด `docs/architecture.md` แล้ว **Mermaid diagram render ได้** (ลูกศรขึ้นเป็นภาพ)
- ✅ เห็น CONTEXT.md ใน root

ถ้า Mermaid ขึ้นเป็น code block ธรรมดา = อาจต้อง refresh / clear cache

---

## ขั้นต่อไป (หลัง push สำเร็จ)

### 6. กลับมาแชท Claude → ตัด TASKS.md

พิมพ์: **"ตัด task จาก architecture นี้"**

ผมจะออกไฟล์ `TASKS.md` ที่ Claude Code หยิบไป build ทีละชิ้นได้เลย

### 7. clone กลับมาเครื่องเพื่อให้ Claude Code ทำงาน

```bash
cd ~/Documents
git clone https://github.com/YOUR_USERNAME/factory-stock-liff.git
cd factory-stock-liff
claude  # เปิด Claude Code ใน folder นี้
```

แล้วบอก Claude Code:
> "อ่าน CONTEXT.md, docs/architecture.md, docs/TASKS.md
> แล้วเริ่มจาก task แรก ทำทีละชิ้น"

---

## 🆘 ถ้าติด

### ปัญหา: `git push` ไม่ผ่าน — ขอ password
→ GitHub ไม่รับ password แล้ว ต้องใช้ Personal Access Token
→ https://github.com/settings/tokens → Generate new token (classic) → ติ๊ก `repo`
→ Copy token → ใช้แทน password ตอน push

### ปัญหา: Mermaid ไม่ render บน GitHub
→ ต้อง push เข้า `main` branch (GitHub render Mermaid เฉพาะ default branch)
→ refresh + clear cache + ลอง incognito

### ปัญหา: ลืม `.gitignore` push secret ไปแล้ว
→ ใช้ https://github.com/newren/git-filter-repo ลบ history
→ หรือลบ repo สร้างใหม่ (ถ้ายังไม่มีคนอื่น clone)

---

## 🔒 Security ก่อน push

ก่อน `git push` ตรวจ 1 รอบสุดท้าย:

```bash
# เช็คว่าไม่มี secret หลุด
grep -r "TOKEN\|SECRET\|PASSWORD\|API_KEY" --exclude-dir=.git .
```

ถ้าเจอ — แก้ก่อน push! โดยเฉพาะ:
- ❌ LINE Channel Access Token
- ❌ n8n webhook URL
- ❌ Google Drive folder ID (อันนี้ไม่ critical แต่ไม่ควรเปิด)

ทุก secret ต้องอยู่ใน:
- ✅ Apps Script → Script Properties
- ✅ n8n → Credentials
- ❌ ไม่ใช่ใน source code
