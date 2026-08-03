import { useEffect, useRef, useState } from 'react';

// กรอบครอบตัดแบบปรับได้ (ลากมุม/ขอบ/ทั้งกรอบ) — ไม่ใช้ไลบรารี
// ใช้พิกัดแบบ normalized 0..1 เทียบกับรูป → ไม่ขึ้นกับขนาดที่แสดง, ตัดที่ความละเอียดจริงของรูป
interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
const MIN = 0.04; // ขนาดกรอบขั้นต่ำ (สัดส่วนของรูป)
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// handle ทั้ง 8 + ตำแหน่ง (%) + cursor
const HANDLES: { m: string; l: number; t: number; cur: string }[] = [
  { m: 'tl', l: 0, t: 0, cur: 'nwse-resize' },
  { m: 'tr', l: 100, t: 0, cur: 'nesw-resize' },
  { m: 'bl', l: 0, t: 100, cur: 'nesw-resize' },
  { m: 'br', l: 100, t: 100, cur: 'nwse-resize' },
  { m: 't', l: 50, t: 0, cur: 'ns-resize' },
  { m: 'b', l: 50, t: 100, cur: 'ns-resize' },
  { m: 'l', l: 0, t: 50, cur: 'ew-resize' },
  { m: 'r', l: 100, t: 50, cur: 'ew-resize' },
];

export default function CropBox({
  src,
  onApply,
  onCancel,
}: {
  src: string;
  onApply: (dataUrl: string) => void;
  onCancel: () => void;
}) {
  const [rect, setRect] = useState<Rect>({ x: 0.05, y: 0.05, w: 0.9, h: 0.9 });
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const drag = useRef<null | { mode: string; orig: Rect; sx: number; sy: number }>(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => setNat({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = src;
  }, [src]);

  function onDown(mode: string, e: React.PointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { mode, orig: rect, sx: e.clientX, sy: e.clientY };
  }

  function onMove(e: React.PointerEvent) {
    const d = drag.current;
    const el = wrapRef.current;
    if (!d || !el) return;
    const b = el.getBoundingClientRect();
    const dx = (e.clientX - d.sx) / b.width;
    const dy = (e.clientY - d.sy) / b.height;
    const o = d.orig;
    if (d.mode === 'move') {
      setRect({ ...o, x: clamp(o.x + dx, 0, 1 - o.w), y: clamp(o.y + dy, 0, 1 - o.h) });
      return;
    }
    let l = o.x,
      t = o.y,
      r = o.x + o.w,
      btm = o.y + o.h;
    if (d.mode.includes('l')) l = clamp(o.x + dx, 0, r - MIN);
    if (d.mode.includes('r')) r = clamp(o.x + o.w + dx, l + MIN, 1);
    if (d.mode.includes('t')) t = clamp(o.y + dy, 0, btm - MIN);
    if (d.mode.includes('b')) btm = clamp(o.y + o.h + dy, t + MIN, 1);
    setRect({ x: l, y: t, w: r - l, h: btm - t });
  }

  function onUp() {
    drag.current = null;
  }

  function apply() {
    if (!nat) return;
    const sx = Math.round(rect.x * nat.w);
    const sy = Math.round(rect.y * nat.h);
    const sw = Math.max(1, Math.round(rect.w * nat.w));
    const sh = Math.max(1, Math.round(rect.h * nat.h));
    const canvas = document.createElement('canvas');
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = new Image();
    img.crossOrigin = 'anonymous'; // เผื่อรูปเดิมจาก CDN (ตอนแก้ไข)
    img.onload = () => {
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      try {
        onApply(canvas.toDataURL('image/png'));
      } catch {
        setErr('ตัดรูปจาก URL ภายนอกไม่ได้ (ลองอัปโหลดรูปใหม่แล้วค่อยครอบตัด)');
      }
    };
    img.onerror = () => setErr('โหลดรูปเพื่อครอบตัดไม่สำเร็จ');
    img.src = src;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white">
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
          <h3 className="text-sm font-bold text-neutral-800">ครอบตัดรูป — ลากกรอบเอาแต่สินค้า</h3>
          <button
            type="button"
            onClick={onCancel}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-neutral-500"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          <div
            ref={wrapRef}
            onPointerMove={onMove}
            onPointerUp={onUp}
            className="relative mx-auto select-none touch-none"
            style={{
              maxWidth: '100%',
              backgroundImage:
                'linear-gradient(45deg,#eee 25%,transparent 25%),linear-gradient(-45deg,#eee 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#eee 75%),linear-gradient(-45deg,transparent 75%,#eee 75%)',
              backgroundSize: '16px 16px',
              backgroundPosition: '0 0,0 8px,8px -8px,-8px 0',
            }}
          >
            <img src={src} alt="crop" draggable={false} className="pointer-events-none block w-full" />
            {/* กรอบครอบตัด — box-shadow ยักษ์ = ทำให้ข้างนอกมืดลง */}
            <div
              onPointerDown={(e) => onDown('move', e)}
              className="absolute cursor-move"
              style={{
                left: `${rect.x * 100}%`,
                top: `${rect.y * 100}%`,
                width: `${rect.w * 100}%`,
                height: `${rect.h * 100}%`,
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)',
                outline: '2px solid #fff',
              }}
            >
              {HANDLES.map((h) => (
                <span
                  key={h.m}
                  onPointerDown={(e) => onDown(h.m, e)}
                  className="absolute h-4 w-4 rounded-full border-2 border-neutral-800 bg-white shadow"
                  style={{
                    left: `${h.l}%`,
                    top: `${h.t}%`,
                    transform: 'translate(-50%,-50%)',
                    cursor: h.cur,
                    touchAction: 'none',
                  }}
                />
              ))}
            </div>
          </div>
          {err && <p className="mt-3 text-center text-xs text-red-500">{err}</p>}
        </div>

        <div className="flex gap-2 border-t border-neutral-200 p-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-neutral-300 py-2.5 text-sm font-semibold text-neutral-600"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={apply}
            disabled={!nat}
            className="flex-[2] rounded-xl bg-neutral-900 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            ตัดรูปนี้ ✂️
          </button>
        </div>
      </div>
    </div>
  );
}
