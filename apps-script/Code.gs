/**
 * Web App router
 * — doGet/doPost dispatch ตาม `action` query/body
 *
 * Convention:
 *   GET  ?action=me&line_user_id=U...
 *   GET  ?action=items&category=สารสกัด&line_user_id=U...
 *   GET  ?action=balance&category=&line_user_id=U...
 *   GET  ?action=dailyReport&secret=...   (n8n เท่านั้น)
 *
 *   POST body JSON:
 *     {action: 'stockIn',  line_user_id, item_id, จำนวน, photo_base64}
 *     {action: 'stockOut', line_user_id, item_id, จำนวน, batch}
 *     {action: 'createItem', line_user_id, ชื่อ, ประเภท, หน่วย, ขั้นต่ำ}
 *     {action: 'updateItemPrice', line_user_id, item_id, ราคาต่อหน่วย}
 *     {action: 'archiveItem', line_user_id, item_id}
 *     {action: 'cancelTransaction', line_user_id, table: 'Stock_In'|'Stock_Out', row: 5}
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
      case 'GET dailyReport':   return handleDailyReport_(query.secret);

      case 'POST createItem':         return handleCreateItem_(lineUserId, body);
      case 'POST updateItemPrice':    return handleUpdateItemPrice_(lineUserId, body);
      case 'POST archiveItem':        return handleArchiveItem_(lineUserId, body);
      case 'POST stockIn':            return handleStockIn_(lineUserId, body);
      case 'POST stockOut':           return handleStockOut_(lineUserId, body);
      case 'POST cancelTransaction':  return handleCancelTransaction_(lineUserId, body);

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
function handleArchiveItem_(lineUserId, body) {
  requireOwner_(lineUserId);
  return ok_({ item: archiveItem_(body) });
}

// stubs (B6–B8)
function handleBalance_(lineUserId, category)   { requireUser_(lineUserId); return err_('not implemented'); }
function handleDailyReport_(secret)             { requireN8nSecret_(secret); return err_('not implemented'); }
function handleStockIn_(lineUserId, body)       { requireUser_(lineUserId); return err_('not implemented'); }
function handleStockOut_(lineUserId, body)      { requireUser_(lineUserId); return err_('not implemented'); }
function handleCancelTransaction_(lineUserId, body) { requireUser_(lineUserId); return err_('not implemented'); }
