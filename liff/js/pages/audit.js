import { api } from '../api.js';
import { el, toast } from '../utils.js';

let currentFilter = 1; // 1 = วันนี้, 7 = 7 วัน, 'all' = ทั้งหมด

const FILTERS = [
  { key: 1, label: 'วันนี้' },
  { key: 7, label: '7 วัน' },
  { key: 'all', label: 'ทั้งหมด' },
];

// สีตาม action — เห็นภาพรวมง่าย
const ACTION_COLORS = {
  'รับเข้า':       '#16a34a',
  'เบิก':          '#ea580c',
  'ยกเลิกรายการ':  '#9333ea',
  'เพิ่มสินค้า':    '#0ea5e9',
  'แก้สินค้า':      '#0891b2',
  'แก้ราคา':        '#0891b2',
  'แก้ขนาดบรรจุ':  '#0891b2',
  'archive สินค้า': '#6b7280',
  'ตั้งเป้าผลิต':   '#c026d3',
  'กรอกผลผลิต':    '#7c3aed',
  'ยกเลิกแผน':     '#9333ea',
  'ปรับยอด':       '#dc2626',
};

export async function renderAudit(root) {
  root.innerHTML = '';

  // filter chips
  const filterBar = el('div', { class: 'card', style: 'display:flex;gap:6px;flex-wrap:wrap' });
  FILTERS.forEach(f => {
    filterBar.appendChild(el('button', {
      class: 'btn ' + (f.key === currentFilter ? '' : 'secondary'),
      style: 'flex:0 0 auto;width:auto;padding:6px 14px;font-size:13px',
      onClick: () => { currentFilter = f.key; renderAudit(root); },
    }, f.label));
  });
  root.appendChild(filterBar);

  // list
  const list = el('div', { class: 'card' });
  list.appendChild(el('div', { class: 'muted center' }, 'กำลังโหลด…'));
  root.appendChild(list);

  let res;
  try {
    res = await api.auditLogs(currentFilter);
  } catch (e) {
    list.innerHTML = '';
    list.appendChild(el('div', { class: 'muted center' }, `โหลดไม่สำเร็จ: ${e.message}`));
    return;
  }
  list.innerHTML = '';

  if (!res.logs.length) {
    list.appendChild(el('div', { class: 'muted center', style: 'padding:20px' }, 'ยังไม่มีบันทึกในช่วงนี้'));
    return;
  }

  // group by วันที่
  const groups = {};
  res.logs.forEach(log => {
    const d = new Date(log.timestamp).toLocaleDateString('th-TH', {
      timeZone: 'Asia/Bangkok', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    });
    if (!groups[d]) groups[d] = [];
    groups[d].push(log);
  });

  Object.keys(groups).forEach(day => {
    list.appendChild(el('div', { class: 'section-title', style: 'margin-top:12px;font-size:13px;color:#666' }, `📅 ${day}`));
    groups[day].forEach(log => list.appendChild(renderLogRow(log)));
  });
}

function renderLogRow(log) {
  const time = new Date(log.timestamp).toLocaleTimeString('th-TH', {
    timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit',
  });
  const color = ACTION_COLORS[log.action] || '#6b7280';
  const roleIcon = log.role === 'เจ้าของ' ? '👑' : '👤';

  return el('div', { class: 'item-row', style: 'gap:8px;align-items:flex-start' },
    el('div', { style: 'flex:0 0 auto;text-align:center;min-width:50px' },
      el('div', { style: 'font-size:11px;color:#666' }, time),
      el('span', {
        class: 'badge',
        style: `background:${color};color:white;font-size:10px;padding:2px 6px;display:inline-block;margin-top:4px`,
      }, log.action),
    ),
    el('div', { style: 'flex:1' },
      el('div', { class: 'name', style: 'font-size:14px' }, log['รายละเอียด'] || '—'),
      el('div', { class: 'meta', style: 'font-size:11px' }, `${roleIcon} ${log['ชื่อ'] || '(ไม่ทราบ)'}`),
    ),
  );
}
