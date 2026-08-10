// เปิดเบราว์เซอร์ให้ล็อกอิน Canva ครั้งเดียว แล้วเซฟ session ไว้ในเครื่อง (.canva-profile/)
// สคริปต์อื่น (canva-remove-bg.mjs) จะใช้ session เดิมนี้ต่อ ไม่ต้องล็อกอินซ้ำ
// จนกว่า session จะหมดอายุ — ถ้าหมดอายุแล้วรันไฟล์นี้ใหม่อีกรอบก็พอ
//
// วิธีใช้: node scripts/canva-login.mjs
// เปิดเบราว์เซอร์ค้างไว้ให้ล็อกอินเอง สคริปต์จะรอตรวจจับอัตโนมัติว่าล็อกอินสำเร็จ
// (เช็ก URL เปลี่ยนออกจากหน้า login) แล้วปิดเบราว์เซอร์ + เซฟ session ให้เอง — ไม่ต้องพิมพ์อะไรใน terminal

import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';

const PROFILE_DIR = fileURLToPath(new URL('../.canva-profile/', import.meta.url));

const context = await chromium.launchPersistentContext(PROFILE_DIR, {
  headless: false,
  viewport: { width: 1280, height: 900 },
});
const page = context.pages()[0] || (await context.newPage());
await page.goto('https://www.canva.com/login', { waitUntil: 'domcontentloaded' });

console.log('เบราว์เซอร์เปิดแล้ว — ล็อกอิน Canva ให้เสร็จในหน้าต่างที่เปิดขึ้นมา');
console.log('รอตรวจจับอัตโนมัติว่าล็อกอินสำเร็จ (สูงสุด 5 นาที)...');

const deadline = Date.now() + 5 * 60 * 1000;
let loggedIn = false;
while (Date.now() < deadline) {
  await page.waitForTimeout(2000);
  const url = page.url();
  if (!/\/login/i.test(url) && /canva\.com/i.test(url)) {
    loggedIn = true;
    break;
  }
}

if (loggedIn) {
  console.log('ล็อกอินสำเร็จแล้ว — เซฟ session ที่ .canva-profile/');
} else {
  console.log('หมดเวลารอ (5 นาที) ยังไม่เห็นว่าล็อกอินสำเร็จ — ปิดเบราว์เซอร์ก่อน ลองรันใหม่ได้');
}

await context.close();
process.exit(loggedIn ? 0 : 1);
