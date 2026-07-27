// ┌─────────────────────────────────────────────────────────────────┐
// │ จุดดึงข้อมูลสินค้า "จุดเดียว" ของทั้งแอป (read path)                │
// │                                                                   │
// │ ตอนนี้: อ่านจาก catalog/products.json ที่ bundle มากับแอป (โหลดทันที) │
// │ อนาคต (มี backend): เปลี่ยนแค่ไส้ในของ getCatalog() เป็น            │
// │   const res = await fetch('/api/products'); ...                   │
// │ ที่เหลือทั้งแอปไม่ต้องแก้ เพราะเรียกผ่าน getCatalog() แบบ async อยู่แล้ว │
// └─────────────────────────────────────────────────────────────────┘
import productsData from '../../catalog/products.json';
import { CATEGORIES, type Category, type ClothingItem } from '../types';
import { imageUrlByPath } from './productImages';

interface RawProduct {
  id: string;
  category: Category;
  name: string;
  price: number;
  color: string;
  image?: string;
  buyUrl?: string;
  style?: string;
}

// map raw → ClothingItem (ผูก URL รูปจาก path)
function toItem(p: RawProduct): ClothingItem {
  return {
    id: p.id,
    category: p.category,
    name: p.name,
    price: p.price,
    color: p.color,
    imageUrl: p.image ? imageUrlByPath[p.image] : undefined,
    buyUrl: p.buyUrl || undefined,
    style: p.style || undefined,
  };
}

// จัดกลุ่มสินค้าตามหมวด + ใส่ตัวสำรองถ้าหมวดไหนว่าง (กันแอปพัง)
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

// async ตั้งแต่ตอนนี้ เพื่อให้วันสลับไป backend ไม่ต้องแก้ผู้เรียก
export async function getCatalog(): Promise<Record<Category, ClothingItem[]>> {
  const products = (productsData as { products: RawProduct[] }).products;
  return group(products);
}
