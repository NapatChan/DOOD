# 📊 DOOD — Status (ติดตามงาน)

> **ไฟล์นี้ = สถานะปัจจุบันของโปรเจกต์: ทำถึงไหนแล้ว / ต่อไปทำอะไร**
> 📌 **กฎ: อัปเดตไฟล์นี้ทุกครั้งที่มีการเปลี่ยนแปลง** (เสร็จงาน / เริ่มงานใหม่ / push / ตัดสินใจ) + เพิ่มบรรทัดใน §5 Change log
> อัปเดตล่าสุด: 2026-07-28

---

## §1. 🟢 สถานะ Git — sync แล้ว

- **push ล่าสุด: 2026-07-28** — รวมงานค้างทั้งหมดขึ้น Vercel (กรองเพศ, ดูชุดเต็ม, ทรงกระโปรง/auto-balance, preview+ปรับขนาดแอดมิน, เอกสาร ROADMAP/INDEX/status/planning)
- เว็ปจริงบน Vercel = โค้ดล่าสุดแล้ว · ไม่มีงานค้าง push

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

**ลำดับ 1 — เคลียร์งานค้าง**
- [ ] **push งานที่ค้างทั้งหมดขึ้น Vercel** (รอเจ้าของสั่ง "push ที") — ควรทำ `npm run build` + เทสก่อน

**ลำดับ 2 — Backend เฟส B1 ✅ เสร็จในเครื่องแล้ว** (แนวทาง 🅰️ Supabase — ดู [planning-backend.md](planning-backend.md))
- [x] 🧑 สมัคร Supabase + ให้ keys → เก็บใน `.env` (gitignore)
- [x] 🤖 schema + RLS + bucket (รัน SQL) · `migrate-to-supabase.mjs` ย้าย 36 ชิ้น+รูป · สลับ `getCatalog()` อ่าน Supabase + cache 3 ชั้น
- [x] 🧪 เทสต์ผ่าน: อ่าน 36 จาก DB · รูปจาก CDN · anon เขียนโดน RLS ปฏิเสธ (401) · ตัด Supabase แล้ว fallback snapshot ยังเปิดได้
- [ ] 🧑 **เพิ่ม 2 env ใน Vercel** (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) → เว็ปโปรดักชันอ่าน Supabase
- [ ] push โค้ด B1 (รอ "push ที") — ถ้ายังไม่ใส่ env ใน Vercel เว็ปจะ fallback snapshot (ไม่พัง)
- [ ] 🤖 **B2 ถัดไป**: แอดมินเขียนขึ้น Supabase (เลิก push แก้สินค้า) + `npm run backup` + rotate service key

**ลำดับ 2.5 — ⚠️ ความปลอดภัย**
- [ ] 🧑 **rotate service_role key** (เคยวางในแชต) หลัง B2 เสร็จ → Settings→API→Reset แล้วอัปเดต `.env`

**ลำดับ 3 — Roadmap เฟส 1** (หาเงิน+โต — ดู [ROADMAP.md](ROADMAP.md))
- [ ] 🧑 สมัคร affiliate (Shopee/Lazada/TikTok) → 🤖 ใส่ลิงก์จริง (ตอนนี้ 0/36 ชิ้นมีลิงก์)
- [ ] 🤖 ปุ่มแชร์ลุค (Web Share API) + SEO/OG meta + favicon

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

- **2026-07-28** — 🗄️ **Backend B1 เสร็จ**: Supabase (ตาราง+RLS+bucket) · migration 36 ชิ้น+รูป · `getCatalog()` อ่าน Supabase + cache 3 ชั้น · เทสต์ผ่านหมด (อ่าน/RLS/fallback) — ยังไม่ push (รอใส่ env ใน Vercel)
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
