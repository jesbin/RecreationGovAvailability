import { MONTHS_MAP } from '../api'

interface Props {
  selected: number[]
  onChange: (months: number[]) => void
}

export default function MonthSelector({ selected, onChange }: Props) {
  const all = Object.keys(MONTHS_MAP).map(Number)

  function toggle(month: number) {
    if (selected.includes(month)) {
      onChange(selected.filter((m) => m !== month))
    } else {
      onChange([...selected, month].sort((a, b) => a - b))
    }
  }

  return (
    <div>
      <div className="flex gap-4 mb-3">
        <button
          type="button"
          onClick={() => onChange(all)}
          className="text-xs text-black underline underline-offset-2 hover:text-gray-500 transition-colors"
        >
          Select all
        </button>
        <button
          type="button"
          onClick={() => onChange([])}
          className="text-xs text-gray-400 underline underline-offset-2 hover:text-gray-700 transition-colors"
        >
          Clear
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {all.map((month) => {
          const checked = selected.includes(month)
          return (
            <button
              key={month}
              type="button"
              onClick={() => toggle(month)}
              className={`
                text-sm px-4 py-1.5 rounded-full border transition-colors select-none
                ${checked
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-gray-500 hover:text-black'
                }
              `}
            >
              {MONTHS_MAP[month]}
            </button>
          )
        })}
      </div>
    </div>
  )
}
