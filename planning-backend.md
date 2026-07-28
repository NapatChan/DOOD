# 🗄️ DOOD — Planning Backend (FINAL)

> ฉบับสมบูรณ์หลังรีวิว — ไฟล์เดียวจบ (การตัดสินใจ + สถาปัตยกรรม + schema + เฟสลงมือ)
> อัปเดต: 2026-07-28 · สถานะ: **พร้อมลงมือ B1 ทันทีที่ได้ Supabase keys**

## ✅ การตัดสินใจที่ล็อกแล้ว

| เรื่อง | ตัดสินใจ |
|---|---|
| แนวทาง | **🅰️ Supabase (DB+Storage) + แอดมินรันที่เครื่อง** เริ่มก่อน → อัป 🅱️ (แอดมินออนไลน์) ทีหลัง ข้อมูลไม่ย้ายซ้ำ |
| ประมวลผลรูป | อยู่ที่เครื่องเจ้าของ (reuse ไปป์ไลน์เดิม 100%: ตัดพื้นหลัง→trim→WebP→สี→aspect→fit) |
| auth แอดมินเฟสนี้ | service_role key ใน `.env` เครื่องเจ้าของเท่านั้น |
| ลำดับ | **B1** (เว็ปอ่าน Supabase) → **B2** (แอดมินเขียน Supabase = เลิก push) → ค่อยชั่งใจ B3/B4 |

**เกณฑ์สำเร็จรวม:** เพิ่ม/แก้สินค้าแล้วเว็ปจริงอัปเดต**โดยไม่ต้อง push** · รูปผ่าน CDN · ข้อมูลอยู่ DB จริง · **และเว็ปต้องเร็ว/ทนล่มไม่แพ้ของเดิม** (ข้อนี้เพิ่มจากรีวิว)

---

## 0. ทางเลือกที่พิจารณา (สรุปการวิเคราะห์)

ปมหลัก = **"ประมวลผลรูปที่ไหน"** เพราะ sharp + @imgly ต้องการ Node เนทีฟ (รันบน Vercel serverless แบบจำกัดไม่ได้)

| ประเด็น | 🅰️ Supabase + local admin ✅ **เลือก** | 🅱️ Custom Node API (Fastify) ⏭️ เฟสหลัง |
|---|---|---|
| งานดูแลเซิร์ฟเวอร์ | ไม่มี | มี (always-on service) |
| reuse ไปป์ไลน์รูปเดิม | ✅ 100% | ✅ (ยกมา) |
| แอดมินจากที่อื่น | ❌ (เครื่องเจ้าของ) | ✅ |
| ค่าใช้จ่าย/เดือน | ~฿0 (free tier) | +$5–7 (host) |
| เวลาทำ | สั้น | กลาง |

> เริ่ม 🅰️ ก่อน (แก้ปัญหาหลักครบด้วย ops น้อยสุด + reuse ของเดิม) แล้วอัป 🅱️ ทีหลังได้ทันที — DB/Storage/Schema แกนเดียวกัน ข้อมูลไม่ย้ายซ้ำ

---

## 1. สถาปัตยกรรม (ภาพเดียวจบ)

```
[เจ้าของ] แอดมิน local (Vite dev + admin-plugin)
   └─ ไปป์ไลน์รูปเดิม (ไม่เปลี่ยน)
        ├─ upload WebP → Supabase Storage  (ชื่อไฟล์มีเวอร์ชัน — ดู §4)
        └─ CRUD แถว → Supabase DB          (service_role key จาก .env)

[ลูกค้า] เว็ป Vercel (static)
   └─ getCatalog() → cache 3 ชั้น (ดู §3)
        ├─ ① localStorage cache  → โชว์ทันที ไม่รอ network
        ├─ ② fetch Supabase REST (anon key, read-only) → อัปเดตเงียบ ๆ
        └─ ③ bundled snapshot    → fallback สุดท้าย (Supabase ล่ม/ครั้งแรก+ออฟไลน์)
```

หลักความปลอดภัย: **anon key เขียนอะไรไม่ได้เลย (RLS)** · **service key ไม่ออกจากเครื่องเจ้าของ ไม่ขึ้น git ไม่มีวันอยู่ใน bundle**

---

## 2. Schema (v2 — เพิ่ม 2 คอลัมน์จากรีวิว)

```sql
create table products (
  id          text primary key,                    -- คงรูปแบบเดิม (top-xxx)
  category    text not null check (category in ('hat','top','pants')),
  name        text not null,
  price       int  not null default 0,
  color       text not null default '#d4d4d4',
  image_url   text not null,                       -- URL เต็มจาก Storage
  buy_url     text not null default '',
  style       text not null default '',
  gender      text not null default 'unisex' check (gender in ('male','female','unisex')),
  fit         text check (fit in ('long','short')),
  aspect      numeric,
  scale       numeric,
  sort_order  int  not null default 0,             -- migration ตั้งตามลำดับเดิมใน json
  is_active   boolean not null default true,       -- ★ soft delete (ดูเหตุผลล่าง)
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()   -- ★ ไว้ทำ cache invalidation
);

-- อัปเดต updated_at อัตโนมัติทุกครั้งที่แก้แถว
create or replace function touch_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;
create trigger products_touch before update on products
  for each row execute function touch_updated_at();

-- RLS: สาธารณะอ่านได้เฉพาะสินค้า active · เขียนไม่ได้เลย (ไม่มี policy เขียน)
alter table products enable row level security;
create policy "public read active" on products
  for select using (is_active = true);
-- service_role bypass RLS → แอดมินเขียน/เห็นทุกแถว
```

**ทำไมต้องมี `is_active` (soft delete):** ลุคที่ลูกค้าบันทึกไว้อ้าง **id สินค้า** ถ้าลบแถวจริง ลุคเก่าของลูกค้าจะ resolve ไม่เจอ → "ลบ" ในแอดมิน = ตั้ง `is_active=false` (หายจากเว็ป แต่ id ยังอยู่) · ลบจริงมีเฉพาะกรณีเผลอเพิ่มผิด

**ทำไมต้องมี `updated_at`:** ฝั่งลูกค้าเช็ก `max(updated_at)` แบบเบา ๆ ก็รู้ว่า cache เก่าหรือยัง ไม่ต้องดึงทั้งตารางทุกครั้ง (เฟสแรกยังดึงทั้งตารางได้ — 36 แถวจิ๋วมาก — แต่คอลัมน์ต้องมีตั้งแต่วันแรก เพิ่มทีหลังยุ่งกว่า)

**ตาราง `saved_looks` (เฟส B4 — ยังไม่สร้างตอนนี้):**
`id uuid PK, user_id uuid → auth.users, items jsonb, hidden jsonb, created_at` + RLS `user_id = auth.uid()`

**สไตล์:** คงอยู่ใน [src/config/styles.ts](src/config/styles.ts) (ยังไม่ขึ้นตาราง — เพิ่มเมื่ออยากแก้ผ่านแอดมิน)

---

## 3. Cache 3 ชั้นฝั่งลูกค้า (★ ของใหม่จากรีวิว — กัน regression)

**ปัญหา:** เดิม catalog ฝังใน bundle = เปิดปุ๊บปัดได้เลย + ออฟไลน์ก็ทำงาน ถ้าสลับเป็น "fetch อย่างเดียว" เว็ปจะ**ช้าลงและพังได้** ขัดหลัก "เข้ามาปัดได้เลย"

**ทางแก้ (stale-while-revalidate ใน `catalogSource.ts` — UI ไม่รู้เรื่อง):**

1. **โชว์ก่อน:** มี cache ใน localStorage (`dood.catalog.v1`) → คืนให้ UI ทันที (0ms เท่า bundle เดิม)
2. **อัปเดตเบื้องหลัง:** fetch Supabase → ถ้าได้ข้อมูลใหม่ → เขียนทับ cache + แจ้ง UI รีเฟรชเงียบ ๆ
3. **fallback สุดท้าย:** ไม่มี cache (เข้าครั้งแรก) และ fetch พัง → ใช้ **bundled snapshot** (`catalog/products.json` เดิมที่ยัง bundle ไว้) → เว็ปไม่มีวันจอเปล่า

> โบนัส: snapshot ตัวนี้คือไฟล์เดียวกับผลลัพธ์ `npm run backup` (§6) — backup กับ fallback เป็นของชิ้นเดียวกัน อัปเดตพร้อมกัน

**สัญญาใหม่เล็กน้อยใน seam:** `getCatalog()` ยังคืนเหมือนเดิม + เพิ่ม callback แจ้ง "ข้อมูลใหม่มา" (หรือให้ hook subscribe) — แตะ `useWardrobe` นิดเดียว, UI คอมโพเนนต์ไม่แตะ

---

## 4. รูปภาพ: Storage + cache busting (★ แก้กับดัก CDN)

- bucket `products` (public read) · อัปโหลดตอนบันทึกด้วย `cacheControl` ยาว (immutable ได้เพราะชื่อไฟล์ไม่ซ้ำ)
- **ชื่อไฟล์มีเวอร์ชัน:** `products/<id>-<timestamp36>.webp` — **ห้ามใช้ path คงที่** เพราะแก้รูปทับ path เดิมแล้ว CDN จะเสิร์ฟรูปเก่าค้าง
- เปลี่ยนรูป = อัปไฟล์ใหม่ (ชื่อใหม่) → อัปเดต `image_url` ในแถว → ลบไฟล์เก่าทิ้ง (กันขยะเต็ม storage)
- ลบสินค้า (soft delete) → เก็บรูปไว้ (ลุคเก่ายังต้องแสดง) · ลบจริง → ลบรูปด้วย

---

## 5. กติกา env (★ กันหลุด — สำคัญสุดในไฟล์นี้)

| ตัวแปร | prefix | อยู่ไหน | ใครเห็น |
|---|---|---|---|
| `VITE_SUPABASE_URL` | ✅ VITE_ | `.env` + Vercel env | สาธารณะ (อยู่ใน bundle — ตั้งใจ) |
| `VITE_SUPABASE_ANON_KEY` | ✅ VITE_ | `.env` + Vercel env | สาธารณะ (ปลอดภัยเพราะ RLS) |
| `SUPABASE_SERVICE_KEY` | ⛔ **ห้ามมี VITE_** | `.env` เครื่องเจ้าของเท่านั้น | admin-plugin (Node) เท่านั้น |

> ⚠️ **กับดักอันตรายที่สุด:** Vite ฝังตัวแปร `VITE_*` **ทุกตัว** ลง bundle สาธารณะ — ถ้าเผลอตั้ง `VITE_SUPABASE_SERVICE_KEY` = key ลับขึ้นเว็ปให้โลกเห็นทันที **service key ต้องไม่มี prefix VITE_ เด็ดขาด** (ไม่มี prefix → Vite ไม่ฝัง → Node อ่านได้ฝ่ายเดียว)
> - `.env` อยู่ใน `.gitignore` แล้ว ✓ · สร้าง `.env.example` (ค่าปลอม) ไว้เป็นแม่แบบ commit ได้

---

## 6. Backup (★ ของใหม่จากรีวิว — แทน git history ที่หายไป)

**ปัญหา:** ตอนนี้ catalog อยู่ใน git = มีประวัติย้อนได้ทุกเวอร์ชันฟรี ๆ พอย้ายขึ้น DB ตาข่ายนิรภัยนี้หายเงียบ ๆ

**ทางแก้:** สคริปต์ `scripts/backup-catalog.mjs` (`npm run backup`):
1. ดึงทุกแถวจาก Supabase → เขียนทับ `catalog/products.json` (โครงเดิม)
2. commit เข้า git ตามรอบปกติ → ได้ประวัติเวอร์ชันต่อ + **เป็น fallback snapshot ของ §3 ไปในตัว**
3. รันเป็นระยะ (แนะนำ: หลังเพิ่มสินค้าล็อตใหญ่ หรือก่อน push ทุกครั้ง)

---

## 7. สิ่งที่แก้ในโค้ด (สรุปทั้งหมด)

| ไฟล์ | แก้อะไร | เฟส |
|---|---|---|
| `src/data/catalogSource.ts` | ไส้ใน `getCatalog()` → cache 3 ชั้น + fetch Supabase + map `image_url` | B1 |
| `src/data/productImages.ts` | เลิกใช้/ลบ (ไม่ glob รูปใน repo แล้ว) | B1 |
| `src/hooks/useWardrobe.ts` | รับสัญญาณ "ข้อมูลใหม่มา" จาก catalogSource (เล็กน้อย) | B1 |
| `scripts/migrate-to-supabase.mjs` | ใหม่ — ย้าย 36 ชิ้น + รูป (set `sort_order` ตามลำดับเดิมใน json) | B1 |
| `scripts/admin-plugin.mjs` | ปลายทางเขียน: Storage+DB แทน assets+json · ลบ = soft delete · เปลี่ยนรูป = ไฟล์ใหม่+ลบเก่า | B2 |
| `scripts/backup-catalog.mjs` | ใหม่ — dump DB → `catalog/products.json` | B2 |
| `src/admin/api.ts` | **ไม่แก้** (ยังยิง `/api/products` ที่ local plugin สัญญาเดิม — ไม่ต้องมี auth header เพราะ plugin ถือ key เอง) | — |
| UI ทุกคอมโพเนนต์ | **ไม่แตะ** | — |
| `.env.example` | ใหม่ — แม่แบบ env (ค่าปลอม) | B1 |
| `package.json` | เพิ่ม script `migrate`, `backup` | B1/B2 |

---

## 8. เฟสลงมือ + เช็กลิสต์

### B1 — เว็ปอ่านจาก Supabase (เร็ว+ทนล่มเท่าเดิม)
- [ ] 🧑 สมัคร Supabase (region **Singapore**) → ส่ง Project URL + anon key + service key
- [ ] 🤖 รัน SQL §2 (ตาราง + trigger + RLS)
- [ ] 🤖 สร้าง bucket `products` (public)
- [ ] 🤖 เขียน+รัน `migrate-to-supabase.mjs` (ชื่อไฟล์มีเวอร์ชัน + sort_order ตามลำดับเดิม)
- [ ] 🤖 `catalogSource.ts` → cache 3 ชั้น + fetch + fallback snapshot
- [ ] 🤖 `.env.example` + ใส่ env จริงใน `.env` และ Vercel
- [ ] 🧪 เทสต์: เว็ปโหลดครบ 36 · ลำดับสินค้าเท่าเดิม · **ปิด network แล้วเปิดแอปยังใช้ได้ (fallback)** · **ยิง insert ด้วย anon key ต้องถูกปฏิเสธ (RLS)**

### B2 — แอดมินเขียนขึ้น Supabase (เลิก push)
- [ ] 🤖 `admin-plugin.mjs`: upload storage (ไฟล์เวอร์ชันใหม่+ลบเก่า) + CRUD DB + soft delete
- [ ] 🤖 `backup-catalog.mjs` + `npm run backup`
- [ ] 🧪 เทสต์: เพิ่ม/แก้/แก้รูป/ลบ ในแอดมิน → เว็ปจริงเห็นทันทีไม่ต้อง push · แก้รูปแล้ว**ไม่เจอรูปเก่าค้าง** · ลบแล้วลุคเก่าที่อ้างชิ้นนั้นไม่พัง

### B3 — (อนาคต) อัป 🅱️: Fastify + admin auth → จัดการจากทุกที่
### B4 — (อนาคต) Supabase Auth + ตาราง `saved_looks` → ลุคข้ามเครื่อง

---

## 9. ความเสี่ยงคงเหลือ (หลังอุดช่องโหว่จากรีวิวแล้ว)

| ความเสี่ยง | การรับมือ |
|---|---|
| RLS ตั้งพลาด | มีขั้นเทสต์บังคับใน B1 (anon ยิง insert ต้อง fail) ก่อนถือว่าผ่าน |
| service key รั่ว | กติกา env §5 (ห้าม VITE_ prefix) + gitignore + อยู่เครื่องเดียว |
| Supabase ล่ม/ช้า | cache 3 ชั้น §3 — เว็ปยังเปิดได้จาก cache/snapshot เสมอ |
| รูปเก่าค้าง CDN | ชื่อไฟล์เวอร์ชัน §4 |
| ข้อมูลใน DB พัง/ลบผิด | `npm run backup` §6 + soft delete + เก็บของเดิมจนเสถียร |
| free tier เต็ม | 36 ชิ้น ≈ ไม่กี่ MB จาก 1GB — เหลือเฟือ ค่อยดูเมื่อโตจริง |
| แอดมินหลายคนพร้อมกัน | ยังไม่รองรับ (last-write-wins) — ปัญหาของเฟส B3 ไม่ใช่ตอนนี้ |

---

## 10. ต้นทุน

- Supabase free tier (DB 500MB + Storage 1GB) = **฿0** · Vercel = ฿0 (เดิม) → **รวม ~฿0/เดือน**
- อัป 🅱️ ภายหลัง: +$5–7/เดือน (host Node)

---

## 11. ก้าวแรก

**คุณ:** สมัคร supabase.com → New project (Singapore) → Settings → API → ส่ง 3 ค่า: `Project URL` / `anon public` / `service_role`
**ผม:** เริ่ม B1 ตามเช็กลิสต์ §8 ทันที — ทำเสร็จเทสต์ให้ดูก่อนแตะ B2
