// ┌─────────────────────────────────────────────────────────────────┐
// │ จุดดึงข้อมูลสินค้า "จุดเดียว" ของทั้งแอป (read path)                │
// │                                                                   │
// │ อ่านจาก Supabase (public read + RLS) แบบ cache 3 ชั้น:            │
// │   ① localStorage cache → คืนทันที (ไม่รอเน็ต)                      │
// │   ② fetch Supabase → อัปเดต cache ไว้ให้รอบหน้า                    │
// │   ③ snapshot ที่ bundle มา (catalog/products.json) → fallback สุดท้าย │
// │      (Supabase ล่ม/เข้าครั้งแรกแล้วออฟไลน์ → เว็ปไม่จอเปล่า)         │
// └─────────────────────────────────────────────────────────────────┘
import productsData from '../../catalog/products.json';
import { CATEGORIES, type Category, type ClothingItem, type Fit, type Gender } from '../types';
import { imageUrlByPath } from './productImages';

const SB_URL = import.meta.env.VITE_SUPABASE_URL;
const SB_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;
const CACHE_KEY = 'dood.catalog.v1';

// รองรับทั้งแถวจาก Supabase (image_url เต็ม, buy_url) และ snapshot เดิม (image path, buyUrl)
interface RawProduct {
  id: string;
  category: Category;
  name: string;
  price: number;
  color: string;
  image?: string; // snapshot: path ใน src/assets
  image_url?: string; // Supabase: URL เต็ม
  buyUrl?: string;
  buy_url?: string;
  style?: string;
  gender?: Gender;
  fit?: Fit;
  aspect?: number;
  scale?: number;
}

// map raw → ClothingItem (รูป: ใช้ image_url ถ้ามี ไม่งั้น resolve path เดิมจาก glob)
function toItem(p: RawProduct): ClothingItem {
  return {
    id: p.id,
    category: p.category,
    name: p.name,
    price: p.price,
    color: p.color,
    imageUrl: p.image_url || (p.image ? imageUrlByPath[p.image] : undefined),
    buyUrl: p.buyUrl || p.buy_url || undefined,
    style: p.style || undefined,
    gender: p.gender || 'unisex',
    fit: p.fit || undefined,
    aspect: p.aspect || undefined,
    scale: p.scale || undefined,
  };
}

// จัดกลุ่มตามหมวด + ใส่ตัวสำรองถ้าหมวดไหนว่าง (กันแอปพัง)
function group(products: RawProduct[]): Record<Category, ClothingItem[]> {
  return CATEGORIES.reduce(
    (acc, cat) => {
      const items = products.filter((p) => p.category === cat).map(toItem);
      acc[cat] =
        items.length > 0
          ? items
          : [{ id: `${cat}-empty`, category: cat, name: '—', price: 0, color: '#d4d4d4' }];
      return acc;
    },
    {} as Record<Category, ClothingItem[]>,
  );
}

// ② ดึงจาก Supabase (เฉพาะ active, เรียงตาม sort_order)
async function fetchFromSupabase(): Promise<RawProduct[]> {
  if (!SB_URL || !SB_ANON) throw new Error('ยังไม่ตั้งค่า Supabase env');
  const res = await fetch(
    `${SB_URL}/rest/v1/products?select=*&is_active=eq.true&order=sort_order`,
    { headers: { apikey: SB_ANON, Authorization: `Bearer ${SB_ANON}` } },
  );
  if (!res.ok) throw new Error(`ดึง catalog ไม่สำเร็จ (${res.status})`);
  const rows = (await res.json()) as RawProduct[];
  if (!Array.isArray(rows) || rows.length === 0) throw new Error('catalog ว่าง');
  return rows;
}

function readCache(): RawProduct[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const data = raw ? JSON.parse(raw) : null;
    return Array.isArray(data) && data.length ? data : null;
  } catch {
    return null;
  }
}
function writeCache(rows: RawProduct[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(rows));
  } catch {
    /* localStorage เต็ม/ปิด → ข้าม */
  }
}

// จุดเรียกจริงของทั้งแอป — async เหมือนเดิม ผู้เรียกไม่ต้องแก้
export async function getCatalog(): Promise<Record<Category, ClothingItem[]>> {
  const cached = readCache();
  if (cached) {
    // ① มี cache → คืนทันที (เร็วเท่า bundle เดิม) + รีเฟรชเบื้องหลังไว้ให้รอบหน้า
    fetchFromSupabase().then(writeCache).catch(() => {});
    return group(cached);
  }
  // เข้าครั้งแรก (ยังไม่มี cache) → ลอง Supabase
  try {
    const rows = await fetchFromSupabase();
    writeCache(rows);
    return group(rows);
  } catch {
    // ③ fallback: snapshot ที่ bundle มากับแอป (รูปโหลดจาก src/assets ในเครื่อง → ทำงานแม้ Supabase ล่ม)
    return group((productsData as { products: RawProduct[] }).products);
  }
}
