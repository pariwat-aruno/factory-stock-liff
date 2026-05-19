import { api } from '../api.js';
import { el, fmtNum } from '../utils.js';

const CATEGORIES = ['ทั้งหมด', 'วัตถุดิบ', 'สารสกัด', 'แพคเกจจิ้ง', 'วัสดุสิ้นเปลือง', 'อะไหล่', 'สินค้าสำเร็จรูป'];

let currentCategory = 'ทั้งหมด';

export async function renderBalance(root) {
  root.innerHTML = '';

  // category filter chips
  const filterBar = el('div', { class: 'card', style: 'display:flex;gap:6px;flex-wrap:wrap' });
  CATEGORIES.forEach(c => {
    const b = el('button', {
      class: 'btn ' + (c === currentCategory ? '' : 'secondary'),
      style: 'flex:0 0 auto;width:auto;padding:6px 12px;font-size:13px',
      onClick: () => { currentCategory = c; renderBalance(root); },
    }, c);
    filterBar.appendChild(b);
  });
  root.appendChild(filterBar);

  const list = el('div', { class: 'card' });
  list.appendChild(el('div', { class: 'muted center' }, 'กำลังโหลด…'));
  root.appendChild(list);

  const params = currentCategory === 'ทั้งหมด' ? null : currentCategory;
  const res = await api.balance(params);
  list.innerHTML = '';

  if (!res.balance.length) {
    list.appendChild(el('div', { class: 'muted center' }, 'ไม่มีข้อมูล'));
    return;
  }

  res.balance.forEach(item => {
    const row = el('div', { class: 'item-row ' + (item.isLow ? 'low' : '') },
      el('div', null,
        el('div', { class: 'name' }, item['ชื่อ']),
        el('div', { class: 'meta' }, `${item['ประเภท']} · ขั้นต่ำ ${fmtNum(item['ขั้นต่ำ'])} ${item['หน่วย']}`),
      ),
      el('div', { class: 'qty', style: 'text-align:right' },
        el('div', { style: 'font-size:18px;font-weight:700' }, `${fmtNum(item.balance)} ${item['หน่วย']}`),
        item.isLow ? el('span', { class: 'badge low' }, 'ใกล้หมด') : el('span', { class: 'badge ok' }, 'พอ'),
      ),
    );
    list.appendChild(row);
  });
}
