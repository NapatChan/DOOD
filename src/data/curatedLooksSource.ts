// ┌─────────────────────────────────────────────────────────────────┐
// │ ดึง "ลุคแนะนำ" (curated_looks) จาก Supabase — read path ฝั่งลูกค้า  │
// │ อ่านผ่าน anon key + RLS (public read เฉพาะ is_active=true)         │
// │ ล้มเหลว/ไม่มี env → คืน [] (แอปทำงานต่อได้ แค่ไม่มีลุคแนะนำ)         │
// └─────────────────────────────────────────────────────────────────┘
import { type Category, type GenderFilter } from '../types';

const SB_URL = import.meta.env.VITE_SUPABASE_URL;
const SB_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

// ลุคแนะนำในรูปแบบที่ applyLook ใช้ได้ทันที (id ต่อหมวด + สถานะปิดตา)
export interface CuratedLookData {
  label: string;
  gender: 'male' | 'female' | 'unisex';
  items: Record<Category, string>;
  hidden: Record<Category, boolean>;
}

interface Row {
  label?: string;
  gender?: string;
  hat_id?: string | null;
  top_id?: string | null;
  pants_id?: string | null;
}

// ลุคเข้ากับตัวกรองเพศไหม (หญิง = หญิง+ทุกเพศ · ชาย = ชาย+ทุกเพศ · ทั้งหมด = ทุกลุค)
export function looksForGender(looks: CuratedLookData[], filter: GenderFilter): CuratedLookData[] {
  if (filter === 'all') return looks;
  return looks.filter((l) => l.gender === filter || l.gender === 'unisex');
}

function rowToLook(r: Row): CuratedLookData {
  const ids: Record<Category, string | null | undefined> = {
    hat: r.hat_id,
    top: r.top_id,
    pants: r.pants_id,
  };
  const items = {} as Record<Category, string>;
  const hidden = {} as Record<Category, boolean>;
  (['hat', 'top', 'pants'] as Category[]).forEach((c) => {
    items[c] = ids[c] || '';
    hidden[c] = !ids[c]; // ไม่มี id = ไม่ใส่ชิ้นนั้น (ปิดตา)
  });
  const g = r.gender === 'male' || r.gender === 'female' ? r.gender : 'unisex';
  return { label: r.label || '', gender: g, items, hidden };
}

export async function getCuratedLooks(): Promise<CuratedLookData[]> {
  if (!SB_URL || !SB_ANON) return [];
  try {
    const res = await fetch(
      `${SB_URL}/rest/v1/curated_looks?select=*&is_active=eq.true&order=sort_order`,
      { headers: { apikey: SB_ANON, Authorization: `Bearer ${SB_ANON}` } },
    );
    if (!res.ok) return [];
    const rows = (await res.json()) as Row[];
    return Array.isArray(rows) ? rows.map(rowToLook) : [];
  } catch {
    return [];
  }
}
