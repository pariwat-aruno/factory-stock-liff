import { api } from '../api.js';
import { el, toast, fmtNum } from '../utils.js';

let lastSubmittedRow = null;

export async function renderStockOut(root) {
  root.innerHTML = '';

  // โหลด balance พร้อม items เลย — แสดงยอดคงเหลือใน dropdown
  const balRes = await api.balance();
  const items = balRes.balance;

  const itemSel = el('select', { id: 'out-item' },
    el('option', { value: '' }, '— เลือกสินค้า —'),
    ...items.map(i => el('option', { value: i.item_id }, `${i['ชื่อ']} (เหลือ ${fmtNum(i.balance)} ${i['หน่วย']})`))
  );
  const qtyIn   = el('input', { type: 'number', min: '0', step: 'any', placeholder: '0' });
  const batchIn = el('input', { type: 'text', placeholder: 'รหัสสูตร เช่น VRD-2605-001' });
  const submit  = el('button', { class: 'btn' }, 'บันทึกเบิก');
  const undoBox = el('div', null);

  // แสดงยอดคงเหลือของ item ที่เลือก
  const balanceHint = el('div', { class: 'muted', style: 'margin-top:-8px;margin-bottom:14px' });
  itemSel.addEventListener('change', () => {
    const it = items.find(x => x.item_id === itemSel.value);
    balanceHint.textContent = it
      ? `คงเหลือ ${fmtNum(it.balance)} ${it['หน่วย']}` + (it.isLow ? ' ⚠️ ใกล้หมด' : '')
      : '';
  });

  submit.addEventListener('click', async () => {
    const item_id = itemSel.value;
    const qty = Number(qtyIn.value);
    const batch = batchIn.value.trim();
    if (!item_id) return toast('เลือกสินค้าก่อน', 'error');
    if (!qty || qty <= 0) return toast('จำนวนต้องมากกว่า 0', 'error');
    if (!batch) return toast('กรอก batch ก่อน', 'error');

    submit.disabled = true; submit.textContent = 'กำลังบันทึก…';
    try {
      const r = await api.stockOut({ item_id, 'จำนวน': qty, batch });
      lastSubmittedRow = { row: r.row, ts: Date.now() };
      const it = items.find(x => x.item_id === item_id);
      toast(`เบิก ${it['ชื่อ']} ${fmtNum(qty)} ${it['หน่วย']} → เหลือ ${fmtNum(r.balance_after)}`, 'success');
      itemSel.value = ''; qtyIn.value = ''; batchIn.value = ''; balanceHint.textContent = '';
      renderUndo();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      submit.disabled = false; submit.textContent = 'บันทึกเบิก';
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
            await api.cancelTransaction('Stock_Out', lastSubmittedRow.row);
            toast('ยกเลิกแล้ว', 'success');
            lastSubmittedRow = null; renderUndo();
          } catch (e) { toast(e.message, 'error'); }
        } }, 'ยกเลิกรายการล่าสุด'),
    ));
    setTimeout(renderUndo, 1000);
  }

  root.appendChild(el('div', { class: 'card' },
    el('div', { class: 'field' }, el('label', null, 'สินค้า'), itemSel),
    balanceHint,
    el('div', { class: 'field' }, el('label', null, 'จำนวน'), qtyIn),
    el('div', { class: 'field' }, el('label', null, 'Batch / สูตร'), batchIn),
    submit,
  ));
  root.appendChild(undoBox);
  renderUndo();
}
