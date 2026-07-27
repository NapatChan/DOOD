// รายการสไตล์สินค้า — แก้ไข/เพิ่ม/ลบได้ที่ไฟล์นี้ไฟล์เดียว
// id ใช้เก็บในข้อมูล (products.json), label ใช้แสดงผล
// อนาคตย้ายขึ้น backend ได้ (กลายเป็นตาราง styles) — โครงสร้างเดียวกัน
export interface StyleOption {
  id: string;
  label: string;
}

export const STYLES: StyleOption[] = [
  { id: 'minimal', label: 'มินิมอล' },
  { id: 'casual', label: 'แคชชวล' },
  { id: 'street', label: 'สตรีท' },
  { id: 'vintage', label: 'วินเทจ' },
  { id: 'formal', label: 'ทางการ' },
  { id: 'sport', label: 'กีฬา' },
];

export const STYLE_LABEL: Record<string, string> = Object.fromEntries(
  STYLES.map((s) => [s.id, s.label]),
);

// แปลง id → label (คืนค่าว่างถ้าไม่มีสไตล์ / ไม่รู้จัก)
export function styleLabel(id?: string): string {
  if (!id) return '';
  return STYLE_LABEL[id] ?? id;
}
