import type { Category } from '../types';
import { CATEGORIES, CATEGORY_LABEL } from '../types';

interface LayerSelectorProps {
  selectedLayer: Category;
  onSelectLayer: (category: Category) => void;
}

// แถบเลือกเลเยอร์ที่จะแต่ง — ทางเลือกเสริมจากการแตะที่ตัวมาสคอตโดยตรง
export default function LayerSelector({ selectedLayer, onSelectLayer }: LayerSelectorProps) {
  return (
    <div className="flex gap-2 rounded-full bg-white p-1 shadow-sm ring-1 ring-black/5">
      {CATEGORIES.map((cat) => {
        const active = selectedLayer === cat;
        return (
          <button
            key={cat}
            type="button"
            onClick={() => onSelectLayer(cat)}
            aria-pressed={active}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors md:px-6 md:py-2.5 md:text-base ${
              active ? 'bg-neutral-800 text-white' : 'text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            {CATEGORY_LABEL[cat]}
          </button>
        );
      })}
    </div>
  );
}