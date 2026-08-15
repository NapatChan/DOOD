import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';
import {
  CATEGORIES,
  GARMENT_ORIGIN,
  LAYER_GROW,
  onBodyBackground,
  onBodyTransform,
  type Category,
  type ClothingItem,
} from '../types';

interface LookPreviewProps {
  open: boolean;
  onClose: () => void;
  selectedItems: Record<Category, ClothingItem>;
  hidden: Record<Category, boolean>;
}

// หน้าดูชุดเต็ม — overlay เต็มจอ โชว์ลุคหัวจรดเท้าใหญ่ ๆ (ดูอย่างเดียว ไม่มี UI มาบัง)
// ปิดด้วย ✕ / Esc / แตะพื้นหลัง
export default function LookPreview({ open, onClose, selectedItems, hidden }: LookPreviewProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const visible = CATEGORIES.filter((cat) => !hidden[cat]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col bg-white"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิด"
            style={{ top: 'calc(env(safe-area-inset-top) + 0.75rem)' }}
            className="absolute right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 shadow-sm ring-1 ring-black/5 transition active:scale-90"
          >
            ✕
          </button>

          {/* ชุดเต็มตัว — วางซ้อนแนวตั้งตามสัดส่วน คนใส่ชุด */}
          <div
            className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center px-6"
            style={{
              paddingTop: 'calc(env(safe-area-inset-top) + 3.5rem)',
              paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)',
            }}
          >
            {visible.map((cat) => {
              const item = selectedItems[cat];
              return (
                <div
                  key={cat}
                  className="min-h-0 w-full shrink basis-0"
                  style={{
                    flexGrow: LAYER_GROW[cat],
                    backgroundColor: item.imageUrl ? undefined : item.color,
                    backgroundImage: item.imageUrl ? `url(${item.imageUrl})` : undefined,
                    backgroundSize: item.imageUrl ? onBodyBackground(cat, item.fit, item.aspect).size : 'cover',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: item.imageUrl ? onBodyBackground(cat, item.fit, item.aspect).position : 'center',
                    transform: onBodyTransform(item.scale, item.offsetX, item.offsetY),
                    transformOrigin: GARMENT_ORIGIN[cat],
                  }}
                />
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
