// ┌─────────────────────────────────────────────────────────────────┐
// │ คลัง "ลุคที่บันทึกไว้" — จุดเดียวของทั้งแอป                          │
// │                                                                   │
// │ ตอนนี้: เก็บใน localStorage (รอดรีเฟรช/ปิดเปิดแอป)                  │
// │ อนาคต (มี backend): เปลี่ยนไส้ใน read/write เป็นเรียก API           │
// │   ตาราง saved_looks ผูกกับ user — สัญญาเดิม (getSavedLooks/…) ไม่ต้องแก้ │
// │                                                                   │
// │ เก็บเป็น "id อ้างอิง" ไม่ก็อปข้อมูลสินค้า → ราคา/ลิงก์อัปเดตสดเสมอ    │
// └─────────────────────────────────────────────────────────────────┘
import { CATEGORIES, type Category } from '../types';

export interface SavedLook {
  id: string;
  createdAt: number;
  items: Record<Category, string>; // id สินค้าที่เลือกในแต่ละหมวด (จำไว้แม้ไม่ใส่)
  hidden: Record<Category, boolean>; // หมวดที่ "ไม่ใส่" (ปิดตา)
}

const KEY = 'dood.savedLooks.v1';
type Listener = () => void;
const listeners = new Set<Listener>();

// cache snapshot ไว้ให้ reference คงที่ระหว่างการเขียน (จำเป็นสำหรับ useSyncExternalStore)
let cache: SavedLook[] | null = null;

function readRaw(): SavedLook[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    // กันข้อมูลเพี้ยน: เก็บเฉพาะรายการที่มี items ครบทุกหมวด + เติม hidden ให้ถ้าขาด (ของเก่า)
    return data
      .filter((l) => l && l.id && l.items && CATEGORIES.every((c) => typeof l.items[c] === 'string'))
      .map((l) => ({
        ...l,
        hidden: l.hidden ?? { hat: false, top: false, pants: false },
      }));
  } catch {
    return [];
  }
}

function refreshCache() {
  cache = readRaw().sort((a, b) => b.createdAt - a.createdAt); // ใหม่สุดขึ้นก่อน
}

function commit(looks: SavedLook[]) {
  localStorage.setItem(KEY, JSON.stringify(looks));
  cache = looks.slice().sort((a, b) => b.createdAt - a.createdAt);
  listeners.forEach((l) => l());
}

// ลายเซ็นของลุค = ชุด id + สถานะไม่ใส่ เรียงตามหมวด (ใช้กันบันทึกซ้ำ)
// ลุคเดียวกันแต่ "ใส่หมวก" กับ "ไม่ใส่หมวก" ถือเป็นคนละลุค
function signature(items: Record<Category, string>, hidden: Record<Category, boolean>): string {
  return CATEGORIES.map((c) => (hidden[c] ? `${items[c]}!off` : items[c])).join('|');
}

export function getSavedLooks(): SavedLook[] {
  if (cache === null) refreshCache();
  return cache!;
}

export function isLookSaved(
  items: Record<Category, string>,
  hidden: Record<Category, boolean>,
): boolean {
  const sig = signature(items, hidden);
  return getSavedLooks().some((l) => signature(l.items, l.hidden) === sig);
}

// คืน true ถ้าบันทึกใหม่สำเร็จ, false ถ้าลุคนี้มีอยู่แล้ว
export function saveLook(
  items: Record<Category, string>,
  hidden: Record<Category, boolean>,
): boolean {
  const looks = readRaw();
  const sig = signature(items, hidden);
  if (looks.some((l) => signature(l.items, l.hidden) === sig)) return false;
  looks.push({
    id: `look-${Date.now().toString(36)}${Math.floor(Math.random() * 46656).toString(36)}`,
    createdAt: Date.now(),
    items: { ...items },
    hidden: { ...hidden },
  });
  commit(looks);
  return true;
}

export function removeLook(id: string) {
  commit(readRaw().filter((l) => l.id !== id));
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

// sync ข้ามแท็บ: แท็บอื่นแก้ localStorage → รีเฟรช cache + แจ้ง subscriber
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) {
      refreshCache();
      listeners.forEach((l) => l());
    }
  });
}
