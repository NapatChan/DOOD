#!/bin/zsh
# ▶️ DOOD — เริ่มระบบ (ดับเบิลคลิกเพื่อรัน)
# เปิด dev server + เบราว์เซอร์ให้อัตโนมัติ

# ให้เจอ Node ที่ติดตั้งไว้ (~/.local/node) แล้วค่อย fallback เป็นของระบบ
export PATH="$HOME/.local/node/bin:$PATH"

# ย้ายไปโฟลเดอร์โปรเจกต์ (ที่ไฟล์นี้อยู่)
cd "$(dirname "$0")" || exit 1

echo "📦 กำลังเช็ก dependencies..."
if [ ! -d node_modules ]; then
  echo "   (ครั้งแรก — กำลังติดตั้ง อาจใช้เวลาสักครู่)"
  npm install || { echo "❌ ติดตั้งไม่สำเร็จ"; exit 1; }
fi

echo ""
echo "🚀 เปิด DOOD แล้ว!"
echo "   • แอป (ลูกค้า):  http://localhost:5173/"
echo "   • แอดมิน:        http://localhost:5173/admin.html"
echo ""
echo "   ⚠️ อย่าปิดหน้าต่างนี้ระหว่างใช้งาน — ปิดเมื่อไรระบบหยุด"
echo "   (หรือดับเบิลคลิก stop.command เพื่อหยุด)"
echo ""

# เปิดเบราว์เซอร์ให้อัตโนมัติ (หน่วง 3 วิ รอ server ตื่น) — ปิดได้ด้วย NO_OPEN=1
if [ -z "$NO_OPEN" ]; then
  ( sleep 3; open "http://localhost:5173/admin.html" ) &
fi

# รัน dev server (ค้างไว้ในหน้าต่างนี้ = ระบบทำงานอยู่)
npm run dev
