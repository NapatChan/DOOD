import { motion } from 'framer-motion';

import { ImageIcon, ShareIcon } from './icons';

interface LookBarProps {
  totalPrice: number;
  onWant: () => void;
  onShare: () => void;
  onSaveImage: () => void;
  savingImage?: boolean;
}

const formatBaht = (n: number) => `฿${n.toLocaleString('th-TH')}`;

// แถบล่าง: ราคารวมของทั้งลุค + ปุ่มบันทึกรูป + ปุ่มแชร์ + ปุ่ม "อยากได้ลุคนี้"
export default function LookBar({
  totalPrice,
  onWant,
  onShare,
  onSaveImage,
  savingImage,
}: LookBarProps) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-md ring-1 ring-black/5 md:px-6 md:py-4">
      <div className="flex flex-col">
        <span className="text-xs text-neutral-500 md:text-sm">ราคารวมทั้งลุค</span>
        {/* key เปลี่ยนตามราคา → เด้งเล็กน้อยเวลาราคาอัปเดต */}
        <motion.span
          key={totalPrice}
          initial={{ scale: 1.15 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          className="text-lg font-black tabular-nums text-neutral-900 md:text-2xl"
        >
          {formatBaht(totalPrice)}
        </motion.span>
      </div>
      <button
        type="button"
        onClick={onSaveImage}
        disabled={savingImage}
        aria-label="บันทึก/แชร์รูปลุค"
        className="ml-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-700 transition active:scale-90 disabled:opacity-50 md:h-12 md:w-12"
      >
        <ImageIcon size={19} />
      </button>
      <button
        type="button"
        onClick={onShare}
        aria-label="แชร์ลิงก์ลุคนี้"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-700 transition active:scale-90 md:h-12 md:w-12"
      >
        <ShareIcon size={19} />
      </button>
      <button
        type="button"
        onClick={onWant}
        className="whitespace-nowrap rounded-full bg-neutral-900 px-5 py-3 text-sm font-bold text-white shadow-sm transition active:scale-95 md:px-7 md:py-3.5 md:text-base"
      >
        อยากได้ลุคนี้ ✨
      </button>
    </div>
  );
}