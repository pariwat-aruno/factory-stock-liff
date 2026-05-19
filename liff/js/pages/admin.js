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
  const packIn = el('input', { type: 'number', min: '0', step: 'any', placeholder: 'เช่น 30 (เว้นว่างถ้าไม่ใช่ bulk)' });
  const yUnitIn = el('input', { type: 'text', placeholder: 'เช่น ขวด / หลอด (เว้นว่างได้)' });
  const addBtn = el('button', { class: 'btn' }, 'เพิ่มสินค้า');

  addBtn.addEventListener('click', async () => {
    const body = {
      'ชื่อ': nameIn.value.trim(),
      'ประเภท': catSel.value,
      'หน่วย': unitIn.value.trim(),
      'ขั้นต่ำ': Number(minIn.value),
      'ขนาดบรรจุ': packIn.value.trim() === '' ? '' : Number(packIn.value),
      'หน่วยผลผลิต': yUnitIn.value.trim(),
    };
    addBtn.disabled = true;
    try {
      const r = await api.createItem(body);
      toast(`เพิ่ม ${r.item.item_id} ${r.item['ชื่อ']} ✓`, 'success');
      nameIn.value = ''; unitIn.value = ''; minIn.value = '';
      packIn.value = ''; yUnitIn.value = '';
      renderAdmin(root); // reload
    } catch (e) { toast(e.message, 'error'); }
    finally { addBtn.disabled = false; }
  });

  root.appendChild(el('div', { class: 'card' },
    el('div', { class: 'field' }, el('label', null, 'ชื่อ'),    nameIn),
    el('div', { class: 'field' }, el('label', null, 'ประเภท'),  catSel),
    el('div', { class: 'field' }, el('label', null, 'หน่วย'),   unitIn),
    el('div', { class: 'field' }, el('label', null, 'ขั้นต่ำ'), minIn),
    el('div', { class: 'section-subtitle muted', style: 'margin-top:6px;font-size:12px' }, 'สำหรับ bulk material ที่จะใส่ภาชนะ (optional):'),
    el('div', { class: 'field' }, el('label', null, 'ขนาดบรรจุ (g หรือ ml)'), packIn),
    el('div', { class: 'field' }, el('label', null, 'หน่วยผลผลิต'), yUnitIn),
    addBtn,
  ));

  // ========== ส่วนที่ 2: รายการสินค้า + ราคา + archive ==========
  root.appendChild(el('div', { class: 'section-title' }, 'จัดการสินค้า + ราคา'));

  const listCard = el('div', { class: 'card' });
  listCard.appendChild(el('div', { class: 'muted center' }, 'กำลังโหลด…'));
  root.appendChild(listCard);

  const itemsRes = await api.listItems();
  listCard.innerHTML = '';

  itemsRes.items.forEach(it => listCard.appendChild(renderItemRow(it, root)));
}

// 1 row + form แก้ไข (ซ่อนไว้ก่อน toggle ด้วยปุ่ม "แก้ไข")
function renderItemRow(it, root) {
  const priceMeta = it['ราคาต่อหน่วย'] !== '' && it['ราคาต่อหน่วย'] != null
    ? ` · ${fmtNum(it['ราคาต่อหน่วย'])} บาท/${it['หน่วย']}`
    : '';
  const yieldMeta = it['ขนาดบรรจุ'] && it['หน่วยผลผลิต']
    ? ` · ${it['ขนาดบรรจุ']}g/${it['หน่วยผลผลิต']}`
    : '';

  // form fields (สร้างไว้ก่อน toggle)
  const nameIn  = el('input', { type: 'text', value: it['ชื่อ'] || '' });
  const catSel  = el('select', null, ...CATEGORIES.map(c => el('option', { value: c }, c)));
  catSel.value = it['ประเภท'] || CATEGORIES[0];
  const unitIn  = el('input', { type: 'text', value: it['หน่วย'] || '' });
  const minIn   = el('input', { type: 'number', min: '0', step: 'any', value: it['ขั้นต่ำ'] ?? '' });
  const priceIn = el('input', { type: 'number', min: '0', step: 'any', value: it['ราคาต่อหน่วย'] === '' ? '' : it['ราคาต่อหน่วย'] });
  const packIn  = el('input', { type: 'number', min: '0', step: 'any', value: it['ขนาดบรรจุ'] === '' || it['ขนาดบรรจุ'] == null ? '' : it['ขนาดบรรจุ'], placeholder: 'เว้นว่างถ้าไม่ใช่ bulk' });
  const yUnitIn = el('input', { type: 'text', value: it['หน่วยผลผลิต'] || '', placeholder: 'ขวด / หลอด (คู่กับขนาดบรรจุ)' });

  const editForm = el('div', { class: 'card', style: 'display:none;margin-top:6px;background:#fafafa' },
    el('div', { class: 'field' }, el('label', null, 'ชื่อ'), nameIn),
    el('div', { class: 'field' }, el('label', null, 'ประเภท'), catSel),
    el('div', { class: 'field' }, el('label', null, 'หน่วย'), unitIn),
    el('div', { class: 'field' }, el('label', null, 'ขั้นต่ำ'), minIn),
    el('div', { class: 'field' }, el('label', null, 'ราคาต่อหน่วย'), priceIn),
    el('div', { class: 'field' }, el('label', null, 'ขนาดบรรจุ (g/ml)'), packIn),
    el('div', { class: 'field' }, el('label', null, 'หน่วยผลผลิต'), yUnitIn),
    el('div', { class: 'row', style: 'gap:6px' },
      el('button', {
        class: 'btn',
        onClick: async () => {
          const body = {
            item_id: it.item_id,
            'ชื่อ': nameIn.value.trim(),
            'ประเภท': catSel.value,
            'หน่วย': unitIn.value.trim(),
            'ขั้นต่ำ': Number(minIn.value),
            'ราคาต่อหน่วย': priceIn.value === '' ? '' : Number(priceIn.value),
            'ขนาดบรรจุ': packIn.value.trim() === '' ? '' : Number(packIn.value),
            'หน่วยผลผลิต': yUnitIn.value.trim(),
          };
          try {
            await api.updateItem(body);
            toast(`บันทึก ${body['ชื่อ']} ✓`, 'success');
            renderAdmin(root);
          } catch (e) { toast(e.message, 'error'); }
        },
      }, 'บันทึก'),
      el('button', {
        class: 'btn secondary',
        onClick: () => { editForm.style.display = 'none'; },
      }, 'ยกเลิก'),
    ),
  );

  const editBtn = el('button', {
    class: 'btn secondary',
    style: 'flex:0 0 auto;width:auto;padding:8px 14px;font-size:13px',
    onClick: () => {
      editForm.style.display = editForm.style.display === 'none' ? 'block' : 'none';
    },
  }, 'แก้ไข');
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

  return el('div', { class: 'item-row', style: 'flex-direction:column;align-items:stretch;gap:0' },
    el('div', { class: 'row', style: 'justify-content:space-between;align-items:center;gap:6px' },
      el('div', null,
        el('div', { class: 'name' }, `${it.item_id} ${it['ชื่อ']}`),
        el('div', { class: 'meta' }, `${it['ประเภท']} · ${it['หน่วย']} · ขั้นต่ำ ${fmtNum(it['ขั้นต่ำ'])}${priceMeta}${yieldMeta}`),
      ),
      el('div', { class: 'row', style: 'flex:0 0 auto;gap:6px' }, editBtn, archBtn),
    ),
    editForm,
  );
}
