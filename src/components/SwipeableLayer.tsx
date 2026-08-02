import { AnimatePresence, motion, type MotionValue } from 'framer-motion';
import type { Category, ClothingItem, ColorVariant } from '../types';
import { CATEGORY_LABEL, GARMENT_ORIGIN, onBodyBackground, onBodyScale } from '../types';
import ColorSwatches from './ColorSwatches';
import { EyeIcon, EyeOffIcon } from './icons';

interface SwipeableLayerProps {
  category: Category;
  item: ClothingItem;
  /** น้ำหนักการแบ่งความสูง (flex-grow) */
  grow: number;
  /** ตัวเลือกสีของสินค้ากลุ่มเดียวกัน — ซ้อนบนเลเยอร์แทน dots (โชว์เมื่อ >1 สี) */
  variants: ColorVariant[];
  onSelectVariant: (index: number) => void;
  /** ปิดตา = ไม่ใส่ชั้นนี้ (ปัดไม่ได้ ต้องกดตาเปิดก่อน) */
  hidden: boolean;
  /** ระยะลากแนวนอนจาก gesture ระดับ "ทั้งจอ" — ทำให้ชิ้นติดนิ้ว */
  dragX: MotionValue<number>;
  /** ทิศล่าสุดที่ปัด (+1/-1) ใช้ให้ชิ้นใหม่สไลด์เข้ามาถูกด้าน */
  direction: number;
  /** ให้ลูกศรขยับสอนว่าปัดได้ (เฉพาะตอนเริ่มใช้) */
  nudge: boolean;
  onToggleHidden: (category: Category) => void;
}

// ลูกศรจาง ๆ บอกทิศที่ปัดได้ — มีเงาอ่อนกันกลืนกับเสื้อผ้าสีอ่อน
// nudge = ขยับเบา ๆ ตอนเข้าแอปครั้งแรก เพื่อสอนว่าปัดได้ แล้วหยุดไปเอง
function SwipeHint({ flip, nudge }: { flip?: boolean; nudge?: boolean }) {
  const shift = flip ? 5 : -5;
  return (
    <motion.div
      animate={nudge ? { x: [0, shift, 0] } : { x: 0 }}
      transition={
        nudge
          ? { duration: 1.3, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.4 }
          : { duration: 0.2 }
      }
    >
      <svg
        width="20"
        height="34"
        viewBox="0 0 20 34"
        fill="none"
        aria-hidden
        style={{
          transform: flip ? 'scaleX(-1)' : undefined,
          filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.25))',
        }}
      >
        <path
          d="M15 3 L5 17 L15 31"
          stroke="white"
          strokeOpacity="0.55"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </motion.div>
  );
}

// เลเยอร์ที่กำลังถูกเลือก — ตัว gesture อยู่ที่เวทีทั้งจอ (ดู App)
// ที่นี่ทำหน้าที่แสดงผล: เลื่อนตามนิ้ว + สไลด์ชิ้นใหม่เข้ามาแทน
export default function SwipeableLayer({
  category,
  item,
  grow,
  variants,
  onSelectVariant,
  hidden,
  dragX,
  direction,
  nudge,
  onToggleHidden,
}: SwipeableLayerProps) {
  // ชั้นที่เลือกอยู่แต่ปิดตา (ไม่ใส่) — เว้นช่องว่างไว้เฉย ๆ เหลือแค่ปุ่มตาไว้กดใส่กลับ
  if (hidden) {
    return (
      <div
        className="relative min-h-0 w-full shrink basis-0 lg:rounded-2xl"
        style={{ flexGrow: grow }}
      >
        <button
          type="button"
          onPointerDownCapture={(e) => e.stopPropagation()}
          onClick={() => onToggleHidden(category)}
          aria-label={`ใส่${CATEGORY_LABEL[category]}`}
          className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-neutral-400 shadow ring-1 ring-black/10 active:scale-95"
        >
          <EyeOffIcon size={18} />
        </button>
      </div>
    );
  }

  return (
    <div
      role="group"
      aria-label={`ปัดเปลี่ยน${CATEGORY_LABEL[category]}`}
      className="relative min-h-0 w-full shrink basis-0 overflow-hidden lg:rounded-2xl"
      style={{ flexGrow: grow }}
    >
      {/* ชั้นที่เลื่อนตามนิ้ว */}
      <motion.div className="absolute inset-0" style={{ x: dragX }}>
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={item.id}
            custom={direction}
            variants={{
              enter: (d: number) => ({ x: d > 0 ? '100%' : '-100%', opacity: 0.4 }),
              center: { x: 0, opacity: 1 },
              exit: (d: number) => ({ x: d > 0 ? '-100%' : '100%', opacity: 0.4 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', stiffness: 500, damping: 40, mass: 0.6 }}
            className="absolute inset-0"
          >
            {/* background + ปรับขนาดรายชิ้น อยู่ inner div แยกจาก transform ของ framer (x/slide) */}
            <div
              className="absolute inset-0"
              style={{
                // มีรูป (PNG โปร่ง) → วางเสื้อทั้งตัวไว้กลาง ไม่ครอป, พื้นหลังโปร่งเห็นฉากมาสคอต
                // ไม่มีรูป → บล็อกสีเต็มพื้นเหมือนเดิม
                backgroundColor: item.imageUrl ? undefined : item.color,
                backgroundImage: item.imageUrl ? `url(${item.imageUrl})` : undefined,
                backgroundSize: item.imageUrl ? onBodyBackground(category, item.fit, item.aspect).size : 'cover',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: item.imageUrl ? onBodyBackground(category, item.fit, item.aspect).position : 'center',
                transform: onBodyScale(item.scale),
                transformOrigin: GARMENT_ORIGIN[category],
              }}
            />
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* กรอบไฮไลต์ "ชั้นที่กำลังแต่ง" — เส้นบาง 2px ไม่บังเสื้อผ้าเวลาปัดดู
          (ต้องเป็น overlay ทับสี ไม่งั้นโดนสีบัง) */}
      <div
        className="pointer-events-none absolute inset-0 z-10 lg:rounded-2xl"
        style={{ boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.9)' }}
        aria-hidden
      />

      {/* ลูกศรบอกว่า "ปัดได้" — ขาวโปร่ง เป็นแค่ hint (แตะไม่ได้ ทั้งจอปัดได้อยู่แล้ว)
          เฉพาะมือถือ: บน desktop มีปุ่มลูกศรข้างมาสคอตอยู่แล้ว */}
      <div className="pointer-events-none absolute inset-y-0 left-2 z-10 flex items-center lg:hidden">
        <SwipeHint nudge={nudge} />
      </div>
      <div className="pointer-events-none absolute inset-y-0 right-2 z-10 flex items-center lg:hidden">
        <SwipeHint flip nudge={nudge} />
      </div>

      {/* แทบเลือกสี — ลอยซ้อนขอบล่างของเลเยอร์ (แทน dots เดิม) โชว์เมื่อกลุ่มมี >1 สี
          เฉพาะมือถือ: เดสก์ท็อปโชว์แทบสีใต้มาสคอต (StageCaption) แทน ไม่ให้ซ้ำ */}
      {variants.length > 1 && (
        <div className="absolute inset-x-0 bottom-2 z-10 flex items-center justify-center px-3 lg:hidden">
          <ColorSwatches variants={variants} onSelect={onSelectVariant} tone="overlay" />
        </div>
      )}

      {/* ปุ่มตา — แตะเพื่อ "ไม่ใส่" ชั้นนี้ (กันไม่ให้เริ่ม gesture ตอนกด) */}
      <button
        type="button"
        onPointerDownCapture={(e) => e.stopPropagation()}
        onClick={() => onToggleHidden(category)}
        aria-label={`ไม่ใส่${CATEGORY_LABEL[category]}`}
        className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-neutral-700 shadow ring-1 ring-black/10 active:scale-95"
      >
        <EyeIcon size={18} />
      </button>
    </div>
  );
}