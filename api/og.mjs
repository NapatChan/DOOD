// GET /api/og?l=hat.top.pants&off=...  → รูปการ์ดแชร์ 9:16 (PNG) ของลุคนั้น
// ใช้เป็น og:image ให้ bot ของ IG/LINE/FB ดึงไปโชว์
import { parseLook, fetchItems, renderLook } from './_look.mjs';

// ถ้าลุคไม่ถูกต้อง/เรนเดอร์ไม่ได้ → เด้งไปรูปนิ่ง og.png (การ์ดยังไม่เปล่า)
function fallback(res) {
  res.statusCode = 302;
  res.setHeader('Location', '/og.png');
  res.end();
}

export default async function handler(req, res) {
  try {
    const look = parseLook(req.query);
    if (!look) return fallback(res);
    const byId = await fetchItems(Object.values(look.items));
    const origin = `https://${req.headers.host}`;
    const png = await renderLook(look, byId, origin);
    if (!png) return fallback(res);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'image/png');
    // ลุคเดียวกันได้รูปเดิมเสมอ → cache ยาว (บอทดึงครั้งแรกช้า ครั้งต่อไปเสิร์ฟจาก CDN)
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=31536000, stale-while-revalidate=86400');
    res.end(png);
  } catch (e) {
    return fallback(res);
  }
}
