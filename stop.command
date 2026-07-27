#!/bin/zsh
# ⏹️ DOOD — หยุดระบบ (ดับเบิลคลิกเพื่อหยุด)
# ปิด dev server ที่กำลังรันอยู่

echo "🛑 กำลังหยุด DOOD..."

# ปิดโปรเซส vite (dev server) ทั้งหมด
if pkill -f "vite" 2>/dev/null; then
  echo "✅ หยุดเรียบร้อยแล้ว"
else
  echo "ℹ️ ไม่พบ DOOD ที่กำลังรันอยู่ (อาจหยุดไปแล้ว)"
fi

# เผื่อมีอะไรค้างที่พอร์ต 5173/5174
for port in 5173 5174; do
  pids=$(lsof -ti tcp:$port -sTCP:LISTEN 2>/dev/null)
  [ -n "$pids" ] && echo "$pids" | xargs kill 2>/dev/null
done

sleep 1
echo ""
echo "(ปิดหน้าต่างนี้ได้เลย)"
