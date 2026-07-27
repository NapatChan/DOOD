// ┌─────────────────────────────────────────────────────────────────┐
// │ จุดเชื่อมข้อมูลของหน้าแอดมิน "จุดเดียว" (write path)               │
// │                                                                   │
// │ ตอนนี้คุยกับ dev API (scripts/admin-plugin.mjs) ผ่าน /api/products  │
// │ วันขึ้น backend จริง: เปลี่ยนแค่ base URL / วิธี auth ในไฟล์นี้      │
// │ ที่เหลือของหน้าแอดมินไม่ต้องแก้                                     │
// └─────────────────────────────────────────────────────────────────┘
import type { Category } from '../types';

export interface AdminProduct {
  id: string;
  category: Category;
  name: string;
  price: number;
  color: string;
  image: string;
  buyUrl: string;
  style: string;
}

export interface ProductInput {
  category: Category;
  name: string;
  price: number;
  buyUrl?: string;
  style?: string;
  imageBase64?: string; // dataURL หรือ base64 ล้วน
  removeBg?: 'auto' | 'on' | 'off'; // ตัดพื้นหลัง: auto=ตัดถ้ายังไม่โปร่ง (ค่าเริ่มต้น)
}

const BASE = '/api/products';

async function parse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errors = (data as { errors?: string[] }).errors;
    throw new Error(errors?.join('\n') || `เกิดข้อผิดพลาด (${res.status})`);
  }
  return data as T;
}

export async function listProducts(): Promise<AdminProduct[]> {
  const res = await fetch(BASE);
  const data = await parse<{ products: AdminProduct[] }>(res);
  return data.products;
}

export async function createProduct(input: ProductInput): Promise<AdminProduct> {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await parse<{ product: AdminProduct }>(res);
  return data.product;
}

export async function updateProduct(
  id: string,
  input: Partial<ProductInput>,
): Promise<AdminProduct> {
  const res = await fetch(`${BASE}/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await parse<{ product: AdminProduct }>(res);
  return data.product;
}

export async function deleteProduct(id: string): Promise<void> {
  const res = await fetch(`${BASE}/${encodeURIComponent(id)}`, { method: 'DELETE' });
  await parse<{ ok: boolean }>(res);
}
