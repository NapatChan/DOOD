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

// ทรงของท่อนล่าง — ยาว (กางเกงขายาว) | สั้น (กระโปรง/ขาสั้น)
// รูปทรงสั้นมักกว้างกว่าสูง ถ้า contain จะบานเต็มคอลัมน์ ใหญ่กว่าลำตัว
export type Fit = 'long' | 'short';
export const FIT_LABEL: Record<Fit, string> = { long: 'ยาว', short: 'สั้น' };

// ความสูงของท่อนล่าง "ทรงสั้น" บนมาสคอต — คุมด้วยความสูง (auto กว้าง) เหมือนชิ้นอื่นที่ใช้ contain
// สมดุลอัตโนมัติตามทรง: รูปยิ่งบานกว้าง (aspect สูง) เรนเดอร์ยิ่งเตี้ยลง
// เพื่อให้ "ความกว้างรวม" ของทุกชิ้นใกล้กัน = สมส่วนกับเสื้อเท่ากัน ไม่ว่าทรงตรงหรือทรงบาน
//   height% = K / aspect  (K≈48: ขาสั้น aspect~1.4 → 34% · กระโปรงบาน aspect~1.63 → ~29%)
//   clamp กันสุดโต่งสำหรับรูปทรงแปลก ๆ
const SHORT_FILL_K = 48;
const SHORT_FILL_MIN = 24;
const SHORT_FILL_MAX = 38;
function shortBottomHeightPct(aspect?: number): number {
  if (!aspect || aspect <= 0) return 34; // ไม่รู้สัดส่วน → ค่ากลาง
  return Math.min(SHORT_FILL_MAX, Math.max(SHORT_FILL_MIN, SHORT_FILL_K / aspect));
}

// พื้นหลังตอน "สวมบนตัวมาสคอต" (ต่างจากรูปย่อในคลังที่ใช้ contain เสมอ)
// ท่อนล่างทรงสั้นเรนเดอร์แคบลง ไม่ให้บานเต็มจอเหมือน contain — และสมดุลตามทรง (ดู aspect)
export function onBodyBackground(
  category: Category,
  fit?: Fit,
  aspect?: number,
): { size: string; position: string } {
  if (category === 'pants' && fit === 'short') {
    return { size: `auto ${shortBottomHeightPct(aspect).toFixed(1)}%`, position: 'center top' };
  }
  return { size: GARMENT_BG_SIZE[category], position: GARMENT_BG_POSITION[category] };
}

// จุดยึดตอนย่อ/ขยายรายชิ้น — ให้รอยต่อไม่ขยับ (หมวก↑คอ, เอว↓ ยึดใต้เสื้อ)
export const GARMENT_ORIGIN: Record<Category, string> = {
  hat: 'center bottom',
  top: 'center',
  pants: 'center top',
};
// transform รายชิ้น — เลื่อนตำแหน่ง (offsetX/Y เป็น % ของกล่องชิ้น) + ย่อ/ขยาย (scale)
// ค่าปริยาย (offset 0, scale 1) = ไม่แตะ (คงลุคเดิม) · translate ก่อน scale
export function onBodyTransform(
  scale?: number,
  offsetX?: number,
  offsetY?: number,
): string | undefined {
  const tx = offsetX || 0;
  const ty = offsetY || 0;
  const parts: string[] = [];
  if (tx !== 0 || ty !== 0) parts.push(`translate(${tx}%, ${ty}%)`);
  if (scale && scale !== 1) parts.push(`scale(${scale})`);
  return parts.length ? parts.join(' ') : undefined;
}

// สัดส่วนความสูงแบบ "คนใส่ชุด" (หัว < ไหล่ < สะโพก) — ใช้ทั้งมาสคอตหลักและหน้าดูเต็ม
export const LAYER_GROW: Record<Category, number> = {
  hat: 0.8,
  top: 2.0,
  pants: 3.0,
};

// เพศของสินค้า — unisex = ใส่ได้ทั้งชาย/หญิง (โชว์ในทุกฟิลเตอร์)
export type Gender = 'male' | 'female' | 'unisex';
export const GENDER_LABEL: Record<Gender, string> = {
  male: 'ชาย',
  female: 'หญิง',
  unisex: 'ทุกเพศ',
};

// ตัวเลือกฟิลเตอร์ฝั่งลูกค้า (all = ไม่กรอง)
export type GenderFilter = 'all' | 'male' | 'female';

export interface ClothingItem {
  id: string;
  category: Category;
  name: string;
  price: number;
  color: string; // สี fallback (เผื่อรูปโหลดไม่ขึ้น)
  imageUrl?: string; // URL รูป PNG โปร่ง (ตอนนี้จาก assets, อนาคตจาก backend)
  buyUrl?: string; // ลิงก์สั่งซื้อชิ้นนี้ (ไม่บังคับ)
  style?: string; // id สไตล์ (ดู src/config/styles.ts)
  gender?: Gender; // เพศ (ไม่ระบุ = unisex)
  fit?: Fit; // ทรงท่อนล่าง (ไม่ระบุ = long)
  aspect?: number; // สัดส่วนรูป กว้าง/สูง — ใช้สมดุลขนาดท่อนล่างทรงสั้นตามทรง
  scale?: number; // ตัวคูณขนาดรายชิ้น (ปรับในแอดมิน, ไม่ระบุ = 1 = ขนาดปกติ)
  offsetX?: number; // เลื่อนซ้าย-ขวา (% ของกล่องชิ้น, +=ขวา) — ปรับในแอดมิน
  offsetY?: number; // เลื่อนบน-ล่าง (% ของกล่องชิ้น, +=ล่าง) — ปรับในแอดมิน
  group?: string; // คีย์จับกลุ่ม "สินค้าตัวเดียวกันหลายสี" (variant group) — ใช้ทำแทบเลือกสี
  colorName?: string; // ชื่อสีไทยไว้โชว์ในแทบเลือกสี ("ครีม", "กรมท่า") — ต่างจาก color ที่เป็น hex
}

// ตัวเลือกสีของสินค้ากลุ่มเดียวกัน (variant) — ใช้วาดแทบเลือกสี
export interface ColorVariant {
  index: number; // ตำแหน่งใน list ของหมวดนั้น (ไว้ selectVariant)
  colorName?: string; // ชื่อสีไทยไว้โชว์ ("ครีม")
  swatch: string; // hex ของจุดสี (= color เฉลี่ยจากรูป)
  active: boolean; // เป็นสีที่สวมอยู่ตอนนี้ไหม
}

export interface WardrobeState {
  selectedLayer: Category;
  currentIndex: Record<Category, number>;
  hidden: Record<Category, boolean>; // ชั้นที่ "ไม่ใส่" (ปิดตา)
}

// พื้นหลังรูปย่อสินค้า (คอลเลกชัน + แอดมิน) — ขาวหม่นคงที่ ให้สินค้าทุกสีเด่นชัด
// (ถ้าใช้สีเฉลี่ยของชิ้นเอง เสื้อขาว/หมวกดำจะกลืนกับพื้น)
export const GARMENT_TILE_BG = '#efedea';