// Supabase client ฝั่งลูกค้า (anon key + auth session)
// ใช้สำหรับ: ล็อกอิน (Email OTP) + อ่าน/เขียน saved_looks ของผู้ใช้ที่ล็อกอิน
// catalog ยังอ่านผ่าน fetch เดิมใน catalogSource.ts (ไม่ต้องแก้)
import { createClient } from '@supabase/supabase-js';

const SB_URL = import.meta.env.VITE_SUPABASE_URL;
const SB_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

// มี env ครบไหม — ถ้าไม่มี (เช่น dev ยังไม่ตั้งค่า) auth/ล็อกอินจะถูกปิด แต่แอปยังทำงาน (guest)
export const authEnabled = Boolean(SB_URL && SB_ANON);

export const supabase = createClient(SB_URL ?? 'http://localhost', SB_ANON ?? 'anon', {
  auth: {
    persistSession: true, // จำ session ไว้ใน localStorage (ถ้าโดนล้าง แค่ล็อกอินใหม่ ลุคไม่หาย—อยู่ใน DB)
    autoRefreshToken: true,
    detectSessionInUrl: true, // กดลิงก์ในเมล (magic link) กลับมา → รับ session จาก URL อัตโนมัติ
    // implicit: token มากับ URL โดยตรง → กดลิงก์เปิดคนละเบราว์เซอร์กับที่ขอก็ยังเข้าได้
    // (pkce ต้องมี verifier ในเบราว์เซอร์เดิม — พังถ้าลิงก์เปิดใน Safari แต่ขอจาก in-app browser)
    flowType: 'implicit',
  },
});
