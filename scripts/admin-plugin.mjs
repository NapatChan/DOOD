// Vite dev plugin: REST API สำหรับหน้าแอดมิน (ทำงานเฉพาะตอน dev — apply:'serve')
//
// จัดการ catalog/products.json + รูปใน src/assets/ เป็น "คลังเดียว"
//   GET    /api/products         → รายการสินค้าทั้งหมด
//   POST   /api/products         → เพิ่มสินค้า (แนบรูป base64) — trim + ดึงสี + เขียนไฟล์
//   PUT    /api/products/:id      → แก้ไขสินค้า (เปลี่ยนรูปได้ ไม่บังคับ)
//   DELETE /api/products/:id      → ลบสินค้า + ลบไฟล์รูป
//
// วันขึ้น backend จริง: ย้าย logic นี้ไปเป็น API เซิร์ฟเวอร์ + object storage
// สัญญา (endpoint/รูปแบบข้อมูล) เหมือนเดิม → ฝั่ง client (src/admin/api.ts) แทบไม่ต้องแก้
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { maybeRemoveBg } from './bg-util.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const PRODUCTS_JSON = path.join(ROOT, 'catalog/products.json');
const ASSETS = path.join(ROOT, 'src/assets');

// category → โฟลเดอร์ใน src/assets
const FOLDER = { hat: 'hats', top: 'shirts', pants: 'pants' };
const CATEGORIES = Object.keys(FOLDER);

// ---------- helpers: อ่าน/เขียน products.json ----------
function readStore() {
  if (!fs.existsSync(PRODUCTS_JSON)) return { version: 1, products: [] };
  return JSON.parse(fs.readFileSync(PRODUCTS_JSON, 'utf8'));
}
function writeStore(store) {
  fs.writeFileSync(PRODUCTS_JSON, JSON.stringify(store, null, 2) + '\n');
}

// ---------- helpers: รูป ----------
const toHex = (r, g, b) => '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');

// สีเฉลี่ยของเสื้อผ้า — นับเฉพาะพิกเซลทึบ (ข้ามพื้นโปร่ง)
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

// รับ base64 (อาจมี prefix data:) → Buffer
function decodeImage(base64) {
  const comma = base64.indexOf(',');
  const raw = base64.startsWith('data:') && comma >= 0 ? base64.slice(comma + 1) : base64;
  return Buffer.from(raw, 'base64');
}

// ตัดพื้นหลัง (ตามโหมด) + trim + สีเฉลี่ย + WebP → คืน { buffer, color }
//   removeBg: 'auto' (ตัดถ้ายังไม่โปร่ง) | 'on' (ตัดเสมอ) | 'off' (ไม่ตัด)
async function processImage(base64, removeBg = 'auto') {
  const input = decodeImage(base64);
  const working = await maybeRemoveBg(input, removeBg);
  // เก็บเป็น WebP q85 — คมชัดแต่เล็กกว่า PNG ~10 เท่า (โหลด/ปัดลื่นกว่า)
  const buffer = await sharp(working).trim({ threshold: 10 }).webp({ quality: 85, effort: 4 }).toBuffer();
  const color = await averageColor(buffer);
  return { buffer, color };
}

function genId(category) {
  return `${category}-${Date.now().toString(36)}${Math.floor(Math.random() * 1296)
    .toString(36)
    .padStart(2, '0')}`;
}

function imagePathFor(category, id) {
  return `${FOLDER[category]}/${id}.webp`; // relative under src/assets
}

function deleteImageFile(relPath) {
  if (!relPath) return;
  const abs = path.join(ASSETS, relPath);
  if (fs.existsSync(abs)) fs.rmSync(abs);
}

async function writeImageFile(category, id, buffer) {
  const rel = imagePathFor(category, id);
  const abs = path.join(ASSETS, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, buffer);
  return rel;
}

// ---------- helpers: HTTP ----------
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > 30 * 1024 * 1024) {
        reject(new Error('ไฟล์ใหญ่เกินไป (จำกัด 30MB)'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
function sendJson(res, status, obj) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(obj));
}

function validateFields(body, { partial } = {}) {
  const errors = [];
  if (body.category !== undefined && !CATEGORIES.includes(body.category)) {
    errors.push('ประเภทสินค้าไม่ถูกต้อง');
  }
  if (!partial && body.category === undefined) errors.push('ต้องเลือกประเภทสินค้า');
  if (body.name !== undefined && !String(body.name).trim()) errors.push('ต้องตั้งชื่อสินค้า');
  if (!partial && body.name === undefined) errors.push('ต้องตั้งชื่อสินค้า');
  if (body.price !== undefined) {
    const p = Number(body.price);
    if (!Number.isFinite(p) || p < 0) errors.push('ราคาต้องเป็นตัวเลข 0 ขึ้นไป');
  } else if (!partial) {
    errors.push('ต้องใส่ราคา');
  }
  return errors;
}

export function adminApiPlugin() {
  return {
    name: 'dood-admin-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = (req.url || '').split('?')[0];
        if (!url.startsWith('/api/products')) return next();

        try {
          // GET /api/products
          if (req.method === 'GET' && url === '/api/products') {
            return sendJson(res, 200, readStore());
          }

          // POST /api/products
          if (req.method === 'POST' && url === '/api/products') {
            const body = JSON.parse((await readBody(req)).toString('utf8') || '{}');
            const errors = validateFields(body);
            if (!body.imageBase64) errors.push('ต้องแนบไฟล์รูป');
            if (errors.length) return sendJson(res, 400, { errors });

            let processed;
            try {
              processed = await processImage(body.imageBase64, body.removeBg || 'auto');
            } catch (e) {
              return sendJson(res, 400, { errors: [e.message] });
            }

            const store = readStore();
            const id = genId(body.category);
            const image = await writeImageFile(body.category, id, processed.buffer);
            const product = {
              id,
              category: body.category,
              name: String(body.name).trim(),
              price: Number(body.price),
              color: processed.color,
              image,
              buyUrl: (body.buyUrl || '').trim(),
              style: body.style || '',
            };
            store.products.push(product);
            writeStore(store);
            return sendJson(res, 201, { product });
          }

          // /api/products/:id  (PUT | DELETE)
          const m = url.match(/^\/api\/products\/([^/]+)$/);
          if (m) {
            const id = decodeURIComponent(m[1]);
            const store = readStore();
            const idx = store.products.findIndex((p) => p.id === id);
            if (idx < 0) return sendJson(res, 404, { errors: ['ไม่พบสินค้านี้'] });
            const current = store.products[idx];

            if (req.method === 'DELETE') {
              deleteImageFile(current.image);
              store.products.splice(idx, 1);
              writeStore(store);
              return sendJson(res, 200, { ok: true });
            }

            if (req.method === 'PUT') {
              const body = JSON.parse((await readBody(req)).toString('utf8') || '{}');
              const errors = validateFields(body, { partial: true });
              if (errors.length) return sendJson(res, 400, { errors });

              const updated = { ...current };
              if (body.name !== undefined) updated.name = String(body.name).trim();
              if (body.price !== undefined) updated.price = Number(body.price);
              if (body.buyUrl !== undefined) updated.buyUrl = String(body.buyUrl).trim();
              if (body.style !== undefined) updated.style = body.style || '';

              const newCategory = body.category && body.category !== current.category ? body.category : null;

              // เปลี่ยนรูปใหม่ หรือย้ายหมวด → ต้องเขียนไฟล์ใหม่
              if (body.imageBase64 || newCategory) {
                const category = newCategory || current.category;
                let processed;
                if (body.imageBase64) {
                  try {
                    processed = await processImage(body.imageBase64, body.removeBg || 'auto');
                  } catch (e) {
                    return sendJson(res, 400, { errors: [e.message] });
                  }
                }
                // ลบไฟล์เดิมก่อน (เปลี่ยนที่อยู่)
                deleteImageFile(current.image);
                if (processed) {
                  updated.color = processed.color;
                  updated.image = await writeImageFile(category, id, processed.buffer);
                } else {
                  // ย้ายหมวดโดยใช้รูปเดิม
                  const oldAbs = path.join(ASSETS, current.image);
                  const buf = fs.existsSync(oldAbs) ? fs.readFileSync(oldAbs) : null;
                  if (buf) updated.image = await writeImageFile(category, id, buf);
                }
                updated.category = category;
              }

              store.products[idx] = updated;
              writeStore(store);
              return sendJson(res, 200, { product: updated });
            }
          }

          return sendJson(res, 404, { errors: ['ไม่พบเส้นทางนี้'] });
        } catch (e) {
          return sendJson(res, 500, { errors: [String(e.message || e)] });
        }
      });
    },
  };
}
