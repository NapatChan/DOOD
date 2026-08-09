import type { GenderFilter } from '../types';

const OPTIONS: { value: GenderFilter; label: string }[] = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'male', label: 'ชาย' },
  { value: 'female', label: 'หญิง' },
];

// segmented control เลือกเพศ (ชาย/หญิง/ทั้งหมด)
export default function GenderTabs({
  value,
  onChange,
}: {
  value: GenderFilter;
  onChange: (v: GenderFilter) => void;
}) {
  return (
    <div className="inline-flex rounded-full bg-white p-1 shadow-sm ring-1 ring-black/5">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
            value === o.value ? 'bg-brand-blue text-white' : 'text-neutral-500'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
