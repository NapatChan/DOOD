// worker แยกโปรเซส: ตัดพื้นหลังด้วย @imgly แล้วเขียนผลออก
//
// รันเป็น child process เท่านั้น (spawn จาก admin-plugin / add-images) เพื่อ "กันชน":
// @imgly มี sharp/libvips ของตัวเอง ถ้าโหลดในโปรเซสเดียวกับ sharp ของเราจะเสี่ยง crash
// → แยกมารันที่นี่ พอเสร็จโปรเซสจบ libvips ของ @imgly ก็ถูกปลดไป ไม่ชนกับของหลัก
//
// ใช้:  node scripts/remove-bg.mjs <inputPath> <outputPath>
import fs from 'node:fs';
import { removeBackground } from '@imgly/background-removal-node';

const [, , inPath, outPath] = process.argv;
if (!inPath || !outPath) {
  console.error('usage: node remove-bg.mjs <in> <out>');
  process.exit(2);
}

try {
  const blob = await removeBackground(inPath);
  const buf = Buffer.from(await blob.arrayBuffer());
  fs.writeFileSync(outPath, buf);
  process.exit(0);
} catch (e) {
  console.error(String(e?.message || e));
  process.exit(1);
}
