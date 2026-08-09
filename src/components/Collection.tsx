import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { SavedLook } from '../data/savedLooksStore';
import { buyLinkFor, hasRealLink } from '../lib/links';
import { styleLabel } from '../config/styles';
import {
  CATEGORIES,
  CATEGORY_LABEL,
  GARMENT_TILE_BG,
  type Category,
  type ClothingItem,
} from '../types';
import { EyeOffIcon } from './icons';

interface CollectionProps {
  open: boolean;
  onClose: () => void;
  looks: SavedLook[];
  itemsById: Record<string, ClothingItem>;
  onRemove: (id: string) => void;
  onApply: (items: Record<Category, string>, hidden: Record<Category, boolean>) => void;
  authEnabled: boolean;
  isLoggedIn: boolean;
  email: string | null;
  onLogin: () => void;
  onLogout: () => void;
}

const formatBaht = (n: number) => `฿${n.toLocaleString('th-TH')}`;

// รูปย่อสินค้า — พื้นขาวหม่นคงที่ให้สินค้าทุกสีเด่นชัด
// hidden = ชั้นที่ไม่ใส่ (โชว์ไอคอนตาปิด) · item undefined = สินค้าถูกลบ
function Thumb({ item, size, hidden }: { item?: ClothingItem; size: number; hidden?: boolean }) {
  if (hidden) {
    return (
      <div
        className="flex shrink-0 items-center justify-center rounded-lg text-neutral-300 ring-1 ring-black/5"
        style={{ width: size, height: size, backgroundColor: GARMENT_TILE_BG }}
      >
        <EyeOffIcon size={Math.round(size * 0.42)} />
      </div>
    );
  }
  return (
    <div
      className="shrink-0 overflow-hidden rounded-lg ring-1 ring-black/5"
      style={{
        width: size,
        height: size,
        backgroundColor: GARMENT_TILE_BG,
        backgroundImage: item?.imageUrl ? `url(${item.imageUrl})` : undefined,
        backgroundSize: 'contain',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    />
  );
}

function LookCard({
  look,
  itemsById,
  onRemove,
  onApply,
}: {
  look: SavedLook;
  itemsById: Record<string, ClothingItem>;
  onRemove: (id: string) => void;
  onApply: (items: Record<Category, string>, hidden: Record<Category, boolean>) => void;
}) {
  const [open, setOpen] = useState(false);
  const resolved = CATEGORIES.map((cat) => ({
    cat,
    item: itemsById[look.items[cat]],
    hidden: look.hidden[cat],
  }));
  const total = resolved.reduce((sum, r) => sum + (r.hidden ? 0 : (r.item?.price ?? 0)), 0);
  const missing = resolved.some((r) => !r.hidden && !r.item);

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
      {/* หัวการ์ด: แตะ = ใส่ลุค / chevron = ดูรายละเอียด+ลิงก์ / 🗑 = ลบ */}
      <div className="flex items-center gap-2 p-3">
        <button
          type="button"
          onClick={() => onApply(look.items, look.hidden)}
          className="flex flex-1 items-center gap-3 text-left"
        >
          <div className="flex gap-1.5">
            {resolved.map((r) => (
              <Thumb key={r.cat} item={r.item} hidden={r.hidden} size={44} />
            ))}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black tabular-nums text-neutral-900">{formatBaht(total)}</p>
            <p className="text-[11px] text-neutral-400">
              {missing ? 'มีชิ้นที่ไม่มีแล้ว · ' : ''}
              แตะเพื่อใส่ลุคนี้
            </p>
          </div>
        </button>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'ย่อรายละเอียด' : 'ดูรายละเอียด'}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-neutral-400 transition hover:bg-neutral-100"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            className="transition-transform"
            style={{ transform: open ? 'rotate(180deg)' : 'none' }}
          >
            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => onRemove(look.id)}
          aria-label="ลบลุคนี้"
          className="shrink-0 rounded-full px-2 py-1 text-neutral-400 transition hover:bg-red-50 hover:text-red-500"
        >
          🗑
        </button>
      </div>

      {/* รายละเอียด 3 ชิ้น + ลิงก์ซื้อ */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-1 border-t border-neutral-100 p-3">
              {resolved.map(({ cat, item, hidden }) =>
                hidden ? (
                  <div key={cat} className="flex items-center gap-3 rounded-xl p-2 opacity-70">
                    <Thumb hidden size={40} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-neutral-500">ไม่ใส่{CATEGORY_LABEL[cat]}</p>
                    </div>
                  </div>
                ) : item ? (
                  <a
                    key={cat}
                    href={buyLinkFor(item)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-neutral-50"
                  >
                    <Thumb item={item} size={40} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-neutral-800">{item.name}</p>
                      <p className="text-[11px] text-neutral-400">
                        {CATEGORY_LABEL[cat]}
                        {item.style ? ` · ${styleLabel(item.style)}` : ''} · {formatBaht(item.price)}
                      </p>
                    </div>
                    <span className="shrink-0 whitespace-nowrap rounded-full bg-brand-blue px-3 py-1.5 text-[11px] font-semibold text-white">
                      {hasRealLink(item) ? 'ดูร้านค้า ↗' : 'ค้นหา ↗'}
                    </span>
                  </a>
                ) : (
                  <div key={cat} className="flex items-center gap-3 rounded-xl p-2 opacity-60">
                    <Thumb size={40} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-neutral-500">ชิ้นนี้ไม่มีแล้ว</p>
                      <p className="text-[11px] text-neutral-400">{CATEGORY_LABEL[cat]}</p>
                    </div>
                  </div>
                ),
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// หน้าคอลเลกชัน "ลุคที่บันทึกไว้" — overlay เต็มจอ (ยึดหลักจบในหน้าเดียว ไม่เปลี่ยนหน้า)
export default function Collection({
  open,
  onClose,
  looks,
  itemsById,
  onRemove,
  onApply,
  authEnabled,
  isLoggedIn,
  email,
  onLogin,
  onLogout,
}: CollectionProps) {
  // ปิดด้วยปุ่ม Esc + ล็อกสกอลล์พื้นหลังตอนเปิด
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col bg-black/40 lg:items-center lg:justify-center lg:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="flex max-h-full w-full flex-1 flex-col bg-neutral-100 lg:max-w-lg lg:flex-none lg:rounded-3xl lg:shadow-2xl"
            style={{ maxHeight: '100%' }}
            initial={{ y: '4%', opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '4%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 38 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* หัวข้อ */}
            <div
              className="flex shrink-0 items-center justify-between px-5 pb-3 lg:pt-5"
              style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' }}
            >
              <div>
                <h2 className="text-lg font-black text-neutral-900">ลุคที่บันทึกไว้</h2>
                <p className="text-xs text-neutral-500">{looks.length} ลุค</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="ปิด"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-neutral-500 shadow-sm ring-1 ring-black/5 transition active:scale-90"
              >
                ✕
              </button>
            </div>

            {/* แถบล็อกอิน — เก็บลุคถาวร/ข้ามเครื่อง (ทางเลือก ไม่บังคับ) */}
            {authEnabled && (
              <div className="mx-5 mb-1 shrink-0">
                {isLoggedIn ? (
                  <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-2.5 text-sm ring-1 ring-emerald-100">
                    <span className="text-emerald-600">☁️</span>
                    <span className="min-w-0 flex-1 truncate text-emerald-800">
                      เก็บถาวรแล้ว · {email}
                    </span>
                    <button
                      type="button"
                      onClick={onLogout}
                      className="shrink-0 text-xs font-semibold text-emerald-700 underline"
                    >
                      ออกจากระบบ
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={onLogin}
                    className="flex w-full items-center gap-2 rounded-2xl bg-brand-blue px-4 py-2.5 text-left text-sm text-white transition active:scale-[0.99]"
                  >
                    <span>☁️</span>
                    <span className="flex-1 font-semibold">เข้าสู่ระบบเก็บลุคโปรด</span>
                    <span className="text-xs text-white/60">ไม่ให้หาย →</span>
                  </button>
                )}
              </div>
            )}

            {/* เนื้อหา */}
            <div className="flex-1 space-y-3 overflow-y-auto px-5 pb-4 pt-1">
              {looks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="text-5xl">🛍️</div>
                  <p className="mt-4 font-bold text-neutral-700">ยังไม่มีลุคที่บันทึก</p>
                  <p className="mt-1 text-sm text-neutral-400">
                    ปัดแต่งชุดที่ชอบ แล้วกด “อยากได้ลุคนี้ ✨”
                  </p>
                </div>
              ) : (
                looks.map((look) => (
                  <LookCard
                    key={look.id}
                    look={look}
                    itemsById={itemsById}
                    onRemove={onRemove}
                    onApply={onApply}
                  />
                ))
              )}
            </div>

            {/* ป้ายชี้แจง affiliate — โผล่เมื่อมีลุค (ที่มีลิงก์ซื้อ) */}
            {looks.length > 0 && (
              <div
                className="shrink-0 border-t border-neutral-200/70 px-5 py-3 text-center text-[11px] leading-relaxed text-neutral-400"
                style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}
              >
                ลิงก์ซื้อเป็นลิงก์พันธมิตร (affiliate)
                <br />
                DOOD อาจได้รับค่าคอมมิชชันเมื่อคุณกดซื้อ โดยคุณไม่ต้องจ่ายเพิ่ม
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
