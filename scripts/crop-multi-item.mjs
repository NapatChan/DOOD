// ครอปรูป 1 ใบที่มีสินค้าหลายชิ้นอยู่ในเฟรมเดียว → แยกเป็นไฟล์ต่อชิ้น
//
// ใช้โดย agent dood-admin-filler: agent มองรูปด้วยตาตัวเอง (vision) แล้วประเมิน
// กรอบสี่เหลี่ยม (bounding box) ของแต่ละชิ้น ส่งพิกัดมาให้สคริปต์นี้ครอปจริง
//
// วิธีใช้:
//   node scripts/crop-multi-item.mjs <รูปต้นฉบับ> <boxesJson> <โฟลเดอร์ผลลัพธ์>
//
// boxesJson = JSON array ของกรอบ เช่น:
//   '[{"name":"hat-red","left":0,"top":0,"width":0.5,"height":1},
//     {"name":"hat-blue","left":0.5,"top":0,"width":0.5,"height":1}]'
//
// ค่า left/top/width/height: ถ้าทุกค่า <= 1 ถือเป็นสัดส่วนของรูป (0-1),
// ถ้ามีค่าไหน > 1 ถือว่าทั้งหมดเป็นพิกเซลจริง
//
// ผลลัพธ์: <โฟลเดอร์ผลลัพธ์>/<name>.png ต่อกรอบ (trim ขอบโปร่ง/ขอบเนียนสีเดียวกันออกให้ด้วย)

import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const [srcImage, boxesJsonArg, outDir] = process.argv.slice(2);

if (!srcImage || !boxesJsonArg || !outDir) {
  console.error(
    'ใช้: node scripts/crop-multi-item.mjs <รูปต้นฉบับ> <boxesJson> <โฟลเดอร์ผลลัพธ์>',
  );
  process.exit(1);
}

const boxes = JSON.parse(boxesJsonArg);
if (!Array.isArray(boxes) || boxes.length === 0) {
  console.error('boxesJson ต้องเป็น array ที่มีอย่างน้อย 1 กรอบ');
  process.exit(1);
}

await mkdir(outDir, { recursive: true });

const img = sharp(srcImage);
const meta = await img.metadata();
const W = meta.width;
const H = meta.height;

const isFraction = boxes.every(
  (b) => b.left <= 1 && b.top <= 1 && b.width <= 1 && b.height <= 1,
);

let ok = 0;
for (const b of boxes) {
  if (!b.name) {
    console.error('✗ กรอบไม่มี "name"');
    continue;
  }
  const left = Math.max(0, Math.round(isFraction ? b.left * W : b.left));
  const top = Math.max(0, Math.round(isFraction ? b.top * H : b.top));
  const width = Math.min(W - left, Math.round(isFraction ? b.width * W : b.width));
  const height = Math.min(H - top, Math.round(isFraction ? b.height * H : b.height));

  if (width <= 0 || height <= 0) {
    console.error(`✗ ${b.name}: กรอบไม่ถูกต้อง (width=${width}, height=${height})`);
    continue;
  }

  const outPath = path.join(outDir, `${b.name}.png`);
  // หมายเหตุ: .extract().trim() แบบ chain เดียวกันบาง version ของ sharp จะพัง
  // (extract_area: bad extract area) ต้อง extract ก่อนเป็น buffer แล้วค่อย trim แยกอีกสเต็ป
  const extracted = await sharp(srcImage)
    .extract({ left, top, width, height })
    .png()
    .toBuffer();
  await sharp(extracted).trim().png().toFile(outPath);
  console.log(`✓ ${b.name}.png  ← [${left},${top},${width}x${height}]`);
  ok++;
}

console.log(`\nครอปสำเร็จ ${ok}/${boxes.length} ชิ้น → ${outDir}/`);
process.exit(ok === boxes.length ? 0 : 1);
