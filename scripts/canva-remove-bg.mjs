// ลบพื้นหลังรูปผ่าน Canva Background Remover จริง (https://www.canva.com/features/background-remover/)
// ต่อเข้า Chrome ที่ล็อกอิน Canva ไว้แล้วผ่าน CDP (ไม่ใช่เบราว์เซอร์ที่ Playwright เปิดเอง — Canva
// บล็อกเบราว์เซอร์ที่ automation เปิดตรงด้วย CAPTCHA วนไม่รู้จบ ต้องต่อเข้า Chrome จริงที่คนล็อกอินเอง)
//
// ก่อนใช้ครั้งแรก (หรือ session หมดอายุ):
//   1. เปิด Chrome จริงด้วย remote debugging:
//      open -na "Google Chrome" --args --remote-debugging-port=9222 \
//        --user-data-dir="$HOME/.canva-chrome-profile" "https://www.canva.com/login"
//   2. ล็อกอิน Canva เองในหน้าต่างที่เปิดขึ้นมา (ผ่าน CAPTCHA ได้ปกติเพราะเป็น Chrome จริง)
//   3. ปล่อย Chrome หน้าต่างนั้นเปิดค้างไว้ (ไม่ต้องปิด) — สคริปต์นี้จะต่อเข้าไปควบคุม
//
// วิธีใช้:
//   node scripts/canva-remove-bg.mjs <รูปต้นฉบับ> <ไฟล์ผลลัพธ์.png>
//   node scripts/canva-remove-bg.mjs new-products/xxx/img.jpg new-products/xxx/img-nobg.png

import { chromium } from 'playwright';
import path from 'node:path';
import { existsSync } from 'node:fs';

const [srcPath, outPath] = process.argv.slice(2);

if (!srcPath || !outPath) {
  console.error('ใช้: node scripts/canva-remove-bg.mjs <รูปต้นฉบับ> <ไฟล์ผลลัพธ์.png>');
  process.exit(1);
}
if (!existsSync(srcPath)) {
  console.error(`หาไฟล์ไม่เจอ: ${srcPath}`);
  process.exit(1);
}

let browser;
try {
  browser = await chromium.connectOverCDP('http://localhost:9222');
} catch {
  console.error(
    'ต่อเข้า Chrome ไม่ได้ (localhost:9222) — เปิด Chrome จริงด้วย remote debugging ก่อน:\n' +
      '  open -na "Google Chrome" --args --remote-debugging-port=9222 ' +
      '--user-data-dir="$HOME/.canva-chrome-profile" "https://www.canva.com/login"\n' +
      'แล้วล็อกอิน Canva เองในหน้าต่างนั้น (ครั้งเดียว) ก่อนรันสคริปต์นี้ใหม่',
  );
  process.exit(1);
}

const context = browser.contexts()[0];
const page = context.pages()[0] || (await context.newPage());

await page.goto('https://www.canva.com/features/background-remover/', {
  waitUntil: 'domcontentloaded',
});

await page.locator('input[type="file"]').first().setInputFiles(path.resolve(srcPath));

// รอปุ่มดาวน์โหลดโผล่ (แปลว่าประมวลผลเสร็จ) — ใช้เวลาสองสามวินาทีถึงสิบกว่าวินาทีแล้วแต่ขนาดรูป
const downloadBtn = page.getByText('ดาวน์โหลด', { exact: true });
await downloadBtn.waitFor({ state: 'visible', timeout: 45000 });

const downloadPromise = page.waitForEvent('download', { timeout: 15000 });
await downloadBtn.click();
const download = await downloadPromise;
await download.saveAs(path.resolve(outPath));

console.log(`✓ ลบพื้นหลังแล้ว → ${outPath}`);
process.exit(0);
