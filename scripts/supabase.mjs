// ┌─────────────────────────────────────────────────────────────────┐
// │ Supabase helper — ฝั่งเซิร์ฟเวอร์เท่านั้น (admin plugin + backup)   │
// │                                                                   │
// │ ใช้ service_role key จาก .env → bypass RLS (เขียน/ลบ DB + Storage) │
// │ ห้าม import ไฟล์นี้เข้า bundle ฝั่งลูกค้าเด็ดขาด (key ลับ)          │
// └─────────────────────────────────────────────────────────────────┘
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const BUCKET = 'products';

// อ่าน .env เอง (สคริปต์ node ไม่ผ่าน Vite ที่ inject env ให้)
function loadEnv() {
  const env = {};
  try {
    const txt = fs.readFileSync(path.join(ROOT, '.env'), 'utf8');
    for (const line of txt.split('\n')) {
      const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.+?)\s*$/);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {
    /* ไม่มี .env → hasSupabase = false */
  }
  return env;
}

const env = loadEnv();
export const SB_URL = env.VITE_SUPABASE_URL;
export const SVC = env.SUPABASE_SERVICE_KEY;
export const hasSupabase = Boolean(SB_URL && SVC);

function svcHeaders(extra = {}) {
  return { apikey: SVC, Authorization: `Bearer ${SVC}`, ...extra };
}

// ---------- DB (PostgREST) ----------
export async function dbSelect(query) {
  const res = await fetch(`${SB_URL}/rest/v1/products?${query}`, { headers: svcHeaders() });
  if (!res.ok) throw new Error(`select ล้มเหลว: ${res.status} ${await res.text()}`);
  return res.json();
}
export async function dbInsert(row) {
  const res = await fetch(`${SB_URL}/rest/v1/products`, {
    method: 'POST',
    headers: svcHeaders({ 'Content-Type': 'application/json', Prefer: 'return=representation' }),
    body: JSON.stringify(row),
  });
  if (!res.ok) throw new Error(`insert ล้มเหลว: ${res.status} ${await res.text()}`);
  return (await res.json())[0];
}
export async function dbUpdate(id, patch) {
  const res = await fetch(`${SB_URL}/rest/v1/products?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: svcHeaders({ 'Content-Type': 'application/json', Prefer: 'return=representation' }),
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`update ล้มเหลว: ${res.status} ${await res.text()}`);
  return (await res.json())[0];
}

// ---------- Storage ----------
export function publicUrl(objectPath) {
  return `${SB_URL}/storage/v1/object/public/${BUCKET}/${objectPath}`;
}
// ดึง object path กลับจาก public URL (ไว้ลบไฟล์เก่าตอนเปลี่ยนรูป)
export function storagePathFromUrl(url) {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const i = url.indexOf(marker);
  return i >= 0 ? url.slice(i + marker.length) : null;
}
export async function uploadObject(objectPath, buffer, contentType = 'image/webp') {
  const res = await fetch(`${SB_URL}/storage/v1/object/${BUCKET}/${objectPath}`, {
    method: 'POST',
    headers: svcHeaders({ 'Content-Type': contentType, 'x-upsert': 'true' }),
    body: buffer,
  });
  if (!res.ok) throw new Error(`upload ล้มเหลว: ${res.status} ${await res.text()}`);
  return publicUrl(objectPath);
}
export async function deleteObject(objectPath) {
  if (!objectPath) return;
  // best-effort — ลบไม่ได้ก็ไม่ทำให้ทั้ง request พัง (ปล่อยไฟล์กำพร้าดีกว่าพัง)
  await fetch(`${SB_URL}/storage/v1/object/${BUCKET}/${objectPath}`, {
    method: 'DELETE',
    headers: svcHeaders(),
  }).catch(() => {});
}
export async function downloadObject(objectPath) {
  const res = await fetch(publicUrl(objectPath));
  if (!res.ok) throw new Error(`download ล้มเหลว: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}
