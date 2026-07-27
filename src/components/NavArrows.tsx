interface NavArrowProps {
  direction: 'prev' | 'next';
  disabled?: boolean;
  onClick: () => void;
}

// ปุ่มลูกศรหนึ่งข้าง — fallback สำหรับ desktop และ accessibility
// ใช้ SVG แทนอักขระ ‹ › เพราะ side-bearing ของฟอนต์ไม่สมมาตร ทำให้ดูเยื้องออกจากกึ่งกลางวงกลม
export default function NavArrow({ direction, disabled, onClick }: NavArrowProps) {
  const isPrev = direction === 'prev';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={isPrev ? 'ชิ้นก่อนหน้า' : 'ชิ้นถัดไป'}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-neutral-700 shadow-sm ring-1 ring-black/5 transition active:scale-95 disabled:opacity-40 md:h-14 md:w-14"
    >
      {/* จุดยอด x=9 กับปลาย x=15 → กึ่งกลางแนวนอน = 12 (กลาง viewBox พอดี)
          ปลายบน y=5.5 กับปลายล่าง y=18.5 → กึ่งกลางแนวตั้ง = 12 เช่นกัน */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
        className="h-5 w-5 md:h-6 md:w-6"
        style={{ transform: isPrev ? undefined : 'scaleX(-1)' }}
      >
        <path
          d="M15 5.5 L9 12 L15 18.5"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
