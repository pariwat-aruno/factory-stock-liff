import { api } from '../api.js';
import { el, toast, resizeImage, fmtNum } from '../utils.js';

const MIN_PHOTOS = 4;

let lastSubmittedRow = null; // {row, item_id, ts} สำหรับปุ่ม "ยกเลิกล่าสุด"

export async function renderStockIn(root) {
  root.innerHTML = '';

  const itemsRes = await api.listItems();
  const items = itemsRes.items;

  const itemSel = el('select', { id: 'in-item' },
    el('option', { value: '' }, '— เลือกสินค้า —'),
    ...items.map(i => el('option', { value: i.item_id }, `${i['ชื่อ']} (${i['ประเภท']})`))
  );
  const qtyIn = el('input', { id: 'in-qty', type: 'number', min: '0', step: 'any', placeholder: '0' });

  // photo state — array of dataURL (resized JPEG base64)
  const photos = [];

  // grid preview ของรูปที่ถ่ายแล้ว + ปุ่มลบรายตัว
  const photoGrid = el('div', { style: 'display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:8px' });
  const counter = el('div', { class: 'muted', style: 'font-size:13px;margin-top:8px' });

  // hidden input — สร้างใหม่ทุกครั้งที่กด "เพิ่มรูป" → trigger camera fresh
  const addBtn = el('button', { class: 'btn secondary', type: 'button' }, '📷 ถ่ายรูป');

  function renderPhotos() {
    photoGrid.innerHTML = '';
    photos.forEach((src, idx) => {
      const wrap = el('div', { style: 'position:relative' });
      wrap.appendChild(el('img', {
        src,
        style: 'width:100%;border-radius:8px;border:1px solid var(--border);display:block',
      }));
      wrap.appendChild(el('button', {
        type: 'button',
        style: 'position:absolute;top:4px;right:4px;background:rgba(0,0,0,.7);color:#fff;border:none;border-radius:50%;width:28px;height:28px;font-size:14px;cursor:pointer',
        onClick: () => { photos.splice(idx, 1); renderPhotos(); },
      }, '✕'));
      photoGrid.appendChild(wrap);
    });
    const need = Math.max(0, MIN_PHOTOS - photos.length);
    counter.textContent = need > 0
      ? `ถ่ายแล้ว ${photos.length} รูป — ต้องการอีก ${need} รูป (ขั้นต่ำ ${MIN_PHOTOS})`
      : `ถ่ายแล้ว ${photos.length} รูป ✓ (ขั้นต่ำ ${MIN_PHOTOS})`;
    counter.style.color = need > 0 ? 'var(--danger)' : 'var(--primary-dark)';
    submit.disabled = photos.length < MIN_PHOTOS;
  }

  // ปุ่มถ่ายรูป — สร้าง <input type=file capture=environment> ใหม่ทุก click
  // ⚠️ ห้ามใส่ `multiple` เพราะจะอนุญาต gallery — ต้องบังคับเปิดกล้องใหม่ทุกครั้ง
  addBtn.addEventListener('click', () => {
    const tmp = document.createElement('input');
    tmp.type = 'file';
    tmp.accept = 'image/*';
    tmp.capture = 'environment';
    tmp.style.display = 'none';
    document.body.appendChild(tmp);
    tmp.addEventListener('change', async () => {
      const f = tmp.files && tmp.files[0];
      if (f) {
        try {
          const src = await resizeImage(f);
          photos.push(src);
          renderPhotos();
        } catch (e) {
          toast('โหลดรูปไม่สำเร็จ: ' + e.message, 'error');
        }
      }
      tmp.remove();
    });
    tmp.click();
  });

  const submit = el('button', { class: 'btn' }, 'บันทึกรับเข้า');
  const undoBox = el('div', null);

  submit.addEventListener('click', async () => {
    const item_id = itemSel.value;
    const qty = Number(qtyIn.value);
    if (!item_id) return toast('เลือกสินค้าก่อน', 'error');
    if (!qty || qty <= 0) return toast('จำนวนต้องมากกว่า 0', 'error');
    if (photos.length < MIN_PHOTOS) return toast(`ต้องถ่ายรูปอย่างน้อย ${MIN_PHOTOS} รูป`, 'error');

    submit.disabled = true; submit.textContent = 'กำลังบันทึก…';
    try {
      const r = await api.stockIn({ item_id, 'จำนวน': qty, photos_base64: photos });
      lastSubmittedRow = { row: r.row, ts: Date.now(), item_id };
      const item = items.find(i => i.item_id === item_id);
      toast(`บันทึก ${item['ชื่อ']} ${fmtNum(qty)} ${item['หน่วย']} (${photos.length} รูป) ✓`, 'success');
      // reset
      itemSel.value = ''; qtyIn.value = '';
      photos.length = 0;
      renderPhotos();
      renderUndo();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      submit.disabled = photos.length < MIN_PHOTOS;
      submit.textContent = 'บันทึกรับเข้า';
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
    el('div', { class: 'field' },
      el('label', null, `รูปใบส่งของ — ขั้นต่ำ ${MIN_PHOTOS} รูป (ถ่ายใหม่ทุกครั้ง)`),
      addBtn,
      photoGrid,
      counter,
    ),
    submit,
  ));
  root.appendChild(undoBox);
  renderPhotos();
  renderUndo();
}
