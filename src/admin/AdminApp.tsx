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
import FittingPreview, { type PreviewGarment } from './FittingPreview';

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
  gender: 'unisex',
  fit: 'auto',
  scale: 1,
  aspect: undefined,
  imageBase64: null,
  previewUrl: null,
  removeBg: true,
};

export default function AdminApp() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const formTopRef = useRef<HTMLDivElement>(null);

  const isEditing = form.editingId !== null;

  // ชิ้นอ้างอิงหมวดอื่น (ตัวแรกของแต่ละหมวด ที่ไม่ใช่ชิ้นที่กำลังแก้) — ไว้เทียบสัดส่วนในพรีวิว
  const references = useMemo(() => {
    const map: Partial<Record<Category, PreviewGarment>> = {};
    for (const cat of CATEGORIES) {
      const ref = products.find((p) => p.category === cat && p.id !== form.editingId);
      if (ref)
        map[cat] = {
          imageUrl: `/src/assets/${ref.image}`,
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
      gender: p.gender || 'unisex',
      fit: p.fit || 'auto',
      scale: p.scale ?? 1,
      aspect: p.aspect,
      imageBase64: null,
      previewUrl: p.image ? `/src/assets/${p.image}` : null,
      removeBg: true,
    });
    setError(null);
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
          gender: form.gender,
          fit: form.fit,
          scale: form.scale,
          ...(form.imageBase64 ? { imageBase64: form.imageBase64, removeBg } : {}),
        });
        flash('บันทึกการแก้ไขแล้ว ✓');
      } else {
        await createProduct({
          category: form.category,
          name: form.name.trim(),
          price: priceNum,
          buyUrl: form.buyUrl.trim(),
          style: form.style,
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

  const inputCls =
    'w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900';

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900">
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

        <div className="grid gap-6 lg:grid-cols-[minmax(0,340px)_1fr]">
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
                      ขนาด {Math.round(form.scale * 100)}%
                    </span>
                    <input
                      type="range"
                      min={0.5}
                      max={1.3}
                      step={0.02}
                      value={form.scale}
                      onChange={(e) => setForm((f) => ({ ...f, scale: Number(e.target.value) }))}
                      className="flex-1 accent-neutral-900"
                    />
                    {form.scale !== 1 && (
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, scale: 1 }))}
                        className="whitespace-nowrap text-xs text-neutral-500 underline"
                      >
                        รีเซ็ต
                      </button>
                    )}
                  </div>
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
            {loading ? (
              <p className="text-sm text-neutral-400">กำลังโหลด…</p>
            ) : (
              CATEGORIES.map((cat) => {
                const list = products.filter((p) => p.category === cat);
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
                            className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/5"
                          >
                            <div
                              className="aspect-square w-full"
                              style={{
                                backgroundImage: p.image ? `url(/src/assets/${p.image})` : undefined,
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
