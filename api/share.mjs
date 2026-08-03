// GET /s?l=hat.top.pants&off=...  (rewrite → /api/share)
//   bot (IG/LINE/FB) → อ่าน og:image (รูปลุคจริง) + title/desc ภาษาไทย
//   คนจริง → redirect เข้าแอป /?l=... ทันที (ใส่ลุคนั้นให้เลย)
import { parseLook, fetchItems, lookMeta, lookQuery } from './_look.mjs';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export default async function handler(req, res) {
  // อ่านโดเมนจาก request เอง → ใช้ได้ทุกโดเมน (doodstyles.com / vercel เดิม) ไม่ต้องแก้โค้ดถ้าย้าย
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'doodstyles.com';
  const BASE = `${proto}://${host}`;

  const look = parseLook(req.query);

  // ค่าเริ่มต้น (ลุคไม่ถูกต้อง) — ใช้การ์ดนิ่งเดิม
  let title = 'DOOD — Make it your style';
  let desc = 'ปัดแต่งชุด จัดลุคที่ใช่ ช้อปได้เลย';
  let image = `${BASE}/og.png`;
  let imgW = 1200, imgH = 630;
  let appUrl = `${BASE}/`;

  if (look) {
    const q = lookQuery(look);
    appUrl = `${BASE}/?${q}`;
    image = `${BASE}/api/og?${q}`;
    imgW = 1080; imgH = 1920;
    try {
      const byId = await fetchItems(Object.values(look.items));
      const m = lookMeta(look, byId);
      title = m.title;
      desc = m.desc;
    } catch { /* ใช้ default ถ้าดึงชื่อไม่ได้ (รูปยังเจนได้จาก /api/og) */ }
  }

  const html = `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta property="og:type" content="website">
<meta property="og:site_name" content="DOOD">
<meta property="og:url" content="${esc(appUrl)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:image:width" content="${imgW}">
<meta property="og:image:height" content="${imgH}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${esc(image)}">
<meta http-equiv="refresh" content="0; url=${esc(appUrl)}">
<link rel="canonical" href="${esc(appUrl)}">
</head>
<body style="font-family:system-ui;background:#f4f1ee;color:#555;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0">
<script>location.replace(${JSON.stringify(appUrl)})</script>
<a href="${esc(appUrl)}" style="color:#171717;font-weight:700">เปิด DOOD →</a>
</body>
</html>`;

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // bot cache สั้น ๆ (เผื่อแก้ meta) — คนจริงเด้งทันทีอยู่แล้ว
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600');
  res.end(html);
}
