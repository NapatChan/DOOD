// Vite dev plugin: REST API สำหรับหน้าแอดมิน (ทำงานเฉพาะตอน dev — apply:'serve')
//
// เขียนขึ้น Supabase โดยตรง (DB + Storage) — แหล่งข้อมูลจริงของเว็ป
//   GET    /api/products         → รายการสินค้า active ทั้งหมด (จาก DB)
//   POST   /api/products         → เพิ่มสินค้า (แนบรูป base64) — trim + ตัดพื้นหลัง + ดึงสี → อัปโหลด Storage + insert DB
//   PUT    /api/products/:id      → แก้ไข (เปลี่ยนรูปได้: อัปโหลดไฟล์เวอร์ชันใหม่ + ลบเก่า)
//   DELETE /api/products/:id      → soft-delete (is_active=false) — เก็บไฟล์รูปไว้ (กันลุคที่บันทึกไว้พัง)
//
// รูปเก็บใน Storage แบบ path แบน: `${id}-${stamp}.webp` (stamp = เวอร์ชัน กัน CDN cache รูปเก่า)
// สแนปช็อตในเครื่อง (catalog/products.json + src/assets) sync ด้วย `npm run backup` ไว้เป็น fallback
import sharp from 'sharp';
import { maybeRemoveBg } from './bg-util.mjs';
import {
  hasSupabase,
  dbSelect,
  dbInsert,
  dbUpdate,
  uploadObject,
  deleteObject,
  downloadObject,
  storagePathFromUrl,
} from './supabase.mjs';

const CATEGORIES = ['hat', 'top', 'pants'];
const GENDERS = ['male', 'female', 'unisex'];
const normGender = (g) => (GENDERS.includes(g) ? g : 'unisex');
// ตัวคูณขนาดรายชิ้น — จำกัดช่วง 0.3–2, ปัด 2 ตำแหน่ง (undefined/1 = ปกติ)
function normScale(s) {
  const n = Number(s);
  if (!Number.isFinite(n)) return undefined;
  return Math.round(Math.min(2, Math.max(0.3, n)) * 100) / 100;
}

// สัดส่วนรูป กว้าง/สูง (ปัด 2 ตำแหน่ง) — ใช้สมดุลขนาดท่อนล่างทรงสั้น
async function imageAspect(buffer) {
  const m = await sharp(buffer).metadata();
  return Math.round((m.width / m.height) * 100) / 100;
}
// ทรงท่อนล่าง: เดาจากสัดส่วนรูป (กว้างกว่าสูง = กระโปรง/ขาสั้น = short)
async function autoFit(buffer) {
  return (await imageAspect(buffer)) > 0.85 ? 'short' : 'long';
}
// คืนทรงของสินค้า — เฉพาะหมวด pants เท่านั้น (override 'long'/'short' > auto)
async function resolveFit(buffer, category, override) {
  if (category !== 'pants') return undefined;
  if (override === 'long' || override === 'short') return override;
  return autoFit(buffer); // 'auto' หรือไม่ระบุ → เดาเอง
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

// object path ใน Storage: id + เวอร์ชัน (เปลี่ยนทุกครั้งที่เปลี่ยนรูป → CDN ไม่คืนรูปเก่า)
function objectPathFor(id) {
  return `${id}-${Date.now().toString(36)}.webp`;
}

// ---------- map DB row ↔ รูปแบบที่แอดมิน UI ใช้ ----------
// แอดมินคาดหวัง field `image` (URL), `buyUrl` — DB ใช้ `image_url`, `buy_url`
function toAdminProduct(row) {
  const p = {
    id: row.id,
    category: row.category,
    name: row.name,
    price: row.price,
    color: row.color,
    image: row.image_url,
    buyUrl: row.buy_url || '',
    style: row.style || '',
    gender: row.gender || 'unisex',
  };
  if (row.fit) p.fit = row.fit;
  if (row.aspect != null) p.aspect = row.aspect;
  if (row.scale != null) p.scale = row.scale;
  if (row.variant_group) p.group = row.variant_group;
  if (row.color_name) p.colorName = row.color_name;
  return p;
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

// sort_order ถัดไป = มากสุด + 1 (ต่อท้ายรายการ)
async function nextSortOrder() {
  const rows = await dbSelect('select=sort_order&order=sort_order.desc.nullslast&limit=1');
  const max = rows[0]?.sort_order;
  return Number.isFinite(max) ? max + 1 : 0;
}

export function adminApiPlugin() {
  return {
    name: 'dood-admin-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = (req.url || '').split('?')[0];
        if (!url.startsWith('/api/products')) return next();

        if (!hasSupabase) {
          return sendJson(res, 500, {
            errors: ['ยังไม่ได้ตั้งค่า Supabase ใน .env (VITE_SUPABASE_URL + SUPABASE_SERVICE_KEY)'],
          });
        }

        try {
          // GET /api/products — รายการ active ทั้งหมด
          if (req.method === 'GET' && url === '/api/products') {
            const rows = await dbSelect('select=*&is_active=eq.true&order=sort_order');
            return sendJson(res, 200, { version: 1, products: rows.map(toAdminProduct) });
          }

          // POST /api/products — เพิ่มสินค้า
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

            const id = genId(body.category);
            const image_url = await uploadObject(objectPathFor(id), processed.buffer);
            const row = {
              id,
              category: body.category,
              name: String(body.name).trim(),
              price: Number(body.price),
              color: processed.color,
              image_url,
              buy_url: (body.buyUrl || '').trim(),
              style: body.style || '',
              gender: normGender(body.gender),
              fit: (await resolveFit(processed.buffer, body.category, body.fit)) || null,
              aspect: body.category === 'pants' ? await imageAspect(processed.buffer) : null,
              scale: null,
              variant_group: (body.group || '').trim() || null,
              color_name: (body.colorName || '').trim() || null,
              sort_order: await nextSortOrder(),
              is_active: true,
            };
            const scale = normScale(body.scale);
            if (scale && scale !== 1) row.scale = scale;

            const inserted = await dbInsert(row);
            return sendJson(res, 201, { product: toAdminProduct(inserted) });
          }

          // /api/products/:id  (PUT | DELETE)
          const m = url.match(/^\/api\/products\/([^/]+)$/);
          if (m) {
            const id = decodeURIComponent(m[1]);
            const rows = await dbSelect(`select=*&id=eq.${encodeURIComponent(id)}`);
            const current = rows[0];
            if (!current) return sendJson(res, 404, { errors: ['ไม่พบสินค้านี้'] });

            if (req.method === 'DELETE') {
              // soft-delete — ซ่อนจาก catalog แต่เก็บไฟล์รูปไว้ (ลุคที่ลูกค้าบันทึกอาจอ้างถึง)
              await dbUpdate(id, { is_active: false });
              return sendJson(res, 200, { ok: true });
            }

            if (req.method === 'PUT') {
              const body = JSON.parse((await readBody(req)).toString('utf8') || '{}');
              const errors = validateFields(body, { partial: true });
              if (errors.length) return sendJson(res, 400, { errors });

              const patch = {};
              if (body.name !== undefined) patch.name = String(body.name).trim();
              if (body.price !== undefined) patch.price = Number(body.price);
              if (body.buyUrl !== undefined) patch.buy_url = String(body.buyUrl).trim();
              if (body.style !== undefined) patch.style = body.style || '';
              if (body.gender !== undefined) patch.gender = normGender(body.gender);
              if (body.group !== undefined) patch.variant_group = String(body.group).trim() || null;
              if (body.colorName !== undefined) patch.color_name = String(body.colorName).trim() || null;
              if (body.scale !== undefined) {
                const s = normScale(body.scale);
                patch.scale = s && s !== 1 ? s : null;
              }

              const newCategory =
                body.category && body.category !== current.category ? body.category : null;
              if (newCategory) patch.category = newCategory;
              const category = newCategory || current.category;

              // เปลี่ยนรูปใหม่ → อัปโหลดไฟล์เวอร์ชันใหม่ + ลบไฟล์เก่า (Storage path แบน → เปลี่ยนหมวดไม่ต้องย้ายรูป)
              let workBuffer = null;
              if (body.imageBase64) {
                let processed;
                try {
                  processed = await processImage(body.imageBase64, body.removeBg || 'auto');
                } catch (e) {
                  return sendJson(res, 400, { errors: [e.message] });
                }
                workBuffer = processed.buffer;
                patch.image_url = await uploadObject(objectPathFor(id), workBuffer);
                patch.color = processed.color;
                await deleteObject(storagePathFromUrl(current.image_url));
              }

              // ทรงท่อนล่าง + สัดส่วน — เฉพาะ pants (ต้องมี buffer; ถ้าไม่มีรูปใหม่แต่จำเป็น → โหลดรูปเดิมจาก Storage)
              if (category === 'pants') {
                const needAspect =
                  body.imageBase64 || newCategory || current.aspect == null;
                const needFit =
                  body.fit === 'auto' || body.imageBase64 || newCategory;
                if ((needAspect || needFit) && !workBuffer) {
                  const op = storagePathFromUrl(patch.image_url || current.image_url);
                  if (op) workBuffer = await downloadObject(op);
                }
                if (body.fit === 'long' || body.fit === 'short') {
                  patch.fit = body.fit;
                } else if (needFit && workBuffer) {
                  patch.fit = await autoFit(workBuffer);
                }
                if (needAspect && workBuffer) patch.aspect = await imageAspect(workBuffer);
              } else if (newCategory) {
                // ย้ายออกจาก pants → เคลียร์ fit/aspect
                patch.fit = null;
                patch.aspect = null;
              }

              const updated = await dbUpdate(id, patch);
              return sendJson(res, 200, { product: toAdminProduct(updated) });
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
