// ┌─────────────────────────────────────────────────────────────────┐
// │ คลัง "ลุคที่บันทึกไว้" — จุดเดียวของทั้งแอป (identity-aware)         │
// │                                                                   │
// │  • guest (ไม่ล็อกอิน) → localStorage (อยู่เครื่องนี้, iOS อาจล้าง 7 วัน) │
// │  • ล็อกอินแล้ว        → Supabase ตาราง saved_looks (ถาวร + ข้ามเครื่อง) │
// │  • ล็อกอินครั้งแรก    → ย้ายลุคใน localStorage ขึ้น Supabase ให้อัตโนมัติ │
// │                                                                   │
// │ เก็บเป็น "id อ้างอิง" ไม่ก็อปข้อมูลสินค้า → ราคา/ลิงก์อัปเดตสดเสมอ    │
// └─────────────────────────────────────────────────────────────────┘
import { CATEGORIES, type Category } from '../types';
import { supabase, authEnabled } from './supabaseClient';

export interface SavedLook {
  id: string;
  createdAt: number;
  items: Record<Category, string>; // id สินค้าที่เลือกในแต่ละหมวด
  hidden: Record<Category, boolean>; // หมวดที่ "ไม่ใส่" (ปิดตา)
}

const KEY = 'dood.savedLooks.v1';
type Listener = () => void;
const listeners = new Set<Listener>();

let cache: SavedLook[] = []; // ลุคของ "แหล่งปัจจุบัน" (guest หรือ user) — reference คงที่จนกว่าจะเปลี่ยน
let userId: string | null = null; // null = guest

const byNewest = (a: SavedLook, b: SavedLook) => b.createdAt - a.createdAt;

function notify() {
  listeners.forEach((l) => l());
}
function setCache(looks: SavedLook[]) {
  cache = looks.slice().sort(byNewest);
  notify();
}

// กันข้อมูลเพี้ยน: เก็บเฉพาะลุคที่มี id ครบทุกหมวด + เติม hidden ให้ถ้าขาด
function sanitize(list: unknown[]): SavedLook[] {
  return (list as SavedLook[])
    .filter(
      (l) => l && l.id && l.items && CATEGORIES.every((c) => typeof l.items[c] === 'string'),
    )
    .map((l) => ({ ...l, hidden: l.hidden ?? { hat: false, top: false, pants: false } }));
}

// ---------- guest: localStorage ----------
function readLocal(): SavedLook[] {
  try {
    const raw = localStorage.getItem(KEY);
    const data = raw ? JSON.parse(raw) : null;
    return Array.isArray(data) ? sanitize(data) : [];
  } catch {
    return [];
  }
}
function writeLocal(looks: SavedLook[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(looks));
  } catch {
    /* เต็ม/ปิด → ข้าม */
  }
}

// ---------- user: Supabase ----------
interface Row {
  id: string;
  items: Record<Category, string>;
  hidden: Record<Category, boolean> | null;
  created_at: string;
}
function rowToLook(r: Row): SavedLook {
  return {
    id: r.id,
    createdAt: new Date(r.created_at).getTime(),
    items: r.items,
    hidden: r.hidden ?? { hat: false, top: false, pants: false },
  };
}
async function loadRemote(): Promise<SavedLook[]> {
  const { data, error } = await supabase
    .from('saved_looks')
    .select('id,items,hidden,created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return sanitize((data ?? []).map(rowToLook));
}

// ลายเซ็นลุค = ชุด id + สถานะไม่ใส่ (ใช้กันบันทึกซ้ำ)
function signature(items: Record<Category, string>, hidden: Record<Category, boolean>): string {
  return CATEGORIES.map((c) => (hidden[c] ? `${items[c]}!off` : items[c])).join('|');
}

// ย้ายลุคใน localStorage → Supabase ตอนล็อกอินครั้งแรก (ข้ามอันที่ซ้ำกับที่มีอยู่)
async function migrateLocalToRemote() {
  const local = readLocal();
  if (!local.length) return;
  const remoteSigs = new Set((await loadRemote()).map((l) => signature(l.items, l.hidden)));
  const toInsert = local
    .filter((l) => !remoteSigs.has(signature(l.items, l.hidden)))
    .map((l) => ({ items: l.items, hidden: l.hidden }));
  if (toInsert.length) await supabase.from('saved_looks').insert(toInsert);
}

// ---------- สลับโหมดตามสถานะล็อกอิน ----------
async function handleUser(id: string | null) {
  if (id === userId) return;
  const wasGuest = userId === null;
  userId = id;
  if (id) {
    try {
      if (wasGuest) await migrateLocalToRemote();
      setCache(await loadRemote());
    } catch {
      setCache([]); // ดึงไม่ได้ → ว่างไว้ก่อน (ไม่ทำแอปพัง)
    }
  } else {
    setCache(readLocal());
  }
}

// init: guest cache ทันที (sync) + ผูกกับ auth ถ้าเปิดใช้
cache = readLocal().sort(byNewest);
if (authEnabled) {
  supabase.auth.getSession().then(({ data }) => handleUser(data.session?.user?.id ?? null));
  supabase.auth.onAuthStateChange((_e, session) => handleUser(session?.user?.id ?? null));
}

// ---------- API สาธารณะ (เหมือนเดิม + saveLook เป็น async) ----------
export function getSavedLooks(): SavedLook[] {
  return cache;
}

export function isLookSaved(
  items: Record<Category, string>,
  hidden: Record<Category, boolean>,
): boolean {
  const sig = signature(items, hidden);
  return cache.some((l) => signature(l.items, l.hidden) === sig);
}

// คืน true ถ้าบันทึกใหม่, false ถ้าลุคนี้มีอยู่แล้ว (เช็คจาก cache แบบ sync ก่อน)
export async function saveLook(
  items: Record<Category, string>,
  hidden: Record<Category, boolean>,
): Promise<boolean> {
  const sig = signature(items, hidden);
  if (cache.some((l) => signature(l.items, l.hidden) === sig)) return false;

  if (userId) {
    // optimistic: โชว์ทันที แล้วค่อยยืนยันกับ DB
    const tmp: SavedLook = {
      id: `tmp-${Date.now()}`,
      createdAt: Date.now(),
      items: { ...items },
      hidden: { ...hidden },
    };
    setCache([tmp, ...cache]);
    const { data, error } = await supabase
      .from('saved_looks')
      .insert({ items, hidden })
      .select('id,items,hidden,created_at')
      .single();
    if (error) {
      setCache(await loadRemote().catch(() => cache.filter((l) => l.id !== tmp.id)));
    } else {
      setCache(cache.map((l) => (l.id === tmp.id ? rowToLook(data as Row) : l)));
    }
  } else {
    const looks = readLocal();
    looks.push({
      id: `look-${Date.now().toString(36)}${Math.floor(Math.random() * 46656).toString(36)}`,
      createdAt: Date.now(),
      items: { ...items },
      hidden: { ...hidden },
    });
    writeLocal(looks);
    setCache(looks);
  }
  return true;
}

export async function removeLook(id: string) {
  if (userId) {
    setCache(cache.filter((l) => l.id !== id)); // optimistic
    const { error } = await supabase.from('saved_looks').delete().eq('id', id);
    if (error) setCache(await loadRemote().catch(() => cache));
  } else {
    const looks = readLocal().filter((l) => l.id !== id);
    writeLocal(looks);
    setCache(looks);
  }
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

// sync ข้ามแท็บ (เฉพาะ guest) — แท็บอื่นแก้ localStorage → รีเฟรช
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY && userId === null) setCache(readLocal());
  });
}
