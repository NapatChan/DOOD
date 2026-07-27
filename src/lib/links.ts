import type { ClothingItem } from '../types';

// ลิงก์สั่งซื้อของสินค้าชิ้นหนึ่ง
// - มี buyUrl (แอดมินใส่ไว้) → ใช้เลย
// - ยังไม่มี → fallback เป็นการค้นหาชื่อสินค้าใน Google (กดแล้วใช้ได้จริง ไม่ใช่ลิงก์ตาย)
export function buyLinkFor(item: ClothingItem): string {
  if (item.buyUrl) return item.buyUrl;
  return `https://www.google.com/search?q=${encodeURIComponent(item.name)}`;
}

// true = เป็นลิงก์ร้านจริงที่แอดมินใส่มา, false = ลิงก์ค้นหา fallback
export function hasRealLink(item: ClothingItem): boolean {
  return Boolean(item.buyUrl);
}
