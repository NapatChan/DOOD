import { useEffect, useState } from 'react';

// เบราว์เซอร์ในแอปอื่น (LINE/FB/IG/TikTok ฯลฯ) แยก storage กัน →
// ล็อกอินไม่ค้าง + "เปิดในเบราว์เซอร์" ทำลุคที่แชร์หาย → เตือนให้เปิดใน Safari/Chrome
function isInAppBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /\bLine\/|FBAN|FBAV|FB_IAB|Instagram|Messenger|MicroMessenger|musical_ly|Bytedance|TikTok/i.test(
    ua,
  );
}

const DISMISS_KEY = 'dood.iab.dismissed';

export default function InAppBrowserNotice() {
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      if (isInAppBrowser() && !sessionStorage.getItem(DISMISS_KEY)) setShow(true);
    } catch {
      if (isInAppBrowser()) setShow(true);
    }
  }, []);

  if (!show) return null;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* คลิปบอร์ดไม่ให้เขียน → ผู้ใช้ก๊อปเองจากแถบ URL */
    }
  };

  const dismiss = () => {
    setShow(false);
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ปิด storage → ปิดแค่รอบนี้ */
    }
  };

  return (
    <div
      className="fixed inset-x-0 top-0 z-50 flex items-center gap-2 bg-neutral-900 px-3 py-2 text-white"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.5rem)' }}
    >
      <span className="text-lg leading-none">🌐</span>
      <p className="flex-1 text-[11px] leading-tight">
        เปิดใน <b>Safari / Chrome</b> เพื่อให้เข้าสู่ระบบค้างไว้ และลุคที่แชร์ไม่หาย
      </p>
      <button
        type="button"
        onClick={copyLink}
        className="whitespace-nowrap rounded-full bg-white px-3 py-1 text-[11px] font-bold text-neutral-900 active:scale-95"
      >
        {copied ? 'คัดลอกแล้ว ✓' : 'คัดลอกลิงก์'}
      </button>
      <button
        type="button"
        onClick={dismiss}
        aria-label="ปิด"
        className="px-1 text-white/60"
      >
        ✕
      </button>
    </div>
  );
}
