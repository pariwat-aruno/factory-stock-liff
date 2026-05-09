import { initAuth, state, isOwner } from './auth.js';
import { api } from './api.js';
import { toast } from './utils.js';

import { renderStockIn }  from './pages/stockIn.js';
import { renderStockOut } from './pages/stockOut.js';
import { renderBalance }  from './pages/balance.js';
import { renderAdmin }    from './pages/admin.js';

const PAGES = {
  stockIn:  renderStockIn,
  stockOut: renderStockOut,
  balance:  renderBalance,
  admin:    renderAdmin,
};

let currentPage = 'balance';

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

  if (isOwner()) {
    document.querySelectorAll('.admin-only').forEach(n => n.hidden = false);
  }

  document.querySelectorAll('#tabbar .tab').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.page));
  });

  navigate('balance');
}

export function navigate(page) {
  if (!PAGES[page]) return;
  currentPage = page;
  document.querySelectorAll('#tabbar .tab').forEach(b => {
    b.classList.toggle('active', b.dataset.page === page);
  });
  const main = document.getElementById('page');
  main.innerHTML = '<div id="loading">กำลังโหลด…</div>';
  Promise.resolve()
    .then(() => PAGES[page](main))
    .catch(e => {
      main.innerHTML = '';
      toast(e.message, 'error');
    });
}

boot();
