import { api } from '../api.js';
import { el, toast, confirm, fmtNum } from '../utils.js';

const CATEGORIES = ['วัตถุดิบ', 'สารสกัด', 'แพคเกจจิ้ง', 'วัสดุสิ้นเปลือง', 'อะไหล่'];

export async function renderAdmin(root) {
  root.innerHTML = '';

  // ========== ส่วนที่ 1: เพิ่มสินค้าใหม่ ==========
  root.appendChild(el('div', { class: 'section-title' }, 'เพิ่มสินค้าใหม่'));

  const nameIn = el('input', { type: 'text', placeholder: 'เช่น น้ำมันโจโจบา' });
  const catSel = el('select', null, ...CATEGORIES.map(c => el('option', { value: c }, c)));
  const unitIn = el('input', { type: 'text', placeholder: 'กก. / ลิตร / ชิ้น' });
  const minIn  = el('input', { type: 'number', min: '0', step: 'any', placeholder: '0' });
  const addBtn = el('button', { class: 'btn' }, 'เพิ่มสินค้า');

  addBtn.addEventListener('click', async () => {
    const body = {
      'ชื่อ': nameIn.value.trim(),
      'ประเภท': catSel.value,
      'หน่วย': unitIn.value.trim(),
      'ขั้นต่ำ': Number(minIn.value),
    };
    addBtn.disabled = true;
    try {
      const r = await api.createItem(body);
      toast(`เพิ่ม ${r.item.item_id} ${r.item['ชื่อ']} ✓`, 'success');
      nameIn.value = ''; unitIn.value = ''; minIn.value = '';
      renderAdmin(root); // reload
    } catch (e) { toast(e.message, 'error'); }
    finally { addBtn.disabled = false; }
  });

  root.appendChild(el('div', { class: 'card' },
    el('div', { class: 'field' }, el('label', null, 'ชื่อ'),    nameIn),
    el('div', { class: 'field' }, el('label', null, 'ประเภท'),  catSel),
    el('div', { class: 'field' }, el('label', null, 'หน่วย'),   unitIn),
    el('div', { class: 'field' }, el('label', null, 'ขั้นต่ำ'), minIn),
    addBtn,
  ));

  // ========== ส่วนที่ 2: รายการสินค้า + ราคา + archive ==========
  root.appendChild(el('div', { class: 'section-title' }, 'จัดการสินค้า + ราคา'));

  const listCard = el('div', { class: 'card' });
  listCard.appendChild(el('div', { class: 'muted center' }, 'กำลังโหลด…'));
  root.appendChild(listCard);

  const itemsRes = await api.listItems();
  listCard.innerHTML = '';

  itemsRes.items.forEach(it => {
    const priceIn = el('input', {
      type: 'number', min: '0', step: 'any',
      value: it['ราคาต่อหน่วย'] === '' ? '' : it['ราคาต่อหน่วย'],
      style: 'max-width:100px;text-align:right',
    });
    const saveBtn = el('button', {
      class: 'btn secondary',
      style: 'flex:0 0 auto;width:auto;padding:8px 14px;font-size:13px',
      onClick: async () => {
        try {
          await api.updateItemPrice({ item_id: it.item_id, 'ราคาต่อหน่วย': Number(priceIn.value) });
          toast(`บันทึกราคา ${it['ชื่อ']} ✓`, 'success');
        } catch (e) { toast(e.message, 'error'); }
      },
    }, 'บันทึก');
    const archBtn = el('button', {
      class: 'btn danger',
      style: 'flex:0 0 auto;width:auto;padding:8px 14px;font-size:13px',
      onClick: async () => {
        if (!confirm(`Archive "${it['ชื่อ']}" ?`)) return;
        try {
          await api.archiveItem(it.item_id);
          toast('archive แล้ว', 'success');
          renderAdmin(root);
        } catch (e) { toast(e.message, 'error'); }
      },
    }, 'archive');

    listCard.appendChild(el('div', { class: 'item-row' },
      el('div', null,
        el('div', { class: 'name' }, `${it.item_id} ${it['ชื่อ']}`),
        el('div', { class: 'meta' }, `${it['ประเภท']} · ${it['หน่วย']} · ขั้นต่ำ ${fmtNum(it['ขั้นต่ำ'])}`),
      ),
      el('div', { class: 'row', style: 'flex:0 0 auto;gap:6px' }, priceIn, saveBtn, archBtn),
    ));
  });
}
