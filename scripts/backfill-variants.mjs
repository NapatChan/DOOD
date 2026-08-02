// Backfill (รันครั้งเดียว, รันซ้ำได้): เติม variant_group + color_name ให้สินค้าเดิม
// ที่ลงก่อนระบบแทบเลือกสี — bulk-add เก่าทิ้ง group/color ไป
//
// ต้องรัน SQL เพิ่มคอลัมน์ก่อน (Supabase SQL Editor):
//   alter table products add column if not exists variant_group text;
//   alter table products add column if not exists color_name text;
//
// วิธีใช้:
//   node scripts/backfill-variants.mjs --dry   # ดูก่อนว่าจะเซ็ตกลุ่ม/สีอะไรบ้าง (ไม่เขียน)
//   node scripts/backfill-variants.mjs         # เขียนจริง (PATCH ทีละชิ้น)
//
// ที่มาของ group/color: จับคู่ DB row กับแถวใน new-products/**/items.csv ด้วย "ชื่อ" (name)
//   - กลุ่มปกติ: ใช้คอลัมน์ group จาก CSV ตรง ๆ (1 รุ่น = 1 group เช่น "เสื้อคอวี")
//   - หมวก Y2K: CSV จับหยาบ (group="หมวกY2K" 18 ใบ = 6 รุ่น) → แยกกลุ่มตามชื่อรุ่นในฟิลด์ name
//   - ชิ้นที่ไม่มีใน CSV: เดา group/สี จากชื่อแบบ "...สีXXX" (fallback)

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hasSupabase, dbSelect, dbUpdate } from './supabase.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const NEW_PRODUCTS = path.join(ROOT, 'new-products');
const dry = process.argv.includes('--dry');

// หมวก Y2K แยกกลุ่มตามชื่อรุ่นที่โผล่ในชื่อสินค้า (เรียงจากเจาะจง→กว้าง)
const Y2K_MODELS = [
  { match: 'Rosé Frantz', group: 'หมวก Rosé Frantz' },
  { match: 'Cheer Team', group: 'หมวก Cheer Team' },
  { match: 'LOS ANGELESS', group: 'หมวก LOS ANGELESS' },
  { match: 'OLYMPIA', group: 'หมวก OLYMPIA' },
  { match: 'PARIS', group: 'หมวก PARIS' },
  { match: 'ปักทานตะวัน', group: 'หมวกปักทานตะวัน' },
];

// ---------- CSV parser (รองรับ "..." มี , ข้างใน) ----------
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some((v) => v.trim() !== '')) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); if (row.some((v) => v.trim() !== '')) rows.push(row); }
  return rows;
}
function toObjects(rows) {
  const header = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? '').trim()])));
}

// หา items.csv ทุกไฟล์ใต้ new-products (ลึกได้หลายชั้น: hat/, pants/, b2/tee-crew/, ...)
function findCsvs(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) out.push(...findCsvs(full));
    else if (name === 'items.csv') out.push(full);
  }
  return out;
}

// group สุดท้ายของแถว CSV: หมวก Y2K แยกตามรุ่น, ที่เหลือใช้ group ตรง ๆ
function resolveGroup(rec) {
  if ((rec.group || '').trim() === 'หมวกY2K') {
    const hit = Y2K_MODELS.find((m) => (rec.name || '').includes(m.match));
    if (hit) return hit.group;
    console.warn(`  ⚠️  หมวก Y2K แต่หารุ่นไม่เจอ: "${rec.name}" → ใช้ group เดิม`);
  }
  return (rec.group || '').trim();
}

// fallback: เดาจากชื่อ "…สีXXX" → { group, colorName }
function deriveFromName(name) {
  const m = name.match(/^(.*\S)\s*สี(\S+)$/);
  if (!m) return null;
  return { group: m[1].trim(), colorName: m[2].trim() };
}

async function main() {
  if (!hasSupabase) throw new Error('ยังไม่ตั้งค่า Supabase ใน .env');
  if (!existsSync(NEW_PRODUCTS)) throw new Error(`ไม่พบโฟลเดอร์ ${NEW_PRODUCTS}`);

  // 1) สร้าง map: name → { group, colorName } จาก CSV ทุกไฟล์
  const byName = new Map();
  for (const csv of findCsvs(NEW_PRODUCTS)) {
    const recs = toObjects(parseCsv(await readFile(csv, 'utf8')))
      .filter((r) => r.image && !r.image.startsWith('#'));
    for (const rec of recs) {
      if (!rec.name) continue;
      byName.set(rec.name.trim(), { group: resolveGroup(rec), colorName: (rec.color || '').trim() });
    }
  }
  console.log(`อ่าน CSV ได้ ${byName.size} ชื่อ\n`);

  // 2) ดึงสินค้า active จาก DB → หาว่าแต่ละชิ้นควรได้ group/color อะไร
  const rows = await dbSelect('select=id,name,category,variant_group,color_name&is_active=eq.true&order=sort_order');
  const plan = [];       // ชิ้นที่จะอัปเดต
  const skipped = [];    // หา group ไม่ได้
  for (const row of rows) {
    let hit = byName.get((row.name || '').trim());
    if (!hit || !hit.group) {
      const d = deriveFromName(row.name || '');
      if (d) hit = { group: hit?.group || d.group, colorName: hit?.colorName || d.colorName };
    }
    if (!hit || !hit.group) { skipped.push(row.name); continue; }
    // ข้ามถ้าค่าตรงกับที่มีอยู่แล้ว (idempotent)
    if (row.variant_group === hit.group && row.color_name === (hit.colorName || null)) continue;
    plan.push({ id: row.id, name: row.name, group: hit.group, colorName: hit.colorName || null });
  }

  // 3) สรุปกลุ่ม (จำนวนสีต่อกลุ่ม) ให้เห็นภาพก่อนเขียน
  const counts = {};
  for (const r of rows) {
    const g = plan.find((p) => p.id === r.id)?.group ?? r.variant_group;
    if (g) counts[g] = (counts[g] || 0) + 1;
  }
  console.log('กลุ่มที่จะได้ (ชื่อกลุ่ม → จำนวนสี):');
  for (const [g, n] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${n === 1 ? ' ' : n} ${g}${n === 1 ? '  (สีเดียว — ไม่โชว์แทบสี)' : ''}`);
  }
  console.log(`\nจะอัปเดต ${plan.length} ชิ้น${dry ? '  (--dry ไม่เขียนจริง)' : ''}`);
  if (skipped.length) console.log(`หา group ไม่ได้ ${skipped.length} ชิ้น: ${skipped.join(', ')}`);

  if (dry || plan.length === 0) return;

  // 4) เขียนจริง (PATCH ทีละชิ้น)
  let ok = 0, fail = 0;
  for (const p of plan) {
    try {
      await dbUpdate(p.id, { variant_group: p.group, color_name: p.colorName });
      ok += 1;
    } catch (e) {
      console.error(`✗ ${p.name}: ${e.message}`);
      fail += 1;
    }
  }
  console.log(`\n✅ อัปเดตสำเร็จ ${ok}${fail ? ` · ล้มเหลว ${fail}` : ''}`);
}

main().catch((e) => { console.error('❌', e.message); process.exit(1); });
