import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const TARGET = process.env.URL || 'http://localhost:5173/';
// fileURLToPath ถอด %20 (space) ในพาธให้ถูกต้อง
const OUT = fileURLToPath(new URL('../scratch-shots/', import.meta.url));

// ขนาดจอที่ทดสอบ: เล็กสุด → แท็บเล็ต
const VIEWPORTS = [
  { name: 'iphone-se', width: 320, height: 568 },
  { name: 'iphone-12', width: 390, height: 844 },
  { name: 'pixel-7', width: 412, height: 915 },
  { name: 'ipad-mini', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 800 },
];

const browser = await chromium.launch();
let failures = 0;

for (const vp of VIEWPORTS) {
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
  await page.goto(TARGET, { waitUntil: 'networkidle' });

  // เช็ค horizontal overflow: เนื้อห้ากว้างเกินจอไหม
  const { scrollW, clientW } = await page.evaluate(() => ({
    scrollW: document.documentElement.scrollWidth,
    clientW: document.documentElement.clientWidth,
  }));
  const overflow = scrollW - clientW;
  const ok = overflow <= 1; // เผื่อ rounding 1px
  if (!ok) failures++;

  console.log(
    `${ok ? '✅' : '❌'} ${vp.name.padEnd(11)} ${vp.width}px  scrollW=${scrollW} clientW=${clientW}  overflowX=${overflow}px`,
  );

  await page.screenshot({ path: `${OUT}${vp.name}.png` });
  await page.close();
}

await browser.close();
console.log(failures === 0 ? '\nPASS: ไม่มี horizontal overflow ทุกจอ' : `\nFAIL: ${failures} จอมีปัญหา`);
process.exit(failures === 0 ? 0 : 1);