import { motion } from 'framer-motion';
import type { Category, ClothingItem } from '../types';
import { CATEGORIES, CATEGORY_LABEL } from '../types';

interface MobilePriceSheetProps {
  selectedItems: Record<Category, ClothingItem>;
  hidden: Record<Category, boolean>;
  totalPrice: number;
  visible: boolean;
  onToggle: () => void;
  onWant: () => void;
}

const formatBaht = (n: number) => `฿${n.toLocaleString('th-TH')}`;

// แถบราคาบนมือถือ — ซ่อนไว้ (เหลือแค่ handle เล็ก ๆ) โผล่ขึ้นมาเมื่อลากนิ้วขึ้น
// หรือแตะ handle แล้วอยู่ 3 วินาทีก่อนเฟดกลับลงไป
export default function MobilePriceSheet({
  selectedItems,
  hidden,
  totalPrice,
  visible,
  onToggle,
  onWant,
}: MobilePriceSheetProps) {
  return (
    <motion.div
      className="fixed inset-x-0 bottom-0 z-40 lg:hidden"
      initial={false}
      animate={{ y: visible ? 0 : 'calc(100% - 26px)' }}
      transition={{ type: 'spring', stiffness: 420, damping: 40 }}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto max-w-md rounded-t-3xl bg-white shadow-[0_-6px_28px_rgba(0,0,0,0.10)]">
        {/* handle: แตะเพื่อเปิด/ปิด + เป็นตัวบอกว่าลากขึ้นได้ */}
        <button
          type="button"
          onClick={onToggle}
          aria-label={visible ? 'ซ่อนราคา' : 'ดูราคารวมลุค'}
          className="flex h-[26px] w-full items-center justify-center"
        >
          <span className="h-1 w-10 rounded-full bg-neutral-300" />
        </button>

        {/* รายการชิ้นที่ใส่อยู่ (ย้ายมาจาก caption ใต้มาสคอต) */}
        <div className="flex flex-col gap-1.5 px-5 pt-1">
          {CATEGORIES.map((cat) =>
            hidden[cat] ? (
              <div key={cat} className="flex items-center gap-2 text-sm text-neutral-300">
                <span className="h-3 w-3 shrink-0 rounded-full ring-1 ring-black/10" />
                <span>{CATEGORY_LABEL[cat]}</span>
                <span className="font-medium">ไม่ใส่</span>
                <span className="ml-auto tabular-nums">—</span>
              </div>
            ) : (
              <div key={cat} className="flex items-center gap-2 text-sm">
                <span
                  className="h-3 w-3 shrink-0 rounded-full ring-1 ring-black/10"
                  style={{ backgroundColor: selectedItems[cat].color }}
                />
                <span className="text-neutral-400">{CATEGORY_LABEL[cat]}</span>
                <span className="font-medium text-neutral-800">{selectedItems[cat].name}</span>
                {/* ลิงก์ซื้อของชิ้นนี้ (ถ้าแอดมินใส่ไว้) — รวมทุกลิงก์อยู่ในชีตเดียว */}
                {selectedItems[cat].buyUrl && (
                  <a
                    href={selectedItems[cat].buyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-emerald-600 underline"
                  >
                    ซื้อ ↗
                  </a>
                )}
                <span className="ml-auto tabular-nums text-neutral-500">
                  {formatBaht(selectedItems[cat].price)}
                </span>
              </div>
            ),
          )}
        </div>

        <div className="mx-5 mt-3 border-t border-neutral-200" />

        <div className="flex items-center gap-3 px-5 pb-5 pt-3">
          <div className="flex flex-col">
            <span className="text-xs text-neutral-500">ราคารวมทั้งลุค</span>
            <motion.span
              key={totalPrice}
              initial={{ scale: 1.15 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className="text-xl font-black tabular-nums text-neutral-900"
            >
              {formatBaht(totalPrice)}
            </motion.span>
          </div>
          <button
            type="button"
            onClick={onWant}
            className="ml-auto whitespace-nowrap rounded-full bg-neutral-900 px-6 py-3.5 text-sm font-bold text-white shadow-sm transition active:scale-95"
          >
            อยากได้ลุคนี้ ✨
          </button>
        </div>
      </div>
    </motion.div>
  );
}
