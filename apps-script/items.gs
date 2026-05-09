/**
 * Master_Items CRUD
 * — list (ทุกคน) / create / updatePrice / archive (เจ้าของเท่านั้น)
 */

const ITEM_CATEGORIES = ['วัตถุดิบ', 'สารสกัด', 'แพคเกจจิ้ง', 'วัสดุสิ้นเปลือง', 'อะไหล่'];

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
  // header: item_id, ชื่อ, ประเภท, หน่วย, ราคาต่อหน่วย, ขั้นต่ำ, สถานะ
  sheet.appendRow([itemId, name, category, unit, '', minStock, 'active']);

  return {
    item_id: itemId,
    'ชื่อ': name,
    'ประเภท': category,
    'หน่วย': unit,
    'ราคาต่อหน่วย': '',
    'ขั้นต่ำ': minStock,
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
  // col 5 = ราคาต่อหน่วย (1-based)
  getSheet_('Master_Items').getRange(found._row, 5).setValue(price);
  return Object.assign({}, found, { 'ราคาต่อหน่วย': price });
}

// archive (soft delete) — เจ้าของ
function archiveItem_(body) {
  const itemId = String(body.item_id || '').trim();
  if (!itemId) throw new Error('ต้องระบุ item_id');

  const found = findItemRow_(itemId);
  if (found['สถานะ'] === 'archived') throw new Error('สินค้านี้ถูก archive แล้ว');
  // col 7 = สถานะ
  getSheet_('Master_Items').getRange(found._row, 7).setValue('archived');
  return Object.assign({}, found, { 'สถานะ': 'archived' });
}

// helper — หา row ของ item, throw ถ้าไม่เจอ
function findItemRow_(itemId) {
  const items = readSheet_('Master_Items');
  for (let i = 0; i < items.length; i++) {
    if (String(items[i].item_id) === String(itemId)) return items[i];
  }
  throw new Error('ไม่พบสินค้า: ' + itemId);
}
