import { useState } from 'react';
import type { ColorVariant } from '../types';
import ColorSwatches from './ColorSwatches';

interface ColorSwatchPickerProps {
  variants: ColorVariant[];
  onSelect: (index: number) => void;
}

// ชิปเลือกสีบนมือถือ — ยุบไว้เป็นชิปเล็ก (โชว์สีปัจจุบัน + จำนวนสี) กดแล้วกางแถบสีขึ้นมา
// เลือกสีแล้วยุบเอง → ไม่เกะกะทับตัวสินค้า (ต่างจากเดิมที่แถบสีลอยทับเสื้อ/หมวก)
export default function ColorSwatchPicker({ variants, onSelect }: ColorSwatchPickerProps) {
  const [open, setOpen] = useState(false);
  if (variants.length < 2) return null;

  const active = variants.find((v) => v.active);
  const preview = variants.slice(0, 3); // จุดสีตัวอย่างในชิป (บอกใบ้ว่ามีหลายสี)

  return (
    // ชิดซ้าย (items-start) — ชิปอยู่มุมซ้ายล่าง การ์ดกางไปทางขวา ไม่ล้นขอบซ้าย
    <div className="flex flex-col items-start gap-2">
      {/* แถบสีที่กางออก — พื้นแคปซูลทึบโปร่ง มีขอบชัด ไม่ลอยทับภาพ */}
      {open && (
        <div className="rounded-2xl bg-white/95 px-4 py-3 shadow-xl ring-1 ring-black/10 backdrop-blur">
          <ColorSwatches
            variants={variants}
            onSelect={(i) => {
              onSelect(i);
              setOpen(false);
            }}
            tone="plain"
          />
        </div>
      )}

      {/* ชิปยุบ — โชว์สีปัจจุบัน + ชื่อสี กดเพื่อกาง/ยุบ */}
      <button
        type="button"
        onPointerDownCapture={(e) => e.stopPropagation()}
        onClick={() => setOpen((o) => !o)}
        aria-label={`เลือกสี — มี ${variants.length} สี`}
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full bg-white/90 py-1.5 pl-2 pr-3 shadow-md ring-1 ring-black/10 backdrop-blur transition active:scale-95"
      >
        <span className="flex -space-x-1.5">
          {preview.map((v) => (
            <span
              key={v.index}
              className="h-4 w-4 rounded-full border border-white"
              style={{ backgroundColor: v.swatch }}
            />
          ))}
        </span>
        <span className="text-xs font-semibold text-neutral-700">
          {active?.colorName ?? `${variants.length} สี`}
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
          className={`text-neutral-400 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
