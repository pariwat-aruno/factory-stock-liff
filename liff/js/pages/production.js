import { api } from '../api.js';
import { isOwner } from '../auth.js';
import { el, toast, confirm, fmtNum } from '../utils.js';

export async function renderProduction(root) {
  root.innerHTML = '';

  // header — วันที่วันนี้ (Asia/Bangkok)
  const today = new Date().toLocaleDateString('th-TH', {
    timeZone: 'Asia/Bangkok',
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  root.appendChild(el('div', { class: 'section-title' }, `📅 ${today}`));

  // ปุ่ม + เพิ่มแผน (เจ้าของเท่านั้น)
  if (isOwner()) {
    const finishedProductsRes = await api.listItems('สินค้าสำเร็จรูป');
    root.appendChild(renderCreateCard(root, finishedProductsRes.items));
  }

  // list แผนวันนี้
  const listCard = el('div', { class: 'card' });
  listCard.appendChild(el('div', { class: 'muted center' }, 'กำลังโหลด…'));
  root.appendChild(listCard);

  const res = await api.productionToday();
  listCard.innerHTML = '';
  if (!res.plans.length) {
    listCard.appendChild(el('div', { class: 'muted center', style: 'padding:20px' },
      isOwner() ? 'ยังไม่มีแผนผลิตวันนี้ — กด "เพิ่มแผน" ด้านบน' : 'ยังไม่มีแผนผลิตวันนี้'
    ));
    return;
  }

  res.plans.forEach(p => listCard.appendChild(renderPlanRow(p, root)));
}

function renderCreateCard(root, finishedProducts) {
  const itemSel = el('select', null,
    el('option', { value: '' }, '— เลือกสินค้าสำเร็จรูป —'),
    ...finishedProducts.map(p => el('option', { value: p.item_id }, `${p['ชื่อ']} (${p['หน่วย']})`))
  );
  const targetIn = el('input', { type: 'number', min: '0', step: 'any', placeholder: '0' });
  const noteIn   = el('input', { type: 'text', placeholder: '(ไม่บังคับ)' });

  const hint = el('div', { class: 'muted', style: 'font-size:12px;margin-top:-6px;margin-bottom:10px' },
    finishedProducts.length === 0
      ? '⚠️ ยังไม่มีสินค้าสำเร็จรูป — ไปที่ admin เพิ่มก่อน (ประเภท: สินค้าสำเร็จรูป)'
      : 'Batch รันเลขอัตโนมัติ (B-YYMM-NNN)'
  );

  const form = el('div', { class: 'card', style: 'display:none;background:#fafafa' },
    el('div', { class: 'field' }, el('label', null, 'สินค้า'), itemSel),
    el('div', { class: 'field' }, el('label', null, 'เป้าหมาย'), targetIn),
    hint,
    el('div', { class: 'field' }, el('label', null, 'หมายเหตุ'), noteIn),
    el('div', { class: 'row', style: 'gap:6px' },
      el('button', {
        class: 'btn',
        onClick: async () => {
          if (!itemSel.value) return toast('เลือกสินค้าก่อน', 'error');
          try {
            await api.createPlan({
              item_id: itemSel.value,
              'เป้า': Number(targetIn.value),
              'หมายเหตุ': noteIn.value.trim(),
            });
            toast('ตั้งเป้าแล้ว ✓', 'success');
            renderProduction(root);
          } catch (e) { toast(e.message, 'error'); }
        },
      }, 'บันทึก'),
      el('button', {
        class: 'btn secondary',
        onClick: () => { form.style.display = 'none'; },
      }, 'ยกเลิก'),
    ),
  );

  const toggle = el('button', {
    class: 'btn',
    onClick: () => { form.style.display = form.style.display === 'none' ? 'block' : 'none'; },
  }, '+ เพิ่มแผนผลิต');

  return el('div', null, toggle, form);
}

function renderPlanRow(p, root) {
  const isDone = p['สถานะ'] === 'done';
  const isCancelled = p['สถานะ'] === 'cancelled';

  let statusBadge;
  if (isCancelled) {
    statusBadge = el('span', { class: 'badge', style: 'background:#ccc;color:#666' }, 'ยกเลิก');
  } else if (isDone) {
    const pct = p.percent ?? 0;
    let color = '#16a34a';
    let label = `✅ ${pct}%`;
    if (pct < 90) { color = '#ea580c'; label = `⚠️ ${pct}%`; }
    if (pct < 70) { color = '#dc2626'; label = `❌ ${pct}%`; }
    statusBadge = el('span', { class: 'badge', style: `background:${color};color:white` }, label);
  } else {
    statusBadge = el('span', { class: 'badge', style: 'background:#0ea5e9;color:white' }, 'วางแผนแล้ว');
  }

  // ผลจริง / ของเสีย row — ถ้า done = แสดงตัวเลข, ไม่งั้น = ปุ่ม "กรอกผล"
  const resultRow = isDone
    ? el('div', { class: 'muted', style: 'font-size:13px' },
        `ผลจริง ${fmtNum(p['ผลจริง'])} / ของเสีย ${fmtNum(p['ของเสีย'])} ${p['หน่วยผลผลิต']}`
      )
    : isCancelled
    ? el('div', { class: 'muted', style: 'font-size:13px;font-style:italic' }, 'แผนถูกยกเลิก')
    : renderResultForm(p, root);

  const actions = !isCancelled && isOwner()
    ? el('button', {
        class: 'btn danger',
        style: 'flex:0 0 auto;width:auto;padding:6px 12px;font-size:12px',
        onClick: async () => {
          if (!confirm(`ยกเลิกแผน ${p.batch} ?`)) return;
          try {
            await api.cancelPlan(p.plan_id);
            toast('ยกเลิกแล้ว', 'success');
            renderProduction(root);
          } catch (e) { toast(e.message, 'error'); }
        },
      }, 'ยกเลิก')
    : null;

  return el('div', { class: 'item-row', style: 'flex-direction:column;align-items:stretch;gap:8px' },
    el('div', { class: 'row', style: 'justify-content:space-between;align-items:center;gap:6px' },
      el('div', null,
        el('div', { class: 'name' }, `🏷 ${p.batch}`),
        el('div', { class: 'meta' }, `${p['สินค้า']} · เป้า ${fmtNum(p['เป้า'])} ${p['หน่วยผลผลิต']}`),
        p['หมายเหตุ'] ? el('div', { class: 'muted', style: 'font-size:12px;margin-top:2px' }, `📝 ${p['หมายเหตุ']}`) : null,
      ),
      el('div', { class: 'row', style: 'flex:0 0 auto;gap:6px;align-items:center' },
        statusBadge,
        actions,
      ),
    ),
    resultRow,
  );
}

function renderResultForm(p, root) {
  const actualIn = el('input', { type: 'number', min: '0', step: 'any', placeholder: 'ผลจริง', style: 'max-width:100px' });
  const wasteIn  = el('input', { type: 'number', min: '0', step: 'any', placeholder: 'ของเสีย', style: 'max-width:100px' });
  const noteIn   = el('input', { type: 'text', placeholder: 'หมายเหตุ (ไม่บังคับ)' });

  const form = el('div', { style: 'display:none;background:#fafafa;padding:12px;border-radius:8px;margin-top:6px' },
    el('div', { class: 'field' }, el('label', null, `ผลจริง (${p['หน่วยผลผลิต']})`), actualIn),
    el('div', { class: 'field' }, el('label', null, `ของเสีย (${p['หน่วยผลผลิต']})`), wasteIn),
    el('div', { class: 'field' }, el('label', null, 'หมายเหตุ'), noteIn),
    el('div', { class: 'row', style: 'gap:6px' },
      el('button', {
        class: 'btn',
        onClick: async () => {
          try {
            await api.updatePlanResult({
              plan_id: p.plan_id,
              'ผลจริง': Number(actualIn.value),
              'ของเสีย': Number(wasteIn.value || 0),
              'หมายเหตุ': noteIn.value.trim(),
            });
            toast(`บันทึกผล ${p.batch} ✓`, 'success');
            renderProduction(root);
          } catch (e) { toast(e.message, 'error'); }
        },
      }, 'บันทึกผล'),
      el('button', {
        class: 'btn secondary',
        onClick: () => { form.style.display = 'none'; },
      }, 'ยกเลิก'),
    ),
  );

  const btn = el('button', {
    class: 'btn secondary',
    style: 'width:auto;padding:6px 16px;font-size:13px;align-self:flex-start',
    onClick: () => { form.style.display = form.style.display === 'none' ? 'block' : 'none'; },
  }, '✍️ กรอกผล');

  return el('div', null, btn, form);
}
