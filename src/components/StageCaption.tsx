import type { Category, ClothingItem } from '../types';
import { CATEGORY_LABEL } from '../types';

interface StageCaptionProps {
  layer: Category;
  item: ClothingItem;
  index: number;
  total: number;
  hidden: boolean;
}

// ป้ายใต้มาสคอต: ชื่อชิ้นปัจจุบัน + จุดบอกตำแหน่ง + ตัวช่วยสอนใช้
export default function StageCaption({ layer, item, index, total, hidden }: StageCaptionProps) {
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

      {/* dots บอกว่าอยู่ชิ้นที่เท่าไรจากทั้งหมด */}
      <div className="flex items-center gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all ${
              i === index ? 'w-4 bg-neutral-800' : 'w-1.5 bg-neutral-300'
            }`}
          />
        ))}
      </div>

      <p className="text-xs text-neutral-400 md:text-sm">
        ปัดซ้าย/ขวาเพื่อเปลี่ยน{CATEGORY_LABEL[layer]}
      </p>
    </div>
  );
}
