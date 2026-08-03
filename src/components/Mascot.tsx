import type { MotionValue } from 'framer-motion';
import type { Category, ClothingItem } from '../types';
import { CATEGORIES, LAYER_GROW } from '../types';
import ClothingLayer from './ClothingLayer';
import SwipeableLayer from './SwipeableLayer';

interface MascotProps {
  selectedItems: Record<Category, ClothingItem>;
  selectedLayer: Category;
  hidden: Record<Category, boolean>;
  /** gesture ระดับทั้งจอ (ดู App) */
  dragX: MotionValue<number>;
  direction: number;
  nudge: boolean;
  onSelectLayer: (category: Category) => void;
  onToggleHidden: (category: Category) => void;
}

// มาสคอต placeholder — กล่องสีเทาโค้ง ยืดเต็มความสูงที่มี วางเลเยอร์ 3 ชั้น
// เลเยอร์ที่เลือกอยู่ = ปัดได้ (SwipeableLayer), ที่เหลือ = แตะเพื่อเลือก
export default function Mascot({
  selectedItems,
  selectedLayer,
  hidden,
  dragX,
  direction,
  nudge,
  onSelectLayer,
  onToggleHidden,
}: MascotProps) {
  return (
    <div className="relative flex min-h-0 w-full flex-col self-stretch lg:h-[34rem] lg:w-[26rem] lg:self-auto">
      {/* การ์ดเทา (ตัวมาสคอต) — เฉพาะ desktop, มือถือเต็มขอบไม่มีกรอบ */}
      <div className="absolute inset-0 hidden rounded-[3rem] bg-neutral-300/60 lg:block" aria-hidden />

      {/* มือถือ: พื้นขาว + gap 2px = เส้นคั่นบางๆ ระหว่างชั้น */}
      <div className="relative flex min-h-0 w-full flex-1 flex-col items-center gap-0 bg-white lg:gap-2 lg:bg-transparent lg:p-6">
        {CATEGORIES.map((cat) =>
          cat === selectedLayer ? (
            <SwipeableLayer
              key={cat}
              category={cat}
              item={selectedItems[cat]}
              grow={LAYER_GROW[cat]}
              hidden={hidden[cat]}
              dragX={dragX}
              direction={direction}
              nudge={nudge}
              onToggleHidden={onToggleHidden}
            />
          ) : (
            <ClothingLayer
              key={cat}
              category={cat}
              item={selectedItems[cat]}
              grow={LAYER_GROW[cat]}
              selected={false}
              hidden={hidden[cat]}
              onSelect={onSelectLayer}
              onToggleHidden={onToggleHidden}
            />
          ),
        )}
      </div>
    </div>
  );
}