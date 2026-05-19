/**
 * Audit log — บันทึกทุก action (mutation) ในระบบ
 *
 * Pattern:
 *   audit_(user, 'รับเข้า', 'รับเข้า ITM-001 น้ำมันโจโจบา 10 ลิตร', meta, item_id);
 *
 * - user: object จาก requireUser_() / requireOwner_() — มี line_user_id, ชื่อ, role
 * - action: string ภาษาไทย เช่น "รับเข้า", "เบิก", "เพิ่มสินค้า"
 * - รายละเอียด: ข้อความภาษาไทยอ่านง่าย (ดูใน LIFF tab "บันทึก")
 * - meta: object (optional) — raw payload หรือข้อมูลเสริม → JSON.stringify
 * - item_id: string (optional) — FK กับ Master_Items (ถ้า action เกี่ยวกับ item)
 *
 * Idempotent failure: ถ้า Sheet "Audit" ยังไม่ได้สร้าง / write fail → swallow ไม่ block main action
 */
function audit_(user, action, detail, meta, itemId) {
  try {
    const sheet = getSS_().getSheetByName('Audit');
    if (!sheet) return; // ยังไม่ได้รัน createAuditSheet — ข้าม
    sheet.appendRow([
      new Date(),
      (user && user.line_user_id) || '',
      (user && user['ชื่อ']) || '',
      (user && user.role) || '',
      action || '',
      detail || '',
      meta ? JSON.stringify(meta) : '',
      itemId || '',
    ]);
  } catch (e) {
    // log แต่ห้าม throw
    try { logError_('audit_', (user && user.line_user_id) || '', e); } catch (_) {}
  }
}

// list audit logs — เรียงใหม่สุดก่อน
// filter: { days?: 1|7|null (null = ทั้งหมด), limit?: 100 }
function listAuditLogs_(opts) {
  const days = opts && opts.days;
  const limit = (opts && opts.limit) || 200;
  const sheet = getSS_().getSheetByName('Audit');
  if (!sheet) return [];

  const rows = readSheet_('Audit');
  const cutoff = days ? Date.now() - days * 86400000 : null;

  const filtered = rows
    .filter(function (r) {
      if (!cutoff) return true;
      const ts = r.timestamp instanceof Date ? r.timestamp.getTime() : new Date(r.timestamp).getTime();
      return ts >= cutoff;
    })
    .sort(function (a, b) {
      const ta = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime();
      const tb = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime();
      return tb - ta;  // ใหม่สุดก่อน
    })
    .slice(0, limit);

  return filtered.map(function (r) {
    return {
      timestamp: r.timestamp instanceof Date ? r.timestamp.toISOString() : r.timestamp,
      line_user_id: r.line_user_id,
      'ชื่อ': r['ชื่อ'],
      role: r.role,
      action: r.action,
      'รายละเอียด': r['รายละเอียด'],
      item_id: r.item_id || '',
    };
  });
}
