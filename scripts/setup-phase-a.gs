/**
 * Phase A — Foundation setup
 *
 * วิธีรัน:
 * 1. ไป https://script.google.com → New project
 * 2. ตั้งชื่อ "factory-stock setup"
 * 3. ลบ code default ออก paste ไฟล์นี้แทน
 * 4. กด ▶ Run → เลือก function `setupPhaseA`
 * 5. Authorize (Allow) ตามที่ขอ
 * 6. เปิด View → Logs (Ctrl/Cmd+Enter) → copy SHEET_ID + DRIVE_FOLDER_ID
 *
 * รันได้ครั้งเดียวพอ — รันซ้ำจะสร้าง Sheet/Folder ใหม่ทับไม่ได้ (ของเก่ายังอยู่)
 */

function setupPhaseA() {
  const SHEETS = {
    'Master_Items': {
      headers: ['item_id', 'ชื่อ', 'ประเภท', 'หน่วย', 'ราคาต่อหน่วย', 'ขั้นต่ำ', 'สถานะ'],
      data: [
        ['ITM-001', 'น้ำมันโจโจบา',           'สารสกัด',         'ลิตร',  '', 5,   'active'],
        ['ITM-002', 'สารสกัดใบบัวบก',          'สารสกัด',         'กก.',   '', 2,   'active'],
        ['ITM-003', 'กลีเซอรีน',              'วัตถุดิบ',         'กก.',   '', 10,  'active'],
        ['ITM-004', 'น้ำ DI',                'วัตถุดิบ',         'ลิตร',  '', 20,  'active'],
        ['ITM-005', 'ขวดปั๊ม 30ml',           'แพคเกจจิ้ง',       'ชิ้น',  '', 200, 'active'],
        ['ITM-006', 'กล่องกระดาษ S',           'แพคเกจจิ้ง',       'ชิ้น',  '', 100, 'active'],
        ['ITM-007', 'ฉลากสติกเกอร์',          'แพคเกจจิ้ง',       'แพ็ค',  '', 20,  'active'],
        ['ITM-008', 'ถุงมือยาง M',            'วัสดุสิ้นเปลือง',   'กล่อง', '', 10,  'active'],
        ['ITM-009', 'แอลกอฮอล์ทำความสะอาด',     'วัสดุสิ้นเปลือง',   'ลิตร',  '', 5,   'active'],
        ['ITM-010', 'โอริงปั๊ม',              'อะไหล่',          'ชิ้น',  '', 30,  'active'],
      ],
      validations: {
        3: ['วัตถุดิบ', 'สารสกัด', 'แพคเกจจิ้ง', 'วัสดุสิ้นเปลือง', 'อะไหล่'], // ประเภท (col C)
        7: ['active', 'archived'], // สถานะ (col G)
      },
    },
    'Stock_In': {
      headers: ['timestamp', 'item_id', 'จำนวน', 'line_user_id', 'รูปใบส่งของ', 'สถานะ'],
      data: [],
      validations: { 6: ['active', 'cancelled'] }, // สถานะ (col F)
    },
    'Stock_Out': {
      headers: ['timestamp', 'item_id', 'จำนวน', 'batch', 'line_user_id', 'สถานะ'],
      data: [],
      validations: { 6: ['active', 'cancelled'] }, // สถานะ (col F)
    },
    'Users': {
      headers: ['line_user_id', 'ชื่อ', 'role', 'registered_at'],
      data: [
        ['U_OWNER_TBD', 'พี่ปุ้ย',  'เจ้าของ',  new Date()],
        ['U_STAFF_TBD', 'คุณนุ้ย',  'พนักงาน', new Date()],
      ],
      validations: { 3: ['พนักงาน', 'เจ้าของ'] }, // role (col C)
    },
    'Logs': {
      headers: ['timestamp', 'function', 'line_user_id', 'error_message', 'stack'],
      data: [],
    },
  };

  // 1) สร้าง Spreadsheet
  const ss = SpreadsheetApp.create('factory-stock-data');
  ss.setSpreadsheetTimeZone('Asia/Bangkok');

  // 2) สร้างแต่ละ sheet + header + seed + validation
  const sheetNames = Object.keys(SHEETS);
  sheetNames.forEach(function (name, i) {
    let sheet;
    if (i === 0) {
      // ใช้ default Sheet1 → rename
      sheet = ss.getSheets()[0];
      sheet.setName(name);
    } else {
      sheet = ss.insertSheet(name);
    }

    const cfg = SHEETS[name];

    // header
    sheet.getRange(1, 1, 1, cfg.headers.length)
      .setValues([cfg.headers])
      .setFontWeight('bold')
      .setBackground('#f1f3f4');
    sheet.setFrozenRows(1);

    // seed data
    if (cfg.data.length > 0) {
      sheet.getRange(2, 1, cfg.data.length, cfg.headers.length).setValues(cfg.data);
    }

    // data validation (dropdown enum)
    if (cfg.validations) {
      Object.keys(cfg.validations).forEach(function (colStr) {
        const col = parseInt(colStr, 10);
        const values = cfg.validations[col];
        const rule = SpreadsheetApp.newDataValidation()
          .requireValueInList(values, true)
          .setAllowInvalid(false)
          .build();
        sheet.getRange(2, col, sheet.getMaxRows() - 1, 1).setDataValidation(rule);
      });
    }

    // auto-resize
    sheet.autoResizeColumns(1, cfg.headers.length);
  });

  // 3) สร้าง Drive folder + share "Anyone with link" = Viewer
  const folder = DriveApp.createFolder('factory-stock-photos');
  folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  // 4) Log IDs
  const out = [
    '',
    '=========================================',
    '   Phase A setup complete ✅',
    '=========================================',
    'SHEET_ID         : ' + ss.getId(),
    'SHEET_URL        : ' + ss.getUrl(),
    'DRIVE_FOLDER_ID  : ' + folder.getId(),
    'DRIVE_FOLDER_URL : ' + folder.getUrl(),
    '=========================================',
    '',
    'ขั้นต่อไป:',
    '  1) เปิด Sheet ตรวจ tab + header ครบ 5 sheets',
    '  2) แก้ row Users → ใส่ line_user_id จริง (ทำได้ทีหลังตอน Phase C)',
    '  3) ส่ง SHEET_ID + DRIVE_FOLDER_ID ให้ Claude เริ่ม Phase B',
    '',
  ].join('\n');
  Logger.log(out);
  return out;
}
