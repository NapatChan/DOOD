// เพิ่มสินค้าหลายชิ้นรวดเดียวจากโฟลเดอร์ + items.csv → ยิงเข้า admin API (POST /api/products)
//
// วิธีใช้:
//   npm run dev            # ต้องเปิด dev server ไว้ก่อน (API อยู่ที่ http://localhost:5173)
//   node scripts/bulk-add.mjs <โฟลเดอร์> [--dry] [--api http://localhost:5173]
//   node scripts/bulk-add.mjs new-products --dry     # ลองดูว่าจะยิงอะไรบ้าง (ไม่เขียนจริง)
//   node scripts/bulk-add.mjs new-products            # ยิงจริง
//
// items.csv (บรรทัดแรก = หัวตาราง) รองรับคอลัมน์:
//   image     (จำเป็น) ชื่อไฟล์รูปในโฟลเดอร์ — ขึ้นต้นด้วย # = คอมเมนต์ (ข้าม)
//   price     (จำเป็น) ตัวเลข
//   name      ชื่อสินค้า (ไทย)
//   category  หมวก/เสื้อ/กางเกง หรือ hat/top/pants
//   gender    ชาย/หญิง/ทุกเพศ หรือ male/female/unisex (เว้น=unisex)
//   fit       ยาว/สั้น/auto หรือ long/short/auto (เฉพาะกางเกง, เว้น=auto)
//   style     มินิมอล/แคชชวล/สตรีท/วินเทจ/ทางการ/กีฬา หรือ id อังกฤษ
//   buyUrl    ลิงก์สั่งซื้อ (เว้นได้)
//   scale     ตัวคูณขนาด (เว้น=1)
//   removeBg  auto/on/off (เว้น=auto)
//   group,color  ใช้ตอน agent ตั้งชื่อ (สคริปต์นี้ไม่สนใจ)
//
// หมายเหตุ: สคริปต์นี้ยิงตามที่กรอกใน csv ตรง ๆ ไม่เดาจากรูป (การเดาเป็นหน้าที่ของ agent
// dood-admin-filler ที่จะเติมช่องว่างให้ก่อนแล้วค่อยเรียกสคริปต์นี้)

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const apiFlag = args.indexOf('--api');
const API = apiFlag >= 0 ? args[apiFlag + 1] : 'http://localhost:5173';
const folder = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--api');

if (!folder) {
  console.error('ใช้: node scripts/bulk-add.mjs <โฟลเดอร์> [--dry] [--api URL]');
  process.exit(1);
}

const CATEGORY_MAP = { หมวก: 'hat', เสื้อ: 'top', กางเกง: 'pants', hat: 'hat', top: 'top', pants: 'pants' };
const GENDER_MAP = { ชาย: 'male', หญิง: 'female', ทุกเพศ: 'unisex', male: 'male', female: 'female', unisex: 'unisex' };
const FIT_MAP = { ยาว: 'long', สั้น: 'short', long: 'long', short: 'short', auto: 'auto' };
const STYLE_MAP = {
  มินิมอล: 'minimal', แคชชวล: 'casual', สตรีท: 'street', วินเทจ: 'vintage', ทางการ: 'formal', กีฬา: 'sport',
  minimal: 'minimal', casual: 'casual', street: 'street', vintage: 'vintage', formal: 'formal', sport: 'sport',
};
const MIME = { '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' };

// CSV parser เล็ก ๆ รองรับ field ในเครื่องหมายคำพูด "..."
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

async function toDataUrl(file) {
  const buf = await readFile(file);
  const mime = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
  return `data:${mime};base64,${buf.toString('base64')}`;
}

function buildInput(rec, imageBase64) {
  const category = CATEGORY_MAP[rec.category];
  const input = {
    category,
    name: rec.name,
    price: Number(rec.price),
    imageBase64,
    removeBg: rec.removeBg ? rec.removeBg.toLowerCase() : 'auto',
  };
  if (rec.buyUrl) input.buyUrl = rec.buyUrl;
  if (rec.style) input.style = STYLE_MAP[rec.style] || rec.style;
  if (rec.gender) input.gender = GENDER_MAP[rec.gender] || rec.gender;
  if (category === 'pants' && rec.fit) input.fit = FIT_MAP[rec.fit] || 'auto';
  if (rec.scale) input.scale = Number(rec.scale);
  return input;
}

function validate(rec, dir) {
  const errs = [];
  if (!CATEGORY_MAP[rec.category]) errs.push(`category ไม่ถูก: "${rec.category}" (ต้องเป็น หมวก/เสื้อ/กางเกง)`);
  if (!rec.name) errs.push('ไม่มี name');
  if (!Number.isFinite(Number(rec.price)) || Number(rec.price) < 0) errs.push(`price ไม่ถูก: "${rec.price}"`);
  if (!existsSync(path.join(dir, rec.image))) errs.push(`หาไฟล์รูปไม่เจอ: ${rec.image}`);
  return errs;
}

const csvPath = path.join(folder, 'items.csv');
if (!existsSync(csvPath)) {
  console.error(`หา ${csvPath} ไม่เจอ`);
  process.exit(1);
}

const rows = parseCsv(await readFile(csvPath, 'utf8'));
if (rows.length < 2) {
  console.error('items.csv ว่าง (ต้องมีหัวตาราง + อย่างน้อย 1 แถว)');
  process.exit(1);
}

const records = toObjects(rows).filter((r) => r.image && !r.image.startsWith('#'));
console.log(`พบ ${records.length} ชิ้นใน ${csvPath}${dry ? '  (โหมด --dry ไม่ยิงจริง)' : ''}\n`);

// ตรวจความถูกต้องก่อนทั้งหมด — เจอ error หยุดเลย ไม่ยิงครึ่ง ๆ กลาง ๆ
let bad = 0;
for (const rec of records) {
  const errs = validate(rec, folder);
  if (errs.length) { bad++; console.error(`✗ ${rec.image}\n   - ${errs.join('\n   - ')}`); }
}
if (bad) { console.error(`\nมี ${bad} ชิ้นข้อมูลไม่ครบ — แก้ items.csv ก่อน แล้วรันใหม่`); process.exit(1); }

let ok = 0, fail = 0;
for (const rec of records) {
  const input = buildInput(rec, await toDataUrl(path.join(folder, rec.image)));
  const tag = `${input.category} · ${input.name} · ฿${input.price}${input.buyUrl ? ' · 🔗' : ''}`;
  if (dry) { console.log(`• (dry) ${tag}`); ok++; continue; }
  try {
    const res = await fetch(`${API}/api/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data.errors || [`HTTP ${res.status}`]).join(', '));
    console.log(`✓ ${tag}  → ${data.product?.id}`);
    ok++;
  } catch (e) {
    console.error(`✗ ${tag}  → ${e.message}`);
    fail++;
  }
}

console.log(`\nสรุป: สำเร็จ ${ok}${fail ? ` · ล้มเหลว ${fail}` : ''}${dry ? ' (dry-run)' : ''}`);
if (!dry && ok) console.log('เช็กได้ที่ http://localhost:5173/admin.html');
process.exit(fail ? 1 : 0);
