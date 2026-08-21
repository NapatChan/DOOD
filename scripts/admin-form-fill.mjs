// ลงสินค้าหลายชิ้นเข้าเว็ป DOOD โดย "กรอกฟอร์มแอดมินจริง" ผ่านเบราว์เซอร์ (เหมือนคนพิมพ์เอง)
// ต่างจาก bulk-add.mjs ที่ยิงตรงเข้า POST /api/products — สคริปต์นี้เปิด admin.html,
// อัปโหลดไฟล์รูป, กรอกทุกช่อง, กดปุ่ม "เพิ่มสินค้า" ทีละชิ้นจริง ๆ ในหน้าเว็บ
//
// วิธีใช้:
//   npm run dev            # ต้องเปิด dev server ไว้ก่อน (http://localhost:5173)
//   node scripts/admin-form-fill.mjs <โฟลเดอร์> [--dry] [--api http://localhost:5173] [--headed]
//   node scripts/admin-form-fill.mjs new-products --dry     # แค่พรีวิวว่าจะกรอกอะไรบ้าง ไม่เปิดเบราว์เซอร์
//   node scripts/admin-form-fill.mjs new-products --headed  # เปิดเบราว์เซอร์ให้เห็นจริงระหว่างกรอก
//
// items.csv คอลัมน์เดียวกับ bulk-add.mjs:
//   image,price,buyUrl,group,color,name,category,gender,fit,style,scale,removeBg
// (การเดาช่องว่างเป็นหน้าที่ของ agent dood-admin-filler ก่อนเรียกสคริปต์นี้)

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const headed = args.includes('--headed');
const apiFlag = args.indexOf('--api');
const BASE = apiFlag >= 0 ? args[apiFlag + 1] : 'http://localhost:5173';
const folder = args.find(
  (a, i) => !a.startsWith('--') && args[i - 1] !== '--api',
);

if (!folder) {
  console.error('ใช้: node scripts/admin-form-fill.mjs <โฟลเดอร์> [--dry] [--api URL] [--headed]');
  process.exit(1);
}

const CATEGORY_MAP = { หมวก: 'หมวก', เสื้อ: 'เสื้อ', กางเกง: 'กางเกง', hat: 'หมวก', top: 'เสื้อ', pants: 'กางเกง' };
const CATEGORY_SELECT_LABEL = { หมวก: 'หมวก', เสื้อ: 'เสื้อ', กางเกง: 'กางเกง' };
const GENDER_MAP = { ชาย: 'male', หญิง: 'female', ทุกเพศ: 'unisex', male: 'male', female: 'female', unisex: 'unisex' };
const FIT_MAP = { ยาว: 'long', สั้น: 'short', long: 'long', short: 'short', auto: 'auto' };
const STYLE_LABEL = { มินิมอล: 'มินิมอล', แคชชวล: 'แคชชวล', สตรีท: 'สตรีท', วินเทจ: 'วินเทจ', ทางการ: 'ทางการ', กีฬา: 'กีฬา' };

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
console.log(`พบ ${records.length} ชิ้นใน ${csvPath}${dry ? '  (โหมด --dry ไม่เปิดเบราว์เซอร์)' : ''}\n`);

let bad = 0;
for (const rec of records) {
  const errs = validate(rec, folder);
  if (errs.length) { bad++; console.error(`✗ ${rec.image}\n   - ${errs.join('\n   - ')}`); }
}
if (bad) { console.error(`\nมี ${bad} ชิ้นข้อมูลไม่ครบ — แก้ items.csv ก่อน แล้วรันใหม่`); process.exit(1); }

if (dry) {
  for (const rec of records) {
    const tag = `${rec.category} · ${rec.name} · ฿${rec.price}${rec.buyUrl ? ' · 🔗' : ''}${rec.group ? ` · กลุ่ม:${rec.group}/${rec.color || '?'}` : ''}`;
    console.log(`• (dry) จะกรอกฟอร์ม: ${tag}`);
  }
  console.log(`\nสรุป: จะกรอก ${records.length} ชิ้น (dry-run — ยังไม่เปิดเบราว์เซอร์จริง)`);
  process.exit(0);
}

const browser = await chromium.launch({ headless: !headed });
const page = await browser.newPage();
await page.goto(`${BASE}/admin.html`, { waitUntil: 'domcontentloaded' });
await page.locator('input[type="file"]').first().waitFor({ state: 'attached', timeout: 15000 });

let ok = 0, fail = 0;

for (const rec of records) {
  const tag = `${rec.category} · ${rec.name} · ฿${rec.price}`;
  try {
    const imgPath = path.resolve(folder, rec.image);

    // 1. รูป — รอ preview <img> ขึ้นจริงก่อน (FileReader เป็น async, timeout เฉย ๆ ไม่พอเชื่อได้)
    await page.locator('input[type="file"]').setInputFiles(imgPath);
    await page.locator('img[alt="preview"]').waitFor({ state: 'visible', timeout: 5000 });

    // 2. ประเภท
    const categorySelect = page.locator('div:has(> label:text-is("2. ประเภทสินค้า")) select');
    await categorySelect.selectOption({ label: CATEGORY_SELECT_LABEL[CATEGORY_MAP[rec.category]] });

    // ทรง (เฉพาะกางเกง — ช่องนี้โผล่มาแบบมีเงื่อนไข)
    if (CATEGORY_MAP[rec.category] === 'กางเกง' && rec.fit) {
      const fit = FIT_MAP[rec.fit] || 'auto';
      const fitSelect = page.locator('div:has(> label:has-text("ทรง")) select');
      await fitSelect.waitFor({ state: 'visible' });
      await fitSelect.selectOption(fit);
    }

    // เพศ
    const genderSelect = page.locator('div:has(> label:text-is("เพศ")) select');
    await genderSelect.selectOption(GENDER_MAP[rec.gender] || 'unisex');

    // 3. ชื่อ — ยืนยันค่าที่กรอกจริงก่อนไปต่อ (เจอ race ที่ fill() ไม่ค่อยติดบางครั้ง)
    const nameInput = page.locator('div:has(> label:text-is("3. ชื่อสินค้า")) input');
    await nameInput.fill(rec.name);
    for (let i = 0; i < 5 && (await nameInput.inputValue()) !== rec.name; i++) {
      await nameInput.fill(rec.name);
    }

    // 4. ราคา
    const priceInput = page.locator('div:has(> label:has-text("4. ราคา")) input');
    await priceInput.fill(String(rec.price));
    for (let i = 0; i < 5 && (await priceInput.inputValue()) !== String(rec.price); i++) {
      await priceInput.fill(String(rec.price));
    }

    // 5. ลิงก์สั่งซื้อ
    if (rec.buyUrl) {
      const buyUrlInput = page.locator('div:has(> label:has-text("5. ลิงก์สั่งซื้อ")) input');
      await buyUrlInput.fill(rec.buyUrl);
    }

    // 6. สไตล์
    if (rec.style) {
      const styleSelect = page.locator('div:has(> label:has-text("6. สไตล์")) select');
      await styleSelect.selectOption({ label: STYLE_LABEL[rec.style] || rec.style });
    }

    // 7. กลุ่มสี
    if (rec.group || rec.color) {
      const groupBlock = page.locator('div:has(> label:has-text("7. กลุ่มสี"))');
      const inputs = groupBlock.locator('input');
      if (rec.group) await inputs.nth(0).fill(rec.group);
      if (rec.color) await inputs.nth(1).fill(rec.color);
    }

    // removeBg checkbox: ปล่อยค่า default (ติ๊กอยู่แล้ว = auto) เว้นแต่สั่ง off
    if (rec.removeBg && rec.removeBg.toLowerCase() === 'off') {
      const cb = page.locator('input[type="checkbox"]').first();
      if (await cb.isChecked()) await cb.click();
    }

    // กันเหนียวรอบสุดท้ายก่อนส่ง — เผื่อ field โดนรีเซ็ตระหว่างทาง
    if ((await nameInput.inputValue()) !== rec.name) await nameInput.fill(rec.name);
    if ((await priceInput.inputValue()) !== String(rec.price)) await priceInput.fill(String(rec.price));

    // กดเพิ่มสินค้า
    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();

    // รอผลลัพธ์: notice สีเขียว "เพิ่มสินค้าแล้ว ✓" หรือ error สีแดงในฟอร์ม
    // (สโคปด้วย .bg-red-50 เพราะ .text-red-600 เฉย ๆ ชนกับปุ่ม "🚩 เฉพาะมีปัญหา" ที่โชว์ค้างอยู่ตลอด)
    const notice = page.locator('text=เพิ่มสินค้าแล้ว');
    const errorBox = page.locator('form div.bg-red-50').first();
    await Promise.race([
      notice.waitFor({ state: 'visible', timeout: 8000 }),
      errorBox.waitFor({ state: 'visible', timeout: 8000 }),
    ]).catch(() => {});

    if (await notice.isVisible().catch(() => false)) {
      console.log(`✓ ${tag}`);
      ok++;
    } else {
      const errText = await errorBox.textContent().catch(() => null);
      throw new Error(errText || 'ไม่พบ notice สำเร็จหลังกดส่ง (timeout)');
    }

    // รอจน onSubmit ทำ resetForm() + await refresh() (เรียก Supabase ใหม่) เสร็จจริง —
    // ปุ่มจะกลับมาเป็น "เพิ่มสินค้า" (ไม่ disabled) ตอนนั้น ค่อยเริ่มชิ้นถัดไป กันฟอร์มโดนแตะ
    // ระหว่างที่ยัง submitting=true อยู่ (เจอ race ที่ทำให้ชื่อ/ราคาหลุดถ้าเริ่มเร็วไป)
    await page
      .locator('button[type="submit"]:not([disabled])')
      .waitFor({ state: 'visible', timeout: 10000 })
      .catch(() => {});
    await page.waitForTimeout(300);
  } catch (e) {
    console.error(`✗ ${tag}  → ${e.message}`);
    fail++;
  }
}

await browser.close();

console.log(`\nสรุป: สำเร็จ ${ok}${fail ? ` · ล้มเหลว ${fail}` : ''}`);
if (ok) console.log(`เช็กได้ที่ ${BASE}/admin.html`);
process.exit(fail ? 1 : 0);
