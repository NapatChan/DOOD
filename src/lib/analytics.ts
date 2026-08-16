// ┌─────────────────────────────────────────────────────────────────┐
// │ Custom events — เก็บ "พฤติกรรมที่วัด conversion" ไว้ที่เดียว        │
// │                                                                   │
// │ ต่อยอดจาก Vercel Analytics (page view มีอยู่แล้วใน main.tsx)       │
// │ track() ยิงจริงเฉพาะบน production (Vercel) — ใน dev แค่ log console │
// │ ค่าที่ส่งได้: string | number | boolean | null เท่านั้น            │
// └─────────────────────────────────────────────────────────────────┘
import { track } from '@vercel/analytics';
import type { Category, ClothingItem } from '../types';

// กด "ซื้อ" = ตัว conversion ของ affiliate ที่สำคัญสุด — รู้ว่าสินค้าไหนพาไปจ่ายเงินจริง
// source: มาจากชีตราคามือถือ หรือหน้าดูชุดเต็ม (เผื่อดูว่าจุดไหน convert ดีกว่า)
export function trackBuy(item: ClothingItem, source: 'sheet' | 'collection'): void {
  track('buy_click', {
    category: item.category,
    item: item.name,
    price: item.price,
    source,
  });
}

// แชร์ลิงก์ลุค (ดึง traffic กลับ) — นับความตั้งใจแชร์ ไม่สนว่ากดยกเลิกทีหลังมั้ย
export function trackShareLink(): void {
  track('share_link');
}

// บันทึก/แชร์รูปการ์ด 9:16 (ลง story) — ช่องทาง viral อีกทาง
export function trackSaveImage(): void {
  track('save_image');
}

// "อยากได้ลุคนี้" = บันทึกลุคลงคอลเลกชัน — วัด engagement (isNew = ลุคใหม่ ไม่ใช่กดซ้ำ)
export function trackSaveLook(isNew: boolean): void {
  track('save_look', { new: isNew });
}

// กดสุ่มลุค (🎲) — วัดว่าคนใช้ปุ่มสุ่มบ่อยแค่ไหน
export function trackShuffle(): void {
  track('shuffle');
}

// เลือกสีจากแทบสี — รู้ว่าสีไหนถูกกดบ่อย (เผื่อสั่งของ/ทำคอนเทนต์)
export function trackSelectColor(category: Category, colorName?: string): void {
  track('select_color', { category, color: colorName ?? 'unknown' });
}
