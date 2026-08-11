import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getCatalog } from '../data/catalogSource';
import {
  CATEGORIES,
  type Category,
  type ClothingItem,
  type ColorVariant,
  type Gender,
  type GenderFilter,
  type WardrobeState,
} from '../types';

// วน index ให้อยู่ในช่วง [0, len) เสมอ (รองรับ loop ทั้งสองทิศ)
function wrap(index: number, len: number): number {
  return ((index % len) + len) % len;
}

// สุ่มลำดับ "รายชิ้น" (Fisher-Yates) — ปัดแต่ละครั้งเจอของต่างกันจริง ไม่น่าเบื่อ
// สีของสินค้ากลุ่มเดียวกันกระจายทั่วลิสต์ก็ไม่เป็นไร — แทบเลือกสีจับกลุ่มจาก group ให้อยู่แล้ว
// สุ่มครั้งเดียวตอนโหลด (เก็บผลไว้ ไม่สุ่มซ้ำทุก render → ชิ้นที่สวมอยู่ไม่กระโดด)
function shuffleItems(list: ClothingItem[]): ClothingItem[] {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const placeholder = (cat: Category): ClothingItem => ({
  id: `${cat}-empty`,
  category: cat,
  name: '—',
  price: 0,
  color: '#d4d4d4',
});

// สินค้าชิ้นนี้ตรงกับฟิลเตอร์เพศไหม (ชาย = ชาย+unisex, หญิง = หญิง+unisex, ทั้งหมด = ทุกชิ้น)
function matchesGender(g: Gender | undefined, filter: GenderFilter): boolean {
  if (filter === 'all') return true;
  const gender = g ?? 'unisex';
  return gender === filter || gender === 'unisex';
}

export function useWardrobe() {
  // สินค้าโหลดแบบ async ผ่าน getCatalog() — วันสลับไป backend ไม่ต้องแก้ที่นี่
  const [items, setItems] = useState<Record<Category, ClothingItem[]> | null>(null);

  useEffect(() => {
    let alive = true;
    getCatalog().then((c) => {
      if (!alive) return;
      // สุ่มลำดับรายชิ้นครั้งเดียวตอนโหลด — เข้ามาแต่ละครั้งเจอลำดับใหม่ ไม่น่าเบื่อ
      setItems(
        CATEGORIES.reduce(
          (acc, cat) => {
            acc[cat] = shuffleItems(c[cat]);
            return acc;
          },
          {} as Record<Category, ClothingItem[]>,
        ),
      );
    });
    return () => {
      alive = false;
    };
  }, []);

  const [state, setState] = useState<WardrobeState>({
    selectedLayer: 'top', // เปิดมาเลือกเสื้อไว้ก่อน เล่นได้ทันที
    currentIndex: { hat: 0, top: 0, pants: 0 },
    hidden: { hat: false, top: false, pants: false }, // เริ่มมาใส่ครบทุกชั้น
  });

  // ฟิลเตอร์เพศฝั่งลูกค้า — default 'all' (ไม่มีหน้าถาม เข้ามาปัดได้เลย)
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('all');

  // รายการสินค้า "หลังกรองเพศ" — ทุกอย่างที่ปัด/โชว์บนมาสคอตใช้ตัวนี้
  // หมวดไหนกรองแล้วว่าง → ใส่ตัวสำรอง '—' กันแอปพัง (index ใช้ wrap เลยไม่หลุด)
  const filteredItems = useMemo(() => {
    if (!items) return null;
    return CATEGORIES.reduce(
      (acc, cat) => {
        const list = items[cat].filter((it) => matchesGender(it.gender, genderFilter));
        acc[cat] = list.length > 0 ? list : [placeholder(cat)];
        return acc;
      },
      {} as Record<Category, ClothingItem[]>,
    );
  }, [items, genderFilter]);

  // Preload รูปชิ้น "ก่อนหน้า/ถัดไป" ของทุกเลเยอร์ล่วงหน้า (ตาม planning §6)
  const preloadedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!filteredItems) return;
    CATEGORIES.forEach((cat) => {
      const list = filteredItems[cat];
      const i = wrap(state.currentIndex[cat], list.length);
      [i - 1, i + 1].forEach((k) => {
        const url = list[wrap(k, list.length)]?.imageUrl;
        if (url && !preloadedRef.current.has(url)) {
          preloadedRef.current.add(url);
          const img = new Image();
          img.src = url;
        }
      });
    });
  }, [filteredItems, state.currentIndex]);

  const selectLayer = useCallback((layer: Category) => {
    setState((s) => ({ ...s, selectedLayer: layer }));
  }, []);

  // สลับเลเยอร์ที่เลือกแบบวน (ใช้กับคีย์บอร์ดขึ้น/ลง)
  const cycleLayer = useCallback((delta: number) => {
    setState((s) => {
      const i = CATEGORIES.indexOf(s.selectedLayer);
      const next = wrap(i + delta, CATEGORIES.length);
      return { ...s, selectedLayer: CATEGORIES[next] };
    });
  }, []);

  // เปลี่ยนชิ้นของเลเยอร์ที่เลือกอยู่ (delta = +1 / -1) แบบวนกลับ
  // ถ้าเลเยอร์ถูกปิดตาไว้ (ไม่ใส่) จะปัดไม่ได้ — ต้องกดตาเปิดก่อน
  const changeItem = useCallback(
    (delta: number) => {
      if (!filteredItems) return;
      setState((s) => {
        const layer = s.selectedLayer;
        if (s.hidden[layer]) return s;
        const len = filteredItems[layer].length;
        const next = wrap(s.currentIndex[layer] + delta, len);
        return { ...s, currentIndex: { ...s.currentIndex, [layer]: next } };
      });
    },
    [filteredItems],
  );

  // สุ่มลุคใหม่ — ข้ามชั้นที่ปิดตาไว้ (ไม่ดึงกลับมา) และเลี่ยงไม่ให้สุ่มได้ชิ้นเดิม
  const shuffle = useCallback(() => {
    if (!filteredItems) return;
    setState((s) => {
      const next = { ...s.currentIndex };
      CATEGORIES.forEach((cat) => {
        if (s.hidden[cat]) return;
        const len = filteredItems[cat].length;
        let pick = Math.floor(Math.random() * len);
        if (len > 1 && pick === wrap(s.currentIndex[cat], len)) pick = wrap(pick + 1, len);
        next[cat] = pick;
      });
      return { ...s, currentIndex: next };
    });
  }, [filteredItems]);

  // ปิด/เปิดตา (ใส่/ไม่ใส่) ชั้นนั้น
  const toggleHidden = useCallback((layer: Category) => {
    setState((s) => ({ ...s, hidden: { ...s.hidden, [layer]: !s.hidden[layer] } }));
  }, []);

  // ใส่ "ลุคที่บันทึกไว้" กลับขึ้นมาสคอต — รีเซ็ตฟิลเตอร์เป็น 'ทั้งหมด' ก่อน
  // (ลุคอาจมีชิ้นที่ถูกฟิลเตอร์ซ่อนอยู่) แล้วเซ็ต index + สถานะปิดตา ให้ตรงลุค
  const applyLook = useCallback(
    (
      lookItems: Record<Category, string>,
      lookHidden: Record<Category, boolean>,
      opts?: { keepGender?: boolean },
    ): { missing: Category[] } => {
      if (!items) return { missing: [] };
      const found: Partial<Record<Category, number>> = {};
      const missing: Category[] = [];
      CATEGORIES.forEach((cat) => {
        const idx = items[cat].findIndex((it) => it.id === lookItems[cat]);
        if (idx >= 0) found[cat] = idx;
        else if (!lookHidden[cat]) missing.push(cat); // ชิ้นที่ไม่ใส่อยู่แล้ว ไม่นับว่า "หาย"
      });
      // ปกติรีเซ็ตตัวกรองเป็น 'ทั้งหมด' ให้เห็นทุกชิ้น — ยกเว้นลุคแนะนำที่แมตช์เพศไว้แล้ว (คงตัวกรองเพศเดิม)
      if (!opts?.keepGender) setGenderFilter('all');
      setState((s) => {
        const nextIndex = { ...s.currentIndex };
        (Object.keys(found) as Category[]).forEach((cat) => {
          nextIndex[cat] = found[cat]!;
        });
        return { ...s, currentIndex: nextIndex, hidden: { ...lookHidden } };
      });
      return { missing };
    },
    [items],
  );

  // ชิ้นที่กำลังสวมอยู่ของแต่ละหมวด (null ระหว่างโหลด) — จากรายการที่กรองแล้ว
  const selectedItems = useMemo(() => {
    if (!filteredItems) return null;
    return CATEGORIES.reduce(
      (acc, cat) => {
        const list = filteredItems[cat];
        acc[cat] = list[wrap(state.currentIndex[cat], list.length)];
        return acc;
      },
      {} as Record<Category, ClothingItem>,
    );
  }, [filteredItems, state.currentIndex]);

  // ราคารวม = derive จาก state (ไม่เก็บซ้ำ) — ไม่คิดชั้นที่ปิดตา (ไม่ใส่)
  const totalPrice = useMemo(
    () =>
      selectedItems
        ? CATEGORIES.reduce(
            (sum, cat) => sum + (state.hidden[cat] ? 0 : selectedItems[cat].price),
            0,
          )
        : 0,
    [selectedItems, state.hidden],
  );

  // แผนที่สินค้าตาม id — ใช้แปลง "ลุคที่บันทึกไว้" (เก็บเป็น id) กลับเป็นข้อมูลจริง
  // ใช้คลังเต็ม (ไม่กรอง) เพื่อให้ลุคที่บันทึกไว้ resolve ได้ทุกเพศ
  const itemsById = useMemo(() => {
    const map: Record<string, ClothingItem> = {};
    if (items) {
      CATEGORIES.forEach((cat) => items[cat].forEach((it) => (map[it.id] = it)));
    }
    return map;
  }, [items]);

  // ตัวเลือกสีของ "ชิ้นที่สวมอยู่" ในเลเยอร์ที่เลือก — ชิ้นอื่นในกลุ่ม (group) เดียวกัน
  // คืน [] ถ้าไม่มี group หรือกลุ่มมีสีเดียว (ไม่ต้องโชว์แทบสี)
  const variants = useMemo<ColorVariant[]>(() => {
    if (!filteredItems) return [];
    const layer = state.selectedLayer;
    const list = filteredItems[layer];
    const curIdx = wrap(state.currentIndex[layer], list.length);
    const group = list[curIdx]?.group;
    if (!group) return [];
    const sibs: ColorVariant[] = [];
    list.forEach((it, i) => {
      if (it.group === group) {
        sibs.push({ index: i, colorName: it.colorName, swatch: it.color, active: i === curIdx });
      }
    });
    return sibs.length > 1 ? sibs : [];
  }, [filteredItems, state.currentIndex, state.selectedLayer]);

  // กดเลือกสีในแทบ → กระโดดไปชิ้นนั้นของเลเยอร์ที่เลือก (ไม่นับเป็นการปัด)
  const selectVariant = useCallback((index: number) => {
    setState((s) => ({ ...s, currentIndex: { ...s.currentIndex, [s.selectedLayer]: index } }));
  }, []);

  // จำนวนตัวเลือกของแต่ละหมวด (ใช้ทำ dots บอกตำแหน่ง) — ตามที่กรอง
  const counts = useMemo(
    () =>
      CATEGORIES.reduce(
        (acc, cat) => {
          acc[cat] = filteredItems ? filteredItems[cat].length : 0;
          return acc;
        },
        {} as Record<Category, number>,
      ),
    [filteredItems],
  );

  return {
    loading: items === null,
    state,
    selectedItems,
    itemsById,
    totalPrice,
    counts,
    genderFilter,
    setGenderFilter,
    selectLayer,
    cycleLayer,
    changeItem,
    shuffle,
    toggleHidden,
    applyLook,
    variants,
    selectVariant,
  };
}
