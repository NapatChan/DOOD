export type Category = 'hat' | 'top' | 'pants';

export const CATEGORIES: Category[] = ['hat', 'top', 'pants'];

export const CATEGORY_LABEL: Record<Category, string> = {
  hat: 'หมวก',
  top: 'เสื้อ',
  pants: 'กางเกง',
};

// รูปสินค้าถูก trim ขอบโปร่งออกแล้ว (ดู scripts/trim-products.mjs)
// จึงเต็มเฟรม พอ contain + ชิดกล่อง (gap-0) ชิ้นจะต่อกันเหมือนคนใส่ชุด
export const GARMENT_BG_POSITION: Record<Category, string> = {
  hat: 'center bottom',
  top: 'center',
  pants: 'center top',
};

export const GARMENT_BG_SIZE: Record<Category, string> = {
  hat: 'contain',
  top: 'contain',
  pants: 'contain',
};

export interface ClothingItem {
  id: string;
  category: Category;
  name: string;
  price: number;
  color: string; // สี fallback (เผื่อรูปโหลดไม่ขึ้น)
  imageUrl?: string; // URL รูป PNG โปร่ง (ตอนนี้จาก assets, อนาคตจาก backend)
  buyUrl?: string; // ลิงก์สั่งซื้อชิ้นนี้ (ไม่บังคับ)
  style?: string; // id สไตล์ (ดู src/config/styles.ts)
}

export interface WardrobeState {
  selectedLayer: Category;
  currentIndex: Record<Category, number>;
  hidden: Record<Category, boolean>; // ชั้นที่ "ไม่ใส่" (ปิดตา)
}

// พื้นหลังรูปย่อสินค้า (คอลเลกชัน + แอดมิน) — ขาวหม่นคงที่ ให้สินค้าทุกสีเด่นชัด
// (ถ้าใช้สีเฉลี่ยของชิ้นเอง เสื้อขาว/หมวกดำจะกลืนกับพื้น)
export const GARMENT_TILE_BG = '#efedea';