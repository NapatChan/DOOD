// โมดูลรวม: ถอดลุคจาก URL + ดึงสินค้า + เรนเดอร์รูปการ์ดแชร์ (9:16) + สร้าง meta
// ใช้ร่วมกันโดย api/og.mjs (สร้างรูป) + api/share.mjs (สร้าง HTML meta)
// (ไฟล์ขึ้นต้น _ = Vercel ไม่ถือเป็น route, เป็นแค่ helper)
import sharp from 'sharp';
import { Resvg } from '@resvg/resvg-js';
import QRCode from 'qrcode';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ฟอนต์ Kanit (bundle มา) — Vercel serverless ไม่มีฟอนต์ในระบบเลย ต้องป้อนไฟล์ให้ resvg
// (เรนเดอร์ <text> ด้วย resvg + ฟอนต์นี้ → text ครบ ไม่เป็นกล่อง □ · มี ฿ ด้วย)
const FONT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '_fonts');
const FONT_FILES = [path.join(FONT_DIR, 'Kanit-Black.ttf'), path.join(FONT_DIR, 'Kanit-Regular.ttf')];

// เรนเดอร์ SVG (พื้นหลัง+ข้อความ) → PNG ด้วย resvg (จัด layout ข้อความเองจากฟอนต์ที่ป้อน)
function renderSvg(svg) {
  return new Resvg(svg, {
    font: { fontFiles: FONT_FILES, loadSystemFonts: false, defaultFontFamily: 'Kanit' },
  })
    .render()
    .asPng();
}

const CATEGORIES = ['hat', 'top', 'pants'];
const SEP = '.';
export const W = 1080, H = 1920; // 9:16 IG story / TikTok

// ตำแหน่ง QR มุมขวาล่างการ์ด (สแกนเปิดลุคนี้บนเว็บ — ให้ story ที่กดลิงก์ไม่ได้ดึง traffic ได้)
const QR_SIZE = 190, QR_LEFT = W - 56 - QR_SIZE, QR_TOP = 1640;
const DEFAULT_ORIGIN = 'https://www.doodstyles.com';
// สีเน้น espresso: คุมทั้งโลโก้ + ราคารวมบนการ์ด (ตรงกับสีแบรนด์ทั้งเว็บ)
const ACCENT = '#181004';
const ACCENT_RGB = { r: parseInt(ACCENT.slice(1, 3), 16), g: parseInt(ACCENT.slice(3, 5), 16), b: parseInt(ACCENT.slice(5, 7), 16) };

// โลโก้ wordmark "DOOD" (โปร่ง) หัวการ์ด — โหลดครั้งเดียว · ไม่มีไฟล์ → fallback เป็นตัวหนังสือ
const LOGO_W = 400, LOGO_TOP = 128, LOGO_LEFT = Math.round((W - LOGO_W) / 2);
let LOGO_BUF = null;
try {
  LOGO_BUF = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '_logo', 'dood-wordmark.png'));
} catch { /* ไม่มีโลโก้ → ใช้ตัวหนังสือ DOOD แทน */ }

// จัดวางเหมือนในเว็ป (src/types + Mascot): แบ่งพื้นที่แนวตั้งตาม LAYER_GROW + จุดยึด + scale รายชิ้น
const LAYER_GROW = { hat: 0.8, top: 2.0, pants: 3.0 };
const ANCHOR = { hat: 'bottom', top: 'center', pants: 'top' };

// ท่อนล่าง "ทรงสั้น" (ขาสั้น/กระโปรง) — คุมด้วยความสูง = % ของแถบ (เหมือนเว็บ src/types)
// ไม่งั้น contain จะบานเต็มคอลัมน์ ใหญ่กว่าลำตัว · รูปยิ่งกว้าง (aspect สูง) ยิ่งเตี้ยลง
const SHORT_FILL_K = 48, SHORT_FILL_MIN = 24, SHORT_FILL_MAX = 38;
function shortBottomHeightPct(aspect) {
  if (!aspect || aspect <= 0) return 34;
  return Math.min(SHORT_FILL_MAX, Math.max(SHORT_FILL_MIN, SHORT_FILL_K / aspect));
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const baht = (n) => '฿' + Number(n || 0).toLocaleString('en-US');

// ---------- ถอดลุคจาก query (?l=hat.top.pants&off=hat.pants) ----------
export function parseLook(query) {
  const l = query?.l;
  if (!l) return null;
  const parts = String(l).split(SEP);
  if (parts.length !== CATEGORIES.length || parts.some((s) => !s)) return null;
  const items = {};
  CATEGORIES.forEach((c, i) => (items[c] = parts[i]));
  const off = new Set(String(query.off || '').split(SEP).filter(Boolean));
  const hidden = {};
  CATEGORIES.forEach((c) => (hidden[c] = off.has(c)));
  return { items, hidden };
}

// query string มาตรฐานของลุค (ไว้ต่อ URL /api/og และ /?l=) — สร้างเองกันพารามิเตอร์แปลกปน
export function lookQuery({ items, hidden }) {
  const p = new URLSearchParams();
  p.set('l', CATEGORIES.map((c) => items[c]).join(SEP));
  const off = CATEGORIES.filter((c) => hidden[c]);
  if (off.length) p.set('off', off.join(SEP));
  return p.toString();
}

// ---------- ดึงสินค้า 3 ชิ้นจาก Supabase (anon key, public read) ----------
export async function fetchItems(ids) {
  const SB = process.env.VITE_SUPABASE_URL;
  const KEY = process.env.VITE_SUPABASE_ANON_KEY;
  const uniq = [...new Set(ids.filter(Boolean))];
  if (!SB || !KEY || !uniq.length) return {};
  const inList = uniq.map(encodeURIComponent).join(',');
  const res = await fetch(
    `${SB}/rest/v1/products?select=id,category,name,price,image_url,scale,fit,offset_x,offset_y&is_active=eq.true&id=in.(${inList})`,
    { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } },
  );
  if (!res.ok) return {};
  const rows = await res.json();
  const byId = {};
  for (const r of rows) byId[r.id] = r;
  return byId;
}

// ---------- meta (title/desc) สำหรับการ์ดแชร์ — ไทยได้ (เป็น text ไม่ใช่รูป) ----------
export function lookMeta({ items, hidden }, byId) {
  const worn = CATEGORIES.filter((c) => !hidden[c] && byId[items[c]]);
  const total = worn.reduce((s, c) => s + (Number(byId[items[c]].price) || 0), 0);
  const names = worn.map((c) => byId[items[c]].name);
  return {
    title: 'ค้นหาลุคที่ใช่ใน DOOD ✨',
    desc: names.length ? `${names.join(' · ')} — รวม ${baht(total)}` : 'ปัดแต่งชุด จัดลุคที่ใช่ ช้อปได้เลย',
    total,
  };
}

// ---------- พื้นหลัง + ข้อความ (ฟอนต์ Kanit ผ่าน resvg — มี ฿ + ไม่พึ่งฟอนต์ระบบ) ----------
function backgroundSvg(totalPrice, hasQr, hasLogo) {
  const cx = W / 2;
  const t = (x, y, anchor, size, weight, fill, ls, s) =>
    `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="Kanit" font-weight="${weight}" font-size="${size}" letter-spacing="${ls}" fill="${fill}">${esc(s)}</text>`;
  // แผงขาว + ป้ายกำกับหลัง QR (quiet zone ให้สแกนติด + บอกคนว่ากดสแกน)
  const pad = 26, qcx = QR_LEFT + QR_SIZE / 2;
  const qrPanel = hasQr
    ? `<rect x="${QR_LEFT - pad}" y="${QR_TOP - pad}" width="${QR_SIZE + pad * 2}" height="${QR_SIZE + pad * 2}" rx="24" fill="#ffffff"/>
       ${t(qcx, QR_TOP + QR_SIZE + pad + 34, 'middle', 24, 700, '#8a827b', 0, 'สแกนเปิดลุคนี้')}`
    : '';
  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#fefbf4"/><stop offset="1" stop-color="#fbf7ef"/>
  </linearGradient></defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  ${hasLogo ? '' : t(cx, 215, 'middle', 96, 900, ACCENT, -2, 'DOOD')}
  ${t(cx, 275, 'middle', 32, 400, '#9a938c', 1, 'Make it your style')}
  ${qrPanel}
  ${t(80, 1740, 'start', 28, 400, '#b0a7ae', 5, 'TOTAL LOOK')}
  ${t(80, 1832, 'start', 92, 900, ACCENT, 0, baht(totalPrice))}
  ${t(80, 1882, 'start', 26, 400, '#c3bcbf', 1, 'doodstyles.com')}
</svg>`;
}

async function loadAspect(buf) {
  const m = await sharp(buf).metadata();
  return m.width / m.height;
}

// สร้าง QR (PNG) ของ URL ลุคนี้ — คืน null ถ้าพัง (การ์ดยังออกได้ปกติ ไม่มี QR)
async function qrPngFor(look, origin) {
  try {
    return await QRCode.toBuffer(`${origin || DEFAULT_ORIGIN}/?${lookQuery(look)}`, {
      type: 'png', width: QR_SIZE, margin: 0, errorCorrectionLevel: 'M',
      color: { dark: '#1a1a1a', light: '#ffffff' },
    });
  } catch { return null; }
}

// ---------- เรนเดอร์รูปการ์ด (คืน PNG buffer, หรือ null ถ้าไม่มีชิ้นที่ใส่เลย) ----------
export async function renderLook({ items, hidden }, byId, origin) {
  const CX = W / 2;
  const Wc = 560; // กว้างคอลัมน์ (เท่ากันทุกแถบ เหมือนเว็ป)
  const zoneTop = 340, zoneBottom = 1600;
  const Hc = zoneBottom - zoneTop;
  const growTotal = LAYER_GROW.hat + LAYER_GROW.top + LAYER_GROW.pants;

  // โหลดรูปของหมวดที่ "ใส่" และมีจริง (ข้ามชั้นที่ปิดตา/ถูกลบ)
  const buffers = {};
  let total = 0, wornCount = 0;
  for (const c of CATEGORIES) {
    const it = byId[items[c]];
    if (!it || hidden[c] || !it.image_url) continue;
    try {
      const r = await fetch(it.image_url);
      if (!r.ok) continue;
      const buf = Buffer.from(await r.arrayBuffer());
      buffers[c] = {
        buf,
        aspect: await loadAspect(buf),
        scale: Number(it.scale) || 1,
        fit: it.fit,
        offsetX: Number(it.offset_x) || 0,
        offsetY: Number(it.offset_y) || 0,
      };
      total += Number(it.price) || 0;
      wornCount += 1;
    } catch { /* ข้ามชิ้นที่โหลดไม่ได้ */ }
  }
  if (wornCount === 0) return null;

  // แบ่งแถบตาม LAYER_GROW (เว้นแถบของชั้นที่ไม่ใส่ไว้ ให้ตำแหน่งชั้นอื่นตรงกับเว็ป)
  const layers = [];
  let bandTop = zoneTop;
  for (const c of CATEGORIES) {
    const bandH = (Hc * LAYER_GROW[c]) / growTotal;
    const g = buffers[c];
    if (g) {
      // ทรงสั้น: สูง = % ของแถบ (auto กว้าง) · ทรงอื่น: contain ในกล่อง bandH×Wc
      const h = (c === 'pants' && g.fit === 'short')
        ? bandH * (shortBottomHeightPct(g.aspect) / 100) * g.scale
        : Math.min(bandH, Wc / g.aspect) * g.scale;
      const w = h * g.aspect;
      let top;
      if (ANCHOR[c] === 'bottom') top = bandTop + bandH - h;
      else if (ANCHOR[c] === 'top') top = bandTop;
      else top = bandTop + (bandH - h) / 2;
      // เลื่อนตำแหน่ง (offset % ของกล่องชิ้น = w,h) เหมือน translate ในเว็บ
      const left = CX - w / 2 + (w * g.offsetX) / 100;
      top += (h * g.offsetY) / 100;
      const resized = await sharp(g.buf).resize({ height: Math.round(h), fit: 'inside' }).png().toBuffer();
      layers.push({ input: resized, left: Math.round(left), top: Math.round(top) });
    }
    bandTop += bandH;
  }

  // QR มุมขวาล่าง (สแกนเปิดลุคนี้) — วางบนแผงขาวใน backgroundSvg
  const qrPng = await qrPngFor({ items, hidden }, origin);
  if (qrPng) layers.push({ input: qrPng, left: QR_LEFT, top: QR_TOP });

  // โลโก้ wordmark หัวการ์ด (แทนตัวหนังสือ DOOD)
  let hasLogo = false;
  if (LOGO_BUF) {
    try {
      // รีคัลเลอร์เป็นสี ACCENT: ทับ RGB ทุกพิกเซลด้วยสีเน้น เก็บ alpha เดิม (ขอบเนียนคงอยู่)
      const { data, info } = await sharp(LOGO_BUF).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      for (let i = 0; i < info.width * info.height; i++) {
        const o = i * info.channels;
        data[o] = ACCENT_RGB.r; data[o + 1] = ACCENT_RGB.g; data[o + 2] = ACCENT_RGB.b;
      }
      const logo = await sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } })
        .resize({ width: LOGO_W }).png().toBuffer();
      layers.unshift({ input: logo, left: LOGO_LEFT, top: LOGO_TOP });
      hasLogo = true;
    } catch { /* โลโก้พัง → ใช้ตัวหนังสือ */ }
  }

  // เรนเดอร์พื้นหลัง+ข้อความด้วย resvg (ฟอนต์ครบ) → แล้ว composite ชุด+QR+โลโก้ ด้วย sharp
  const bgPng = renderSvg(backgroundSvg(total, !!qrPng, hasLogo));
  return sharp(bgPng).composite(layers).png().toBuffer();
}
