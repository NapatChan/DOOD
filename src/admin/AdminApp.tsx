import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CATEGORIES,
  CATEGORY_LABEL,
  FIT_LABEL,
  GARMENT_TILE_BG,
  GENDER_LABEL,
  type Category,
  type Fit,
  type Gender,
} from '../types';
import { STYLES, styleLabel } from '../config/styles';
import {
  createProduct,
  deleteProduct,
  listProducts,
  updateProduct,
  type AdminProduct,
} from './api';
import CropBox from './CropBox';
import FittingPreview, { type PreviewGarment } from './FittingPreview';
import CuratedLooks from './CuratedLooks';

// รูปสินค้ามาจาก Supabase เป็น URL เต็ม (http…) — ใช้ตรง ๆ; ถ้าเป็น path เดิม (สแนปช็อต) prefix ให้
function assetUrl(image: string | undefined | null): string | undefined {
  if (!image) return undefined;
  return /^https?:\/\//.test(image) ? image : `/src/assets/${image}`;
}

// อ่านไฟล์ → dataURL (base64) สำหรับส่งขึ้น API
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

interface FormState {
  editingId: string | null; // null = โหมดเพิ่มใหม่
  category: Category;
  name: string;
  price: string;
  buyUrl: string;
  style: string;
  group: string; // คีย์จับกลุ่มสินค้าตัวเดียวกันหลายสี (เว้น = ชิ้นเดี่ยว)
  colorName: string; // ชื่อสีไทยไว้โชว์ในแทบเลือกสี
  gender: Gender;
  fit: Fit | 'auto'; // ทรงท่อนล่าง (auto = เดาจากรูป)
  scale: number; // ตัวคูณขนาดรายชิ้น (1 = ปกติ)
  aspect?: number; // สัดส่วนรูป (มีตอนแก้ไขของเดิม) — ใช้พรีวิว
  imageBase64: string | null; // รูปใหม่ (ถ้ามี)
  previewUrl: string | null; // แสดง preview (รูปใหม่ หรือรูปเดิมตอนแก้ไข)
  removeBg: boolean; // ตัดพื้นหลังอัตโนมัติ
}

const EMPTY: FormState = {
  editingId: null,
  category: 'top',
  name: '',
  price: '',
  buyUrl: '',
  style: '',
  group: '',
  colorName: '',
  gender: 'unisex',
  fit: 'auto',
  scale: 1,
  aspect: undefined,
  imageBase64: null,
  previewUrl: null,
  removeBg: true,
};

// วันที่ลงสินค้า (ISO) → รูปแบบไทยสั้น เช่น "1 ส.ค. 2569"
function fmtDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ISO → 'YYYY-MM-DD' ตามเวลาท้องถิ่น (ไว้เทียบกับ <input type="date">)
function toLocalYMD(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export default function AdminApp() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'products' | 'looks'>('products'); // แท็บ: สินค้า | ลุคแนะนำ
  const [form, setForm] = useState<FormState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [cropping, setCropping] = useState(false);
  const [applyToGroup, setApplyToGroup] = useState(false); // แก้ขนาดทั้งกลุ่ม
  const [scalePct, setScalePct] = useState('100'); // ช่องพิมพ์ขนาดเป็น % (แยกจาก form.scale เพื่อพิมพ์ลื่น)
  const [search, setSearch] = useState(''); // ค้นหาชื่อ/กลุ่ม/สี
  const [catFilter, setCatFilter] = useState<Category | 'all'>('all'); // กรองหมวด
  const [genderFilter, setGenderFilter] = useState<Gender | 'all'>('all'); // กรองเพศ
  const [dateFilter, setDateFilter] = useState(''); // กรองวันที่ลง (YYYY-MM-DD, '' = ทั้งหมด)
  const [flaggedOnly, setFlaggedOnly] = useState(false); // เฉพาะที่ติ๊กว่ามีปัญหา
  const fileRef = useRef<HTMLInputElement>(null);
  const formTopRef = useRef<HTMLDivElement>(null);

  const isEditing = form.editingId !== null;

  // ชิ้นอื่นในกลุ่มเดียวกัน (variant_group) — ไว้ทำปุ่ม "แก้ขนาดทั้งกลุ่ม"
  const groupSiblings =
    isEditing && form.group.trim()
      ? products.filter(
          (p) => (p.group?.trim() || '') === form.group.trim() && p.id !== form.editingId,
        )
      : [];

  // ชิ้นอ้างอิงหมวดอื่น (ตัวแรกของแต่ละหมวด ที่ไม่ใช่ชิ้นที่กำลังแก้) — ไว้เทียบสัดส่วนในพรีวิว
  const references = useMemo(() => {
    const map: Partial<Record<Category, PreviewGarment>> = {};
    for (const cat of CATEGORIES) {
      const ref = products.find((p) => p.category === cat && p.id !== form.editingId);
      if (ref)
        map[cat] = {
          imageUrl: assetUrl(ref.image),
          fit: ref.fit,
          aspect: ref.aspect,
          scale: ref.scale,
        };
    }
    return map;
  }, [products, form.editingId]);

  const editingGarment: PreviewGarment = {
    imageUrl: form.previewUrl || undefined,
    fit: form.fit,
    aspect: form.aspect,
    scale: form.scale,
  };

  async function refresh() {
    setLoading(true);
    try {
      setProducts(await listProducts());
    } catch (e) {
      setError(String((e as Error).message));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  function flash(msg: string) {
    setNotice(msg);
    window.setTimeout(() => setNotice(null), 2500);
  }

  function resetForm() {
    setForm(EMPTY);
    setError(null);
    setApplyToGroup(false);
    setScalePct('100');
    if (fileRef.current) fileRef.current.value = '';
  }

  async function onPickFile(file: File | undefined) {
    if (!file) return;
    if (!/\.(png|webp|jpe?g)$/i.test(file.name)) {
      setError('รองรับไฟล์ .png .webp .jpg');
      return;
    }
    const dataUrl = await fileToDataUrl(file);
    setForm((f) => ({ ...f, imageBase64: dataUrl, previewUrl: dataUrl }));
    setError(null);
  }

  function startEdit(p: AdminProduct) {
    setForm({
      editingId: p.id,
      category: p.category,
      name: p.name,
      price: String(p.price),
      buyUrl: p.buyUrl || '',
      style: p.style || '',
      group: p.group || '',
      colorName: p.colorName || '',
      gender: p.gender || 'unisex',
      fit: p.fit || 'auto',
      scale: p.scale ?? 1,
      aspect: p.aspect,
      imageBase64: null,
      previewUrl: assetUrl(p.image) ?? null,
      removeBg: true,
    });
    setError(null);
    setApplyToGroup(false);
    setScalePct(String(Math.round((p.scale ?? 1) * 100)));
    if (fileRef.current) fileRef.current.value = '';
    formTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.name.trim()) return setError('ต้องตั้งชื่อสินค้า');
    const priceNum = Number(form.price);
    if (!Number.isFinite(priceNum) || priceNum < 0) return setError('ราคาต้องเป็นตัวเลข 0 ขึ้นไป');
    if (!isEditing && !form.imageBase64) return setError('ต้องแนบไฟล์รูป (PNG โปร่ง)');

    setSubmitting(true);
    try {
      const removeBg = form.removeBg ? 'auto' : 'off';
      if (isEditing) {
        await updateProduct(form.editingId!, {
          category: form.category,
          name: form.name.trim(),
          price: priceNum,
          buyUrl: form.buyUrl.trim(),
          style: form.style,
          group: form.group.trim(),
          colorName: form.colorName.trim(),
          gender: form.gender,
          fit: form.fit,
          scale: form.scale,
          ...(form.imageBase64 ? { imageBase64: form.imageBase64, removeBg } : {}),
        });
        // แก้ขนาดทั้งกลุ่ม — apply เฉพาะ scale ไปยังชิ้นอื่นในกลุ่มเดียวกัน (ฟิลด์อื่นคงเดิมรายชิ้น)
        if (applyToGroup && groupSiblings.length) {
          await Promise.all(groupSiblings.map((s) => updateProduct(s.id, { scale: form.scale })));
          flash(`บันทึก + ปรับขนาดทั้งกลุ่ม ${groupSiblings.length + 1} ชิ้นแล้ว ✓`);
        } else {
          flash('บันทึกการแก้ไขแล้ว ✓');
        }
      } else {
        await createProduct({
          category: form.category,
          name: form.name.trim(),
          price: priceNum,
          buyUrl: form.buyUrl.trim(),
          style: form.style,
          group: form.group.trim(),
          colorName: form.colorName.trim(),
          gender: form.gender,
          fit: form.fit,
          scale: form.scale,
          imageBase64: form.imageBase64!,
          removeBg,
        });
        flash('เพิ่มสินค้าแล้ว ✓');
      }
      resetForm();
      await refresh();
    } catch (e) {
      setError(String((e as Error).message));
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete(p: AdminProduct) {
    if (!window.confirm(`ลบ "${p.name}" ?`)) return;
    try {
      await deleteProduct(p.id);
      if (form.editingId === p.id) resetForm();
      flash('ลบแล้ว');
      await refresh();
    } catch (e) {
      setError(String((e as Error).message));
    }
  }

  // ติ๊ก/ปลด "มีปัญหา" (ซ่อน/แสดงบนเว็บลูกค้า) — แก้แค่ชิ้นนั้นในสเตทตรง ๆ ไม่เรียก refresh()
  // ทั้งลิสต์ (refresh ทำให้ตะเข็บ "กำลังโหลด..." สลับเนื้อหาทั้งหน้า scroll เด้งกลับขึ้นบน
  // กดติ๊กหลายชิ้นรวดเดียวแล้วต้องเลื่อนลงมาใหม่ทุกครั้ง)
  async function toggleFix(p: AdminProduct) {
    try {
      const next = !p.needsFix;
      await updateProduct(p.id, { needsFix: next });
      setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, needsFix: next } : x)));
      flash(p.needsFix ? 'ปลดปัญหาแล้ว — กลับขึ้นเว็บ' : 'ติ๊กปัญหาแล้ว — ซ่อนจากเว็บ');
    } catch (e) {
      setError(String((e as Error).message));
    }
  }

  // กรองรายการตามค้นหา + toggle "เฉพาะมีปัญหา" (หมวดจัดการตอน render)
  const q = search.trim().toLowerCase();
  const matchesFilter = (p: AdminProduct) => {
    if (flaggedOnly && !p.needsFix) return false;
    if (genderFilter !== 'all' && p.gender !== genderFilter) return false;
    if (dateFilter && toLocalYMD(p.createdAt) !== dateFilter) return false;
    if (!q) return true;
    return [p.name, p.group, p.colorName].some((s) => (s || '').toLowerCase().includes(q));
  };
  const flaggedCount = products.filter((p) => p.needsFix).length;
  const shownCats = catFilter === 'all' ? CATEGORIES : [catFilter];

  const inputCls =
    'w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900';

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900">
      {cropping && form.previewUrl && (
        <CropBox
          src={form.previewUrl}
          onCancel={() => setCropping(false)}
          onApply={(dataUrl) => {
            setForm((f) => ({ ...f, imageBase64: dataUrl, previewUrl: dataUrl }));
            setCropping(false);
          }}
        />
      )}
      <div className="mx-auto max-w-5xl px-4 py-8">
        <header className="mb-6 flex items-baseline justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight">DOOD · แอดมิน</h1>
            <p className="mt-1 text-sm text-neutral-500">จัดการสินค้าในตู้เสื้อผ้า</p>
          </div>
          <a href="/" className="text-sm text-neutral-500 underline hover:text-neutral-900">
            ← กลับหน้าแอป
          </a>
        </header>

        {notice && (
          <div className="mb-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white">{notice}</div>
        )}

        {/* แท็บสลับมุมมอง: สินค้า | ลุคแนะนำ */}
        <div className="mb-6 inline-flex gap-1 rounded-full bg-white p-1 shadow-sm ring-1 ring-black/5">
          {(['products', 'looks'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                view === v ? 'bg-brand-blue text-white' : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              {v === 'products' ? 'สินค้า' : '✨ ลุคแนะนำ'}
            </button>
          ))}
        </div>

        {view === 'looks' && <CuratedLooks products={products} onNotice={setNotice} />}

        <div
          className={`grid gap-6 lg:grid-cols-[minmax(0,340px)_1fr] ${
            view !== 'products' ? 'hidden' : ''
          }`}
        >
          {/* ── ฟอร์มเพิ่ม/แก้ไข ── */}
          <div
            ref={formTopRef}
            className="self-start rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 lg:sticky lg:top-8 lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold">{isEditing ? 'แก้ไขสินค้า' : 'เพิ่มสินค้าใหม่'}</h2>
              {isEditing && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-neutral-500 underline"
                >
                  ยกเลิกการแก้ไข
                </button>
              )}
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              {/* 1. ไฟล์รูป */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-neutral-600">
                  1. รูปสินค้า{' '}
                  <span className="font-normal text-neutral-400">
                    (มีพื้นหลังก็ได้ ระบบตัดให้)
                  </span>
                  {isEditing && <span className="font-normal"> · เว้นไว้ = ใช้รูปเดิม</span>}
                </label>
                <div
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    onPickFile(e.dataTransfer.files[0]);
                  }}
                  className="flex aspect-square w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-50 hover:border-neutral-400"
                  style={{
                    backgroundImage:
                      'linear-gradient(45deg,#eee 25%,transparent 25%),linear-gradient(-45deg,#eee 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#eee 75%),linear-gradient(-45deg,transparent 75%,#eee 75%)',
                    backgroundSize: '16px 16px',
                    backgroundPosition: '0 0,0 8px,8px -8px,-8px 0',
                  }}
                >
                  {form.previewUrl ? (
                    <img
                      src={form.previewUrl}
                      alt="preview"
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <span className="px-3 text-center text-xs text-neutral-400">
                      แตะเพื่อเลือก หรือ ลากไฟล์มาวาง
                      <br />
                      PNG พื้นหลังโปร่ง
                    </span>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".png,.webp,.jpg,.jpeg,image/png,image/webp,image/jpeg"
                  className="hidden"
                  onChange={(e) => onPickFile(e.target.files?.[0])}
                />
                <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-neutral-600">
                  <input
                    type="checkbox"
                    checked={form.removeBg}
                    onChange={(e) => setForm((f) => ({ ...f, removeBg: e.target.checked }))}
                    className="h-4 w-4 rounded border-neutral-300"
                  />
                  ตัดพื้นหลังให้อัตโนมัติ{' '}
                  <span className="text-neutral-400">(รูปโปร่งอยู่แล้วจะข้ามให้เอง)</span>
                </label>
                {form.previewUrl && (
                  <button
                    type="button"
                    onClick={() => setCropping(true)}
                    className="mt-2 w-full rounded-lg border border-neutral-300 py-2 text-xs font-semibold text-neutral-700 hover:border-neutral-400"
                  >
                    ✂️ ครอบตัดรูป (ตัดตัวอักษร/ลายน้ำออก)
                  </button>
                )}
              </div>

              {/* พรีวิวบนมาสคอต + เส้นปะไกด์ไลน์ + ปรับขนาด (โผล่เมื่อมีรูป) */}
              {form.previewUrl && (
                <div>
                  <label className="mb-1 block text-xs font-semibold text-neutral-600">
                    พรีวิวบนมาสคอต{' '}
                    <span className="font-normal text-neutral-400">
                      (เส้นปะ = ไกด์ไลน์ · ชิ้นอื่นจาง ๆ ไว้เทียบ)
                    </span>
                  </label>
                  <FittingPreview
                    category={form.category}
                    editing={editingGarment}
                    references={references}
                  />
                  <div className="mt-2 flex items-center gap-2">
                    <span className="whitespace-nowrap text-xs font-semibold text-neutral-600">
                      ขนาด
                    </span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={30}
                      max={200}
                      value={scalePct}
                      onChange={(e) => {
                        setScalePct(e.target.value);
                        const v = Number(e.target.value);
                        if (e.target.value !== '' && Number.isFinite(v)) {
                          setForm((f) => ({ ...f, scale: Math.min(2, Math.max(0.3, v / 100)) }));
                        }
                      }}
                      onBlur={() => setScalePct(String(Math.round(form.scale * 100)))}
                      className="w-16 rounded-lg border border-neutral-300 px-2 py-1 text-center text-sm outline-none focus:border-neutral-900"
                    />
                    <span className="text-xs text-neutral-500">%</span>
                    <input
                      type="range"
                      min={0.5}
                      max={1.3}
                      step={0.02}
                      value={form.scale}
                      onChange={(e) => {
                        const s = Number(e.target.value);
                        setForm((f) => ({ ...f, scale: s }));
                        setScalePct(String(Math.round(s * 100)));
                      }}
                      className="flex-1 accent-neutral-900"
                    />
                    {form.scale !== 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setForm((f) => ({ ...f, scale: 1 }));
                          setScalePct('100');
                        }}
                        className="whitespace-nowrap text-xs text-neutral-500 underline"
                      >
                        รีเซ็ต
                      </button>
                    )}
                  </div>
                  {groupSiblings.length > 0 && (
                    <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-neutral-700">
                      <input
                        type="checkbox"
                        checked={applyToGroup}
                        onChange={(e) => setApplyToGroup(e.target.checked)}
                        className="h-4 w-4 rounded border-neutral-300"
                      />
                      ใช้ขนาดนี้กับ
                      <span className="font-semibold">ทั้งกลุ่ม “{form.group.trim()}”</span>
                      <span className="text-neutral-400">({groupSiblings.length + 1} ชิ้น)</span>
                    </label>
                  )}
                </div>
              )}

              {/* 2. ประเภท */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-neutral-600">
                  2. ประเภทสินค้า
                </label>
                <select
                  className={inputCls}
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as Category }))}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_LABEL[c]}
                    </option>
                  ))}
                </select>
              </div>

              {/* ทรง — เฉพาะท่อนล่าง (กางเกง/กระโปรง/ขาสั้น) */}
              {form.category === 'pants' && (
                <div>
                  <label className="mb-1 block text-xs font-semibold text-neutral-600">
                    ทรง <span className="font-normal text-neutral-400">(กางเกงยาว / กระโปรง-ขาสั้น)</span>
                  </label>
                  <select
                    className={inputCls}
                    value={form.fit}
                    onChange={(e) => setForm((f) => ({ ...f, fit: e.target.value as Fit | 'auto' }))}
                  >
                    <option value="auto">อัตโนมัติ (เดาจากรูป)</option>
                    <option value="long">{FIT_LABEL.long} — กางเกงขายาว</option>
                    <option value="short">{FIT_LABEL.short} — กระโปรง/ขาสั้น</option>
                  </select>
                </div>
              )}

              {/* เพศ */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-neutral-600">เพศ</label>
                <select
                  className={inputCls}
                  value={form.gender}
                  onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value as Gender }))}
                >
                  {(['unisex', 'male', 'female'] as Gender[]).map((g) => (
                    <option key={g} value={g}>
                      {GENDER_LABEL[g]}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. ชื่อ */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-neutral-600">
                  3. ชื่อสินค้า
                </label>
                <input
                  className={inputCls}
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="เช่น เสื้อเชิ้ตลินินขาว"
                />
              </div>

              {/* 4. ราคา */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-neutral-600">
                  4. ราคา (บาท)
                </label>
                <input
                  className={inputCls}
                  type="number"
                  min={0}
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  placeholder="590"
                />
              </div>

              {/* 5. ลิงก์สั่งซื้อ (ไม่บังคับ) */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-neutral-600">
                  5. ลิงก์สั่งซื้อ <span className="font-normal text-neutral-400">(ไม่บังคับ)</span>
                </label>
                <input
                  className={inputCls}
                  type="url"
                  value={form.buyUrl}
                  onChange={(e) => setForm((f) => ({ ...f, buyUrl: e.target.value }))}
                  placeholder="https://..."
                />
              </div>

              {/* 6. สไตล์ */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-neutral-600">
                  6. สไตล์
                </label>
                <select
                  className={inputCls}
                  value={form.style}
                  onChange={(e) => setForm((f) => ({ ...f, style: e.target.value }))}
                >
                  <option value="">— ไม่ระบุ —</option>
                  {STYLES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 7. กลุ่มสี — สินค้าตัวเดียวกันหลายสีใส่ "กลุ่ม" เดียวกัน → หน้าแอปจะรวมเป็นแทบเลือกสี */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-neutral-600">
                  7. กลุ่มสี{' '}
                  <span className="font-normal text-neutral-400">
                    (ไม่บังคับ · ตัวเดียวกันคนละสีใส่กลุ่มเดียวกัน)
                  </span>
                </label>
                <div className="flex gap-2">
                  <input
                    className={inputCls}
                    value={form.group}
                    onChange={(e) => setForm((f) => ({ ...f, group: e.target.value }))}
                    placeholder="กลุ่ม เช่น tee-basic"
                  />
                  <input
                    className={inputCls}
                    value={form.colorName}
                    onChange={(e) => setForm((f) => ({ ...f, colorName: e.target.value }))}
                    placeholder="ชื่อสี เช่น ครีม"
                  />
                </div>
              </div>

              {error && (
                <div className="whitespace-pre-line rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-neutral-900 py-3 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-50"
              >
                {submitting ? 'กำลังบันทึก…' : isEditing ? 'บันทึกการแก้ไข' : 'เพิ่มสินค้า'}
              </button>
            </form>
          </div>

          {/* ── รายการสินค้า ── */}
          <div>
            {/* แถบเครื่องมือ: ค้นหา + กรองหมวด + เฉพาะที่มีปัญหา */}
            <div className="mb-4 space-y-2">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="🔍 ค้นหาชื่อสินค้า / กลุ่ม / สี"
                className={inputCls}
              />
              <div className="flex flex-wrap items-center gap-1.5">
                {(['all', ...CATEGORIES] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCatFilter(c)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      catFilter === c
                        ? 'bg-neutral-900 text-white'
                        : 'bg-white text-neutral-600 ring-1 ring-neutral-200 hover:bg-neutral-100'
                    }`}
                  >
                    {c === 'all' ? 'ทั้งหมด' : CATEGORY_LABEL[c]}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setFlaggedOnly((v) => !v)}
                  className={`ml-auto rounded-full px-3 py-1 text-xs font-semibold ${
                    flaggedOnly
                      ? 'bg-red-600 text-white'
                      : 'bg-white text-red-600 ring-1 ring-red-200 hover:bg-red-50'
                  }`}
                >
                  🚩 เฉพาะมีปัญหา{flaggedCount ? ` (${flaggedCount})` : ''}
                </button>
              </div>
              {/* เลือกเพศ */}
              <div className="flex flex-wrap items-center gap-1.5">
                {(['all', 'female', 'male', 'unisex'] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGenderFilter(g)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      genderFilter === g
                        ? 'bg-neutral-900 text-white'
                        : 'bg-white text-neutral-600 ring-1 ring-neutral-200 hover:bg-neutral-100'
                    }`}
                  >
                    {g === 'all' ? 'ทั้งหมด' : GENDER_LABEL[g]}
                  </button>
                ))}
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="ml-auto rounded-full border border-neutral-200 px-3 py-1 text-xs text-neutral-600 outline-none focus:border-neutral-900"
                />
                {dateFilter && (
                  <button
                    type="button"
                    onClick={() => setDateFilter('')}
                    className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-500 hover:bg-neutral-200"
                  >
                    ล้างวันที่ ✕
                  </button>
                )}
              </div>
            </div>
            {loading ? (
              <p className="text-sm text-neutral-400">กำลังโหลด…</p>
            ) : (
              shownCats.map((cat) => {
                const list = products.filter((p) => p.category === cat && matchesFilter(p));
                return (
                  <section key={cat} className="mb-6">
                    <h3 className="mb-2 text-sm font-bold text-neutral-700">
                      {CATEGORY_LABEL[cat]}{' '}
                      <span className="font-normal text-neutral-400">({list.length})</span>
                    </h3>
                    {list.length === 0 ? (
                      <p className="text-xs text-neutral-400">ยังไม่มีสินค้าในหมวดนี้</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {list.map((p) => (
                          <div
                            key={p.id}
                            className={`relative overflow-hidden rounded-xl bg-white shadow-sm ring-1 ${
                              p.needsFix ? 'ring-2 ring-red-400' : 'ring-black/5'
                            }`}
                          >
                            {p.needsFix && (
                              <span className="absolute left-1.5 top-1.5 z-10 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                🚩 มีปัญหา
                              </span>
                            )}
                            <div
                              className="aspect-square w-full"
                              style={{
                                backgroundImage: p.image ? `url(${assetUrl(p.image)})` : undefined,
                                backgroundColor: GARMENT_TILE_BG,
                                backgroundSize: 'contain',
                                backgroundPosition: 'center',
                                backgroundRepeat: 'no-repeat',
                              }}
                            />
                            <div className="p-2">
                              <p className="truncate text-xs font-semibold" title={p.name}>
                                {p.name}
                              </p>
                              <p className="text-xs text-neutral-500">฿{p.price}</p>
                              {p.createdAt && (
                                <p className="text-[10px] text-neutral-400">{fmtDate(p.createdAt)}</p>
                              )}
                              <div className="mt-1 flex flex-wrap items-center gap-1">
                                {p.gender && p.gender !== 'unisex' && (
                                  <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-600">
                                    {GENDER_LABEL[p.gender]}
                                  </span>
                                )}
                                {p.fit === 'short' && (
                                  <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-600">
                                    ทรง{FIT_LABEL.short}
                                  </span>
                                )}
                                {p.scale && p.scale !== 1 && (
                                  <span className="rounded bg-purple-50 px-1.5 py-0.5 text-[10px] text-purple-600">
                                    {Math.round(p.scale * 100)}%
                                  </span>
                                )}
                                {p.group && (
                                  <span className="rounded bg-pink-50 px-1.5 py-0.5 text-[10px] text-pink-600">
                                    {p.group}
                                    {p.colorName ? ` · ${p.colorName}` : ''}
                                  </span>
                                )}
                                {p.style && (
                                  <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-600">
                                    {styleLabel(p.style)}
                                  </span>
                                )}
                                {p.buyUrl && (
                                  <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] text-emerald-600">
                                    🔗 ลิงก์
                                  </span>
                                )}
                              </div>
                              <div className="mt-2 flex gap-1">
                                <button
                                  type="button"
                                  onClick={() => startEdit(p)}
                                  className="flex-1 rounded-md bg-neutral-100 py-1 text-[11px] font-semibold hover:bg-neutral-200"
                                >
                                  แก้ไข
                                </button>
                                <button
                                  type="button"
                                  onClick={() => toggleFix(p)}
                                  title={p.needsFix ? 'ปลดปัญหา (กลับขึ้นเว็บ)' : 'ติ๊กว่ามีปัญหา (ซ่อนจากเว็บ)'}
                                  className={`rounded-md px-2 py-1 text-[11px] font-semibold ${
                                    p.needsFix
                                      ? 'bg-red-600 text-white hover:bg-red-700'
                                      : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                                  }`}
                                >
                                  🚩
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onDelete(p)}
                                  className="rounded-md bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-100"
                                >
                                  ลบ
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
