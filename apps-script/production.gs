/**
 * Production planning + result tracking
 * — เช้า: เจ้าของตั้งเป้า (createPlan)
 * — เย็น: พนักงาน/เจ้าของกรอกผลจริง + ของเสีย (updatePlanResult)
 * — เจ้าของ ยกเลิกแผน (cancelPlan) — soft delete
 *
 * Idempotent: เปลี่ยน "ผลจริง" หลายครั้งได้ แต่ครั้งสุดท้ายชนะ
 */

const PRODUCTION_STATUSES = ['planned', 'done', 'cancelled'];

// list แผนผลิตของวันนี้ (Asia/Bangkok) — เรียงตาม timestamp ascending
function listProductionToday_() {
  const today = todayBkk_();
  const rows = readSheet_('Production');
  return rows
    .filter(function (r) { return formatBkkDate_(r['วันที่']) === today; })
    .sort(function (a, b) {
      const ta = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime();
      const tb = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime();
      return ta - tb;
    })
    .map(function (r) { return shapePlan_(r); });
}

// list แผนตามช่วงวันที่ (สำหรับ analytic ในอนาคต) — caller ส่ง 'YYYY-MM-DD'
function listProductionRange_(fromDate, toDate) {
  const rows = readSheet_('Production');
  return rows
    .filter(function (r) {
      const d = formatBkkDate_(r['วันที่']);
      return d >= fromDate && d <= toDate;
    })
    .map(function (r) { return shapePlan_(r); });
}

function shapePlan_(r) {
  const target = Number(r['เป้า'] || 0);
  const actual = Number(r['ผลจริง'] || 0);
  const waste  = Number(r['ของเสีย'] || 0);
  const isDone = r['สถานะ'] === 'done';
  const pct = (isDone && target > 0) ? Math.round((actual / target) * 100) : null;
  return {
    plan_id: r.plan_id,
    timestamp: r.timestamp instanceof Date ? r.timestamp.toISOString() : r.timestamp,
    'วันที่': formatBkkDate_(r['วันที่']),
    batch: r.batch,
    'สินค้า': r['สินค้า'],
    'เป้า': target,
    'หน่วยผลผลิต': r['หน่วยผลผลิต'],
    'ผลจริง': actual,
    'ของเสีย': waste,
    'สถานะ': r['สถานะ'],
    'หมายเหตุ': r['หมายเหตุ'] || '',
    owner_id: r.owner_id,
    worker_id: r.worker_id || '',
    percent: pct,
    _row: r._row,
  };
}

// สร้างแผนใหม่ (เจ้าของ)
function createPlan_(ownerId, body) {
  const batch = String(body.batch || '').trim();
  const productName = String(body['สินค้า'] || '').trim();
  const target = Number(body['เป้า']);
  const yieldUnit = String(body['หน่วยผลผลิต'] || '').trim();
  const note = String(body['หมายเหตุ'] || '').trim();

  if (!batch) throw new Error('ต้องระบุ batch');
  if (!productName) throw new Error('ต้องระบุชื่อสินค้า');
  if (isNaN(target) || target <= 0) throw new Error('เป้าต้องเป็นตัวเลข > 0');
  if (!yieldUnit) throw new Error('ต้องระบุหน่วยผลผลิต (เช่น ขวด/หลอด)');

  // กัน batch ซ้ำในวันเดียวกัน (เฉพาะ status active = ไม่ใช่ cancelled)
  const today = todayBkk_();
  const existing = readSheet_('Production').filter(function (r) {
    return formatBkkDate_(r['วันที่']) === today
      && String(r.batch).trim() === batch
      && r['สถานะ'] !== 'cancelled';
  });
  if (existing.length > 0) {
    throw new Error('มีแผนสำหรับ batch ' + batch + ' ในวันนี้แล้ว');
  }

  const planId = nextPlanId_();
  const now = new Date();
  const sheet = getSheet_('Production');
  // header: plan_id, timestamp, วันที่, batch, สินค้า, เป้า, หน่วยผลผลิต, ผลจริง, ของเสีย, สถานะ, หมายเหตุ, owner_id, worker_id
  sheet.appendRow([
    planId, now, now, batch, productName,
    target, yieldUnit, 0, 0,
    'planned', note, ownerId, '',
  ]);
  const rowNum = sheet.getLastRow();
  return shapePlan_({
    _row: rowNum,
    plan_id: planId, timestamp: now, 'วันที่': now, batch: batch, 'สินค้า': productName,
    'เป้า': target, 'หน่วยผลผลิต': yieldUnit, 'ผลจริง': 0, 'ของเสีย': 0,
    'สถานะ': 'planned', 'หมายเหตุ': note, owner_id: ownerId, worker_id: '',
  });
}

// กรอกผลผลิตจริง (พนักงาน + เจ้าของ)
function updatePlanResult_(currentUserId, body) {
  const planId = String(body.plan_id || '').trim();
  const actual = Number(body['ผลจริง']);
  const waste = body.hasOwnProperty('ของเสีย') ? Number(body['ของเสีย']) : 0;
  const note = body.hasOwnProperty('หมายเหตุ') ? String(body['หมายเหตุ'] || '').trim() : null;

  if (!planId) throw new Error('ต้องระบุ plan_id');
  if (isNaN(actual) || actual < 0) throw new Error('ผลจริงต้องเป็นตัวเลข ≥ 0');
  if (isNaN(waste) || waste < 0) throw new Error('ของเสียต้องเป็นตัวเลข ≥ 0');

  const found = findPlanRow_(planId);
  if (found['สถานะ'] === 'cancelled') throw new Error('แผนนี้ถูกยกเลิก แก้ไม่ได้');

  const sheet = getSheet_('Production');
  sheet.getRange(found._row, planColIndex_('ผลจริง')).setValue(actual);
  sheet.getRange(found._row, planColIndex_('ของเสีย')).setValue(waste);
  sheet.getRange(found._row, planColIndex_('สถานะ')).setValue('done');
  sheet.getRange(found._row, planColIndex_('worker_id')).setValue(currentUserId);
  if (note !== null) {
    sheet.getRange(found._row, planColIndex_('หมายเหตุ')).setValue(note);
  }

  // อ่านกลับมาเพื่อคำนวณ percent
  const updated = readSheet_('Production').find(function (r) { return String(r.plan_id) === planId; });
  return shapePlan_(updated);
}

// ยกเลิกแผน (เจ้าของ)
function cancelPlan_(body) {
  const planId = String(body.plan_id || '').trim();
  if (!planId) throw new Error('ต้องระบุ plan_id');
  const found = findPlanRow_(planId);
  if (found['สถานะ'] === 'cancelled') throw new Error('แผนนี้ถูกยกเลิกแล้ว');
  getSheet_('Production').getRange(found._row, planColIndex_('สถานะ')).setValue('cancelled');
  return Object.assign({}, shapePlan_(found), { 'สถานะ': 'cancelled' });
}

// ----- helpers -----

function findPlanRow_(planId) {
  const rows = readSheet_('Production');
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i].plan_id) === String(planId)) return rows[i];
  }
  throw new Error('ไม่พบแผน: ' + planId);
}

function planColIndex_(header) {
  const sh = getSheet_('Production');
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  const idx = headers.indexOf(header);
  if (idx < 0) throw new Error('Production missing column: ' + header);
  return idx + 1;
}

function nextPlanId_() {
  const rows = readSheet_('Production');
  let max = 0;
  rows.forEach(function (r) {
    const m = String(r.plan_id || '').match(/^PRD-(\d+)$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  return 'PRD-' + ('0000' + (max + 1)).slice(-4);
}

function todayBkk_() {
  return Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd');
}

function formatBkkDate_(v) {
  if (!v) return '';
  const d = v instanceof Date ? v : new Date(v);
  if (isNaN(d.getTime())) return String(v);
  return Utilities.formatDate(d, 'Asia/Bangkok', 'yyyy-MM-dd');
}
