import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

// ล็อกอินด้วย Magic Link — กรอกอีเมล → ส่งลิงก์ → กดลิงก์ในเมล → เข้าอัตโนมัติ
// ไม่มีรหัสผ่าน ไม่ต้องตั้ง SMTP (ใช้อีเมลในตัว Supabase ได้เลย)
export default function AuthModal({ open, onClose }: AuthModalProps) {
  const { sendMagicLink } = useAuth();
  const [step, setStep] = useState<'email' | 'sent'>('email');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setStep('email');
      setError(null);
      setBusy(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  async function handleSend() {
    const e = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) {
      setError('กรอกอีเมลให้ถูกต้อง');
      return;
    }
    setBusy(true);
    setError(null);
    const { error: err } = await sendMagicLink(e);
    setBusy(false);
    if (err) {
      setError(err.message || 'ส่งลิงก์ไม่สำเร็จ ลองใหม่อีกครั้ง');
      return;
    }
    setStep('sent');
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 lg:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-sm rounded-t-3xl bg-white p-6 shadow-2xl lg:rounded-3xl"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}
            initial={{ y: 40, opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 36 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-lg font-black text-neutral-900">
                {step === 'email' ? 'เข้าสู่ระบบ' : 'เช็คอีเมลของคุณ'}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="ปิด"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 transition active:scale-90"
              >
                ✕
              </button>
            </div>

            {step === 'email' ? (
              <>
                <p className="mb-4 text-sm text-neutral-500">
                  เก็บลุคโปรดของคุณไว้ไม่ให้หาย — ใส่อีเมลแล้วเราส่งลิงก์เข้าสู่ระบบไปให้
                </p>
                <input
                  ref={inputRef}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="you@email.com"
                  className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-base outline-none focus:border-neutral-900"
                />
                {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={busy}
                  className="mt-4 w-full rounded-2xl bg-neutral-900 py-3.5 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-50"
                >
                  {busy ? 'กำลังส่ง…' : 'ส่งลิงก์เข้าสู่ระบบ'}
                </button>
              </>
            ) : (
              <>
                <div className="mb-4 mt-2 text-center">
                  <div className="text-5xl">📩</div>
                  <p className="mt-4 text-sm text-neutral-600">
                    ส่งลิงก์ไปที่
                    <br />
                    <span className="font-semibold text-neutral-900">{email}</span> แล้ว
                  </p>
                  <p className="mt-3 text-sm text-neutral-400">
                    เปิดอีเมลแล้ว<span className="font-semibold text-neutral-600">กดลิงก์</span>เพื่อเข้าสู่ระบบ
                    <br />
                    (เช็คในกล่องสแปมด้วยถ้าไม่เจอ)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStep('email')}
                  className="w-full text-center text-sm text-neutral-400 underline"
                >
                  เปลี่ยนอีเมล / ส่งใหม่
                </button>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
