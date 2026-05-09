/**
 * Utility helpers — sheet access, response builders, logger
 */

// อ่าน Script Property หรือ throw ถ้าไม่ได้ตั้ง
function prop_(key) {
  const v = PropertiesService.getScriptProperties().getProperty(key);
  if (!v) throw new Error('Missing Script Property: ' + key);
  return v;
}

// เปิด Spreadsheet หลัก (โดยใช้ SHEET_ID ใน Script Properties)
function getSS_() {
  return SpreadsheetApp.openById(prop_('SHEET_ID'));
}

function getSheet_(name) {
  const sh = getSS_().getSheetByName(name);
  if (!sh) throw new Error('Sheet not found: ' + name);
  return sh;
}

// อ่าน sheet ทั้งหมดเป็น array of object โดยใช้ header row 1 เป็น key
function readSheet_(name) {
  const sh = getSheet_(name);
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0];
  return values.slice(1).map(function (row, i) {
    const obj = { _row: i + 2 }; // sheet row number (1-based, +1 for header)
    headers.forEach(function (h, j) { obj[h] = row[j]; });
    return obj;
  });
}

// JSON response ทั้ง success และ error คืน HTTP 200 เสมอ (Apps Script Web App limitation)
// frontend อ่าน field `ok` เพื่อแยก
function ok_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(Object.assign({ ok: true }, data || {})))
    .setMimeType(ContentService.MimeType.JSON);
}

function err_(message, extra) {
  return ContentService
    .createTextOutput(JSON.stringify(Object.assign({ ok: false, error: String(message) }, extra || {})))
    .setMimeType(ContentService.MimeType.JSON);
}

// log error ลง Sheet `Logs` — ห้าม throw ซ้อน
function logError_(fn, lineUserId, error) {
  try {
    getSheet_('Logs').appendRow([
      new Date(),
      fn || '',
      lineUserId || '',
      String((error && error.message) || error || ''),
      String((error && error.stack) || ''),
    ]);
  } catch (_) { /* swallow — logging ห้ามทำให้ request พัง */ }
}

// สร้าง item_id แบบ ITM-XXX (running 3 หลัก)
function nextItemId_() {
  const items = readSheet_('Master_Items');
  let max = 0;
  items.forEach(function (it) {
    const m = String(it.item_id || '').match(/^ITM-(\d+)$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  const next = max + 1;
  return 'ITM-' + ('000' + next).slice(-3);
}
