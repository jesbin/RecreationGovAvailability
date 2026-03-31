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
      <div className="flex gap-3 mb-2">
        <button
          type="button"
          onClick={() => onChange(all)}
          className="text-xs text-black underline underline-offset-2 hover:text-gray-600"
        >
          Select All
        </button>
        <button
          type="button"
          onClick={() => onChange([])}
          className="text-xs text-gray-500 underline underline-offset-2 hover:text-gray-800"
        >
          Clear All
        </button>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-x-4 gap-y-1.5">
        {all.map((month) => {
          const id = `month-${month}`
          const checked = selected.includes(month)
          return (
            <label
              key={month}
              htmlFor={id}
              className="flex items-center gap-2 cursor-pointer text-sm select-none"
            >
              <input
                type="checkbox"
                id={id}
                checked={checked}
                onChange={() => toggle(month)}
                className="rounded border-gray-400 accent-black cursor-pointer"
              />
              <span className={checked ? 'text-black font-medium' : 'text-gray-600'}>
                {MONTHS_MAP[month]}
              </span>
            </label>
          )
        })}
      </div>
    </div>
  )
}
