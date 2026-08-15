// ไอคอนตา เปิด/ปิด สำหรับปุ่ม "ใส่/ไม่ใส่" ชั้นเสื้อผ้า
export function EyeIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

// ไอคอนแชร์ (สามจุดเชื่อมกัน) — ปุ่มแชร์ลุค
export function ShareIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="18" cy="5" r="3" stroke="currentColor" strokeWidth="2" />
      <circle cx="6" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
      <circle cx="18" cy="19" r="3" stroke="currentColor" strokeWidth="2" />
      <path
        d="M8.6 10.6l6.8-4M8.6 13.4l6.8 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ไอคอนรูปภาพ — ปุ่มบันทึก/แชร์การ์ดลุค 9:16 เป็นรูป (เอาไปลง IG/TikTok story)
export function ImageIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="2" />
      <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
      <path
        d="M21 15l-5-5L5 21"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function EyeOffIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 3l18 18M10.6 10.6a3 3 0 0 0 4.2 4.2M9.9 4.9A9.8 9.8 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4M6.6 6.6A17.2 17.2 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 3.4-.6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ไอคอนถุงช้อปปิ้ง (เส้น) — ปุ่มเปิดคอลเลกชัน/ลุคที่บันทึก
export function BagIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5.5 8h13l-1 11.2a1.5 1.5 0 0 1-1.5 1.3H8a1.5 1.5 0 0 1-1.5-1.3L5.5 8Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M8.8 8V6.5a3.2 3.2 0 0 1 6.4 0V8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ไอคอนลูกเต๋า 3D (ลูกบาศก์ isometric — บน 1 · ซ้าย 3 · ขวา 2) — ปุ่มสุ่มลุค
export function DiceIcon({ size = 20 }: { size?: number }) {
  const dots = [
    [12, 7.3], // หน้าบน (1)
    [5.98, 11.53], [7.7, 14.38], [9.42, 17.23], // หน้าซ้าย (3) แนวทแยงกลางหน้า
    [18.02, 11.53], [14.58, 17.23], // หน้าขวา (2) แนวทแยงกลางหน้า
  ];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M13.05 3.08 L19.55 6.67 Q20.6 7.25 20.6 8.45 L20.6 15.55 Q20.6 16.75 19.55 17.33 L13.05 20.92 Q12 21.5 10.95 20.92 L4.45 17.33 Q3.4 16.75 3.4 15.55 L3.4 8.45 Q3.4 7.25 4.45 6.67 L10.95 3.08 Q12 2.5 13.05 3.08 Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M3.4 7.25 L12 12 L20.6 7.25 M12 12 L12 21.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="butt"
        strokeLinejoin="round"
      />
      {dots.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="1.1" fill="currentColor" />
      ))}
    </svg>
  );
}
