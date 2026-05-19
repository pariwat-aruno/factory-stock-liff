import { api } from '../api.js';
import { isOwner } from '../auth.js';
import { el, toast, fmtNum } from '../utils.js';

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

  res.balance.forEach(item => list.appendChild(renderBalanceRow(item, root)));
}

function renderBalanceRow(item, root) {
  const main = el('div', { class: 'row', style: 'justify-content:space-between;align-items:center;gap:6px;width:100%' },
    el('div', null,
      el('div', { class: 'name' }, item['ชื่อ']),
      el('div', { class: 'meta' }, `${item['ประเภท']} · ขั้นต่ำ ${fmtNum(item['ขั้นต่ำ'])} ${item['หน่วย']}`),
    ),
    el('div', { class: 'qty', style: 'text-align:right;flex:0 0 auto' },
      el('div', { style: 'font-size:18px;font-weight:700' }, `${fmtNum(item.balance)} ${item['หน่วย']}`),
      item.isLow ? el('span', { class: 'badge low' }, 'ใกล้หมด') : el('span', { class: 'badge ok' }, 'พอ'),
    ),
  );

  // ปรับยอด — เฉพาะเจ้าของ
  if (!isOwner()) {
    return el('div', { class: 'item-row ' + (item.isLow ? 'low' : '') }, main);
  }

  const newBalIn = el('input', { type: 'number', step: 'any', placeholder: 'ค่าใหม่', value: item.balance });
  const reasonIn = el('input', { type: 'text', placeholder: 'เหตุผล (เช่น นับสต็อกแล้วต่าง)' });
  const form = el('div', { style: 'display:none;background:#fafafa;padding:10px;border-radius:8px;margin-top:6px' },
    el('div', { class: 'field' }, el('label', null, `ค่าใหม่ (${item['หน่วย']})`), newBalIn),
    el('div', { class: 'field' }, el('label', null, 'เหตุผล'), reasonIn),
    el('div', { class: 'row', style: 'gap:6px' },
      el('button', {
        class: 'btn',
        onClick: async () => {
          try {
            await api.overrideBalance({
              item_id: item.item_id,
              'ค่าใหม่': Number(newBalIn.value),
              'เหตุผล': reasonIn.value.trim(),
            });
            toast(`ปรับยอด ${item['ชื่อ']} ✓`, 'success');
            renderBalance(root);
          } catch (e) { toast(e.message, 'error'); }
        },
      }, 'บันทึก'),
      el('button', {
        class: 'btn secondary',
        onClick: () => { form.style.display = 'none'; },
      }, 'ยกเลิก'),
    ),
  );
  const editBtn = el('button', {
    class: 'btn secondary',
    style: 'width:auto;padding:4px 10px;font-size:12px;align-self:flex-start;margin-top:4px',
    onClick: () => { form.style.display = form.style.display === 'none' ? 'block' : 'none'; },
  }, '✏️ ปรับยอด');

  return el('div', { class: 'item-row ' + (item.isLow ? 'low' : ''), style: 'flex-direction:column;align-items:stretch' },
    main, editBtn, form,
  );
}
