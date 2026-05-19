# CONTEXT.md — Factory Stock LIFF

> **สำคัญ:** AI / Claude Code ต้องอ่านไฟล์นี้ก่อนทำงานบน project นี้ทุกครั้ง
> ห้ามใช้ศัพท์ที่ไม่ตรงกับที่จดไว้ในนี้

---

## 1. Project Identity

- **ชื่อ:** `factory-stock-liff`
- **ชื่อไทย:** ระบบสต็อกโรงงาน (LINE LIFF)
- **Description:** ระบบบันทึกของเข้า–เบิก และดูยอดคงเหลือวัตถุดิบในโรงงานผลิตสกินแคร์ ผ่าน LINE LIFF โดยมีพนักงาน 1 คนใช้งานหลัก และเจ้าของรับ alert/report
- **Type:** Mini app (ไม่ใช่ enterprise)
- **Stack:** Google Sheets + Apps Script + LINE LIFF + LINE Messaging API + n8n + Google Drive + GitHub

---

## 2. Glossary — ศัพท์ที่ใช้ใน project นี้

| คำที่ใช้ในระบบ | คำเทคนิค (ห้ามใช้) | ความหมาย |
|---|---|---|
| สินค้า / รายการ | item / product / SKU | ของในคลัง 1 ชนิด (เช่น "น้ำมันโจโจบา") |
| ประเภท | category / type / class | กลุ่มของสินค้า 1 ใน 5 กลุ่ม (วัตถุดิบ/สารสกัด/แพคเกจจิ้ง/วัสดุสิ้นเปลือง/อะไหล่) |
| รับเข้า | stock-in / receive / inbound | การลงทะเบียนของที่ supplier ส่งมาถึงโรงงาน |
| เบิก | stock-out / issue / withdraw | การนำของออกจากคลังไปใช้ในการผลิต |
| ยอดคงเหลือ | balance / on-hand / current stock | จำนวนของที่เหลืออยู่ในคลังตอนนี้ (= รับเข้ารวม − เบิกรวม) |
| ขั้นต่ำ | min stock / threshold / reorder point | จำนวนต่ำสุดที่ยอมรับได้ ต่ำกว่านี้ต้อง alert |
| Batch / สูตร | recipe / formula / production lot | รหัสสูตรการผลิตที่พนักงานเบิกของไปใช้ |
| พนักงาน | operator / worker / staff | คนหน้างานในโรงงานที่ทำหน้าที่รับเข้า + เบิก |
| เจ้าของ | admin / owner / manager | พี่ปุ้ย — คุมราคา + master data + รับ alert/report |
| ใบส่งของ | delivery note / invoice / receipt | รูปเอกสารที่ supplier แนบมาตอนส่งของ (เก็บใน Drive) |
| ยกเลิกรายการล่าสุด | undo / rollback / reverse | กดยกเลิกรายการ stock-in/out ของตัวเองภายใน 5 นาที |
| ขนาดบรรจุ | fill size / net weight / pack size | จำนวนกรัม/มล. ต่อ 1 ชิ้นสินค้าสำเร็จรูป (เช่น 30g/ขวด) |
| หน่วยผลผลิต | output unit / finished unit | หน่วยนับสินค้าสำเร็จรูปหลังบรรจุ (ขวด/หลอด/ซอง/กระปุก) |
| คาดว่าจะได้ | expected yield / projected output | yield คาดการณ์ที่ระบบคำนวณตอนเบิก (ไม่หัก waste) |

**กฎ:** ใน code, comment, doc, message ทั้งหมดให้ใช้คอลัมน์ซ้าย ห้ามใช้คอลัมน์กลางเด็ดขาด
ตัวแปรใน code ใช้อังกฤษได้ (เช่น `stockIn`, `stockOut`, `balance`) แต่ comment + UI message = ไทย ตามคอลัมน์ซ้าย

---

## 3. Roles & Permissions

| Role | จำนวน | ทำอะไรได้ | ทำไม่ได้ |
|---|---|---|---|
| **พนักงาน** | 1 คน | รับเข้า, เบิก, ดูยอดคงเหลือ, ยกเลิกรายการตัวเอง (ภายใน 5 นาที), แนบรูปใบส่งของ | เพิ่ม/ลบ/แก้รายการสินค้า, กรอกราคา, ดู report, แก้รายการคนอื่น |
| **เจ้าของ** | 1 คน (พี่ปุ้ย) | ทุกอย่าง + เพิ่ม/ลบ/แก้สินค้าใน Master_Items + กรอกราคาต่อหน่วย + ตั้ง min stock + รับ alert/report ใน LINE | — |

**กฎการระบุตัวตน:**
- ทุกคนเข้าผ่าน LINE LIFF ใน LINE OA เดียวกัน
- ระบบจำตัวตนจาก `LINE User ID`
- ลงทะเบียน 1 ครั้งใน Sheet `Users` (ผู้ใช้ใหม่ที่ไม่อยู่ใน Users → block + แจ้ง "ติดต่อเจ้าของ")
- Role ดูจาก column `role` ใน Sheet `Users`

---

## 4. Data Model

### Sheet: `Master_Items` (ทะเบียนสินค้า)
| Column | Type | ตัวอย่าง | หมายเหตุ |
|---|---|---|---|
| item_id | string | ITM-001 | auto-generate, unique |
| ชื่อ | string | น้ำมันโจโจบา | ชื่อที่พนักงานเห็นใน dropdown |
| ประเภท | enum | สารสกัด | 1 ใน 5: วัตถุดิบ / สารสกัด / แพคเกจจิ้ง / วัสดุสิ้นเปลือง / อะไหล่ |
| หน่วย | string | กก. | หน่วยต่างกันแต่ละชิ้น (กก./ลิตร/ขวด/ชิ้น/แพ็ค) |
| ราคาต่อหน่วย | number | 850 | เจ้าของกรอกทีหลัง — ว่างได้ |
| ขั้นต่ำ | number | 5 | ใช้ trigger alert เมื่อยอดคงเหลือ ≤ ค่านี้ |
| ขนาดบรรจุ | number | 30 | กรัม/มล. ต่อ 1 ชิ้นผลผลิต — ใส่เฉพาะ bulk material ที่จะใส่ภาชนะ (เว้นว่างสำหรับ packaging/อะไหล่) |
| หน่วยผลผลิต | string | ขวด | ขวด/หลอด/ซอง/กระปุก — คู่กับ "ขนาดบรรจุ" |
| สถานะ | enum | active | active / archived (แทนการลบจริง) |

**Yield rule:** ถ้าวัตถุดิบมีทั้ง `ขนาดบรรจุ` + `หน่วยผลผลิต` → ตอนเบิก ระบบคำนวณ yield คาดการณ์: `floor((จำนวน × 1000) ÷ ขนาดบรรจุ)` (สมมติ `หน่วย` เป็น kg/L) แล้วส่ง `yield_qty` + `yield_unit` กลับใน response — เป็น**ตัวเลขคาดการณ์** ไม่หัก waste

### Sheet: `Stock_In` (ประวัติรับเข้า)
| Column | Type | ตัวอย่าง | หมายเหตุ |
|---|---|---|---|
| timestamp | datetime | 2026-05-09 14:32:10 | auto จากระบบ |
| item_id | string | ITM-001 | FK → Master_Items |
| จำนวน | number | 10 | เป็นบวกเสมอ |
| line_user_id | string | U1234... | auto จาก LIFF |
| รูปใบส่งของ | string (URL) | https://drive.google.com/... | ลิงก์ Google Drive |
| สถานะ | enum | active | active / cancelled (เมื่อกดยกเลิกภายใน 5 นาที) |

### Sheet: `Stock_Out` (ประวัติเบิก)
| Column | Type | ตัวอย่าง | หมายเหตุ |
|---|---|---|---|
| timestamp | datetime | 2026-05-09 15:10:22 | auto |
| item_id | string | ITM-001 | FK → Master_Items |
| จำนวน | number | 2 | เป็นบวกเสมอ (logic หัก = ระบบ คิดเอง) |
| batch | string | VRD-2605-001 | รหัสสูตร/batch ที่นำของไปใช้ |
| line_user_id | string | U1234... | auto จาก LIFF |
| สถานะ | enum | active | active / cancelled |

### Sheet: `Users` (ทะเบียนผู้ใช้)
| Column | Type | ตัวอย่าง | หมายเหตุ |
|---|---|---|---|
| line_user_id | string | U1234... | unique, primary key |
| ชื่อ | string | คุณนุ้ย | ชื่อจริงสำหรับ alert/report |
| role | enum | พนักงาน | พนักงาน / เจ้าของ |
| registered_at | datetime | 2026-05-09 09:00:00 | วันลงทะเบียน |

### Sheet: `Production` (แผน + ผลผลิตรายวัน)
| Column | Type | ตัวอย่าง | หมายเหตุ |
|---|---|---|---|
| plan_id | string | PRD-0001 | auto-generate, unique |
| timestamp | datetime | 2026-05-19 08:30 | ตอนตั้งเป้า |
| วันที่ | date | 2026-05-19 | วันที่ผลิต (filter รายงานเย็น) |
| batch | string | VRD-2605-001 | ผูกกับ Stock_Out.batch |
| สินค้า | string | เซรั่มโสมแดง 30g | ชื่อสินค้าสำเร็จรูป |
| เป้า | number | 1000 | จำนวนเป้าผลิต |
| หน่วยผลผลิต | string | ขวด | ขวด/หลอด/ซอง |
| ผลจริง | number | 950 | กรอกตอนเย็น |
| ของเสีย | number | 20 | กรอกตอนเย็น |
| สถานะ | enum | planned | planned / done / cancelled |
| หมายเหตุ | string | ฉลากเสีย 20 | optional |
| owner_id | string | U... | LINE userId คนตั้งเป้า |
| worker_id | string | U... | LINE userId คนกรอกผล |

**Production rules:**
- 1 วัน 1 batch มีได้ 1 plan (active) เท่านั้น — กันซ้ำ
- เจ้าของเท่านั้นที่ตั้งเป้า / ยกเลิก
- ทั้งเจ้าของและพนักงานกรอกผลจริงได้
- % บรรลุ = `floor((ผลจริง / เป้า) × 100)` แสดงเฉพาะตอน status=done

### Sheet: `Logs` (error logs)
| Column | Type | ตัวอย่าง | หมายเหตุ |
|---|---|---|---|
| timestamp | datetime | 2026-05-09 14:32:10 | auto |
| function | string | onStockOut | ชื่อ function ที่ error |
| line_user_id | string | U1234... | ใครทำให้เกิด |
| error_message | string | "ของไม่พอ: ITM-001" | ข้อความ error |
| stack | string | (full stack) | stack trace สำหรับ debug |

---

## 5. Conventions

1. **ภาษา:** Comment ใน code = ไทย, ชื่อตัวแปร/function = อังกฤษ camelCase
2. **Error handling:** ทุก function ใน Apps Script ต้อง try-catch + log ลง Sheet `Logs`
3. **Idempotent:** Trigger รันซ้ำต้องไม่สร้างข้อมูลซ้ำ (ใช้ timestamp + line_user_id เป็น key)
4. **Timeout:** Apps Script function ต้องจบภายใน 6 นาที (งานยาว → ส่งต่อ n8n)
5. **Secrets:** ใส่ใน Script Properties (Apps Script) / n8n Credentials เท่านั้น ห้ามใส่ใน code
6. **ID generation:** `item_id` ใช้ pattern `ITM-XXX` (running number 3 หลัก)
7. **Soft delete:** ห้าม delete row จริงใน Sheet — เปลี่ยน `สถานะ` เป็น `archived` / `cancelled` แทน
8. **ยอดคงเหลือ:** คำนวณ real-time จาก `SUM(Stock_In.จำนวน WHERE สถานะ=active) − SUM(Stock_Out.จำนวน WHERE สถานะ=active)` ห้าม cache
9. **Validation:** ก่อนเขียน Stock_Out ต้องเช็คยอดคงเหลือ — ถ้าไม่พอ → block + return error "ของไม่พอ"
10. **ยกเลิกรายการ:** อนุญาตเฉพาะเจ้าของรายการ + ภายใน 5 นาทีหลัง timestamp เท่านั้น
11. **รูปภาพ:** อัปโหลดผ่าน LIFF → Apps Script รับ → save ไป Google Drive folder กลาง → เก็บแค่ URL ใน Sheet
12. **Time zone:** Asia/Bangkok ทุกที่ (Apps Script + n8n)

---

## 6. ห้ามทำ (Out of Scope — Phase 1)

❌ ออก PO อัตโนมัติ (อยู่ใน phase 2)
❌ คำนวณมูลค่าสต็อกรวม / ต้นทุนต่อ batch (อยู่ใน phase 3)
❌ เก็บ lot number / วันหมดอายุ (เจ้าของรับความเสี่ยงเอง — note: เสี่ยงสำหรับสารสกัด)
❌ Authentication เกินกว่า LINE Login
❌ Real-time websocket / push notification ในแอป (ใช้ LINE message แทน)
❌ Mobile native app (ใช้ LIFF อย่างเดียว)
❌ Custom domain / SSL (ใช้ deploy ของ Apps Script + LIFF default)
❌ เปลี่ยน DB เป็น Firebase / Supabase / Postgres / MySQL
❌ Multi-language UI (ไทยอย่างเดียว)
❌ Multi-warehouse / multi-location (โรงงานเดียว)

ถ้าผู้ใช้ขอเหล่านี้ → ตอบว่า "ออก scope phase 1 แล้วครับ เก็บไว้ phase ถัดไป"

---

## 7. ขั้นต่อไป

หลัง CONTEXT.md เสร็จแล้ว:
1. Copy ไฟล์นี้ไปวาง GitHub repo root (ตั้งชื่อ `CONTEXT.md`)
2. ใช้ skill `mini-app-architect` ออกแบบ architecture (Mermaid diagram + data flow + setup plan)
3. ใช้ skill `mini-app-tasks` ตัด TODO ส่ง Claude Code
