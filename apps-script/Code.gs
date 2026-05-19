/**
 * Web App router
 * — doGet/doPost dispatch ตาม `action` query/body
 *
 * Convention:
 *   GET  ?action=me&line_user_id=U...
 *   GET  ?action=items&category=สารสกัด&line_user_id=U...
 *   GET  ?action=balance&category=&line_user_id=U...
 *   GET  ?action=productionToday&line_user_id=U...
 *   GET  ?action=dailyReport&secret=...   (n8n เท่านั้น)
 *
 *   POST body JSON:
 *     {action: 'stockIn',  line_user_id, item_id, จำนวน, photo_base64}
 *     {action: 'stockOut', line_user_id, item_id, จำนวน, batch}
 *     {action: 'createItem', line_user_id, ชื่อ, ประเภท, หน่วย, ขั้นต่ำ, ขนาดบรรจุ?, หน่วยผลผลิต?}
 *     {action: 'updateItemPrice', line_user_id, item_id, ราคาต่อหน่วย}
 *     {action: 'updateItemYield', line_user_id, item_id, ขนาดบรรจุ, หน่วยผลผลิต}
 *     {action: 'updateItem',      line_user_id, item_id, <partial fields>}
 *     {action: 'archiveItem', line_user_id, item_id}
 *     {action: 'cancelTransaction', line_user_id, table: 'Stock_In'|'Stock_Out', row: 5}
 *     {action: 'createPlan', line_user_id, batch, สินค้า, เป้า, หน่วยผลผลิต, หมายเหตุ?}
 *     {action: 'updatePlanResult', line_user_id, plan_id, ผลจริง, ของเสีย?, หมายเหตุ?}
 *     {action: 'cancelPlan', line_user_id, plan_id}
 *
 * ทุก response คืน HTTP 200 — frontend อ่าน {ok: bool, error?, ...} จาก body
 */

function doGet(e) {
  return route_('GET', (e && e.parameter) || {}, null);
}

function doPost(e) {
  let body = {};
  try {
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }
  } catch (parseErr) {
    return err_('Invalid JSON body');
  }
  return route_('POST', (e && e.parameter) || {}, body);
}

function route_(method, query, body) {
  const action = (body && body.action) || query.action || '';
  const lineUserId = (body && body.line_user_id) || query.line_user_id || '';
  try {
    switch (method + ' ' + action) {
      case 'GET me':            return handleMe_(lineUserId);
      case 'GET items':         return handleListItems_(lineUserId, query.category);
      case 'GET balance':       return handleBalance_(lineUserId, query.category);
      case 'GET productionToday': return handleProductionToday_(lineUserId);
      case 'GET dailyReport':   return handleDailyReport_(query.secret);

      case 'POST createItem':         return handleCreateItem_(lineUserId, body);
      case 'POST updateItemPrice':    return handleUpdateItemPrice_(lineUserId, body);
      case 'POST updateItemYield':    return handleUpdateItemYield_(lineUserId, body);
      case 'POST updateItem':         return handleUpdateItem_(lineUserId, body);
      case 'POST archiveItem':        return handleArchiveItem_(lineUserId, body);
      case 'POST stockIn':            return handleStockIn_(lineUserId, body);
      case 'POST stockOut':           return handleStockOut_(lineUserId, body);
      case 'POST cancelTransaction':  return handleCancelTransaction_(lineUserId, body);

      case 'POST createPlan':         return handleCreatePlan_(lineUserId, body);
      case 'POST updatePlanResult':   return handleUpdatePlanResult_(lineUserId, body);
      case 'POST cancelPlan':         return handleCancelPlan_(lineUserId, body);

      default:
        return err_('Unknown action: ' + method + ' ' + action);
    }
  } catch (e) {
    logError_(method + ' ' + action, lineUserId, e);
    return err_(e.message || String(e));
  }
}

// ----- Handlers (B4 — minimal: /me only — others = stub) -----

function handleMe_(lineUserId) {
  const user = requireUser_(lineUserId);
  return ok_({ user: user });
}

// ----- B5 items -----
function handleListItems_(lineUserId, category) {
  requireUser_(lineUserId);
  return ok_({ items: listItems_(category) });
}
function handleCreateItem_(lineUserId, body) {
  requireOwner_(lineUserId);
  return ok_({ item: createItem_(body) });
}
function handleUpdateItemPrice_(lineUserId, body) {
  requireOwner_(lineUserId);
  return ok_({ item: updateItemPrice_(body) });
}
function handleUpdateItemYield_(lineUserId, body) {
  requireOwner_(lineUserId);
  return ok_({ item: updateItemYield_(body) });
}
function handleUpdateItem_(lineUserId, body) {
  requireOwner_(lineUserId);
  return ok_({ item: updateItem_(body) });
}
function handleArchiveItem_(lineUserId, body) {
  requireOwner_(lineUserId);
  return ok_({ item: archiveItem_(body) });
}

// ----- B6 stock + balance + cancel -----
function handleBalance_(lineUserId, category) {
  requireUser_(lineUserId);
  return ok_({ balance: getBalance_(category) });
}
function handleStockIn_(lineUserId, body) {
  requireUser_(lineUserId);
  return ok_(stockIn_(lineUserId, body));
}
function handleStockOut_(lineUserId, body) {
  requireUser_(lineUserId);
  return ok_(stockOut_(lineUserId, body));
}
function handleCancelTransaction_(lineUserId, body) {
  const user = requireUser_(lineUserId);
  return ok_(cancelTransaction_(user, body));
}

// ----- Production -----
function handleProductionToday_(lineUserId) {
  requireUser_(lineUserId);
  return ok_({ plans: listProductionToday_() });
}
function handleCreatePlan_(lineUserId, body) {
  const owner = requireOwner_(lineUserId);
  return ok_({ plan: createPlan_(owner.line_user_id, body) });
}
function handleUpdatePlanResult_(lineUserId, body) {
  requireUser_(lineUserId);
  return ok_({ plan: updatePlanResult_(lineUserId, body) });
}
function handleCancelPlan_(lineUserId, body) {
  requireOwner_(lineUserId);
  return ok_({ plan: cancelPlan_(body) });
}

// ----- B7 dailyReport -----
function handleDailyReport_(secret) {
  requireN8nSecret_(secret);
  return ok_(dailyReport_());
}
