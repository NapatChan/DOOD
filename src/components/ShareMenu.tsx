import { AnimatePresence, motion } from 'framer-motion';
import { ImageIcon, ShareIcon } from './icons';

interface ShareMenuProps {
  open: boolean;
  onClose: () => void;
  onShareLink: () => void; // ส่งลิงก์ /s?l= (เพื่อนกดเข้ามาดู/แต่งต่อได้ — ดึง traffic)
  onSaveImage: () => void; // บันทึก/แชร์การ์ด 9:16 (เอาไปลง story)
  savingImage?: boolean;
}

// เมนูแชร์ 2 ทางเลือก — รวมปุ่มแชร์ลิงก์ + บันทึกรูปไว้ที่เดียว
// ป้ายกำกับบอกชัดว่าอันไหนทำอะไร (ลิงก์กดได้ vs รูปลง story)
export default function ShareMenu({
  open,
  onClose,
  onShareLink,
  onSaveImage,
  savingImage,
}: ShareMenuProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 lg:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-sm rounded-t-3xl bg-white p-5 shadow-2xl lg:rounded-3xl"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.25rem)' }}
            initial={{ y: 40, opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 36 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-black text-neutral-900">แชร์ลุคนี้</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="ปิด"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 transition active:scale-90"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {/* ① แชร์ลิงก์ — ตัวดึง traffic (เพื่อนกดเข้ามาได้) */}
              <button
                type="button"
                onClick={() => {
                  onShareLink();
                  onClose();
                }}
                className="flex w-full items-center gap-3 rounded-2xl bg-neutral-50 p-3.5 text-left transition active:scale-[0.98] hover:bg-neutral-100"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white">
                  <ShareIcon size={19} />
                </span>
                <span className="flex flex-col">
                  <span className="text-sm font-bold text-neutral-900">แชร์ให้เพื่อน</span>
                  <span className="text-xs text-neutral-500">ส่งลิงก์ให้เพื่อนกดเข้ามาดู/แต่งต่อได้</span>
                </span>
              </button>

              {/* ② บันทึกรูป — เอาไปลง story */}
              <button
                type="button"
                onClick={() => {
                  onSaveImage();
                  onClose();
                }}
                disabled={savingImage}
                className="flex w-full items-center gap-3 rounded-2xl bg-neutral-50 p-3.5 text-left transition active:scale-[0.98] hover:bg-neutral-100 disabled:opacity-50"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-pink-500 text-white">
                  <ImageIcon size={19} />
                </span>
                <span className="flex flex-col">
                  <span className="text-sm font-bold text-neutral-900">บันทึกรูปลง Story</span>
                  <span className="text-xs text-neutral-500">ได้การ์ด 9:16 เอาไปลง IG/TikTok story</span>
                </span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
