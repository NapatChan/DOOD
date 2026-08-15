import {
  CATEGORIES,
  CATEGORY_LABEL,
  GARMENT_ORIGIN,
  LAYER_GROW,
  onBodyBackground,
  onBodyTransform,
  type Category,
  type Fit,
} from '../types';

export interface PreviewGarment {
  imageUrl?: string;
  fit?: Fit | 'auto';
  aspect?: number;
  scale?: number;
  offsetX?: number;
  offsetY?: number;
}

interface FittingPreviewProps {
  /** หมวดที่กำลังแก้ + ค่าล่าสุด (อัปเดตสดตามฟอร์ม/สไลเดอร์) */
  category: Category;
  editing: PreviewGarment;
  /** ชิ้นอ้างอิงของหมวดอื่น ไว้เทียบสัดส่วน (จาง ๆ) */
  references: Partial<Record<Category, PreviewGarment>>;
}

// เดาทรงจริงตอน preview (fit=auto → ใช้ aspect ถ้ารู้)
function resolveFit(fit: Fit | 'auto' | undefined, aspect?: number): Fit {
  if (fit === 'long' || fit === 'short') return fit;
  if (aspect) return aspect > 0.85 ? 'short' : 'long';
  return 'long';
}

function GarmentFill({ cat, g, dim }: { cat: Category; g: PreviewGarment; dim?: boolean }) {
  if (!g.imageUrl) return null;
  const bg = onBodyBackground(cat, resolveFit(g.fit, g.aspect), g.aspect);
  return (
    <div
      className="absolute inset-0"
      style={{
        opacity: dim ? 0.28 : 1,
        backgroundImage: `url(${g.imageUrl})`,
        backgroundSize: bg.size,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: bg.position,
        transform: onBodyTransform(g.scale, g.offsetX, g.offsetY),
        transformOrigin: GARMENT_ORIGIN[cat],
      }}
    />
  );
}

// พรีวิวสวมบนมาสคอต + เส้นปะไกด์ไลน์ต่อหมวด (โซนที่กำลังแก้ = ไฮไลต์)
export default function FittingPreview({ category, editing, references }: FittingPreviewProps) {
  return (
    <div className="mx-auto flex h-[24rem] w-full max-w-[15rem] flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
      {CATEGORIES.map((cat) => {
        const isEditing = cat === category;
        const g = isEditing ? editing : references[cat];
        return (
          <div
            key={cat}
            className={`relative min-h-0 w-full shrink basis-0 rounded-lg border-2 border-dashed ${
              isEditing ? 'border-blue-400' : 'border-neutral-200'
            }`}
            style={{ flexGrow: LAYER_GROW[cat] }}
          >
            {/* ป้ายหมวด มุมซ้ายบน */}
            <span
              className={`pointer-events-none absolute left-1.5 top-1 z-10 text-[10px] font-semibold ${
                isEditing ? 'text-blue-500' : 'text-neutral-300'
              }`}
            >
              {CATEGORY_LABEL[cat]}
            </span>
            {g && <GarmentFill cat={cat} g={g} dim={!isEditing} />}
          </div>
        );
      })}
    </div>
  );
}
