import { useCallback, useSyncExternalStore } from 'react';
import {
  getSavedLooks,
  removeLook,
  saveLook,
  subscribe,
  type SavedLook,
} from '../data/savedLooksStore';
import { CATEGORIES, type Category, type ClothingItem } from '../types';

const EMPTY: SavedLook[] = [];

// แปลงชุดสินค้าที่สวมอยู่ (Record<Category, ClothingItem>) → map ของ id
function toIdMap(items: Record<Category, ClothingItem>): Record<Category, string> {
  return CATEGORIES.reduce(
    (acc, c) => {
      acc[c] = items[c].id;
      return acc;
    },
    {} as Record<Category, string>,
  );
}

export function useSavedLooks() {
  const looks = useSyncExternalStore(subscribe, getSavedLooks, () => EMPTY);

  const save = useCallback(
    (items: Record<Category, ClothingItem>, hidden: Record<Category, boolean>) =>
      saveLook(toIdMap(items), hidden),
    [],
  );

  const remove = useCallback((id: string) => removeLook(id), []);

  // ลุคที่สวมอยู่ตอนนี้ ถูกบันทึกไว้แล้วหรือยัง (ให้ปุ่มโชว์สถานะ)
  const isSaved = useCallback(
    (items: Record<Category, ClothingItem>, hidden: Record<Category, boolean>) => {
      const sig = CATEGORIES.map((c) => (hidden[c] ? `${items[c].id}!off` : items[c].id)).join('|');
      return looks.some(
        (l) => CATEGORIES.map((c) => (l.hidden[c] ? `${l.items[c]}!off` : l.items[c])).join('|') === sig,
      );
    },
    [looks],
  );

  return { looks, count: looks.length, save, remove, isSaved };
}
