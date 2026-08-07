# 📊 DOOD — Status (ติดตามงาน)

> **ไฟล์นี้ = สถานะปัจจุบันของโปรเจกต์: ทำถึงไหนแล้ว / ต่อไปทำอะไร**
> 📌 **กฎ: อัปเดตไฟล์นี้ทุกครั้งที่มีการเปลี่ยนแปลง** (เสร็จงาน / เริ่มงานใหม่ / push / ตัดสินใจ) + เพิ่มบรรทัดใน §5 Change log
> อัปเดตล่าสุด: 2026-08-06 (magic link มือถือ + แอดมิน filters/ธง + ปิดรูลายทาง + fix ลุคแชร์/in-app browser)

---

## §1. 🟢 สถานะ Git — sync แล้ว (ไม่มีงานค้าง push)

- **push ล่าสุด: `51a6e36`** — รวมปุ่มแชร์เป็นเมนูเดียว (แชร์ลิงก์ + บันทึกรูป story)
- 🌐 **โดเมน `doodstyles.com`** (Hostinger → Vercel nameservers) · SSL ✅ · www เป็น primary
- ✅ **แชร์ไดนามิก live** — การ์ด 9:16 (sharp+resvg+Kanit) · title "ค้นหาลุคที่ใช่ใน DOOD ✨" · desc "ปัดแต่งชุด จัดลุคที่ใช่ ช้อปได้เลย"
- 📊 **Vercel Analytics เปิดแล้ว** (dashboard + สคริปต์ live 200) — เก็บ traffic แล้ว
- 📧 **Magic link ใช้ได้เต็มบนมือถือ** (Resend SMTP + template ไทย + แก้ Supabase URL = www ให้ตรงโดเมนจริง)
- 🛠️ **แอดมิน filters ครบ**: ค้นหา · หมวด · เพศ · วันที่ลง · 🚩 ติ๊กปัญหา (needs_fix ซ่อนจากเว็บ)
- 📦 **สินค้าจริง 184 ชิ้น** (หมวก 25 · เสื้อ 100 · กางเกง 59) — แก้ผ่านแอดมิน local อัปเดตเว็บทันที ไม่ต้อง push

---

## §2. ✅ เสร็จแล้ว

### บน Vercel แล้ว (pushed)
- Core loop ปัดเปลี่ยนชุด (หมวก/เสื้อ/ท่อนล่าง) · บันทึกลุค/หยิบมาแต่งต่อ · ดูชุด
- แอดมิน CRUD + ตัดพื้นหลังอัตโนมัติ + WebP + preload
- ปุ่มตา (ซ่อนเลเยอร์) · deploy Vercel (auto จาก GitHub) · start/stop scripts + ปุ่ม VSCode

### เสร็จในเครื่อง — ยังไม่ push (ดู §1)
- [x] **กรองเพศ** (ชาย/หญิง/ทุกเพศ) ฝั่งลูกค้า + แอดมิน — GenderMenu/GenderTabs
- [x] **ปุ่มดูชุดเต็มจอ** (LookPreview) + แก้ layout มือถือ (กางเกงไม่โดนแถบล่างบัง)
- [x] **จัดแถบบนให้โล่ง** (chip เพศ + ตะกร้า · ⤢ ลอยบนมาสคอต · 🎲 FAB)
- [x] **ทรงกระโปรง/ขาสั้น** + **auto-balance ขนาดตามทรง** (บานมาก→เล็กลงเอง, อิงความสูง, สม่ำเสมอทุกหน้า)
- [x] **ชายเสื้อ**: กลับไปเว้นระยะแบบเดิม (ทดลอง anchor/overlap แล้วถอยออก)
- [x] **แอดมิน: preview บนมาสคอต + เส้นปะไกด์ไลน์ + สไลเดอร์ปรับขนาด (scale) รายชิ้น**
- [x] **แผงรายละเอียดแอดมินเลื่อนได้** (max-height + overflow)
- [x] **เอกสาร**: ROADMAP.md · DOOD-INDEX.md · planning-backend.md (ฉบับ final) · เปลี่ยนชื่อ planning.md → planning-frontend.md

---

## §3. ⏭️ ถัดไป (ทำอะไรต่อ)

> ✅ **2026-08-02 เสร็จ + push (`45d4483`) — UX ปัดสนุก + ซื้อง่าย** (แผน: [elegant-watching-umbrella](~/.claude/plans/elegant-watching-umbrella.md))
> - [x] 🎲 **สุ่มลำดับปัด (รายชิ้น เต็ม)** — `shuffleItems()` ใน useWardrobe สุ่ม Fisher-Yates ครั้งเดียวตอนโหลด (เปลี่ยนจากสุ่มระดับกลุ่ม เพราะสีติดกันทำให้ปัดรู้สึกเหมือนเรียง — พอมีแทบสีแล้วไม่ต้องเก็บสีติดกัน)
> - [x] 🎨 **แทบเลือกสี (color swatch)** — field `variant_group`+`color_name` ครบเส้นทาง · `ColorSwatches.tsx` (สีจุด=color hex เฉลี่ย) · backfill 66/66 ชิ้น (หมวก Y2K แยก 6 รุ่นอัตโนมัติ) · เทส Playwright ผ่าน (เสื้อ 9 สี, OLYMPIA 6 สี, กดเปลี่ยนสีได้)
> - [x] ⚪ **เอา dots ออก** ทั้ง 2 จุด (แทบสีมาแทน — เดสก์ท็อปโชว์ใต้มาสคอต, มือถือลอยบนเลเยอร์ `lg:hidden`)
> - [x] 🧑 **รัน SQL ALTER แล้ว** (variant_group + color_name) · DB backfill live แล้ว
> - [x] 📱 **แก้แทบสีมือถือ** (เดิมลอยทับสินค้า เกะกะ) → `ColorSwatchPicker` ชิปเล็กลอยกลางล่างจอ (คงที่ ไม่ทับสินค้า) กดกาง→เลือกสี→ยุบเอง · เดสก์ท็อปยังเป็นแถวใต้มาสคอตเหมือนเดิม
> - ⏳ **ค้าง**: push แก้แทบสีมือถือ (รอสั่ง) · `npm run backup` ก่อน push

> 🔍 **ผล health-check 2026-07-28**: ระบบแข็งแรง+ปลอดภัยดี (RLS กันเขียนครบ, service key ไม่รั่วใน bundle/git). ปัญหาหลัก = **ยังหาเงินไม่ได้ + แชร์ไม่ได้ + วัดผลไม่ได้** (ไม่ใช่ปัญหาเทคนิค). ลำดับแนะนำ: B2 → affiliate → แชร์/OG → analytics

**ลำดับ 1 — B2 ✅ เสร็จในเครื่องแล้ว** (แอดมินเขียนขึ้น Supabase — เลิก push เพื่อแก้สินค้า)
- [x] 🤖 `scripts/supabase.mjs` (helper service key: DB select/insert/update + storage upload/delete/download)
- [x] 🤖 `admin-plugin.mjs`: GET/POST/PUT/DELETE → Supabase Storage+DB · ชื่อไฟล์อิง id+เวอร์ชัน · เปลี่ยนรูปลบไฟล์เก่า · DELETE = soft-delete (`is_active=false`, เก็บไฟล์รูป)
- [x] 🤖 `AdminApp.tsx`: `assetUrl()` รองรับ URL เต็มจาก Supabase (3 จุด)
- [x] 🤖 `scripts/backup-catalog.mjs` + `npm run backup` (ดึง DB → `products.json` + รูป + ลบไฟล์กำพร้า)
- [x] 🔒 `vite.config.ts` `host: true` → `'localhost'` (กันคนใน LAN เข้าแอดมินที่ถือ service key)
- [x] 🧪 เทสต์ผ่านหมด: GET 36 · POST สร้างขึ้น Supabase+รูปขึ้น CDN (200) · PUT แก้ได้ · DELETE soft-delete หายจาก catalog · `npm run backup` sync ได้ · build+tsc ผ่าน · แอดมิน UI เรนเดอร์รูป Supabase 0 error
- [x] 🔑 **จัดการ key ที่หลุด**: สร้าง secret key ใหม่ (`sb_secret_...`) ใส่ `.env` + **Disable legacy API keys** → เทสต์ยืนยัน key เก่าตาย (401), key ใหม่เขียนได้ (201), เว็ปลูกค้าอ่านได้ (publishable, 36)
- [x] 🚀 **push B2** (`1b20fda`) — `npm run backup` + build ผ่าน + เช็ค .env/key ไม่หลุด → ขึ้น Vercel แล้ว

**ลำดับ 2 — Roadmap เฟส 1: หาเงิน + โต** (ดู [ROADMAP.md](ROADMAP.md))
- [x] 🧑 สมัคร affiliate Shopee + ใส่ลิงก์ครบ **23/23** (1 ลิงก์/ประเภท → หน้า listing มีทุกสีเป็น variant) → **รายได้ปลดล็อกแล้ว**
- [x] 🤖 ปุ่มแชร์ลุค + **การ์ดแชร์ไดนามิก** (9:16 IG/TikTok, sharp+resvg) + OG meta ต่อลุค + favicon — live บน doodstyles.com
- [x] 🤖 Analytics (Vercel Analytics) — เปิดใน dashboard + สคริปต์ live แล้ว ✅ เก็บ traffic

**➡️ โฟกัสถัดไป (2026-08-06) — เทคพร้อมแล้ว ต้อง "หาคนเข้า" ไม่ใช่ build เพิ่ม**
- funnel ครบ (ปัด→แชร์→ช้อป) + วัดผลได้ + ล็อกอินได้ + สินค้า 184 ชิ้น → **ตัวติดคือ traffic**
- 🧑 **แพลน B: TikTok/Reels** (artifact แพลน 14 วัน) — โพสต์คลิปแรก + ให้เพื่อน 5-10 คนลอง + ดู Analytics
- ตัดสินใจงานถัดไป**ด้วยข้อมูลจริง** (คนปัดอะไร/หลุดตรงไหน) ไม่ใช่เดา · อย่า build ใหญ่จนมีผู้ใช้จริง 20-30 คน
- เก็บตก: 🚩 ติ๊ก 10 เบบี้ทีลายน้ำ STYLIST (ใช้ปุ่มธงใหม่ซ่อนได้แล้ว) · `npm audit fix` (zod)

**ลำดับ 3 — งานเก็บตก (เล็ก, ไม่เร่ง)**
- [ ] 🧑 เช็กเว็ปจริงหลัง deploy B1: DevTools → Network เห็น request ไป `*.supabase.co` แล้ว**จด URL เว็ปจริงไว้ใน §6** (ตอนนี้ยังไม่มีที่ไหนจดเลย)
- [ ] 🤖 `npm audit fix` (ปิดช่องโหว่ zod ได้เลย, ไม่ breaking) — อีก 5 รายการเป็น devDependencies เท่านั้น (ไม่ ship ขึ้นเว็ปจริง) รอทำตอนอัปเกรด Vite

<details><summary>✅ Backend B1 — เสร็จแล้ว (กดดูรายละเอียด)</summary>

- [x] 🧑 สมัคร Supabase + keys → `.env` (gitignore)
- [x] 🤖 schema + RLS + bucket · `migrate-to-supabase.mjs` ย้าย 36 ชิ้น+รูป · `getCatalog()` อ่าน Supabase + cache 3 ชั้น
- [x] 🧪 เทสต์ผ่าน: อ่าน 36 จาก DB · รูปจาก CDN · anon เขียนโดน RLS ปฏิเสธ · fallback snapshot เปิดได้
- [x] 🧑 เพิ่ม 2 env ใน Vercel · [x] push B1 (`2d08d12`)
</details>

---

## §4. 📋 Backlog (เลื่อน / อนาคต)

| งาน | อยู่ในแผน | สถานะ |
|---|---|---|
| AI กรอกรายละเอียดจากรูป (Haiku) | [planning-ai-agent.md](planning-ai-agent.md) §6 | ⏸️ เลื่อน (สเปกพร้อม, ร่างโค้ดแล้วถอยออก) |
| AI สไตลิสต์จับคู่ลุค | planning-ai-agent §7 | ⬜ |
| Backend 🅱️ (แอดมินออนไลน์ + Fastify) | planning-backend.md B3 | ⬜ อนาคต |
| บัญชีผู้ใช้ + ลุคข้ามเครื่อง | planning-backend.md B4 | ⬜ อนาคต |
| Analytics · กรองสไตล์ฝั่งลูกค้า · PWA · privacy page | ROADMAP เฟส 2-3 | ⬜ |

---

## §5. 📝 Change log (ใหม่สุดอยู่บน)

- **2026-08-07** — 🔀 **รวมปุ่มแชร์เป็นเมนูเดียว (push `51a6e36`)**: จาก 2 ปุ่ม (แชร์ลิงก์ + รูป) → ปุ่ม "แชร์" เดียวเด้ง `ShareMenu` (bottom sheet) ให้เลือก 2 ทาง — "แชร์ให้เพื่อน (ลิงก์กดได้ ดึง traffic)" / "บันทึกรูปลง story (การ์ด 9:16)" ป้ายกำกับสอนคนในตัว · reuse `handleShare`+`handleSaveImage` เดิม ไม่แตะลอจิก · LookBar/MobilePriceSheet กลับเป็นปุ่มเดียว · tsc+build ผ่าน
- **2026-08-07** — 📷 **ปุ่มบันทึก/แชร์รูปลุค 9:16 (push `089ff56`)**: เพิ่มปุ่มรูปข้างปุ่มแชร์เดิมใน `LookBar` + `MobilePriceSheet` → ดึงการ์ด 9:16 (PNG จาก `/api/og?l=`) แล้ว `navigator.share({files})` (มือถือ→เลือก IG/TikTok story) · ไม่รองรับ/แชร์พังใน in-app → ดาวน์โหลดรูปลงเครื่องแทน · `buildCardImageUrl()` ใน lookUrl.ts · `ImageIcon` · handler `handleSaveImage` (loading state กันกดซ้ำ + toast) · tsc+build ผ่าน · **หมายเหตุ: `/api/og` เป็น serverless เทสจริงต้องบน Vercel (หรือ `vercel dev`)** · ต่อยอดจากแผน [planning-content.md](planning-content.md)
- **2026-08-07** — 🎬 **แผนคอนเทนต์ TikTok 14 วัน** ([planning-content.md](planning-content.md)): 6 ฟอร์แมตแม่แบบ + คลังฮุค + ปฏิทิน 14 วัน + สคริปต์เต็ม 7 คลิปแรก + ระบบทำงานคนเดียว (แบตช์) + สเปกวิชวล + กฎวัดผล — ลงมือของ "แพลน B: TikTok/Reels"

- **2026-08-06** — 🔗 **fix ลุคที่แชร์หาย + เตือน in-app browser** (push `ac469d4`): เดิม App.tsx ล้าง `?l=` ออกจาก URL ทันทีที่โหลด → กด "เปิดในเบราว์เซอร์" จาก LINE/เมล ได้ URL เปล่า **ลุคหาย** → แก้ให้**เก็บ `?l=` ไว้จนผู้ใช้เริ่มปัดเอง** (ล้างใน handlePan ครั้งแรก) · `InAppBrowserNotice.tsx` ตรวจ UA (LINE/FB/IG/TikTok/เมล) → แถบบนสุด "เปิดใน Safari/Chrome" + ปุ่มคัดลอกลิงก์ (แก้ต้นเหตุร่วม: in-app browser แยก storage → ล็อกอินไม่ค้าง + ลุคหาย)

- **2026-08-06** — 🛠️ **แอดมิน: วันที่ลง + กรองเพศ + เลือกวันที่ + tooling** (push `664ded3`): การ์ดโชว์ `created_at` (map ใน api.ts+admin-plugin) · แถบเครื่องมือเพิ่มชิปกรองเพศ + `<input type=date>` กรองวันที่ลง (toLocalYMD) · scripts ลงสินค้า (admin-form-fill/admin-update-image/crop-multi-item) + agent `dood-admin-filler` · สินค้าใหม่ชุด 4-8 (84 ไฟล์) + 5-8 (166 ไฟล์)

- **2026-08-05** — 🚩 **แอดมิน: ติ๊กสินค้ามีปัญหา + ค้นหา/กรอง · ปิดรูเสื้อลายทาง** (push `db0cfcd`): คอลัมน์ `needs_fix` (รัน ALTER) — ติ๊ก 🚩 = ซ่อนจากเว็บลูกค้า (`catalogSource` query `needs_fix=not.is.true`) ขอบแดง/badge · แถบเครื่องมือ: ค้นหา (ชื่อ/กลุ่ม/สี) + ชิปหมวด + toggle "เฉพาะมีปัญหา" · **`bg-util.fillInteriorHoles`** flood-fill ปิดรูกลางเสื้อ (แถบขาว/ลายทางที่ AI ตัดผิด) เทส synthetic ผ่าน · **แก้ตัวเลขที่เคยนับผิด: สินค้าจริง 184 ชิ้น** (query เก่าโดนตัดที่ 100) · โมเดล @imgly มีแค่ small/medium (large ใช้ไม่ได้)

- **2026-08-04** — 📧 **Magic link ใช้ได้บนมือถือ**: ตั้ง **Resend SMTP** (verify domain doodstyles.com ผ่าน Vercel DNS integration — DKIM/SPF/MX) + template อีเมลไทย (การ์ด DOOD ปุ่มกลม) · **fix ล็อกอินวนบนมือถือ**: เว็บหลัก www แต่ Supabase ตั้ง redirect เป็น non-www → token หล่นตอนเด้งข้ามโฮสต์ → แก้ Supabase Site URL + Redirect = `www.doodstyles.com` ให้ตรง · ปรับ copy ล็อกอินในเว็บ (เลี่ยง "ข้ามเครื่อง" → "เก็บลุคโปรดของคุณไว้ไม่ให้หาย")

- **2026-08-04** — 📊 **Vercel Analytics + อัปเดตเอกสาร**: ติดตั้ง `@vercel/analytics` + `<Analytics/>` ใน main.tsx (build ผ่าน) → เริ่มเก็บ traffic/pageview · **ต้องเปิดใน Vercel dashboard → Analytics** ถึงจะเก็บจริง · อัปเดต status.md ให้ตรงปัจจุบัน (โดเมน/แชร์/ขาสั้น)
- **2026-08-04** — 🩳 **fix การ์ดแชร์ กางเกงทรงสั้นบานเต็มคอลัมน์** (push `a5aef01`): พอร์ตสูตร `shortBottomHeightPct` (48/aspect%, clamp 24-38) จาก src/types → api/_look.mjs · fit=short คุมด้วยความสูง เหมือนเว็บ · fit=long ไม่กระทบ · เทส local + ยืนยันสด production
- **2026-08-04** — ✨ **ปรับ copy แชร์ + โดเมนใหม่ `doodstyles.com`** (push `408010f`): จด doodstyles.com (Hostinger) → ชี้ nameservers ไป Vercel → SSL ออก · share.mjs อ่านโดเมนจาก request เอง (ไม่ hardcode) · title="ค้นหาลุคที่ใช่ใน DOOD ✨" · desc="ปัดแต่งชุด จัดลุคที่ใช่ ช้อปได้เลย" ทุกจุด (og/twitter/meta/title/fallback) · การ์ดโชว์ doodstyles.com · ตั้ง Supabase Auth URL เป็นโดเมนใหม่

- **2026-08-03** — 🐛 **fix การ์ดแชร์ text เป็นกล่อง □ บน Vercel**: deploy แรก serverless ทำงาน (api/og คืน PNG) แต่ **Vercel ไม่มีฟอนต์ระบบ** → `<text>` ผ่าน librsvg เป็นกล่อง · ลอง opentype→path เจอ **NaN ในบาง glyph ของ Kanit** (บั๊ก opentype v2, ทั้ง librsvg+resvg ตัด path ที่ NaN) → เปลี่ยนไป **@resvg/resvg-js เรนเดอร์ `<text>` โดยป้อนไฟล์ฟอนต์ Kanit ที่ bundle** (Black+Regular, มี ฿) แล้ว composite ชุดด้วย sharp → text ครบทุกบรรทัด · bundle 2 ฟอนต์ ~350KB · เทส local ผ่าน (push `3d2d274`)

- **2026-08-03** — 🔍 **ตรวจสินค้าใหม่ 34 ชิ้น (รวมเป็น 100)**: เนียนดี 24 (เฮนลี่/cami/คอเหลี่ยม/off-shoulder + กางเกง 7) ขนาดตั้งมาดี · **10 เบบี้ทีมีลายน้ำ "STYLIST" ของร้านพิมพ์ทับบนเนื้อผ้าตรงคอ** — ลบอัตโนมัติไม่ได้ (crop/blob/erode/inpaint ลองแล้วไม่เนียน เพราะอยู่บนตัวเสื้อ ไม่ใช่พื้นหลัง) → **user เลือกปล่อยไว้ก่อน** (บนมาสคอต scale 0.7 เล็กแทบไม่เห็น) รอรูปไม่มีลายน้ำค่อยอัปทับในแอดมิน

- **2026-08-03** — 📏 **แอดมิน: แก้ขนาดสะดวกขึ้น**: (1) ช่องพิมพ์ขนาดเป็น % ได้ตรงๆ (sync กับสไลเดอร์) (2) ติ๊ก "ใช้ขนาดนี้กับทั้งกลุ่ม" → apply scale ไปทุกชิ้นใน variant_group เดียวกัน (โผล่เมื่อแก้ไขชิ้นที่มีกลุ่ม >1 · Promise.all updateProduct เฉพาะ scale ฟิลด์อื่นคงเดิม) · tsc+build+Playwright ผ่าน

- **2026-08-03** — ✂️ **แอดมิน: ครอบตัดรูป (crop) เอาตัวอักษร/ลายน้ำออก**: `src/admin/CropBox.tsx` กรอบปรับได้ (ลากมุม/ขอบ/ทั้งกรอบ 8 handle, ไม่ใช้ library) พิกัด normalized ตัดที่ความละเอียดจริง · ปุ่ม "✂️ ครอบตัดรูป" โผล่เมื่อมี preview → modal → ตัดแล้วเข้า pipeline เดิม (bg/trim/upload) · client-side ล้วน ไม่แตะ server · ใช้ได้ทันทีในแอดมิน local · tsc+build+Playwright ผ่าน

- **2026-08-02** — 🖼️ **ระบบแชร์แบบไดนามิก (เสร็จในเครื่อง, รอ deploy)**: เดิมแชร์ไปได้การ์ด og.png นิ่งทุกลุค → ทำ serverless (Vercel functions ครั้งแรก) โชว์**ลุคจริง**: `api/og.mjs` เรนเดอร์รูป 9:16 (IG/TikTok) ตาม `?l=` ด้วย sharp — ใช้ตรรกะจัดวางเดียวกับเว็ป (LAYER_GROW + scale รายชิ้น + จุดยึด) พื้นมินิมอล แบรนด์+ราคา Latin-only (กันฟอนต์ไทยเพี้ยน) · `api/share.mjs` เสิร์ฟ HTML meta ต่อลุค (title/desc ไทย + og:image ชี้ /api/og) แล้ว redirect คนเข้าแอป · `api/_look.mjs` shared (parse/fetch/render/meta) · `vercel.json` rewrite `/s`→`/api/share` · `buildShareUrl`→`/s?l=` · sharp ย้ายเข้า dependencies · **เทส local ผ่าน**: module (render+hidden layer) + handlers (og 200 png / share meta+redirect) · **รอ push เพื่อ deploy แล้วเทสการ์ดจริงบน IG/LINE**

- **2026-08-02** — 📱 **แก้แทบสีมือถือ (เกะกะ→ชิปยุบได้, ยังไม่ push)**: เดิมแถบสีลอยทับตัวสินค้า (หมวกโดนบังโลโก้/ป้ายชื่อสีทับปีก) → `ColorSwatchPicker` ชิปเล็ก (จุดสีตัวอย่าง 3 + ชื่อสีปัจจุบัน + ลูกศร) ลอย**มุมซ้ายล่าง** (คู่กับ 🎲 ขวาล่าง) ตำแหน่งคงที่ (z-30 ต่ำกว่า price sheet) กดกาง→การ์ดสีชิดซ้ายไม่ล้นขอบ→กดสียุบเอง · ย้าย swatch ออกจาก SwipeableLayer/Mascot มา render ที่ App (มือถือ) · เดสก์ท็อปคงเดิม · tsc+build+Playwright ผ่าน (ชิป/กาง/auto-close/มุมซ้าย)
- **2026-08-02** — 🎨 **แทบเลือกสี + สุ่มลำดับปัด + เอา dots ออก (push `45d4483`)**: เพิ่มคอลัมน์ `variant_group`+`color_name` (รัน ALTER ใน Supabase) ครบเส้นทางโค้ด · `ColorSwatches.tsx` โชว์จุดสีของสินค้ากลุ่มเดียวกัน (สีจุด=color เฉลี่ยจากรูป) กดเปลี่ยนสีทันทีไม่ต้องปัด · `shuffleItems()` สุ่มรายชิ้นเต็มตอนโหลด (เดิมสุ่มระดับกลุ่ม แต่ปัดรู้สึกเหมือนเรียง เลยเปลี่ยนเป็นสุ่มเต็ม) · เอา dots ออกทั้งมือถือ+เดสก์ท็อป · `backfill-variants.mjs` เติมกลุ่ม 66/66 (หมวก Y2K แยก 6 รุ่นตามชื่อ, เสื้อสายเดี่ยว fallback จากชื่อ) · tsc+build+Playwright ผ่าน · **เหลือ: push + อาจย้ายตำแหน่งแทบสีหมวก + npm run backup**
- **2026-08-02** — 📅 **วางแผนพรุ่งนี้** (สุ่มลำดับปัด + แทบเลือกสี + เอา dots ออก): สำรวจโค้ด — dots อยู่ 2 จุด (SwipeableLayer มือถือ + StageCaption เดสก์ท็อป) · ลำดับปัดมาจาก sort_order (ไม่มี sort ฝั่ง client) · **พบ CSV มี `group`+`color` อยู่แล้วแต่ bulk-add ทิ้ง** → variant ต่อยอดได้. เขียนแผนเต็มใน `~/.claude/plans/elegant-watching-umbrella.md` + ลง §3
- **2026-08-02** — 🚀 **push (`4ba47ae`)**: source images ชุดใหม่ (new-products/b2, 43 รูป+5 csv) + อัปเดต status → 66 ชิ้น (การแก้สินค้าอยู่ใน Supabase live แล้ว)
- **2026-08-02** — 🧦 **สินค้าชุดใหม่ (รวม 66 ชิ้น: หมวก 25 · เสื้อ 29 · กางเกง 12)**: เสื้อทุกตัว scale=0.74 (flat) · หมวกแก้ bg — ตัดเงาลอยใต้หมวก (LOS ANGELESS blob crop) + ตัดติ่ง/สายที่ยื่นข้าง (Rosé Frantz, PARIS ฯลฯ — crop คอลัมน์ริมที่ coverage<22%) · เสื้อ 1 ตัว bg กินเนื้อ (top-msakxttraq เสื้อผูกเชือกเขียว ทึบ 15% — ยังไม่แก้ รอ user) · แก้ทั้งหมดใน Supabase live แล้ว (ไม่ต้อง push)
- **2026-08-01** — 🚀 **push แชร์+ล็อกอิน (`b1e82f0`)** → live บน Vercel · ตั้ง Supabase Auth URL config (localhost + dood-red.vercel.app) + ตาราง saved_looks เสร็จ
- **2026-08-01** — 🔗☁️ **แชร์ลุค + ระบบล็อกอิน (Magic Link)**: ปุ่มแชร์เข้ารหัสลุคใน URL (`?l=`) + Web Share/ก๊อปลิงก์ + เปิดลิงก์ใส่ลุคทันที · OG meta + favicon · `@supabase/supabase-js` + **Magic Link** (เปลี่ยนจาก OTP เพราะแก้เทมเพลตต้องมี SMTP ก่อน — magic link ใช้อีเมลในตัวได้เลย, flow=implicit เผื่อเปิดลิงก์คนละเบราว์เซอร์) · savedLooksStore เป็น guest(localStorage)/user(Supabase) ย้ายข้อมูลตอนล็อกอิน · ตาราง `saved_looks` + RLS (`sql/saved_looks.sql`) · guest+UI เทสต์ผ่าน+build ผ่าน · **ก่อน launch: ตั้ง SMTP (Resend/Gmail)** เพราะอีเมลในตัวจำกัดโควตา
- **2026-08-01** — 🚀 **push B2 (`1b20fda`)**: Backend B2 + สินค้าจริง 23 ชิ้น + ลิงก์ Shopee + แก้ bg/ขนาด + snapshot ของจริง → เว็ปจริง sync ครบ
- **2026-08-01** — 💰 **ใส่ลิงก์ Shopee ครบ 23/23** (1 ลิงก์/ประเภท) → รายได้ปลดล็อก
- **2026-08-01** — 📐 ตั้ง scale=0.8 (80%) ให้เสื้อสายเดี่ยวทั้ง 7 ตัว (bulk PATCH category=top) → เว็ปจริงอัปเดตแล้ว
- **2026-08-01** — 🩳 **แก้ bg หว่างขากางเกงสีอ่อน**: กางเกงขาว+ม่วงอ่อน พื้นหลังหว่างขาไม่ถูกลบ (ขาวบนขาว ตัดไม่ออก) → flood-fill จากจุดกลาง ลบเฉพาะขาวแท้ (L≥250) ที่ต่อเนื่องกัน (ไม่โดนเชือก/เนื้อผ้า) → อัปรูปใหม่ขึ้น Supabase เว็ปจริงอัปเดตแล้ว
- **2026-08-01** — 🧹 **ตรวจสินค้าจริง + แก้ bg หมวก**: ล้างเดโมหมด → ใส่ของจริง 23 ชิ้น (หมวก 7 · เสื้อสายเดี่ยว 7 · กางเกงวอร์ม 9). ตรวจ bg บนพื้นชมพู: เสื้อ+กางเกงเนียนสม่ำเสมอดี · **หมวก 3 ใบ (ครีม/กรม/ชมพู) มีลายน้ำสตูดิโอตกค้าง** ทำให้ trim เพี้ยน+เงาลอยเหนือหมวก → แก้ด้วย crop largest-blob (ตัดตัวอักษรที่แยกจากหมวกทิ้ง) อัปรูปใหม่ขึ้น Supabase → เงาหาย ขนาด/ตำแหน่งหมวกสม่ำเสมอทุกใบ (เว็ปจริงอัปเดตแล้วเพราะอ่าน Supabase)
- **2026-07-31** — 🔑 **จัดการ key ที่หลุดสำเร็จ**: สร้าง `sb_secret_` ใหม่ + disable legacy keys → key เก่าที่เคยวางในแชตตายแล้ว (ยืนยัน 401) · เว็ปลูกค้า+แอดมินใช้ได้ปกติ
- **2026-07-31** — 🗄️ **Backend B2 เสร็จ (ในเครื่อง)**: แอดมิน CRUD เขียนขึ้น Supabase Storage+DB โดยตรง (soft-delete, ไฟล์อิง id+เวอร์ชัน) · `scripts/supabase.mjs` helper · `npm run backup` (dump DB→snapshot+ลบไฟล์กำพร้า) · `host:'localhost'` · เทสต์ CRUD ครบ + build ผ่าน → **หลังจากนี้แก้สินค้าในแอดมินอัปเดตเว็ปจริงทันที ไม่ต้อง push** (ยังไม่ push B2 + ยังไม่ rotate key)
- **2026-07-28** — 🔍 **health-check ทั้งระบบ**: เจาะทดสอบ RLS (anon insert/update/delete/storage โดนกันครบ), เช็ก bundle/git ไม่มี service key รั่ว, npm audit (6 ช่องโหว่ = dev-only). พบ 2 จุดตามต่อ: rotate key + `host:true` เสี่ยงตอน B2. อัปเดต §3 เรียงลำดับใหม่: B2 → affiliate → แชร์/OG → analytics
- **2026-07-28** — 🚀 push B1 (`2d08d12`) + ใส่ env ใน Vercel → เว็ปโปรดักชันอ่าน Supabase
- **2026-07-28** — 🗄️ **Backend B1 เสร็จ**: Supabase (ตาราง+RLS+bucket) · migration 36 ชิ้น+รูป · `getCatalog()` อ่าน Supabase + cache 3 ชั้น · เทสต์ผ่านหมด (อ่าน/RLS/fallback)
- **2026-07-28** — รวมแผน backend เหลือไฟล์เดียว: `planning-backend.md` = ฉบับ final (ลบ `-final` ทิ้ง) + แก้ทุก reference
- **2026-07-28** — 🚀 **push งานค้างทั้งหมดขึ้น Vercel** (main) — เว็ปจริง sync แล้ว
- **2026-07-28** — สร้าง `status.md` + ลงทะเบียนใน DOOD-INDEX
- **2026-07-28** — สร้าง `DOOD-INDEX.md` (แผนที่ไฟล์ → งาน)
- **2026-07-28** — planning backend: วิเคราะห์+รีวิว → เลือกแนวทาง 🅰️ Supabase (ฉบับ final)
- **2026-07-28** — สร้าง `ROADMAP.md` (โรดแมป 5 เฟส)
- **2026-07-28** — แอดมิน: FittingPreview (preview+ไกด์ไลน์) + สไลเดอร์ scale รายชิ้น + แผงเลื่อนได้
- **2026-07-28** — ทรงกระโปรง/ขาสั้น + auto-balance ขนาดตามทรง (aspect) + fit field
- **(ก่อนหน้า)** — กรองเพศ · ดูชุดเต็ม (LookPreview) · จัดแถบบน · ปุ่มตาซ่อนเลเยอร์

---

## §6. 🔗 เอกสารที่เกี่ยวข้อง

**เว็ปจริง (production): https://doodstyles.com** (เดิม dood-red.vercel.app ยังใช้ได้) · Supabase: `jphtnutfuaeljfamuwbe` · GitHub: NapatChan/DOOD

[DOOD-INDEX.md](DOOD-INDEX.md) (แผนที่ไฟล์) · [ROADMAP.md](ROADMAP.md) (ภาพรวม) · [planning-backend.md](planning-backend.md) · [planning-ai-agent.md](planning-ai-agent.md) · [planning-frontend.md](planning-frontend.md)
