/**
 * ยกเลิกรายการ Stock_In / Stock_Out (soft delete)
 *
 * กฎ:
 *   - เจ้าของ row + ภายใน 5 นาที หลัง timestamp
 *   - หรือ เจ้าของระบบ (role=เจ้าของ) ยกเลิกได้ตลอดเวลา
 *   - ถ้าเป็น Stock_In ที่ถูกใช้ไปแล้ว → ห้าม (อาจทำให้ balance ติดลบ)
 */

const CANCEL_WINDOW_MINUTES = 5;

function cancelTransaction_(currentUser, body) {
  const table = String(body.table || '');
  const row = parseInt(body.row, 10);
  if (['Stock_In', 'Stock_Out'].indexOf(table) < 0) {
    throw new Error('table ต้องเป็น Stock_In หรือ Stock_Out');
  }
  if (!row || row < 2) throw new Error('row ต้องเป็นเลขแถว ≥ 2');

  const sheet = getSheet_(table);
  const lastRow = sheet.getLastRow();
  if (row > lastRow) throw new Error('ไม่พบ row นี้');

  // อ่าน row นั้น
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const values = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
  const rec = {};
  headers.forEach(function (h, i) { rec[h] = values[i]; });

  if (rec['สถานะ'] === 'cancelled') throw new Error('รายการนี้ถูกยกเลิกแล้ว');

  const isOwner = currentUser.role === 'เจ้าของ';
  const isMine = String(rec.line_user_id) === String(currentUser.line_user_id);
  if (!isOwner && !isMine) {
    throw new Error('ยกเลิกได้เฉพาะรายการของตัวเอง');
  }
  if (!isOwner) {
    const ts = rec.timestamp instanceof Date ? rec.timestamp : new Date(rec.timestamp);
    const ageMin = (Date.now() - ts.getTime()) / 60000;
    if (ageMin > CANCEL_WINDOW_MINUTES) {
      throw new Error('เกินเวลา ' + CANCEL_WINDOW_MINUTES + ' นาที — ติดต่อเจ้าของ');
    }
  }

  // กัน Stock_In ที่ถูกใช้ไปแล้ว — เช็คว่ายกเลิกแล้ว balance จะไม่ติดลบ
  if (table === 'Stock_In') {
    const inSums = sumByItem_('Stock_In');
    const outSums = sumByItem_('Stock_Out');
    const adjSums = sumAdjustments_();
    const currentBal = (inSums[rec.item_id] || 0) - (outSums[rec.item_id] || 0) + (adjSums[rec.item_id] || 0);
    const balAfter = currentBal - Number(rec['จำนวน'] || 0);
    if (balAfter < 0) {
      throw new Error('ยกเลิกไม่ได้ — ของถูกเบิกไปแล้ว ยอดจะติดลบ');
    }
  }

  // col index ของ "สถานะ" (1-based)
  const statusCol = headers.indexOf('สถานะ') + 1;
  sheet.getRange(row, statusCol).setValue('cancelled');

  audit_(currentUser, 'ยกเลิกรายการ',
    'ยกเลิก ' + table + ' row ' + row + ' (' + rec.item_id + ' จำนวน ' + rec['จำนวน'] + ')',
    { table: table, row: row, original: { item_id: rec.item_id, 'จำนวน': rec['จำนวน'] } },
    rec.item_id);

  return { table: table, row: row, 'สถานะ': 'cancelled' };
}
