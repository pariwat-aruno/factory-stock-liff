import { initAuth, state, isOwner } from './auth.js';
import { api } from './api.js';
import { CONFIG } from './config.js';
import { toast, el } from './utils.js';

import { renderStockIn }  from './pages/stockIn.js';
import { renderStockOut } from './pages/stockOut.js';
import { renderBalance }  from './pages/balance.js';
import { renderAdmin }    from './pages/admin.js';

const PAGES = {
  stockIn:  { render: renderStockIn,  icon: '📥', label: 'รับเข้า' },
  stockOut: { render: renderStockOut, icon: '📤', label: 'เบิก' },
  balance:  { render: renderBalance,  icon: '📊', label: 'ยอด' },
  admin:    { render: renderAdmin,    icon: '⚙️', label: 'Admin' },
};

async function boot() {
  try {
    await initAuth();
    const me = await api.me();
    state.user = me.user;
  } catch (e) {
    const uid = state.lineUserId || '(ยังไม่ทราบ)';
    document.getElementById('page').innerHTML = `
      <div class="card center">
        <h3>เปิดแอปไม่สำเร็จ</h3>
        <p class="muted">${e.message}</p>
        <hr>
        <p class="muted">LINE User ID ของคุณ:</p>
        <code style="display:block;background:#f0f0f0;padding:10px;border-radius:6px;
          word-break:break-all;font-size:13px;user-select:all">${uid}</code>
        <button class="btn secondary" style="margin-top:12px"
          onclick="navigator.clipboard.writeText('${uid}').then(()=>this.textContent='คัดลอกแล้ว ✓')">
          คัดลอก ID
        </button>
        <p class="muted" style="margin-top:12px;font-size:13px">
          ส่ง ID นี้ให้เจ้าของ → ใส่ใน Sheet "Users" → เปิดแอปอีกครั้ง
        </p>
      </div>`;
    return;
  }

  document.getElementById('user-chip').textContent =
    `${state.user['ชื่อ']} (${state.user.role})`;

  // ---- render tabbar ตาม CONFIG.TABS (filtered by mode) ----
  const tabbar = document.getElementById('tabbar');
  tabbar.innerHTML = '';
  CONFIG.TABS.forEach(name => {
    const p = PAGES[name];
    if (!p) return;
    const btn = el('button', { class: 'tab', 'data-page': name },
      el('span', { class: 'tab-icon' }, p.icon),
      el('span', { class: 'tab-label' }, p.label),
    );
    btn.addEventListener('click', () => navigate(name));
    tabbar.appendChild(btn);
  });

  // เปิด tab ตาม ?tab= ถ้ามี (Rich Menu deep link), หรือ DEFAULT_TAB
  const params = new URLSearchParams(location.search);
  const wanted = params.get('tab');
  const start = (wanted && CONFIG.TABS.includes(wanted)) ? wanted : CONFIG.DEFAULT_TAB;
  navigate(start);
}

export function navigate(page) {
  if (!PAGES[page]) return;
  document.querySelectorAll('#tabbar .tab').forEach(b => {
    b.classList.toggle('active', b.dataset.page === page);
  });
  const main = document.getElementById('page');

  // owner-only check — block staff with friendly message
  if (CONFIG.OWNER_ONLY_TABS.includes(page) && !isOwner()) {
    main.innerHTML = `
      <div class="card center">
        <div style="font-size:48px;margin-bottom:8px">🔒</div>
        <h3>คุณไม่มีสิทธิ์เข้าหน้านี้</h3>
        <p class="muted">หน้า "${PAGES[page].label}" สำหรับเจ้าของเท่านั้น</p>
        <p class="muted" style="font-size:13px">คุณ login เป็น <b>${state.user['ชื่อ']}</b> (${state.user.role})</p>
      </div>`;
    return;
  }

  main.innerHTML = '<div id="loading">กำลังโหลด…</div>';
  Promise.resolve()
    .then(() => PAGES[page].render(main))
    .catch(e => {
      main.innerHTML = '';
      toast(e.message, 'error');
    });
}

boot();
