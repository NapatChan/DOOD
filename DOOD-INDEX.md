# 🧭 DOOD-INDEX — แผนที่ไฟล์ "งานนี้อ่านไฟล์ไหน"

> วัตถุประสงค์: มี feature/request เข้ามา → รู้ทันทีว่า **ต้องอ่าน/แก้ไฟล์ไหน** และ **ไฟล์ไหนไม่ต้องแตะ**
> อัปเดต: 2026-07-28 · ไกด์ไลน์: [planning-frontend.md](planning-frontend.md) · [planning-backend-final.md](planning-backend-final.md)

> ### 📊 เช็กสถานะก่อนเริ่มงานเสมอ → [status.md](status.md)
> บอก **ทำถึงไหนแล้ว · ต่อไปทำอะไร · อะไรค้าง (ยังไม่ push)**
> 📌 **กฎ: อัปเดต [status.md](status.md) ทุกครั้งที่มีการเปลี่ยนแปลง** (เสร็จงาน/เริ่มงาน/push/ตัดสินใจ) พร้อมเพิ่มบรรทัดใน Change log

## วิธีใช้
1. ดูว่า request ตรงกับหมวดไหนใน **§1 ตารางงาน → ไฟล์**
2. อ่านเฉพาะไฟล์ในคอลัมน์ "อ่าน/แก้" — ที่เหลือข้ามได้
3. ถ้าเป็นการ **เพิ่ม field ใหม่** ให้ดู **§4 สูตรแก้ข้ามชั้น**
4. เช็ก **§5 ไฟล์ที่ไม่ต้องอ่าน** เพื่อไม่เสียเวลา

---

## §1. ตารางงาน → ไฟล์ที่เกี่ยวข้อง

| ถ้า request เกี่ยวกับ… | อ่าน/แก้ไฟล์เหล่านี้ | ไม่ต้องแตะ |
|---|---|---|
| **การปัดเปลี่ยนชุด / gesture / เลือกเลเยอร์** | [App.tsx](src/App.tsx) · [components/Mascot.tsx](src/components/Mascot.tsx) · [SwipeableLayer.tsx](src/components/SwipeableLayer.tsx) · [ClothingLayer.tsx](src/components/ClothingLayer.tsx) · [hooks/useWardrobe.ts](src/hooks/useWardrobe.ts) | admin/*, scripts/* |
| **ขนาด/ตำแหน่ง/สัดส่วนเสื้อผ้าบนตัวมาสคอต** (grow, ทรงสั้น/ยาว, scale, จุดยึด) | [types/index.ts](src/types/index.ts) ⭐ (`LAYER_GROW`, `GARMENT_BG_*`, `onBodyBackground`, `onBodyScale`, `GARMENT_ORIGIN`) · SwipeableLayer · ClothingLayer · [LookPreview.tsx](src/components/LookPreview.tsx) | catalog/*, scripts/* |
| **บันทึกลุค / ตะกร้า / หยิบลุคเก่ามาแต่ง** | [components/Collection.tsx](src/components/Collection.tsx) · [hooks/useSavedLooks.ts](src/hooks/useSavedLooks.ts) · [data/savedLooksStore.ts](src/data/savedLooksStore.ts) ⭐ · [LookBar.tsx](src/components/LookBar.tsx) · useWardrobe (`applyLook`) | admin/*, scripts/* |
| **ราคา / ปุ่มซื้อ / ลิงก์ affiliate** | [lib/links.ts](src/lib/links.ts) ⭐ · [MobilePriceSheet.tsx](src/components/MobilePriceSheet.tsx) · Collection · LookBar | Mascot, SwipeableLayer |
| **กรองเพศ / สไตล์** | [GenderMenu.tsx](src/components/GenderMenu.tsx) (มือถือ) · [GenderTabs.tsx](src/components/GenderTabs.tsx) (เดสก์ท็อป) · useWardrobe (`genderFilter`, `filteredItems`) · types (`Gender`) · [config/styles.ts](src/config/styles.ts) | scripts/*, savedLooks* |
| **หน้าดูชุดเต็มจอ (expand)** | [LookPreview.tsx](src/components/LookPreview.tsx) · App.tsx (ปุ่ม/state `previewOpen`) | admin/*, data/* |
| **หน้าแอดมิน (ฟอร์ม/preview/ปรับขนาด/ไกด์ไลน์)** | [admin/AdminApp.tsx](src/admin/AdminApp.tsx) · [admin/FittingPreview.tsx](src/admin/FittingPreview.tsx) · [admin/api.ts](src/admin/api.ts) ⭐ · [admin/main.tsx](src/admin/main.tsx) · [admin.html](admin.html) | components/* (ฝั่งลูกค้า) |
| **ระบบรูป: ตัดพื้นหลัง / trim / WebP / import** | [scripts/admin-plugin.mjs](scripts/admin-plugin.mjs) ⭐ · [scripts/bg-util.mjs](scripts/bg-util.mjs) · [scripts/remove-bg.mjs](scripts/remove-bg.mjs) · [scripts/add-images.mjs](scripts/add-images.mjs) | src/components/* |
| **ข้อมูลสินค้า / catalog (อ่าน)** | [catalog/products.json](catalog/products.json) · [data/catalogSource.ts](src/data/catalogSource.ts) ⭐ · [data/productImages.ts](src/data/productImages.ts) | admin/* |
| **ธีม / สี / ฟอนต์ / CSS รวม** | [src/index.css](src/index.css) · [tailwind.config.js](tailwind.config.js) · App.tsx | scripts/*, data/* |
| **ตั้งค่า build / dev server / รัน-หยุด** | [vite.config.ts](vite.config.ts) · [package.json](package.json) · [start.command](start.command)/[stop.command](stop.command) · [.vscode/](.vscode/) | src/* |
| **Backend (Supabase / migration)** | [planning-backend-final.md](planning-backend-final.md) ⭐ → แล้วแก้ catalogSource, admin-plugin, api.ts (ดูแผน §7) | components/*, LookPreview |
| **AI (ตัดพื้นหลัง / กรอกข้อมูล / สไตลิสต์)** | [planning-ai-agent.md](planning-ai-agent.md) ⭐ · admin-plugin.mjs · bg-util.mjs · remove-bg.mjs | components/* |
| **ทิศทาง/ลำดับงานรวมของโปรเจกต์** | [ROADMAP.md](ROADMAP.md) | (เอกสารเฉย ๆ) |

⭐ = ไฟล์ "แกน/จุดเดียว" ของเรื่องนั้น เริ่มอ่านจากตัวนี้

---

## §2. อ้างอิงไฟล์รายตัว (ย่อ) — "ไฟล์นี้ทำอะไร + แตะเมื่อ"

### แกนข้อมูล / logic (จุด single-source-of-truth)
| ไฟล์ | ทำอะไร | แตะเมื่อ |
|---|---|---|
| [src/types/index.ts](src/types/index.ts) | **ทุก type + ค่าคงที่การเรนเดอร์** (Category, ClothingItem, Gender, Fit, LAYER_GROW, GARMENT_BG/ORIGIN, `onBodyBackground`, `onBodyScale`, labels) | เพิ่ม field/หมวด, แก้สัดส่วน/ขนาดบนตัว |
| [src/data/catalogSource.ts](src/data/catalogSource.ts) | **จุดอ่านข้อมูลจุดเดียว** — `getCatalog()`, `RawProduct`, `toItem`, group + placeholder | เปลี่ยนแหล่งข้อมูล (→ backend), เพิ่ม field |
| [src/data/productImages.ts](src/data/productImages.ts) | map path รูป → URL (Vite glob จาก assets) | (จะเลิกใช้ตอนขึ้น backend) |
| [src/data/savedLooksStore.ts](src/data/savedLooksStore.ts) | **จุดเก็บลุคจุดเดียว** — localStorage, `getSavedLooks/saveLook/removeLook` | แก้ระบบบันทึกลุค |
| [src/admin/api.ts](src/admin/api.ts) | **จุดเขียนจุดเดียว** (ฝั่งแอดมิน) — REST `/api/products`, `AdminProduct`, `ProductInput` | เพิ่ม field, เปลี่ยน endpoint (→ backend) |
| [src/lib/links.ts](src/lib/links.ts) | ลิงก์ซื้อ: `buyLinkFor` (buyUrl หรือ fallback ค้น Google), `hasRealLink` | แก้พฤติกรรมปุ่มซื้อ |
| [src/config/styles.ts](src/config/styles.ts) | รายการสไตล์ 6 แบบ (id+label) | เพิ่ม/แก้สไตล์ |

### hooks
| ไฟล์ | ทำอะไร |
|---|---|
| [src/hooks/useWardrobe.ts](src/hooks/useWardrobe.ts) | state กลางของแอป: selectedLayer, currentIndex, hidden, genderFilter, filteredItems, ราคา, `changeItem/shuffle/toggleHidden/applyLook` |
| [src/hooks/useSavedLooks.ts](src/hooks/useSavedLooks.ts) | สะพานระหว่าง store ลุค ↔ React (useSyncExternalStore) |

### components (ฝั่งลูกค้า)
| ไฟล์ | ทำอะไร |
|---|---|
| [App.tsx](src/App.tsx) | ประกอบทั้งหน้า: gesture ระดับเวที, header, FAB, footer เดสก์ท็อป, render Mascot/Collection/LookPreview |
| [Mascot.tsx](src/components/Mascot.tsx) | วาง 3 เลเยอร์ (เลือก=Swipeable, ที่เหลือ=Clothing) |
| [SwipeableLayer.tsx](src/components/SwipeableLayer.tsx) | เลเยอร์ที่กำลังแต่ง: สไลด์ตามนิ้ว, dots, ปุ่มตา (ซ่อน) |
| [ClothingLayer.tsx](src/components/ClothingLayer.tsx) | เลเยอร์ที่ไม่ได้เลือก: แตะเพื่อเลือก |
| [LookPreview.tsx](src/components/LookPreview.tsx) | ดูชุดเต็มจอ (view-only) |
| [Collection.tsx](src/components/Collection.tsx) | overlay ลุคที่บันทึก + ลิงก์ซื้อ + affiliate disclosure |
| [MobilePriceSheet.tsx](src/components/MobilePriceSheet.tsx) | แถบราคาล่างมือถือ (ลากขึ้น) |
| [LayerSelector.tsx](src/components/LayerSelector.tsx) · [NavArrows.tsx](src/components/NavArrows.tsx) · [StageCaption.tsx](src/components/StageCaption.tsx) · [LookBar.tsx](src/components/LookBar.tsx) | ตัวช่วยเดสก์ท็อป/accessibility + ป้ายชื่อ + แถบราคา/ปุ่มลุค |
| [GenderMenu.tsx](src/components/GenderMenu.tsx) · [GenderTabs.tsx](src/components/GenderTabs.tsx) | กรองเพศ (มือถือ chip / เดสก์ท็อป segmented) |
| [Toast.tsx](src/components/Toast.tsx) · [icons.tsx](src/components/icons.tsx) | ป็อปอัปแจ้งเตือน · ไอคอน SVG (ตา ฯลฯ) |

### admin (เครื่องมือเจ้าของ — dev only)
| ไฟล์ | ทำอะไร |
|---|---|
| [admin/AdminApp.tsx](src/admin/AdminApp.tsx) | ฟอร์มเพิ่ม/แก้สินค้า + preview + สไลเดอร์ขนาด + รายการสินค้า |
| [admin/FittingPreview.tsx](src/admin/FittingPreview.tsx) | พรีวิวบนมาสคอต + เส้นปะไกด์ไลน์ |
| [admin/api.ts](src/admin/api.ts) · [admin/main.tsx](src/admin/main.tsx) · [admin.html](admin.html) | client REST · entry · หน้า HTML แอดมิน |

### scripts (Node — ประมวลผลรูป/API dev)
| ไฟล์ | ทำอะไร |
|---|---|
| [scripts/admin-plugin.mjs](scripts/admin-plugin.mjs) | **Vite dev middleware = API `/api/products`** (CRUD + ประมวลผลรูป) — de-facto contract ของ backend |
| [scripts/bg-util.mjs](scripts/bg-util.mjs) · [scripts/remove-bg.mjs](scripts/remove-bg.mjs) | ตัดพื้นหลัง (@imgly ผ่าน child-process แยก — เลี่ยงชน libvips กับ sharp) |
| [scripts/add-images.mjs](scripts/add-images.mjs) | นำเข้ารูปยกล็อตจาก `catalog/` (`npm run add`) |
| [scripts/responsive-test.mjs](scripts/responsive-test.mjs) | เทส Playwright (สกรีนช็อต) |

---

## §3. เอกสาร planning — อ่านอันไหนเมื่อไหร่
| ไฟล์ | อ่านเมื่อ |
|---|---|
| [status.md](status.md) ⭐ | **เปิดทุกครั้งก่อนเริ่มงาน** — ทำถึงไหน/ต่อไปอะไร/ค้างอะไร (ต้องอัปเดตทุกการเปลี่ยนแปลง) |
| [planning-frontend.md](planning-frontend.md) | เข้าใจหลักการ UX/gesture/state ดั้งเดิม (เฟส 1) |
| [planning-backend-final.md](planning-backend-final.md) ⭐ | **ทำ backend** (Supabase, schema, cache, migration) — ใช้ฉบับนี้ |
| [planning-backend.md](planning-backend.md) | อ้างอิงการวิเคราะห์ทางเลือก 🅰️/🅱️ เท่านั้น (ถูกแทนแล้ว) |
| [planning-ai-agent.md](planning-ai-agent.md) | ทำ AI (ตัดพื้นหลัง/กรอกข้อมูล/สไตลิสต์) |
| [ROADMAP.md](ROADMAP.md) | ดูภาพรวม/ลำดับความสำคัญทั้งโปรเจกต์ |
| [README.md](README.md) · [catalog/README.md](catalog/README.md) | วิธีรัน/เพิ่มสินค้า |

---

## §4. สูตรแก้ข้ามชั้น (recipe — จำไว้กันตกหล่น)

**เพิ่ม field ใหม่ให้สินค้า** (เช่นที่เคยทำ `fit`, `aspect`, `scale`) — ต้องแตะตามลำดับ:
1. [types/index.ts](src/types/index.ts) → เพิ่มใน `ClothingItem` (+ค่าคงที่/helper ถ้าเกี่ยวการเรนเดอร์)
2. [data/catalogSource.ts](src/data/catalogSource.ts) → `RawProduct` + copy ใน `toItem`
3. [admin/api.ts](src/admin/api.ts) → `AdminProduct` + `ProductInput`
4. [scripts/admin-plugin.mjs](scripts/admin-plugin.mjs) → เก็บค่าใน POST + PUT (+ normalize)
5. (ถ้าต้อง) [scripts/add-images.mjs](scripts/add-images.mjs) → เก็บตอน import ยกล็อต
6. (ถ้ามี UI) [admin/AdminApp.tsx](src/admin/AdminApp.tsx) → ช่องกรอก + FormState
7. (ถ้าเรนเดอร์บนตัว) SwipeableLayer + ClothingLayer + LookPreview

**แก้ขนาด/สัดส่วนเสื้อผ้าบนตัว** → แก้ที่ [types/index.ts](src/types/index.ts) **จุดเดียว** (`LAYER_GROW` / `onBodyBackground` / `onBodyScale`) มีผลทั้ง 3 จุดเรนเดอร์ (Swipeable/Clothing/LookPreview) อัตโนมัติ

---

## §5. ไฟล์/โฟลเดอร์ที่ "ไม่ต้องอ่าน" (ข้ามได้เลย)

| รายการ | เหตุผล |
|---|---|
| `src/assets/**/*.webp` | รูปไบนารี — ดูไม่ได้ประโยชน์ (แก้ผ่านแอดมิน) |
| `node_modules/` · `dist/` · `tsconfig.tsbuildinfo` · `package-lock.json` | ของ generate/dependency |
| `product/` · `public/` · `scratch-shots/` | โฟลเดอร์พัก/ชั่วคราว (ว่างหรือไฟล์ทดลอง) |
| `src/vite-env.d.ts` | type declaration มาตรฐาน Vite |
| `postcss.config.js` · `tsconfig.json` | config มาตรฐาน แทบไม่ต้องแก้ |
| `start.command`/`stop.command`/`.vscode/` | สคริปต์รัน-หยุด local (แตะเฉพาะเรื่อง dev workflow) |

> หลักคิด: **อ่านตามหมวดใน §1 ก่อน** — อย่าเปิดทั้ง `src/` ทีละไฟล์ ถ้า request ชัดว่าอยู่หมวดไหน

---

## §6. หมายเหตุสถาปัตยกรรม (ช่วยตัดสินใจว่าจะแตะไฟล์ไหน)
- **UI ไม่ยุ่งกับแหล่งข้อมูลโดยตรง** — ทุกอย่างผ่าน 3 seam: `getCatalog` (อ่าน) · `api.ts` (เขียน) · `savedLooksStore` (ลุค) → เปลี่ยน backend แทบไม่แตะ component
- **แอดมินเป็น dev-only** (`admin-plugin.mjs` `apply:'serve'`) — ไม่อยู่ใน production build
- **ประมวลผลรูปเป็น Node เนทีฟ** (sharp + @imgly) — รันเฉพาะ dev server/เครื่องเจ้าของ
- **การเรนเดอร์เสื้อผ้าบนตัว** รวมศูนย์ที่ `types/index.ts` — แก้ที่เดียวมีผลทุกหน้า
