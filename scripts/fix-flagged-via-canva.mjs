// แก้รูปสินค้าที่ติ๊ก "🚩 มีปัญหา" ไว้ในแอดมิน — ส่งรูปต้นฉบับ (ก่อนตัดพื้นหลังของเว็บเอง) ไปลบพื้นหลัง
// ผ่าน Canva Background Remover จริง (แม่นกว่า pipeline ในเครื่องสำหรับเคสที่เจอปัญหา เช่น
// รูโปร่งกลางเสื้อ/สีเพี้ยน) แล้วอัปโหลดรูปที่ได้กลับเข้าไปแทนของเดิม + ปลดธง "มีปัญหา" ให้อัตโนมัติ
//
// ก่อนใช้: ต้องเปิด Chrome จริงที่ล็อกอิน Canva ไว้แล้ว (ดูวิธีใน scripts/canva-remove-bg.mjs)
//
// วิธีใช้:
//   node scripts/fix-flagged-via-canva.mjs [--dry] [--api http://localhost:5173] [--limit N]
//   node scripts/fix-flagged-via-canva.mjs --dry           # ดูก่อนว่าจะทำอะไรบ้าง ไม่แก้จริง
//   node scripts/fix-flagged-via-canva.mjs --limit 5        # ทำแค่ 5 ชิ้นแรก (ทดสอบ)
//   node scripts/fix-flagged-via-canva.mjs                  # ทำจริงทั้งหมด

import { chromium } from 'playwright';
import { readdirSync, readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const apiFlag = args.indexOf('--api');
const BASE = apiFlag >= 0 ? args[apiFlag + 1] : 'http://localhost:5173';
const limitFlag = args.indexOf('--limit');
const LIMIT = limitFlag >= 0 ? Number(args[limitFlag + 1]) : Infinity;

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PRODUCTS_DIR = path.join(ROOT, 'new-products', '10-8-2026');

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

function buildNameToSourceMap() {
  const map = new Map();
  for (const folder of readdirSync(PRODUCTS_DIR)) {
    const csvPath = path.join(PRODUCTS_DIR, folder, 'items.csv');
    let text;
    try { text = readFileSync(csvPath, 'utf8'); } catch { continue; }
    const rows = parseCsv(text);
    if (rows.length < 2) continue;
    const header = rows[0].map((h) => h.trim());
    for (const r of rows.slice(1)) {
      const rec = Object.fromEntries(header.map((h, i) => [h, (r[i] ?? '').trim()]));
      if (!rec.image || rec.image.startsWith('#') || !rec.name) continue;
      map.set(rec.name, path.join(PRODUCTS_DIR, folder, rec.image));
    }
  }
  return map;
}

async function fetchFlagged() {
  const res = await fetch(`${BASE}/api/products`);
  const data = await res.json();
  const items = Array.isArray(data) ? data : data.products;
  return items.filter((p) => p.needsFix);
}

const nameToSource = buildNameToSourceMap();
const flagged = await fetchFlagged();
console.log(`พบสินค้าที่ติ๊ก "มีปัญหา" ${flagged.length} ชิ้น\n`);

const plan = [];
let unmatched = 0;
for (const p of flagged) {
  const src = nameToSource.get(p.name);
  if (!src) {
    console.error(`✗ ${p.name}  → หาไฟล์ต้นฉบับไม่เจอ (ข้าม)`);
    unmatched++;
    continue;
  }
  plan.push({ id: p.id, name: p.name, src });
}
if (unmatched) console.log(`\n(ข้าม ${unmatched} ชิ้นที่หาไฟล์ต้นฉบับไม่เจอ)\n`);

const todo = plan.slice(0, LIMIT);
console.log(`จะทำ ${todo.length} ชิ้น${LIMIT !== Infinity ? ` (จำกัดด้วย --limit ${LIMIT})` : ''}\n`);

if (dry) {
  for (const t of todo) console.log(`• (dry) ${t.name}  ←  ${path.relative(ROOT, t.src)}`);
  process.exit(0);
}

// ── ต่อเข้า Chrome จริงที่ล็อกอิน Canva ไว้แล้ว ──
let canvaBrowser;
try {
  canvaBrowser = await chromium.connectOverCDP('http://localhost:9222');
} catch {
  console.error(
    'ต่อเข้า Chrome (localhost:9222) ไม่ได้ — เปิด Chrome จริงด้วย remote debugging ก่อน แล้วล็อกอิน Canva\n' +
      'ดูวิธีใน scripts/canva-remove-bg.mjs',
  );
  process.exit(1);
}
const canvaCtx = canvaBrowser.contexts()[0];
const canvaPage = canvaCtx.pages()[0] || (await canvaCtx.newPage());

async function removeBgViaCanva(srcPath, outPath) {
  await canvaPage.goto('https://www.canva.com/features/background-remover/', {
    waitUntil: 'domcontentloaded',
  });
  await canvaPage.locator('input[type="file"]').first().setInputFiles(srcPath);
  const downloadBtn = canvaPage.getByText('ดาวน์โหลด', { exact: true });
  await downloadBtn.waitFor({ state: 'visible', timeout: 45000 });
  const downloadPromise = canvaPage.waitForEvent('download', { timeout: 15000 });
  await downloadBtn.click();
  const download = await downloadPromise;
  await download.saveAs(outPath);
}

// ── เปิดเบราว์เซอร์แยกต่างหากคุมหน้าแอดมิน (คนละตัวกับ Chrome ที่คุม Canva) ──
const adminBrowser = await chromium.launch({ headless: true });
const adminPage = await adminBrowser.newPage();
await adminPage.goto(`${BASE}/admin.html`, { waitUntil: 'networkidle' });
const searchInput = adminPage.locator('input[type="search"]');

async function updateImageViaAdmin(name, imgPath) {
  await searchInput.fill(name);
  await adminPage.waitForTimeout(200);

  const card = adminPage.locator(`div.relative:has(p[title="${name}"])`).first();
  await card.waitFor({ state: 'visible', timeout: 5000 });
  await card.getByRole('button', { name: 'แก้ไข', exact: true }).click();

  const nameInput = adminPage.locator('div:has(> label:text-is("3. ชื่อสินค้า")) input');
  await nameInput.waitFor({ state: 'visible' });
  const currentName = await nameInput.inputValue();
  if (currentName !== name) throw new Error(`เข้าฟอร์มผิดตัว (คาดว่า "${name}" แต่เจอ "${currentName}")`);

  await adminPage.locator('input[type="file"]').setInputFiles(imgPath);
  await adminPage.locator('img[alt="preview"]').waitFor({ state: 'visible', timeout: 5000 });

  // ปิดตัวตัดพื้นหลังฝั่งเว็บ — รูปที่ Canva ทำมาสะอาดอยู่แล้ว ไม่ต้องประมวลผลซ้ำ
  const cb = adminPage.locator('input[type="checkbox"]').first();
  if (await cb.isChecked()) await cb.click();

  const submitBtn = adminPage.locator('button[type="submit"]');
  await submitBtn.click();

  const notice = adminPage.locator('text=บันทึกการแก้ไขแล้ว');
  const errorBox = adminPage.locator('form div.bg-red-50').first();
  await Promise.race([
    notice.waitFor({ state: 'visible', timeout: 8000 }),
    errorBox.waitFor({ state: 'visible', timeout: 8000 }),
  ]).catch(() => {});

  if (!(await notice.isVisible().catch(() => false))) {
    const errText = await errorBox.textContent().catch(() => null);
    throw new Error(errText || 'ไม่พบ notice สำเร็จหลังกดบันทึก (timeout)');
  }

  await adminPage
    .locator('button[type="submit"]:not([disabled])')
    .waitFor({ state: 'visible', timeout: 10000 })
    .catch(() => {});
  await adminPage.waitForTimeout(300);
  await searchInput.fill('');
}

async function clearNeedsFix(id) {
  const res = await fetch(`${BASE}/api/products/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ needsFix: false }),
  });
  if (!res.ok) throw new Error(`ปลดธงไม่สำเร็จ: HTTP ${res.status}`);
}

const tmpDir = mkdtempSync(path.join(tmpdir(), 'dood-canva-fix-'));
let ok = 0, fail = 0;

for (const t of todo) {
  try {
    const outPath = path.join(tmpDir, `${t.id}.png`);
    await removeBgViaCanva(t.src, outPath);
    await updateImageViaAdmin(t.name, outPath);
    await clearNeedsFix(t.id);
    console.log(`✓ ${t.name}`);
    ok++;
  } catch (e) {
    console.error(`✗ ${t.name}  → ${e.message}`);
    fail++;
  }
}

rmSync(tmpDir, { recursive: true, force: true });
await adminBrowser.close();

console.log(`\nสรุป: สำเร็จ ${ok}${fail ? ` · ล้มเหลว ${fail}` : ''}${unmatched ? ` · ข้าม ${unmatched} (หาไฟล์ไม่เจอ)` : ''}`);
if (ok) console.log(`เช็กได้ที่ ${BASE}/admin.html`);
process.exit(fail ? 1 : 0);
