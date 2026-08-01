# 📊 DOOD — Status (ติดตามงาน)

> **ไฟล์นี้ = สถานะปัจจุบันของโปรเจกต์: ทำถึงไหนแล้ว / ต่อไปทำอะไร**
> 📌 **กฎ: อัปเดตไฟล์นี้ทุกครั้งที่มีการเปลี่ยนแปลง** (เสร็จงาน / เริ่มงานใหม่ / push / ตัดสินใจ) + เพิ่มบรรทัดใน §5 Change log
> อัปเดตล่าสุด: 2026-07-31 (Backend B2 เสร็จในเครื่อง)

---

## §1. 🟡 สถานะ Git — มีงานค้าง (B2 ยังไม่ push)

- **push ล่าสุด: `2d08d12` (Backend B1)** — เว็ปจริงอ่าน Supabase แล้ว
- **ค้างในเครื่อง (ยังไม่ push): Backend B2** — แอดมินเขียนขึ้น Supabase + `npm run backup` + snapshot รูปเปลี่ยนเป็นชื่ออิง id (ไฟล์เยอะ ดู `git status`)
- ⚠️ **อย่าเพิ่ง push จนกว่าเจ้าของสั่ง** — (rotate service key เสร็จแล้ว ✅ ปลอดภัย)

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

> 🔍 **ผล health-check 2026-07-28**: ระบบแข็งแรง+ปลอดภัยดี (RLS กันเขียนครบ, service key ไม่รั่วใน bundle/git). ปัญหาหลัก = **ยังหาเงินไม่ได้ + แชร์ไม่ได้ + วัดผลไม่ได้** (ไม่ใช่ปัญหาเทคนิค). ลำดับแนะนำ: B2 → affiliate → แชร์/OG → analytics

**ลำดับ 1 — B2 ✅ เสร็จในเครื่องแล้ว** (แอดมินเขียนขึ้น Supabase — เลิก push เพื่อแก้สินค้า)
- [x] 🤖 `scripts/supabase.mjs` (helper service key: DB select/insert/update + storage upload/delete/download)
- [x] 🤖 `admin-plugin.mjs`: GET/POST/PUT/DELETE → Supabase Storage+DB · ชื่อไฟล์อิง id+เวอร์ชัน · เปลี่ยนรูปลบไฟล์เก่า · DELETE = soft-delete (`is_active=false`, เก็บไฟล์รูป)
- [x] 🤖 `AdminApp.tsx`: `assetUrl()` รองรับ URL เต็มจาก Supabase (3 จุด)
- [x] 🤖 `scripts/backup-catalog.mjs` + `npm run backup` (ดึง DB → `products.json` + รูป + ลบไฟล์กำพร้า)
- [x] 🔒 `vite.config.ts` `host: true` → `'localhost'` (กันคนใน LAN เข้าแอดมินที่ถือ service key)
- [x] 🧪 เทสต์ผ่านหมด: GET 36 · POST สร้างขึ้น Supabase+รูปขึ้น CDN (200) · PUT แก้ได้ · DELETE soft-delete หายจาก catalog · `npm run backup` sync ได้ · build+tsc ผ่าน · แอดมิน UI เรนเดอร์รูป Supabase 0 error
- [x] 🔑 **จัดการ key ที่หลุด**: สร้าง secret key ใหม่ (`sb_secret_...`) ใส่ `.env` + **Disable legacy API keys** → เทสต์ยืนยัน key เก่าตาย (401), key ใหม่เขียนได้ (201), เว็ปลูกค้าอ่านได้ (publishable, 36)
- [ ] 🧑 **push B2** (สั่ง "push ที") — ปลอดภัยแล้ว rotate เสร็จ

**ลำดับ 2 — Roadmap เฟส 1: หาเงิน + โต** (ดู [ROADMAP.md](ROADMAP.md))
- [x] 🧑 สมัคร affiliate Shopee + ใส่ลิงก์ครบ **23/23** (1 ลิงก์/ประเภท → หน้า listing มีทุกสีเป็น variant) → **รายได้ปลดล็อกแล้ว**
- [ ] 🤖 ปุ่มแชร์ลุค (Web Share API) + SEO/OG meta + favicon — ตอนนี้ `index.html` มีแค่ `<title>` แชร์ไปขึ้นการ์ดเปล่า
- [ ] 🤖 Analytics เบาๆ (Vercel Analytics — ฟรี, ไม่ต้อง cookie banner) → เริ่มเก็บ traffic/ชิ้นฮิตก่อนตัดสินใจเฟสถัดไป

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
[DOOD-INDEX.md](DOOD-INDEX.md) (แผนที่ไฟล์) · [ROADMAP.md](ROADMAP.md) (ภาพรวม) · [planning-backend.md](planning-backend.md) · [planning-ai-agent.md](planning-ai-agent.md) · [planning-frontend.md](planning-frontend.md)
