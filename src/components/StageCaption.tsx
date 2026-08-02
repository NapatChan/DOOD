import type { Category, ClothingItem, ColorVariant } from '../types';
import { CATEGORY_LABEL } from '../types';
import ColorSwatches from './ColorSwatches';

interface StageCaptionProps {
  layer: Category;
  item: ClothingItem;
  variants: ColorVariant[];
  onSelectVariant: (index: number) => void;
  hidden: boolean;
}

// ป้ายใต้มาสคอต: ชื่อชิ้นปัจจุบัน + แทบเลือกสี + ตัวช่วยสอนใช้
export default function StageCaption({ layer, item, variants, onSelectVariant, hidden }: StageCaptionProps) {
  if (hidden) {
    return (
      <div className="flex flex-col items-center gap-2">
        <span className="text-sm font-bold text-neutral-500 md:text-lg">
          ไม่ใส่{CATEGORY_LABEL[layer]}
        </span>
        <p className="text-xs text-neutral-400 md:text-sm">แตะ 👁 บนชั้นเพื่อใส่กลับ</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold text-neutral-800 md:text-lg">{item.name}</span>
        <span className="text-xs text-neutral-400">·</span>
        <span className="text-xs text-neutral-500 md:text-base">
          ฿{item.price.toLocaleString('th-TH')}
        </span>
      </div>

      {/* แทบเลือกสี (แทน dots เดิม) — โชว์เมื่อสินค้ากลุ่มนี้มีหลายสี */}
      <ColorSwatches variants={variants} onSelect={onSelectVariant} tone="plain" />

      <p className="text-xs text-neutral-400 md:text-sm">
        ปัดซ้าย/ขวาเพื่อเปลี่ยน{CATEGORY_LABEL[layer]}
      </p>
    </div>
  );
}
