import type { ColorVariant } from '../types';

interface ColorSwatchesProps {
  variants: ColorVariant[];
  onSelect: (index: number) => void;
  /** overlay = ลอยบนรูป (มือถือ, ตัวอักษรขาว) · plain = บนพื้นอ่อน (เดสก์ท็อป) */
  tone?: 'overlay' | 'plain';
}

// แทบเลือกสีของสินค้ากลุ่มเดียวกัน — จุดสีกดเปลี่ยนสีได้ทันที ไม่ต้องปัดหา
// โชว์เฉพาะเมื่อกลุ่มมีมากกว่า 1 สี · สีจุด = color เฉลี่ยจากรูป (มีขอบบางกันสีขาวกลืนพื้น)
export default function ColorSwatches({ variants, onSelect, tone = 'plain' }: ColorSwatchesProps) {
  if (variants.length < 2) return null;
  const overlay = tone === 'overlay';
  const activeName = variants.find((v) => v.active)?.colorName;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {variants.map((v) => (
          <button
            key={v.index}
            type="button"
            onPointerDownCapture={(e) => e.stopPropagation()}
            onClick={() => onSelect(v.index)}
            aria-label={`เลือกสี${v.colorName ?? ''}`}
            aria-pressed={v.active}
            style={{ backgroundColor: v.swatch }}
            className={`h-5 w-5 rounded-full border border-black/20 shadow-sm transition active:scale-90 ${
              v.active
                ? overlay
                  ? 'ring-2 ring-white ring-offset-2 ring-offset-black/30'
                  : 'ring-2 ring-neutral-800 ring-offset-2 ring-offset-white'
                : ''
            }`}
          />
        ))}
      </div>
      {activeName && (
        <span
          className={`text-xs font-medium ${
            overlay ? 'text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.4)]' : 'text-neutral-500'
          }`}
        >
          {activeName}
        </span>
      )}
    </div>
  );
}
