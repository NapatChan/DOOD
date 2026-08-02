// ย้ายข้อมูลสินค้า + รูป จากไฟล์ในโปรเจกต์ → Supabase (รันครั้งเดียว, รันซ้ำได้)
//   1) อ่าน catalog/products.json
//   2) อัปโหลดรูปจาก src/assets/ → Supabase Storage (ชื่อไฟล์มีเวอร์ชัน)
//   3) upsert แถวลงตาราง products (image path → image_url เต็ม, sort_order ตามลำดับเดิม)
// ใช้ service_role key จาก .env (ฝั่งเซิร์ฟเวอร์เท่านั้น)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const ASSETS = path.join(ROOT, 'src/assets');
const PRODUCTS_JSON = path.join(ROOT, 'catalog/products.json');
const BUCKET = 'products';

// ---------- อ่าน .env ----------
function loadEnv() {
  const env = {};
  const txt = fs.readFileSync(path.join(ROOT, '.env'), 'utf8');
  for (const line of txt.split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.+?)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return env;
}
const env = loadEnv();
const SB_URL = env.VITE_SUPABASE_URL;
const SVC = env.SUPABASE_SERVICE_KEY;
if (!SB_URL || !SVC) throw new Error('ขาด VITE_SUPABASE_URL หรือ SUPABASE_SERVICE_KEY ใน .env');

const stamp = Date.now().toString(36); // เวอร์ชันไฟล์รูป (กัน CDN cache รูปเก่า)

async function uploadImage(relPath, id) {
  const buf = fs.readFileSync(path.join(ASSETS, relPath));
  const objectPath = `${id}-${stamp}.webp`;
  const res = await fetch(`${SB_URL}/storage/v1/object/${BUCKET}/${objectPath}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SVC}`,
      'Content-Type': 'image/webp',
      'x-upsert': 'true',
    },
    body: buf,
  });
  if (!res.ok) throw new Error(`upload ${relPath} ล้มเหลว: ${res.status} ${await res.text()}`);
  return `${SB_URL}/storage/v1/object/public/${BUCKET}/${objectPath}`;
}

async function upsertRows(rows) {
  const res = await fetch(`${SB_URL}/rest/v1/products`, {
    method: 'POST',
    headers: {
      apikey: SVC,
      Authorization: `Bearer ${SVC}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`upsert แถวล้มเหลว: ${res.status} ${await res.text()}`);
}

async function main() {
  const products = JSON.parse(fs.readFileSync(PRODUCTS_JSON, 'utf8')).products;
  console.log(`เริ่มย้าย ${products.length} ชิ้น...`);

  const rows = [];
  let i = 0;
  for (const p of products) {
    const image_url = await uploadImage(p.image, p.id);
    rows.push({
      id: p.id,
      category: p.category,
      name: p.name,
      price: p.price ?? 0,
      color: p.color ?? '#d4d4d4',
      image_url,
      buy_url: p.buyUrl ?? '',
      style: p.style ?? '',
      gender: p.gender ?? 'unisex',
      fit: p.fit ?? null,
      aspect: p.aspect ?? null,
      scale: p.scale ?? null,
      variant_group: p.group ?? null,
      color_name: p.colorName ?? null,
      sort_order: i,
    });
    i += 1;
    process.stdout.write(`\r  อัปโหลดรูป ${i}/${products.length}`);
  }
  console.log('');

  await upsertRows(rows);
  console.log(`✅ เสร็จ — อัปโหลด ${rows.length} รูป + upsert ${rows.length} แถว`);
}

main().catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});
