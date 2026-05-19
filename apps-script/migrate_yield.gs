/**
 * Migration: เพิ่ม 2 column "ขนาดบรรจุ" + "หน่วยผลผลิต" ใน Master_Items
 *
 * วิธีรัน (ครั้งเดียวพอ):
 *   1. คลิก function dropdown ใน Apps Script editor → เลือก `migrateAddYieldColumns`
 *   2. กด ▶ Run
 *   3. ดู Logs (Cmd/Ctrl+Enter) ต้องเห็น "migrate done — added 2 columns"
 *   4. เปิด Google Sheet ตรวจว่า header มี ขนาดบรรจุ + หน่วยผลผลิต ก่อน สถานะ
 *
 * Idempotent: รันซ้ำได้ ถ้า column มีอยู่แล้วจะ skip
 */
function migrateAddYieldColumns() {
  const sheet = getSheet_('Master_Items');
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  if (headers.indexOf('ขนาดบรรจุ') >= 0 && headers.indexOf('หน่วยผลผลิต') >= 0) {
    Logger.log('skip — columns exist already');
    return 'already migrated';
  }

  const statusCol = headers.indexOf('สถานะ') + 1;
  if (statusCol < 1) throw new Error('ไม่พบ column "สถานะ" — header ผิดปกติ');

  // แทรก 2 column ก่อน "สถานะ"
  sheet.insertColumnsBefore(statusCol, 2);

  // header
  sheet.getRange(1, statusCol, 1, 2)
    .setValues([['ขนาดบรรจุ', 'หน่วยผลผลิต']])
    .setFontWeight('bold')
    .setBackground('#f1f3f4');

  // seed ตัวอย่างให้ ITM-005 (ขวดปั๊ม 30ml) — แสดงว่า "ขนาดบรรจุ" เป็น meta สำหรับสินค้าที่ใส่ขวด
  // แต่ขวดปั๊มเอง = packaging ไม่ใช่ bulk → ไม่กรอก
  // → เว้นว่างหมด ให้พี่กรอกเอาเองทีหลังตอน admin

  sheet.autoResizeColumns(statusCol, 2);
  Logger.log('migrate done — added 2 columns at col ' + statusCol);
  return 'migrate done — added 2 columns at col ' + statusCol;
}

/**
 * Seed สินค้าไลน์โสมแดง (6 ตัว) — รันใน editor หลัง migrate เสร็จ
 *
 * ขั้นต่ำ + ขนาดบรรจุ ตั้ง default — แก้ผ่าน admin UI ทีหลังได้
 * Idempotent: ถ้าชื่อซ้ำจะ skip (createItem_ throw — เรา catch)
 */
function seedSomDangItems() {
  const items = [
    { 'ชื่อ': 'ขวดเซรั่มโสมแดง',    'ประเภท': 'แพคเกจจิ้ง', 'หน่วย': 'ชิ้น', 'ขั้นต่ำ': 200 },
    { 'ชื่อ': 'กระปุกเซรั่มโสมแดง', 'ประเภท': 'แพคเกจจิ้ง', 'หน่วย': 'ชิ้น', 'ขั้นต่ำ': 200 },
    { 'ชื่อ': 'ถุงซีล',             'ประเภท': 'แพคเกจจิ้ง', 'หน่วย': 'ชิ้น', 'ขั้นต่ำ': 500 },
    { 'ชื่อ': 'กล่องเซรั่มโสมแดง',  'ประเภท': 'แพคเกจจิ้ง', 'หน่วย': 'ชิ้น', 'ขั้นต่ำ': 200 },
    { 'ชื่อ': 'เนื้อครีมโสมแดง',    'ประเภท': 'วัตถุดิบ',   'หน่วย': 'กก.',  'ขั้นต่ำ': 5 },
    { 'ชื่อ': 'เนื้อเซรั่มโสมแดง',  'ประเภท': 'วัตถุดิบ',   'หน่วย': 'กก.',  'ขั้นต่ำ': 5 },
  ];
  const results = [];
  items.forEach(function (it) {
    try {
      const r = createItem_(it);
      results.push('✓ ' + r.item_id + ' ' + r['ชื่อ']);
    } catch (e) {
      results.push('⚠ skip ' + it['ชื่อ'] + ': ' + e.message);
    }
  });
  const out = results.join('\n');
  Logger.log(out);
  return out;
}
