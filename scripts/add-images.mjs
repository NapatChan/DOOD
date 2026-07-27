// นำเข้าเสื้อผ้าแบบ "ยกล็อต" — โยน PNG เข้า catalog/<หมวด>/ แล้วสั่ง `npm run add`
//
// ตั้งชื่อไฟล์:  [เลขลำดับ_]ชื่อ__ราคา.png
//   เช่น  01_เสื้อขาว__590.png   → ลำดับ 1, ชื่อ "เสื้อขาว", ราคา 590
//         เสื้อดำ__640.png       → ชื่อ "เสื้อดำ", ราคา 640
//
// สคริปต์จะ trim ขอบโปร่ง + ดึงสีเฉลี่ย + คัดลอกไป src/assets/
// แล้ว "merge" เข้า catalog/products.json (คลังเดียวกับหน้าแอดมิน)
//   • สินค้าเดิม (id ตรงกัน) → อัปเดตชื่อ/ราคา/สี/รูป แต่ "คงค่า buyUrl และ style ไว้"
//   • สินค้าที่เพิ่มผ่านหน้าแอดมิน (id คนละแบบ) → ไม่ถูกแตะ
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { maybeRemoveBg } from './bg-util.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const IN = path.join(ROOT, 'catalog');
const OUT = path.join(ROOT, 'src/assets');
const PRODUCTS_JSON = path.join(IN, 'products.json');
const DEFAULT_PRICE = 590;

// โฟลเดอร์ใน catalog/  →  category key ภายในแอป (โฟลเดอร์ assets ใช้ชื่อเดียวกับ catalog)
const FOLDERS = { hats: 'hat', shirts: 'top', pants: 'pants' };

function parseFilename(file) {
  let base = file.replace(/\.[^.]+$/, '');
  let order = Number.POSITIVE_INFINITY;
  const om = base.match(/^(\d+)[_ ]+/);
  if (om) {
    order = parseInt(om[1], 10);
    base = base.slice(om[0].length);
  }
  let name = base.trim();
  let price = DEFAULT_PRICE;
  let hadPrice = false;
  const parts = base.split('__');
  if (parts.length >= 2 && /^\s*\d+\s*$/.test(parts[parts.length - 1])) {
    price = parseInt(parts.pop().trim(), 10);
    hadPrice = true;
    name = parts.join('__').trim();
  }
  return { name, price, order, hadPrice };
}

const toHex = (r, g, b) => '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');

// สีเฉลี่ยของเสื้อผ้า — นับเฉพาะพิกเซลทึบ (ข้ามพื้นโปร่ง ไม่งั้นได้สีดำเพี้ยน)
async function averageColor(buf) {
  const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
  const ch = info.channels;
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < data.length; i += ch) {
    const a = ch === 4 ? data[i + 3] : 255;
    if (a < 128) continue;
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    n += 1;
  }
  if (n === 0) return '#d4d4d4';
  return toHex(Math.round(r / n), Math.round(g / n), Math.round(b / n));
}

function readStore() {
  if (!fs.existsSync(PRODUCTS_JSON)) return { version: 1, products: [] };
  return JSON.parse(fs.readFileSync(PRODUCTS_JSON, 'utf8'));
}

const store = readStore();
const warnings = [];
let added = 0;
let updated = 0;

for (const [folder, cat] of Object.entries(FOLDERS)) {
  const dir = path.join(IN, folder);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    continue;
  }
  const files = fs.readdirSync(dir).filter((f) => /\.(png|webp)$/i.test(f));
  const parsed = files
    .map((f) => ({ file: f, ...parseFilename(f) }))
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'th'));

  const outDir = path.join(OUT, folder);
  fs.mkdirSync(outDir, { recursive: true });

  let i = 0;
  for (const p of parsed) {
    i += 1;
    const num = String(i).padStart(2, '0');
    const id = `${cat}-${num}`;
    const image = `${folder}/${num}.webp`;

    // ตัดพื้นหลังอัตโนมัติ (ข้ามถ้ารูปโปร่งอยู่แล้ว) → รูปดิบมีพื้นหลังก็โยนเข้ามาได้
    const srcBuf = fs.readFileSync(path.join(dir, p.file));
    const working = await maybeRemoveBg(srcBuf, 'auto');
    const trimmed = await sharp(working).trim({ threshold: 10 }).toBuffer();
    const color = await averageColor(trimmed);
    // เก็บเป็น WebP q85 — คมชัดแต่เล็กกว่า PNG ~10 เท่า (โหลด/ปัดลื่นกว่า)
    await sharp(trimmed).webp({ quality: 85, effort: 4 }).toFile(path.join(outDir, `${num}.webp`));

    const idx = store.products.findIndex((x) => x.id === id);
    if (idx >= 0) {
      // อัปเดตของเดิม — คง buyUrl / style ไว้
      const prev = store.products[idx];
      store.products[idx] = {
        ...prev,
        category: cat,
        name: p.name,
        price: p.price,
        color,
        image,
      };
      updated += 1;
    } else {
      store.products.push({
        id,
        category: cat,
        name: p.name,
        price: p.price,
        color,
        image,
        buyUrl: '',
        style: '',
      });
      added += 1;
    }
    if (!p.hadPrice) warnings.push(`${folder}/${p.file} → ไม่มีราคาในชื่อ ใช้ default ${DEFAULT_PRICE}`);
  }
}

fs.writeFileSync(PRODUCTS_JSON, JSON.stringify(store, null, 2) + '\n');

console.log(`\n✅ นำเข้าเสร็จ — เพิ่มใหม่ ${added} · อัปเดต ${updated}  (รวมในคลัง ${store.products.length} ชิ้น)`);
console.log('   → src/assets/  +  catalog/products.json');
console.log('   หมายเหตุ: สินค้าที่เพิ่มผ่านหน้าแอดมินไม่ถูกแตะ');
if (warnings.length) {
  console.log('\n⚠️  ข้อควรระวัง:');
  for (const w of warnings) console.log('   - ' + w);
}
