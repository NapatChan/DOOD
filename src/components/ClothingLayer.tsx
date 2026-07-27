import type { Category, ClothingItem } from '../types';
import { CATEGORY_LABEL, GARMENT_BG_POSITION, GARMENT_BG_SIZE } from '../types';
import { EyeOffIcon } from './icons';

interface ClothingLayerProps {
  category: Category;
  item: ClothingItem;
  /** น้ำหนักการแบ่งความสูง (flex-grow) — เลเยอร์ยืดเต็มความสูงมาสคอต */
  grow: number;
  selected: boolean;
  /** ปิดตา = ไม่ใส่ชั้นนี้ */
  hidden: boolean;
  onSelect: (category: Category) => void;
  onToggleHidden: (category: Category) => void;
}

// เลเยอร์เสื้อผ้า 1 ชั้น (ที่ไม่ได้ถูกเลือก) — แตะเพื่อเลือก
// ถ้าปิดตา (ไม่ใส่) → โชว์ช่องว่างจาง ๆ แตะเพื่อใส่กลับ
export default function ClothingLayer({
  category,
  item,
  grow,
  selected,
  hidden,
  onSelect,
  onToggleHidden,
}: ClothingLayerProps) {
  // ปิดตา (ไม่ใส่) — เว้นช่องว่างไว้เฉย ๆ มีไอคอนตาปิดจาง ๆ เป็นจุดกดเพื่อใส่กลับ
  if (hidden) {
    return (
      <button
        type="button"
        onClick={() => {
          onSelect(category);
          onToggleHidden(category);
        }}
        aria-label={`ใส่${CATEGORY_LABEL[category]}`}
        className="flex min-h-0 w-full shrink basis-0 items-center justify-center text-neutral-300 opacity-40 outline-none"
        style={{ flexGrow: grow }}
      >
        <EyeOffIcon size={18} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(category)}
      aria-label={`เลือกเลเยอร์${CATEGORY_LABEL[category]}`}
      aria-pressed={selected}
      className="min-h-0 w-full shrink basis-0 outline-none lg:rounded-2xl"
      style={{
        flexGrow: grow,
        boxShadow: selected ? 'inset 0 0 0 4px #fff, inset 0 0 0 6px rgba(0,0,0,0.3)' : undefined,
        backgroundColor: item.imageUrl ? undefined : item.color,
        backgroundImage: item.imageUrl ? `url(${item.imageUrl})` : undefined,
        backgroundSize: item.imageUrl ? GARMENT_BG_SIZE[category] : 'cover',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: item.imageUrl ? GARMENT_BG_POSITION[category] : 'center',
      }}
    />
  );
}
