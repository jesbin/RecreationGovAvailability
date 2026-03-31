import { useEffect, useRef, useState } from 'react'
import { fetchCampgroundSearch } from '../api'
import type { Campground } from '../types'

interface Props {
  selected: Campground[]
  onChange: (campgrounds: Campground[]) => void
}

export default function CampgroundSearch({ selected, onChange }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Campground[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleInput(value: string) {
    setQuery(value)
    if (timerRef.current) clearTimeout(timerRef.current)
    if (value.trim().length < 2) {
      setResults([])
      setOpen(false)
      return
    }
    timerRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const r = await fetchCampgroundSearch(value.trim())
        setResults(r)
        setOpen(r.length > 0)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)
  }

  function select(cg: Campground) {
    if (!selected.find((c) => c.id === cg.id)) {
      onChange([...selected, cg])
    }
    setQuery('')
    setOpen(false)
  }

  function remove(id: string) {
    onChange(selected.filter((c) => c.id !== id))
  }

  return (
    <div ref={wrapperRef} className="relative">
      {/* Selected tags */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selected.map((cg) => (
            <span
              key={cg.id}
              className="inline-flex items-center gap-1.5 bg-black text-white text-xs rounded-full px-3 py-1"
            >
              {cg.name}
              <button
                type="button"
                onClick={() => remove(cg.id)}
                className="text-gray-400 hover:text-white leading-none text-base"
                aria-label={`Remove ${cg.name}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input */}
      <input
        type="text"
        value={query}
        onChange={(e) => handleInput(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
        placeholder="Search campgrounds by name…"
        className="w-full sm:w-80 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-black"
      />

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 mt-1 w-full sm:w-80 bg-white border border-gray-300 rounded-md shadow-lg z-50 max-h-56 overflow-y-auto">
          {loading ? (
            <div className="px-3 py-2 text-sm text-gray-400">Searching…</div>
          ) : (
            results.map((cg) => {
              const already = !!selected.find((c) => c.id === cg.id)
              return (
                <div
                  key={cg.id}
                  onClick={() => select(cg)}
                  className={`px-3 py-2 text-sm cursor-pointer border-b border-gray-100 last:border-0 hover:bg-gray-50 ${already ? 'text-gray-400' : 'text-gray-800'}`}
                >
                  {cg.name}
                  {cg.location && <span className="text-gray-400"> — {cg.location}</span>}
                  <span className="text-gray-400 text-xs ml-1">(ID: {cg.id})</span>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
