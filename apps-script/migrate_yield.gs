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

  // ⚠️ Google Sheet inherit data validation จาก column ขวา (สถานะ: active/archived)
  // ไปยัง 2 column ใหม่ที่ insert → ต้อง clear ออก ไม่งั้น setValue ค่าอื่นจะถูก reject
  sheet.getRange(2, statusCol, sheet.getMaxRows() - 1, 2).clearDataValidations();

  sheet.autoResizeColumns(statusCol, 2);
  Logger.log('migrate done — added 2 columns at col ' + statusCol);
  return 'migrate done — added 2 columns at col ' + statusCol;
}

/**
 * สร้าง Sheet "Production" — Phase 2 feature: ตั้งเป้า + บันทึกผลผลิตรายวัน
 *
 * รันใน editor ครั้งเดียว (idempotent: ถ้า sheet มีอยู่แล้ว skip)
 */
function createProductionSheet() {
  const ss = getSS_();
  if (ss.getSheetByName('Production')) {
    Logger.log('skip — Sheet "Production" exists already');
    return 'already exists';
  }
  const sheet = ss.insertSheet('Production');
  const headers = [
    'plan_id', 'timestamp', 'วันที่', 'batch', 'item_id', 'สินค้า',
    'เป้า', 'หน่วยผลผลิต', 'ผลจริง', 'ของเสีย',
    'สถานะ', 'หมายเหตุ', 'owner_id', 'worker_id',
  ];
  sheet.getRange(1, 1, 1, headers.length)
    .setValues([headers])
    .setFontWeight('bold')
    .setBackground('#f1f3f4');
  sheet.setFrozenRows(1);

  // validation ที่ "สถานะ" col 11 — เฉพาะ planned/done/cancelled
  const statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['planned', 'done', 'cancelled'], true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, 11, sheet.getMaxRows() - 1, 1).setDataValidation(statusRule);

  sheet.autoResizeColumns(1, headers.length);
  Logger.log('Production sheet created');
  return 'created';
}

/**
 * สร้าง Sheet "Audit" — บันทึกทุก action ในระบบ
 * รันใน editor ครั้งเดียว (idempotent)
 */
function createAuditSheet() {
  const ss = getSS_();
  if (ss.getSheetByName('Audit')) {
    Logger.log('skip — Sheet "Audit" exists already');
    return 'already exists';
  }
  const sheet = ss.insertSheet('Audit');
  const headers = [
    'timestamp', 'line_user_id', 'ชื่อ', 'role',
    'action', 'รายละเอียด', 'meta_json', 'item_id',
  ];
  sheet.getRange(1, 1, 1, headers.length)
    .setValues([headers])
    .setFontWeight('bold')
    .setBackground('#f1f3f4');
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);
  Logger.log('Audit sheet created');
  return 'created';
}

/**
 * สร้าง Sheet "Adjustments" — บันทึกการปรับยอดสต็อกโดยเจ้าของ
 * ใช้ในการ override balance — รวมใน getBalance_ ผ่าน sumByItem_
 */
function createAdjustmentsSheet() {
  const ss = getSS_();
  if (ss.getSheetByName('Adjustments')) {
    Logger.log('skip — Sheet "Adjustments" exists already');
    return 'already exists';
  }
  const sheet = ss.insertSheet('Adjustments');
  const headers = [
    'timestamp', 'item_id', 'ค่าเดิม', 'ค่าใหม่', 'delta',
    'เหตุผล', 'line_user_id', 'สถานะ',
  ];
  sheet.getRange(1, 1, 1, headers.length)
    .setValues([headers])
    .setFontWeight('bold')
    .setBackground('#f1f3f4');
  sheet.setFrozenRows(1);

  // status enum
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['active', 'cancelled'], true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, 8, sheet.getMaxRows() - 1, 1).setDataValidation(rule);

  sheet.autoResizeColumns(1, headers.length);
  Logger.log('Adjustments sheet created');
  return 'created';
}

/**
 * Fix data validation ของ 2 column "ขนาดบรรจุ" + "หน่วยผลผลิต"
 * — ใช้ตอนรัน migrate รุ่นเก่าที่ลืม clear validation
 * — รันใน editor: เลือก fixYieldColumnsValidation → ▶ Run
 * — Idempotent: รันซ้ำได้ ไม่กระทบข้อมูล
 */
function fixYieldColumnsValidation() {
  const sheet = getSheet_('Master_Items');
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const packCol = headers.indexOf('ขนาดบรรจุ') + 1;
  const yUnitCol = headers.indexOf('หน่วยผลผลิต') + 1;
  if (packCol < 1 || yUnitCol < 1) throw new Error('ยังไม่ได้รัน migrateAddYieldColumns');

  sheet.getRange(2, packCol, sheet.getMaxRows() - 1, 1).clearDataValidations();
  sheet.getRange(2, yUnitCol, sheet.getMaxRows() - 1, 1).clearDataValidations();
  Logger.log('cleared validation at col ' + packCol + ' + ' + yUnitCol);
  return 'fixed — cleared validation at col ' + packCol + ' + ' + yUnitCol;
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
