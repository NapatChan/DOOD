// โมดูลรวม: ถอดลุคจาก URL + ดึงสินค้า + เรนเดอร์รูปการ์ดแชร์ (9:16) + สร้าง meta
// ใช้ร่วมกันโดย api/og.mjs (สร้างรูป) + api/share.mjs (สร้าง HTML meta)
// (ไฟล์ขึ้นต้น _ = Vercel ไม่ถือเป็น route, เป็นแค่ helper)
import sharp from 'sharp';

const CATEGORIES = ['hat', 'top', 'pants'];
const SEP = '.';
export const W = 1080, H = 1920; // 9:16 IG story / TikTok

// จัดวางเหมือนในเว็ป (src/types + Mascot): แบ่งพื้นที่แนวตั้งตาม LAYER_GROW + จุดยึด + scale รายชิ้น
const LAYER_GROW = { hat: 0.8, top: 2.0, pants: 3.0 };
const ANCHOR = { hat: 'bottom', top: 'center', pants: 'top' };

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
    `${SB}/rest/v1/products?select=id,category,name,price,image_url,scale,fit&is_active=eq.true&id=in.(${inList})`,
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
    title: 'ดูลุคที่ฉันจัดใน DOOD 👗✨',
    desc: names.length ? `${names.join(' · ')} — รวม ${baht(total)}` : 'แต่งตัวมาสคอต ปัดเปลี่ยนชุด จัดลุคที่ใช่แล้วช้อปได้เลย',
    total,
  };
}

// ---------- พื้นหลัง + ข้อความ (Latin/ตัวเลขเท่านั้น — กันฟอนต์ไทยเพี้ยนบน Vercel) ----------
function backgroundSvg(totalPrice) {
  const cx = W / 2;
  return Buffer.from(`
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f7f5f2"/>
      <stop offset="1" stop-color="#eae7e2"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <text x="${cx}" y="215" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="92" font-weight="900" fill="#1a1a1a" letter-spacing="-2">DOOD</text>
  <text x="${cx}" y="265" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="32" font-weight="500" fill="#9a938c" letter-spacing="1">Make it your style</text>
  <text x="${cx}" y="1690" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="27" font-weight="700" fill="#b0a7ae" letter-spacing="5">TOTAL LOOK</text>
  <text x="${cx}" y="1785" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="92" font-weight="900" fill="#1a1a1a">${esc(baht(totalPrice))}</text>
  <text x="${cx}" y="1845" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="600" fill="#c3bcbf" letter-spacing="1">dood-red.vercel.app</text>
</svg>`);
}

async function loadAspect(buf) {
  const m = await sharp(buf).metadata();
  return m.width / m.height;
}

// ---------- เรนเดอร์รูปการ์ด (คืน PNG buffer, หรือ null ถ้าไม่มีชิ้นที่ใส่เลย) ----------
export async function renderLook({ items, hidden }, byId) {
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
      buffers[c] = { buf, aspect: await loadAspect(buf), scale: Number(it.scale) || 1 };
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
      let h = Math.min(bandH, Wc / g.aspect) * g.scale;
      const w = h * g.aspect;
      let top;
      if (ANCHOR[c] === 'bottom') top = bandTop + bandH - h;
      else if (ANCHOR[c] === 'top') top = bandTop;
      else top = bandTop + (bandH - h) / 2;
      const resized = await sharp(g.buf).resize({ height: Math.round(h), fit: 'inside' }).png().toBuffer();
      layers.push({ input: resized, left: Math.round(CX - w / 2), top: Math.round(top) });
    }
    bandTop += bandH;
  }

  return sharp(backgroundSvg(total)).png().composite(layers).png().toBuffer();
}
