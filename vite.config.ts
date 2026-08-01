import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { adminApiPlugin } from './scripts/admin-plugin.mjs';

export default defineConfig({
  // admin.html เป็นเครื่องมือแอดมินภายใน — ไม่รวมใน production build
  // (build ใช้ index.html เป็น entry เดียวตามค่าเริ่มต้น)
  plugins: [react(), adminApiPlugin()],
  server: {
    // localhost เท่านั้น — แอดมิน API ถือ service key (เขียน Supabase ได้) ห้ามเปิดรับทั้งวง LAN
    // ถ้าต้องเทสจากมือถือในวงเดียวกัน ค่อยเปลี่ยนเป็น true ชั่วคราวเฉพาะตอนนั้น
    host: 'localhost',
  },
});
