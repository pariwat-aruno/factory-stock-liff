/**
 * Master_Items CRUD
 * — list (ทุกคน) / create / updatePrice / archive (เจ้าของเท่านั้น)
 */

const ITEM_CATEGORIES = ['วัตถุดิบ', 'สารสกัด', 'แพคเกจจิ้ง', 'วัสดุสิ้นเปลือง', 'อะไหล่', 'สินค้าสำเร็จรูป'];

// คืน items ทั้งหมดที่ไม่ archived (filter ตาม category ได้)
function listItems_(category) {
  const items = readSheet_('Master_Items');
  return items.filter(function (it) {
    if (it['สถานะ'] !== 'active') return false;
    if (category && it['ประเภท'] !== category) return false;
    return true;
  });
}

// สร้าง item ใหม่ (เจ้าของ)
function createItem_(body) {
  const name = String(body['ชื่อ'] || '').trim();
  const category = String(body['ประเภท'] || '').trim();
  const unit = String(body['หน่วย'] || '').trim();
  const minStock = Number(body['ขั้นต่ำ']);

  // optional — สำหรับ bulk material ที่จะใส่ภาชนะ
  const packSizeRaw = body['ขนาดบรรจุ'];
  const yieldUnit = String(body['หน่วยผลผลิต'] || '').trim();
  let packSize = '';
  if (packSizeRaw !== '' && packSizeRaw !== undefined && packSizeRaw !== null) {
    packSize = Number(packSizeRaw);
    if (isNaN(packSize) || packSize <= 0) throw new Error('ขนาดบรรจุต้องเป็นตัวเลข > 0');
  }
  if ((packSize !== '' && !yieldUnit) || (!packSize && yieldUnit)) {
    throw new Error('ต้องกรอก "ขนาดบรรจุ" และ "หน่วยผลผลิต" คู่กัน (หรือเว้นว่างทั้งคู่)');
  }

  if (!name) throw new Error('ต้องกรอกชื่อสินค้า');
  if (ITEM_CATEGORIES.indexOf(category) < 0) {
    throw new Error('ประเภทไม่ถูกต้อง — ต้องเป็น 1 ใน: ' + ITEM_CATEGORIES.join(' / '));
  }
  if (!unit) throw new Error('ต้องกรอกหน่วย');
  if (isNaN(minStock) || minStock < 0) throw new Error('ขั้นต่ำต้องเป็นตัวเลข ≥ 0');

  // กันชื่อซ้ำ
  const existing = readSheet_('Master_Items');
  const dup = existing.some(function (it) { return String(it['ชื่อ']).trim() === name; });
  if (dup) throw new Error('มีสินค้าชื่อนี้อยู่แล้ว: ' + name);

  const itemId = nextItemId_();
  const sheet = getSheet_('Master_Items');
  // header: item_id, ชื่อ, ประเภท, หน่วย, ราคาต่อหน่วย, ขั้นต่ำ, ขนาดบรรจุ, หน่วยผลผลิต, สถานะ
  sheet.appendRow([itemId, name, category, unit, '', minStock, packSize, yieldUnit, 'active']);

  return {
    item_id: itemId,
    'ชื่อ': name,
    'ประเภท': category,
    'หน่วย': unit,
    'ราคาต่อหน่วย': '',
    'ขั้นต่ำ': minStock,
    'ขนาดบรรจุ': packSize,
    'หน่วยผลผลิต': yieldUnit,
    'สถานะ': 'active',
  };
}

// อัปเดตราคา (เจ้าของ)
function updateItemPrice_(body) {
  const itemId = String(body.item_id || '').trim();
  const price = Number(body['ราคาต่อหน่วย']);
  if (!itemId) throw new Error('ต้องระบุ item_id');
  if (isNaN(price) || price < 0) throw new Error('ราคาต่อหน่วยต้องเป็นตัวเลข ≥ 0');

  const found = findItemRow_(itemId);
  const col = itemColIndex_('ราคาต่อหน่วย');
  getSheet_('Master_Items').getRange(found._row, col).setValue(price);
  return Object.assign({}, found, { 'ราคาต่อหน่วย': price });
}

// อัปเดต ขนาดบรรจุ + หน่วยผลผลิต (เจ้าของ)
// ส่งค่าว่าง 2 field พร้อมกัน = ล้าง (สินค้านี้ไม่ใช่ bulk แล้ว)
function updateItemYield_(body) {
  const itemId = String(body.item_id || '').trim();
  if (!itemId) throw new Error('ต้องระบุ item_id');

  const packSizeRaw = body['ขนาดบรรจุ'];
  const yieldUnit = String(body['หน่วยผลผลิต'] || '').trim();
  let packSize = '';
  if (packSizeRaw !== '' && packSizeRaw !== undefined && packSizeRaw !== null) {
    packSize = Number(packSizeRaw);
    if (isNaN(packSize) || packSize <= 0) throw new Error('ขนาดบรรจุต้องเป็นตัวเลข > 0');
  }
  if ((packSize !== '' && !yieldUnit) || (packSize === '' && yieldUnit)) {
    throw new Error('ต้องกรอก "ขนาดบรรจุ" และ "หน่วยผลผลิต" คู่กัน (หรือเว้นว่างทั้งคู่)');
  }

  const found = findItemRow_(itemId);
  const sheet = getSheet_('Master_Items');
  sheet.getRange(found._row, itemColIndex_('ขนาดบรรจุ')).setValue(packSize);
  sheet.getRange(found._row, itemColIndex_('หน่วยผลผลิต')).setValue(yieldUnit);
  return Object.assign({}, found, { 'ขนาดบรรจุ': packSize, 'หน่วยผลผลิต': yieldUnit });
}

// แก้รายละเอียดสินค้าครบทุก field (เจ้าของ)
// รับ partial body — field ที่ไม่ส่งมา = ไม่แก้
// "ขนาดบรรจุ" + "หน่วยผลผลิต" ต้องส่งคู่กันเสมอ
function updateItem_(body) {
  const itemId = String(body.item_id || '').trim();
  if (!itemId) throw new Error('ต้องระบุ item_id');

  const found = findItemRow_(itemId);
  const updates = {};

  if (Object.prototype.hasOwnProperty.call(body, 'ชื่อ')) {
    const name = String(body['ชื่อ'] || '').trim();
    if (!name) throw new Error('ชื่อสินค้าต้องไม่ว่าง');
    const all = readSheet_('Master_Items');
    const dup = all.some(function (it) {
      return it._row !== found._row && String(it['ชื่อ']).trim() === name;
    });
    if (dup) throw new Error('มีสินค้าชื่อนี้อยู่แล้ว: ' + name);
    updates['ชื่อ'] = name;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'ประเภท')) {
    const cat = String(body['ประเภท'] || '').trim();
    if (ITEM_CATEGORIES.indexOf(cat) < 0) {
      throw new Error('ประเภทไม่ถูกต้อง — ต้องเป็น 1 ใน: ' + ITEM_CATEGORIES.join(' / '));
    }
    updates['ประเภท'] = cat;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'หน่วย')) {
    const unit = String(body['หน่วย'] || '').trim();
    if (!unit) throw new Error('หน่วยต้องไม่ว่าง');
    updates['หน่วย'] = unit;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'ขั้นต่ำ')) {
    const v = Number(body['ขั้นต่ำ']);
    if (isNaN(v) || v < 0) throw new Error('ขั้นต่ำต้องเป็นตัวเลข ≥ 0');
    updates['ขั้นต่ำ'] = v;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'ราคาต่อหน่วย')) {
    const raw = body['ราคาต่อหน่วย'];
    if (raw === '' || raw === null || raw === undefined) {
      updates['ราคาต่อหน่วย'] = '';
    } else {
      const v = Number(raw);
      if (isNaN(v) || v < 0) throw new Error('ราคาต่อหน่วยต้องเป็นตัวเลข ≥ 0');
      updates['ราคาต่อหน่วย'] = v;
    }
  }

  const hasPackKey = Object.prototype.hasOwnProperty.call(body, 'ขนาดบรรจุ');
  const hasYieldKey = Object.prototype.hasOwnProperty.call(body, 'หน่วยผลผลิต');
  if (hasPackKey !== hasYieldKey) {
    throw new Error('ต้องส่ง "ขนาดบรรจุ" และ "หน่วยผลผลิต" คู่กัน');
  }
  if (hasPackKey) {
    const raw = body['ขนาดบรรจุ'];
    const yUnit = String(body['หน่วยผลผลิต'] || '').trim();
    let packSize = '';
    if (raw !== '' && raw !== null && raw !== undefined) {
      packSize = Number(raw);
      if (isNaN(packSize) || packSize <= 0) throw new Error('ขนาดบรรจุต้องเป็นตัวเลข > 0');
    }
    if ((packSize !== '' && !yUnit) || (packSize === '' && yUnit)) {
      throw new Error('ต้องกรอก "ขนาดบรรจุ" และ "หน่วยผลผลิต" คู่กัน (หรือเว้นว่างทั้งคู่)');
    }
    updates['ขนาดบรรจุ'] = packSize;
    updates['หน่วยผลผลิต'] = yUnit;
  }

  if (Object.keys(updates).length === 0) {
    throw new Error('ไม่มี field ที่จะแก้');
  }

  const sheet = getSheet_('Master_Items');
  Object.keys(updates).forEach(function (col) {
    sheet.getRange(found._row, itemColIndex_(col)).setValue(updates[col]);
  });
  return Object.assign({}, found, updates);
}

// archive (soft delete) — เจ้าของ
function archiveItem_(body) {
  const itemId = String(body.item_id || '').trim();
  if (!itemId) throw new Error('ต้องระบุ item_id');

  const found = findItemRow_(itemId);
  if (found['สถานะ'] === 'archived') throw new Error('สินค้านี้ถูก archive แล้ว');
  const col = itemColIndex_('สถานะ');
  getSheet_('Master_Items').getRange(found._row, col).setValue('archived');
  return Object.assign({}, found, { 'สถานะ': 'archived' });
}

// lookup column index (1-based) จาก header — ห้าม hardcode col number
// เพื่อรองรับการเพิ่ม column ในอนาคตโดยไม่กระทบโค้ดเดิม
function itemColIndex_(header) {
  const sh = getSheet_('Master_Items');
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  const idx = headers.indexOf(header);
  if (idx < 0) throw new Error('Master_Items missing column: ' + header);
  return idx + 1;
}

// helper — หา row ของ item, throw ถ้าไม่เจอ
function findItemRow_(itemId) {
  const items = readSheet_('Master_Items');
  for (let i = 0; i < items.length; i++) {
    if (String(items[i].item_id) === String(itemId)) return items[i];
  }
  throw new Error('ไม่พบสินค้า: ' + itemId);
}
