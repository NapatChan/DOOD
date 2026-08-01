// เข้ารหัส/ถอดรหัส "ลุค" ↔ URL — สำหรับแชร์ (ไม่ต้องล็อกอิน ไม่แตะ DB)
//   ?l=<hatId>.<topId>.<pantsId>       ← id สินค้าแต่ละหมวด (id ไม่มีจุด จึงใช้ '.' คั่นได้)
//   &off=hat.pants                      ← หมวดที่ "ไม่ใส่" (ปิดตา)
import { CATEGORIES, type Category } from '../types';

const SEP = '.';

export function encodeLook(
  items: Record<Category, string>,
  hidden: Record<Category, boolean>,
): string {
  const p = new URLSearchParams();
  p.set('l', CATEGORIES.map((c) => items[c]).join(SEP));
  const off = CATEGORIES.filter((c) => hidden[c]);
  if (off.length) p.set('off', off.join(SEP));
  return p.toString();
}

// ถอดลุคจาก query string — คืน null ถ้าไม่มี/รูปแบบผิด
export function parseLookFromSearch(
  search: string,
): { items: Record<Category, string>; hidden: Record<Category, boolean> } | null {
  const p = new URLSearchParams(search);
  const l = p.get('l');
  if (!l) return null;
  const parts = l.split(SEP);
  if (parts.length !== CATEGORIES.length || parts.some((s) => !s)) return null;

  const items = {} as Record<Category, string>;
  CATEGORIES.forEach((c, i) => (items[c] = parts[i]));

  const off = new Set((p.get('off') || '').split(SEP).filter(Boolean));
  const hidden = {} as Record<Category, boolean>;
  CATEGORIES.forEach((c) => (hidden[c] = off.has(c)));

  return { items, hidden };
}

// URL เต็มไว้แชร์ (origin + path ปัจจุบัน + พารามิเตอร์ลุค)
export function buildShareUrl(
  items: Record<Category, string>,
  hidden: Record<Category, boolean>,
): string {
  return `${window.location.origin}${window.location.pathname}?${encodeLook(items, hidden)}`;
}
