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

  return items.map(function (it) {
    const inQty = inSums[it.item_id] || 0;
    const outQty = outSums[it.item_id] || 0;
    const balance = inQty - outQty;
    return {
      item_id: it.item_id,
      'ชื่อ': it['ชื่อ'],
      'ประเภท': it['ประเภท'],
      'หน่วย': it['หน่วย'],
      'ขั้นต่ำ': it['ขั้นต่ำ'],
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

// รับเข้า: validate + อัปโหลดรูป → Drive → insert row
function stockIn_(lineUserId, body) {
  const itemId = String(body.item_id || '').trim();
  const qty = Number(body['จำนวน']);
  const photoB64 = String(body.photo_base64 || '');

  if (!itemId) throw new Error('ต้องระบุ item_id');
  if (isNaN(qty) || qty <= 0) throw new Error('จำนวนต้องเป็นตัวเลข > 0');
  findItemRow_(itemId); // ensure exists

  let photoUrl = '';
  if (photoB64) {
    photoUrl = uploadPhoto_(photoB64, itemId);
  }

  const sheet = getSheet_('Stock_In');
  const ts = new Date();
  // header: timestamp, item_id, จำนวน, line_user_id, รูปใบส่งของ, สถานะ
  sheet.appendRow([ts, itemId, qty, lineUserId, photoUrl, 'active']);
  const rowNum = sheet.getLastRow();

  return {
    row: rowNum,
    timestamp: ts.toISOString(),
    item_id: itemId,
    'จำนวน': qty,
    photo_url: photoUrl,
  };
}

// เบิก: ใช้ LockService → check balance → insert → trigger notify ถ้า ≤ min
function stockOut_(lineUserId, body) {
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
    const balanceBefore = (inSums[itemId] || 0) - (outSums[itemId] || 0);
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
  return {
    row: rowNum,
    item_id: itemId,
    'จำนวน': qty,
    balance_after: balanceAfter,
    is_low: balanceAfter <= minStock,
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
