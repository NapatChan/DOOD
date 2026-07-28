import { useEffect, useRef, useState } from 'react';
import type { GenderFilter } from '../types';

const OPTIONS: { value: GenderFilter; label: string }[] = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'male', label: 'ชาย' },
  { value: 'female', label: 'หญิง' },
];

// ตัวกรองเพศแบบกระทัดรัด — chip โชว์ค่าปัจจุบัน กดแล้วเด้ง dropdown (ใช้บนมือถือ ประหยัดพื้นที่)
export default function GenderMenu({
  value,
  onChange,
}: {
  value: GenderFilter;
  onChange: (v: GenderFilter) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = OPTIONS.find((o) => o.value === value) ?? OPTIONS[0];

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDoc);
    return () => document.removeEventListener('pointerdown', onDoc);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="กรองตามเพศ"
        aria-expanded={open}
        className="flex h-11 items-center gap-1 rounded-full bg-white pl-4 pr-3 text-sm font-semibold text-neutral-700 shadow-sm ring-1 ring-black/5 transition active:scale-95"
      >
        {current.label}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          className="transition-transform"
          style={{ transform: open ? 'rotate(180deg)' : 'none' }}
        >
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 z-30 mt-2 w-28 overflow-hidden rounded-2xl bg-white py-1 shadow-lg ring-1 ring-black/5">
          {OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className={`block w-full px-4 py-2 text-left text-sm transition-colors ${
                value === o.value
                  ? 'bg-neutral-100 font-bold text-neutral-900'
                  : 'text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
