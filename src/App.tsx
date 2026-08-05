import { animate, motion, useMotionValue, type PanInfo } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import AuthModal from './components/AuthModal';
import Collection from './components/Collection';
import ColorSwatchPicker from './components/ColorSwatchPicker';
import GenderMenu from './components/GenderMenu';
import GenderTabs from './components/GenderTabs';
import InAppBrowserNotice from './components/InAppBrowserNotice';
import LayerSelector from './components/LayerSelector';
import LookBar from './components/LookBar';
import LookPreview from './components/LookPreview';
import Mascot from './components/Mascot';
import MobilePriceSheet from './components/MobilePriceSheet';
import NavArrow from './components/NavArrows';
import StageCaption from './components/StageCaption';
import Toast from './components/Toast';
import { useAuth } from './hooks/useAuth';
import { useSavedLooks } from './hooks/useSavedLooks';
import { useWardrobe } from './hooks/useWardrobe';
import { buildShareUrl, parseLookFromSearch } from './lib/lookUrl';
import { CATEGORIES, type Category } from './types';

// เกณฑ์ตัดสินว่า "ปัดสำเร็จ" — ระยะหรือความเร็วอย่างใดอย่างหนึ่งถึง
const OFFSET_THRESHOLD = 60; // px
const VELOCITY_THRESHOLD = 400; // px/s

export default function App() {
  const {
    loading,
    state,
    selectedItems,
    itemsById,
    totalPrice,
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
  } = useWardrobe();
  const selectedLayer = state.selectedLayer;
  const layerHidden = state.hidden[selectedLayer];

  // คอลเลกชันลุคที่บันทึกไว้
  const { looks, count, save, remove, isSaved } = useSavedLooks();
  const auth = useAuth();
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  // gesture ปัดแนวนอน "ทั่วทั้งจอ" — เลื่อนชั้นที่เลือกตามนิ้ว แล้วสลับชิ้นตอนปล่อย
  const dragX = useMotionValue(0);
  const [swipeDir, setSwipeDir] = useState(0);
  // จำว่า gesture นี้เป็น "การลาก" ไหม เพื่อกันไม่ให้ click ไปเลือกชั้นโดยไม่ตั้งใจ
  const didPanRef = useRef(false);

  // ลูกศรขยับสอนว่า "ปัดได้" — หยุดเมื่อผู้ใช้ปัดสำเร็จครั้งแรก หรือครบ 5 วิ
  const [showNudge, setShowNudge] = useState(true);
  useEffect(() => {
    const t = window.setTimeout(() => setShowNudge(false), 5000);
    return () => window.clearTimeout(t);
  }, []);

  // กดลิงก์ในเมล (magic link) กลับมา → session เปลี่ยนจาก null → มี → โชว์ toast + ปิด modal
  const prevLoggedInRef = useRef(auth.isLoggedIn);
  useEffect(() => {
    if (auth.isLoggedIn && !prevLoggedInRef.current) {
      showToast('เข้าสู่ระบบแล้ว ☁️ เก็บลุคโปรดไว้ให้แล้ว');
      setAuthOpen(false);
    }
    prevLoggedInRef.current = auth.isLoggedIn;
  }, [auth.isLoggedIn]);

  // เปิดลิงก์ที่เพื่อนแชร์มา (?l=...) → ใส่ลุคนั้นทันทีเมื่อสินค้าโหลดเสร็จ
  // หมายเหตุ: "เก็บ ?l= ไว้ใน URL" จนกว่าผู้ใช้จะเริ่มปัดเอง (ดู handlePan) —
  // ไม่งั้นถ้า in-app browser (LINE/เมล) กด "เปิดในเบราว์เซอร์" จะได้ URL เปล่า ลุคหาย
  const appliedSharedRef = useRef(false);
  useEffect(() => {
    if (loading || appliedSharedRef.current) return;
    appliedSharedRef.current = true;
    const parsed = parseLookFromSearch(window.location.search);
    if (parsed) applyLook(parsed.items, parsed.hidden);
  }, [loading, applyLook]);

  const handlePan = (_e: unknown, info: PanInfo) => {
    if (Math.abs(info.offset.x) > 8 || Math.abs(info.offset.y) > 8) {
      if (!didPanRef.current) {
        didPanRef.current = true;
        // ผู้ใช้เริ่มปัดเอง → ตอนนี้ค่อยล้าง ?l= (ก่อนหน้าเก็บไว้เผื่อ "เปิดในเบราว์เซอร์" พาลุคไปด้วย)
        if (window.location.search) window.history.replaceState(null, '', window.location.pathname);
      }
    }
    if (layerHidden) return; // ชั้นที่ไม่ใส่ ปัดไม่ได้
    // หน่วงนิดหน่อยให้รู้สึกมีแรงต้าน ไม่เลื่อนหลุดมือ
    dragX.set(info.offset.x * 0.6);
  };

  // แตะ (ไม่ใช่ลาก) เท่านั้นถึงจะเปลี่ยนชั้นที่เลือก
  const handleSelectLayer = (layer: Category) => {
    if (didPanRef.current) return;
    selectLayer(layer);
  };

  const handlePanEnd = (_e: unknown, info: PanInfo) => {
    const { offset, velocity } = info;
    const passedLeft = offset.x < -OFFSET_THRESHOLD || velocity.x < -VELOCITY_THRESHOLD;
    const passedRight = offset.x > OFFSET_THRESHOLD || velocity.x > VELOCITY_THRESHOLD;
    // แนวตั้งชัดเจน = ไม่ใช่การปัดเปลี่ยนชุด (ปล่อยให้ท่าลากขึ้นดูราคาทำงาน)
    const horizontal = Math.abs(offset.x) > Math.abs(offset.y);
    if (!layerHidden && horizontal) {
      if (passedLeft) {
        setSwipeDir(1);
        changeItem(1);
        setShowNudge(false);
      } else if (passedRight) {
        setSwipeDir(-1);
        changeItem(-1);
        setShowNudge(false);
      }
    }
    animate(dragX, 0, { type: 'spring', stiffness: 500, damping: 40, mass: 0.6 });
  };

  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  const showToast = (message: string) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2000);
  };

  // "อยากได้ลุคนี้" = บันทึกลุคที่สวมอยู่ลงคอลเลกชัน (กันบันทึกซ้ำ)
  // เช็คซ้ำแบบ sync ก่อน (save เป็น async ตอนล็อกอิน) เพื่อโชว์ toast ให้ถูก
  const handleWant = useCallback(() => {
    if (!selectedItems) return;
    const already = isSaved(selectedItems, state.hidden);
    void save(selectedItems, state.hidden);
    showToast(already ? 'ลุคนี้บันทึกไว้แล้ว ✓' : 'บันทึกลุคแล้ว 💛');
  }, [selectedItems, save, isSaved, state.hidden]);

  // แชร์ลุค — เข้ารหัสลุคใน URL แล้วเรียกเมนูแชร์ของเครื่อง (fallback = ก๊อปลิงก์)
  const handleShare = useCallback(async () => {
    if (!selectedItems) return;
    const idMap = CATEGORIES.reduce(
      (acc, c) => {
        acc[c] = selectedItems[c].id;
        return acc;
      },
      {} as Record<Category, string>,
    );
    const url = buildShareUrl(idMap, state.hidden);
    const shareData = { title: 'DOOD', text: 'ดูลุคที่ฉันจัดใน DOOD 👗✨', url };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        /* ผู้ใช้ยกเลิก — ไม่ต้องทำอะไร */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      showToast('ก๊อปลิงก์แล้ว 🔗 ส่งให้เพื่อนได้เลย');
    } catch {
      showToast('ก๊อปลิงก์ไม่สำเร็จ');
    }
  }, [selectedItems, state.hidden]);

  // ใส่ลุคจากคอลเลกชัน → โหลดขึ้นมาสคอต + ปิด overlay (ไม่มีป็อปอัพ ปิดเองก็รู้แล้ว)
  const handleApplyLook = useCallback(
    (lookItems: Record<Category, string>, lookHidden: Record<Category, boolean>) => {
      applyLook(lookItems, lookHidden);
      setCollectionOpen(false);
    },
    [applyLook],
  );

  // แถบราคาบนมือถือ: ซ่อนไว้ โผล่เมื่อลากขึ้น/แตะ แล้วอยู่ 3 วิก่อนหายไป
  const [priceVisible, setPriceVisible] = useState(false);
  const priceTimer = useRef<number | undefined>(undefined);

  const revealPrice = useCallback(() => {
    setPriceVisible(true);
    window.clearTimeout(priceTimer.current);
    priceTimer.current = window.setTimeout(() => setPriceVisible(false), 3000);
  }, []);

  const hidePrice = useCallback(() => {
    setPriceVisible(false);
    window.clearTimeout(priceTimer.current);
  }, []);

  const togglePrice = useCallback(() => {
    if (priceVisible) hidePrice();
    else revealPrice();
  }, [priceVisible, revealPrice, hidePrice]);

  useEffect(
    () => () => {
      window.clearTimeout(toastTimer.current);
      window.clearTimeout(priceTimer.current);
    },
    [],
  );

  // ตรวจการลากนิ้วแนวตั้ง: ลากขึ้น = โผล่ราคา, ลากลง = ซ่อน
  useEffect(() => {
    let sx = 0;
    let sy = 0;
    let st = 0;
    const onStart = (e: TouchEvent) => {
      const t = e.changedTouches[0];
      sx = t.clientX;
      sy = t.clientY;
      st = Date.now();
    };
    const onEnd = (e: TouchEvent) => {
      const t = e.changedTouches[0];
      const dx = t.clientX - sx;
      const dy = t.clientY - sy;
      const dt = Date.now() - st;
      const vertical = Math.abs(dy) > Math.abs(dx) * 1.5;
      if (!vertical || dt > 700) return;
      if (dy < -50) revealPrice();
      else if (dy > 50) hidePrice();
    };
    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchend', onEnd);
    };
  }, [revealPrice, hidePrice]);

  // คีย์บอร์ด: ซ้าย/ขวา = เปลี่ยนชิ้น, ขึ้น/ลง = สลับเลเยอร์
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          changeItem(-1);
          break;
        case 'ArrowRight':
          e.preventDefault();
          changeItem(1);
          break;
        case 'ArrowUp':
          e.preventDefault();
          cycleLayer(-1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          cycleLayer(1);
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [changeItem, cycleLayer]);

  // ระหว่างโหลดสินค้า (async — เผื่อวันสลับไปดึงจาก backend) แสดงหน้ารอสั้น ๆ
  if (loading || !selectedItems) {
    return (
      <div className="flex h-[100svh] w-full items-center justify-center bg-neutral-100">
        <div className="animate-pulse text-center">
          <h1 className="text-3xl font-black tracking-tight text-neutral-800">DOOD</h1>
          <p className="mt-2 text-sm text-neutral-400">กำลังโหลด…</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative mx-auto flex h-[100svh] w-full max-w-md flex-col items-center bg-neutral-100 md:max-w-lg lg:h-auto lg:min-h-[100dvh] lg:max-w-7xl lg:flex-row lg:items-center lg:justify-between lg:gap-12 lg:px-16 xl:px-24"
    >
      <InAppBrowserNotice />
      {/* แถบบน (มือถือ): แบรนด์ + tagline ซ้าย, ปุ่มสุ่มลุคขวา */}
      <header
        className="flex w-full shrink-0 items-center justify-between px-4 pb-2 lg:hidden"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' }}
      >
        <div>
          <h1 className="text-xl font-black leading-none tracking-tight text-neutral-900">DOOD</h1>
          <p className="mt-1 text-[11px] leading-none text-neutral-500">Make it your style</p>
        </div>
        <div className="flex items-center gap-2">
          <GenderMenu value={genderFilter} onChange={setGenderFilter} />
          <BagButton count={count} onClick={() => setCollectionOpen(true)} size={44} />
        </div>
      </header>

      {/* คอลัมน์เวที: มาสคอตเต็มจอ (เว้นล่างให้ขากางเกงพ้นแถบราคา handle บนมือถือ) */}
      <main className="flex w-full flex-1 flex-col items-center pb-[calc(env(safe-area-inset-bottom)+34px)] lg:w-auto lg:flex-none lg:justify-center lg:px-3 lg:pb-0">
        {/* เวทีทั้งจอ = พื้นที่รับ gesture ปัด (ปัดตรงไหนก็ได้) */}
        <motion.div
          onPointerDownCapture={() => {
            didPanRef.current = false;
          }}
          onPan={handlePan}
          onPanEnd={handlePanEnd}
          className="relative flex w-full flex-1 touch-none items-stretch justify-center lg:flex-none lg:items-center lg:gap-4"
        >
          {/* ปุ่มดูชุดเต็ม — ลอยมุมบนซ้ายของเวที (มือถือเท่านั้น; เดสก์ท็อปอยู่แถบคอนโทรล) */}
          <button
            type="button"
            onPointerDownCapture={(e) => e.stopPropagation()}
            onClick={() => setPreviewOpen(true)}
            aria-label="ดูชุดเต็ม"
            className="absolute left-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-neutral-700 shadow ring-1 ring-black/10 transition active:scale-90 lg:hidden"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {/* ลูกศร: desktop เท่านั้น — มือถือปัดตรงไหนก็ได้อยู่แล้ว */}
          <div className="hidden lg:static lg:block">
            <NavArrow direction="prev" disabled={layerHidden} onClick={() => changeItem(-1)} />
          </div>
          <Mascot
            selectedItems={selectedItems}
            selectedLayer={selectedLayer}
            hidden={state.hidden}
            dragX={dragX}
            direction={swipeDir}
            nudge={showNudge}
            onSelectLayer={handleSelectLayer}
            onToggleHidden={toggleHidden}
          />
          <div className="hidden lg:static lg:block">
            <NavArrow direction="next" disabled={layerHidden} onClick={() => changeItem(1)} />
          </div>
        </motion.div>

        {/* caption: desktop เท่านั้น — บนมือถือย้ายข้อมูลไปแถบราคา/dots บนมาสคอต */}
        <div className="mt-3 hidden shrink-0 lg:block">
          <StageCaption
            layer={selectedLayer}
            item={selectedItems[selectedLayer]}
            variants={variants}
            onSelectVariant={selectVariant}
            hidden={layerHidden}
          />
        </div>
      </main>

      {/* คอลัมน์คอนโทรล (desktop เท่านั้น): หัวข้อ + เลือกชั้น + ราคา */}
      <footer className="hidden w-96 flex-col items-start gap-4 lg:flex">
        <div className="mb-4">
          <h1 className="text-6xl font-black tracking-tight text-neutral-800">DOOD</h1>
          <p className="mt-3 text-neutral-500">Make it your style</p>
        </div>
        <GenderTabs value={genderFilter} onChange={setGenderFilter} />
        <div className="flex items-center gap-3">
          <LayerSelector selectedLayer={selectedLayer} onSelectLayer={selectLayer} />
          <button
            type="button"
            onClick={shuffle}
            aria-label="สุ่มลุค"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-xl shadow-sm ring-1 ring-black/5 transition active:scale-90"
          >
            🎲
          </button>
          <BagButton count={count} onClick={() => setCollectionOpen(true)} size={48} />
          <ExpandButton onClick={() => setPreviewOpen(true)} size={48} />
        </div>
        <div className="w-full">
          <LookBar totalPrice={totalPrice} onWant={handleWant} onShare={handleShare} />
        </div>
      </footer>

      {/* ปุ่มสุ่มลุค — ลอยมุมล่างขวา (มือถือเท่านั้น) กดถนัดนิ้วโป้ง เหนือแถบราคา */}
      <button
        type="button"
        onClick={shuffle}
        aria-label="สุ่มลุค"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 42px)' }}
        className="fixed right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-neutral-900 text-2xl shadow-lg ring-1 ring-black/10 transition active:scale-90 lg:hidden"
      >
        🎲
      </button>

      {/* ชิปเลือกสี (มือถือ) — มุมซ้ายล่าง (คู่กับ 🎲 ขวาล่าง) ตำแหน่งคงที่ ไม่ทับสินค้า · ต่ำกว่า price sheet (z-40) */}
      <div
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 42px)' }}
        className="fixed left-4 z-30 lg:hidden"
      >
        <ColorSwatchPicker variants={variants} onSelect={selectVariant} />
      </div>

      {/* แถบราคาบนมือถือ — ซ่อน/โผล่ด้วยการลากขึ้น */}
      <MobilePriceSheet
        selectedItems={selectedItems}
        hidden={state.hidden}
        totalPrice={totalPrice}
        visible={priceVisible}
        onToggle={togglePrice}
        onWant={() => {
          handleWant();
          revealPrice();
        }}
        onShare={handleShare}
      />

      <Collection
        open={collectionOpen}
        onClose={() => setCollectionOpen(false)}
        looks={looks}
        itemsById={itemsById}
        onRemove={remove}
        onApply={handleApplyLook}
        authEnabled={auth.authEnabled}
        isLoggedIn={auth.isLoggedIn}
        email={auth.email}
        onLogin={() => setAuthOpen(true)}
        onLogout={() => {
          void auth.signOut();
          showToast('ออกจากระบบแล้ว');
        }}
      />

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />

      <LookPreview
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        selectedItems={selectedItems}
        hidden={state.hidden}
      />

      <Toast message={toast} />
    </div>
  );
}

// ปุ่มดูชุดเต็ม ⤢ (เปิด LookPreview)
function ExpandButton({ onClick, size }: { onClick: () => void; size: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="ดูชุดเต็ม"
      style={{ height: size, width: size }}
      className="flex shrink-0 items-center justify-center rounded-full bg-white text-neutral-700 shadow-sm ring-1 ring-black/5 transition active:scale-90"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

// ปุ่มเปิดคอลเลกชัน 🛍️ พร้อม badge จำนวนลุคที่บันทึก
function BagButton({
  count,
  onClick,
  size,
}: {
  count: number;
  onClick: () => void;
  size: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`ลุคที่บันทึกไว้${count > 0 ? ` (${count})` : ''}`}
      style={{ height: size, width: size }}
      className="relative flex shrink-0 items-center justify-center rounded-full bg-white text-lg shadow-sm ring-1 ring-black/5 transition active:scale-90"
    >
      🛍️
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-neutral-900 px-1 text-[10px] font-bold tabular-nums text-white ring-2 ring-neutral-100">
          {count}
        </span>
      )}
    </button>
  );
}
