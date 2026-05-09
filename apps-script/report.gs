/**
 * Daily report — n8n เรียกตอน 18:00 Asia/Bangkok
 * — Auth: shared secret (N8N_SECRET) เท่านั้น
 * — Cache 5 นาที (CacheService) — กัน 6-min timeout เวลา item เยอะ
 *
 * Response shape:
 *   { ok, generated_at, low_items[], categories[ { category, items[], total_value? } ] }
 */

const REPORT_CACHE_KEY = 'dailyReport.v1';
const REPORT_CACHE_TTL_SEC = 300; // 5 นาที

function dailyReport_() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get(REPORT_CACHE_KEY);
  if (cached) {
    const obj = JSON.parse(cached);
    obj.from_cache = true;
    return obj;
  }

  const all = getBalance_(); // ทุก item active (เรียงตาม sheet)
  const itemsById = {};
  readSheet_('Master_Items').forEach(function (it) {
    itemsById[it.item_id] = it;
  });

  // group ตาม category
  const grouped = {};
  ITEM_CATEGORIES.forEach(function (c) { grouped[c] = []; });

  all.forEach(function (b) {
    const master = itemsById[b.item_id] || {};
    const price = Number(master['ราคาต่อหน่วย']);
    const hasPrice = !isNaN(price) && master['ราคาต่อหน่วย'] !== '';
    const value = hasPrice ? price * b.balance : null;
    const cat = b['ประเภท'];
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push({
      item_id: b.item_id,
      'ชื่อ': b['ชื่อ'],
      balance: b.balance,
      'หน่วย': b['หน่วย'],
      'ขั้นต่ำ': b['ขั้นต่ำ'],
      isLow: b.isLow,
      'ราคาต่อหน่วย': hasPrice ? price : null,
      'มูลค่า': value,
    });
  });

  const categories = ITEM_CATEGORIES.map(function (c) {
    const items = grouped[c];
    // total_value = null ถ้ามี item ที่ไม่ได้กรอกราคา (per § 7 edge case 11)
    const anyMissing = items.some(function (i) { return i['ราคาต่อหน่วย'] === null; });
    const totalValue = anyMissing ? null
      : items.reduce(function (s, i) { return s + (i['มูลค่า'] || 0); }, 0);
    return { category: c, items: items, total_value: totalValue };
  });

  const lowItems = all.filter(function (b) { return b.isLow; }).map(function (b) {
    return {
      item_id: b.item_id,
      'ชื่อ': b['ชื่อ'],
      'ประเภท': b['ประเภท'],
      balance: b.balance,
      'ขั้นต่ำ': b['ขั้นต่ำ'],
      'หน่วย': b['หน่วย'],
    };
  });

  const result = {
    generated_at: new Date().toISOString(),
    low_items: lowItems,
    categories: categories,
  };

  try {
    cache.put(REPORT_CACHE_KEY, JSON.stringify(result), REPORT_CACHE_TTL_SEC);
  } catch (_) { /* cache เกิน 100KB → ข้าม */ }

  return result;
}
