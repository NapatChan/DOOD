import { useEffect, useMemo, useState } from 'react';
import {
  CATEGORIES,
  GARMENT_ORIGIN,
  LAYER_GROW,
  onBodyBackground,
  onBodyTransform,
  type Category,
  type Gender,
} from '../types';
import {
  type AdminProduct,
  type CuratedLook,
  listCuratedLooks,
  createCuratedLook,
  updateCuratedLook,
  deleteCuratedLook,
} from './api';

const CAT_LABEL: Record<Category, string> = { hat: 'หมวก', top: 'เสื้อ', pants: 'กางเกง' };
const emptyByCat = (): Record<Category, string> => ({ hat: '', top: '', pants: '' });

const GENDER_OPTS: { value: Gender; label: string }[] = [
  { value: 'unisex', label: 'ทุกเพศ' },
  { value: 'female', label: 'หญิง' },
  { value: 'male', label: 'ชาย' },
];
const GENDER_LABEL: Record<Gender, string> = { unisex: 'ทุกเพศ', female: 'หญิง', male: 'ชาย' };

// หน้าจัด "ลุคแนะนำ" — เลือกสินค้าแต่ละหมวดประกอบเป็นลุค แล้วเซฟลง DB
// ลูกค้าจะเจอลุคเหล่านี้ตอนเปิดแอป + ปุ่ม "✨ ลุคแนะนำ"
export default function CuratedLooks({
  products,
  onNotice,
}: {
  products: AdminProduct[];
  onNotice: (msg: string) => void;
}) {
  const [looks, setLooks] = useState<CuratedLook[]>([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState('');
  const [pick, setPick] = useState<Record<Category, string>>(emptyByCat);
  const [q, setQ] = useState<Record<Category, string>>(emptyByCat); // ค้นหาต่อหมวด
  const [gender, setGender] = useState<Gender>('unisex'); // เพศของลุค
  const [genderManual, setGenderManual] = useState(false); // แอดมินแก้เพศเองแล้ว → เลิก auto
  const [editingId, setEditingId] = useState<string | null>(null); // แก้ไขลุคไหนอยู่ (null = สร้างใหม่)
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const byCat = useMemo(() => {
    const m: Record<Category, AdminProduct[]> = { hat: [], top: [], pants: [] };
    for (const p of products) m[p.category]?.push(p);
    return m;
  }, [products]);

  const byId = useMemo(() => {
    const m = new Map<string, AdminProduct>();
    for (const p of products) m.set(p.id, p);
    return m;
  }, [products]);

  // เดาเพศลุคจากชิ้นที่เลือก: female ล้วน→female · male ล้วน→male · ปน/unisex→unisex
  const suggestedGender = useMemo<Gender>(() => {
    const gs = CATEGORIES.map((c) => (pick[c] ? byId.get(pick[c])?.gender : undefined)).filter(
      (g): g is Gender => g === 'male' || g === 'female',
    );
    const hasF = gs.includes('female');
    const hasM = gs.includes('male');
    if (hasF && !hasM) return 'female';
    if (hasM && !hasF) return 'male';
    return 'unisex';
  }, [pick, byId]);

  // auto เซ็ตเพศตามชิ้น จนกว่าแอดมินจะเลือกเอง
  useEffect(() => {
    if (!genderManual) setGender(suggestedGender);
  }, [suggestedGender, genderManual]);

  useEffect(() => {
    listCuratedLooks()
      .then(setLooks)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const hasPick = CATEGORIES.some((c) => pick[c]);

  function resetForm() {
    setLabel('');
    setPick(emptyByCat());
    setQ(emptyByCat());
    setGender('unisex');
    setGenderManual(false);
    setEditingId(null);
    setError(null);
  }

  function startEdit(look: CuratedLook) {
    setEditingId(look.id);
    setLabel(look.label);
    setPick({ hat: look.hatId || '', top: look.topId || '', pants: look.pantsId || '' });
    setQ(emptyByCat());
    setGender(look.gender);
    setGenderManual(true); // ใช้ค่าที่บันทึกไว้ ไม่ให้ auto ทับ
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' }); // มือถือ: ฟอร์มอยู่บนสุด
  }

  async function onSave() {
    if (!hasPick) return;
    setBusy(true);
    setError(null);
    const input = {
      label: label.trim(),
      hatId: pick.hat || null,
      topId: pick.top || null,
      pantsId: pick.pants || null,
      gender,
    };
    try {
      if (editingId) {
        const updated = await updateCuratedLook(editingId, input);
        setLooks((ls) => ls.map((l) => (l.id === editingId ? updated : l)));
        onNotice('แก้ไขลุคแล้ว ✓');
      } else {
        const look = await createCuratedLook(input);
        setLooks((ls) => [...ls, look]);
        onNotice('เพิ่มลุคแนะนำแล้ว ✨');
      }
      resetForm();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(look: CuratedLook) {
    const updated = await updateCuratedLook(look.id, { isActive: !look.isActive });
    setLooks((ls) => ls.map((l) => (l.id === look.id ? updated : l)));
  }

  async function remove(look: CuratedLook) {
    if (!confirm('ลบลุคแนะนำนี้?')) return;
    if (editingId === look.id) resetForm();
    await deleteCuratedLook(look.id);
    setLooks((ls) => ls.filter((l) => l.id !== look.id));
  }

  // ตัวเลือกใน dropdown ของหมวด — กรองด้วยคำค้น + คงชิ้นที่เลือกไว้เสมอ (กัน select ว่าง)
  function optionsFor(cat: Category): AdminProduct[] {
    const query = q[cat].trim().toLowerCase();
    let opts = byCat[cat];
    if (query) {
      opts = opts.filter((p) =>
        `${p.name} ${p.colorName || ''}`.toLowerCase().includes(query),
      );
    }
    if (pick[cat] && !opts.some((p) => p.id === pick[cat])) {
      const chosen = byId.get(pick[cat]);
      if (chosen) opts = [chosen, ...opts];
    }
    return opts;
  }

  const selectCls =
    'w-full rounded-lg border border-neutral-300 px-2 py-2 text-sm outline-none focus:border-neutral-900';

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_1fr]">
      {/* ── ฟอร์มสร้าง/แก้ไขลุค ── */}
      <div className="self-start rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 lg:sticky lg:top-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold">{editingId ? 'แก้ไขลุคแนะนำ' : 'สร้างลุคแนะนำ'}</h2>
          {editingId && (
            <button type="button" onClick={resetForm} className="text-xs text-neutral-500 underline">
              ยกเลิกการแก้ไข
            </button>
          )}
        </div>
        <div className="space-y-4">
          {/* พรีวิวลุคสด — ใช้ logic เดียวกับที่โชว์บนเว็บจริง (สัดส่วน/ทรง/scale ตรงกัน) */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-600">พรีวิวลุค</label>
            <div className="relative mx-auto flex h-80 w-full max-w-[220px] flex-col items-center rounded-xl bg-neutral-100 px-4 py-4 ring-1 ring-black/5">
              {CATEGORIES.every((c) => !pick[c]) ? (
                <div className="flex flex-1 items-center justify-center">
                  <span className="text-sm text-neutral-400">เลือกสินค้าด้านล่างเพื่อดูพรีวิว</span>
                </div>
              ) : (
                CATEGORIES.filter((c) => pick[c]).map((cat) => {
                  const it = byId.get(pick[cat]);
                  if (!it) return null;
                  const bg = it.image ? onBodyBackground(cat, it.fit, it.aspect) : null;
                  return (
                    <div
                      key={cat}
                      className="min-h-0 w-full shrink basis-0"
                      style={{
                        flexGrow: LAYER_GROW[cat],
                        backgroundColor: it.image ? undefined : it.color,
                        backgroundImage: it.image ? `url(${it.image})` : undefined,
                        backgroundSize: bg ? bg.size : 'cover',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: bg ? bg.position : 'center',
                        transform: onBodyTransform(it.scale, it.offsetX, it.offsetY),
                        transformOrigin: GARMENT_ORIGIN[cat],
                      }}
                    />
                  );
                })
              )}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-600">
              ชื่อ/ธีม <span className="font-normal text-neutral-400">(ไม่ใส่ก็ได้)</span>
            </label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="เช่น สายมินิมอล, Y2K, ไปทะเล"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
            />
          </div>

          {/* เพศของลุค — auto เดาจากชิ้น แต่แก้ได้ · ใช้จับคู่ตัวกรองฝั่งลูกค้า */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-600">
              เพศ{' '}
              <span className="font-normal text-neutral-400">
                {genderManual ? '(เลือกเอง)' : '(เดาจากชิ้น · แก้ได้)'}
              </span>
            </label>
            <div className="flex gap-1 rounded-lg bg-neutral-100 p-1">
              {GENDER_OPTS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => {
                    setGender(o.value);
                    setGenderManual(true);
                  }}
                  className={`flex-1 rounded-md py-1.5 text-sm font-semibold transition ${
                    gender === o.value ? 'bg-white text-brand-blue shadow-sm' : 'text-neutral-500'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {CATEGORIES.map((cat) => {
            const chosen = pick[cat] ? byId.get(pick[cat]) : null;
            const opts = optionsFor(cat);
            return (
              <div key={cat}>
                <label className="mb-1 block text-xs font-semibold text-neutral-600">
                  {CAT_LABEL[cat]}
                </label>
                {/* ค้นหาสินค้าในหมวดนี้ */}
                <input
                  value={q[cat]}
                  onChange={(e) => setQ((s) => ({ ...s, [cat]: e.target.value }))}
                  placeholder={`🔍 ค้นหา${CAT_LABEL[cat]} (ชื่อ/สี)`}
                  className="mb-2 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-sm outline-none focus:border-neutral-900"
                />
                <div className="flex items-center gap-2">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-neutral-100 ring-1 ring-black/5">
                    {chosen ? (
                      <img src={chosen.image} alt="" className="h-full w-full object-contain" />
                    ) : (
                      <span className="text-[10px] text-neutral-400">ไม่ใส่</span>
                    )}
                  </div>
                  <select
                    value={pick[cat]}
                    onChange={(e) => setPick((p) => ({ ...p, [cat]: e.target.value }))}
                    className={selectCls}
                  >
                    <option value="">— ไม่ใส่ —</option>
                    {opts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                        {p.colorName ? ` · ${p.colorName}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                {q[cat].trim() && (
                  <p className="mt-1 text-[11px] text-neutral-400">พบ {opts.length} รายการ</p>
                )}
              </div>
            );
          })}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="button"
            onClick={onSave}
            disabled={!hasPick || busy}
            className="w-full rounded-xl bg-brand-blue py-3 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-50"
          >
            {busy ? 'กำลังบันทึก…' : editingId ? 'บันทึกการแก้ไข' : 'เพิ่มลุคแนะนำ'}
          </button>
        </div>
      </div>

      {/* ── รายการลุคที่มี ── */}
      <div>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-bold">ลุคแนะนำทั้งหมด</h2>
          <span className="text-sm text-neutral-500">{looks.length} ลุค</span>
        </div>

        {loading ? (
          <p className="text-sm text-neutral-400">กำลังโหลด…</p>
        ) : looks.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center ring-1 ring-black/5">
            <p className="font-bold text-neutral-700">ยังไม่มีลุคแนะนำ</p>
            <p className="mt-1 text-sm text-neutral-400">เลือกสินค้าทางซ้ายแล้วกด “เพิ่มลุคแนะนำ”</p>
          </div>
        ) : (
          <div className="space-y-3">
            {looks.map((look) => (
              <div
                key={look.id}
                className={`flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ${
                  editingId === look.id
                    ? 'ring-2 ring-brand-blue'
                    : look.isActive
                      ? 'ring-black/5'
                      : 'opacity-60 ring-neutral-200'
                }`}
              >
                <div className="flex gap-2">
                  {(['hat', 'top', 'pants'] as Category[]).map((cat) => {
                    const id = { hat: look.hatId, top: look.topId, pants: look.pantsId }[cat];
                    const p = id ? byId.get(id) : null;
                    return (
                      <div
                        key={cat}
                        className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg bg-neutral-100 ring-1 ring-black/5"
                        title={p?.name || 'ไม่ใส่'}
                      >
                        {p ? (
                          <img src={p.image} alt="" className="h-full w-full object-contain" />
                        ) : id ? (
                          <span className="text-[10px] text-red-400">หาย</span>
                        ) : (
                          <span className="text-[10px] text-neutral-300">—</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {look.label || 'ลุคไม่มีชื่อ'}
                    <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 align-middle text-[11px] font-medium text-neutral-500">
                      {GENDER_LABEL[look.gender]}
                    </span>
                  </p>
                  {!look.isActive && <p className="text-xs text-neutral-400">ปิดอยู่ (ไม่โชว์ลูกค้า)</p>}
                </div>

                <button
                  type="button"
                  onClick={() => startEdit(look)}
                  className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-brand-blue hover:bg-blue-100"
                >
                  แก้ไข
                </button>
                <button
                  type="button"
                  onClick={() => toggleActive(look)}
                  className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-200"
                >
                  {look.isActive ? 'ปิด' : 'เปิด'}
                </button>
                <button
                  type="button"
                  onClick={() => remove(look)}
                  className="rounded-full bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-200"
                >
                  ลบ
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
