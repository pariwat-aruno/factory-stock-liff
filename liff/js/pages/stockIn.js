import { api } from '../api.js';
import { el, toast, resizeImage, fmtNum } from '../utils.js';

let lastSubmittedRow = null; // {row, item_id, ts} สำหรับปุ่ม "ยกเลิกล่าสุด"

export async function renderStockIn(root) {
  root.innerHTML = '';

  const itemsRes = await api.listItems();
  const items = itemsRes.items;

  const itemSel = el('select', { id: 'in-item' },
    el('option', { value: '' }, '— เลือกสินค้า —'),
    ...items.map(i => el('option', { value: i.item_id }, `${i['ชื่อ']} (${i['ประเภท']})`))
  );
  const qtyIn  = el('input', { id: 'in-qty', type: 'number', min: '0', step: 'any', placeholder: '0' });
  const fileIn = el('input', { id: 'in-photo', type: 'file', accept: 'image/*', capture: 'environment' });
  const preview = el('img', { class: 'preview-img', hidden: true });
  const submit = el('button', { class: 'btn' }, 'บันทึกรับเข้า');
  const undoBox = el('div', null);

  fileIn.addEventListener('change', async () => {
    const f = fileIn.files[0];
    if (!f) { preview.hidden = true; return; }
    preview.src = await resizeImage(f);
    preview.hidden = false;
  });

  submit.addEventListener('click', async () => {
    const item_id = itemSel.value;
    const qty = Number(qtyIn.value);
    if (!item_id) return toast('เลือกสินค้าก่อน', 'error');
    if (!qty || qty <= 0) return toast('จำนวนต้องมากกว่า 0', 'error');

    submit.disabled = true; submit.textContent = 'กำลังบันทึก…';
    try {
      const photo_base64 = preview.hidden ? '' : preview.src;
      const r = await api.stockIn({ item_id, 'จำนวน': qty, photo_base64 });
      lastSubmittedRow = { row: r.row, ts: Date.now(), item_id };
      const item = items.find(i => i.item_id === item_id);
      toast(`บันทึก ${item['ชื่อ']} ${fmtNum(qty)} ${item['หน่วย']} ✓`, 'success');
      itemSel.value = ''; qtyIn.value = ''; fileIn.value = ''; preview.hidden = true;
      renderUndo();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      submit.disabled = false; submit.textContent = 'บันทึกรับเข้า';
    }
  });

  function renderUndo() {
    undoBox.innerHTML = '';
    if (!lastSubmittedRow) return;
    const ageSec = Math.floor((Date.now() - lastSubmittedRow.ts) / 1000);
    const remain = 300 - ageSec;
    if (remain <= 0) { lastSubmittedRow = null; return; }
    undoBox.appendChild(el('div', { class: 'card' },
      el('div', { class: 'muted', style: 'margin-bottom:8px' },
        `ยกเลิกได้อีก ${Math.floor(remain/60)}:${String(remain%60).padStart(2,'0')} นาที`),
      el('button', { class: 'btn secondary',
        onClick: async () => {
          try {
            await api.cancelTransaction('Stock_In', lastSubmittedRow.row);
            toast('ยกเลิกแล้ว', 'success');
            lastSubmittedRow = null; renderUndo();
          } catch (e) { toast(e.message, 'error'); }
        } }, 'ยกเลิกรายการล่าสุด'),
    ));
    setTimeout(renderUndo, 1000);
  }

  root.appendChild(el('div', { class: 'card' },
    el('div', { class: 'field' }, el('label', null, 'สินค้า'), itemSel),
    el('div', { class: 'field' }, el('label', null, 'จำนวน'), qtyIn),
    el('div', { class: 'field' }, el('label', null, 'รูปใบส่งของ (เลือกได้)'), fileIn, preview),
    submit,
  ));
  root.appendChild(undoBox);
  renderUndo();
}
