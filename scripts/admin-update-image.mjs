// อัปเดต "รูป" ของสินค้าที่มีอยู่แล้ว (ไม่แตะ price/name/style ฯลฯ) ผ่านหน้าเว็บแอดมินจริง
// ใช้ตอนต้องเปลี่ยนรูปย้อนหลัง เช่น ครอปตัวอักษร/ลายน้ำออกใหม่ให้สินค้าที่ลงไปแล้ว
//
// วิธีใช้:
//   node scripts/admin-update-image.mjs <โฟลเดอร์> [--dry] [--api http://localhost:5173] [--headed]
//
// items.csv คอลัมน์ที่ใช้: image (รูปใหม่ที่จะอัปโหลดแทน) + name (ต้องตรงกับชื่อสินค้าที่มีอยู่แล้วเป๊ะ
// เพื่อหาการ์ดสินค้าที่ถูกต้องในแอดมิน — ใช้ title attribute จับ ไม่ใช่ข้อความที่โดน truncate)

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const headed = args.includes('--headed');
const apiFlag = args.indexOf('--api');
const BASE = apiFlag >= 0 ? args[apiFlag + 1] : 'http://localhost:5173';
const folder = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--api');

if (!folder) {
  console.error('ใช้: node scripts/admin-update-image.mjs <โฟลเดอร์> [--dry] [--api URL] [--headed]');
  process.exit(1);
}

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

const csvPath = path.join(folder, 'items.csv');
if (!existsSync(csvPath)) {
  console.error(`หา ${csvPath} ไม่เจอ`);
  process.exit(1);
}

const rows = parseCsv(await readFile(csvPath, 'utf8'));
const records = toObjects(rows).filter((r) => r.image && !r.image.startsWith('#'));

let bad = 0;
for (const rec of records) {
  if (!rec.name) { bad++; console.error(`✗ ${rec.image}\n   - ไม่มี name (ต้องตรงกับสินค้าที่มีอยู่แล้ว)`); continue; }
  if (!existsSync(path.join(folder, rec.image))) { bad++; console.error(`✗ ${rec.image}\n   - หาไฟล์รูปไม่เจอ`); }
}
if (bad) { console.error(`\nมี ${bad} รายการข้อมูลไม่ครบ — แก้ items.csv ก่อน แล้วรันใหม่`); process.exit(1); }

console.log(`พบ ${records.length} ชิ้นใน ${csvPath}${dry ? '  (โหมด --dry ไม่เปิดเบราว์เซอร์)' : ''}\n`);

if (dry) {
  for (const rec of records) console.log(`• (dry) จะอัปเดตรูป: ${rec.name}  ←  ${rec.image}`);
  console.log(`\nสรุป: จะอัปเดต ${records.length} ชิ้น (dry-run)`);
  process.exit(0);
}

const browser = await chromium.launch({ headless: !headed });
const page = await browser.newPage();
await page.goto(`${BASE}/admin.html`, { waitUntil: 'networkidle' });

const searchInput = page.locator('input[type="search"]');
let ok = 0, fail = 0;

for (const rec of records) {
  try {
    await searchInput.fill(rec.name);
    await page.waitForTimeout(200);

    const card = page.locator(`div.relative:has(p[title="${rec.name}"])`).first();
    await card.waitFor({ state: 'visible', timeout: 5000 });
    await card.getByRole('button', { name: 'แก้ไข', exact: true }).click();

    // ยืนยันว่าฟอร์มเข้าโหมดแก้ไขตัวที่ถูกต้องแล้ว (ชื่อในช่องต้องตรง)
    const nameInput = page.locator('div:has(> label:text-is("3. ชื่อสินค้า")) input');
    await nameInput.waitFor({ state: 'visible' });
    const currentName = await nameInput.inputValue();
    if (currentName !== rec.name) throw new Error(`เข้าฟอร์มผิดตัว (คาดว่า "${rec.name}" แต่เจอ "${currentName}")`);

    // อัปโหลดรูปใหม่แทนรูปเดิม
    const imgPath = path.resolve(folder, rec.image);
    await page.locator('input[type="file"]').setInputFiles(imgPath);
    await page.locator('img[alt="preview"]').waitFor({ state: 'visible', timeout: 5000 });

    // removeBg: startEdit() เซ็ตติ๊กไว้เสมอ (auto) — ถ้า csv สั่ง off ชัดเจน (เช่น auto-remove
    // พังกับสีอ่อนมากจนกินตัวสินค้า) ให้ปลดติ๊กก่อนบันทึก
    if (rec.removeBg && rec.removeBg.toLowerCase() === 'off') {
      const cb = page.locator('input[type="checkbox"]').first();
      if (await cb.isChecked()) await cb.click();
    }

    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();

    const notice = page.locator('text=บันทึกการแก้ไขแล้ว');
    const errorBox = page.locator('form div.bg-red-50').first();
    await Promise.race([
      notice.waitFor({ state: 'visible', timeout: 8000 }),
      errorBox.waitFor({ state: 'visible', timeout: 8000 }),
    ]).catch(() => {});

    if (await notice.isVisible().catch(() => false)) {
      console.log(`✓ ${rec.name}`);
      ok++;
    } else {
      const errText = await errorBox.textContent().catch(() => null);
      throw new Error(errText || 'ไม่พบ notice สำเร็จหลังกดบันทึก (timeout)');
    }

    // รอปุ่มกลับมาปกติ (submitting=false) ก่อนเริ่มชิ้นถัดไป กันฟอร์มโดนแตะตอนยังไม่พร้อม
    await page
      .locator('button[type="submit"]:not([disabled])')
      .waitFor({ state: 'visible', timeout: 10000 })
      .catch(() => {});
    await page.waitForTimeout(300);

    await searchInput.fill('');
  } catch (e) {
    console.error(`✗ ${rec.name}  → ${e.message}`);
    fail++;
    await searchInput.fill('').catch(() => {});
  }
}

await browser.close();

console.log(`\nสรุป: สำเร็จ ${ok}${fail ? ` · ล้มเหลว ${fail}` : ''}`);
if (ok) console.log(`เช็กได้ที่ ${BASE}/admin.html`);
process.exit(fail ? 1 : 0);
