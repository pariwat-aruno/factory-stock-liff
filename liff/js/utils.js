// Toast แสดงข้อความ 3 วินาที
export function toast(msg, type = 'default') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = type === 'default' ? '' : type;
  el.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { el.hidden = true; }, 3000);
}

// resize รูป + burn timestamp overlay (Asia/Bangkok) → base64 jpeg
// timestamp ถูก burn เข้า image bytes ตอน capture — แก้ไม่ได้ผ่าน UI
export async function resizeImage(file, { maxSize = 1920, quality = 0.8, stamp = true } = {}) {
  const dataUrl = await readFileAsDataURL(file);
  const img = await loadImage(dataUrl);

  let { width, height } = img;
  if (width > maxSize || height > maxSize) {
    if (width > height) { height = Math.round(height * maxSize / width); width = maxSize; }
    else                { width  = Math.round(width  * maxSize / height); height = maxSize; }
  }

  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, width, height);

  if (stamp) drawTimestamp_(ctx, width, height);

  return canvas.toDataURL('image/jpeg', quality);
}

function drawTimestamp_(ctx, w, h) {
  const ts = new Date().toLocaleString('sv-SE', { // sv-SE = ISO format YYYY-MM-DD HH:mm:ss
    timeZone: 'Asia/Bangkok',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
  const label = `📷 ${ts}  Asia/Bangkok`;

  // ปรับ font size ตามขนาดรูป — ~3% ของความสูง (min 28px)
  const fontSize = Math.max(28, Math.round(h * 0.03));
  ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", "Sarabun", sans-serif`;
  ctx.textBaseline = 'bottom';
  const padding = Math.round(fontSize * 0.5);
  const textW = ctx.measureText(label).width;
  const barH = fontSize + padding * 2;

  // black semi-transparent bar เต็มกว้าง bottom
  ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
  ctx.fillRect(0, h - barH, w, barH);

  // white text + แดงนิดสำหรับ accent (cherry theme)
  ctx.fillStyle = '#ffffff';
  ctx.fillText(label, padding, h - padding);

  // เส้นแดง cherry บางๆ ขอบบนของ bar
  ctx.fillStyle = '#c8102e';
  ctx.fillRect(0, h - barH, w, 4);
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// helper สร้าง element + ใส่ attr/children สั้นๆ
export function el(tag, props, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (k === 'class')         node.className = v;
    else if (k === 'html')     node.innerHTML = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v === false || v == null) { /* skip */ }
    else if (v === true)       node.setAttribute(k, '');
    else                       node.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return node;
}

// format เลข — 0 → "0", 1.5 → "1.5", 1000 → "1,000"
export function fmtNum(n) {
  if (n == null || n === '') return '—';
  const x = Number(n);
  return Number.isInteger(x) ? x.toLocaleString() : x.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

// confirm dialog
export function confirm(msg) {
  return window.confirm(msg);
}
