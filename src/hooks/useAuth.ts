import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, authEnabled } from '../data/supabaseClient';

// สถานะล็อกอิน + ฟังก์ชัน Email OTP (ส่งรหัส → ยืนยันรหัส → ออกจากระบบ)
export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    if (!authEnabled) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // ส่งลิงก์เข้าสู่ระบบ (magic link) ไปที่อีเมล — กดลิงก์กลับมาแล้วล็อกอินอัตโนมัติ
  // สร้างบัญชีให้เลยถ้ายังไม่มี · redirect กลับมาที่หน้าเดิม
  const sendMagicLink = useCallback(
    (email: string) =>
      supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin, shouldCreateUser: true },
      }),
    [],
  );
  // ล็อกอินแตะเดียวผ่าน OAuth (Google/Facebook) — เด้งไปหน้าผู้ให้บริการแล้วกลับมาที่โดเมนเดิม
  const signInWithProvider = useCallback(
    (provider: 'google' | 'facebook') =>
      supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: window.location.origin },
      }),
    [],
  );
  const signOut = useCallback(() => supabase.auth.signOut(), []);

  return {
    authEnabled,
    session,
    email: session?.user?.email ?? null,
    isLoggedIn: Boolean(session),
    sendMagicLink,
    signInWithProvider,
    signOut,
  };
}
