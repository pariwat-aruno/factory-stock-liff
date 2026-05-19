import { CONFIG } from './config.js';
import { state } from './auth.js';

// GET /exec?action=...&line_user_id=...
async function apiGet(action, params = {}) {
  const qs = new URLSearchParams(Object.assign({ action, line_user_id: state.lineUserId }, params));
  const res = await fetch(`${CONFIG.API_URL}?${qs.toString()}`, { redirect: 'follow' });
  return parseResponse(res);
}

// POST /exec  body={action, line_user_id, ...}
async function apiPost(action, body = {}) {
  const payload = Object.assign({ action, line_user_id: state.lineUserId }, body);
  // ใช้ text/plain เพื่อเลี่ยง CORS preflight (Apps Script parse JSON จาก body ได้อยู่แล้ว)
  const res = await fetch(CONFIG.API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
    redirect: 'follow',
  });
  return parseResponse(res);
}

async function parseResponse(res) {
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); }
  catch { throw new Error('Server returned non-JSON: ' + text.slice(0, 200)); }
  if (!data.ok) throw new Error(data.error || 'unknown error');
  return data;
}

export const api = {
  me:                 ()                => apiGet('me'),
  listItems:          (category)        => apiGet('items', category ? { category } : {}),
  balance:            (category)        => apiGet('balance', category ? { category } : {}),

  stockIn:            (b)               => apiPost('stockIn', b),
  stockOut:           (b)               => apiPost('stockOut', b),
  cancelTransaction:  (table, row)      => apiPost('cancelTransaction', { table, row }),

  createItem:         (b)               => apiPost('createItem', b),
  updateItemPrice:    (b)               => apiPost('updateItemPrice', b),
  updateItemYield:    (b)               => apiPost('updateItemYield', b),
  updateItem:         (b)               => apiPost('updateItem', b),
  archiveItem:        (item_id)         => apiPost('archiveItem', { item_id }),
};
