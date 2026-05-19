/**
 * Stock_In / Stock_Out + balance calculation
 * — กฎ: ห้าม cache ยอดคงเหลือ คำนวณ real-time จาก Sheet
 * — ใช้ LockService กัน race condition ตอนเบิก
 */

// คำนวณยอดคงเหลือต่อ item — เฉพาะที่ status=active
// คืน array {item_id, ชื่อ, ประเภท, หน่วย, ขั้นต่ำ, balance, isLow}
function getBalance_(category) {
  const items = listItems_(category); // active items + filter category

  const inSums = sumByItem_('Stock_In');
  const outSums = sumByItem_('Stock_Out');
  const adjSums = sumAdjustments_();

  return items.map(function (it) {
    const inQty = inSums[it.item_id] || 0;
    const outQty = outSums[it.item_id] || 0;
    const adjQty = adjSums[it.item_id] || 0;
    const balance = inQty - outQty + adjQty;
    return {
      item_id: it.item_id,
      'ชื่อ': it['ชื่อ'],
      'ประเภท': it['ประเภท'],
      'หน่วย': it['หน่วย'],
      'ขั้นต่ำ': it['ขั้นต่ำ'],
      'ขนาดบรรจุ': it['ขนาดบรรจุ'] || '',
      'หน่วยผลผลิต': it['หน่วยผลผลิต'] || '',
      balance: balance,
      isLow: balance <= Number(it['ขั้นต่ำ'] || 0),
    };
  });
}

function sumByItem_(sheetName) {
  const rows = readSheet_(sheetName);
  const sums = {};
  rows.forEach(function (r) {
    if (r['สถานะ'] !== 'active') return;
    const id = r.item_id;
    sums[id] = (sums[id] || 0) + Number(r['จำนวน'] || 0);
  });
  return sums;
}

// รวม delta จาก Sheet Adjustments — ใช้ใน getBalance_
// คืน {} ถ้า Sheet ยังไม่ได้สร้าง (Phase 2 ปรับยอด)
function sumAdjustments_() {
  const sheet = getSS_().getSheetByName('Adjustments');
  if (!sheet) return {};
  const rows = readSheet_('Adjustments');
  const sums = {};
  rows.forEach(function (r) {
    if (r['สถานะ'] !== 'active') return;
    const id = r.item_id;
    sums[id] = (sums[id] || 0) + Number(r.delta || 0);
  });
  return sums;
}

// รับเข้า: validate + อัปโหลดรูปหลายรูป → Drive → insert row
// กฎ: ต้องมีรูป ≥ MIN_PHOTOS (ถ่ายใหม่ทุกรูป — บังคับใน frontend)
const MIN_PHOTOS = 4;

function stockIn_(user, body) {
  const lineUserId = user.line_user_id;
  const itemId = String(body.item_id || '').trim();
  const qty = Number(body['จำนวน']);

  // รับได้ทั้ง photos_base64 (array, ใหม่) หรือ photo_base64 (string, backward-compat)
  let photos = Array.isArray(body.photos_base64) ? body.photos_base64
             : (body.photo_base64 ? [body.photo_base64] : []);
  photos = photos.filter(Boolean);

  if (!itemId) throw new Error('ต้องระบุ item_id');
  if (isNaN(qty) || qty <= 0) throw new Error('จำนวนต้องเป็นตัวเลข > 0');
  if (photos.length < MIN_PHOTOS) {
    throw new Error('ต้องแนบรูปอย่างน้อย ' + MIN_PHOTOS + ' รูป (มี ' + photos.length + ')');
  }
  const itemMaster = findItemRow_(itemId);

  // upload ทุกรูป → join URL ด้วย ", " ใส่ใน column เดียว (รูปใบส่งของ)
  const urls = photos.map(function (b64, i) {
    return uploadPhoto_(b64, itemId + '_p' + (i + 1));
  });
  const photosCsv = urls.join(', ');

  const sheet = getSheet_('Stock_In');
  const ts = new Date();
  // header: timestamp, item_id, จำนวน, line_user_id, รูปใบส่งของ, สถานะ
  sheet.appendRow([ts, itemId, qty, lineUserId, photosCsv, 'active']);
  const rowNum = sheet.getLastRow();

  audit_(user, 'รับเข้า',
    'รับเข้า ' + itemId + ' ' + itemMaster['ชื่อ'] + ' ' + qty + ' ' + itemMaster['หน่วย'],
    { row: rowNum, photos: urls.length }, itemId);

  return {
    row: rowNum,
    timestamp: ts.toISOString(),
    item_id: itemId,
    'จำนวน': qty,
    photo_urls: urls,
  };
}

// เบิก: ใช้ LockService → check balance → insert → trigger notify ถ้า ≤ min
function stockOut_(user, body) {
  const lineUserId = user.line_user_id;
  const itemId = String(body.item_id || '').trim();
  const qty = Number(body['จำนวน']);
  const batch = String(body.batch || '').trim();

  if (!itemId) throw new Error('ต้องระบุ item_id');
  if (isNaN(qty) || qty <= 0) throw new Error('จำนวนต้องเป็นตัวเลข > 0');
  if (!batch) throw new Error('ต้องระบุ batch');
  const item = findItemRow_(itemId);

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  let balanceAfter;
  try {
    // คำนวณ balance สดๆ ใน lock
    const inSums = sumByItem_('Stock_In');
    const outSums = sumByItem_('Stock_Out');
    const adjSums = sumAdjustments_();
    const balanceBefore = (inSums[itemId] || 0) - (outSums[itemId] || 0) + (adjSums[itemId] || 0);
    if (balanceBefore < qty) {
      throw new Error('ของไม่พอ ยอดคงเหลือ ' + balanceBefore + ' ' + item['หน่วย']);
    }
    balanceAfter = balanceBefore - qty;

    const sheet = getSheet_('Stock_Out');
    // header: timestamp, item_id, จำนวน, batch, line_user_id, สถานะ
    sheet.appendRow([new Date(), itemId, qty, batch, lineUserId, 'active']);
  } finally {
    lock.releaseLock();
  }

  // alert ถ้า ≤ min (ทำนอก lock ไม่ให้ webhook ช้าทำให้ user รอ)
  const minStock = Number(item['ขั้นต่ำ'] || 0);
  if (balanceAfter <= minStock) {
    try {
      sendLowStockAlert_({
        item_id: itemId,
        'ชื่อ': item['ชื่อ'],
        'หน่วย': item['หน่วย'],
        balance: balanceAfter,
        'ขั้นต่ำ': minStock,
      });
    } catch (notifyErr) {
      logError_('stockOut.notify', lineUserId, notifyErr);
    }
  }

  const rowNum = getSheet_('Stock_Out').getLastRow();
  const yieldInfo = computeYield_(item, qty);

  audit_(user, 'เบิก',
    'เบิก ' + itemId + ' ' + item['ชื่อ'] + ' ' + qty + ' ' + item['หน่วย'] + ' (batch ' + batch + ')',
    { row: rowNum, batch: batch, balance_after: balanceAfter, yield: yieldInfo },
    itemId);

  return {
    row: rowNum,
    item_id: itemId,
    'จำนวน': qty,
    balance_after: balanceAfter,
    is_low: balanceAfter <= minStock,
    yield_qty: yieldInfo.qty,
    yield_unit: yieldInfo.unit,
  };
}

// คำนวณ yield คาดการณ์: floor((qty × 1000) ÷ ขนาดบรรจุ) สมมติ "หน่วย" = kg/L
// เว้นว่าง 2 field ใน Master_Items = ไม่ใช่ bulk → คืน null
function computeYield_(item, qty) {
  const packSize = Number(item['ขนาดบรรจุ']);
  const yieldUnit = String(item['หน่วยผลผลิต'] || '').trim();
  if (!packSize || !yieldUnit || isNaN(packSize) || packSize <= 0) {
    return { qty: null, unit: null };
  }
  return {
    qty: Math.floor((qty * 1000) / packSize),
    unit: yieldUnit,
  };
}

// ปรับยอดคงเหลือโดยเจ้าของ — append row ใน Sheet Adjustments (delta = ค่าใหม่ - ค่าเดิม)
// กฎ: ต้องระบุ "เหตุผล" — บังคับ เพื่อให้ audit trail ตรวจสอบได้
function overrideStockBalance_(user, body) {
  const itemId = String(body.item_id || '').trim();
  const newBalance = Number(body['ค่าใหม่']);
  const reason = String(body['เหตุผล'] || '').trim();

  if (!itemId) throw new Error('ต้องระบุ item_id');
  if (isNaN(newBalance)) throw new Error('ค่าใหม่ต้องเป็นตัวเลข');
  if (!reason) throw new Error('ต้องระบุเหตุผล');

  if (!getSS_().getSheetByName('Adjustments')) {
    throw new Error('ยังไม่มี Sheet Adjustments — รัน createAdjustmentsSheet ใน editor ก่อน');
  }

  const item = findItemRow_(itemId);

  // คำนวณ balance ปัจจุบัน (ใช้ pattern เดียวกับ getBalance_)
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  let delta;
  let currentBal;
  try {
    const inSums = sumByItem_('Stock_In');
    const outSums = sumByItem_('Stock_Out');
    const adjSums = sumAdjustments_();
    currentBal = (inSums[itemId] || 0) - (outSums[itemId] || 0) + (adjSums[itemId] || 0);
    delta = newBalance - currentBal;

    if (delta === 0) throw new Error('ค่าใหม่เท่ากับค่าเดิม ไม่ต้องปรับ');

    // header: timestamp, item_id, ค่าเดิม, ค่าใหม่, delta, เหตุผล, line_user_id, สถานะ
    getSheet_('Adjustments').appendRow([
      new Date(), itemId, currentBal, newBalance, delta,
      reason, user.line_user_id, 'active',
    ]);
  } finally {
    lock.releaseLock();
  }

  audit_(user, 'ปรับยอด',
    'ปรับยอด ' + itemId + ' ' + item['ชื่อ'] + ' ' + currentBal + ' → ' + newBalance +
      ' ' + item['หน่วย'] + ' (delta ' + (delta > 0 ? '+' : '') + delta + ') เหตุผล: ' + reason,
    { item_id: itemId, from: currentBal, to: newBalance, delta: delta, 'เหตุผล': reason },
    itemId);

  return {
    item_id: itemId,
    'ค่าเดิม': currentBal,
    'ค่าใหม่': newBalance,
    delta: delta,
  };
}

// อัปโหลดรูป base64 → Drive → คืน URL
function uploadPhoto_(b64, itemId) {
  // strip data URL prefix ถ้ามี
  let mime = 'image/jpeg';
  let raw = b64;
  const m = b64.match(/^data:([^;]+);base64,(.+)$/);
  if (m) { mime = m[1]; raw = m[2]; }

  const ext = mime === 'image/png' ? 'png' : 'jpg';
  const filename = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyyMMdd-HHmmss')
    + '_' + itemId + '.' + ext;

  const blob = Utilities.newBlob(Utilities.base64Decode(raw), mime, filename);
  const folder = DriveApp.getFolderById(prop_('DRIVE_FOLDER_ID'));
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return file.getUrl();
}
