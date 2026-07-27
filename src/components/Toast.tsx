import { AnimatePresence, motion } from 'framer-motion';

interface ToastProps {
  message: string | null;
}

// ป็อปอัปแจ้งเตือนสั้น ๆ กลางล่างจอ
export default function Toast({ message }: ToastProps) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="pointer-events-none fixed bottom-28 left-1/2 z-50 -translate-x-1/2 rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white shadow-lg"
          role="status"
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}