# DOOD — Frontend Phase 1

แอปแต่งตัวมาสคอตแบบปัดซ้าย/ขวา (ดูรายละเอียดใน [planning.md](planning.md))

## รันโปรเจกต์

> ต้องมี Node.js 18+ (เครื่องนี้ติดตั้ง Node 22 ไว้ที่ `~/.local/node` แล้ว — PATH ถูกเพิ่มใน `~/.zshrc`)

```bash
npm install     # ครั้งแรกครั้งเดียว
npm run dev     # แอป http://localhost:5173/  ·  แอดมิน http://localhost:5173/admin.html
npm run build   # build โปรดักชันไป dist/ (ไม่รวมหน้าแอดมิน)
npm run add     # นำเข้าเสื้อผ้ายกล็อตจากโฟลเดอร์ catalog/ (ดู catalog/README.md)
```

## เพิ่มเสื้อผ้า — 2 ทาง

**ก) หน้าแอดมิน (แนะนำ)** — เปิด `http://localhost:5173/admin.html`
กรอกฟอร์ม 6 ช่อง (รูป · ประเภท · ชื่อ · ราคา · ลิงก์ซื้อ · สไตล์) กด "เพิ่มสินค้า" — จบ
ระบบ trim/ดึงสี/บันทึกให้เอง แก้/ลบได้จากรายการด้านขวา

**ข) ยกล็อต** — โยนรูป PNG โปร่งเข้า `catalog/{hats,shirts,pants}/` ตั้งชื่อ `ชื่อ__ราคา.png`
แล้วรัน `npm run add` (merge เข้าคลังเดิม ไม่ลบของที่เพิ่มผ่านแอดมิน)
รายละเอียด: [catalog/README.md](catalog/README.md)

## สถาปัตยกรรม (เตรียมต่อ backend)

- **คลังข้อมูลเดียว:** `catalog/products.json` + รูปใน `src/assets/`
- **จุดอ่านข้อมูลจุดเดียว:** [src/data/catalogSource.ts](src/data/catalogSource.ts) — `getCatalog()` แบบ async
  วันขึ้น backend เปลี่ยนแค่ไส้ในเป็น `fetch('/api/products')` ที่เหลือไม่ต้องแก้
- **จุดเขียนข้อมูลจุดเดียว:** [src/admin/api.ts](src/admin/api.ts) — list/create/update/delete
- **สไตล์:** แก้/เพิ่ม/ลบได้ที่ [src/config/styles.ts](src/config/styles.ts) ไฟล์เดียว
- **API dev:** [scripts/admin-plugin.mjs](scripts/admin-plugin.mjs) (Vite middleware — เฉพาะตอน dev)

## วิธีเล่น

- **แตะ** เลเยอร์ (หมวก/เสื้อ/กางเกง) บนมาสคอต หรือแถบด้านล่าง เพื่อเลือกชั้นที่จะแต่ง
- **ปัดซ้าย/ขวา** ที่ชั้นที่เลือก เพื่อเปลี่ยนชิ้น (วนกลับได้)
- **👁 ตา** ที่มุมชั้น เพื่อ "ไม่ใส่" ชั้นนั้น (เช่น ไม่เอาหมวก) — แตะช่องว่างเพื่อใส่กลับ
- Desktop: ปุ่ม ‹ › หรือคีย์บอร์ด (ซ้าย/ขวา = เปลี่ยนชิ้น, บน/ล่าง = สลับชั้น)
- **อยากได้ลุคนี้** เพื่อแสดงความสนใจ (เฟสนี้ยังไม่ต่อระบบซื้อจริง)

## โครงสร้าง

```
src/
  components/   Mascot, ClothingLayer, SwipeableLayer, LayerSelector,
                NavArrows, LookBar, StageCaption, Toast
  hooks/        useWardrobe — state กลาง (selectedLayer/currentIndex/locked) + derive ราคา
  data/         items.ts — mock เสื้อผ้า (ใช้สีแทนรูป)
  types/        ClothingItem, Category, WardrobeState
```