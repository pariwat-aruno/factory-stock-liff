#!/usr/bin/env node
/**
 * CLI helper เรียก API ของ Apps Script Web App
 *
 * Usage:
 *   node scripts/api.mjs GET  '?action=me&line_user_id=U_STAFF_TBD'
 *   node scripts/api.mjs POST '{"action":"createItem","line_user_id":"...",...}'
 *
 * อ่าน URL จาก env API_URL หรือไฟล์ scripts/.api-url
 */

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const URL_FILE = join(__dirname, '.api-url');

function getUrl() {
  if (process.env.API_URL) return process.env.API_URL.trim();
  if (existsSync(URL_FILE)) return readFileSync(URL_FILE, 'utf8').trim();
  console.error('Set API_URL env or create scripts/.api-url with the deployed Web App URL');
  process.exit(1);
}

const [, , method, payload] = process.argv;
if (!method || !['GET', 'POST'].includes(method.toUpperCase())) {
  console.error('Usage: node scripts/api.mjs <GET|POST> <query|json>');
  process.exit(1);
}

const url = getUrl();
const m = method.toUpperCase();

let opts, target;
if (m === 'GET') {
  const qs = (payload || '').replace(/^\?/, '');
  target = qs ? `${url}?${qs}` : url;
  opts = { method: 'GET', redirect: 'follow' };
} else {
  target = url;
  opts = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload || '{}',
    redirect: 'follow',
  };
}

const res = await fetch(target, opts);
const text = await res.text();
try {
  console.log(JSON.stringify(JSON.parse(text), null, 2));
} catch {
  console.log(text);
}
