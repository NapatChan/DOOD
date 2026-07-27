// โหลด URL รูปสินค้าทุกหมวดจาก src/assets อัตโนมัติ (Vite glob)
// key = path ที่อ้างใน products.json เช่น "shirts/01.png" → ค่า = URL ที่ bundle แล้ว
// เพิ่มไฟล์ใหม่ผ่านหน้าแอดมิน (เขียนลง assets) แล้ว Vite HMR อัปเดต map นี้ให้เอง
const modules = import.meta.glob('../assets/**/*.{png,webp}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

export const imageUrlByPath: Record<string, string> = {};
for (const [p, url] of Object.entries(modules)) {
  const rel = p.replace(/^\.\.\/assets\//, ''); // "../assets/shirts/01.png" → "shirts/01.png"
  imageUrlByPath[rel] = url;
}
