// สแนปช็อต: ดึง catalog จาก Supabase (แหล่งจริง) → เขียนทับ catalog/products.json + รูปใน src/assets
//   รันเมื่อไหร่: หลังแก้สินค้าในแอดมินเยอะ ๆ แล้วอยากอัปเดตสแนปช็อต fallback ก่อน commit/deploy
//   ทำไมต้องมี: ถ้า Supabase ล่ม เว็ปยัง fallback มาอ่าน snapshot ที่ bundle มาได้ (cache ชั้น ③)
//   ใช้:  npm run backup
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hasSupabase, dbSelect, storagePathFromUrl, downloadObject } from './supabase.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const ASSETS = path.join(ROOT, 'src/assets');
const PRODUCTS_JSON = path.join(ROOT, 'catalog/products.json');
const FOLDER = { hat: 'hats', top: 'shirts', pants: 'pants' };

async function main() {
  if (!hasSupabase) throw new Error('ยังไม่ตั้งค่า Supabase ใน .env');

  const rows = await dbSelect('select=*&is_active=eq.true&order=sort_order');
  console.log(`ดึง ${rows.length} ชิ้นจาก Supabase...`);

  const products = [];
  const keep = new Set(); // path รูปที่ยังใช้ — ไว้ลบไฟล์กำพร้าท้ายสุด
  let i = 0;
  for (const row of rows) {
    const folder = FOLDER[row.category] || 'misc';
    const rel = `${folder}/${row.id}.webp`;
    keep.add(rel);
    // โหลดรูปจาก Storage → เขียนลง src/assets (ทับของเดิม)
    const op = storagePathFromUrl(row.image_url);
    if (op) {
      const buf = await downloadObject(op);
      const abs = path.join(ASSETS, rel);
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, buf);
    }
    const p = {
      id: row.id,
      category: row.category,
      name: row.name,
      price: row.price ?? 0,
      color: row.color ?? '#d4d4d4',
      image: rel,
      buyUrl: row.buy_url || '',
      style: row.style || '',
    };
    if (row.gender && row.gender !== 'unisex') p.gender = row.gender;
    if (row.fit) p.fit = row.fit;
    if (row.aspect != null) p.aspect = row.aspect;
    if (row.scale != null) p.scale = row.scale;
    if (row.variant_group) p.group = row.variant_group;
    if (row.color_name) p.colorName = row.color_name;
    products.push(p);
    i += 1;
    process.stdout.write(`\r  โหลดรูป ${i}/${rows.length}`);
  }
  console.log('');

  // ลบไฟล์กำพร้า — webp ในโฟลเดอร์หมวดที่ไม่อยู่ใน catalog แล้ว (snapshot จะตรงกับ Supabase เป๊ะ)
  let removed = 0;
  for (const folder of new Set(Object.values(FOLDER))) {
    const dir = path.join(ASSETS, folder);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      if (f.endsWith('.webp') && !keep.has(`${folder}/${f}`)) {
        fs.rmSync(path.join(dir, f));
        removed += 1;
      }
    }
  }

  fs.writeFileSync(PRODUCTS_JSON, JSON.stringify({ version: 1, products }, null, 2) + '\n');
  console.log(
    `✅ สแนปช็อตเสร็จ — เขียน ${products.length} ชิ้นลง catalog/products.json + รูปใน src/assets` +
      (removed ? ` (ลบไฟล์กำพร้า ${removed})` : ''),
  );
}

main().catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});
