import { motion } from 'framer-motion';

interface LookBarProps {
  totalPrice: number;
  onWant: () => void;
}

const formatBaht = (n: number) => `฿${n.toLocaleString('th-TH')}`;

// แถบล่าง: ราคารวมของทั้งลุค + ปุ่ม "อยากได้ลุคนี้"
export default function LookBar({ totalPrice, onWant }: LookBarProps) {
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
        onClick={onWant}
        className="ml-auto whitespace-nowrap rounded-full bg-neutral-900 px-5 py-3 text-sm font-bold text-white shadow-sm transition active:scale-95 md:px-7 md:py-3.5 md:text-base"
      >
        อยากได้ลุคนี้ ✨
      </button>
    </div>
  );
}